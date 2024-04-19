import fs from "fs/promises";
import { join, resolve, relative, dirname } from "path";
import { Workspace } from "@turbo/repository";
import { getImportsInDirectory } from "./get.mjs";
import { debuglog, parseArgs } from "node:util";

const debug = debuglog("debug");

const { values: flags } = parseArgs({
  options: {
    directory: {
      type: "string",
      multiple: false,
      short: "d",
      default: ".",
    },
    "dry-run": {
      type: "boolean",
      multiple: false,
      default: false,
    },
    limit: {
      type: "string",
      multiple: false,
      short: "l",
      default: "10",
    },
    pristine: {
      type: "string",
      multiple: true,
      short: "p",
    },
    skip: {
      type: "string",
      multiple: true,
      short: "s",
    },
  },
  strict: true,
});

console.log(flags);

const projectDir = flags.directory;
const dryRun = flags["dry-run"];

if (dryRun) {
  console.log("doing dry run");
}

// Some packages that are either used globally in scripts
// or for some either caused CI to break. We can probably move them individually
const DO_NOT_MOVE_THESE_DEPS = flags.skip;
const KEEP_PRISTINE = flags.pristine;

async function readWorkspacePackages(dir) {
  const workspace = await Workspace.find(dir);
  const packages = await workspace.findPackages();
  const directories = packages.map((p) => p.relativePath).sort();
  return directories;
}

async function readPackageJson(filePath) {
  const fileContents = await fs.readFile(filePath, "utf8");
  return JSON.parse(fileContents);
}

async function writePackageJson(filePath, content) {
  const stringified = JSON.stringify(content, null, 2);
  await fs.writeFile(filePath, `${stringified}\n`, "utf8");
}

function getMinWidth(strings) {
  const longest = strings.reduce((a, b) => (a.length > b.length ? a : b), "");
  return longest.length + 5;
}

function getPrintable(str, minWidth) {
  // Add 2 because we are adding square brackets
  return `[${str}]`.padEnd(minWidth + 2, ".");
}

async function main() {
  const rootPackageJsonPath = join(projectDir, "package.json");
  const packages = await readWorkspacePackages(projectDir);
  console.log(`${packages.length} packages found in ${projectDir}`);

  if (!packages.length) {
    return;
  }

  const rootPackageJson = await readPackageJson(rootPackageJsonPath);
  const allRootDeps = rootPackageJson.dependencies || {};

  const skipped = {}; // TODO: do something with skipped deps
  const rootDeps = Object.keys(allRootDeps).reduce((m, key) => {
    if (key.startsWith("@api/")) {
      skipped[key] = allRootDeps[key];
      return m;
    }

    if (key.startsWith("@types/")) {
      skipped[key] = allRootDeps[key];
      return m;
    }

    if (DO_NOT_MOVE_THESE_DEPS.includes(key)) {
      skipped[key] = allRootDeps[key];
      return m;
    }

    m[key] = allRootDeps[key];
    return m;
  }, {});

  const numOfRootDeps = Object.keys(rootDeps).length;
  console.log(`${rootPackageJsonPath} found ${numOfRootDeps} deps`);

  if (!numOfRootDeps) {
    console.log(`${rootPackageJsonPath} found no deps`);
    return;
  }

  const packageUpdates = {};
  const movedDependencies = {};
  const keepInRootPackageJSON = [];

  const importsForPackage = {}; // cache imports for each project

  let counter = 0; // counts number of   rootDeps we've moved

  const rootDepsMinWidth = getMinWidth(Object.keys(rootDeps));

  // For each root dependency, check all the for their imports
  for (const [dependency, version] of Object.entries(rootDeps)) {
    const printable = getPrintable(dependency, rootDepsMinWidth);
    if (counter >= flags.limit) {
      debug(`${printable}skip (reached max moves)`);
      continue;
    }

    counter++;

    console.log(`${printable}analyzing (${counter}/${flags.limit})`);

    for (const pkg of packages) {
      const pkgJSONPath = join(projectDir, pkg, "package.json");

      // Check that there's a package.json, otherwise continue
      // eslint-disable-next-line no-await-in-loop
      if (!(await fs.stat(pkgJSONPath).catch(() => false))) {
        continue;
      }

      // Get a map of the deps that were imported in this pkg
      // Check the cache first, since this is in a loop and
      // we don't want to analyze the files every time.
      if (!importsForPackage[pkg]) {
        // eslint-disable-next-line no-await-in-loop
        const _imports = await getImportsInDirectory(projectDir, pkg);
        importsForPackage[pkg] = _imports;
      }

      // Get from the newly populated cache
      const imports = importsForPackage[pkg];

      // The dependency key wouldn't be in imports if no files are importing it.
      if (!imports.get(dependency)) {
        continue;
      }

      // If we found a root dependency used in a package we want to keep pristine
      if (KEEP_PRISTINE.includes(pkg)) {
        // we will NOT add to packageUpdates, because we do not want
        // to update pristine packages.
        // But we will add it to another list of packages that we want to keep
        // in root package.json
        keepInRootPackageJSON.push(dependency);
      } else {
        // Initialize
        if (!packageUpdates[pkgJSONPath]) {
          packageUpdates[pkgJSONPath] = {};
        }

        // If we found some imports for this dependency
        if (!movedDependencies[dependency]) {
          movedDependencies[dependency] = [];
        }
        // Add to a list of updates that we'll do at the some time
        // for this pkg's package.json.
        packageUpdates[pkgJSONPath][dependency] = version;
        // Add in the pkg that the dependency was moved to
        movedDependencies[dependency].push({ pkg, pkgJSONPath });
      }
    }
  }

  console.log("Updating Packages");

  const pkgNames = Object.keys(packageUpdates).map((pkgJSONPath) =>
    dirname(relative(projectDir, pkgJSONPath))
  );
  console.log("pkgNames", pkgNames);
  const packageUpdatesMinWidth = getMinWidth(pkgNames);

  await Promise.all(
    Object.entries(packageUpdates).map(async ([pkgJSONPath, deps]) => {
      // If there were no deps moved into this pkgJSON,
      // we don't need to do anything.
      if (Object.keys(deps).length === 0) {
        return Promise.resolve();
      }

      const pkgName = dirname(relative(projectDir, pkgJSONPath));
      const printable = getPrintable(pkgName, packageUpdatesMinWidth);
      // Read the package.json
      const pkgJSON = await readPackageJson(pkgJSONPath);
      let i = 0;
      const total = Object.keys(deps).length;
      for (const [dep, version] of Object.entries(deps)) {
        i++;

        if (pkgJSON.dependencies?.[dep] || pkgJSON.devDependencies?.[dep]) {
          debug(`(${i}/${total}) ${printable}skip ${dep}@${version}`);
          continue;
        }

        if (!pkgJSON.dependencies) {
          pkgJSON.dependencies = {};
        }
        console.log(`(${i}/${total}) ${printable}add ${dep}@${version}`);
        pkgJSON.dependencies[dep] = version;
      }

      // Don't write it for dry runs.
      if (!dryRun) {
        await writePackageJson(pkgJSONPath, pkgJSON);
      }
    })
  );

  let i = 0;
  const total = Object.keys(movedDependencies).length;
  console.log(
    `Removing ${total} moved deps from root package.json (keep: ${keepInRootPackageJSON.length}):`
  );

  for (const dep of Object.keys(movedDependencies)) {
    i++;

    if (keepInRootPackageJSON.includes(dep)) {
      console.log(`(${i}/${total}) keep ${dep}`);
    } else {
      console.log(`(${i}/${total}) rm ${dep}`);
      if (!dryRun) {
        delete rootPackageJson.dependencies[dep];
      }
    }
  }

  await writePackageJson(rootPackageJsonPath, rootPackageJson);
}

main().catch(console.error);

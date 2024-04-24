import { parseArgs } from "node:util";
import { resolve, join } from "node:path";
import fs from "fs/promises";
import { readWorkspacePackages, getMinWidth, getPrintable } from "./utils.mjs";
import { getImportsInDirectory } from "./get.mjs";

const { values: flags } = parseArgs({
  options: {
    // The path to your repo. In most cases, just do `-d .` when you're already in the repo dir.
    directory: {
      type: "string",
      multiple: false,
      short: "d",
      default: ".",
    },
    limit: {
      type: "string",
      multiple: false,
      short: "l",
      default: "10",
    },
  },
  strict: true,
});

console.log(flags);

const LIMIT = flags.limit ? Number(flags.limit) : Infinity;

const projectDir = resolve(flags.directory);

export async function main() {
  const packages = await readWorkspacePackages(projectDir);
  console.log(`${packages.length} packages found in ${projectDir}`);

  if (!packages.length) {
    return;
  }

  const selfImports = new Map();
  let counter = 0;
  for (const { name: pkgName, relativePath: pkgDirectory } of packages) {
    counter++;
    if (counter > LIMIT) {
      return;
    }

    const pkgJSONPath = join(projectDir, pkgDirectory, "package.json");
    // Check that there's a package.json, otherwise continue
    if (!(await fs.stat(pkgJSONPath).catch(() => false))) {
      continue;
    }

    const importsForPackage = {}; // cache imports for each project

    // Get a map of the deps that were imported in this pkg
    // Check the cache first, since this is in a loop and
    // we don't want to analyze the files every time.
    if (!importsForPackage[pkgName]) {
      const _imports = await getImportsInDirectory(projectDir, pkgDirectory);
      importsForPackage[pkgName] = _imports;
    }
    // Get from the newly populated cache
    const imports = importsForPackage[pkgName] ?? new Map();

    if (imports.has(pkgName)) {
      const files = imports.get(pkgName);
      selfImports.set(pkgName, {
        count: files.length,
        files,
      });
    }
  }

  const minWidth = getMinWidth([...selfImports.keys()]);
  for (const [pkgName, importDetails] of selfImports) {
    const printable = getPrintable(pkgName, minWidth);
    console.log(`${printable}${importDetails.count}`);
  }
}

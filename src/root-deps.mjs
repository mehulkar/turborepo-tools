import { dirname, join, relative, resolve } from "node:path";
import { debuglog } from "node:util";
import { main as getAllImports } from "./utils/get-all-imports.mjs";
import { getMinWidth, getPrintable } from "./utils/logger.mjs";
import { readPackageJson, writePackageJson } from "./utils/pkg-json.mjs";
import { readWorkspacePackages } from "./utils/turbo.mjs";

const debug = debuglog("monorepo");

export async function main(flags) {
	const projectDir = resolve(flags.directory);
	const dryRun = flags["dry-run"];
	const includeDevDeps = flags["include-dev"];
	const includeTypes = flags["include-types"];
	const SKIP = flags.skip ?? [];
	const ONLY = flags.only ?? [];
	const ONLY_PREFIX = flags["only-prefix"] ?? [];
	const KEEP_PRISTINE = flags.pristine ?? [];
	const SKIP_PREFIX = flags["skip-prefix"] ?? [];
	const LIMIT = flags.limit ? Number(flags.limit) : Number.POSITIVE_INFINITY;

	if (dryRun) {
		console.log("doing dry run");
	}

	if (SKIP_PREFIX.includes("@types/") && includeTypes) {
		throw new Error(
			"--skip-prefix=@types/ and --include-types don't make sense together",
		);
	}

	if (ONLY_PREFIX.length > 0) {
		if (SKIP.length > 0) {
			throw new Error("Cannot use both --only-prefix && --skip together");
		}

		if (SKIP_PREFIX.length > 0) {
			throw new Error(
				"Cannot use both --only-prefix && --skip-prefix together",
			);
		}
	}

	if (ONLY.length > 0) {
		if (SKIP.length > 0) {
			throw new Error("Cannot use both --only && --skip together");
		}

		if (SKIP_PREFIX.length > 0) {
			throw new Error("Cannot use both --only && --skip-prefix together");
		}
	}

	const rootPackageJsonPath = join(projectDir, "package.json");

	const rootPackageJson = await readPackageJson(rootPackageJsonPath);
	let allRootDeps = {
		...rootPackageJson.dependencies,
	};

	if (includeDevDeps) {
		allRootDeps = { ...allRootDeps, ...rootPackageJson.devDependencies };
	}

	const skipped = {}; // TODO: do something with skipped deps

	const rootDeps = Object.keys(allRootDeps).reduce((m, key) => {
		// ONLY_PREFIX shouldn't conflict with SKIP_PREFIX
		if (ONLY_PREFIX.length > 0) {
			if (!ONLY_PREFIX.some((prefix) => key.startsWith(prefix))) {
				skipped[key] = allRootDeps[key];
				return m;
			}
		}

		if (ONLY.length > 0) {
			if (!ONLY.includes(key)) {
				skipped[key] = allRootDeps[key];
				return m;
			}
		}

		if (SKIP_PREFIX.some((prefix) => key.startsWith(prefix))) {
			skipped[key] = allRootDeps[key];
			return m;
		}

		if (SKIP.includes(key)) {
			skipped[key] = allRootDeps[key];
			return m;
		}

		m[key] = allRootDeps[key];
		return m;
	}, {});

	const numOfRootDeps = Object.keys(rootDeps).length;
	if (!numOfRootDeps) {
		console.log(`${rootPackageJsonPath} found no deps`);
		return;
	}

	console.log(`${rootPackageJsonPath} found ${numOfRootDeps} deps`);

	const packageUpdates = {};
	const movedDependencies = {};
	const keepInRootPackageJSON = [];

	let counter = 0; // counts number of rootDeps we've moved

	const rootDepsMinWidth = getMinWidth(Object.keys(rootDeps));

	const _packages = await readWorkspacePackages(projectDir);
	console.log(`${_packages.length} packages found in ${projectDir}`);
	if (!_packages.length) {
		return;
	}
	// weird naming because i'm too lazy to go update the references
	const packages = _packages.map((p) => p.relativePath).sort();

	const importsByPackage = await getAllImports(projectDir); // This is a Map

	// For each root dependency, check all the for their imports
	for (const [dependency, version] of Object.entries(rootDeps)) {
		const printable = getPrintable(dependency, rootDepsMinWidth);
		if (counter >= LIMIT) {
			debug(`${printable}skip (reached max moves)`);
			continue;
		}

		counter++;

		console.log(`${printable}analyzing (${counter}/${LIMIT})`);

		for (const pkg of packages) {
			const pkgJSONPath = join(projectDir, pkg, "package.json");
			const imports = importsByPackage.get(pkg);

			let importableDependency = dependency;
			if (includeTypes && dependency.startsWith("@types/")) {
				importableDependency = dependency.split("@types/")[1];
			}

			// The dependency key wouldn't be in imports if no files are importing it.
			if (!imports.has(importableDependency)) {
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
		dirname(relative(projectDir, pkgJSONPath)),
	);

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
		}),
	);

	let i = 0;
	const total = Object.keys(movedDependencies).length;
	console.log(
		`Removing ${total} moved deps from root package.json (keep: ${keepInRootPackageJSON.length}):`,
	);

	for (const dep of Object.keys(movedDependencies)) {
		i++;

		if (keepInRootPackageJSON.includes(dep)) {
			console.log(`(${i}/${total}) keep ${dep}`);
		} else {
			console.log(`(${i}/${total}) rm ${dep}`);
			if (!dryRun) {
				delete rootPackageJson.dependencies[dep];
				delete rootPackageJson.devDependencies[dep];
			}
		}
	}

	await writePackageJson(rootPackageJsonPath, rootPackageJson);
}

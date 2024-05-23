import { dirname, join, relative, resolve } from "node:path";
import { debuglog } from "node:util";
import { getAllImports } from "./utils/get-all-imports.mjs";
import { getMinWidth, getPrintable } from "./utils/logger.mjs";
import { readPackageJson, writePackageJson } from "./utils/pkg-json.mjs";
import { readWorkspacePackages } from "./utils/turbo.mjs";

const debug = debuglog("monorepo");

export async function main(flags) {
	const {
		directory: projectDir,
		dryRun,
		includeDevDeps,
		includeTypes,
		limit,
		only,
		onlyPrefix,
		pristine,
		skip,
		skipPrefix,
	} = flags;

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
		// onlyPrefix shouldn't conflict with skipPrefix
		if (onlyPrefix.length > 0) {
			if (!onlyPrefix.some((prefix) => key.startsWith(prefix))) {
				skipped[key] = allRootDeps[key];
				return m;
			}
		}

		if (only.length > 0) {
			if (!only.includes(key)) {
				skipped[key] = allRootDeps[key];
				return m;
			}
		}

		if (skipPrefix.some((prefix) => key.startsWith(prefix))) {
			skipped[key] = allRootDeps[key];
			return m;
		}

		if (skip.includes(key)) {
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

	const packageUpdates = new Map();
	const movedDependencies = {};
	const keepInRootPackageJSON = [];

	let counter = 0; // counts number of rootDeps we've moved

	const rootDepsMinWidth = getMinWidth(Object.keys(rootDeps));

	const workspacePackages = await readWorkspacePackages(projectDir);
	console.log(`${workspacePackages.length} packages found in ${projectDir}`);
	if (!workspacePackages.length) {
		return;
	}

	// Get a list of everything that's imported by each package in the workspace
	// This is a map where keys are workspace packages, and values are arrays of things that are imported.
	const importsByPackage = await getAllImports(projectDir);

	// For each root dependency, check all the packages for their imports
	for (const [dependency, version] of Object.entries(rootDeps)) {
		const printable = getPrintable(dependency, rootDepsMinWidth);
		if (counter >= limit) {
			debug(`${printable}skip (reached max moves)`);
			continue;
		}

		// For @types/* packages, we want the _real_ package we're looking for
		let importableDependency = dependency;
		if (includeTypes && dependency.startsWith("@types/")) {
			importableDependency = dependency.split("@types/")[1];
		}

		counter++;

		console.log(`${printable}analyzing (${counter}/${limit})`);

		for (const pkg of workspacePackages) {
			const imports = importsByPackage.get(pkg.name);

			// The dependency key wouldn't be in imports if no files are importing it.
			if (!imports.has(importableDependency)) {
				continue;
			}

			// If we found a root dependency used in a package we want to keep pristine
			if (pristine.includes(pkg.name)) {
				// we will NOT add to packageUpdates, because we do not want
				// to update pristine packages.
				// But we will add it to another list of packages that we want to keep
				// in root package.json
				keepInRootPackageJSON.push(dependency);
			} else {
				// Initialize. Note pkg is a rich object here and we're using it as a key
				if (!packageUpdates.has(pkg)) {
					packageUpdates.set(pkg, {});
				}

				// If we found some imports for this dependency
				if (!movedDependencies[dependency]) {
					movedDependencies[dependency] = [];
				}

				// Add to a list of updates that we'll do at the some time
				// for this pkg's package.json.
				packageUpdates.get(pkg)[dependency] = version;
				// Add in the pkg that the dependency was moved to
				movedDependencies[dependency].push(pkg.name);
			}
		}
	}

	console.log("Updating Packages");
	const pkgNames = [...packageUpdates.keys()].map((pkg) => pkg.name);
	const packageUpdatesMinWidth = getMinWidth(pkgNames);

	const promises = [];
	for (const [pkg, deps] of packageUpdates.entries()) {
		// If there were no deps moved into this pkgJSON, we don't need to do anything.
		if (Object.keys(deps).length === 0) {
			continue;
		}

		const debugPrefix = getPrintable(pkg.name, packageUpdatesMinWidth);
		promises.push(updatePackage(debugPrefix, projectDir, pkg, deps, dryRun));
	}

	await Promise.all(promises);

	// Update root package.json
	const total = Object.keys(movedDependencies).length;
	const keep = keepInRootPackageJSON.length;
	console.log(`Summary: Remove ${total} and keep: ${keep} deps`);
	let i = 0;
	for (const dep of Object.keys(movedDependencies)) {
		i++;
		if (keepInRootPackageJSON.includes(dep)) {
			console.log(`(${i}/${total}) keep ${dep}`);
		} else {
			console.log(`(${i}/${total}) rm ${dep}`);
			delete rootPackageJson.dependencies[dep];
			delete rootPackageJson.devDependencies[dep];
		}
	}

	if (!dryRun) {
		await writePackageJson(rootPackageJsonPath, rootPackageJson);
	}
}

async function updatePackage(debugPrefix, projectDir, pkg, deps, dryRun) {
	const pkgJSONPath = join(projectDir, pkg.relativePath, "package.json");

	// Read the package.json
	const pkgJSON = await readPackageJson(pkgJSONPath);

	let i = 0;
	const total = Object.keys(deps).length;
	for (const [dep, version] of Object.entries(deps)) {
		i++;

		// If the dependency is already in this package,json, we can skip it
		if (pkgJSON.dependencies?.[dep] || pkgJSON.devDependencies?.[dep]) {
			debug(`(${i}/${total}) ${debugPrefix}skip ${dep}@${version}`);
			continue;
		}

		// Otherwise add it to dependencies
		if (!pkgJSON.dependencies) {
			pkgJSON.dependencies = {};
		}

		console.log(`(${i}/${total}) ${debugPrefix}add ${dep}@${version}`);
		pkgJSON.dependencies[dep] = version;
	}

	// Don't write it for dry runs.
	if (!dryRun) {
		await writePackageJson(pkgJSONPath, pkgJSON);
	}
}

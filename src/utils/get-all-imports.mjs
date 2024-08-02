import { getImportsInDirectory } from "./get-imports.mjs";
import { readWorkspacePackages } from "./turbo.mjs";

/**
 * Returns a map of package names and all the packages it imports
 * @param {string} directory
 * @returns Map<string,??>
 */
export async function getAllImports(directory) {
	// for each package in the workspace
	// get its directory and look for all import statements
	const all = new Map();
	const workspacePackages = await readWorkspacePackages(directory);
	for (const pkg of workspacePackages) {
		const imports = await getImportsInDirectory(
			directory,
			pkg.relativePath
		);
		all.set(pkg.name, imports);
	}

	return all;
}

/**
 * Returns a Map of package paths that
 * @param {string} directory
 * @param {string} targetPkg
 * @returns Map<relativePath, ??>
 */
export async function getImportsInPackage(directory, targetPkg) {
	const packagesThatImportTarget = new Map();

	const workspacePackages = await readWorkspacePackages(directory);

	if (!workspacePackages.length) {
		return packagesThatImportTarget;
	}

	const packages = workspacePackages.map((p) => p.relativePath).sort();

	for (const pkg of packages) {
		// First get a map of everything that's imported by this package
		const _imports = await getImportsInDirectory(directory, pkg);

		// Then check if those imports include the targetPkg we care about
		if (!_imports.has(targetPkg)) {
			continue;
		}

		// If they do, get the locations where they live and include them in our top
		// level return value.
		packagesThatImportTarget.set(
			pkg,
			_imports.get(targetPkg).map((x) => x.location)
		);
	}

	return packagesThatImportTarget;
}

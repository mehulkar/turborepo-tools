import { getImportsInDirectory } from "./get-imports.mjs";
import { readWorkspacePackages } from "./turbo.mjs";

export async function getAllImports(projectDir) {
	const all = new Map();

	// for each package in the workspace
	const workspacePackages = await readWorkspacePackages(projectDir);
	for (const pkg of workspacePackages) {
		// get its directory and look for all import statements
		const imports = await getImportsInDirectory(projectDir, pkg.relativePath);

		all.set(pkg.name, imports);
	}

	return all;
}

export async function getImportsInPackage(projectDir, targetPkg) {
	const packagesThatImportTarget = new Map();

	const workspacePackages = await readWorkspacePackages(projectDir);

	if (!workspacePackages.length) {
		return packagesThatImportTarget;
	}

	const packages = workspacePackages.map((p) => p.relativePath).sort();

	for (const pkg of packages) {
		// First get a map of everything that's imported by this package
		const _imports = await getImportsInDirectory(projectDir, pkg);

		// Then check if those imports include the targetPkg we care about
		if (!_imports.has(targetPkg)) {
			continue;
		}

		// If they do, get the locations where they live and include them in our top
		// level return value.
		packagesThatImportTarget.set(
			pkg,
			_imports.get(targetPkg).map((x) => x.location),
		);
	}

	return packagesThatImportTarget;
}

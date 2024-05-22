import { Workspace } from "@turbo/repository";

export async function readWorkspacePackages(dir) {
	const workspace = await Workspace.find(dir);
	const packages = await workspace.findPackages();
	return packages;
}

export async function getPackageWithGraph(dir) {
	const workspace = await Workspace.find(dir);
	const [packages, graph] = await Promise.all([
		workspace.findPackages(),
		workspace.findPackagesWithGraph(),
	]);

	return [packages, graph];
}

export function getPackageMaps(packages) {
	// create a map keyed by the relative path of each package
	// so we can look up dependencies/dependents. findPackagesWithGraph is keyed by relative path
	const pathToName = new Map();
	const nameToPath = new Map();
	for (const pkg of packages) {
		pathToName.set(pkg.relativePath, pkg.name);
		nameToPath.set(pkg.name, pkg.relativePath);
	}

	return {
		pathToName,
		nameToPath,
	};
}

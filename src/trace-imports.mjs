import { readWorkspacePackages } from "./utils/turbo.mjs";
import { getImportsInDirectory } from "./utils/get-imports.mjs";
import path from "node:path";

export async function main({ directory, importer, imported }) {
	const packages = await readWorkspacePackages(directory);

	const importerPkg = packages.find((pkg) => pkg.name === importer);
	const importedPkg = packages.find((pkg) => pkg.name === imported);
	if (!importerPkg) {
		throw new Error(
			`${importer} package not found in ${directory} workspace`
		);
	}

	if (!importedPkg) {
		throw new Error(
			`${imported} package not found in ${directory} workspace`
		);
	}

	const imports = await getImportsInDirectory(
		directory,
		importerPkg.relativePath
	);
	const importedRefs = imports.get(imported);
	if (!importedRefs) {
		return [];
	}

	return importedRefs.map((x) => path.relative(directory, x.location));
}

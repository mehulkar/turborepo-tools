import { readWorkspacePackages } from "./utils/turbo.mjs";
import { getImportsInDirectory } from "./utils/get-imports.mjs";
import path from "node:path";

function getImportRefsMap({ directory, imports, imported }) {
	const importedRefs = imports.get(imported);
	if (!importedRefs) {
		return [];
	}

	const map = new Map();
	for (const ref of importedRefs) {
		const filepath = path.relative(directory, ref.location);
		const count = map.get(filepath) ?? 0;
		map.set(filepath, count + 1);
	}
	return map;
}

export async function main({ directory, pkg1: pkg1Name, pkg2: pkg2Name }) {
	const packages = await readWorkspacePackages(directory);
	const pkg1 = packages.find((pkg) => pkg.name === pkg1Name);
	const pkg2 = packages.find((pkg) => pkg.name === pkg2Name);

	if (!pkg1) {
		throw new Error(
			`${pkg1Name} package not found in ${directory} workspace`
		);
	}

	if (!pkg2) {
		throw new Error(
			`${pkg2Name} package not found in ${directory} workspace`
		);
	}

	const [pkg1Imports, pkg2Imports] = await Promise.all([
		getImportsInDirectory(directory, pkg1.relativePath),
		getImportsInDirectory(directory, pkg2.relativePath),
	]);

	logResults(
		getImportRefsMap({
			directory,
			imports: pkg1Imports,
			imported: pkg2Name,
		}),
		pkg1Name,
		pkg2Name
	);

	console.log();

	logResults(
		getImportRefsMap({
			directory,
			imports: pkg2Imports,
			imported: pkg1Name,
		}),
		pkg2Name,
		pkg1Name
	);
}

function logResults(map, importer, imported) {
	if (map.size > 0) {
		console.log(`${importer} imports ${imported} from these locations:`);
		for (const [f, count] of map.entries()) {
			console.log(`- [${count} imports] ${f}`);
		}
	} else {
		console.log(`${importer} does not import ${imported}`);
	}
}

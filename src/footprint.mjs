import { main as getDependents } from "./get-deps.mjs";
import { getImportsInPackage } from "./utils/get-all-imports.mjs";

export async function main({ dir, pkg }) {
	console.log(`${pkg}:`);
	await logUsers({ dir, pkg });
	await logRecursiveUsers({ dir, pkg });
	await logImporters({ dir, pkg });

	// TODO: which files are imported the most
}

async function logRecursiveUsers({ dir, pkg }) {
	const ancestorTree = await getDependents({
		directory: dir,
		pkg,
		recursive: true,
	});
	// TODO: sorted by their size
	console.log(`- ${ancestorTree.length} have it in their tree`);
}

async function logUsers({ dir, pkg }) {
	const ancestors = await getDependents({
		directory: dir,
		pkg,
		recursive: false,
	});
	// TODO: sorted by their size
	console.log(`- ${ancestors.length} packages depend on this`);
}

async function logImporters({ dir, pkg }) {
	// This is a map for this package
	const importsMap = await getImportsInPackage(dir, pkg);

	let totalFiles = 0;
	const importers = [];
	for (const [pkg, files] of importsMap.entries()) {
		totalFiles += files.length;
		importers.push({ pkg, files }); // TODO: Can we just use the map.entries() to do this?
	}

	importers.sort((a, b) => b.files.length - a.files.length);
	const top5 = importers.slice(0, 5);

	console.log(
		`- Imported by ${totalFiles} files across ${importsMap.size} packages`
	);
	console.log(
		"- Top 5 importers (by number of files):",
		top5.map((x) => `${x.pkg}: ${x.files.length} files`)
	);
}

import { main as getDependents } from "./get-deps.mjs";
import { main as getAllImports } from "./utils/get-all-imports.mjs";

export async function main({ dir, pkg }) {
	const ancestors = await getDependents({
		directory: dir,
		pkg,
		recursive: false,
	});
	const ancestorTree = await getDependents({
		directory: dir,
		pkg,
		recursive: true,
	});

	console.log(`${pkg}:`);
	// TODO: sorted by their size
	console.log(`- ${ancestors.length} packages depend on this`);

	console.log(`- ${ancestorTree.length} have it in their tree`);

	// This is a map for each package
	const importsMap = await getAllImports(dir, pkg);
	let totalFiles = 0;
	for (const [pkg, files] of importsMap.entries()) {
		totalFiles += files.length;
	}
	console.log(
		`- imported by ${totalFiles} files across ${importsMap.size} packages`,
	);

	// TODO: which files are imported the most
}

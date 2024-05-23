import { main as getDependents } from "./get-deps.mjs";
import { getImportsInPackage } from "./utils/get-imports-in-package.mjs";

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

	// This is a map for this package
	const importsMap = await getImportsInPackage(dir, pkg);

	let totalFiles = 0;
	for (const [_pkg, files] of importsMap.entries()) {
		totalFiles += files.length;
	}

	console.log(
		`- imported by ${totalFiles} files across ${importsMap.size} packages`,
	);

	// TODO: which files are imported the most
}

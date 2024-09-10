import { join } from "node:path";
import { readWorkspacePackages } from "./utils/turbo.mjs";
import { getImportsInDirectory } from "./utils/get-imports.mjs";
import { readPackageJson, writePackageJson } from "./utils/pkg-json.mjs";

export async function main({ directory, onlyPrefix, targetPackage, skip }) {
	const packages = await readWorkspacePackages(directory);

	for (const pkg of packages) {
		if (targetPackage && pkg.name != targetPackage) {
			continue;
		}

		const pkgJSONPath = join(directory, pkg.relativePath, "package.json");
		const pkgJSON = await readPackageJson(pkgJSONPath);

		// get all the imports in this package, grouped by the package name
		const pkgImports = await getImportsInDirectory(
			directory,
			pkg.relativePath
		);

		let needsWrite = false;

		if (pkgJSON.dependencies) {
			for (const dep of Object.keys(pkgJSON.dependencies)) {
				if (onlyPrefix.length > 0) {
					if (!onlyPrefix.some((p) => dep.startsWith(p))) {
						continue;
					}
				}

				if (skip.includes(dep)) {
					console.log(`${pkg.name} Skipping ${dep} due to --skip`);
					continue;
				}

				if (!pkgImports.get(dep)) {
					// console.log(
					// 	`${pkg.name}: removing unused dependency: ${dep}`
					// );
					needsWrite = true;
					delete pkgJSON.dependencies[dep];
				}
			}
		}

		if (pkgJSON.devDependencies) {
			for (const dep of Object.keys(pkgJSON.devDependencies)) {
				if (onlyPrefix.length > 0) {
					if (!onlyPrefix.some((p) => dep.startsWith(p))) {
						continue;
					}
				}

				if (skip.includes(dep)) {
					console.log(`${pkg.name} Skipping ${dep} due to --skip`);
					continue;
				}

				if (!pkgImports.get(dep)) {
					needsWrite = true;
					delete pkgJSON.devDependencies[dep];
				}
			}
		}

		// TODO: parallelize the writes
		if (needsWrite) {
			await writePackageJson(pkgJSONPath, pkgJSON);
		}
	}
}

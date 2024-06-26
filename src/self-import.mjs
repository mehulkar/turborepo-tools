import fs from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { debuglog } from "node:util";
import { getImportsInDirectory } from "./utils/get-imports.mjs";
import { readWorkspacePackages } from "./utils/turbo.mjs";

const debug = debuglog("self-import");

export async function main(flags) {
	const LIMIT = flags.limit ? Number(flags.limit) : Number.POSITIVE_INFINITY;
	const projectDir = resolve(flags.directory);
	const ONLY = flags.only ?? [];
	const DRY_RUN = flags["dry-run"] ?? false;
	if (DRY_RUN) {
		console.log("doing dry run");
	}

	const packages = await readWorkspacePackages(projectDir);
	console.log(`${packages.length} packages found in ${projectDir}`);

	if (!packages.length) {
		return;
	}

	const allSelfImports = [];
	let limitCounter = 0;

	const cache = {}; // cache for imports for each pkg

	let filteredPackages = packages;
	if (ONLY.length > 0) {
		filteredPackages = packages.filter((pkg) => ONLY.includes(pkg.name));
	}

	for (const pkg of filteredPackages) {
		if (limitCounter >= LIMIT) {
			break;
		}

		const pkgName = pkg.name;
		const pkgDirectory = pkg.relativePath;

		// Check that there's a package.json, otherwise continue
		const pkgJSONPath = join(projectDir, pkgDirectory, "package.json");
		if (!(await fs.stat(pkgJSONPath).catch(() => false))) {
			continue;
		}

		// Get a map of the deps that were imported in this pkg
		// Check the cache first, since this is in a loop and
		// we don't want to analyze the files every time.
		// Get from the newly populated cache
		if (!cache[pkgName]) {
			cache[pkgName] = await getImportsInDirectory(projectDir, pkgDirectory);
		}
		const imports = cache[pkgName];

		// If this pkg doesn't import itself, we can continue
		if (!imports.has(pkgName)) {
			debug(`${pkgName} does not import itself`);
			continue;
		}

		// Increment our limit counter (to respect --limit)
		limitCounter++;

		const ownImports = imports.get(pkgName); // {name, path, location}[]

		for (const ownImportDetail of ownImports) {
			const regex = new RegExp(`^${pkgName}`);
			const importedRelativePath = ownImportDetail.path
				.replace(regex, "")
				.replace(/^\//, ""); // remove leading slash if there is one

			// Add in pkgDir
			// importedRelativePath = join(pkgDirectory, importedRelativePath);

			const locationRelativeToPkg = relative(
				pkgDirectory,
				ownImportDetail.location,
			);
			const locationRelativeToProject = relative(
				projectDir,
				ownImportDetail.location,
			);

			let after = relative(
				dirname(locationRelativeToProject),
				join(pkgDirectory, importedRelativePath),
			);
			// If it's not a relative path, add the ./ to the beginning,
			// not sure why path.relative doesn't do this already
			if (!after.startsWith(".")) {
				after = `./${after}`;
			}

			const x = {
				// The pkg we're investigating right now
				pkg: {
					name: pkgName,
					dir: pkgDirectory,
				},

				// the things it imports
				import: {
					name: ownImportDetail.name,
					path: ownImportDetail.path,
					relativePath: importedRelativePath,
					location: {
						absolute: ownImportDetail.location,
						pkgRelative: locationRelativeToPkg,
						projectRelative: locationRelativeToProject,
					},
				},
				fixed: {
					before: ownImportDetail.path,
					after,
				},
			};

			allSelfImports.push(x);
		}
	}

	for (const selfImport of allSelfImports) {
		const file = selfImport.import.location.absolute;
		const data = (await fs.readFile(file, "utf8")).toString();
		const fixed = data.replaceAll(
			selfImport.fixed.before,
			selfImport.fixed.after,
		);
		console.log(
			`replace '${selfImport.fixed.before}' with '${selfImport.fixed.after}' in ${file}`,
		);

		if (DRY_RUN) {
			continue;
		}

		await fs.writeFile(file, fixed, "utf8");
	}
}

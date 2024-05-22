import { Workspace } from "@turbo/repository";
import { join } from "node:path";
import * as fs from "node:fs/promises";
import { getPackageMaps, readWorkspacePackages } from "./utils/turbo.mjs";

export async function main({ directory, task }) {
	const packages = await readWorkspacePackages(directory);

	const withTask = [];
	const withoutTask = [];

	for (const p of packages) {
		const pkgJSON = join(p.relativePath, "package.json");
		// eslint-disable-next-line no-await-in-loop
		const contents = (await fs.readFile(pkgJSON, "utf8")).toString();
		const json = JSON.parse(contents);

		if (json.scripts?.[task]) {
			withTask.push(p);
		} else {
			withoutTask.push(p);
		}
	}

	const pkgNamesWithTask = withTask.map((x) => x.name).sort();
	const pkgNamesWithoutTask = withoutTask.map((x) => x.name).sort();
	console.log(`Packages implementing "${task}" script`);
	for (const p of pkgNamesWithTask) {
		console.log(`- ${p}`);
	}
	console.log();
	console.log(`Packages missing "${task}" script`);
	for (const p of pkgNamesWithoutTask) {
		console.log(`- ${p}`);
	}
}

#!/usr/bin/env node
import { parseArgs } from "node:util";
import { main } from "../src/trace-imports.mjs";
import { GLOBAL_FLAGS } from "./global-flags.mjs";

const { values: flags, positionals } = parseArgs({
	strict: true,
	allowPositionals: true,
	options: {
		...GLOBAL_FLAGS,
	},
});

if (!flags.directory) {
	throw new Error("--directory is required");
}

if (flags.debug) {
	console.log("flags", flags);
	console.log("positionals", positionals);
}

if (positionals.length !== 2) {
	throw new Error("give two args");
}

const importer = positionals[0];
const imported = positionals[1];

main({
	directory: flags.directory,
	importer,
	imported,
})
	.then((imports) => {
		if (imports.size > 0) {
			console.log(
				`${importer} imports ${imported} from these locations:`
			);
			for (const [f, count] of imports.entries()) {
				console.log(`- [${count} imports] ${f}`);
			}
		} else {
			console.log(`${importer} does not import ${imported}`);
		}
	})
	.catch(console.error);

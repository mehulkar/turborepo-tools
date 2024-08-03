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

const pkg1 = positionals[0];
const pkg2 = positionals[1];

main({
	directory: flags.directory,
	pkg1,
	pkg2,
}).catch(console.error);

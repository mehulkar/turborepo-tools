#!/usr/bin/env node

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { main } from "../src/footprint.mjs";
import { GLOBAL_FLAGS } from "./global-flags.mjs";

const { values: flags } = parseArgs({
	strict: true,
	options: {
		...GLOBAL_FLAGS,
		package: {
			type: "string",
			multiple: false,
			short: "p",
		},
	},
});

if (flags.debug) {
	console.log("flags", flags);
}

if (!flags.directory) {
	throw new Error("--directory flag is required");
}

if (!flags.package) {
	throw new Error("--package flag is required");
}

main({
	dir: resolve(flags.directory),
	pkg: flags.package,
}).catch(console.error);

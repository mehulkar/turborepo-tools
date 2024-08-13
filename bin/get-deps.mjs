#!/usr/bin/env node

import { parseArgs } from "node:util";
import { main } from "../src/get-deps.mjs";
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

		recursive: {
			type: "boolean",
			multiple: false,
			short: "r",
			default: false,
		},
	},
});

if (flags.debug) {
	console.log("flags", flags);
}

if (!flags.directory) {
	throw new Error("--directory is required");
}

if (!flags.package) {
	throw new Error("--package is required");
}

const recursive = flags.recursive ?? false;

main({
	directory: flags.directory,
	pkg: flags.package,
	recursive,
})
	.then(console.log)
	.catch(console.error);

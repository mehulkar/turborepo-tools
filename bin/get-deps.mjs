#!/usr/bin/env node

import { main } from "../src/get-deps.mjs";

import { parseArgs } from "node:util";
const { values: flags } = parseArgs({
	strict: true,
	options: {
		// The path to your repo. In most cases, just do `-d .` when you're already in the repo dir.
		directory: {
			type: "string",
			multiple: false,
			short: "d",
			default: ".",
		},

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

console.log("flags", flags);

if (!flags.directory) {
	throw new Error("--directory is required");
}

if (!flags.package) {
	throw new Error("--package is required");
}

const recursive = flags.recursive ?? false;

main({ directory: flags.directory, pkg: flags.package, recursive })
	.then(console.log)
	.catch(console.error);

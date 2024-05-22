#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { main } from "../src/has-script.mjs";
import { GLOBAL_FLAGS } from "./global-flags.mjs";

const { values: flags } = parseArgs({
	strict: true,
	options: {
		...GLOBAL_FLAGS,
		task: {
			type: "string",
			multiple: false,
			short: "t",
		},
	},
});

if (!flags.directory) {
	throw new Error("--directory is required");
}

if (!flags.task) {
	throw new Error("--task is required");
}

console.log("flags", flags);

main({
	directory: resolve(flags.directory),
	task: flags.task,
}).catch(console.error);

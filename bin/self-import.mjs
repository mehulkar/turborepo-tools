#!/usr/bin/env node
import { parseArgs } from "node:util";
import { main } from "../src/self-import.mjs";
import { GLOBAL_FLAGS } from "./global-flags.mjs";

const { values: flags } = parseArgs({
	strict: true,
	options: {
		...GLOBAL_FLAGS,
		"dry-run": {
			type: "boolean",
			multiple: false,
			default: false,
		},
		limit: {
			type: "string",
			multiple: false,
			short: "l",
			default: "10",
		},
		only: {
			type: "string",
			multiple: true,
			default: [],
		},
	},
});

if (flags.debug) {
	console.log("flags", flags);
}

main(flags).catch(console.error);

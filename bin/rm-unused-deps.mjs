#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { GLOBAL_FLAGS } from "./global-flags.mjs";
import { main } from "../src/rm-unused-deps.mjs";

const { values: flags } = parseArgs({
	strict: true,
	options: {
		...GLOBAL_FLAGS,

		"dry-run": {
			type: "boolean",
			multiple: false,
			default: false,
		},
		"only-prefix": {
			type: "string",
			multiple: true,
			default: [],
		},

		// Skip dependencies that we don't want to do anything to
		skip: {
			type: "string",
			multiple: true,
			short: "s",
			default: [], // TODO: not sure why, but default isn't working
		},

		// TODO: add --pristine flag to keep some packages untouched
		// TODO: add --only feature to target removing only a specific dependency from package.json
	},
});

if (flags.debug) {
	console.log("flags", flags);
}

const normalizedFlags = normalizeFlags(flags);

if (!normalizedFlags.directory) {
	throw new Error("--directory is required");
}

main({
	directory: normalizedFlags.directory,
	onlyPrefix: normalizedFlags.onlyPrefix,
	skip: normalizedFlags.skip,
}).catch(console.error);

function normalizeFlags(flags) {
	return {
		...flags,
		directory: resolve(flags.directory),
		onlyPrefix: flags["only-prefix"],
	};
}

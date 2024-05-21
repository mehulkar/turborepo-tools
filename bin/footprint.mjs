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

console.log("flags", flags);

main({
	dir: resolve(flags.directory),
	pkg: flags.package,
}).catch(console.error);

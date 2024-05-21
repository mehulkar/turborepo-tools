#!/usr/bin/env node

import { parseArgs } from "node:util";
import { main } from "../src/root-deps.mjs";

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

		// No diffs at the end, just the logs
		"dry-run": {
			type: "boolean",
			multiple: false,
			default: false,
		},

		// Limit the number of moved dependencies. If you have a lot you might just want to do a
		// few at a time so the diff is more easily reviewable.
		limit: {
			type: "string",
			multiple: false,
			short: "l",
			default: "10",
		},

		// No diffs to these directories. If the directories are packages, and they have imports
		// those imports will stay in the root package.json.
		// TODO: allow including directories that _aren't_ packages.
		pristine: {
			type: "string",
			multiple: true,
			short: "p",
			default: [], // TODO: not sure why, but default isn't working
		},

		// Some packages that are either used globally in scripts or for some
		// either caused CI to break. We can probably move them individually
		skip: {
			type: "string",
			multiple: true,
			short: "s",
			default: [], // TODO: not sure why, but default isn't working
		},
		"skip-prefix": {
			type: "string",
			multiple: true,
			default: [], // TODO: not sure why, but default isn't working
		},

		// Include devDependencies
		"include-dev": {
			type: "boolean",
			default: true,
		},

		// Handle `@types/*` dependencies in root package.json. This uses naming conventions
		// For `@types/foo`, it will look for imports of 'foo' to determine whether `@types/foo` should
		// be moved.
		"include-types": {
			type: "boolean",
			default: true,
		},

		"only-prefix": {
			type: "string",
			multiple: true,
			default: [],
		},

		only: {
			type: "string",
			multiple: true,
			default: [],
		},
	},
});

console.log("flags", flags);

main(flags).catch(console.error);

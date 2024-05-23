#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { main } from "../src/root-deps.mjs";
import { GLOBAL_FLAGS } from "./global-flags.mjs";

const { values: flags } = parseArgs({
	strict: true,
	options: {
		...GLOBAL_FLAGS,

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

const normalizedFlags = normalizeFlags(flags);
validateFlags(normalizedFlags);

console.log("flags", normalizedFlags);

if (normalizeFlags.dryRun) {
	console.log("doing dry run");
}

main(normalizedFlags).catch(console.error);

function normalizeFlags(flags) {
	return {
		directory: resolve(flags.directory),
		dryRun: flags["dry-run"],
		includeDevDeps: flags["include-dev"],
		includeTypes: flags["include-types"],
		limit: flags.limit ? Number(flags.limit) : Number.POSITIVE_INFINITY,
		only: flags.only ?? [],
		onlyPrefix: flags["only-prefix"] ?? [],
		pristine: flags.pristine ?? [],
		skip: flags.skip ?? [],
		skipPrefix: flags["skip-prefix"] ?? [],
	};
}

function validateFlags(flags) {
	if (flags.skipPrefix.includes("@types/") && flags.includeTypes) {
		throw new Error(
			"--skip-prefix=@types/ and --include-types don't make sense together",
		);
	}

	if (flags.onlyPrefix.length > 0) {
		if (skip.length > 0) {
			throw new Error("Cannot use both --only-prefix && --skip together");
		}

		if (flags.skipPrefix.length > 0) {
			throw new Error(
				"Cannot use both --only-prefix && --skip-prefix together",
			);
		}
	}

	if (flags.only.length > 0) {
		if (flags.skip.length > 0) {
			throw new Error("Cannot use both --only && --skip together");
		}

		if (flags.skipPrefix.length > 0) {
			throw new Error("Cannot use both --only && --skip-prefix together");
		}
	}
}

#!/usr/bin/env node

import { main } from "../src/self-import.mjs";

const { values: flags } = parseArgs({
  strict: true,
  options: {
    "dry-run": {
      type: "boolean",
      multiple: false,
      default: false,
    },
    // The path to your repo. In most cases, just do `-d .` when you're already in the repo dir.
    directory: {
      type: "string",
      multiple: false,
      short: "d",
      default: ".",
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

console.log(flags);

main(flags).catch(console.error);

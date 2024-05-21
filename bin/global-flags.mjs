export const GLOBAL_FLAGS = {
	// The path to your repo. In most cases, just do `-d .` when you're already in the repo dir.
	directory: {
		type: "string",
		multiple: false,
		short: "d",
		default: ".",
	},
};

import fs from "node:fs/promises";

export async function readPackageJson(filePath) {
	const fileContents = await fs.readFile(filePath, "utf8");
	return JSON.parse(fileContents);
}

export async function writePackageJson(filePath, content) {
	const stringified = JSON.stringify(content, null, 2);
	await fs.writeFile(filePath, `${stringified}\n`, "utf8");
}

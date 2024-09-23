import * as fs from "node:fs";
import * as path from "node:path";
import {
	importDirectorySync,
	cleanupSVG,
	runSVGO,
	type IconSet,
	type SVG,
} from "@iconify/tools";
import type { ImportDirectoryFileEntry } from "@iconify/tools/lib/import/directory.js";

function keyword(
	file: ImportDirectoryFileEntry,
	defaultKeyword: string,
	iconSet: IconSet,
) {
	const rename = defaultKeyword.replace("res-", "").replace("arch-", "");
	return rename;
}

function processIcon(name: string, svg: SVG, iconSet: IconSet) {
	const sizes = ["64", "48", "32"];
	const sizeRegex = new RegExp(`-(${sizes.join("|")})$`);
	const match = name.match(sizeRegex);

	if (!match) {
		iconSet.fromSVG(name, svg);
		return;
	}

	const size = match[1];
	const alias = name
		.replace(`-${size}`, "")
		.replace(/^amazon-/, "")
		.replace(/^aws-/, "");

	if (size === "64" || !iconSet.exists(name.replace(size, "64"))) {
		iconSet.fromSVG(name, svg);
		iconSet.setAlias(alias, name);
	}

	if (size === "32" && !iconSet.exists(name.replace("32", "48"))) {
		iconSet.fromSVG(name, svg);
		iconSet.setAlias(alias, name);
	}
}

const handler = () => {
	// Import icons
	const iconSet = importDirectorySync("files/svg", {
		prefix: "aws",
		includeSubDirs: true,
		keyword: keyword,
	});

	// Validate, clean up, fix palette and optimise
	iconSet.forEachSync((name, type) => {
		if (type !== "icon") {
			return;
		}

		const svg = iconSet.toSVG(name);
		if (!svg) {
			// Invalid icon
			iconSet.remove(name);
			return;
		}

		// Clean up and optimise icons
		try {
			// Clean up icon code
			cleanupSVG(svg);

			// Optimise
			runSVGO(svg);
		} catch (err) {
			// Invalid icon
			console.error(`Error parsing ${name}:`, err);
			iconSet.remove(name);
			return;
		}
		processIcon(name, svg, iconSet);
	});

	// Export
	// console.log(iconSet.export());

	const result = iconSet.export();
	fs.writeFileSync(
		path.join(__dirname, "./logos/aws/icons.json"),
		JSON.stringify(result, undefined, 2),
	);
};

handler();

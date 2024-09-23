import * as fs from "node:fs";
import * as path from "node:path";
import {
	importDirectorySync,
	cleanupSVG,
	runSVGO,
	parseColors,
	isEmptyColor,
	type IconSet,
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
// Import icons
const iconSet = importDirectorySync("files/svg", {
	prefix: "aws",
	includeSubDirs: true,
	keyword: keyword,
});

const sizes = ["16", "32", "48", "64"];

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

		// Assume icon is monotone: replace color with currentColor, add if missing
		// If icon is not monotone, remove this code
		// parseColors(svg, {
		// 	defaultColor: "currentColor",
		// 	callback: (attr, colorStr, color) => {
		// 		return !color || isEmptyColor(color) ? colorStr : "currentColor";
		// 	},
		// });

		// Optimise
		runSVGO(svg);
	} catch (err) {
		// Invalid icon
		console.error(`Error parsing ${name}:`, err);
		iconSet.remove(name);
		return;
	}

	if (name.includes("64")) {
		let alias = name.replace("-64", "");
		alias = alias.startsWith("amazon-") ? alias.replace("amazon-", "") : alias;
		iconSet.fromSVG(name, svg);
		iconSet.setAlias(alias, name);
		return;
	}
	if (name.includes("-48")) {
		let alias = name.replace("-48", "");
		alias = alias.startsWith("amazon-") ? alias.replace("amazon-", "") : alias;
		const baseName = name.replace("-48", "-xx");
		const largerSize = baseName.replace("-xx", "-64");
		if (!iconSet.exists(largerSize)) {
			console.log("Set Alias for -48", alias);
			iconSet.fromSVG(name, svg);
			iconSet.setAlias(alias, name);
		}
		return;
	}
	if (name.includes("-32")) {
		let alias = name.replace("-32", "");
		alias = alias.startsWith("amazon-") ? alias.replace("amazon-", "") : alias;
		const baseName = name.replace("-32", "-xx");
		let largerSize = baseName.replace("-xx", "-64");
		if (!iconSet.exists(largerSize)) {
			console.log("Set Alias for -32", alias);
			iconSet.fromSVG(name, svg);
			iconSet.setAlias(alias, name);
		}
		largerSize = baseName.replace("-xx", "-48");
		if (!iconSet.exists(largerSize)) {
			console.log("Set Alias for -32", alias);
			iconSet.fromSVG(name, svg);
			iconSet.setAlias(alias, name);
		}
		return;
	}

	// Update icon
	iconSet.fromSVG(name, svg);
});

// Export
// console.log(iconSet.export());

const result = iconSet.export();
fs.writeFileSync(
	path.join(__dirname, "./logos/aws/icons.json"),
	JSON.stringify(result),
);

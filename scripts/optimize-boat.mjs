import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compress, readGlb } from "./optimize-assets.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "public/optimized/boat");
mkdirSync(output, { recursive: true });
const temp = mkdtempSync(join(tmpdir(), "coast-boat-"));
try {
	execFileSync("unzip", [
		"-q",
		join(root, "assets/boat/boat.usdz"),
		"-d",
		temp,
	]);
	for (const [source, name, size, quality] of [
		["Boat_baseColor.jpg", "color.webp", 1024, 90],
		["Boat_normal.jpg", "normal.webp", 512, 88],
		["Boat_metallicRoughness_rough.jpg", "roughness.webp", 512, 85],
	]) {
		execFileSync("cwebp", [
			"-quiet",
			"-resize",
			String(size),
			String(size),
			"-q",
			String(quality),
			"-m",
			"6",
			join(temp, "0", source),
			"-o",
			join(output, name),
		]);
	}
	await compress(
		await readGlb("assets/boat/boat-web.glb"),
		"public/optimized/boat/boat.glb",
	);
	const size = [
		"boat.glb",
		"color.webp",
		"normal.webp",
		"roughness.webp",
	].reduce((sum, f) => sum + statSync(join(output, f)).size, 0);
	console.log(
		`Boat total: ${size.toLocaleString()} bytes; supplied USDZ: ${statSync(join(root, "assets/boat/boat.usdz")).size.toLocaleString()} bytes`,
	);
} finally {
	rmSync(temp, { recursive: true, force: true });
}

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Keep the original Blender exports available locally without shipping duplicate
// source scenes and PNGs alongside the optimized runtime assets.
function runtimeAssets() {
	let publicDir;
	const sources = new Set([
		"Try1.glb",
		"coast-hq.glb",
		"coast-lit.glb",
		"lighting",
	]);
	return {
		name: "runtime-assets",
		apply: "build",
		configResolved(config) {
			publicDir = config.publicDir;
		},
		async generateBundle() {
			const copy = async (directory, prefix = "") => {
				for (const entry of await readdir(directory, { withFileTypes: true })) {
					if (
						entry.name.startsWith(".") ||
						(!prefix && sources.has(entry.name))
					)
						continue;
					const fileName = prefix + entry.name;
					const absolute = join(directory, entry.name);
					if (entry.isDirectory()) await copy(absolute, `${fileName}/`);
					else
						this.emitFile({
							type: "asset",
							fileName,
							source: await readFile(absolute),
						});
				}
			};
			await copy(publicDir);
		},
	};
}

export default defineConfig({
	plugins: [react(), tailwindcss(), runtimeAssets()],
	build: { copyPublicDir: false },
});

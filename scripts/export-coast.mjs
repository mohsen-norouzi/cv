import { writeFile } from "node:fs/promises";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildCoast } from "../src/experience/buildCoast.js";
import { LANDMARKS } from "../src/experience/coastLayout.js";

// GLTFExporter uses FileReader for its binary buffer even when there are no images.
class NodeFileReader {
	readAsArrayBuffer(blob) {
		blob.arrayBuffer().then((result) => {
			this.result = result;
			this.onloadend?.();
		});
	}
	readAsDataURL(blob) {
		blob.arrayBuffer().then((result) => {
			this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
			this.onloadend?.();
		});
	}
}
globalThis.FileReader ??= NodeFileReader;
const { root, lanterns, audit } = buildCoast();
root.name = "Mohsen — HQ coast";
root.userData.lanterns = lanterns;
await writeFile(
	new URL("../assets/coast-layout.json", import.meta.url),
	JSON.stringify(LANDMARKS, null, 2),
);
await writeFile(
	new URL("../assets/placement-audit.json", import.meta.url),
	JSON.stringify(audit, null, 2),
);
let triangles = 0,
	meshes = 0;
root.traverse((object) => {
	if (!object.isMesh) return;
	meshes++;
	const p = object.geometry.attributes.position;
	for (const value of p.array)
		if (!Number.isFinite(value))
			throw new Error(`Invalid vertex in ${object.name}`);
	triangles += p.count / 3;
});
const binary = await new GLTFExporter().parseAsync(root, {
	binary: true,
	onlyVisible: true,
});
const output = new URL("../assets/coast-source.glb", import.meta.url);
await writeFile(output, Buffer.from(binary));
console.log(
	`Saved assets/coast-source.glb: ${meshes} meshes, ${triangles.toLocaleString()} triangles, ${(binary.byteLength / 1024 / 1024).toFixed(2)} MB.`,
);

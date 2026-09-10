import { readFile, writeFile } from "node:fs/promises";

// Blender adds a zero-filled color attribute to unpainted meshes when they are
// joined with painted terrain. glTF would multiply those materials by black.
const file = new URL("../public/coast-lit.glb", import.meta.url);
const source = await readFile(file);
const jsonLength = source.readUInt32LE(12);
const document = JSON.parse(source.subarray(20, 20 + jsonLength));
let removed = 0;
for (const mesh of document.meshes) {
	for (const primitive of mesh.primitives) {
		const name = document.materials[primitive.material]?.name ?? "";
		if (
			/^(Cliff|Bridge masonry|Citadel limestone|Oxidized roofs)/.test(name) &&
			primitive.attributes.COLOR_0 !== undefined
		) {
			delete primitive.attributes.COLOR_0;
			removed++;
		}
		if (
			primitive.attributes.TEXCOORD_0 === undefined &&
			mesh.name?.startsWith("Baked")
		) {
			throw new Error(`Missing bake UVs on ${mesh.name}`);
		}
	}
}
const json = Buffer.from(JSON.stringify(document));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(padded);
const remainder = source.subarray(20 + jsonLength);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + padded.length + remainder.length, 8);
header.writeUInt32LE(padded.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
await writeFile(file, Buffer.concat([header, padded, remainder]));
console.log(`Validated coast GLB; removed ${removed} empty color layers.`);

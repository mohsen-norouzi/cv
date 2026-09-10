import { writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import * as THREE from "three";
import { buildCoast } from "../src/experience/buildCoast.js";
import {
	SEA_LEVEL,
	SHORE_BOUNDS,
	SHORE_RANGE,
} from "../src/experience/oceanSurface.js";

// Slice the authored meshes at the waterline. No hand-drawn island approximation
// and no per-frame depth readback: a small distance field follows every cliff.
const { root } = buildCoast();
root.updateMatrixWorld(true);
const size = 512,
	[minX, minZ, width, depth] = SHORE_BOUNDS;
const field = new Float32Array(size * size).fill(SHORE_RANGE);
let segments = 0;
const vertices = [
	new THREE.Vector3(),
	new THREE.Vector3(),
	new THREE.Vector3(),
];
root.traverse((mesh) => {
	if (!mesh.isMesh || mesh.name.startsWith("Mountain ridge")) return;
	const pos = mesh.geometry.attributes.position,
		index = mesh.geometry.index;
	for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
		for (let j = 0; j < 3; j++)
			vertices[j]
				.fromBufferAttribute(pos, index ? index.getX(i + j) : i + j)
				.applyMatrix4(mesh.matrixWorld);
		const hits = [];
		for (let j = 0; j < 3; j++) {
			const a = vertices[j],
				b = vertices[(j + 1) % 3];
			if (a.y < SEA_LEVEL === b.y < SEA_LEVEL) continue;
			const t = (SEA_LEVEL - a.y) / (b.y - a.y);
			hits.push([a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t]);
		}
		if (hits.length !== 2) continue;
		const [[ax, az], [bx, bz]] = hits,
			dx = bx - ax,
			dz = bz - az,
			len = dx * dx + dz * dz;
		if (len < 1e-10) continue;
		segments++;
		const x0 = Math.max(
			0,
			Math.floor(((Math.min(ax, bx) - SHORE_RANGE - minX) / width) * size),
		);
		const x1 = Math.min(
			size - 1,
			Math.ceil(((Math.max(ax, bx) + SHORE_RANGE - minX) / width) * size),
		);
		const y0 = Math.max(
			0,
			Math.floor(((Math.min(az, bz) - SHORE_RANGE - minZ) / depth) * size),
		);
		const y1 = Math.min(
			size - 1,
			Math.ceil(((Math.max(az, bz) + SHORE_RANGE - minZ) / depth) * size),
		);
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const px = minX + ((x + 0.5) / size) * width,
					pz = minZ + ((y + 0.5) / size) * depth;
				const t = Math.max(
					0,
					Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len),
				);
				field[y * size + x] = Math.min(
					field[y * size + x],
					Math.hypot(px - ax - dx * t, pz - az - dz * t),
				);
			}
	}
});
const crcTable = Array.from({ length: 256 }, (_, n) => {
	for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
	return n >>> 0;
});
function chunk(type, data) {
	const name = Buffer.from(type),
		body = Buffer.concat([name, data]);
	let crc = 0xffffffff;
	for (const b of body) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
	const h = Buffer.alloc(4),
		t = Buffer.alloc(4);
	h.writeUInt32BE(data.length);
	t.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	return Buffer.concat([h, body, t]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
const pixels = Buffer.alloc(size * (size + 1));
for (let y = 0; y < size; y++)
	for (let x = 0; x < size; x++)
		pixels[y * (size + 1) + x + 1] = Math.round(
			(field[y * size + x] / SHORE_RANGE) * 255,
		);
const png = Buffer.concat([
	Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
	chunk("IHDR", header),
	chunk("IDAT", deflateSync(pixels)),
	chunk("IEND", Buffer.alloc(0)),
]);
await writeFile(new URL("../public/optimized/shore.png", import.meta.url), png);
console.log(
	`Shoreline: ${segments} rock/water intersections, ${size}×${size}, ${(png.length / 1024).toFixed(1)} KB`,
);

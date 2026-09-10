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
const { root, audit } = buildCoast();
const soundShore = new Map();
root.updateMatrixWorld(true);
const size = 512,
	[minX, minZ, width, depth] = SHORE_BOUNDS;
const field = new Float32Array(size * size).fill(SHORE_RANGE);
const heights = new Float32Array(size * size).fill(-2);
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
		// Highest solid surface at each pixel, for soft inland mist intersections.
		if (/^(Coastal escarpment|Cliff|Paving|Limestone)/.test(mesh.name)) {
			const [a, b, c] = vertices;
			const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
			if (Math.abs(den) > 1e-8) {
				const x0 = Math.max(
					0,
					Math.floor(((Math.min(a.x, b.x, c.x) - minX) / width) * size),
				);
				const x1 = Math.min(
					size - 1,
					Math.ceil(((Math.max(a.x, b.x, c.x) - minX) / width) * size),
				);
				const z0 = Math.max(
					0,
					Math.floor(((Math.min(a.z, b.z, c.z) - minZ) / depth) * size),
				);
				const z1 = Math.min(
					size - 1,
					Math.ceil(((Math.max(a.z, b.z, c.z) - minZ) / depth) * size),
				);
				for (let row = z0; row <= z1; row++)
					for (let col = x0; col <= x1; col++) {
						const x = minX + ((col + 0.5) / size) * width,
							z = minZ + ((row + 0.5) / size) * depth;
						const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / den;
						const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / den;
						if (u >= 0 && v >= 0 && u + v <= 1)
							heights[row * size + col] = Math.max(
								heights[row * size + col],
								u * a.y + v * b.y + (1 - u - v) * c.y,
							);
					}
			}
		}
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
		// Spatial sound uses the same actual waterline, reduced to a 3 m grid.
		const x = (ax + bx) / 2,
			z = (az + bz) / 2;
		soundShore.set(
			`${Math.round(x / 3)},${Math.round(z / 3)}`,
			[x, SEA_LEVEL, z].map((v) => +v.toFixed(3)),
		);
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

for (let y = 0; y < size; y++)
	for (let x = 0; x < size; x++)
		pixels[y * (size + 1) + x + 1] = Math.round(
			Math.min(1, Math.max(0, (heights[y * size + x] + 2) / 42)) * 255,
		);
const heightPng = Buffer.concat([
	Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
	chunk("IHDR", header),
	chunk("IDAT", deflateSync(pixels)),
	chunk("IEND", Buffer.alloc(0)),
]);
await writeFile(
	new URL("../public/optimized/mist-height.png", import.meta.url),
	heightPng,
);
console.log(`Mist terrain heights: ${(heightPng.length / 1024).toFixed(1)} KB`);

await writeFile(
	new URL("../public/optimized/soundscape.json", import.meta.url),
	JSON.stringify({
		shore: [...soundShore.values()],
		trees: audit.plants
			.filter((p) => p.kind !== "grass")
			.map((p) => [p.position[0], p.position[1] + 2.5, p.position[2]]),
		insects: [
			...audit.plants.filter((p) => p.kind === "grass").map((p) => p.position),
			...audit.lanterns.map((l) => l.position),
		],
	}),
);

import fs from "node:fs";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createWalkGround, moveWalker } from "../src/experience/walkPhysics.js";
import { COAST_PATH, LANDMARKS } from "../src/experience/coastLayout.js";
import {
	EXPANSION_PATH,
	FUTURE_TERRACES,
} from "../src/experience/expansionLayout.js";
import { createRoadSampler } from "../src/experience/placement.js";
const bytes = fs.readFileSync(
	new URL("../public/optimized/coast.glb", import.meta.url),
);
const { scene } = await new GLTFLoader()
	.setMeshoptDecoder(MeshoptDecoder)
	.parseAsync(
		bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		"",
	);
const ground = createWalkGround(scene);
let points = 0;
for (const [path, arc] of [
	[COAST_PATH, true],
	[EXPANSION_PATH, false],
]) {
	const p = arc ? path.getPointAt(0.005) : path.getPoint(0.005);
	p.y = ground(p.x, p.z, p.y);
	assert.notEqual(p.y, null, "No ground at spawn");
	for (let i = 7; i <= 1197; i++) {
		const q = arc ? path.getPointAt(i / 1200) : path.getPoint(i / 1200);
		moveWalker(p, q.x - p.x, q.z - p.z, ground, []);
		assert.ok(
			Math.hypot(p.x - q.x, p.z - q.z) < 0.12,
			`Exported route blocked at ${i}/1200 (${arc ? "main" : "extension"})`,
		);
		points++;
	}
}
for (const [sites, path] of [
	[LANDMARKS, COAST_PATH],
	[FUTURE_TERRACES, EXPANSION_PATH],
])
	for (const site of sites) {
		const [x, y, z] = site.position,
			p = createRoadSampler(path)(x, z).point;
		p.y = ground(p.x, p.z, p.y);
		for (let i = 0; i < 300; i++) {
			const d = new THREE.Vector3(x - p.x, 0, z - p.z);
			if (d.length() < 0.04) break;
			d.setLength(0.04);
			moveWalker(p, d.x, d.z, ground, []);
		}
		assert.ok(
			Math.hypot(p.x - x, p.z - z) < 0.1,
			`Exported terrace inaccessible: ${site.name}`,
		);
		assert.ok(
			Math.abs(p.y - y) < 0.04,
			`Exported terrace has incorrect height: ${site.name}`,
		);
	}
let count = 0,
	lamps = 0;
scene.traverse((o) => {
	if (o.isMesh) count++;
	lamps += o.userData.lanterns?.length ?? 0;
});
console.log(
	`Runtime GLB verified: ${points} walking samples, nine accessible terraces, ${count} draw meshes, ${lamps} lamp anchors.`,
);

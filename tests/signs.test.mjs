import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
	COAST_SIGNS,
	SIGN_OBSTACLES,
	buildWayfinding,
} from "../src/experience/buildWayfinding.js";
import { COAST_PATH, LANDMARKS } from "../src/experience/coastLayout.js";
import {
	EXPANSION_PATH,
	FUTURE_TERRACES,
} from "../src/experience/expansionLayout.js";
import { createRoadSampler } from "../src/experience/placement.js";
import { createWalkGround, moveWalker } from "../src/experience/walkPhysics.js";
const load = async (name) => {
	const bytes = fs.readFileSync(
		new URL(`../public/optimized/${name}`, import.meta.url),
	);
	return (
		await new GLTFLoader()
			.setMeshoptDecoder(MeshoptDecoder)
			.parseAsync(
				bytes.buffer.slice(
					bytes.byteOffset,
					bytes.byteOffset + bytes.byteLength,
				),
				"",
			)
	).scene;
};
const [coast, source] = await Promise.all([
	load("coast.glb"),
	load("signs/woodsign.glb"),
]);
coast.updateMatrixWorld(true);
const terrain = [],
	limestone = [];
coast.traverse((o) => {
	if (o.isMesh && o.material.name.startsWith("Material_0")) terrain.push(o);
	if (o.isMesh && /^Limestone/.test(o.material.name)) limestone.push(o);
});
const ray = new THREE.Raycaster(
	new THREE.Vector3(),
	new THREE.Vector3(0, -1, 0),
);
const down = (x, z, platform = false) => {
	ray.ray.origin.set(x, 60, z);
	return ray.intersectObjects(platform ? limestone : terrain, false)[0];
};

test("sign faces are readable from the path and not hidden behind lamps", () => {
	const audit = JSON.parse(
		fs.readFileSync(new URL("../assets/placement-audit.json", import.meta.url)),
	);
	for (const sign of COAST_SIGNS) {
		const position = new THREE.Vector3(...sign.position);
		const approach = new THREE.Vector3(...sign.approach);
		const towardViewer = approach.clone().sub(position).setY(0).normalize();
		const facing = new THREE.Vector3(Math.sin(sign.yaw), 0, Math.cos(sign.yaw));
		assert.ok(
			facing.dot(towardViewer) >= 0.75,
			`${sign.id} is edge-on to the path`,
		);
		const sight = position.clone().sub(approach).setY(0);
		for (const {
			position: [x, , z],
		} of audit.lanterns) {
			const u =
				((x - approach.x) * sight.x + (z - approach.z) * sight.z) /
				sight.lengthSq();
			assert.ok(
				u <= 0 ||
					u >= 1 ||
					Math.hypot(
						x - approach.x - u * sight.x,
						z - approach.z - u * sight.z,
					) >= 0.75,
				`${sign.id} is hidden behind a lamp`,
			);
		}
	}
});

test("all sign posts are supported by the actual shipped terrain, clear of roads and with solid footings", () => {
	const nearest = [
		createRoadSampler(COAST_PATH),
		createRoadSampler(EXPANSION_PATH),
	];
	for (const sign of COAST_SIGNS) {
		const [x, y, z] = sign.position;
		assert.ok(
			Math.abs(down(x, z, sign.surface === "platform").point.y - y) < 0.001,
			`${sign.id} is floating`,
		);
		for (const [dx, dz] of [
			[0.17, 0],
			[-0.17, 0],
			[0, 0.17],
			[0, -0.17],
		]) {
			const hit = down(x + dx, z + dz, sign.surface === "platform");
			assert.ok(
				hit && Math.abs(hit.point.y - y) < 0.15,
				`${sign.id} has an unsupported footing`,
			);
		}
		nearest.forEach((sample, i) => {
			const road = sample(x, z);
			assert.ok(
				road.distance >= (i ? 1.6 : road.halfWidth) + 0.73,
				`${sign.id} intrudes into road`,
			);
		});
		if (sign.surface !== "platform")
			for (const t of [...LANDMARKS, ...FUTURE_TERRACES])
				assert.ok(
					Math.hypot(x - t.position[0], z - t.position[2]) >
						t.radius * 1.19 + 1,
				);
	}
});

test("remaining castle arrow points toward the castle", () => {
	const sign = COAST_SIGNS.find((s) => s.id === "crossroads");
	const castle = COAST_PATH.getPointAt(0.95);
	const side =
		(castle.x - sign.position[0]) * Math.cos(sign.yaw) -
		(castle.z - sign.position[2]) * Math.sin(sign.yaw);
	assert.ok(side * (sign.flip ? -1 : 1) > 0);
	assert.equal(sign.variant, "Arrow");
	assert.deepEqual(sign.lines, ["Castle"]);
	assert.ok(
		!COAST_SIGNS.some((s) => s.id === "music" || s.id === "collection"),
	);
});

test("all signs fit in three draw meshes, with finite geometry and a small download", () => {
	const material = new THREE.MeshStandardMaterial();
	const signs = buildWayfinding(source, {
		wood: material,
		paint: material,
		stone: material,
	});
	assert.equal(signs.children.length, 3);
	let triangles = 0;
	for (const mesh of signs.children) {
		assert.ok(mesh.geometry.attributes.position.count > 0);
		for (const attr of Object.values(mesh.geometry.attributes))
			for (const v of attr.array) assert.ok(Number.isFinite(v));
		triangles += mesh.geometry.attributes.position.count / 3;
	}
	assert.ok(triangles < 1000);
	const size = ["woodsign.glb"].reduce(
		(n, file) =>
			n +
			fs.statSync(new URL(`../public/optimized/signs/${file}`, import.meta.url))
				.size,
		0,
	);
	assert.ok(size < 20_000, `sign download grew to ${size} bytes`);
});

test("walkers can traverse both routes with the sign collisions enabled", () => {
	const ground = createWalkGround(coast);
	for (const [path, arc] of [
		[COAST_PATH, true],
		[EXPANSION_PATH, false],
	]) {
		const at = (t) => (arc ? path.getPointAt(t) : path.getPoint(t));
		const p = at(0.006);
		p.y = ground(p.x, p.z, p.y);
		for (let i = 8; i < 1190; i++) {
			const q = at(i / 1200);
			moveWalker(p, q.x - p.x, q.z - p.z, ground, SIGN_OBSTACLES);
			assert.ok(
				Math.hypot(p.x - q.x, p.z - q.z) < 0.12,
				`sign obstructs route ${i}`,
			);
		}
	}
});

test("every project has a name plate with the correct year", () => {
	const plates = COAST_SIGNS.filter((s) => s.project !== undefined);
	assert.equal(plates.length, 3);
	assert.deepEqual(plates[0].lines, ["Ekaterina", "Shelehova", "2024"]);
	assert.deepEqual(plates[1].lines, ["Bavo", "Bakes", "2026"]);
	for (const s of plates) {
		const landmark = LANDMARKS[s.project];
		assert.ok(
			Math.hypot(
				s.position[0] - landmark.position[0],
				s.position[2] - landmark.position[2],
			) >
				landmark.radius - 0.6,
		);
	}
});

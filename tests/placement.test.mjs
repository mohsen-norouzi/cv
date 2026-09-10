import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildCoast } from "../src/experience/buildCoast.js";
import { COAST_PATH, LANDMARKS } from "../src/experience/coastLayout.js";
import {
	createRoadSampler,
	roadHalfWidth,
} from "../src/experience/placement.js";

const { root, audit } = buildCoast();
root.updateMatrixWorld(true);
const nearestRoad = createRoadSampler(COAST_PATH);
const obstacles = root.children.filter(
	(o) =>
		o.isMesh &&
		(o.name === "Coastal escarpment" || /^(Cliff|Mountain)/.test(o.name)),
);
const ray = new THREE.Raycaster(
	new THREE.Vector3(),
	new THREE.Vector3(0, -1, 0),
);
function assertClear(x, y, z, label) {
	ray.ray.origin.set(x, 80, z);
	const hit = ray.intersectObjects(obstacles, false)[0];
	assert.ok(
		!hit || hit.point.y <= y + 0.025,
		`${label}: ${hit?.object.name} breaks through at ${x}, ${z} (${hit?.point.y} > ${y})`,
	);
}

test("all terrace skirts leave at least half a metre of clearance beside the road", () => {
	for (const landmark of LANDMARKS) {
		const [x, , z] = landmark.position;
		for (let i = 0; i < 180; i++) {
			const angle = (i / 180) * Math.PI * 2;
			const road = nearestRoad(
				x + Math.cos(angle) * landmark.radius * 1.19,
				z + Math.sin(angle) * landmark.radius * 1.19,
			);
			assert.ok(
				road.distance - road.halfWidth >= 0.5,
				`${landmark.name} overlaps the road`,
			);
		}
	}
});

test("finished terrain and rocks do not pierce the road or project stages", () => {
	for (let i = 0; i < 340; i++) {
		const t = (i + 0.5) / 340,
			p = COAST_PATH.getPointAt(t),
			d = COAST_PATH.getTangentAt(t);
		const n = new THREE.Vector3(d.z, 0, -d.x).normalize();
		for (let j = -4; j <= 4; j++) {
			const q = p
				.clone()
				.addScaledVector(n, ((roadHalfWidth(t) * j) / 4) * 0.96);
			assertClear(q.x, q.y, q.z, "road");
		}
	}
	for (const landmark of LANDMARKS)
		for (let r = 0; r < 9; r++)
			for (let i = 0; i < 36; i++) {
				const angle = (i / 36) * Math.PI * 2,
					[x, y, z] = landmark.position;
				assertClear(
					x + (Math.sin(angle) * landmark.radius * 0.88 * r) / 8,
					y,
					z + (Math.cos(angle) * landmark.radius * 0.88 * r) / 8,
					landmark.name,
				);
			}
});

test("vegetation roots touch suitable ground and foliage clears the road and stages", () => {
	assert.ok(audit.plants.length > 80, "retain a planted coastline");
	for (const plant of audit.plants) {
		const [x, y, z] = plant.position,
			road = nearestRoad(x, z);
		assert.ok(plant.ground - y > 0 && plant.ground - y <= 0.04);
		assert.ok(plant.normalY >= 0.65);
		assert.ok(road.distance > road.halfWidth + plant.radius);
		for (const landmark of LANDMARKS)
			assert.ok(
				Math.hypot(x - landmark.position[0], z - landmark.position[2]) >
					landmark.radius * 1.19 + plant.radius,
			);
	}
});

test("every roadside lantern has a footing reaching solid ground", () => {
	const originalLanterns = audit.lanterns.filter(
		(lantern) => !lantern.expansion,
	);
	assert.equal(originalLanterns.length, 19);
	for (const lantern of originalLanterns) {
		assert.notEqual(lantern.ground, null);
		assert.ok(lantern.footingBottom < lantern.ground);
		assert.ok(lantern.position[1] > lantern.ground);
	}
});

test("paving has continuous support beneath its centre and both edges", () => {
	for (let i = 0; i < 136; i++) {
		const t = (i + 0.5) / 136,
			p = COAST_PATH.getPointAt(t),
			d = COAST_PATH.getTangentAt(t);
		const n = new THREE.Vector3(d.z, 0, -d.x).normalize();
		for (const side of [-0.88, 0, 0.88]) {
			const q = p.clone().addScaledVector(n, roadHalfWidth(t) * side);
			ray.ray.origin.set(q.x, 80, q.z);
			const paving = ray.intersectObjects(
				root.children.filter((o) => o.isMesh && o.name.startsWith("Paving")),
				false,
			)[0];
			assert.ok(paving);
			ray.ray.origin.y = paving.point.y - 0.1;
			const hit = ray.intersectObjects(obstacles, false)[0];
			assert.ok(
				hit && hit.point.y >= paving.point.y - 0.44,
				`Unsupported paving at ${t}, ${side}`,
			);
		}
	}
});

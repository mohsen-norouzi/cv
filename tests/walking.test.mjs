import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildCoast } from "../src/experience/buildCoast.js";
import { COAST_PATH, LANDMARKS } from "../src/experience/coastLayout.js";
import { createRoadSampler } from "../src/experience/placement.js";
import {
	canStand,
	createWalkGround,
	moveWalker,
} from "../src/experience/walkPhysics.js";

const { root } = buildCoast();
const ground = createWalkGround(root);

test("walking follows the actual paving through every bend and incline", () => {
	const position = COAST_PATH.getPointAt(0.02);
	position.y = ground(position.x, position.z, position.y);
	for (let i = 21; i <= 975; i++) {
		const next = COAST_PATH.getPointAt(i / 1000);
		moveWalker(position, next.x - position.x, next.z - position.z, ground, []);
		assert.ok(
			Math.hypot(position.x - next.x, position.z - next.z) < 0.12,
			`Blocked at path ${i / 1000}`,
		);
		assert.ok(Math.abs(position.y - next.y) < 0.3);
	}
});

test("each terrace can be reached from its road approach", () => {
	const nearest = createRoadSampler(COAST_PATH);
	for (const landmark of LANDMARKS) {
		const [x, y, z] = landmark.position;
		const position = nearest(x, z).point;
		position.y = ground(position.x, position.z, position.y);
		for (let i = 0; i < 160; i++) {
			const dx = x - position.x,
				dz = z - position.z,
				d = Math.hypot(dx, dz);
			if (d < 0.05) break;
			moveWalker(position, (dx / d) * 0.045, (dz / d) * 0.045, ground, []);
		}
		assert.ok(
			Math.hypot(position.x - x, position.z - z) < 0.1,
			`${landmark.name} steps blocked`,
		);
		assert.ok(Math.abs(position.y - y) < 0.02);
	}
});

test("walking stops at unsupported edges and solid objects", () => {
	const floor = (x, z, y) =>
		Math.abs(x) < 1 && Math.abs(z) < 2 && Math.abs(y) < 0.4 ? 0 : null;
	const position = new THREE.Vector3(0, 0, 0);
	moveWalker(position, 5, 0, floor, []);
	assert.ok(
		position.x < 0.83 && position.x > 0.7,
		"stops before the edge even for a large movement",
	);
	const obstacle = [{ x: 0, y: 0, z: -1, radius: 0.3 }];
	position.set(0, 0, 0);
	moveWalker(position, 0, -2, floor, obstacle);
	assert.ok(position.z > -0.53);
	assert.equal(canStand(0, 0, 10, ground, []), null);
});

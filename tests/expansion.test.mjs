import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildCoast } from "../src/experience/buildCoast.js";
import {
	EXPANSION_PATH as path,
	EXPANSION_HALF_WIDTH as halfWidth,
	FUTURE_TERRACES,
	BRIDGE_SPANS,
} from "../src/experience/expansionLayout.js";
import { createRoadSampler } from "../src/experience/placement.js";
import { createWalkGround, moveWalker } from "../src/experience/walkPhysics.js";

const { root, audit } = buildCoast(),
	ground = createWalkGround(root),
	nearest = createRoadSampler(path, 600);
test("the new branch connects to the original route and is walkable through all three bridges", () => {
	const pos = path.getPoint(0);
	pos.y = ground(pos.x, pos.z, pos.y);
	for (let i = 1; i <= 1500; i++) {
		const next = path.getPoint(i / 1500);
		moveWalker(pos, next.x - pos.x, next.z - pos.z, ground, []);
		assert.ok(
			Math.hypot(pos.x - next.x, pos.z - next.z) < 0.12,
			`Blocked at extension ${i / 1500}: ${pos.toArray()} / ${next.toArray()}`,
		);
		assert.ok(Math.abs(pos.y - next.y) < 0.3, `Unexpected step at ${i / 1500}`);
	}
	assert.ok(path.getLength() > 100);
});
test("six reserved terraces stay clear of the route and can be reached on foot", () => {
	assert.equal(FUTURE_TERRACES.length, 6);
	for (const site of FUTURE_TERRACES) {
		const [x, y, z] = site.position,
			r = nearest(x, z);
		assert.ok(r.distance - halfWidth - site.radius * 1.19 >= 0.59, site.name);
		const pos = r.point;
		pos.y = ground(pos.x, pos.z, pos.y);
		for (let i = 0; i < 250; i++) {
			const dx = x - pos.x,
				dz = z - pos.z,
				d = Math.hypot(dx, dz);
			if (d < 0.03) break;
			moveWalker(pos, (dx / d) * 0.045, (dz / d) * 0.045, ground, []);
		}
		assert.ok(
			Math.hypot(pos.x - x, pos.z - z) < 0.1,
			`${site.name} is inaccessible`,
		);
		assert.ok(Math.abs(pos.y - y) < 0.03, site.name);
	}
});
test("bridge openings are above open water with supported stone decks", () => {
	const terrain = root.children.filter(
			(o) => o.isMesh && o.name === "Coastal escarpment",
		),
		ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
	const structures = root.children.filter(
		(o) => o.isMesh && /^(Cliff|Limestone|Bridge)/.test(o.name),
	);
	for (const [s, e] of BRIDGE_SPANS) {
		const p = path.getPoint((s + e) / 2);
		ray.ray.origin.set(p.x, 80, p.z);
		const land = ray.intersectObjects(terrain, false)[0];
		assert.ok(
			!land || land.point.y < -0.85,
			`Land blocks bridge channel at ${p.toArray()}`,
		);
		ray.ray.origin.y = p.y - 0.1;
		const support = ray.intersectObjects(structures, false)[0];
		assert.ok(
			support && support.point.y > p.y - 0.45,
			"Deck lacks masonry support",
		);
	}
});
test("new vegetation is grounded and clears the route and reserved terraces", () => {
	for (const plant of audit.plants.filter((p) => p.expansion)) {
		const [x, y, z] = plant.position;
		assert.ok(plant.ground - y > 0 && plant.ground - y < 0.04);
		assert.ok(nearest(x, z).distance > halfWidth + plant.radius);
		for (const site of FUTURE_TERRACES)
			assert.ok(
				Math.hypot(x - site.position[0], z - site.position[2]) >
					site.radius * 1.19 + plant.radius,
			);
	}
});

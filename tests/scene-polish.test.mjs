import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildCoast } from "../src/experience/buildCoast.js";
import { COAST_PATH } from "../src/experience/coastLayout.js";
import {
	EXPANSION_PATH,
	FUTURE_TERRACES,
} from "../src/experience/expansionLayout.js";
import {
	createRoadSampler,
	roadHalfWidth,
} from "../src/experience/placement.js";
import { createLanternLightPool } from "../src/experience/lanternLightPool.js";
const { root, audit } = buildCoast();
root.updateMatrixWorld(true);
const meshes = root.children.filter((o) => o.isMesh);
const ray = new THREE.Raycaster(
	new THREE.Vector3(),
	new THREE.Vector3(0, -1, 0),
);
const paving = meshes.filter((o) => o.name.startsWith("Paving"));
const down = (x, y, z, list) => {
	ray.ray.origin.set(x, y, z);
	ray.ray.direction.set(0, -1, 0);
	return ray.intersectObjects(list, false)[0];
};

test("lamp reassignments are dark, with bounded fades while walking and jumping between projects", () => {
	const positions = Array.from({ length: 25 }, (_, i) => [i * 3, 1, 0]),
		pool = createLanternLightPool(positions);
	let previous = pool.slots.map((s) => ({ ...s }));
	for (let frame = 0; frame < 1800; frame++) {
		const camera = {
			x: frame < 900 ? frame * 0.06 : 70 - (frame - 900) * 0.06,
			y: 2,
			z: 2,
		};
		if (frame === 450) camera.x = 70;
		for (const [i, s] of pool.update(camera, 1 / 60).entries()) {
			if (s.index !== previous[i].index)
				assert.equal(s.strength, 0, "a lit fixture teleported");
			assert.ok(
				Math.abs(s.strength - previous[i].strength) <= 1.25 / 60 + 1e-9,
			);
		}
		assert.equal(
			new Set(pool.slots.filter((s) => s.index >= 0).map((s) => s.index)).size,
			pool.slots.filter((s) => s.index >= 0).length,
		);
		previous = pool.slots.map((s) => ({ ...s }));
	}
});

test("paving joints are closed across their full width, including slopes and bends", () => {
	for (const [path, count, at] of [
		[COAST_PATH, 68, true],
		[EXPANSION_PATH, 172, false],
	]) {
		for (let i = 1; i < count; i++) {
			if (!at && i < 18) continue; // Junction checked separately below.
			const t = i / count,
				p = at ? path.getPointAt(t) : path.getPoint(t),
				d = (at ? path.getTangentAt(t) : path.getTangent(t))
					.setY(0)
					.normalize();
			const n = new THREE.Vector3(d.z, 0, -d.x),
				width = at ? roadHalfWidth(t) : 1.6;
			for (const side of [-0.92, -0.5, 0, 0.5, 0.92]) {
				const q = p.clone().addScaledVector(n, width * side),
					h = down(q.x, p.y + 0.3, q.z, paving);
				assert.ok(
					h && Math.abs(h.point.y - p.y) < 0.03,
					`open joint ${at ? "main" : "extension"} ${i} side ${side}: ${h?.point.y} vs ${p.y}`,
				);
			}
		}
	}
});

test("the branch junction has a single fitted walking surface without a raised overlapping deck", () => {
	for (let i = 0; i <= 90; i++) {
		const p = EXPANSION_PATH.getPoint(i / 1800),
			d = EXPANSION_PATH.getTangent(i / 1800)
				.setY(0)
				.normalize(),
			n = new THREE.Vector3(d.z, 0, -d.x);
		for (const side of [-0.8, 0, 0.8]) {
			const q = p.clone().addScaledVector(n, side * 1.6);
			ray.ray.origin.set(q.x, p.y + 1, q.z);
			ray.ray.direction.set(0, -1, 0);
			const hits = ray
				.intersectObjects(paving, false)
				.filter((h) => h.face.normal.y > 0.1);
			assert.ok(
				hits.length > 0,
				`junction gap at ${i} ${side}: ${q.toArray()}`,
			);
			assert.ok(
				hits.length < 2 || Math.abs(hits[0].point.y - hits[1].point.y) < 0.012,
				"two overlapping walking surfaces",
			);
		}
	}
});

test("railing posts have deck beneath all feet, and every terrace entrance is open at body height", () => {
	for (const post of audit.railPosts) {
		const [x, y, z] = post.position;
		for (const [dx, dz] of [
			[0, 0],
			[0.1, 0],
			[-0.1, 0],
			[0, 0.1],
			[0, -0.1],
		]) {
			const h = down(x + dx, y + 0.2, z + dz, paving);
			assert.ok(
				h && Math.abs(h.point.y - y) < 0.1,
				`unsupported rail post ${post.position}`,
			);
		}
	}
	const sampler = createRoadSampler(EXPANSION_PATH, 600),
		wood = meshes.filter((m) => m.name === "Weathered oak");
	for (const site of FUTURE_TERRACES) {
		const [x, y, z] = site.position,
			r = sampler(x, z),
			end = new THREE.Vector3(x, y, z),
			d = end.clone().sub(r.point).setY(0).normalize();
		for (const side of [-0.45, 0, 0.45]) {
			const origin = r.point
				.clone()
				.add(new THREE.Vector3(d.z * side, 0.8, -d.x * side));
			ray.set(origin, d);
			ray.far = Math.hypot(x - r.point.x, z - r.point.z) - site.radius * 0.75;
			assert.equal(
				ray.intersectObjects(wood, false).length,
				0,
				`${site.name} entrance blocked by a rail`,
			);
		}
	}
	ray.far = Infinity;
});

test("foliage clears lamp housings and castle masonry is supported down to the sea", () => {
	for (const plant of audit.plants)
		for (const lamp of audit.lanterns) {
			assert.ok(
				Math.hypot(
					plant.position[0] - lamp.position[0],
					plant.position[2] - lamp.position[2],
				) >=
					plant.radius + 0.35,
				"lamp is inside foliage",
			);
		}
	const cliff = meshes.filter((m) => m.name.startsWith("Cliff"));
	for (const [x, z] of [
		[19, -40.7],
		[16.2, -38.4],
		[21.8, -38.4],
		[16.2, -43],
		[21.8, -43],
	]) {
		assert.ok(
			down(x, 19.3, z, cliff)?.point.y >= 19.15,
			"castle base lacks contact",
		);
		// Looking upward from below the seabed must hit the foundation underside.
		ray.set(new THREE.Vector3(x, -3, z), new THREE.Vector3(0, 1, 0));
		const h = ray.intersectObjects(cliff, false)[0];
		assert.ok(h && h.point.y < -0.85, "castle rock floats above the sea");
	}
});

test("the branch landing has no height jumps between adjacent clipped slabs", () => {
	for (let i = 1; i < 18; i++) {
		const t = i / 172,
			p = EXPANSION_PATH.getPoint(t),
			d = EXPANSION_PATH.getTangent(t).setY(0).normalize(),
			n = new THREE.Vector3(d.z, 0, -d.x);
		for (let k = -8; k <= 8; k++) {
			const q = p.clone().addScaledVector(n, k * 0.18),
				a = q.clone().addScaledVector(d, -0.003),
				b = q.clone().addScaledVector(d, 0.003);
			const ha = down(a.x, p.y + 2, a.z, paving),
				hb = down(b.x, p.y + 2, b.z, paving);
			if (ha && hb)
				assert.ok(
					Math.abs(ha.point.y - hb.point.y) < 0.025,
					`junction lip at ${i}, ${k}: ${ha.point.y} / ${hb.point.y}`,
				);
		}
	}
});

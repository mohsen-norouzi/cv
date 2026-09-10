import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import * as THREE from "three";
import { buildCoast } from "../src/experience/buildCoast.js";
import {
	SEA_LEVEL,
	SHORE_BOUNDS,
	SHORE_RANGE,
	oceanGeometry,
} from "../src/experience/oceanSurface.js";

test("sea mesh retains an unbroken horizon with bounded desktop and mobile geometry", () => {
	for (const mobile of [false, true]) {
		const g = oceanGeometry(mobile),
			p = g.attributes.position,
			index = g.index;
		assert.ok(index.count / 3 < (mobile ? 25000 : 90000));
		g.computeBoundingBox();
		assert.equal(g.boundingBox.min.x, -1500);
		assert.equal(g.boundingBox.max.y, 1500);
		const a = new THREE.Vector3(),
			b = new THREE.Vector3(),
			c = new THREE.Vector3();
		for (let i = 0; i < index.count; i += 3) {
			a.fromBufferAttribute(p, index.getX(i));
			b.fromBufferAttribute(p, index.getX(i + 1));
			c.fromBufferAttribute(p, index.getX(i + 2));
			assert.ok(
				b.sub(a).cross(c.sub(a)).z > 0,
				"Folded or degenerate sea triangle",
			);
		}
		g.dispose();
	}
});
test("foam field follows the actual waterline of each new headland and stays absent offshore", () => {
	const png = readFileSync(
		new URL("../public/optimized/shore.png", import.meta.url),
	);
	let size,
		parts = [];
	for (let off = 8; off < png.length; ) {
		const n = png.readUInt32BE(off),
			type = png.toString("ascii", off + 4, off + 8),
			data = png.subarray(off + 8, off + 8 + n);
		if (type === "IHDR") {
			size = data.readUInt32BE(0);
			assert.equal(data[9], 0);
		}
		if (type === "IDAT") parts.push(data);
		off += n + 12;
	}
	const rows = inflateSync(Buffer.concat(parts));
	const [x0, z0, w, h] = SHORE_BOUNDS;
	const distance = (x, z) => {
		const ix = Math.floor(((x - x0) / w) * size),
			iy = Math.floor(((z - z0) / h) * size);
		assert.equal(rows[iy * (size + 1)], 0);
		return (rows[iy * (size + 1) + ix + 1] / 255) * SHORE_RANGE;
	};
	const { root } = buildCoast();
	root.updateMatrixWorld(true);
	const terrain = root.children.filter((m) => m.name === "Coastal escarpment");
	for (const z of [-17, -48, -77]) {
		const ray = new THREE.Raycaster(
			new THREE.Vector3(95, SEA_LEVEL, z),
			new THREE.Vector3(-1, 0, 0),
		);
		const hit = ray.intersectObjects(terrain, false)[0];
		assert.ok(hit);
		assert.ok(
			distance(hit.point.x, z) < 0.65,
			`Missing surf at ${hit.point.toArray()}`,
		);
	}
	assert.equal(distance(-85, 30), SHORE_RANGE);
});

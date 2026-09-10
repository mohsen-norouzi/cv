import * as THREE from "three";

// A closed paving block. Neighbouring blocks share the exact shoulder edge;
// only the shallow bevel is inset, so sloping joints cannot open onto daylight.
export function pavingBlock(quad, depth = 0.42, smoothTop = false) {
	const center = quad
		.reduce((v, p) => v.add(p), new THREE.Vector3())
		.divideScalar(quad.length);
	const top = quad.map((p) => p.clone().lerp(center, 0.004));
	const shoulder = quad.map((p) =>
		p.clone().add(new THREE.Vector3(0, -0.008, 0)),
	);
	const bottom = quad.map((p) =>
		p.clone().add(new THREE.Vector3(0, -depth, 0)),
	);
	const vertices = [];
	const tri = (a, b, c) =>
		vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
	const topCenter = top
		.reduce((v, p) => v.add(p), new THREE.Vector3())
		.divideScalar(top.length);
	const bottomCenter = bottom
		.reduce((v, p) => v.add(p), new THREE.Vector3())
		.divideScalar(bottom.length);
	if (quad.length === 4) {
		tri(top[0], top[2], top[1]);
		tri(top[0], top[3], top[2]);
		tri(bottom[0], bottom[1], bottom[2]);
		tri(bottom[0], bottom[2], bottom[3]);
	} else
		for (let j = 0; j < quad.length; j++) {
			const k = (j + 1) % quad.length;
			tri(topCenter, top[k], top[j]);
			tri(bottomCenter, bottom[j], bottom[k]);
		}

	for (let j = 0; j < quad.length; j++) {
		const k = (j + 1) % quad.length;
		tri(top[j], shoulder[k], shoulder[j]);
		tri(top[j], top[k], shoulder[k]);
		tri(shoulder[j], bottom[k], bottom[j]);
		tri(shoulder[j], shoulder[k], bottom[k]);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
	g.computeVertexNormals();
	if (smoothTop) {
		// A dressed stone top should not catch light as a folded sheet of metal.
		// Keep the shallow bevel and side normals sharp; smooth only its top.
		const faceStarts =
			quad.length === 4
				? [0, 3]
				: Array.from({ length: quad.length }, (_, i) => i * 6);
		const normal = new THREE.Vector3();
		for (const first of faceStarts) {
			const a = new THREE.Vector3().fromBufferAttribute(
					g.attributes.position,
					first,
				),
				b = new THREE.Vector3().fromBufferAttribute(
					g.attributes.position,
					first + 1,
				),
				c = new THREE.Vector3().fromBufferAttribute(
					g.attributes.position,
					first + 2,
				);
			normal.add(b.sub(a).cross(c.sub(a)));
		}
		normal.normalize();
		for (const first of faceStarts)
			for (let j = 0; j < 3; j++)
				g.attributes.normal.setXYZ(first + j, normal.x, normal.y, normal.z);
	}
	return g;
}

export function corridorDistance(x, z, start, end) {
	const dx = end.x - start.x,
		dz = end.z - start.z;
	const t = THREE.MathUtils.clamp(
		((x - start.x) * dx + (z - start.z) * dz) / (dx * dx + dz * dz),
		0,
		1,
	);
	return Math.hypot(x - start.x - t * dx, z - start.z - t * dz);
}

// Clip the branch to the existing road's outside edge instead of laying one
// independently sloping deck over the other at the junction.
export function clipRoadPolygon(polygon, signedDistance) {
	const out = [];
	for (let i = 0; i < polygon.length; i++) {
		const a = polygon[i],
			b = polygon[(i + 1) % polygon.length];
		const da = signedDistance(a),
			db = signedDistance(b);
		if (da >= 0) out.push(a.clone());
		if (da >= 0 !== db >= 0) {
			let lo = 0,
				hi = 1;
			for (let j = 0; j < 24; j++) {
				const t = (lo + hi) / 2;
				if (signedDistance(a.clone().lerp(b, t)) >= 0 === da >= 0) lo = t;
				else hi = t;
			}
			out.push(a.clone().lerp(b, (lo + hi) / 2));
		}
	}
	return out;
}

// Difference against a convex road cell, retaining disjoint outside pieces.
export function subtractRoadCell(polygon, cell) {
	let inside = polygon;
	const outside = [];
	for (let i = 0; i < cell.length && inside.length >= 3; i++) {
		const a = cell[i],
			b = cell[(i + 1) % cell.length];
		const side = (p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
		const piece = clipRoadPolygon(inside, (p) => -side(p));
		if (piece.length >= 3) outside.push(piece);
		inside = clipRoadPolygon(inside, side);
	}
	return outside;
}

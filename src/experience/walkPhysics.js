import * as THREE from "three";

export const EYE_HEIGHT = 1.65;
export const BODY_RADIUS = 0.18;
const PROBES = [
	[0, 0],
	[BODY_RADIUS, 0],
	[-BODY_RADIUS, 0],
	[0, BODY_RADIUS],
	[0, -BODY_RADIUS],
];

// Only the authored walking surfaces: foliage, roofs and cliff tops are excluded.
export function createWalkGround(root) {
	root.updateMatrixWorld(true);
	const meshes = [];
	root.traverse((object) => {
		if (object.isMesh && /^(Paving|Limestone)/.test(object.material.name))
			meshes.push(object);
	});
	const ray = new THREE.Raycaster(
		new THREE.Vector3(),
		new THREE.Vector3(0, -1, 0),
		0,
		1.1,
	);
	const normal = new THREE.Vector3();
	const offsets = [
		[0, 0],
		[0.035, 0],
		[-0.035, 0],
		[0, 0.035],
		[0, -0.035],
	];
	return (x, z, feetY) => {
		// A shoe bridges the tiny bevelled joints between paving slabs.
		for (const [dx, dz] of offsets) {
			ray.ray.origin.set(x + dx, feetY + 0.48, z + dz);
			for (const hit of ray.intersectObjects(meshes, false)) {
				normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
				if (normal.y >= 0.35 && hit.point.y >= feetY - 0.45) return hit.point.y;
			}
		}
		return null;
	};
}

export function canStand(x, z, feetY, ground, obstacles) {
	for (const obstacle of obstacles) {
		if (
			Math.abs(feetY - obstacle.y) < 2 &&
			Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + BODY_RADIUS
		)
			return null;
	}
	let centre = null;
	for (let i = 0; i < PROBES.length; i++) {
		const [dx, dz] = PROBES[i];
		const height = ground(x + dx, z + dz, feetY);
		if (height === null) return null;
		if (i === 0) centre = height;
	}
	return centre;
}

// Bounded substeps prevent low-frame-rate tunnelling; axis sliding keeps corners gentle.
export function moveWalker(position, dx, dz, ground, obstacles) {
	const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
	const sx = dx / count,
		sz = dz / count;
	for (let i = 0; i < count; i++) {
		let height = canStand(
			position.x + sx,
			position.z + sz,
			position.y,
			ground,
			obstacles,
		);
		if (height !== null) {
			position.set(position.x + sx, height, position.z + sz);
			continue;
		}
		height = canStand(
			position.x + sx,
			position.z,
			position.y,
			ground,
			obstacles,
		);
		if (height !== null) position.set(position.x + sx, height, position.z);
		height = canStand(
			position.x,
			position.z + sz,
			position.y,
			ground,
			obstacles,
		);
		if (height !== null) position.set(position.x, height, position.z + sz);
	}
}

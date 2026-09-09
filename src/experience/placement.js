import * as THREE from "three";

export const roadHalfWidth = (t) => (3.2 - t * 0.75) / 2;
export const terraceOuterRadius = (landmark) => landmark.radius * 1.19;

// Offline placement uses a dense polyline of the exact camera/road spline.
export function createRoadSampler(path, count = 900) {
	const samples = Array.from({ length: count + 1 }, (_, i) =>
		path.getPointAt(i / count),
	);
	return (x, z) => {
		let best = Infinity,
			bestIndex = 0,
			bestFraction = 0;
		for (let i = 0; i < count; i++) {
			const a = samples[i],
				b = samples[i + 1];
			const dx = b.x - a.x,
				dz = b.z - a.z;
			const fraction = THREE.MathUtils.clamp(
				((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz),
				0,
				1,
			);
			const d = (x - a.x - dx * fraction) ** 2 + (z - a.z - dz * fraction) ** 2;
			if (d < best) {
				best = d;
				bestIndex = i;
				bestFraction = fraction;
			}
		}
		const t = (bestIndex + bestFraction) / count;
		return {
			t,
			distance: Math.sqrt(best),
			halfWidth: roadHalfWidth(t),
			point: samples[bestIndex]
				.clone()
				.lerp(samples[bestIndex + 1], bestFraction),
			tangent: samples[bestIndex + 1]
				.clone()
				.sub(samples[bestIndex])
				.setY(0)
				.normalize(),
		};
	};
}

export function fitTerraces(path, landmarks) {
	const nearest = createRoadSampler(path);
	return landmarks.map((landmark) => {
		const position = [...landmark.position];
		for (let i = 0; i < 24; i++) {
			const road = nearest(position[0], position[2]);
			const required = terraceOuterRadius(landmark) + road.halfWidth + 0.6;
			if (road.distance >= required - 1e-6) break;
			const amount = (required - road.distance + 0.01) / road.distance;
			position[0] += (position[0] - road.point.x) * amount;
			position[2] += (position[2] - road.point.z) * amount;
		}
		return { ...landmark, position };
	});
}

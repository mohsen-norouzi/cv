// Offline placement against the shipped coast, not an approximate height map.
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { COAST_PATH, LANDMARKS } from "../src/experience/coastLayout.js";
import {
	EXPANSION_PATH,
	FUTURE_TERRACES,
} from "../src/experience/expansionLayout.js";
import {
	createRoadSampler,
	roadHalfWidth,
} from "../src/experience/placement.js";
const root = new URL("../", import.meta.url);
const bytes = fs.readFileSync(new URL("public/optimized/coast.glb", root));
const { scene } = await new GLTFLoader()
	.setMeshoptDecoder(MeshoptDecoder)
	.parseAsync(
		bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		"",
	);
scene.updateMatrixWorld(true);
const audit = JSON.parse(
	fs.readFileSync(new URL("assets/placement-audit.json", root)),
);
const terrain = [];
scene.traverse((o) => {
	if (o.isMesh && o.material.name.startsWith("Material_0")) terrain.push(o);
});
const roadSamples = [
	createRoadSampler(COAST_PATH),
	createRoadSampler(EXPANSION_PATH),
];
const ray = new THREE.Raycaster(
	new THREE.Vector3(),
	new THREE.Vector3(0, -1, 0),
);
const down = (x, z) => {
	ray.ray.origin.set(x, 60, z);
	return ray.intersectObjects(terrain, false)[0];
};
const plans = [
	{
		id: "welcome",
		path: 0,
		t: 0.12,
		variant: "Normal",
		lines: ["The coast", "Slow down", "Stay a little"],
		side: 1,
	},
	{
		id: "crossroads",
		path: 0,
		t: 0.643,
		variant: "Arrow",
		lines: ["Castle"],
		destination: COAST_PATH.getPointAt(0.95).toArray(),
		side: 1,
	},
	{
		id: "cove",
		path: 1,
		t: 0.58,
		variant: "Normal",
		lines: ["North cove", "Breathe", "it in"],
		side: -1,
	},
	{
		id: "horizon",
		path: 1,
		t: 0.925,
		variant: "Normal",
		lines: ["The horizon", "Stay a", "little longer"],
		side: 1,
	},
];
const signs = [];
for (const plan of plans) {
	const path = [COAST_PATH, EXPANSION_PATH][plan.path];
	const at = (t) => (plan.path ? path.getPoint(t) : path.getPointAt(t));
	const candidates = [];
	for (let step = 0; step <= 32; step++)
		for (const dir of step ? [1, -1] : [1])
			for (const side of [plan.side, -plan.side])
				for (const extra of [0.85, 1.05, 1.25, 1.5]) {
					const t = plan.t + step * 0.0025 * dir;
					if (t <= 0 || t >= 1) continue;
					const p = at(t),
						tangent = (plan.path ? path.getTangent(t) : path.getTangentAt(t))
							.setY(0)
							.normalize();
					const half = plan.path ? 1.6 : roadHalfWidth(t),
						n = new THREE.Vector3(tangent.z, 0, -tangent.x);
					const q = p.clone().addScaledVector(n, (half + extra) * side),
						hit = down(q.x, q.z);
					if (
						!hit ||
						hit.face.normal.y < 0.6 ||
						hit.point.y < p.y - 1 ||
						hit.point.y > p.y + 0.15
					)
						continue;
					q.y = hit.point.y;
					// Every corner of the socket must have real supporting terrain.
					const feet = [
						[0.17, 0],
						[-0.17, 0],
						[0, 0.17],
						[0, -0.17],
					].map(([x, z]) => down(q.x + x, q.z + z)?.point.y);
					if (feet.some((y) => y === undefined || Math.abs(y - q.y) > 0.15))
						continue;
					if (
						roadSamples.some((sample, i) => {
							const r = sample(q.x, q.z);
							return r.distance < (i ? 1.6 : r.halfWidth) + 0.73;
						})
					)
						continue;
					if (
						[...LANDMARKS, ...FUTURE_TERRACES].some(
							(s) =>
								Math.hypot(q.x - s.position[0], q.z - s.position[2]) <
								s.radius * 1.19 + 1,
						)
					)
						continue;
					if (
						audit.plants.some(
							(s) =>
								Math.hypot(q.x - s.position[0], q.z - s.position[2]) <
									s.radius + 0.8 && Math.abs(q.y - s.position[1]) < 3,
						)
					)
						continue;
					if (
						audit.lanterns.some(
							(s) => Math.hypot(q.x - s.position[0], q.z - s.position[2]) < 1.3,
						)
					)
						continue;
					if (
						audit.railPosts.some(
							(s) => Math.hypot(q.x - s.position[0], q.z - s.position[2]) < 0.9,
						)
					)
						continue;
					if (
						audit.rocks.some(
							(s) =>
								!s.structural &&
								Math.hypot(q.x - s.position[0], q.z - s.position[2]) <
									s.radius + 0.5 &&
								s.top > q.y + 0.15,
						)
					)
						continue;
					const look = at(Math.max(0.001, t - 0.035));
					// Keep the lettering out from behind lamps when approached on foot.
					const sight = q.clone().sub(look).setY(0);
					if (
						audit.lanterns.some(({ position: [x, , z] }) => {
							const u =
								((x - look.x) * sight.x + (z - look.z) * sight.z) /
								sight.lengthSq();
							return (
								u > 0 &&
								u < 1 &&
								Math.hypot(x - look.x - u * sight.x, z - look.z - u * sight.z) <
									0.75
							);
						})
					)
						continue;
					// Split the angle between the arriving walker and the nearest lamp.
					// The face stays readable and receives real warm light at night.
					const lamp = audit.lanterns.reduce((best, current) =>
						Math.hypot(current.position[0] - q.x, current.position[2] - q.z) <
						Math.hypot(best.position[0] - q.x, best.position[2] - q.z)
							? current
							: best,
					);
					const facing = look
						.clone()
						.sub(q)
						.setY(0)
						.normalize()
						.add(
							new THREE.Vector3(
								lamp.position[0] - q.x,
								0,
								lamp.position[2] - q.z,
							).normalize(),
						);
					if (plan.variant === "Split") {
						// Orient a fork board between its two destinations so its arrows
						// remain physically meaningful from the approaching path.
						const towardTemplates = new THREE.Vector3(...plan.destination)
							.sub(q)
							.setY(0)
							.normalize();
						const towardCastle = COAST_PATH.getPointAt(0.95)
							.sub(q)
							.setY(0)
							.normalize();
						const right = towardTemplates.sub(towardCastle).normalize();
						facing.set(-right.z, 0, right.x);
						if (facing.dot(look.clone().sub(q)) < 0) facing.negate();
					}
					const yaw = Math.atan2(facing.x, facing.z);
					if (
						facing
							.clone()
							.normalize()
							.dot(look.clone().sub(q).setY(0).normalize()) < 0.75
					)
						continue;
					const localRight = new THREE.Vector3(
						Math.cos(yaw),
						0,
						-Math.sin(yaw),
					);
					const dest = plan.destination
						? new THREE.Vector3(...plan.destination)
						: at(Math.min(0.999, t + 0.07));
					const flip = dest.clone().sub(q).dot(localRight) < 0;
					if (
						plan.variant === "Split" &&
						COAST_PATH.getPointAt(0.95).sub(q).dot(localRight) *
							(flip ? 1 : -1) <=
							0
					)
						continue;
					const score =
						step * 0.9 +
						(side === plan.side ? 0 : 1) +
						extra * 0.8 +
						Math.abs(p.y - q.y);
					candidates.push({
						id: plan.id,
						variant: plan.variant,
						lines: plan.lines,
						position: q.toArray(),
						approach: [look.x, look.y + 1.65, look.z],
						yaw,
						flip,
						scale: 1.1,
						score,
					});
				}
	candidates.sort((a, b) => a.score - b.score);
	if (!candidates.length)
		throw new Error(`No grounded, clear placement for ${plan.id}`);
	const { score, ...chosen } = candidates[0];
	signs.push(chosen);
	console.log(
		chosen.id,
		chosen.position.map((v) => v.toFixed(2)),
		chosen.flip,
	);
}
// Small name plates on limestone, clear of the stair entrance and rotating exhibits.
const limestone = [];
scene.traverse((o) => {
	if (o.isMesh && /^Limestone/.test(o.material.name)) limestone.push(o);
});
for (const [index, landmark] of LANDMARKS.entries()) {
	const center = new THREE.Vector3(...landmark.position);
	const road = roadSamples[0](center.x, center.z);
	const towardRoad = road.point.clone().sub(center).setY(0).normalize();
	const candidates = [];
	for (const angle of [-0.95, 0.95, -1.2, 1.2, -1.4, 1.4]) {
		const offset = towardRoad
			.clone()
			.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
		const q = center.clone().addScaledVector(offset, landmark.radius - 0.42);
		ray.ray.origin.set(q.x, 60, q.z);
		const hit = ray.intersectObjects(limestone, false)[0];
		if (!hit || Math.abs(hit.point.y - center.y) > 0.16) continue;
		q.y = hit.point.y;
		if (
			audit.lanterns.some(
				(s) => Math.hypot(q.x - s.position[0], q.z - s.position[2]) < 0.85,
			)
		)
			continue;
		// Each foot is supported; reject placements on the bevel or steps.
		if (
			[
				[0.12, 0],
				[-0.12, 0],
				[0, 0.12],
				[0, -0.12],
			].some(([x, z]) => {
				ray.ray.origin.set(q.x + x, 60, q.z + z);
				const foot = ray.intersectObjects(limestone, false)[0];
				return !foot || Math.abs(foot.point.y - q.y) > 0.04;
			})
		)
			continue;
		const look = road.point.clone();
		look.y = q.y + 1.65;
		const facing = look.clone().sub(q).setY(0).normalize();
		const sight = q.clone().sub(look).setY(0);
		if (
			audit.lanterns.some(({ position: [x, , z] }) => {
				const u =
					((x - look.x) * sight.x + (z - look.z) * sight.z) / sight.lengthSq();
				return (
					u > 0 &&
					u < 1 &&
					Math.hypot(x - look.x - u * sight.x, z - look.z - u * sight.z) < 0.75
				);
			})
		)
			continue;
		candidates.push({
			id: `project-${index}`,
			project: index,
			variant: "Normal",
			surface: "platform",
			position: q.toArray(),
			approach: look.toArray(),
			yaw: Math.atan2(facing.x, facing.z),
			flip: false,
			scale: 0.75,
		});
	}
	if (!candidates.length) throw new Error(`No platform placement for ${index}`);
	signs.push(candidates[0]);
	console.log(candidates[0].id, candidates[0].position);
}
fs.writeFileSync(
	new URL("src/experience/signLayout.json", root),
	`${JSON.stringify(signs, null, 2)}\n`,
);

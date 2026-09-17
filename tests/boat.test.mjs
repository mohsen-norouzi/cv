import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { BOAT, boatPose, swellHeight } from "../src/experience/boatMotion.js";
import { SEA_LEVEL } from "../src/experience/oceanSurface.js";
import { COAST_PATH } from "../src/experience/coastLayout.js";
async function load(path) {
	const data = fs.readFileSync(new URL(`../${path}`, import.meta.url));
	return (
		await new GLTFLoader()
			.setMeshoptDecoder(MeshoptDecoder)
			.parseAsync(
				data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
				"",
			)
	).scene;
}
const [source, boat, coast] = await Promise.all([
	load("assets/boat/boat-web.glb"),
	load("public/optimized/boat/boat.glb"),
	load("public/optimized/coast.glb"),
]);
for (const scene of [source, boat, coast]) scene.updateMatrixWorld(true);
test("boat compression preserves its geometry and keeps the total download below 600 KB", () => {
	const sourceMesh = [],
		runtimeMesh = [];
	source.traverse((o) => {
		if (o.isMesh) sourceMesh.push(o);
	});
	boat.traverse((o) => {
		if (o.isMesh) runtimeMesh.push(o);
	});
	assert.equal(runtimeMesh.length, 1);
	assert.equal(sourceMesh.length, 1);
	for (const [key, attribute] of Object.entries(
		sourceMesh[0].geometry.attributes,
	))
		assert.deepEqual(
			runtimeMesh[0].geometry.attributes[key].array,
			attribute.array,
		);
	assert.deepEqual(
		runtimeMesh[0].geometry.index.array,
		sourceMesh[0].geometry.index.array,
	);
	const size = [
		"boat.glb",
		"color.webp",
		"normal.webp",
		"roughness.webp",
	].reduce(
		(sum, name) =>
			sum +
			fs.statSync(new URL(`../public/optimized/boat/${name}`, import.meta.url))
				.size,
		0,
	);
	assert.ok(size < 600000);
	const bounds = new THREE.Box3().setFromObject(boat),
		dimensions = bounds.getSize(new THREE.Vector3());
	assert.ok(Math.abs(bounds.min.y) < 0.0001);
	assert.ok(dimensions.y > 2.9 && dimensions.y < 3.1);
	assert.ok(dimensions.z > 3 && dimensions.z < 3.3);
});
test("boat remains beside the road entrance, clear of the coast and path through a wave cycle", () => {
	const start = COAST_PATH.getPointAt(0);
	assert.ok(
		Math.hypot(start.x - BOAT.position[0], start.z - BOAT.position[1]) < 7,
	);
	const transform = new THREE.Object3D();
	transform.scale.setScalar(BOAT.scale);
	transform.rotation.order = "YXZ";
	transform.rotation.y = BOAT.yaw;
	const box = new THREE.Box3().setFromObject(boat);
	const point = new THREE.Vector3();
	const ray = new THREE.Raycaster(
		new THREE.Vector3(),
		new THREE.Vector3(0, -1, 0),
	);
	const pose = {};
	// Check the full hull footprint against actual rendered terrain at changing roll/pitch.
	for (let time = 0; time < 60; time += 0.5) {
		boatPose(time, pose);
		assert.ok(Number.isFinite(pose.y));
		assert.ok(Math.abs(pose.pitch) < 0.25 && Math.abs(pose.roll) < 0.25);
		assert.ok(
			Math.abs(
				pose.y + BOAT.draft - SEA_LEVEL - swellHeight(...BOAT.position, time),
			) < 0.1,
		);
		transform.position.set(BOAT.position[0], pose.y, BOAT.position[1]);
		transform.rotation.x = pose.pitch;
		transform.rotation.z = pose.roll;
		transform.updateMatrix();
		for (let x = box.min.x; x <= box.max.x; x += 0.25)
			for (let z = box.min.z; z <= box.max.z; z += 0.25) {
				point.set(x, 0.25, z).applyMatrix4(transform.matrix);
				ray.ray.origin.set(point.x, 20, point.z);
				const hit = ray.intersectObject(coast, true)[0];
				assert.ok(
					!hit || hit.point.y < point.y - 0.25,
					"Boat intersects shore",
				);
			}
	}
});

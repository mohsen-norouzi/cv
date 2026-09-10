import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { rotateShowcase } from "../src/experience/showcaseMotion.js";

test("focused model rotates around its terrace and updates cached child transforms", () => {
	const pivot = new THREE.Group();
	pivot.position.set(11.1, 6.6, 7.5);
	const child = new THREE.Object3D();
	child.position.set(1, 0, 0);
	pivot.add(child);
	pivot.updateMatrixWorld(true);
	pivot.traverse((object) => {
		object.matrixAutoUpdate = false;
	});
	const original = child.matrixWorld.clone();
	for (let i = 0; i < 60; i++) assert(rotateShowcase(pivot, 1, 1 / 60, false));
	assert(Math.abs(pivot.rotation.y - 0.4) < 1e-12);
	assert(
		!child.matrixWorld.equals(original),
		"The rendered transform must move, not only rotation.y",
	);
	assert.deepEqual(pivot.position.toArray(), [11.1, 6.6, 7.5]);
	const paused = child.matrixWorld.clone();
	assert.equal(rotateShowcase(pivot, 0, 1 / 60, false), false);
	assert.equal(rotateShowcase(pivot, 1, 1 / 60, true), false);
	assert(
		child.matrixWorld.equals(paused),
		"Unfocused and reduced-motion subjects stay still",
	);
	assert.equal(rotateShowcase(null, 1, 1 / 60, false), false);
});

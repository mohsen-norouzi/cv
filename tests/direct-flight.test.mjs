import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
	BOARD_LOOK_AT,
	BOARD_VIEW_POS,
	BAKERY_LOOK_AT,
	BAKERY_VIEW_POS,
	CAM_START,
	CAM_TARGET,
	CRYSTAL_LOOK_AT,
	CRYSTAL_VIEW_POS,
	GIRL_LOOK_AT,
	GIRL_VIEW_POS,
} from "../src/experience/constants.js";
import {
	beginDirectFlight,
	createDirectFlight,
	sampleDirectFlight,
} from "../src/experience/directFlight.js";

const stops = [
	[CAM_START, CAM_TARGET],
	[GIRL_VIEW_POS, GIRL_LOOK_AT],
	[BAKERY_VIEW_POS, BAKERY_LOOK_AT],
	[CRYSTAL_VIEW_POS, CRYSTAL_LOOK_AT],
	[BOARD_VIEW_POS, BOARD_LOOK_AT],
];

test("all twenty destination pairs fly along one direct line and land exactly", () => {
	const position = new THREE.Vector3(),
		look = new THREE.Vector3();
	const expected = new THREE.Vector3();
	for (let from = 0; from < stops.length; from++) {
		for (let to = 0; to < stops.length; to++) {
			if (from === to) continue;
			const flight = createDirectFlight();
			beginDirectFlight(flight, ...stops[from], ...stops[to]);
			for (let frame = 0; frame <= 120; frame++) {
				const t = frame / 120;
				sampleDirectFlight(flight, t, position, look);
				expected.lerpVectors(stops[from][0], stops[to][0], t);
				assert(
					position.distanceTo(expected) < 1e-10,
					`${from} → ${to} must not follow intermediate paths`,
				);
				assert(look.toArray().every(Number.isFinite));
				assert(
					position.distanceTo(look) > 1,
					"Camera facing must not collapse into the eye position",
				);
			}
			assert.deepEqual(position.toArray(), stops[to][0].toArray());
			assert.deepEqual(look.toArray(), stops[to][1].toArray());
		}
	}
});

test("a new direct flight starts at the actual camera pose, including portrait framing", () => {
	const from = new THREE.Vector3(8, 9, 27);
	const fromLook = new THREE.Vector3(-2, 8, 17);
	const toLook = BAKERY_LOOK_AT.clone().add(new THREE.Vector3(3.5, 3.1, 0));
	const flight = createDirectFlight();
	beginDirectFlight(flight, from, fromLook, BAKERY_VIEW_POS, toLook);
	const position = new THREE.Vector3(),
		look = new THREE.Vector3();
	sampleDirectFlight(flight, 0, position, look);
	assert.deepEqual(position.toArray(), from.toArray());
	assert.deepEqual(look.toArray(), fromLook.toArray());
	sampleDirectFlight(flight, 1, position, look);
	assert.deepEqual(look.toArray(), toLook.toArray());
});

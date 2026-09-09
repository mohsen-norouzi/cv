import assert from "node:assert/strict";
import test from "node:test";
import {
	advanceCameraFollow,
	CAMERA_FINISH_SECONDS,
} from "../src/experience/cameraTransition.js";

for (const fps of [30, 60, 120]) {
	test(`camera keeps the main easing and stops its final glide (${fps} fps)`, () => {
		for (const [from, to] of [
			[0, 1],
			[0, 3],
			[3, 0],
		]) {
			const state = { elapsed: 0 };
			let path = from;
			let camera = from * 50;
			let previousCamera = camera;
			let lastStep = 0;
			const dt = 1 / fps;
			const travelFrames = Math.ceil(0.9 * fps);
			for (let frame = 1; frame <= travelFrames; frame++) {
				const t = Math.min(1, (frame * dt) / 0.9);
				const ease = t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
				const alpha = advanceCameraFollow(state, dt, true);
				assert.equal(
					alpha,
					1 - Math.exp(-2.2 * dt),
					"Main movement is unchanged",
				);
				path += (from + (to - from) * ease - path) * alpha;
				camera += (path * 50 - camera) * alpha;
			}
			const finishFrames = Math.ceil(CAMERA_FINISH_SECONDS * fps) + 1;
			for (let frame = 0; frame < finishFrames; frame++) {
				const alpha = advanceCameraFollow(state, dt, false);
				assert(alpha >= 0 && alpha <= 1);
				previousCamera = camera;
				path += (to - path) * alpha;
				camera += (path * 50 - camera) * alpha;
				assert(
					(camera - previousCamera) * (to - from) >= 0,
					"No overshoot or reversal",
				);
				if (camera !== previousCamera)
					lastStep = Math.abs(camera - previousCamera);
			}
			assert.equal(path, to);
			assert.equal(camera, to * 50, "No residual drift after the deadline");
			assert(
				lastStep < 0.02,
				"The final step must be smaller than the old arrival tolerance",
			);
		}
	});
}

test("new movement resets the finish and reduced motion arrives immediately", () => {
	const state = { elapsed: 1.1 };
	assert.equal(
		advanceCameraFollow(state, 1 / 60, true),
		1 - Math.exp(-2.2 / 60),
	);
	assert.equal(state.elapsed, 0);
	assert.equal(advanceCameraFollow(state, 1 / 60, true, true), 1);
	assert.equal(state.elapsed, CAMERA_FINISH_SECONDS);
});

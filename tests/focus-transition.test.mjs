import assert from "node:assert/strict";
import test from "node:test";
import {
	advanceFocus,
	createFocusTransition,
} from "../src/experience/focusTransition.js";

for (const fps of [30, 60, 120]) {
	test(`dimming begins with zoom but the spotlight waits for proximity (${fps} fps)`, () => {
		const state = createFocusTransition();
		const step = (input = {}) =>
			advanceFocus(state, {
				stop: 2,
				arrived: false,
				exiting: false,
				reduced: false,
				dt: 1 / fps,
				...input,
			});
		step();
		assert(
			state.world > 0 && state.spot === 0,
			"Only the surroundings dim while the camera is far away",
		);
		assert.equal(
			state.stop,
			2,
			"A direct jump lights its destination, not intervening projects",
		);
		assert.equal(state.text, 0);
		for (let i = 0; i < fps * 10; i++) step();
		assert.equal(
			state.spot,
			0,
			"Elapsed time cannot reveal a distant spotlight",
		);
		step({ near: true });
		assert(
			state.spot > 0 && state.spot < 0.15,
			"Fade in once close, without waiting for a full stop",
		);
		for (let i = 0; i < fps * 2; i++) step({ near: true });
		assert(
			state.world > 0.99 && state.spot > 0.99,
			"Tiny final camera movements cannot hold the lighting back",
		);
		assert.equal(state.text, 0, "Keep the caption out of the camera move");
		for (let i = 0; i < fps * 2; i++) step({ arrived: true });
		assert(state.text > 0.99);
		let complete = false;
		for (let i = 0; i < fps * 2 && !complete; i++)
			complete = step({ exiting: true });
		assert(complete, "An exit must release navigation");
		assert.equal(state.spot + state.text, 0);
		assert(
			state.world > 0.99,
			"Exiting a project must retain the dark surroundings",
		);
		step({ stop: 3 });
		assert(state.world > 0.99, "The next zoom starts dark");
		assert(
			state.spot === 0,
			"A new distant destination must not inherit the previous beam",
		);
		assert.equal(state.text, 0);
	});
}

test("the coast has no spotlight and reduced motion skips the fades", () => {
	const state = createFocusTransition();
	const step = (input) =>
		advanceFocus(state, {
			stop: 0,
			arrived: false,
			exiting: false,
			reduced: true,
			dt: 1 / 60,
			...input,
		});
	step({});
	assert.equal(state.world + state.spot + state.text, 0);
	step({ stop: 1 });
	assert.equal(state.world, 1);
	assert.equal(state.spot, 0);
	step({ stop: 1, near: true });
	assert.equal(state.spot, 1);
	assert.equal(state.text, 0);
	step({ stop: 1, arrived: true });
	assert.equal(state.text, 1);
	assert(step({ stop: 1, exiting: true }));
	assert.equal(
		state.world,
		1,
		"Reduced motion also stays dark between projects",
	);
	step({});
	assert.equal(state.world + state.spot + state.text, 0);
});

for (const fps of [30, 60, 120]) {
	test(`forward, backward, and direct project jumps stay dark until the coast (${fps} fps)`, () => {
		const state = createFocusTransition();
		const step = (stop, extra = {}) =>
			advanceFocus(state, {
				stop,
				arrived: true,
				near: true,
				exiting: false,
				reduced: false,
				dt: 1 / fps,
				...extra,
			});
		for (let frame = 0; frame < fps * 3; frame++) step(1);
		for (const stop of [1, 2, 3, 2, 1, 3]) {
			for (let frame = 0; frame < fps; frame++) {
				const previous = state.world;
				step(stop, { arrived: false, near: false });
				assert(state.world >= previous, "Travel must never brighten the world");
			}
			for (let frame = 0; frame < fps * 2; frame++) step(stop);
			let complete = false;
			for (let frame = 0; frame < fps * 2 && !complete; frame++) {
				const previous = state.world;
				complete = step(stop, { exiting: true });
				assert(
					state.world >= previous,
					"Hiding the spotlight must not brighten the world",
				);
			}
			assert(
				complete,
				"Navigation must unlock even though the world remains dark",
			);
			assert.equal(state.spot + state.text, 0);
		}
		const dark = state.world;
		step(0, { arrived: false, near: false });
		assert(
			state.world < dark && state.world > 0.8,
			"Return to the coast fades daylight back smoothly",
		);
		for (let frame = 0; frame < fps * 3; frame++) step(0);
		assert(state.world < 0.001);
		assert.equal(state.spot + state.text, 0);
	});
}

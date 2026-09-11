import assert from "node:assert/strict";
import test from "node:test";
import { advanceWalkFocus, nearestWalkStop, visibleWalkHit } from "../src/experience/walkInteractionMath.js";

const targets = [{ stop: 1, position: [0, 3, 0] }, { stop: 2, position: [12, 3, 0] }];
test("proximity fades in near the platform and ignores other vertical levels", () => {
	assert.equal(nearestWalkStop({ x: 4, y: 4.2, z: 0 }, targets).reveal, 1);
	assert.equal(nearestWalkStop({ x: 0, y: -4, z: 0 }, targets).stop, 0);
	assert.equal(nearestWalkStop({ x: 25, y: 4.2, z: 0 }, targets).stop, 0);
	assert(nearestWalkStop({ x: 7.9, y: 4.2, z: 0 }, [targets[0]]).reveal < 0.01);
	assert.equal(nearestWalkStop({ x: 6.1, y: 4.2, z: 0 }, targets, 1).stop, 1);
});
test("spotlight fades out before changing subjects, then fades in", () => {
	const state = { stop: 1, reveal: 1 };
	advanceWalkFocus(state, { stop: 2, reveal: 1 }, 1/60);
	assert.equal(state.stop, 1);
	assert(state.reveal < 1 && state.reveal > 0.9);
	for (let i = 0; i < 300; i++) advanceWalkFocus(state, { stop: 2, reveal: 1 }, 1/60);
	assert.equal(state.stop, 2);
	assert(state.reveal > .99);
	for (let i = 0; i < 150; i++) advanceWalkFocus(state, { stop: 0, reveal: 0 }, 1/60);
	assert.equal(state.stop, 0);
	assert.equal(state.reveal, 0);
});
test("crosshair cannot interact through scenery or beyond reach", () => {
	const hit = { stop: 1, distance: 4 };
	assert.equal(visibleWalkHit([hit], []), hit);
	assert.equal(visibleWalkHit([hit], [{distance: 3}]), null);
	assert.equal(visibleWalkHit([hit], [{distance: 6}]), hit);
	assert.equal(visibleWalkHit([hit], [{distance: 3, visible: false}]), hit);
	assert.equal(visibleWalkHit([{distance: 9}], []), null);
	assert.equal(visibleWalkHit([{distance: 2, visible: false}], []), null);
});

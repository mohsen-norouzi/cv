import assert from "node:assert/strict";
import test from "node:test";

// Drive the existing scroll timer without a browser or audio downloads.
test("absolute clicks stay direct across exits; subsequent scroll gestures use the path", async (t) => {
	let now = 0,
		queued;
	t.mock.method(performance, "now", () => now);
	const oldRaf = globalThis.requestAnimationFrame;
	const oldCancel = globalThis.cancelAnimationFrame;
	globalThis.requestAnimationFrame = (callback) => {
		queued = callback;
		return 1;
	};
	globalThis.cancelAnimationFrame = () => {
		queued = null;
	};
	t.after(() => {
		globalThis.requestAnimationFrame = oldRaf;
		globalThis.cancelAnimationFrame = oldCancel;
	});
	const store = await import("../src/experience/scrollStore.js");
	const finish = () => {
		now += 1000;
		const tick = queued;
		queued = null;
		tick(now);
	};
	store.requestSnapTo(3);
	assert.deepEqual(store.getCameraRoute(), {
		id: 1,
		from: 0,
		to: 3,
		direct: true,
	});
	assert.equal(
		store.getScrollSection(),
		3,
		"Only the destination is highlighted",
	);
	finish();
	store.requestSnapTo(1);
	assert(store.isExitPending());
	store.continueSnapAfterExit();
	assert.deepEqual(store.getCameraRoute(), {
		id: 2,
		from: 3,
		to: 1,
		direct: true,
	});
	finish();
	store.requestSnap(1);
	store.continueSnapAfterExit();
	assert.deepEqual(store.getCameraRoute(), {
		id: 3,
		from: 1,
		to: 2,
		direct: false,
	});
	finish();
	store.requestSnapTo(0);
	store.continueSnapAfterExit();
	assert.deepEqual(store.getCameraRoute(), {
		id: 4,
		from: 2,
		to: 0,
		direct: true,
	});
	finish();
	assert.equal(store.getScrollProgress(), 0);
	store.requestSnapTo(4);
	assert.equal(store.getCameraRoute().to, 4);
	assert.equal(store.getCameraRoute().direct, true);
	finish();
	store.requestSnap(1);
	assert.equal(store.isExitPending(), false, "Collection is the final stop");
	store.requestSnap(-1);
	store.continueSnapAfterExit();
	assert.equal(store.getCameraRoute().to, 3);
	finish();
	store.requestSnap(1);
	store.continueSnapAfterExit();
	assert.equal(store.getCameraRoute().to, 4);
	assert.equal(store.getCameraRoute().direct, false);
	finish();
});

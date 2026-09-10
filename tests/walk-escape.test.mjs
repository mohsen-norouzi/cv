import test from "node:test";
import assert from "node:assert/strict";
import { createWalkEscape } from "../src/experience/walkEscape.js";
function setup() {
	let locked = true,
		clock = 1000,
		exits = 0,
		releases = 0,
		clears = 0;
	const handler = createWalkEscape({
		isLocked: () => locked,
		releaseMouse: () => {
			locked = false;
			releases++;
		},
		clearInput: () => clears++,
		exitWalk: () => exits++,
		now: () => clock,
	});
	return {
		handler,
		nativeUnlock() {
			locked = false;
		},
		unlock() {
			locked = false;
			handler.lockChanged();
		},
		advance() {
			clock += 500;
		},
		get result() {
			return { exits, releases, clears };
		},
	};
}
test("Escape releases mouse look and keeps walking; a later Escape exits", () => {
	const s = setup();
	s.handler.keyDown({ code: "Escape" });
	s.handler.lockChanged();
	assert.equal(s.result.releases, 1);
	assert.equal(s.result.exits, 0);
	s.advance();
	s.handler.keyDown({ code: "Escape" });
	assert.equal(s.result.exits, 1);
});
test("native unlock before Escape delivery does not accidentally exit walking", () => {
	const s = setup();
	s.unlock();
	s.handler.keyDown({ code: "Escape" });
	assert.equal(s.result.exits, 0);
	assert.equal(s.result.releases, 0);
	s.advance();
	s.handler.keyDown({ code: "Escape" });
	assert.equal(s.result.exits, 1);
});
test("holding Escape after release does not trigger an exit and clears movement", () => {
	const s = setup();
	s.handler.keyDown({ code: "Escape" });
	s.unlock();
	s.advance();
	s.handler.keyDown({ code: "Escape", repeat: true });
	assert.equal(s.result.exits, 0);
	assert.ok(s.result.clears > 0);
	assert.equal(s.handler.keyDown({ code: "KeyW" }), false);
});

test("Escape is safe while the browser unlock notification is still queued", () => {
	const s = setup();
	s.nativeUnlock();
	s.handler.keyDown({ code: "Escape" });
	s.handler.lockChanged();
	assert.equal(s.result.exits, 0);
	assert.equal(s.result.releases, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
	createPreviewClock,
	localDateTime,
	fromLocalDateTime,
} from "../src/experience/previewClock.js";

test("preview plays in either direction, changes speed without jumping, and pauses exactly", () => {
	let now = Date.parse("2026-09-10T12:00:00Z");
	const clock = createPreviewClock(() => now);
	const start = now;
	clock.play(600);
	now += 1250;
	assert.equal(clock.read().time, start + 750000);
	clock.play(-3600);
	now += 500;
	assert.equal(clock.read().time, start + 750000 - 1800000);
	clock.play(0);
	const paused = clock.read().time;
	now += 60000;
	assert.equal(clock.read().time, paused);
	clock.live();
	assert.equal(clock.read().time, now);
	assert.equal(clock.read().mode, "live");
});
test("seeking pauses playback and elapsed time remains correct after a long gap", () => {
	let now = 100000;
	const clock = createPreviewClock(() => now);
	clock.play(3600);
	now += 120000;
	assert.equal(clock.read().time, 432100000);
	clock.seek(Date.parse("2026-09-10T23:59:00Z"));
	assert.equal(clock.read().rate, 0);
	clock.play(60);
	now += 2000;
	assert.equal(
		new Date(clock.read().time).toISOString(),
		"2026-09-11T00:01:00.000Z",
	);
	clock.play(-60);
	now += 2000;
	assert.equal(
		new Date(clock.read().time).toISOString(),
		"2026-09-10T23:59:00.000Z",
	);
	assert.equal(clock.seek(NaN), false);
	assert.equal(clock.play(Infinity), false);
});
test("manual time is interpreted in Barcelona, including summer and winter offsets", () => {
	assert.equal(
		new Date(
			fromLocalDateTime("2026-07-10", "14:30", "Europe/Madrid"),
		).toISOString(),
		"2026-07-10T12:30:00.000Z",
	);
	assert.equal(
		new Date(
			fromLocalDateTime("2026-01-10", "14:30", "Europe/Madrid"),
		).toISOString(),
		"2026-01-10T13:30:00.000Z",
	);
	assert.deepEqual(
		localDateTime(new Date("2026-07-10T23:30:00Z"), "Europe/Madrid"),
		{ date: "2026-07-11", time: "01:30" },
	);
});
test("DST skipped times are rejected and repeated times preserve the nearest occurrence", () => {
	assert.equal(fromLocalDateTime("2026-03-29", "02:30", "Europe/Madrid"), null);
	for (const utc of ["2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"]) {
		const near = Date.parse(utc);
		assert.equal(
			fromLocalDateTime("2026-10-25", "02:30", "Europe/Madrid", near),
			near,
		);
	}
	assert.equal(fromLocalDateTime("2026-02-30", "12:00", "Europe/Madrid"), null);
	assert.equal(fromLocalDateTime("", "12:00", "Europe/Madrid"), null);
});
test("fractional-offset locations and midnight round-trip correctly", () => {
	for (const timeZone of [
		"Asia/Kathmandu",
		"Pacific/Chatham",
		"America/New_York",
		"UTC",
	]) {
		const instant = Date.parse("2026-09-10T00:00:00Z");
		const local = localDateTime(new Date(instant), timeZone);
		assert.equal(
			fromLocalDateTime(local.date, local.time, timeZone, instant),
			instant,
		);
	}
});

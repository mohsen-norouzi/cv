import test from "node:test";
import assert from "node:assert/strict";
import {
	solarState,
	skyDirection,
	localClock,
	BARCELONA,
} from "../src/experience/solar.js";

test("Barcelona sunlight follows actual solar altitude, including night and twilight", () => {
	const noon = solarState(new Date("2026-06-21T12:00:00Z"));
	const midnight = solarState(new Date("2026-06-21T00:00:00Z"));
	assert.equal(noon.phase, "Daylight");
	assert.equal(noon.daylight, 1);
	assert.equal(noon.stars, 0);
	assert.equal(midnight.phase, "Night");
	assert.equal(midnight.daylight, 0);
	assert.equal(midnight.stars, 1);
	const dawn = solarState(new Date("2026-09-10T05:10:00Z"));
	assert.ok(dawn.daylight < 0.5);
	assert.ok(dawn.sun.altitude < 0);
});
test("changing coordinates changes the sky at the same instant", () => {
	const time = new Date("2026-03-20T12:00:00Z");
	assert.equal(solarState(time, BARCELONA).phase, "Daylight");
	assert.equal(
		solarState(time, { latitude: 41.3874, longitude: -177.8314 }).phase,
		"Night",
	);
});
test("polar day and night remain finite without sunrise or sunset events", () => {
	for (const date of ["2026-06-21T12:00:00Z", "2026-12-21T12:00:00Z"]) {
		const state = solarState(new Date(date), { latitude: 89, longitude: 0 });
		for (const key of ["daylight", "stars", "warmth", "moonFraction"])
			assert.ok(
				Number.isFinite(state[key]) && state[key] >= 0 && state[key] <= 1,
			);
		for (const dir of [state.sunDirection, state.moonDirection])
			assert.ok(Math.abs(Math.hypot(...dir) - 1) < 1e-10);
	}
	assert.equal(
		solarState(new Date("2026-06-21T00:00:00Z"), { latitude: 89, longitude: 0 })
			.daylight,
		1,
	);
	assert.equal(
		solarState(new Date("2026-12-21T12:00:00Z"), { latitude: 89, longitude: 0 })
			.stars,
		1,
	);
});
test("north-clockwise degrees map to the correct world axes", () => {
	assert.deepEqual(skyDirection({ altitude: 0, azimuth: 0 }), [0, 0, -1]);
	const east = skyDirection({ altitude: 0, azimuth: 90 });
	assert.ok(Math.abs(east[0] - 1) < 1e-10);
	assert.equal(skyDirection({ altitude: 90, azimuth: 0 })[1], 1);
});
test("Barcelona clock uses its timezone and follows daylight saving", () => {
	assert.equal(
		localClock(new Date("2026-01-10T12:00:00Z"), BARCELONA.timeZone),
		"13:00",
	);
	assert.equal(
		localClock(new Date("2026-07-10T12:00:00Z"), BARCELONA.timeZone),
		"14:00",
	);
	assert.equal(
		localClock(new Date("2026-03-29T01:00:00Z"), BARCELONA.timeZone),
		"03:00",
	);
});

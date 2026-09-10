import assert from "node:assert/strict";
import { test } from "node:test";
import { createEnvironmentAudio } from "../src/experience/environmentAudio.js";
import {
	environmentMix,
	nearbySoundSource,
} from "../src/experience/environmentMix.js";
import { solarState, BARCELONA } from "../src/experience/solar.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const day = { sun: { altitude: 60, azimuth: 190 } };
const night = { sun: { altitude: -20, azimuth: 350 } };
const layout = {
	shore: [
		[0, -0.85, 0],
		[0, -0.85, 20],
	],
	trees: [[15, 5, 0]],
	insects: [[10, 1, 0]],
};
function fixture({ delayed = false, fail = null, resumeDelayed = false } = {}) {
	const events = [],
		nodes = [],
		sources = [],
		pending = [];
	const param = () => ({
		value: 0,
		cancelScheduledValues() {},
		setValueAtTime(v) {
			this.value = v;
		},
		setTargetAtTime(v) {
			this.value = v;
		},
	});
	const spatial = () =>
		Object.fromEntries(
			["position", "forward", "up"].flatMap((prefix) =>
				["X", "Y", "Z"].map((axis) => [prefix + axis, param()]),
			),
		);
	const node = (type) => {
		const n = {
			type,
			connections: [],
			connect(other) {
				this.connections.push(other);
			},
			disconnect() {
				this.connections = [];
			},
		};
		nodes.push(n);
		return n;
	};
	let finishResume;
	const context = {
		currentTime: 0,
		state: "suspended",
		destination: {},
		listener: spatial(),
		resume() {
			events.push("resume");
			return new Promise((resolve) => {
				const finish = () => {
					this.state = "running";
					resolve();
				};
				if (resumeDelayed) finishResume = finish;
				else finish();
			});
		},
		async suspend() {
			this.state = "suspended";
		},
		createGain() {
			return Object.assign(node("gain"), { gain: param() });
		},
		createBiquadFilter() {
			return Object.assign(node("filter"), { frequency: param() });
		},
		createPanner() {
			return Object.assign(node("panner"), spatial());
		},
		createBufferSource() {
			const n = Object.assign(node("source"), {
				start() {
					sources.push(this);
				},
			});
			return n;
		},
		async decodeAudioData(data) {
			return { key: data };
		},
	};
	const audio = createEnvironmentAudio({
		contextFactory() {
			events.push("context");
			return context;
		},
		random: () => 0.5,
		fetchFile(url) {
			events.push(url);
			return new Promise((resolve) => {
				const finish = () =>
					resolve({
						ok: !url.includes(fail ?? "never-fail"),
						arrayBuffer: async () => url,
						json: async () => layout,
					});
				if (delayed) pending.push(finish);
				else finish();
			});
		},
	});
	return {
		audio,
		context,
		events,
		sources,
		nodes,
		release: () => pending.splice(0).forEach((fn) => fn()),
		resume: () => finishResume(),
	};
}

test("solar clock distinguishes Barcelona dawn, noon and night, including reverse seeks", () => {
	const times = [
		"2026-09-10T05:30:00Z",
		"2026-09-10T11:00:00Z",
		"2026-09-10T22:00:00Z",
	];
	const mixes = times.map((time) =>
		environmentMix(solarState(new Date(time), BARCELONA)),
	);
	assert(mixes[0].morning > 0.5);
	assert(mixes[1].day > 0.95);
	assert.equal(mixes[2].night, 1);
	for (const i of [2, 1, 0])
		assert.deepEqual(
			environmentMix(solarState(new Date(times[i]), BARCELONA)),
			mixes[i],
		);
	const sameMoment = new Date(times[2]);
	const elsewhere = environmentMix(
		solarState(sameMoment, { ...BARCELONA, latitude: 34, longitude: -118 }),
	);
	assert(
		elsewhere.day > 0.9,
		"ambience uses the selected location, not a fixed Barcelona clock",
	);
	for (let altitude = -90; altitude <= 90; altitude += 0.1) {
		const m = environmentMix({ sun: { altitude, azimuth: 90 } });
		assert(Math.abs(m.day + m.morning + m.night - 1) < 1e-10);
		assert(
			Object.values(m).every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
		);
	}
});

test("coastal emitter interpolates smoothly and stays at the shoreline height", () => {
	assert.equal(nearbySoundSource([], [0, 0, 0]), null);
	const a = nearbySoundSource(layout.shore, [5, 2, 9.99]);
	const b = nearbySoundSource(layout.shore, [5, 2, 10.01]);
	assert(Math.abs(a.position[2] - b.position[2]) < 0.1);
	assert(Math.abs(a.position[1] + 0.85) < 1e-9);
	assert(nearbySoundSource(layout.shore, [100, 2, 10]).distance > a.distance);
});

test("audio remains lazy and resumes in the gesture before any downloads", async () => {
	const f = fixture();
	f.audio.setSky(day);
	assert.deepEqual(f.events, []);
	const enabled = f.audio.enable();
	assert.deepEqual(f.events.slice(0, 3), [
		"context",
		"resume",
		"/sounds/morning.m4a",
	]);
	assert.equal(await enabled, true);
	await flush();
	assert.equal(f.sources.length, 3);
	assert(f.sources.every((s) => s.loop));
	f.audio.disable();
	assert.equal(f.context.state, "suspended");
	await f.audio.enable();
	await flush();
	assert.equal(
		f.sources.length,
		3,
		"resuming reuses loops and decoded buffers",
	);
	assert.equal(f.events.filter((e) => e.startsWith("/sounds/")).length, 4);
});

test("muting and hiding during download never starts late audio", async () => {
	for (const action of ["disable", "pause"]) {
		const f = fixture({ delayed: true });
		await f.audio.enable();
		f.audio[action]();
		f.release();
		await flush();
		assert.equal(f.sources.length, 0);
		assert.equal(f.audio.active, false);
		assert.equal(f.nodes.find((n) => n.type === "gain").gain.value, 0);
		await f.audio.enable();
		await flush();
		assert.equal(f.sources.length, 3);
	}
});

test("a late context resume cannot override mute", async () => {
	const f = fixture({ resumeDelayed: true });
	const start = f.audio.enable();
	f.audio.disable();
	f.resume();
	assert.equal(await start, false);
	await flush();
	assert.equal(f.context.state, "suspended");
	assert.equal(f.sources.length, 0);
});

test("one missing optional recording does not silence other environmental layers", async () => {
	const f = fixture({ fail: "night.m4a" });
	await f.audio.enable();
	await flush();
	assert.equal(f.audio.active, true);
	assert.equal(f.sources.length, 2);
	assert(f.sources.some((s) => s.buffer.key.includes("ocean")));
});

test("walking turns the listener, keeps sources in the world and softens distant surf", async () => {
	const f = fixture();
	await f.audio.enable();
	await flush();
	const pose = {
		position: [5, 2, 5],
		forward: [0, 0, -1],
		up: [0, 1, 0],
		walking: true,
	};
	f.audio.setPose(pose);
	const ocean = f.nodes.filter((n) => n.type === "panner")[2];
	const filter = f.nodes.filter((n) => n.type === "lowpass")[2];
	const sourcePosition = [
		ocean.positionX.value,
		ocean.positionY.value,
		ocean.positionZ.value,
	];
	const nearCutoff = filter.frequency.value;
	f.audio.setPose({ ...pose, forward: [1, 0, 0] });
	assert.equal(f.context.listener.forwardX.value, 1);
	assert.deepEqual(
		[ocean.positionX.value, ocean.positionY.value, ocean.positionZ.value],
		sourcePosition,
	);
	assert.equal(ocean.panningModel, "HRTF");
	assert(ocean.rolloffFactor > 0);
	f.audio.setPose({ ...pose, position: [70, 20, 5] });
	assert(filter.frequency.value < nearCutoff);
	assert.equal(f.context.listener.positionX.value, 70);
});

test("night fades in insects and occasional owls, morning silences them again", async () => {
	const f = fixture();
	await f.audio.enable();
	await flush();
	f.audio.setSky(night);
	f.context.currentTime = 4;
	f.audio.setSky(night);
	assert.equal(f.sources.filter((s) => !s.loop).length, 1);
	f.context.currentTime = 5;
	f.audio.setSky(night);
	assert.equal(
		f.sources.filter((s) => !s.loop).length,
		1,
		"no repeated hoot on every frame",
	);
	const owl = f.sources.find((s) => !s.loop);
	assert(owl.connections[0].gain.value > 0);
	owl.onended();
	f.audio.setSky(day);
	f.context.currentTime = 100;
	f.audio.setSky(day);
	assert.equal(f.sources.filter((s) => !s.loop).length, 1);
	assert.equal(
		f.nodes.filter((n) => n.type === "gain")[7].gain.value,
		0,
		"owl fades out in daylight",
	);
	f.audio.setSky(night);
	f.context.currentTime = 104;
	f.audio.setSky(night);
	assert.equal(
		f.sources.filter((s) => !s.loop).length,
		2,
		"returning to night restores occasional calls",
	);
});

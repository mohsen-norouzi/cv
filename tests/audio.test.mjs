import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import gsap from "gsap";

// Resolve fades immediately: these tests cover playback authorization/state,
// not GSAP's own interpolation.
mock.method(gsap, "to", (proxy, options) => {
	proxy.v = options.v;
	options.onUpdate?.();
	options.onComplete?.();
});
mock.method(gsap, "killTweensOf", () => {});
after(() => mock.restoreAll());

let fixture = 0;
async function setup(play = () => Promise.resolve()) {
	const players = [];
	const events = new Map();
	globalThis.document = {
		hidden: false,
		addEventListener: (name, listener) => events.set(name, listener),
	};
	globalThis.Audio = class {
		constructor(src) {
			this.src = src;
			this.paused = true;
			this.playCalls = 0;
			players.push(this);
		}
		play() {
			this.playCalls++;
			this.paused = false;
			return play(this);
		}
		pause() {
			this.paused = true;
		}
	};
	const store = await import(
		`../src/experience/audioStore.js?test=${++fixture}`
	);
	return { store, players, events };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("both tracks start within the gesture and another click does not restart them", async () => {
	const pending = [];
	const { store, players } = await setup(
		() => new Promise((resolve) => pending.push(resolve)),
	);
	const start = store.enableMusic();
	assert.equal(players.length, 2);
	assert.equal(
		pending.length,
		2,
		"Both play calls must happen before either promise resolves",
	);
	for (const resolve of pending) resolve();
	assert.equal(await start, true);
	assert.equal(store.getMusicEnabled(), true);
	assert.equal(players[0].volume, 0.14);
	assert.equal(players[0].muted, false);
	await store.enableMusic();
	assert.equal(players[0].playCalls, 1);
	store.disableMusic();
	await store.enableMusic();
	assert.equal(
		store.getMusicEnabled(),
		false,
		"Ordinary clicks must respect the mute choice",
	);
	assert(players.every((player) => player.paused && player.muted));
});

test("optional nature failure does not silence the song", async () => {
	const { store, players } = await setup((audio) =>
		audio.src.includes("nature")
			? Promise.reject(new Error("optional layer unavailable"))
			: Promise.resolve(),
	);
	assert.equal(await store.enableMusic(), true);
	assert.equal(players[0].volume, 0.14);
	assert.equal(store.getMusicEnabled(), true);
});

test("blocked song leaves the toggle off and a later interaction retries", async () => {
	let blocked = true;
	const { store, players } = await setup(() =>
		blocked ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(),
	);
	assert.equal(await store.enableMusic(), false);
	assert.equal(store.getMusicEnabled(), false);
	assert(players.every((player) => player.paused));
	blocked = false;
	assert.equal(await store.enableMusic(), true);
});

test("muting during startup cannot be undone by a late play result", async () => {
	const pending = [];
	const { store, players } = await setup(
		() => new Promise((resolve) => pending.push(resolve)),
	);
	const start = store.enableMusic();
	store.disableMusic();
	for (const resolve of pending) resolve();
	assert.equal(await start, false);
	assert.equal(store.getMusicEnabled(), false);
	assert(players.every((player) => player.muted && player.volume === 0));
});

test("backgrounding pauses music and returning resumes unless explicitly muted", async () => {
	const { store, players, events } = await setup();
	await store.enableMusic();
	document.hidden = true;
	events.get("visibilitychange")();
	assert(players.every((player) => player.paused));
	document.hidden = false;
	events.get("visibilitychange")();
	await flush();
	assert.equal(store.getMusicEnabled(), true);
	assert(players.every((player) => !player.paused));
	store.disableMusic();
	document.hidden = true;
	events.get("visibilitychange")();
	document.hidden = false;
	events.get("visibilitychange")();
	await flush();
	assert(players.every((player) => player.paused));
});

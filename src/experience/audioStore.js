import gsap from "gsap";

const LAYERS = [
	{ src: "/sounds/ambient.m4a", target: 0.14, key: "ambient" },
	/** Quiet bed under the music */
	{ src: "/sounds/nature.m4a", target: 0.02, key: "nature" },
];

const FADE_IN = 4;
const FADE_OUT = 1.8;
const WHOOSH_SRC = "/sounds/whoosh.mp3";
const WHOOSH_VOL = 0.1;

let whoosh = null;

/** @type {Map<string, HTMLAudioElement>} */
const players = new Map();
/** @type {Map<string, { v: number }>} */
const proxies = new Map();

let wantMusic = true;
let enabled = false;
let starting = false;
let startVersion = 0;
const listeners = new Set();

function notify() {
	for (const fn of listeners) fn();
}

function ensureLayer(src, key) {
	let audio = players.get(key);
	if (audio) return audio;
	audio = new Audio(src);
	audio.loop = true;
	audio.preload = "auto";
	audio.playsInline = true;
	audio.volume = 0;
	players.set(key, audio);
	proxies.set(key, { v: 0 });
	return audio;
}

function ensureAll() {
	for (const layer of LAYERS) ensureLayer(layer.src, layer.key);
}

function setLayerVolume(key, v) {
	const proxy = proxies.get(key);
	const audio = players.get(key);
	if (proxy) proxy.v = v;
	if (audio) audio.volume = Math.max(0, Math.min(1, v));
}

function fadeLayer(key, to, duration, ease, onComplete) {
	const proxy = proxies.get(key);
	const audio = players.get(key);
	if (!proxy || !audio) return;
	gsap.killTweensOf(proxy);
	gsap.to(proxy, {
		v: to,
		duration,
		ease,
		onUpdate: () => setLayerVolume(key, proxy.v),
		onComplete,
	});
}

export function getMusicEnabled() {
	return enabled;
}

export function subscribeMusic(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

/** Start both layers inside the same click/tap gesture, then fade in.
 * No audio downloads are needed until the visitor interacts. */
export async function enableMusic() {
	if (!wantMusic || starting) return false;
	if (enabled) return true;
	starting = true;
	const version = ++startVersion;
	pausedByVisibility = false;
	ensureAll();

	try {
		// Do not await one layer before starting the other: some browsers only
		// authorize playback while the original user gesture is still active.
		const attempts = LAYERS.map(({ key }) => {
			const audio = players.get(key);
			gsap.killTweensOf(proxies.get(key));
			audio.muted = false;
			setLayerVolume(key, 0);
			try {
				return audio.paused ? audio.play() : Promise.resolve();
			} catch (error) {
				return Promise.reject(error);
			}
		});
		const results = await Promise.allSettled(attempts);
		if (version !== startVersion || !wantMusic) return false;

		// Nature is an optional quiet bed; a failure there must not silence
		// a successfully loaded song or make the music button lie about it.
		enabled = results[0].status === "fulfilled";
		if (!enabled) {
			for (const audio of players.values()) audio.pause();
			notify();
			return false;
		}
		notify();
		if (document.hidden) {
			pausedByVisibility = true;
			for (const audio of players.values()) audio.pause();
			return true;
		}
		LAYERS.forEach(({ key, target }, index) => {
			if (results[index].status === "fulfilled")
				fadeLayer(key, target, FADE_IN, "power1.out");
		});
		return true;
	} finally {
		if (version === startVersion) starting = false;
	}
}

function stopWhoosh() {
	if (!whoosh) return;
	whoosh.pause();
	whoosh.currentTime = 0;
}

export function disableMusic() {
	startVersion += 1;
	starting = false;
	wantMusic = false;
	pausedByVisibility = false;
	ensureAll();
	stopWhoosh();

	let pending = LAYERS.length;
	const done = () => {
		pending -= 1;
		if (pending > 0) return;
		for (const { key } of LAYERS) {
			const a = players.get(key);
			if (!a) continue;
			a.pause();
			a.muted = true;
		}
	};

	for (const { key } of LAYERS) {
		fadeLayer(key, 0, FADE_OUT, "power2.in", done);
	}

	enabled = false;
	notify();
}

/** One-shot for camera snap — silent when master sound is off */
export function playWhoosh() {
	if (!enabled || !wantMusic) return;
	if (!whoosh) {
		whoosh = new Audio(WHOOSH_SRC);
		whoosh.preload = "auto";
		whoosh.playsInline = true;
	}
	try {
		whoosh.pause();
		whoosh.currentTime = 0;
		whoosh.volume = WHOOSH_VOL;
		void whoosh.play().catch(() => {});
	} catch {
		/* ignore */
	}
}

export function toggleMusic() {
	if (enabled || starting) {
		disableMusic();
		return;
	}
	wantMusic = true;
	void enableMusic();
}

/** Pause while the tab is in the background; resume with the same preference. */
let pausedByVisibility = false;

async function handleVisibility() {
	if (typeof document === "undefined") return;

	if (document.hidden) {
		if (!enabled) return;
		pausedByVisibility = true;
		stopWhoosh();
		for (const { key } of LAYERS) {
			const proxy = proxies.get(key);
			const audio = players.get(key);
			if (proxy) gsap.killTweensOf(proxy);
			if (audio && !audio.paused) audio.pause();
		}
		return;
	}

	if (!pausedByVisibility || !wantMusic || !enabled) {
		pausedByVisibility = false;
		return;
	}
	pausedByVisibility = false;
	enabled = false;
	await enableMusic();
}

if (typeof document !== "undefined") {
	document.addEventListener("visibilitychange", () => {
		void handleVisibility();
	});
}

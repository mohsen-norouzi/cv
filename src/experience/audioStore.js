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

/** Unmute + fade in — call from loader Enter gesture. Audio only starts
 * downloading here, so no sound bytes count toward the initial load. */
export async function enableMusic() {
	if (!wantMusic) return false;
	if (starting) return false;
	starting = true;
	pausedByVisibility = false;
	ensureAll();

	try {
		for (const { key } of LAYERS) {
			const a = players.get(key);
			if (!a) continue;
			a.muted = true;
			setLayerVolume(key, 0);
			if (a.paused) await a.play();
			a.muted = false;
		}

		enabled = true;
		notify();

		for (const { key, target } of LAYERS) {
			const proxy = proxies.get(key);
			if (proxy) proxy.v = 0;
			setLayerVolume(key, 0);
			fadeLayer(key, target, FADE_IN, "power1.out");
		}
		return true;
	} catch {
		enabled = false;
		notify();
		return false;
	} finally {
		starting = false;
	}
}

function stopWhoosh() {
	if (!whoosh) return;
	whoosh.pause();
	whoosh.currentTime = 0;
}

export function disableMusic() {
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
		void whoosh.play();
	} catch {
		/* ignore */
	}
}

export function toggleMusic() {
	if (enabled) {
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

	try {
		for (const { key, target } of LAYERS) {
			const a = players.get(key);
			if (!a) continue;
			if (a.paused) await a.play();
			setLayerVolume(key, target);
			const proxy = proxies.get(key);
			if (proxy) proxy.v = target;
		}
	} catch {
		/* autoplay blocked after background — user can tap Music */
		enabled = false;
		notify();
	}
}

if (typeof document !== "undefined") {
	document.addEventListener("visibilitychange", () => {
		void handleVisibility();
	});
}

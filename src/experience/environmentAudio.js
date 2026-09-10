import { environmentMix, nearbySoundSource } from "./environmentMix.js";

const FILES = {
	morning: "/sounds/morning.m4a",
	night: "/sounds/night.m4a",
	ocean: "/sounds/ocean.m4a",
	owl: "/sounds/owl.m4a",
};

export function createEnvironmentAudio({
	contextFactory = () => {
		const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
		return Context ? new Context() : null;
	},
	fetchFile = (url) => fetch(url),
	random = Math.random,
} = {}) {
	let context = null,
		master = null,
		requested = false,
		paused = false,
		version = 0,
		loadPromise = null,
		layout = null;
	let mix = { day: 1, morning: 0, night: 0 },
		nextOwl = 0,
		owlVoice = null;
	let pose = {
		position: [8, 3, 30],
		forward: [0, 0, -1],
		up: [0, 1, 0],
		walking: false,
	};
	const buffers = new Map(),
		channels = new Map(),
		sources = new Map();
	const ramp = (param, value, time = 0.4) => {
		if (!param || !context) return;
		param.cancelScheduledValues(context.currentTime);
		param.setTargetAtTime(value, context.currentTime, time);
	};
	function positionNode(node, position) {
		if (node.positionX)
			["X", "Y", "Z"].forEach((axis, i) =>
				ramp(node[`position${axis}`], position[i], 0.08),
			);
		else node.setPosition(...position);
	}
	function channel(key) {
		const gain = context.createGain(),
			filter = context.createBiquadFilter(),
			panner = context.createPanner();
		gain.gain.value = 0;
		filter.type = "lowpass";
		filter.frequency.value = 9000;
		panner.panningModel = "HRTF";
		panner.distanceModel = "inverse";
		panner.refDistance = key === "ocean" ? 9 : 7;
		panner.maxDistance = 250;
		panner.rolloffFactor = 0.8;
		panner.coneInnerAngle = 360;
		panner.coneOuterAngle = 360;
		gain.connect(filter);
		filter.connect(panner);
		panner.connect(master);
		const bed = context.createGain();
		bed.gain.value = 0;
		bed.connect(master);
		const ch = { gain, filter, panner, bed };
		channels.set(key, ch);
		return ch;
	}
	function startLoops() {
		if (!requested || paused || context?.state !== "running") return;
		for (const key of ["morning", "night", "ocean"]) {
			if (!buffers.has(key) || sources.has(key)) continue;
			const source = context.createBufferSource(),
				ch = channels.get(key);
			source.buffer = buffers.get(key);
			source.loop = true;
			source.connect(ch.gain);
			source.connect(ch.bed);
			source.start();
			sources.set(key, source);
		}
		applyScene();
	}
	async function load() {
		const tasks = Object.entries(FILES).map(async ([key, url]) => {
			if (buffers.has(key)) return;
			const response = await fetchFile(url);
			if (!response.ok) throw new Error(`Sound unavailable: ${key}`);
			const buffer = await context.decodeAudioData(
				await response.arrayBuffer(),
			);
			buffers.set(key, buffer);
			startLoops();
		});
		tasks.push(
			(async () => {
				const r = await fetchFile("/optimized/soundscape.json");
				if (r.ok) {
					layout = await r.json();
					applyScene();
				}
			})(),
		);
		await Promise.allSettled(tasks);
		// Failed optional files can retry at the next explicit enable, without
		// interrupting successfully loaded layers or the user's song.
		if (buffers.size < Object.keys(FILES).length || !layout) loadPromise = null;
	}
	function init() {
		if (context) return true;
		context = contextFactory();
		if (!context) return false;
		master = context.createGain();
		master.gain.value = 0;
		master.connect(context.destination);
		for (const key of Object.keys(FILES)) channel(key);
		return true;
	}
	function applyScene() {
		if (!context || !requested || paused) return;
		const listener = context.listener;
		positionNode(listener, pose.position);
		if (listener.forwardX) {
			["X", "Y", "Z"].forEach((axis, i) => {
				ramp(listener[`forward${axis}`], pose.forward[i], 0.06);
				ramp(listener[`up${axis}`], pose.up[i], 0.06);
			});
		} else listener.setOrientation(...pose.forward, ...pose.up);
		const shore = nearbySoundSource(layout?.shore, pose.position, 5);
		const trees = nearbySoundSource(layout?.trees, pose.position, 3);
		const insects = nearbySoundSource(layout?.insects, pose.position, 2);
		const ocean = channels.get("ocean"),
			bird = channels.get("morning"),
			night = channels.get("night"),
			owl = channels.get("owl");
		const world = pose.walking ? 1 : 0.55;
		if (shore) {
			positionNode(ocean.panner, shore.position);
			ramp(
				ocean.filter.frequency,
				Math.max(1400, 9000 / (1 + shore.distance / 24)),
				0.4,
			);
		}
		ramp(ocean.gain.gain, shore ? 0.28 * world : 0, 0.6);
		ramp(ocean.bed.gain, 0.018 * world, 0.8);
		if (trees) {
			positionNode(bird.panner, trees.position);
			positionNode(owl.panner, [
				trees.position[0],
				trees.position[1] + 2,
				trees.position[2],
			]);
		}
		ramp(
			bird.gain.gain,
			trees ? (mix.morning * 0.24 + mix.day * 0.055) * world : 0,
			0.65,
		);
		ramp(bird.bed.gain, mix.morning * 0.025 + mix.day * 0.008, 0.65);
		if (insects) positionNode(night.panner, insects.position);
		ramp(night.gain.gain, insects ? mix.night * 0.13 * world : 0, 0.65);
		ramp(night.bed.gain, mix.night * 0.025, 0.65);
		ramp(owl.gain.gain, trees ? mix.night * 0.3 * world : 0, 0.65);
		if (
			mix.night > 0.55 &&
			buffers.has("owl") &&
			!owlVoice &&
			context.currentTime >= nextOwl
		) {
			const source = context.createBufferSource();
			source.buffer = buffers.get("owl");
			source.connect(owl.gain);
			owlVoice = source;
			source.onended = () => {
				source.disconnect();
				if (owlVoice === source) owlVoice = null;
			};
			source.start();
			nextOwl = context.currentTime + 35 + random() * 30;
		}
	}
	return {
		get active() {
			return requested && !paused && context?.state === "running";
		},
		async enable() {
			requested = true;
			paused = false;
			const token = ++version;
			try {
				if (!init()) return false;
				// Resume happens synchronously in the Enter/unmute gesture, before fetch.
				const resume = context.resume();
				if (!loadPromise) loadPromise = load();
				await resume;
				if (token !== version || !requested || paused) {
					if (!requested || paused) void context.suspend().catch(() => {});
					return false;
				}
				nextOwl = context.currentTime + 3;
				startLoops();
				ramp(master.gain, 1, 1);
				return true;
			} catch {
				return false;
			}
		},
		disable() {
			requested = false;
			paused = false;
			version++;
			if (!context) return;
			// Immediate silence also protects against late asset-load/resume promises.
			master.gain.cancelScheduledValues(context.currentTime);
			master.gain.setValueAtTime(0, context.currentTime);
			void context.suspend().catch(() => {});
		},
		pause() {
			if (!context) return;
			paused = true;
			version++;
			master.gain.cancelScheduledValues(context.currentTime);
			master.gain.setValueAtTime(0, context.currentTime);
			void context.suspend().catch(() => {});
		},
		setSky(sky) {
			const next = environmentMix(sky);
			if (mix.night < 0.55 && next.night >= 0.55)
				nextOwl = (context?.currentTime ?? 0) + 2.5;
			mix = next;
			applyScene();
			return mix;
		},
		setPose(next) {
			pose = next;
			applyScene();
		},
	};
}
export const environmentAudio = createEnvironmentAudio();

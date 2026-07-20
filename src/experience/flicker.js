/** Stable seed from a mesh / light name (0–100). */
export function hashSeed(name = "") {
	let h = 2166136261;
	for (let i = 0; i < name.length; i++) {
		h ^= name.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return ((h >>> 0) % 10000) / 100;
}

/** Organic flicker — seed shifts phase AND frequencies so lamps don't sync. */
export function flicker(time, seed = 0) {
	const s = seed * 1.6180339887;
	const t = time + s;
	const f1 = 2.05 + (seed % 1.9);
	const f2 = 5.2 + seed * 0.11;
	const f3 = 13.5 + seed * 0.29;
	const f4 = 29 + seed * 0.47;
	return (
		0.78 +
		Math.sin(t * f1) * 0.11 +
		Math.sin(t * f2 + s) * 0.07 +
		Math.sin(t * f3 + s * 2.1) * 0.045 +
		Math.sin(t * f4 + s * 3.3) * 0.035
	);
}

/** Softer breathe for portal-style glows */
export function breathe(time, seed = 0) {
	const t = time + seed;
	return (
		0.88 +
		Math.sin(t * 1.35) * 0.08 +
		Math.sin(t * 3.9 + seed) * 0.04 +
		Math.sin(t * 11.2 + seed * 1.5) * 0.02
	);
}

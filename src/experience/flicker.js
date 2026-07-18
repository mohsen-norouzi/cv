/** Organic flicker: slow pulse + mid shimmer + fast sparkle */
export function flicker(time, seed = 0) {
	const t = time + seed;
	return (
		0.82 +
		Math.sin(t * 2.4) * 0.1 +
		Math.sin(t * 6.8 + seed) * 0.06 +
		Math.sin(t * 17.5 + seed * 2) * 0.035 +
		Math.sin(t * 41 + seed * 3) * 0.025
	);
}

/** Softer breathe for the portal glow */
export function breathe(time, seed = 0) {
	const t = time + seed;
	return (
		0.88 +
		Math.sin(t * 1.35) * 0.08 +
		Math.sin(t * 3.9 + seed) * 0.04 +
		Math.sin(t * 11.2 + seed * 1.5) * 0.02
	);
}

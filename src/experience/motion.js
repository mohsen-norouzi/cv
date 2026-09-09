// Reuse the live query object; .matches still follows OS preference changes.
const motionPreference =
	typeof window === "undefined"
		? null
		: window.matchMedia("(prefers-reduced-motion: reduce)");
export function reducedMotion() {
	return motionPreference?.matches ?? false;
}

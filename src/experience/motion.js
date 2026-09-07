/** Read the preference at interaction time so changing OS settings takes effect. */
export function reducedMotion() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

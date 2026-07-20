/**
 * One-shot device tier for load/runtime budgets.
 * Desktop keeps the full look; mobile trades GPU cost for reliability.
 */
function detectMobile() {
	if (typeof window === "undefined") return false;
	const coarse = window.matchMedia("(pointer: coarse)").matches;
	const narrow = window.matchMedia("(max-width: 820px)").matches;
	const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
	return coarse || narrow || ua;
}

export const IS_MOBILE = detectMobile();

/** Shadow map edge length — 4K VSM OOMs many phones. */
export const SHADOW_MAP_SIZE = IS_MOBILE ? 1024 : 4096;

/** Pixel ratio cap. */
export const DPR_RANGE = IS_MOBILE ? [1, 1] : [1, 1.25];

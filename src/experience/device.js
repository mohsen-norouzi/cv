/**
 * One-shot device tier for load/runtime budgets.
 * Desktop keeps the full look; mobile trims GPU features that break Android.
 */
function detectMobile() {
	if (typeof window === "undefined") return false;
	try {
		if (new URLSearchParams(window.location.search).has("mobile")) {
			return true;
		}
	} catch {
		/* ignore */
	}
	const coarse = window.matchMedia("(pointer: coarse)").matches;
	const narrow = window.matchMedia("(max-width: 820px)").matches;
	const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
	return coarse || narrow || ua;
}

export const IS_MOBILE = detectMobile();

/** Big shadow maps + VSM crash / blank many Android GPUs. */
export const SHADOW_MAP_SIZE = IS_MOBILE ? 1024 : 4096;

/** Keep mobile DPR at 1 for fill-rate. */
export const DPR_RANGE = IS_MOBILE ? [1, 1] : [1, 1.25];

/** Modest boost — Lambert needs less light than Standard+post. */
export const MOBILE_LIGHT_BOOST = IS_MOBILE ? 1.15 : 1;

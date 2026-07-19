const listeners = new Set();

/** 0 = hero, 1 = girl, 2 = bakery, 3 = moon crystal */
export const SCROLL_SECTION_COUNT = 4;

let section = 0;
let progress = 0;
let raf = 0;
let animating = false;

/** Snap between stops */
const DURATION_MS = 750;

/** Soft ease — long ease-in/out, gentle middle (cozy, not snappy) */
function easeInOutQuint(t) {
	return t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2;
}

function notify() {
	for (const fn of listeners) fn(progress);
}

export function getScrollProgress() {
	return progress;
}

export function getScrollSection() {
	return section;
}

export function isScrollAnimating() {
	return animating;
}

export function setScrollProgress(next) {
	progress = Math.min(SCROLL_SECTION_COUNT - 1, Math.max(0, next));
	notify();
}

/**
 * Snap one section forward/back.
 * direction > 0 → next stop, direction < 0 → previous.
 */
export function snapScroll(direction) {
	const next = Math.min(
		SCROLL_SECTION_COUNT - 1,
		Math.max(0, section + (direction > 0 ? 1 : -1)),
	);
	if (next === section && !animating) return;
	if (animating) return;

	section = next;
	const from = progress;
	const to = next;
	const start = performance.now();

	if (raf) cancelAnimationFrame(raf);
	animating = true;

	const tick = (now) => {
		const t = Math.min(1, Math.max(0, (now - start) / DURATION_MS));
		const eased = easeInOutQuint(t);
		setScrollProgress(from + (to - from) * eased);

		if (t < 1) {
			raf = requestAnimationFrame(tick);
		} else {
			animating = false;
			raf = 0;
			setScrollProgress(to);
		}
	};

	raf = requestAnimationFrame(tick);
}

export function subscribeScroll(fn) {
	listeners.add(fn);
	fn(progress);
	return () => listeners.delete(fn);
}

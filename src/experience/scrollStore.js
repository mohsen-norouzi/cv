import { playWhoosh } from "./audioStore";

const listeners = new Set();

/** 0 = hero, 1 = girl, 2 = bakery, 3 = bench */
export const SCROLL_SECTION_COUNT = 4;

let section = 0;
let progress = 0;
let raf = 0;
let animating = false;

/** Pending leave sequence before the camera moves */
let exitGate = null; // { direction: 1|-1 }

/** Snap between stops */
const DURATION_MS = 900;

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
	return animating || exitGate != null;
}

export function isExitPending() {
	return exitGate != null;
}

export function setScrollProgress(next) {
	progress = Math.min(SCROLL_SECTION_COUNT - 1, Math.max(0, next));
	notify();
}

/**
 * User intent to change stop.
 * From a project stop: exit text → light first, then camera moves.
 * From hero: move immediately (nothing to tear down).
 */
export function requestSnap(direction) {
	if (animating || exitGate) return;

	const next = Math.min(
		SCROLL_SECTION_COUNT - 1,
		Math.max(0, section + (direction > 0 ? 1 : -1)),
	);
	if (next === section) return;

	if (section >= 1) {
		exitGate = { direction: direction > 0 ? 1 : -1 };
		return;
	}

	snapScroll(direction);
}

/** Called by SceneFocus once text + spot have fully hidden */
export function continueSnapAfterExit() {
	if (!exitGate) return;
	const { direction } = exitGate;
	exitGate = null;
	snapScroll(direction);
}

/**
 * Snap one section forward/back immediately (camera move).
 * Prefer `requestSnap` for user gestures.
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
	playWhoosh();

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

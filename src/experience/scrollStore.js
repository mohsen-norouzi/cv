const listeners = new Set();

/** 0 = hero, 1 = girl */
let section = 0;
let progress = 0;
let raf = 0;
let animating = false;

const DURATION_MS = 2400;

function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
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
	progress = Math.min(1, Math.max(0, next));
	notify();
}

/**
 * Snap to a section. direction > 0 → girl, direction < 0 → hero.
 * One intentional gesture should call this once.
 */
export function snapScroll(direction) {
	const next = direction > 0 ? 1 : 0;
	if (next === section && !animating) return;
	if (next === section && animating) return;

	section = next;
	const from = progress;
	const to = next;
	const start = performance.now();

	if (raf) cancelAnimationFrame(raf);
	animating = true;

	const tick = (now) => {
		const t = Math.min(1, Math.max(0, (now - start) / DURATION_MS));
		const eased = easeInOutCubic(t);
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

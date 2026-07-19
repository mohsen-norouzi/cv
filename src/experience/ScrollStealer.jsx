import { useEffect } from "react";
import { isScrollAnimating, snapScroll } from "./scrollStore";

/** Accumulated wheel delta needed to fire a snap (trackpads send tiny ticks). */
const WHEEL_ACCUM_THRESHOLD = 10;
const TOUCH_THRESHOLD = 18;
/** Ignore further input briefly after a snap starts. */
const COOLDOWN_MS = 200;
/** Reset unused wheel accumulation after idle. */
const ACCUM_IDLE_MS = 400;

/**
 * Captures wheel / touch. A light intentional gesture snaps to the next stop.
 * Wheel deltas are accumulated so trackpads don't need a hard flick.
 */
export default function ScrollStealer() {
	useEffect(() => {
		let touchStartY = null;
		let cooldownUntil = 0;
		let wheelAccum = 0;
		let accumResetTimer = 0;

		const trySnap = (direction) => {
			const now = performance.now();
			if (now < cooldownUntil) return false;
			if (isScrollAnimating()) return false;
			cooldownUntil = now + COOLDOWN_MS;
			wheelAccum = 0;
			snapScroll(direction);
			return true;
		};

		const onWheel = (event) => {
			event.preventDefault();
			if (isScrollAnimating()) return;
			if (performance.now() < cooldownUntil) return;

			wheelAccum += event.deltaY;

			window.clearTimeout(accumResetTimer);
			accumResetTimer = window.setTimeout(() => {
				wheelAccum = 0;
			}, ACCUM_IDLE_MS);

			if (Math.abs(wheelAccum) >= WHEEL_ACCUM_THRESHOLD) {
				trySnap(wheelAccum > 0 ? 1 : -1);
			}
		};

		const onTouchStart = (event) => {
			touchStartY = event.touches[0]?.clientY ?? null;
		};

		const onTouchMove = (event) => {
			event.preventDefault();
		};

		const onTouchEnd = (event) => {
			if (touchStartY == null) return;
			const y = event.changedTouches[0]?.clientY;
			const start = touchStartY;
			touchStartY = null;
			if (y == null) return;
			const dy = start - y;
			if (Math.abs(dy) < TOUCH_THRESHOLD) return;
			trySnap(dy > 0 ? 1 : -1);
		};

		window.addEventListener("wheel", onWheel, { passive: false });
		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd);

		return () => {
			window.clearTimeout(accumResetTimer);
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
		};
	}, []);

	return null;
}

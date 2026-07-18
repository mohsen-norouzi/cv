import { useEffect } from "react";
import { isScrollAnimating, snapScroll } from "./scrollStore";

const WHEEL_THRESHOLD = 12;
const TOUCH_THRESHOLD = 48;
/** Ignore further wheel events briefly after a snap starts (trackpads spam wheel). */
const COOLDOWN_MS = 900;

/**
 * Captures wheel / touch. One intentional gesture snaps the camera
 * all the way to the girl (or back to the hero).
 */
export default function ScrollStealer() {
	useEffect(() => {
		let touchStartY = null;
		let cooldownUntil = 0;

		const trySnap = (direction) => {
			const now = performance.now();
			if (now < cooldownUntil) return;
			if (isScrollAnimating()) return;
			cooldownUntil = now + COOLDOWN_MS;
			snapScroll(direction);
		};

		const onWheel = (event) => {
			event.preventDefault();
			if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
			trySnap(event.deltaY > 0 ? 1 : -1);
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
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
		};
	}, []);

	return null;
}

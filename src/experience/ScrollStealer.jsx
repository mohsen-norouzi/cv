import { useEffect } from "react";
import { isScrollAnimating, snapScroll } from "./scrollStore";

/** Accumulated wheel delta needed to fire a snap (trackpads send tiny ticks). */
const WHEEL_ACCUM_THRESHOLD = 24;
const TOUCH_THRESHOLD = 28;
/** After a snap, ignore input until the wheel/touch goes quiet (kills trackpad inertia). */
const GESTURE_IDLE_MS = 450;

/**
 * Captures wheel / touch. One intentional gesture → one snap.
 * Stays locked through the animation and leftover trackpad momentum.
 */
export default function ScrollStealer() {
	useEffect(() => {
		let touchStartY = null;
		let wheelAccum = 0;
		let gestureLocked = false;
		let idleTimer = 0;

		const armIdleUnlock = () => {
			window.clearTimeout(idleTimer);
			idleTimer = window.setTimeout(() => {
				// Stay locked until the snap finishes, then wait for a quiet gap.
				if (isScrollAnimating()) {
					armIdleUnlock();
					return;
				}
				gestureLocked = false;
				wheelAccum = 0;
			}, GESTURE_IDLE_MS);
		};

		const trySnap = (direction) => {
			if (gestureLocked || isScrollAnimating()) return false;
			gestureLocked = true;
			wheelAccum = 0;
			snapScroll(direction);
			armIdleUnlock();
			return true;
		};

		const onWheel = (event) => {
			event.preventDefault();

			// Any wheel while locked / animating just extends the lock (eat inertia).
			if (gestureLocked || isScrollAnimating()) {
				gestureLocked = true;
				armIdleUnlock();
				return;
			}

			wheelAccum += event.deltaY;
			armIdleUnlock();

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
			window.clearTimeout(idleTimer);
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
		};
	}, []);

	return null;
}

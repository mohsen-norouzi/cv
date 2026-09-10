// Browsers can release pointer lock before delivering the Escape key event.
// Treat both event orders as one release, never as an accidental exit from walking.
export function createWalkEscape({
	isLocked,
	releaseMouse,
	clearInput,
	exitWalk,
	now = () => performance.now(),
}) {
	let wasLocked = isLocked();
	let releasedAt = -Infinity;
	return {
		lockChanged() {
			const locked = isLocked();
			if (wasLocked && !locked) releasedAt = now();
			wasLocked = locked;
			clearInput();
		},
		keyDown(event) {
			if (event.code !== "Escape") return false;
			if (event.repeat) return true;
			clearInput();
			if (isLocked() || wasLocked) {
				releasedAt = now();
				if (isLocked()) releaseMouse();
				wasLocked = false;
			} else if (now() - releasedAt > 300) {
				exitWalk();
			}
			return true;
		},
	};
}

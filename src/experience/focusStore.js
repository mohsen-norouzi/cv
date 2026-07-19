/**
 * 0 = open world (hero), 1 = fully focused on a project stop.
 * Updated every frame by Lights / SceneFocus.
 */
let amount = 0;
let stop = 0;

export function getFocusAmount() {
	return amount;
}

export function getFocusStop() {
	return stop;
}

export function setFocus(nextAmount, nextStop) {
	amount = nextAmount;
	stop = nextStop;
}

/** How settled we are on a project stop (1–3). Hero stays open. */
export function computeFocus(progress) {
	const nearest = Math.round(progress);
	if (nearest < 1) {
		return { amount: 0, stop: 0 };
	}
	const dist = Math.abs(progress - nearest);
	const near = 1 - Math.min(1, dist / 0.32);
	const eased = near * near * (3 - 2 * near);
	return { amount: eased, stop: nearest };
}

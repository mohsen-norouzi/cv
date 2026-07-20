/**
 * Focus state for project stops.
 * `amount` — camera/world focus (follows scroll)
 * `spotReveal` / `textReveal` — staged after arrival (spotlight → copy)
 */
let amount = 0;
let stop = 0;
let spotReveal = 0;
let textReveal = 0;
let notifiedTextOn = false;
let notifiedStop = 0;

const revealListeners = new Set();

export function getFocusAmount() {
	return amount;
}

export function getFocusStop() {
	return stop;
}

export function getSpotReveal() {
	return spotReveal;
}

export function getTextReveal() {
	return textReveal;
}

export function setFocus(nextAmount, nextStop) {
	amount = nextAmount;
	stop = nextStop;
}

export function setFocusReveal(nextSpot, nextText) {
	spotReveal = nextSpot;
	textReveal = nextText;
	const textOn = nextText > 0.35;
	if (textOn !== notifiedTextOn || stop !== notifiedStop) {
		notifiedTextOn = textOn;
		notifiedStop = stop;
		for (const fn of revealListeners) fn();
	}
}

export function subscribeFocusReveal(fn) {
	revealListeners.add(fn);
	return () => revealListeners.delete(fn);
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

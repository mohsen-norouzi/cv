const ease = (value, target, rate, dt) =>
	target + (value - target) * Math.exp(-rate * dt);

export function createFocusTransition() {
	return { stop: 0, hold: 0, world: 0, spot: 0, text: 0 };
}

// Zoom begins → surroundings dim. Spotlight/dust wait until the camera is close.
// Only the caption waits for camera arrival.
// Project exits fade only the spotlight and caption. Keep the surroundings
// dark between stops; restore daylight when returning to the coast (stop 0).
export function advanceFocus(
	state,
	{ stop, arrived, near = false, fadeSpeed = 4, exiting, reduced, dt },
) {
	if (stop !== state.stop) {
		state.stop = stop;
		state.hold = 0;
		state.spot = 0;
		state.text = 0;
	}
	state.hold = arrived && stop > 0 && !exiting ? state.hold + dt : 0;
	const ready =
		stop > 0 && arrived && !exiting && (reduced || state.hold >= 0.15);
	const active = stop > 0 && !exiting;
	const worldTarget = stop > 0 ? 1 : 0;
	state.world = reduced ? worldTarget : ease(state.world, worldTarget, 2.8, dt);
	const spotTarget = active && (near || arrived) ? 1 : 0;
	state.spot = reduced
		? spotTarget
		: ease(state.spot, spotTarget, exiting ? 10 : fadeSpeed, dt);
	const textTarget = ready && state.spot > 0.65 ? 1 : 0;
	state.text = reduced
		? textTarget
		: ease(state.text, textTarget, exiting ? 12 : 5, dt);
	const exitComplete = exiting && Math.max(state.spot, state.text) < 0.02;
	if (exitComplete) state.spot = state.text = 0;
	return exitComplete;
}

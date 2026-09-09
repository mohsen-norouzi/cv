/** Preserve the main follow motion, then finish the glide in a bounded time. */
export const CAMERA_FOLLOW_DAMP = 2.2;
export const CAMERA_FINISH_SECONDS = 1.2;

export function advanceCameraFollow(state, dt, moving, reduced = false) {
	if (reduced) {
		state.elapsed = CAMERA_FINISH_SECONDS;
		return 1;
	}
	if (moving) {
		state.elapsed = 0;
		return 1 - Math.exp(-CAMERA_FOLLOW_DAMP * dt);
	}
	const previous = state.elapsed;
	state.elapsed = Math.min(CAMERA_FINISH_SECONDS, previous + dt);
	if (state.elapsed >= CAMERA_FINISH_SECONDS) return 1;

	// A cubic envelope starts with the existing follow speed and reaches zero
	// residual movement smoothly, instead of approaching the stop forever.
	const remaining =
		(CAMERA_FINISH_SECONDS - state.elapsed) /
		(CAMERA_FINISH_SECONDS - previous);
	return (
		1 -
		Math.exp((3 / CAMERA_FINISH_SECONDS - CAMERA_FOLLOW_DAMP) * dt) *
			remaining ** 3
	);
}

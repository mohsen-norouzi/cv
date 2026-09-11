export const WALK_REACH = 8;

export function nearestWalkStop(position, targets, previousStop = 0) {
	let best = null,
		bestDistance = Infinity;
	for (const target of targets) {
		const [x, y, z] = target.position;
		if (Math.abs(position.y - (y + 1.2)) > 3) continue;
		const distance = Math.hypot(position.x - x, position.z - z);
		const score = distance - (target.stop === previousStop ? 0.7 : 0);
		if (distance < WALK_REACH && score < bestDistance) {
			best = { stop: target.stop, distance };
			bestDistance = score;
		}
	}
	if (!best) return { stop: 0, reveal: 0 };
	const t = Math.max(0, Math.min(1, (WALK_REACH - best.distance) / 3.5));
	return { stop: best.stop, reveal: t * t * (3 - 2 * t) };
}

export function advanceWalkFocus(state, desired, delta, reduced = false) {
	const target = desired.stop === state.stop ? desired.reveal : 0;
	const amount = reduced ? 1 : 1 - Math.exp(-4 * Math.min(delta, 0.05));
	state.reveal += (target - state.reveal) * amount;
	if (state.reveal < 0.015 && desired.stop !== state.stop) {
		state.reveal = 0;
		state.stop = desired.stop;
	}
	if (reduced) state.reveal = desired.reveal;
}

export function visibleWalkHit(hits, blockers, maxDistance = WALK_REACH) {
	const hit = hits.find(
		(entry) => entry.visible !== false && entry.distance <= maxDistance,
	);
	if (!hit) return null;
	if (
		blockers.some(
			(entry) =>
				entry.visible !== false && entry.distance < hit.distance - 0.025,
		)
	)
		return null;
	return hit;
}

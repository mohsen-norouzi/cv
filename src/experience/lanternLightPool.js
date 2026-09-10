// Six fixed fixtures at a time, never six lights sliding/teleporting while lit.
export function createLanternLightPool(positions, budget = 6) {
	const slots = Array.from(
		{ length: Math.min(budget, positions.length) },
		() => ({ index: -1, strength: 0 }),
	);
	const ranked = positions.map((position, index) => ({
		position,
		index,
		distance: 0,
	}));
	return {
		slots,
		update(camera, delta) {
			for (const c of ranked)
				c.distance = Math.hypot(
					camera.x - c.position[0],
					camera.y - c.position[1],
					camera.z - c.position[2],
				);
			ranked.sort((a, b) => a.distance - b.distance || a.index - b.index);
			const occupied = new Set(
				slots.filter((s) => s.index >= 0).map((s) => s.index),
			);
			const cutoff =
				ranked[Math.min(budget - 1, ranked.length - 1)]?.distance ?? 0;
			for (const slot of slots) {
				const current = ranked.find((c) => c.index === slot.index);
				const keep =
					current && current.distance < 18 && current.distance <= cutoff + 2;
				const distanceFade = keep
					? 1 - Math.min(1, Math.max(0, (current.distance - 8) / 10))
					: 0;
				const target = distanceFade * distanceFade * (3 - 2 * distanceFade);
				const step = Math.min(delta, 0.1) * 1.25;
				slot.strength +=
					Math.sign(target - slot.strength) *
					Math.min(Math.abs(target - slot.strength), step);
				if (slot.strength === 0 && !keep) {
					occupied.delete(slot.index);
					const next = ranked.find(
						(c) => c.distance < 18 && !occupied.has(c.index),
					);
					slot.index = next?.index ?? -1;
					if (next) occupied.add(next.index);
				}
			}
			return slots;
		},
	};
}

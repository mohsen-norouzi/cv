const smooth = (a, b, x) => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

// The same sun position used by the sky, so seeking time, reverse playback,
// location changes and seasonal sunrise changes all affect the soundscape.
export function environmentMix(sky) {
	const altitude = sky?.sun?.altitude ?? 45;
	const night = 1 - smooth(-9, 3, altitude);
	const morning =
		(1 - night) *
		(1 - smooth(18, 48, altitude)) *
		(sky?.sun?.azimuth < 180 ? 1 : 0);
	return { night, morning, day: Math.max(0, 1 - night - morning) };
}

// A softly weighted source position avoids audio jumping between neighboring
// rocks or plants. It depends on position, never on which way the head turns.
export function nearbySoundSource(points, position, softness = 4) {
	if (!points?.length) return null;
	let total = 0,
		x = 0,
		y = 0,
		z = 0,
		nearest = Infinity;
	for (const p of points) {
		const d2 =
			(p[0] - position[0]) ** 2 +
			(p[1] - position[1]) ** 2 +
			(p[2] - position[2]) ** 2;
		nearest = Math.min(nearest, Math.sqrt(d2));
		const weight = 1 / (d2 + softness * softness) ** 3;
		total += weight;
		x += p[0] * weight;
		y += p[1] * weight;
		z += p[2] * weight;
	}
	return { position: [x / total, y / total, z / total], distance: nearest };
}

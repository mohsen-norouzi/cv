// Anchor playback to elapsed time so frame rate never changes its speed.
export function createPreviewClock(now = Date.now) {
	let anchor = now(),
		started = anchor,
		rate = 0,
		mode = "live";
	const value = () =>
		mode === "live" ? now() : anchor + (now() - started) * rate;
	return {
		read: () => ({ time: value(), mode, rate }),
		seek(time) {
			if (!Number.isFinite(time)) return false;
			anchor = time;
			started = now();
			mode = "preview";
			rate = 0;
			return true;
		},
		play(nextRate) {
			if (![0, 60, 600, 3600, -60, -600, -3600].includes(nextRate))
				return false;
			anchor = value();
			started = now();
			mode = "preview";
			rate = nextRate;
			return true;
		},
		live() {
			mode = "live";
			rate = 0;
		},
	};
}
const formats = new Map();
export function localDateTime(date, timeZone) {
	if (!formats.has(timeZone))
		formats.set(
			timeZone,
			new Intl.DateTimeFormat("en-GB", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23",
			}),
		);
	const p = Object.fromEntries(
		formats
			.get(timeZone)
			.formatToParts(date)
			.map((part) => [part.type, part.value]),
	);
	return {
		date: `${p.year}-${p.month}-${p.day}`,
		time: `${p.hour}:${p.minute}`,
	};
}
// Match the chosen location's civil time, independent of the browser timezone.
// A skipped DST minute has no match; an ambiguous minute keeps the nearest fold.
export function fromLocalDateTime(date, time, timeZone, near = Date.now()) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
		return null;
	const wall = Date.parse(`${date}T${time}:00Z`);
	if (!Number.isFinite(wall)) return null;
	const candidates = new Set();
	for (const offset of [-86400000, 0, 86400000]) {
		const sample = wall + offset;
		const local = localDateTime(new Date(sample), timeZone);
		const delta = Date.parse(`${local.date}T${local.time}:00Z`) - sample;
		const candidate = wall - delta;
		const check = localDateTime(new Date(candidate), timeZone);
		if (check.date === date && check.time === time) candidates.add(candidate);
	}
	return (
		[...candidates].sort(
			(a, b) => Math.abs(a - near) - Math.abs(b - near),
		)[0] ?? null
	);
}

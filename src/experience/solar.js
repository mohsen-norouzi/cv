import { getPosition, getMoonPosition, getMoonIllumination } from "suncalc";

export const BARCELONA = Object.freeze({
	latitude: 41.3874,
	longitude: 2.1686,
	label: "Barcelona",
	timeZone: "Europe/Madrid",
});
const radians = Math.PI / 180;
export const smooth = (low, high, value) => {
	const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
	return t * t * (3 - 2 * t);
};
// SunCalc 2 uses degrees, clockwise from north. Scene north is -Z, east is +X.
export function skyDirection({ altitude, azimuth }) {
	const a = altitude * radians,
		z = azimuth * radians;
	return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)];
}
export function solarState(date, location = BARCELONA) {
	const { latitude, longitude } = location;
	const sun = getPosition(date, latitude, longitude);
	const moon = getMoonPosition(date, latitude, longitude);
	const illumination = getMoonIllumination(date);
	const daylight = smooth(-6, 12, sun.altitude);
	const stars = 1 - smooth(-16, -5, sun.altitude);
	const warmth =
		smooth(-10, -1, sun.altitude) * (1 - smooth(5, 24, sun.altitude));
	return {
		date,
		location,
		sun,
		moon,
		daylight,
		stars,
		warmth,
		sunDirection: skyDirection(sun),
		moonDirection: skyDirection(moon),
		sunVisible: smooth(-0.8, 0.5, sun.altitude),
		moonVisible: smooth(-0.5, 2, moon.altitude),
		moonFraction: illumination.fraction,
		phaseAngle: (illumination.angle - moon.parallacticAngle) * radians,
		phase:
			sun.altitude > 6 ? "Daylight" : sun.altitude > -6 ? "Twilight" : "Night",
	};
}
export function localClock(date, timeZone) {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(date);
}

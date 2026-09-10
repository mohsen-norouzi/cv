import * as THREE from "three";
import { COAST_PATH } from "./coastLayout.js";
import { createRoadSampler } from "./placement.js";

export const EXPANSION_HALF_WIDTH = 1.6;
export const EXPANSION_PATH = new THREE.CatmullRomCurve3(
	[
		COAST_PATH.getPointAt(0.66),
		...[
			[22, 12.35, -13],
			[35, 12.65, -17],
			[43, 12.75, -17],
			[46, 13.2, -28],
			[50, 14.65, -39],
			[52, 15.2, -49],
			[44, 16.2, -60],
			[34, 17.8, -68],
			[27, 18.25, -76],
			[25, 18.4, -83],
		].map((p) => new THREE.Vector3(...p)),
	],
	false,
	"catmullrom",
	0.55,
);
export const HEADLANDS = [
	{ name: "East garden", center: [43, 12.25, -17], radius: [13, 13] },
	{ name: "North cove", center: [52, 14.7, -48], radius: [13, 12] },
	{ name: "Far headland", center: [27, 17.8, -77], radius: [14, 13] },
];
// Parameters use the authored spline (getPoint), not arc-length fractions.
export const BRIDGE_SPANS = [
	[0.13, 0.255],
	[0.385, 0.525],
	[0.68, 0.825],
];
const nearest = createRoadSampler(EXPANSION_PATH, 600);
export const FUTURE_TERRACES = [
	["East lookout", 38, 12.8, -10, 2.7],
	["Garden terrace", 50, 12.85, -20, 2.9],
	["Cove terrace", 45, 15.25, -46, 2.8],
	["Sea terrace", 59, 15.25, -49, 2.9],
	["North lookout", 20, 18.3, -73, 2.8],
	["Horizon terrace", 34, 18.4, -81, 3],
].map(([name, x, y, z, radius], i) => {
	const road = nearest(x, z);
	const outward = new THREE.Vector3(
		x - road.point.x,
		0,
		z - road.point.z,
	).normalize();
	const offset = Math.max(
		0,
		radius * 1.19 + EXPANSION_HALF_WIDTH + 0.65 - road.distance,
	);
	return {
		id: `future-${i + 1}`,
		name,
		position: [x + outward.x * offset, y, z + outward.z * offset],
		radius,
	};
});

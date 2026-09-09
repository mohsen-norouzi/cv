import * as THREE from "three";
import { fitTerraces } from "./placement.js";

// Deterministic, editable scene geometry. Coordinates are shared with the camera tour.
export const COAST_PATH = new THREE.CatmullRomCurve3(
	[
		[8, 1.0, 34],
		[5, 2.0, 27],
		[0, 3.45, 19],
		[3, 4.6, 14],
		[7, 6.15, 9],
		[6, 8.0, 2],
		[10, 10.0, -5],
		[15, 12.0, -12],
		[12, 15.0, -19],
		[18, 18.0, -26],
		[19, 21.0, -36],
	].map((p) => new THREE.Vector3(...p)),
	false,
	"catmullrom",
	0.35,
);
export const LANDMARKS = fitTerraces(COAST_PATH, [
	{ name: "Singer", position: [-3.3, 3.75, 17.6], radius: 2.15 },
	{ name: "Bakery", position: [11.1, 6.6, 7.5], radius: 2.65 },
	{ name: "Next", position: [11.5, 11.0, -9], radius: 2.05 },
]);

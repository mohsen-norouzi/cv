import { Color, Vector3 } from "three";

export const LIGHTHOUSE_RANGE = 145;
export const LIGHTHOUSE_ANGLE = 0.065;
// Shared with the water shader, which does not receive Three.js spotlights.
export const lighthouseUniforms = {
	lighthouseOrigin: { value: new Vector3(-23, 6.73, -8) },
	lighthouseDirection: { value: new Vector3(1, -0.045, 0).normalize() },
	lighthouseReach: { value: LIGHTHOUSE_RANGE },
	lighthouseStrength: { value: 0 },
	lighthouseColor: { value: new Color("#ffe3b4") },
};

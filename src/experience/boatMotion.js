import { Matrix4, Vector2 } from "three";
import { SEA_LEVEL } from "./oceanSurface.js";

// A small sailboat just offshore of the first paving slab, clear of the shoreline.
export const BOAT = {
	position: [2.5, 35.5],
	yaw: 1.12,
	scale: 1.35,
	draft: 0.38,
};
// Shared with the ocean shader, so pausing/reduced motion keeps both in sync.
export const oceanMotion = { time: 0 };
const WAVES = [
	[0.32, 18, 0.94, 0.342],
	[0.18, 10.5, 0.63, -0.777],
	[0.085, 6.2, -0.28, 0.96],
	[0.04, 3.8, 0.86, 0.51],
].map(([amplitude, length, x, z]) => ({
	amplitude,
	k: (Math.PI * 2) / length,
	x,
	z,
	speed: Math.sqrt((9.81 * Math.PI * 2) / length),
}));
export function swellHeight(x, z, time) {
	let height = 0;
	for (const w of WAVES)
		height +=
			w.amplitude * Math.sin((x * w.x + z * w.z) * w.k - time * w.speed);
	return height;
}
export function boatPose(time, out) {
	const [x, z] = BOAT.position,
		sin = Math.sin(BOAT.yaw),
		cos = Math.cos(BOAT.yaw);
	const length = 1.6,
		beam = 0.65;
	const bow = swellHeight(x + sin * length, z + cos * length, time);
	const stern = swellHeight(x - sin * length, z - cos * length, time);
	const starboard = swellHeight(x + cos * beam, z - sin * beam, time);
	const port = swellHeight(x - cos * beam, z + sin * beam, time);
	out.y = SEA_LEVEL - BOAT.draft + (bow + stern + starboard + port) / 4;
	out.pitch = -Math.atan2(bow - stern, length * 2);
	out.roll = Math.atan2(starboard - port, beam * 2);
	return out;
}

// The water surface must not render through the open hull. Limit the clip to
// this boat's small footprint before doing the local-space calculation.
export const boatWaterUniforms = {
	boatInverse: { value: new Matrix4() },
	boatCenter: { value: new Vector2(...BOAT.position) },
};
export const boatWaterClipGLSL = `
if (distance(worldPosition.xz, boatCenter) < 3.4) {
 vec3 p = (boatInverse * vec4(worldPosition.xyz, 1.)).xyz;
 if (p.z > -1.56 && p.z < 1.38 && p.y < .55) {
  float width = p.z < -.9 ? mix(.055,.36,clamp((p.z+1.56)/.66,0.,1.))
   : p.z < -.25 ? mix(.36,.50,(p.z+.9)/.65)
   : p.z < .65 ? .50
   : mix(.50,.29,clamp((p.z-.65)/.73,0.,1.));
  if (abs(p.x+.075) < width) discard;
 }
}
`;

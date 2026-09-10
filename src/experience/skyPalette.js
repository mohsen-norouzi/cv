import { Color, Vector3 } from "three";
import { getSky } from "./skyStore";

const night = {
	top: "#071021",
	horizon: "#29364e",
	cool: "#17263e",
	sun: "#34425a",
	water: "#112635",
};
const day = {
	top: "#659cc8",
	horizon: "#c9ddea",
	cool: "#a2bdd4",
	sun: "#f7e6c9",
	water: "#497f91",
};
const dusk = {
	top: "#637696",
	horizon: "#ebbca1",
	cool: "#8b91af",
	sun: "#ffd39c",
	water: "#627e91",
};
const palettes = [night, day, dusk].map((p) =>
	Object.fromEntries(
		Object.entries(p).map(([key, value]) => [key, new Color(value)]),
	),
);
export const skyPalette = Object.fromEntries(
	Object.keys(night).map((key) => [key, new Color()]),
);
export const skyLightDirection = new Vector3();
export const skyLightColor = new Color();
export const mistColor = { value: new Color() };
let previous;
export function updateSkyPalette() {
	const sky = getSky();
	if (previous === sky) return sky;
	previous = sky;
	for (const key of Object.keys(night))
		skyPalette[key]
			.copy(palettes[0][key])
			.lerp(palettes[1][key], sky.daylight)
			.lerp(palettes[2][key], sky.warmth * 0.8);
	skyLightDirection.fromArray(
		sky.sunVisible > 0.01 ? sky.sunDirection : sky.moonDirection,
	);
	skyLightColor.set(sky.sunVisible > 0.01 ? "#fff2d9" : "#9dbce9");
	if (sky.sunVisible > 0.01) skyLightColor.lerp(palettes[2].sun, sky.warmth);
	mistColor.value.copy(skyPalette.horizon);
	return sky;
}
updateSkyPalette();

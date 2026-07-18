import { folder, useControls } from "leva";
import { BIG_LAMP } from "./constants";

/** Big lantern intensity + position. */
export function useLampControls() {
	return useControls("Lamps", {
		big: {
			value: 12,
			min: 0,
			max: 40,
			step: 0.1,
			label: "Big lantern",
		},
		"Big position": folder({
			bigPos: {
				value: { x: BIG_LAMP.x, y: BIG_LAMP.y, z: BIG_LAMP.z },
				step: 0.05,
				label: "xyz",
			},
		}),
	});
}

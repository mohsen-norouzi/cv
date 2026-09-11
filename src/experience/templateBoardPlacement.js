import { EXPANSION_PATH, FUTURE_TERRACES } from "./expansionLayout.js";
import { createRoadSampler } from "./placement.js";

// First exhibit terrace reached after turning onto the east branch.
const terrace = FUTURE_TERRACES[0];
const approach = createRoadSampler(EXPANSION_PATH)(
	terrace.position[0],
	terrace.position[2],
).point;

export const TEMPLATE_BOARD = {
	position: [...terrace.position],
	// The parchment faces local +Z. Face the steps, not the sea.
	yaw: Math.atan2(
		approach.x - terrace.position[0],
		approach.z - terrace.position[2],
	),
	width: 2.1,
	obstacleRadius: 1.1,
};

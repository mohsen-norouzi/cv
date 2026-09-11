// Approved singer preset, shared by all three project spotlights.
// Positions and aim are offsets from each project's own terrace.
const approvedSpotlight = {
	color: "#ffe0a8",
	look: [0, 0, 0],
	penumbra: 0.72,
	beamOpacity: 0.2,
	sourceFade: 0.55,
	softness: 3.3,
	poolOpacity: 0.6,
	dustOpacity: 0.62,
	dustSize: 0.55,
	dustDrift: 0.018,
	intensity: 70,
	pos: [1, 6.4, 1.8],
	pool: 4.2,
};

export const spotlightSettings = {
	timing: { revealDistance: 4, fadeSpeed: 4 },
	singer: approvedSpotlight,
	bakery: approvedSpotlight,
	next: approvedSpotlight,
	// The board faces back toward the branch, so light its parchment from that side.
	collection: { ...approvedSpotlight, pos: [1, 6.4, -2.6] },
};

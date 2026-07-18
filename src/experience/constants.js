import * as THREE from "three";

/** Soft warm haze — matches HTML page backdrop */
export const FOG_COLOR = "#c9b8a8";
export const FOG_DENSITY = 0.011;

/** Cool dusty blue at zenith */
export const SKY_TOP = "#6a8098";
/** Warm peach / apricot at horizon */
export const SKY_HORIZON = "#f0b07a";
/** Cool lavender on the shadow side of the sky */
export const SKY_COOL = "#8a96b8";
/** Hot sun disk side */
export const SKY_SUN = "#ffc48a";

/** Sun sits low-left like the reference (golden hour) */
export const SUN_POSITION = new THREE.Vector3(-90, 18, -40);
export const SUN_DIRECTION = new THREE.Vector3(-0.85, 0.28, -0.35).normalize();

/** From Try1.glb CamTarget */
export const CAM_TARGET = new THREE.Vector3(12, 9, -4);
/** Near the road / street light, looking into the scene */
export const CAM_START = new THREE.Vector3(2.5, 3.8, 34);
export const CAM_FOV = 42;

/**
 * Singer girl (tripo_node_…) on the path platform.
 * Locked end pose: standing on the road, facing her.
 */
export const GIRL_POSITION = new THREE.Vector3(5.95, 3.06, 21.08);
export const GIRL_VIEW_POS = new THREE.Vector3(9.75, 3.15, 24.15);
export const GIRL_LOOK_AT = new THREE.Vector3(5.95, 4.2, 21.08);

/**
 * Bakery (second tripo_node_…) further up the path.
 */
export const BAKERY_POSITION = new THREE.Vector3(6.86, 5.41, 13.31);
export const BAKERY_VIEW_POS = new THREE.Vector3(2.05, 5.2, 15.55);
export const BAKERY_LOOK_AT = new THREE.Vector3(6.86, 5.6, 13.11);

/**
 * Camera path waypoints between snap stops.
 * Girl → bakery eases up the road, then settles left of the shop (no hard diagonal cut).
 */
export const CAM_PATH_HERO_TO_GIRL = [CAM_START, GIRL_VIEW_POS];
export const CAM_LOOK_HERO_TO_GIRL = [CAM_TARGET, GIRL_LOOK_AT];

export const CAM_PATH_GIRL_TO_BAKERY = [
	GIRL_VIEW_POS,
	new THREE.Vector3(8.4, 3.55, 21.8),
	new THREE.Vector3(5.6, 4.35, 18.6),
	new THREE.Vector3(3.2, 4.95, 16.6),
	BAKERY_VIEW_POS,
];
export const CAM_LOOK_GIRL_TO_BAKERY = [
	GIRL_LOOK_AT,
	new THREE.Vector3(6.4, 4.5, 18.5),
	new THREE.Vector3(6.7, 5.2, 15.2),
	BAKERY_LOOK_AT,
];

/** Street lamp emissive / fill intensity (per Street_Light* mesh) */
export const BIG_LAMP_INTENSITY = 3.7;

/** Lighthouse lamp tip (Cylinder.025) */
export const LIGHTHOUSE_LAMP = new THREE.Vector3(31.683, 5.513, 2.756);
export const LIGHTHOUSE_INTENSITY = 6;

export const BIRD_ORBIT_CENTER = new THREE.Vector3(12, 6, 10);

/** Scene material retints */
export const PATH_COLOR = "#e8e4dc";
export const PLATFORM_COLOR = "#ddd8d0";
export const TERRAIN_COLOR = "#6a7168";
export const WATER_COLOR = "#1e3a5c";
export const PINE_COLOR = "#2f4a32";
export const BOULDER_COLOR = "#5a5e62";
export const HORIZON_GLOW = "#ffb070";
export const HORIZON_INTENSITY = 1.15;
export const HORIZON_OPACITY = 0.45;

/** Light / post grade — cleaner, less vintage wash */
export const AMBIENT_INT = 0.16;
export const AMBIENT_COLOR = "#c4b0a0";
export const HEMI_SKY = "#e0c4a8";
export const HEMI_GROUND = "#3d4a5c";
export const HEMI_INT = 0.4;
export const KEY_INT = 2.35;
export const KEY_COLOR = "#ffb06a";
export const FILL_INT = 0.55;
export const FILL_COLOR = "#6e84a8";
export const RIM_INT = 0.25;
export const RIM_COLOR = "#ffd2a8";

export const BLOOM_THRESHOLD = 0.75;
export const BLOOM_INTENSITY = 1.2;
export const BLOOM_RADIUS = 0.5;
export const SATURATION = 0.02;
export const BRIGHTNESS = 0;
export const CONTRAST = 0.02;
export const VIGNETTE_OFFSET = 0.28;
export const VIGNETTE_DARKNESS = 0.4;

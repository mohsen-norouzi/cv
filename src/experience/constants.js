import * as THREE from "three";

/** Soft warm haze — matches HTML page backdrop (keep App bg in sync) */
/** Thin — depth comes from discrete mist banks, not a uniform veil */
export const FOG_COLOR = "#bfc1cf";
export const FOG_DENSITY = 0.0055;

/** Powder blue at zenith — the reference sky is light, never navy */
export const SKY_TOP = "#a8b5d0";
/** Warm peach / apricot at horizon */
export const SKY_HORIZON = "#ffe4c3";
/** Pink-lavender on the shadow side of the sky — luminous, never gray */
export const SKY_COOL = "#c7c5d9";
/** Hot sun disk side */
export const SKY_SUN = "#ffe9cb";

/** Low left, raking across the scene — every facet gets a lit and a shade side */
export const SUN_POSITION = new THREE.Vector3(-98, 53, 210);
export const SUN_DIRECTION = new THREE.Vector3(-35, 19, 75).normalize();

/** From Try1.glb CamTarget */
export const CAM_TARGET = new THREE.Vector3(-7, 10, -3);
/** Near the road / street light, looking into the scene */
export const CAM_START = new THREE.Vector3(30, 23, 48);
export const CAM_FOV = 42;

/**
 * Singer girl (tripo_node_…) on the path platform.
 * Locked end pose: standing on the road, facing her.
 */
export const GIRL_POSITION = new THREE.Vector3(-3.3, 3.75, 17.6);
export const GIRL_VIEW_POS = new THREE.Vector3(5, 7.4, 28);
export const GIRL_LOOK_AT = new THREE.Vector3(-6.5, 5.1, 17.6);

/**
 * Bakery (second tripo_node_…) further up the path.
 */
export const BAKERY_POSITION = new THREE.Vector3(11.1, 6.6, 7.5);
export const BAKERY_VIEW_POS = new THREE.Vector3(19, 10.8, 21);
export const BAKERY_LOOK_AT = new THREE.Vector3(7.6, 8.1, 7.5);

/**
 * Final stop — stone bench on the upper path platform.
 * View stands on the road (path curves right here), looking back at the bench.
 */
export const CRYSTAL_POSITION = new THREE.Vector3(11.5, 11, -9);
export const CRYSTAL_VIEW_POS = new THREE.Vector3(20, 14.8, 3);
export const CRYSTAL_LOOK_AT = new THREE.Vector3(8.5, 11.8, -9);

/**
 * Camera path waypoints between snap stops.
 * Girl → bakery eases up the road; bakery → crystal follows the road as it bends right.
 */
export const CAM_PATH_HERO_TO_GIRL = [CAM_START, GIRL_VIEW_POS];
export const CAM_LOOK_HERO_TO_GIRL = [CAM_TARGET, GIRL_LOOK_AT];

export const CAM_PATH_GIRL_TO_BAKERY = [
	GIRL_VIEW_POS,
	new THREE.Vector3(7, 8.5, 26),
	new THREE.Vector3(12, 10, 25),
	new THREE.Vector3(17, 11, 23),
	BAKERY_VIEW_POS,
];
export const CAM_LOOK_GIRL_TO_BAKERY = [
	GIRL_LOOK_AT,
	new THREE.Vector3(-2, 6, 15),
	new THREE.Vector3(4, 7.5, 10),
	BAKERY_LOOK_AT,
];

/** Straight-ish climb into the gem stop (look is slerped in CameraRig). */
export const CAM_PATH_BAKERY_TO_CRYSTAL = [
	BAKERY_VIEW_POS,
	new THREE.Vector3(21, 13.5, 12),
	CRYSTAL_VIEW_POS,
];
/** Endpoints only — segment 2 blends facing via quaternion slerp (no look-point whip). */
export const CAM_LOOK_BAKERY_TO_CRYSTAL = [BAKERY_LOOK_AT, CRYSTAL_LOOK_AT];

/** Street lamp emissive / fill intensity — lamps carry the cozy mood */
export const BIG_LAMP_INTENSITY = 4.6;

/** Lighthouse lamp tip (Cylinder.025) */
export const LIGHTHOUSE_LAMP = new THREE.Vector3(31.683, 5.513, 2.756);
export const LIGHTHOUSE_INTENSITY = 6;

export const BIRD_ORBIT_CENTER = new THREE.Vector3(12, 6, 10);

/** Scene material retints — light warm grays and sage, reference palette */
export const PATH_COLOR = "#ece8de";
export const PLATFORM_COLOR = "#e0dbd2";
export const TERRAIN_COLOR = "#82877b";
export const WATER_COLOR = "#9fb4c2";
export const PINE_COLOR = "#40624a";
export const BOULDER_COLOR = "#767b80";
export const HORIZON_GLOW = "#ffb070";
export const HORIZON_INTENSITY = 1.15;
export const HORIZON_OPACITY = 0.45;

/** Light / post grade — warm key shaping, soft shadows, thin fog veil */
/** Lower fill = real shadow sides; strong warm key = shaping */
export const AMBIENT_INT = 0.2;
export const AMBIENT_COLOR = "#d2c2ba";
export const HEMI_SKY = "#f6d4ac";
export const HEMI_GROUND = "#5d6a80";
export const HEMI_INT = 0.55;
export const KEY_INT = 4.1;
export const KEY_COLOR = "#ffb877";
export const FILL_INT = 0.5;
export const FILL_COLOR = "#6e84a8";
/** Front warm bounce — with a backlit key this keeps faces cozy, not murky */
export const RIM_INT = 0.5;
export const RIM_COLOR = "#ffd2a8";

export const BLOOM_THRESHOLD = 1.2;
export const BLOOM_INTENSITY = 0.55;
export const BLOOM_RADIUS = 0.55;
export const SATURATION = 0.015;
export const BRIGHTNESS = 0.015;
export const CONTRAST = 0.075;
export const VIGNETTE_OFFSET = 0.18;
export const VIGNETTE_DARKNESS = 0.08;

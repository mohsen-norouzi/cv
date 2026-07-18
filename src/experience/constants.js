import * as THREE from "three";

/** Soft peach fog that blends into the sunset sky */
export const FOG_COLOR = "#c9b8a8";
/** Cool dusty blue at zenith */
export const SKY_TOP = "#7a8fb0";
/** Warm peach / apricot at horizon */
export const SKY_HORIZON = "#f0b07a";
/** Cool lavender on the shadow side of the sky */
export const SKY_COOL = "#9aa3c4";
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
 * Default end pose: standing on the road, facing her.
 */
export const GIRL_POSITION = new THREE.Vector3(5.95, 3.06, 21.08);
export const GIRL_VIEW_POS = new THREE.Vector3(9.75, 3.15, 24.15);
export const GIRL_LOOK_AT = new THREE.Vector3(5.95, 4.2, 21.08);

/** Street lamp emissive / fill intensity (per Street_Light* mesh) */
export const BIG_LAMP_INTENSITY = 3.7;

/** Lighthouse lamp tip (Cylinder.025) */
export const LIGHTHOUSE_LAMP = new THREE.Vector3(31.683, 5.513, 2.756);
export const LIGHTHOUSE_INTENSITY = 6;

export const BIRD_ORBIT_CENTER = new THREE.Vector3(12, 6, 10);

/** Scene material retints (reference look) */
export const PATH_COLOR = "#e8e4dc";
export const PLATFORM_COLOR = "#ddd8d0";
export const TERRAIN_COLOR = "#6a7168";
export const WATER_COLOR = "#1e3a5c";
export const PINE_COLOR = "#2f4a32";
export const BOULDER_COLOR = "#5a5e62";

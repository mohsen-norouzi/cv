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

/** Big wooden street light — hanging lantern height */
export const BIG_LAMP = new THREE.Vector3(5.03, 4.15, 26.63);

export const BIRD_ORBIT_CENTER = new THREE.Vector3(12, 6, 10);

/** Scene material retints (reference look) */
export const PATH_COLOR = "#e8e4dc";
export const PLATFORM_COLOR = "#ddd8d0";
export const TERRAIN_COLOR = "#6a7168";
export const WATER_COLOR = "#1e3a5c";
export const PINE_COLOR = "#2f4a32";
export const BOULDER_COLOR = "#5a5e62";

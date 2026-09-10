import * as THREE from "three";

export const SEA_LEVEL = -0.85;
export const SHORE_BOUNDS = [-100, -155, 210, 225];
export const SHORE_RANGE = 8;
// Dense only around the coast; the distant sea uses a handful of broad strips.
export function oceanGeometry(mobile = false) {
	const count = mobile ? 100 : 200;
	const axis = [-1500, -900, -500, -300];
	for (let i = 0; i <= count; i++) axis.push(-200 + (400 * i) / count);
	axis.push(300, 500, 900, 1500);
	const geometry = new THREE.PlaneGeometry(
		1,
		1,
		axis.length - 1,
		axis.length - 1,
	);
	const position = geometry.attributes.position;
	for (let y = 0; y < axis.length; y++)
		for (let x = 0; x < axis.length; x++)
			position.setXYZ(y * axis.length + x, axis[x], -axis[y], 0);
	geometry.computeBoundingSphere();
	geometry.boundingSphere.radius += 1;
	return geometry;
}

// Height and its analytic x/z derivatives keep the highlights on the swells.
export const swellGLSL = `
vec3 swell(vec2 p, float t) {
 vec3 result=vec3(0.);
 vec4 a=vec4(.32,.18,.085,.04);
 vec4 k=6.2831853/vec4(18.,10.5,6.2,3.8);
 vec4 phase=vec4(dot(p,vec2(.94,.342)),dot(p,vec2(.63,-.777)),dot(p,vec2(-.28,.96)),dot(p,vec2(.86,.51)))*k-t*sqrt(9.81*k);
 vec4 h=a*sin(phase), slope=a*k*cos(phase);
 result.x=dot(h,vec4(1.));
 result.y=dot(slope,vec4(.94,.63,-.28,.86));
 result.z=dot(slope,vec4(.342,-.777,.96,.51));
 return result;
}`;

import { getSky } from "./skyStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getFocusAmount } from "./focusStore";
import { reducedMotion } from "./motion";

const DOTS_PER_LIGHT = 4;
const seed = (index) => {
	const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
	return value - Math.floor(value);
};

/** Tiny insects around the actual lantern bulbs, all in one points draw. */
export default function LanternInsects({ positions }) {
	const geometry = useMemo(() => {
		const count = positions.length * DOTS_PER_LIGHT;
		const anchors = new Float32Array(count * 3);
		const seeds = new Float32Array(count * 4);
		for (let i = 0; i < count; i++) {
			anchors.set(positions[Math.floor(i / DOTS_PER_LIGHT)], i * 3);
			for (let axis = 0; axis < 4; axis++)
				seeds[i * 4 + axis] = seed(i * 4 + axis + 1);
		}
		const result = new THREE.BufferGeometry();
		result.setAttribute("position", new THREE.BufferAttribute(anchors, 3));
		result.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
		return result;
	}, [positions]);

	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				transparent: true,
				depthWrite: false,
				depthTest: true,
				toneMapped: false,
				uniforms: {
					uTime: { value: 0 },
					uPixelRatio: { value: 1 },
					uNight: { value: 0 },
					uColor: { value: new THREE.Color("#ecd5a4") },
				},
				vertexShader: `
			attribute vec4 aSeed;
			uniform float uTime;
			uniform float uPixelRatio;
			uniform float uNight;
			varying float vAlpha;
			void main() {
				float phase = aSeed.x * 6.283185;
				float t = uTime * mix(0.65, 1.25, aSeed.y) + phase;
				float radius = mix(0.18, 0.52, aSeed.z);
				// Overlapping frequencies make small loops, hesitations and darts;
				// each insect wanders independently rather than orbiting in a ring.
				vec3 wander = vec3(
					sin(t * 1.3) * radius + sin(t * 4.7 + phase) * 0.045,
					0.12 + sin(t * 1.7 + phase) * 0.22 + cos(t * 5.1) * 0.035,
					cos(t * 1.1 + phase) * radius + sin(t * 3.9) * 0.04
				);
				vec4 view = modelViewMatrix * vec4(position + wander, 1.0);
				float distanceToEye = length(view.xyz);
				float size = mix(1.1, 1.7, aSeed.w) * clamp(14.0 / max(1.0, distanceToEye), 0.5, 1.15);
				gl_PointSize = size * uPixelRatio;
				gl_Position = projectionMatrix * view;
				float flicker = 0.68 + 0.22 * sin(t * 2.3 + phase);
				vAlpha = mix(0.36, 0.64, uNight) * flicker
					* (1.0 - smoothstep(18.0, 48.0, distanceToEye));
			}
		`,
				fragmentShader: `
			uniform vec3 uColor;
			varying float vAlpha;
			void main() {
				if (vAlpha < 0.005) discard;
				float radius = length(gl_PointCoord - 0.5);
				if (radius > 0.5) discard;
				float edge = 1.0 - smoothstep(0.25, 0.5, radius);
				gl_FragColor = vec4(uColor, vAlpha * edge);
				#include <colorspace_fragment>
			}
		`,
			}),
		[],
	);

	useEffect(() => () => geometry.dispose(), [geometry]);
	useEffect(() => () => material.dispose(), [material]);
	useFrame(({ gl }, delta) => {
		if (!reducedMotion())
			material.uniforms.uTime.value += Math.min(delta, 0.05);
		material.uniforms.uPixelRatio.value = gl.getPixelRatio();
		material.uniforms.uNight.value = Math.max(
			getFocusAmount(),
			1 - getSky().daylight,
		);
	});

	return (
		<points
			name="Lantern insects"
			geometry={geometry}
			material={material}
			frustumCulled={false}
			renderOrder={6}
		/>
	);
}

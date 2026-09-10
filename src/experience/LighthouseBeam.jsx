import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getFocusAmount } from "./focusStore";
import { getSky } from "./skyStore";
import { reducedMotion } from "./motion";
import {
	LIGHTHOUSE_ANGLE,
	LIGHTHOUSE_RANGE,
	lighthouseUniforms,
} from "./lighthouseState";

export default function LighthouseBeam({ position, landscape }) {
	const light = useRef();
	const rotation = useRef(0.8);
	const scan = useRef(1);
	const target = useMemo(() => new THREE.Object3D(), []);
	const ray = useMemo(
		() => new THREE.Raycaster(undefined, undefined, 0.85, LIGHTHOUSE_RANGE),
		[],
	);
	const hits = useMemo(() => [], []);
	const side = useMemo(() => new THREE.Vector3(), []);
	const toCamera = useMemo(() => new THREE.Vector3(), []);
	const blockers = useMemo(() => {
		const meshes = [];
		landscape.traverse((object) => {
			if (object.isMesh && !object.material.name.includes("Lantern glass"))
				meshes.push(object);
		});
		return meshes;
	}, [landscape]);
	const shaft = useMemo(
		() =>
			new THREE.ShaderMaterial({
				transparent: true,
				depthWrite: false,
				side: THREE.DoubleSide,
				forceSinglePass: true,
				blending: THREE.AdditiveBlending,
				toneMapped: false,
				uniforms: { ...lighthouseUniforms, beamSide: { value: side } },
				vertexShader: `uniform vec3 lighthouseOrigin,lighthouseDirection,beamSide; uniform float lighthouseReach;
   varying vec2 vUv;
   void main(){vUv=uv;float distance=uv.y*lighthouseReach;
    vec3 world=lighthouseOrigin+lighthouseDirection*distance+beamSide*(uv.x*2.-1.)*(.18+distance*.065);
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
				fragmentShader: `uniform vec3 lighthouseColor; uniform float lighthouseStrength; varying vec2 vUv;
   void main(){float crossSection=abs(vUv.x*2.-1.);
    float soft=exp(-5.*crossSection*crossSection)*(1.-smoothstep(.65,1.,crossSection));
    float ends=smoothstep(0.,.018,vUv.y)*(1.-smoothstep(.5,1.,vUv.y));
    float alpha=soft*ends*lighthouseStrength*.19;
    if(alpha<.0005)discard;
    gl_FragColor=vec4(lighthouseColor,alpha);}`,
			}),
		[side],
	);
	useEffect(
		() => () => {
			shaft.dispose();
			lighthouseUniforms.lighthouseStrength.value = 0;
		},
		[shaft],
	);
	useFrame(({ camera }, delta) => {
		if (!reducedMotion())
			rotation.current =
				(rotation.current + (Math.min(delta, 0.1) * Math.PI) / 12) %
				(Math.PI * 2);
		const u = lighthouseUniforms;
		u.lighthouseOrigin.value.fromArray(position);
		u.lighthouseDirection.value
			.set(Math.cos(rotation.current), -0.045, Math.sin(rotation.current))
			.normalize();
		u.lighthouseStrength.value =
			(0.1 + 0.9 * (1 - getSky().daylight)) * (1 - getFocusAmount() * 0.55);
		// Trace the beam centre through the real landscape eight times per second.
		// Start beyond the lantern enclosure so it cannot block its own lens.
		scan.current += delta;
		if (scan.current >= 0.125) {
			ray.set(u.lighthouseOrigin.value, u.lighthouseDirection.value);
			hits.length = 0;
			ray.intersectObjects(blockers, false, hits);
			u.lighthouseReach.value = Math.min(
				LIGHTHOUSE_RANGE,
				hits[0]?.distance ?? LIGHTHOUSE_RANGE,
			);
			scan.current = 0;
		}
		toCamera.subVectors(camera.position, u.lighthouseOrigin.value);
		side.crossVectors(u.lighthouseDirection.value, toCamera).normalize();
		if (side.lengthSq() < 0.001)
			side.set(0, 1, 0).cross(u.lighthouseDirection.value).normalize();
		target.position
			.copy(u.lighthouseOrigin.value)
			.addScaledVector(u.lighthouseDirection.value, LIGHTHOUSE_RANGE);
		target.updateMatrixWorld();
		light.current.position.copy(u.lighthouseOrigin.value);
		light.current.intensity = 2600 * u.lighthouseStrength.value;
		// Leave falloff beyond the impact point so the coastline actually catches light.
		light.current.distance = Math.min(
			LIGHTHOUSE_RANGE,
			u.lighthouseReach.value + 12,
		);
	}, -0.25);
	return (
		<>
			<primitive object={target} />
			<spotLight
				ref={light}
				name="Lighthouse sweep"
				target={target}
				color="#ffe3b4"
				angle={LIGHTHOUSE_ANGLE}
				penumbra={0.8}
				decay={1.4}
				intensity={0}
				distance={LIGHTHOUSE_RANGE}
			/>
			<mesh material={shaft} frustumCulled={false} renderOrder={4}>
				<planeGeometry args={[2, 1]} />
			</mesh>
		</>
	);
}

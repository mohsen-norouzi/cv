import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { reducedMotion } from "./motion";
// A handful of depth-tested wisps separate the middle and distant ridges.
const banks = [
	[-15, 5, -21, 38, 9, 0.18],
	[-3, 11, -32, 45, 12, 0.22],
	[12, 19, -42, 45, 16, 0.26],
	[-28, 3, -12, 35, 5, 0.13],
];
export default function CoastalMist() {
	const sprites = useMemo(
		() =>
			banks.map(([x, y, z, w, h, opacity], i) => {
				const material = new THREE.ShaderMaterial({
					transparent: true,
					depthWrite: false,
					uniforms: { uTime: { value: i * 31 }, uOpacity: { value: opacity } },
					vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
					fragmentShader: `varying vec2 vUv;uniform float uTime;uniform float uOpacity;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
   void main(){vec2 q=(vUv-.5)*2.;float edge=pow(max(0.,1.-dot(q,q)),1.8);vec2 p=vUv*vec2(5.,3.)+vec2(uTime*.01,0.);float n=noise(p)*.6+noise(p*2.1)*.28+noise(p*4.2)*.12;float a=edge*smoothstep(.25,.8,n)*uOpacity;gl_FragColor=vec4(vec3(.78,.78,.83),a);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`,
				});
				const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
				mesh.position.set(x, y, z);
				mesh.renderOrder = 3;
				return mesh;
			}),
		[],
	);
	useFrame(({ camera, clock }) =>
		sprites.forEach((s, i) => {
			s.quaternion.copy(camera.quaternion);
			s.material.uniforms.uTime.value =
				(reducedMotion() ? 0 : clock.elapsedTime) + i * 31;
		}),
	);
	return (
		<group>
			{sprites.map((s) => (
				<primitive key={s.uuid} object={s} />
			))}
		</group>
	);
}

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { worldBrightness } from "./focusStore";
import { mistColor, skyPalette } from "./skyPalette";
import { reducedMotion } from "./motion";
import { IS_MOBILE } from "./device";
import { weatherNoise } from "./weatherNoise";
import { SHORE_BOUNDS, SHORE_RANGE } from "./oceanSurface";

// Low banks sit over the water, with separate wisps crossing the higher channels.
const banks = [
	[-24, 2.2, 7, 48, 7, 0.4],
	[20, 2.8, -4, 44, 8, 0.48],
	[43, 4, -33, 48, 9, 0.5],
	[40, 5.5, -64, 46, 10, 0.5],
	[26, 4, -40, 48, 8, 0.4],
	[-15, 2, -45, 52, 7, 0.32],
	[63, 2.5, -54, 45, 8, 0.36],
	[25, 5, -97, 70, 12, 0.4],
	[-38, 1.3, 27, 50, 5, 0.24],
	[12, 3, 22, 40, 6, 0.25],
];
export default function CoastalMist() {
	const time = useRef(0);
	const shore = useLoader(THREE.TextureLoader, "/optimized/shore.png");
	shore.flipY = false;
	shore.colorSpace = THREE.NoColorSpace;
	const sprites = useMemo(
		() =>
			banks
				.filter((_, i) => !IS_MOBILE || i < 5)
				.map(([x, y, z, w, h, opacity], i) => {
					const material = new THREE.ShaderMaterial({
						name: "Drifting coastal mist",
						transparent: true,
						depthWrite: false,
						side: THREE.DoubleSide,
						uniforms: {
							uTime: { value: 0 },
							shoreMap: { value: shore },
							shoreBounds: { value: new THREE.Vector4(...SHORE_BOUNDS) },
							uSeed: { value: i * 17.31 },
							uOpacity: { value: opacity },
							uFade: { value: 1 },
							worldBrightness,
							mistColor,
							coolColor: { value: skyPalette.cool },
						},
						vertexShader: `varying vec2 vUv; varying vec3 vWorld;
    void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
						fragmentShader: `uniform float uTime,uSeed,uOpacity,uFade,worldBrightness;uniform vec3 mistColor,coolColor;varying vec2 vUv;varying vec3 vWorld; uniform sampler2D shoreMap; uniform vec4 shoreBounds;
    ${weatherNoise}
    void main(){
     vec2 q=(vUv-.5)*2.;float edge=pow(max(0.,1.-dot(q,q)),1.6);
     vec2 p=vUv*vec2(5.5,2.5)+vec2(uSeed-uTime*.045,uTime*.009);
     float n=weatherFbm(p+vec2(weatherNoise(p*.7+uTime*.014)*.7,0.));
     float filaments=weatherNoise(p*3.2+vec2(uTime*.015,0.));
     float density=smoothstep(.26,.7,n)*(.7+.3*filaments);
     float aboveWater=smoothstep(-.7,.65,vWorld.y);
     vec2 shoreUV=(vWorld.xz-shoreBounds.xy)/shoreBounds.zw;
     float inBounds=step(0.,shoreUV.x)*step(0.,shoreUV.y)*step(shoreUV.x,1.)*step(shoreUV.y,1.);
     float clearance=mix(${SHORE_RANGE.toFixed(1)},texture2D(shoreMap,shoreUV).r*${SHORE_RANGE.toFixed(1)},inBounds);
     float shoreFade=smoothstep(.3,3.3,clearance);
     float alpha=edge*density*uOpacity*uFade*aboveWater*shoreFade;
     if(alpha<.002)discard;
     vec3 color=mix(coolColor,mistColor,.65+n*.35)*worldBrightness;
     gl_FragColor=vec4(color,alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`,
					});
					const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
					mesh.position.set(x, y, z);
					mesh.userData.origin = new THREE.Vector3(x, y, z);
					return mesh;
				}),
		[shore],
	);
	useEffect(
		() => () => {
			for (const s of sprites) {
				s.geometry.dispose();
				s.material.dispose();
			}
		},
		[sprites],
	);
	useFrame(({ camera }, delta) => {
		if (!reducedMotion()) time.current += Math.min(delta, 0.05);
		const t = time.current;
		sprites.forEach((s, i) => {
			const phase = (t * (0.006 + i * 0.0003) + 0.23 + i * 0.137) % 1;
			const life = Math.sin(phase * Math.PI);
			s.position.copy(s.userData.origin);
			s.position.x += (phase - 0.5) * 24;
			s.position.z += Math.sin(t * 0.025 + i) * 2.5;
			s.position.y += Math.sin(t * 0.075 + i) * 0.5;
			s.quaternion.copy(camera.quaternion);
			const u = s.material.uniforms;
			u.uTime.value = t;
			u.uFade.value =
				Math.min(1, life * 4) *
				THREE.MathUtils.smoothstep(
					camera.position.distanceTo(s.position),
					6,
					18,
				);
		});
	});
	return (
		<group name="Moving sea mist">
			{sprites.map((s) => (
				<primitive key={s.uuid} object={s} />
			))}
		</group>
	);
}

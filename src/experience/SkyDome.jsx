import { Billboard } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import {
	SKY_COOL,
	SKY_HORIZON,
	SKY_SUN,
	SKY_TOP,
	SUN_DIRECTION,
	SUN_POSITION,
} from "./constants";

function createSunTexture() {
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const c = size / 2;
	const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
	grad.addColorStop(0, "rgba(255,248,230,1)");
	grad.addColorStop(0.1, "rgba(255,210,140,0.95)");
	grad.addColorStop(0.28, "rgba(255,160,80,0.55)");
	grad.addColorStop(0.55, "rgba(255,120,60,0.18)");
	grad.addColorStop(1, "rgba(255,100,50,0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

export default function SkyDome() {
	const skyMat = useMemo(() => {
		const material = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			fog: false,
			uniforms: {
				topColor: { value: new THREE.Color(SKY_TOP) },
				horizonColor: { value: new THREE.Color(SKY_HORIZON) },
				coolColor: { value: new THREE.Color(SKY_COOL) },
				sunColor: { value: new THREE.Color(SKY_SUN) },
				sunDir: { value: SUN_DIRECTION.clone() },
			},
			vertexShader: /* glsl */ `
				varying vec3 vWorldPosition;
				void main() {
					vec4 worldPosition = modelMatrix * vec4(position, 1.0);
					vWorldPosition = worldPosition.xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: /* glsl */ `
				uniform vec3 topColor;
				uniform vec3 horizonColor;
				uniform vec3 coolColor;
				uniform vec3 sunColor;
				uniform vec3 sunDir;
				varying vec3 vWorldPosition;

				void main() {
					vec3 dir = normalize(vWorldPosition);
					float h = dir.y;
					float heightMix = pow(clamp(h * 1.8 + 0.15, 0.0, 1.0), 0.85);

					// Warm near sun azimuth, cool opposite (reference sunset wedge)
					float sunAz = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
					float sunGlow = pow(sunAz, 2.2);
					float sunDisk = pow(max(dot(dir, normalize(sunDir)), 0.0), 32.0);

					vec3 horizon = mix(coolColor, horizonColor, sunGlow);
					horizon = mix(horizon, sunColor, sunGlow * 0.65 + sunDisk * 0.5);

					vec3 col = mix(horizon, topColor, heightMix);
					// Lift the sun side of the upper sky slightly
					col = mix(col, sunColor, sunGlow * (1.0 - heightMix) * 0.25);

					gl_FragColor = vec4(col, 1.0);
				}
			`,
		});
		return material;
	}, []);

	const sunTexture = useMemo(() => createSunTexture(), []);

	return (
		<group>
			<mesh material={skyMat} renderOrder={-10} frustumCulled={false}>
				<sphereGeometry args={[180, 48, 32]} />
			</mesh>
			{sunTexture && (
				<Billboard follow position={SUN_POSITION}>
					<mesh renderOrder={-9}>
						<planeGeometry args={[90, 90]} />
						<meshBasicMaterial
							map={sunTexture}
							transparent
							depthWrite={false}
							fog={false}
							toneMapped={false}
							blending={THREE.AdditiveBlending}
							opacity={1}
						/>
					</mesh>
				</Billboard>
			)}
		</group>
	);
}

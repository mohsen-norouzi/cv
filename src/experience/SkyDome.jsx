import { Billboard } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { SKY_HORIZON, SKY_TOP, SUN_POSITION } from "./constants";

function createSunTexture() {
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const c = size / 2;
	const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
	grad.addColorStop(0, "rgba(255,244,220,1)");
	grad.addColorStop(0.12, "rgba(255,228,175,0.9)");
	grad.addColorStop(0.35, "rgba(252,205,130,0.45)");
	grad.addColorStop(0.7, "rgba(244,190,120,0.12)");
	grad.addColorStop(1, "rgba(240,185,120,0)");
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
				varying vec3 vWorldPosition;
				void main() {
					float h = normalize(vWorldPosition).y;
					float t = pow(clamp(h * 2.2 + 0.12, 0.0, 1.0), 0.75);
					gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
				}
			`,
		});
		return material;
	}, []);

	const sunTexture = useMemo(() => createSunTexture(), []);

	return (
		<group>
			<mesh material={skyMat} renderOrder={-10} frustumCulled={false}>
				<sphereGeometry args={[180, 32, 24]} />
			</mesh>
			{sunTexture && (
				<Billboard follow position={SUN_POSITION}>
					<mesh renderOrder={-9}>
						<planeGeometry args={[130, 130]} />
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

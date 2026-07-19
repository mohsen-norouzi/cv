import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import {
	SKY_COOL,
	SKY_HORIZON,
	SKY_SUN,
	SKY_TOP,
	SUN_DIRECTION,
} from "./constants";

/**
 * Image-based lighting baked from the same palette as the SkyDome.
 * Every MeshStandardMaterial picks up soft sky/ground bounce and the water
 * gets a real sky reflection — the "global illumination" feel of an offline
 * render, for the cost of one tiny PMREM bake at startup.
 */
export default function EnvLight({ intensity = 0.5 }) {
	const { gl, scene } = useThree();

	useEffect(() => {
		const envScene = new THREE.Scene();

		const skyMat = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: {
				topColor: { value: new THREE.Color(SKY_TOP) },
				horizonColor: { value: new THREE.Color(SKY_HORIZON) },
				coolColor: { value: new THREE.Color(SKY_COOL) },
				sunColor: { value: new THREE.Color(SKY_SUN) },
				sunDir: { value: SUN_DIRECTION.clone() },
			},
			vertexShader: /* glsl */ `
				varying vec3 vDir;
				void main() {
					vDir = position;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: /* glsl */ `
				uniform vec3 topColor;
				uniform vec3 horizonColor;
				uniform vec3 coolColor;
				uniform vec3 sunColor;
				uniform vec3 sunDir;
				varying vec3 vDir;
				void main() {
					vec3 dir = normalize(vDir);
					float heightMix = smoothstep(-0.05, 0.75, dir.y);
					float sunAz = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
					float sunGlow = pow(sunAz, 1.5);
					// Hot spot so the env contributes directional warm bounce
					float sunDisk = pow(max(dot(dir, normalize(sunDir)), 0.0), 8.0);
					vec3 horizonCol = mix(coolColor, horizonColor, 0.5 + 0.5 * sunGlow);
					vec3 col = mix(horizonCol, topColor, heightMix);
					col += sunColor * sunDisk * 2.0;
					// Ground hemisphere: muted warm earth bounce
					if (dir.y < 0.0) col = mix(col, vec3(0.35, 0.3, 0.26), smoothstep(0.0, -0.25, dir.y));
					gl_FragColor = vec4(col, 1.0);
				}
			`,
		});

		const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 24), skyMat);
		envScene.add(dome);

		const pmrem = new THREE.PMREMGenerator(gl);
		const envTarget = pmrem.fromScene(envScene, 0.08);
		scene.environment = envTarget.texture;
		scene.environmentIntensity = intensity;

		pmrem.dispose();
		dome.geometry.dispose();
		skyMat.dispose();

		return () => {
			scene.environment = null;
			envTarget.dispose();
		};
	}, [gl, scene, intensity]);

	return null;
}

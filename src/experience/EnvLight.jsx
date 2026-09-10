import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { solarState } from "./solar";
import { useSky } from "./skyStore";
import { skyPalette, updateSkyPalette } from "./skyPalette";

// Cache soft environment lighting for five minutes. The visible sun and shadows
// follow the finer live clock. Preview playback refreshes at most every two seconds.
export default function EnvLight() {
	const { gl, scene } = useThree();
	const sky = useSky();
	const environmentTime =
		sky.playback.mode === "live"
			? Math.floor(sky.environmentTime / 300_000) * 300_000
			: sky.environmentTime;
	const { latitude, longitude } = sky.location;

	useEffect(() => {
		const current = solarState(new Date(environmentTime), {
			latitude,
			longitude,
		});
		updateSkyPalette();
		const envScene = new THREE.Scene();

		const skyMat = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: {
				topColor: { value: skyPalette.top.clone() },
				horizonColor: { value: skyPalette.horizon.clone() },
				coolColor: { value: skyPalette.cool.clone() },
				sunColor: { value: skyPalette.sun.clone() },
				sunAmount: { value: current.sunVisible },
				sunDir: { value: new THREE.Vector3().fromArray(current.sunDirection) },
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
				uniform float sunAmount;
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
					col += sunColor * sunDisk * sunAmount * .7;
					// Ground hemisphere: muted warm earth bounce
					if (dir.y < 0.0) col = mix(col, horizonColor * .22, (1. - smoothstep(-0.25, 0.0, dir.y)));
					gl_FragColor = vec4(col, 1.0);
				}
			`,
		});

		const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 24), skyMat);
		envScene.add(dome);

		const pmrem = new THREE.PMREMGenerator(gl);
		const envTarget = pmrem.fromScene(envScene, 0.025);
		scene.environment = envTarget.texture;

		pmrem.dispose();
		dome.geometry.dispose();
		skyMat.dispose();

		return () => {
			scene.environment = null;
			envTarget.dispose();
		};
	}, [gl, scene, environmentTime, latitude, longitude]);

	return null;
}

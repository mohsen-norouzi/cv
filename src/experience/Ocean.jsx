import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { SKY_COOL, SKY_HORIZON, SKY_SUN, SUN_DIRECTION } from "./constants";
import { IS_MOBILE } from "./device";
import { worldBrightness } from "./focusStore";
import {
	skyPalette,
	skyLightColor,
	skyLightDirection,
	updateSkyPalette,
} from "./skyPalette";
import { reducedMotion } from "./motion";

// Tileable, multi-scale capillary waves. This is a normal map, not a painted reflection.
function waveNormals() {
	const size = 256,
		pixels = new Uint8Array(size * size * 4);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			const u = (x / size) * Math.PI * 2,
				v = (y / size) * Math.PI * 2;
			const dx =
				0.1 * Math.cos(u * 9 + v * 3) +
				0.055 * Math.cos(u * 17 - v * 7) +
				0.025 * Math.sin(u * 29 + v * 11);
			const dy =
				0.16 * Math.cos(u * 3 + v * 12) +
				0.06 * Math.sin(u * 7 - v * 21) +
				0.025 * Math.cos(u * 11 + v * 31);
			const n = new THREE.Vector3(dx, dy, 1).normalize(),
				i = (y * size + x) * 4;
			pixels[i] = (n.x * 0.5 + 0.5) * 255;
			pixels[i + 1] = (n.y * 0.5 + 0.5) * 255;
			pixels[i + 2] = (n.z * 0.5 + 0.5) * 255;
			pixels[i + 3] = 255;
		}
	const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.generateMipmaps = true;
	texture.needsUpdate = true;
	return texture;
}

export default function Ocean() {
	const water = useMemo(() => {
		const surface = new Water(new THREE.PlaneGeometry(3000, 3000), {
			textureWidth: IS_MOBILE ? 512 : 1024,
			textureHeight: IS_MOBILE ? 512 : 1024,
			waterNormals: waveNormals(),
			sunDirection: SUN_DIRECTION,
			sunColor: "#ffdfb8",
			waterColor: "#597d86",
			distortionScale: 1.1,
			fog: true,
		});
		surface.rotation.x = -Math.PI / 2;
		surface.position.set(0, -0.85, -60);
		surface.material.uniforms.size.value = 2.4;
		surface.material.uniforms.worldBrightness = worldBrightness;
		surface.material.uniforms.coastCool = { value: new THREE.Color(SKY_COOL) };
		surface.material.uniforms.coastHorizon = {
			value: new THREE.Color(SKY_HORIZON),
		};
		surface.material.uniforms.coastSun = { value: new THREE.Color(SKY_SUN) };
		surface.material.uniforms.skySunDirection = {
			value: SUN_DIRECTION.clone(),
		};
		surface.material.uniforms.skySunAmount = { value: 1 };
		surface.material.fragmentShader = surface.material.fragmentShader
			.replace(
				"uniform float alpha;",
				"uniform float alpha; uniform vec3 coastCool; uniform vec3 coastHorizon; uniform vec3 coastSun; uniform float worldBrightness; uniform vec3 skySunDirection; uniform float skySunAmount;",
			)
			.replace("vec3( 1.5, 1.0, 1.5 )", "vec3( 0.5, 1.0, 0.7 )")
			.replace(
				"vec3 outgoingLight = albedo;",
				`
				vec3 horizonDir=normalize(worldPosition.xyz-eye);
				float az=max(dot(normalize(vec3(horizonDir.x,0.,horizonDir.z)),normalize(vec3(skySunDirection.x,0.,skySunDirection.z))),0.);
				float glow=pow(az,1.5);
				vec3 horizon=mix(coastCool,coastHorizon,glow);
				horizon=mix(horizon,coastSun,glow*.65*skySunAmount);

				vec3 outgoingLight=mix(albedo,horizon*worldBrightness,1.-exp(-distance*.0035));`,
			)
			.replace("#include <fog_fragment>", "");
		return surface;
	}, []);
	useFrame((_, delta) => {
		const sky = updateSkyPalette();
		const u = water.material.uniforms;
		u.sunDirection.value.copy(skyLightDirection);
		u.skySunDirection.value.fromArray(sky.sunDirection);
		u.skySunAmount.value = sky.sunVisible;
		u.coastCool.value.copy(skyPalette.cool);
		u.coastHorizon.value.copy(skyPalette.horizon);
		u.coastSun.value.copy(skyPalette.sun);
		water.material.uniforms.sunColor.value
			.copy(skyLightColor)
			.multiplyScalar(
				worldBrightness.value *
					(sky.sunVisible > 0.01
						? sky.sunVisible
						: sky.moonVisible * sky.moonFraction * 0.18),
			);
		water.material.uniforms.waterColor.value
			.copy(skyPalette.water)
			.multiplyScalar(worldBrightness.value);
		if (!reducedMotion())
			water.material.uniforms.time.value += Math.min(delta, 0.05) * 0.32;
	});
	useEffect(
		() => () => {
			water.geometry.dispose();
			water.material.uniforms.normalSampler.value.dispose();
			water.material.uniforms.mirrorSampler.value.dispose();
			water.material.dispose();
		},
		[water],
	);
	return <primitive object={water} />;
}

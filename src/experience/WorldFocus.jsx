import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import {
	skyPalette,
	skyLightColor,
	skyLightDirection,
	updateSkyPalette,
} from "./skyPalette";
import { getFocusAmount, worldBrightness } from "./focusStore";

export default function WorldFocus() {
	const { scene, gl } = useThree();
	const lastSky = useRef(null);
	const baseline = useRef(null);
	const lastFocus = useRef(null);
	const lastApplied = useRef(null);
	useLayoutEffect(() => {
		const lights = [],
			materials = new Set();
		scene.traverse((object) => {
			if (
				object.isLight &&
				object.name !== "Focus spotlight" &&
				object.name !== "Lighthouse sweep" &&
				object.name !== "Lantern highlight"
			)
				lights.push([object, object.intensity]);
			if (object.material)
				for (const material of Array.isArray(object.material)
					? object.material
					: [object.material])
					if (material.isMeshStandardMaterial) materials.add(material);
		});
		const overlay = document.querySelector(".portfolio");
		baseline.current = {
			overlay,
			overlayFocus: overlay?.style.getPropertyValue("--scene-focus") ?? "",
			lights,
			materials: [...materials].map((material) => ({
				material,
				lightMap: material.lightMapIntensity,
				emissive: material.emissiveIntensity,
			})),
			fog: scene.fog?.color.clone(),
			background: scene.background?.isColor ? scene.background.clone() : null,
		};
		return () => {
			for (const [light, intensity] of lights) light.intensity = intensity;
			for (const { material, lightMap, emissive } of baseline.current
				.materials) {
				material.lightMapIntensity = lightMap;
				material.emissiveIntensity = emissive;
			}
			if (scene.fog && baseline.current.fog)
				scene.fog.color.copy(baseline.current.fog);
			if (scene.background?.isColor && baseline.current.background)
				scene.background.copy(baseline.current.background);
			scene.environmentIntensity = 0.45;
			worldBrightness.value = 1;
			if (overlay) {
				if (baseline.current.overlayFocus)
					overlay.style.setProperty(
						"--scene-focus",
						baseline.current.overlayFocus,
					);
				else overlay.style.removeProperty("--scene-focus");
			}
			lastFocus.current = null;
			lastApplied.current = null;
		};
	}, [scene]);
	useFrame(() => {
		const sky = updateSkyPalette();
		const f = getFocusAmount(),
			brightness = 1 - f * (0.55 + 0.27 * sky.daylight);
		if (lastApplied.current === f && lastSky.current === sky) return;
		const skyChanged = lastSky.current !== sky;
		lastSky.current = sky;
		lastApplied.current = f;
		worldBrightness.value = brightness;
		const base = baseline.current;
		if (!base) return;
		const overlayFocus = f.toFixed(3);
		if (lastFocus.current !== overlayFocus) {
			base.overlay?.style.setProperty("--scene-focus", overlayFocus);
			lastFocus.current = overlayFocus;
		}
		const daylight = sky.daylight;
		const ambient = 0.2 + daylight * 0.8;
		for (const [light, intensity] of base.lights) {
			if (light.name === "Celestial key") {
				light.position.copy(skyLightDirection).multiplyScalar(85);
				light.color.copy(skyLightColor);
				const moonlight = sky.moonVisible * sky.moonFraction * 0.28;
				light.intensity =
					(sky.sunVisible > 0.01 ? intensity * sky.sunVisible : moonlight) *
					brightness;
			} else if (light.isPointLight) {
				light.intensity = intensity * (0.8 + 0.2 * daylight) * (1 - f * 0.5);
			} else light.intensity = intensity * ambient * brightness;
		}
		if (skyChanged) {
			gl.shadowMap.needsUpdate = true;
		}
		for (const { material, lightMap, emissive } of base.materials) {
			if (material.lightMap)
				material.lightMapIntensity =
					lightMap * brightness * (0.16 + daylight * 0.59);
			material.emissiveIntensity = emissive * (1 - f * 0.55);
		}
		scene.environmentIntensity = 0.45 * brightness * ambient;
		if (scene.fog && base.fog)
			scene.fog.color.copy(skyPalette.horizon).multiplyScalar(brightness);
		if (scene.background?.isColor && base.background)
			scene.background.copy(skyPalette.horizon).multiplyScalar(brightness);
	}, -0.5);
	return null;
}

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { getFocusAmount, worldBrightness } from "./focusStore";

export default function WorldFocus() {
	const { scene } = useThree();
	const baseline = useRef(null);
	const lastFocus = useRef(null);
	const lastApplied = useRef(null);
	useLayoutEffect(() => {
		const lights = [],
			materials = new Set();
		scene.traverse((object) => {
			if (object.isLight && object.name !== "Focus spotlight")
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
		const f = getFocusAmount(),
			brightness = 1 - f * 0.82;
		if (lastApplied.current === f) return;
		lastApplied.current = f;
		worldBrightness.value = brightness;
		const base = baseline.current;
		if (!base) return;
		const overlayFocus = f.toFixed(3);
		if (lastFocus.current !== overlayFocus) {
			base.overlay?.style.setProperty("--scene-focus", overlayFocus);
			lastFocus.current = overlayFocus;
		}
		for (const [light, intensity] of base.lights)
			light.intensity = intensity * brightness;
		for (const { material, lightMap, emissive } of base.materials) {
			if (material.lightMap) material.lightMapIntensity = lightMap * brightness;
			material.emissiveIntensity = emissive * (1 - f * 0.55);
		}
		scene.environmentIntensity = 0.45 * brightness;
		if (scene.fog && base.fog)
			scene.fog.color.copy(base.fog).multiplyScalar(brightness);
		if (scene.background?.isColor && base.background)
			scene.background.copy(base.background).multiplyScalar(brightness);
	}, -0.5);
	return null;
}

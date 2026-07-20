import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { FOG_COLOR, FOG_DENSITY } from "./constants";
import { IS_MOBILE } from "./device";

export default function Atmosphere() {
	const { scene, gl } = useThree();

	useLayoutEffect(() => {
		const fogColor = new THREE.Color(FOG_COLOR);
		scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
		scene.background = fogColor;
		gl.setClearColor(fogColor);
		gl.shadowMap.enabled = true;
		// VSM looks best but costs ~2×; PCF is far safer on phones
		gl.shadowMap.type = IS_MOBILE
			? THREE.PCFShadowMap
			: THREE.VSMShadowMap;

		return () => {
			scene.fog = null;
			scene.background = null;
		};
	}, [scene, gl]);

	return null;
}

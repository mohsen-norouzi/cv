import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { FOG_COLOR, FOG_DENSITY } from "./constants";

export default function Atmosphere() {
	const { scene, gl } = useThree();

	useLayoutEffect(() => {
		const fogColor = new THREE.Color(FOG_COLOR);
		scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
		scene.background = fogColor;
		gl.setClearColor(fogColor);
		gl.shadowMap.enabled = true;
		// VSM = real blurred soft shadows (PCFSoft is deprecated in three r185)
		gl.shadowMap.type = THREE.VSMShadowMap;

		return () => {
			scene.fog = null;
			scene.background = null;
		};
	}, [scene, gl]);

	return null;
}

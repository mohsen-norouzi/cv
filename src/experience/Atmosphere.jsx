import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { FOG_COLOR } from "./constants";

export default function Atmosphere() {
	const { scene, gl } = useThree();

	useLayoutEffect(() => {
		const fogColor = new THREE.Color(FOG_COLOR);
		// Exp2 fades smoothly — no hard fog “steps” on large flat faces
		scene.fog = new THREE.FogExp2(FOG_COLOR, 0.012);
		scene.background = fogColor;
		gl.setClearColor(fogColor);
		gl.shadowMap.enabled = true;
		gl.shadowMap.type = THREE.PCFSoftShadowMap;

		return () => {
			scene.fog = null;
			scene.background = null;
		};
	}, [scene, gl]);

	return null;
}

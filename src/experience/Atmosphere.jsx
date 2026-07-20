import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { FOG_COLOR, FOG_DENSITY } from "./constants";
import { IS_MOBILE } from "./device";

export default function Atmosphere() {
	const { scene, gl } = useThree();

	useLayoutEffect(() => {
		const fogColor = new THREE.Color(FOG_COLOR);
		const density = IS_MOBILE ? FOG_DENSITY * 0.85 : FOG_DENSITY;
		scene.fog = new THREE.FogExp2(FOG_COLOR, density);
		scene.background = fogColor.clone();
		// Match sky so portrait tops don’t flash black behind the dome
		if (IS_MOBILE) scene.background.offsetHSL(0.02, 0.05, -0.08);
		gl.setClearColor(scene.background);
		gl.setClearAlpha(1);
		gl.shadowMap.enabled = !IS_MOBILE;
		if (!IS_MOBILE) {
			gl.shadowMap.type = THREE.VSMShadowMap;
		}

		return () => {
			scene.fog = null;
			scene.background = null;
		};
	}, [scene, gl]);

	return null;
}

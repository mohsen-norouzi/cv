import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
	CAM_FOV,
	CAM_START,
	CAM_TARGET,
	GIRL_LOOK_AT,
	GIRL_VIEW_POS,
} from "./constants";
import { getScrollProgress } from "./scrollStore";

const PARALLAX_X = 0.55;
const PARALLAX_Y = 0.32;
const LOOK_X = 0.18;
const LOOK_Y = 0.1;
const DAMP = 3.5;

export default function CameraRig() {
	const { camera } = useThree();
	const offset = useRef(new THREE.Vector2());
	const look = useRef(new THREE.Vector3());
	const pos = useRef(new THREE.Vector3());

	useLayoutEffect(() => {
		camera.position.copy(CAM_START);
		camera.lookAt(CAM_TARGET);
		camera.fov = CAM_FOV;
		camera.updateProjectionMatrix();
	}, [camera]);

	useFrame(({ pointer }, delta) => {
		const p = getScrollProgress();

		// Straight, intentional move — no curvy Catmull path
		pos.current.lerpVectors(CAM_START, GIRL_VIEW_POS, p);
		look.current.lerpVectors(CAM_TARGET, GIRL_LOOK_AT, p);

		// Mouse parallax only on the hero shot
		const para = p < 0.001 ? 1 : 0;
		offset.current.x = THREE.MathUtils.damp(
			offset.current.x,
			pointer.x * para,
			DAMP,
			delta,
		);
		offset.current.y = THREE.MathUtils.damp(
			offset.current.y,
			pointer.y * para,
			DAMP,
			delta,
		);

		camera.position.set(
			pos.current.x + offset.current.x * PARALLAX_X,
			pos.current.y + offset.current.y * PARALLAX_Y,
			pos.current.z,
		);

		look.current.x += offset.current.x * LOOK_X;
		look.current.y += offset.current.y * LOOK_Y;
		camera.lookAt(look.current);
	});

	return null;
}

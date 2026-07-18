import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { CAM_FOV, CAM_START, CAM_TARGET } from "./constants";

/** How far the camera drifts with the cursor (world units at pointer = ±1) */
const PARALLAX_X = 0.55;
const PARALLAX_Y = 0.32;
/** Look-at drifts less so the scene feels layered */
const LOOK_X = 0.18;
const LOOK_Y = 0.1;
/** Higher = snappier follow */
const DAMP = 3.5;

export default function CameraRig() {
	const { camera } = useThree();
	const offset = useRef(new THREE.Vector2());
	const look = useRef(new THREE.Vector3());

	useLayoutEffect(() => {
		camera.position.copy(CAM_START);
		camera.lookAt(CAM_TARGET);
		camera.fov = CAM_FOV;
		camera.updateProjectionMatrix();
	}, [camera]);

	useFrame(({ pointer }, delta) => {
		offset.current.x = THREE.MathUtils.damp(
			offset.current.x,
			pointer.x,
			DAMP,
			delta,
		);
		offset.current.y = THREE.MathUtils.damp(
			offset.current.y,
			pointer.y,
			DAMP,
			delta,
		);

		const ox = offset.current.x;
		const oy = offset.current.y;

		camera.position.set(
			CAM_START.x + ox * PARALLAX_X,
			CAM_START.y + oy * PARALLAX_Y,
			CAM_START.z,
		);

		look.current.set(
			CAM_TARGET.x + ox * LOOK_X,
			CAM_TARGET.y + oy * LOOK_Y,
			CAM_TARGET.z,
		);
		camera.lookAt(look.current);
	});

	return null;
}

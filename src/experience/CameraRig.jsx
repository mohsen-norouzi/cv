import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { CAM_FOV, CAM_START, CAM_TARGET } from "./constants";

export default function CameraRig() {
	const { camera } = useThree();

	useLayoutEffect(() => {
		camera.position.copy(CAM_START);
		camera.lookAt(CAM_TARGET);
		camera.fov = CAM_FOV;
		camera.updateProjectionMatrix();
	}, [camera]);

	return null;
}

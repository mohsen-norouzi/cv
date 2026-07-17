import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { CAM_TARGET } from "./constants";

export default function CameraRig() {
	const { camera } = useThree();

	useLayoutEffect(() => {
		camera.position.set(-1.5, 5.8, 33);
		camera.lookAt(CAM_TARGET);
		camera.updateProjectionMatrix();
	}, [camera]);

	return null;
}

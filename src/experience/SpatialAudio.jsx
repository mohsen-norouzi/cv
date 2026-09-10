import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import { environmentAudio } from "./environmentAudio";
import { useWalking } from "./walkStore";

export default function SpatialAudio() {
	const walking = useWalking(),
		elapsed = useRef(0);
	const vectors = useMemo(
		() => ({ forward: new Vector3(), up: new Vector3() }),
		[],
	);
	useFrame(({ camera }, delta) => {
		if (!environmentAudio.active) return;
		elapsed.current += delta;
		if (elapsed.current < 0.1) return;
		elapsed.current = 0;
		camera.getWorldDirection(vectors.forward);
		vectors.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
		environmentAudio.setPose({
			position: camera.position.toArray(),
			forward: vectors.forward.toArray(),
			up: vectors.up.toArray(),
			walking,
		});
	}, -0.9);
	return null;
}

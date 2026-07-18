import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
	LIGHTHOUSE_INTENSITY,
	LIGHTHOUSE_LAMP,
	SUN_POSITION,
} from "./constants";
import { flicker } from "./flicker";
import StreetLamps from "./StreetLamps";

const LH_FILL_RATIO = 2.2;

export default function Lights() {
	const lighthouse = useRef(null);

	useFrame(({ clock }) => {
		if (lighthouse.current) {
			lighthouse.current.intensity =
				LIGHTHOUSE_INTENSITY * LH_FILL_RATIO * flicker(clock.elapsedTime, 1.4);
		}
	});

	return (
		<>
			<ambientLight intensity={0.16} color="#c4b0a0" />
			<hemisphereLight args={["#f0c49a", "#3d4a5c", 0.55]} />
			<directionalLight
				position={SUN_POSITION}
				intensity={2.1}
				color="#ffb06a"
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-near={1}
				shadow-camera-far={160}
				shadow-camera-left={-70}
				shadow-camera-right={70}
				shadow-camera-top={70}
				shadow-camera-bottom={-70}
				shadow-bias={-0.00025}
			/>
			<directionalLight
				position={[50, 18, 30]}
				intensity={0.55}
				color="#6e84a8"
			/>
			<directionalLight
				position={[-20, 8, 40]}
				intensity={0.25}
				color="#ffd2a8"
			/>
			<StreetLamps />
			<pointLight
				ref={lighthouse}
				position={LIGHTHOUSE_LAMP}
				intensity={LIGHTHOUSE_INTENSITY * LH_FILL_RATIO}
				color="#ffb14a"
				distance={28}
				decay={2}
			/>
		</>
	);
}

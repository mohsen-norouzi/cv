import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BIG_LAMP, BIG_LAMP_INTENSITY, SUN_POSITION } from "./constants";
import { flicker } from "./flicker";

const BIG_FILL_RATIO = 1.5;

export default function Lights() {
	const big = useRef(null);

	useFrame(({ clock }) => {
		if (big.current) {
			big.current.intensity =
				BIG_LAMP_INTENSITY * BIG_FILL_RATIO * flicker(clock.elapsedTime, 0.3);
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
			<pointLight
				ref={big}
				position={BIG_LAMP}
				intensity={BIG_LAMP_INTENSITY * BIG_FILL_RATIO}
				color="#ffb56a"
				distance={12}
				decay={2}
			/>
		</>
	);
}

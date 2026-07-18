import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { SUN_POSITION } from "./constants";
import { flicker } from "./flicker";

const BIG_FILL_RATIO = 1.5;

export default function Lights({ lamps }) {
	const big = useRef(null);
	const lampsRef = useRef(lamps);
	lampsRef.current = lamps;

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const { big: bigI, bigPos } = lampsRef.current;

		if (big.current) {
			big.current.intensity = bigI * BIG_FILL_RATIO * flicker(t, 0.3);
			big.current.position.set(bigPos.x, bigPos.y, bigPos.z);
		}
	});

	return (
		<>
			{/* Dimmer ambient so warm key + cool fill read like golden hour */}
			<ambientLight intensity={0.16} color="#c4b0a0" />
			<hemisphereLight args={["#f0c49a", "#3d4a5c", 0.55]} />
			{/* Warm sunset key — from the left like the reference */}
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
			{/* Cool blue fill on the shadow side */}
			<directionalLight
				position={[50, 18, 30]}
				intensity={0.55}
				color="#6e84a8"
			/>
			{/* Soft warm bounce */}
			<directionalLight
				position={[-20, 8, 40]}
				intensity={0.25}
				color="#ffd2a8"
			/>
			<pointLight
				ref={big}
				position={[lamps.bigPos.x, lamps.bigPos.y, lamps.bigPos.z]}
				intensity={lamps.big * BIG_FILL_RATIO}
				color="#ffb56a"
				distance={12}
				decay={2}
			/>
		</>
	);
}

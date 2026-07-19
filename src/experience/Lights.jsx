import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
	AMBIENT_COLOR,
	AMBIENT_INT,
	FILL_COLOR,
	FILL_INT,
	HEMI_GROUND,
	HEMI_INT,
	HEMI_SKY,
	KEY_COLOR,
	KEY_INT,
	LIGHTHOUSE_INTENSITY,
	LIGHTHOUSE_LAMP,
	RIM_COLOR,
	RIM_INT,
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
			<ambientLight intensity={AMBIENT_INT} color={AMBIENT_COLOR} />
			<hemisphereLight
				skyColor={HEMI_SKY}
				groundColor={HEMI_GROUND}
				intensity={HEMI_INT}
			/>
			{/* High-res sun shadow — baked after a few frames via ShadowBake */}
			<directionalLight
				position={SUN_POSITION}
				intensity={KEY_INT}
				color={KEY_COLOR}
				castShadow
				shadow-mapSize={[4096, 4096]}
				shadow-camera-near={2}
				shadow-camera-far={130}
				shadow-camera-left={-40}
				shadow-camera-right={48}
				shadow-camera-top={44}
				shadow-camera-bottom={-30}
				shadow-bias={-0.00015}
				shadow-normalBias={0.035}
			/>
			<directionalLight
				position={[50, 18, 30]}
				intensity={FILL_INT}
				color={FILL_COLOR}
			/>
			<directionalLight
				position={[-20, 8, 40]}
				intensity={RIM_INT}
				color={RIM_COLOR}
			/>
			<StreetLamps />
			<pointLight
				ref={lighthouse}
				position={LIGHTHOUSE_LAMP}
				intensity={LIGHTHOUSE_INTENSITY * LH_FILL_RATIO}
				color="#ffb14a"
				distance={24}
				decay={2}
			/>
		</>
	);
}

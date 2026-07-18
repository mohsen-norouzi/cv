import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BEACON_TIP, PORTAL_GLOW } from "./constants";
import { breathe, flicker } from "./flicker";

export default function Lights() {
	const portalLight = useRef(null);
	const beaconLight = useRef(null);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		if (portalLight.current) {
			portalLight.current.intensity = 70 * breathe(t, 0.4);
		}
		if (beaconLight.current) {
			beaconLight.current.intensity = 90 * flicker(t, 1.7);
		}
	});

	return (
		<>
			<ambientLight intensity={0.2} color="#e4d8c8" />
			<hemisphereLight args={["#ece0d0", "#7c7268", 0.5]} />
			{/* Low sun behind the portal — the warm backlight of the scene */}
			<directionalLight
				position={[14, 10, -60]}
				intensity={2}
				color="#ffd9a4"
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-camera-near={1}
				shadow-camera-far={120}
				shadow-camera-left={-40}
				shadow-camera-right={40}
				shadow-camera-top={40}
				shadow-camera-bottom={-40}
				shadow-bias={-0.0002}
			/>
			{/* Raking front-left fill so camera-facing facets break into planes */}
			<directionalLight
				position={[-35, 9, 14]}
				intensity={0.5}
				color="#e8dccc"
			/>
			<pointLight
				ref={portalLight}
				position={PORTAL_GLOW}
				intensity={70}
				color="#ffb14a"
				distance={28}
				decay={2}
			/>
			<pointLight
				ref={beaconLight}
				position={BEACON_TIP}
				intensity={90}
				color="#ffe6a0"
				distance={22}
				decay={2}
			/>
		</>
	);
}

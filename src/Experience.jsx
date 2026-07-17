import { SoftShadows } from "@react-three/drei";
import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import { BEACON_TIP, PORTAL_GLOW } from "./experience/constants";
import Lights from "./experience/Lights";
import Mist from "./experience/Mist";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import StarGlow from "./experience/StarGlow";

export default function Experience() {
	return (
		<>
			<SoftShadows size={18} samples={12} focus={0.85} />
			<Atmosphere />
			<CameraRig />
			<Lights />
			<Mountain />
			<Mist />
			<StarGlow position={BEACON_TIP} scale={4.2} opacity={0.95} />
			<StarGlow position={PORTAL_GLOW} scale={2.4} opacity={0.45} />
			<PostFX />
		</>
	);
}

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
			{/* drei's SoftShadows is broken with three r185 (its PCSS shader
			    uses the removed unpackRGBAToDepth) and intermittently kills
			    compilation of every standard material in the scene */}
			<Atmosphere />
			<CameraRig />
			<Lights />
			<Mountain />
			<Mist />
			<StarGlow
				position={BEACON_TIP}
				scale={4.2}
				opacity={0.95}
				seed={1.2}
				spin={0.12}
			/>
			<StarGlow
				position={PORTAL_GLOW}
				scale={2.4}
				opacity={0.45}
				seed={0.3}
				spin={0.05}
			/>
			<PostFX />
		</>
	);
}

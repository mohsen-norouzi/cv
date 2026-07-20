import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import { IS_MOBILE } from "./experience/device";
import EnvLight from "./experience/EnvLight";
import Lights from "./experience/Lights";
import Mist from "./experience/Mist";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import ShadowBake from "./experience/ShadowBake";
import SkyDome from "./experience/SkyDome";

/**
 * Mobile: Lambert materials + no IBL/post (Android PBR was pure black).
 * Soft fill lights only — SceneFocus still drives the main key.
 */
export default function Experience() {
	return (
		<>
			<Atmosphere />
			<SkyDome />
			{!IS_MOBILE && <EnvLight intensity={0.45} />}
			<CameraRig />
			{IS_MOBILE && (
				<>
					<ambientLight intensity={0.55} color="#f0e0d0" />
					<hemisphereLight
						skyColor="#f6d4ac"
						groundColor="#6a7a90"
						intensity={0.7}
					/>
				</>
			)}
			<Lights />
			<Mountain />
			{!IS_MOBILE && <ShadowBake frames={6} />}
			{!IS_MOBILE && <Mist />}
			{!IS_MOBILE && <PostFX />}
		</>
	);
}

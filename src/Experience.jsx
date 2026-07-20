import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import EnvLight from "./experience/EnvLight";
import Lights from "./experience/Lights";
import Mist from "./experience/Mist";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import ShadowBake from "./experience/ShadowBake";
import SkyDome from "./experience/SkyDome";

export default function Experience() {
	return (
		<>
			<Atmosphere />
			<SkyDome />
			<EnvLight intensity={0.45} />
			<CameraRig />
			<Lights />
			<Mountain />
			<ShadowBake frames={6} />
			<Mist />
			<PostFX />
		</>
	);
}

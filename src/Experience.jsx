import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import Lights from "./experience/Lights";
import Mist from "./experience/Mist";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import SkyDome from "./experience/SkyDome";

export default function Experience() {
	return (
		<>
			<Atmosphere />
			<SkyDome />
			<CameraRig />
			<Lights />
			<Mountain />
			<Mist />
			<PostFX />
		</>
	);
}

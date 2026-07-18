import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import Lights from "./experience/Lights";
import Mist from "./experience/Mist";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import SkyDome from "./experience/SkyDome";
import { Perf } from "r3f-perf";

export default function Experience() {
	return (
		<>
		<Perf />
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

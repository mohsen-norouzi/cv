import { Perf } from "r3f-perf";
import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import Lights from "./experience/Lights";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import ProjectLabels from "./experience/ProjectLabels";
import SkyDome from "./experience/SkyDome";

export default function Experience() {
	return (
		<>
			<Perf />
			<Atmosphere />
			<SkyDome />
			<CameraRig />
			<Lights />
			<Mountain />
			<ProjectLabels />
			<PostFX />
		</>
	);
}

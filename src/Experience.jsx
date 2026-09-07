import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import CoastalWorld from "./experience/CoastalWorld";
import CoastalMist from "./experience/CoastalMist";
import Ocean from "./experience/Ocean";
import EnvLight from "./experience/EnvLight";
import SkyDome from "./experience/SkyDome";
import ShadowBake from "./experience/ShadowBake";
import PostFX from "./experience/PostFX";
import TourFocus from "./experience/TourFocus";
import ProjectLabels from "./experience/ProjectLabels";
import { IS_MOBILE } from "./experience/device";

export default function Experience() {
	return (
		<>
			<Atmosphere />
			<SkyDome />
			<CameraRig />
			<EnvLight intensity={0.38} />
			<ambientLight color="#c8d3e4" intensity={0.14} />
			<hemisphereLight args={["#d7dfef", "#666957", 0.65]} />
			<directionalLight
				position={[-45, 23, 25]}
				intensity={3.2}
				color="#ffdbab"
				castShadow={!IS_MOBILE}
				shadow-mapSize={[4096, 4096]}
				shadow-camera-left={-65}
				shadow-camera-right={65}
				shadow-camera-top={65}
				shadow-camera-bottom={-65}
				shadow-camera-far={160}
				shadow-bias={-0.00015}
				shadow-normalBias={0.12}
			/>
			<directionalLight
				position={[35, 18, -25]}
				intensity={0.65}
				color="#a4bce3"
			/>
			<Ocean />
			<CoastalWorld />
			<CoastalMist />
			<ProjectLabels />
			<TourFocus />
			{!IS_MOBILE && <ShadowBake frames={8} />}
			{!IS_MOBILE && <PostFX />}
		</>
	);
}

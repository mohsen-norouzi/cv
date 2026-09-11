import SpatialAudio from "./experience/SpatialAudio";
import { lazy } from "react";
import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import CoastalMist from "./experience/CoastalMist";
import CoastalWorld from "./experience/CoastalWorld";
import { IS_MOBILE } from "./experience/device";
import EnvLight from "./experience/EnvLight";
import Ocean from "./experience/Ocean";
import ProjectLabels from "./experience/ProjectLabels";
import RenderLifecycle from "./experience/RenderLifecycle";
import SceneFocus from "./experience/SceneFocus";
import ShadowBake from "./experience/ShadowBake";
import SkyDome from "./experience/SkyDome";
import TourFocus from "./experience/TourFocus";
import WalkRig from "./experience/WalkRig";
import WorldFocus from "./experience/WorldFocus";
import TemplateBoard from "./experience/TemplateBoard";

const PostFX = lazy(() => import("./experience/PostFX"));

export default function Experience() {
	return (
		<>
			<RenderLifecycle />
			<Atmosphere />
			<SkyDome />
			<CameraRig />
			<WalkRig />
			<SpatialAudio />
			<EnvLight />
			<ambientLight color="#c8d3e4" intensity={0.09} />
			<hemisphereLight args={["#d7dfef", "#666957", 0.35]} />
			<directionalLight
				name="Celestial key"
				position={[-35, 24, 75]}
				intensity={2.5}
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
				intensity={0.25}
				color="#a4bce3"
			/>
			<Ocean />
			<CoastalWorld />
			<TemplateBoard />
			<CoastalMist />
			<ProjectLabels />
			<TourFocus />
			<SceneFocus />
			<WorldFocus />
			{!IS_MOBILE && <ShadowBake frames={8} />}
			{!IS_MOBILE && <PostFX />}
		</>
	);
}

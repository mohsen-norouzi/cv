import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import FooterBar from "./components/FooterBar";
import Navbar from "./components/Navbar";
import NextProject from "./components/NextProject";
import ProjectInfo from "./components/ProjectInfo";
import ProjectRail from "./components/ProjectRail";
import { projects } from "./data/projects";
import Experience from "./Experience";
import { useProjectScroll } from "./hooks/useProjectScroll";
import "./App.css";

function App() {
	const { index, goTo, next } = useProjectScroll(projects.length);
	const project = projects[index];
	const nextProject = projects[(index + 1) % projects.length];

	return (
		<div className="app">
			<Canvas
				className="app__canvas"
				style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
				shadows
				camera={{ position: [3, 2, 5], fov: 45 }}
				gl={{ shadowMapType: THREE.PCFSoftShadowMap }}
			>
				<Experience project={project} />
			</Canvas>

			<div className="hud">
				<div className="hud__stage-glow" aria-hidden="true" />

				<Navbar />

				<ProjectInfo project={project} index={index} total={projects.length} />

				<NextProject key={nextProject.id} project={nextProject} onNext={next} />

				<ProjectRail index={index} total={projects.length} onSelect={goTo} />

				<FooterBar />
			</div>
		</div>
	);
}

export default App;

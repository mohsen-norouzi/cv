import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import "./App.css";
import Experience from "./Experience";

function App() {
	return (
		<Canvas
			shadows
			camera={{ position: [0, 0, 10] }}
			gl={{ shadowMapType: THREE.PCFSoftShadowMap }}
		>
			<Experience />
		</Canvas>
	);
}

export default App;

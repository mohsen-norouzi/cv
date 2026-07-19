import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import HeroContent from "./components/HeroContent";
import Navbar from "./components/Navbar";
import ScrollCue from "./components/ScrollCue";
import SectionCaption from "./components/SectionCaption";
import Experience from "./Experience";
import ScrollStealer from "./experience/ScrollStealer";

function App() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-[#d7c4b2]">
			<ScrollStealer />
			<Canvas
				className="absolute inset-0 h-full w-full"
				style={{ width: "100%", height: "100%" }}
				shadows
				dpr={[1, 1.5]}
				camera={{
					position: [2.5, 3.8, 34],
					fov: 42,
					near: 0.1,
					far: 250,
				}}
				gl={{
					antialias: true,
					toneMapping: THREE.NoToneMapping,
					outputColorSpace: THREE.SRGBColorSpace,
					powerPreference: "high-performance",
					stencil: false,
				}}
			>
				<Suspense fallback={null}>
					<Experience />
				</Suspense>
			</Canvas>

			<div className="pointer-events-none absolute inset-0 z-10">
				{/* Mount point for 3D-projected project labels */}
				<div id="project-labels" className="absolute inset-0" />
				{/* Top readability for nav */}
				<div
					aria-hidden
					className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/30 to-transparent"
				/>
				<div className="pointer-events-auto">
					<Navbar />
				</div>
				<HeroContent />
				<SectionCaption />
				<ScrollCue />
			</div>
		</div>
	);
}

export default App;

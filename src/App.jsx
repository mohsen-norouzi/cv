import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import HeroContent from "./components/HeroContent";
import MusicToggle from "./components/MusicToggle";
import Navbar from "./components/Navbar";
import SceneLoader from "./components/SceneLoader";
import ScrollCue from "./components/ScrollCue";
import ScrollPath from "./components/ScrollPath";
import SectionCaption from "./components/SectionCaption";
import Experience from "./Experience";
import { DPR_RANGE, IS_MOBILE } from "./experience/device";
import ScrollStealer from "./experience/ScrollStealer";

function App() {
	return (
			<div className="relative h-full w-full overflow-hidden bg-[#e2cbb0]">
			<ScrollStealer />
			<Canvas
				className="absolute inset-0 h-full w-full"
				style={{ width: "100%", height: "100%" }}
				shadows={!IS_MOBILE}
				dpr={DPR_RANGE}
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
					powerPreference: IS_MOBILE ? "default" : "high-performance",
					stencil: false,
				}}
			>
				<Suspense fallback={null}>
					<Experience />
				</Suspense>
			</Canvas>

			<SceneLoader />

			<div className="pointer-events-none absolute inset-0 z-10">
				{/* Soft edge fades — long falloffs, no hard bands */}
				<div
					aria-hidden
					className="page-edge-fade pointer-events-none absolute inset-0"
				/>
				<div className="pointer-events-auto">
					<Navbar />
				</div>
				<HeroContent />
				<SectionCaption />
				<ScrollPath />
				<ScrollCue />
				<MusicToggle />
			</div>
		</div>
	);
}

export default App;

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import HeroContent from "./components/HeroContent";
import Navbar from "./components/Navbar";
import ScrollIndicator from "./components/ScrollIndicator";
import Experience from "./Experience";
import ScrollStealer from "./experience/ScrollStealer";

function App() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-[#e0c4a4]">
			<ScrollStealer />
			<Canvas
				className="absolute inset-0 h-full w-full"
				style={{ width: "100%", height: "100%" }}
				shadows
				dpr={[1, 2]}
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
				}}
			>
				<Suspense fallback={null}>
					<Experience />
				</Suspense>
			</Canvas>

			<div className="pointer-events-none absolute inset-0 z-10">
				<div className="pointer-events-auto">
					<Navbar />
				</div>
				<HeroContent />
				<ScrollIndicator />
			</div>
		</div>
	);
}

export default App;

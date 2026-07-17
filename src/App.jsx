import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import HeroContent from "./components/HeroContent";
import Navbar from "./components/Navbar";
import ScrollIndicator from "./components/ScrollIndicator";
import Experience from "./Experience";

function App() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-[#6f6a62]">
			<Canvas
				className="absolute inset-0 h-full w-full"
				style={{ width: "100%", height: "100%" }}
				shadows
				dpr={[1, 2]}
				camera={{ position: [-1.5, 5.8, 33], fov: 36, near: 0.1, far: 250 }}
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
				<ScrollIndicator active="02" />
			</div>
		</div>
	);
}

export default App;

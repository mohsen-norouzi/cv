import { useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import Experience from "./Experience";
import { DPR_RANGE, IS_MOBILE } from "./experience/device";
import { setLoadProgress } from "./experience/loadStore";

function LoadProgressBridge() {
	const { progress, errors } = useProgress();
	useEffect(
		() => setLoadProgress(progress, errors.length),
		[progress, errors.length],
	);
	return null;
}

export default function SceneCanvas() {
	return (
		<>
			<LoadProgressBridge />
			<Canvas
				fallback={<span>Interactive 3D coastal landscape</span>}
				className="absolute inset-0 h-full w-full"
				style={{ width: "100%", height: "100%" }}
				shadows={!IS_MOBILE}
				dpr={DPR_RANGE}
				camera={{
					position: [2.5, 3.8, 34],
					fov: 42,
					near: 0.1,
					far: 3000,
				}}
				gl={{
					// Desktop edges are already antialiased by the 4× MSAA composer.
					antialias: IS_MOBILE,
					toneMapping: IS_MOBILE
						? THREE.ACESFilmicToneMapping
						: THREE.NoToneMapping,
					outputColorSpace: THREE.SRGBColorSpace,
					powerPreference: IS_MOBILE ? "default" : "high-performance",
					stencil: false,
				}}
			>
				<Suspense fallback={null}>
					<Experience />
				</Suspense>
			</Canvas>
		</>
	);
}

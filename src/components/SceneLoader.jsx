import { useProgress } from "@react-three/drei";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";

/**
 * Full-screen loader until the GLB is fetched and Mountain has finished setup.
 * Dismisses once — never covers the UI again if useProgress flickers.
 */
export default function SceneLoader() {
	const { progress, active } = useProgress();
	const sceneReady = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	const [fadeOut, setFadeOut] = useState(false);
	const [gone, setGone] = useState(false);

	const ready = sceneReady && !active && progress >= 100;

	useEffect(() => {
		if (gone || fadeOut || !ready) return;
		setFadeOut(true);
		const hide = setTimeout(() => setGone(true), 700);
		return () => clearTimeout(hide);
	}, [ready, fadeOut, gone]);

	if (gone) return null;

	const pct = Math.min(100, Math.round(progress));

	return (
		<div
			className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#c9b8a8]"
			style={{
				opacity: fadeOut ? 0 : 1,
				transition: "opacity 0.65s ease",
				pointerEvents: fadeOut ? "none" : "auto",
			}}
			aria-busy={!ready}
			aria-live="polite"
		>
			<p className="font-display text-[13px] font-semibold tracking-[0.28em] text-[#2a2a2a]/uppercase">
				Loading
			</p>
			<div className="mt-5 h-px w-40 overflow-hidden bg-[#2a2a2a]/15">
				<div
					className="h-full bg-[#2a2a2a]/70 transition-[width] duration-200 ease-out"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<p className="font-ui mt-3 text-[11px] tracking-[0.18em] text-[#2a2a2a]/55">
				{pct}%
			</p>
		</div>
	);
}

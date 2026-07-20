import { useProgress } from "@react-three/drei";
import { useState, useSyncExternalStore } from "react";
import { enableMusic } from "../experience/audioStore";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";

/**
 * Loads the world, then waits for a click — that gesture starts ambient audio
 * (browsers block sound without one) and enters the scene.
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
	const [entering, setEntering] = useState(false);

	const assetsReady = sceneReady && !active && progress >= 100;
	const pct = Math.min(100, Math.round(progress));

	const enter = async () => {
		if (!assetsReady || entering || fadeOut || gone) return;
		setEntering(true);
		await enableMusic();
		setFadeOut(true);
		window.setTimeout(() => setGone(true), 700);
	};

	if (gone) return null;

	return (
		<button
			type="button"
			onClick={() => void enter()}
			disabled={!assetsReady || entering}
			className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#c9b8a8] text-center"
			style={{
				opacity: fadeOut ? 0 : 1,
				transition: "opacity 0.65s ease",
				pointerEvents: fadeOut ? "none" : "auto",
				cursor: assetsReady ? "pointer" : "wait",
			}}
			aria-busy={!assetsReady}
			aria-live="polite"
		>
			{!assetsReady ? (
				<>
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
				</>
			) : (
				<>
					<p className="font-display text-[13px] font-semibold tracking-[0.28em] text-[#2a2a2a]/uppercase">
						Ready
					</p>
					<p className="font-music mt-6 text-[2rem] text-[#2a2a2a] md:text-[2.35rem]">
						Enter
					</p>
					<p className="font-ui mt-3 text-[11px] tracking-[0.18em] text-[#2a2a2a]/50 uppercase">
						Click to begin
					</p>
				</>
			)}
		</button>
	);
}

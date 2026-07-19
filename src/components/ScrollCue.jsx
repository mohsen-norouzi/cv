import { useSyncExternalStore } from "react";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";
import { getScrollProgress, subscribeScroll } from "../experience/scrollStore";

export default function ScrollCue() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getScrollProgress,
		getScrollProgress,
	);
	const sceneReady = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);

	const opacity = sceneReady ? Math.max(0, 1 - progress * 1.8) : 0;
	const hidden = opacity < 0.02;

	return (
		<div
			className="absolute bottom-8 left-8 z-30 flex items-center gap-3 md:bottom-10 md:left-12 lg:left-16"
			style={{
				opacity,
				visibility: hidden ? "hidden" : "visible",
				transition: "opacity 0.4s ease",
			}}
			aria-hidden={hidden}
		>
			{/* Soft scrim so the cue stays readable on bright fog */}
			<div
				aria-hidden
				className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 bg-gradient-to-r from-black/55 via-black/25 to-transparent blur-sm"
			/>
			<svg
				width="18"
				height="28"
				viewBox="0 0 18 28"
				fill="none"
				aria-hidden
				className="text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
			>
				<rect
					x="1"
					y="1"
					width="16"
					height="26"
					rx="8"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<circle
					cx="9"
					cy="8"
					r="2"
					fill="currentColor"
					className="animate-pulse"
				/>
			</svg>
			<span className="font-ui text-[10px] font-medium tracking-[0.28em] text-white/80 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
				Scroll to explore
			</span>
		</div>
	);
}

import { useSyncExternalStore } from "react";
import { getScrollProgress, subscribeScroll } from "../experience/scrollStore";

export default function ScrollCue() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getScrollProgress,
		getScrollProgress,
	);
	const opacity = Math.max(0, 1 - progress * 1.8);
	const hidden = opacity < 0.02;

	return (
		<div
			className="absolute bottom-8 left-8 z-20 flex items-center gap-3 md:bottom-10 md:left-12 lg:left-16"
			style={{
				opacity,
				visibility: hidden ? "hidden" : "visible",
			}}
			aria-hidden={hidden}
		>
			<svg
				width="18"
				height="28"
				viewBox="0 0 18 28"
				fill="none"
				aria-hidden
				className="text-white/70"
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
			<span className="font-ui text-[10px] font-medium tracking-[0.28em] text-white/55 uppercase">
				Scroll to explore
			</span>
		</div>
	);
}

import { useSyncExternalStore } from "react";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";
import {
	getScrollProgress,
	requestSnapTo,
	SCROLL_SECTION_COUNT,
	subscribeScroll,
} from "../experience/scrollStore";

const STOPS = Array.from({ length: SCROLL_SECTION_COUNT }, (_, i) => ({
	index: i,
	label: String(i + 1).padStart(2, "0"),
}));

/**
 * Vertical scroll path — section markers + traveling active orb.
 */
export default function ScrollPath() {
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

	if (!sceneReady) return null;

	const max = SCROLL_SECTION_COUNT - 1;
	const t = Math.min(1, Math.max(0, progress / max));
	const activeIndex = Math.round(progress);

	return (
		<>
			<div className="scroll-path-scrim" aria-hidden />
			<nav
				className="scroll-path pointer-events-auto"
				aria-label="Section path"
			>
				<div className="scroll-path-track">
					<span className="scroll-path-line" aria-hidden />

					<span
						className="scroll-path-active"
						aria-hidden
						style={{ top: `${t * 100}%` }}
					>
						<span className="scroll-path-active-ring scroll-path-active-ring-outer" />
						<span className="scroll-path-active-ring" />
						<span className="scroll-path-active-core" />
					</span>

				{STOPS.map((stop) => (
					<span
						key={`dot-${stop.label}`}
						className="scroll-path-dot"
						aria-hidden
						style={{ top: `${(stop.index / max) * 100}%` }}
					/>
				))}

				{STOPS.map((stop) => {
					const isActive = activeIndex === stop.index;
					return (
						<button
							key={stop.label}
							type="button"
							className={`scroll-path-marker${
								isActive ? " is-active" : ""
							}`}
							style={{ top: `${(stop.index / max) * 100}%` }}
							onClick={() => {
								if (!isActive) requestSnapTo(stop.index);
							}}
							disabled={isActive}
							aria-label={
								isActive
									? `Current section ${stop.label}`
									: `Go to section ${stop.label}`
							}
							aria-current={isActive ? "true" : undefined}
						>
							{stop.label}
						</button>
					);
				})}
				</div>
			</nav>
		</>
	);
}

import { useSyncExternalStore } from "react";
import {
	getScrollSection,
	requestSnapTo,
	subscribeScroll,
} from "../experience/scrollStore";

import { setWalking } from "../experience/walkStore";

const stops = [
	"The coast",
	"Ekaterina Shelehova",
	"Bavo Bakes",
	"Your next project",
];
const getActiveChapter = () => getScrollSection();
export default function ScrollPath() {
	const p = useSyncExternalStore(
		subscribeScroll,
		getActiveChapter,
		getActiveChapter,
	);
	return (
		<div className="explore-controls">
			<nav className="chapter-nav" aria-label="Explore the portfolio">
				{stops.map((name, i) => (
					<button
						key={name}
						type="button"
						title={name}
						aria-label={name}
						aria-current={Math.round(p) === i ? "step" : undefined}
						onClick={() => requestSnapTo(i)}
					>
						<span>{String(i).padStart(2, "0")}</span>
						<i aria-hidden="true" />
					</button>
				))}
			</nav>
			<button
				type="button"
				className="scene-control walk-entry"
				onClick={() => setWalking(true)}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					focusable="false"
				>
					<circle cx="13" cy="4" r="2" />
					<path d="m7 11 3-3 4 1 2 4 3 1M10 8l-1 7-4 5m4-5 5 2 1 4M14 9l-1 5" />
				</svg>
				<span>Walk the coast</span>
			</button>
		</div>
	);
}

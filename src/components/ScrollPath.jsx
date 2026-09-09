import { useSyncExternalStore } from "react";
import {
	getScrollSection,
	requestSnapTo,
	subscribeScroll,
} from "../experience/scrollStore";

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
	);
}

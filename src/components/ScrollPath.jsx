import { useSyncExternalStore } from "react";
import {
	getScrollSection,
	requestSnapTo,
	subscribeScroll,
} from "../experience/scrollStore";

import { visitCollection } from "../experience/collectionStore";

const stops = [
	{ label: "Coast", name: "The coast" },
	{ label: "Ekaterina", name: "Ekaterina Shelehova" },
	{ label: "Bavo Bakes", name: "Bavo Bakes" },
	{ label: "Your project", name: "Your next project" },
	{ label: "Templates", name: "Templates collection" },
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
				{stops.map(({ label, name }, i) => (
					<button
						key={name}
						type="button"
						title={name}
						aria-label={name}
						aria-current={Math.round(p) === i ? "step" : undefined}
						onClick={() => (i === 4 ? visitCollection() : requestSnapTo(i))}
						aria-haspopup={i === 4 ? "dialog" : undefined}
					>
						<span>{label}</span>
						<i aria-hidden="true" />
					</button>
				))}
			</nav>
		</div>
	);
}

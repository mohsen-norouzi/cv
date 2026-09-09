import { Html } from "@react-three/drei";
import { useSyncExternalStore } from "react";
import { LANDMARKS } from "./coastLayout";
import { getSceneReady, subscribeSceneReady } from "./loadStore";
import {
	getScrollProgress,
	requestSnapTo,
	subscribeScroll,
} from "./scrollStore";

const copy = [
	["Artist portfolio", "Ekaterina Shelehova"],
	["Brand & e-commerce", "Bavo Bakes"],
	["The next chapter", "Your project here"],
];
const getLabelsVisible = () => getScrollProgress() <= 0.15;
export default function ProjectLabels() {
	const p = useSyncExternalStore(
		subscribeScroll,
		getLabelsVisible,
		getLabelsVisible,
	);
	const ready = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	if (!ready || !p) return null;
	return LANDMARKS.map((landmark, i) => (
		<Html
			key={landmark.name}
			position={[
				landmark.position[0] + 2,
				landmark.position[1] + 1.4,
				landmark.position[2],
			]}
			zIndexRange={[9, 8]}
		>
			<button
				type="button"
				className={`landmark-label landmark-label-${i}`}
				onClick={() => requestSnapTo(i + 1)}
				aria-label={`Explore ${copy[i][1]}`}
			>
				<span className="landmark-number">0{i + 1}</span>
				<span className="landmark-title">{copy[i][1]}</span>
				<span className="landmark-kind">{copy[i][0]}</span>
			</button>
		</Html>
	));
}

import { useSyncExternalStore } from "react";
import {
	getScrollProgress,
	requestSnap,
	subscribeScroll,
} from "../experience/scrollStore";

const getCueState = () => {
	const p = getScrollProgress();
	return p < 0.1 ? 0 : p >= 3 ? 3 : 1;
};
export default function ScrollCue() {
	const p = useSyncExternalStore(subscribeScroll, getCueState, getCueState);
	return (
		<footer className="site-footer">
			<button
				type="button"
				className="scroll-cue"
				onClick={() => requestSnap(p >= 3 ? -1 : 1)}
			>
				<span className="mouse-outline" aria-hidden="true">
					<i />
				</span>
				<span>
					{p < 0.1
						? "Scroll to explore"
						: p >= 3
							? "Back along the path"
							: "Continue the journey"}
				</span>
				<span className="cue-arrow" aria-hidden="true">
					↓
				</span>
			</button>
			<div className="footer-links">
				<a href="https://t.me/itsmohseeen" target="_blank" rel="noreferrer">
					Telegram ↗
				</a>
				<a href="https://wa.me/34666601296" target="_blank" rel="noreferrer">
					WhatsApp ↗
				</a>
			</div>
		</footer>
	);
}

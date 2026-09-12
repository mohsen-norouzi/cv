import { useSyncExternalStore } from "react";
import {
	SCROLL_SECTION_COUNT,
	getScrollProgress,
	requestSnap,
	subscribeScroll,
} from "../experience/scrollStore";

const getCueState = () => {
	const p = getScrollProgress();
	return p < 0.1
		? 0
		: p >= SCROLL_SECTION_COUNT - 1
			? SCROLL_SECTION_COUNT - 1
			: 1;
};
export default function ScrollCue() {
	const p = useSyncExternalStore(subscribeScroll, getCueState, getCueState);
	return (
		<footer className="site-footer">
			<button
				type="button"
				className="scroll-cue"
				onClick={() => requestSnap(p >= SCROLL_SECTION_COUNT - 1 ? -1 : 1)}
			>
				<span className="mouse-outline" aria-hidden="true">
					<i />
				</span>
				<span>
					{p < 0.1
						? "Scroll to explore"
						: p >= SCROLL_SECTION_COUNT - 1
							? "Back along the path"
							: "Continue the journey"}
				</span>
				<span className="cue-arrow" aria-hidden="true">
					↓
				</span>
			</button>
			<div className="footer-links">
				<a href="mailto:hello@itsmohsen.com">Email ↗</a>
				<a
					href="https://www.instagram.com/mohsenized/"
					target="_blank"
					rel="noreferrer"
				>
					Instagram ↗
				</a>
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

import { useSyncExternalStore } from "react";
import { getSceneReady, subscribeSceneReady } from "../experience/loadStore";
import {
	getScrollProgress,
	requestSnapTo,
	subscribeScroll,
} from "../experience/scrollStore";
import FadeUp from "./FadeUp";

const getHeroOpacity = () => Math.max(0, 1 - getScrollProgress() * 2.5);
export default function HeroContent({ entered = true }) {
	const opacity = useSyncExternalStore(
		subscribeScroll,
		getHeroOpacity,
		getHeroOpacity,
	);
	const ready = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	return (
		<section
			className="hero"
			style={{ opacity, visibility: opacity < 0.02 ? "hidden" : "visible" }}
			aria-label="Introduction"
		>
			<div className="hero-copy">
				<FadeUp active={ready && entered} delay={0.1}>
					<p className="eyebrow">
						HI, I'M <span>MOHSEN</span>
					</p>
				</FadeUp>
				<FadeUp active={ready && entered} delay={0.2}>
					<h1>
						I build digital
						<br />
						<em>experiences</em>
						<br />
						that make impact<span className="full-stop">.</span>
					</h1>
				</FadeUp>
				<FadeUp active={ready && entered} delay={0.3}>
					<div className="hero-rule" />
					<p className="hero-description">
						Web designer & developer.
						<br />
						Thoughtful design. Purposeful code.
						<br />A little sense of wonder.
					</p>
				</FadeUp>
				<FadeUp active={ready && entered} delay={0.4}>
					<div className="hero-actions">
						<button
							type="button"
							className="primary-action"
							onClick={() => requestSnapTo(1)}
						>
							Explore my work <span aria-hidden="true">⟶</span>
						</button>
					</div>
				</FadeUp>
			</div>
		</section>
	);
}

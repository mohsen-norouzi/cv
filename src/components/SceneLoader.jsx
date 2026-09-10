import { useEffect, useState, useSyncExternalStore } from "react";
import { enableMusic } from "../experience/audioStore";
import {
	getLoadProgress,
	getSceneReady,
	subscribeLoadProgress,
	subscribeSceneReady,
} from "../experience/loadStore";
export default function SceneLoader({ entered, onEnter }) {
	const { progress, errors } = useSyncExternalStore(
		subscribeLoadProgress,
		getLoadProgress,
		getLoadProgress,
	);
	const ready = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	const [gone, setGone] = useState(false);
	useEffect(() => {
		if (!entered) return;
		const timer = setTimeout(() => setGone(true), 650);
		return () => clearTimeout(timer);
	}, [entered]);
	if (gone) return null;
	return (
		<section
			className={`coast-loader ${entered ? "loaded" : ""}`}
			aria-label="Mohsen’s portfolio"
			inert={entered}
		>
			<span className="loader-monogram">M.</span>
			<span className="eyebrow">MOHSEN / SELECTED WORK</span>
			<div className="loader-track">
				<span style={{ width: `${ready ? 100 : Math.max(5, progress)}%` }} />
			</div>
			<p role="status" aria-live="polite">
				{errors
					? "The landscape couldn’t load. Please refresh to try again."
					: ready
						? "Web design & development."
						: "Loading portfolio…"}
			</p>
			<button
				type="button"
				className="primary-action entry-action"
				disabled={!ready || entered}
				onClick={() => {
					// Start playback directly in this gesture, before any animation,
					// state update, or asynchronous work can consume activation.
					void enableMusic();
					onEnter();
				}}
			>
				Enter <span aria-hidden="true">⟶</span>
			</button>
			{errors > 0 && <a href="/resume.pdf">View my resume ↗</a>}
		</section>
	);
}

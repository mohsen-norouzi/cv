import { useProgress } from "@react-three/drei";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getSceneReady, subscribeSceneReady } from "../experience/loadStore";
export default function SceneLoader() {
	const { progress, errors } = useProgress();
	const ready = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	const [gone, setGone] = useState(false);
	useEffect(() => {
		if (!ready) return;
		const timer = setTimeout(() => setGone(true), 650);
		return () => clearTimeout(timer);
	}, [ready]);
	if (gone) return null;
	return (
		<div
			className={`coast-loader ${ready ? "loaded" : ""}`}
			role="status"
			aria-live="polite"
		>
			<span className="loader-monogram">M.</span>
			<span className="eyebrow">A LITTLE WORLD OF WORK</span>
			<div className="loader-track">
				<span style={{ width: `${ready ? 100 : Math.max(5, progress)}%` }} />
			</div>
			<p>
				{errors.length
					? "The landscape couldn’t load. Please refresh to try again."
					: "Finding our way to the coast…"}
			</p>
			{errors.length > 0 && <a href="/resume.pdf">View my resume ↗</a>}
		</div>
	);
}

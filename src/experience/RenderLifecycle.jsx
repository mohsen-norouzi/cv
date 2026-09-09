import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

// Keep every visible animation frame; suspend GPU work while the tab is hidden.
export default function RenderLifecycle() {
	const setFrameloop = useThree((state) => state.setFrameloop);
	const clock = useThree((state) => state.clock);
	useEffect(() => {
		const setLoop = (mode) => {
			// R3F resets its clock when changing loops. Preserve the mist's phase so
			// returning to the page resumes animation without jumping back to the start.
			const elapsed = clock.elapsedTime;
			setFrameloop(mode);
			clock.elapsedTime = elapsed;
		};
		const update = () => setLoop(document.hidden ? "never" : "always");
		document.addEventListener("visibilitychange", update);
		update();
		return () => {
			document.removeEventListener("visibilitychange", update);
			setLoop("always");
		};
	}, [setFrameloop, clock]);
	return null;
}

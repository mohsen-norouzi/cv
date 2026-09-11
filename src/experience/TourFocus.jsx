import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
	BOARD_VIEW_POS,
	BAKERY_VIEW_POS,
	CRYSTAL_VIEW_POS,
	GIRL_VIEW_POS,
} from "./constants";
import { getCameraSettled, setFocus, setFocusReveal } from "./focusStore";
import { advanceFocus, createFocusTransition } from "./focusTransition";
import { reducedMotion } from "./motion";
import {
	continueSnapAfterExit,
	getScrollSection,
	isExitPending,
	isScrollAnimating,
} from "./scrollStore";
import { spotlightSettings } from "./spotlightSettings";

import { getWalking } from "./walkStore";

const VIEWS = [
	null,
	GIRL_VIEW_POS,
	BAKERY_VIEW_POS,
	CRYSTAL_VIEW_POS,
	BOARD_VIEW_POS,
];

export default function TourFocus() {
	const state = useRef(createFocusTransition());
	useFrame(({ camera }, dt) => {
		if (getWalking()) {
			setFocus(0, 0);
			setFocusReveal(0, 0);
			return;
		}
		// Dim immediately, but reveal the selected light only near its final view.
		// Use the actual camera position, not the faster scroll animation.
		const stop = getScrollSection();
		const exitComplete = advanceFocus(state.current, {
			stop,
			near:
				stop > 0 &&
				camera.position.distanceTo(VIEWS[stop]) <=
					spotlightSettings.timing.revealDistance,
			fadeSpeed: spotlightSettings.timing.fadeSpeed,
			arrived: getCameraSettled() && !isScrollAnimating(),
			exiting: isExitPending(),
			reduced: reducedMotion(),
			dt: Math.min(dt, 0.05),
		});
		setFocus(state.current.world, stop);
		setFocusReveal(state.current.spot, state.current.text);
		if (exitComplete) continueSnapAfterExit();
	}, -1);
	return null;
}

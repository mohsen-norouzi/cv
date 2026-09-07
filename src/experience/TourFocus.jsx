import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import { computeFocus, setFocus, setFocusReveal } from "./focusStore";
import {
	getScrollProgress,
	isExitPending,
	isScrollAnimating,
	continueSnapAfterExit,
} from "./scrollStore";

export default function TourFocus() {
	const reveal = useRef(0),
		settled = useRef(0),
		last = useRef(0);
	useFrame((_, dt) => {
		const { amount, stop } = computeFocus(getScrollProgress());
		setFocus(amount * 0.18, stop);
		if (stop !== last.current) {
			settled.current = 0;
			last.current = stop;
		}
		if (isExitPending()) {
			reveal.current = MathUtils.damp(reveal.current, 0, 12, dt);
			if (reveal.current < 0.1) continueSnapAfterExit();
		} else {
			if (!isScrollAnimating() && amount > 0.99) settled.current += dt;
			else settled.current = 0;
			reveal.current = MathUtils.damp(
				reveal.current,
				settled.current > 0.75 ? 1 : 0,
				5,
				dt,
			);
		}
		setFocusReveal(reveal.current, reveal.current);
	});
	return null;
}

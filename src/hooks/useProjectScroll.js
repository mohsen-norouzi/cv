import { useCallback, useEffect, useRef, useState } from "react";

const COOLDOWN_MS = 800;

export function useProjectScroll(total) {
	const [index, setIndex] = useState(0);
	const indexRef = useRef(0);
	const locked = useRef(false);
	const timeout = useRef(null);

	const goTo = useCallback(
		(nextIndex) => {
			if (total <= 0 || locked.current) return;

			const wrapped = ((nextIndex % total) + total) % total;
			if (wrapped === indexRef.current) return;

			locked.current = true;
			indexRef.current = wrapped;
			setIndex(wrapped);

			clearTimeout(timeout.current);
			timeout.current = setTimeout(() => {
				locked.current = false;
			}, COOLDOWN_MS);
		},
		[total],
	);

	const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
	const prev = useCallback(() => goTo(indexRef.current - 1), [goTo]);

	useEffect(() => {
		const onWheel = (event) => {
			if (Math.abs(event.deltaY) < 8) return;
			event.preventDefault();
			if (event.deltaY > 0) next();
			else prev();
		};

		const onKeyDown = (event) => {
			if (event.key === "ArrowDown" || event.key === "ArrowRight") {
				event.preventDefault();
				next();
			} else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
				event.preventDefault();
				prev();
			}
		};

		window.addEventListener("wheel", onWheel, { passive: false });
		window.addEventListener("keydown", onKeyDown);

		return () => {
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [next, prev]);

	useEffect(() => {
		return () => clearTimeout(timeout.current);
	}, []);

	return { index, goTo, next, prev };
}

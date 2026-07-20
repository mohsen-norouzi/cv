import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

/** Fade + rise from below. Remount with a new `key` to replay. */
export default function FadeUp({
	active,
	delay = 0,
	duration = 0.85,
	y = 22,
	className = "",
	children,
}) {
	const ref = useRef(null);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;

		const tween = active
			? gsap.fromTo(
					el,
					{ opacity: 0, y },
					{
						opacity: 1,
						y: 0,
						duration,
						delay,
						ease: "power3.out",
						overwrite: "auto",
					},
				)
			: gsap.to(el, {
					opacity: 0,
					y,
					duration: 0.25,
					ease: "power2.in",
					overwrite: "auto",
				});

		return () => {
			tween.kill();
		};
	}, [active, delay, duration, y]);

	return (
		<div ref={ref} className={className} style={{ opacity: 0 }}>
			{children}
		</div>
	);
}

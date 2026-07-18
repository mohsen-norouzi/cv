import { useSyncExternalStore } from "react";
import { getScrollProgress, subscribeScroll } from "../experience/scrollStore";

const steps = ["01", "02", "03", "04"];

export default function ScrollIndicator() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getScrollProgress,
		getScrollProgress,
	);
	const activeIndex = Math.min(
		steps.length - 1,
		Math.floor(progress * steps.length),
	);

	return (
		<aside className="absolute top-1/2 right-6 z-20 flex -translate-y-1/2 flex-col items-center md:right-10 lg:right-14">
			<span className="font-ui mb-5 text-[10px] font-medium tracking-[0.35em] text-white/70 uppercase">
				Scroll
			</span>

			<div className="relative flex flex-col items-center gap-5 py-1">
				<div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25" />
				<div
					className="pointer-events-none absolute top-0 left-1/2 h-full w-px origin-top -translate-x-1/2 bg-accent/70"
					style={{ transform: `translateX(-50%) scaleY(${progress})` }}
				/>

				{steps.map((step, index) => {
					const isActive = index === activeIndex;
					const isLast = index === steps.length - 1;

					return (
						<div
							key={step}
							className="relative z-10 flex flex-col items-center gap-5"
						>
							{isActive ? (
								<div className="flex flex-col items-center gap-3">
									<span className="relative flex size-2 items-center justify-center">
										<span className="absolute size-9 rounded-full bg-accent/25 blur-[1px]" />
										<span className="absolute size-6 rounded-full border border-accent/40" />
										<span className="relative size-2 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(196,163,90,0.55)]" />
									</span>
									<span className="font-ui text-[11px] font-medium tracking-wider text-accent">
										{step}
									</span>
								</div>
							) : (
								<span className="font-ui text-[11px] font-normal tracking-wider text-white/50">
									{step}
								</span>
							)}

							{!isLast && (
								<span className="size-1.5 rounded-full bg-white/40" />
							)}
						</div>
					);
				})}
			</div>
		</aside>
	);
}

import { useSyncExternalStore } from "react";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";
import {
	getScrollProgress,
	requestSnap,
	subscribeScroll,
} from "../experience/scrollStore";
import FadeUp from "./FadeUp";

export default function HeroContent() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getScrollProgress,
		getScrollProgress,
	);
	const sceneReady = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);

	const opacity = Math.max(0, 1 - progress * 1.6);
	const hidden = opacity < 0.02;
	const show = sceneReady && progress < 0.35;

	return (
		<div
			className="absolute inset-0 z-10 flex items-center px-5 sm:px-8 md:px-12 lg:px-[10%]"
			style={{
				opacity,
				visibility: hidden ? "hidden" : "visible",
				transition: "opacity 0.05s linear",
			}}
		>
			{/* Left wash — same language on all breakpoints; stronger/tighter on phone */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 w-[min(92%,28rem)] md:w-[min(72%,50rem)]"
				style={{
					background:
						"linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.58) 18%, rgba(0,0,0,0.34) 42%, rgba(0,0,0,0.14) 68%, transparent 100%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-[10%] left-0 h-[80%] w-[min(78%,22rem)] blur-2xl md:inset-y-[8%] md:h-[84%] md:w-[min(58%,36rem)] md:blur-3xl"
				style={{
					background:
						"radial-gradient(ellipse 85% 75% at 18% 48%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 42%, transparent 74%)",
				}}
			/>

			<div className="relative max-w-lg pointer-events-auto">
				<div className="relative z-[1]">
					<FadeUp active={show} delay={0.1} duration={0.9}>
						<p className="font-ui mb-4 text-[11px] font-medium tracking-[0.22em] text-white/90 uppercase sm:mb-5 sm:text-[12px]">
							Hi, I&apos;m <span className="hero-accent">Mohsen</span>
						</p>
					</FadeUp>

					<FadeUp active={show} delay={0.22} duration={0.95} y={28}>
						<h1 className="font-display mb-4 text-[clamp(2rem,9vw,3.75rem)] leading-[1.12] font-bold tracking-[-0.03em] text-white sm:mb-5">
							Every project
							<br />
							gets its own
							<br />
							<span className="hero-accent">little universe.</span>
						</h1>
					</FadeUp>

					<FadeUp active={show} delay={0.36} duration={0.9}>
						<p className="font-ui mb-8 max-w-md text-[14px] leading-[1.7] font-normal text-white/85 sm:mb-9 sm:text-[15px]">
							Somewhere ahead, past the fog, there&apos;s a spot still
							unclaimed.
						</p>
					</FadeUp>

					<FadeUp active={show} delay={0.48} duration={0.85}>
						<div className="flex flex-wrap items-center gap-5 sm:gap-7">
							<button
								type="button"
								onClick={() => requestSnap(1)}
								className="font-ui inline-flex cursor-pointer items-center gap-2 rounded-sm bg-accent px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#1f1a14] uppercase transition-opacity hover:opacity-90"
							>
								Follow the path
								<span aria-hidden>→</span>
							</button>

							<a
								href="https://wa.me/34666601296"
								target="_blank"
								rel="noopener noreferrer"
								className="font-ui text-[11px] font-medium tracking-[0.2em] text-white uppercase underline decoration-white/45 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
							>
								Meet the maker
							</a>
						</div>
					</FadeUp>
				</div>
			</div>
		</div>
	);
}

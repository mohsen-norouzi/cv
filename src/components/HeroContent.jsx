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
			className="absolute inset-0 z-10 flex items-center px-8 md:px-12 lg:px-[10%]"
			style={{
				opacity,
				visibility: hidden ? "hidden" : "visible",
				transition: "opacity 0.05s linear",
			}}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 w-[min(62%,42rem)] bg-gradient-to-r from-black/72 via-black/42 to-transparent"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-[18%] left-0 h-[64%] w-[min(48%,28rem)] bg-gradient-to-r from-black/35 to-transparent blur-2xl"
			/>

			<div className="relative max-w-lg pointer-events-auto">
				<FadeUp active={show} delay={0.1} duration={0.9}>
					<p className="font-ui mb-5 text-[12px] font-medium tracking-[0.22em] text-white/90 uppercase">
						Hi, I&apos;m <span className="hero-accent">Mohsen</span>
					</p>
				</FadeUp>

				<FadeUp active={show} delay={0.22} duration={0.95} y={28}>
					<h1 className="font-display mb-5 text-[clamp(2.4rem,5.2vw,3.75rem)] leading-[1.12] font-bold tracking-[-0.03em] text-white">
						I build digital{" "}
						<span className="hero-accent">experiences</span> that make
						impact
						<span className="hero-accent">.</span>
					</h1>
				</FadeUp>

				<FadeUp active={show} delay={0.36} duration={0.9}>
					<p className="font-ui mb-9 max-w-md text-[15px] leading-[1.7] font-normal text-white/85">
						Web developer crafting fast, accessible and meaningful web
						experiences.
					</p>
				</FadeUp>

				<FadeUp active={show} delay={0.48} duration={0.85}>
					<div className="flex flex-wrap items-center gap-7">
						<button
							type="button"
							onClick={() => requestSnap(1)}
							className="font-ui inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#1f1a14] uppercase transition-opacity hover:opacity-90"
						>
							View my work
							<span aria-hidden>→</span>
						</button>

						<a
							href="#about"
							className="font-ui text-[11px] font-medium tracking-[0.2em] text-white uppercase underline decoration-white/45 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
						>
							About me
						</a>
					</div>
				</FadeUp>
			</div>
		</div>
	);
}

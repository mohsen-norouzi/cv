import { useSyncExternalStore } from "react";
import {
	getScrollProgress,
	snapScroll,
	subscribeScroll,
} from "../experience/scrollStore";

export default function HeroContent() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getScrollProgress,
		getScrollProgress,
	);
	const opacity = Math.max(0, 1 - progress * 1.6);
	const hidden = opacity < 0.02;

	return (
		<div
			className="absolute inset-0 z-10 flex items-center px-8 md:px-12 lg:px-[10%]"
			style={{
				opacity,
				visibility: hidden ? "hidden" : "visible",
				transition: "opacity 0.05s linear",
			}}
		>
			{/* Soft scrim so type stays readable over fog / rocks */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 w-[min(52%,36rem)] bg-gradient-to-r from-black/45 via-black/20 to-transparent"
			/>

			<div className="relative max-w-lg pointer-events-auto">
				<p className="font-ui mb-5 text-[12px] font-medium tracking-[0.22em] text-white/75 uppercase">
					Hi, I&apos;m <span className="text-accent">Mohsen</span>
				</p>

				<h1 className="font-display mb-5 text-[clamp(2.4rem,5.2vw,3.75rem)] leading-[1.12] font-bold tracking-[-0.03em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
					I build digital{" "}
					<span className="text-accent">experiences</span> that make
					impact
					<span className="text-accent">.</span>
				</h1>

				<p className="font-ui mb-9 max-w-md text-[15px] leading-[1.7] font-normal text-white/70">
					Web developer crafting fast, accessible and meaningful web
					experiences.
				</p>

				<div className="flex flex-wrap items-center gap-7">
					<button
						type="button"
						onClick={() => snapScroll(1)}
						className="font-ui inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-[#1f1a14] uppercase transition-opacity hover:opacity-90"
					>
						View my work
						<span aria-hidden>→</span>
					</button>

					<a
						href="#about"
						className="font-ui text-[11px] font-medium tracking-[0.2em] text-white/85 uppercase underline decoration-white/35 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
					>
						About me
					</a>
				</div>
			</div>
		</div>
	);
}

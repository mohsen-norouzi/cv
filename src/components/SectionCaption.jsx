import { useSyncExternalStore } from "react";
import {
	getFocusStop,
	getTextReveal,
	subscribeFocusReveal,
} from "../experience/focusStore";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";
import { PROJECTS } from "../experience/projects";
import FadeUp from "./FadeUp";

export default function SectionCaption() {
	const sceneReady = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	const textReveal = useSyncExternalStore(
		subscribeFocusReveal,
		getTextReveal,
		getTextReveal,
	);
	const stop = useSyncExternalStore(
		subscribeFocusReveal,
		getFocusStop,
		getFocusStop,
	);

	const project = stop >= 1 ? PROJECTS[stop - 1] : null;
	if (!project || !sceneReady) return null;

	const show = textReveal > 0.35;
	const scrimOpacity = Math.min(1, Math.max(0, (textReveal - 0.2) / 0.6));

	return (
		<aside
			key={project.id}
			className="pointer-events-none absolute bottom-0 left-0 z-20 w-full max-w-[34rem] md:w-[min(34rem,92vw)]"
		>
			{/* Bottom-left wash — readable over stage light, not a black slab */}
			<div
				aria-hidden
				className="pointer-events-none absolute -inset-x-9 -top-56 bottom-0 md:-inset-x-15 md:-top-60"
				style={{
					opacity: scrimOpacity,
					background:
						"radial-gradient(132% 118% at 0% 100%, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.82) 26%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.2) 72%, transparent 90%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 w-full max-w-[30rem] blur-xl md:max-w-[36rem] md:blur-2xl"
				style={{
					opacity: scrimOpacity,
					background:
						"linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0.14) 72%, transparent 100%)",
				}}
			/>
			{/* Soft floor lift on mobile only */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 -top-40 bottom-0 md:hidden"
				style={{
					opacity: scrimOpacity * 0.85,
					background:
						"linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 48%, transparent 100%)",
				}}
			/>

			<div className="relative px-5 pb-9 pt-12 sm:px-8 sm:pb-10 md:px-12 md:pb-14 md:pt-12 lg:px-16">
				<FadeUp active={show} delay={0.02} duration={0.9}>
					<p className="font-ui mb-2 text-[11px] font-semibold tracking-[0.28em] text-accent uppercase">
						{project.id}
						<span className="mx-2 text-white/30">·</span>
						<span className="tracking-[0.18em] text-white/55">
							{project.year}
						</span>
					</p>
				</FadeUp>

				<FadeUp active={show} delay={0.12} duration={1} y={26}>
					<h2 className="font-display text-[1.45rem] font-semibold tracking-tight text-white sm:text-[1.65rem] md:text-[1.85rem]">
						{project.title}
					</h2>
				</FadeUp>

				<FadeUp active={show} delay={0.24} duration={1}>
					<p className="font-ui mt-2.5 max-w-[20rem] text-[13.5px] leading-relaxed text-white/85 sm:text-[14px] md:max-w-[22rem] md:text-white/80">
						{project.description}
					</p>
				</FadeUp>

				<FadeUp active={show} delay={0.36} duration={0.9}>
					<p className="font-ui mt-3 text-[11px] tracking-[0.04em] text-white/55">
						{project.role}
						<span className="mx-2 text-white/30">/</span>
						{project.stack}
					</p>
				</FadeUp>

				{project.url && (
					<FadeUp active={show} delay={0.48} duration={0.85}>
						<a
							href={project.url}
							{...(project.url.startsWith("http")
								? { target: "_blank", rel: "noreferrer" }
								: {})}
							className="font-ui pointer-events-auto mt-5 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-accent uppercase underline decoration-accent/40 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/50"
						>
							{project.urlLabel ?? "Visit site"}
							<span aria-hidden>→</span>
						</a>
					</FadeUp>
				)}
			</div>
		</aside>
	);
}

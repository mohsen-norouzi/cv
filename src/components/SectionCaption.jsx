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
			className="pointer-events-none absolute bottom-0 left-0 z-20 w-[min(34rem,92vw)]"
		>
			{/* Soft vignette — no hard box edges */}
			<div
				aria-hidden
				className="pointer-events-none absolute -inset-x-12 -top-44 bottom-0"
				style={{
					opacity: scrimOpacity,
					background:
						"radial-gradient(120% 105% at 0% 100%, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.68) 32%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.14) 74%, transparent 90%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 w-[min(100%,32rem)] blur-2xl"
				style={{
					opacity: scrimOpacity * 0.95,
					background:
						"linear-gradient(to right, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.28) 50%, transparent 100%)",
				}}
			/>

			<div className="relative px-8 pb-10 pt-10 md:px-12 md:pb-14 md:pt-12 lg:px-16">
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
					<h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-white md:text-[1.85rem]">
						{project.title}
					</h2>
				</FadeUp>

				<FadeUp active={show} delay={0.24} duration={1}>
					<p className="font-ui mt-2.5 max-w-[20rem] text-[14px] leading-relaxed text-white/80 md:max-w-[22rem]">
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

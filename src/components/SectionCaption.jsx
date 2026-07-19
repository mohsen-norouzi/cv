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

	return (
		<aside
			key={project.id}
			className="pointer-events-none absolute bottom-10 left-8 z-20 max-w-[20rem] md:bottom-14 md:left-12 md:max-w-[22rem] lg:left-16"
		>
			<FadeUp active={show} delay={0.02} duration={0.9}>
				<p className="font-ui mb-2 text-[11px] font-semibold tracking-[0.28em] text-accent uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
					{project.id}
					<span className="mx-2 text-white/25">·</span>
					<span className="tracking-[0.18em] text-white/55">{project.year}</span>
				</p>
			</FadeUp>

			<FadeUp active={show} delay={0.12} duration={1} y={26}>
				<h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] md:text-[1.85rem]">
					{project.title}
				</h2>
			</FadeUp>

			<FadeUp active={show} delay={0.24} duration={1}>
				<p className="font-ui mt-2.5 text-[14px] leading-relaxed text-white/78 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
					{project.description}
				</p>
			</FadeUp>

			<FadeUp active={show} delay={0.36} duration={0.9}>
				<p className="font-ui mt-3 text-[11px] tracking-[0.04em] text-white/50 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
					{project.role}
					<span className="mx-2 text-white/25">/</span>
					{project.stack}
				</p>
			</FadeUp>

			{project.url && (
				<FadeUp active={show} delay={0.48} duration={0.85}>
					<a
						href={project.url}
						target="_blank"
						rel="noreferrer"
						className="font-ui pointer-events-auto mt-5 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-accent uppercase underline decoration-accent/40 underline-offset-[6px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-colors hover:text-white hover:decoration-white/50"
					>
						{project.urlLabel ?? "Visit site"}
						<span aria-hidden>→</span>
					</a>
				</FadeUp>
			)}
		</aside>
	);
}

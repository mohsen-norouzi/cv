import { useSyncExternalStore } from "react";
import {
	getFocusStop,
	getTextReveal,
	subscribeFocusReveal,
} from "../experience/focusStore";
import { PROJECTS } from "../experience/projects";
import { requestSnapTo } from "../experience/scrollStore";
import { setCollectionOpen } from "../experience/collectionStore";
import FadeUp from "./FadeUp";
export default function SectionCaption() {
	const reveal = useSyncExternalStore(
		subscribeFocusReveal,
		getTextReveal,
		getTextReveal,
	);
	const stop = useSyncExternalStore(
		subscribeFocusReveal,
		getFocusStop,
		getFocusStop,
	);
	const collection = stop === 4;
	const project = collection
		? {
				id: "04",
				title: "The collection",
				description:
					"A few discoveries from my workshop. Explore website templates, find a starting point, and make it yours.",
			}
		: PROJECTS[stop - 1];
	if (!project) return null;
	const show = reveal > 0.35;
	return (
		<aside
			className={`project-caption ${show ? "is-visible" : ""}`}
			aria-hidden={!show}
			inert={!show}
		>
			<div key={project.id}>
				<FadeUp active={show}>
					<button
						className="back-link"
						type="button"
						onClick={() => requestSnapTo(0)}
					>
						← Back to the coast
					</button>
				</FadeUp>
				<FadeUp active={show} delay={0.06}>
					<p className="eyebrow">
						{collection ? "WEBSITE TEMPLATES" : "SELECTED WORK"}{" "}
						<span>/ {project.id}</span>
					</p>
					<h2>{project.title}</h2>
				</FadeUp>
				<FadeUp active={show} delay={0.12}>
					<p className="project-description">{project.description}</p>
					{!collection && (
						<dl className="project-details">
							<div>
								<dt>DISCIPLINE</dt>
								<dd>{project.role}</dd>
							</div>
							<div>
								<dt>YEAR</dt>
								<dd>{project.year}</dd>
							</div>
						</dl>
					)}
				</FadeUp>
				<FadeUp active={show} delay={0.18} className="project-action">
					{collection ? (
						<button
							type="button"
							className="primary-action"
							onClick={() => setCollectionOpen(true)}
						>
							Browse templates <span aria-hidden="true">↗</span>
						</button>
					) : (
						<a
							className="primary-action"
							href={project.url}
							{...(project.url.startsWith("http")
								? { target: "_blank", rel: "noreferrer" }
								: {})}
						>
							{project.urlLabel} <span aria-hidden="true">↗</span>
						</a>
					)}
				</FadeUp>
			</div>
		</aside>
	);
}

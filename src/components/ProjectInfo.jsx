export default function ProjectInfo({ project, index, total }) {
	const format = (i) => String(i + 1).padStart(2, "0");
	const prev = format((index - 1 + total) % total);
	const current = format(index);
	const next = format((index + 1) % total);
	const [first, ...rest] = project.title.split(" ");
	const second = rest.join(" ");

	return (
		<aside className="project-info" aria-live="polite">
			<div className="project-info__rail" aria-hidden="true">
				<span className="project-info__rail-line project-info__rail-line--top" />
				<div className="project-info__nums">
					<span className="project-info__num project-info__num--adjacent">
						{prev}
					</span>
					<span className="project-info__num project-info__num--current">
						{current}
					</span>
					<span className="project-info__num project-info__num--adjacent">
						{next}
					</span>
				</div>
				<span className="project-info__rail-line project-info__rail-line--bottom" />
			</div>

			<div key={project.id} className="project-info__content">
				<p className="project-info__category">
					<span className="project-info__dot" aria-hidden="true" />
					{project.category}
				</p>

				<h1 className="project-info__title">
					<span>{first}</span>
					{second ? <span>{second}</span> : null}
				</h1>

				<p className="project-info__description">{project.description}</p>

				<a href={project.href} className="project-info__cta">
					<span className="project-info__cta-label">
						View Project
						<span aria-hidden="true">→</span>
					</span>
				</a>
			</div>
		</aside>
	);
}

export default function ProjectRail({ index, total, onSelect }) {
	return (
		<div className="project-rail" aria-label="Project progress">
			<span className="project-rail__cap project-rail__cap--top" aria-hidden="true" />

			{Array.from({ length: total }, (_, i) => {
				const distance = Math.abs(i - index);
				const size =
					i === index ? "is-active" : distance === 1 ? "is-near" : "is-far";

				return (
					<div key={i} className="project-rail__item">
						{i > 0 ? (
							<span className="project-rail__segment" aria-hidden="true" />
						) : null}
						<button
							type="button"
							className={`project-rail__dot ${size}`}
							aria-label={`Project ${i + 1}`}
							aria-current={i === index ? "true" : undefined}
							onClick={() => onSelect(i)}
						/>
					</div>
				);
			})}

			<span
				className="project-rail__cap project-rail__cap--bottom"
				aria-hidden="true"
			/>
		</div>
	);
}

export default function NextProject({ project, onNext }) {
	return (
		<div className="next-project">
			<button type="button" className="next-project__link" onClick={onNext}>
				<span className="next-project__link-label">
					Next Project
					<span aria-hidden="true">→</span>
				</span>
			</button>

			<button
				type="button"
				className="next-project__thumb"
				onClick={onNext}
				aria-label={`Go to ${project.title}`}
				style={{ "--thumb-accent": project.accent }}
			>
				<span className="next-project__thumb-inner" />
			</button>
		</div>
	);
}

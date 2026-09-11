import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
	setCollectionOpen,
	useCollectionOpen,
} from "../experience/collectionStore";
import {
	getFocusStop,
	getTextReveal,
	subscribeFocusReveal,
} from "../experience/focusStore";
import { getPreviewUrl, TEMPLATES } from "../experience/templates";

const getArrival = () => getFocusStop() === 4 && getTextReveal() > 0.35;
export default function TemplateCollection() {
	const open = useCollectionOpen();
	const arrived = useSyncExternalStore(
		subscribeFocusReveal,
		getArrival,
		getArrival,
	);
	const dialog = useRef(null);
	const title = useRef(null);
	const previousTile = useRef(null);
	const [selected, setSelected] = useState(null);
	useEffect(() => {
		if (arrived) setCollectionOpen(true);
	}, [arrived]);
	useEffect(() => {
		if (open) {
			previousTile.current = null;
			setSelected(null);
			dialog.current.showModal();
		} else if (dialog.current.open) dialog.current.close();
	}, [open]);
	const showTemplate = (template) => {
		previousTile.current = template.id;
		setSelected(template);
	};
	useEffect(() => {
		if (selected) title.current?.focus();
		else if (previousTile.current)
			dialog.current
				?.querySelector(`[data-template-id="${previousTile.current}"]`)
				?.focus();
	}, [selected]);
	const previewUrl = selected && getPreviewUrl(selected);
	return (
		<dialog
			ref={dialog}
			className="collection-dialog"
			aria-labelledby="collection-title"
			onCancel={() => setCollectionOpen(false)}
			onClose={() => setCollectionOpen(false)}
			onClick={(event) => {
				if (event.target === event.currentTarget) setCollectionOpen(false);
			}}
		>
			<div className="collection-body">
				<header className="collection-header">
					<div>
						<p className="collection-kicker">A FIND ALONG THE COAST / 04</p>
						<h2 id="collection-title">
							The collection<span>.</span>
						</h2>
						<p>Little beginnings for your next website.</p>
					</div>
					<button
						type="button"
						className="collection-close"
						aria-label="Close collection"
						onClick={() => setCollectionOpen(false)}
						autoFocus
					>
						×
					</button>
				</header>
				{selected ? (
					<section className="template-detail">
						<button
							type="button"
							className="collection-back"
							onClick={() => setSelected(null)}
						>
							← All templates
						</button>
						<img
							src={selected.image}
							alt={selected.imageAlt}
							width="1920"
							height="1080"
						/>
						<div className="template-detail-copy">
							<div>
								<h3 ref={title} tabIndex={-1}>
									{selected.title}
								</h3>
								<p>{selected.description}</p>
							</div>
							{previewUrl ? (
								<a
									className="primary-action"
									href={previewUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									Preview website ↗
								</a>
							) : (
								<span className="template-status">Preview coming soon</span>
							)}
						</div>
					</section>
				) : (
					<div className="template-grid">
						{TEMPLATES.map((template, index) => {
							const url = getPreviewUrl(template);
							const content = (
								<>
									<div className={`template-image template-tone-${index % 3}`}>
										<img
											src={template.image}
											alt={template.imageAlt}
											width="1920"
											height="1080"
											loading="lazy"
										/>
									</div>
									<div className="template-card-copy">
										<div className="template-card-title">
											<h3>{template.title}</h3>
											<span aria-hidden="true">↗</span>
										</div>
										<p>{template.description}</p>
										<span className="template-status">
											{url ? "Preview website" : "Coming soon · Placeholder"}
										</span>
									</div>
								</>
							);
							return url ? (
								<a
									className="template-card"
									key={template.id}
									data-template-id={template.id}
									href={url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{content}
								</a>
							) : (
								<button
									className="template-card"
									key={template.id}
									data-template-id={template.id}
									type="button"
									onClick={() => showTemplate(template)}
								>
									{content}
								</button>
							);
						})}
					</div>
				)}
				<footer className="collection-footer">
					Made by Mohsen <span>Design & development</span>
				</footer>
			</div>
		</dialog>
	);
}

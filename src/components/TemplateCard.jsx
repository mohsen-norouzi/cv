import { useCallback, useEffect, useRef, useState } from "react";
import { getPreviewUrl } from "../experience/templates";

export default function TemplateCard({ template, index, active, onSelect }) {
	const video = useRef(null);
	const requested = useRef(false);
	const [playing, setPlaying] = useState(false);
	const url = getPreviewUrl(template);
	const stop = useCallback(() => {
		requested.current = false;
		video.current?.pause();
		if (video.current?.readyState) video.current.currentTime = 0;
		setPlaying(false);
	}, []);
	const play = () => {
		const media = video.current;
		if (!media || !active) return;
		requested.current = true;
		// No video request until the visitor asks for a preview.
		if (!media.getAttribute("src")) media.src = template.video;
		media
			.play()
			.then(() => {
				if (!requested.current) media.pause();
			})
			.catch(() => setPlaying(false));
	};
	useEffect(() => {
		if (!active) stop();
	}, [active, stop]);
	useEffect(() => {
		const hide = () => {
			if (document.hidden) stop();
		};
		document.addEventListener("visibilitychange", hide);
		const media = video.current;
		return () => {
			requested.current = false;
			media?.pause();
			document.removeEventListener("visibilitychange", hide);
		};
	}, [stop]);
	const image = (
		<img
			src={template.image}
			alt={template.imageAlt}
			width="1280"
			height="720"
			loading="lazy"
		/>
	);
	const copy = (
		<div className="template-card-copy">
			<div className="template-card-title">
				<h3>{template.title}</h3>
				<span aria-hidden="true">↗</span>
			</div>
			<p>{template.description}</p>
			<span className="template-status">
				{url ? "Preview website ↗" : "Coming soon · Placeholder"}
			</span>
		</div>
	);
	if (!template.video && url)
		return (
			<a
				className="template-card"
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				data-template-id={template.id}
			>
				<div className="template-image">{image}</div>
				{copy}
			</a>
		);
	if (!template.video)
		return (
			<button
				className="template-card"
				type="button"
				data-template-id={template.id}
				onClick={() => onSelect(template)}
			>
				<div className="template-card-content">
					<div className={`template-image template-tone-${index % 3}`}>
						{image}
					</div>
					{copy}
				</div>
			</button>
		);
	return (
		<article
			className="template-card template-video-card"
			onPointerEnter={(event) => {
				if (
					event.pointerType === "mouse" &&
					!matchMedia("(prefers-reduced-motion: reduce)").matches
				)
					play();
			}}
			onPointerLeave={stop}
		>
			<button
				className="template-image template-video-preview"
				type="button"
				aria-label={`${playing ? "Pause" : "Play"} ${template.title} video preview`}
				aria-pressed={playing}
				onClick={() => (requested.current ? stop() : play())}
				onBlur={stop}
			>
				{image}
				<video
					ref={video}
					muted
					loop
					playsInline
					preload="none"
					poster={template.image}
					aria-hidden="true"
					tabIndex={-1}
					className={playing ? "is-playing" : ""}
					onPlaying={() => {
						if (requested.current) setPlaying(true);
						else video.current?.pause();
					}}
					onPause={() => setPlaying(false)}
					onError={() => setPlaying(false)}
				/>
				<span className="template-video-badge" aria-hidden="true">
					{playing ? "Ⅱ Preview" : "▷ Preview"}
				</span>
			</button>
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				data-template-id={template.id}
				className="template-card-link"
			>
				{copy}
			</a>
		</article>
	);
}

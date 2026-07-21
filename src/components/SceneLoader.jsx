import { useProgress } from "@react-three/drei";
import { useState, useSyncExternalStore } from "react";
import { enableMusic } from "../experience/audioStore";
import {
	getSceneReady,
	subscribeSceneReady,
} from "../experience/loadStore";

/**
 * Loads the world, then waits for a click — that gesture starts ambient audio
 * (browsers block sound without one) and enters the scene.
 */
export default function SceneLoader() {
	const { progress, active } = useProgress();
	const sceneReady = useSyncExternalStore(
		subscribeSceneReady,
		getSceneReady,
		getSceneReady,
	);
	const [fadeOut, setFadeOut] = useState(false);
	const [gone, setGone] = useState(false);
	const [entering, setEntering] = useState(false);

	// Scene ready is the hard gate — progress can stall on some phones
	// after the GLB is already decoded and materials applied.
	const assetsReady = sceneReady && (progress >= 99 || !active);
	const pct = Math.min(100, Math.round(progress));

	const enter = async () => {
		if (!assetsReady || entering || fadeOut || gone) return;
		setEntering(true);
		await enableMusic();
		setFadeOut(true);
		window.setTimeout(() => setGone(true), 700);
	};

	if (gone) return null;

	const canEnter = assetsReady && !entering && !fadeOut;

	return (
		<div
			className="splash"
			style={{
				opacity: fadeOut ? 0 : 1,
				pointerEvents: fadeOut ? "none" : "auto",
				cursor: canEnter ? "default" : "wait",
			}}
			aria-busy={!assetsReady}
			aria-live="polite"
		>
			{/* Soft vignette + grain */}
			<span className="splash-grain" aria-hidden />
			<span className="splash-vignette" aria-hidden />

			{/* Edge guides: side arcs + vertical rails (matches ref) */}
			<div className="splash-frame" aria-hidden>
				{/* Left round arc + dot */}
				<svg
					className="splash-side-arc splash-side-arc-l"
					viewBox="0 0 240 1000"
					preserveAspectRatio="none"
				>
					<title>Left arc</title>
					<defs>
						<linearGradient
							id="splash-arc-fade-l"
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1="40"
							x2="0"
							y2="960"
						>
							<stop offset="0%" stopColor="#fff" stopOpacity="0" />
							<stop offset="12%" stopColor="#fff" stopOpacity="1" />
							<stop offset="88%" stopColor="#fff" stopOpacity="1" />
							<stop offset="100%" stopColor="#fff" stopOpacity="0" />
						</linearGradient>
						<mask
							id="splash-arc-mask-l"
							maskUnits="userSpaceOnUse"
							x="0"
							y="0"
							width="240"
							height="1000"
						>
							<path
								d="M 200 40 C 40 220, 40 780, 200 960"
								fill="none"
								stroke="url(#splash-arc-fade-l)"
								strokeWidth="4"
								strokeLinecap="round"
							/>
						</mask>
					</defs>
					<path
						className="splash-guide-line"
						d="M 200 40 C 40 220, 40 780, 200 960"
						fill="none"
						stroke="rgba(255,255,255,0.28)"
						strokeWidth="0.7"
						strokeLinecap="round"
						mask="url(#splash-arc-mask-l)"
					/>
				</svg>
				<span className="splash-page-dot splash-page-dot-w" />

				{/* Right round arc + dot */}
				<svg
					className="splash-side-arc splash-side-arc-r"
					viewBox="0 0 240 1000"
					preserveAspectRatio="none"
				>
					<title>Right arc</title>
					<defs>
						<linearGradient
							id="splash-arc-fade-r"
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1="40"
							x2="0"
							y2="960"
						>
							<stop offset="0%" stopColor="#fff" stopOpacity="0" />
							<stop offset="12%" stopColor="#fff" stopOpacity="1" />
							<stop offset="88%" stopColor="#fff" stopOpacity="1" />
							<stop offset="100%" stopColor="#fff" stopOpacity="0" />
						</linearGradient>
						<mask
							id="splash-arc-mask-r"
							maskUnits="userSpaceOnUse"
							x="0"
							y="0"
							width="240"
							height="1000"
						>
							<path
								d="M 40 40 C 200 220, 200 780, 40 960"
								fill="none"
								stroke="url(#splash-arc-fade-r)"
								strokeWidth="4"
								strokeLinecap="round"
							/>
						</mask>
					</defs>
					<path
						className="splash-guide-line"
						d="M 40 40 C 200 220, 200 780, 40 960"
						fill="none"
						stroke="rgba(255,255,255,0.28)"
						strokeWidth="0.7"
						strokeLinecap="round"
						mask="url(#splash-arc-mask-r)"
					/>
				</svg>
				<span className="splash-page-dot splash-page-dot-e" />

				{/* Top vertical line + dot */}
				<span className="splash-v-rail splash-v-rail-n">
					<span className="splash-page-dot splash-page-dot-n" />
					<span className="splash-v-rail-line" />
				</span>

				{/* Bottom vertical line + dot */}
				<span className="splash-v-rail splash-v-rail-s">
					<span className="splash-page-dot splash-page-dot-s" />
					<span className="splash-v-rail-line" />
				</span>
			</div>

			<div className="splash-content">
				<p className="splash-greeting splash-in splash-in-1">
					Hi, I&apos;m Mohsen
				</p>

				<h1 className="splash-headline splash-in splash-in-2">
					Let&apos;s create something <em>meaningful.</em>
				</h1>

				<p className="splash-sub splash-in splash-in-3">
					I design and build digital experiences that connect, inspire,
					and leave a lasting impact.
				</p>

				<div className="splash-cta splash-in splash-in-4">
					<button
						type="button"
						className={`splash-enter ${assetsReady ? "is-ready" : ""}`}
						onClick={() => void enter()}
						disabled={!canEnter}
						aria-label={assetsReady ? "Enter the path" : `Loading ${pct}%`}
					>
						<span className="splash-crosshair" aria-hidden>
							<span className="splash-crosshair-h" />
							<span className="splash-crosshair-v" />
							<span className="splash-dot splash-dot-n" />
							<span className="splash-dot splash-dot-e" />
							<span className="splash-dot splash-dot-s" />
							<span className="splash-dot splash-dot-w" />
						</span>

						<span className="splash-orb">
							{assetsReady ? (
								<span className="splash-enter-label">Enter</span>
							) : (
								<span className="splash-enter-label splash-enter-pct">
									{pct}%
								</span>
							)}
						</span>
					</button>

					<span className="splash-hint">
						{assetsReady ? "Scroll through my work" : "Loading"}
					</span>
				</div>
			</div>
		</div>
	);
}

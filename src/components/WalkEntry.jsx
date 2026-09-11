import { setWalking } from "../experience/walkStore";

export default function WalkEntry() {
	return (
		<button
			type="button"
			className="scene-control walk-entry"
			aria-label="Walk the coast"
			title="Explore the coast on foot"
			onClick={() => setWalking(true)}
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
				focusable="false"
			>
				<circle cx="13" cy="4" r="2" />
				<path d="m7 11 3-3 4 1 2 4 3 1M10 8l-1 7-4 5m4-5 5 2 1 4M14 9l-1 5" />
			</svg>
			<span>Walk</span>
		</button>
	);
}

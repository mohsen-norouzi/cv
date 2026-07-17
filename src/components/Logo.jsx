export default function Logo() {
	return (
		<svg
			width="26"
			height="26"
			viewBox="0 0 26 26"
			fill="none"
			aria-label="Logo"
			role="img"
		>
			{/* Left wing — vertical bar with inward semicircle */}
			<path
				d="M2 2h8v7.2A6.2 6.2 0 0 0 4.8 13 6.2 6.2 0 0 0 10 16.8V24H2V2Z"
				fill="currentColor"
			/>
			{/* Right wing — mirrored */}
			<path
				d="M24 2h-8v7.2A6.2 6.2 0 0 1 21.2 13 6.2 6.2 0 0 1 16 16.8V24h8V2Z"
				fill="currentColor"
			/>
		</svg>
	);
}

import { useSyncExternalStore } from "react";
import {
	getScrollProgress,
	requestSnapTo,
	subscribeScroll,
} from "../experience/scrollStore";
import Logo from "./Logo";

const getWorkActive = () => getScrollProgress() > 0;
export default function Navbar() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getWorkActive,
		getWorkActive,
	);
	return (
		<header className="site-header">
			<button
				type="button"
				className="brand"
				aria-label="Back to start"
				onClick={() => requestSnapTo(0)}
			>
				<Logo />
				<span>
					MOHSEN<span className="brand-role">DESIGN & DEVELOPMENT</span>
				</span>
			</button>
			<nav aria-label="Main navigation">
				<a
					className="nav-instagram"
					href="https://www.instagram.com/mohsenized/"
					target="_blank"
					rel="noreferrer"
					aria-label="Instagram — @mohsenized (opens in a new tab)"
					title="Instagram · @mohsenized"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						aria-hidden="true"
						focusable="false"
					>
						<rect x="3" y="3" width="18" height="18" rx="5" />
						<circle cx="12" cy="12" r="4" />
						<circle
							cx="17.5"
							cy="6.5"
							r="1"
							fill="currentColor"
							stroke="none"
						/>
					</svg>
				</a>
				<button
					type="button"
					className={progress ? "nav-work active" : "nav-work"}
					onClick={() => requestSnapTo(1)}
				>
					Work
				</button>
				<a href="/resume.pdf" target="_blank" rel="noreferrer">
					Resume <span aria-hidden="true">↗</span>
				</a>
				<a href="mailto:hello@itsmohsen.com">
					Let's talk <span className="contact-dot" aria-hidden="true" />
				</a>
			</nav>
		</header>
	);
}

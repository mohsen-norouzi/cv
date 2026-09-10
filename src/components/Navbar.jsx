import { useSyncExternalStore } from "react";
import {
	getScrollProgress,
	requestSnapTo,
	subscribeScroll,
} from "../experience/scrollStore";
import { setWalking } from "../experience/walkStore";
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
				<button
					type="button"
					className="nav-walk"
					onClick={() => setWalking(true)}
				>
					Walk the coast
				</button>
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

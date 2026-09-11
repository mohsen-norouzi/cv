import { requestSnapTo } from "../experience/scrollStore";
import LiveSkyControl from "./LiveSkyControl";
import Logo from "./Logo";

export default function Navbar() {
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
			<div className="header-actions">
				<LiveSkyControl />
				<nav aria-label="Main navigation">
					<a href="mailto:hello@itsmohsen.com">
						Let's talk <span className="contact-dot" aria-hidden="true" />
					</a>
				</nav>
			</div>
		</header>
	);
}

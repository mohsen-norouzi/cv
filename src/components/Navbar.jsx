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
			</div>
		</header>
	);
}

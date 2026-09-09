import { lazy, memo, Suspense, useState } from "react";
import HeroContent from "./components/HeroContent";
import MusicToggle from "./components/MusicToggle";
import Navbar from "./components/Navbar";
import SceneErrorBoundary from "./components/SceneErrorBoundary";
import SceneLoader from "./components/SceneLoader";
import ScrollCue from "./components/ScrollCue";
import ScrollPath from "./components/ScrollPath";
import SectionCaption from "./components/SectionCaption";
import ScrollStealer from "./experience/ScrollStealer";

const SceneCanvas = memo(lazy(() => import("./SceneCanvas")));

function App() {
	const [entered, setEntered] = useState(false);
	return (
		<div className="portfolio relative h-full w-full overflow-hidden bg-[#eee4d8]">
			{entered && <ScrollStealer />}
			<div inert={!entered} className="absolute inset-0">
				<SceneErrorBoundary>
					<Suspense fallback={null}>
						<SceneCanvas />
					</Suspense>
				</SceneErrorBoundary>
			</div>

			<SceneLoader entered={entered} onEnter={() => setEntered(true)} />

			<div
				inert={!entered}
				className="pointer-events-none absolute inset-0 z-10"
			>
				{/* Soft edge fades — long falloffs, no hard bands */}
				<div
					aria-hidden
					className="page-edge-fade pointer-events-none absolute inset-0"
				/>
				<div className="pointer-events-auto">
					<Navbar />
				</div>
				<HeroContent entered={entered} />
				<SectionCaption />
				<ScrollPath />
				<ScrollCue />
				<MusicToggle />
			</div>
		</div>
	);
}

export default App;

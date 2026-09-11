import { lazy, memo, Suspense, useState, useEffect } from "react";
import TemplateCollection from "./components/TemplateCollection";
import { useCollectionOpen } from "./experience/collectionStore";
import LiveSkyControl from "./components/LiveSkyControl";
import HeroContent from "./components/HeroContent";
import MusicToggle from "./components/MusicToggle";
import Navbar from "./components/Navbar";
import SceneErrorBoundary from "./components/SceneErrorBoundary";
import SceneLoader from "./components/SceneLoader";
import ScrollCue from "./components/ScrollCue";
import ScrollPath from "./components/ScrollPath";
import SectionCaption from "./components/SectionCaption";
import WalkEntry from "./components/WalkEntry";
import WalkControls from "./components/WalkControls";
import ScrollStealer from "./experience/ScrollStealer";
import { setAudioEnvironment } from "./experience/audioStore";
import { useSky } from "./experience/skyStore";
import { useWalking } from "./experience/walkStore";

const SceneCanvas = memo(lazy(() => import("./SceneCanvas")));

function App() {
	const [entered, setEntered] = useState(false);
	const walking = useWalking();
	const collectionOpen = useCollectionOpen();
	const sky = useSky();
	useEffect(() => setAudioEnvironment(sky), [sky]);
	return (
		<div
			className={`portfolio ${sky.daylight < 0.4 ? "is-night" : ""} relative h-full w-full overflow-hidden bg-[#eee4d8]`}
		>
			{entered && !walking && !collectionOpen && <ScrollStealer />}
			<div inert={!entered || collectionOpen} className="absolute inset-0">
				<SceneErrorBoundary>
					<Suspense fallback={null}>
						<SceneCanvas />
					</Suspense>
				</SceneErrorBoundary>
			</div>

			<SceneLoader
				entered={entered}
				onEnter={() => setEntered(true)}
				sky={sky}
			/>

			<div
				inert={!entered || collectionOpen}
				className="pointer-events-none absolute inset-0 z-10"
			>
				{!walking && (
					<>
						<div
							aria-hidden
							className="page-edge-fade pointer-events-none absolute inset-0"
						/>
						<div className="pointer-events-auto">
							<Navbar />
						</div>
						<HeroContent entered={entered} />
						<SectionCaption />
						<ScrollCue />
						<WalkEntry />
					</>
				)}
				{entered && walking && <WalkControls />}
				<div className={`scene-navigation ${walking ? "is-walking" : ""}`}>
					<LiveSkyControl />
					{!walking && <ScrollPath />}
				</div>
				<MusicToggle />
			</div>
			<TemplateCollection />
		</div>
	);
}

export default App;

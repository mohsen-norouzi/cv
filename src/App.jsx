import HeroContent from "./components/HeroContent";
import Navbar from "./components/Navbar";
import ScrollIndicator from "./components/ScrollIndicator";

function App() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-[#6b6b6b]">
			<Navbar />
			<HeroContent />
			<ScrollIndicator active="02" />
		</div>
	);
}

export default App;

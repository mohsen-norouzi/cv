import Atmosphere from "./experience/Atmosphere";
import CameraRig from "./experience/CameraRig";
import Lights from "./experience/Lights";
import Mist from "./experience/Mist";
import Mountain from "./experience/Mountain";
import PostFX from "./experience/PostFX";
import SkyDome from "./experience/SkyDome";
import { useLampControls } from "./experience/useLampControls";

export default function Experience() {
	const lamps = useLampControls();

	return (
		<>
			<Atmosphere />
			<SkyDome />
			<CameraRig />
			<Lights lamps={lamps} />
			<Mountain lamps={lamps} />
			<Mist />
			<PostFX />
		</>
	);
}

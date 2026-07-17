import { OrbitControls } from "@react-three/drei";
import { Perf } from "r3f-perf";

export default function Experience() {
	return (
		<>
			<Perf />
			<OrbitControls />
			<ambientLight intensity={1} />

			<mesh>
				<boxGeometry />
				<meshStandardMaterial color="red" />
			</mesh>
		</>
	);
}

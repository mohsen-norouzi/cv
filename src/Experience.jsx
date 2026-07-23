import { OrbitControls } from "@react-three/drei";

export default function Experience({ project }) {
	return (
		<>
			<OrbitControls enableZoom={false} enablePan={false} />
			<ambientLight intensity={1.2} />
			<directionalLight position={[4, 6, 2]} intensity={1.4} />

			{/* Placeholder — replace with per-project models later */}
			<mesh position={[0.6, -0.2, 0]} rotation={[0, 0.4, 0]}>
				<boxGeometry args={[1.2, 1.2, 1.2]} />
				<meshStandardMaterial
					color={project?.accent ?? "#c9c2b6"}
					roughness={0.55}
					metalness={0.05}
				/>
			</mesh>
		</>
	);
}

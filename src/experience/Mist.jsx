import { useMemo } from "react";
import * as THREE from "three";

export default function Mist() {
	const mistMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: "#b8a8b0",
				transparent: true,
				opacity: 0.06,
				depthWrite: false,
				side: THREE.DoubleSide,
			}),
		[],
	);

	return (
		<group>
			<mesh position={[8, 5, 4]} material={mistMat} renderOrder={2}>
				<planeGeometry args={[70, 24]} />
			</mesh>
			<mesh
				position={[12, 7, -10]}
				rotation={[0, 0.25, 0]}
				material={mistMat}
				renderOrder={2}
			>
				<planeGeometry args={[80, 28]} />
			</mesh>
		</group>
	);
}

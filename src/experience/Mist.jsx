import { useMemo } from "react";
import * as THREE from "three";

export default function Mist() {
	const mistMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: "#e6d2ae",
				transparent: true,
				opacity: 0.1,
				depthWrite: false,
				side: THREE.DoubleSide,
			}),
		[],
	);

	return (
		<group>
			<mesh position={[6, 6, 8]} material={mistMat} renderOrder={2}>
				<planeGeometry args={[70, 28]} />
			</mesh>
			<mesh
				position={[10, 8, -6]}
				rotation={[0, 0.2, 0]}
				material={mistMat}
				renderOrder={2}
			>
				<planeGeometry args={[80, 32]} />
			</mesh>
			<mesh
				position={[4, 5, 18]}
				rotation={[0, -0.15, 0]}
				material={mistMat}
				renderOrder={2}
			>
				<planeGeometry args={[50, 20]} />
			</mesh>
		</group>
	);
}

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Soft valley haze — one low-opacity plane only (no stacked banding).
 */
export default function Mist() {
	const mistMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: "#f0c9a4",
				transparent: true,
				opacity: 0.11,
				depthWrite: false,
				fog: false,
				side: THREE.DoubleSide,
			}),
		[],
	);

	return (
		<group>
			<mesh
				position={[10, 1.4, 4]}
				rotation={[-Math.PI / 2.08, 0, 0.12]}
				material={mistMat}
				renderOrder={2}
			>
				<planeGeometry args={[90, 70]} />
			</mesh>
		</group>
	);
}

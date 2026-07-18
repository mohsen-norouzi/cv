import { useMemo } from "react";
import * as THREE from "three";
import { FOG_COLOR } from "./constants";

/**
 * Very soft ground haze only — hard stacked fog planes caused visible
 * banding / “lines” when the camera parallax moved.
 */
export default function Mist() {
	const mistMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: FOG_COLOR,
				transparent: true,
				opacity: 0.08,
				depthWrite: false,
				fog: false,
				side: THREE.DoubleSide,
			}),
		[],
	);

	return (
		<group>
			<mesh
				position={[10, 1.6, 2]}
				rotation={[-Math.PI / 2.05, 0, 0.15]}
				material={mistMat}
				renderOrder={2}
			>
				<planeGeometry args={[100, 80]} />
			</mesh>
		</group>
	);
}

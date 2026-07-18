import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BIG_LAMP_INTENSITY } from "./constants";
import { flicker, hashSeed } from "./flicker";

const MODEL_URL = "/Try1.glb?v=6";
const FILL_RATIO = 1.5;
/** Raise from mesh origin toward the lantern glass */
const LANTERN_Y_OFFSET = 1.85;

/**
 * One flickering point light per Street_Light* mesh.
 * New lights in the glb are picked up automatically, each with its own seed.
 */
export default function StreetLamps() {
	const { scene } = useGLTF(MODEL_URL);
	const [lamps, setLamps] = useState([]);
	const lightRefs = useRef([]);

	useLayoutEffect(() => {
		scene.updateMatrixWorld(true);
		const next = [];

		scene.traverse((child) => {
			if (!child.isMesh) return;
			if (!/^Street_Light/i.test(child.name)) return;

			const position = new THREE.Vector3();
			child.getWorldPosition(position);
			position.y += LANTERN_Y_OFFSET;

			next.push({
				key: child.name,
				position: [position.x, position.y, position.z],
				seed: hashSeed(child.name),
			});
		});

		lightRefs.current = [];
		setLamps(next);
	}, [scene]);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		for (let i = 0; i < lamps.length; i++) {
			const light = lightRefs.current[i];
			if (!light) continue;
			light.intensity =
				BIG_LAMP_INTENSITY * FILL_RATIO * flicker(t, lamps[i].seed);
		}
	});

	return (
		<>
			{lamps.map((lamp, i) => (
				<pointLight
					key={lamp.key}
					ref={(el) => {
						lightRefs.current[i] = el;
					}}
					position={lamp.position}
					intensity={BIG_LAMP_INTENSITY * FILL_RATIO}
					color="#ffb56a"
					distance={12}
					decay={2}
				/>
			))}
		</>
	);
}

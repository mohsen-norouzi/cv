import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BIG_LAMP_INTENSITY } from "./constants";
import { flicker, hashSeed } from "./flicker";

const MODEL_URL = "/Try1.glb?v=7";
const FILL_RATIO = 2.4;
const LANTERN_Y_OFFSET = 1.85;
/** Cap realtime lights — each point light multiplies fragment cost */
const MAX_LAMPS = 2;

export default function StreetLamps() {
	const { scene } = useGLTF(MODEL_URL);
	const { camera } = useThree();
	const [lamps, setLamps] = useState([]);
	const lightRefs = useRef([]);
	const camPos = useRef(new THREE.Vector3());

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
				position,
				seed: hashSeed(child.name),
			});
		});

		lightRefs.current = [];
		setLamps(next);
	}, [scene]);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		camera.getWorldPosition(camPos.current);

		// Pick the N nearest lamps to the camera
		const ranked = lamps
			.map((lamp, index) => ({
				index,
				dist: lamp.position.distanceToSquared(camPos.current),
			}))
			.sort((a, b) => a.dist - b.dist);

		const active = new Set(ranked.slice(0, MAX_LAMPS).map((r) => r.index));

		for (let i = 0; i < lamps.length; i++) {
			const light = lightRefs.current[i];
			if (!light) continue;
			if (active.has(i)) {
				light.visible = true;
				light.intensity =
					BIG_LAMP_INTENSITY * FILL_RATIO * flicker(t, lamps[i].seed);
			} else {
				light.visible = false;
				light.intensity = 0;
			}
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
					position={lamp.position.toArray()}
					intensity={0}
					color="#ffb56a"
					distance={14}
					decay={2}
				/>
			))}
		</>
	);
}

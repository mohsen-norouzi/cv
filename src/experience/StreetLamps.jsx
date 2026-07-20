import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BIG_LAMP_INTENSITY } from "./constants";
import { getFocusAmount } from "./focusStore";
import { flicker, hashSeed } from "./flicker";
import { MODEL_URL } from "./modelUrl";

/** Softer fill — hard pools of light were making lamps look weird */
const FILL_RATIO = 1.35;
const LANTERN_Y_OFFSET = 1.85;
/** Cap realtime lights — each point light multiplies fragment cost */
const MAX_LAMPS = 3;
const HALO_SIZE = 3.6;

/** Soft circular glow — no star rays (those read as UI sparkles, not lanterns) */
function createHaloTexture() {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const c = size / 2;
	const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
	grad.addColorStop(0, "rgba(255,245,220,0.95)");
	grad.addColorStop(0.12, "rgba(255,210,130,0.55)");
	grad.addColorStop(0.35, "rgba(255,170,80,0.18)");
	grad.addColorStop(0.65, "rgba(255,140,50,0.05)");
	grad.addColorStop(1, "rgba(255,120,40,0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

export default function StreetLamps() {
	const { scene } = useGLTF(MODEL_URL);
	const { camera } = useThree();
	const [lamps, setLamps] = useState([]);
	const lightRefs = useRef([]);
	const haloRef = useRef(null);
	const camPos = useRef(new THREE.Vector3());
	const dummy = useMemo(() => new THREE.Object3D(), []);
	const haloTex = useMemo(() => createHaloTexture(), []);

	const haloMat = useMemo(() => {
		if (!haloTex) return null;
		return new THREE.MeshBasicMaterial({
			map: haloTex,
			color: "#ffc078",
			transparent: true,
			depthWrite: false,
			depthTest: true,
			toneMapped: false,
			blending: THREE.AdditiveBlending,
			opacity: 0.85,
		});
	}, [haloTex]);

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

		const ranked = lamps
			.map((lamp, index) => ({
				index,
				dist: lamp.position.distanceToSquared(camPos.current),
			}))
			.sort((a, b) => a.dist - b.dist);

		const active = new Set(ranked.slice(0, MAX_LAMPS).map((r) => r.index));
		const halo = haloRef.current;
		const world = 1 - getFocusAmount() * 0.85;

		for (let i = 0; i < lamps.length; i++) {
			const lamp = lamps[i];
			const live = flicker(t, lamp.seed);
			const light = lightRefs.current[i];

			if (light) {
				if (active.has(i)) {
					light.visible = true;
					light.intensity =
						BIG_LAMP_INTENSITY * FILL_RATIO * live * world;
				} else {
					light.visible = false;
					light.intensity = 0;
				}
			}

			// All lamps keep a soft halo (cheap, 1 draw call) so they never look like hard yellow cubes
			if (halo) {
				const s = HALO_SIZE * (0.88 + live * 0.22);
				dummy.position.copy(lamp.position);
				dummy.scale.setScalar(s);
				dummy.quaternion.copy(camera.quaternion);
				dummy.updateMatrix();
				halo.setMatrixAt(i, dummy.matrix);
			}
		}

		if (halo) {
			halo.instanceMatrix.needsUpdate = true;
			if (haloMat) {
				haloMat.opacity = 0.72 + Math.sin(t * 0.7) * 0.06;
			}
		}
	});

	if (!haloMat || lamps.length === 0) {
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
						distance={11}
						decay={2}
					/>
				))}
			</>
		);
	}

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
					color="#ffc48a"
					distance={11}
					decay={2}
				/>
			))}
			<instancedMesh
				ref={haloRef}
				args={[undefined, undefined, lamps.length]}
				frustumCulled={false}
				renderOrder={8}
			>
				<planeGeometry args={[1, 1]} />
				<primitive object={haloMat} attach="material" />
			</instancedMesh>
		</>
	);
}

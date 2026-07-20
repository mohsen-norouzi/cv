import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
	AMBIENT_COLOR,
	AMBIENT_INT,
	FILL_COLOR,
	FILL_INT,
	HEMI_GROUND,
	HEMI_INT,
	HEMI_SKY,
	KEY_COLOR,
	KEY_INT,
	LIGHTHOUSE_INTENSITY,
	LIGHTHOUSE_LAMP,
	RIM_COLOR,
	RIM_INT,
	SUN_POSITION,
} from "./constants";
import { getFocusAmount } from "./focusStore";
import { flicker } from "./flicker";
import SceneFocus from "./SceneFocus";
import StreetLamps from "./StreetLamps";
import { IS_MOBILE, MOBILE_LIGHT_BOOST, SHADOW_MAP_SIZE } from "./device";

const LH_FILL_RATIO = 1.4;

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
	grad.addColorStop(0.15, "rgba(255,200,120,0.45)");
	grad.addColorStop(0.45, "rgba(255,160,70,0.12)");
	grad.addColorStop(1, "rgba(255,120,40,0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

export default function Lights() {
	const ambient = useRef(null);
	const hemi = useRef(null);
	const keyLight = useRef(null);
	const fill = useRef(null);
	const rim = useRef(null);
	const lighthouse = useRef(null);
	const lhHalo = useRef(null);
	const haloTex = useMemo(() => createHaloTexture(), []);

	useFrame(({ clock }) => {
		const live = flicker(clock.elapsedTime, 1.4);
		const focus = getFocusAmount();
		const world = 1 - focus * 0.85;
		if (lighthouse.current) {
			lighthouse.current.intensity =
				LIGHTHOUSE_INTENSITY * LH_FILL_RATIO * live * world;
		}
		if (lhHalo.current) {
			lhHalo.current.material.opacity = 0.55 * live * world;
			lhHalo.current.scale.setScalar(5.5 * (0.9 + live * 0.2));
		}
	});

	return (
		<>
			<ambientLight
				ref={ambient}
				intensity={AMBIENT_INT * MOBILE_LIGHT_BOOST}
				color={AMBIENT_COLOR}
			/>
			<hemisphereLight
				ref={hemi}
				skyColor={HEMI_SKY}
				groundColor={HEMI_GROUND}
				intensity={HEMI_INT * MOBILE_LIGHT_BOOST}
			/>
			{/* Sun — shadows desktop-only; many Android GPUs blank the scene with shadow maps */}
			<directionalLight
				ref={keyLight}
				position={SUN_POSITION}
				intensity={KEY_INT * MOBILE_LIGHT_BOOST}
				color={KEY_COLOR}
				castShadow={!IS_MOBILE}
				shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
				shadow-camera-near={2}
				shadow-camera-far={130}
				shadow-camera-left={-40}
				shadow-camera-right={48}
				shadow-camera-top={44}
				shadow-camera-bottom={-30}
				shadow-bias={-0.0002}
				shadow-normalBias={0.05}
			/>
			<directionalLight
				ref={fill}
				position={[50, 18, 30]}
				intensity={FILL_INT * MOBILE_LIGHT_BOOST}
				color={FILL_COLOR}
			/>
			<directionalLight
				ref={rim}
				position={[-20, 8, 40]}
				intensity={RIM_INT * MOBILE_LIGHT_BOOST}
				color={RIM_COLOR}
			/>
			<StreetLamps />
			<pointLight
				ref={lighthouse}
				position={LIGHTHOUSE_LAMP}
				intensity={LIGHTHOUSE_INTENSITY * LH_FILL_RATIO}
				color="#ffc48a"
				distance={20}
				decay={2}
			/>
			{haloTex && (
				<Billboard follow position={LIGHTHOUSE_LAMP}>
					<mesh ref={lhHalo} renderOrder={8} scale={5.5}>
						<planeGeometry args={[1, 1]} />
						<meshBasicMaterial
							map={haloTex}
							color="#ffc078"
							transparent
							depthWrite={false}
							toneMapped={false}
							blending={THREE.AdditiveBlending}
							opacity={0.55}
						/>
					</mesh>
				</Billboard>
			)}
			<SceneFocus
				ambient={ambient}
				hemi={hemi}
				keyLight={keyLight}
				fill={fill}
				rim={rim}
			/>
		</>
	);
}

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
	AMBIENT_INT,
	BAKERY_POSITION,
	CRYSTAL_POSITION,
	FILL_INT,
	GIRL_POSITION,
	HEMI_INT,
	KEY_INT,
	RIM_INT,
} from "./constants";
import {
	computeFocus,
	setFocus,
	setFocusReveal,
} from "./focusStore";
import {
	continueSnapAfterExit,
	getScrollProgress,
	isExitPending,
	isScrollAnimating,
} from "./scrollStore";

/** Warm stage key */
const SPOT_COLOR = "#ffe0a8";

const STOPS = [null, GIRL_POSITION, BAKERY_POSITION, CRYSTAL_POSITION];

/** Baked per-stop stage spots */
const SPOTS = {
	girl: {
		intensity: 79.5,
		pos: [-0.2, 6.4, -0.4],
		look: [0, 0, 0],
		angle: 0.26,
		pool: 2,
	},
	bakery: {
		intensity: 138,
		pos: [0.05, 9.05, 5.9],
		look: [-0.75, -1.05, 0.4],
		angle: 0.13,
		pool: 2.45,
	},
	crystal: {
		intensity: 120,
		pos: [4.65, 7.2, 0.9],
		look: [0, 0.05, 0],
		angle: 0.19,
		pool: 1.65,
	},
};

function createBeamTexture() {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const img = ctx.createImageData(size, size);
	for (let y = 0; y < size; y++) {
		const tipFade = (y / (size - 1)) ** 0.45;
		for (let x = 0; x < size; x++) {
			const nx = (x / (size - 1)) * 2 - 1;
			const radial = Math.exp(-nx * nx * 1.6);
			const a = Math.floor(255 * radial * tipFade * 0.4);
			const i = (y * size + x) * 4;
			img.data[i] = 255;
			img.data[i + 1] = 255;
			img.data[i + 2] = 255;
			img.data[i + 3] = a;
		}
	}
	ctx.putImageData(img, 0, 0);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

function createPoolTexture() {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	const c = size / 2;
	const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
	grad.addColorStop(0, "rgba(255,255,255,0.45)");
	grad.addColorStop(0.45, "rgba(255,255,255,0.14)");
	grad.addColorStop(0.8, "rgba(255,255,255,0.03)");
	grad.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

/**
 * One warm stage spot + soft shaft/pool. Values baked — no Leva.
 */
export default function SceneFocus({
	ambient,
	hemi,
	keyLight,
	fill,
	rim,
}) {
	const { scene } = useThree();
	const focus = useRef(0);
	const spotAmt = useRef(0);
	const textAmt = useRef(0);
	const hold = useRef(0);
	const lastStop = useRef(0);
	/** 0 idle · 1 hide text · 2 hide light · 3 hand off to camera */
	const exitStage = useRef(0);
	const target = useMemo(() => new THREE.Object3D(), []);
	const light = useRef(null);
	const beam = useRef(null);
	const pool = useRef(null);
	const from = useMemo(() => new THREE.Vector3(), []);
	const to = useMemo(() => new THREE.Vector3(), []);
	const mid = useMemo(() => new THREE.Vector3(), []);
	const dir = useMemo(() => new THREE.Vector3(), []);
	const quat = useMemo(() => new THREE.Quaternion(), []);
	const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
	const beamTex = useMemo(() => createBeamTexture(), []);
	const poolTex = useMemo(() => createPoolTexture(), []);

	useLayoutEffect(() => {
		scene.add(target);
		return () => scene.remove(target);
	}, [scene, target]);

	useFrame((_, delta) => {
		const { amount, stop } = computeFocus(getScrollProgress());
		focus.current = THREE.MathUtils.damp(focus.current, amount, 5, delta);
		const f = focus.current;
		setFocus(f, stop);

		// Reset staged reveals when changing stops (after camera move)
		if (stop !== lastStop.current && !isExitPending()) {
			lastStop.current = stop;
			hold.current = 0;
			spotAmt.current = 0;
			textAmt.current = 0;
			exitStage.current = 0;
		}

		let spotTarget = 0;
		let textTarget = 0;

		if (isExitPending()) {
			/**
			 * Leave sequence: text out → light out → then move camera
			 */
			if (exitStage.current === 0) exitStage.current = 1;

			if (exitStage.current === 1) {
				textTarget = 0;
				spotTarget = 1; // keep spot while text leaves
				if (textAmt.current < 0.15) exitStage.current = 2;
			} else if (exitStage.current === 2) {
				// Kill light and move in the same beat
				textTarget = 0;
				spotTarget = 0;
				spotAmt.current = 0;
				textAmt.current = 0;
				exitStage.current = 3;
				continueSnapAfterExit();
			} else {
				textTarget = 0;
				spotTarget = 0;
			}

			if (exitStage.current === 1) {
				textAmt.current = THREE.MathUtils.damp(
					textAmt.current,
					textTarget,
					12,
					delta,
				);
				spotAmt.current = THREE.MathUtils.damp(
					spotAmt.current,
					spotTarget,
					8,
					delta,
				);
			}
		} else {
			exitStage.current = 0;

			/**
			 * Arrive sequence: wait until settled → light in → text in
			 */
			const arrived =
				stop >= 1 &&
				f > 0.92 &&
				!isScrollAnimating() &&
				amount > 0.9;
			if (arrived) hold.current += delta;
			else hold.current = 0;

			spotTarget = arrived && hold.current > 0.55 ? 1 : 0;
			spotAmt.current = THREE.MathUtils.damp(
				spotAmt.current,
				spotTarget,
				spotTarget > 0 ? 1.05 : 5,
				delta,
			);
			textTarget =
				arrived && spotAmt.current > 0.72 && hold.current > 1.1 ? 1 : 0;
			textAmt.current = THREE.MathUtils.damp(
				textAmt.current,
				textTarget,
				textTarget > 0 ? 2 : 7,
				delta,
			);
		}

		setFocusReveal(spotAmt.current, textAmt.current);

		const s = spotAmt.current;
		const subject = STOPS[stop] ?? STOPS[1];
		const spot =
			stop === 2 ? SPOTS.bakery : stop === 3 ? SPOTS.crystal : SPOTS.girl;

		const [ox, oy, oz] = spot.pos;
		const [lx, ly, lz] = spot.look;
		const beamR = spot.pool * 0.5;

		from.set(subject.x + ox, subject.y + oy, subject.z + oz);
		to.set(subject.x + lx, subject.y + ly, subject.z + lz);

		if (ambient.current) {
			ambient.current.intensity = THREE.MathUtils.lerp(
				AMBIENT_INT,
				AMBIENT_INT * 0.12,
				f,
			);
		}
		if (hemi.current) {
			hemi.current.intensity = THREE.MathUtils.lerp(HEMI_INT, HEMI_INT * 0.1, f);
		}
		if (keyLight.current) {
			keyLight.current.intensity = THREE.MathUtils.lerp(KEY_INT, 0, f);
			keyLight.current.visible = f < 0.95;
		}
		if (fill.current) {
			fill.current.intensity = THREE.MathUtils.lerp(FILL_INT, FILL_INT * 0.08, f);
		}
		if (rim.current) {
			rim.current.intensity = THREE.MathUtils.lerp(RIM_INT, RIM_INT * 0.1, f);
		}
		if (scene.environmentIntensity != null) {
			scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.18, f);
		}

		target.position.copy(to);

		const on = s > 0.01;
		if (light.current) {
			light.current.position.copy(from);
			light.current.target = target;
			light.current.target.updateMatrixWorld();
			light.current.intensity = spot.intensity * s;
			light.current.angle = spot.angle;
			light.current.visible = on;
		}

		if (beam.current) {
			const len = Math.max(from.distanceTo(to), 0.01);
			mid.copy(from).add(to).multiplyScalar(0.5);
			beam.current.position.copy(mid);
			beam.current.scale.set(beamR, len, beamR);
			dir.copy(to).sub(from).normalize();
			quat.setFromUnitVectors(up, dir);
			beam.current.quaternion.copy(quat);
			beam.current.material.opacity = 0.22 * s;
			beam.current.visible = on;
		}

		if (pool.current) {
			pool.current.position.set(to.x, subject.y + 0.03, to.z);
			pool.current.material.opacity = 0.35 * s;
			pool.current.visible = on;
			pool.current.scale.setScalar(spot.pool);
		}
	});

	return (
		<>
			<spotLight
				ref={light}
				color={SPOT_COLOR}
				castShadow={false}
				penumbra={0.72}
				distance={22}
				decay={1.7}
				intensity={0}
			/>
			{beamTex && (
				<mesh ref={beam} renderOrder={5} frustumCulled={false} visible={false}>
					<cylinderGeometry args={[1, 0.06, 1, 16, 1, true]} />
					<meshBasicMaterial
						map={beamTex}
						color={SPOT_COLOR}
						transparent
						depthWrite={false}
						depthTest
						toneMapped={false}
						blending={THREE.AdditiveBlending}
						side={THREE.DoubleSide}
						opacity={0}
					/>
				</mesh>
			)}
			{poolTex && (
				<mesh
					ref={pool}
					rotation={[-Math.PI / 2, 0, 0]}
					renderOrder={3}
					visible={false}
				>
					<planeGeometry args={[1, 1]} />
					<meshBasicMaterial
						map={poolTex}
						color={SPOT_COLOR}
						transparent
						depthWrite={false}
						toneMapped={false}
						blending={THREE.AdditiveBlending}
						opacity={0}
					/>
				</mesh>
			)}
		</>
	);
}

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
import { IS_MOBILE } from "./device";
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

/** Beam dust — tuned final values (fewer motes on mobile) */
const DUST_COUNT = IS_MOBILE ? 28 : 80;
const DUST_SIZE = 0.46;
const DUST_OPACITY = 1;
const DUST_DRIFT = 0.01;
const DUST_FADE = 0.35;
const DUST_SPREAD = 1;

/** Place a mote somewhere inside the beam volume (not streaming from the lamp). */
function seedDust(sp) {
	sp.t = 0.08 + Math.random() * 0.84;
	sp.r = Math.random();
	sp.a = Math.random() * Math.PI * 2;
	sp.vt = (Math.random() - 0.5) * 2;
	sp.vr = (Math.random() - 0.5) * 2;
	sp.va = (Math.random() - 0.5) * 2;
	sp.life = Math.random();
	sp.lifeDir = Math.random() > 0.5 ? 1 : -1;
	sp.lifeSpeed = 0.5 + Math.random();
	sp.sizeJitter = 0.7 + Math.random() * 0.6;
}

/**
 * One warm stage spot + soft shaft/pool + floating dust dots.
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
	const dustRef = useRef(null);
	const from = useMemo(() => new THREE.Vector3(), []);
	const to = useMemo(() => new THREE.Vector3(), []);
	const mid = useMemo(() => new THREE.Vector3(), []);
	const dir = useMemo(() => new THREE.Vector3(), []);
	const quat = useMemo(() => new THREE.Quaternion(), []);
	const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
	const side = useMemo(() => new THREE.Vector3(), []);
	const bitangent = useMemo(() => new THREE.Vector3(), []);
	const dustPos = useMemo(() => new THREE.Vector3(), []);
	const axisTmp = useMemo(() => new THREE.Vector3(), []);
	const beamTex = useMemo(() => createBeamTexture(), []);
	const poolTex = useMemo(() => createPoolTexture(), []);

	const dustState = useMemo(
		() =>
			Array.from({ length: DUST_COUNT }, () => {
				const sp = {};
				seedDust(sp);
				return sp;
			}),
		[],
	);

	const dustGeo = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(DUST_COUNT * 3);
		const alphas = new Float32Array(DUST_COUNT);
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
		return geo;
	}, []);

	const dustMat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				transparent: true,
				depthWrite: false,
				depthTest: true,
				blending: THREE.AdditiveBlending,
				toneMapped: false,
				uniforms: {
					uColor: { value: new THREE.Color(SPOT_COLOR) },
					uOpacity: { value: 0 },
					uSize: { value: DUST_SIZE },
					uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
				},
				vertexShader: /* glsl */ `
					attribute float aAlpha;
					uniform float uSize;
					uniform float uPixelRatio;
					varying float vAlpha;
					void main() {
						vAlpha = aAlpha;
						vec4 mv = modelViewMatrix * vec4(position, 1.0);
						gl_PointSize = max(0.5, uSize * uPixelRatio * (28.0 / max(0.1, -mv.z)));
						gl_Position = projectionMatrix * mv;
					}
				`,
				fragmentShader: /* glsl */ `
					uniform vec3 uColor;
					uniform float uOpacity;
					varying float vAlpha;
					void main() {
						// Hard circular DOT
						vec2 p = gl_PointCoord - 0.5;
						float d = length(p);
						if (d > 0.42) discard;
						float edge = smoothstep(0.42, 0.28, d);
						float a = edge * vAlpha * uOpacity;
						if (a < 0.01) discard;
						gl_FragColor = vec4(uColor, a);
					}
				`,
			}),
		[],
	);

	useLayoutEffect(() => {
		scene.add(target);
		return () => {
			scene.remove(target);
			dustGeo.dispose();
			dustMat.dispose();
		};
	}, [scene, target, dustGeo, dustMat]);

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

		if (dustRef.current && dustMat) {
			dustRef.current.visible = on;
			dustMat.uniforms.uOpacity.value = DUST_OPACITY * s;

			if (on) {
				const len = Math.max(from.distanceTo(to), 0.01);
				dir.copy(to).sub(from).normalize();
				axisTmp.set(1, 0, 0);
				if (Math.abs(dir.dot(axisTmp)) > 0.9) axisTmp.set(0, 0, 1);
				side.crossVectors(dir, axisTmp).normalize();
				bitangent.crossVectors(dir, side).normalize();

				const posAttr = dustGeo.attributes.position;
				const alphaAttr = dustGeo.attributes.aAlpha;

				for (let i = 0; i < DUST_COUNT; i++) {
					const sp = dustState[i];

					// Slow random wander inside the volume
					sp.t += sp.vt * DUST_DRIFT * delta;
					sp.r += sp.vr * DUST_DRIFT * delta;
					sp.a += sp.va * DUST_DRIFT * delta * 1.5;

					if (sp.t < 0.05 || sp.t > 0.95) sp.vt *= -1;
					if (sp.r < 0.05 || sp.r > 1) sp.vr *= -1;
					sp.t = THREE.MathUtils.clamp(sp.t, 0.05, 0.95);
					sp.r = THREE.MathUtils.clamp(sp.r, 0.05, 1);

					// Random appear / disappear (ping-pong life)
					sp.life += sp.lifeDir * sp.lifeSpeed * DUST_FADE * delta;
					if (sp.life >= 1) {
						sp.life = 1;
						sp.lifeDir = -1;
					} else if (sp.life <= 0) {
						seedDust(sp);
						sp.life = 0;
						sp.lifeDir = 1;
					}

					let fade = 1;
					if (sp.life < 0.25) fade = sp.life / 0.25;
					else if (sp.life > 0.75) fade = (1 - sp.life) / 0.25;

					const radius =
						THREE.MathUtils.lerp(0.06, 1, sp.t) *
						beamR *
						sp.r *
						DUST_SPREAD;
					dustPos
						.copy(from)
						.addScaledVector(dir, sp.t * len)
						.addScaledVector(side, Math.cos(sp.a) * radius)
						.addScaledVector(bitangent, Math.sin(sp.a) * radius);

					posAttr.setXYZ(i, dustPos.x, dustPos.y, dustPos.z);
					alphaAttr.setX(i, fade * sp.sizeJitter);
				}

				posAttr.needsUpdate = true;
				alphaAttr.needsUpdate = true;
			}
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
			<points
				ref={dustRef}
				geometry={dustGeo}
				material={dustMat}
				renderOrder={6}
				frustumCulled={false}
				visible={false}
			/>
		</>
	);
}

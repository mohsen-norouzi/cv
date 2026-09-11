import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TEMPLATE_BOARD } from "./templateBoardPlacement";
import { LANDMARKS } from "./coastLayout";
import { getFocusStop, getSpotReveal } from "./focusStore";
import { reducedMotion } from "./motion";
import { spotlightSettings } from "./spotlightSettings";

/** Warm stage key */
const SPOT_COLOR = "#ffe0a8";

const STOPS = [
	null,
	...LANDMARKS.map(({ position }) => new THREE.Vector3(...position)),
	new THREE.Vector3(...TEMPLATE_BOARD.position),
];

// One camera-facing shaft with a soft cross-section and a long source fade.
// The geometry extends beyond the visible light, so no rim or cone wall shows.
function createBeamMaterial() {
	return new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		depthTest: true,
		side: THREE.DoubleSide,
		forceSinglePass: true,
		blending: THREE.AdditiveBlending,
		toneMapped: false,
		uniforms: {
			uColor: { value: new THREE.Color(SPOT_COLOR) },
			uReveal: { value: 0 },
			uOpacity: { value: 0.27 },
			uSourceFade: { value: 0.55 },
			uSoftness: { value: 2.8 },
		},
		vertexShader: `
   varying vec2 vUv;
   void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
   }`,
		fragmentShader: `
   uniform vec3 uColor;
   uniform float uReveal;
   uniform float uOpacity;
   uniform float uSourceFade;
   uniform float uSoftness;
   varying vec2 vUv;
   void main() {
    // UV 0 is the narrow upper end; smoothly disappear over the upper half.
    float sourceFade = smoothstep(0.02, uSourceFade, vUv.y);
    float radius = mix(0.045, 0.77, vUv.y);
    float crossSection = abs(vUv.x * 2.0 - 1.0) / radius;
    float edgeFade = exp(-uSoftness * crossSection * crossSection) * (1.0 - smoothstep(0.75, 1.0, crossSection));
    float floorFade = 1.0 - smoothstep(0.88, 1.0, vUv.y);
    float alpha = uOpacity * uReveal * sourceFade * edgeFade * floorFade;
    if (alpha < 0.0005) discard;
    gl_FragColor = vec4(uColor, alpha);
   }`,
	});
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

/** Beam dust — tuned final values */
const DUST_COUNT = 80;
const DUST_SIZE = 0.95;
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
export default function SceneFocus() {
	const { scene } = useThree();
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
	const beamBasis = useMemo(() => new THREE.Matrix4(), []);
	const side = useMemo(() => new THREE.Vector3(), []);
	const bitangent = useMemo(() => new THREE.Vector3(), []);
	const dustPos = useMemo(() => new THREE.Vector3(), []);
	const axisTmp = useMemo(() => new THREE.Vector3(), []);
	const beamMat = useMemo(() => createBeamMaterial(), []);
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
		geo.setAttribute(
			"position",
			new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
		);
		geo.setAttribute(
			"aAlpha",
			new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage),
		);
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
					uPixelRatio: { value: 1 },
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
						float edge = (1.0 - smoothstep(0.28, 0.42, d));
						float a = edge * vAlpha * uOpacity;
						if (a < 0.01) discard;
						gl_FragColor = vec4(uColor * 2.0, a);
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
			beamMat.dispose();
			poolTex?.dispose();
		};
	}, [scene, target, dustGeo, dustMat, beamMat, poolTex]);

	useFrame(({ gl, camera }, elapsed) => {
		const delta = reducedMotion() ? 0 : Math.min(elapsed, 0.05);
		dustMat.uniforms.uPixelRatio.value = gl.getPixelRatio();
		const stop = getFocusStop();
		const s = stop > 0 ? getSpotReveal() : 0;

		const subject = STOPS[stop] ?? STOPS[1];
		const spot =
			stop === 2
				? spotlightSettings.bakery
				: stop === 3
					? spotlightSettings.next
					: stop === 4
						? spotlightSettings.collection
						: spotlightSettings.singer;

		const [ox, oy, oz] = spot.pos;
		const [lx, ly, lz] = spot.look;
		const beamR = spot.pool * 0.5;

		from.set(subject.x + ox, subject.y + oy, subject.z + oz);
		to.set(subject.x + lx, subject.y + ly, subject.z + lz);

		target.position.copy(to);

		const on = s > 0.01;
		if (light.current) {
			light.current.position.copy(from);
			light.current.target = target;
			light.current.target.updateMatrixWorld();
			light.current.intensity = spot.intensity * s;
			light.current.color.set(spot.color);
			light.current.penumbra = spot.penumbra;
			light.current.angle = Math.atan2(beamR, from.distanceTo(to));
			// Keep the light registered at zero intensity to avoid shader recompilation.
			light.current.visible = true;
		}

		if (beam.current) {
			const len = Math.max(from.distanceTo(to), 0.01);
			mid.copy(from).add(to).multiplyScalar(0.5);
			beam.current.position.copy(mid);
			beam.current.scale.set(beamR * 2.6, len, 1);
			dir.copy(to).sub(from).normalize();
			axisTmp.copy(camera.position).sub(mid);
			side.crossVectors(dir, axisTmp).normalize();
			bitangent.crossVectors(side, dir).normalize();
			beamBasis.makeBasis(side, dir, bitangent);
			quat.setFromRotationMatrix(beamBasis);
			beam.current.quaternion.copy(quat);
			beamMat.uniforms.uReveal.value = s;
			beamMat.uniforms.uOpacity.value = spot.beamOpacity;
			beamMat.uniforms.uSourceFade.value = spot.sourceFade;
			beamMat.uniforms.uSoftness.value = spot.softness;
			beamMat.uniforms.uColor.value.set(spot.color);
			beam.current.visible = on;
		}

		if (pool.current) {
			pool.current.position.set(to.x, subject.y + 0.03, to.z);
			pool.current.material.opacity = spot.poolOpacity * s;
			pool.current.material.color.set(spot.color);
			pool.current.visible = on;
			pool.current.scale.setScalar(spot.pool);
		}

		if (dustRef.current && dustMat) {
			dustRef.current.visible = on;
			dustMat.uniforms.uOpacity.value = spot.dustOpacity * s;
			dustMat.uniforms.uSize.value = spot.dustSize;
			dustMat.uniforms.uColor.value.set(spot.color);

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
					sp.t += sp.vt * spot.dustDrift * delta;
					sp.r += sp.vr * spot.dustDrift * delta;
					sp.a += sp.va * spot.dustDrift * delta * 1.5;

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
						THREE.MathUtils.lerp(0.06, 1, sp.t) * beamR * sp.r * DUST_SPREAD;
					dustPos
						.copy(from)
						.addScaledVector(dir, sp.t * len)
						.addScaledVector(side, Math.cos(sp.a) * radius)
						.addScaledVector(bitangent, Math.sin(sp.a) * radius);

					posAttr.setXYZ(i, dustPos.x, dustPos.y, dustPos.z);
					alphaAttr.setX(
						i,
						fade *
							sp.sizeJitter *
							THREE.MathUtils.smoothstep(sp.t, 0.02, spot.sourceFade),
					);
				}

				posAttr.needsUpdate = true;
				alphaAttr.needsUpdate = true;
			}
		}
	});

	return (
		<>
			<spotLight
				name="Focus spotlight"
				ref={light}
				color={SPOT_COLOR}
				castShadow={false}
				penumbra={0.72}
				distance={22}
				decay={2}
				intensity={0}
			/>
			<mesh
				ref={beam}
				material={beamMat}
				renderOrder={5}
				frustumCulled={false}
				visible={false}
			>
				<planeGeometry args={[1, 1]} />
			</mesh>
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

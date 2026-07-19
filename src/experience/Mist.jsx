import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Locked look — tuned in Leva, then baked */
const MIST = {
	frontMist: 0,
	topMist: 0.5,
	startMist: 0.2,
	frontY: 2.5,
	peakY: 16,
	amount: 1.65,
	size: 1,
	softness: 1,
	speed: 1,
};

/** Hash → value noise → FBM cloud field */
function createCloudTexture(size = 256) {
	const data = new Uint8Array(size * size * 4);
	const perm = new Uint8Array(512);
	for (let i = 0; i < 256; i++) perm[i] = i;
	for (let i = 255; i > 0; i--) {
		const j = (Math.imul(i + 19, 1103515245) >>> 0) % (i + 1);
		const t = perm[i];
		perm[i] = perm[j];
		perm[j] = t;
	}
	for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];

	const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
	const lerp = (a, b, t) => a + (b - a) * t;
	const grad = (h, x, y) => {
		const u = (h & 1) === 0 ? x : -x;
		const v = (h & 2) === 0 ? y : -y;
		return u + v;
	};
	const noise2 = (x, y) => {
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;
		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);
		const u = fade(xf);
		const v = fade(yf);
		const aa = perm[perm[X] + Y];
		const ab = perm[perm[X] + Y + 1];
		const ba = perm[perm[X + 1] + Y];
		const bb = perm[perm[X + 1] + Y + 1];
		return lerp(
			lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
			lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
			v,
		);
	};
	const fbm = (x, y, octaves) => {
		let sum = 0;
		let amp = 0.5;
		let freq = 1;
		let norm = 0;
		for (let o = 0; o < octaves; o++) {
			sum += amp * noise2(x * freq, y * freq);
			norm += amp;
			amp *= 0.5;
			freq *= 2.05;
		}
		return sum / norm;
	};

	// Seamless noise only — soft oval falloff is applied in the shader from vUv,
	// so animated UV crawl can wrap forever without fading to empty edges.
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const u = x / size;
			const v = y / size;
			const n1 = fbm(u * 3.2, v * 3.2, 5) * 0.5 + 0.5;
			const n2 = fbm(u * 6.5 + 20, v * 6.5 + 8, 4) * 0.5 + 0.5;
			const ridge = 1 - Math.abs(fbm(u * 4.2 + 3, v * 2.8, 3));
			const density = Math.min(1, n1 * 0.55 + n2 * 0.25 + ridge * 0.35);
			const i = (y * size + x) * 4;
			const c = Math.floor(density * 255);
			data[i] = c;
			data[i + 1] = Math.floor(n2 * 255);
			data[i + 2] = Math.floor(ridge * 255);
			data[i + 3] = c;
		}
	}

	const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
	// Repeat so animated UV offsets never sample a dead transparent edge
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.generateMipmaps = true;
	texture.needsUpdate = true;
	return texture;
}

/**
 * Mountain climb recipes. Opacity follows height gradient (front → peak).
 * Packed dense along the CAM_START → peak sightline.
 */
/**
 * Fewer, larger puffs — same look, far less transparent overdraw.
 * (~90 instances; was ~270 and that murdered fill-rate / FPS)
 */
const BANKS = [
	// Camera start (CAM_START ~ z=34) — needs aFloor so the 10% front gradient doesn't erase it
	{
		color: "#f6e4cc",
		center: [2.5, 3.4, 28],
		count: 7,
		spread: [10, 1.6, 5],
		scale: [30, 9],
		scaleJitter: 0.35,
		// No groundRatio — flat XZ quads read as bright horizontal lines when edge-on
		groundRatio: 0,
		drift: 2.8,
		floor: 0.42,
	},
	{
		color: "#f8e8d0",
		center: [-6, 2.8, 24],
		count: 5,
		spread: [8, 1.2, 4],
		scale: [28, 8],
		scaleJitter: 0.35,
		groundRatio: 0,
		drift: 2.6,
		floor: 0.38,
	},
	{
		color: "#f3ddc4",
		center: [9, 3.6, 22],
		count: 5,
		spread: [8, 1.4, 4],
		scale: [28, 8],
		scaleJitter: 0.35,
		groundRatio: 0,
		drift: 2.7,
		floor: 0.36,
	},
	{
		color: "#f8e8d0",
		center: [-18, 2.2, 8],
		count: 3,
		spread: [12, 1.0, 6],
		scale: [34, 9],
		scaleJitter: 0.35,
		groundRatio: 0,
		drift: 3.0,
	},
	{
		color: "#f0dcc8",
		center: [28, 1.8, 4],
		count: 3,
		spread: [10, 1.0, 5],
		scale: [30, 8],
		scaleJitter: 0.35,
		groundRatio: 0,
		drift: 2.6,
	},
	{
		color: "#f6e2c6",
		center: [0, 4.5, 8],
		count: 8,
		spread: [14, 2.2, 8],
		scale: [32, 10],
		scaleJitter: 0.4,
		groundRatio: 0,
		drift: 3.2,
		floor: 0.22,
	},
	{
		color: "#f3ddc2",
		center: [10, 6.2, -2],
		count: 10,
		spread: [16, 2.8, 8],
		scale: [34, 11],
		scaleJitter: 0.4,
		groundRatio: 0,
		drift: 3.4,
	},
	{
		color: "#f2dcc4",
		center: [8, 9, -10],
		count: 14,
		spread: [20, 3.8, 11],
		scale: [38, 13],
		scaleJitter: 0.45,
		groundRatio: 0,
		drift: 4.0,
	},
	{
		color: "#f5e4ce",
		center: [12, 13.5, -18],
		count: 18,
		spread: [18, 4.5, 11],
		scale: [40, 14],
		scaleJitter: 0.45,
		groundRatio: 0,
		drift: 4.5,
	},
	{
		color: "#f7e8d4",
		center: [14, 17, -24],
		count: 16,
		spread: [16, 4.0, 10],
		scale: [44, 15],
		scaleJitter: 0.4,
		groundRatio: 0,
		drift: 4.8,
	},
	{
		color: "#f8ead8",
		center: [13, 19, -26],
		count: 12,
		spread: [14, 3.5, 9],
		scale: [46, 16],
		scaleJitter: 0.4,
		groundRatio: 0,
		drift: 5.0,
	},
	{
		color: "#eedbc8",
		center: [8, 14, -34],
		count: 8,
		spread: [26, 4.5, 12],
		scale: [52, 16],
		scaleJitter: 0.4,
		groundRatio: 0,
		drift: 5.2,
	},
	{
		color: "#f4ddd0",
		center: [4, 34, -95],
		count: 4,
		spread: [48, 8, 18],
		scale: [62, 16],
		scaleJitter: 0.3,
		groundRatio: 0,
		drift: 5.5,
	},
];

function hash(i, salt) {
	const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
	return x - Math.floor(x);
}

function buildPuffs() {
	const puffs = [];
	let id = 0;
	for (const bank of BANKS) {
		const color = new THREE.Color(bank.color);
		const floor = bank.floor ?? 0;
		for (let i = 0; i < bank.count; i++) {
			const hx = hash(id, 1);
			const hy = hash(id, 2);
			const hz = hash(id, 3);
			const hs = hash(id, 4);
			const hg = hash(id, 5);
			const ground = hg < bank.groundRatio ? 1 : 0;
			const sj = 1 + (hs - 0.5) * 2 * bank.scaleJitter;
			const sx = bank.scale[0] * sj * (ground ? 1.35 : 1);
			const sy = bank.scale[1] * sj * (ground ? 1.6 : 1);
			puffs.push({
				pos: [
					bank.center[0] + (hx - 0.5) * 2 * bank.spread[0],
					bank.center[1] + (hy - 0.5) * 2 * bank.spread[1] * (ground ? 0.35 : 1),
					bank.center[2] + (hz - 0.5) * 2 * bank.spread[2],
				],
				scale: [sx, ground ? sy * 0.85 : sy],
				color,
				// Base weight — final opacity = this * max(heightGradient, floor) * amount
				opacity: 0.55 + hash(id, 6) * 0.35,
				seed: id * 1.618 + hash(id, 7) * 10,
				ground,
				drift: bank.drift * (0.7 + hash(id, 8) * 0.6),
				floor,
			});
			id++;
		}
	}
	return puffs;
}

const mistVertex = /* glsl */ `
	attribute vec3 aBasePos;
	attribute vec2 aScale;
	attribute vec3 aColor;
	attribute vec4 aMeta; // opacity, seed, ground, drift
	attribute float aFloor; // min density — keeps camera-start mist visible

	uniform float uTime;
	uniform float uSpeed;
	uniform float uFrontMist;
	uniform float uTopMist;
	uniform float uFrontY;
	uniform float uPeakY;
	uniform float uAmount;
	uniform float uSize;
	uniform float uStartMist;

	varying vec2 vUv;
	varying vec3 vColor;
	varying float vOpacity;
	varying float vSeed;

	void main() {
		vUv = uv;
		vColor = aColor;
		vSeed = aMeta.y;

		float opacity = aMeta.x;
		float seed = aMeta.y;
		float ground = aMeta.z;
		float drift = aMeta.w;
		float t = uTime * uSpeed;

		vec3 pos = aBasePos;
		pos.x += sin(t * 0.14 + seed) * drift;
		pos.y += sin(t * 0.22 + seed * 1.7) * (ground > 0.5 ? 0.18 : 0.55);
		pos.z += cos(t * 0.11 + seed * 0.9) * drift * 0.4;

		// Height gradient: front of mountain → peak
		float h = smoothstep(uFrontY, uPeakY, aBasePos.y);
		float heightMul = mix(uFrontMist, uTopMist, h);
		// Near-camera banks: respect Start mist floor so they don't vanish at 10% front
		float floorMul = aFloor * uStartMist;
		heightMul = max(heightMul, floorMul);

		float pulse = 0.82 + 0.18 * sin(t * 0.35 + seed * 2.3);
		vOpacity = opacity * heightMul * uAmount * pulse;

		vec2 scale = aScale * uSize * (1.0 + 0.08 * sin(t * 0.2 + seed * 1.4));

		vec3 worldPos;
		if (ground > 0.5) {
			float yaw = seed * 0.21;
			float cy = cos(yaw);
			float sy = sin(yaw);
			vec3 local = vec3(position.x * scale.x, 0.0, position.y * scale.y);
			local = vec3(local.x * cy - local.z * sy, 0.05, local.x * sy + local.z * cy);
			worldPos = pos + local;
		} else {
			vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
			vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
			worldPos = pos
				+ camRight * position.x * scale.x
				+ camUp * position.y * scale.y;
		}

		gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
	}
`;

const mistFragment = /* glsl */ `
	uniform float uTime;
	uniform float uSpeed;
	uniform float uSoftness;
	uniform sampler2D uMap;

	varying vec2 vUv;
	varying vec3 vColor;
	varying float vOpacity;
	varying float vSeed;

	void main() {
		if (vOpacity < 0.008) discard;

		// Cheap soft oval first — kill most fragments before any texture fetch
		vec2 p = (vUv - 0.5) * 2.0;
		float r = length(p * vec2(1.0, 1.28));
		float soft = clamp(uSoftness, 0.0, 1.0);
		float falloff = 1.0 - smoothstep(0.0, mix(1.05, 0.72, soft), r);
		falloff = pow(max(falloff, 0.0), mix(1.2, 2.6, soft));
		if (falloff < 0.02) discard;

		// 2 taps only (was 4) — bounded crawl, no off-edge fade
		float t = uTime * uSpeed;
		vec2 crawl = vec2(
			sin(t * 0.07 + vSeed) * 0.07,
			cos(t * 0.055 + vSeed * 0.7) * 0.05
		);
		vec2 uv = fract(vUv + crawl + vec2(vSeed * 0.03, vSeed * 0.05));
		float a = texture2D(uMap, uv).a;
		float b = texture2D(uMap, fract(uv * 1.35 + 0.17)).g;
		float density = a * 0.65 + b * 0.35;

		// Wispy edge from the same sample (no extra fetch)
		float rN = r + (a - 0.5) * 0.28 * soft;
		falloff = 1.0 - smoothstep(0.0, mix(1.05, 0.72, soft), rN);
		falloff = pow(max(falloff, 0.0), mix(1.2, 2.6, soft));

		float alpha = pow(clamp(density, 0.0, 1.0), 1.3) * falloff * vOpacity;
		if (alpha < 0.01) discard;

		gl_FragColor = vec4(vColor * (0.92 + density * 0.14), alpha);
	}
`;

export default function Mist() {
	const uniforms = useRef(null);
	const texture = useMemo(() => createCloudTexture(256), []);
	const puffs = useMemo(() => buildPuffs(), []);

	const { geometry, material } = useMemo(() => {
		const base = new THREE.PlaneGeometry(1, 1);
		const geo = new THREE.InstancedBufferGeometry();
		geo.index = base.index;
		geo.attributes.position = base.attributes.position;
		geo.attributes.uv = base.attributes.uv;
		geo.instanceCount = puffs.length;

		const n = puffs.length;
		const basePos = new Float32Array(n * 3);
		const scale = new Float32Array(n * 2);
		const color = new Float32Array(n * 3);
		const meta = new Float32Array(n * 4);
		const floor = new Float32Array(n);

		for (let i = 0; i < n; i++) {
			const p = puffs[i];
			basePos[i * 3] = p.pos[0];
			basePos[i * 3 + 1] = p.pos[1];
			basePos[i * 3 + 2] = p.pos[2];
			scale[i * 2] = p.scale[0];
			scale[i * 2 + 1] = p.scale[1];
			color[i * 3] = p.color.r;
			color[i * 3 + 1] = p.color.g;
			color[i * 3 + 2] = p.color.b;
			meta[i * 4] = p.opacity;
			meta[i * 4 + 1] = p.seed;
			meta[i * 4 + 2] = p.ground;
			meta[i * 4 + 3] = p.drift;
			floor[i] = p.floor;
		}

		geo.setAttribute("aBasePos", new THREE.InstancedBufferAttribute(basePos, 3));
		geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scale, 2));
		geo.setAttribute("aColor", new THREE.InstancedBufferAttribute(color, 3));
		geo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(meta, 4));
		geo.setAttribute("aFloor", new THREE.InstancedBufferAttribute(floor, 1));

		const mat = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uSpeed: { value: MIST.speed },
				uFrontMist: { value: MIST.frontMist },
				uTopMist: { value: MIST.topMist },
				uStartMist: { value: MIST.startMist },
				uFrontY: { value: MIST.frontY },
				uPeakY: { value: MIST.peakY },
				uAmount: { value: MIST.amount },
				uSize: { value: MIST.size },
				uSoftness: { value: MIST.softness },
				uMap: { value: texture },
			},
			vertexShader: mistVertex,
			fragmentShader: mistFragment,
			transparent: true,
			depthWrite: false,
			depthTest: true,
			fog: false,
			side: THREE.FrontSide,
		});

		base.dispose();
		return { geometry: geo, material: mat };
	}, [puffs, texture]);

	uniforms.current = material.uniforms;

	useFrame(({ clock }) => {
		const u = uniforms.current;
		if (!u) return;
		u.uTime.value = clock.elapsedTime;
	});

	return (
		<mesh
			geometry={geometry}
			material={material}
			frustumCulled={false}
			renderOrder={4}
		/>
	);
}

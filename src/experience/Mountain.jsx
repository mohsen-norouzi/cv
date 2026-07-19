import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
	BIG_LAMP_INTENSITY,
	BOULDER_COLOR,
	HORIZON_GLOW,
	HORIZON_INTENSITY,
	HORIZON_OPACITY,
	LIGHTHOUSE_INTENSITY,
	PATH_COLOR,
	PINE_COLOR,
	PLATFORM_COLOR,
	TERRAIN_COLOR,
	WATER_COLOR,
} from "./constants";
import { flicker, hashSeed } from "./flicker";
import { createStoneTexture } from "./stoneTexture";

const MODEL_URL = "/Try1.glb?v=7";

const HIDDEN_NAMES = new Set([
	"PineA",
	"PineB",
	"RoundTree",
	"Cube",
	"Cube.001",
	"Cone",
	"Cylinder",
	"Cone.001",
	"Cylinder.001",
]);

const PINE_MATS = new Set(["PineA_f", "PineB_f", "RoundTree_f", "Tuft"]);

/** Facet variation only on a few large meshes (toNonIndexed is expensive) */
const VARIED_MATS = {
	Terrain: 0.1,
	Road: 0.07,
	Platform: 0.06,
};

function addFacetVariation(geometry, amount, seed) {
	const geo = geometry.index ? geometry.toNonIndexed() : geometry;
	const count = geo.attributes.position.count;
	const colors = new Float32Array(count * 3);
	let s = (seed % 2147483646) + 1;
	const rand = () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
	for (let i = 0; i < count; i += 3) {
		const lum = 1 - amount / 2 + rand() * amount;
		const warm = 1 + (rand() - 0.5) * 0.05;
		const r = lum * warm;
		const g = lum;
		const b = lum * (2 - warm);
		for (let j = 0; j < 3; j++) {
			colors[(i + j) * 3] = r;
			colors[(i + j) * 3 + 1] = g;
			colors[(i + j) * 3 + 2] = b;
		}
	}
	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	return geo;
}

function createRippleTexture() {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, size, size);
	for (let i = 0; i < 120; i++) {
		const x = Math.random() * size;
		const y = Math.random() * size;
		const r = 4 + Math.random() * 14;
		const lum = 108 + Math.floor(Math.random() * 40);
		const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
		grad.addColorStop(0, `rgba(${lum},${lum},${lum},0.35)`);
		grad.addColorStop(1, `rgba(${lum},${lum},${lum},0)`);
		ctx.fillStyle = grad;
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(7, 7);
	return texture;
}

function tintFoliage(mat, matName) {
	mat.color.set(PINE_COLOR);
	if (matName === "Tuft") mat.color.offsetHSL(0.02, 0.05, 0.08);
	if (matName === "PineB_f") mat.color.offsetHSL(0.02, -0.02, 0.04);
	if (matName === "RoundTree_f") mat.color.offsetHSL(-0.02, 0.04, 0.06);
}

function makeLampMaterial({ glowKey, seed }) {
	const mat = new THREE.MeshStandardMaterial({
		name: "LampGlow",
		color: "#000000",
		emissive: "#ffb14a",
		emissiveIntensity: 1,
		roughness: 0.45,
		metalness: 0,
		flatShading: true,
		toneMapped: false,
		side: THREE.DoubleSide,
	});
	mat.userData.glow = glowKey;
	mat.userData.glowSeed = seed;
	return mat;
}

/**
 * Build shared materials once — 85 pines must NOT each get a unique clone.
 */
function buildMaterialLibrary(stoneMap, rippleMap) {
	const cache = new Map();

	const put = (key, mat) => {
		cache.set(key, mat);
		return mat;
	};

	return {
		get(source, meshName) {
			if (!source) return source;
			const name = source.name || "unnamed";

			// Lamp glass: unique seed per mesh (only a handful)
			if (name === "LH_Lamp") {
				const key = `LH_Lamp:${meshName}`;
				if (cache.has(key)) return cache.get(key);
				return put(
					key,
					makeLampMaterial({
						glowKey: "lighthouse",
						seed: hashSeed("lighthouse"),
					}),
				);
			}
			if (name === "Light") {
				const key = `Light:${meshName}`;
				if (cache.has(key)) return cache.get(key);
				return put(
					key,
					makeLampMaterial({
						glowKey: "streetLamp",
						seed: hashSeed(meshName || "street"),
					}),
				);
			}

			if (cache.has(name)) return cache.get(name);

			const mat = source.clone();
			mat.flatShading = true;
			mat.needsUpdate = true;

			if (name === "Lamp") {
				mat.emissive.set("#000000");
				mat.emissiveIntensity = 0;
				return put(name, mat);
			}

			if (name === "HorizonGlow") {
				mat.color.set("#000000");
				mat.emissive.set(HORIZON_GLOW);
				mat.emissiveIntensity = HORIZON_INTENSITY;
				mat.toneMapped = false;
				mat.transparent = true;
				mat.opacity = HORIZON_OPACITY;
				mat.depthWrite = false;
				mat.fog = false;
				return put(name, mat);
			}

			if (name === "Road") {
				mat.color.set(PATH_COLOR);
				mat.roughness = 0.42;
				mat.metalness = 0;
				mat.envMapIntensity = 0.55;
				if (stoneMap) {
					mat.map = stoneMap;
					mat.map.repeat.set(10, 10);
				}
				return put(name, mat);
			}

			if (name === "Platform") {
				mat.color.set(PLATFORM_COLOR);
				mat.roughness = 0.5;
				mat.metalness = 0;
				mat.envMapIntensity = 0.5;
				if (stoneMap) {
					mat.map = stoneMap.clone();
					mat.map.repeat.set(3, 3);
					mat.map.needsUpdate = true;
				}
				return put(name, mat);
			}

			if (name === "Terrain") {
				mat.color.set(TERRAIN_COLOR);
				mat.roughness = 0.95;
				mat.metalness = 0;
				return put(name, mat);
			}

			if (name === "Water") {
				mat.color.set(WATER_COLOR);
				mat.roughness = 0.06;
				mat.metalness = 0.55;
				mat.envMapIntensity = 1.3;
				mat.bumpMap = rippleMap;
				mat.bumpScale = 0.35;
				mat.userData.water = true;
				return put(name, mat);
			}

			if (name === "Boulder") {
				mat.color.set(BOULDER_COLOR);
				mat.roughness = 0.7;
				mat.envMapIntensity = 0.5;
				return put(name, mat);
			}

			if (PINE_MATS.has(name)) {
				tintFoliage(mat, name);
				return put(name, mat);
			}

			return put(name, mat);
		},
	};
}

function isFoliageName(name) {
	return /^(PineA|PineB|RoundTree)/i.test(name);
}

/** Materials we merge into one draw call each (dozens of tree meshes → few) */
const MERGE_MATS = new Set([
	"PineA_f",
	"PineB_f",
	"RoundTree_f",
	"Tuft",
	"Trunk",
]);

/** Foliage materials that get a per-tree tint baked before merging */
const FOLIAGE_TINT_MATS = new Set(["PineA_f", "PineB_f", "RoundTree_f", "Tuft"]);

/**
 * Constant vertex-color tint for one tree — merged foliage shares a single
 * material, so variety has to live in the geometry.
 */
function bakeTreeTint(geo, seed) {
	let s = (seed % 2147483646) + 1;
	const rand = () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
	const lum = 0.84 + rand() * 0.3;
	const warm = 1 + (rand() - 0.5) * 0.16;
	const green = 1 + (rand() - 0.5) * 0.1;
	const r = lum * warm;
	const g = lum * green;
	const b = lum * (2 - warm);

	const count = geo.attributes.position.count;
	const colors = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		colors[i * 3] = r;
		colors[i * 3 + 1] = g;
		colors[i * 3 + 2] = b;
	}
	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * Bake world transforms and merge every mesh sharing a material into one Mesh.
 * Biggest draw-call win for this forest scene.
 */
function mergeMeshesByMaterial(model, materialNames) {
	model.updateMatrixWorld(true);

	/** @type {Map<string, { material: THREE.Material, geos: THREE.BufferGeometry[], sources: THREE.Mesh[] }>} */
	const buckets = new Map();

	model.traverse((child) => {
		if (!child.isMesh || !child.visible) return;
		const mat = child.material;
		if (!mat || Array.isArray(mat)) return;
		if (!materialNames.has(mat.name)) return;
		if (!child.geometry) return;

		const key = mat.uuid;
		if (!buckets.has(key)) {
			buckets.set(key, { material: mat, geos: [], sources: [] });
		}
		const bucket = buckets.get(key);
		const geo = child.geometry.clone();
		geo.applyMatrix4(child.matrixWorld);
		bucket.geos.push(geo);
		bucket.sources.push(child);
	});

	for (const { material, geos, sources } of buckets.values()) {
		if (geos.length < 2) {
			for (const g of geos) g.dispose();
			continue;
		}

		if (FOLIAGE_TINT_MATS.has(material.name)) {
			geos.forEach((geo, i) => {
				bakeTreeTint(geo, hashSeed(sources[i].name || `tree-${i}`));
			});
			material.vertexColors = true;
			material.needsUpdate = true;
		}

		const merged = mergeGeometries(geos, false);
		for (const g of geos) g.dispose();
		if (!merged) continue;

		merged.computeBoundingSphere();
		merged.computeBoundingBox();

		const mesh = new THREE.Mesh(merged, material);
		mesh.name = `Merged_${material.name}`;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.frustumCulled = true;
		model.add(mesh);

		for (const src of sources) {
			src.visible = false;
			src.castShadow = false;
			src.receiveShadow = false;
		}
	}
}

export default function Mountain() {
	const { scene } = useGLTF(MODEL_URL);
	const model = useMemo(() => scene.clone(true), [scene]);
	const stoneMap = useMemo(() => createStoneTexture(), []);
	const rippleMap = useMemo(() => createRippleTexture(), []);
	const glows = useRef({ streetLamp: [], lighthouse: [] });
	const waterMats = useRef([]);

	useLayoutEffect(() => {
		const library = buildMaterialLibrary(stoneMap, rippleMap);
		const nextGlows = { streetLamp: [], lighthouse: [] };
		const nextWater = [];
		const tracked = new Set();

		model.traverse((child) => {
			if (HIDDEN_NAMES.has(child.name)) {
				child.visible = false;
				return;
			}

			if (!child.isMesh) return;

			const foliage = isFoliageName(child.name);
			const isLampGlass =
				/^Street_Light/i.test(child.name) || child.name === "Cylinder.025";

			// Trees cast again — shadow map is baked once (see ShadowBake)
			child.castShadow = !isLampGlass;
			child.receiveShadow = true;

			const sources = Array.isArray(child.material)
				? child.material
				: [child.material];
			const materials = sources
				.filter(Boolean)
				.map((material) => library.get(material, child.name));

			if (materials.length === 0) return;

			child.material = Array.isArray(child.material) ? materials : materials[0];

			for (const mat of materials) {
				if (tracked.has(mat)) continue;
				tracked.add(mat);
				const kind = mat.userData?.glow;
				if (kind && nextGlows[kind]) nextGlows[kind].push(mat);
				if (mat.userData?.water) nextWater.push(mat);
			}

			// Facet bake only on big ground meshes
			const facetAmount = Math.max(
				0,
				...materials.map((m) => VARIED_MATS[m.name] ?? 0),
			);
			if (facetAmount > 0 && child.geometry && !foliage) {
				child.geometry = addFacetVariation(
					child.geometry,
					facetAmount,
					hashSeed(child.name || "mesh"),
				);
				for (const m of materials) {
					if (VARIED_MATS[m.name]) m.vertexColors = true;
				}
			}
		});

		mergeMeshesByMaterial(model, MERGE_MATS);

		glows.current = nextGlows;
		waterMats.current = nextWater;
	}, [model, stoneMap, rippleMap]);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		for (const mat of glows.current.streetLamp) {
			mat.emissiveIntensity =
				BIG_LAMP_INTENSITY * flicker(t, mat.userData.glowSeed);
		}
		for (const mat of glows.current.lighthouse) {
			mat.emissiveIntensity =
				LIGHTHOUSE_INTENSITY * flicker(t, mat.userData.glowSeed);
		}
		for (const mat of waterMats.current) {
			if (!mat.bumpMap) continue;
			mat.bumpMap.offset.x = t * 0.008;
			mat.bumpMap.offset.y = Math.sin(t * 0.05) * 0.05;
		}
	});

	return <primitive object={model} dispose={null} />;
}

useGLTF.preload(MODEL_URL);

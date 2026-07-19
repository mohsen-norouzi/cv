import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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

/** Cache-bust so a replaced Try1.glb isn't served from an old browser cache */
const MODEL_URL = "/Try1.glb?v=7";

/** Template / removed props */
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

/** Materials that get per-facet tonal variation (the hand-crafted look) */
const VARIED_MATS = {
	Terrain: 0.1,
	Road: 0.07,
	Boulder: 0.13,
	Platform: 0.06,
	PineA_f: 0.09,
	PineB_f: 0.09,
	RoundTree_f: 0.09,
	Tuft: 0.1,
};

/**
 * Give every triangle a slight luminance / warm-cool nudge via vertex colors.
 * Offline renders read as "expensive" partly because no two facets are the
 * exact same color; flat-tinted low-poly reads as plastic.
 */
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

/** Blurry noise bump map — reads as slow rippling water under a low sun */
function createRippleTexture() {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	ctx.fillStyle = "#808080";
	ctx.fillRect(0, 0, size, size);
	for (let i = 0; i < 320; i++) {
		const x = Math.random() * size;
		const y = Math.random() * size;
		const r = 6 + Math.random() * 22;
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

/** Chance a given foliage mesh gets a random color nudge */
const FOLIAGE_VARIETY_CHANCE = 0.4;

function tintFoliage(mat, matName) {
	mat.color.set(PINE_COLOR);
	if (matName === "Tuft") mat.color.offsetHSL(0.02, 0.05, 0.08);
	if (matName === "PineB_f") mat.color.offsetHSL(0.02, -0.02, 0.04);
	if (matName === "RoundTree_f") mat.color.offsetHSL(-0.02, 0.04, 0.06);

	if (Math.random() > FOLIAGE_VARIETY_CHANCE) return;

	mat.color.offsetHSL(
		(Math.random() - 0.5) * 0.1,
		(Math.random() - 0.5) * 0.25,
		(Math.random() - 0.5) * 0.14,
	);
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

function prepareMaterial(material, stoneMap, meshName) {
	if (!material) return material;

	const mat = material.clone();
	mat.flatShading = true;
	mat.needsUpdate = true;

	if (mat.name === "Lamp") {
		mat.emissive.set("#000000");
		mat.emissiveIntensity = 0;
		return mat;
	}

	if (mat.name === "HorizonGlow") {
		mat.color.set("#000000");
		mat.emissive.set(HORIZON_GLOW);
		mat.emissiveIntensity = HORIZON_INTENSITY;
		mat.toneMapped = false;
		mat.transparent = true;
		mat.opacity = HORIZON_OPACITY;
		mat.depthWrite = false;
		mat.fog = false;
		return mat;
	}

	if (mat.name === "LH_Lamp") {
		return makeLampMaterial({
			glowKey: "lighthouse",
			seed: hashSeed("lighthouse"),
		});
	}

	if (mat.name === "Light") {
		return makeLampMaterial({
			glowKey: "streetLamp",
			seed: hashSeed(meshName || "street"),
		});
	}

	if (mat.name === "Road") {
		mat.color.set(PATH_COLOR);
		mat.roughness = 0.88;
		mat.metalness = 0;
		if (stoneMap) {
			mat.map = stoneMap;
			mat.map.repeat.set(10, 10);
		}
		return mat;
	}

	if (mat.name === "Platform") {
		mat.color.set(PLATFORM_COLOR);
		mat.roughness = 0.9;
		mat.metalness = 0;
		if (stoneMap) {
			mat.map = stoneMap.clone();
			mat.map.repeat.set(3, 3);
			mat.map.needsUpdate = true;
		}
		return mat;
	}

	if (mat.name === "Terrain") {
		mat.color.set(TERRAIN_COLOR);
		mat.roughness = 0.95;
		mat.metalness = 0;
		return mat;
	}

	if (mat.name === "Water") {
		mat.color.set(WATER_COLOR);
		// Mirror-ish so the PMREM sky reflects; bump ripples animated per frame
		mat.roughness = 0.06;
		mat.metalness = 0.55;
		mat.envMapIntensity = 1.3;
		mat.bumpMap = createRippleTexture();
		mat.bumpScale = 0.35;
		mat.userData.water = true;
		return mat;
	}

	if (mat.name === "Boulder") {
		mat.color.set(BOULDER_COLOR);
		mat.roughness = 0.95;
		return mat;
	}

	if (PINE_MATS.has(mat.name)) {
		tintFoliage(mat, mat.name);
		return mat;
	}

	return mat;
}

export default function Mountain() {
	const { scene } = useGLTF(MODEL_URL);
	const model = useMemo(() => scene.clone(true), [scene]);
	const stoneMap = useMemo(() => createStoneTexture(), []);
	const glows = useRef({ streetLamp: [], lighthouse: [] });
	const waterMats = useRef([]);

	useLayoutEffect(() => {
		const nextGlows = { streetLamp: [], lighthouse: [] };
		const nextWater = [];

		model.traverse((child) => {
			if (HIDDEN_NAMES.has(child.name)) {
				child.visible = false;
				return;
			}

			if (!child.isMesh) return;

			const isLampGlass =
				/^Street_Light/i.test(child.name) || child.name === "Cylinder.025";
			child.castShadow = !isLampGlass;
			child.receiveShadow = true;

			const materials = (
				Array.isArray(child.material) ? child.material : [child.material]
			)
				.filter(Boolean)
				.map((material) => prepareMaterial(material, stoneMap, child.name));

			if (materials.length === 0) return;

			child.material = Array.isArray(child.material) ? materials : materials[0];

			for (const mat of materials) {
				const kind = mat.userData?.glow;
				if (kind && nextGlows[kind]) nextGlows[kind].push(mat);
				if (mat.userData?.water) nextWater.push(mat);
			}

			// Per-facet tonal variation — pick the strongest amount among the
			// mesh's materials and bake it into vertex colors once
			const facetAmount = Math.max(
				0,
				...materials.map((m) => VARIED_MATS[m.name] ?? 0),
			);
			if (facetAmount > 0 && child.geometry) {
				child.geometry = addFacetVariation(
					child.geometry,
					facetAmount,
					hashSeed(child.name || "mesh"),
				);
				for (const m of materials) {
					if (VARIED_MATS[m.name]) m.vertexColors = true;
				}
			}

			if (child.geometry && !child.geometry.attributes.normal) {
				child.geometry.computeVertexNormals();
			}
		});

		glows.current = nextGlows;
		waterMats.current = nextWater;
	}, [model, stoneMap]);

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

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
	BOULDER_COLOR,
	PATH_COLOR,
	PINE_COLOR,
	PLATFORM_COLOR,
	TERRAIN_COLOR,
	WATER_COLOR,
} from "./constants";
import { flicker } from "./flicker";
import { createStoneTexture } from "./stoneTexture";

/** Cache-bust so a replaced Try1.glb isn't served from an old browser cache */
const MODEL_URL = "/Try1.glb?v=3";

/** Template / removed props */
const HIDDEN_NAMES = new Set([
	"PineA",
	"PineB",
	"RoundTree",
	"HorizonGlowCard",
	"Cube",
	"Cube.001",
	"Cone",
	"Cylinder",
	"Cone.001",
	"Cylinder.001",
]);

const PINE_MATS = new Set(["PineA_f", "PineB_f", "RoundTree_f", "Tuft"]);

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

function prepareMaterial(material, stoneMap) {
	if (!material) return material;

	const mat = material.clone();
	mat.flatShading = true;
	mat.needsUpdate = true;

	if (
		mat.name === "LH_Lamp" ||
		mat.name === "HorizonGlow" ||
		mat.name === "Lamp"
	) {
		mat.emissive.set("#000000");
		mat.emissiveIntensity = 0;
		return mat;
	}

	if (mat.name === "Light") {
		return makeLampMaterial({ glowKey: "bigLamp", seed: 0.3 });
	}

	// Pale stone path — reference look
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
		mat.roughness = 0.15;
		mat.metalness = 0.1;
		return mat;
	}

	if (mat.name === "Boulder") {
		mat.color.set(BOULDER_COLOR);
		mat.roughness = 0.95;
		return mat;
	}

	if (PINE_MATS.has(mat.name)) {
		mat.color.set(PINE_COLOR);
		if (mat.name === "Tuft") mat.color.offsetHSL(0.02, 0.05, 0.08);
		if (mat.name === "PineB_f") mat.color.offsetHSL(0, -0.02, 0.04);
		if (mat.name === "RoundTree_f") mat.color.offsetHSL(0.03, 0.04, 0.06);
		return mat;
	}

	return mat;
}

export default function Mountain({ lamps }) {
	const { scene } = useGLTF(MODEL_URL);
	const model = useMemo(() => scene.clone(true), [scene]);
	const stoneMap = useMemo(() => createStoneTexture(), []);
	const glows = useRef({ bigLamp: [] });
	const lampsRef = useRef(lamps);
	lampsRef.current = lamps;

	useLayoutEffect(() => {
		const nextGlows = { bigLamp: [] };

		model.traverse((child) => {
			if (HIDDEN_NAMES.has(child.name)) {
				child.visible = false;
				return;
			}

			if (!child.isMesh) return;

			const isLampGlass = child.name === "Street_Light";
			child.castShadow = !isLampGlass;
			child.receiveShadow = true;

			const materials = (
				Array.isArray(child.material) ? child.material : [child.material]
			)
				.filter(Boolean)
				.map((material) => prepareMaterial(material, stoneMap));

			if (materials.length === 0) return;

			child.material = Array.isArray(child.material)
				? materials
				: materials[0];

			for (const mat of materials) {
				const kind = mat.userData?.glow;
				if (kind && nextGlows[kind]) nextGlows[kind].push(mat);
			}

			if (child.geometry && !child.geometry.attributes.normal) {
				child.geometry.computeVertexNormals();
			}
		});

		glows.current = nextGlows;
	}, [model, stoneMap]);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const { big } = lampsRef.current;

		for (const mat of glows.current.bigLamp) {
			mat.emissiveIntensity = big * flicker(t, mat.userData.glowSeed);
		}
	});

	return <primitive object={model} dispose={null} />;
}

useGLTF.preload(MODEL_URL);

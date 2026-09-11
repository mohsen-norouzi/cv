import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LANDMARKS } from "./coastLayout";
import { getFocusStop, getSpotReveal, getFocusAmount } from "./focusStore";
import { createLanternLightPool } from "./lanternLightPool";
import { updateSkyPalette } from "./skyPalette";
import LighthouseBeam from "./LighthouseBeam";
import LanternInsects from "./LanternInsects";
import { setSceneReady } from "./loadStore";
import { reducedMotion } from "./motion";
import { rotateShowcase } from "./showcaseMotion";

const MODEL_URLS = ["/optimized/subjects.glb", "/optimized/coast.glb"];
const LIGHTMAP_URLS = [
	"/optimized/paving.webp",
	"/optimized/landscape.webp",
	"/optimized/foliage.webp",
];
// Start all five requests together, before Suspense waits on either loader.
useGLTF.preload(MODEL_URLS);
useLoader.preload(THREE.TextureLoader, LIGHTMAP_URLS);

function placeSubject(source, position, height) {
	const model = source.clone(true);
	model.updateMatrixWorld(true);
	const bounds = new THREE.Box3().setFromObject(model),
		size = bounds.getSize(new THREE.Vector3()),
		center = bounds.getCenter(new THREE.Vector3());
	const container = new THREE.Group();
	const scale = height / size.y;
	model.position.sub(center);
	model.position.y += size.y / 2;
	container.add(model);
	container.scale.setScalar(scale);
	container.position.fromArray(position);
	model.traverse((o) => {
		if (o.isMesh) {
			o.castShadow = true;
			o.receiveShadow = true;
			o.material = o.material.clone();
			o.material.flatShading = false;
			o.material.roughness = 0.82;
			o.material.metalness = 0;
			o.material.envMapIntensity = 0.6;
		}
	});
	return container;
}

export default function CoastalWorld() {
	const [{ scene }, { scene: landscape }] = useGLTF(MODEL_URLS);
	const atlases = useLoader(THREE.TextureLoader, LIGHTMAP_URLS);
	const coast = useMemo(() => {
		const root = landscape.clone(true);
		root.userData.walkOccluder = true;
		const maps = Object.fromEntries(
			["paving", "landscape", "foliage"].map((name, i) => {
				const texture = atlases[i];
				texture.flipY = false;
				texture.channel = 0;
				texture.minFilter = THREE.LinearFilter;
				texture.generateMipmaps = false;
				texture.magFilter = THREE.LinearFilter;
				texture.needsUpdate = true;
				return [name, texture];
			}),
		);
		let lanterns = [];
		root.traverse((object) => {
			if (object.userData.lanterns) lanterns = object.userData.lanterns;
			if (!object.isMesh) return;
			// The old opaque ridge backdrops read as rigid white clouds in the haze.
			// Keep the authored asset intact; the live sky now provides the backdrop.
			if (object.material.name.startsWith("Mountain ridge")) {
				object.visible = false;
				return;
			}
			let node = object,
				group;
			while (node && !group) {
				group = node.userData.lightmap;
				node = node.parent;
			}
			object.material = object.material.clone();
			const material = object.material;
			// Joining the vertex-colored terrain in Blender creates empty color layers
			// on unpainted rock primitives. Only the terrain uses vertex color.
			if (group === "landscape" && !material.name.startsWith("Material_0"))
				material.vertexColors = false;
			if (material.name.includes("Cliff")) material.color.multiplyScalar(1.3);
			object.castShadow = !material.name.includes("Lantern glass");
			object.receiveShadow = true;
			if (group) {
				material.lightMap = maps[group];
				material.lightMapIntensity = 1;
				material.envMapIntensity = 0.7;
				// Cycles supplies diffuse transport. Live PBR lights supply the changing
				// specular highlights, so sunlight and bulbs are never counted twice.
				material.onBeforeCompile = (shader) => {
					shader.fragmentShader = shader.fragmentShader.replace(
						"#include <lights_fragment_end>",
						`#include <lights_fragment_end>
						reflectedLight.directDiffuse *= .65;
						vec4 bakedIrradiance=texture2D(lightMap, vLightMapUv);
						reflectedLight.indirectDiffuse = (bakedIrradiance.rgb * bakedIrradiance.a * 8.0 * .55 + vec3(.08,.10,.14)) * material.diffuseColor * lightMapIntensity;`,
					);
				};
				material.customProgramCacheKey = () => `coastal-irradiance-v4`;
			}
		});
		return { root, lanterns };
	}, [landscape, atlases]);
	const subjects = useMemo(() => {
		const root = new THREE.Group();
		const names = [
			"tripo_node_1feaf1fd-79b2-4217-a867-f97ada61b588",
			"tripo_node_e70704d4-4ce1-4bf4-974e-d1eea2c8202b",
			"Stylized_Cartoon_Stone_Bench",
		];
		names.forEach((name, i) => {
			const source =
				scene.getObjectByName(name) ??
				(i === 2
					? scene.getObjectByName("Stylized Cartoon Stone Bench")
					: null);
			if (source) {
				const subject = placeSubject(
					source,
					LANDMARKS[i].position,
					[2.65, 3.1, 1.0][i],
				);
				subject.name = `Showcase_${i + 1}`;
				subject.userData.stop = i + 1;
				subject.userData.walkTarget = i + 1;
				root.add(subject);
			}
		});
		return root;
	}, [scene]);
	const readyFrames = useRef(0);
	const shadowTime = useRef(0);
	useEffect(() => {
		coast.root.updateMatrixWorld(true);
		subjects.updateMatrixWorld(true);
		// Cache static transforms. Focused showcase pivots update explicitly below.
		for (const root of [coast.root, subjects])
			root.traverse((object) => {
				object.matrixAutoUpdate = false;
				object.matrixWorldAutoUpdate = false;
			});
		for (const subject of subjects.children)
			subject.traverse((object) => {
				object.matrixWorldAutoUpdate = true;
			});
		readyFrames.current = 0;
		setSceneReady(false);
		return () => setSceneReady(false);
	}, [coast, subjects]);
	useFrame(({ gl }, delta) => {
		const active = subjects.children.find(
			(subject) => subject.userData.stop === getFocusStop(),
		);
		if (rotateShowcase(active, getSpotReveal(), delta, reducedMotion())) {
			// Refresh the existing sun shadow only during rotation, at a bounded
			// rate. This keeps the moving silhouette in sync without a 4K shadow
			// render on every animation frame or enabling more shadow lights.
			shadowTime.current += delta;
			if (gl.shadowMap.enabled && shadowTime.current >= 1 / 15) {
				gl.shadowMap.needsUpdate = true;
				shadowTime.current = 0;
			}
		} else if (shadowTime.current > 0) {
			gl.shadowMap.needsUpdate = gl.shadowMap.enabled;
			shadowTime.current = 0;
		}
		if (readyFrames.current < 5 && ++readyFrames.current === 5)
			setSceneReady(true);
	});
	return (
		<>
			<primitive object={coast.root} dispose={null} />
			<primitive object={subjects} dispose={null} />
			<LighthouseBeam position={coast.lanterns.at(-1)} landscape={coast.root} />
			<LanternHighlights positions={coast.lanterns} />
			<LanternInsects positions={coast.lanterns} />
		</>
	);
}

// A fixed light budget follows the camera. The baked pools remain on every lamp.
function LanternHighlights({ positions }) {
	const lights = useRef([]);
	const pool = useMemo(
		() => createLanternLightPool(positions.slice(0, -1)),
		[positions],
	);
	useFrame(({ camera }, delta) => {
		const sky = updateSkyPalette();
		const brightness = (1 - 0.6 * sky.daylight) * (1 - getFocusAmount() * 0.5);
		for (const [i, slot] of pool.update(camera.position, delta).entries()) {
			const light = lights.current[i];
			if (!light) continue;
			light.intensity = 12 * slot.strength * brightness;
			if (slot.index >= 0) light.position.fromArray(positions[slot.index]);
		}
	});
	return positions.slice(0, 6).map((position, i) => (
		<pointLight
			key={position.join(",")}
			ref={(o) => {
				lights.current[i] = o;
			}}
			position={positions[i]}
			color="#ffba60"
			name="Lantern highlight"
			intensity={0}
			distance={10}
			decay={2}
		/>
	));
}

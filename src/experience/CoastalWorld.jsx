import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LANDMARKS } from "./coastLayout";
import { setSceneReady } from "./loadStore";
import { MODEL_URL } from "./modelUrl";

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
	const { scene } = useGLTF(MODEL_URL);
	const { scene: landscape } = useGLTF("/coast-hq.glb");
	const coast = useMemo(() => {
		const root = landscape.clone(true);
		root.traverse((object) => {
			if (!object.isMesh) return;
			object.material = object.material.clone();
			object.material.flatShading = true;
			object.castShadow = object.material.name !== "Lantern glass";
			object.receiveShadow = object.material.name !== "Lantern glass";
		});
		return { root, lanterns: landscape.children[0]?.userData.lanterns ?? [] };
	}, [landscape]);
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
			if (source)
				root.add(
					placeSubject(source, LANDMARKS[i].position, [2.65, 3.1, 1.0][i]),
				);
		});
		return root;
	}, [scene]);
	const readyFrames = useRef(0);
	useEffect(() => {
		coast.root.updateMatrixWorld(true);
		subjects.updateMatrixWorld(true);
		readyFrames.current = 0;
		setSceneReady(false);
		return () => setSceneReady(false);
	}, [coast, subjects]);
	useFrame(() => {
		if (readyFrames.current < 5 && ++readyFrames.current === 5)
			setSceneReady(true);
	});
	return (
		<>
			<primitive object={coast.root} dispose={null} />
			<primitive object={subjects} dispose={null} />
			{coast.lanterns
				.filter((_, i) => i < 3 || i === 19)
				.map((p, i) => (
					<pointLight
						key={p.join(",")}
						position={p}
						color="#ffc574"
						intensity={i === 3 ? 8 : 5}
						distance={4.8}
						decay={2}
					/>
				))}
		</>
	);
}

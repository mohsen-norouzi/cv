import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BOAT, boatPose, oceanMotion, boatWaterUniforms } from "./boatMotion";
const MODEL = "/optimized/boat/boat.glb";
const TEXTURES = [
	"/optimized/boat/color.webp",
	"/optimized/boat/normal.webp",
	"/optimized/boat/roughness.webp",
];
useGLTF.preload(MODEL);
useTexture.preload(TEXTURES);
export default function CoastalBoat() {
	const { scene } = useGLTF(MODEL);
	const [color, normal, roughness] = useTexture(TEXTURES);
	const boat = useMemo(() => {
		color.colorSpace = THREE.SRGBColorSpace;
		for (const texture of [color, normal, roughness]) {
			texture.flipY = false;
			texture.anisotropy = 4;
			texture.needsUpdate = true;
		}
		const material = new THREE.MeshStandardMaterial({
			map: color,
			normalMap: normal,
			normalScale: new THREE.Vector2(0.55, 0.55),
			roughnessMap: roughness,
			roughness: 0.95,
			metalness: 0,
			envMapIntensity: 0.65,
			side: THREE.DoubleSide,
		});
		const model = scene.clone(true);
		model.scale.setScalar(BOAT.scale);
		model.traverse((o) => {
			if (o.isMesh) {
				o.material = material;
				o.castShadow = false;
				o.receiveShadow = true;
			}
			o.matrixAutoUpdate = false;
		});
		model.updateMatrix();
		const root = new THREE.Group();
		root.name = "Sailboat at the coast entrance";
		root.userData.walkOccluder = true;
		root.add(model);
		root.rotation.order = "YXZ";
		root.rotation.y = BOAT.yaw;
		root.position.set(BOAT.position[0], 0, BOAT.position[1]);
		return { root, material, pose: { y: 0, pitch: 0, roll: 0 } };
	}, [scene, color, normal, roughness]);
	useFrame(() => {
		const pose = boatPose(oceanMotion.time, boat.pose);
		boat.root.position.y = pose.y;
		boat.root.rotation.x = pose.pitch;
		boat.root.rotation.z = pose.roll;
		boat.root.updateMatrixWorld(true);
		boatWaterUniforms.boatInverse.value
			.copy(boat.root.children[0].matrixWorld)
			.invert();
	});
	useEffect(() => () => boat.material.dispose(), [boat]);
	return <primitive object={boat.root} dispose={null} />;
}

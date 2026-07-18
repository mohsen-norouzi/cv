import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BIRD_ORBIT_CENTER } from "./constants";
import { breathe, flicker } from "./flicker";

function prepareMaterial(material, child) {
	if (!material) return material;
	const mat = material.clone();

	mat.flatShading = true;
	mat.needsUpdate = true;

	if (mat.name === "Rock" && mat.color) {
		mat.color.set("#7a7e84");
		mat.roughness = 0.92;
		mat.metalness = 0;
	}

	if (mat.name === "PathMat" && mat.color) {
		mat.color.set("#3a342c");
		mat.roughness = 0.95;
	}

	if (mat.name === "PortalGlow") {
		mat.emissive.set("#ffb14a");
		mat.emissiveIntensity = 18;
		mat.toneMapped = false;
		mat.color.set("#000000");
		mat.userData.glow = "portal";
		mat.userData.baseEmissive = 18;
	}

	if (mat.name === "Beacon") {
		mat.toneMapped = false;
		mat.color.set("#000000");
		const isTip =
			child.name === "Sphere.001" || child.name.includes("Sphere");
		mat.emissiveIntensity = isTip ? 40 : 4;
		mat.emissive.set(isTip ? "#ffe6a0" : "#e8b45a");
		mat.userData.glow = isTip ? "beaconTip" : "beaconBeam";
		mat.userData.baseEmissive = isTip ? 40 : 4;
	}

	if (mat.name === "Horizon") {
		mat.emissive.set("#e8a85a");
		mat.emissiveIntensity = 2.2;
		mat.toneMapped = false;
	}

	return mat;
}

export default function Mountain() {
	const { scene } = useGLTF("/mountain.glb");
	const model = useMemo(() => scene.clone(true), [scene]);
	const birds = useRef([]);
	const glows = useRef({ portal: [], beaconTip: [], beaconBeam: [] });

	useLayoutEffect(() => {
		const flock = [];
		const nextGlows = { portal: [], beaconTip: [], beaconBeam: [] };

		model.traverse((child) => {
			if (child.name === "Fog" || child.name === "Cube.006") {
				child.visible = false;
				return;
			}

			if (child.name?.startsWith("Bird_")) {
				const offset = child.position.clone().sub(BIRD_ORBIT_CENTER);
				const radius = Math.max(5.5, Math.hypot(offset.x, offset.z));
				const angle = Math.atan2(offset.z, offset.x);
				const index = Number(child.name.split("_")[1]) || 0;

				flock.push({
					object: child,
					center: BIRD_ORBIT_CENTER,
					radius: radius + (index % 3) * 0.6,
					angle,
					baseY: child.position.y,
					speed: 0.18 + (index % 5) * 0.035,
					bob: 0.25 + (index % 4) * 0.08,
					bobSpeed: 1.2 + (index % 3) * 0.3,
				});
			}

			if (!child.isMesh) return;

			child.castShadow = true;
			child.receiveShadow = true;

			const materials = (
				Array.isArray(child.material) ? child.material : [child.material]
			)
				.filter(Boolean)
				.map((material) => prepareMaterial(material, child));

			if (materials.length === 0) return;

			child.material = Array.isArray(child.material)
				? materials
				: materials[0];

			for (const mat of materials) {
				const kind = mat.userData?.glow;
				if (kind && nextGlows[kind]) nextGlows[kind].push(mat);
			}

			if (child.geometry) {
				child.geometry.computeVertexNormals();
			}
		});

		birds.current = flock;
		glows.current = nextGlows;
	}, [model]);

	useFrame(({ clock }, delta) => {
		const t = clock.elapsedTime;

		for (const bird of birds.current) {
			bird.angle += bird.speed * delta;

			const { center, radius, angle, baseY, bob, bobSpeed, object } = bird;
			object.position.set(
				center.x + Math.cos(angle) * radius,
				baseY + Math.sin(t * bobSpeed + angle) * bob,
				center.z + Math.sin(angle) * radius,
			);

			object.rotation.y = -angle + Math.PI / 2;
			object.rotation.z = Math.sin(t * bobSpeed + angle) * 0.12;
			object.rotation.x = Math.sin(t * bobSpeed * 0.5 + angle) * 0.08;
		}

		const portalLive = breathe(t, 0.2);
		const tipLive = flicker(t, 1.1);
		const beamLive = breathe(t, 2.4);

		for (const mat of glows.current.portal) {
			mat.emissiveIntensity = mat.userData.baseEmissive * portalLive;
		}
		for (const mat of glows.current.beaconTip) {
			mat.emissiveIntensity = mat.userData.baseEmissive * tipLive;
		}
		for (const mat of glows.current.beaconBeam) {
			mat.emissiveIntensity = mat.userData.baseEmissive * beamLive;
		}
	});

	return <primitive object={model} dispose={null} />;
}

useGLTF.preload("/mountain.glb");

import { useCursor } from "@react-three/drei";
import { visitCollection } from "./collectionStore";
import { getWalking } from "./walkStore";
import { getFocusStop, getSpotReveal } from "./focusStore";
import { rotateShowcase } from "./showcaseMotion";
import { reducedMotion } from "./motion";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TEMPLATE_BOARD } from "./templateBoardPlacement";

function parchmentTexture() {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 768;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#dac9a2";
	ctx.fillRect(0, 0, 1024, 768);
	// Broad, quiet paper shading; no photographic wood grain or new downloads.
	const wash = ctx.createLinearGradient(0, 0, 1024, 768);
	wash.addColorStop(0, "rgba(255,244,207,.28)");
	wash.addColorStop(0.55, "rgba(255,244,207,0)");
	wash.addColorStop(1, "rgba(91,64,32,.13)");
	ctx.fillStyle = wash;
	ctx.fillRect(0, 0, 1024, 768);
	ctx.textAlign = "center";
	ctx.fillStyle = "#4c3c2b";
	ctx.font = "28px monospace";
	ctx.fillText("THE COLLECTION", 512, 204);
	ctx.font = "bold 88px Georgia, serif";
	ctx.fillText("Templates", 512, 328);
	ctx.fillStyle = "#9d7743";
	ctx.fillRect(410, 385, 204, 3);
	ctx.fillStyle = "#65513a";
	ctx.font = "30px Georgia, serif";
	ctx.fillText("Made to make it yours.", 512, 465);
	ctx.strokeStyle = "#ad956e";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(170, 557);
	ctx.lineTo(854, 557);
	ctx.stroke();
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

export default function TemplateBoard() {
	const [hovered, setHovered] = useState(false);
	useCursor(hovered);
	const gl = useThree((state) => state.gl);
	const shadowTime = useRef(0);
	const board = useMemo(() => {
		const root = new THREE.Group();
		root.userData.walkTarget = 4;
		root.name = "Template noticeboard — East lookout";
		root.position.fromArray(TEMPLATE_BOARD.position);
		root.rotation.y = TEMPLATE_BOARD.yaw;
		const paper = parchmentTexture();
		const materials = [
			new THREE.MeshStandardMaterial({ color: "#68523b", roughness: 0.92 }),
			new THREE.MeshStandardMaterial({ color: "#796046", roughness: 0.9 }),
			new THREE.MeshStandardMaterial({ color: "#594535", roughness: 0.94 }),
			new THREE.MeshStandardMaterial({
				color: "#534e43",
				metalness: 0.55,
				roughness: 0.65,
			}),
			new THREE.MeshStandardMaterial({
				color: "#8d8775",
				roughness: 0.95,
				flatShading: true,
			}),
			new THREE.MeshStandardMaterial({ map: paper, roughness: 1 }),
		];
		const batches = materials.map(() => []);
		const add = (geometry, position, material, rotation = [0, 0, 0]) => {
			geometry.applyMatrix4(
				new THREE.Matrix4().compose(
					new THREE.Vector3(...position),
					new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
					new THREE.Vector3(1, 1, 1),
				),
			);
			batches[material].push(geometry.toNonIndexed());
			geometry.dispose();
		};
		const box = (size, position, material, rotation) =>
			add(new THREE.BoxGeometry(...size), position, material, rotation);
		// A faceted stone socket and a single post, rooted in the platform.
		add(new THREE.CylinderGeometry(0.23, 0.32, 0.18, 5), [0, 0.09, 0], 4);
		box([0.21, 2.7, 0.22], [0, 1.36, -0.08], 0);
		// Five slightly uneven planks echo the hand-built shapes of the coast.
		for (let i = 0; i < 5; i++) {
			box(
				[TEMPLATE_BOARD.width - (i % 2) * 0.065, 0.255, 0.14],
				[(i % 2 ? 1 : -1) * 0.018, 1.43 + i * 0.268, 0],
				i % 3,
				[0, 0, (i - 2) * 0.004],
			);
		}
		for (const side of [-1, 1]) {
			box([0.13, 1.3, 0.12], [side * 0.78, 1.97, -0.12], 2);
			for (const y of [1.44, 2.49])
				add(
					new THREE.CylinderGeometry(0.025, 0.025, 0.012, 6),
					[side * 0.92, y, 0.085],
					3,
					[Math.PI / 2, 0, 0],
				);
		}
		// A slightly irregular paper edge; front texture and a solid backing.
		const shape = new THREE.Shape();
		shape.moveTo(-0.77, -0.51);
		shape.lineTo(0.74, -0.53);
		shape.lineTo(0.78, 0.52);
		shape.lineTo(-0.76, 0.54);
		shape.closePath();
		const sheet = new THREE.ShapeGeometry(shape);
		const uv = sheet.getAttribute("uv");
		for (let i = 0; i < uv.count; i++)
			uv.setXY(i, (uv.getX(i) + 0.78) / 1.56, (uv.getY(i) + 0.54) / 1.08);
		add(sheet, [0, 1.99, 0.09], 5);
		for (const x of [-0.65, 0.65])
			add(
				new THREE.CylinderGeometry(0.033, 0.033, 0.026, 6),
				[x, 2.44, 0.11],
				3,
				[Math.PI / 2, 0, 0],
			);
		for (const [i, geometries] of batches.entries()) {
			if (!geometries.length) continue;
			const mesh = new THREE.Mesh(mergeGeometries(geometries), materials[i]);
			mesh.castShadow = mesh.receiveShadow = true;
			root.add(mesh);
			for (const geometry of geometries) geometry.dispose();
		}
		root.updateMatrixWorld(true);
		return { root, materials, paper };
	}, []);
	useEffect(() => {
		gl.shadowMap.needsUpdate = true;
		return () => {
			board.root.traverse((object) => object.geometry?.dispose());
			for (const material of board.materials) material.dispose();
			board.paper.dispose();
		};
	}, [board, gl]);
	useFrame(({ gl }, delta) => {
		let rotated = false;
		if (getWalking()) {
			if (getFocusStop() === 4)
				rotated = rotateShowcase(
					board.root,
					getSpotReveal(),
					delta,
					reducedMotion(),
				);
		} else if (board.root.rotation.y !== TEMPLATE_BOARD.yaw) {
			board.root.rotation.y = TEMPLATE_BOARD.yaw;
			board.root.updateMatrixWorld(true);
			gl.shadowMap.needsUpdate = true;
		}
		if (rotated) {
			shadowTime.current += delta;
			if (gl.shadowMap.enabled && shadowTime.current >= 1 / 15) {
				gl.shadowMap.needsUpdate = true;
				shadowTime.current = 0;
			}
		} else if (shadowTime.current > 0) {
			gl.shadowMap.needsUpdate = gl.shadowMap.enabled;
			shadowTime.current = 0;
		}
	});
	return (
		<primitive
			object={board.root}
			dispose={null}
			onPointerOver={() => setHovered(true)}
			onPointerOut={() => setHovered(false)}
			onClick={(event) => {
				if (getWalking() || event.delta > 5) return;
				event.stopPropagation();
				visitCollection();
			}}
		/>
	);
}

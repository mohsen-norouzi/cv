import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Soft elliptical puff — alpha fades to nothing well before the quad edge */
function createPuffTexture() {
	const w = 256;
	const h = 128;
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	ctx.save();
	ctx.translate(w / 2, h / 2);
	ctx.scale(1, h / w);
	const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
	grad.addColorStop(0, "rgba(255,255,255,0.85)");
	grad.addColorStop(0.4, "rgba(255,255,255,0.45)");
	grad.addColorStop(0.72, "rgba(255,255,255,0.14)");
	grad.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = grad;
	ctx.fillRect(-w / 2, -w / 2, w, w);
	ctx.restore();

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

/**
 * Depth haze in layers, like the reference: clear foreground, bright banks
 * between ridges, and a few slow pink clouds in the sky. All billboards with
 * sine drift (no wrap pop). Sun side is left, so left banks run warmer.
 */
const LAYERS = [
	// Water-line banks, behind the island edges
	{
		pos: [-30, 2.5, -14],
		scale: [55, 10],
		color: "#f6e2c8",
		opacity: 0.4,
		seed: 0.7,
	},
	{
		pos: [34, 2.2, -8],
		scale: [44, 9],
		color: "#ecdccc",
		opacity: 0.34,
		seed: 2.3,
	},
	// Between the near hill and the big mountain — the key depth cut
	{
		pos: [8, 5.5, -18],
		scale: [60, 9],
		color: "#f2ddc4",
		opacity: 0.3,
		seed: 4.1,
	},
	// Mountain base, far — melts it into the sky
	{
		pos: [-4, 10, -42],
		scale: [90, 14],
		color: "#eedbc8",
		opacity: 0.36,
		seed: 1.9,
	},
	// Sky clouds — high, wide, slow, pink-cream
	{
		pos: [-42, 34, -90],
		scale: [58, 12],
		color: "#f6dfd2",
		opacity: 0.5,
		seed: 3.3,
	},
	{
		pos: [12, 40, -110],
		scale: [70, 14],
		color: "#efd8d0",
		opacity: 0.42,
		seed: 5.6,
	},
	{
		pos: [55, 32, -80],
		scale: [48, 10],
		color: "#f3ddca",
		opacity: 0.38,
		seed: 7.2,
	},
];

const DRIFT = 4;

export default function Mist() {
	const group = useRef(null);
	const texture = useMemo(() => createPuffTexture(), []);

	const materials = useMemo(
		() =>
			LAYERS.map(
				(layer) =>
					new THREE.MeshBasicMaterial({
						color: layer.color,
						map: texture,
						transparent: true,
						opacity: layer.opacity,
						depthWrite: false,
						fog: false,
					}),
			),
		[texture],
	);

	useFrame(({ clock }) => {
		if (!group.current) return;
		const t = clock.elapsedTime;
		group.current.children.forEach((puff, i) => {
			const { seed, opacity, pos } = LAYERS[i];
			puff.position.x =
				pos[0] + Math.sin(t * 0.05 * (1 + seed * 0.1) + seed) * DRIFT;
			materials[i].opacity =
				opacity * (0.88 + Math.sin(t * 0.09 + seed * 2) * 0.12);
		});
	});

	if (!texture) return null;

	return (
		<group ref={group}>
			{LAYERS.map((layer, i) => (
				<Billboard key={layer.seed} follow position={layer.pos}>
					<mesh
						material={materials[i]}
						renderOrder={4}
						scale={[...layer.scale, 1]}
					>
						<planeGeometry args={[1, 1]} />
					</mesh>
				</Billboard>
			))}
		</group>
	);
}

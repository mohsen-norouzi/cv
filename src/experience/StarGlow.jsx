import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flicker } from "./flicker";

function createStarTexture() {
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	const c = size / 2;
	ctx.clearRect(0, 0, size, size);

	const core = ctx.createRadialGradient(c, c, 0, c, c, size * 0.18);
	core.addColorStop(0, "rgba(255,255,240,1)");
	core.addColorStop(0.25, "rgba(255,220,140,0.85)");
	core.addColorStop(0.55, "rgba(255,180,80,0.25)");
	core.addColorStop(1, "rgba(255,160,60,0)");
	ctx.fillStyle = core;
	ctx.fillRect(0, 0, size, size);

	const drawRay = (angle, length, width) => {
		ctx.save();
		ctx.translate(c, c);
		ctx.rotate(angle);
		const grad = ctx.createLinearGradient(0, -length, 0, length);
		grad.addColorStop(0, "rgba(255,230,180,0)");
		grad.addColorStop(0.45, "rgba(255,230,180,0.55)");
		grad.addColorStop(0.5, "rgba(255,255,240,0.95)");
		grad.addColorStop(0.55, "rgba(255,230,180,0.55)");
		grad.addColorStop(1, "rgba(255,230,180,0)");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.moveTo(-width, 0);
		ctx.lineTo(0, -length);
		ctx.lineTo(width, 0);
		ctx.lineTo(0, length);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	};

	drawRay(0, size * 0.42, 2.2);
	drawRay(Math.PI / 2, size * 0.42, 2.2);
	drawRay(Math.PI / 4, size * 0.28, 1.4);
	drawRay(-Math.PI / 4, size * 0.28, 1.4);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

export default function StarGlow({
	position,
	scale = 3.5,
	opacity = 0.9,
	seed = 0,
	spin = 0.08,
}) {
	const texture = useMemo(() => createStarTexture(), []);
	const matRef = useRef(null);
	const meshRef = useRef(null);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const live = flicker(t, seed);
		const mat = matRef.current;
		const mesh = meshRef.current;
		if (!mat || !mesh) return;

		mat.opacity = opacity * live;
		mesh.scale.setScalar(scale * (0.92 + live * 0.14));
		mesh.rotation.z = t * spin;
	});

	if (!texture) return null;

	return (
		<Billboard follow position={position}>
			<mesh ref={meshRef} renderOrder={10} scale={scale}>
				<planeGeometry args={[1, 1]} />
				<meshBasicMaterial
					ref={matRef}
					map={texture}
					transparent
					depthWrite={false}
					toneMapped={false}
					blending={THREE.AdditiveBlending}
					opacity={opacity}
				/>
			</mesh>
		</Billboard>
	);
}

import * as THREE from "three";

/** Soft stone albedo for the path / platforms (reference: pale gray stone tiles). */
export function createStoneTexture() {
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	// Base — cool off-white stone
	ctx.fillStyle = "#e6e2da";
	ctx.fillRect(0, 0, size, size);

	// Large tile grid
	const tiles = 6;
	const tile = size / tiles;
	for (let y = 0; y < tiles; y++) {
		for (let x = 0; x < tiles; x++) {
			const shade = 210 + ((x * 17 + y * 31) % 28);
			const r = shade;
			const g = shade - 2;
			const b = shade - 8;
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);

			// subtle inner variation
			ctx.fillStyle = `rgba(255,255,255,${0.02 + ((x + y) % 3) * 0.015})`;
			ctx.fillRect(x * tile + 6, y * tile + 6, tile - 12, tile - 12);
		}
	}

	// Mortar lines
	ctx.strokeStyle = "rgba(150,145,135,0.35)";
	ctx.lineWidth = 2;
	for (let i = 0; i <= tiles; i++) {
		const p = i * tile;
		ctx.beginPath();
		ctx.moveTo(p, 0);
		ctx.lineTo(p, size);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, p);
		ctx.lineTo(size, p);
		ctx.stroke();
	}

	// Fine noise
	const img = ctx.getImageData(0, 0, size, size);
	const d = img.data;
	for (let i = 0; i < d.length; i += 4) {
		const n = (Math.random() - 0.5) * 18;
		d[i] = Math.min(255, Math.max(0, d[i] + n));
		d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.95));
		d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.85));
	}
	ctx.putImageData(img, 0, 0);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(8, 8);
	texture.anisotropy = 8;
	return texture;
}

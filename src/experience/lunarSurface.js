import {
	DataTexture,
	RGBAFormat,
	LinearFilter,
	ClampToEdgeWrapping,
} from "three";

// A small, deterministic albedo/relief map, generated once without a download.
// R = reflectance, G = height. Irregular maria and overlapping craters replace
// the repeating shader cells, and relief can catch light along the terminator.
export function createLunarSurface() {
	const size = 512,
		albedo = new Float32Array(size * size),
		height = new Float32Array(size * size);
	let seed = 4187;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
	const lattice = (x, y) => {
		let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
		n = Math.imul(n ^ (n >>> 13), 1274126177);
		return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
	};
	const noise = (x, y) => {
		const ix = Math.floor(x),
			iy = Math.floor(y);
		let fx = x - ix,
			fy = y - iy;
		fx = fx * fx * (3 - 2 * fx);
		fy = fy * fy * (3 - 2 * fy);
		return (
			(lattice(ix, iy) * (1 - fx) + lattice(ix + 1, iy) * fx) * (1 - fy) +
			(lattice(ix, iy + 1) * (1 - fx) + lattice(ix + 1, iy + 1) * fx) * fy
		);
	};
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			const i = y * size + x,
				u = x / size,
				v = y / size;
			const warp = noise(u * 7 + 23, v * 7 + 15),
				broad = noise(u * 5 + warp * 0.8 + 11, v * 5 + warp * 0.7 + 4);
			const fine =
				noise(u * 35, v * 35) * 0.6 + noise(u * 91 + 5, v * 91) * 0.4;
			const maria = Math.max(0, Math.min(1, (broad - 0.4) * 4));
			albedo[i] = 0.64 - maria * 0.33 + (fine - 0.5) * 0.15;
			height[i] = 0.5 + (fine - 0.5) * 0.08;
		}
	for (let c = 0; c < 230; c++) {
		const cx = random() * size,
			cy = random() * size,
			r = 1.8 + Math.pow(random(), 3) * 34;
		const depth = 0.025 + Math.min(r / 80, 0.16),
			ejecta = 0.025 + random() * 0.06;
		for (
			let y = Math.max(0, Math.floor(cy - r * 1.7));
			y < Math.min(size, Math.ceil(cy + r * 1.7));
			y++
		)
			for (
				let x = Math.max(0, Math.floor(cx - r * 1.7));
				x < Math.min(size, Math.ceil(cx + r * 1.7));
				x++
			) {
				const dx = (x - cx) / r,
					dy = (y - cy) / r,
					d = Math.hypot(dx, dy),
					i = y * size + x;
				const rim = Math.exp(-Math.pow((d - 0.91) / 0.12, 2));
				const bowl = Math.max(0, 1 - d * d);
				height[i] += rim * depth * 0.6 - bowl * depth;
				albedo[i] +=
					rim * 0.1 -
					bowl * 0.075 +
					Math.exp(-Math.pow((d - 1.07) / 0.38, 2)) * ejecta;
			}
	}
	const pixels = new Uint8Array(size * size * 4);
	for (let i = 0; i < albedo.length; i++) {
		pixels[i * 4] = Math.round(Math.max(0, Math.min(1, albedo[i])) * 255);
		pixels[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, height[i])) * 255);
		pixels[i * 4 + 2] = 0;
		pixels[i * 4 + 3] = 255;
	}
	const texture = new DataTexture(pixels, size, size, RGBAFormat);
	texture.minFilter = texture.magFilter = LinearFilter;
	texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
	texture.needsUpdate = true;
	return texture;
}

import { readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { FloatType } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

const crcTable = Array.from({ length: 256 }, (_, n) => {
	for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
	return n >>> 0;
});
function chunk(type, data) {
	const name = Buffer.from(type),
		body = Buffer.concat([name, data]);
	let crc = 0xffffffff;
	for (const b of body) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
	const header = Buffer.alloc(4),
		tail = Buffer.alloc(4);
	header.writeUInt32BE(data.length);
	tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	return Buffer.concat([header, body, tail]);
}
function png(width, height, rgba) {
	const head = Buffer.alloc(13);
	head.writeUInt32BE(width);
	head.writeUInt32BE(height, 4);
	head[8] = 8;
	head[9] = 6;
	const rows = Buffer.alloc(height * (width * 4 + 1));
	for (let y = 0; y < height; y++) {
		const offset = y * (width * 4 + 1);
		rows[offset] = 1;
		for (let x = 0; x < width * 4; x++)
			rows[offset + 1 + x] =
				(rgba[y * width * 4 + x] -
					(x >= 4 ? rgba[y * width * 4 + x - 4] : 0) +
					256) &
				255;
	}
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", head),
		chunk("IDAT", deflateSync(rows, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
}
// A small separable reconstruction filter removes Monte Carlo speckle. UV margins
// keep neighbouring islands apart. Linear HDR values are encoded as RGBM8.
for (const name of ["paving", "landscape", "foliage"]) {
	const bytes = await readFile(
		new URL(`../assets/lighting/${name}.exr`, import.meta.url),
	);
	const { width, height, data } = new EXRLoader()
		.setDataType(FloatType)
		.parse(
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		);
	let input = data;
	const weights = [1, 4, 6, 4, 1];
	for (const vertical of [false, true]) {
		const output = new Float32Array(data.length);
		for (let y = 0; y < height; y++)
			for (let x = 0; x < width; x++)
				for (let c = 0; c < 3; c++) {
					let sum = 0;
					for (let k = -2; k <= 2; k++) {
						const xx = vertical ? x : Math.max(0, Math.min(width - 1, x + k));
						const yy = vertical ? Math.max(0, Math.min(height - 1, y + k)) : y;
						sum += input[(yy * width + xx) * 4 + c] * weights[k + 2];
					}
					output[(y * width + x) * 4 + c] = sum / 16;
				}
		input = output;
	}
	const outputWidth = name === "paving" ? width : width / 2,
		outputHeight = name === "paving" ? height : height / 2;
	const scale = width / outputWidth;
	const rgba = Buffer.alloc(outputWidth * outputHeight * 4);
	let max = 0,
		clipped = 0;
	// EXRLoader returns rows from bottom to top. PNG/glTF textures use top to bottom.
	for (let y = 0; y < outputHeight; y++)
		for (let x = 0; x < outputWidth; x++) {
			const j = ((outputHeight - 1 - y) * outputWidth + x) * 4;
			const rgb = [0, 0, 0];
			for (let dy = 0; dy < scale; dy++)
				for (let dx = 0; dx < scale; dx++)
					for (let c = 0; c < 3; c++)
						rgb[c] +=
							input[((y * scale + dy) * width + x * scale + dx) * 4 + c] /
							(scale * scale);
			const peak = Math.max(...rgb);
			max = Math.max(max, peak);
			if (peak > 8) clipped++;
			const m = Math.max(1, Math.min(255, Math.ceil((peak / 8) * 255)));
			for (let c = 0; c < 3; c++)
				rgba[j + c] = Math.round(
					Math.min(255, Math.max(0, (rgb[c] / ((m / 255) * 8)) * 255)),
				);
			rgba[j + 3] = m;
		}
	const result = png(outputWidth, outputHeight, rgba);
	await writeFile(
		new URL(`../public/lighting/${name}.png`, import.meta.url),
		result,
	);
	console.log(
		`${name}: ${outputWidth}×${outputHeight}, ${(result.length / 1048576).toFixed(2)} MB, peak ${max.toFixed(2)}, clipped pixels ${clipped}`,
	);
}

await import("./finalize-coast.mjs");

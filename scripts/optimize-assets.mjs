import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { MeshoptEncoder } from "meshoptimizer/encoder";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

// No quantization, simplification, texture resizing, or material changes.
// Every compressed geometry buffer is decoded and checked byte-for-byte.
const base = new URL("../", import.meta.url);
const path = (name) => new URL(name, base);
await mkdir(path("public/optimized"), { recursive: true });
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);

async function readGlb(name) {
	const bytes = await readFile(path(name));
	assert.equal(bytes.readUInt32LE(0), 0x46546c67);
	const length = bytes.readUInt32LE(12);
	return {
		json: JSON.parse(bytes.subarray(20, 20 + length)),
		bin: bytes.subarray(28 + length),
		size: bytes.length,
	};
}

function extractSubjects(source) {
	const json = structuredClone(source.json);
	const names = [
		"tripo_node_1feaf1fd-79b2-4217-a867-f97ada61b588",
		"tripo_node_e70704d4-4ce1-4bf4-974e-d1eea2c8202b",
		"Stylized Cartoon Stone Bench",
	];
	const nodes = names.map((name) => {
		const node = json.nodes.find((n) => n.name === name);
		assert(
			node && !node.children && node.skin === undefined,
			`Expected standalone subject: ${name}`,
		);
		return node;
	});
	const remap = (key, ids) => {
		const unique = [...new Set(ids)];
		const map = new Map(unique.map((id, i) => [id, i]));
		json[key] = unique.map((id) => json[key][id]);
		return (id) => {
			assert(map.has(id), `Unmapped ${key}: ${id}`);
			return map.get(id);
		};
	};
	const mesh = remap(
		"meshes",
		nodes.map((n) => n.mesh),
	);
	nodes.forEach((n) => {
		n.mesh = mesh(n.mesh);
	});
	json.nodes = nodes;
	json.scenes = [{ nodes: nodes.map((_, i) => i) }];
	json.scene = 0;
	const primitives = json.meshes.flatMap((m) => m.primitives);
	const material = remap(
		"materials",
		primitives.map((p) => p.material),
	);
	primitives.forEach((p) => {
		p.material = material(p.material);
	});
	const textureRefs = [];
	function visitTextures(obj) {
		for (const [key, value] of Object.entries(obj)) {
			if (key.endsWith("Texture") && typeof value?.index === "number")
				textureRefs.push(value);
			else if (value && typeof value === "object") visitTextures(value);
		}
	}
	json.materials.forEach(visitTextures);
	const texture = remap(
		"textures",
		textureRefs.map((t) => t.index),
	);
	textureRefs.forEach((t) => {
		t.index = texture(t.index);
	});
	const image = remap(
		"images",
		json.textures.map((t) => t.source),
	);
	json.textures.forEach((t) => {
		t.source = image(t.source);
	});
	const accessor = remap(
		"accessors",
		primitives.flatMap((p) => {
			assert(!p.targets && !p.extensions, "Unsupported subject primitive");
			return [
				...Object.values(p.attributes),
				...(p.indices === undefined ? [] : [p.indices]),
			];
		}),
	);
	primitives.forEach((p) => {
		for (const key of Object.keys(p.attributes))
			p.attributes[key] = accessor(p.attributes[key]);
		if (p.indices !== undefined) p.indices = accessor(p.indices);
	});
	const view = remap("bufferViews", [
		...json.accessors.map((a) => {
			assert(!a.sparse);
			return a.bufferView;
		}),
		...json.images.map((i) => i.bufferView),
	]);
	json.accessors.forEach((a) => {
		a.bufferView = view(a.bufferView);
	});
	json.images.forEach((i) => {
		i.bufferView = view(i.bufferView);
	});
	return { ...source, json };
}

async function compress(source, target) {
	const json = source.json;
	const blocks = [];
	let offset = 0,
		fallbackOffset = 0,
		verified = 0;
	const append = (data) => {
		const start = offset;
		blocks.push(data);
		offset += data.length;
		const pad = (4 - (offset % 4)) % 4;
		if (pad) {
			blocks.push(Buffer.alloc(pad));
			offset += pad;
		}
		return start;
	};
	json.bufferViews = json.bufferViews.map((view, i) => {
		assert.equal(view.buffer, 0);
		const bytes = source.bin.subarray(
			view.byteOffset || 0,
			(view.byteOffset || 0) + view.byteLength,
		);
		const accessors = json.accessors.filter((a) => a.bufferView === i);
		const componentSizes = {
			5120: 1,
			5121: 1,
			5122: 2,
			5123: 2,
			5125: 4,
			5126: 4,
		};
		const elements = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
		if (accessors.length === 1 && !accessors[0].byteOffset) {
			const a = accessors[0];
			const stride =
				view.byteStride || componentSizes[a.componentType] * elements[a.type];
			// INDICES preserves the exact original triangle/index order (no rotations).
			const mode = view.target === 34963 ? "INDICES" : "ATTRIBUTES";
			if (
				stride &&
				bytes.length === a.count * stride &&
				(mode === "INDICES"
					? [2, 4].includes(stride)
					: stride % 4 === 0 && stride <= 256)
			) {
				const encoded = MeshoptEncoder.encodeGltfBuffer(
					bytes,
					a.count,
					stride,
					mode,
					0,
				);
				const decoded = new Uint8Array(bytes.length);
				MeshoptDecoder.decodeGltfBuffer(
					decoded,
					a.count,
					stride,
					encoded,
					mode,
				);
				assert.deepEqual(
					Buffer.from(decoded),
					bytes,
					`Geometry changed in buffer ${i}`,
				);
				verified++;
				if (encoded.length < bytes.length) {
					const result = {
						...view,
						buffer: 1,
						byteOffset: fallbackOffset,
						extensions: {
							...view.extensions,
							EXT_meshopt_compression: {
								buffer: 0,
								byteOffset: append(encoded),
								byteLength: encoded.length,
								byteStride: stride,
								count: a.count,
								mode,
								filter: "NONE",
							},
						},
					};
					fallbackOffset += (view.byteLength + 3) & ~3;
					return result;
				}
			}
		}
		return { ...view, buffer: 0, byteOffset: append(bytes) };
	});
	json.buffers = [
		{ byteLength: offset },
		{
			byteLength: fallbackOffset,
			extensions: { EXT_meshopt_compression: { fallback: true } },
		},
	];
	json.extensionsUsed = [
		...new Set([...(json.extensionsUsed || []), "EXT_meshopt_compression"]),
	];
	json.extensionsRequired = [
		...new Set([...(json.extensionsRequired || []), "EXT_meshopt_compression"]),
	];
	const rawJson = Buffer.from(JSON.stringify(json));
	const jsonBytes = Buffer.concat([
		rawJson,
		Buffer.alloc((4 - (rawJson.length % 4)) % 4, 32),
	]);
	const header = Buffer.alloc(20),
		binHeader = Buffer.alloc(8);
	header.writeUInt32LE(0x46546c67);
	header.writeUInt32LE(2, 4);
	header.writeUInt32LE(28 + jsonBytes.length + offset, 8);
	header.writeUInt32LE(jsonBytes.length, 12);
	header.writeUInt32LE(0x4e4f534a, 16);
	binHeader.writeUInt32LE(offset);
	binHeader.writeUInt32LE(0x004e4942, 4);
	const output = Buffer.concat([header, jsonBytes, binHeader, ...blocks]);
	await writeFile(path(target), output);
	console.log(
		`${target}: ${source.size.toLocaleString()} → ${output.length.toLocaleString()} bytes; ${verified} geometry buffers verified lossless`,
	);
}

await compress(
	extractSubjects(await readGlb("public/Try1.glb")),
	"public/optimized/subjects.glb",
);
await compress(
	await readGlb("public/coast-lit.glb"),
	"public/optimized/coast.glb",
);
for (const name of ["paving", "landscape", "foliage"]) {
	// -exact is essential: alpha stores irradiance, not ordinary image transparency.
	execFileSync("cwebp", [
		"-quiet",
		"-lossless",
		"-exact",
		"-m",
		"6",
		path(`public/lighting/${name}.png`).pathname,
		"-o",
		path(`public/optimized/${name}.webp`).pathname,
	]);
	console.log(`${name}: lossless WebP generated at original resolution`);
}

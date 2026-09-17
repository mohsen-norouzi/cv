import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import layout from "./signLayout.json" with { type: "json" };
import { PROJECTS } from "./projects.js";

export const SIGN_MODEL = "/optimized/signs/woodsign.glb";
export const COAST_SIGNS = layout.map((sign) => {
	if (sign.project === undefined) return sign;
	const project = PROJECTS[sign.project];
	const words =
		sign.project === 2 ? ["Your project", "is next"] : project.title.split(" ");
	return { ...sign, lines: [...words, project.year] };
});
export const SIGN_OBSTACLES = layout.map(({ position: [x, y, z], scale }) => ({
	x,
	y,
	z,
	radius: 0.18 * scale,
}));

export function signPaintTexture(signs = COAST_SIGNS) {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = Math.ceil(signs.length / 2) * 256;
	const ctx = canvas.getContext("2d");
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	signs.forEach((sign, i) => {
		const count =
			sign.variant === "Normal" ? 3 : sign.variant === "Split" ? 2 : 1;
		for (let row = 0; row < count; row++) {
			const line = sign.lines[row] || "";
			const size = sign.project !== undefined && row === 2 ? 45 : 57;
			ctx.font = `${size}px Georgia, serif`;
			const fit = Math.min(1, 450 / Math.max(1, ctx.measureText(line).width));
			ctx.font = `${size * fit}px Georgia, serif`;
			ctx.fillStyle = row === 2 ? "#dfc69b" : "#f4e2bd";
			ctx.fillText(
				line,
				(i % 2) * 512 + 256,
				Math.floor(i / 2) * 256 + ((row + 0.5) * 256) / count,
			);
		}
	});
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	return texture;
}
export function signMaterials(paint) {
	return {
		wood: new THREE.MeshStandardMaterial({
			color: "#796046",
			vertexColors: true,
			roughness: 0.95,
			envMapIntensity: 0.55,
			flatShading: true,
		}),
		paint: new THREE.MeshStandardMaterial({
			map: paint,
			emissiveMap: paint,
			emissive: "#f4e2bd",
			emissiveIntensity: 0.055,
			alphaTest: 0.15,
			roughness: 1,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1,
		}),
		stone: new THREE.MeshStandardMaterial({
			color: "#6b6b5d",
			roughness: 1,
			flatShading: true,
		}),
	};
}
function mirror(geometry) {
	geometry.scale(-1, 1, 1);
	const index = geometry.index;
	if (index)
		for (let i = 0; i < index.count; i += 3) {
			const a = index.getX(i + 1);
			index.setX(i + 1, index.getX(i + 2));
			index.setX(i + 2, a);
		}
	else
		for (const attr of Object.values(geometry.attributes))
			for (let i = 0; i < attr.count; i += 3)
				for (let j = 0; j < attr.itemSize; j++) {
					const a = (i + 1) * attr.itemSize + j,
						b = (i + 2) * attr.itemSize + j,
						v = attr.array[a];
					attr.array[a] = attr.array[b];
					attr.array[b] = v;
				}
	return geometry;
}
// All fixed signs share three draws, with no image maps, extra lights or frame work.
export function buildWayfinding(source, materials, signs = COAST_SIGNS) {
	const root = new THREE.Group();
	root.name = "Plain wood coast signs";
	root.userData.walkOccluder = true;
	const batches = { wood: [], paint: [], stone: [] };
	source.updateMatrixWorld(true);
	const add = (type, g, m) => {
		g.applyMatrix4(m);
		const result = g.index ? g.toNonIndexed() : g;
		batches[type].push(result);
		if (result !== g) g.dispose();
	};
	const rows = Math.ceil(signs.length / 2);
	signs.forEach((sign, i) => {
		const transform = new THREE.Matrix4().compose(
			new THREE.Vector3(...sign.position),
			new THREE.Quaternion().setFromAxisAngle(
				new THREE.Vector3(0, 1, 0),
				sign.yaw,
			),
			new THREE.Vector3().setScalar(sign.scale),
		);
		const object = source.getObjectByName(sign.variant);
		if (!object?.isMesh) throw new Error(`Missing wood sign ${sign.variant}`);
		const g = object.geometry.clone().applyMatrix4(object.matrixWorld);
		if (sign.flip) mirror(g);
		for (const key of Object.keys(g.attributes))
			if (!["position", "normal", "color"].includes(key))
				g.deleteAttribute(key);
		add("wood", g, transform);
		const panels = object.userData.panels;
		panels.forEach((corners, row) => {
			let points = corners.map((p) => new THREE.Vector3(...p));
			if (sign.flip) {
				for (const p of points) p.x = -p.x;
				points = [points[1], points[0], points[3], points[2]];
			}
			const plane = new THREE.BufferGeometry();
			plane.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(
					points.flatMap((p) => p.toArray()),
					3,
				),
			);
			const left = (i % 2) / 2,
				right = left + 0.5;
			const top = 1 - (Math.floor(i / 2) + row / panels.length) / rows,
				bottom = top - 1 / (rows * panels.length);
			plane.setAttribute(
				"uv",
				new THREE.Float32BufferAttribute(
					[left, bottom, right, bottom, right, top, left, top],
					2,
				),
			);
			plane.setIndex([0, 1, 2, 0, 2, 3]);
			plane.computeVertexNormals();
			add("paint", plane, transform);
		});
		const socket = new THREE.CylinderGeometry(0.13, 0.19, 0.25, 5).translate(
			0,
			sign.surface === "platform" ? 0.12 : -0.04,
			0,
		);
		add("stone", socket, transform);
	});
	for (const [type, parts] of Object.entries(batches)) {
		const mesh = new THREE.Mesh(mergeGeometries(parts), materials[type]);
		mesh.name = `Sign ${type}`;
		mesh.castShadow = type !== "paint";
		mesh.receiveShadow = true;
		root.add(mesh);
		for (const g of parts) g.dispose();
	}
	root.updateMatrixWorld(true);
	root.traverse((o) => {
		o.matrixAutoUpdate = false;
	});
	return root;
}

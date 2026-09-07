import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { COAST_PATH, LANDMARKS } from "./coastLayout.js";

export function buildCoast() {
	let seed = 7319;
	const rand = () => {
		seed = (seed * 16807) % 2147483647;
		return (seed - 1) / 2147483646;
	};
	const range = (a, b) => a + rand() * (b - a);
	const root = new THREE.Group();
	const buckets = new Map();
	const lanterns = [];
	const materials = {};
	const mat = (name, color, roughness = 0.9) => {
		const m = new THREE.MeshStandardMaterial({
			name,
			color,
			roughness,
			flatShading: true,
		});
		materials[name] = m;
		return m;
	};
	const rocks = ["#515964", "#414e5c", "#666e70", "#56616c", "#374755"].map(
		(c, i) => mat(`Cliff ${i}`, c),
	);
	const moss = ["#60694a", "#576449", "#6a714e", "#4d5d46"].map((c, i) =>
		mat(`Heather ${i}`, c),
	);
	const stone = ["#bcb5a9", "#cfc3ad", "#a7a8a5", "#d4c8b4", "#bcbdb8"].map(
		(c, i) => mat(`Limestone ${i}`, c, 0.84),
	);
	const leaf = ["#394c41", "#465744", "#536048", "#69704b"].map((c, i) =>
		mat(`Needles ${i}`, c),
	);
	const wood = mat("Weathered oak", "#51473c");
	const bronze = mat("Aged bronze", "#4a4439", 0.48);
	bronze.metalness = 0.45;
	const glass = mat("Lantern glass", "#fff0bd", 0.3);
	glass.emissive.set("#ffb64e");
	glass.emissiveIntensity = 5;
	const add = (
		geometry,
		material,
		position = [0, 0, 0],
		scale = [1, 1, 1],
		rotation = [0, 0, 0],
	) => {
		const matrix = new THREE.Matrix4().compose(
			new THREE.Vector3(...position),
			new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
			new THREE.Vector3(...scale),
		);
		const g = geometry.index ? geometry.toNonIndexed() : geometry;
		g.applyMatrix4(matrix);
		// UVs are unnecessary for the shared, untextured landscape materials.
		for (const a of Object.keys(g.attributes))
			if (!["position", "normal"].includes(a)) g.deleteAttribute(a);
		if (!buckets.has(material)) buckets.set(material, []);
		buckets.get(material).push(g);
		if (g !== geometry) geometry.dispose();
	};
	const box = (p, s, m, r = [0, 0, 0]) =>
		add(new THREE.BoxGeometry(1, 1, 1), m, p, s, r);
	const cylinder = (p, top, bottom, height, m, n = 12) =>
		add(new THREE.CylinderGeometry(top, bottom, height, n), m, p);
	const rock = (p, s, m, detail = 1) => {
		const g = new THREE.IcosahedronGeometry(1, detail);
		const a = g.attributes.position;
		for (let i = 0; i < a.count; i++) {
			const x = a.getX(i),
				y = a.getY(i),
				z = a.getZ(i);
			const d = 1 + 0.15 * Math.sin(x * 13 + y * 9 + z * 7);
			a.setXYZ(i, x * d, y * d, z * d);
		}
		g.computeVertexNormals();
		add(g, m, p, s, [
			range(-0.14, 0.14),
			range(0, Math.PI),
			range(-0.13, 0.13),
		]);
	};
	// A continuous, irregular peninsula with vertical coastal faces.
	const rows = 63,
		cols = 22,
		vertices = [],
		faces = [];
	for (let i = 0; i <= rows; i++) {
		const t = i / rows,
			p = COAST_PATH.getPoint(t);
		for (let j = 0; j <= cols; j++) {
			const u = j / cols;
			const x = p.x - 5.2 + u * 48;
			let y = p.y - 0.62 + Math.sin(i * 1.63 + j * 0.71) * 0.27;
			const z = p.z + Math.sin(j * 2.3 + i * 0.8) * 0.65;
			if (j === 0) y = -1.1;
			else if (j === 1) y -= 0.5 + rand();
			if (j > 5) y += (u - 0.22) * range(2, 7);
			if (j === cols) y -= 1.2;
			if (i === 0 || i === rows) y -= 1.2;
			vertices.push(x, y, z);
		}
	}
	for (let i = 0; i < rows; i++)
		for (let j = 0; j < cols; j++) {
			const a = i * (cols + 1) + j,
				b = a + cols + 1;
			if ((i + j) % 2) faces.push(a, b, a + 1, a + 1, b, b + 1);
			else faces.push(a, b, b + 1, a, b + 1, a + 1);
		}
	const ground = new THREE.BufferGeometry();
	ground.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(vertices, 3),
	);
	ground.setIndex(
		faces.flatMap((_v, i) =>
			i % 3 === 0 ? [faces[i], faces[i + 2], faces[i + 1]] : [],
		),
	);
	ground.computeVertexNormals();
	const ng = ground.toNonIndexed();
	const colors = [];
	const color = new THREE.Color();
	for (let i = 0; i < ng.attributes.position.count; i += 3) {
		const normalY = ng.attributes.normal.getY(i);
		const px = ng.attributes.position.getX(i),
			pz = ng.attributes.position.getZ(i);
		const patch = Math.sin(px * 0.35 + pz * 0.24) * Math.cos(pz * 0.17);
		color.copy(
			normalY > 0.55
				? moss[patch > 0.4 ? 2 : patch < -0.35 ? 3 : 1].color
				: rocks[1].color,
		);
		color.multiplyScalar(0.95 + rand() * 0.1);
		for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
	}
	ng.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	const gm = new THREE.MeshStandardMaterial({
		color: "#ffffff",
		vertexColors: true,
		roughness: 1,
		flatShading: true,
	});
	const terrain = new THREE.Mesh(ng, gm);
	terrain.name = "Coastal escarpment";
	terrain.castShadow = true;
	terrain.receiveShadow = true;
	root.add(terrain);
	ground.dispose();
	// Tall fractured outcrops give the coastline an actual silhouette.
	for (let i = 0; i < 62; i++) {
		const t = range(0.06, 0.97),
			p = COAST_PATH.getPoint(t),
			side = rand() > 0.38 ? -1 : 1;
		const x = p.x + (side < 0 ? range(-6.5, -4.8) : range(9, 15));
		const h = Math.max(1.6, p.y * 0.6);
		rock(
			[x, p.y - h * 0.64 - 0.25, p.z],
			[range(1.3, 3.3), h, range(1.2, 3.3)],
			rocks[i % rocks.length],
		);
		if (i % 3 === 0)
			rock(
				[x, p.y - 0.8, p.z],
				[range(1, 2), 0.4, range(1, 2)],
				moss[i % moss.length],
			);
	}
	// Individually cut, gently bevelled stones; a readable rhythm all the way uphill.
	const steps = 78;
	for (let i = 0; i < steps; i++) {
		const t = i / steps,
			p = COAST_PATH.getPointAt(t),
			next = COAST_PATH.getPointAt(Math.min(1, (i + 1) / steps));
		const tangent = next.clone().sub(p);
		const length = tangent.length();
		const yaw = Math.atan2(tangent.x, tangent.z);
		const width = 3.2 - t * 0.75;
		const joint = range(0.44, 0.56),
			widths = [width * joint, width * (1 - joint)];
		for (let slab = 0; slab < 2; slab++) {
			const w = widths[slab] - 0.018,
				l = length * 1.03,
				offset = slab === 0 ? -width / 2 + w / 2 : width / 2 - w / 2;
			const shape = new THREE.Shape();
			shape.moveTo(-w / 2 + 0.055, -l / 2);
			shape.lineTo(w / 2 - 0.09, -l / 2 + 0.025);
			shape.lineTo(w / 2, -l / 2 + 0.11);
			shape.lineTo(w / 2 - 0.035, l / 2 - 0.03);
			shape.lineTo(-w / 2 + 0.07, l / 2);
			shape.lineTo(-w / 2, -l / 2 + 0.13);
			shape.closePath();
			const g = new THREE.ExtrudeGeometry(shape, {
				depth: 0.23,
				bevelEnabled: true,
				bevelSegments: 1,
				steps: 1,
				bevelSize: 0.035,
				bevelThickness: 0.035,
			});
			g.rotateX(-Math.PI / 2);
			const a = g.attributes.position;
			for (let k = 0; k < a.count; k++)
				a.setY(k, a.getY(k) + (a.getZ(k) * tangent.y) / Math.max(0.01, length));
			g.computeVertexNormals();
			add(
				g,
				stone[Math.floor(rand() * stone.length)],
				[
					p.x + Math.cos(yaw) * offset,
					p.y - 0.24,
					p.z - Math.sin(yaw) * offset,
				],
				[1, 1, 1],
				[0, yaw, 0],
			);
		}
		if (i % 2 === 0) {
			const side = i % 4 === 0 ? 1 : -1;
			box(
				[
					p.x + Math.cos(yaw) * width * 0.52 * side,
					p.y - 0.09,
					p.z - Math.sin(yaw) * width * 0.52 * side,
				],
				[0.18, 0.24, length * 0.9],
				stone[2],
				[0, yaw, 0],
			);
		}
	}
	// Project terraces: segmented limestone, with substantial rock beneath them.
	for (const {
		name,
		position: [x, y, z],
		radius: r,
	} of LANDMARKS) {
		rock([x, y * 0.45 - 1, z], [r * 1.25, y * 0.62, r * 1.2], rocks[1]);
		cylinder([x, y - 0.5, z], r * 1.1, r * 1.13, 0.44, stone[2], 14);
		cylinder([x, y - 0.21, z], r, r * 1.03, 0.25, stone[0], 18);
		cylinder([x, y - 0.065, z], r * 0.91, r * 0.94, 0.12, stone[1], 24);
		for (let j = 0; j < 12; j++) {
			const a = (j * Math.PI) / 6;
			box(
				[x + Math.sin(a) * r * 1.02, y - 0.38, z + Math.cos(a) * r * 1.02],
				[0.015, 0.23, 0.13],
				rocks[3],
				[0, a, 0],
			);
		}
		const anchor = new THREE.Object3D();
		anchor.name = `Landmark_${name}`;
		anchor.position.set(x, y, z);
		root.add(anchor);
	}
	function lantern(p, small = false) {
		const [x, y, z] = p,
			h = small ? 0.62 : 0.93;
		cylinder([x, y + 0.12, z], 0.16, 0.22, 0.24, rocks[2], 8);
		cylinder([x, y + h * 0.45, z], 0.055, 0.075, h * 0.65, bronze, 6);
		box([x, y + h, z], [0.22, 0.35, 0.22], glass);
		box([x, y + h + 0.2, z], [0.35, 0.06, 0.35], bronze);
		add(
			new THREE.ConeGeometry(0.27, 0.18, 4),
			bronze,
			[x, y + h + 0.31, z],
			[1, 1, 1],
			[0, Math.PI / 4, 0],
		);
		for (const a of [-1, 1])
			for (const b of [-1, 1])
				box([x + a * 0.12, y + h, z + b * 0.12], [0.025, 0.38, 0.025], bronze);
		lanterns.push([x, y + h, z]);
	}
	for (let i = 0; i < 19; i++) {
		const t = 0.035 + i * 0.049,
			p = COAST_PATH.getPointAt(t),
			d = COAST_PATH.getTangentAt(t);
		const side = i % 2 ? 1 : -1;
		lantern([p.x + d.z * 1.83 * side, p.y, p.z - d.x * 1.83 * side], t > 0.65);
	}
	// Branchy alpine pines, with asymmetric whorls instead of three stacked cones.
	function pine(x, y, z, h) {
		cylinder([x, y + h * 0.4, z], h * 0.016, h * 0.046, h * 0.8, wood, 7);
		const phase = range(0, 6.28);
		for (let k = 0; k < 7; k++) {
			const f = k / 7,
				cy = y + h * (0.26 + f * 0.67),
				radius = h * (0.25 - f * 0.2);
			const g = new THREE.ConeGeometry(radius, h * (0.33 - f * 0.12), 7, 1);
			const a = g.attributes.position;
			for (let n = 0; n < a.count; n++) {
				const ax = a.getX(n),
					az = a.getZ(n),
					jitter = 1 + 0.16 * Math.sin(ax * 11 + az * 17 + k);
				a.setXYZ(n, ax * jitter, a.getY(n), az * jitter);
			}
			g.computeVertexNormals();
			add(
				g,
				leaf[
					((Math.floor(x + z + k) % leaf.length) + leaf.length) % leaf.length
				],
				[
					x + Math.sin(k * 2 + phase) * h * 0.035,
					cy,
					z + Math.cos(k * 2 + phase) * h * 0.03,
				],
				[1, 1, 1],
				[range(-0.04, 0.04), phase + k * 0.61, range(-0.06, 0.06)],
			);
		}
	}
	for (let i = 0; i < 65; i++) {
		const t = range(0.02, 0.99),
			p = COAST_PATH.getPoint(t),
			side = rand() > 0.45 ? 1 : -1;
		const x = p.x + (side < 0 ? range(-4.6, -2.9) : range(3.3, 12)),
			z = p.z + range(-1, 1);
		if (
			LANDMARKS.some(
				(a) =>
					Math.hypot(a.position[0] - x, a.position[2] - z) < a.radius + 1.0,
			)
		)
			continue;
		const h = range(1.7, 4.2) * (t < 0.15 ? 0.9 : 1);
		pine(x, p.y - 0.53, z, h);
	}
	pine(16, 2.4, 26, 5.7);
	pine(20, 3.1, 22, 5);
	pine(24, 2.6, 28, 6.7);
	// Heather, grass blades and small stone scree along the path.
	for (let i = 0; i < 360; i++) {
		const t = rand(),
			p = COAST_PATH.getPoint(t),
			x = p.x + (rand() < 0.5 ? -1 : 1) * range(1.8, 4.7),
			z = p.z + range(-0.7, 0.7);
		if (
			LANDMARKS.some(
				(a) =>
					Math.hypot(a.position[0] - x, a.position[2] - z) < a.radius + 0.3,
			)
		)
			continue;
		const y = p.y - 0.36;
		if (i % 4 === 0)
			rock(
				[x, y, z],
				[range(0.12, 0.52), range(0.12, 0.38), range(0.12, 0.4)],
				rocks[i % 5],
				0,
			);
		else
			for (let j = 0; j < 3; j++) {
				const h = range(0.18, 0.6),
					a = range(0, 6.28);
				add(
					new THREE.ConeGeometry(0.085, h, 3),
					moss[i % 4],
					[x + Math.sin(a) * 0.14, y + h * 0.27, z + Math.cos(a) * 0.14],
					[1, 1, 1],
					[Math.sin(a) * 0.4, a, Math.cos(a) * 0.4],
				);
			}
	}
	// Overlapping ridges behind the headland, with a coherent geological silhouette.
	for (let layer = 0; layer < 3; layer++) {
		const positions = [],
			indices = [];
		const nx = 30,
			nz = 17;
		for (let iz = 0; iz <= nz; iz++)
			for (let ix = 0; ix <= nx; ix++) {
				const x = -52 + ix * 2.65 + layer * 5;
				const z = -27 - iz * 3.4 - layer * 18;
				const u = ix / nx,
					v = iz / nz;
				const envelope =
					Math.pow(Math.sin(Math.PI * u), 0.8) *
					Math.pow(Math.sin(Math.PI * v), 0.6);
				const ridge =
					14 +
					9 * Math.sin(x * 0.12 + z * 0.065) +
					5 * Math.cos(x * 0.29 - z * 0.09);
				const y = Math.max(
					-1,
					envelope * (ridge + layer * 5) * 0.8 + range(-1.5, 1.5),
				);
				positions.push(x + range(-0.8, 0.8), y, z + range(-0.8, 0.8));
			}
		for (let iz = 0; iz < nz; iz++)
			for (let ix = 0; ix < nx; ix++) {
				const a = iz * (nx + 1) + ix,
					b = a + nx + 1;
				indices.push(a, a + 1, b, a + 1, b + 1, b);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		g.setIndex(indices);
		g.computeVertexNormals();
		const m = mat(
			`Mountain ridge ${layer}`,
			["#9599ab", "#adb0bf", "#c0c1cc"][layer],
		);
		add(g, m);
	}
	// Offshore lighthouse, neutral masonry and a dark copper lantern room.
	const lx = -23,
		lz = -8;
	rock([lx, -0.15, lz], [3.8, 2.3, 3.6], rocks[2]);
	cylinder([lx, 1.85, lz], 0.9, 1.08, 0.35, stone[2], 16);
	cylinder([lx, 4.1, lz], 0.45, 0.76, 4.2, stone[1], 18);
	cylinder([lx, 6.25, lz], 0.79, 0.76, 0.22, stone[2], 18);
	cylinder([lx, 6.73, lz], 0.5, 0.5, 0.74, glass, 12);
	for (let i = 0; i < 8; i++) {
		const a = (i * Math.PI) / 4;
		cylinder(
			[lx + Math.sin(a) * 0.55, 6.73, lz + Math.cos(a) * 0.55],
			0.035,
			0.035,
			0.86,
			bronze,
			5,
		);
	}
	cylinder([lx, 7.12, lz], 0.73, 0.73, 0.14, bronze, 16);
	add(new THREE.ConeGeometry(0.83, 0.7, 16), bronze, [lx, 7.49, lz]);
	lanterns.push([lx, 6.73, lz]);
	// A small hilltop citadel creates a destination at the end of the path.
	const castle = mat("Citadel limestone", "#8b8b8a");
	const roof = mat("Oxidized roofs", "#505f68", 0.65);
	const tower = (x, y, z, r, h) => {
		cylinder([x, y + h / 2, z], r * 0.85, r, h, castle, 10);
		cylinder([x, y + h, z], r * 1.05, r * 1.05, 0.3, castle, 10);
		add(new THREE.ConeGeometry(r * 1.17, r * 2.1, 10), roof, [
			x,
			y + h + r * 1.05,
			z,
		]);
		box([x, y + h * 0.77, z + r * 0.91], [0.14, 0.38, 0.03], glass);
	};
	rock([19, 18, -38], [5, 5.8, 5.2], rocks[3]);
	box([19, 22.8, -38], [4.8, 2.8, 3.2], castle);
	box([19, 25, -38], [3.6, 2.8, 2.7], castle);
	for (const [x, z, r, h] of [
		[16.8, -36.4, 0.6, 3.5],
		[21.2, -36.4, 0.65, 4.2],
		[17, -39.6, 0.55, 4.8],
		[21.2, -39.6, 0.65, 4.9],
		[19, -38, 0.7, 6.4],
	])
		tower(x, 21.4, z, r, h);
	// Merge static geometry by material: hundreds of details, a few dozen draw calls.
	for (const [material, geometries] of buckets) {
		const merged = mergeGeometries(geometries, false);
		for (const g of geometries) g.dispose();
		merged.computeBoundingSphere();
		const mesh = new THREE.Mesh(merged, material);
		mesh.name = material.name;
		mesh.castShadow = material !== glass;
		mesh.receiveShadow = material !== glass;
		root.add(mesh);
	}
	return { root, lanterns };
}

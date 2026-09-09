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
	const moss = ["#707a3d", "#53673f", "#849047", "#405c40"].map((c, i) =>
		mat(`Heather ${i}`, c),
	);
	const stone = ["#a69b91", "#baab99", "#85888b", "#b7a99e", "#a5a4a2"].map(
		(c, i) => mat(`Limestone ${i}`, c, 0.36),
	);
	const leaf = ["#314a34", "#445b36", "#5c713d", "#778044"].map((c, i) =>
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
			const x = p.x - 5.2 + u * 22;
			let y = p.y - 0.62 + Math.sin(i * 1.63 + j * 0.71) * 0.27;
			const z = p.z + Math.sin(j * 2.3 + i * 0.8) * 0.65;
			if (j === 0) y = -1.1;
			else if (j === 1) y -= 0.5 + rand();
			if (j > 5) y += (u - 0.22) * range(2, 7);
			if (j === cols) y = -1.1;
			else if (j === cols - 1) y -= 2.2;
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
		const x = p.x + (side < 0 ? range(-6.5, -4.8) : range(7, 11));
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
	// Shared cross-sections make every joint fit, including the inside of bends.
	const paving = ["#b8aa9e", "#b4a69c", "#bcaea0", "#afa39b"].map((c, i) =>
		mat(`Paving ${i}`, c, 0.25),
	);
	const steps = 68;
	const sections = Array.from({ length: steps + 1 }, (_, i) => {
		const t = i / steps,
			p = COAST_PATH.getPointAt(t);
		const d = COAST_PATH.getTangentAt(t);
		const n = new THREE.Vector3(d.z, 0, -d.x).normalize();
		return [-1, 1].map((side) =>
			p.clone().addScaledVector(n, (side * (3.2 - t * 0.75)) / 2),
		);
	});
	for (let i = 0; i < steps; i++) {
		// A single full-width, gently bevelled block. All vertices are in world space.
		const quad = [
			sections[i][0],
			sections[i][1],
			sections[i + 1][1],
			sections[i + 1][0],
		];
		const center = quad
			.reduce((v, p) => v.add(p), new THREE.Vector3())
			.multiplyScalar(0.25);
		const outer = quad.map((p) => p.clone().lerp(center, 0.004));
		const top = outer.map((p) => p.clone().lerp(center, 0.012));
		const shoulder = outer.map((p) =>
			p.clone().add(new THREE.Vector3(0, -0.024, 0)),
		);
		const bottom = outer.map((p) =>
			p.clone().add(new THREE.Vector3(0, -0.42, 0)),
		);
		const vertices = [],
			tri = (a, b, c) =>
				vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
		tri(top[0], top[2], top[1]);
		tri(top[0], top[3], top[2]);
		for (let j = 0; j < 4; j++) {
			const k = (j + 1) % 4;
			tri(top[j], shoulder[k], shoulder[j]);
			tri(top[j], top[k], shoulder[k]);
			tri(shoulder[j], bottom[k], bottom[j]);
			tri(shoulder[j], shoulder[k], bottom[k]);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		g.computeVertexNormals();
		add(g, paving[i % 4]);
	}
	// Project terraces: segmented limestone, with substantial rock beneath them.
	for (const {
		name,
		position: [x, y, z],
		radius: r,
	} of LANDMARKS) {
		rock([x, y * 0.45 - 1, z], [r * 1.25, y * 0.62, r * 1.2], rocks[1]);
		cylinder([x, y - 0.72, z], r * 1.16, r * 1.19, 0.62, stone[2], 14);
		cylinder([x, y - 0.32, z], r, r * 1.02, 0.36, stone[0], 18);
		cylinder([x, y - 0.07, z], r * 0.89, r * 0.9, 0.14, stone[1], 24);
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
	// Consistent crowns, with lighting providing the tonal variation.
	function pine(x, y, z, h) {
		cylinder([x, y + h * 0.35, z], h * 0.022, h * 0.048, h * 0.7, wood, 7);
		const phase = range(0, 6.28),
			material = leaf[Math.floor(rand() * leaf.length)];
		for (let k = 0; k < 3; k++) {
			const f = k / 3;
			add(
				new THREE.ConeGeometry(
					h * (0.25 - f * 0.21),
					h * (0.58 - f * 0.23),
					5,
					1,
				),
				material,
				[x + f * h * 0.018, y + h * (0.4 + f * 0.7), z],
				[1, 1, 1],
				[0, phase + k * 0.12, 0],
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
	pine(19, 2.6, 28, 5.4);
	// Heather, grass blades and small stone scree along the path.
	for (let i = 0; i < 200; i++) {
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
		else {
			for (let j = 0; j < 6; j++) {
				const angle = (j * Math.PI) / 3 + range(-0.3, 0.3),
					h = range(0.35, 0.8),
					spread = range(0.25, 0.55);
				const g = new THREE.BufferGeometry();
				// Folded, tapered leaves catch the sunset on one face and remain shaded on the other.
				const v = [
					0,
					0,
					0,
					-0.1,
					h * 0.42,
					spread * 0.43,
					0,
					h * 0.6,
					spread * 0.47,
					0,
					0,
					0,
					0,
					h * 0.6,
					spread * 0.47,
					0.1,
					h * 0.42,
					spread * 0.43,
					-0.1,
					h * 0.42,
					spread * 0.43,
					0,
					h,
					spread,
					0,
					h * 0.6,
					spread * 0.47,
					0,
					h * 0.6,
					spread * 0.47,
					0,
					h,
					spread,
					0.1,
					h * 0.42,
					spread * 0.43,
				];
				g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
				g.computeVertexNormals();
				const m = moss[i % 4];
				m.side = THREE.DoubleSide;
				add(g, m, [x, y, z], [1, 1, 1], [0, angle, 0]);
			}
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
					Math.sin(Math.PI * u) ** 0.8 * Math.sin(Math.PI * v) ** 0.6;
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
			["#666b80", "#798498", "#949eaf"][layer],
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

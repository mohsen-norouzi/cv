import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { pavingBlock } from "./roadGeometry.js";
import { buildExpansion } from "./buildExpansion.js";
import { EXPANSION_PATH, EXPANSION_HALF_WIDTH } from "./expansionLayout.js";
import { COAST_PATH, LANDMARKS } from "./coastLayout.js";
import {
	createRoadSampler,
	roadHalfWidth,
	terraceOuterRadius,
} from "./placement.js";

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
	const audit = {
		terraces: [],
		plants: [],
		lanterns: [],
		rocks: [],
		rejected: 0,
	};
	const nearestRoad = createRoadSampler(COAST_PATH);
	const surfaces = [];
	const nearestExtension = createRoadSampler(EXPANSION_PATH, 600);
	const ray = new THREE.Raycaster(
		new THREE.Vector3(),
		new THREE.Vector3(0, -1, 0),
	);
	const groundAt = (x, z) => {
		ray.ray.origin.set(x, 80, z);
		return ray.intersectObjects(surfaces, false).at(0) ?? null;
	};
	const connectors = LANDMARKS.map((landmark) => {
		const [x, y, z] = landmark.position;
		const road = nearestRoad(x, z);
		const outward = new THREE.Vector3(
			x - road.point.x,
			0,
			z - road.point.z,
		).normalize();
		return {
			landmark,
			road,
			outward,
			start: road.point.clone().addScaledVector(outward, road.halfWidth - 0.06),
			end: new THREE.Vector3(x, y, z).addScaledVector(
				outward,
				-landmark.radius * 0.75,
			),
		};
	});
	const corridorDistance = (x, z, start, end) => {
		const dx = end.x - start.x,
			dz = end.z - start.z;
		const t = THREE.MathUtils.clamp(
			((x - start.x) * dx + (z - start.z) * dz) / (dx * dx + dz * dz),
			0,
			1,
		);
		return Math.hypot(x - start.x - t * dx, z - start.z - t * dz);
	};
	const clearAt = (x, z, radius, top = Infinity) => {
		if (top === Infinity) {
			const fixtures = [...audit.lanterns.map((l) => l.position)];
			for (let i = 1; i < 27; i++) {
				const u = i / 28,
					p = EXPANSION_PATH.getPoint(u),
					d = EXPANSION_PATH.getTangent(u).setY(0).normalize(),
					side = i % 2 ? 1 : -1;
				fixtures.push([
					p.x + d.z * (EXPANSION_HALF_WIDTH + 0.23) * side,
					p.y,
					p.z - d.x * (EXPANSION_HALF_WIDTH + 0.23) * side,
				]);
			}
			if (fixtures.some((p) => Math.hypot(x - p[0], z - p[2]) < radius + 0.5))
				return false;
		}
		const road = nearestRoad(x, z);
		const extension = nearestExtension(x, z);
		if (
			extension.distance < EXPANSION_HALF_WIDTH + radius + 0.2 &&
			top > extension.point.y - 0.6
		)
			return false;
		if (
			road.distance < road.halfWidth + radius + 0.18 &&
			top > road.point.y - radius * 0.4 - 0.5
		)
			return false;
		for (const landmark of LANDMARKS) {
			if (
				Math.hypot(x - landmark.position[0], z - landmark.position[2]) <
					terraceOuterRadius(landmark) + radius + 0.25 &&
				top > landmark.position[1] - 1.08
			)
				return false;
		}
		for (const connector of connectors)
			if (
				corridorDistance(x, z, connector.start, connector.end) < radius + 0.8 &&
				top > Math.min(connector.start.y, connector.end.y) - 0.5
			)
				return false;
		return true;
	};
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
	const rock = (p, scale, m, detail = 1, options = {}) => {
		const g = new THREE.IcosahedronGeometry(1, detail);
		const a = g.attributes.position;
		for (let i = 0; i < a.count; i++) {
			const x = a.getX(i),
				y = a.getY(i),
				z = a.getZ(i);
			const d = 1 + 0.15 * Math.sin(x * 13 + y * 9 + z * 7);
			a.setXYZ(i, x * d, y * d, z * d);
		}
		const rotation = new THREE.Euler(
			range(-0.14, 0.14),
			range(0, Math.PI),
			range(-0.13, 0.13),
		);
		g.applyMatrix4(
			new THREE.Matrix4().compose(
				new THREE.Vector3(...p),
				new THREE.Quaternion().setFromEuler(rotation),
				new THREE.Vector3(...scale),
			),
		);
		let footprint = 0,
			top = -Infinity;
		for (let i = 0; i < a.count; i++) {
			if (options.coastal && a.getY(i) < p[1]) {
				const t = THREE.MathUtils.clamp((p[1] - a.getY(i)) / scale[1], 0, 1);
				a.setY(i, THREE.MathUtils.lerp(p[1], -2.4, Math.min(1, t * 1.25)));
			}
			if (options.maxY !== undefined)
				a.setY(i, Math.min(a.getY(i), options.maxY));
			footprint = Math.max(
				footprint,
				Math.hypot(a.getX(i) - p[0], a.getZ(i) - p[2]),
			);
			top = Math.max(top, a.getY(i));
		}
		if (!options.keep && !clearAt(p[0], p[2], footprint, top)) {
			audit.rejected++;
			g.dispose();
			return false;
		}
		g.computeVertexNormals();
		const surface = new THREE.Mesh(g, m);
		surface.updateMatrixWorld(true);
		surfaces.push(surface);
		add(g, m);
		audit.rocks.push({
			position: p,
			radius: footprint,
			top,
			structural: !!options.keep,
		});
		return true;
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
			const z = p.z + Math.sin(j * 2.3 + i * 0.8) * 0.16;
			if (j === 0) y = -1.1;
			else if (j === 1) y -= 0.5 + rand();
			if (j > 5) y += (u - 0.22) * (3.8 + Math.sin(i * 0.43 + j * 0.32) * 1.2);
			if (j === cols) y = -1.1;
			else if (j === cols - 1) y -= 2.2;
			if (i === 0 || i === rows) y -= 1.2;
			const road = nearestRoad(x, z);
			if (road.distance < road.halfWidth + 1.35)
				y = Math.min(y, road.point.y - 0.55);
			for (const landmark of LANDMARKS)
				if (
					Math.hypot(x - landmark.position[0], z - landmark.position[2]) <
					terraceOuterRadius(landmark) + 1.35
				)
					y = Math.min(y, landmark.position[1] - 1.12);
			const extension = nearestExtension(x, z);
			if (extension.distance < EXPANSION_HALF_WIDTH + 1.2)
				y = Math.min(y, extension.point.y - 0.55);
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

	const perimeter = [
		...Array.from({ length: cols + 1 }, (_, j) => j),
		...Array.from({ length: rows }, (_, i) => (i + 1) * (cols + 1) + cols),
		...Array.from({ length: cols }, (_, j) => rows * (cols + 1) + cols - 1 - j),
		...Array.from({ length: rows - 1 }, (_, i) => (rows - 1 - i) * (cols + 1)),
	];
	const bottomRing = perimeter.map((i) => {
		const n = vertices.length / 3;
		vertices.push(vertices[i * 3], -2.2, vertices[i * 3 + 2]);
		return n;
	});
	for (let i = 0; i < perimeter.length; i++) {
		const j = (i + 1) % perimeter.length,
			a = perimeter[i],
			b = perimeter[j],
			c = bottomRing[i],
			d = bottomRing[j];
		faces.push(a, b, d, a, d, c);
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
	ng.computeVertexNormals();
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
	terrain.updateMatrixWorld(true);
	surfaces.push(terrain);
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
			1,
			{ coastal: true },
		);
		// Preserve the scatter seed when removing the former moss shelves.
		if (i % 3 === 0) {
			range(1, 2);
			range(1, 2);
			range(-0.14, 0.14);
			range(0, Math.PI);
			range(-0.13, 0.13);
		}
	}
	// Shared cross-sections make every joint fit, including the inside of bends.
	const paving = ["#b8aa9e", "#b4a69c", "#bcaea0", "#afa39b"].map((c, i) =>
		mat(`Paving ${i}`, c, 0.34),
	);
	const steps = 68;
	const sections = Array.from({ length: steps + 1 }, (_, i) => {
		const t = i / steps,
			p = COAST_PATH.getPointAt(t);
		const d = COAST_PATH.getTangentAt(t);
		const n = new THREE.Vector3(d.z, 0, -d.x).normalize();
		return [-1, 1].map((side) =>
			p.clone().addScaledVector(n, side * roadHalfWidth(t)),
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
		add(pavingBlock(quad), paving[i % 4]);
		const vertices = [],
			tri = (a, b, c) =>
				vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());

		// Retaining masonry carries the paving into the hillside instead of leaving
		// a floating slab wherever the ground slopes away from the road edge.
		const bedTop = quad.map((p) =>
			p.clone().add(new THREE.Vector3(0, -0.415, 0)),
		);
		const floor =
			Math.min(
				...quad.map((p) => groundAt(p.x, p.z)?.point.y ?? -1.3),
				groundAt(center.x, center.z)?.point.y ?? -1.3,
				...bedTop.map((p) => p.y - 0.1),
			) - 0.08;
		const bedBottom = bedTop.map((p) => new THREE.Vector3(p.x, floor, p.z));
		vertices.length = 0;
		tri(bedTop[0], bedTop[2], bedTop[1]);
		tri(bedTop[0], bedTop[3], bedTop[2]);
		for (let j = 0; j < 4; j++) {
			const k = (j + 1) % 4;
			tri(bedTop[j], bedBottom[k], bedBottom[j]);
			tri(bedTop[j], bedTop[k], bedBottom[k]);
		}
		const bed = new THREE.BufferGeometry();
		bed.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		bed.computeVertexNormals();
		add(bed, rocks[1]);
	}
	// Project terraces: segmented limestone, with substantial rock beneath them.
	for (const {
		name,
		position: [x, y, z],
		radius: r,
	} of LANDMARKS) {
		// A continuous retaining foundation meets the underside of the lowest tier.
		const floor = -1.3,
			ceiling = y - 1.03;
		cylinder(
			[x, (floor + ceiling) / 2, z],
			r * 1.19,
			r * 1.28,
			ceiling - floor,
			rocks[1],
			14,
		);
		audit.terraces.push({
			name,
			position: [x, y, z],
			radius: r,
			outerRadius: r * 1.19,
			roadClearance:
				nearestRoad(x, z).distance - nearestRoad(x, z).halfWidth - r * 1.19,
		});
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
	// Short fitted approach steps bridge the deliberate gap between road and terrace.
	for (const { start, end, outward, landmark } of connectors) {
		const length = Math.hypot(end.x - start.x, end.z - start.z);
		const count = Math.max(2, Math.ceil(length / 0.48));
		const angle = Math.atan2(outward.x, outward.z);
		for (let i = 0; i < count; i++) {
			const center = start.clone().lerp(end, (i + 0.5) / count);
			const top = THREE.MathUtils.lerp(
				start.y,
				landmark.position[1],
				(i + 1) / count,
			);
			const hit = groundAt(center.x, center.z);
			const bottom = Math.min(top - 0.42, hit?.point.y ?? -1.3) - 0.06;
			box(
				[center.x, (bottom + top) / 2, center.z],
				[1.2, top - bottom, length / count + 0.025],
				stone[0],
				[0, angle, 0],
			);
		}
	}

	function lantern(p, small = false) {
		const [x, y, z] = p,
			h = small ? 0.62 : 0.93;
		cylinder([x, y + 0.12, z], 0.16, 0.22, 0.24, rocks[2], 8);
		cylinder(
			[x, y + 0.15 + (h - 0.3) / 2, z],
			0.055,
			0.075,
			h - 0.3,
			bronze,
			6,
		);
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
			p = COAST_PATH.getPointAt(t);
		const d = COAST_PATH.getTangentAt(t).setY(0).normalize();
		const side = i % 2 ? 1 : -1;
		const x = p.x + d.z * (roadHalfWidth(t) + 0.2) * side;
		const z = p.z - d.x * (roadHalfWidth(t) + 0.2) * side;
		const hit = groundAt(x, z),
			floor = Math.min(p.y - 0.4, hit?.point.y ?? -1.3) - 0.06;
		const angle = Math.atan2(d.x, d.z);
		// The socket overlaps the road edge by 9 cm and rests on a stone footing.
		box([x, p.y - 0.2, z], [0.58, 0.4, 0.64], stone[2], [0, angle, 0]);
		box(
			[x, (floor + p.y - 0.38) / 2, z],
			[0.5, p.y - 0.38 - floor, 0.54],
			rocks[2],
			[0, angle, 0],
		);
		lantern([x, p.y, z], t > 0.65);
		audit.lanterns.push({
			position: [x, p.y, z],
			ground: hit?.point.y ?? null,
			footingBottom: floor,
			roadT: t,
		});
	}
	// Consistent crowns, with lighting providing the tonal variation.
	function pine(x, _y, z, h) {
		if (!clearAt(x, z, h * 0.26)) {
			audit.rejected++;
			return;
		}
		const hit = groundAt(x, z);
		if (
			!hit ||
			hit.object.name !== "Coastal escarpment" ||
			hit.point.y < -0.1 ||
			hit.face.normal.y < 0.65
		) {
			audit.rejected++;
			return;
		}
		const y = hit.point.y - 0.035;
		audit.plants.push({
			kind: "pine",
			position: [x, y, z],
			ground: hit.point.y,
			normalY: hit.face.normal.y,
			radius: h * 0.26,
		});
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
		if (!clearAt(x, z, 0.6)) {
			audit.rejected++;
			continue;
		}
		const hit = groundAt(x, z);
		if (
			!hit ||
			hit.object.name !== "Coastal escarpment" ||
			hit.point.y < -0.1 ||
			hit.face.normal.y < 0.65
		) {
			audit.rejected++;
			continue;
		}
		const y = hit.point.y - 0.025;
		if (i % 4 === 0)
			rock(
				[x, y, z],
				[range(0.12, 0.52), range(0.12, 0.38), range(0.12, 0.4)],
				rocks[i % 5],
				0,
			);
		else {
			audit.plants.push({
				kind: "grass",
				position: [x, y, z],
				ground: hit.point.y,
				normalY: hit.face.normal.y,
				radius: 0.6,
			});
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
	buildExpansion({
		root,
		add,
		box,
		cylinder,
		stone,
		rocks,
		moss,
		leaf,
		wood,
		paving,
		groundAt,
		lantern,
		audit,
		surfaces,
		terrainMaterial: gm,
		mainSections: sections,
	});
	// Offshore lighthouse, neutral masonry and a dark copper lantern room.
	const lx = -23,
		lz = -8;
	rock([lx, -0.15, lz], [3.8, 2.3, 3.6], rocks[2], 1, {
		keep: true,
		maxY: 1.675,
	});
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
	cylinder([19, (19.2 - 2.4) / 2, -40.7], 6.1, 8.6, 21.6, rocks[3], 13);
	rock([19, 17.4, -40.7], [6.3, 5.8, 5.1], rocks[3], 1, {
		keep: true,
		maxY: 19.18,
		coastal: true,
	});
	box([19, 20.3, -40.7], [5.8, 2.2, 4.8], stone[2]);
	// A level approach and two shallow risers connect the road to the gate.
	for (let i = 0; i < 6; i++) {
		const top = 21 + Math.max(0, i - 3) * 0.2;
		box([19, (19 + top) / 2, -36.2 - i * 0.4], [2.4, top - 19, 0.42], stone[0]);
	}
	box([19, 22.8, -40.7], [4.8, 2.8, 3.2], castle);
	box([19, 25, -40.7], [3.6, 2.8, 2.7], castle);
	for (const [x, z, r, h] of [
		[16.8, -39.1, 0.6, 3.5],
		[21.2, -39.1, 0.65, 4.2],
		[17, -42.3, 0.55, 4.8],
		[21.2, -42.3, 0.65, 4.9],
		[19, -40.7, 0.7, 6.4],
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
	return { root, lanterns, audit };
}

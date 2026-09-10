import * as THREE from "three";
import {
	EXPANSION_PATH as path,
	EXPANSION_HALF_WIDTH as halfWidth,
	HEADLANDS,
	FUTURE_TERRACES,
	BRIDGE_SPANS,
} from "./expansionLayout.js";
import { createRoadSampler } from "./placement.js";

// Authored once at export time. The browser loads the merged, baked result.
export function buildExpansion({
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
	terrainMaterial,
}) {
	const nearest = createRoadSampler(path, 600);
	const bridgeMaterial = stone[2].clone();
	bridgeMaterial.name = "Bridge masonry";
	const triGeometry = (vertices) => {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		g.computeVertexNormals();
		return g;
	};
	const connections = FUTURE_TERRACES.map((site) => {
		const [x, y, z] = site.position,
			road = nearest(x, z),
			out = new THREE.Vector3(
				x - road.point.x,
				0,
				z - road.point.z,
			).normalize();
		return {
			site,
			start: road.point.clone().addScaledVector(out, halfWidth - 0.1),
			end: new THREE.Vector3(x, y, z).addScaledVector(out, -site.radius * 0.75),
			out,
		};
	});
	const safeHeight = (x, y, z) => {
		const r = nearest(x, z);
		if (r.distance < halfWidth + 1.1) y = Math.min(y, r.point.y - 0.55);
		for (const site of FUTURE_TERRACES)
			if (
				Math.hypot(x - site.position[0], z - site.position[2]) <
				site.radius * 1.19 + 1
			)
				y = Math.min(y, site.position[1] - 1.1);
		for (const { start, end } of connections) {
			const d = end.clone().sub(start);
			const u = THREE.MathUtils.clamp(
				((x - start.x) * d.x + (z - start.z) * d.z) / (d.x * d.x + d.z * d.z),
				0,
				1,
			);
			if (Math.hypot(x - start.x - u * d.x, z - start.z - u * d.z) < 1.1)
				y = Math.min(y, Math.min(start.y, end.y) - 0.5);
		}
		return y;
	};
	for (const [index, island] of HEADLANDS.entries()) {
		const [cx, cy, cz] = island.center,
			[rx, rz] = island.radius;
		const rings = [0, 0.28, 0.53, 0.72, 0.89, 1],
			segments = 44,
			positions = [],
			indices = [];
		for (let r = 0; r < rings.length; r++)
			for (let a = 0; a < segments; a++) {
				const angle = (a / segments) * Math.PI * 2,
					radius = rings[r],
					irregular =
						1 +
						0.065 * Math.sin(angle * 5 + index) +
						0.04 * Math.sin(angle * 9 - index);
				const x = cx + Math.cos(angle) * rx * radius * irregular,
					z = cz + Math.sin(angle) * rz * radius * irregular;
				let y =
					r === 5
						? -1.55
						: r === 4
							? cy * 0.46
							: cy +
								Math.sin(x * 0.74 + z * 0.31) * 0.33 -
								Math.max(0, radius - 0.48) * 2;
				if (index === 0 && x < 37.5) y = -1.55;
				y = safeHeight(x, y, z);
				positions.push(x, y, z);
			}
		for (let r = 0; r < rings.length - 1; r++)
			for (let a = 0; a < segments; a++) {
				const b = (a + 1) % segments,
					A = r * segments + a,
					B = r * segments + b,
					C = (r + 1) * segments + a,
					D = (r + 1) * segments + b;
				indices.push(A, B, C, B, D, C);
			}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		g.setIndex(indices);
		g.computeVertexNormals();
		const ng = g.toNonIndexed(),
			colors = [];
		for (let i = 0; i < ng.attributes.position.count; i += 3) {
			const color = (
				ng.attributes.normal.getY(i) > 0.6
					? moss[(i / 3 + index) % moss.length]
					: rocks[(i / 3 + index) % rocks.length]
			).color.clone();
			color.multiplyScalar(0.94 + 0.08 * Math.sin(i * 1.39));
			for (let k = 0; k < 3; k++) colors.push(...color.toArray());
		}
		ng.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		g.dispose();
		const mesh = new THREE.Mesh(ng, terrainMaterial);
		mesh.name = "Coastal escarpment";
		mesh.castShadow = mesh.receiveShadow = true;
		root.add(mesh);
		mesh.updateMatrixWorld(true);
		surfaces.push(mesh);
	}
	// Slabs and their substructure share cross-sections, including the bridge decks.
	const count = 172;
	const sections = Array.from({ length: count + 1 }, (_, i) => {
		const u = i / count,
			p = path.getPoint(u),
			d = path.getTangent(u).setY(0).normalize(),
			n = new THREE.Vector3(d.z, 0, -d.x);
		return {
			u,
			p,
			d,
			n,
			edges: [
				p.clone().addScaledVector(n, -halfWidth),
				p.clone().addScaledVector(n, halfWidth),
			],
		};
	});
	for (let i = 0; i < count; i++) {
		const a = sections[i],
			b = sections[i + 1],
			quad = [a.edges[0], a.edges[1], b.edges[1], b.edges[0]],
			verts = [];
		const tri = (x, y, z) =>
			verts.push(...x.toArray(), ...y.toArray(), ...z.toArray());
		const center = a.p.clone().lerp(b.p, 0.5),
			outer = quad.map((p) => p.clone().lerp(center, 0.002)),
			top = outer.map((p) => p.clone().lerp(center, 0.008));
		const shoulder = outer.map((p) =>
				p.clone().add(new THREE.Vector3(0, -0.022, 0)),
			),
			bottom = outer.map((p) => p.clone().add(new THREE.Vector3(0, -0.42, 0)));
		tri(top[0], top[2], top[1]);
		tri(top[0], top[3], top[2]);
		for (let j = 0; j < 4; j++) {
			const k = (j + 1) % 4;
			tri(top[j], top[k], shoulder[k]);
			tri(top[j], shoulder[k], shoulder[j]);
			tri(shoulder[j], shoulder[k], bottom[k]);
			tri(shoulder[j], bottom[k], bottom[j]);
		}
		add(triGeometry(verts), paving[i % paving.length]);
		const span = BRIDGE_SPANS.find(([s, e]) => a.u >= s && b.u <= e);
		const bedTop = quad.map((p) =>
			p.clone().add(new THREE.Vector3(0, -0.415, 0)),
		);
		const baseY = (p, u) => {
			if (span) {
				const t = THREE.MathUtils.clamp(
					(u - span[0]) / (span[1] - span[0]),
					0,
					1,
				);
				return -1.55 + (p.y + 1.55 - 1.15) * Math.sin(Math.PI * t) ** 0.65;
			}
			return Math.min(p.y - 0.55, groundAt(p.x, p.z)?.point.y ?? -1.5) - 0.06;
		};
		const base = quad.map(
			(p, j) => new THREE.Vector3(p.x, baseY(p, j < 2 ? a.u : b.u), p.z),
		);
		verts.length = 0;
		tri(bedTop[0], bedTop[2], bedTop[1]);
		tri(bedTop[0], bedTop[3], bedTop[2]);
		for (let j = 0; j < 4; j++) {
			const k = (j + 1) % 4;
			tri(bedTop[j], base[k], base[j]);
			tri(bedTop[j], bedTop[k], base[k]);
		}
		tri(base[0], base[1], base[2]);
		tri(base[0], base[2], base[3]);
		add(triGeometry(verts), span ? bridgeMaterial : rocks[1]);
		// Bridge balustrades. The clear walking width remains the full 3.2 metres.
		if (span) {
			for (const side of [-1, 1]) {
				const x = a.p.clone().addScaledVector(a.n, side * (halfWidth + 0.05));
				const y = b.p.clone().addScaledVector(b.n, side * (halfWidth + 0.05));
				const midpoint = x.clone().lerp(y, 0.5);
				midpoint.y += 0.88;
				const delta = y.clone().sub(x),
					len = delta.length();
				const rail = new THREE.CylinderGeometry(0.05, 0.05, len, 6);
				rail.applyQuaternion(
					new THREE.Quaternion().setFromUnitVectors(
						new THREE.Vector3(0, 1, 0),
						delta.normalize(),
					),
				);
				add(rail, wood, midpoint.toArray());
				if (i % 3 === 0)
					box([x.x, x.y + 0.51, x.z], [0.18, 1.02, 0.18], stone[2], [
						0,
						Math.atan2(a.d.x, a.d.z),
						0,
					]);
			}
		}
	}
	const endPoint = path.getPoint(1);
	cylinder(
		[endPoint.x, (endPoint.y - 0.42 - 1.55) / 2, endPoint.z],
		2.15,
		2.45,
		endPoint.y - 0.42 + 1.55,
		rocks[1],
		20,
	);
	cylinder(
		[endPoint.x, endPoint.y - 0.21, endPoint.z],
		2.1,
		2.15,
		0.42,
		stone[1],
		24,
	);
	for (const site of FUTURE_TERRACES) {
		const [x, y, z] = site.position,
			r = site.radius,
			floor = -1.55,
			ceiling = y - 1.03;
		cylinder(
			[x, (floor + ceiling) / 2, z],
			r * 1.19,
			r * 1.28,
			ceiling - floor,
			rocks[1],
			18,
		);
		cylinder([x, y - 0.72, z], r * 1.16, r * 1.19, 0.62, stone[2], 18);
		cylinder([x, y - 0.32, z], r, r * 1.02, 0.36, stone[0], 22);
		cylinder([x, y - 0.07, z], r * 0.89, r * 0.9, 0.14, stone[1], 28);
		audit.terraces.push({
			...site,
			outerRadius: r * 1.19,
			roadClearance: nearest(x, z).distance - halfWidth - r * 1.19,
			reserved: true,
		});
		const anchor = new THREE.Object3D();
		anchor.name = `Reserved_${site.id}`;
		anchor.position.fromArray(site.position);
		root.add(anchor);
		const road = nearest(x, z),
			out = new THREE.Vector3(
				x - road.point.x,
				0,
				z - road.point.z,
			).normalize(),
			angle = Math.atan2(out.x, out.z);
		// A low stone bench at the far edge leaves the exhibit centre completely clear.
		const bx = x + out.x * r * 0.68,
			bz = z + out.z * r * 0.68;
		box([bx, y + 0.46, bz], [1.65, 0.16, 0.48], stone[2], [0, angle, 0]);
		for (const side of [-1, 1])
			box(
				[
					bx + Math.cos(angle) * side * 0.58,
					y + 0.2,
					bz - Math.sin(angle) * side * 0.58,
				],
				[0.2, 0.4, 0.38],
				stone[2],
				[0, angle, 0],
			);
	}
	for (const { site, start, end, out } of connections) {
		const length = Math.hypot(end.x - start.x, end.z - start.z),
			steps = Math.max(2, Math.ceil(length / 0.4));
		for (let i = 0; i < steps; i++) {
			const p = start.clone().lerp(end, (i + 0.5) / steps),
				top = THREE.MathUtils.lerp(start.y, site.position[1], (i + 1) / steps),
				base = Math.min(top - 0.42, groundAt(p.x, p.z)?.point.y ?? -1.5) - 0.05;
			box(
				[p.x, (top + base) / 2, p.z],
				[1.6, top - base, length / steps + 0.035],
				stone[0],
				[0, Math.atan2(out.x, out.z), 0],
			);
		}
	}
	// Regular lamps and rooted cypress clusters give the extension human scale.
	for (let i = 1; i < 27; i++) {
		const u = i / 28,
			p = path.getPoint(u),
			d = path.getTangent(u).setY(0).normalize(),
			side = i % 2 ? 1 : -1;
		const x = p.x + d.z * (halfWidth + 0.23) * side,
			z = p.z - d.x * (halfWidth + 0.23) * side;
		box([x, p.y - 0.18, z], [0.62, 0.36, 0.62], stone[2]);
		lantern([x, p.y, z], true);
		audit.lanterns.push({
			position: [x, p.y, z],
			expansion: true,
			roadT: u,
			footingBottom: p.y - 0.36,
			support: "paving socket",
		});
	}
	for (const [index, island] of HEADLANDS.entries())
		for (let i = 0; i < 32; i++) {
			const a = i * 2.39996 + index,
				r = 0.34 + (i % 5) * 0.115,
				[cx, , cz] = island.center;
			const x = cx + Math.cos(a) * island.radius[0] * r,
				z = cz + Math.sin(a) * island.radius[1] * r,
				h = 1.8 + (i % 6) * 0.29;
			if (
				nearest(x, z).distance < halfWidth + 1.15 ||
				FUTURE_TERRACES.some(
					(s) =>
						Math.hypot(x - s.position[0], z - s.position[2]) <
						s.radius * 1.19 + 1.15,
				)
			)
				continue;
			if (
				connections.some(({ start, end }) => {
					const d = end.clone().sub(start),
						t = THREE.MathUtils.clamp(
							((x - start.x) * d.x + (z - start.z) * d.z) /
								(d.x * d.x + d.z * d.z),
							0,
							1,
						);
					return Math.hypot(x - start.x - t * d.x, z - start.z - t * d.z) < 1.5;
				})
			)
				continue;
			const hit = groundAt(x, z);
			if (!hit || hit.face.normal.y < 0.7 || hit.point.y < 0) continue;
			const y = hit.point.y - 0.03;
			cylinder([x, y + h * 0.34, z], 0.06, 0.1, h * 0.68, wood, 7);
			add(new THREE.ConeGeometry(h * 0.19, h, 7), leaf[i % leaf.length], [
				x,
				y + h * 0.62,
				z,
			]);
			audit.plants.push({
				kind: "cypress",
				position: [x, y, z],
				ground: hit.point.y,
				normalY: hit.face.normal.y,
				radius: h * 0.19,
				expansion: true,
			});
		}
	audit.expansion = {
		headlands: HEADLANDS.length,
		reservedTerraces: FUTURE_TERRACES.length,
		routeLength: path.getLength(),
		bridges: BRIDGE_SPANS.map(([start, end]) => ({
			start: path.getPoint(start).toArray(),
			end: path.getPoint(end).toArray(),
		})),
	};
}

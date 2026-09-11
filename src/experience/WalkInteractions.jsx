import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COAST_PATH, LANDMARKS } from "./coastLayout";
import { EXPANSION_PATH, FUTURE_TERRACES, HEADLANDS } from "./expansionLayout";
import { TEMPLATE_BOARD } from "./templateBoardPlacement";
import { getCollectionOpen, setCollectionOpen } from "./collectionStore";
import { PROJECTS } from "./projects";
import { useWalking, walkInput } from "./walkStore";
import { reducedMotion } from "./motion";
import {
	advanceWalkFocus,
	nearestWalkStop,
	visibleWalkHit,
	WALK_REACH,
} from "./walkInteractionMath";
import { publishWalkHud, registerWalkAction, walkFocus } from "./walkHudStore";

const targets = [...LANDMARKS, TEMPLATE_BOARD].map((target, index) => ({
	...target,
	stop: index + 1,
}));
const mapData = {
	paths: [COAST_PATH, EXPANSION_PATH].map((path) =>
		path.getPoints(120).map((p) => [p.x, p.z]),
	),
	stops: targets.map((t) => ({
		stop: t.stop,
		position: [t.position[0], t.position[2]],
	})),
	terraces: FUTURE_TERRACES.slice(1).map((t) => [t.position[0], t.position[2]]),
	headlands: HEADLANDS.map((h) => ({
		center: [h.center[0], h.center[2]],
		radius: h.radius,
	})),
};
function isVisible(object) {
	for (let node = object; node; node = node.parent)
		if (!node.visible) return false;
	return true;
}
export default function WalkInteractions() {
	const active = useWalking();
	const { camera, scene, gl } = useThree();
	const elapsed = useRef(0);
	const ray = useMemo(() => new THREE.Raycaster(), []);
	const pointer = useMemo(() => new THREE.Vector2(), []);
	const forward = useMemo(() => new THREE.Vector3(), []);
	const objects = useRef({ targets: [], blockers: [] });
	const aimed = useRef(0);

	useEffect(() => {
		if (!active) return;
		const roots = [],
			blockers = [];
		scene.traverse((object) => {
			if (object.userData.walkTarget) roots.push(object);
			if (object.userData.walkOccluder) blockers.push(object);
		});
		objects.current = { targets: roots, blockers };
		publishWalkHud({ map: mapData });
		const canvas = gl.domElement;
		function pick(event) {
			pointer.set(0, 0);
			if (event && document.pointerLockElement !== canvas) {
				const rect = canvas.getBoundingClientRect();
				pointer.set(
					((event.clientX - rect.left) / rect.width) * 2 - 1,
					(-(event.clientY - rect.top) / rect.height) * 2 + 1,
				);
			}
			camera.updateMatrixWorld();
			ray.setFromCamera(pointer, camera);
			ray.far = WALK_REACH;
			const hits = ray
				.intersectObjects(objects.current.targets, true)
				.filter((hit) => isVisible(hit.object));
			if (!hits.length) return 0;
			const blockers = ray
				.intersectObjects(objects.current.blockers, true)
				.filter((hit) => isVisible(hit.object));
			const hit = visibleWalkHit(hits, blockers);
			if (!hit) return 0;
			for (let node = hit.object; node; node = node.parent)
				if (node.userData.walkTarget) return node.userData.walkTarget;
			return 0;
		}
		function activate(event) {
			if (getCollectionOpen()) return;
			const stop = pick(event);
			if (!stop) return;
			Object.assign(walkInput, { forward: 0, side: 0, yaw: 0, pitch: 0 });
			if (document.pointerLockElement === canvas) document.exitPointerLock();
			if (stop === 4) setCollectionOpen(true);
			else window.open(PROJECTS[stop - 1].url, "_blank", "noopener,noreferrer");
		}
		const unregister = registerWalkAction(() => activate());
		let start = null,
			moved = false;
		const down = (event) => {
			start = [event.clientX, event.clientY];
			moved = false;
		};
		const move = (event) => {
			if (
				start &&
				Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6
			)
				moved = true;
		};
		const click = (event) => {
			// Pointer lock keeps the cursor elsewhere: always raycast through the crosshair.
			event.stopImmediatePropagation();
			if (
				event.button === 0 &&
				(!moved || document.pointerLockElement === canvas)
			)
				activate(event);
			start = null;
		};
		const key = (event) => {
			if (
				event.code !== "KeyF" ||
				event.repeat ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				getCollectionOpen()
			)
				return;
			if (
				document.pointerLockElement !== canvas &&
				event.target.closest?.(
					"input,select,textarea,button,a,[contenteditable]",
				)
			)
				return;
			event.preventDefault();
			activate();
		};
		const update = () => {
			aimed.current = getCollectionOpen() ? 0 : pick();
			camera.getWorldDirection(forward);
			publishWalkHud({
				x: camera.position.x,
				z: camera.position.z,
				heading: (Math.atan2(forward.x, -forward.z) * 180) / Math.PI,
				nearby: walkFocus.stop,
				target: aimed.current,
				locked: document.pointerLockElement === canvas,
			});
		};
		objects.current.update = update;
		canvas.addEventListener("pointerdown", down, true);
		canvas.addEventListener("pointermove", move, true);
		canvas.addEventListener("click", click, true);
		window.addEventListener("keydown", key);
		return () => {
			unregister();
			canvas.removeEventListener("pointerdown", down, true);
			canvas.removeEventListener("pointermove", move, true);
			canvas.removeEventListener("click", click, true);
			window.removeEventListener("keydown", key);
			objects.current.update = null;
			walkFocus.stop = 0;
			walkFocus.reveal = 0;
			publishWalkHud({ target: 0, nearby: 0 });
		};
	}, [active, camera, scene, gl, ray, pointer, forward]);

	useFrame((_, dt) => {
		if (!active) return;
		const desired = nearestWalkStop(camera.position, targets, walkFocus.stop);
		advanceWalkFocus(walkFocus, desired, dt, reducedMotion());
		elapsed.current += dt;
		// Picking and HUD updates are capped; the map never triggers scene renders.
		if (elapsed.current >= 0.1) {
			elapsed.current = 0;
			objects.current.update?.();
		}
	}, -1.5);
	return null;
}

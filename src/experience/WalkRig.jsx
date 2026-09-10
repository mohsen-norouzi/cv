import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COAST_PATH, LANDMARKS } from "./coastLayout";
import { CAM_FOV } from "./constants";
import { createRoadSampler } from "./placement";
import { getScrollSection } from "./scrollStore";
import { createWalkGround, EYE_HEIGHT, moveWalker } from "./walkPhysics";
import { setWalking, useWalking, walkInput } from "./walkStore";

const MOVEMENT_KEYS = new Set([
	"KeyW",
	"KeyA",
	"KeyS",
	"KeyD",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"KeyQ",
	"KeyE",
	"ShiftLeft",
	"ShiftRight",
]);
export default function WalkRig() {
	const active = useWalking();
	const { camera, gl } = useThree();
	const [, { scene }] = useGLTF([
		"/optimized/subjects.glb",
		"/optimized/coast.glb",
	]);
	const ground = useMemo(() => createWalkGround(scene), [scene]);
	const obstacles = useMemo(() => {
		const list = LANDMARKS.map((landmark, i) => ({
			x: landmark.position[0],
			y: landmark.position[1],
			z: landmark.position[2],
			radius: [0.55, 1.25, 1.1][i],
		}));
		scene.traverse((o) => {
			for (const [x, y, z] of o.userData.lanterns ?? [])
				list.push({ x, y: y - 0.8, z, radius: 0.17 });
		});
		return list;
	}, [scene]);
	const state = useRef({
		feet: new THREE.Vector3(),
		yaw: 0,
		pitch: 0,
		keys: new Set(),
		rotation: new THREE.Euler(0, 0, 0, "YXZ"),
	});

	useEffect(() => {
		if (!active) return;
		const canvas = gl.domElement,
			s = state.current;
		const saved = {
			position: camera.position.clone(),
			quaternion: camera.quaternion.clone(),
		};
		const stop = getScrollSection(),
			landmark = LANDMARKS[stop - 1];
		const spawn = landmark
			? createRoadSampler(COAST_PATH)(
					landmark.position[0],
					landmark.position[2],
				).point
			: COAST_PATH.getPointAt(0.055);
		s.feet.copy(spawn);
		s.feet.y = ground(spawn.x, spawn.z, spawn.y) ?? spawn.y;
		const target = landmark
			? new THREE.Vector3(...landmark.position)
			: COAST_PATH.getPointAt(0.11);
		s.yaw = Math.atan2(spawn.x - target.x, spawn.z - target.z);
		s.pitch = 0;
		s.keys.clear();
		camera.position.copy(s.feet).y += EYE_HEIGHT;
		camera.fov = 68;
		camera.updateProjectionMatrix();
		let drag = null,
			wasLocked = false;
		const clear = () => {
			s.keys.clear();
			drag = null;
			Object.assign(walkInput, { forward: 0, side: 0, yaw: 0, pitch: 0 });
		};
		const onKey = (event) => {
			if (event.code === "Escape") {
				setWalking(false);
				return;
			}
			if (
				event.altKey ||
				event.metaKey ||
				event.ctrlKey ||
				event.target.closest?.("button,input,textarea,select,a")
			)
				return;
			if (MOVEMENT_KEYS.has(event.code)) {
				event.preventDefault();
				s.keys.add(event.code);
			}
		};
		const onUp = (event) => s.keys.delete(event.code);
		const onDown = (event) => {
			if (event.button !== 0 && event.pointerType === "mouse") return;
			drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
			canvas.setPointerCapture(event.pointerId);
			canvas.focus();
		};
		const onMove = (event) => {
			if (
				document.pointerLockElement !== canvas &&
				drag?.id !== event.pointerId
			)
				return;
			const locked = document.pointerLockElement === canvas;
			const dx = locked ? event.movementX : event.clientX - drag.x;
			const dy = locked ? event.movementY : event.clientY - drag.y;
			if (drag) {
				drag.x = event.clientX;
				drag.y = event.clientY;
			}
			s.yaw -= dx * 0.0025;
			s.pitch = THREE.MathUtils.clamp(s.pitch - dy * 0.0025, -1.35, 1.35);
		};
		const onEnd = (event) => {
			if (drag?.id === event.pointerId) drag = null;
		};
		const onLock = () => {
			const locked = document.pointerLockElement === canvas;
			if (wasLocked && !locked) setWalking(false);
			wasLocked = locked;
		};
		const oldTabIndex = canvas.getAttribute("tabindex");
		canvas.tabIndex = 0;
		canvas.focus();
		canvas.style.touchAction = "none";
		window.addEventListener("keydown", onKey);
		window.addEventListener("keyup", onUp);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", clear);
		document.addEventListener("pointerlockchange", onLock);
		canvas.addEventListener("pointerdown", onDown);
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerup", onEnd);
		canvas.addEventListener("pointercancel", onEnd);
		return () => {
			clear();
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("keyup", onUp);
			window.removeEventListener("blur", clear);
			document.removeEventListener("visibilitychange", clear);
			document.removeEventListener("pointerlockchange", onLock);
			canvas.removeEventListener("pointerdown", onDown);
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerup", onEnd);
			canvas.removeEventListener("pointercancel", onEnd);
			if (document.pointerLockElement === canvas) document.exitPointerLock();
			if (oldTabIndex === null) canvas.removeAttribute("tabindex");
			else canvas.setAttribute("tabindex", oldTabIndex);
			canvas.style.touchAction = "";
			camera.position.copy(saved.position);
			camera.quaternion.copy(saved.quaternion);
			camera.fov = canvas.clientWidth < 700 ? 58 : CAM_FOV;
			camera.updateProjectionMatrix();
		};
	}, [active, camera, gl, ground]);

	useFrame((_, delta) => {
		if (!active) return;
		const s = state.current,
			dt = Math.min(delta, 0.05),
			keys = s.keys;
		const forward =
			Number(keys.has("KeyW") || keys.has("ArrowUp")) -
			Number(keys.has("KeyS") || keys.has("ArrowDown")) +
			walkInput.forward;
		const side =
			Number(keys.has("KeyD") || keys.has("ArrowRight")) -
			Number(keys.has("KeyA") || keys.has("ArrowLeft")) +
			walkInput.side;
		s.yaw += (Number(keys.has("KeyQ")) - Number(keys.has("KeyE"))) * dt * 1.5;
		const speed =
			((keys.has("ShiftLeft") || keys.has("ShiftRight") ? 3.5 : 2.1) * dt) /
			Math.max(1, Math.hypot(forward, side));
		if (forward || side)
			moveWalker(
				s.feet,
				(side * Math.cos(s.yaw) - forward * Math.sin(s.yaw)) * speed,
				(-forward * Math.cos(s.yaw) - side * Math.sin(s.yaw)) * speed,
				ground,
				obstacles,
			);
		camera.position.x = s.feet.x;
		camera.position.z = s.feet.z;
		camera.position.y = THREE.MathUtils.damp(
			camera.position.y,
			s.feet.y + EYE_HEIGHT,
			18,
			dt,
		);
		s.rotation.set(s.pitch, s.yaw, 0);
		camera.quaternion.setFromEuler(s.rotation);
	}, -2);
	return null;
}

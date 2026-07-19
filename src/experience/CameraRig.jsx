import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
	BAKERY_LOOK_AT,
	BAKERY_VIEW_POS,
	CAM_FOV,
	CAM_LOOK_GIRL_TO_BAKERY,
	CAM_LOOK_HERO_TO_GIRL,
	CAM_PATH_BAKERY_TO_CRYSTAL,
	CAM_PATH_GIRL_TO_BAKERY,
	CAM_PATH_HERO_TO_GIRL,
	CAM_START,
	CAM_TARGET,
	CRYSTAL_LOOK_AT,
	CRYSTAL_VIEW_POS,
} from "./constants";
import { getScrollProgress, isScrollAnimating } from "./scrollStore";

const PARALLAX_X = 0.45;
const PARALLAX_Y = 0.26;
const LOOK_X = 0.14;
const LOOK_Y = 0.08;
const DAMP = 2.8;
/** Extra softness on top of the eased scroll progress */
const FOLLOW_DAMP = 2.2;
/** Bakery → crystal segment index */
const CRYSTAL_SEG = 2;
const LOOK_DIST = 10;
const _fwd = new THREE.Vector3(0, 0, -1);
const _dir = new THREE.Vector3();

function makeCurve(points) {
	return new THREE.CatmullRomCurve3(
		points.map((p) => p.clone()),
		false,
		"catmullrom",
		0.15,
	);
}

function sampleSegment(curves, progress, out) {
	const i0 = Math.min(curves.length - 1, Math.floor(progress));
	const t = THREE.MathUtils.clamp(progress - i0, 0, 1);
	curves[i0].getPointAt(t, out);
}

function easeInOut(t) {
	return t * t * (3 - 2 * t);
}

export default function CameraRig() {
	const { camera } = useThree();
	const offset = useRef(new THREE.Vector2());
	const look = useRef(new THREE.Vector3());
	const pos = useRef(new THREE.Vector3());
	const targetPos = useRef(new THREE.Vector3());
	const targetLook = useRef(new THREE.Vector3());
	const smoothP = useRef(0);
	const qStart = useRef(new THREE.Quaternion());
	const qEnd = useRef(new THREE.Quaternion());
	const qNow = useRef(new THREE.Quaternion());

	const posCurves = useMemo(
		() => [
			makeCurve(CAM_PATH_HERO_TO_GIRL),
			makeCurve(CAM_PATH_GIRL_TO_BAKERY),
			makeCurve(CAM_PATH_BAKERY_TO_CRYSTAL),
		],
		[],
	);
	const lookCurves = useMemo(
		() => [
			makeCurve(CAM_LOOK_HERO_TO_GIRL),
			makeCurve(CAM_LOOK_GIRL_TO_BAKERY),
		],
		[],
	);

	useLayoutEffect(() => {
		const d0 = BAKERY_LOOK_AT.clone().sub(BAKERY_VIEW_POS).normalize();
		const d1 = CRYSTAL_LOOK_AT.clone().sub(CRYSTAL_VIEW_POS).normalize();
		qStart.current.setFromUnitVectors(_fwd, d0);
		qEnd.current.setFromUnitVectors(_fwd, d1);

		camera.position.copy(CAM_START);
		camera.lookAt(CAM_TARGET);
		camera.fov = CAM_FOV;
		camera.updateProjectionMatrix();
		pos.current.copy(CAM_START);
		look.current.copy(CAM_TARGET);
		targetPos.current.copy(CAM_START);
		targetLook.current.copy(CAM_TARGET);
	}, [camera]);

	useFrame(({ pointer }, delta) => {
		smoothP.current = THREE.MathUtils.damp(
			smoothP.current,
			getScrollProgress(),
			FOLLOW_DAMP,
			delta,
		);
		const p = smoothP.current;

		sampleSegment(posCurves, p, targetPos.current);

		const seg = Math.min(posCurves.length - 1, Math.floor(p));
		const t = THREE.MathUtils.clamp(p - seg, 0, 1);

		if (seg === CRYSTAL_SEG) {
			// Slerp facing — avoids look-at points crossing the camera (yaw whip).
			qNow.current.copy(qStart.current).slerp(qEnd.current, easeInOut(t));
			_dir.copy(_fwd).applyQuaternion(qNow.current);
			targetLook.current
				.copy(targetPos.current)
				.addScaledVector(_dir, LOOK_DIST);
		} else {
			sampleSegment(lookCurves, p, targetLook.current);
		}

		pos.current.x = THREE.MathUtils.damp(
			pos.current.x,
			targetPos.current.x,
			FOLLOW_DAMP,
			delta,
		);
		pos.current.y = THREE.MathUtils.damp(
			pos.current.y,
			targetPos.current.y,
			FOLLOW_DAMP,
			delta,
		);
		pos.current.z = THREE.MathUtils.damp(
			pos.current.z,
			targetPos.current.z,
			FOLLOW_DAMP,
			delta,
		);

		look.current.x = THREE.MathUtils.damp(
			look.current.x,
			targetLook.current.x,
			FOLLOW_DAMP,
			delta,
		);
		look.current.y = THREE.MathUtils.damp(
			look.current.y,
			targetLook.current.y,
			FOLLOW_DAMP,
			delta,
		);
		look.current.z = THREE.MathUtils.damp(
			look.current.z,
			targetLook.current.z,
			FOLLOW_DAMP,
			delta,
		);

		// Soft parallax at every settled stop; off while snapping between them
		const settled =
			!isScrollAnimating() && Math.abs(p - Math.round(p)) < 0.02;
		const para = settled ? 1 : 0;
		offset.current.x = THREE.MathUtils.damp(
			offset.current.x,
			pointer.x * para,
			DAMP,
			delta,
		);
		offset.current.y = THREE.MathUtils.damp(
			offset.current.y,
			pointer.y * para,
			DAMP,
			delta,
		);

		camera.position.set(
			pos.current.x + offset.current.x * PARALLAX_X,
			pos.current.y + offset.current.y * PARALLAX_Y,
			pos.current.z,
		);

		camera.lookAt(
			look.current.x + offset.current.x * LOOK_X,
			look.current.y + offset.current.y * LOOK_Y,
			look.current.z,
		);
	});

	return null;
}

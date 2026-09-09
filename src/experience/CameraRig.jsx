import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { advanceCameraFollow, CAMERA_FINISH_SECONDS } from "./cameraTransition";
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
	GIRL_LOOK_AT,
	GIRL_VIEW_POS,
} from "./constants";
import {
	beginDirectFlight,
	createDirectFlight,
	sampleDirectFlight,
} from "./directFlight";
import { setCameraSettled } from "./focusStore";
import { reducedMotion } from "./motion";
import {
	getCameraRoute,
	getScrollProgress,
	isScrollAnimating,
} from "./scrollStore";

const MOBILE_LOOK_SHIFTS = [0, 3.2, 3.5, 3.0];
const PARALLAX_X = 0.45;
const PARALLAX_Y = 0.26;
const LOOK_X = 0.14;
const LOOK_Y = 0.08;
const DAMP = 2.8;
/** Bakery → crystal segment index */
const CRYSTAL_SEG = 2;
const LOOK_DIST = 10;
const STOP_POSITIONS = [
	CAM_START,
	GIRL_VIEW_POS,
	BAKERY_VIEW_POS,
	CRYSTAL_VIEW_POS,
];
const STOP_LOOKS = [
	CAM_TARGET,
	GIRL_LOOK_AT,
	BAKERY_LOOK_AT,
	CRYSTAL_LOOK_AT.clone()
		.sub(CRYSTAL_VIEW_POS)
		.normalize()
		.multiplyScalar(LOOK_DIST)
		.add(CRYSTAL_VIEW_POS),
];
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
	const { camera, size } = useThree();
	const offset = useRef(new THREE.Vector2());
	const look = useRef(new THREE.Vector3());
	const pos = useRef(new THREE.Vector3());
	const targetPos = useRef(new THREE.Vector3());
	const targetLook = useRef(new THREE.Vector3());
	const smoothP = useRef(0);
	const routeId = useRef(0);
	const directFlight = useMemo(createDirectFlight, []);
	const follow = useRef({ elapsed: 0 });
	const qStart = useRef(new THREE.Quaternion());
	const qEnd = useRef(new THREE.Quaternion());
	const qNow = useRef(new THREE.Quaternion());
	const startLookDistance = useRef(LOOK_DIST);

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
		setCameraSettled(false);
		const d0 = BAKERY_LOOK_AT.clone().sub(BAKERY_VIEW_POS);
		startLookDistance.current = d0.length();
		d0.normalize();
		const d1 = CRYSTAL_LOOK_AT.clone().sub(CRYSTAL_VIEW_POS).normalize();
		qStart.current.setFromUnitVectors(_fwd, d0);
		qEnd.current.setFromUnitVectors(_fwd, d1);

		camera.position.copy(CAM_START);
		camera.lookAt(CAM_TARGET);
		camera.fov = size.width < 700 ? 58 : CAM_FOV;
		camera.updateProjectionMatrix();
		pos.current.copy(CAM_START);
		look.current.copy(CAM_TARGET);
		targetPos.current.copy(CAM_START);
		targetLook.current.copy(CAM_TARGET);
	}, [camera, size.width]);

	useFrame(({ pointer }, delta) => {
		const route = getCameraRoute();
		if (route.id !== routeId.current) {
			routeId.current = route.id;
			if (route.direct) {
				// Begin at the actual pose, even if the previous glide was finishing.
				targetPos.current.copy(STOP_POSITIONS[route.to]);
				targetLook.current.copy(STOP_LOOKS[route.to]);
				if (size.width < 700) {
					targetLook.current.x += MOBILE_LOOK_SHIFTS[route.to];
					targetLook.current.y += route.to > 0 ? 3.1 : 0;
				}
				beginDirectFlight(
					directFlight,
					pos.current,
					look.current,
					targetPos.current,
					targetLook.current,
				);
				smoothP.current = route.from;
				follow.current.elapsed = 0;
			}
		}
		const reduced = reducedMotion();
		const moving = isScrollAnimating();
		const finishing = follow.current.elapsed < CAMERA_FINISH_SECONDS;
		const alpha = advanceCameraFollow(follow.current, delta, moving, reduced);
		smoothP.current = THREE.MathUtils.lerp(
			smoothP.current,
			getScrollProgress(),
			alpha,
		);
		const p = smoothP.current;

		if (route.direct) {
			const span = route.to - route.from;
			sampleDirectFlight(
				directFlight,
				span === 0 ? 1 : (p - route.from) / span,
				targetPos.current,
				targetLook.current,
			);
		} else {
			sampleSegment(posCurves, p, targetPos.current);

			const seg = Math.min(posCurves.length - 1, Math.floor(p));
			const t = THREE.MathUtils.clamp(p - seg, 0, 1);

			if (seg === CRYSTAL_SEG) {
				// Slerp facing — avoids look-at points crossing the camera (yaw whip).
				qNow.current.copy(qStart.current).slerp(qEnd.current, easeInOut(t));
				_dir.copy(_fwd).applyQuaternion(qNow.current);
				targetLook.current.copy(targetPos.current).addScaledVector(
					_dir,
					// Meet the preceding look-at curve exactly, including portrait offsets.
					THREE.MathUtils.lerp(
						startLookDistance.current,
						LOOK_DIST,
						easeInOut(t),
					),
				);
			} else {
				sampleSegment(lookCurves, p, targetLook.current);
			}

			if (size.width < 700) {
				const segment = Math.min(2, Math.floor(p)),
					fraction = p - segment;
				targetLook.current.x += THREE.MathUtils.lerp(
					MOBILE_LOOK_SHIFTS[segment],
					MOBILE_LOOK_SHIFTS[segment + 1],
					fraction,
				);
				targetLook.current.y += 3.1 * Math.min(1, p);
			}
		}

		pos.current.lerp(targetPos.current, alpha);
		look.current.lerp(targetLook.current, alpha);

		// Soft parallax at every settled stop; off while snapping between them
		if (reduced) {
			pos.current.copy(targetPos.current);
			look.current.copy(targetLook.current);
		}
		const arrived =
			!isScrollAnimating() &&
			p === getScrollProgress() &&
			pos.current.distanceToSquared(targetPos.current) < 0.0004 &&
			look.current.distanceToSquared(targetLook.current) < 0.0004;
		if (arrived) {
			pos.current.copy(targetPos.current);
			look.current.copy(targetLook.current);
		}
		setCameraSettled(arrived);
		const settled =
			!reduced && !isScrollAnimating() && Math.abs(p - Math.round(p)) < 0.02;
		const para = settled ? 1 : 0;
		// Finish any arrival parallax with the glide; later pointer movement
		// retains its usual soft response.
		const parallaxAlpha = Math.max(
			1 - Math.exp(-DAMP * delta),
			finishing && !moving ? alpha : 0,
		);
		offset.current.x = THREE.MathUtils.lerp(
			offset.current.x,
			pointer.x * para,
			parallaxAlpha,
		);
		offset.current.y = THREE.MathUtils.lerp(
			offset.current.y,
			pointer.y * para,
			parallaxAlpha,
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
	}, -2);

	return null;
}

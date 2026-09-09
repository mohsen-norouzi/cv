import * as THREE from "three";

/** A single flight between two poses, independent of intermediate tour stops. */
export function createDirectFlight() {
	return {
		from: new THREE.Vector3(),
		to: new THREE.Vector3(),
		fromLook: new THREE.Vector3(),
		toLook: new THREE.Vector3(),
		fromFacing: new THREE.Quaternion(),
		toFacing: new THREE.Quaternion(),
		facing: new THREE.Quaternion(),
		direction: new THREE.Vector3(),
		forward: new THREE.Vector3(0, 0, -1),
		fromDistance: 1,
		toDistance: 1,
	};
}

export function beginDirectFlight(flight, from, fromLook, to, toLook) {
	flight.from.copy(from);
	flight.to.copy(to);
	flight.fromLook.copy(fromLook);
	flight.toLook.copy(toLook);
	flight.direction.subVectors(fromLook, from);
	flight.fromDistance = flight.direction.length();
	flight.fromFacing.setFromUnitVectors(
		flight.forward,
		flight.direction.normalize(),
	);
	flight.direction.subVectors(toLook, to);
	flight.toDistance = flight.direction.length();
	flight.toFacing.setFromUnitVectors(
		flight.forward,
		flight.direction.normalize(),
	);
}

export function sampleDirectFlight(flight, progress, position, look) {
	const t = THREE.MathUtils.clamp(progress, 0, 1);
	position.lerpVectors(flight.from, flight.to, t);
	if (t === 0 || t === 1) {
		look.copy(t === 0 ? flight.fromLook : flight.toLook);
		return;
	}
	// Turn once toward the destination, without looking at skipped projects.
	flight.facing.copy(flight.fromFacing).slerp(flight.toFacing, t);
	flight.direction.copy(flight.forward).applyQuaternion(flight.facing);
	look
		.copy(position)
		.addScaledVector(
			flight.direction,
			THREE.MathUtils.lerp(flight.fromDistance, flight.toDistance, t),
		);
}

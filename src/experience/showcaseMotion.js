// The original showcase speed: one gentle revolution in about 16 seconds.
const SPIN_SPEED = 0.4;

export function rotateShowcase(subject, reveal, delta, reduced) {
	if (!subject || reduced || reveal <= 0.01) return false;
	subject.rotation.y =
		(subject.rotation.y + Math.min(delta, 0.05) * SPIN_SPEED * reveal) %
		(Math.PI * 2);
	// Local mesh transforms stay cached. Only this moving model's world matrices
	// change; the terrain, paving, foliage, and other subjects remain frozen.
	subject.updateMatrix();
	subject.updateMatrixWorld(true);
	return true;
}

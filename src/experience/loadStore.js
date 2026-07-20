/** Scene ready after GLB loaded + Mountain materials applied */
let ready = false;
const listeners = new Set();

export function getSceneReady() {
	return ready;
}

export function setSceneReady(next) {
	if (ready === next) return;
	ready = next;
	for (const fn of listeners) fn();
}

export function subscribeSceneReady(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

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

// UI loading progress stays independent of the much larger 3D engine bundle.
let loadProgress = { progress: 0, errors: 0 };
const progressListeners = new Set();
export const getLoadProgress = () => loadProgress;
export function setLoadProgress(progress, errors) {
	if (loadProgress.progress === progress && loadProgress.errors === errors)
		return;
	loadProgress = { progress, errors };
	for (const listener of progressListeners) listener();
}
export function subscribeLoadProgress(listener) {
	progressListeners.add(listener);
	return () => progressListeners.delete(listener);
}

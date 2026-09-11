import { useSyncExternalStore } from "react";

let snapshot = {
	map: null,
	x: 0,
	z: 0,
	heading: 0,
	nearby: 0,
	target: 0,
	locked: false,
};
const listeners = new Set();
export const walkFocus = { stop: 0, reveal: 0 };
export const getWalkHud = () => snapshot;
export function publishWalkHud(next) {
	snapshot = { ...snapshot, ...next };
	for (const listener of listeners) listener();
}
const subscribe = (listener) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};
export const useWalkHud = () =>
	useSyncExternalStore(subscribe, getWalkHud, getWalkHud);
let activate = null;
export function registerWalkAction(action) {
	activate = action;
	return () => {
		if (activate === action) activate = null;
	};
}
export const activateWalkTarget = () => activate?.();

import { useSyncExternalStore } from "react";

let walking = false;
const listeners = new Set();
export const walkInput = { forward: 0, side: 0, yaw: 0, pitch: 0 };
export const getWalking = () => walking;
export function setWalking(value) {
	if (walking === value) return;
	walking = value;
	Object.assign(walkInput, { forward: 0, side: 0, yaw: 0, pitch: 0 });
	for (const listener of listeners) listener();
}
const subscribe = (listener) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};
export const useWalking = () =>
	useSyncExternalStore(subscribe, getWalking, getWalking);

import { useSyncExternalStore } from "react";
import { getFocusStop, getTextReveal } from "./focusStore.js";
import {
	getScrollSection,
	isScrollAnimating,
	requestSnapTo,
} from "./scrollStore.js";
import { getWalking } from "./walkStore.js";

let open = false;
const listeners = new Set();
export const getCollectionOpen = () => open;
const subscribe = (listener) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};
export const useCollectionOpen = () =>
	useSyncExternalStore(subscribe, getCollectionOpen, getCollectionOpen);
export function setCollectionOpen(next) {
	if (next && document.pointerLockElement) document.exitPointerLock();
	if (open === next) return;
	open = next;
	for (const listener of listeners) listener();
}
export function visitCollection() {
	if (getWalking()) {
		setCollectionOpen(true);
		return;
	}
	if (isScrollAnimating()) return;
	if (
		getScrollSection() === 4 &&
		getFocusStop() === 4 &&
		getTextReveal() > 0.35
	) {
		setCollectionOpen(true);
	} else requestSnapTo(4);
}

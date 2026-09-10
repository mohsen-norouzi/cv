import { useSyncExternalStore } from "react";
import { BARCELONA, solarState } from "./solar";
import { createPreviewClock } from "./previewClock";

let location = BARCELONA;
const clock = createPreviewClock();
let environmentTime = Date.now(),
	environmentUpdated = 0;
let lastUpdated = 0,
	environmentPending = false;
function snapshot() {
	const playback = clock.read(),
		now = Date.now();
	const environmentDelay = playback.rate ? 2000 : 250;
	if (now - environmentUpdated >= environmentDelay) {
		environmentTime = playback.time;
		environmentUpdated = now;
		environmentPending = false;
	} else environmentPending = true;
	lastUpdated = now;
	return {
		...solarState(new Date(playback.time), location),
		playback,
		environmentTime,
	};
}
let state = snapshot();
const listeners = new Set();
let timer;
function refresh() {
	state = snapshot();
	for (const listener of listeners) listener();
}
function onVisibility() {
	if (!document.hidden) refresh();
}
function subscribe(listener) {
	listeners.add(listener);
	if (listeners.size === 1) {
		refresh();
		timer = setInterval(() => {
			if (document.hidden) return;
			const { mode, rate } = clock.read();
			if (
				(mode === "preview" && rate !== 0) ||
				(environmentPending && Date.now() - environmentUpdated >= 250) ||
				(mode === "live" && Date.now() - lastUpdated >= 30_000)
			)
				refresh();
		}, 50);
		document.addEventListener("visibilitychange", onVisibility);
	}
	return () => {
		listeners.delete(listener);
		if (!listeners.size) {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisibility);
		}
	};
}
export const getSky = () => state;
export const useSky = () => useSyncExternalStore(subscribe, getSky, getSky);
export function seekSky(time) {
	if (clock.seek(time)) refresh();
}
export function playSky(rate) {
	if (clock.play(rate)) refresh();
}
export function liveSky() {
	clock.live();
	environmentUpdated = 0;
	refresh();
}
export function setSkyLocation(next) {
	if (
		!Number.isFinite(next.latitude) ||
		Math.abs(next.latitude) > 90 ||
		!Number.isFinite(next.longitude) ||
		Math.abs(next.longitude) > 180
	)
		return false;
	location = next;
	environmentUpdated = 0;
	refresh();
	return true;
}

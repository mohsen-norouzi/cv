import { useSyncExternalStore } from "react";
import {
	getMusicEnabled,
	subscribeMusic,
	toggleMusic,
} from "../experience/audioStore";

/**
 * EQ bars + “Music” mute toggle (ambient starts from the loader Enter click).
 */
export default function MusicToggle() {
	const on = useSyncExternalStore(
		subscribeMusic,
		getMusicEnabled,
		getMusicEnabled,
	);

	return (
		<button
			type="button"
			data-music-toggle
			onClick={() => toggleMusic()}
			className="pointer-events-auto absolute bottom-8 right-8 z-30 cursor-pointer text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-opacity hover:text-white md:bottom-10 md:right-12 lg:right-16"
			aria-pressed={on}
			aria-label={on ? "Mute music" : "Play music"}
		>
			<span className={`music-eq ${on ? "is-on" : ""}`} aria-hidden>
				<span />
				<span />
				<span />
				<span />
			</span>
		</button>
	);
}

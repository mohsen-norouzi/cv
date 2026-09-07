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
			className="music-toggle"
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

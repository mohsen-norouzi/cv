import { useEffect, useState } from "react";
import { setWalking, walkInput } from "../experience/walkStore";

export default function WalkControls() {
	const [locked, setLocked] = useState(false);
	const [hint, setHint] = useState("");
	useEffect(() => {
		const update = () => setLocked(!!document.pointerLockElement);
		document.addEventListener("pointerlockchange", update);
		return () => document.removeEventListener("pointerlockchange", update);
	}, []);
	const mouseLook = () => {
		const canvas = document.querySelector("canvas");
		canvas?.focus();
		if (!canvas?.requestPointerLock) {
			setHint("Drag the scene to look around.");
			return;
		}
		try {
			const request = canvas.requestPointerLock();
			request?.catch(() => setHint("Drag the scene to look around."));
		} catch {
			setHint("Drag the scene to look around.");
		}
	};
	const hold = (event, axis, value) => {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		walkInput[axis] = value;
	};
	return (
		<div className="walk-overlay">
			<div className="walk-header">
				<div>
					<span className="walk-eyebrow">ON FOOT</span>
					<p>The coast, at your own pace.</p>
				</div>
				<button
					type="button"
					className="walk-exit"
					onClick={() => setWalking(false)}
				>
					Back to portfolio <span aria-hidden>↗</span>
				</button>
			</div>
			<div className="walk-crosshair" aria-hidden />
			<div className="walk-help">
				<p className="walk-desktop-help">
					WASD / arrows to walk · Drag to look · Q / E to turn · Shift to move
					faster · Esc to exit
				</p>
				<p className="walk-touch-help">
					Hold an arrow to walk · Drag the scene to look
				</p>
				{!locked && (
					<button type="button" className="walk-mouse" onClick={mouseLook}>
						Enable mouse look
					</button>
				)}
				{hint && <p role="status">{hint}</p>}
			</div>
			<fieldset className="walk-pad" aria-label="Walking controls">
				{[
					["Walk forward", "↑", "forward", 1],
					["Walk left", "←", "side", -1],
					["Walk backward", "↓", "forward", -1],
					["Walk right", "→", "side", 1],
				].map(([label, icon, axis, value], i) => (
					<button
						key={label}
						type="button"
						className={`walk-direction walk-direction-${i}`}
						aria-label={label}
						onPointerDown={(event) => hold(event, axis, value)}
						onPointerUp={() => {
							walkInput[axis] = 0;
						}}
						onPointerCancel={() => {
							walkInput[axis] = 0;
						}}
						onLostPointerCapture={() => {
							walkInput[axis] = 0;
						}}
					>
						{icon}
					</button>
				))}
			</fieldset>
		</div>
	);
}

import WalkHud from "./WalkHud";
import { useEffect, useState } from "react";
import { setWalking, walkInput } from "../experience/walkStore";

export default function WalkControls() {
	const [locked, setLocked] = useState(false);
	const [hint, setHint] = useState("");
	useEffect(() => {
		const update = () => {
			setLocked(
				document.pointerLockElement === document.querySelector("canvas"),
			);
			setHint("");
		};
		update();
		document.addEventListener("pointerlockchange", update);
		return () => document.removeEventListener("pointerlockchange", update);
	}, []);
	const mouseLook = () => {
		if (document.pointerLockElement) {
			document.exitPointerLock();
			return;
		}
		setHint("");
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
			<WalkHud />
			<div className="walk-dock">
				{hint && (
					<p className="walk-status" role="status">
						{hint}
					</p>
				)}
				<div
					className="walk-key-guide"
					aria-label="W A S D or arrow keys to move"
				>
					<span className="walk-wasd" aria-hidden="true">
						{["W", "A", "S", "D"].map((key) => (
							<kbd key={key}>{key}</kbd>
						))}
					</span>
					<span>Move</span>
				</div>
				<div
					className="walk-key-guide walk-extra-guide"
					aria-label="Q and E to turn"
				>
					<span className="walk-key-pair" aria-hidden="true">
						<kbd>Q</kbd>
						<kbd>E</kbd>
					</span>
					<span>Turn</span>
				</div>
				<div
					className="walk-key-guide walk-extra-guide"
					aria-label="Hold Shift to move faster"
				>
					<kbd aria-hidden="true">Shift</kbd>
					<span>Faster</span>
				</div>
				<span className="walk-dock-divider" aria-hidden="true" />
				<button
					type="button"
					className="walk-mouse"
					onClick={mouseLook}
					aria-label={locked ? "Release mouse look" : "Enable mouse look"}
					aria-pressed={locked}
					title={
						locked
							? "Press Escape to release your cursor"
							: "Capture the mouse to look freely. You can also drag the scene."
					}
				>
					<svg
						width="16"
						height="20"
						viewBox="0 0 18 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.4"
						aria-hidden="true"
					>
						<rect x="3" y="2" width="12" height="20" rx="6" />
						<path d="M9 6v4" strokeLinecap="round" />
					</svg>
					<span>{locked ? "Looking" : "Look"}</span>
					<span className="walk-look-dot" aria-hidden="true" />
				</button>
				<span className="walk-touch-guide">Drag to look</span>
				<button
					type="button"
					className="walk-leave"
					aria-label={locked ? "Release mouse" : "Exit walking mode"}
					onClick={() =>
						locked ? document.exitPointerLock() : setWalking(false)
					}
				>
					<kbd>Esc</kbd>
					<span>{locked ? "Release" : "Exit"}</span>
				</button>
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

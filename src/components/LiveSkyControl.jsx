import { useEffect, useRef, useState } from "react";
import { useWalking } from "../experience/walkStore";
import { BARCELONA, localClock } from "../experience/solar";
import { localDateTime, fromLocalDateTime } from "../experience/previewClock";
import {
	seekSky,
	playSky,
	liveSky,
	setSkyLocation,
	useSky,
} from "../experience/skyStore";

export default function LiveSkyControl() {
	const sky = useSky();
	const walking = useWalking();
	const [speed, setSpeed] = useState(600);
	const civil = localDateTime(sky.date, sky.location.timeZone);
	const minutes =
		Number(civil.time.slice(0, 2)) * 60 + Number(civil.time.slice(3));
	function chooseTime(date, time) {
		const instant = fromLocalDateTime(
			date,
			time,
			sky.location.timeZone,
			sky.date.getTime(),
		);
		if (instant === null) {
			setStatus("That local time is unavailable. Try another time.");
			return;
		}
		seekSky(instant);
		setStatus("");
	}
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState("");
	const [pending, setPending] = useState(false);
	const root = useRef(null);
	const request = useRef(0);
	useEffect(
		() => () => {
			request.current++;
		},
		[],
	);
	useEffect(() => {
		if (!open) return;
		const outside = (event) => {
			if (!root.current?.contains(event.target)) setOpen(false);
		};
		const onEscape = (event) => {
			if (event.key === "Escape") {
				event.stopPropagation();
				setOpen(false);
				root.current?.querySelector("button")?.focus();
			}
		};
		document.addEventListener("pointerdown", outside);
		document.addEventListener("keydown", onEscape, true);
		return () => {
			document.removeEventListener("pointerdown", outside);
			document.removeEventListener("keydown", onEscape, true);
		};
	}, [open]);
	function useLocation() {
		if (!navigator.geolocation) {
			setStatus("Location is unavailable. The sky is following Barcelona.");
			return;
		}
		const id = ++request.current;
		setPending(true);
		setStatus("Waiting for location…");
		navigator.geolocation.getCurrentPosition(
			(position) => {
				if (id !== request.current) return;
				const valid = setSkyLocation({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					label: "Your location",
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				});
				setPending(false);
				setStatus(
					valid
						? "The sky now follows your location."
						: "Location is unavailable. The previous sky is unchanged.",
				);
			},
			() => {
				if (id !== request.current) return;
				setPending(false);
				setStatus(
					"Couldn't access your location. The sky still follows " +
						sky.location.label +
						".",
				);
			},
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
		);
	}
	return (
		<fieldset
			ref={root}
			aria-label="Live sky"
			className={`live-sky ${walking ? "live-sky-walking" : ""}`}
			onKeyDown={(event) => event.stopPropagation()}
			onWheel={(event) => event.stopPropagation()}
		>
			<button
				type="button"
				className="live-sky-trigger"
				aria-expanded={open}
				aria-controls="live-sky-panel"
				onClick={() => setOpen(!open)}
			>
				<span aria-hidden="true">{sky.daylight > 0.5 ? "☀" : "☾"}</span>{" "}
				{sky.location.label}{" "}
				<span className="live-sky-clock">
					{localClock(sky.date, sky.location.timeZone)}
					{sky.playback.mode === "preview" && " · Preview"}
				</span>
			</button>
			{open && (
				<div id="live-sky-panel" className="live-sky-panel">
					<p className="live-sky-title">Explore the sky</p>
					<p>
						{sky.phase} · {sky.location.label}
					</p>
					<p className="live-sky-note">
						Sun, moon, and starlight follow the time of day.
					</p>
					<div className="sky-time-controls">
						<div className="sky-time-fields">
							<label>
								Date
								<input
									type="date"
									value={civil.date}
									min="1900-01-01"
									max="2100-12-31"
									onFocus={() => playSky(0)}
									onChange={(event) =>
										chooseTime(event.target.value, civil.time)
									}
								/>
							</label>
							<label>
								Time
								<input
									type="time"
									value={civil.time}
									onFocus={() => playSky(0)}
									onChange={(event) =>
										chooseTime(civil.date, event.target.value)
									}
								/>
							</label>
						</div>
						<input
							aria-label="Time of day"
							className="sky-time-slider"
							type="range"
							min="0"
							max="1439"
							step="1"
							value={minutes}
							onChange={(event) => {
								const value = Number(event.target.value);
								chooseTime(
									civil.date,
									`${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`,
								);
							}}
						/>
						<div className="sky-time-marks" aria-hidden="true">
							<span>Midnight</span>
							<span>Noon</span>
							<span>Midnight</span>
						</div>
						<div className="sky-playback">
							<button
								type="button"
								aria-label="Run time backward"
								aria-pressed={sky.playback.rate < 0}
								onClick={() => playSky(-speed)}
							>
								← Backward
							</button>
							<button
								type="button"
								aria-label="Pause time"
								aria-pressed={
									sky.playback.mode === "preview" && sky.playback.rate === 0
								}
								onClick={() => playSky(0)}
							>
								Ⅱ
							</button>
							<button
								type="button"
								aria-label="Run time forward"
								aria-pressed={sky.playback.rate > 0}
								onClick={() => playSky(speed)}
							>
								Forward →
							</button>
						</div>
						<label className="sky-speed">
							Speed
							<select
								value={speed}
								onChange={(event) => {
									const value = Number(event.target.value);
									setSpeed(value);
									if (sky.playback.rate)
										playSky(Math.sign(sky.playback.rate) * value);
								}}
							>
								<option value="60">1 minute / second</option>
								<option value="600">10 minutes / second</option>
								<option value="3600">1 hour / second</option>
							</select>
						</label>
						<button
							type="button"
							className="sky-live-button"
							onClick={() => {
								liveSky();
								setStatus("");
							}}
							disabled={sky.playback.mode === "live"}
						>
							{sky.playback.mode === "live"
								? "Following live time"
								: "Return to live time"}
						</button>
					</div>
					<button type="button" onClick={useLocation} disabled={pending}>
						{pending ? "Finding location…" : "Use my location"}
					</button>
					<button
						type="button"
						onClick={() => {
							request.current++;
							setPending(false);
							setSkyLocation(BARCELONA);
							setStatus("Following Barcelona again.");
						}}
					>
						Use Barcelona
					</button>
					<p className="live-sky-note">
						Your location stays in this browser. Your device’s clock is shown
						when using your location.
					</p>
					<p role="status" className="live-sky-status">
						{status}
					</p>
				</div>
			)}
		</fieldset>
	);
}

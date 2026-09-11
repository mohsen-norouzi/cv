import { activateWalkTarget, useWalkHud } from "../experience/walkHudStore";

const names = [
	"",
	"Ekaterina Shelehova",
	"Bavo Bakes",
	"Your next project",
	"The collection",
];
// North is up. Both authored routes share this fixed world-space projection.
export const mapPoint = ([x, z]) => [
	24 + (x + 12) * 1.15,
	14 + (z + 90) * 1.15,
];
const pathData = (points) =>
	points
		.map((point, i) => `${i ? "L" : "M"}${mapPoint(point).join(",")}`)
		.join(" ");
export default function WalkHud() {
	const hud = useWalkHud();
	const [x, y] = mapPoint([hud.x, hud.z]);
	return (
		<>
			<aside className="walk-map" aria-label="Coast map">
				<div className="walk-map-heading">
					<span>THE COAST</span>
					<span aria-hidden="true">N ↑</span>
				</div>
				<svg
					viewBox="0 0 140 170"
					role="img"
					aria-label={`Your position on the coast${hud.nearby ? `, near ${names[hud.nearby]}` : ""}`}
				>
					{hud.map && (
						<>
							{hud.map.headlands.map((h, i) => {
								const [cx, cy] = mapPoint(h.center);
								return (
									<ellipse
										key={i}
										cx={cx}
										cy={cy}
										rx={h.radius[0] * 1.15}
										ry={h.radius[1] * 1.15}
										className="map-land"
									/>
								);
							})}
							{hud.map.paths.map((path, i) => (
								<path key={i} d={pathData(path)} className="map-path" />
							))}
							{hud.map.terraces.map((p, i) => {
								const [cx, cy] = mapPoint(p);
								return (
									<circle
										key={i}
										cx={cx}
										cy={cy}
										r="1.6"
										className="map-terrace"
									/>
								);
							})}
							{hud.map.stops.map((s) => {
								const [cx, cy] = mapPoint(s.position);
								return (
									<g key={s.stop}>
										<circle
											cx={cx}
											cy={cy}
											r={s.stop === hud.nearby ? 4.2 : 3}
											className={`map-stop ${s.stop === hud.nearby ? "is-near" : ""}`}
										/>
										<title>{names[s.stop]}</title>
									</g>
								);
							})}
						</>
					)}
					<g transform={`translate(${x},${y}) rotate(${hud.heading})`}>
						<path d="M0 -10 L-6 -1 Q0 -4 6 -1 Z" className="map-facing" />
						<circle r="3" className="map-player" />
					</g>
				</svg>
				<p>{hud.nearby ? names[hud.nearby] : "Follow the path"}</p>
			</aside>
			<div
				className={`walk-crosshair ${hud.target ? "has-target" : ""}`}
				aria-hidden="true"
			/>
			{hud.target > 0 && (
				<div className="walk-object-hint" role="status">
					<span>{names[hud.target]}</span>
					<button type="button" onClick={activateWalkTarget}>
						{hud.target === 4
							? "Click to browse templates"
							: hud.target === 3
								? "Click to get in touch"
								: "Click to open website"}
						<span className="walk-interact-key" aria-hidden="true">
							F
						</span>
					</button>
				</div>
			)}
		</>
	);
}

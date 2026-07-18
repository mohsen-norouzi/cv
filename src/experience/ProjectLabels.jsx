import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BAKERY_POSITION, GIRL_POSITION } from "./constants";
import { getScrollProgress } from "./scrollStore";

const projects = [
	{
		id: "01",
		title: "Singer Website",
		blurb: "A modern portfolio for a talented artist.",
		position: new THREE.Vector3(
			GIRL_POSITION.x - 0.4,
			GIRL_POSITION.y + 2.6,
			GIRL_POSITION.z + 0.3,
		),
		side: "left",
	},
	{
		id: "02",
		title: "Bakery Website",
		blurb: "Sweet and simple site for a local bakery.",
		position: new THREE.Vector3(
			BAKERY_POSITION.x + 1.6,
			BAKERY_POSITION.y + 2.2,
			BAKERY_POSITION.z + 0.4,
		),
		side: "right",
	},
];

function LabelCard({ id, title, blurb, side, rootRef }) {
	const right = side === "right";
	return (
		<div
			ref={rootRef}
			className={`pointer-events-none select-none ${right ? "text-right" : "text-left"}`}
			style={{
				width: 190,
				textShadow: "0 2px 14px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)",
			}}
		>
			<div
				className={`mb-1.5 flex items-center gap-2.5 ${right ? "flex-row-reverse" : ""}`}
			>
				<span className="font-ui text-[12px] font-semibold tracking-[0.2em] text-accent">
					{id}
				</span>
				<span aria-hidden className="h-px w-10 bg-white/35" />
			</div>
			<p className="font-display text-[14px] font-semibold tracking-tight text-white">
				{title}
			</p>
			<p className="font-ui mt-1 text-[11px] leading-snug text-white/75">
				{blurb}
			</p>
		</div>
	);
}

export default function ProjectLabels() {
	const wrapRefs = useRef([]);
	const [portal, setPortal] = useState(null);

	useLayoutEffect(() => {
		const el = document.getElementById("project-labels");
		if (el) setPortal({ current: el });
	}, []);

	useFrame(() => {
		const opacity = Math.max(0.15, 1 - getScrollProgress() * 0.55);
		for (const el of wrapRefs.current) {
			if (el) el.style.opacity = String(opacity);
		}
	});

	// Wait until the App overlay mount point exists
	if (!portal) return null;

	return (
		<group>
			{projects.map((project, i) => (
				<Html
					key={project.id}
					position={project.position}
					center
					eps={0.25}
					pointerEvents="none"
					zIndexRange={[40, 0]}
					portal={portal}
				>
					<LabelCard
						{...project}
						rootRef={(el) => {
							wrapRefs.current[i] = el;
						}}
					/>
				</Html>
			))}
		</group>
	);
}

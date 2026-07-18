import { useSyncExternalStore } from "react";
import {
	getScrollProgress,
	SCROLL_SECTION_COUNT,
	subscribeScroll,
} from "../experience/scrollStore";

const sections = [
	null,
	{
		id: "01",
		title: "Singer Website",
		blurb: "A modern portfolio for a talented artist.",
	},
	{
		id: "02",
		title: "Bakery Website",
		blurb: "Sweet and simple site for a local bakery.",
	},
];

export default function SectionCaption() {
	const progress = useSyncExternalStore(
		subscribeScroll,
		getScrollProgress,
		getScrollProgress,
	);

	const index = Math.min(
		SCROLL_SECTION_COUNT - 1,
		Math.max(0, Math.round(progress)),
	);
	const section = sections[index];
	if (!section) return null;

	// Only show when settled near a stop (not mid-flight)
	const settled = Math.abs(progress - index) < 0.08;
	const opacity = settled ? 1 : Math.max(0, 1 - Math.abs(progress - index) * 4);

	if (opacity < 0.05) return null;

	return (
		<aside
			className="pointer-events-none absolute bottom-10 left-8 z-20 max-w-xs md:bottom-14 md:left-12 lg:left-16"
			style={{ opacity }}
		>
			<p className="font-ui mb-2 text-[11px] font-semibold tracking-[0.28em] text-accent uppercase">
				{section.id}
			</p>
			<h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
				{section.title}
			</h2>
			<p className="font-ui mt-2 text-[14px] leading-relaxed text-white/70">
				{section.blurb}
			</p>
		</aside>
	);
}

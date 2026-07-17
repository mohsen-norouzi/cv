export default function HeroContent() {
	return (
		<div className="absolute inset-0 z-10 flex items-center px-8 md:px-12 lg:px-[12%]">
			<div className="max-w-xl">
				<p className="font-ui mb-6 text-[11px] font-medium tracking-[0.32em] text-accent uppercase">
					01&nbsp;&nbsp;/&nbsp;&nbsp;Discover
				</p>

				<h1 className="font-display mb-7 text-[clamp(2.75rem,6vw,4.5rem)] leading-[1.05] font-medium tracking-[-0.02em] text-white">
					From ideas
					<br />
					to strategy.
				</h1>

				<p className="font-ui mb-10 max-w-md text-[15px] leading-[1.75] font-light text-white/70">
					I turn complex challenges into clear, strategic solutions through
					research, planning and creative direction.
				</p>

				<a
					href="#process"
					className="pointer-events-auto font-ui group inline-flex items-center gap-4 text-[11px] font-medium tracking-[0.28em] text-white uppercase transition-opacity hover:opacity-70"
				>
					View process
					<span
						aria-hidden
						className="relative h-px w-14 bg-white transition-all group-hover:w-20"
					>
						<span className="absolute top-1/2 right-0 size-1.5 -translate-y-1/2 rotate-45 border-t border-r border-white" />
					</span>
				</a>
			</div>
		</div>
	);
}

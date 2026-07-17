import Logo from "./Logo";

const links = [
	{ label: "Works", href: "#works", active: true },
	{ label: "About", href: "#about", active: false },
	{ label: "Resume", href: "#resume", active: false },
];

export default function Navbar() {
	return (
		<header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-7 md:px-12 lg:px-16">
			<a href="/" className="text-white transition-opacity hover:opacity-80">
				<Logo />
			</a>

			<div className="flex items-center gap-10 md:gap-12">
				<nav className="hidden items-center gap-8 sm:flex md:gap-10">
					{links.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className="font-ui relative text-[11px] font-medium tracking-[0.28em] text-white uppercase transition-opacity hover:opacity-70"
						>
							{link.label}
							{link.active && (
								<span className="absolute -bottom-2.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white" />
							)}
						</a>
					))}
				</nav>

				<button
					type="button"
					aria-label="Open menu"
					className="flex size-11 items-center justify-center rounded-full border border-white/50 transition-colors hover:border-white"
				>
					<span className="flex w-3.5 flex-col gap-[5px]">
						<span className="h-px w-full bg-white" />
						<span className="h-px w-full bg-white" />
					</span>
				</button>
			</div>
		</header>
	);
}

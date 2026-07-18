import Logo from "./Logo";

const links = [
	{ label: "Work", href: "#work", active: true },
	{ label: "About", href: "#about", active: false },
	{ label: "Contact", href: "#contact", active: false },
];

export default function Navbar() {
	return (
		<header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-7 md:px-12 lg:px-16">
			<a href="/" className="transition-opacity hover:opacity-75">
				<Logo />
			</a>

			<nav className="flex items-center gap-7 md:gap-10">
				{links.map((link) => (
					<a
						key={link.label}
						href={link.href}
						className={`font-ui relative text-[11px] font-medium tracking-[0.24em] uppercase transition-colors ${
							link.active
								? "text-accent"
								: "text-white/70 hover:text-white"
						}`}
					>
						{link.label}
						{link.active && (
							<span className="absolute -bottom-2.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />
						)}
					</a>
				))}
			</nav>
		</header>
	);
}

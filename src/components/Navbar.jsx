const links = [
	{ id: "works", label: "Works" },
	{ id: "about", label: "About" },
	{ id: "experiments", label: "Experiments" },
	{ id: "contact", label: "Contact" },
];

export default function Navbar({ active = "works" }) {
	return (
		<header className="navbar">
			<a href="/" className="navbar__logo" aria-label="Home">
				AA.
			</a>

			<div className="navbar__right">
				<nav className="navbar__nav" aria-label="Primary">
					{links.map((link) => (
						<a
							key={link.id}
							href={`#${link.id}`}
							className={`navbar__link${active === link.id ? " is-active" : ""}`}
						>
							{link.label}
						</a>
					))}
				</nav>

				<button type="button" className="navbar__menu" aria-label="Open menu">
					<span className="navbar__menu-dot" />
				</button>
			</div>
		</header>
	);
}

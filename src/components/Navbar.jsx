import Logo from "./Logo";
import { requestSnapTo } from "../experience/scrollStore";

function IconMail({ className }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden
		>
			<rect
				x="3"
				y="5"
				width="18"
				height="14"
				rx="2"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<path
				d="m4 7.5 7.2 5.2a1.4 1.4 0 0 0 1.6 0L20 7.5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function IconTelegram({ className }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
		>
			<path d="M21.8 4.3c.3-.1.6.2.5.5L18.6 20c-.1.3-.4.4-.7.3l-5.4-2.1-2.9 2.8c-.3.3-.8.1-.9-.3l-.4-4.9L18 7.4c.2-.2 0-.4-.2-.3L7.3 14.5 2.8 13c-.4-.1-.4-.6 0-.8l18.2-7.9Z" />
		</svg>
	);
}

function IconWhatsApp({ className }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
		>
			<path d="M12 2.1A9.9 9.9 0 0 0 3.4 17L2 22l5.2-1.3A9.9 9.9 0 1 0 12 2.1Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20.1Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4 0-.2 0-.3-.1-.5l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8 1.6.6 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.5-.3Z" />
		</svg>
	);
}

const socials = [
	{
		label: "Email",
		href: "mailto:hello@itsmohsen.com",
		Icon: IconMail,
	},
	{
		label: "Telegram",
		href: "https://t.me/itsmohseeen",
		Icon: IconTelegram,
		external: true,
	},
	{
		label: "WhatsApp",
		href: "https://wa.me/34666601296",
		Icon: IconWhatsApp,
		external: true,
	},
];

export default function Navbar() {
	return (
		<header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-7 md:px-12 lg:px-16">
			<button
				type="button"
				onClick={() => requestSnapTo(0)}
				aria-label="Back to start"
				className="cursor-pointer transition-opacity hover:opacity-75"
			>
				<Logo />
			</button>

			<nav className="flex items-center gap-5 md:gap-7">
				{socials.map(({ label, href, Icon, external }) => (
					<a
						key={label}
						href={href}
						aria-label={label}
						{...(external
							? {
									target: "_blank",
									rel: "noopener noreferrer",
								}
							: {})}
						className="cursor-pointer text-white/70 transition-colors hover:text-white"
					>
						<Icon className="size-[18px]" />
					</a>
				))}

				<span
					aria-hidden
					className="mx-1 h-3.5 w-px bg-white/30 md:mx-2"
				/>

				<a
					href="/resume.pdf"
					download="Mohsen-Norouzi-Resume.pdf"
					target="_blank"
					rel="noopener noreferrer"
					className="font-ui cursor-pointer text-[11px] font-medium tracking-[0.24em] text-white/70 uppercase transition-colors hover:text-white"
				>
					Resume
				</a>
			</nav>
		</header>
	);
}

export default function FooterBar() {
	return (
		<footer className="footer-bar">
			<div className="footer-bar__left">
				<button type="button" className="footer-bar__showreel">
					<span className="footer-bar__play" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
							<title>Play</title>
							<path d="M8 5.5v13l11-6.5L8 5.5z" />
						</svg>
					</span>
					Play Showreel
				</button>
			</div>

			<p className="footer-bar__scroll-hint">
				<span className="footer-bar__mouse" aria-hidden="true">
					<svg viewBox="0 0 16 24" width="12" height="18" fill="none">
						<title>Scroll</title>
						<rect
							x="1"
							y="1"
							width="14"
							height="22"
							rx="7"
							stroke="currentColor"
							strokeWidth="1.2"
						/>
						<circle cx="8" cy="7" r="1.4" fill="currentColor" />
					</svg>
				</span>
				Scroll or use arrow keys
			</p>

			<div className="footer-bar__right">
				<div className="footer-bar__status-group">
					<p className="footer-bar__status">
						<span className="footer-bar__status-icon" aria-hidden="true">
							<svg viewBox="0 0 12 12" width="10" height="10" fill="none">
								<title>Available</title>
								<circle
									cx="6"
									cy="6"
									r="4.6"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
							</svg>
						</span>
						Available for freelance
					</p>
					<p className="footer-bar__status">
						<span className="footer-bar__status-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" width="11" height="11" fill="none">
								<title>Location</title>
								<circle
									cx="8"
									cy="8"
									r="6.2"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
								<path
									d="M2 8h12M8 2c1.8 1.8 2.7 3.8 2.7 6S9.8 12.2 8 14C6.2 12.2 5.3 10.2 5.3 8S6.2 3.8 8 2z"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
							</svg>
						</span>
						Based in Earth
					</p>
				</div>

				<button
					type="button"
					className="footer-bar__eq"
					aria-label="Toggle audio"
				>
					<span />
					<span />
					<span />
				</button>
			</div>
		</footer>
	);
}

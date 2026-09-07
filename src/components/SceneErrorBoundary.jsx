import { Component } from "react";

export function SceneFallback() {
	return (
		<div className="scene-fallback">
			<p className="eyebrow">MOHSEN / DESIGN & DEVELOPMENT</p>
			<h1>A little world of work.</h1>
			<p>
				The 3D landscape couldn’t open on this device. You can still explore my
				work and get in touch.
			</p>
			<div>
				<a className="primary-action" href="/resume.pdf">
					View my resume ↗
				</a>
				<a className="text-action" href="mailto:hello@itsmohsen.com">
					Let's talk ↗
				</a>
			</div>
			<a href="https://shelehova.com" target="_blank" rel="noreferrer">
				Ekaterina Shelehova ↗
			</a>
			<a href="https://bavobakes.com" target="_blank" rel="noreferrer">
				Bavo Bakes ↗
			</a>
		</div>
	);
}
export default class SceneErrorBoundary extends Component {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? <SceneFallback /> : this.props.children;
	}
}

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/**
 * Renders high-quality sun shadows for a few frames, then freezes the map.
 * Static scene + fixed key light → correct shadows while the camera moves,
 * without paying shadow-pass cost every frame.
 */
export default function ShadowBake({ frames = 4 } = {}) {
	const gl = useThree((s) => s.gl);
	const done = useRef(false);
	const frame = useRef(0);

	useEffect(() => {
		gl.shadowMap.enabled = true;
		gl.shadowMap.autoUpdate = true;
		gl.shadowMap.needsUpdate = true;
		done.current = false;
		frame.current = 0;

		return () => {
			gl.shadowMap.autoUpdate = true;
		};
	}, [gl]);

	useFrame(() => {
		if (done.current) return;

		frame.current += 1;
		gl.shadowMap.needsUpdate = true;

		if (frame.current >= frames) {
			gl.shadowMap.autoUpdate = false;
			gl.shadowMap.needsUpdate = false;
			done.current = true;
		}
	});

	return null;
}

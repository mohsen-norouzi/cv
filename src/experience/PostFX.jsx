import { useFrame } from "@react-three/fiber";
import {
	Bloom,
	BrightnessContrast,
	EffectComposer,
	HueSaturation,
	N8AO,
	ToneMapping,
	Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useRef } from "react";
import * as THREE from "three";
import {
	BLOOM_INTENSITY,
	BLOOM_RADIUS,
	BLOOM_THRESHOLD,
	BRIGHTNESS,
	CONTRAST,
	SATURATION,
	VIGNETTE_DARKNESS,
	VIGNETTE_OFFSET,
} from "./constants";
import { IS_MOBILE } from "./device";
import { getFocusAmount } from "./focusStore";

/**
 * Desktop: full post stack.
 * Mobile: no composer (Android gray/black bugs). Leave NoToneMapping —
 * ACES without the grade stack was crushing the scene to night-black.
 */
function DesktopPostFX() {
	const vignette = useRef(null);
	const grade = useRef(null);

	useFrame(() => {
		const f = getFocusAmount();
		if (vignette.current) {
			vignette.current.darkness = VIGNETTE_DARKNESS + f * 0.2;
		}
		if (grade.current) {
			grade.current.brightness = BRIGHTNESS;
			grade.current.contrast = CONTRAST;
		}
	});

	return (
		<EffectComposer
			multisampling={0}
			enableNormalPass={false}
			frameBufferType={THREE.HalfFloatType}
		>
			<N8AO
				halfRes
				quality="performance"
				aoRadius={1.0}
				intensity={2.4}
				distanceFalloff={1.0}
				color="#3b2f28"
			/>
			<Bloom
				luminanceThreshold={BLOOM_THRESHOLD}
				luminanceSmoothing={0.3}
				intensity={BLOOM_INTENSITY}
				mipmapBlur
				radius={BLOOM_RADIUS}
			/>
			<HueSaturation saturation={SATURATION} />
			<BrightnessContrast
				ref={grade}
				brightness={BRIGHTNESS}
				contrast={CONTRAST}
			/>
			<Vignette
				ref={vignette}
				offset={VIGNETTE_OFFSET}
				darkness={VIGNETTE_DARKNESS}
			/>
			<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
		</EffectComposer>
	);
}

export default function PostFX() {
	if (IS_MOBILE) return null;
	return <DesktopPostFX />;
}

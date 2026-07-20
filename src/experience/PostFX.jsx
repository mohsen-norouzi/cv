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
import { getFocusAmount } from "./focusStore";

/**
 * Post stack. N8AO is back in its cheapest config — the earlier FPS hit was
 * AO stacked on 4x MSAA + per-frame VSM blur, both since removed. If GPU
 * time still spikes, this is the first thing to drop again.
 */
export default function PostFX() {
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

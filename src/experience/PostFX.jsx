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

/**
 * Post stack. N8AO is back in its cheapest config — the earlier FPS hit was
 * AO stacked on 4x MSAA + per-frame VSM blur, both since removed. If GPU
 * time still spikes, this is the first thing to drop again.
 */
export default function PostFX() {
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
			<BrightnessContrast brightness={BRIGHTNESS} contrast={CONTRAST} />
			<Vignette offset={VIGNETTE_OFFSET} darkness={VIGNETTE_DARKNESS} />
			<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
		</EffectComposer>
	);
}

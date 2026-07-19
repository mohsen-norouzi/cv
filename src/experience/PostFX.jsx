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

export default function PostFX() {
	return (
		<EffectComposer
			multisampling={4}
			enableNormalPass={false}
			frameBufferType={THREE.HalfFloatType}
		>
			{/* Contact shadows in crevices — the single biggest "rendered, not
			    realtime" cue. Half-res keeps it cheap. */}
			<N8AO
				halfRes
				quality="performance"
				aoRadius={2}
				intensity={2.6}
				distanceFalloff={1}
				color="#3a2e28"
			/>
			<Bloom
				luminanceThreshold={BLOOM_THRESHOLD}
				luminanceSmoothing={0.28}
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

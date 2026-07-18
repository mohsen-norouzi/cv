import {
	Bloom,
	EffectComposer,
	ToneMapping,
	Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";

export default function PostFX() {
	return (
		<EffectComposer
			multisampling={0}
			enableNormalPass={false}
			frameBufferType={THREE.HalfFloatType}
		>
			<Bloom
				luminanceThreshold={0.75}
				luminanceSmoothing={0.28}
				intensity={1.25}
				mipmapBlur
				radius={0.5}
			/>
			<Vignette offset={0.28} darkness={0.42} />
			<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
		</EffectComposer>
	);
}

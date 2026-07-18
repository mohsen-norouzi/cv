import {
	Bloom,
	EffectComposer,
	LensFlare,
	ToneMapping,
	Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { BEACON_TIP } from "./constants";

export default function PostFX() {
	return (
		<EffectComposer multisampling={0} enableNormalPass={false}>
			<Bloom
				luminanceThreshold={0.98}
				luminanceSmoothing={0.2}
				intensity={1.75}
				mipmapBlur
				radius={0.65}
			/>
			<LensFlare
				lensPosition={BEACON_TIP}
				glareSize={0.28}
				starPoints={6}
				flareSize={0.0035}
				flareShape={0.015}
				flareSpeed={0}
				animated={false}
				secondaryGhosts={false}
				aditionalStreaks
				starBurst
				haloScale={0.25}
				opacity={0.85}
				colorGain={new THREE.Color(28, 20, 10)}
			/>
			<Vignette offset={0.25} darkness={0.5} />
			<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
		</EffectComposer>
	);
}

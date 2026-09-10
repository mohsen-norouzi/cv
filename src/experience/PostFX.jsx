import { useFrame } from "@react-three/fiber";
import {
	Bloom,
	BrightnessContrast,
	DepthOfField,
	EffectComposer,
	HueSaturation,
	N8AO,
	ToneMapping,
	Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import {
	CAM_START,
	CAM_TARGET,
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
import { getScrollProgress } from "./scrollStore";

import { getWalking } from "./walkStore";

/**
 * Desktop: full post stack.
 * Mobile: no composer (Android gray/black bugs). Leave NoToneMapping —
 * ACES without the grade stack was crushing the scene to night-black.
 */
const OVERVIEW_FOCUS_DISTANCE = CAM_START.distanceTo(CAM_TARGET);
const FOCUS_DISTANCES = [OVERVIEW_FOCUS_DISTANCE, 13, 17, 14];

function DesktopPostFX() {
	const vignette = useRef(null);
	const grade = useRef(null);
	const lens = useRef(null);
	// React 19 passes refs as props. The library's generic effect wrapper
	// serializes props on rerender, so an object ref containing an Effect's
	// circular scene graph crashes it. Stable callback refs stay serializable.
	const setGrade = useCallback((effect) => {
		grade.current = effect;
	}, []);
	const setVignette = useCallback((effect) => {
		vignette.current = effect;
	}, []);

	useFrame(() => {
		const f = getFocusAmount();
		if (lens.current) {
			const p = THREE.MathUtils.clamp(getScrollProgress(), 0, 3),
				i = Math.min(2, Math.floor(p));
			const distance = THREE.MathUtils.lerp(
				FOCUS_DISTANCES[i],
				FOCUS_DISTANCES[i + 1],
				p - i,
			);
			lens.current.circleOfConfusionMaterial.focusDistance = distance;
			lens.current.circleOfConfusionMaterial.focusRange = getWalking()
				? 3000
				: distance * 0.6;
		}
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
			multisampling={4}
			enableNormalPass={false}
			frameBufferType={THREE.HalfFloatType}
		>
			<N8AO
				halfRes
				quality="medium"
				aoRadius={1.0}
				intensity={0.5}
				distanceFalloff={1.0}
				color="#333c4c"
			/>
			<DepthOfField
				ref={lens}
				focusDistance={OVERVIEW_FOCUS_DISTANCE}
				focusRange={OVERVIEW_FOCUS_DISTANCE * 0.6}
				bokehScale={1.7}
				height={480}
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
				ref={setGrade}
				brightness={BRIGHTNESS}
				contrast={CONTRAST}
			/>
			<Vignette
				ref={setVignette}
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

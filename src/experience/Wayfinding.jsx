import { useGLTF } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
	buildWayfinding,
	signPaintTexture,
	signMaterials,
	SIGN_MODEL,
} from "./buildWayfinding";
useGLTF.preload(SIGN_MODEL);
export default function Wayfinding() {
	const { scene } = useGLTF(SIGN_MODEL);
	const gl = useThree((state) => state.gl);
	const signs = useMemo(() => {
		const paint = signPaintTexture(),
			materials = signMaterials(paint);
		return { root: buildWayfinding(scene, materials), paint, materials };
	}, [scene]);
	useEffect(() => {
		gl.shadowMap.needsUpdate = true;
		return () => {
			signs.root.traverse((o) => o.geometry?.dispose());
			for (const material of Object.values(signs.materials)) material.dispose();
			signs.paint.dispose();
		};
	}, [signs, gl]);
	return <primitive object={signs.root} dispose={null} />;
}

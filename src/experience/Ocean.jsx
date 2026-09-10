import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { SKY_COOL, SKY_HORIZON, SKY_SUN, SUN_DIRECTION } from "./constants";
import { IS_MOBILE } from "./device";
import { worldBrightness } from "./focusStore";
import {
	skyPalette,
	skyLightColor,
	skyLightDirection,
	updateSkyPalette,
} from "./skyPalette";
import { lighthouseUniforms } from "./lighthouseState";
import { reducedMotion } from "./motion";
import {
	SEA_LEVEL,
	SHORE_BOUNDS,
	SHORE_RANGE,
	oceanGeometry,
	swellGLSL,
} from "./oceanSurface";

// Tileable, multi-scale capillary waves. This is a normal map, not a painted reflection.
function waveNormals() {
	const size = 256,
		pixels = new Uint8Array(size * size * 4);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			const u = (x / size) * Math.PI * 2,
				v = (y / size) * Math.PI * 2;
			const dx =
				0.1 * Math.cos(u * 9 + v * 3) +
				0.055 * Math.cos(u * 17 - v * 7) +
				0.025 * Math.sin(u * 29 + v * 11);
			const dy =
				0.16 * Math.cos(u * 3 + v * 12) +
				0.06 * Math.sin(u * 7 - v * 21) +
				0.025 * Math.cos(u * 11 + v * 31);
			const n = new THREE.Vector3(dx, dy, 1).normalize(),
				i = (y * size + x) * 4;
			pixels[i] = (n.x * 0.5 + 0.5) * 255;
			pixels[i + 1] = (n.y * 0.5 + 0.5) * 255;
			pixels[i + 2] = (n.z * 0.5 + 0.5) * 255;
			pixels[i + 3] = 255;
		}
	const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.generateMipmaps = true;
	texture.needsUpdate = true;
	return texture;
}

export default function Ocean() {
	const shore = useLoader(THREE.TextureLoader, "/optimized/shore.png");
	shore.flipY = false;
	shore.colorSpace = THREE.NoColorSpace;
	const water = useMemo(() => {
		const surface = new Water(oceanGeometry(IS_MOBILE), {
			textureWidth: IS_MOBILE ? 512 : 1024,
			textureHeight: IS_MOBILE ? 512 : 1024,
			waterNormals: waveNormals(),
			sunDirection: SUN_DIRECTION,
			sunColor: "#ffdfb8",
			waterColor: "#597d86",
			distortionScale: 2.4,
			fog: true,
		});
		surface.rotation.x = -Math.PI / 2;
		surface.position.set(0, SEA_LEVEL, -60);
		surface.material.uniforms.size.value = 8.2;
		Object.assign(surface.material.uniforms, {
			swellTime: { value: 0 },
			shoreMap: { value: shore },
			shoreBounds: { value: new THREE.Vector4(...SHORE_BOUNDS) },
			foamColor: { value: new THREE.Color() },
		});
		surface.material.vertexShader = surface.material.vertexShader
			.replace(
				"uniform float time;",
				`uniform float time; uniform float swellTime;\n${swellGLSL}`,
			)
			.replace(
				"mirrorCoord = modelMatrix * vec4( position, 1.0 );",
				`
    vec3 displaced = position;
    vec3 originalWorld = (modelMatrix * vec4(position,1.)).xyz;
    float detail = 1.-smoothstep(170.,290.,length(originalWorld.xz-vec2(0.,-60.)));
    displaced.z += swell(originalWorld.xz,swellTime).x * detail;
    mirrorCoord = modelMatrix * vec4(displaced, 1.0);`,
			)
			.replace(
				"modelViewMatrix * vec4( position, 1.0 )",
				"modelViewMatrix * vec4( displaced, 1.0 )",
			);
		Object.assign(surface.material.uniforms, lighthouseUniforms);
		surface.material.uniforms.worldBrightness = worldBrightness;
		surface.material.uniforms.coastCool = { value: new THREE.Color(SKY_COOL) };
		surface.material.uniforms.coastHorizon = {
			value: new THREE.Color(SKY_HORIZON),
		};
		surface.material.uniforms.coastSun = { value: new THREE.Color(SKY_SUN) };
		surface.material.uniforms.skySunDirection = {
			value: SUN_DIRECTION.clone(),
		};
		surface.material.uniforms.skySunAmount = { value: 1 };
		surface.material.fragmentShader = surface.material.fragmentShader
			.replace(
				"uniform float alpha;",
				"uniform float alpha; uniform float swellTime; uniform sampler2D shoreMap; uniform vec4 shoreBounds; uniform vec3 foamColor; uniform vec3 coastCool; uniform vec3 coastHorizon; uniform vec3 coastSun; uniform float worldBrightness; uniform vec3 skySunDirection; uniform float skySunAmount; uniform vec3 lighthouseOrigin; uniform vec3 lighthouseDirection; uniform vec3 lighthouseColor; uniform float lighthouseReach; uniform float lighthouseStrength;",
			)
			.replace(
				"void main() {",
				swellGLSL +
					`
 float foamNoise(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  vec4 h=fract(sin(vec4(dot(i,vec2(127.1,311.7)),dot(i+vec2(1,0),vec2(127.1,311.7)),dot(i+vec2(0,1),vec2(127.1,311.7)),dot(i+vec2(1,1),vec2(127.1,311.7))))*43758.5453);
  return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
 }
 void main() {`,
			)
			.replace(
				"vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );",
				`
    vec3 sw = swell(worldPosition.xz,swellTime);
    float detail=1.-smoothstep(170.,290.,length(worldPosition.xz-vec2(0.,-60.)));
    vec3 surfaceNormal = normalize(vec3(-sw.y*detail + noise.x*.48, 1., -sw.z*detail + noise.y*.55));
    vec2 shoreUV=(worldPosition.xz-shoreBounds.xy)/shoreBounds.zw;
    float inside=step(0.,shoreUV.x)*step(0.,shoreUV.y)*step(shoreUV.x,1.)*step(shoreUV.y,1.);
    float shoreDistance=mix(${SHORE_RANGE.toFixed(1)},texture2D(shoreMap,shoreUV).r*${SHORE_RANGE.toFixed(1)},inside);
    float breakup=foamNoise(worldPosition.xz*1.8-vec2(swellTime*.18,0.));
    float lace=foamNoise(worldPosition.xz*5.3+vec2(0.,swellTime*.23));
    float surge=.5+.5*sin(shoreDistance*2.5-swellTime*1.7+breakup*2.);
    float wash=(1.-smoothstep(.3,2.8,shoreDistance))*smoothstep(.32,.8,surge+breakup*.28);
    float contact=1.-smoothstep(.15,.85,shoreDistance);
    float crest=smoothstep(.37,.56,sw.x)*smoothstep(.58,.8,breakup)*.13*detail;
    float foam=clamp((wash*.42+contact*.28*(.3+.7*surge))*smoothstep(.2,.66,lace+breakup*.25)+crest,0.,.72);
   `,
			)
			.replace(
				"vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;",
				`
    vec3 shallow=waterColor*vec3(.78,1.3,1.22);
    vec3 waterTint=mix(waterColor*.8,shallow,(1.-smoothstep(0.,7.,shoreDistance))*.55);
    vec3 scatter=max(0.,dot(surfaceNormal,eyeDirection))*waterTint;
   `,
			)
			.replace(
				"vec3 outgoingLight = albedo;",
				`
				vec3 horizonDir=normalize(worldPosition.xyz-eye);
				float az=max(dot(normalize(vec3(horizonDir.x,0.,horizonDir.z)),normalize(vec3(skySunDirection.x,0.,skySunDirection.z))),0.);
				float glow=pow(az,1.5);
				vec3 horizon=mix(coastCool,coastHorizon,glow);
				horizon=mix(horizon,coastSun,glow*.65*skySunAmount);

				albedo=mix(albedo,foamColor,foam);
    vec3 outgoingLight=mix(albedo,horizon*worldBrightness,1.-exp(-distance*.0035));
                vec3 fromLighthouse=worldPosition.xyz-lighthouseOrigin;
                float beamDistance=length(fromLighthouse);
                float cone=dot(normalize(fromLighthouse),lighthouseDirection);
                float footprint=smoothstep(.99789,.99925,cone)*(1.-smoothstep(lighthouseReach*.7,lighthouseReach,beamDistance));
                float ripples=.55+.45*max(0.,dot(surfaceNormal,normalize(lighthouseOrigin-worldPosition.xyz)));
                outgoingLight+=lighthouseColor*footprint*ripples*lighthouseStrength*.9;`,
			)
			.replace("#include <fog_fragment>", "");
		return surface;
	}, [shore]);
	useFrame((_, delta) => {
		const sky = updateSkyPalette();
		const u = water.material.uniforms;
		u.foamColor.value
			.copy(skyPalette.horizon)
			.multiplyScalar(worldBrightness.value * (0.6 + sky.daylight * 0.7));
		u.sunDirection.value.copy(skyLightDirection);
		u.skySunDirection.value.fromArray(sky.sunDirection);
		u.skySunAmount.value = sky.sunVisible;
		u.coastCool.value.copy(skyPalette.cool);
		u.coastHorizon.value.copy(skyPalette.horizon);
		u.coastSun.value.copy(skyPalette.sun);
		water.material.uniforms.sunColor.value
			.copy(skyLightColor)
			.multiplyScalar(
				worldBrightness.value *
					(sky.sunVisible > 0.01
						? sky.sunVisible
						: sky.moonVisible * sky.moonFraction * 0.18),
			);
		water.material.uniforms.waterColor.value
			.copy(skyPalette.water)
			.multiplyScalar(worldBrightness.value);
		if (!reducedMotion()) {
			const step = Math.min(delta, 0.05);
			u.time.value += step * 0.32;
			u.swellTime.value += step * 0.85;
		}
	});
	useEffect(
		() => () => {
			water.geometry.dispose();
			water.material.uniforms.normalSampler.value.dispose();
			water.material.uniforms.mirrorSampler.value.dispose();
			water.material.dispose();
		},
		[water],
	);
	return <primitive object={water} />;
}

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getFocusAmount, worldBrightness } from "./focusStore";
import { skyPalette, updateSkyPalette } from "./skyPalette";
import { reducedMotion } from "./motion";
import { weatherNoise } from "./weatherNoise";
import { createLunarSurface } from "./lunarSurface";
import { CELESTIAL_SKY, celestialSkyGLSL } from "./celestialSky";

// The sky, enlarged sun/moon and stars share one draw call.
export default function SkyDome() {
	const dome = useRef();
	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				side: THREE.BackSide,
				depthWrite: false,
				fog: false,
				uniforms: {
					topColor: { value: skyPalette.top },
					horizonColor: { value: skyPalette.horizon },
					coolColor: { value: skyPalette.cool },
					sunColor: { value: skyPalette.sun },
					sunDir: { value: new THREE.Vector3() },
					moonDir: { value: new THREE.Vector3() },
					sunRadius: { value: CELESTIAL_SKY.sunRadius },
					moonRadius: { value: CELESTIAL_SKY.moonRadius },
					moonIllumination: { value: 0 },
					lunarSurface: { value: createLunarSurface() },
					sunDiscAmount: { value: 1 },
					sunAmount: { value: 0 },
					moonAmount: { value: 0 },
					daylight: { value: 1 },
					stars: { value: 0 },
					sidereal: { value: 0 },
					latitude: { value: 0 },
					worldBrightness,
					cloudTime: { value: 0 },
					cloudOrigin: { value: new THREE.Vector3() },
				},
				vertexShader: `varying vec3 vDirection;
   void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
				fragmentShader: `
   uniform vec3 topColor,horizonColor,coolColor,sunColor,sunDir,moonDir;
   uniform float sunAmount,moonAmount,daylight,stars,sidereal,latitude,worldBrightness;
   uniform float cloudTime; uniform vec3 cloudOrigin;
   ${weatherNoise}
   ${celestialSkyGLSL}
   varying vec3 vDirection;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec3 dir=normalize(vDirection);
    float heightMix=smoothstep(-.05,.75,dir.y);
    float az=max(dot(normalize(vec3(dir.x,.0001,dir.z)),normalize(vec3(sunDir.x,.0001,sunDir.z))),0.);
    float glow=pow(az,1.5);
    vec3 horizon=mix(coolColor,horizonColor,glow);
    horizon=mix(horizon,sunColor,glow*.65*sunAmount);
    vec3 col=mix(horizon,topColor,heightMix);
    float sd=max(dot(dir,sunDir),0.);

    vec3 skyAir=col;
    // Uneven point brightness, warm/cool colors and subpixel-safe soft cores.
    vec3 eq=vec3(dir.x,dir.y*sin(latitude)-dir.z*cos(latitude),dir.y*cos(latitude)+dir.z*sin(latitude));
    eq.xz=mat2(cos(sidereal),-sin(sidereal),sin(sidereal),cos(sidereal))*eq.xz;
    float moonGlare=1.-pow(max(dot(dir,moonDir),0.),12.)*moonIllumination*.78;
    if(stars>.001) col+=(starLayer(eq,115.,.972,3.)+starLayer(eq,219.,.984,71.)*.55)*stars*smoothstep(0.,.16,dir.y)*moonGlare;
    // Occlude individual pixels at the horizon, never fade an entire disc
    // according to its center altitude. The enlarged upper limb sets last.
    float horizonAA=max(fwidth(dir.y),.00005);
    float aboveHorizon=smoothstep(-horizonAA,horizonAA,dir.y);
    // Limb darkening and atmospheric scattering, without an outlined ring.
    float sunAngle=acos(clamp(sd,-1.,1.));
    float sr=sunAngle/sunRadius;
    float sunAA=max(fwidth(sr),.009);
    float sunDisc=1.-smoothstep(1.-sunAA,1.+sunAA,sr);
    float sunHeight=smoothstep(-sunRadius,.25,sunDir.y);
    vec3 solarTint=mix(vec3(1.,.28,.055),vec3(1.,.91,.72),sunHeight);
    float halo=exp(-max(0.,sr-1.)*2.8)*.30+exp(-sunAngle*8.)*.095;
    col+=solarTint*halo*sunDiscAmount*aboveHorizon*smoothstep(-sunRadius*1.3,sunRadius,sunDir.y);
    float mu=sqrt(max(0.,1.-min(sr*sr,1.)));
    float limb=.40+.60*pow(mu,.65);
    vec3 solarRadiance=solarTint*(1.5+limb*2.3);
    col=mix(col,skyAir+solarRadiance,sunDisc*sunDiscAmount*aboveHorizon);
    // A relief-shaded lunar sphere. Atmospheric radiance remains in front of
    // its unlit hemisphere, avoiding a black cut-out in the daylight sky.
    vec3 right=normalize(cross(vec3(0.,1.,.0001),moonDir));
    vec3 up=normalize(cross(moonDir,right));
    vec2 q=vec2(dot(dir,right),dot(dir,up))/moonRadius;
    float r2=dot(q,q);
    float md=max(dot(dir,moonDir),0.);
    float moonEdge=max(fwidth(r2)*1.2,.006);
    col+=vec3(.39,.47,.61)*pow(md,180.)*.025*moonAmount*moonIllumination*aboveHorizon*smoothstep(-moonRadius,moonRadius,moonDir.y);
    if(dot(dir,moonDir)>.98 && r2<1.){
     float z=sqrt(max(0.,1.-r2));
     vec3 normal=q.x*right+q.y*up-z*moonDir;
     vec2 texUV=asin(clamp(q,-1.,1.))/3.14159265+.5;
     vec2 texel=vec2(1./512.,0.);
     vec2 surface=texture2D(lunarSurface,texUV).rg;
     float dx=texture2D(lunarSurface,texUV+texel.xy).g-texture2D(lunarSurface,texUV-texel.xy).g;
     float dy=texture2D(lunarSurface,texUV+texel.yx).g-texture2D(lunarSurface,texUV-texel.yx).g;
     vec3 relief=normalize(normal-(right*dx+up*dy)*2.8);
     float incidence=dot(normal,sunDir);
     float terminator=smoothstep(-.025,.035,incidence);
     float diffuse=max(dot(relief,sunDir),0.);
     float lunarLight=(.16+.84*pow(diffuse,.65))*terminator;
     float earthshine=.006*(1.-daylight)*(1.-moonIllumination);
     vec3 reflected=vec3(.92,.91,.87)*surface.r*(lunarLight*1.1+earthshine);
     float transmission=mix(.78,1.,smoothstep(0.,.25,dir.y));
     vec3 moon=skyAir+reflected*transmission*moonAmount;
     float rim=1.-smoothstep(1.-moonEdge,1.,r2);
     col=mix(col,moon,rim*aboveHorizon);
    }
    // Intersect two horizontal cloud decks. Wind advects their density,
    // while perspective compresses the distant banks toward the horizon.
    if(dir.y>.005){
     vec2 wind=vec2(cloudTime*.012,cloudTime*.0035);
     vec2 cloudUV=(cloudOrigin.xz+dir.xz*(145.-cloudOrigin.y)/max(dir.y,.025))*.008;
     vec2 warp=vec2(weatherNoise(cloudUV*.4+wind*.3),weatherNoise(cloudUV*.4+8.));
     float n=weatherFbm(cloudUV-wind+warp*.6);
     float broad=weatherNoise(cloudUV*.25-wind*.35);
     float density=smoothstep(.43,.69,n+broad*.09);
     float lifted=weatherFbm(cloudUV-wind+warp*.6+sunDir.xz*.35);
     float silver=clamp((n-lifted)*3.+.45,0.,1.);
     float veil=weatherFbm(cloudUV*.55+vec2(33.,14.)-wind*.65);
     float high=smoothstep(.56,.76,veil)*.35;
     float alpha=(density*.91+high)*(smoothstep(.005,.075,dir.y));
     vec3 shade=mix(coolColor*.78,horizonColor,.35);
     vec3 lit=mix(horizonColor*1.12,sunColor*1.25,glow*.55*sunAmount);
     vec3 cloudColor=mix(shade,lit,silver);
     cloudColor+=sunColor*pow(sd,12.)*density*(1.-density)*sunAmount*.6;
     col=mix(col,cloudColor,clamp(alpha,0.,.95));
    }
    col+=(hash(gl_FragCoord.xy)-.5)/650.;
    gl_FragColor=vec4(col*worldBrightness,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
			}),
		[],
	);
	useEffect(
		() => () => {
			material.uniforms.lunarSurface.value.dispose();
			material.dispose();
		},
		[material],
	);
	useFrame(({ camera }, delta) => {
		const sky = updateSkyPalette(),
			u = material.uniforms;
		dome.current.position.copy(camera.position);
		u.cloudOrigin.value.copy(camera.position);
		if (!reducedMotion()) u.cloudTime.value += Math.min(delta, 0.05);
		u.sunDir.value.fromArray(sky.sunDirection);
		u.moonDir.value.fromArray(sky.moonDirection);
		u.sunAmount.value = sky.sunVisible * (1 - getFocusAmount() * 0.85);
		// Disc opacity is independent of center altitude; the shader clips the
		// portion below the horizon. Lighting still uses the real solar state.
		u.sunDiscAmount.value = 1 - getFocusAmount() * 0.85;
		u.moonAmount.value = 1 - sky.daylight * 0.65;
		u.stars.value = sky.stars;
		u.daylight.value = sky.daylight;
		u.latitude.value = (sky.location.latitude * Math.PI) / 180;
		u.moonIllumination.value = sky.moonFraction;
		const days = sky.date.getTime() / 86400000 - 10957.5;
		u.sidereal.value =
			(((280.46061837 + 360.98564736629 * days + sky.location.longitude) %
				360) *
				Math.PI) /
			180;
	});
	return (
		<mesh
			ref={dome}
			material={material}
			renderOrder={-10}
			frustumCulled={false}
		>
			<sphereGeometry args={[1500, 32, 20]} />
		</mesh>
	);
}

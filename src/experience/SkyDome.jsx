import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getFocusAmount, worldBrightness } from "./focusStore";
import { skyPalette, updateSkyPalette } from "./skyPalette";
import { reducedMotion } from "./motion";
import { weatherNoise } from "./weatherNoise";

// Sky, celestial discs and sparse stars share one draw call and follow the camera.
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
    col+=sunColor*(pow(sd,160.)*.16+smoothstep(cos(.010),cos(.008),sd)*3.)*sunAmount;
    // Small deterministic star field in equatorial coordinates; sidereal rotation.
    vec3 eq=vec3(dir.x,dir.y*sin(latitude)-dir.z*cos(latitude),dir.y*cos(latitude)+dir.z*sin(latitude));
    vec2 uv=vec2(atan(eq.x,eq.z)+sidereal,asin(clamp(eq.y,-1.,1.)))*vec2(150.,150.);
    vec2 cell=floor(uv), p=fract(uv)-.5;
    float seed=hash(cell);
    float variation=hash(cell+vec2(19.,71.));
    float star=(1.-smoothstep(.015,.055+variation*.03,length(p)))*step(.989,seed);
    col+=vec3(.65,.76,1.)*star*(.35+variation*.65)*stars*smoothstep(0.,.12,dir.y);
    // A sphere projected onto the sky, illuminated from the real sun direction.
    vec3 right=normalize(cross(vec3(0.,1.,.0001),moonDir));
    vec3 up=normalize(cross(moonDir,right));
    vec2 q=vec2(dot(dir,right),dot(dir,up))/.013;
    float r2=dot(q,q);
    if(dot(dir,moonDir)>.99 && r2<1.){
     vec3 normal=q.x*right+q.y*up-sqrt(max(0.,1.-r2))*moonDir;
     float lit=smoothstep(-.06,.1,dot(normal,sunDir));
     float textureDetail=.91+.09*sin(q.x*37.)*sin(q.y*29.);
     vec3 moon=vec3(.78,.85,1.)*(.025+lit*.95)*textureDetail;
     col=mix(col,moon,moonAmount*(1.-daylight*(1.-lit))*(1.-smoothstep(.95,1.,r2)));
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
	useEffect(() => () => material.dispose(), [material]);
	useFrame(({ camera }, delta) => {
		const sky = updateSkyPalette(),
			u = material.uniforms;
		dome.current.position.copy(camera.position);
		u.cloudOrigin.value.copy(camera.position);
		if (!reducedMotion()) u.cloudTime.value += Math.min(delta, 0.05);
		u.sunDir.value.fromArray(sky.sunDirection);
		u.moonDir.value.fromArray(sky.moonDirection);
		u.sunAmount.value = sky.sunVisible * (1 - getFocusAmount() * 0.85);
		u.moonAmount.value = sky.moonVisible * (1 - sky.daylight * 0.8);
		u.stars.value = sky.stars;
		u.daylight.value = sky.daylight;
		u.latitude.value = (sky.location.latitude * Math.PI) / 180;
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

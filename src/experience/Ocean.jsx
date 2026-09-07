import { reducedMotion } from "./motion";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { SKY_COOL, SKY_HORIZON, SKY_SUN, SUN_DIRECTION } from "./constants";

export default function Ocean() {
	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {
					uTime: { value: 0 },
					uSun: { value: SUN_DIRECTION.clone() },
					uCool: { value: new THREE.Color(SKY_COOL) },
					uHorizon: { value: new THREE.Color(SKY_HORIZON) },
					uSunColor: { value: new THREE.Color(SKY_SUN) },
				},
				vertexShader: `varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
				fragmentShader: `
      uniform float uTime; uniform vec3 uSun; uniform vec3 uCool; uniform vec3 uHorizon; uniform vec3 uSunColor; varying vec3 vWorld;
      void main(){
        vec2 p=vWorld.xz; float t=uTime*.25;
        float a=sin(p.x*1.8+p.y*.55+t)*.06+sin(p.x*3.9-p.y*1.1-t*1.6)*.026;
        float b=cos(p.x*.7+p.y*2.7+t*.7)*.07+cos(p.x*2.3+p.y*4.5+t)*.02;
        vec3 n=normalize(vec3(a,1.,b)); vec3 view=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(dot(view,n),0.),3.);
        vec3 deep=vec3(.23,.32,.39),sky=vec3(.61,.65,.71);
        vec3 color=mix(deep,sky,.38+fresnel*.6);
        float sun=pow(max(dot(reflect(-uSun,n),view),0.),160.);
        float wave=sin(p.x*2.+p.y*3.2+t)*sin(p.x*1.3-p.y*2.7+t*.4);
        color+=vec3(.055,.065,.075)*wave;
        color+=vec3(1.,.72,.42)*sun*.8;
        float mist=1.-exp(-length(cameraPosition-vWorld)*.009);
        vec3 dir=normalize(vWorld-cameraPosition);
        float az=max(dot(normalize(vec3(dir.x,0.,dir.z)),normalize(vec3(uSun.x,0.,uSun.z))),0.);
        float glow=pow(az,1.5);
        vec3 horizon=mix(uCool,uHorizon,glow);
        horizon=mix(horizon,uSunColor,glow*.65);
        horizon=mix(horizon,uSunColor,glow*.25);
        color=mix(color,horizon,mist);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
			}),
		[],
	);
	useFrame(({ clock }) => {
		material.uniforms.uTime.value = reducedMotion() ? 0 : clock.elapsedTime;
	});
	return (
		<mesh
			rotation={[-Math.PI / 2, 0, 0]}
			position={[0, -0.85, -60]}
			material={material}
		>
			<planeGeometry args={[4000, 4000]} />
		</mesh>
	);
}

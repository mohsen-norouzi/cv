// Shared continuous noise: no downloaded cloud textures or extra render targets.
export const weatherNoise = `
float weatherHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float weatherNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(weatherHash(i),weatherHash(i+vec2(1.,0.)),f.x),mix(weatherHash(i+vec2(0.,1.)),weatherHash(i+vec2(1.,1.)),f.x),f.y);
}
float weatherFbm(vec2 p){
 float n=weatherNoise(p)*.54;
 p=mat2(.8,-.6,.6,.8)*p*2.03+17.;n+=weatherNoise(p)*.27;
 p=mat2(.8,-.6,.6,.8)*p*2.07+11.;n+=weatherNoise(p)*.13;
 return n+weatherNoise(p*2.01)*.06;
}`;

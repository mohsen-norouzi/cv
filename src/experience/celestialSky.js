// Art-directed angular radii; positions and lunar phases follow the live clock.
export const CELESTIAL_SKY = { sunRadius: 0.043, moonRadius: 0.067 };

export const celestialSkyGLSL = `
uniform float sunRadius, moonRadius, moonIllumination, sunDiscAmount;
uniform sampler2D lunarSurface;
// Cube-projected star fields avoid the pole clustering of a latitude grid.
vec3 starLayer(vec3 ray,float scale,float threshold,float offset){
 vec3 a=abs(ray); vec2 uv; float face;
 if(a.x>=a.y && a.x>=a.z){uv=ray.yz/a.x;face=ray.x>0.?0.:1.;}
 else if(a.y>=a.z){uv=ray.xz/a.y;face=ray.y>0.?2.:3.;}
 else{uv=ray.xy/a.z;face=ray.z>0.?4.:5.;}
 uv=(uv*.5+.5)*scale;
 vec2 cell=floor(uv), local=fract(uv);
 vec2 key=cell+vec2(face*317.+offset,offset*11.);
 float seed=weatherHash(key);
 vec2 position=.18+.64*vec2(weatherHash(key+17.),weatherHash(key+73.));
 vec2 d=local-position;
 float pixel=max(length(fwidth(uv))*.55,.012);
 float magnitude=pow(weatherHash(key+29.),8.);
 float radius=.018+magnitude*.045;
 float width=max(pixel,radius);
 float core=exp(-dot(d,d)/(width*width)*2.)*min(1.,radius*radius/(pixel*pixel));
 float halo=exp(-length(d)*22.)*magnitude*.10;
 float twinkle=1.+(.06+.08*magnitude)*sin(cloudTime*(1.1+seed)+seed*120.);
 vec3 tint=mix(vec3(1.,.73,.48),vec3(.66,.80,1.),weatherHash(key+41.));
 return tint*(core*(1.2+magnitude*5.)+halo)*step(threshold,seed)*twinkle;
}
`;

export default `
#version 300 es
precision mediump float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform float u_x;
uniform float u_z;
uniform int u_y;
vec3 currentPoint;

out vec4 fragColor;

const int MAX_STEPS = 400;    /* max marching steps */
const float MIN_DIST = 0.0;   /* checking for self interesections */
const float MAX_DIST = 100.0; /* max marching distance */
const float EPS = 0.0001;     /* when are you close enough */

struct Material {
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float shininess;
};

Material getMaterial(float id);
vec2 sceneSDF(vec3 p, int u_y);
bool inShadow(vec3 p, vec3 lightPos, int u_y);
vec3 phongLighting(vec3 eye, vec3 p, Material mat, int u_y);
vec3 phongContrib(vec3 eye, vec3 p, Material mat, vec3 lightPos, vec3 lightIntensity, int u_y);
vec2 rayMarch(vec3 eye, vec3 dir, float stop, int u_y);
vec3 rayDirection(vec2 screenSize, vec2 fragCoord, float fovyDeg);
vec3 estimateNormal(vec3 p, int u_y);
vec2 unionSDF(vec2 distA, vec2 distB);
float terrainSDF(vec3 p, int u_y);
float waterSDF(vec3 p, float height);
float fbm_4(vec3 x);
float hash1(vec2 p);
float hash1(float n);
float noise3DIQ(vec3 x);

// VARIOUS NOISE FUNCTIONS WE TRIED, BUT DID NOT USE
//
// /*
//   1 out, 1 in...
//   computes a value between 0 and 1
//   for a float value p. This is not a
//   _random_ value as the same value is
//   produced for the same value of p,
//   but diffent p values produce seemingly
//   random values of the hash.
// */
// float hash11(float p){
//     p = fract(p * .1031);
//     p *= p + 33.33;
//     p *= p + p;
//     return fract(p);
// }
//
// /* 1 out, 2 in...
//    return a value in range 0..1
//    for a given vec2 p */
// float hash12(vec2 p){
// 	vec3 p3  = fract(vec3(p.xyx) * .1031);
//     p3 += dot(p3, p3.yzx + 33.33);
//     return fract((p3.x + p3.y) * p3.z);
// }
//
// /* smooth Hermite interpolation of t */
// float ease(float t){
//   return t*t*(3.-2.*t);
// }
//
// vec2 ease(vec2 t){
//   return t*t*(3.-2.*t);
// }
//
// float noise1D(float x){
//     float i = floor(x);
//     float f = fract(x);
//     return mix(hash11(i), hash11(i + 1.0), ease(f));
// }
//
// float noise2D(vec2 x){
//   vec2 i = floor(x);
//   vec2 f = fract(x);
//
// 	// Four corners in 2D of a tile
// 	float a = hash12(i);
//   float b = hash12(i + vec2(1.0, 0.0));
//   float c = hash12(i + vec2(0.0, 1.0));
//   float d = hash12(i + vec2(1.0, 1.0));
//
//   vec2 u = ease(f);
// 	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
// }
//
//  float noise3D(vec3 x) {
//   vec3 i = floor(x);
//   vec3 f = fract(x);
// 	 // Eight corners of two, 2D of a tiles, probably need to have hash123 function
// 	 float a = hash12(i);
//   float b = hash12(i + vec3(1.0, 0.0, 0.0));
//   float c = hash12(i + vec3(0.0, 1.0, 0.0));
//   float d = hash12(i + vec3(1.0, 1.0, 0.0));
//   float e = hash12(i + vec3(0.0, 0.0, 1.0));
//   float f = hash12(i + vec3(1.0, 0.0, 1.0));
//   float g = hash12(i + vec3(0.0, 1.0, 1.0));
//   float h = hash12(i + vec3(1.0, 1.0, 1.0));
//   vec3 u = ease(f);
//   //Not sure how to tie it all together yet
//   float mix1 = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
//   float mix2 = mix(mix(e, f, u.x), mix(g, h, u.x), u.y);
//   return mix(mix1, mix2, u.z);
//  }
//
// /* fractional Brownian motion
//    https://thebookofshaders.com/13/
// */
// float fbm(in vec2 p, int u_y){
//   // Initial values
//   float value = 0.0;
//   float amplitude = .5;
//   float frequency = 0.;
//   for(int i = 0; i < u_y; i++){
//       value += amplitude * noise2D(p);
//       p *= 2.;
//       amplitude *= .5;
//   }
//   return value;
// }

/* TAKEN FROM IQ SHADERTOY https://www.shadertoy.com/view/4ttSWf*/
float hash1( vec2 p ){
  p  = 50.0*fract( p*0.3183099 );
  return fract( p.x*p.y*(p.x+p.y) );
}

/* TAKEN FROM IQ SHADERTOY https://www.shadertoy.com/view/4ttSWf*/
float hash1( float n ){
  return fract( n*17.0*fract( n*0.3183099 ) );
}

/* TAKEN FROM IQ SHADERTOY https://www.shadertoy.com/view/4ttSWf*/
float noise3DIQ( in vec3 x ){
  vec3 p = floor(x);
  vec3 w = fract(x);
  vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
  float n = p.x + 317.0*p.y + 157.0*p.z;

  float a = hash1(n+0.0);
  float b = hash1(n+1.0);
  float c = hash1(n+317.0);
  float d = hash1(n+318.0);
  float e = hash1(n+157.0);
  float f = hash1(n+158.0);
  float g = hash1(n+474.0);
  float h = hash1(n+475.0);

  float k0 =   a;
  float k1 =   b - a;
  float k2 =   c - a;
  float k3 =   e - a;
  float k4 =   a - b - c + d;
  float k5 =   a - c - e + g;
  float k6 =   a - b - e + f;
  float k7 = - a + b + c - d + e - f - g + h;

  return -1.0+2.0*(k0 + k1*u.x + k2*u.y + k3*u.z + k4*u.x*u.y + k5*u.y*u.z + k6*u.z*u.x + k7*u.x*u.y*u.z);
}

/* TAKEN FROM IQ SHADERTOY https://www.shadertoy.com/view/4ttSWf*/
float fbm_4( in vec3 x ){
  mat3 m3  = mat3( 0.00,  0.80,  0.60,
                    -0.80,  0.36, -0.48,
                    -0.60, -0.48,  0.64 );
  float f = 2.0;
  float s = 0.5;
  float a = 0.0;
  float b = 0.5;
  for( int i=0; i<4; i++ ){
      float n = noise3DIQ(x);
      a += b*n;
      b *= s;
      x = f*m3*x;
  }

	return a;
}

mat4 cameraMatrix(vec3 eye, vec3 at, vec3 up){
  vec3 n = normalize(at - eye);
  vec3 r = normalize(cross(n, up));
  vec3 u = cross(r, n);
  return mat4(
      vec4(r, 0.0),
      vec4(u, 0.0),
      vec4(-n, 0.0),
      vec4(0.0, 0.0, 0.0, 1)
  );
}

vec3 rayDirection(vec2 screenSize, vec2 fragCoord, float fovyDeg){
  vec2 xy = fragCoord - screenSize/2.0;
  float z = screenSize.y/tan(radians(fovyDeg/2.0));
  return normalize(vec3(xy, -z));
}

vec2 rayMarch(vec3 eye, vec3 worldDir, float stop, int u_y){
  float depth;
  depth = 0.;
  for(int i = 0; i<MAX_STEPS; i++){
    vec2 sdfResults = sceneSDF(eye+worldDir*depth, u_y);
    float material = sdfResults.x;
    float dist = sdfResults.y;
    if(dist<EPS){
      return vec2(material, depth);
    }
    depth += dist;
    if(depth >= stop){
      return vec2(-1., MAX_DIST);
    }
  }
  return vec2(-1, MAX_DIST);
}

float terrainSDF(vec3 p, int u_y){
  return p.y + fbm_4(p) + fbm_4(.2*p);
}

float waterSDF(vec3 p, float height){
  return p.y + height;
}

vec2 unionSDF(vec2 distA, vec2 distB) {
  return (distA.y < distB.y) ? distA : distB;
}

vec2 sceneSDF(vec3 p, int u_y){
  float height = p.y;
  float id;
  /* If height is greater than .3, turn to snow */
  if(height >= 0.3){
    id = 3.;
  }
  /* Else if height is greater than .1, turn to terrain */
  else if(height >= 0.1){
    id = 2.;
  }
  /* Else, turn to beach */
  else{
    id = 1.;
  }

  vec2 terrain = vec2(id, terrainSDF(p, u_y));
  vec2 water = vec2(0., waterSDF(p, 0.));
  vec2 res = unionSDF(water, terrain);

  return res;
}

bool inShadow(vec3 p, vec3 lightPos, int u_y){
  vec3 pDir = p - lightPos;
  vec2 rayToP = rayMarch(lightPos, normalize(pDir), MAX_DIST, u_y);
  float k = 10.;
  if(abs(rayToP.y - distance(p, lightPos)) > k*EPS){
    return true;
  }
  return false;
}

vec3 phongContrib(vec3 eye, vec3 p, Material mat, vec3 lightPos, vec3 lightIntensity, int u_y){
  vec3 n = estimateNormal(p, u_y);
  vec3 l = normalize(lightPos - p);
  vec3 v = normalize(eye - p);
  vec3 r = normalize(reflect(-l, n));

  float dotLN = dot(l, n);
  float dotRV = dot(r, v);

  if(dotLN < 0.0){
    return vec3(0.0, 0.0, 0.0);
  }

  if(dotRV < 0.0){
    return lightIntensity * (mat.diffuse * dotLN);
  }

  if(inShadow(p, lightPos, u_y)){
    return lightIntensity * (mat.diffuse * 0. + mat.specular * 0.);
  }

  return lightIntensity * (mat.diffuse * dotLN + mat.specular * pow(dotRV, mat.shininess));
}

vec3 phongLighting(vec3 eye, vec3 p, Material mat, int u_y){
  const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
  vec3 color = ambientLight * mat.ambient;

  vec3 light1Pos = vec3(20.0 * sin(iTime) + iTime,
                      60.0,
                      20.0 * cos(iTime));

  vec3 light1Intensity = vec3(1., 1., 1.);

  color += phongContrib(eye, p, mat, light1Pos, light1Intensity, u_y);

  return color;
}

vec3 estimateNormal(vec3 p, int u_y){

  vec3 disp = vec3(EPS, 0., 0.);
  vec3 n;

  vec2 a = sceneSDF(vec3((p.x + disp.x), p.y, p.z), u_y);
  vec2 b = sceneSDF(vec3((p.x - disp.x), p.y, p.z), u_y);
  float ay = a.y;
  float by = b.y;
  n.x = ay - by;

  a = sceneSDF(vec3(p.x, (p.y + disp.yxy.y), p.z), u_y);
  b = sceneSDF(vec3(p.x, (p.y - disp.yxy.y), p.z), u_y);
  ay = a.y;
  by = b.y;
  n.y = ay - by;

  a = sceneSDF(vec3(p.x, p.y, (p.z + disp.yyx.z)), u_y);
  b = sceneSDF(vec3(p.x, p.y, (p.z - disp.yyx.z)), u_y);
  ay = a.y;
  by = b.y;
  n.z = ay - by;

  return normalize(n);

}

Material getMaterial(float id){
  /* Set a default material */
  Material mat;
  mat.ambient = vec3(0.3);
  mat.shininess = 0.;
  mat.specular = vec3(1.);
  mat.diffuse = vec3(0.8);

  /* check if id is close to given value */
  if(abs(id-1.)<EPS){
    mat.diffuse = vec3(0.7, 0.2, 0.2);
    mat.shininess = 50.0;
  }
  if(id == -1.){
    mat.ambient = vec3(0.);
    mat.shininess = 0.;
    mat.specular = vec3(0.);
    mat.diffuse = vec3(0.0);
  }

  /*
  Material ID's taken from reference provided in Lab Write Up
  Link: http://devernay.free.fr/cours/opengl/materials.html
  */

  /* Blueish Water*/
  Material water;
      water.ambient = vec3(0.2, 0.2, 0.6);
      water.shininess = (0.6 * 128.);
      water.specular = vec3(0.9, 0.9, 0.9);
      mat.diffuse = vec3(0.1, 0.6, 0.7);

  /* Sand (gold) */
  Material sand;
    sand.ambient = vec3(0.24725+.3, 0.1995+.3, 0.0745+.3);
    sand.shininess = (0.4 * 128.);
    sand.specular = vec3(0.628281 - 0.3, 0.555802 - 0.3, 0.366065 - 0.3);
    sand.diffuse = vec3(0.75164-.3, 0.60648-.3, 0.22648-.3);

  /* Terrain */
  Material terrain;
      terrain.ambient = vec3(0.2, 0.80, 0.09);
      terrain.shininess = (0.25 * 128.);
      terrain.specular = vec3(0.0, 0.0, 0.0);
      terrain.diffuse = vec3(0.01, 0.09, 0.01);

  /* Snow (white plastic) */
  Material snow;
    snow.ambient = vec3(0.8, 0.8, 0.8);
    snow.shininess = (0.25 * 128.);
    snow.specular = vec3(0.7, 0.7, 0.7);
    snow.diffuse = vec3(0.55, 0.55, 0.55);

  if(id == 0.){
    mat = water;
  }
  if(id == 1.){
    mat = sand;
  }
  if(id == 2.){
    mat = terrain;
  }
  if(id == 3.){
    mat = snow;
  }

  return mat;

  /* Failed attempt at blending for smooth transition of materials across height */
    //   if(base == 0.){
    //     mat = sand;
    //   }
    // if(id == 0.){
    //   mat = water;
    // }
    // if(base == 1.){
    //   if(decimal>= 0.5){
    //   mat.ambient = mix(sand.ambient, terrain.ambient, 1.-decimal);
    //   mat.shininess = mix(sand.shininess, terrain.shininess, 1.-decimal);
    //   mat.specular = mix(sand.specular, terrain.specular, 1.-decimal);
    //   mat.diffuse = mix(sand.diffuse, terrain.diffuse, 1.-decimal);
    // }
    // else{
    //   mat = sand;
    // }
    // }
    // if(base == 2.){
    //   if(decimal >= .5){
    //   mat.ambient = mix(terrain.ambient, snow.ambient, 1.-decimal);
    //   mat.shininess = mix(terrain.shininess, snow.shininess, 1.-decimal);
    //   mat.specular = mix(terrain.specular, snow.specular, 1.-decimal);
    //   mat.diffuse = mix(terrain.diffuse, snow.diffuse, 1.-decimal);
    // }
    // else{
    //   mat = terrain;
    // }
    // }
    // if(base >= 3.){
    //   mat = snow;
    // }

}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord/iResolution.xy;
  vec2 muv = iMouse.xy/iResolution.xy;
  vec4 background = vec4(uv.x,uv.y,0.,1.);
  vec2 p = fragCoord/iResolution.yy;
  vec2 center = vec2(0.7,0.5);
  fragColor = vec4(uv.x,uv.y,0,1.);

  /* SETTING UP CAMERA */
  vec3 eye = vec3(iTime, 10., 0.);
  vec3 at = vec3(u_x + iTime, u_y, u_z);
  vec3 up = vec3(0.0, 1.0, 0.0);
  mat4 cam = cameraMatrix(eye, at, up);

  /* Setting up ray marcher */
  mat4 eyeToWorld = cam;
  vec3 rayDir = rayDirection(iResolution.xy, fragCoord, 45.0);
  vec3 worldDir = (eyeToWorld * vec4(rayDir, 0.0)).xyz;
  vec2 dist = rayMarch(eye, worldDir, MAX_DIST, u_y);

  // If we didn't hit anything
  if (dist.y > MAX_DIST - EPS) {
      fragColor = vec4(.2, .4, .7, .85);
  return;
  }

  vec3 point = eye + dist.y * worldDir;
  Material distMat = getMaterial(dist.x);
  vec3 color = phongLighting(eye, point, distMat, u_y);
  fragColor = vec4(color, 1.);

}
`;

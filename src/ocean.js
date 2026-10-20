// Pats Reign: the ocean. A grid of water that follows the camera, moved on the GPU by four Gerstner waves (rolling swells
// with sharp crests), with fine ripples from a scrolling normal texture, foam on the breaking crests and around islands,
// sun glints, sky reflection and light glowing through the crests. The same wave maths runs in JS (heightAt), so ships,
// monsters and floating loot ride the exact surface you see. Wave size, colours, sun and lightning flashes are uniforms
// the weather and the day/night cycle drive.
import * as THREE from 'three';

// wavelength, direction (degrees), amplitude, steepness
export const WAVES = [[64, 18, 0.95, 0.55], [34, 64, 0.55, 0.7], [19, -30, 0.3, 0.8], [10.5, 108, 0.14, 0.75]];
const G = 9.8, SPEED = 0.6, NW = WAVES.length;
const WV = WAVES.map(([L, deg, A, s]) => { const k = (2 * Math.PI) / L, a = (deg * Math.PI) / 180; return { k, dx: Math.cos(a), dz: Math.sin(a), A, s, c: Math.sqrt(G / k) * SPEED }; });

// tileable detail texture: rg = ripple normal, b = foam lace (cell edges), a = soft noise
function detailTexture(S = 256) {
  const h = new Float32Array(S * S), foam = new Float32Array(S * S); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const waves = []; for (let i = 0; i < 18; i++) { const f = 2 + ((rnd() * 9) | 0), a = rnd() * Math.PI * 2; waves.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), rnd() * 6.28, 1 / (1 + f * 0.35)]); }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let v = 0; for (const [fx, fy, ph, a] of waves) v += Math.sin((2 * Math.PI * (fx * x + fy * y)) / S + ph) * a; h[y * S + x] = v; }
  const pts = []; for (let i = 0; i < 34; i++) pts.push([rnd() * S, rnd() * S]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let f1 = 1e9, f2 = 1e9; for (const [px, py] of pts) { let dx = Math.abs(x - px), dy = Math.abs(y - py); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy; const d = Math.hypot(dx, dy); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; } foam[y * S + x] = f2 - f1; }
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, hx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)], hy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
    data[i * 4] = Math.max(0, Math.min(255, 128 - hx * 70)); data[i * 4 + 1] = Math.max(0, Math.min(255, 128 - hy * 70));
    data[i * 4 + 2] = Math.max(0, Math.min(255, 255 - foam[i] * 34)); data[i * 4 + 3] = Math.max(0, Math.min(255, 128 + h[i] * 40)); }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}

const VERT = `
uniform float uTime, uAmp; uniform vec4 uW[${NW}]; uniform vec2 uWA[${NW}];
uniform sampler2D uShore; uniform vec3 uWorld;
uniform vec4 uHA[6]; uniform vec4 uHB[6]; uniform vec4 uHC[6]; uniform vec4 uRA; uniform vec4 uRB; uniform vec4 uWP; uniform float uWK;
varying vec3 vWorld; varying float vJ; varying float vH; varying float vShore; varying vec3 vN; varying float vHull; varying float vRogue;
float sech2(float x) { float c = cosh(clamp(x, -9.0, 9.0)); return 1.0 / (c * c); }
#include <common>
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0); vec2 p = wp.xz;
  float shore = texture2D(uShore, (p - uWorld.xy) / uWorld.z).r;
  float damp = 1.0 - 0.8 * smoothstep(0.15, 0.85, shore);
  if (uWK > 0.0) { float wr = length(p - uWP.xy) / uWP.z; damp *= 1.0 - 0.75 * uWK * exp(-wr * wr * 1.2); }
  float amp = uAmp * damp, steep = min(uAmp, 1.25) / 1.25 * damp;
  vec3 disp = vec3(0.0); vec3 n = vec3(0.0, 1.0, 0.0); float J = 1.0;
  for (int i = 0; i < ${NW}; i++) {
    vec4 w = uW[i]; float A = uWA[i].x * amp; float qa = uWA[i].y * steep / (w.z * ${NW}.0);
    float f = w.z * (dot(w.xy, p) - w.w * uTime); float s = sin(f), c = cos(f);
    disp.x += qa * w.x * c; disp.z += qa * w.y * c; disp.y += A * s;
    float wa = w.z * A; n.x -= w.x * wa * c; n.z -= w.y * wa * c; n.y -= qa * w.z * s; J -= qa * w.z * s;
  }
  // rogue wave: a single huge swell (and the trough in front of it) rolling across in direction uRA.zw
  vRogue = 0.0;
  if (uRB.w > 0.0) { vec2 rd = uRA.zw, rp = p - uRA.xy; float al = dot(rp, rd), la = dot(rp, vec2(-rd.y, rd.x)); float lq = la / uRB.z; float lat = exp(-lq * lq) * uRB.w;
    float cr = sech2(al / uRB.y) * lat; float tr = sech2((al - 1.9 * uRB.y) / (1.3 * uRB.y)) * lat;
    disp.y += uRB.x * (cr - 0.35 * tr); disp.xz += rd * uRB.x * 0.45 * cr * clamp(1.0 - al / uRB.y, -1.0, 1.0); vRogue = cr;
    n.xz -= rd * uRB.x * cr * tanh(al / uRB.y) * 2.0 / uRB.y; J -= cr * 0.5; }
  // whirlpool: a funnel sinks into the sea at uWP.xy (radius uWP.z, depth uWP.w)
  if (uWK > 0.0) { vec2 q = p + disp.xz - uWP.xy; float lq = length(q), r = lq / uWP.z; float e1 = exp(-r * r * 2.5), e2 = exp(-r * r * 10.0);
    disp.y -= uWP.w * (0.6 * e1 + 0.4 * e2); n.xz -= (q / max(lq, 0.001)) * uWP.w * r * (3.0 * e1 + 8.0 * e2) / uWP.z; }
  vec3 pos = vec3(p.x + disp.x, disp.y, p.y + disp.z);
  // ships: near each hull the sea settles onto that hull's waterline plane, so crests can't cut through the planks
  vHull = 0.0;
  for (int i = 0; i < 6; i++) { if (uHB[i].w < 0.5) continue; vec2 rel = pos.xz - uHA[i].xy; float lx = dot(rel, vec2(uHA[i].w, -uHA[i].z)), lz = dot(rel, uHA[i].zw);
    float m = 0.7 + uHB[i].y * 0.35; float e = length(vec2(lx / (uHB[i].y + m), lz / (uHB[i].x + m))); float k = 1.0 - smoothstep(0.72, 1.22, e);
    if (k > 0.0) { float py = uHB[i].z + lz * uHC[i].x + lx * uHC[i].y; pos.y = mix(pos.y, py, k); pos.xz = mix(pos.xz, p, k * 0.85); n = mix(n, vec3(0.0, 1.0, 0.0), k * 0.8); J = mix(J, 1.0, k); vHull = max(vHull, k * (1.0 - k) * 4.0 * uHC[i].z); } }
  vWorld = pos; vJ = J; vH = disp.y / max(uAmp, 0.25); vShore = shore; vN = normalize(n);
  vec4 mvPosition = viewMatrix * vec4(pos, 1.0); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = `
uniform vec3 uDeep, uMid, uShallow, uSky, uHorizon, uSunDir, uSunCol, uFoamCol;
uniform float uTime, uFlash, uAmbient, uSunK, uFoamK, uAmp;
uniform sampler2D uDetail; uniform vec4 uLamp; uniform vec3 uLampCol; uniform vec4 uWP; uniform float uWK; uniform float uAur;
varying vec3 vWorld; varying float vJ; varying float vH; varying float vShore; varying vec3 vN; varying float vHull; varying float vRogue;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec4 d1 = texture2D(uDetail, vWorld.xz * 0.043 + vec2(uTime * 0.013, uTime * 0.006));
  vec4 d2 = texture2D(uDetail, vWorld.xz * 0.115 + vec2(-uTime * 0.021, uTime * 0.017));
  vec2 dn = (d1.xy + d2.xy - 1.0);
  vec3 V = normalize(cameraPosition - vWorld); float dist = length(cameraPosition - vWorld);
  float dk = 0.75 / (1.0 + dist * 0.01) * (0.6 + 0.4 * min(uAmp, 1.6));
  vec3 N = normalize(vN + vec3(dn.x, 0.0, dn.y) * dk);
  float ndv = max(dot(N, V), 0.0); float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  float crest = clamp(vH * 0.45 + 0.5, 0.0, 1.0);
  vec3 body = mix(uDeep, uMid, crest * 0.75);
  float sss = pow(max(dot(V, normalize(-uSunDir + vec3(0.0, 0.6, 0.0))), 0.0), 4.0) * smoothstep(0.45, 1.0, crest);
  body += uMid * sss * 0.9 * uSunK;
  float shallow = smoothstep(0.04, 0.62, vShore); body = mix(body, uShallow, shallow * 0.9);
  float diff = max(dot(N, uSunDir), 0.0);
  vec3 col = body * (uAmbient + diff * uSunK * 0.55);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = mix(uHorizon, uSky, pow(clamp(R.y, 0.0, 1.0), 0.6));
  col = mix(col, sky, fres * 0.66);
  float rs = max(dot(R, uSunDir), 0.0);
  col += uSunCol * (pow(rs, 260.0) * 2.6 + pow(rs, 30.0) * 0.16) * uSunK;
  float lace = d1.b * 0.6 + d2.b * 0.4;
  float nz = lace * 0.5 + (d1.a * 0.6 + d2.a * 0.4) * 0.5;
  float crestD = smoothstep(0.7 + uFoamK * 0.1, 0.24, vJ);
  float band = smoothstep(0.42, 0.66, vShore) * (1.0 - smoothstep(0.86, 0.97, vShore));
  float shoreD = band * (0.55 + 0.45 * sin(vShore * 70.0 - uTime * 2.4));
  float rogueD = smoothstep(0.3, 0.95, vRogue);
  float whirlD = 0.0, eye = 0.0;
  if (uWK > 0.0) { vec2 q = vWorld.xz - uWP.xy; float r = length(q) / uWP.z; if (r < 1.9) { float arms = sin(atan(q.y, q.x) * 4.0 - log(r + 0.04) * 13.0 + uTime * 3.4);
    whirlD = pow(max(0.0, arms), 2.0) * smoothstep(1.8, 0.8, r) * smoothstep(0.03, 0.2, r) * uWK * 0.8; eye = exp(-r * r * 2.2) * uWK; } }
  float D = max(max(crestD * 0.9, shoreD * 0.8), max(max(vHull * 0.7, rogueD * 0.95), whirlD));
  float foam = smoothstep(1.0 - D, 1.2 - D, nz) * min(1.0, D * 3.0) + smoothstep(0.9, 0.96, vShore);
  foam = clamp(foam, 0.0, 1.0);
  col = mix(col, uFoamCol * (uAmbient + diff * uSunK * 0.7 + 0.25), foam * 0.92);
  col *= 1.0 - eye * 0.5;
  if (uAur > 0.0) { float b1 = sin(vWorld.x * 0.055 + sin(vWorld.z * 0.03 + uTime * 0.2) * 2.2 + uTime * 0.35), b2 = sin(vWorld.x * 0.02 - vWorld.z * 0.04 + uTime * 0.15);
    float band = pow(max(0.0, b1 * 0.65 + b2 * 0.35), 1.6) * (0.6 + 0.4 * lace); vec3 aCol = mix(vec3(0.1, 1.0, 0.5), vec3(0.55, 0.3, 1.0), smoothstep(-0.4, 0.8, b2));
    col += aCol * uAur * (band * (0.42 + fres * 1.6) + 0.05); }
  if (uLamp.w > 0.0) { float ld = length(vWorld.xz - uLamp.xy), lk = uLamp.w * smoothstep(uLamp.z, 0.0, ld); vec3 Ld = normalize(vec3(uLamp.x, 4.0, uLamp.y) - vWorld); float ls = pow(max(dot(R, Ld), 0.0), 36.0);
    col += uLampCol * lk * (0.22 + 0.5 * foam + ls * 2.2) + uLampCol * pow(max(dot(R, Ld), 0.0), 8.0) * 0.14 * uLamp.w * smoothstep(uLamp.z * 1.6, 0.0, ld); }
  col += vec3(0.75, 0.85, 1.0) * uFlash * (0.4 + fres);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const SKY_VERT = `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `uniform vec3 uSky, uHorizon, uSunDir, uSunCol; uniform float uSunK, uFlash, uMoon; varying vec3 vDir;
void main() { vec3 d = normalize(vDir); float h = clamp(d.y, -0.1, 1.0);
  vec3 c = mix(uHorizon, uSky, pow(max(h, 0.0), 0.55)); float s = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (pow(s, 900.0) * 6.0 * (1.0 - uMoon * 0.4) + pow(s, 12.0) * 0.25) * uSunK;
  c += vec3(0.8, 0.9, 1.0) * uFlash * 0.8; gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// shore map: a Float32Array grid (0 open sea .. 1 land) over the whole world; shared with JS for wave damping
export function createOcean(scene, { size = 420, seg = 170, world = 1000, shore = null, shoreRes = 512 } = {}) {
  const shoreData = shore || new Float32Array(shoreRes * shoreRes);
  const sb = new Uint8Array(shoreRes * shoreRes * 4); for (let i = 0; i < shoreData.length; i++) { const v = Math.round(Math.min(1, shoreData[i]) * 255); sb[i * 4] = v; sb[i * 4 + 1] = v; sb[i * 4 + 2] = v; sb[i * 4 + 3] = 255; }
  const shoreTex = new THREE.DataTexture(sb, shoreRes, shoreRes, THREE.RGBAFormat); shoreTex.magFilter = shoreTex.minFilter = THREE.LinearFilter; shoreTex.needsUpdate = true;
  const C = (h) => new THREE.Color(h);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uAmp: { value: 1 }, uFlash: { value: 0 }, uAmbient: { value: 0.55 }, uSunK: { value: 1 }, uFoamK: { value: 0 },
    uW: { value: WV.map((w) => new THREE.Vector4(w.dx, w.dz, w.k, w.c)) }, uWA: { value: WV.map((w) => new THREE.Vector2(w.A, w.s)) },
    uDeep: { value: C(0x06324f) }, uMid: { value: C(0x1d7f98) }, uShallow: { value: C(0x37c4b4) }, uFoamCol: { value: C(0xf4fbff) },
    uSky: { value: C(0x5aa8e0) }, uHorizon: { value: C(0xcfe6f2) }, uSunDir: { value: new THREE.Vector3(0.4, 0.6, -0.7).normalize() }, uSunCol: { value: C(0xfff1d0) },
    uHA: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uHB: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uHC: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uLamp: { value: new THREE.Vector4(0, 0, 20, 0) }, uLampCol: { value: new THREE.Color(0xffa850) },
    uRA: { value: new THREE.Vector4(0, 0, 1, 0) }, uRB: { value: new THREE.Vector4(0, 10, 60, 0) }, uWP: { value: new THREE.Vector4(0, 0, 30, 0) }, uWK: { value: 0 }, uAur: { value: 0 },
    uShore: { value: null }, uDetail: { value: null }, uWorld: { value: new THREE.Vector3(-world / 2, -world / 2, world) },
  }]);
  uniforms.uShore.value = shoreTex; uniforms.uDetail.value = detailTexture();
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = -1; scene.add(mesh);
  // far water past the moving grid (seen toward the horizon in the low camera): flat, same deep colour, fogged
  const farU = { ...uniforms, uHB: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uRB: { value: new THREE.Vector4(0, 10, 60, 0) } };
  const farMat = new THREE.ShaderMaterial({ uniforms: farU, vertexShader: VERT.replace('uniform float uTime, uAmp;', 'uniform float uTime; const float uAmp = 0.0;'), fragmentShader: FRAG, fog: true });
  const farGeo = new THREE.RingGeometry(size * 0.46, 4000, 48, 2); farGeo.rotateX(-Math.PI / 2); const far = new THREE.Mesh(farGeo, farMat); far.position.y = -0.15; far.frustumCulled = false; far.renderOrder = -2; scene.add(far);
  // sky dome
  const skyU = { uSky: uniforms.uSky, uHorizon: uniforms.uHorizon, uSunDir: uniforms.uSunDir, uSunCol: uniforms.uSunCol, uSunK: uniforms.uSunK, uFlash: uniforms.uFlash, uMoon: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -3; sky.frustumCulled = false; scene.add(sky);

  const step = size / seg; let time = 0;
  const shoreAt = (x, z) => { const u = ((x + world / 2) / world) * shoreRes - 0.5, v = ((z + world / 2) / world) * shoreRes - 0.5; const x0 = Math.floor(u), y0 = Math.floor(v); if (x0 < 0 || y0 < 0 || x0 >= shoreRes - 1 || y0 >= shoreRes - 1) return 0;
    const fx = u - x0, fy = v - y0, i = y0 * shoreRes + x0; return (shoreData[i] * (1 - fx) + shoreData[i + 1] * fx) * (1 - fy) + (shoreData[i + shoreRes] * (1 - fx) + shoreData[i + shoreRes + 1] * fx) * fy; };
  const sech2 = (x) => { const c = Math.cosh(Math.max(-9, Math.min(9, x))); return 1 / (c * c); };
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // surface height under world point (x, z): undo the crests' sideways push first, then sum the waves
  function heightAt(x, z, t = time) {
    const W = whirl; let wd = 1, wr2 = 99; if (W.k > 0) { const rx = (x - W.x) / W.R, rz = (z - W.z) / W.R; wr2 = rx * rx + rz * rz; wd = 1 - 0.75 * W.k * Math.exp(-wr2 * 1.2); }
    const sh = shoreAt(x, z), damp = (1 - 0.8 * ss(0.15, 0.85, sh)) * wd, A0 = uniforms.uAmp.value, amp = A0 * damp, steep = (Math.min(A0, 1.25) / 1.25) * damp;
    let px = x, pz = z;
    for (let it = 0; it < 3; it++) { let dx = 0, dz = 0; for (const w of WV) { const f = w.k * (w.dx * px + w.dz * pz - w.c * t), c = Math.cos(f), qa = (w.s * steep) / (w.k * NW); dx += qa * w.dx * c; dz += qa * w.dz * c; } px = x - dx; pz = z - dz; }
    let y = 0; for (const w of WV) y += w.A * amp * Math.sin(w.k * (w.dx * px + w.dz * pz - w.c * t));
    const R = rogue; if (R.k > 0) { const rx = x - R.x, rz = z - R.z, al = rx * R.dx + rz * R.dz, la = -rx * R.dz + rz * R.dx, lat = Math.exp(-Math.pow(la / R.Lc, 2)) * R.k; y += R.H * (sech2(al / R.w) - 0.35 * sech2((al - 1.9 * R.w) / (1.3 * R.w))) * lat; }
    if (W.k > 0) y -= W.D * W.k * (0.6 * Math.exp(-wr2 * 2.5) + 0.4 * Math.exp(-wr2 * 10));
    return y;
  }
  // rogue wave state: crest centre (x, z), travel direction (dx, dz), height H, width w, crest half-length Lc, strength k (0 = none)
  const rogue = { x: 0, z: 0, dx: 1, dz: 0, H: 0, w: 9, Lc: 70, k: 0 };
  // whirlpool state: eye (x, z), radius R, funnel depth D, strength k (0 = none)
  const whirl = { x: 0, z: 0, R: 30, D: 5, k: 0 };
  // hulls: [{ x, z, yaw, hl, hb, y0, ps, rs, foam }] (up to 6); the sea hugs each hull's waterline
  function setHulls(list) { const A = uniforms.uHA.value, B = uniforms.uHB.value, Cc = uniforms.uHC.value; for (let i = 0; i < 6; i++) { const h = list[i]; if (!h) { B[i].w = 0; continue; } A[i].set(h.x, h.z, Math.sin(h.yaw), Math.cos(h.yaw)); B[i].set(h.hl, h.hb, h.y0, 1); Cc[i].set(h.ps || 0, h.rs || 0, h.foam ?? 0.6, 0); } }
  // pitch / roll for a hull of the given length and beam, heading yaw (radians, 0 = +z)
  function tiltAt(x, z, yaw, len, beam) { const fx = Math.sin(yaw), fz = Math.cos(yaw), h = len * 0.4, b = beam * 0.5;
    const bow = heightAt(x + fx * h, z + fz * h), stern = heightAt(x - fx * h, z - fz * h), port = heightAt(x - fz * b, z + fx * b), star = heightAt(x + fz * b, z - fx * b);
    return { y: (bow + stern + port + star) / 4, pitch: Math.atan2(bow - stern, h * 2), roll: Math.atan2(port - star, b * 2) }; }
  function update(dt, center, camera) { time += dt; uniforms.uTime.value = time; uniforms.uRA.value.set(rogue.x, rogue.z, rogue.dx, rogue.dz); uniforms.uRB.value.set(rogue.H, rogue.w, rogue.Lc, rogue.k); uniforms.uWP.value.set(whirl.x, whirl.z, whirl.R, whirl.D * whirl.k); uniforms.uWK.value = whirl.k; mesh.position.set(Math.round(center.x / step) * step, 0, Math.round(center.z / step) * step); far.position.x = center.x; far.position.z = center.z; if (camera) sky.position.copy(camera.position); }
  function setShore(data) { shoreData.set(data); for (let i = 0; i < data.length; i++) { const v = Math.round(Math.min(1, data[i]) * 255); sb[i * 4] = sb[i * 4 + 1] = sb[i * 4 + 2] = v; } shoreTex.needsUpdate = true; }
  return { mesh, far, sky, uniforms, skyU, heightAt, tiltAt, shoreAt, update, setShore, setHulls, rogue, whirl, get time() { return time; }, set time(v) { time = v; } };
}

// ---------- foam, spray and splashes: one instanced mesh of soft white discs lying on (or flying above) the water ----------
function softDisc(S = 64) { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(0.45, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.25 + Math.random() * 0.3) + ')'; g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 2 + Math.random() * 6, 0, 6.28); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function createFoam(scene, ocean, max = 700, { color = 0xf2faff } = {}) {
  const geo = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1); base.rotateX(-Math.PI / 2); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const off = new Float32Array(max * 4), alpha = new Float32Array(max), aOff = new THREE.InstancedBufferAttribute(off, 4), aA = new THREE.InstancedBufferAttribute(alpha, 1); aOff.setUsage(THREE.DynamicDrawUsage); aA.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aOff', aOff); geo.setAttribute('aA', aA); geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: softDisc() }, uLight: { value: 1 }, uColor: { value: new THREE.Color(color) } }]),
    vertexShader: `attribute vec4 aOff; attribute float aA; varying vec2 vUv; varying float vA;
#include <common>
#include <fog_pars_vertex>
void main() { vUv = uv; vA = aA; vec3 p = position * aOff.w; vec4 mvPosition;
 if (aOff.w < 0.0) { vec4 c = viewMatrix * vec4(aOff.xyz, 1.0); mvPosition = c + vec4(position.x * -aOff.w, -position.z * -aOff.w, 0.0, 0.0); } else { mvPosition = viewMatrix * vec4(p + aOff.xyz, 1.0); }
 gl_Position = projectionMatrix * mvPosition;
 #include <fog_vertex>
}`,
    fragmentShader: `uniform sampler2D map; uniform float uLight; uniform vec3 uColor; varying vec2 vUv; varying float vA;
#include <common>
#include <fog_pars_fragment>
void main() { vec4 t = texture2D(map, vUv); gl_FragColor = vec4(uColor * uLight, t.a * vA);
 #include <fog_fragment>
}` });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);
  const parts = [];
  // kind 'flat' sits on the water and spreads; 'spray' is a billboard flung up that falls back
  function add(x, z, o = {}) { if (parts.length >= max) parts.shift(); parts.push({ x, z, y: o.y || 0, vx: o.vx || 0, vz: o.vz || 0, vy: o.vy || 0, s: o.s || 1, grow: o.grow ?? 0.6, life: o.life || 3, max: o.life || 3, a: o.a ?? 0.8, spray: !!o.spray, g: o.g ?? 14 }); }
  function splash(x, z, power = 1) { for (let i = 0; i < 10 * power; i++) { const a = Math.random() * 6.28, v = (1.5 + Math.random() * 3) * power; add(x, z, { spray: true, y: ocean.heightAt(x, z) + 0.2, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: (4 + Math.random() * 5) * Math.sqrt(power), s: 0.5 + Math.random() * 0.6 * power, life: 0.9 + Math.random() * 0.5, grow: 0.3, a: 0.9 }); }
    for (let i = 0; i < 4 * power; i++) add(x + (Math.random() - 0.5) * power, z + (Math.random() - 0.5) * power, { s: 1.2 * power, grow: 1.4 * power, life: 2.5, a: 0.7 }); }
  function update(dt) { let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } }
    for (const p of parts) { p.x += p.vx * dt; p.z += p.vz * dt; const k = p.life / p.max;
      if (p.spray) { p.vy -= p.g * dt; p.y += p.vy * dt; const sea = ocean.heightAt(p.x, p.z); if (p.y < sea) { p.y = sea; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; } }
      else { p.vx *= 1 - dt * 0.8; p.vz *= 1 - dt * 0.8; p.y = ocean.heightAt(p.x, p.z) + 0.06; }
      p.s += p.grow * dt; off[n * 4] = p.x; off[n * 4 + 1] = p.y; off[n * 4 + 2] = p.z; off[n * 4 + 3] = p.spray ? -p.s : p.s; alpha[n] = p.a * Math.min(1, k * 2.2) * (p.spray ? 1 : Math.min(1, (1 - k) * 6 + 0.3)); n++; }
    geo.instanceCount = n; aOff.needsUpdate = true; aA.needsUpdate = true; }
  function clear() { parts.length = 0; geo.instanceCount = 0; }
  return { add, splash, update, clear, mesh, mat, get count() { return parts.length; } };
}

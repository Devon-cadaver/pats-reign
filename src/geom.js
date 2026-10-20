// Shared building blocks for the detailed models: cached materials and geometries, part()/grp() placement helpers,
// tapered tubes along a curve (ship stems, horns, tails) and a live "spine tube" whose rings are re-laid every frame
// along a moving path (sea serpents, eels, tentacles), so long bodies bend smoothly instead of being stacked blocks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const mats = new Map();
// kind: 'skin' matte, 'flat' faceted, 'metal' shiny, 'glow' unlit, 'wet' glossy creature skin, 'ghost' see-through glow
export const M = (c, kind = 'skin') => { const k = c + ':' + kind; if (!mats.has(k)) mats.set(k,
  kind === 'glow' ? new THREE.MeshBasicMaterial({ color: c })
  : kind === 'ghost' ? new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  : kind === 'metal' ? new THREE.MeshPhongMaterial({ color: c, shininess: 70, specular: 0x666666 })
  : kind === 'wet' ? new THREE.MeshPhongMaterial({ color: c, shininess: 38, specular: 0x3a4a50 })
  : kind === 'fin' ? new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })
  : kind === 'finglow' ? new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false })
  : kind === 'flat' ? new THREE.MeshLambertMaterial({ color: c, flatShading: true })
  : new THREE.MeshLambertMaterial({ color: c })); return mats.get(k); };
export const VC = { lambert: new THREE.MeshLambertMaterial({ vertexColors: true }), wet: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 40, specular: 0x34444a }), flat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), double: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }) };
const geos = new Map(); export const geo = (k, make) => { if (!geos.has(k)) geos.set(k, make()); return geos.get(k); };
export const SPH = () => geo('sph', () => new THREE.SphereGeometry(0.5, 14, 10));
export const SPH_LO = () => geo('sphlo', () => new THREE.SphereGeometry(0.5, 8, 6));
export const HEMI = () => geo('hemi', () => new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2));
export const CAP = () => geo('cap', () => new THREE.CapsuleGeometry(0.5, 1, 3, 10));
export const CON = () => geo('con', () => new THREE.ConeGeometry(0.5, 1, 8));
export const CON4 = () => geo('con4', () => new THREE.ConeGeometry(0.5, 1, 4));
export const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
export const CYL6 = () => geo('cyl6', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6));
export const DISC = () => geo('disc', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 18));
export const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
export const RBX = () => geo('rbx', () => new RoundedBoxGeometry(1, 1, 1, 2, 0.12));
export const TOR = () => geo('tor', () => new THREE.TorusGeometry(0.5, 0.1, 6, 18));
export const HALF = () => geo('half', () => new THREE.CircleGeometry(0.5, 12, 0, Math.PI));
export function part(parent, g, m, sx, sy, sz, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; }
export const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
export function rod(parent, m, a, b, r, g = CYL()) { const d = new THREE.Vector3().subVectors(b, a), len = d.length(); const o = new THREE.Mesh(g, m); o.scale.set(r * 2, len, r * 2); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(o); return o; }
export const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
export const rand = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// frames along a polyline: tangent T, normal N (toward `ref` side), binormal B
function frames(pts, ref, outT, outN, outB) {
  const n = pts.length; const t = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)]; t.subVectors(c, a); if (t.lengthSq() < 1e-10) t.set(0, 0, 1); t.normalize();
    b.crossVectors(t, ref); if (b.lengthSq() < 1e-6) { b.crossVectors(t, Math.abs(t.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)); } b.normalize(); nn.crossVectors(b, t).normalize();
    outT[i].copy(t); outN[i].copy(nn); outB[i].copy(b);
  }
}

// a tube along points with radius r(s) (s = 0..1), optional colour per ring/angle, ends capped. `flat` squashes it across N.
export function taperTube(points, { radial = 10, r = () => 0.2, color = null, ref = UP, flat = 1, wide = 1, cap = true } = {}) {
  const n = points.length, T = points.map(() => new THREE.Vector3()), N = points.map(() => new THREE.Vector3()), B = points.map(() => new THREE.Vector3()); frames(points, ref, T, N, B);
  const pos = [], nor = [], col = [], idx = []; const tc = new THREE.Color(), v = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let i = 0; i < n; i++) { const s = i / (n - 1), rr = r(s);
    for (let j = 0; j <= radial; j++) { const a = (j / radial) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      nv.copy(N[i]).multiplyScalar(ca * flat).addScaledVector(B[i], sa * wide); v.copy(points[i]).addScaledVector(nv, rr); nv.copy(N[i]).multiplyScalar(ca / flat).addScaledVector(B[i], sa / wide).normalize();
      pos.push(v.x, v.y, v.z); nor.push(nv.x, nv.y, nv.z); if (color) { color(s, a, tc); col.push(tc.r, tc.g, tc.b); } } }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  if (cap) for (const [i, sg] of [[0, -1], [n - 1, 1]]) { if (r(i / (n - 1)) < 0.002) continue; const c0 = pos.length / 3; pos.push(points[i].x, points[i].y, points[i].z); nor.push(T[i].x * sg, T[i].y * sg, T[i].z * sg); if (color) { color(i / (n - 1), 0, tc); col.push(tc.r, tc.g, tc.b); }
    for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j; if (sg > 0) idx.push(c0, a, a + 1); else idx.push(c0, a + 1, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
export const curvePts = (ctrl, n = 24) => new THREE.CatmullRomCurve3(ctrl).getPoints(n - 1);

// a living tube: call set(points) every frame with the spine (head first); rings follow with up-facing frames so the
// belly colour stays underneath. Also lays an optional dorsal fin strip along the top.
export class SpineTube {
  constructor(n, { radial = 12, r = () => 0.3, color = null, glow = null, mat = VC.wet, fin = null, finMat = null, flat = 1 } = {}) {
    this.n = n; this.radial = radial; this.r = r; this.flat = flat; this.fin = fin; const vc = n * (radial + 1);
    this.pos = new Float32Array(vc * 3); this.nor = new Float32Array(vc * 3); const col = new Float32Array(vc * 3), idx = [], tc = new THREE.Color();
    for (let i = 0; i < n; i++) for (let j = 0; j <= radial; j++) { const k = (i * (radial + 1) + j) * 3; if (color) { color(i / (n - 1), (j / radial) * Math.PI * 2, tc); col[k] = tc.r; col[k + 1] = tc.g; col[k + 2] = tc.b; } else col[k] = col[k + 1] = col[k + 2] = 1; }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const gl = new Float32Array(vc); if (glow) for (let i = 0; i < n; i++) for (let j = 0; j <= radial; j++) gl[i * (radial + 1) + j] = glow(i / (n - 1), (j / radial) * Math.PI * 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('aGlow', new THREE.BufferAttribute(gl, 1)); this.pa = new THREE.BufferAttribute(this.pos, 3); this.na = new THREE.BufferAttribute(this.nor, 3); this.pa.setUsage(THREE.DynamicDrawUsage); this.na.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('normal', this.na); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false;
    this.T = Array.from({ length: n }, () => new THREE.Vector3()); this.N = Array.from({ length: n }, () => new THREE.Vector3()); this.B = Array.from({ length: n }, () => new THREE.Vector3());
    if (fin) { // fin: a strip of (n) pairs of verts standing up from the spine top; fin(s) = height
      this.fpos = new Float32Array(n * 2 * 3); const fi = [], fc = new Float32Array(n * 2 * 3); for (let i = 0; i < n - 1; i++) { const a = i * 2; fi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const fg = new THREE.BufferGeometry(); this.fa = new THREE.BufferAttribute(this.fpos, 3); this.fa.setUsage(THREE.DynamicDrawUsage); fg.setAttribute('position', this.fa); fg.setIndex(fi); fg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 6).map((_, k) => (k % 3 === 0 ? 1 : 0)), 3));
      this.finMesh = new THREE.Mesh(fg, finMat || new THREE.MeshLambertMaterial({ color: 0xaa3333, side: THREE.DoubleSide })); this.finMesh.frustumCulled = false; void fc; }
  }
  set(points) {
    const { n, radial, T, N, B } = this; frames(points, UP, T, N, B); let k = 0;
    for (let i = 0; i < n; i++) { const s = i / (n - 1), rr = this.r(s), P = points[i];
      for (let j = 0; j <= radial; j++) { const a = (j / radial) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nx = N[i].x * ca * this.flat + B[i].x * sa, ny = N[i].y * ca * this.flat + B[i].y * sa, nz = N[i].z * ca * this.flat + B[i].z * sa;
        this.pos[k] = P.x + nx * rr; this.pos[k + 1] = P.y + ny * rr; this.pos[k + 2] = P.z + nz * rr;
        const mx = N[i].x * ca + B[i].x * sa, my = N[i].y * ca + B[i].y * sa, mz = N[i].z * ca + B[i].z * sa; this.nor[k] = mx; this.nor[k + 1] = my; this.nor[k + 2] = mz; k += 3; } }
    this.pa.needsUpdate = true; this.na.needsUpdate = true;
    if (this.fin) { for (let i = 0; i < n; i++) { const s = i / (n - 1), rr = this.r(s) * this.flat * 0.92, h = this.fin(s), P = points[i], o = i * 6;
        this.fpos[o] = P.x + N[i].x * rr; this.fpos[o + 1] = P.y + N[i].y * rr; this.fpos[o + 2] = P.z + N[i].z * rr;
        this.fpos[o + 3] = P.x + N[i].x * (rr + h) - T[i].x * h * 0.5; this.fpos[o + 4] = P.y + N[i].y * (rr + h) - T[i].y * h * 0.5; this.fpos[o + 5] = P.z + N[i].z * (rr + h) - T[i].z * h * 0.5; }
      this.fa.needsUpdate = true; }
  }
  // world frame at ring i (for attaching spikes, the head, the tail fin)
  frameAt(i) { return { T: this.T[i], N: this.N[i], B: this.B[i] }; }
}

// orient an object so its +z points along T and +y along N
const _m = new THREE.Matrix4(); export function orient(o, T, N) { const B = new THREE.Vector3().crossVectors(N, T); _m.makeBasis(B, N, T); o.quaternion.setFromRotationMatrix(_m); }

// canvas texture helper
export function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } t.anisotropy = 4; return t; }

// vertex-coloured skin that can glow: an aGlow attribute (0..1+) adds the vertex colour as light (runes, stripes, lures)
export function glowVC({ shininess = 36, specular = 0x2c3a42, transparent = false, opacity = 1 } = {}) {
  const m = new THREE.MeshPhongMaterial({ vertexColors: true, shininess, specular, transparent, opacity });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aGlow; varying float vGlow;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vGlow = aGlow;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vGlow;`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vGlow;`); };
  m.customProgramCacheKey = () => 'glowVC'; return m; }
// flat shapes (XY plane): a spiny fan fin, a swept triangle fin, a crescent tail, a bat wing
export const FAN = () => geo('fan', () => { const s = new THREE.Shape(); s.moveTo(0, 0); for (let i = 0; i <= 5; i++) { const a = -0.25 + i * 0.36, r = 1 - Math.abs(i - 2.5) * 0.07; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); if (i < 5) s.lineTo(Math.cos(a + 0.18) * r * 0.72, Math.sin(a + 0.18) * r * 0.72); } s.lineTo(0, 0); return new THREE.ShapeGeometry(s); });
export const FINTRI = () => geo('fintri', () => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.quadraticCurveTo(-0.1, 0.4, 0.35, 1); s.quadraticCurveTo(0.2, 0.45, 0.5, 0); s.lineTo(-0.5, 0); return new THREE.ShapeGeometry(s, 6); });
export const CRESCENT = () => geo('crescent', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(-0.3, 0.6, -0.55, 1.1); s.quadraticCurveTo(-0.1, 0.55, 0.12, 0.05); s.quadraticCurveTo(-0.1, -0.35, -0.4, -0.7); s.quadraticCurveTo(-0.1, -0.2, 0, 0); return new THREE.ShapeGeometry(s, 8); });
export const WING = () => geo('wing', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.15, 0.55); s.lineTo(1, 1); s.quadraticCurveTo(0.95, 0.75, 1.05, 0.55); s.quadraticCurveTo(0.8, 0.45, 0.85, 0.25); s.quadraticCurveTo(0.6, 0.2, 0.62, 0.0); s.quadraticCurveTo(0.4, 0.0, 0.38, -0.2); s.quadraticCurveTo(0.2, -0.05, 0, 0); return new THREE.ShapeGeometry(s, 6); });
export const hash2 = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

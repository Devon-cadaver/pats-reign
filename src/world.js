// Pats Reign: the sea of Pat. A 1200 x 1200 ocean (Megacity in Tornado Alley is about 140 across) split into five
// waters that look nothing alike:
//   Home Waters (centre): green pine islands around Patsholm.
//   Frost Sea (north): towering snow peaks, snow-laden pines, icebergs and drifting ice floes.
//   Storm Sea (east): black volcanic islands with glowing lava and smoking craters, charred trees, basalt columns.
//   Mist Sea (west): low mossy marsh islands, dead trees, standing stones and ruined arches, ghost lights.
//   Warm Sea (south): white beaches, palm trees and coral reefs in turquoise shallows.
// Plus sea stacks in each sea's own stone, six harbours, shipwrecks and three legend lairs. Same seed every game.
import * as THREE from 'three';
import { M, part, grp, rod, V, rand, SPH, SPH_LO, CON, CYL, CYL6, BOX, RBX, TOR, HEMI, canvasTex, glowVC } from './geom.js';
import { mergeParts } from './perf.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const WORLD = 1200, HALF = WORLD / 2, SHORE_RES = 512;
export const REGIONS = { home: { name: 'Home Waters', danger: 0 }, frost: { name: 'Frost Sea', danger: 1 }, storm: { name: 'Storm Sea', danger: 1 }, mist: { name: 'Mist Sea', danger: 1 }, warm: { name: 'Warm Sea', danger: 1 } };
export function regionAt(x, z) { const d = Math.hypot(x, z); if (d < 230) return 'home'; const a = Math.atan2(x, -z); // 0 = north
  if (a > -Math.PI / 4 && a <= Math.PI / 4) return 'frost'; if (a > Math.PI / 4 && a <= (3 * Math.PI) / 4) return 'storm'; if (a < -Math.PI / 4 && a >= (-3 * Math.PI) / 4) return 'mist'; return 'warm'; }
const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// how much each sea is "here" (they blend across the borders and around the Home Waters); sums to 1
const CENTERS = { frost: 0, storm: Math.PI / 2, warm: Math.PI, mist: -Math.PI / 2 };
export function regionWeights(x, z, out = {}) { const d = Math.hypot(x, z), home = 1 - smooth01(190, 320, d), a = Math.atan2(x, -z); let sum = 0;
  for (const k in CENTERS) { const c = CENTERS[k], da = Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))), w = smooth01(Math.PI / 4 + 0.09, Math.PI / 4 - 0.09, da); out[k] = w; sum += w; }
  for (const k in CENTERS) out[k] = (out[k] / (sum || 1)) * (1 - home); out.home = home; return out; }

const BIOME = {
  home: { sand: 0xd8c890, grass: 0x4f8a3a, grass2: 0x3f7230, rock: 0x707068, beach: 1.2 },
  frost: { sand: 0xe4ecf0, grass: 0xf2f6fa, grass2: 0xdfe8ee, rock: 0x56606c, snow: 0xffffff, beach: 0.9 },
  storm: { sand: 0x2a2624, grass: 0x3a3626, grass2: 0x2e2a20, rock: 0x1c1c20, ash: 0x4a4644, lava: 0xff5a14, beach: 1.0 },
  mist: { sand: 0x4e4c40, grass: 0x3c4c36, grass2: 0x2c3a2a, rock: 0x48504a, beach: 0.7 },
  warm: { sand: 0xf8e6b0, grass: 0x46b838, grass2: 0x36a02a, rock: 0xc49a66, beach: 2.4 },
};
// sea stack stone per sea
const STACK_PAL = {
  home: { stone: [0x6e6a62, 0x625e57, 0x77726a, 0x5a5751], top: 0x56763a, wet: 0x2e3430, algae: 0x3a4a34 },
  frost: { stone: [0x5a6470, 0x4e5864, 0x66707c, 0x48525e], top: 0xffffff, wet: 0x26303a, algae: 0x3a4a58 },
  storm: { stone: [0x1e1e22, 0x26262a, 0x18181c, 0x2c2a2a], top: 0x4a4644, wet: 0x101012, algae: 0x2a1a14 },
  mist: { stone: [0x4a524a, 0x3e463e, 0x545c52, 0x384038], top: 0x3c5a34, wet: 0x1e2620, algae: 0x2e4228 },
  warm: { stone: [0xc89a66, 0xb8885a, 0xd8aa74, 0xa87a50], top: 0x4ab83a, wet: 0x6a5038, algae: 0x4a8a5a },
};

export const HARBOR_NAMES = ['Patsholm', 'Ravenfjord', 'Frostvik', 'Thunderhaven', 'Mistmere', 'Sunstrand'];
export const LAIRS = { kraken: { name: "Kraken's Maw", x: 420, z: -400, monster: 'kraken', need: 3, icon: '🦑' }, jorm: { name: "Serpent's Coil", x: -60, z: -520, monster: 'jormungandr', need: 4, icon: '🐍' }, rlyeh: { name: "R'lyeh", x: -440, z: 380, monster: 'elder', need: 4, icon: '👁' } };

// island shape: radius at angle a (with lobes)
function islandShape(r) { const lobes = [1 + ((r() * 3) | 0), 2 + ((r() * 3) | 0), 5 + ((r() * 4) | 0)].map((f) => [f, r() * 6.28, 0.06 + r() * 0.14]); return (a) => 1 + lobes.reduce((s, [f, p, k]) => s + Math.sin(a * f + p) * k, 0) * 0.9; }

export function buildWorld(scene, seed = 20261019) {
  const r = rand(seed), group = new THREE.Group(); scene.add(group);
  const islands = [], harbors = [], wrecks = [], rocks = [], bergs = [], lairs = [], basalt = [], corals = [], stones = [], floes = [], wisps = [], volcanoes = [];
  const clear = (x, z, rad) => { if (Math.hypot(x, z) < 40 + rad) return false; for (const l of Object.values(LAIRS)) if (Math.hypot(x - l.x, z - l.z) < 70 + rad) return false; for (const i of islands) if (Math.hypot(x - i.x, z - i.z) < i.R * 1.25 + rad + 26) return false; return true; };
  // home island just north of the start, then harbour islands in each sea, then the rest
  const place = (x, z, R, H, region, harbor = null) => { const shape = islandShape(r); const isl = { x, z, R, H, region, shape, harbor, rot: r() * 6.28 }; islands.push(isl); return isl; };
  place(0, -70, 34, 13, 'home', 0);
  const hpos = [[300, -360, 'frost', 2], [-30, -300, 'frost', 1], [420, 40, 'storm', 3], [-420, -60, 'mist', 4], [120, 420, 'warm', 5]];
  for (const [x, z, reg, hi] of hpos) place(x, z, 26 + r() * 10, 10 + r() * 6, reg, hi);
  for (let tries = 0; islands.length < 46 && tries < 4000; tries++) { const x = (r() - 0.5) * (WORLD - 90), z = (r() - 0.5) * (WORLD - 90), R = 8 + Math.pow(r(), 2) * 40; if (!clear(x, z, R)) continue; const reg = regionAt(x, z); place(x, z, R, 4 + R * (0.25 + r() * 0.3) + (reg === 'frost' ? 6 : 0), reg); }
  // shore map (0 sea .. 1 land) for the water shader: distance to each coast, soft falloff
  const shore = new Float32Array(SHORE_RES * SHORE_RES), cell = WORLD / SHORE_RES;
  const coastR = (isl, x, z) => { const a = Math.atan2(z - isl.z, x - isl.x) - isl.rot; return isl.R * isl.shape(a); };
  function stamp(cx, cz, radFn, maxR, fall = 16) { const x0 = Math.max(0, Math.floor((cx - maxR - fall + HALF) / cell)), x1 = Math.min(SHORE_RES - 1, Math.ceil((cx + maxR + fall + HALF) / cell)), y0 = Math.max(0, Math.floor((cz - maxR - fall + HALF) / cell)), y1 = Math.min(SHORE_RES - 1, Math.ceil((cz + maxR + fall + HALF) / cell));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const wx = (x + 0.5) * cell - HALF, wz = (y + 0.5) * cell - HALF, d = Math.hypot(wx - cx, wz - cz) - radFn(wx, wz); const v = d <= 0 ? 1 : Math.pow(Math.max(0, 1 - d / fall), 1.6) * 0.9; const i = y * SHORE_RES + x; if (v > shore[i]) shore[i] = v; } }
  for (const isl of islands) stamp(isl.x, isl.z, (x, z) => coastR(isl, x, z), isl.R * 1.4, (isl.region === 'warm' ? 22 : 14) + isl.R * 0.25);

  // ---------- island meshes: each sea shapes and paints its islands its own way ----------
  const islandMat = new THREE.MeshLambertMaterial({ vertexColors: true }), lavaMat = glowVC({ shininess: 6, specular: 0x111111 });
  const treeSpots = { pine: [], snowpine: [], dead: [], charred: [], birch: [], palm: [] };
  const C = new THREE.Color(), C2 = new THREE.Color();
  for (const isl of islands) {
    const reg = isl.region, B = BIOME[reg], rings = 20, segs = 60, pos = [], col = [], glw = [], idx = [], noise = (a, u) => Math.sin(a * 7 + isl.rot * 3) * 0.06 + Math.sin(a * 13 + u * 9) * 0.04 + Math.sin(a * 3 - u * 5 + isl.R) * 0.08;
    const volcano = reg === 'storm' && isl.R > 12 && isl.harbor == null; isl.volcano = volcano;
    let anchor = null; if (isl.harbor != null) { const ha = isl.rot + Math.PI / 2, hc = isl.R * isl.shape(Math.PI / 2) * 0.96; anchor = { x: Math.cos(ha) * hc, z: Math.sin(ha) * hc, dx: Math.cos(ha), dz: Math.sin(ha) }; }
    const village = (x, z) => { if (!anchor) return 0; const vx = x - anchor.x, vz = z - anchor.z, lz = vx * anchor.dx + vz * anchor.dz, lx = -vx * anchor.dz + vz * anchor.dx; return lz > 1 ? 0 : smooth01(15, 11, Math.abs(lx)) * smooth01(-27, -22, lz); };
    const H = isl.H;
    const height = (a, u) => { if (u >= 1) return -(u - 1) * (reg === 'warm' ? 5 : 9) - 0.3; const n = noise(a, u); let h;
      if (reg === 'frost') h = H * 1.7 * Math.pow(1 - Math.pow(u, 1.5), 1.25) * (1 + n * 3.2);
      else if (volcano) { h = H * 1.6 * Math.pow(1 - u, 1.05) * (1 + n * 1.2); if (u < 0.2) h -= ((0.2 - u) / 0.2) * H * 0.6; }
      else if (reg === 'storm') h = H * 1.05 * Math.pow(1 - Math.pow(u, 2.6), 0.55) * (1 + n * 2.6);
      else if (reg === 'mist') h = H * 0.4 * Math.pow(1 - Math.pow(u, 3), 0.9) * (1 + n * 1.8) + 0.3;
      else if (reg === 'warm') h = H * 0.85 * Math.pow(1 - Math.pow(u, 1.6), 1.7) * (1 + n * 1.5);
      else h = H * Math.pow(1 - Math.pow(u, 2.1), 0.85) * (1 + n * 2.2);
      h += 0.6 * (1 - u); if (u > 0.92) h = Math.min(h, 0.5 + (1 - u) * 6); return h; };
    const top = height(0, 0);
    const paint = (h, a, u, j, k) => { const t = h / Math.max(1, H * (reg === 'frost' ? 1.7 : volcano ? 1.6 : 1)), n = noise(a, u); let g = 0;
      if (h < 0.05) C.setHex(B.sand).multiplyScalar(reg === 'warm' ? 0.9 : 0.75);
      else if (h < B.beach) C.setHex(B.sand);
      else if (reg === 'frost') { if ((n > 0.06 && t > 0.2) || (t > 0.45 && Math.sin(a * 9 + u * 14) > 0.6)) C.setHex(B.rock).multiplyScalar(0.85 + n * 2); else C.setHex((j + k) % 4 ? B.snow : B.grass2); }
      else if (reg === 'storm') { if (volcano) { const rill = u < 0.86 && u > 0.18 && Math.sin(a * 5 + isl.rot * 2) > 0.93; if (u < 0.2) { C.setHex(B.lava); g = 1.5; } else if (rill) { C.setHex(B.lava).lerp(C2.setHex(0xffb03a), 0.2); g = 1.1; } else C.setHex(t > 0.5 ? B.ash : B.rock).multiplyScalar(0.9 + n * 2); }
        else C.setHex(t > 0.45 ? B.rock : ((j + k) % 3 ? B.grass : B.grass2)).multiplyScalar(0.9 + n * 2); }
      else if (reg === 'mist') { C.setHex(((j * 3 + k) % 5) < 2 ? B.grass2 : B.grass).lerp(C2.setHex(B.rock), Math.max(0, t - 0.6) * 2); if (Math.sin(a * 11 + u * 7) > 0.85) C.setHex(0x2a3428); }
      else if (reg === 'warm') { if (t > 0.65 + n) C.setHex(B.rock); else C.setHex((j + k) % 3 ? B.grass : B.grass2).lerp(C2.setHex(0x8ad84a), Math.max(0, 0.3 - t)); }
      else { if (t > 0.5 + n * 2) C.setHex(B.rock).multiplyScalar(0.9 + n * 2); else C.setHex((j + k) % 3 ? B.grass : B.grass2).lerp(C2.setHex(B.rock), Math.max(0, t - 0.3)); }
      return g; };
    pos.push(0, top, 0); glw.push(paint(top, 0, 0, 0, 0)); col.push(C.r, C.g, C.b);
    for (let k = 1; k <= rings; k++) { const u = (k / rings) * 1.35; for (let j = 0; j < segs; j++) { const a = (j / segs) * Math.PI * 2, rr = isl.shape(a) * isl.R * u, x = Math.cos(a + isl.rot) * rr, z = Math.sin(a + isl.rot) * rr;
        let h = height(a, u); const vw = village(x, z); if (vw > 0 && u < 1) h = h + (Math.min(h, 1.25) - h) * vw;
        pos.push(x, h, z); glw.push(paint(h, a, u, j, k)); if (vw > 0.3 && h > 0.05) C.setHex(reg === 'frost' ? 0xe8eef2 : reg === 'storm' ? 0x3a3630 : B.grass); col.push(C.r, C.g, C.b);
        const t = h / Math.max(1, H), lava = glw[glw.length - 1] > 0, wx = isl.x + x + (r() - 0.5) * 2, wz = isl.z + z + (r() - 0.5) * 2, sc = 0.7 + r() * 0.8;
        if (vw < 0.05 && !lava && h > B.beach * 0.8 && ((j * 7 + k * 3) % 4 === 0)) {
          if (reg === 'frost' && t < 0.7 && r() < 0.35) treeSpots.snowpine.push([wx, h, wz, sc, reg]);
          else if (reg === 'storm' && !volcano && t < 0.5 && r() < 0.3) treeSpots.charred.push([wx, h, wz, sc, reg]);
          else if (reg === 'storm' && volcano && u > 0.7 && r() < 0.12) treeSpots.charred.push([wx, h, wz, sc, reg]);
          else if (reg === 'mist' && r() < 0.6) treeSpots.dead.push([wx, h, wz, sc, reg]);
          else if (reg === 'warm' && h < 6 && r() < 0.75) treeSpots.palm.push([wx, h, wz, sc, reg]);
          else if (reg === 'warm' && r() < 0.4) treeSpots.birch.push([wx, h, wz, sc * 1.2, reg]);
          else if (reg === 'home' && t < 0.55 && r() < 0.55) treeSpots[r() < 0.8 ? 'pine' : 'birch'].push([wx, h, wz, sc, reg]); } } }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let k = 1; k < rings; k++) for (let j = 0; j < segs; j++) { const a = 1 + (k - 1) * segs + j, b = 1 + (k - 1) * segs + ((j + 1) % segs), c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(glw, 1)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, volcano ? lavaMat : islandMat); m.position.set(isl.x, 0, isl.z); group.add(m); isl.mesh = m;
    if (volcano) volcanoes.push({ x: isl.x, z: isl.z, y: height(0, 0.12) + 1, r: isl.R * 0.18 });
    // sea stacks around bigger islands
    if (isl.R > 18 && reg !== 'storm') for (let k = 0; k < 3; k++) { const a = r() * 6.28, d = isl.R * isl.shape(a - isl.rot) * (1.08 + r() * 0.25); rocks.push({ x: isl.x + Math.cos(a) * d, z: isl.z + Math.sin(a) * d, s: 1.2 + r() * 2.5, h: 3 + r() * 7 }); }
    // per-sea scenery around the island
    if (reg === 'storm') for (let c = 0; c < 2 + ((isl.R / 12) | 0); c++) { const a = r() * 6.28, d = isl.R * isl.shape(a - isl.rot) * (1.04 + r() * 0.14), cx = isl.x + Math.cos(a) * d, cz = isl.z + Math.sin(a) * d; for (let q = 0; q < 5 + ((r() * 5) | 0); q++) { const ca = r() * 6.28, cd = r() * 3; basalt.push({ x: cx + Math.cos(ca) * cd, z: cz + Math.sin(ca) * cd, r: 0.6 + r() * 0.6, h: 1 + r() * 4.5 }); } }
    if (reg === 'warm') for (let c = 0; c < 10 + isl.R * 0.5; c++) { const a = r() * 6.28, d = isl.R * isl.shape(a - isl.rot) * (1.02 + r() * 0.2); corals.push({ x: isl.x + Math.cos(a) * d, z: isl.z + Math.sin(a) * d, s: 0.5 + r() * 1.3, c: [0xff6a8a, 0xff9a3a, 0xb06aff, 0xffd84a, 0x4ae0c8, 0xff4a5a][(r() * 6) | 0], rot: r() * 6.28 }); }
    if (reg === 'mist' && isl.harbor == null) for (let c = 0; c < 2 + ((isl.R / 14) | 0); c++) { const a = r() * 6.28, u = 0.35 + r() * 0.4, rr = isl.shape(a) * isl.R * u; stones.push({ x: isl.x + Math.cos(a + isl.rot) * rr, y: height(a, u) - 0.3, z: isl.z + Math.sin(a + isl.rot) * rr, rot: r() * 6.28, arch: r() < 0.4, s: 0.8 + r() * 0.6 }); }
    if (reg === 'mist') for (let c = 0; c < 4; c++) { const a = r() * 6.28, d = isl.R * (1.2 + r() * 0.8); wisps.push({ x: isl.x + Math.cos(a) * d, z: isl.z + Math.sin(a) * d, y: 1.5 + r() * 3, ph: r() * 6.28 }); }
  }
  // lone sea stacks and icebergs out in open water
  for (let k = 0; k < 70; k++) { const x = (r() - 0.5) * (WORLD - 40), z = (r() - 0.5) * (WORLD - 40); if (!clear(x, z, 4)) continue; const reg = regionAt(x, z); if (reg === 'frost' && r() < 0.7) bergs.push({ x, z, s: 3 + r() * 6, rot: r() * 6.28 }); else rocks.push({ x, z, s: 1 + r() * 2.2, h: 2 + r() * 6 }); }
  // the Frost Sea is full of icebergs and drifting ice
  for (let k = 0, n = 0; k < 600 && n < 34; k++) { const x = (r() - 0.5) * (WORLD - 40), z = -HALF + 20 + r() * (HALF - 120); if (regionAt(x, z) !== 'frost' || !clear(x, z, 6) || bergs.some((b) => Math.hypot(b.x - x, b.z - z) < 22)) continue; bergs.push({ x, z, s: 3 + r() * 7, rot: r() * 6.28 }); n++; }
  for (let k = 0, n = 0; k < 2000 && n < 220; k++) { const x = (r() - 0.5) * (WORLD - 40), z = (r() - 0.5) * (WORLD - 40); if (regionAt(x, z) !== 'frost' || !clear(x, z, 2)) continue; floes.push({ x, z, s: 1.2 + r() * 3.5, rot: r() * 6.28, t: r() * 6 }); n++; }
  for (let k = 0, n = 0; k < 2000 && n < 60; k++) { const x = (r() - 0.5) * (WORLD - 40), z = (r() - 0.5) * (WORLD - 40); if (regionAt(x, z) !== 'mist' || !clear(x, z, 2)) continue; wisps.push({ x, z, y: 1.5 + r() * 3, ph: r() * 6.28 }); n++; }
  for (const rk of rocks) stamp(rk.x, rk.z, () => rk.s, rk.s, 5);
  for (const b of bergs) stamp(b.x, b.z, () => b.s * 0.9, b.s, 6);
  for (const b of basalt) stamp(b.x, b.z, () => b.r, b.r, 3);
  // sea stacks in each sea's own stone (solid, watertight shapes), and icebergs
  const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), tint = new THREE.Color();
  for (const reg of Object.keys(STACK_PAL)) { const list = rocks.filter((rk) => regionAt(rk.x, rk.z) === reg); if (!list.length) continue;
    for (let k = 0; k < 2; k++) { const sub = list.filter((_, i) => i % 2 === k); if (!sub.length) continue; const im = new THREE.InstancedMesh(stackGeo(k + 1 + reg.length, STACK_PAL[reg]), ROCK_MAT, sub.length);
      sub.forEach((rk, i) => { q.setFromAxisAngle(V(0, 1, 0), i * 1.3 + k); mt.compose(V(rk.x, -0.35, rk.z), q, V(rk.s, Math.max(rk.h * 0.75, rk.s * 1.2), rk.s * (0.85 + (i % 4) * 0.08))); im.setMatrixAt(i, mt); im.setColorAt(i, tint.setScalar(0.88 + ((i * 37) % 10) * 0.025)); }); group.add(im); } }
  { const geos = [4, 5].map((sd) => bergGeo(sd)), ims = geos.map((g) => new THREE.InstancedMesh(g, BERG_MAT, Math.max(1, bergs.length))), cnt = [0, 0];
    bergs.forEach((b, i) => { const k = i % 2, im = ims[k]; q.setFromAxisAngle(V(0, 1, 0), b.rot); mt.compose(V(b.x, -0.5, b.z), q, V(b.s, b.s * 0.9, b.s * 0.8)); im.setMatrixAt(cnt[k], mt); cnt[k]++; });
    ims.forEach((im, k) => { im.count = cnt[k]; if (cnt[k]) group.add(im); }); }
  // basalt columns (Storm Sea): clusters of black hexagonal pillars
  if (basalt.length) { const g = new THREE.CylinderGeometry(1, 1, 1, 6); g.translate(0, 0.5, 0); const im = new THREE.InstancedMesh(g, M(0x222226, 'flat'), basalt.length);
    basalt.forEach((b, i) => { q.setFromAxisAngle(V(0, 1, 0), i * 0.7); mt.compose(V(b.x, -1.5, b.z), q, V(b.r, b.h + 1.5, b.r)); im.setMatrixAt(i, mt); im.setColorAt(i, tint.setScalar(0.8 + (i % 5) * 0.08)); }); group.add(im); }
  // coral reefs (Warm Sea): bright rounded heads breaking the surface of the shallows
  if (corals.length) { const g = sphereBase(1); { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), w = 1 + nz3(x * 3, y * 3, z * 3, 7) * 0.35; p.setXYZ(i, x * w, Math.max(-0.3, y) * w * 0.7, z * w); } g.computeVertexNormals(); }
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), corals.length); corals.forEach((c, i) => { q.setFromAxisAngle(V(0, 1, 0), c.rot); mt.compose(V(c.x, -0.25, c.z), q, V(c.s, c.s * 0.8, c.s)); im.setMatrixAt(i, mt); im.setColorAt(i, tint.setHex(c.c)); }); group.add(im); }
  // standing stones and ruined arches (Mist Sea)
  if (stones.length) { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); const list = []; for (const s of stones) { if (s.arch) { const dx = Math.cos(s.rot) * 1.6 * s.s, dz = Math.sin(s.rot) * 1.6 * s.s; list.push([s.x - dx, s.y, s.z - dz, 0.8, 4.2, 0.8, s.rot, 0.04], [s.x + dx, s.y, s.z + dz, 0.8, 4.2, 0.8, s.rot, -0.05], [s.x, s.y + 4.1 * s.s, s.z, 4.3, 0.7, 0.9, s.rot, 0.02]); } else for (let k = 0; k < 4; k++) { const a = s.rot + k * 1.57; list.push([s.x + Math.cos(a) * 2.5, s.y, s.z + Math.sin(a) * 2.5, 0.9, 2.6 + (k % 2), 0.6, a, (k - 1.5) * 0.08]); } }
    const im = new THREE.InstancedMesh(g, M(0x5e665c, 'flat'), list.length), e = new THREE.Euler(); list.forEach(([x, y, z, sx, sy, sz, ry, rz], i) => { q.setFromEuler(e.set(0, ry, rz)); mt.compose(V(x, y, z), q, V(sx, sy, sz)); im.setMatrixAt(i, mt); im.setColorAt(i, tint.setScalar(0.85 + (i % 4) * 0.06)); }); group.add(im); }
  // ice floes (Frost Sea): flat plates of ice that bob on the swell (moved near the ship each frame)
  const floeMesh = (() => { const g = new THREE.CylinderGeometry(1, 1, 0.35, 7); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + Math.sin(a * 3 + 1) * 0.18 + Math.sin(a * 5) * 0.1; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals();
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xeef8ff, emissive: 0x16303c, flatShading: true }), floes.length); floes.forEach((f, i) => { q.setFromAxisAngle(V(0, 1, 0), f.rot); mt.compose(V(f.x, 0.05, f.z), q, V(f.s, 1, f.s * 0.8)); im.setMatrixAt(i, mt); }); im.frustumCulled = false; group.add(im); return im; })();
  // ghost lights (Mist Sea): small green wisps hovering over the marsh water
  const wispMesh = (() => { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9affc0 }), Math.max(1, wisps.length)); im.count = wisps.length; im.frustumCulled = false; group.add(im); return im; })();
  // trees: one instanced mesh per kind
  function paint(g, hex) { const n = g.attributes.position.count, c = new THREE.Color(hex), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.index) { const ng = g.toNonIndexed(); g.copy(ng); } for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k); return g; }
  const treeGeo = {
    pine: () => { const parts = [paint(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6).translate(0, 0.6, 0), 0x5a3a22)]; for (let i = 0; i < 3; i++) parts.push(paint(new THREE.ConeGeometry(1.1 - i * 0.28, 1.5, 7).translate(0, 1.4 + i * 0.75, 0), [0x2a5a2a, 0x2f6a30, 0x3a7a38][i])); return mergeGeometries(parts); },
    snowpine: () => { const parts = [paint(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6).translate(0, 0.6, 0), 0x4a3020)]; for (let i = 0; i < 3; i++) { parts.push(paint(new THREE.ConeGeometry(1.1 - i * 0.28, 1.5, 7).translate(0, 1.4 + i * 0.75, 0), 0x1e4630)); parts.push(paint(new THREE.ConeGeometry(0.8 - i * 0.22, 0.75, 7).translate(0, 1.82 + i * 0.75, 0), 0xf6faff)); } return mergeGeometries(parts); },
    dead: () => { const parts = [paint(new THREE.CylinderGeometry(0.08, 0.2, 3, 5).translate(0, 1.5, 0), 0x4a4440)]; for (let i = 0; i < 4; i++) { const b = new THREE.CylinderGeometry(0.03, 0.07, 1.3, 4); b.rotateZ(0.9); b.rotateY(i * 1.6); b.translate(Math.cos(i * 1.6) * 0.4, 1.8 + i * 0.3, -Math.sin(i * 1.6) * 0.4); parts.push(paint(b, 0x4a4440)); } return mergeGeometries(parts); },
    charred: () => { const parts = [paint(new THREE.CylinderGeometry(0.06, 0.18, 2.4, 5).translate(0, 1.2, 0), 0x151212)]; for (let i = 0; i < 3; i++) { const b = new THREE.CylinderGeometry(0.02, 0.06, 1.0, 4); b.rotateZ(1.0); b.rotateY(i * 2.1); b.translate(Math.cos(i * 2.1) * 0.3, 1.4 + i * 0.35, -Math.sin(i * 2.1) * 0.3); parts.push(paint(b, 0x1a1514)); } return mergeGeometries(parts); },
    birch: () => { const parts = [paint(new THREE.CylinderGeometry(0.1, 0.14, 2.2, 6).translate(0, 1.1, 0), 0xe8e4dc)]; for (let i = 0; i < 3; i++) parts.push(paint(new THREE.IcosahedronGeometry(0.9 - i * 0.12, 0).translate(Math.sin(i * 2.1) * 0.35, 2.3 + i * 0.45, Math.cos(i * 2.1) * 0.35), [0x6aa83a, 0x5a9a2e, 0x7ab84a][i])); return mergeGeometries(parts); },
    palm: () => { const parts = []; let x = 0, y = 0; for (let i = 0; i < 5; i++) { const seg = new THREE.CylinderGeometry(0.11 - i * 0.012, 0.14 - i * 0.012, 0.75, 6); seg.rotateZ(-0.08 - i * 0.07); seg.translate(x + 0.03 + i * 0.03, y + 0.37, 0); parts.push(paint(seg, i % 2 ? 0x8a6a42 : 0x7a5a36)); x += 0.06 + i * 0.06; y += 0.72; }
      for (let i = 0; i < 7; i++) { const leaf = new THREE.ConeGeometry(0.3, 2.4, 4); leaf.scale(1, 1, 0.25); leaf.translate(0, 1.2, 0); leaf.rotateZ(-1.75 - (i % 2) * 0.25); leaf.rotateY((i / 7) * Math.PI * 2); leaf.translate(x, y, 0); parts.push(paint(leaf, i % 2 ? 0x2e9a2a : 0x3ab032)); }
      for (let i = 0; i < 3; i++) parts.push(paint(new THREE.SphereGeometry(0.12, 6, 5).translate(x + Math.cos(i * 2.1) * 0.15, y - 0.15, Math.sin(i * 2.1) * 0.15), 0x5a3a1a)); return mergeGeometries(parts); },
  };
  for (const kind of Object.keys(treeSpots)) { const list = treeSpots[kind]; if (!list.length) continue; const im = new THREE.InstancedMesh(treeGeo[kind](), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), list.length);
    list.forEach(([x, y, z, s, reg], i) => { q.setFromAxisAngle(V(0, 1, 0), i * 2.4); const sc = s * (kind === 'palm' ? 1.9 : reg === 'frost' ? 1.4 : 1.6); mt.compose(V(x, y - 0.1, z), q, V(sc, sc * (0.9 + (i % 5) * 0.08), sc)); im.setMatrixAt(i, mt); }); group.add(im); }

  // ---------- harbours ----------
  for (const isl of islands) { if (isl.harbor == null) continue; const a = isl.rot + Math.PI / 2, coast = isl.R * isl.shape(Math.PI / 2) * 0.96, dx = Math.cos(a), dz = Math.sin(a);
    const h = { name: HARBOR_NAMES[isl.harbor], idx: isl.harbor, isl, x: isl.x + dx * coast, z: isl.z + dz * coast, dir: a }; const dockLen = 14;
    h.dock = { x: h.x + dx * (dockLen + 4), z: h.z + dz * (dockLen + 4) }; h.g = village(h, isl, dockLen, r); group.add(h.g); harbors.push(h); }
  // ---------- shipwrecks ----------
  for (let k = 0, tries = 0; k < 16 && tries < 500; tries++) { const x = (r() - 0.5) * (WORLD - 100), z = (r() - 0.5) * (WORLD - 100); if (!clear(x, z, 10) || Math.hypot(x, z) < 120) continue; const w = { x, z, rot: r() * 6.28, looted: false, g: wreck(r) }; w.g.position.set(x, 0, z); w.g.rotation.y = w.rot; group.add(w.g); wrecks.push(w); k++; }
  // ---------- legend lairs ----------
  for (const [key, L] of Object.entries(LAIRS)) { const g = lair(key, r); g.position.set(L.x, 0, L.z); group.add(g); lairs.push({ key, ...L, g, beaten: false }); for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; stamp(L.x + Math.cos(a) * 46, L.z + Math.sin(a) * 46, () => 3, 3, 4); } }

  // collision: islands, stacks, bergs, basalt as circles (islands use their wobbly coast)
  function blockAt(x, z, pad = 0) { for (const isl of islands) { const dx = x - isl.x, dz = z - isl.z, d = Math.hypot(dx, dz); if (d > isl.R * 1.6 + pad) continue; const cr = coastR(isl, x, z) * 0.97 + pad; if (d < cr) return { x: isl.x, z: isl.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'island', isl }; }
    for (const rk of rocks) { const dx = x - rk.x, dz = z - rk.z, d = Math.hypot(dx, dz), cr = rk.s * 1.05 + pad; if (d < cr) return { x: rk.x, z: rk.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'rock' }; }
    for (const b of bergs) { const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), cr = b.s * 0.9 + pad; if (d < cr) return { x: b.x, z: b.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'berg' }; }
    for (const b of basalt) { const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), cr = b.r + pad; if (d < cr) return { x: b.x, z: b.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'rock' }; }
    for (const L of lairs) { for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28, px = L.x + Math.cos(a) * 46, pz = L.z + Math.sin(a) * 46, dx = x - px, dz = z - pz, d = Math.hypot(dx, dz), cr = 3 + pad; if (d < cr) return { x: px, z: pz, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'rock' }; } }
    return null; }
  // minimap: each sea in its own colour, land in its own colour
  const SEA_RGB = { home: [29, 84, 112], frost: [86, 132, 160], storm: [34, 40, 50], mist: [44, 74, 62], warm: [18, 140, 170] }, LAND_RGB = { home: [196, 178, 120], frost: [236, 242, 246], storm: [70, 58, 52], mist: [92, 108, 82], warm: [240, 220, 150] };
  const MR = SHORE_RES, mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = MR; { const g = mapCanvas.getContext('2d'), w = {};
    const sh = g.createImageData(MR, MR); for (let y = 0; y < MR; y++) for (let x = 0; x < MR; x++) { const v = shore[y * SHORE_RES + x], i = (y * MR + x) * 4, wx = (x + 0.5) * (WORLD / MR) - HALF, wz = (y + 0.5) * (WORLD / MR) - HALF; regionWeights(wx, wz, w);
      let sr = 0, sg = 0, sb = 0, lr = 0, lg = 0, lb = 0; for (const k in SEA_RGB) { sr += SEA_RGB[k][0] * w[k]; sg += SEA_RGB[k][1] * w[k]; sb += SEA_RGB[k][2] * w[k]; lr += LAND_RGB[k][0] * w[k]; lg += LAND_RGB[k][1] * w[k]; lb += LAND_RGB[k][2] * w[k]; }
      if (v >= 0.99) { sh.data[i] = lr; sh.data[i + 1] = lg; sh.data[i + 2] = lb; } else { const s = v * 0.8; sh.data[i] = sr + s * 60; sh.data[i + 1] = sg + s * 90; sh.data[i + 2] = sb + s * 60; } sh.data[i + 3] = 255; } g.putImageData(sh, 0, 0); }
  // per-frame: bob the ice floes near the ship, float the ghost lights
  const e2 = new THREE.Euler();
  function update(dt, time, px, pz, heightAt) {
    let any = false; floes.forEach((f, i) => { if (Math.abs(f.x - px) > 170 || Math.abs(f.z - pz) > 170) return; any = true; f.t += dt; const y = heightAt(f.x, f.z); q.setFromEuler(e2.set(Math.sin(f.t * 0.9) * 0.06, f.rot + f.t * 0.02, Math.cos(f.t * 0.7) * 0.06)); mt.compose(V(f.x, y + 0.06, f.z), q, V(f.s, 1, f.s * 0.8)); floeMesh.setMatrixAt(i, mt); }); if (any) floeMesh.instanceMatrix.needsUpdate = true;
    let anyW = false; wisps.forEach((w, i) => { if (Math.abs(w.x - px) > 160 || Math.abs(w.z - pz) > 160) return; anyW = true; const s = 0.7 + Math.sin(time * 3 + w.ph) * 0.3; mt.compose(V(w.x + Math.sin(time * 0.4 + w.ph) * 2, w.y + Math.sin(time * 1.3 + w.ph) * 0.6, w.z + Math.cos(time * 0.35 + w.ph) * 2), q.identity(), V(s, s, s)); wispMesh.setMatrixAt(i, mt); }); if (anyW) wispMesh.instanceMatrix.needsUpdate = true; }
  return { group, islands, harbors, wrecks, rocks, bergs, lairs, shore, blockAt, mapCanvas, regionAt, regionWeights, volcanoes, update, floes, basalt, corals, stones, wisps };
}

// ---------- a harbour village: dock on posts, longhouse with dragon gables, huts, runestone, fire, moored boat, banners ----------
function village(h, isl, dockLen, r) {
  const g = new THREE.Group(), st = grp(g); g.position.set(h.x, 0, h.z); g.rotation.y = -h.dir + Math.PI / 2; // local +z points out to sea
  const wood = M(0x7a5232), dwood = M(0x4a2e18), roof = M(0x6a4a2a), thatch = M(0x9a7a3a), stone = M(0x8a8a86), red = M(0xb8322a);
  // dock: planks on posts heading out to sea
  part(st, BOX(), wood, 3, 0.3, dockLen + 4, 0, 0.9, dockLen / 2 + 1); for (let i = 0; i <= dockLen / 2; i++) for (const s of [-1, 1]) part(st, CYL6(), dwood, 0.35, 3, 0.35, s * 1.4, -0.4, i * 2 + 0.5);
  for (let i = 0; i < dockLen + 4; i += 1.1) part(st, BOX(), dwood, 3.05, 0.05, 0.08, 0, 1.06, i - 1);
  for (const s of [-1, 1]) part(st, CYL6(), dwood, 0.3, 1.4, 0.3, s * 1.3, 1.4, dockLen + 2.6); // bollards
  // land plateau behind the dock
  const back = -8;
  // longhouse: long hall with bowed roof and crossed dragon gables
  const lh = grp(st, 0, 1.2, back - 6); lh.rotation.y = 0.15; part(lh, BOX(), wood, 6, 2.6, 13, 0, 1.3, 0); for (const s of [-1, 1]) { const rf = part(lh, BOX(), roof, 4.6, 0.35, 14, s * 2.0, 3.6, 0); rf.rotation.z = s * -0.75; }
  for (const zz of [-7, 7]) { for (const s of [-1, 1]) { const gb = rod(lh, dwood, V(0, 4.9, zz), V(s * 1.4, 6.2, zz * 1.04), 0.12); void gb; part(lh, SPH_LO(), dwood, 0.4, 0.3, 0.5, s * 1.5, 6.3, zz * 1.05); } part(lh, BOX(), dwood, 1.4, 2, 0.2, 0, 1, zz * 1.0); }
  for (let i = -5; i <= 5; i += 2.5) for (const s of [-1, 1]) part(lh, BOX(), dwood, 0.2, 2.6, 0.3, s * 3.05, 1.3, i);
  part(lh, CYL(), stone, 0.6, 1.2, 0.6, 1.6, 5, -3); // smoke hole chimney
  // huts with thatch
  for (let i = 0; i < 4; i++) { const hx = (i % 2 ? 1 : -1) * (7 + r() * 4), hz = back - 2 - i * 4.5 + r() * 2; const hu = grp(st, hx, 1.2, hz); hu.rotation.y = r() * 6.28; part(hu, CYL(), wood, 3.2, 1.8, 3.2, 0, 0.9, 0); part(hu, CON(), thatch, 4.2, 2.4, 4.2, 0, 3, 0); part(hu, BOX(), dwood, 0.8, 1.3, 0.2, 0, 0.65, 1.6); }
  // runestone, fire pit, banner, barrels
  part(st, RBX(), stone, 1.2, 3, 0.5, -4, 2.6, back + 3); part(st, BOX(), M(0xb8322a), 0.9, 0.1, 0.52, -4, 3.2, back + 3); part(st, BOX(), M(0xb8322a), 0.1, 1.6, 0.52, -4, 2.6, back + 3);
  part(st, CYL(), stone, 1.6, 0.4, 1.6, 4, 1.4, back + 4); const fire = part(g, CON(), M(0xff8a2a, 'glow'), 0.9, 1.4, 0.9, 4, 2.2, back + 4); g.userData.fire = fire;
  rod(st, dwood, V(1.6, 1, dockLen + 2), V(1.6, 8, dockLen + 2), 0.1); const ban = part(g, BOX(), red, 0.05, 1.6, 1.2, 1.6, 7, dockLen + 1.3); g.userData.banner = ban;
  for (let i = 0; i < 4; i++) { part(st, CYL(), M(0x7a5232), 0.7, 0.9, 0.7, -1 + (i % 2) * 0.8, 1.5, dockLen * 0.3 + i * 0.6); }
  // a small moored boat
  const bt = grp(st, -3.4, 0.1, dockLen * 0.6); part(bt, SPH(), M(0x6a4426), 1.6, 0.9, 5.5, 0, 0, 0); part(bt, SPH(), M(0x3a2414), 1.4, 0.7, 5.2, 0, 0.12, 0); part(bt, CYL(), dwood, 0.12, 3, 0.12, 0, 1.5, 0.4);
  // lantern posts along the dock
  for (let i = 0; i < 3; i++) { rod(st, dwood, V(-1.5, 1, i * 6 + 2), V(-1.5, 3.2, i * 6 + 2), 0.08); part(g, SPH_LO(), M(0xffc86a, 'glow'), 0.3, 0.35, 0.3, -1.5, 3.4, i * 6 + 2); }
  flattenInto(st); mergeParts(st); return g;
}
function flattenInto(st) { st.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(st.matrixWorld).invert(), list = []; st.traverse((o) => { if (o.isMesh && o.parent !== st) list.push(o); }); for (const m of list) { const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); m.parent.remove(m); mw.decompose(m.position, m.quaternion, m.scale); st.add(m); } for (const c of [...st.children]) if (!c.isMesh && !c.children.length) st.remove(c); }

// ---------- a wreck: a broken hull listing in the water, ribs, a snapped mast with a torn sail, floating crates ----------
function wreck(r) { const g = new THREE.Group(), st = grp(g), wood = M(0x5a3a22), dwood = M(0x3a2414), sail = M(0xd8ccb0, 'fin');
  const hull = grp(st, 0, -0.6, 0); hull.rotation.set(0.15, 0, 0.5); part(hull, SPH(), wood, 3.6, 2.2, 12, 0, 0, 0); part(hull, SPH(), dwood, 3.2, 1.9, 11.4, 0, 0.3, 0);
  for (let i = -4; i <= 4; i += 1.6) { const rb = grp(st, 0, 0.2, i); rb.rotation.z = 0.5; for (const s of [-1, 1]) rod(rb, dwood, V(s * 1.4, -0.5, 0), V(s * 1.6, 1.6, 0), 0.08); }
  const mast = grp(st, 0.6, 0, 1); mast.rotation.set(0.3, 0, 0.9); part(mast, CYL(), wood, 0.25, 7, 0.25, 0, 3.5, 0); const s2 = part(mast, BOX(), sail, 2.6, 2.2, 0.02, 0.4, 5.3, 0.2); s2.rotation.z = 0.25;
  for (let i = 0; i < 4; i++) part(st, BOX(), M(0x8a5a32), 0.8, 0.6, 0.8, (r() - 0.5) * 8, 0, (r() - 0.5) * 10);
  for (let i = 0; i < 3; i++) part(st, CYL(), M(0x7a5232), 0.7, 0.9, 0.7, (r() - 0.5) * 9, 0, (r() - 0.5) * 9, Math.PI / 2, r() * 3, 0);
  flattenInto(st); mergeParts(st); return g; }

// ---------- lairs ----------
function lair(key, r) { const g = new THREE.Group(), st = grp(g);
  if (key === 'rlyeh') { const st1 = M(0x24302a, 'flat'), glow = M(0x6aff9a, 'glow');
    for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28, x = Math.cos(a) * 46, z = Math.sin(a) * 46; const p = grp(st, x, -2, z); p.rotation.set((r() - 0.5) * 0.5, a, (r() - 0.5) * 0.6); part(p, BOX(), st1, 4, 18 + r() * 12, 4, 0, 8, 0); part(p, BOX(), glow, 0.3, 6, 4.1, 2.05, 9, 0); part(p, BOX(), glow, 4.1, 0.3, 0.3, 0, 13, 2.05); }
    for (let k = 0; k < 4; k++) { const a = r() * 6.28; const p = grp(st, Math.cos(a) * 22, -3, Math.sin(a) * 22); p.rotation.set(0.6, a, 0.3); part(p, BOX(), st1, 9, 14, 3, 0, 5, 0); } }
  else if (key === 'kraken') { const bone = M(0xe0d8c4); for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; const p = grp(st, Math.cos(a) * 46, -1, Math.sin(a) * 46); p.rotation.set(0, -a, 0.35); part(p, CON(), bone, 3, 22 + r() * 8, 3, 0, 10, 0, 0, 0, 0.25); } for (let k = 0; k < 5; k++) { const p = grp(st, (r() - 0.5) * 40, -1, (r() - 0.5) * 40); p.rotation.set(0.8, r() * 6, 0.6); part(p, CYL(), M(0x3a2414), 1, 12, 1, 0, 3, 0); } }
  else { const stone = M(0x4a5a52, 'flat'), rune = M(0x7affc8, 'glow'); for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28, x = Math.cos(a) * 46, z = Math.sin(a) * 46; const p = grp(st, x, -1, z); p.rotation.y = -a; part(p, RBX(), stone, 3.5, 16, 3.5, 0, 7, 0); part(p, BOX(), rune, 0.2, 9, 1.4, 1.8, 8, 0); } }
  flattenInto(st); mergeParts(st); return g; }

// ---------- rock and ice shapes ----------
const ROCK_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const BERG_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x0e2a36 });
const nz3 = (x, y, z, s) => Math.sin(x * 1.7 + s) * Math.cos(z * 1.3 - s * 0.7) * 0.5 + Math.sin(y * 2.3 + x * 0.9 + s * 1.3) * 0.3 + Math.sin((x + z) * 3.1 + y * 1.1 + s * 2.1) * 0.2;
function sphereBase(detail) { let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4); return g; }
// a sea stack: a tapering pillar of layered stone with ledges, dark wet rock at the waterline, moss and bird-white on top
function stackGeo(seed, pal) { const g = sphereBase(3), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), C = new THREE.Color();
  const stone = pal.stone, wet = new THREE.Color(pal.wet), algae = new THREE.Color(pal.algae), moss = new THREE.Color(pal.top), guano = new THREE.Color(0xe8e4da);
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z) || 1e-6;
    let t = Math.sign(y) * Math.pow(Math.abs(y), 0.5); const band = Math.round(t * 5); t += (band / 5 - t) * 0.55; // ledges
    const h = (t + 1) / 2, w = nz3(x * 2.2, y * 2.2, z * 2.2, seed), taper = 1 - h * 0.42;
    const rad = (rr < 1e-5 ? 0 : 1) * Math.pow(rr, 0.55) * taper * (1 + w * 0.22) * (1 + Math.sin(band * 2.7 + seed) * 0.06);
    const ny = -0.35 + h * 1.35 + (h > 0.92 ? w * 0.06 : 0);
    p.setXYZ(i, (x / rr) * rad, ny, (z / rr) * rad);
    C.setHex(stone[(band + 9 + seed) % 4]).multiplyScalar(0.9 + w * 0.15);
    if (ny < 0.16) C.lerp(ny < 0.02 ? wet : algae, ny < 0.02 ? 0.85 : 0.55);
    if (h > 0.9 && w > -0.25) C.lerp(moss, 0.7); else if (Math.abs(t - band / 5) < 0.02 && w > 0.3 && h > 0.3) C.lerp(guano, 0.8);
    col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }
// an iceberg: a flattened block below the water, jagged peaks above, white snow over glassy blue ice
function bergGeo(seed) { const g = sphereBase(3), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), C = new THREE.Color();
  const snow = new THREE.Color(0xf6fbff), ice = new THREE.Color(0xa8dcef), deep = new THREE.Color(0x3a8ab8);
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), w = nz3(x * 2.6, y * 2.6, z * 2.6, seed), w2 = nz3(x * 6, y * 6, z * 6, seed + 3);
    const r = 1 + w * 0.28 + w2 * 0.06, ny = y > 0 ? y * (0.9 + Math.max(0, w) * 1.4 + w2 * 0.15) : y * 0.55;
    p.setXYZ(i, x * r, ny, z * r); const up = y > 0.35 + w2 * 0.2;
    C.copy(up ? snow : ice).lerp(deep, ny < 0.15 ? 0.6 : 0).multiplyScalar(0.94 + w2 * 0.12); col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }

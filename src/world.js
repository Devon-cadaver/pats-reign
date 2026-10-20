// Pats Reign: the sea of Pat. A 1200 x 1200 ocean (Megacity in Tornado Alley is about 140 across) with five waters:
// the Home Waters around Patsholm, the Frost Sea to the north (icebergs, snowy peaks), the Storm Sea east, the Mist Sea
// west (dead trees, ghost ships) and the Warm Sea south. Islands are heightfields with beaches, grass, rock and snow,
// pine forests, sea stacks; six harbours have docks, longhouses, huts, runestones and moored boats; shipwrecks to
// salvage; and three legend lairs: the Kraken's Maw, the Serpent's Coil and sunken R'lyeh. Same seed every game.
import * as THREE from 'three';
import { M, part, grp, rod, V, rand, SPH, SPH_LO, CON, CYL, CYL6, BOX, RBX, TOR, HEMI, canvasTex } from './geom.js';
import { mergeParts } from './perf.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const WORLD = 1200, HALF = WORLD / 2, SHORE_RES = 512;
export const REGIONS = { home: { name: 'Home Waters', danger: 0 }, frost: { name: 'Frost Sea', danger: 1 }, storm: { name: 'Storm Sea', danger: 1 }, mist: { name: 'Mist Sea', danger: 1 }, warm: { name: 'Warm Sea', danger: 1 } };
export function regionAt(x, z) { const d = Math.hypot(x, z); if (d < 230) return 'home'; const a = Math.atan2(x, -z); // 0 = north
  if (a > -Math.PI / 4 && a <= Math.PI / 4) return 'frost'; if (a > Math.PI / 4 && a <= (3 * Math.PI) / 4) return 'storm'; if (a < -Math.PI / 4 && a >= (-3 * Math.PI) / 4) return 'mist'; return 'warm'; }
const BIOME = { home: { sand: 0xd8c890, grass: 0x4f8a3a, grass2: 0x3f7230, rock: 0x707068, snow: null, tree: 'pine' }, frost: { sand: 0xbab4a4, grass: 0x8a9a80, grass2: 0x6a7a66, rock: 0x6a6e74, snow: 0xf4f8fc, tree: 'pine' },
  storm: { sand: 0x9a9488, grass: 0x4a6a44, grass2: 0x3a5a3a, rock: 0x4c4e54, snow: null, tree: 'pine' }, mist: { sand: 0x8a8678, grass: 0x4a5a46, grass2: 0x3a4838, rock: 0x585a58, snow: null, tree: 'dead' }, warm: { sand: 0xf0dca0, grass: 0x5a9a3a, grass2: 0x4a8a2a, rock: 0x8a7a64, snow: null, tree: 'birch' } };

export const HARBOR_NAMES = ['Patsholm', 'Ravenfjord', 'Frostvik', 'Thunderhaven', 'Mistmere', 'Sunstrand'];
export const LAIRS = { kraken: { name: "Kraken's Maw", x: 420, z: -400, monster: 'kraken', need: 3, icon: '🦑' }, jorm: { name: "Serpent's Coil", x: -60, z: -520, monster: 'jormungandr', need: 4, icon: '🐍' }, rlyeh: { name: "R'lyeh", x: -440, z: 380, monster: 'elder', need: 4, icon: '👁' } };

// island shape: radius at angle a (with lobes), height profile
const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function islandShape(r) { const lobes = [1 + ((r() * 3) | 0), 2 + ((r() * 3) | 0), 5 + ((r() * 4) | 0)].map((f) => [f, r() * 6.28, 0.06 + r() * 0.14]); return (a) => 1 + lobes.reduce((s, [f, p, k]) => s + Math.sin(a * f + p) * k, 0) * 0.9; }

export function buildWorld(scene, seed = 20261019) {
  const r = rand(seed), group = new THREE.Group(); scene.add(group);
  const islands = [], harbors = [], wrecks = [], rocks = [], bergs = [], lairs = [];
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
  for (const isl of islands) stamp(isl.x, isl.z, (x, z) => coastR(isl, x, z), isl.R * 1.4, 14 + isl.R * 0.25);

  // ---------- island meshes ----------
  const islandMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: false });
  const treeSpots = { pine: [], dead: [], birch: [] };
  const C = new THREE.Color(), C2 = new THREE.Color();
  for (const isl of islands) {
    const B = BIOME[isl.region], rings = 18, segs = 56, pos = [], col = [], idx = [], noise = (a, u) => Math.sin(a * 7 + isl.rot * 3) * 0.06 + Math.sin(a * 13 + u * 9) * 0.04 + Math.sin(a * 3 - u * 5 + isl.R) * 0.08;
    let anchor = null; if (isl.harbor != null) { const ha = isl.rot + Math.PI / 2, hc = isl.R * isl.shape(Math.PI / 2) * 0.96; anchor = { x: Math.cos(ha) * hc, z: Math.sin(ha) * hc, dx: Math.cos(ha), dz: Math.sin(ha) }; }
    const village = (x, z) => { if (!anchor) return 0; const vx = x - anchor.x, vz = z - anchor.z, lz = vx * anchor.dx + vz * anchor.dz, lx = -vx * anchor.dz + vz * anchor.dx; return lz > 1 ? 0 : smooth01(15, 11, Math.abs(lx)) * smooth01(-27, -22, lz); };
    pos.push(0, isl.H * (1 + noise(0, 0)), 0); C.setHex(B.snow && isl.H > 12 ? B.snow : B.rock); col.push(C.r, C.g, C.b);
    for (let k = 1; k <= rings; k++) { const u = (k / rings) * 1.35; for (let j = 0; j < segs; j++) { const a = (j / segs) * Math.PI * 2, rr = isl.shape(a) * isl.R * u, x = Math.cos(a + isl.rot) * rr, z = Math.sin(a + isl.rot) * rr;
        let h = u < 1 ? isl.H * Math.pow(1 - Math.pow(u, 2.1), 0.85) * (1 + noise(a, u) * 2.2) + 0.6 * (1 - u) : -(u - 1) * 9 - 0.3; if (u > 0.92 && u < 1) h = Math.min(h, 0.5 + (1 - u) * 6);
        const vw = village(x, z); if (vw > 0 && u < 1) h = h + (Math.min(h, 1.25) - h) * vw;
        pos.push(x, h, z); const t = h / isl.H; if (h < 0.05) C.setHex(B.sand).multiplyScalar(0.75); else if (h < 1.2) C.setHex(B.sand); else if (B.snow && t > 0.62) C.setHex(B.snow); else if (t > 0.5 + noise(a, u) * 2 || (isl.region === 'frost' && t > 0.35)) C.setHex(B.rock).multiplyScalar(0.9 + noise(a * 2, u) * 2); else C.setHex(((j + k) % 3) ? B.grass : B.grass2).lerp(C2.setHex(B.rock), Math.max(0, t - 0.3));
        col.push(C.r, C.g, C.b);
        if (h > 1.6 && t < 0.55 && ((j * 7 + k * 3) % 4 === 0) && r() < 0.55 && vw < 0.05) treeSpots[B.tree].push([isl.x + x + (r() - 0.5) * 2, h, isl.z + z + (r() - 0.5) * 2, 0.7 + r() * 0.8, isl.region]); } }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let k = 1; k < rings; k++) for (let j = 0; j < segs; j++) { const a = 1 + (k - 1) * segs + j, b = 1 + (k - 1) * segs + ((j + 1) % segs), c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, islandMat); m.position.set(isl.x, 0, isl.z); group.add(m); isl.mesh = m;
    // sea stacks around bigger islands
    if (isl.R > 18) for (let k = 0; k < 3; k++) { const a = r() * 6.28, d = isl.R * isl.shape(a - isl.rot) * (1.08 + r() * 0.25); rocks.push({ x: isl.x + Math.cos(a) * d, z: isl.z + Math.sin(a) * d, s: 1.2 + r() * 2.5, h: 3 + r() * 7 }); }
  }
  // lone sea stacks and icebergs out in open water
  for (let k = 0; k < 70; k++) { const x = (r() - 0.5) * (WORLD - 40), z = (r() - 0.5) * (WORLD - 40); if (!clear(x, z, 4)) continue; const reg = regionAt(x, z); if (reg === 'frost' && r() < 0.7) bergs.push({ x, z, s: 3 + r() * 6, rot: r() * 6.28 }); else rocks.push({ x, z, s: 1 + r() * 2.2, h: 2 + r() * 6 }); }
  for (const rk of rocks) stamp(rk.x, rk.z, () => rk.s, rk.s, 5);
  for (const b of bergs) stamp(b.x, b.z, () => b.s * 0.9, b.s, 6);
  // instanced sea stacks
  { const g = new THREE.DodecahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 + Math.sin(i * 1.7) * 0.15) * (1 - Math.max(0, y) * 0.35), y, p.getZ(i) * (1 + Math.cos(i * 2.3) * 0.15) * (1 - Math.max(0, y) * 0.35)); } g.translate(0, 0.3, 0); g.computeVertexNormals();
    const im = new THREE.InstancedMesh(g, M(0x5e5c58, 'flat'), rocks.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(); rocks.forEach((rk, i) => { q.setFromAxisAngle(V(0, 1, 0), i * 1.3); mt.compose(V(rk.x, -0.8, rk.z), q, V(rk.s, rk.h * 0.6, rk.s)); im.setMatrixAt(i, mt); }); group.add(im); }
  { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + Math.sin(i * 3.1) * 0.25; p.setXYZ(i, p.getX(i) * k, y > 0 ? y * (1.2 + Math.cos(i * 1.9) * 0.6) : y * 0.6, p.getZ(i) * k); } g.computeVertexNormals();
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xe8f4fc, flatShading: true, emissive: 0x16303c }), Math.max(1, bergs.length)), mt = new THREE.Matrix4(), q = new THREE.Quaternion(); bergs.forEach((b, i) => { q.setFromAxisAngle(V(0, 1, 0), b.rot); mt.compose(V(b.x, -0.6, b.z), q, V(b.s, b.s * 0.9, b.s * 0.8)); im.setMatrixAt(i, mt); }); im.count = bergs.length; group.add(im); }
  // trees: one instanced mesh per kind
  const treeGeo = { pine: () => { const parts = []; const tr = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6); tr.translate(0, 0.6, 0); paint(tr, 0x5a3a22); parts.push(tr); for (let i = 0; i < 3; i++) { const c = new THREE.ConeGeometry(1.1 - i * 0.28, 1.5, 7); c.translate(0, 1.4 + i * 0.75, 0); paint(c, [0x2a5a2a, 0x2f6a30, 0x3a7a38][i]); parts.push(c); } return mergeGeometries(parts); },
    dead: () => { const parts = []; const tr = new THREE.CylinderGeometry(0.08, 0.2, 3, 5); tr.translate(0, 1.5, 0); paint(tr, 0x3a3430); parts.push(tr); for (let i = 0; i < 4; i++) { const b = new THREE.CylinderGeometry(0.03, 0.07, 1.3, 4); b.rotateZ(0.9); b.rotateY(i * 1.6); b.translate(Math.cos(i * 1.6) * 0.4, 1.8 + i * 0.3, -Math.sin(i * 1.6) * 0.4); paint(b, 0x3a3430); parts.push(b); } return mergeGeometries(parts); },
    birch: () => { const parts = []; const tr = new THREE.CylinderGeometry(0.1, 0.14, 2.2, 6); tr.translate(0, 1.1, 0); paint(tr, 0xe8e4dc); parts.push(tr); for (let i = 0; i < 3; i++) { const s = new THREE.IcosahedronGeometry(0.9 - i * 0.12, 0); s.translate(Math.sin(i * 2.1) * 0.35, 2.3 + i * 0.45, Math.cos(i * 2.1) * 0.35); paint(s, [0x6aa83a, 0x5a9a2e, 0x7ab84a][i]); parts.push(s); } return mergeGeometries(parts); } };
  function paint(g, hex) { const n = g.attributes.position.count, c = new THREE.Color(hex), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.index) { const ng = g.toNonIndexed(); g.copy(ng); } for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k); }
  for (const kind of Object.keys(treeSpots)) { const list = treeSpots[kind]; if (!list.length) continue; const im = new THREE.InstancedMesh(treeGeo[kind](), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), list.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion();
    list.forEach(([x, y, z, s, reg], i) => { q.setFromAxisAngle(V(0, 1, 0), i * 2.4); const sc = s * (reg === 'frost' ? 1.3 : 1.6); mt.compose(V(x, y - 0.1, z), q, V(sc, sc * (0.9 + (i % 5) * 0.08), sc)); im.setMatrixAt(i, mt); });
    if (kind === 'pine') { const snowy = new THREE.Color(0xe6eef2); list.forEach(([, , , , reg], i) => im.setColorAt(i, reg === 'frost' ? snowy : new THREE.Color(1, 1, 1))); }
    group.add(im); }

  // ---------- harbours ----------
  for (const isl of islands) { if (isl.harbor == null) continue; const a = isl.rot + Math.PI / 2, coast = isl.R * isl.shape(Math.PI / 2) * 0.96, dx = Math.cos(a), dz = Math.sin(a);
    const h = { name: HARBOR_NAMES[isl.harbor], idx: isl.harbor, isl, x: isl.x + dx * coast, z: isl.z + dz * coast, dir: a }; const dockLen = 14;
    h.dock = { x: h.x + dx * (dockLen + 4), z: h.z + dz * (dockLen + 4) }; h.g = village(h, isl, dockLen, r); group.add(h.g); harbors.push(h); }
  // ---------- shipwrecks ----------
  for (let k = 0, tries = 0; k < 16 && tries < 500; tries++) { const x = (r() - 0.5) * (WORLD - 100), z = (r() - 0.5) * (WORLD - 100); if (!clear(x, z, 10) || Math.hypot(x, z) < 120) continue; const w = { x, z, rot: r() * 6.28, looted: false, g: wreck(r) }; w.g.position.set(x, 0, z); w.g.rotation.y = w.rot; group.add(w.g); wrecks.push(w); k++; }
  // ---------- legend lairs ----------
  for (const [key, L] of Object.entries(LAIRS)) { const g = lair(key, r); g.position.set(L.x, 0, L.z); group.add(g); lairs.push({ key, ...L, g, beaten: false }); for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; stamp(L.x + Math.cos(a) * 46, L.z + Math.sin(a) * 46, () => 3, 3, 4); } }

  // collision: islands, stacks, bergs as circles (islands use their wobbly coast)
  function blockAt(x, z, pad = 0) { for (const isl of islands) { const dx = x - isl.x, dz = z - isl.z, d = Math.hypot(dx, dz); if (d > isl.R * 1.6 + pad) continue; const cr = coastR(isl, x, z) * 0.97 + pad; if (d < cr) return { x: isl.x, z: isl.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'island', isl }; }
    for (const rk of rocks) { const dx = x - rk.x, dz = z - rk.z, d = Math.hypot(dx, dz), cr = rk.s * 1.05 + pad; if (d < cr) return { x: rk.x, z: rk.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'rock' }; }
    for (const b of bergs) { const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), cr = b.s * 0.9 + pad; if (d < cr) return { x: b.x, z: b.z, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'berg' }; }
    for (const L of lairs) { for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28, px = L.x + Math.cos(a) * 46, pz = L.z + Math.sin(a) * 46, dx = x - px, dz = z - pz, d = Math.hypot(dx, dz), cr = 3 + pad; if (d < cr) return { x: px, z: pz, r: cr, d, nx: dx / (d || 1), nz: dz / (d || 1), kind: 'rock' }; } }
    return null; }
  // minimap base: islands, stacks and bergs on a sea-blue disc of the whole world
  const mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = 256; { const g = mapCanvas.getContext('2d'), k = 256 / WORLD; g.fillStyle = '#1d5470'; g.fillRect(0, 0, 256, 256);
    const sh = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const v = shore[(y * 2) * SHORE_RES + x * 2], i = (y * 256 + x) * 4; if (v >= 0.99) { sh.data[i] = 196; sh.data[i + 1] = 178; sh.data[i + 2] = 120; } else { const s = v * 0.8; sh.data[i] = 29 + s * 60; sh.data[i + 1] = 84 + s * 90; sh.data[i + 2] = 112 + s * 60; } sh.data[i + 3] = 255; } g.putImageData(sh, 0, 0); void k; }
  return { group, islands, harbors, wrecks, rocks, bergs, lairs, shore, blockAt, mapCanvas, regionAt };
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

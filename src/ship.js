// Pats Reign: Viking ships. Five sizes from a little faering to Pat's great drakkar. The hull is lofted from cross-sections
// and built clinker-style (each plank overlaps the one below, tarred below the waterline, a painted top strake), with
// curved stem and stern posts, a deck of planks, rowing benches and oars that row, a striped woollen sail that fills,
// rigging, a crew of horned Vikings, a steering oar, and the upgrades you buy shown on the ship: shield rows, iron plates,
// a bow ballista, fire pots, an iron ram. Raiders and the ghost ship use the same builder with their own colours.
import * as THREE from 'three';
import { M, part, grp, rod, taperTube, curvePts, canvasTex, VC, SPH, SPH_LO, HEMI, CAP, CON, CYL, CYL6, DISC, BOX, RBX, TOR, HALF, V, rand } from './geom.js';
import { mergeParts } from './perf.js';

export const SHIP_TIERS = [
  { name: 'Faering', L: 6.5, B: 1.9, D: 0.95, fb: 0.45, rise: 0.75, strakes: 5, oars: 2, crew: 3, mast: 4.2, sail: [2.9, 2.3], hp: 100, speed: 9, turn: 1.6, head: 'plain' },
  { name: 'Karvi', L: 10, B: 2.6, D: 1.2, fb: 0.6, rise: 1.15, strakes: 6, oars: 5, crew: 8, mast: 6, sail: [4.5, 3.4], hp: 190, speed: 10, turn: 1.35, head: 'spiral' },
  { name: 'Snekkja', L: 14, B: 3, D: 1.4, fb: 0.68, rise: 1.6, strakes: 7, oars: 9, crew: 13, mast: 7.8, sail: [6.1, 4.5], hp: 340, speed: 11, turn: 1.15, head: 'serpent' },
  { name: 'Skeid', L: 18, B: 3.6, D: 1.6, fb: 0.78, rise: 2, strakes: 8, oars: 13, crew: 19, mast: 9.6, sail: [7.6, 5.5], hp: 600, speed: 12, turn: 1.0, head: 'dragon' },
  { name: 'Drakkar', L: 23, B: 4.4, D: 1.9, fb: 0.88, rise: 2.5, strakes: 8, oars: 17, crew: 25, mast: 11.6, sail: [9.6, 6.7], hp: 1000, speed: 13, turn: 0.9, head: 'royal' },
];

export const PLAYER_PAL = { top: 0xb8322a, top2: 0x1c1a1a, sail: 'pats', shields: [[0xc8322a, 0xf2e6c8], [0x1f4f8a, 0xf2d24a], [0xf2e6c8, 0x1c1a1a], [0x2f7a3a, 0xf2e6c8]], crew: [0x6a3a2a, 0x3a5a7a, 0x5a6a3a, 0x7a2a2a, 0x4a3a5a], gold: 0xe6b43a };
export const RAIDER_PALS = [
  { name: 'Black Sail Raiders', top: 0x1c1a1a, top2: 0x8a1a1a, sail: 'black', shields: [[0x1c1a1a, 0xb8322a], [0x8a1a1a, 0x1c1a1a]], crew: [0x2a2a2a, 0x4a2a2a, 0x3a3a3a], gold: 0x9a9aa0 },
  { name: 'Sons of the Wolf', top: 0x3a4a5a, top2: 0xd8d0c0, sail: 'wolf', shields: [[0x3a4a5a, 0xd8d0c0], [0xd8d0c0, 0x3a4a5a]], crew: [0x4a4a4a, 0x5a4a3a, 0x3a4a5a], gold: 0xc0c0c8 },
  { name: 'Jade Fleet', top: 0x1f6a4a, top2: 0xe6c84a, sail: 'jade', shields: [[0x1f6a4a, 0xe6c84a], [0xe6c84a, 0x1f6a4a]], crew: [0x2a5a3a, 0x5a5a2a, 0x2a4a3a], gold: 0xe6c84a },
  { name: 'Blood Axes', top: 0x7a1010, top2: 0xe8b04a, sail: 'blood', shields: [[0x7a1010, 0x1c1a1a], [0xe8b04a, 0x7a1010]], crew: [0x5a1a1a, 0x3a2a1a, 0x6a2a1a], gold: 0xe8b04a },
];
// a fat merchant knarr loaded with treasure: no shields, a golden sail
export const TREASURE_PAL = { name: 'Treasure Knarr', top: 0x5a3a1a, top2: 0xe6b43a, sail: 'gold', shields: [[0xe6b43a, 0x5a3a1a]], crew: [0x6a5a3a, 0x3a4a5a, 0x5a3a2a], gold: 0xffd24a };
export const GHOST_PAL = { name: 'Draugr Ghost Ship', ghost: true, top: 0x1a3a2a, top2: 0x6affb0, sail: 'ghost', shields: [[0x1a2a24, 0x6affb0]], crew: [0x1a2a24], gold: 0x6affb0 };

// ---------- hull lines ----------
function lines(t) {
  const { L, B, D, fb, rise } = t;
  const e = (u) => Math.abs(2 * u - 1);
  const hb = (u) => (B / 2) * Math.pow(Math.max(0, 1 - Math.pow(e(u), 2.3)), 0.55);
  const top = (u) => fb + rise * Math.pow(e(u), 3.2);
  const keel = (u) => fb - D * (1 - 0.72 * Math.pow(e(u), 2.6));
  const z = (u) => (u - 0.5) * L;
  // point on the starboard (+x) side of the section at u, v (0 keel .. 1 gunwale)
  const sec = (u, v) => { const th = v * Math.PI / 2, k = keel(u), tp = top(u); return { x: hb(u) * Math.pow(Math.sin(th), 0.72), y: k + (tp - k) * (1 - Math.cos(th)) }; };
  // v at which the section reaches height y (for the deck and for placing things on the side)
  const vAt = (u, y) => { const k = keel(u), tp = top(u), r = (y - k) / (tp - k); if (r <= 0) return 0; if (r >= 1) return 1; return Math.acos(1 - r) / (Math.PI / 2); };
  return { hb, top, keel, z, sec, vAt, e };
}

function hullGeometry(t, pal, ghost) {
  const Ln = lines(t), nU = 34, S = t.strakes, lap = 0.035 * t.B / 2;
  const pos = [], col = [], idx = []; const c = new THREE.Color();
  const wood = [new THREE.Color(0x8a5a32), new THREE.Color(0x7c4f2b), new THREE.Color(0x94643a)], tar = new THREE.Color(0x2a1d16), topC = new THREE.Color(pal.top), top2 = new THREE.Color(pal.top2), ghostC = new THREE.Color(0x2a4a3a);
  for (const s of [1, -1]) for (let p = 0; p < S; p++) {
    const base = pos.length / 3, rows = 3;
    for (let i = 0; i <= nU; i++) { const u = i / nU;
      for (let r = 0; r < rows; r++) { const lv = r / (rows - 1), v = (p + lv) / S; const q = Ln.sec(u, v), q2 = Ln.sec(u, Math.min(1, v + 0.01)), q1 = Ln.sec(u, Math.max(0, v - 0.01));
        let nx = q2.y - q1.y, ny = -(q2.x - q1.x); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; const off = lap * (1 - lv) * Math.min(1, Ln.hb(u) / (t.B * 0.1));
        const x = q.x + nx * off, y = q.y + ny * off; pos.push(s * x, y, Ln.z(u));
        if (ghost) c.copy(ghostC).multiplyScalar(0.7 + 0.3 * ((p % 2))); else if (p === S - 1) c.copy(topC); else if (p === S - 2 && t.strakes > 5) c.copy(top2); else if (y < 0.02) c.copy(tar).multiplyScalar(0.9 + 0.2 * (p % 2)); else c.copy(wood[p % 3]);
        if (r === 0 && !ghost) c.multiplyScalar(0.82); col.push(c.r, c.g, c.b); } }
    for (let i = 0; i < nU; i++) for (let r = 0; r < rows - 1; r++) { const a = base + i * rows + r, b = a + rows; if (s < 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  // inner skin (darker, faces inward) and the gunwale cap
  const inset = 0.07, ibase = pos.length / 3, iv = 10, inC = new THREE.Color(ghost ? 0x1a2a22 : 0x5a3a22);
  for (const s of [1, -1]) { const b0 = pos.length / 3;
    for (let i = 0; i <= nU; i++) { const u = i / nU; for (let r = 0; r <= iv; r++) { const q = Ln.sec(u, r / iv); pos.push(s * Math.max(0, q.x - inset), q.y + (r === 0 ? inset : 0), Ln.z(u)); c.copy(inC).multiplyScalar(0.85 + 0.15 * ((r % 2))); col.push(c.r, c.g, c.b); } }
    for (let i = 0; i < nU; i++) for (let r = 0; r < iv; r++) { const a = b0 + i * (iv + 1) + r, b = a + iv + 1; if (s < 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const cb = pos.length / 3, capC = new THREE.Color(ghost ? 0x2a4a3a : 0x4a2e1a);
    for (let i = 0; i <= nU; i++) { const u = i / nU, q = Ln.sec(u, 1); pos.push(s * (q.x + lap * 0.2), q.y + 0.03, Ln.z(u)); pos.push(s * Math.max(0, q.x - inset), q.y + 0.03, Ln.z(u)); col.push(capC.r, capC.g, capC.b, capC.r, capC.g, capC.b); }
    for (let i = 0; i < nU; i++) { const a = cb + i * 2, b = a + 2; if (s < 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  void ibase;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return { g, Ln };
}

const plankTex = () => canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#7a5434'; x.fillRect(0, 0, w, h); const r = rand(3);
  for (let i = 0; i < 8; i++) { x.fillStyle = ['#80583a', '#74502f', '#8a6240', '#6e4a2c'][i % 4]; x.fillRect(i * 16, 0, 15, h); x.fillStyle = '#3a2614'; x.fillRect(i * 16 + 15, 0, 1, h); for (let k = 0; k < 3; k++) { x.fillStyle = '#3a2614'; x.fillRect(i * 16, ((r() * h) | 0), 15, 1); } for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(40,24,10,0.25)'; x.fillRect(i * 16 + r() * 14, r() * h, 1, 20 + r() * 40); } } }, { repeat: [1, 1] });
let deckMat = null;

function deckGeometry(t, Ln) {
  const deckY = t.fb - t.D * 0.34, nU = 30, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nU; i++) { const u = 0.04 + (i / nU) * 0.92, v = Ln.vAt(u, deckY), q = Ln.sec(u, v), x = Math.max(0.02, q.x - 0.08); pos.push(-x, deckY, Ln.z(u), x, deckY, Ln.z(u)); uv.push(-x / 1.6, Ln.z(u) / 3, x / 1.6, Ln.z(u) / 3); }
  for (let i = 0; i < nU; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return { g, deckY };
}

// ---------- sails ----------
const sailCache = new Map();
function sailTexture(kind, tier) {
  const key = kind + tier; if (sailCache.has(key)) return sailCache.get(key);
  const tex = canvasTex(256, 256, (x, w, h) => {
    const stripes = (a, b, n) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * w) / n, 0, w / n + 1, h); } };
    if (kind === 'pats') {
      if (tier === 0) { x.fillStyle = '#e6dcc4'; x.fillRect(0, 0, w, h); x.fillStyle = '#d4c6a6'; x.fillRect(150, 40, 60, 50); x.fillRect(30, 150, 50, 40); }
      else if (tier < 3) stripes('#b8322a', '#efe4cc', tier === 1 ? 8 : 10);
      else if (tier === 3) { x.fillStyle = '#8a1e1e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e6b43a'; x.lineWidth = 6; for (let i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 40, 0); x.lineTo(i * 40 + h, h); x.stroke(); x.beginPath(); x.moveTo(i * 40 + h, 0); x.lineTo(i * 40, h); x.stroke(); } }
      else { stripes('#4a1f6a', '#e6b43a', 6); }
      if (tier >= 2) { // Pat's crest: crossed axes under a crown on a shield-round
        x.save(); x.translate(w / 2, h / 2); x.fillStyle = tier >= 4 ? '#2a0f3a' : '#1c1a1a'; x.beginPath(); x.arc(0, 8, 62, 0, 6.28); x.fill(); x.strokeStyle = '#e6b43a'; x.lineWidth = 7; x.stroke();
        x.strokeStyle = '#d8d8d8'; x.lineWidth = 8; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * -34, 44); x.lineTo(s * 30, -26); x.stroke(); x.fillStyle = '#d8d8d8'; x.beginPath(); x.moveTo(s * 30, -26); x.quadraticCurveTo(s * 52, -26, s * 46, 2); x.lineTo(s * 22, -14); x.closePath(); x.fill(); }
        x.fillStyle = '#e6b43a'; x.beginPath(); x.moveTo(-30, -18); x.lineTo(-30, -44); x.lineTo(-15, -30); x.lineTo(0, -52); x.lineTo(15, -30); x.lineTo(30, -44); x.lineTo(30, -18); x.closePath(); x.fill(); x.restore(); }
    } else if (kind === 'black') { x.fillStyle = '#1e1c1c'; x.fillRect(0, 0, w, h); x.fillStyle = '#c23b3b'; x.beginPath(); x.arc(w / 2, h / 2, 50, 0, 6.28); x.fill(); x.fillStyle = '#1e1c1c'; x.beginPath(); x.arc(w / 2 - 16, h / 2 - 8, 12, 0, 6.28); x.arc(w / 2 + 16, h / 2 - 8, 12, 0, 6.28); x.fill(); x.fillRect(w / 2 - 20, h / 2 + 20, 40, 10); }
    else if (kind === 'wolf') { stripes('#3a4a5a', '#d8d0c0', 6); x.fillStyle = '#1c1a1a'; x.beginPath(); x.moveTo(90, 160); x.lineTo(100, 80); x.lineTo(120, 110); x.lineTo(140, 110); x.lineTo(160, 80); x.lineTo(168, 160); x.lineTo(128, 190); x.closePath(); x.fill(); x.fillStyle = '#ffd24a'; x.fillRect(110, 130, 10, 6); x.fillRect(138, 130, 10, 6); }
    else if (kind === 'jade') { stripes('#1f6a4a', '#e6c84a', 8); x.fillStyle = '#1f6a4a'; x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 6.28); x.fill(); x.strokeStyle = '#e6c84a'; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2, h / 2 - 34); x.lineTo(w / 2, h / 2 + 34); x.moveTo(w / 2 - 24, h / 2 - 14); x.lineTo(w / 2, h / 2 - 34); x.lineTo(w / 2 + 24, h / 2 - 14); x.stroke(); }
    else if (kind === 'gold') { stripes('#e6b43a', '#f6ecd0', 8); x.fillStyle = '#b8822a'; x.beginPath(); x.arc(w / 2, h / 2, 50, 0, 6.28); x.fill(); x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(w / 2, h / 2, 40, 0, 6.28); x.fill(); x.strokeStyle = '#8a5a1a'; x.lineWidth = 7; x.beginPath(); x.moveTo(w / 2, h / 2 - 26); x.lineTo(w / 2, h / 2 + 26); x.moveTo(w / 2 - 16, h / 2 - 12); x.lineTo(w / 2 + 16, h / 2 - 12); x.moveTo(w / 2 - 16, h / 2 + 12); x.lineTo(w / 2 + 16, h / 2 + 12); x.stroke(); }
    else if (kind === 'blood') { x.fillStyle = '#7a1010'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8b04a'; for (let i = 0; i < 3; i++) { x.save(); x.translate(w / 2, h / 2); x.rotate(i * 2.094); x.beginPath(); x.moveTo(0, 0); x.lineTo(-14, -70); x.lineTo(14, -70); x.closePath(); x.fill(); x.restore(); } }
    else if (kind === 'ghost') { x.fillStyle = '#4a5a50'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; const r = rand(9); for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 18, 4 + r() * 26, r() * 3, 0, 6.28); x.fill(); } for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(i * 30, h); x.lineTo(i * 30 + 14, h - 30 - r() * 40); x.lineTo(i * 30 + 28, h); x.fill(); }
      x.globalCompositeOperation = 'source-over'; x.fillStyle = '#6affb0'; x.beginPath(); x.arc(w / 2 - 22, h / 2 - 10, 10, 0, 6.28); x.arc(w / 2 + 22, h / 2 - 10, 10, 0, 6.28); x.fill(); }
    // weave and shading
    x.fillStyle = 'rgba(0,0,0,0.07)'; for (let i = 0; i < h; i += 4) x.fillRect(0, i, w, 1); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
  sailCache.set(key, tex); return tex;
}
function sailGeometry(w, h, bulge) { const g = new THREE.PlaneGeometry(w, h, 10, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = (p.getY(i) + h / 2) / h; p.setZ(i, bulge * (1 - x * x) * (0.35 + 0.65 * Math.sin(y * Math.PI * 0.85 + 0.15))); p.setY(i, p.getY(i) - h / 2); } g.computeVertexNormals(); return g; }

// ---------- figures ----------
const SKIN = [0xf0c8a0, 0xe0b088, 0xc89070, 0xa87050], BEARD = [0xb85a1a, 0x6a3a1a, 0xe0c070, 0x3a2414, 0xd8d0c0, 0xc8641a];
function viking(parent, r, pal, pose = 'row', ghost = false) {
  const g = grp(parent); const skin = ghost ? M(0x8affc8, 'glow') : M(SKIN[(r() * SKIN.length) | 0]), tunic = M(ghost ? 0x1a3a2a : pal.crew[(r() * pal.crew.length) | 0]), trou = M(ghost ? 0x0f2a1f : [0x4a3a2a, 0x3a3a3a, 0x5a4a3a][(r() * 3) | 0]);
  const beardC = M(ghost ? 0x6affb0 : BEARD[(r() * BEARD.length) | 0]), iron = M(ghost ? 0x2a4a3a : 0x8a8f96), leather = M(0x4a2e1a), horn = M(ghost ? 0x9affd0 : 0xe8dcc0);
  const seated = pose === 'row';
  if (seated) { for (const s of [-1, 1]) part(g, CAP(), trou, 0.12, 0.2, 0.12, s * 0.09, 0.08, 0.16, Math.PI / 2 - 0.2); part(g, CAP(), tunic, 0.3, 0.2, 0.24, 0, 0.36, 0, -0.15); }
  else { for (const s of [-1, 1]) part(g, CAP(), trou, 0.12, 0.26, 0.12, s * 0.08, 0.2, 0); part(g, CAP(), tunic, 0.32, 0.24, 0.26, 0, 0.55, 0); }
  const y0 = seated ? 0.36 : 0.55;
  part(g, CYL(), leather, 0.31, 0.05, 0.25, 0, y0 - 0.1, 0); part(g, BOX(), M(0xe6b43a), 0.05, 0.04, 0.02, 0, y0 - 0.1, 0.13);
  for (const s of [-1, 1]) { const a = part(g, CAP(), tunic, 0.09, 0.22, 0.09, s * 0.17, y0 + 0.04, seated ? 0.14 : 0.02, seated ? -1.2 : 0.1, 0, s * 0.15); void a; part(g, SPH_LO(), skin, 0.08, 0.08, 0.08, s * 0.16, y0 + (seated ? -0.02 : -0.16), seated ? 0.32 : 0.04); }
  const hy = y0 + 0.3; part(g, SPH(), skin, 0.2, 0.21, 0.2, 0, hy, 0.01);
  part(g, CON(), beardC, 0.17, 0.22, 0.12, 0, hy - 0.15, 0.06, Math.PI); part(g, SPH_LO(), beardC, 0.17, 0.09, 0.1, 0, hy - 0.05, 0.08);
  part(g, HEMI(), iron, 0.23, 0.22, 0.23, 0, hy + 0.03, 0); part(g, BOX(), iron, 0.03, 0.09, 0.03, 0, hy, 0.11); part(g, CYL(), iron, 0.235, 0.025, 0.235, 0, hy + 0.035, 0);
  if (r() < 0.75 || pose === 'captain') for (const s of [-1, 1]) part(g, CON(), horn, 0.045, 0.16, 0.045, s * 0.12, hy + 0.12, 0, 0, 0, -s * 0.9);
  if (pose === 'captain') { part(g, BOX(), M(ghost ? 0x2a5a4a : 0x8a1a1a), 0.36, 0.42, 0.04, 0, 0.6, -0.13); part(g, SPH_LO(), M(0xc8b090), 0.36, 0.08, 0.2, 0, 0.82, -0.04); }
  if (pose === 'look') { rod(g, M(0x6a4a2a), V(0.2, 0.2, 0), V(0.2, 1.1, 0), 0.02); part(g, CON4(), iron, 0.06, 0.16, 0.03, 0.2, 1.18, 0); }
  return g;
}
const CON4 = () => CON();

// ---------- heads and tails for the stems ----------
function dragonHead(parent, sc, kind, pal, ghost) {
  const h = grp(parent); h.scale.setScalar(sc); const gold = kind === 'royal', main = ghost ? M(0x2a4a3a) : M(gold ? pal.gold : kind === 'dragon' ? 0x8a2a1a : 0x3a2a1a), dark = ghost ? M(0x1a2a24) : M(gold ? 0xa87a1a : 0x1c1414), bone = M(ghost ? 0xb0ffd8 : 0xf2ead8);
  const eye = ghost || gold ? M(ghost ? 0x6affb0 : 0xff5a1a, 'glow') : M(0xe6b43a), red = M(ghost ? 0x0a1a12 : 0x6a1010);
  part(h, SPH(), main, 0.5, 0.42, 0.62, 0, 0.05, 0.05); part(h, RBX(), main, 0.34, 0.24, 0.5, 0, 0.0, 0.42); part(h, SPH(), main, 0.3, 0.2, 0.22, 0, 0.02, 0.66);
  for (const s of [-1, 1]) { part(h, SPH_LO(), dark, 0.07, 0.05, 0.05, s * 0.08, 0.1, 0.74); part(h, SPH(), eye, 0.12, 0.1, 0.1, s * 0.17, 0.16, 0.26); part(h, CAP(), dark, 0.07, 0.16, 0.07, s * 0.15, 0.24, 0.27, 0, 0, Math.PI / 2 + s * 0.4);
    part(h, CON(), bone, 0.09, 0.5, 0.09, s * 0.15, 0.38, -0.12, -0.9, 0, -s * 0.25); part(h, CON(), dark, 0.05, 0.3, 0.2, s * 0.24, 0.12, -0.12, -1.2, 0, -s * 0.9); }
  const jaw = grp(h, 0, -0.12, 0.1); jaw.rotation.x = 0.32; part(jaw, RBX(), dark, 0.3, 0.09, 0.56, 0, -0.04, 0.32); part(jaw, SPH(), red, 0.24, 0.05, 0.42, 0, 0.0, 0.3);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { part(h, CON(), bone, 0.035, 0.09, 0.035, s * (0.13 - i * 0.008), -0.13, 0.28 + i * 0.09, Math.PI); part(jaw, CON(), bone, 0.03, 0.07, 0.03, s * (0.11 - i * 0.008), 0.03, 0.18 + i * 0.08); }
  for (let i = 0; i < 4; i++) part(h, CON(), dark, 0.12, 0.3 - i * 0.04, 0.04, 0, 0.12 - i * 0.04, -0.3 - i * 0.16, -1.4);
  return h;
}
function serpentHead(parent, sc, pal, ghost) { const h = grp(parent); h.scale.setScalar(sc); const main = M(ghost ? 0x2a4a3a : 0x2a1f16), acc = M(ghost ? 0x6affb0 : pal.top);
  part(h, SPH(), main, 0.36, 0.3, 0.7, 0, 0, 0.18); part(h, SPH(), main, 0.26, 0.2, 0.3, 0, -0.02, 0.5); for (const s of [-1, 1]) { part(h, SPH(), M(ghost ? 0x6affb0 : 0xe6b43a, ghost ? 'glow' : 'skin'), 0.09, 0.07, 0.07, s * 0.12, 0.08, 0.32); part(h, CON(), acc, 0.04, 0.22, 0.12, s * 0.12, 0.16, -0.05, -1.1, 0, -s * 0.4); }
  for (let i = 0; i < 4; i++) part(h, CON(), acc, 0.05, 0.16, 0.12, 0, 0.14 - i * 0.02, 0.1 - i * 0.14, -1.3); return h; }

// ---------- the ship ----------
// up = { shields, armor, ballista, fire, ram, sail } (levels); pal = colours; returns the group and handles for animation
// treasure chests with glowing gold lids along the deck (the treasure knarr)
export function addCargo(s) { const t = s.t; for (let i = 0; i < 6; i++) { const z = (i / 5 - 0.5) * t.L * 0.45, x = (i % 2 ? 1 : -1) * t.B * 0.16; const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), M(0x7a4a22)); c.position.set(x, s.deckY + 0.3, z); s.body.add(c); const l = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.54), M(0xe6b43a, 'glow')); l.position.set(x, s.deckY + 0.6, z); s.body.add(l); } }
export function buildShip(tier = 0, up = {}, pal = PLAYER_PAL, seed = 1) {
  const t = SHIP_TIERS[Math.max(0, Math.min(4, tier))], ghost = !!pal.ghost, r = rand(seed * 977 + tier * 31);
  const root = new THREE.Group(), body = grp(root), st = grp(body); // st: static parts (merged)
  const { g: hullG, Ln } = hullGeometry(t, pal, ghost); const hull = new THREE.Mesh(hullG, ghost ? new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85, emissive: 0x0a3a22 }) : VC.lambert); body.add(hull);
  if (!deckMat) deckMat = new THREE.MeshLambertMaterial({ map: plankTex() });
  const { g: deckG, deckY } = deckGeometry(t, Ln); body.add(new THREE.Mesh(deckG, ghost ? M(0x1a2a22) : deckMat));
  const wood = M(ghost ? 0x2a3a30 : 0x6a4426), dwood = M(ghost ? 0x1a2a22 : 0x4a2e18), rope = M(ghost ? 0x6a8a7a : 0xc8b08a), iron = M(ghost ? 0x3a5a4a : 0x5a5e66), gold = M(ghost ? 0x6affb0 : pal.gold);
  // benches (thwarts) and ribs
  const nB = Math.max(2, t.oars + (tier === 0 ? 0 : 1)), z0 = -t.L * 0.33, z1 = t.L * 0.33, benches = [];
  for (let i = 0; i < nB; i++) { const z = z0 + ((z1 - z0) * (i + 0.5)) / nB, u = z / t.L + 0.5, y = deckY + t.D * 0.22, v = Ln.vAt(u, y), q = Ln.sec(u, v); part(st, BOX(), wood, q.x * 2 - 0.1, 0.07, 0.24, 0, y, z); benches.push({ z, y, w: q.x }); }
  for (let i = 0; i <= nB + 2; i++) { const z = -t.L * 0.4 + (t.L * 0.8 * i) / (nB + 2), u = z / t.L + 0.5; for (const s of [-1, 1]) { const a = Ln.sec(u, 0.45), b = Ln.sec(u, 0.97); rod(st, dwood, V(s * (a.x - 0.09), a.y, z), V(s * (b.x - 0.08), b.y, z), 0.035); } }
  // stems
  const uEnd = 1, topE = Ln.top(uEnd), keelE = Ln.keel(uEnd), postH = t.rise * 0.9 + t.B * 0.25, half = t.L / 2;
  const bowPts = curvePts([V(0, keelE - 0.05, half * 0.96), V(0, (keelE + topE) / 2, half * 1.02), V(0, topE, half * 1.05), V(0, topE + postH * 0.55, half * 1.08), V(0, topE + postH, half * 1.06)], 22);
  const postMat = ghost ? M(0x2a4a3a) : M(pal.top2 === 0x1c1a1a ? 0x5a3a20 : 0x5a3a20);
  body.add(new THREE.Mesh(taperTube(bowPts, { radial: 8, r: (s) => (0.13 - s * 0.05) * t.B / 2.6, flat: 0.55, ref: V(1, 0, 0) }), postMat));
  const curl = t.head === 'spiral' || t.head === 'serpent';
  const sternCtrl = [V(0, keelE - 0.05, -half * 0.96), V(0, (keelE + topE) / 2, -half * 1.02), V(0, topE, -half * 1.05), V(0, topE + postH * 0.55, -half * 1.08), V(0, topE + postH * 0.95, -half * 1.04)];
  if (curl) sternCtrl.push(V(0, topE + postH * 1.12, -half * 0.97), V(0, topE + postH * 1.02, -half * 0.92), V(0, topE + postH * 0.86, -half * 0.95), V(0, topE + postH * 0.92, -half * 0.99));
  const sternPts = curvePts(sternCtrl, curl ? 30 : 22);
  body.add(new THREE.Mesh(taperTube(sternPts, { radial: 8, r: (s) => (0.13 - s * 0.07) * t.B / 2.6, flat: 0.55, ref: V(1, 0, 0) }), postMat));
  const headAt = bowPts[bowPts.length - 1];
  if (t.head === 'dragon' || t.head === 'royal') { const h = dragonHead(st, t.B * 0.36, t.head, pal, ghost); h.position.set(0, headAt.y + 0.1 * t.B, headAt.z + 0.05); h.rotation.x = -0.1;
    // the tail at the stern: a spiked curl
    const tailPts = curvePts([V(0, topE + postH * 0.9, -half * 1.04), V(0, topE + postH * 1.3, -half * 1.0), V(0, topE + postH * 1.45, -half * 0.88), V(0, topE + postH * 1.25, -half * 0.82)], 14);
    body.add(new THREE.Mesh(taperTube(tailPts, { radial: 7, r: (s) => (0.08 - s * 0.07) * t.B / 2.6 + 0.005, ref: V(1, 0, 0) }), ghost ? M(0x2a4a3a) : M(t.head === 'royal' ? pal.gold : 0x8a2a1a)));
    for (let i = 1; i < tailPts.length - 1; i += 2) part(st, CON(), ghost ? M(0x6affb0) : M(t.head === 'royal' ? 0xa87a1a : 0x1c1414), 0.05 * t.B, 0.22 * t.B / 2.6, 0.03 * t.B, 0, tailPts[i].y + 0.08, tailPts[i].z - 0.04, -0.6); }
  else if (t.head === 'serpent') { const h = serpentHead(st, t.B * 0.3, pal, ghost); h.position.set(0, headAt.y + 0.05, headAt.z + 0.08); h.rotation.x = 0.2; }
  else { part(st, SPH(), gold, 0.12, 0.12, 0.12, 0, headAt.y + 0.04, headAt.z); }
  if (t.head === 'royal') for (const s of [-1, 1]) { const b = grp(st, 0, headAt.y - 0.5, headAt.z - 0.3); part(b, BOX(), gold, 0.04, 0.04, 1.4, s * 0.08, 0, -0.6); }
  // mast, yard, sail, rigging
  const mastZ = t.L * 0.04, mastTop = deckY + t.mast;
  part(st, CYL(), wood, t.B * 0.07, t.mast, t.B * 0.07, 0, deckY + t.mast / 2, mastZ); part(st, BOX(), dwood, t.B * 0.18, 0.18, t.B * 0.5, 0, deckY + 0.1, mastZ); // mast fish (keelson block)
  part(st, CYL(), dwood, t.B * 0.09, 0.14, t.B * 0.09, 0, mastTop + 0.05, mastZ); part(st, SPH(), gold, t.B * 0.07, t.B * 0.07, t.B * 0.07, 0, mastTop + 0.18, mastZ);
  const [sw, sh] = t.sail, yardY = mastTop - 0.35, yard = grp(body, 0, yardY, mastZ + t.B * 0.05);
  part(yard, CYL(), wood, 0.07 * t.B / 2, sw * 1.08, 0.07 * t.B / 2, 0, 0, 0, 0, 0, Math.PI / 2);
  const sailMat = new THREE.MeshLambertMaterial({ map: sailTexture(pal.sail, pal.sail === 'pats' ? Math.min(tier, up.sail ?? tier) : tier), side: THREE.DoubleSide, transparent: ghost, alphaTest: ghost ? 0.3 : 0, emissive: ghost ? 0x0a2a1a : 0x000000 });
  const sail = new THREE.Mesh(sailGeometry(sw, sh, sw * 0.16), sailMat); sail.position.set(0, -0.08, 0.02); yard.add(sail);
  const foot = part(yard, CYL(), dwood, 0.04, sw * 0.98, 0.04, 0, -sh + 0.02, sw * 0.03, 0, 0, Math.PI / 2); void foot;
  const rig = []; const gw = (u) => { const q = Ln.sec(u, 1); return q; };
  for (const s of [-1, 1]) for (const u of [0.42, 0.5]) { const q = gw(u); rig.push(V(0, mastTop - 0.1, mastZ), V(s * q.x, q.y, (u - 0.5) * t.L)); }
  rig.push(V(0, mastTop, mastZ), V(0, Ln.top(0.97) + 0.1, t.L * 0.47), V(0, mastTop, mastZ), V(0, Ln.top(0.03) + 0.1, -t.L * 0.47));
  for (const s of [-1, 1]) { rig.push(V(s * sw * 0.54, yardY, mastZ + t.B * 0.05), V(s * gw(0.35).x, gw(0.35).y, -t.L * 0.15)); rig.push(V(s * sw * 0.5, yardY - sh, mastZ + t.B * 0.05 + sw * 0.03), V(s * gw(0.3).x, gw(0.3).y, -t.L * 0.2)); }
  const rigLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rig), new THREE.LineBasicMaterial({ color: ghost ? 0x6affb0 : 0x2a1f16, transparent: ghost, opacity: ghost ? 0.5 : 1 })); body.add(rigLines);
  // a pennant at the masthead
  const flagMat = new THREE.MeshLambertMaterial({ color: ghost ? 0x6affb0 : pal.top, side: THREE.DoubleSide }); const flagGeo = new THREE.PlaneGeometry(t.B * 0.5, t.B * 0.16, 6, 1); flagGeo.translate(-t.B * 0.25, 0, 0);
  const flag = new THREE.Mesh(flagGeo, flagMat); flag.position.set(0, mastTop + 0.1, mastZ); flag.rotation.y = Math.PI / 2; body.add(flag);
  // shields along both rails (outside the top strake)
  const shieldN = Math.min(t.oars * 2 + 2, [0, 4, 10, 40][Math.min(3, up.shields || 0)]);
  if (shieldN > 0) { const lvl = up.shields || 0, sr = Math.min(0.36, t.B * 0.13), perSide = Math.ceil(shieldN / 2);
    for (const s of [-1, 1]) for (let i = 0; i < perSide; i++) { const z = -t.L * 0.32 + (t.L * 0.64 * (i + 0.5)) / perSide, u = z / t.L + 0.5, q = Ln.sec(u, 0.93), pc = pal.shields[(i + (s > 0 ? 0 : 1)) % pal.shields.length];
      const sg = grp(st, s * (q.x + 0.06), q.y, z); sg.rotation.z = s * -Math.PI / 2; sg.rotation.y = 0;
      part(sg, DISC(), M(lvl === 1 ? 0x9a6a3a : pc[0]), sr * 2, 0.04, sr * 2, 0, 0, 0); if (lvl >= 2) { const hh = part(sg, HALF(), M(pc[1]), sr * 1.96, sr * 1.96, 1, 0, 0.022, 0, -Math.PI / 2); hh.rotation.z = (i % 2) * Math.PI / 2; }
      part(sg, SPH_LO(), lvl >= 3 ? gold : iron, sr * 0.5, sr * 0.4, sr * 0.5, 0, 0.03, 0); if (lvl >= 3) part(sg, TOR(), iron, sr * 2, sr * 2, 0.6, 0, 0.02, 0, Math.PI / 2); } }
  // iron plating along the waterline
  if (up.armor) { const n = Math.round(t.L * 1.1); for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const z = -t.L * 0.38 + (t.L * 0.76 * (i + 0.5)) / n, u = z / t.L + 0.5, v = Ln.vAt(u, 0.12), q = Ln.sec(u, v), q2 = Ln.sec(u, Math.min(1, v + 0.15));
      const pl = grp(st, s * (q.x + 0.05), q.y + 0.04, z); pl.rotation.z = s * -Math.atan2(q2.x - q.x, q2.y - q.y) * 0.6; part(pl, BOX(), iron, 0.04, 0.32 + up.armor * 0.12, t.L * 0.76 / n * 0.92, 0, 0, 0);
      if (up.armor >= 2) for (const dy of [-0.12, 0.12]) part(pl, SPH_LO(), M(0x9aa0a8), 0.05, 0.05, 0.05, s * 0.025, dy, 0); } }
  // ram
  if (up.ram) { const rg = grp(st, 0, 0.0, half * 0.98); part(rg, CON(), iron, 0.32 * t.B / 2.6 * (1 + up.ram * 0.3), 1.1 + up.ram * 0.4, 0.22 * t.B / 2.6 * (1 + up.ram * 0.3), 0, 0, 0.5, Math.PI / 2); part(rg, TOR(), iron, 0.4 * t.B / 2.6, 0.4 * t.B / 2.6, 0.8, 0, 0, 0.05); }
  // ballista at the bow
  let ballista = null;
  if (up.ballista) { const bz = t.L * 0.33, u = bz / t.L + 0.5; ballista = grp(body, 0, deckY + t.D * 0.35, bz); const bs = 0.7 + up.ballista * 0.18 + tier * 0.12; ballista.scale.setScalar(bs);
    part(ballista, BOX(), dwood, 0.2, 0.5, 0.2, 0, 0.25, 0); part(ballista, BOX(), wood, 0.22, 0.16, 1.3, 0, 0.55, 0.1); for (const s of [-1, 1]) { rod(ballista, dwood, V(0, 0.6, 0.55), V(s * 0.65, 0.66, 0.35), 0.045); part(ballista, SPH_LO(), iron, 0.1, 0.1, 0.1, s * 0.66, 0.66, 0.35); }
    const str = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(-0.65, 0.66, 0.35), V(0, 0.64, -0.2), V(0, 0.64, -0.2), V(0.65, 0.66, 0.35)]), new THREE.LineBasicMaterial({ color: 0xd8c8a0 })); ballista.add(str);
    const bolt = grp(ballista, 0, 0.66, 0.2); part(bolt, CYL6(), wood, 0.05, 1.2, 0.05, 0, 0, 0, Math.PI / 2); part(bolt, CON(), iron, 0.09, 0.22, 0.09, 0, 0, 0.66, Math.PI / 2); ballista.userData.bolt = bolt; void u;
    if (up.ballista >= 3) { const b2 = ballista.clone(); b2.position.z = -t.L * 0.3; b2.rotation.y = Math.PI; body.add(b2); } }
  // fire pots near the mast
  const potGlow = [];
  if (up.fire) for (let i = 0; i < up.fire + 1; i++) { const pg = grp(st, (i - up.fire / 2) * 0.32, deckY + 0.05, mastZ - t.B * 0.35); part(pg, SPH(), M(0xa8582a), 0.26, 0.3, 0.26, 0, 0.15, 0); part(pg, CYL(), M(0x8a4a22), 0.12, 0.1, 0.12, 0, 0.32, 0); const gl = part(body, SPH_LO(), M(0xffa02a, 'glow'), 0.1, 0.06, 0.1, (i - up.fire / 2) * 0.32, deckY + 0.42, mastZ - t.B * 0.35); potGlow.push(gl); }
  // cargo
  for (let i = 0; i < 2 + tier; i++) { const z = (r() - 0.5) * t.L * 0.5, s = r() < 0.5 ? -1 : 1, u = z / t.L + 0.5, q = Ln.sec(u, Ln.vAt(u, deckY + 0.2)); const x = s * Math.max(0, q.x - 0.4);
    if (r() < 0.5) { part(st, CYL(), M(0x7a5232), 0.34, 0.44, 0.34, x, deckY + 0.22, z); for (const dy of [0.08, 0.36]) part(st, CYL(), dwood, 0.35, 0.04, 0.35, x, deckY + dy, z); } else { part(st, BOX(), M(0x8a5a32), 0.44, 0.34, 0.34, x, deckY + 0.17, z); part(st, BOX(), iron, 0.46, 0.05, 0.36, x, deckY + 0.3, z); } }
  // crew: rowers on the benches, a captain at the steering oar, a lookout at the bow
  const crewN = t.crew; let placed = 0;
  for (let i = 0; i < benches.length && placed < crewN - 2; i++) for (const s of [-1, 1]) { if (placed >= crewN - 2) break; const b = benches[i]; const v = viking(st, r, pal, 'row', ghost); v.position.set(s * b.w * 0.45, b.y - 0.02, b.z - 0.05); v.rotation.y = Math.PI; v.scale.setScalar(Math.min(1.25, 0.9 + tier * 0.08)); placed++; }
  const cap = viking(st, r, pal, 'captain', ghost); cap.position.set(-t.B * 0.12, deckY + 0.05, -t.L * 0.38); cap.scale.setScalar(1 + tier * 0.08);
  if (crewN > 3) { const lk = viking(st, r, pal, 'look', ghost); lk.position.set(t.B * 0.1, deckY + 0.05, t.L * 0.36); lk.scale.setScalar(1 + tier * 0.06); }
  // steering oar on the starboard quarter (the steer-board side, -x when facing +z)
  { const q = Ln.sec(0.12, 1), so = grp(st, -(q.x + 0.12), q.y, -t.L * 0.38); part(so, BOX(), dwood, 0.12, 0.22, 0.22, 0, 0, 0); rod(so, wood, V(0, 0.6, 0.1), V(0, -t.D * 1.05, -0.25), 0.06); part(so, BOX(), wood, 0.06, t.D * 0.75, 0.4, 0, -t.D * 0.75, -0.25); rod(so, wood, V(0, 0.6, 0.1), V(0.6, 0.7, 0.2), 0.03); }
  // oars: one instanced mesh, rowed in animation
  let oars = null, oarSlots = [];
  if (t.oars) { const oL = t.B * 0.95 + 1.2, og = new THREE.CylinderGeometry(0.035, 0.04, oL, 6); og.rotateZ(Math.PI / 2); og.translate(oL / 2 - 0.4, 0, 0); const blade = new THREE.BoxGeometry(0.5, 0.03, 0.16); blade.translate(oL - 0.5, 0, 0);
    const merged = mergeGeos([og, blade]); oars = new THREE.InstancedMesh(merged, M(ghost ? 0x2a4a3a : 0x9a7048), t.oars * 2); oars.frustumCulled = false; body.add(oars);
    for (let i = 0; i < t.oars; i++) for (const s of [-1, 1]) { const z = -t.L * 0.3 + (t.L * 0.6 * (i + 0.5)) / t.oars, u = z / t.L + 0.5, q = Ln.sec(u, 0.9); oarSlots.push({ s, p: V(s * q.x, q.y, z), ph: i * 0.05 }); } }
  // lantern for night
  const lantern = part(body, SPH_LO(), M(ghost ? 0x6affb0 : 0xffc86a, 'glow'), 0.18, 0.22, 0.18, 0, Ln.top(0.04) + postH * 0.4, -t.L * 0.44); lantern.visible = ghost;
  // lantern upgrade: a stern lantern on an iron post, then bow and mast lanterns, then two great iron fire braziers
  const lamps = [lantern], braziers = [], lv = up.lights || 0, lampOn = M(0xffc86a, 'glow');
  const lampAt = (x, y, z, post) => { if (post) rod(st, iron, V(x, deckY, z), V(x, y + 0.35, z), 0.05); const hous = grp(st, x, y, z); part(hous, BOX(), dwood, 0.42, 0.06, 0.42, 0, 0.3, 0); part(hous, BOX(), dwood, 0.42, 0.06, 0.42, 0, -0.3, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(hous, BOX(), iron, 0.04, 0.6, 0.04, a * 0.19, 0, b * 0.19); part(hous, CON(), iron, 0.5, 0.25, 0.5, 0, 0.45, 0); const g = part(body, SPH_LO(), lampOn, 0.3, 0.42, 0.3, x, y, z); g.visible = false; lamps.push(g); };
  if (lv >= 1 && !ghost) lampAt(0.35, Ln.top(0.06) + 0.5, -t.L * 0.4, true);
  if (lv >= 2 && !ghost) { lampAt(0, Ln.top(0.94) + 0.45, t.L * 0.41, true); lampAt(0, deckY + t.mast * 0.55, mastZ + t.B * 0.1, false); }
  if (lv >= 3 && !ghost) for (const sd of [-1, 1]) { const q = Ln.sec(0.78, Ln.vAt(0.78, deckY + 0.2)), bx = sd * Math.max(0.3, q.x - 0.45), bz = t.L * 0.28; for (const a of [0, 2.1, 4.2]) rod(st, iron, V(bx + Math.cos(a) * 0.3, deckY, bz + Math.sin(a) * 0.3), V(bx, deckY + 0.9, bz), 0.04); const bowl = part(st, CYL(), iron, 0.75, 0.3, 0.75, bx, deckY + 1.0, bz); void bowl; part(st, TOR(), M(0x3a3a3e), 0.8, 0.8, 1.4, bx, deckY + 1.15, bz, Math.PI / 2); const fl = part(body, CON(), M(0xff8a2a, 'glow'), 0.55, 0.9, 0.55, bx, deckY + 1.55, bz); const fl2 = part(body, CON(), M(0xffe27a, 'glow'), 0.3, 0.6, 0.3, bx, deckY + 1.45, bz); fl.visible = fl2.visible = false; braziers.push(fl, fl2); }
  // merge the static parts: flatten nested groups first so each material becomes one mesh
  flatten(st); mergeParts(st);
  let mask = null;
  // water mask: an invisible lid at the gunwale drawn after the ship and before the sea, so waves never show inside the hull
  { const nU = 30, mp = [], mi = []; for (let i = 0; i <= nU; i++) { const u = i / nU, q = Ln.sec(u, 1), x = Math.max(0.01, q.x - 0.03); mp.push(-x, q.y - 0.02, Ln.z(u), x, q.y - 0.02, Ln.z(u)); }
    for (let i = 0; i < nU; i++) { const a = i * 2; mi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); mg.setIndex(mi);
    mask = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })); body.add(mask);
    root.traverse((o) => { if (o.isMesh || o.isLine || o.isLineSegments) o.renderOrder = -10; }); mask.renderOrder = -9; }
  root.userData.tier = tier;
  const mtx = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1); let ph = 0, billow = 0;
  function anim(dt, { speed = 0, time = 0, night = false, sail: sailK = 1 } = {}) {
    const k = Math.min(1, Math.abs(speed) / t.speed); ph += dt * (1.2 + k * 2.2) * (k > 0.05 ? 1 : 0.15);
    if (oars) { oarSlots.forEach((o, i) => { const a = ph + o.ph; const sweep = Math.sin(a) * 0.38 * (0.25 + k), lift = (Math.cos(a) * 0.14 - 0.02) * (0.3 + k);
        e.set(0, o.s > 0 ? -sweep : Math.PI + sweep, -0.42 + lift, 'YXZ'); q4.setFromEuler(e); mtx.compose(o.p, q4, one); oars.setMatrixAt(i, mtx); }); oars.instanceMatrix.needsUpdate = true; }
    billow += (0.55 + k * 0.6 - billow) * Math.min(1, dt * 1.5); sail.scale.z = (billow + Math.sin(time * 1.7) * 0.04) * (0.3 + 0.7 * sailK); sail.scale.y = 0.16 + 0.84 * sailK;
    const fp = flag.geometry.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(time * 6 + x * 5) * 0.08 * (-x / t.B) * 2); } fp.needsUpdate = true;
    for (const l of lamps) l.visible = ghost || night; braziers.forEach((b, i) => { b.visible = night; b.scale.y = (i % 2 ? 0.6 : 0.9) * (0.85 + Math.sin(time * 11 + i * 2) * 0.15); }); for (const gl of potGlow) gl.scale.setScalar(0.1 * (0.85 + Math.sin(time * 9 + gl.position.x * 7) * 0.15));
  }
  return { g: root, body, t, tier, anim, len: t.L, beam: t.B, mastTop, deckY, sail, ballista, bowZ: half * 1.06, sailMat, hull, mask };
}

function flatten(st) { st.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(st.matrixWorld).invert(); const list = []; st.traverse((o) => { if (o.isMesh && o.parent !== st) list.push(o); });
  for (const m of list) { const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); m.parent.remove(m); mw.decompose(m.position, m.quaternion, m.scale); st.add(m); }
  for (const c of [...st.children]) if (!c.isMesh && c.children.length === 0) st.remove(c); }
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeGeos(list) { return mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (a !== 'position' && a !== 'normal') n.deleteAttribute(a); return n; })); }
export { flatten };

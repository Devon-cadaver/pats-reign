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
  // the end-game ships (v0.8.0): a great Busse, the Long Serpent, and Naglfar, the ship of the dead built from nails
  { name: 'Busse', L: 26.5, B: 5, D: 2.1, fb: 0.95, rise: 2.7, strakes: 9, oars: 20, crew: 31, mast: 13, sail: [11, 7.6], hp: 1750, speed: 13.6, turn: 0.84, head: 'royal' },
  { name: 'Ormen Lange', L: 30, B: 5.4, D: 2.25, fb: 1.0, rise: 2.95, strakes: 10, oars: 24, crew: 38, mast: 14.4, sail: [12.4, 8.4], hp: 3000, speed: 14.2, turn: 0.78, head: 'wyrm' },
  { name: 'Naglfar', L: 34, B: 6, D: 2.45, fb: 1.08, rise: 3.3, strakes: 10, oars: 28, crew: 46, mast: 16, sail: [13.8, 9.4], hp: 5200, speed: 14.8, turn: 0.72, head: 'naglfar' },
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

// ghost-ship colours: the Draugr ghost ship's own green, or an undead fleet's (pal.gc) in Helheim; set for each build
const GH0 = { hull: 0x2a4a3a, dark: 0x1a2a22, glow: 0x6affb0, emis: 0x0a3a22, tunic: 0x1a3a2a, trou: 0x0f2a1f, wood: 0x2a3a30, rope: 0x6a8a7a, iron: 0x3a5a4a, skin: 0x8affc8, horn: 0x9affd0, bone: 0xb0ffd8, dark2: 0x1a2a24, deep: 0x0a1a12, cape: 0x2a5a4a, sailEm: 0x0a2a1a, rim: 0x3a6a52, sail: '#4a5a50', eye: '#6affb0' };
let G = GH0;
// Helheim's undead fleets, one for each of its seas (key = the sea they sail)
const UND = (name, sail, gc0) => { const gc = { ...GH0, ...gc0, sail }; return { name, ghost: true, undead: true, top: gc.hull, top2: gc.glow, sail: 'ghost', shields: [[gc.dark2, gc.glow]], crew: [gc.tunic], gold: gc.glow, gc }; };
export const HEL_PALS = {
  home: UND('Draugr Longships', '#4a5a50', {}),
  frost: UND('Rime Wraiths', '#5a6a7a', { hull: 0x3a4a5a, dark: 0x1a2430, glow: 0x9ae6ff, emis: 0x0a2a3a, tunic: 0x2a3a4a, trou: 0x1a2430, wood: 0x3a4654, rope: 0x8aa0b0, iron: 0x5a6a7a, skin: 0xbff4ff, horn: 0xe0f8ff, bone: 0xe8f8ff, dark2: 0x1a2430, deep: 0x0a121a, cape: 0x3a5a7a, sailEm: 0x0a1a2a, rim: 0x5a7a9a, eye: '#9ae6ff' }),
  storm: UND('Muspel Burners', '#3a2218', { hull: 0x2a1a14, dark: 0x140c08, glow: 0xff7a2a, emis: 0x3a1000, tunic: 0x3a1a10, trou: 0x1a0c08, wood: 0x2a1a12, rope: 0x8a5a3a, iron: 0x4a3a32, skin: 0xffb070, horn: 0xffd8a0, bone: 0xffe0b0, dark2: 0x1a0e0a, deep: 0x100604, cape: 0x6a2a10, sailEm: 0x3a1000, rim: 0x8a3a1a, eye: '#ff8a2a' }),
  mist: UND('Corpse-ships of Nastrond', '#4a3a4a', { hull: 0x3a2a3a, dark: 0x1e141e, glow: 0xc46aff, emis: 0x220a2a, tunic: 0x2a1a2a, trou: 0x1a101a, wood: 0x3a2a34, rope: 0x7a6a7a, iron: 0x4a3a4a, skin: 0xd8a0ff, horn: 0xe8d0ff, bone: 0xf0e0ff, dark2: 0x1e141e, deep: 0x10080e, cape: 0x4a2a5a, sailEm: 0x1a0a22, rim: 0x6a4a7a, eye: '#c46aff' }),
  barge: UND("Hel's Soul Barge", '#5a4a2a', { hull: 0x4a3a1a, dark: 0x2a2010, glow: 0xffd24a, emis: 0x2a1a00, tunic: 0x3a2a10, trou: 0x1a1408, wood: 0x4a3a20, rope: 0xa8904a, iron: 0x6a5a3a, skin: 0xffe8a0, horn: 0xfff0c0, bone: 0xfff4d0, dark2: 0x2a2010, deep: 0x140c04, cape: 0x6a4a1a, sailEm: 0x2a1a00, rim: 0x8a6a2a, eye: '#ffd24a' }),
  warm: UND('The Bone Fleet', '#c8c0a8', { hull: 0xd8d0bc, dark: 0x6a6250, glow: 0xb06aff, emis: 0x1a1024, tunic: 0x3a3448, trou: 0x241e2a, wood: 0xb8ae98, rope: 0xa89a88, iron: 0x7a7068, skin: 0xf0e8d8, horn: 0xfff8e8, bone: 0xfffaf0, dark2: 0x4a4238, deep: 0x2a2018, cape: 0x5a3a7a, sailEm: 0x140a1e, rim: 0xa89a80, eye: '#b06aff' }),
};

// the shipwright's hull designs (main.js HULLS has the perks): plank colours and the painted top strakes
export const HULL_LOOK = {
  oak: {}, pine: { wood: [0xb88a52, 0xa87a46, 0xc4965c], top: 0x2a6a9a, top2: 0xe8dcc0 }, ash: { wood: [0x9a8a6a, 0x8a7a5c, 0xa69676], top: 0x2f7a3a, top2: 0xe6b43a },
  tar: { wood: [0x2a221c, 0x221c18, 0x30261e], top: 0x8a1a1a, top2: 0x1c1a1a, tar: 0x141010 }, iron: { wood: [0x6a6e74, 0x5e6268, 0x767a80], top: 0x3a3e44, top2: 0xb8322a },
  gilded: { wood: [0x7a4a22, 0x6a4020, 0x84522a], top: 0xe6b43a, top2: 0xa87a1a, gold: 0xffd24a }, dragon: { wood: [0x2a5a3a, 0x24502f, 0x306440], top: 0xc8322a, top2: 0xe6b43a },
  bone: { wood: [0xd8d0bc, 0xc8c0aa, 0xe4dcc8], top: 0x4a2a6a, top2: 0xb06aff, tar: 0x3a3428 },
  frost: { wood: [0x8a9aa8, 0x7a8a98, 0x9aaab8], top: 0x2a4a7a, top2: 0xe8f4ff }, ember: { wood: [0x2a1a14, 0x22140e, 0x321e16], top: 0xc8320a, top2: 0xffb03a, tar: 0x140a06, gold: 0xffb03a },
  draugr: { wood: [0x5a6458, 0x4e584c, 0x667060], top: 0x2a3a2a, top2: 0x7dff9a, tar: 0x1e241e }, ygg: { wood: [0xc8b07a, 0xb89e6a, 0xd4bc86], top: 0x2f7a3a, top2: 0xffd24a, gold: 0xffd24a },
  ivory: { wood: [0xe8e0cc, 0xdcd4c0, 0xf0e8d6], top: 0x2a4a6a, top2: 0xc8322a }, royal: { wood: [0x3a2430, 0x321e2a, 0x422a36], top: 0x6a2a8a, top2: 0xe6b43a }, naglfar: { wood: [0x2a2430, 0x241e2a, 0x302838], top: 0x5a2a7a, top2: 0xb06aff, tar: 0x16121a, gold: 0xb06aff },
};

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
  const wood = (pal.wood || [0x8a5a32, 0x7c4f2b, 0x94643a]).map((h) => new THREE.Color(h)), tar = new THREE.Color(pal.tar || 0x2a1d16), topC = new THREE.Color(pal.top), top2 = new THREE.Color(pal.top2), ghostC = new THREE.Color(G.hull);
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
  const inset = 0.07, ibase = pos.length / 3, iv = 10, inC = new THREE.Color(ghost ? G.dark : 0x5a3a22);
  for (const s of [1, -1]) { const b0 = pos.length / 3;
    for (let i = 0; i <= nU; i++) { const u = i / nU; for (let r = 0; r <= iv; r++) { const q = Ln.sec(u, r / iv); pos.push(s * Math.max(0, q.x - inset), q.y + (r === 0 ? inset : 0), Ln.z(u)); c.copy(inC).multiplyScalar(0.85 + 0.15 * ((r % 2))); col.push(c.r, c.g, c.b); } }
    for (let i = 0; i < nU; i++) for (let r = 0; r < iv; r++) { const a = b0 + i * (iv + 1) + r, b = a + iv + 1; if (s < 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const cb = pos.length / 3, capC = new THREE.Color(ghost ? G.hull : 0x4a2e1a);
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
  const key = kind + tier + (kind === 'ghost' ? G.sail + G.eye : ''); if (sailCache.has(key)) return sailCache.get(key);
  const tex = canvasTex(256, 256, (x, w, h) => {
    const stripes = (a, b, n) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * w) / n, 0, w / n + 1, h); } };
    if (kind === 'pats') {
      if (tier === 0) { x.fillStyle = '#e6dcc4'; x.fillRect(0, 0, w, h); x.fillStyle = '#d4c6a6'; x.fillRect(150, 40, 60, 50); x.fillRect(30, 150, 50, 40); }
      else if (tier < 3) stripes('#b8322a', '#efe4cc', tier === 1 ? 8 : 10);
      else if (tier === 3) { x.fillStyle = '#8a1e1e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e6b43a'; x.lineWidth = 6; for (let i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 40, 0); x.lineTo(i * 40 + h, h); x.stroke(); x.beginPath(); x.moveTo(i * 40 + h, 0); x.lineTo(i * 40, h); x.stroke(); } }
      else if (tier === 4) { stripes('#4a1f6a', '#e6b43a', 6); }
      else { x.fillStyle = '#140c24'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e6b43a'; x.lineWidth = 3; for (let i = 0; i < 2; i++) { x.beginPath(); x.arc(w / 2, h / 2 + 8, 92 + i * 14, 0, 6.28); x.stroke(); }
        x.fillStyle = '#b48aff'; x.font = 'bold 18px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; const R = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'; for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28; x.fillText(R[i], w / 2 + Math.cos(a) * 99, h / 2 + 8 + Math.sin(a) * 99); } }
      if (tier >= 2) { // Pat's crest: crossed axes under a crown on a shield-round
        x.save(); x.translate(w / 2, h / 2); x.fillStyle = tier >= 4 ? '#2a0f3a' : '#1c1a1a'; x.beginPath(); x.arc(0, 8, 62, 0, 6.28); x.fill(); x.strokeStyle = '#e6b43a'; x.lineWidth = 7; x.stroke();
        x.strokeStyle = '#d8d8d8'; x.lineWidth = 8; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * -34, 44); x.lineTo(s * 30, -26); x.stroke(); x.fillStyle = '#d8d8d8'; x.beginPath(); x.moveTo(s * 30, -26); x.quadraticCurveTo(s * 52, -26, s * 46, 2); x.lineTo(s * 22, -14); x.closePath(); x.fill(); }
        x.fillStyle = '#e6b43a'; x.beginPath(); x.moveTo(-30, -18); x.lineTo(-30, -44); x.lineTo(-15, -30); x.lineTo(0, -52); x.lineTo(15, -30); x.lineTo(30, -44); x.lineTo(30, -18); x.closePath(); x.fill(); x.restore(); }
    } else if (kind === 'black') { x.fillStyle = '#1e1c1c'; x.fillRect(0, 0, w, h); x.fillStyle = '#c23b3b'; x.beginPath(); x.arc(w / 2, h / 2, 50, 0, 6.28); x.fill(); x.fillStyle = '#1e1c1c'; x.beginPath(); x.arc(w / 2 - 16, h / 2 - 8, 12, 0, 6.28); x.arc(w / 2 + 16, h / 2 - 8, 12, 0, 6.28); x.fill(); x.fillRect(w / 2 - 20, h / 2 + 20, 40, 10); }
    else if (kind === 'wolf') { stripes('#3a4a5a', '#d8d0c0', 6); x.fillStyle = '#1c1a1a'; x.beginPath(); x.moveTo(90, 160); x.lineTo(100, 80); x.lineTo(120, 110); x.lineTo(140, 110); x.lineTo(160, 80); x.lineTo(168, 160); x.lineTo(128, 190); x.closePath(); x.fill(); x.fillStyle = '#ffd24a'; x.fillRect(110, 130, 10, 6); x.fillRect(138, 130, 10, 6); }
    else if (kind === 'jade') { stripes('#1f6a4a', '#e6c84a', 8); x.fillStyle = '#1f6a4a'; x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 6.28); x.fill(); x.strokeStyle = '#e6c84a'; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2, h / 2 - 34); x.lineTo(w / 2, h / 2 + 34); x.moveTo(w / 2 - 24, h / 2 - 14); x.lineTo(w / 2, h / 2 - 34); x.lineTo(w / 2 + 24, h / 2 - 14); x.stroke(); }
    else if (kind === 'gold') { stripes('#e6b43a', '#f6ecd0', 8); x.fillStyle = '#b8822a'; x.beginPath(); x.arc(w / 2, h / 2, 50, 0, 6.28); x.fill(); x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(w / 2, h / 2, 40, 0, 6.28); x.fill(); x.strokeStyle = '#8a5a1a'; x.lineWidth = 7; x.beginPath(); x.moveTo(w / 2, h / 2 - 26); x.lineTo(w / 2, h / 2 + 26); x.moveTo(w / 2 - 16, h / 2 - 12); x.lineTo(w / 2 + 16, h / 2 - 12); x.moveTo(w / 2 - 16, h / 2 + 12); x.lineTo(w / 2 + 16, h / 2 + 12); x.stroke(); }
    else if (kind === 'stripes') stripes('#b8322a', '#efe4cc', 10);
    else if (kind === 'valkyrie') { x.fillStyle = '#2a4a7a'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2f0e8'; for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(128 + sd * (34 + i * 16), 120 - i * 8 + i * i * 2, 12, 46 - i * 5, sd * (0.5 + i * 0.18), 0, 6.28); x.fill(); } x.fillStyle = '#e6b43a'; x.beginPath(); x.arc(128, 132, 18, 0, 6.28); x.fill(); }
    else if (kind === 'ygg') { x.fillStyle = '#1f4a2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e6c84a'; x.lineCap = 'round'; x.lineWidth = 12; x.beginPath(); x.moveTo(128, 220); x.lineTo(128, 110); x.stroke(); x.lineWidth = 6; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(128, 150 - i * 22); x.quadraticCurveTo(128 + sd * 40, 130 - i * 30, 128 + sd * (70 - i * 12), 96 - i * 20); x.stroke(); x.beginPath(); x.moveTo(128, 200); x.quadraticCurveTo(128 + sd * 30, 214, 128 + sd * (60 + i * 14), 236); x.stroke(); } x.lineWidth = 4; x.beginPath(); x.arc(128, 104, 76, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); }
    else if (kind === 'draugr') { x.fillStyle = '#3a3e3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1c1a'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(i * 30, h); x.lineTo(i * 30 + 14, h - 24 - (i % 3) * 18); x.lineTo(i * 30 + 28, h); x.fill(); } x.fillStyle = '#d8d4c4'; x.beginPath(); x.arc(128, 112, 50, 0, 6.28); x.fill(); x.fillRect(102, 140, 52, 34); x.fillStyle = '#3a3e3a'; for (const sd of [-1, 1]) { x.beginPath(); x.arc(128 + sd * 20, 108, 13, 0, 6.28); x.fill(); } for (let i = 0; i < 4; i++) x.fillRect(106 + i * 13, 158, 4, 16); x.fillStyle = '#7dff9a'; for (const sd of [-1, 1]) { x.beginPath(); x.arc(128 + sd * 20, 108, 5, 0, 6.28); x.fill(); } }
    else if (kind === 'aurora') { x.fillStyle = '#0c1430'; x.fillRect(0, 0, w, h); x.lineCap = 'round'; for (const [col, y0, a] of [['#3affb0', 70, 18], ['#7a5aff', 120, 22], ['#3affb0', 170, 14]]) { x.strokeStyle = col; x.lineWidth = 14; x.globalAlpha = 0.85; x.beginPath(); for (let i = 0; i <= 16; i++) { const px = (i / 16) * w, py = y0 + Math.sin(i * 0.8 + y0) * a; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); } x.globalAlpha = 1; x.fillStyle = '#f2f0e8'; for (let i = 0; i < 18; i++) x.fillRect((i * 53) % w, ((i * 37) % 60) + 6, 2, 2); }
    else if (kind === 'ragnarok') { x.fillStyle = '#120808'; x.fillRect(0, 0, w, h); x.lineWidth = 16; x.strokeStyle = '#c8320a'; x.beginPath(); x.arc(128, 128, 84, 0, 6.28); x.stroke(); x.lineWidth = 6; x.strokeStyle = '#ffb03a'; x.beginPath(); x.arc(128, 128, 84, 0, 6.28); x.stroke(); x.fillStyle = '#ffd25a'; for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; x.beginPath(); x.moveTo(128 + Math.cos(a - 0.12) * 92, 128 + Math.sin(a - 0.12) * 92); x.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); x.lineTo(128 + Math.cos(a + 0.12) * 92, 128 + Math.sin(a + 0.12) * 92); x.fill(); } x.fillStyle = '#ffb03a'; x.beginPath(); x.ellipse(128, 128, 40, 18, 0, 0, 6.28); x.fill(); x.fillStyle = '#120808'; x.beginPath(); x.ellipse(128, 128, 8, 17, 0, 0, 6.28); x.fill(); }
    else if (kind === 'raven') { x.fillStyle = '#4a5a6a'; x.fillRect(0, 0, w, h); x.fillStyle = '#16161a'; x.beginPath(); x.moveTo(128, 70); x.quadraticCurveTo(150, 60, 160, 80); x.lineTo(150, 92); x.quadraticCurveTo(210, 110, 236, 92); x.quadraticCurveTo(200, 150, 150, 150); x.lineTo(160, 200); x.lineTo(128, 160); x.lineTo(96, 200); x.lineTo(106, 150); x.quadraticCurveTo(56, 150, 20, 92); x.quadraticCurveTo(46, 110, 106, 92); x.lineTo(96, 80); x.quadraticCurveTo(106, 60, 128, 70); x.fill(); x.fillStyle = '#e6b43a'; x.fillRect(136, 76, 6, 5); }
    else if (kind === 'sun') { x.fillStyle = '#1f4f8a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 6.28); x.fill(); x.strokeStyle = '#ffd24a'; x.lineWidth = 7; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; x.beginPath(); x.moveTo(w / 2 + Math.cos(a) * 56, h / 2 + Math.sin(a) * 56); x.lineTo(w / 2 + Math.cos(a) * 86, h / 2 + Math.sin(a) * 86); x.stroke(); } x.strokeStyle = '#e8902a'; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, h / 2, 30, 0, 6.28); x.stroke(); }
    else if (kind === 'kraken') { x.fillStyle = '#16121e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7a3aa8'; x.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; x.lineWidth = 12; x.beginPath(); x.moveTo(w / 2, h / 2); x.bezierCurveTo(w / 2 + Math.cos(a) * 60, h / 2 + Math.sin(a) * 60, w / 2 + Math.cos(a + 0.8) * 90, h / 2 + Math.sin(a + 0.8) * 90, w / 2 + Math.cos(a + 0.4) * 120, h / 2 + Math.sin(a + 0.4) * 120); x.stroke(); } x.fillStyle = '#7a3aa8'; x.beginPath(); x.arc(w / 2, h / 2, 34, 0, 6.28); x.fill(); x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(w / 2, h / 2, 12, 0, 6.28); x.fill(); x.fillStyle = '#16121e'; x.fillRect(w / 2 - 2, h / 2 - 10, 4, 20); }
    else if (kind === 'serpent') { stripes('#1f5a3a', '#14402a', 8); x.strokeStyle = '#e6c84a'; x.lineWidth = 16; x.beginPath(); x.arc(w / 2, h / 2, 76, 0.5, 6.28); x.stroke(); x.fillStyle = '#e6c84a'; x.beginPath(); x.ellipse(w / 2 + 70, h / 2 + 34, 20, 13, 0.6, 0, 6.28); x.fill(); x.fillStyle = '#14402a'; x.beginPath(); x.arc(w / 2 + 76, h / 2 + 30, 4, 0, 6.28); x.fill(); }
    else if (kind === 'elder') { x.fillStyle = '#1e3a30'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7affc8'; x.lineWidth = 8; x.beginPath(); x.moveTo(128, 210); x.lineTo(128, 60); for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { x.moveTo(128, 180 - i * 40); x.lineTo(128 + sd * (40 + i * 6), 150 - i * 44); } x.stroke(); x.fillStyle = '#ffe23a'; x.beginPath(); x.ellipse(128, 104, 22, 13, 0, 0, 6.28); x.fill(); x.fillStyle = '#1e3a30'; x.beginPath(); x.ellipse(128, 104, 5, 12, 0, 0, 6.28); x.fill(); }
    else if (kind === 'hel') { x.fillStyle = '#e8e2d4'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#141018'; x.fillRect(w / 2, 0, w / 2, h); x.fillStyle = '#141018'; x.beginPath(); x.arc(w / 2, h / 2, 54, Math.PI / 2, Math.PI * 1.5); x.fill(); x.fillStyle = '#e8e2d4'; x.beginPath(); x.arc(w / 2, h / 2, 54, -Math.PI / 2, Math.PI / 2); x.fill(); x.fillStyle = '#b06aff'; x.beginPath(); x.arc(w / 2 - 20, h / 2 - 8, 8, 0, 6.28); x.arc(w / 2 + 20, h / 2 - 8, 8, 0, 6.28); x.fill(); }
    else if (kind === 'surtr') { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ffb03a'); gr.addColorStop(0.45, '#c8320a'); gr.addColorStop(1, '#2a0a06'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd25a'; for (let i = 0; i < 7; i++) { const cx = 18 + i * 37; x.beginPath(); x.moveTo(cx - 18, h); x.quadraticCurveTo(cx - 14, h - 90 - (i % 3) * 30, cx, h - 150 - (i % 2) * 40); x.quadraticCurveTo(cx + 14, h - 90, cx + 18, h); x.fill(); } x.fillStyle = '#1a0604'; x.beginPath(); x.moveTo(128, 40); x.lineTo(150, 110); x.lineTo(128, 96); x.lineTo(106, 110); x.closePath(); x.fill(); }
    else if (kind === 'nidhogg') { x.fillStyle = '#1a1414'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8d0bc'; for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(128, 120); for (let i = 0; i < 5; i++) { x.lineTo(128 + sd * (30 + i * 22), 60 + i * 8); x.lineTo(128 + sd * (40 + i * 22), 110 + i * 14); } x.lineTo(128, 150); x.closePath(); x.fill(); } x.fillStyle = '#7dff3a'; x.beginPath(); x.arc(118, 100, 6, 0, 6.28); x.arc(138, 100, 6, 0, 6.28); x.fill(); }
    else if (kind === 'blood') { x.fillStyle = '#7a1010'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8b04a'; for (let i = 0; i < 3; i++) { x.save(); x.translate(w / 2, h / 2); x.rotate(i * 2.094); x.beginPath(); x.moveTo(0, 0); x.lineTo(-14, -70); x.lineTo(14, -70); x.closePath(); x.fill(); x.restore(); } }
    else if (kind === 'ghost') { x.fillStyle = G.sail; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; const r = rand(9); for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 18, 4 + r() * 26, r() * 3, 0, 6.28); x.fill(); } for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(i * 30, h); x.lineTo(i * 30 + 14, h - 30 - r() * 40); x.lineTo(i * 30 + 28, h); x.fill(); }
      x.globalCompositeOperation = 'source-over'; x.fillStyle = G.eye; x.beginPath(); x.arc(w / 2 - 22, h / 2 - 10, 10, 0, 6.28); x.arc(w / 2 + 22, h / 2 - 10, 10, 0, 6.28); x.fill(); }
    // weave and shading
    x.fillStyle = 'rgba(0,0,0,0.07)'; for (let i = 0; i < h; i += 4) x.fillRect(0, i, w, 1); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
  sailCache.set(key, tex); return tex;
}
function sailGeometry(w, h, bulge) { const g = new THREE.PlaneGeometry(w, h, 10, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = (p.getY(i) + h / 2) / h; p.setZ(i, bulge * (1 - x * x) * (0.35 + 0.65 * Math.sin(y * Math.PI * 0.85 + 0.15))); p.setY(i, p.getY(i) - h / 2); } g.computeVertexNormals(); return g; }

// ---------- figures ----------
const SKIN = [0xf0c8a0, 0xe0b088, 0xc89070, 0xa87050], BEARD = [0xb85a1a, 0x6a3a1a, 0xe0c070, 0x3a2414, 0xd8d0c0, 0xc8641a];
function viking(parent, r, pal, pose = 'row', ghost = false) {
  const g = grp(parent); const skin = ghost ? M(G.skin, 'glow') : M(SKIN[(r() * SKIN.length) | 0]), tunic = M(ghost ? G.tunic : pal.crew[(r() * pal.crew.length) | 0]), trou = M(ghost ? G.trou : [0x4a3a2a, 0x3a3a3a, 0x5a4a3a][(r() * 3) | 0]);
  const beardC = M(ghost ? G.glow : BEARD[(r() * BEARD.length) | 0]), iron = M(ghost ? G.hull : 0x8a8f96), leather = M(0x4a2e1a), horn = M(ghost ? G.horn : 0xe8dcc0);
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
  if (pose === 'captain') { part(g, BOX(), M(ghost ? G.cape : 0x8a1a1a), 0.36, 0.42, 0.04, 0, 0.6, -0.13); part(g, SPH_LO(), M(0xc8b090), 0.36, 0.08, 0.2, 0, 0.82, -0.04); }
  if (pose === 'look') { rod(g, M(0x6a4a2a), V(0.2, 0.2, 0), V(0.2, 1.1, 0), 0.02); part(g, CON4(), iron, 0.06, 0.16, 0.03, 0.2, 1.18, 0); }
  return g;
}
const CON4 = () => CON();

// ---------- heads and tails for the stems ----------
function dragonHead(parent, sc, kind, pal, ghost) {
  const h = grp(parent); h.scale.setScalar(sc); const gold = kind === 'royal', main = ghost ? M(G.hull) : M(gold ? pal.gold : kind === 'dragon' ? 0x8a2a1a : 0x3a2a1a), dark = ghost ? M(G.dark2) : M(gold ? 0xa87a1a : 0x1c1414), bone = M(ghost ? G.bone : 0xf2ead8);
  const eye = ghost || gold ? M(ghost ? G.glow : 0xff5a1a, 'glow') : M(0xe6b43a), red = M(ghost ? G.deep : 0x6a1010);
  part(h, SPH(), main, 0.5, 0.42, 0.62, 0, 0.05, 0.05); part(h, RBX(), main, 0.34, 0.24, 0.5, 0, 0.0, 0.42); part(h, SPH(), main, 0.3, 0.2, 0.22, 0, 0.02, 0.66);
  for (const s of [-1, 1]) { part(h, SPH_LO(), dark, 0.07, 0.05, 0.05, s * 0.08, 0.1, 0.74); part(h, SPH(), eye, 0.12, 0.1, 0.1, s * 0.17, 0.16, 0.26); part(h, CAP(), dark, 0.07, 0.16, 0.07, s * 0.15, 0.24, 0.27, 0, 0, Math.PI / 2 + s * 0.4);
    part(h, CON(), bone, 0.09, 0.5, 0.09, s * 0.15, 0.38, -0.12, -0.9, 0, -s * 0.25); part(h, CON(), dark, 0.05, 0.3, 0.2, s * 0.24, 0.12, -0.12, -1.2, 0, -s * 0.9); }
  const jaw = grp(h, 0, -0.12, 0.1); jaw.rotation.x = 0.32; part(jaw, RBX(), dark, 0.3, 0.09, 0.56, 0, -0.04, 0.32); part(jaw, SPH(), red, 0.24, 0.05, 0.42, 0, 0.0, 0.3);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { part(h, CON(), bone, 0.035, 0.09, 0.035, s * (0.13 - i * 0.008), -0.13, 0.28 + i * 0.09, Math.PI); part(jaw, CON(), bone, 0.03, 0.07, 0.03, s * (0.11 - i * 0.008), 0.03, 0.18 + i * 0.08); }
  for (let i = 0; i < 4; i++) part(h, CON(), dark, 0.12, 0.3 - i * 0.04, 0.04, 0, 0.12 - i * 0.04, -0.3 - i * 0.16, -1.4);
  return h;
}
// Naglfar's figurehead: a great bone skull with burning eye sockets, a broken jaw and horns
function skullHead(parent, sc, pal, ghost) { const h = grp(parent); h.scale.setScalar(sc); const bone = M(ghost ? G.bone : 0xe8e0cc), dark = M(0x16121a), eye = M(ghost ? G.glow : 0xb06aff, 'glow');
  part(h, SPH(), bone, 0.62, 0.56, 0.66, 0, 0.12, 0); part(h, RBX(), bone, 0.42, 0.22, 0.4, 0, -0.12, 0.2); for (const s of [-1, 1]) { part(h, SPH(), dark, 0.18, 0.16, 0.1, s * 0.14, 0.14, 0.3); part(h, SPH_LO(), eye, 0.09, 0.09, 0.06, s * 0.14, 0.14, 0.33); part(h, CON(), bone, 0.1, 0.6, 0.1, s * 0.26, 0.42, -0.1, -0.6, 0, -s * 0.7); }
  part(h, CON4(), dark, 0.08, 0.1, 0.06, 0, 0.0, 0.36, Math.PI); const jaw = grp(h, 0, -0.26, 0.06); jaw.rotation.x = 0.28; part(jaw, RBX(), bone, 0.36, 0.08, 0.34, 0, 0, 0.16); for (let i = 0; i < 5; i++) part(h, BOX(), bone, 0.05, 0.08, 0.04, (i - 2) * 0.07, -0.25, 0.36); return h; }
function serpentHead(parent, sc, pal, ghost) { const h = grp(parent); h.scale.setScalar(sc); const main = M(ghost ? G.hull : 0x2a1f16), acc = M(ghost ? G.glow : pal.top);
  part(h, SPH(), main, 0.36, 0.3, 0.7, 0, 0, 0.18); part(h, SPH(), main, 0.26, 0.2, 0.3, 0, -0.02, 0.5); for (const s of [-1, 1]) { part(h, SPH(), M(ghost ? G.glow : 0xe6b43a, ghost ? 'glow' : 'skin'), 0.09, 0.07, 0.07, s * 0.12, 0.08, 0.32); part(h, CON(), acc, 0.04, 0.22, 0.12, s * 0.12, 0.16, -0.05, -1.1, 0, -s * 0.4); }
  for (let i = 0; i < 4; i++) part(h, CON(), acc, 0.05, 0.16, 0.12, 0, 0.14 - i * 0.02, 0.1 - i * 0.14, -1.3); return h; }

// ---------- the ship ----------
// up = { shields, armor, ballista, fire, ram, sail } (levels); pal = colours; returns the group and handles for animation
// treasure chests with glowing gold lids along the deck (the treasure knarr)
export function addCargo(s) { const t = s.t; for (let i = 0; i < 6; i++) { const z = (i / 5 - 0.5) * t.L * 0.45, x = (i % 2 ? 1 : -1) * t.B * 0.16; const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), M(0x7a4a22)); c.position.set(x, s.deckY + 0.3, z); s.body.add(c); const l = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.54), M(0xe6b43a, 'glow')); l.position.set(x, s.deckY + 0.6, z); s.body.add(l); } }
export function buildShip(tier = 0, up = {}, pal = PLAYER_PAL, seed = 1) {
  const t0 = SHIP_TIERS[Math.max(0, Math.min(SHIP_TIERS.length - 1, tier))], t = t0.head === 'naglfar' && (RAIDER_PALS.includes(pal) || pal === TREASURE_PAL || pal === GHOST_PAL) ? { ...t0, head: 'wyrm' } : t0, ghost = !!pal.ghost, r = rand(seed * 977 + tier * 31); G = pal.gc || GH0;
  const root = new THREE.Group(), body = grp(root), st = grp(body); // st: static parts (merged)
  const { g: hullG, Ln } = hullGeometry(t, pal, ghost); const hull = new THREE.Mesh(hullG, ghost ? new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: pal.gc && pal.gc.opaque ? 1 : 0.85, emissive: G.emis }) : VC.lambert); body.add(hull);
  if (!deckMat) { deckMat = new THREE.MeshLambertMaterial({ map: plankTex() }); deckMat.userData.shared = true; }
  const { g: deckG, deckY } = deckGeometry(t, Ln); body.add(new THREE.Mesh(deckG, ghost ? M(G.dark) : deckMat));
  const wood = M(ghost ? G.wood : 0x6a4426), dwood = M(ghost ? G.dark : 0x4a2e18), rope = M(ghost ? G.rope : 0xc8b08a), iron = M(ghost ? G.iron : 0x5a5e66), gold = M(ghost ? G.glow : pal.gold);
  // benches (thwarts) and ribs
  const nB = Math.max(2, t.oars + (tier === 0 ? 0 : 1)), z0 = -t.L * 0.33, z1 = t.L * 0.33, benches = [];
  for (let i = 0; i < nB; i++) { const z = z0 + ((z1 - z0) * (i + 0.5)) / nB, u = z / t.L + 0.5, y = deckY + t.D * 0.22, v = Ln.vAt(u, y), q = Ln.sec(u, v); part(st, BOX(), wood, q.x * 2 - 0.1, 0.07, 0.24, 0, y, z); benches.push({ z, y, w: q.x }); }
  for (let i = 0; i <= nB + 2; i++) { const z = -t.L * 0.4 + (t.L * 0.8 * i) / (nB + 2), u = z / t.L + 0.5; for (const s of [-1, 1]) { const a = Ln.sec(u, 0.45), b = Ln.sec(u, 0.97); rod(st, dwood, V(s * (a.x - 0.09), a.y, z), V(s * (b.x - 0.08), b.y, z), 0.035); } }
  // stems
  const uEnd = 1, topE = Ln.top(uEnd), keelE = Ln.keel(uEnd), postH = t.rise * 0.9 + t.B * 0.25, half = t.L / 2;
  const bowPts = curvePts([V(0, keelE - 0.05, half * 0.96), V(0, (keelE + topE) / 2, half * 1.02), V(0, topE, half * 1.05), V(0, topE + postH * 0.55, half * 1.08), V(0, topE + postH, half * 1.06)], 22);
  const postMat = ghost ? M(G.hull) : M(pal.top2 === 0x1c1a1a ? 0x5a3a20 : 0x5a3a20);
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
    body.add(new THREE.Mesh(taperTube(tailPts, { radial: 7, r: (s) => (0.08 - s * 0.07) * t.B / 2.6 + 0.005, ref: V(1, 0, 0) }), ghost ? M(G.hull) : M(t.head === 'royal' ? pal.gold : 0x8a2a1a)));
    for (let i = 1; i < tailPts.length - 1; i += 2) part(st, CON(), ghost ? M(G.glow) : M(t.head === 'royal' ? 0xa87a1a : 0x1c1414), 0.05 * t.B, 0.22 * t.B / 2.6, 0.03 * t.B, 0, tailPts[i].y + 0.08, tailPts[i].z - 0.04, -0.6); }
  else if (t.head === 'wyrm') { const h = dragonHead(st, t.B * 0.42, 'royal', pal, ghost); h.position.set(0, headAt.y + 0.12 * t.B, headAt.z + 0.05); h.rotation.x = -0.15;
    for (let i = 0; i < 7; i++) part(st, CON(), gold, 0.06 * t.B, 0.3 * t.B / 2.6, 0.03 * t.B, 0, headAt.y - 0.25 - i * 0.32, headAt.z - 0.18 - i * 0.07, -0.5); }
  else if (t.head === 'naglfar') { const h = skullHead(st, t.B * 0.36, pal, ghost); h.position.set(0, headAt.y + 0.1 * t.B, headAt.z + 0.05); h.rotation.x = -0.12;
    // Naglfar is built from the nails of the dead: iron spikes stud the stem and stern posts
    const nail = M(0x9a9aa4, 'metal'); for (const pts of [bowPts, sternPts]) for (let i = 3; i < pts.length - 2; i += 2) for (const sd of [-1, 1]) part(st, CON(), nail, 0.05 * t.B / 2.6 * 2, 0.32, 0.05 * t.B / 2.6 * 2, sd * 0.16 * t.B / 2.6, pts[i].y, pts[i].z, 0, 0, -sd * Math.PI / 2); }
  else if (t.head === 'serpent') { const h = serpentHead(st, t.B * 0.3, pal, ghost); h.position.set(0, headAt.y + 0.05, headAt.z + 0.08); h.rotation.x = 0.2; }
  else { part(st, SPH(), gold, 0.12, 0.12, 0.12, 0, headAt.y + 0.04, headAt.z); }
  if (t.head === 'royal' || t.head === 'wyrm') for (const s of [-1, 1]) { const b = grp(st, 0, headAt.y - 0.5, headAt.z - 0.3); part(b, BOX(), gold, 0.04, 0.04, 1.4, s * 0.08, 0, -0.6); }
  // mast, yard, sail, rigging
  const mastZ = t.L * 0.04, mastTop = deckY + t.mast;
  part(st, CYL(), wood, t.B * 0.07, t.mast, t.B * 0.07, 0, deckY + t.mast / 2, mastZ); part(st, BOX(), dwood, t.B * 0.18, 0.18, t.B * 0.5, 0, deckY + 0.1, mastZ); // mast fish (keelson block)
  part(st, CYL(), dwood, t.B * 0.09, 0.14, t.B * 0.09, 0, mastTop + 0.05, mastZ); part(st, SPH(), gold, t.B * 0.07, t.B * 0.07, t.B * 0.07, 0, mastTop + 0.18, mastZ);
  const [sw, sh] = t.sail, yardY = mastTop - 0.35, yard = grp(body, 0, yardY, mastZ + t.B * 0.05);
  part(yard, CYL(), wood, 0.07 * t.B / 2, sw * 1.08, 0.07 * t.B / 2, 0, 0, 0, 0, 0, Math.PI / 2);
  const sailMat = new THREE.MeshLambertMaterial({ map: sailTexture(pal.sail, pal.sail === 'pats' ? Math.min(tier, up.sail ?? tier) : tier), side: THREE.DoubleSide, transparent: ghost, alphaTest: ghost ? 0.3 : 0, emissive: ghost ? G.sailEm : 0x000000 });
  const sail = new THREE.Mesh(sailGeometry(sw, sh, sw * 0.16), sailMat); sail.position.set(0, -0.08, 0.02); yard.add(sail);
  const foot = part(yard, CYL(), dwood, 0.04, sw * 0.98, 0.04, 0, -sh + 0.02, sw * 0.03, 0, 0, Math.PI / 2); void foot;
  const rig = []; const gw = (u) => { const q = Ln.sec(u, 1); return q; };
  for (const s of [-1, 1]) for (const u of [0.42, 0.5]) { const q = gw(u); rig.push(V(0, mastTop - 0.1, mastZ), V(s * q.x, q.y, (u - 0.5) * t.L)); }
  rig.push(V(0, mastTop, mastZ), V(0, Ln.top(0.97) + 0.1, t.L * 0.47), V(0, mastTop, mastZ), V(0, Ln.top(0.03) + 0.1, -t.L * 0.47));
  for (const s of [-1, 1]) { rig.push(V(s * sw * 0.54, yardY, mastZ + t.B * 0.05), V(s * gw(0.35).x, gw(0.35).y, -t.L * 0.15)); rig.push(V(s * sw * 0.5, yardY - sh, mastZ + t.B * 0.05 + sw * 0.03), V(s * gw(0.3).x, gw(0.3).y, -t.L * 0.2)); }
  const rigLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rig), new THREE.LineBasicMaterial({ color: ghost ? G.glow : 0x2a1f16, transparent: ghost, opacity: ghost ? 0.5 : 1 })); body.add(rigLines);
  // a pennant at the masthead
  const flagMat = new THREE.MeshLambertMaterial({ color: ghost ? G.glow : pal.top, side: THREE.DoubleSide }); const flagGeo = new THREE.PlaneGeometry(t.B * 0.5, t.B * 0.16, 6, 1); flagGeo.translate(-t.B * 0.25, 0, 0);
  const flag = new THREE.Mesh(flagGeo, flagMat); flag.position.set(0, mastTop + 0.1, mastZ); flag.rotation.y = Math.PI / 2; body.add(flag);
  // shields along both rails (outside the top strake)
  const shieldN = Math.min(t.oars * 2 + 2, [0, 4, 10, 40, 60, 80][Math.min(5, up.shields || 0)]);
  if (shieldN > 0) { const lvl = up.shields || 0, sr = Math.min(0.36, t.B * 0.13), perSide = Math.ceil(shieldN / 2);
    for (const s of [-1, 1]) for (let i = 0; i < perSide; i++) { const z = -t.L * 0.32 + (t.L * 0.64 * (i + 0.5)) / perSide, u = z / t.L + 0.5, q = Ln.sec(u, 0.93), pc = pal.shields[(i + (s > 0 ? 0 : 1)) % pal.shields.length];
      const sg = grp(st, s * (q.x + 0.06), q.y, z); sg.rotation.z = s * -Math.PI / 2; sg.rotation.y = 0;
      part(sg, DISC(), M(lvl === 1 ? 0x9a6a3a : pc[0]), sr * 2, 0.04, sr * 2, 0, 0, 0); if (lvl >= 2) { const hh = part(sg, HALF(), M(pc[1]), sr * 1.96, sr * 1.96, 1, 0, 0.022, 0, -Math.PI / 2); hh.rotation.z = (i % 2) * Math.PI / 2; }
      part(sg, SPH_LO(), lvl >= 4 ? M(lvl >= 5 ? 0xffd24a : 0xb48aff, 'glow') : lvl >= 3 ? gold : iron, sr * 0.5, sr * 0.4, sr * 0.5, 0, 0.03, 0); if (lvl >= 3) part(sg, TOR(), iron, sr * 2, sr * 2, 0.6, 0, 0.02, 0, Math.PI / 2); } }
  // iron plating along the waterline
  if (up.armor) { const n = Math.round(t.L * 1.1); for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const z = -t.L * 0.38 + (t.L * 0.76 * (i + 0.5)) / n, u = z / t.L + 0.5, v = Ln.vAt(u, 0.12), q = Ln.sec(u, v), q2 = Ln.sec(u, Math.min(1, v + 0.15));
      const pl = grp(st, s * (q.x + 0.05), q.y + 0.04, z); pl.rotation.z = s * -Math.atan2(q2.x - q.x, q2.y - q.y) * 0.6; part(pl, BOX(), up.armor >= 4 ? M(0x2e3038, 'metal') : iron, 0.04, 0.32 + Math.min(3, up.armor) * 0.12, t.L * 0.76 / n * 0.92, 0, 0, 0);
      if (up.armor >= 2) for (const dy of [-0.12, 0.12]) part(pl, SPH_LO(), up.armor >= 4 ? M(up.armor >= 5 ? 0xffd24a : 0xb48aff, 'glow') : M(0x9aa0a8), 0.05, 0.05, 0.05, s * 0.025, dy, 0); } }
  // ram
  if (up.ram) { const rg = grp(st, 0, 0.0, half * 0.98); part(rg, CON(), iron, 0.32 * t.B / 2.6 * (1 + up.ram * 0.3), 1.1 + up.ram * 0.4, 0.22 * t.B / 2.6 * (1 + up.ram * 0.3), 0, 0, 0.5, Math.PI / 2); part(rg, TOR(), iron, 0.4 * t.B / 2.6, 0.4 * t.B / 2.6, 0.8, 0, 0, 0.05); }
  // ballista at the bow
  let ballista = null;
  if (up.ballista) { const bz = t.L * 0.33, u = bz / t.L + 0.5; ballista = grp(body, 0, deckY + t.D * 0.35, bz); const bs = 0.7 + Math.min(4, up.ballista) * 0.18 + Math.min(5, tier) * 0.12; ballista.scale.setScalar(bs);
    part(ballista, BOX(), dwood, 0.2, 0.5, 0.2, 0, 0.25, 0); part(ballista, BOX(), wood, 0.22, 0.16, 1.3, 0, 0.55, 0.1); for (const s of [-1, 1]) { rod(ballista, dwood, V(0, 0.6, 0.55), V(s * 0.65, 0.66, 0.35), 0.045); part(ballista, SPH_LO(), iron, 0.1, 0.1, 0.1, s * 0.66, 0.66, 0.35); }
    const str = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(-0.65, 0.66, 0.35), V(0, 0.64, -0.2), V(0, 0.64, -0.2), V(0.65, 0.66, 0.35)]), new THREE.LineBasicMaterial({ color: 0xd8c8a0 })); ballista.add(str);
    const bolt = grp(ballista, 0, 0.66, 0.2); part(bolt, CYL6(), wood, 0.05, 1.2, 0.05, 0, 0, 0, Math.PI / 2); part(bolt, CON(), up.ballista >= 4 ? M(up.ballista >= 5 ? 0xffd24a : 0xb48aff, 'glow') : iron, 0.09, 0.22, 0.09, 0, 0, 0.66, Math.PI / 2); ballista.userData.bolt = bolt; void u;
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
  const cap = viking(st, r, pal, 'captain', ghost); cap.position.set(-t.B * 0.12, deckY + 0.05, -t.L * 0.38); cap.scale.setScalar(Math.min(1.4, 1 + tier * 0.08));
  if (crewN > 3) { const lk = viking(st, r, pal, 'look', ghost); lk.position.set(t.B * 0.1, deckY + 0.05, t.L * 0.36); lk.scale.setScalar(Math.min(1.35, 1 + tier * 0.06)); }
  // steering oar on the starboard quarter (the steer-board side, -x when facing +z)
  { const q = Ln.sec(0.12, 1), so = grp(st, -(q.x + 0.12), q.y, -t.L * 0.38); part(so, BOX(), dwood, 0.12, 0.22, 0.22, 0, 0, 0); rod(so, wood, V(0, 0.6, 0.1), V(0, -t.D * 1.05, -0.25), 0.06); part(so, BOX(), wood, 0.06, t.D * 0.75, 0.4, 0, -t.D * 0.75, -0.25); rod(so, wood, V(0, 0.6, 0.1), V(0.6, 0.7, 0.2), 0.03); }
  // oars: one instanced mesh, rowed in animation
  let oars = null, oarSlots = [];
  if (t.oars) { const oL = t.B * 0.95 + 1.2, og = new THREE.CylinderGeometry(0.035, 0.04, oL, 6); og.rotateZ(Math.PI / 2); og.translate(oL / 2 - 0.4, 0, 0); const blade = new THREE.BoxGeometry(0.5, 0.03, 0.16); blade.translate(oL - 0.5, 0, 0);
    const merged = mergeGeos([og, blade]); oars = new THREE.InstancedMesh(merged, M(ghost ? G.hull : 0x9a7048), t.oars * 2); oars.frustumCulled = false; body.add(oars);
    for (let i = 0; i < t.oars; i++) for (const s of [-1, 1]) { const z = -t.L * 0.3 + (t.L * 0.6 * (i + 0.5)) / t.oars, u = z / t.L + 0.5, q = Ln.sec(u, 0.9); oarSlots.push({ s, p: V(s * q.x, q.y, z), ph: i * 0.05 }); } }
  // lantern for night
  const lantern = part(body, SPH_LO(), M(ghost ? G.glow : 0xffc86a, 'glow'), 0.18, 0.22, 0.18, 0, Ln.top(0.04) + postH * 0.4, -t.L * 0.44); lantern.visible = ghost;
  // lantern upgrade: a stern lantern on an iron post, then bow and mast lanterns, then two great iron fire braziers
  const lamps = [lantern], braziers = [], lv = up.lights || 0, lampOn = M(0xffc86a, 'glow');
  const lampAt = (x, y, z, post) => { if (post) rod(st, iron, V(x, deckY, z), V(x, y + 0.35, z), 0.05); const hous = grp(st, x, y, z); part(hous, BOX(), dwood, 0.42, 0.06, 0.42, 0, 0.3, 0); part(hous, BOX(), dwood, 0.42, 0.06, 0.42, 0, -0.3, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(hous, BOX(), iron, 0.04, 0.6, 0.04, a * 0.19, 0, b * 0.19); part(hous, CON(), iron, 0.5, 0.25, 0.5, 0, 0.45, 0); const g = part(body, SPH_LO(), lampOn, 0.3, 0.42, 0.3, x, y, z); g.visible = false; lamps.push(g); };
  if (lv >= 1 && !ghost) lampAt(0.35, Ln.top(0.06) + 0.5, -t.L * 0.4, true);
  if (lv >= 2 && !ghost) { lampAt(0, Ln.top(0.94) + 0.45, t.L * 0.41, true); lampAt(0, deckY + t.mast * 0.55, mastZ + t.B * 0.1, false); }
  if (lv >= 3 && !ghost) for (const sd of [-1, 1]) { const q = Ln.sec(0.78, Ln.vAt(0.78, deckY + 0.2)), bx = sd * Math.max(0.3, q.x - 0.45), bz = t.L * 0.28; for (const a of [0, 2.1, 4.2]) rod(st, iron, V(bx + Math.cos(a) * 0.3, deckY, bz + Math.sin(a) * 0.3), V(bx, deckY + 0.9, bz), 0.04); const bowl = part(st, CYL(), iron, 0.75, 0.3, 0.75, bx, deckY + 1.0, bz); void bowl; part(st, TOR(), M(0x3a3a3e), 0.8, 0.8, 1.4, bx, deckY + 1.15, bz, Math.PI / 2); const fl = part(body, CON(), M(0xff8a2a, 'glow'), 0.55, 0.9, 0.55, bx, deckY + 1.55, bz); const fl2 = part(body, CON(), M(0xffe27a, 'glow'), 0.3, 0.6, 0.3, bx, deckY + 1.45, bz); fl.visible = fl2.visible = false; braziers.push(fl, fl2); }
  // merge the static parts: flatten nested groups first so each material becomes one mesh
  flatten(st); mergeParts(st);
  // ---------- battle damage you can see: holes and cracks in the strakes, a torn sail, fires on deck ----------
  // setDamage(k), k = share of the hull lost (0..1): every mark has its own threshold, so they come and go as the hull is
  // hurt and mended; the sail tears in stages; fireSpots() tells main.js where to send smoke and sparks up
  const dmg = { k: -1, stage: -1, marks: [], fires: [] };
  { const holeMat = new THREE.MeshBasicMaterial({ color: ghost ? G.deep : 0x140b06, side: THREE.DoubleSide }), rimMat = new THREE.MeshBasicMaterial({ color: ghost ? G.rim : 0x9a7048, side: THREE.DoubleSide });
    const jag = (n, rx, ry, rough) => { const s = new THREE.Shape(); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, f = 1 - rough * r(); if (i) s.lineTo(Math.cos(a) * rx * f, Math.sin(a) * ry * f); else s.moveTo(Math.cos(a) * rx * f, Math.sin(a) * ry * f); } s.closePath(); return new THREE.ShapeGeometry(s); };
    const N = 8 + tier * 2;
    for (let i = 0; i < N; i++) { const side = i % 2 ? 1 : -1, u = 0.18 + r() * 0.64, crack = r() < 0.45, y = 0.15 + r() * Math.max(0.2, Ln.top(u) - 0.45), q = Ln.sec(u, Ln.vAt(u, y));
      const g = grp(body, side * (q.x + 0.04), y, Ln.z(u)); g.rotation.y = side * Math.PI / 2; g.rotation.z = (r() - 0.5) * (crack ? 1.4 : 0.6); // facing out of the side
      const sz = (0.18 + r() * 0.2) * Math.min(1.6, t.D);
      if (crack) g.add(new THREE.Mesh(jag(9, sz * 2.4, sz * 0.22, 0.6), holeMat));
      else { g.add(new THREE.Mesh(jag(10, sz * 1.25, sz, 0.45), rimMat)); const h = new THREE.Mesh(jag(9, sz, sz * 0.8, 0.5), holeMat); h.position.z = 0.012; g.add(h); }
      g.visible = false; dmg.marks.push({ g, at: 0.12 + (i / N) * 0.7 + r() * 0.06 }); }
    const fl = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), core = new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    const nF = 2 + Math.min(2, tier);
    for (let i = 0; i < nF; i++) { const z = (r() - 0.5) * t.L * 0.6, u = z / t.L + 0.5, q = Ln.sec(u, Ln.vAt(u, deckY + 0.2)), x = (r() - 0.5) * Math.max(0.2, q.x - 0.3) * 1.2, s = (0.5 + r() * 0.4) * Math.min(1.8, 0.6 + t.B * 0.25);
      const f = grp(body, x, deckY + 0.05, z), o = new THREE.Mesh(new THREE.ConeGeometry(0.35 * s, 1.3 * s, 7), fl), c = new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, 0.8 * s, 6), core); o.position.y = 0.6 * s; c.position.y = 0.4 * s; f.add(o, c);
      f.visible = false; dmg.fires.push({ f, o, c, at: 0.55 + (i / nF) * 0.3, ph: r() * 6 }); } }
  // the sail: an alpha map with ragged holes, then a long rip up from the foot
  let tornTex = null; const tear = (stage) => { if (ghost) return;
    if (!tornTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; tornTex = new THREE.CanvasTexture(cv); tornTex.userData.cv = cv; }
    const g2 = tornTex.userData.cv.getContext('2d'), rr = rand(seed * 131 + 7); g2.fillStyle = '#fff'; g2.fillRect(0, 0, 128, 128); g2.fillStyle = g2.strokeStyle = '#000';
    for (let i = 0; i < [0, 0, 2, 4, 7][stage]; i++) { const cx = 14 + rr() * 100, cy = 12 + rr() * 96, rad = 5 + rr() * 9; g2.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, f = 0.55 + rr() * 0.45; if (k) g2.lineTo(cx + Math.cos(a) * rad * f, cy + Math.sin(a) * rad * f); else g2.moveTo(cx + Math.cos(a) * rad * f, cy + Math.sin(a) * rad * f); } g2.closePath(); g2.fill(); }
    if (stage >= 3) { let x = 30 + rr() * 68, y = 128; g2.lineWidth = stage >= 4 ? 7 : 5; g2.beginPath(); g2.moveTo(x, y); while (y > (stage >= 4 ? 26 : 62)) { y -= 7 + rr() * 8; x += (rr() - 0.5) * 14; g2.lineTo(x, y); } g2.stroke(); }
    tornTex.needsUpdate = true; sailMat.alphaMap = stage >= 2 ? tornTex : null; sailMat.alphaTest = stage >= 2 ? 0.5 : 0; sailMat.needsUpdate = true; };
  function setDamage(k) { k = Math.max(0, Math.min(1, k || 0)); if (Math.abs(k - dmg.k) < 0.01) return; dmg.k = k;
    for (const m of dmg.marks) m.g.visible = k >= m.at; for (const f of dmg.fires) f.f.visible = k >= f.at;
    const stage = k < 0.3 ? 0 : k < 0.45 ? 1 : k < 0.6 ? 2 : k < 0.78 ? 3 : 4; if (stage !== dmg.stage) { dmg.stage = stage; tear(stage); } }
  const fireSpots = () => dmg.fires.filter((f) => f.f.visible).map((f) => f.f.getWorldPosition(new THREE.Vector3()));
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
    for (const f of dmg.fires) if (f.f.visible) { const fl = 0.8 + Math.sin(time * 13 + f.ph) * 0.15 + Math.sin(time * 23 + f.ph * 2) * 0.08; f.o.scale.set(1, fl, 1); f.c.scale.set(1, 1.9 - fl, 1); f.o.rotation.y = time * 2 + f.ph; }
  }
  return { g: root, body, t, tier, anim, len: t.L, beam: t.B, mastTop, deckY, sail, ballista, bowZ: half * 1.06, sailMat, hull, mask, setDamage, fireSpots, dmg };
}

function flatten(st) { st.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(st.matrixWorld).invert(); const list = []; st.traverse((o) => { if (o.isMesh && o.parent !== st) list.push(o); });
  for (const m of list) { const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); m.parent.remove(m); mw.decompose(m.position, m.quaternion, m.scale); st.add(m); }
  for (const c of [...st.children]) if (!c.isMesh && c.children.length === 0) st.remove(c); }
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function mergeGeos(list) { return mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (a !== 'position' && a !== 'normal') n.deleteAttribute(a); return n; })); }
export { flatten };

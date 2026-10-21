// Valhalla's Tide: the sea monsters. Every creature is built from smooth shapes and live "spine tubes" (bodies that bend every
// frame), with teeth, slit eyes, fins, suckers, horns and glowing markings, in several colour variants each:
// sharks, sea serpents (and the winged sea dragon), lightning eels, giant octopus, the kraken, iron crabs, abyssal anglers,
// storm jellyfish, leviathan whales, the Elder One rising from the deep, and Jormungandr the world serpent.
// Interface: makeMonster(type, variant, scale) -> { g, size, top, anim(dt, st), mats, name }
//   g faces +z and sits at the sea surface (the game sets g.position to the water height and g.rotation.y to the heading).
//   st = { t, speed 0..1, attack 0..1 (lunge / slam), dive 0..1 (0 surfaced), hurt 0..1, rise 0..1 (bosses) }
import * as THREE from 'three';
import { M, part, grp, rod, V, SpineTube, taperTube, curvePts, orient, SPH, SPH_LO, CAP, CON, CON4, CYL, BOX, RBX, TOR, glowVC, FAN, FINTRI, CRESCENT, WING, hash2, smooth } from './geom.js';
import { mergeParts } from './perf.js';

const TAU = Math.PI * 2, tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const lerp = (a, b, k) => a + (b - a) * k;

// skin colour along a tube: top colour with a pattern, countershaded belly, darker ridge
function skin(P, s, a, c, freq = 60) {
  const down = -Math.cos(a), belly = smooth(0.15, 0.7, down); c.setHex(P.top); let k = 0;
  switch (P.pattern) {
    case 'stripes': k = Math.sin(s * freq) > 0.45 ? 1 : 0; break;
    case 'bands': k = Math.sin(s * freq * 0.45) > 0.25 ? 1 : 0; break;
    case 'diamond': { const u = (s * freq / 4.5) % 1, v = ((a / TAU) * 4 + 0.5) % 1; k = Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.3 ? 1 : 0; break; }
    case 'spots': k = hash2(Math.floor(s * freq * 1.3), Math.floor(a * 2.6)) > 0.72 ? 1 : 0; break;
    case 'rings': k = Math.abs(Math.sin(s * freq * 0.6)) > 0.93 ? 1 : 0; break;
    case 'scars': k = Math.abs(Math.sin(s * 37 + a * 3)) > 0.985 || Math.abs(Math.sin(s * 23 - a * 5)) > 0.99 ? 1 : 0; break;
    case 'runes': k = (Math.abs(Math.sin(s * freq * 0.5)) > 0.9 && Math.cos(a) > 0.2) ? 1 : 0; break;
  }
  if (k) c.lerp(tmpC.setHex(P.accent), 0.85);
  c.lerp(tmpC.setHex(P.belly), belly); c.multiplyScalar(0.82 + 0.18 * (1 - Math.max(0, Math.cos(a))) );
}
const glowAt = (P, s, a, freq = 60) => { if (!P.glow) return 0; if (P.pattern === 'runes') return (Math.abs(Math.sin(s * freq * 0.5)) > 0.9 && Math.cos(a) > 0.2) ? 1.2 : 0; if (P.pattern === 'stripes') return Math.sin(s * freq) > 0.45 && Math.cos(a) > -0.3 ? 1.1 : 0; if (P.pattern === 'rings') return Math.abs(Math.sin(s * freq * 0.6)) > 0.93 ? 1.3 : 0; if (P.pattern === 'spots') return hash2(Math.floor(s * freq * 1.3), Math.floor(a * 2.6)) > 0.72 ? 1.2 : 0; return 0; };

// place o at ring i of a tube (points pts, frames from tube), offset along N (up) and B (side); forward = face away from the body
function stick(o, tube, pts, i, offN = 0, offB = 0, forward = false) { const { T, N, B } = tube.frameAt(i); o.position.copy(pts[i]).addScaledVector(N, offN).addScaledVector(B, offB); if (forward) orient(o, tmpV2.copy(T).negate(), N); else orient(o, T, N); }

function teethRow(parent, mat, n, x0, x1, y, z0, z1, size, down = true) { for (let i = 0; i < n; i++) { const k = i / Math.max(1, n - 1); for (const sd of [-1, 1]) part(parent, CON(), mat, size * 0.32, size, size * 0.32, sd * lerp(x0, x1, k), y, lerp(z0, z1, k), down ? Math.PI : 0); } }

// ---------- sharks and megalodons ----------
// teeth along a U-shaped gum line: x = +-w at the corners (z0), meeting at the front (z1); down = upper jaw
function uTeeth(parent, mat, n, w, z0, z1, y, size, down = true, jag = 0) { for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * 2 - 1, x = t * w, z = z1 - (z1 - z0) * t * t, k = 1 - 0.35 * Math.abs(t), sz = size * k * (1 + (jag ? (hash2(i, n) - 0.5) * jag : 0));
  part(parent, CON(), mat, sz * 0.42, sz, sz * 0.16, x, y, z, down ? Math.PI : 0, t * 0.9, 0); } }
function shark(P, S, mega = false) {
  const g = new THREE.Group(), body = grp(g), L = 4.6 * S, R = 0.5 * S, N = 18, mat = glowVC();
  const prof = (s) => (s < 0.25 ? 0.86 + 0.14 * Math.sin((s / 0.25) * Math.PI / 2) : 0.09 + 0.91 * Math.pow(Math.max(0, 1 - (s - 0.25) / 0.75), 1.3));
  const tube = new SpineTube(N, { radial: 14, flat: 1.15, mat, r: (s) => R * prof(s) * (mega ? 1.12 : 1), glow: (s, a) => glowAt(P, s, a, 40),
    color: (s, a, c) => { skin(P, s, a, c, 40); const down = -Math.cos(a), edge = 0.05 + Math.sin(s * 41 + a * 3) * 0.12; if (down > edge) c.setHex(P.belly); if (mega && P.barnacles && down < -0.3 && hash2(Math.floor(s * 40), Math.floor(a * 4)) > 0.9) c.setHex(0x8a8a7a); } });
  body.add(tube.mesh);
  const sk = M(P.top), bel = M(P.belly), dk = M(P.accent || lerpHex(P.top, 0, 0.4)), bone = M(0xf6f2e6), gum = M(0x9a3a46), mouth = M(0x3a0a10), black = M(0x040404);
  const eye = M(P.eye || 0x050505, P.eye ? 'glow' : 'skin'), fin = M(P.top, 'fin'), finD = M(P.accent || P.top, 'fin');
  const H = mega ? 1.12 : 1, head = grp(body);
  // upper head: a broad crown running forward into a pointed snout that overhangs the mouth
  const upper = grp(head); part(upper, SPH(), sk, 1.9 * R * H, 1.75 * R * H, 2.6 * R * H, 0, 0.18 * R, -0.05 * R); part(upper, SPH(), bel, 1.78 * R * H, 1.35 * R * H, 2.4 * R * H, 0, -0.36 * R, -0.05 * R); part(upper, SPH(), sk, 1.45 * R * H, 1.1 * R * H, 2.2 * R * H, 0, 0.18 * R, 0.95 * R * H);
  if (P.hammer) { part(upper, RBX(), sk, 2.9 * R, 0.3 * R, 0.8 * R, 0, 0.12 * R, 1.45 * R); for (const sd of [-1, 1]) part(upper, SPH(), eye, 0.24 * R, 0.24 * R, 0.24 * R, sd * 1.45 * R, 0.12 * R, 1.45 * R); } else part(upper, SPH(), sk, 0.9 * R * H, 0.72 * R * H, 1.25 * R * H, 0, 0.16 * R, 1.75 * R * H); part(upper, SPH(), bel, 1.4 * R * H, 0.55 * R * H, 1.9 * R * H, 0, -0.22 * R, 0.8 * R * H);
  for (const sd of [-1, 1]) { if (!P.hammer) part(upper, SPH(), eye, 0.2 * R, 0.2 * R, 0.2 * R, sd * 0.62 * R * H, 0.12 * R, 0.85 * R * H); part(upper, BOX(), black, 0.04 * R, 0.04 * R, 0.25 * R, sd * 0.28 * R, -0.06 * R, 1.95 * R * H, 0, sd * 0.4, 0);
    for (let i = 0; i < 5; i++) part(upper, BOX(), black, 0.04 * R, (0.55 - i * 0.03) * R * H, 0.05 * R, sd * (0.8 - i * 0.02) * R * H, -0.05 * R, (-0.2 - i * 0.16) * R * H, 0.25, 0, sd * 0.05);
    if (mega) { part(upper, CAP(), dk, 0.24 * R, 0.8 * R, 0.24 * R, sd * 0.62 * R * H, 0.32 * R, 0.85 * R * H, Math.PI / 2 + 0.3, 0, sd * 0.15); } }
  // the upper teeth sit on their own pivot so the jaw can thrust forward when it bites
  const upTeeth = grp(head, 0, -0.32 * R * H, 0); part(upTeeth, SPH(), gum, 1.18 * R * H, 0.18 * R, 1.65 * R * H, 0, 0.03 * R, 0.85 * R * H); part(upTeeth, SPH(), mouth, 1.1 * R * H, 0.3 * R, 1.5 * R * H, 0, 0, 0.75 * R * H);
  uTeeth(upTeeth, bone, mega ? 17 : 13, 0.62 * R * H, 0.15 * R * H, 1.62 * R * H, -0.08 * R, 0.34 * R * H, true, mega ? 0.6 : 0.2);
  if (mega) uTeeth(upTeeth, bone, 13, 0.5 * R * H, 0.3 * R * H, 1.45 * R * H, -0.02 * R, 0.24 * R * H, true, 0.6);
  // lower jaw hinged under the eyes: a rounded U of pale skin and pink gum with a row of narrow teeth
  const jaw = grp(head, 0, -0.42 * R * H, 0.05 * R * H); part(jaw, SPH(), bel, 1.3 * R * H, 0.42 * R * H, 1.75 * R * H, 0, -0.1 * R, 0.75 * R * H); part(jaw, SPH(), gum, 1.05 * R * H, 0.16 * R, 1.45 * R * H, 0, 0.1 * R, 0.78 * R * H); part(jaw, SPH(), mouth, 0.95 * R * H, 0.2 * R, 1.3 * R * H, 0, 0.14 * R, 0.72 * R * H);
  uTeeth(jaw, bone, mega ? 15 : 11, 0.55 * R * H, 0.15 * R * H, 1.42 * R * H, 0.16 * R, 0.28 * R * H, false, mega ? 0.6 : 0.2);
  if (mega) uTeeth(jaw, bone, 11, 0.44 * R * H, 0.3 * R * H, 1.25 * R * H, 0.12 * R, 0.2 * R * H, false, 0.6);
  // fins: tall dorsal (notched on old megalodons), a small second dorsal, long swept pectorals, a crescent tail with the upper lobe longer
  const dorsal = grp(body); part(dorsal, FINTRI(), fin, R * 1.6, R * (mega ? 2.0 : 1.8), 1, 0, 0, 0, 0, Math.PI / 2, 0);
  const crest = mega && P.crest ? grp(body) : null; if (crest) { for (let i = 0; i < 7; i++) part(crest, CON(), finD, R * 0.24, R * (0.7 + Math.sin(i * 0.9) * 0.2), R * 0.08, 0, R * 0.1, i * R * 0.42, 0.5); }
  const dorsal2 = grp(body); part(dorsal2, FINTRI(), fin, R * 0.5, R * 0.55, 1, 0, 0, 0, 0, Math.PI / 2, 0);
  const pecs = [-1, 1].map((sd) => { const p = grp(body); part(p, FINTRI(), finD, R * 1.4, R * 1.9, 1, 0, 0, 0, Math.PI / 2, 0, 0).rotation.set(-Math.PI / 2 + 0.35, 0, sd * -0.55); p.userData.sd = sd; return p; });
  const tail = grp(body); part(tail, CRESCENT(), fin, R * 2.4, R * 2.6, 1, 0, 0, 0, 0, Math.PI / 2, 0);
  if (mega && P.barnacles) { const bm = M(0x9a968a); for (let i = 0; i < 14; i++) { const a = hash2(i, 3) * 1.6 - 0.8; part(upper, SPH_LO(), bm, 0.14 * R, 0.1 * R, 0.14 * R, Math.sin(a) * 0.75 * R, 0.55 * R + Math.cos(a) * 0.2 * R, (hash2(i, 7) * 1.8 - 0.4) * R); } }
  for (const gg of [upper, upTeeth, jaw, dorsal, dorsal2, tail, ...pecs]) mergeParts(gg); if (crest) mergeParts(crest);
  const pts = Array.from({ length: N }, () => new THREE.Vector3()); let ph = Math.random() * 6;
  function anim(dt, st) {
    ph += dt * (2.5 + st.speed * 5) * (mega ? 0.7 : 1); const amp = R * 0.38 * (0.5 + st.speed) * (1 + st.attack);
    for (let i = 0; i < N; i++) { const s = i / (N - 1); pts[i].set(Math.sin(ph - s * 4.2) * amp * (s * s * 1.2 + 0.06), 0, (0.4 - s) * L); }
    tube.set(pts); stick(head, tube, pts, 0, 0, 0, true); head.position.addScaledVector(tube.frameAt(0).T, -R * 0.05);
    // bite: the snout lifts, the upper teeth thrust forward and down, the jaw drops wide
    const a = st.attack; upper.rotation.x = -0.22 * a; upTeeth.position.set(0, -0.32 * R * H - 0.12 * R * a, 0.22 * R * a); upTeeth.rotation.x = 0.1 * a; jaw.rotation.x = 0.12 + a * 0.95;
    stick(dorsal, tube, pts, 5, R * 0.9); stick(dorsal2, tube, pts, 11, R * 0.4); if (crest) stick(crest, tube, pts, 1, R * 0.95); stick(tail, tube, pts, N - 1, 0); for (const p of pecs) stick(p, tube, pts, 4, -R * 0.4, p.userData.sd * R * 0.7);
    const leap = Math.sin(Math.min(1, st.attack) * Math.PI); body.position.y = lerp(-R * 1.02, -R * 4, st.dive) + leap * R * (mega ? 2.2 : 3.5); body.rotation.x = -Math.cos(st.attack * Math.PI) * 0.5 * leap;
  }
  return { g, size: L * 0.45, top: R * 2, anim, mats: [mat] };
}
const megalodon = (P, S) => shark(P, S, true);
const lerpHex = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

// ---------- serpent head (shared by serpents, eels, the sea dragon and Jormungandr) ----------
function serpentHead(R, P, big = false) {
  const h = new THREE.Group(), sk = M(P.top), bl = M(P.belly), dk = M(P.dark || lerpHex(P.top, 0, 0.5)), bone = M(0xf2ead8), eye = M(P.eye, 'glow'), mouth = M(0x3a060c), gum = M(0x8a1a2a), black = M(0x050505), fin = M(P.fin || P.accent, 'fin'), horn = M(P.horn || 0xe8dcc0);
  // skull: a heavy cranium flowing into a long, narrow, wedge-shaped snout; the back of the skull reaches down over the neck joint
  part(h, SPH(), sk, 1.9 * R, 1.45 * R, 2.3 * R, 0, 0.18 * R, 0.25 * R); part(h, SPH(), sk, 1.55 * R, 1.05 * R, 2.4 * R, 0, 0.12 * R, 1.35 * R);
  part(h, SPH(), sk, 1.05 * R, 0.62 * R, 2.3 * R, 0, 0.06 * R, 2.35 * R); part(h, SPH(), bl, 1.0 * R, 0.32 * R, 2.2 * R, 0, -0.22 * R, 2.2 * R);
  // bony ridge plates down the skull and snout
  for (let i = 0; i < 6; i++) part(h, SPH_LO(), dk, (0.5 - i * 0.05) * R, 0.22 * R, 0.55 * R, 0, (0.92 - i * 0.1) * R, (-0.2 + i * 0.55) * R, -0.15);
  for (const sd of [-1, 1]) {
    // a deep socket under a heavy brow that slants down to the snout: a permanent scowl
    part(h, SPH(), black, 0.5 * R, 0.42 * R, 0.56 * R, sd * 0.6 * R, 0.4 * R, 1.25 * R);
    part(h, SPH(), eye, 0.46 * R, 0.32 * R, 0.42 * R, sd * 0.8 * R, 0.42 * R, 1.3 * R); part(h, BOX(), black, 0.06 * R, 0.28 * R, 0.08 * R, sd * 1.02 * R, 0.42 * R, 1.36 * R);
    part(h, CAP(), dk, 0.38 * R, 1.2 * R, 0.34 * R, sd * 0.7 * R, 0.74 * R, 1.25 * R, Math.PI / 2 + 0.38, 0, sd * 0.2);
    part(h, CON(), dk, 0.22 * R, 0.7 * R, 0.22 * R, sd * 0.78 * R, 0.82 * R, 0.6 * R, -1.25, 0, sd * 0.35); // brow spur
    // nostril slits, cheek spikes at the jaw hinge
    part(h, BOX(), black, 0.06 * R, 0.05 * R, 0.3 * R, sd * 0.24 * R, 0.33 * R, 3.15 * R, 0, sd * 0.3, 0);
    for (let k = 0; k < 3; k++) part(h, CON(), horn, 0.14 * R, (0.7 - k * 0.15) * R, 0.14 * R, sd * (0.85 + k * 0.02) * R, (-0.15 - k * 0.22) * R, (0.35 - k * 0.15) * R, -1.6 + k * 0.25, 0, sd * 0.9);
    // tattered spined frill swept back from the skull
    const fr = grp(h, sd * 0.8 * R, 0.25 * R, 0.0); const fm = part(fr, FAN(), fin, 1.7 * R, 1.5 * R, 1, 0, 0, 0); fm.rotation.set(0, sd * (Math.PI / 2 + 0.75), sd * 0.15); if (sd < 0) fm.scale.x *= -1;
    for (let k = 0; k < 5; k++) { const a = -0.55 + k * 0.32; rod(fr, horn, V(0, 0, 0), V(sd * Math.cos(a) * 0.45 * R, Math.sin(a) * 1.25 * R, -Math.cos(a) * 1.3 * R), 0.09 * R, CON()); }
    if (P.horns !== false) { part(h, CON(), horn, 0.32 * R, (big ? 2.8 : 1.9) * R, 0.32 * R, sd * 0.5 * R, 0.95 * R, 0.1 * R, -1.2, 0, sd * 0.32); part(h, CON(), horn, 0.18 * R, 0.95 * R, 0.18 * R, sd * 0.72 * R, 0.62 * R, -0.25 * R, -1.35, 0, sd * 0.7); }
    if (P.whiskers) { const w = curvePts([V(sd * 0.4 * R, -0.05 * R, 3.1 * R), V(sd * 1.3 * R, -0.4 * R, 2.7 * R), V(sd * 2.0 * R, -1.1 * R, 1.8 * R), V(sd * 2.2 * R, -1.9 * R, 0.9 * R)], 12); h.add(new THREE.Mesh(taperTube(w, { radial: 5, r: (s) => 0.09 * R * (1 - s) + 0.01 }), dk)); }
  }
  // upper jaw: dark gums, a crowded row of needle teeth and two long fangs hanging past the lower lip
  part(h, SPH(), gum, 1.0 * R, 0.2 * R, 2.15 * R, 0, -0.3 * R, 2.1 * R); part(h, SPH(), mouth, 0.86 * R, 0.24 * R, 2.0 * R, 0, -0.38 * R, 1.95 * R);
  teethRow(h, bone, 11, 0.5 * R, 0.16 * R, -0.36 * R, 0.75 * R, 3.15 * R, 0.4 * R);
  for (const sd of [-1, 1]) { part(h, CON(), bone, 0.17 * R, 1.05 * R, 0.17 * R, sd * 0.3 * R, -0.75 * R, 2.75 * R, Math.PI + 0.1); part(h, CON(), bone, 0.12 * R, 0.65 * R, 0.12 * R, sd * 0.46 * R, -0.58 * R, 2.2 * R, Math.PI); }
  // lower jaw hinged far back so it gapes wide; its own needle row and a pair of fangs jutting up
  const jaw = grp(h, 0, -0.45 * R, 0.1 * R); part(jaw, SPH(), sk, 1.3 * R, 0.5 * R, 2.9 * R, 0, -0.16 * R, 1.55 * R); part(jaw, SPH(), bl, 1.15 * R, 0.32 * R, 2.6 * R, 0, -0.3 * R, 1.45 * R);
  part(jaw, SPH(), gum, 1.0 * R, 0.2 * R, 2.5 * R, 0, 0.03 * R, 1.5 * R); part(jaw, SPH(), mouth, 0.86 * R, 0.2 * R, 2.3 * R, 0, 0.08 * R, 1.45 * R);
  teethRow(jaw, bone, 10, 0.46 * R, 0.14 * R, 0.08 * R, 0.6 * R, 2.75 * R, 0.36 * R, false);
  for (const sd of [-1, 1]) part(jaw, CON(), bone, 0.15 * R, 0.8 * R, 0.15 * R, sd * 0.24 * R, 0.4 * R, 2.65 * R, 0.1);
  const tongue = grp(jaw, 0, 0.12 * R, 1.6 * R); part(tongue, CAP(), M(0x9a2a44), 0.14 * R, 1.2 * R, 0.06 * R, 0, 0, 0.6 * R, Math.PI / 2); for (const sd of [-1, 1]) part(tongue, CON(), M(0x9a2a44), 0.1 * R, 0.5 * R, 0.05 * R, sd * 0.12 * R, 0, 1.4 * R, Math.PI / 2, 0, -sd * 0.3);
  mergeParts(h); mergeParts(jaw); mergeParts(tongue);
  return { h, jaw, tongue };
}
// a membrane wing with finger bones; flaps about its root
function wing(P, R, sd) { const w = new THREE.Group(), mem = M(P.wing || P.fin, 'fin'), bone = M(P.dark || lerpHex(P.top, 0, 0.4)); const m = part(w, WING(), mem, 7 * R, 6 * R, 1, 0, 0, 0); m.rotation.x = -Math.PI / 2;
  for (const [x, z] of [[1, -1], [1.05, -0.55], [0.85, -0.25], [0.62, 0], [0.38, 0.2]]) rod(w, bone, V(0, 0, 0), V(x * 7 * R, 0.05, z * 6 * R), 0.09 * R);
  if (sd < 0) w.scale.x = -1; return w; }

// trail-following serpent body: the head leads at the front of the group; the body follows where the head has been,
// arching out of the sea in humps
function serpentBody(P, S, o = {}) {
  const g = new THREE.Group(), R = (o.R || 0.55) * S, N = o.N || 46, seg = (o.seg || 0.62) * S, mat = glowVC(), freq = o.freq || 70;
  const tube = new SpineTube(N, { radial: o.radial || 12, mat, r: (s) => R * (s < 0.05 ? 0.92 + (s / 0.05) * 0.08 : 0.06 + 0.94 * Math.pow(Math.max(0, 1 - (s - 0.05) / 0.95), 0.75)), color: (s, a, c) => skin(P, s, a, c, freq), glow: (s, a) => glowAt(P, s, a, freq),
    fin: o.fin === false ? null : (s) => (s < 0.04 || s > 0.96 ? 0 : R * (o.finH || 0.75) * (0.55 + 0.45 * Math.abs(Math.sin(s * Math.PI * (o.spikes || 26)))) * (1 - s * 0.6)), finMat: M(P.fin || P.accent, 'fin') });
  g.add(tube.mesh); if (tube.finMesh) g.add(tube.finMesh);
  const hd = o.noHead ? null : serpentHead(R * (o.headK || 1), P, o.big), head = hd && hd.h, jaw = hd && hd.jaw, tongue = hd && hd.tongue; if (head) g.add(head);
  // ball joint where the neck meets the skull, so no gap shows however the head pitches
  const jk = o.noHead ? 1.25 : 1, joint = grp(g); part(joint, SPH(), M(P.top), R * 1.95 * jk, R * 1.85 * jk, R * 2.2 * jk); part(joint, SPH(), M(P.belly), R * 1.7 * jk, R * 1.3 * jk, R * 1.95 * jk, 0, -R * 0.38 * jk, 0); mergeParts(joint);
  const tail = grp(g); const tf = part(tail, FAN(), M(P.fin || P.accent, 'fin'), R * 2.6, R * 2.2, 1, 0, 0, 0); tf.rotation.set(0, Math.PI / 2, Math.PI);
  const wings = P.wings ? [-1, 1].map((sd) => { const w = wing(P, R * 0.8, sd); g.add(w); return w; }) : [];
  const trail = [], pts = Array.from({ length: N }, () => new THREE.Vector3()), wpos = new THREE.Vector3(), inv = new THREE.Matrix4(); let last = null, ph = Math.random() * 6, flap = 0;
  const humpA = (o.humps || 2.4) * R, lam = (o.lambda || 10) * S;
  function sample(arc, out) { let acc = 0; for (let i = 0; i < trail.length - 1; i++) { const a = trail[i], b = trail[i + 1], d = a.distanceTo(b); if (acc + d >= arc) { return out.copy(a).lerp(b, (arc - acc) / d); } acc += d; }
    const end = trail[trail.length - 1] || wpos; const back = trail.length > 1 ? tmpV.subVectors(end, trail[trail.length - 2]).normalize() : tmpV.set(-Math.sin(g.rotation.y), 0, -Math.cos(g.rotation.y)); return out.copy(end).addScaledVector(back, arc - acc); }
  function anim(dt, st) {
    g.updateMatrixWorld(); wpos.setFromMatrixPosition(g.matrixWorld); wpos.y = 0;
    if (!last || last.distanceTo(wpos) > seg * 0.4) { trail.unshift(wpos.clone()); last = trail[0]; if (trail.length > N * 2 + 8) trail.pop(); } else trail[0].copy(wpos);
    ph += dt * (1.6 + st.speed * 2.2); const surf = 1 - st.dive; inv.copy(g.matrixWorld).invert();
    for (let i = 0; i < N; i++) { const arc = i * seg, s = i / (N - 1); sample(arc, pts[i]); pts[i].applyMatrix4(inv);
      const neck = 1 - smooth(0, 6.5 * S, arc); const hump = Math.sin((arc / lam) * TAU - ph * 1.3) * humpA;
      pts[i].y = lerp(-R * 1.15 + hump * smooth(2 * S, 6 * S, arc) * (1 - s * 0.35), R * ((o.neckRise ?? 4.6) + st.attack * (o.neckRise == null ? 3.5 : 0.5)), neck) * surf + (-R * 4) * st.dive;
      pts[i].x += Math.sin(arc * 0.35 - ph * 2) * R * 0.5 * smooth(3 * S, 8 * S, arc); }
    tube.set(pts); stick(joint, tube, pts, 0, 0, 0, true);
    if (head) { stick(head, tube, pts, 0, 0, 0, true); head.position.addScaledVector(tube.frameAt(0).T, -R * 0.15); head.rotateX(-0.25 + st.attack * 0.6 - Math.sin(ph) * 0.06);
      jaw.rotation.x = 0.22 + st.attack * 0.7 + Math.max(0, Math.sin(ph * 0.7)) * 0.14; tongue.visible = st.attack > 0.2; tongue.position.z = 1.6 * R * (o.headK || 1) * (0.5 + st.attack * 0.6); }
    if (o.after) o.after(dt, st, pts, tube, ph, surf);
    stick(tail, tube, pts, N - 1); if (wings.length) { flap += dt * (2 + st.speed * 2); wings.forEach((w, k) => { const sd = k ? 1 : -1; stick(w, tube, pts, 5, R * 0.6, sd * R * 0.5); w.rotateZ(sd * (Math.sin(flap) * 0.55 - 0.15) * surf); w.rotateY(sd * 0.5); w.visible = surf > 0.3; }); }
  }
  return { g, size: R * 5, top: R * 6, anim, mats: [mat], len: N * seg, R };
}
function serpent(P, S) { return serpentBody(P, S, { R: 0.7, N: 64, seg: 0.46, humps: 3.3, lambda: 9, spikes: 30, radial: 14, whiskers: P.whiskers, headK: 0.85 }); }
function eel(P, S) { const m = serpentBody({ ...P, horns: false }, S, { R: 0.36, N: 44, seg: 0.4, humps: 0.6, lambda: 6, spikes: 40, finH: 0.9, headK: 0.85, freq: 90 });
  // crackling arcs
  const arcMat = new THREE.LineBasicMaterial({ color: P.accent }), arcs = new THREE.LineSegments(new THREE.BufferGeometry(), arcMat); arcs.frustumCulled = false; m.g.add(arcs); const base = m.anim; let zt = 0;
  m.anim = (dt, st) => { base(dt, st); zt -= dt; if (zt <= 0) { zt = 0.08; const p = []; if (st.attack > 0.1 || Math.random() < 0.25) for (let k = 0; k < 6; k++) { const a = V((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 6 - 2); let b = a.clone(); for (let j = 0; j < 4; j++) { const c = b.clone().add(V((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.9 * S)); p.push(b, c); b = c; } } arcs.geometry.dispose(); arcs.geometry = new THREE.BufferGeometry().setFromPoints(p.length ? p : [V(0, -50, 0), V(0, -50, 0)]); } };
  return m; }
// the leviathan: a sea dragon with no limbs, a serpent body that splits at the chest into three necks, each with its own
// head; the necks weave out of step and all three strike together
function leviathan(P, S) {
  const R = 0.95 * S, Ln = 8.5 * R, necks = [], nm = glowVC(), up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(), side = new THREE.Vector3(), base = new THREE.Vector3(), dir = new THREE.Vector3();
  let t = Math.random() * 5;
  const m = serpentBody(P, S, { R: 0.95, N: 56, seg: 0.62, humps: 2.4, lambda: 12, spikes: 34, radial: 14, noHead: true, neckRise: 1.3, freq: 70,
    after: (dt, st, pts, tube, ph, surf) => { t += dt * (1 + st.speed); const fr = tube.frameAt(0); fwd.copy(fr.T).negate(); fwd.y = 0; fwd.normalize(); side.crossVectors(up, fwd);
      for (const Nk of necks) { const spread = Nk.side * 0.75 + Math.sin(t * 0.7 + Nk.ph) * 0.2, lunge = st.attack;
        dir.copy(fwd).multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread)); base.copy(pts[0]).addScaledVector(side, Nk.side * 1.0 * R).addScaledVector(up, 0.2 * R);
        for (let k = 0; k < Nk.pts.length; k++) { const q = k / (Nk.pts.length - 1), rise = (Math.sin(q * Math.PI * 0.5) * 0.66 - Math.sin(q * Math.PI) * 0.08 - 0.18 * lunge * q * q) * surf * (Nk.side ? 0.9 : 1), reach = q * (0.5 + 0.4 * lunge) + Math.sin(q * Math.PI) * 0.08;
          Nk.pts[k].copy(base).addScaledVector(dir, Ln * reach).addScaledVector(up, Ln * rise).addScaledVector(side, Math.sin(t * 1.4 + Nk.ph + q * 3) * 0.7 * R * q + Nk.side * Math.sin(q * Math.PI) * 1.4 * R).addScaledVector(up, (-R * 4) * st.dive * q); }
        Nk.tb.set(Nk.pts); const L = Nk.pts.length - 1; stick(Nk.joint, Nk.tb, Nk.pts, L); stick(Nk.h, Nk.tb, Nk.pts, L); Nk.h.position.addScaledVector(Nk.tb.frameAt(L).T, R * 0.1); Nk.h.rotateX(0.75 - st.attack * 0.35 + Math.sin(t * 1.1 + Nk.ph) * 0.08);
        Nk.jaw.rotation.x = 0.25 + st.attack * 0.75 + Math.max(0, Math.sin(t * 0.9 + Nk.ph)) * 0.18; Nk.tongue.visible = st.attack > 0.2; Nk.h.visible = Nk.joint.visible = surf > 0.15; } } });
  for (let i = 0; i < 3; i++) { const nR = (i === 1 ? 0.78 : 0.68) * R;
    const tb = new SpineTube(18, { radial: 12, mat: nm, r: (s) => nR * (1.25 - 0.4 * s), color: (s, a, c) => skin(P, s * 0.3, a, c, 70), glow: (s, a) => glowAt(P, s * 0.3, a, 70), fin: (s) => (s < 0.1 || s > 0.92 ? 0 : nR * 0.55 * (0.6 + 0.4 * Math.abs(Math.sin(s * Math.PI * 9)))), finMat: M(P.fin || P.accent, 'fin') });
    m.g.add(tb.mesh); if (tb.finMesh) m.g.add(tb.finMesh);
    const { h, jaw, tongue } = serpentHead(nR * 0.95, P, i === 1); m.g.add(h);
    const joint = grp(m.g); part(joint, SPH(), M(P.top), nR * 1.75, nR * 1.65, nR * 1.75); part(joint, SPH(), M(P.belly), nR * 1.5, nR * 1.1, nR * 1.55, 0, -nR * 0.35, 0); mergeParts(joint);
    necks.push({ tb, h, jaw, tongue, joint, side: i - 1, ph: i * 2.1, pts: Array.from({ length: 18 }, () => new THREE.Vector3()) }); }
  m.mats.push(nm); m.size = R * 5.5; m.top = Ln * 0.8 + R * 2; return m;
}
function jormungandr(P, S) { const m = serpentBody(P, S, { R: 2.1, N: 80, seg: 1.35, humps: 3.4, lambda: 22, spikes: 44, finH: 0.6, big: true, radial: 16, freq: 120, headK: 0.9 }); m.size = 2.1 * S * 5; return m; }

// ---------- octopus / kraken ----------
// a tentacle with hold of something (v1.10.4, the legends' grab): A.grip = { p, up, ax, r, len, lift, k } in the body's space. The
// arm arcs up from its root and over, then its last part coils round p (the ship's waist, r its half-beam, len its length), the
// tentacle's own thickness outside the hull; k blends it from the arm's own pose
const _g1 = new THREE.Vector3(), _g2 = new THREE.Vector3(), _ge = new THREE.Vector3(), _gs = new THREE.Vector3(), _gq = new THREE.Vector3();
function gripArm(A) { const H = A.grip; if (!H || !(H.k > 0)) return; const n = A.pts.length, m = Math.round(n * 0.6), p0 = A.pts[0], rr = (k) => H.r + A.tb.r(k / (n - 1)) * 0.85, e = _ge.copy(H.p).addScaledVector(H.up, rr(m)).addScaledVector(H.ax, -H.len * 0.25), top = Math.max(p0.y, e.y) + H.lift;
  _g1.set(p0.x, top, p0.z); _g2.set(e.x, top, e.z); _gs.crossVectors(H.ax, H.up).normalize();
  for (let k = 1; k < m; k++) { const s = k / (m - 1), a = 1 - s; _gq.set(0, 0, 0).addScaledVector(p0, a * a * a).addScaledVector(_g1, 3 * a * a * s).addScaledVector(_g2, 3 * a * s * s).addScaledVector(e, s * s * s); A.pts[k].lerp(_gq, H.k); }
  for (let k = m; k < n; k++) { const s = (k - m + 1) / (n - m), a = s * Math.PI * 2.6, r = rr(k); _gq.copy(H.p).addScaledVector(H.up, Math.cos(a) * r).addScaledVector(_gs, Math.sin(a) * r).addScaledVector(H.ax, (s - 0.5) * H.len * 0.5); A.pts[k].lerp(_gq, H.k); } }
export function tentacle(P, R, n, len, mat, glowFn) { return new SpineTube(n, { radial: 9, mat, r: (s) => R * Math.pow(1 - s * 0.94, 1.15) + R * 0.03, color: (s, a, c) => { c.setHex(P.top); if (P.pattern === 'rings' && Math.abs(Math.sin(s * 30)) > 0.85) c.setHex(P.accent); const under = smooth(0.35, 0.95, -Math.cos(a)); c.multiplyScalar(0.8 + 0.25 * Math.max(0, Math.cos(a))); if (under > 0) { c.lerp(tmpC.setHex(P.belly), under * 0.55); if (Math.abs(Math.sin(s * len * 3.2)) > 0.7 && under > 0.5) c.lerp(tmpC.setHex(P.sucker || 0xf2d8d0), 0.7); } }, glow: glowFn }); }
function cephalopod(P, S, kraken) {
  const g = new THREE.Group(), body = grp(g), R = (kraken ? 1.3 : 0.75) * S, mat = glowVC(), arms = [], nA = kraken ? 10 : 8;
  const sk = M(P.top), dk = M(P.dark || lerpHex(P.top, 0, 0.4)), eye = M(P.eye, 'glow'), black = M(0x060606), bel = M(P.belly);
  // mantle: octopus = bulbous head leaning back; kraken = long squid cone with fins rising from the sea at an angle
  const mantle = grp(body, 0, R * 0.8, -R * 0.4);
  if (kraken) { mantle.rotation.x = 0.62; const pts = curvePts([V(0, 0, 0.6 * R), V(0, 0, -1.5 * R), V(0, 0, -4 * R), V(0, 0, -6.5 * R)], 16);
    mantle.add(new THREE.Mesh(taperTube(pts, { radial: 16, r: (s) => R * ((1.35 + 0.35 * Math.sin(Math.min(s, 0.6) / 0.6 * Math.PI / 2)) * Math.pow(1 - s, 0.55) + 0.05), color: (s, a, c) => skin(P, s, a, c, 30), ref: V(0, 1, 0) }), mat));
    for (const sd of [-1, 1]) { const f = part(mantle, FINTRI(), M(P.fin || P.top, 'fin'), 2.6 * R, 2.2 * R, 1, sd * 0.4 * R, 0, -5.2 * R); f.rotation.set(-Math.PI / 2, 0, sd * (Math.PI / 2 + 0.2)); } }
  else { part(mantle, SPH(), sk, 2.6 * R, 2.4 * R, 3.2 * R, 0, 0.6 * R, -0.6 * R, -0.5); for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = 1.1 * R; part(mantle, SPH_LO(), dk, 0.3 * R, 0.2 * R, 0.3 * R, Math.cos(a) * rr, 0.6 * R + Math.sin(i) * 0.6 * R, -0.6 * R + Math.sin(a) * rr, 0, 0, 0); } }
  const face = grp(body, 0, R * 0.55, R * 0.6); part(face, SPH(), sk, 2.2 * R, 1.6 * R, 1.8 * R, 0, 0, 0);
  const ek = kraken ? 1.3 : 1; for (const sd of [-1, 1]) { part(face, SPH(), M(0xe8e0b0), 0.7 * R * ek, 0.62 * R * ek, 0.6 * R * ek, sd * 0.85 * R, 0.25 * R, 0.45 * R); part(face, SPH(), eye, 0.56 * R * ek, 0.5 * R * ek, 0.5 * R * ek, sd * 0.9 * R, 0.25 * R, 0.55 * R + 0.06 * R * ek); part(face, BOX(), black, 0.06 * R * ek, 0.1 * R * ek, 0.36 * R * ek, sd * (0.9 + 0.265 * ek) * R, 0.25 * R, 0.55 * R + 0.06 * R * ek); part(face, CAP(), dk, 0.3 * R, 0.6 * R, 0.3 * R, sd * 0.8 * R, 0.62 * R, 0.4 * R, 0, 0, Math.PI / 2 + sd * 0.25); }
  part(face, CON(), M(0x2a1a14), 0.5 * R, 0.6 * R, 0.5 * R, 0, -0.6 * R, 0.55 * R, Math.PI + 0.4); // beak
  mergeParts(face); mergeParts(mantle);
  for (let i = 0; i < nA; i++) { const long = kraken && i >= 8; const tb = tentacle(P, R * (long ? 0.34 : 0.55), long ? 30 : 22, long ? 16 : 10, mat, P.glow ? (s) => (Math.abs(Math.sin(s * 30)) > 0.85 ? 1.3 : 0) : null); body.add(tb.mesh);
    const club = long ? (() => { const cg = grp(body); part(cg, SPH(), M(P.top), R * 0.7, R * 0.45, R * 1.7, 0, 0, R * 0.5); for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) part(cg, CON(), M(0xf0e0c8), R * 0.1, R * 0.22, R * 0.1, sd * R * 0.2, -R * 0.18, k * R * 0.26, Math.PI); mergeParts(cg); return cg; })() : null; arms.push({ tb, a0: (i / Math.min(8, nA)) * TAU + (long ? 0.3 : 0) + (i % 2) * 0.1, ph: Math.random() * TAU, long, club, pts: Array.from({ length: long ? 30 : 22 }, () => new THREE.Vector3()) }); }
  let t = 0; const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  function anim(dt, st) { t += dt * (1 + st.speed); const surf = 1 - st.dive;
    for (const A of arms) { const n = A.pts.length, segL = (kraken ? (A.long ? 0.42 : 0.3) : (A.long ? 0.9 : 0.62)) * R * (st.reach ?? 1); const rise = (A.long ? 0.7 : 1) * ((kraken ? 0.75 : 0.5) + (kraken ? 0.35 : 0.5) * Math.sin(t * 0.9 + A.ph)) * surf + st.attack * 1.2;
      const az = A.a0 + Math.sin(t * 0.5 + A.ph) * 0.25; dir.set(Math.sin(az), 0, Math.cos(az)); side.crossVectors(up, dir);
      const p = A.pts[0].set(dir.x * R * 0.9, R * 0.1, dir.z * R * 0.9 + R * 0.4); let ang = -0.35, yaw = 0;
      for (let k = 1; k < n; k++) { const s = k / (n - 1); ang += (rise * 3.6 / n) * (0.35 + s * 1.5) * (1 + Math.sin(t * 2 + A.ph + s * 4) * 0.3) + Math.sin(t * 1.7 + A.ph + s * 7) * 0.07; yaw = Math.sin(t * 1.3 + A.ph + s * 3) * 0.35 * s;
        const ca = Math.cos(ang), sa = Math.sin(ang), d2 = tmpV.copy(dir).multiplyScalar(ca).addScaledVector(up, sa).addScaledVector(side, yaw); A.pts[k].copy(A.pts[k - 1]).addScaledVector(d2.normalize(), segL); }
      void p; gripArm(A); A.tb.set(A.pts); if (A.club) { A.club.position.copy(A.pts[n - 1]); const fr = A.tb.frameAt(n - 1); orient(A.club, tmpV2.copy(fr.T).negate().negate(), fr.N); } }
    body.position.y = lerp(-R * 0.55, -R * 6, st.dive) + (kraken ? R * 0.15 : 0) + Math.sin(t * 0.8) * R * 0.08; face.rotation.x = Math.sin(t * 0.6) * 0.05 - st.attack * 0.2; }
  return { g, size: R * (kraken ? 6 : 4.2), top: R * (kraken ? 2.2 : 4), anim, mats: [mat], giant: kraken && S > 6, arms, body, head: face, eyes: [V(-0.9 * R, 0.25 * R, 0.55 * R + 0.06 * R * ek), V(0.9 * R, 0.25 * R, 0.55 * R + 0.06 * R * ek)] };
}
const octopus = (P, S) => cephalopod(P, S, false), squid = (P, S) => cephalopod(P, S, true);
// ---------- the Kraken (v1.2.0, from Sean's picture): a domed, crested head, a heavy brow over glowing eyes, eight thick arms with suckers ----------
const _up = new THREE.Vector3(0, 1, 0), _dummy = new THREE.Object3D(), _q = new THREE.Quaternion();
function kraken(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1.3 * S, mat = glowVC(), arms = [], nA = 8;
  const bone = M(P.top), plate = M(P.accent), dark = M(P.dark || lerpHex(P.top, 0, 0.45)), eye = M(P.eye, 'glow'), black = M(0x060606), suck = M(P.sucker || 0xe8d8d0);
  // the head (v1.2.1, Sean: taller, more skull): a tall tapered dome on a brow mass, mottled, with a crown spine, five
  // meridians of spines, bony seams; the face is a skull: bony rims round deep sockets, a nasal hollow, cheekbones, a jaw of teeth
  const head = grp(body, 0, R * 1.2, -R * 0.2), teeth = M(P.teeth || 0xf0ead8); const H = 4.6 * R, B0 = V(0, 0.2 * R, -0.35 * R), AX = V(0, 1, -0.12).normalize();
  const dr = (t) => R * (0.06 + 1.5 * Math.sqrt(Math.max(0, 1 - ((t - 0.28) / 0.74) ** 2))); // the dome's radius along its height: widest low, a rounded point on top
  const dc = (t) => V(B0.x + AX.x * H * t, B0.y + AX.y * H * t, B0.z + AX.z * H * t), dp = (t, ph) => { const c = dc(t), r = dr(t); return V(c.x + Math.sin(ph) * r, c.y, c.z + Math.cos(ph) * r); };
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(dc(i / 20)); head.add(new THREE.Mesh(taperTube(pts, { radial: 20, r: dr, color: (t, an, c) => skin(P, t, an, c, 28), ref: V(0, 0, 1) }), mat));
  part(head, SPH(), bone, 3.5 * R, 2.0 * R, 3.2 * R, 0, -0.1 * R, 0.15 * R); // the brow mass the dome stands on
  part(head, SPH(), plate, 3.6 * R, 0.6 * R, 1.4 * R, 0, 0.7 * R, 1.05 * R); part(head, SPH(), bone, 3.0 * R, 0.5 * R, 1.0 * R, 0, 0.45 * R, 1.35 * R); // the brow ridge and the bone under it
  const spike = (d, x, y, z, h, w, m) => { const o = new THREE.Mesh(CON(), m); o.scale.set(w, h, w); o.position.set(x, y, z); o.quaternion.setFromUnitVectors(_up, d.normalize()); o.position.addScaledVector(d, h * 0.45); head.add(o); };
  const crown = dc(1.0); spike(V(0, 1, -0.15), crown.x, crown.y - 0.1 * R, crown.z, 1.9 * R, 0.5 * R, bone); // the crown spine
  for (const ph of [-1.25, -0.65, 0, 0.65, 1.25]) for (let k = 0; k < 5; k++) { const t = 0.38 + k * 0.145, p = dp(t, ph), c = dc(t), out = V(p.x - c.x, 0, p.z - c.z).normalize(), lean = V(out.x, 0.55 + k * 0.12, out.z), big = ph === 0 ? 1 : Math.abs(ph) < 1 ? 0.82 : 0.66; spike(lean, p.x, p.y, p.z, (1.35 - k * 0.12) * R * big, 0.4 * R * big, k % 2 ? plate : bone); }
  for (const ph of [-2.0, -1.6, -0.95, -0.32, 0.32, 0.95, 1.6, 2.0, Math.PI]) for (let k = 0; k < 4; k++) { const t0 = 0.14 + k * 0.2, p0 = dp(t0, ph), p1 = dp(t0 + 0.17, ph), o = new THREE.Mesh(CAP(), plate), d = V(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z); o.scale.set(0.15 * R, d.length() * 0.9, 0.15 * R); o.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2); const c = dc(t0 + 0.08); o.position.addScaledVector(V(o.position.x - c.x, 0, o.position.z - c.z).normalize(), 0.02 * R); o.quaternion.setFromUnitVectors(_up, d.normalize()); head.add(o); } // bony seams up the dome
  for (const [ph, t] of [[-0.5, 0.5], [0.8, 0.62], [-1.1, 0.74], [0.3, 0.86]]) { const p = dp(t, ph), o = new THREE.Mesh(CAP(), dark); o.scale.set(0.06 * R, 0.6 * R, 0.06 * R); o.position.copy(p); o.quaternion.setFromUnitVectors(_up, V(0.3, 1, 0.1).normalize()); head.add(o); } // cracks
  for (const sd of [-1, 1]) { for (let k = 0; k < 3; k++) spike(V(sd * 1, 0.15, -0.25), sd * 1.5 * R, 0.25 * R + k * 0.1 * R, -0.3 * R + k * 0.38 * R, 0.5 * R, 0.22 * R, plate); // side plates
    spike(V(sd * 0.3, 1, 0.5), sd * 1.05 * R, 1.35 * R, 0.85 * R, 1.15 * R, 0.36 * R, plate); // the two horns over the brow
    const ring = new THREE.Mesh(TOR(), bone); ring.scale.set(1.5 * R, 1.3 * R, 1.3 * R); ring.position.set(sd * 1.0 * R, 0.1 * R, 1.42 * R); ring.rotation.set(0.15, sd * 0.25, 0); head.add(ring); // the bony rim of the socket
    part(head, SPH(), black, 1.15 * R, 0.85 * R, 0.9 * R, sd * 1.0 * R, 0.08 * R, 1.2 * R); part(head, SPH(), eye, 0.6 * R, 0.44 * R, 0.44 * R, sd * 1.0 * R, 0.06 * R, 1.48 * R); const halo = new THREE.Mesh(SPH(), new THREE.MeshBasicMaterial({ color: P.eye, transparent: true, opacity: 0.26, depthWrite: false })); halo.scale.set(1.15 * R, 0.9 * R, 0.9 * R); halo.position.set(sd * 1.0 * R, 0.06 * R, 1.48 * R); head.add(halo);
    part(head, SPH(), bone, 1.0 * R, 0.55 * R, 0.8 * R, sd * 1.55 * R, -0.4 * R, 1.0 * R); // cheekbone
    part(head, CAP(), dark, 0.28 * R, 0.7 * R, 0.28 * R, sd * 1.6 * R, -0.85 * R, 0.55 * R, 0.3, 0, sd * 0.5); // cheek folds
    spike(V(0, -1, 0.15), sd * 0.78 * R, -0.95 * R, 1.25 * R, 0.55 * R, 0.2 * R, teeth); } // the two fangs
  part(head, CON4(), black, 0.55 * R, 0.6 * R, 0.3 * R, 0, -0.45 * R, 1.5 * R); // the nasal hollow (point up)
  part(head, SPH(), black, 2.1 * R, 0.5 * R, 0.9 * R, 0, -0.92 * R, 1.05 * R); // the dark of the mouth
  for (let k = 0; k < 7; k++) { const x = (k - 3) * 0.26 * R; if (Math.abs(k - 3) === 3) continue; spike(V(0, -1, 0.12), x, -0.82 * R, 1.3 * R, 0.32 * R, 0.14 * R, teeth); } // the row of teeth
  part(head, SPH(), bone, 2.4 * R, 0.45 * R, 1.0 * R, 0, -1.12 * R, 0.95 * R); // the jaw bone under the mouth
  mergeParts(head);
  // eight arms, thick at the root, with two rows of suckers underneath (one instanced mesh for all of them)
  const nSeg = 28, perArm = 10, suckers = new THREE.InstancedMesh(SPH_LO(), suck, nA * perArm * 2); suckers.frustumCulled = false; body.add(suckers);
  for (let i = 0; i < nA; i++) { const tb = tentacle(P, R * 0.74, nSeg, 13, mat, P.glow ? (s) => (Math.abs(Math.sin(s * 30)) > 0.85 ? 1.3 : 0) : null); body.add(tb.mesh); arms.push({ tb, a0: (i / nA) * TAU + 0.2 + (i % 2) * 0.12, ph: (i * 1.7) % TAU, pts: Array.from({ length: nSeg }, () => new THREE.Vector3()) }); }
  let t = 0; const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), off = new THREE.Vector3(), inner = new THREE.Vector3(), sideV = new THREE.Vector3();
  function anim(dt, st) { t += dt * (1 + st.speed); const surf = 1 - st.dive; let si = 0;
    for (const A of arms) { const n = A.pts.length, segL = 0.42 * R * (st.reach ?? 1); const rise = (0.85 + 0.3 * Math.sin(t * 0.9 + A.ph)) * surf + st.attack * 1.2;
      const az = A.a0 + Math.sin(t * 0.5 + A.ph) * 0.2; dir.set(Math.sin(az), 0, Math.cos(az)); side.crossVectors(up, dir);
      A.pts[0].set(dir.x * R * 1.35, -R * 0.25, dir.z * R * 1.35 + R * 0.2); let ang = -0.3, yaw = 0;
      for (let k = 1; k < n; k++) { const s = k / (n - 1); ang += (rise * 3.6 / n) * (0.35 + s * 1.5) * (1 + Math.sin(t * 2 + A.ph + s * 4) * 0.3) + Math.sin(t * 1.7 + A.ph + s * 7) * 0.07; yaw = Math.sin(t * 1.3 + A.ph + s * 3) * 0.35 * s;
        const ca = Math.cos(ang), sa = Math.sin(ang), d2 = tmpV.copy(dir).multiplyScalar(ca).addScaledVector(up, sa).addScaledVector(side, yaw); A.pts[k].copy(A.pts[k - 1]).addScaledVector(d2.normalize(), segL); }
      gripArm(A); A.tb.set(A.pts);
      for (let j = 0; j < perArm; j++) { const k = 3 + j * 2, s = k / (n - 1), rr = A.tb.r(s), fr = A.tb.frameAt(k); inner.set(0, A.pts[k].y * 0.35 + R * 2.2, 0).sub(A.pts[k]); inner.addScaledVector(fr.T, -inner.dot(fr.T)).normalize(); sideV.crossVectors(fr.T, inner).normalize(); for (const row of [-0.42, 0.42]) { off.copy(inner).multiplyScalar(Math.cos(row)).addScaledVector(sideV, Math.sin(row)); _dummy.position.copy(A.pts[k]).addScaledVector(off, rr * 0.92); _dummy.quaternion.setFromUnitVectors(_up, off); const d = A.dead ? 0.0001 : rr * 0.9; _dummy.scale.set(d, d * 0.45, d); _dummy.updateMatrix(); suckers.setMatrixAt(si++, _dummy.matrix); } } }
    suckers.instanceMatrix.needsUpdate = true;
    body.position.y = lerp(-R * 0.15, -R * 6.5, st.dive) + Math.sin(t * 0.8) * R * 0.08; head.rotation.x = Math.sin(t * 0.6) * 0.04 - st.attack * 0.18; }
  return { g, size: R * 6, top: R * 5.8, anim, mats: [mat], giant: S > 6, arms, body, head, eyes: [V(-1.0 * R, 0.06 * R, 1.48 * R), V(1.0 * R, 0.06 * R, 1.48 * R)] };
}

// ---------- giant crab ----------
function crab(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1 * S, sh = M(P.top), dk = M(P.dark || lerpHex(P.top, 0, 0.45)), bel = M(P.belly), eye = M(P.eye, 'glow'), spike = M(P.accent);
  const shell = grp(body, 0, 0, 0); part(shell, SPH(), sh, 3.4 * R, 1.3 * R, 2.6 * R, 0, 0.2 * R, 0); part(shell, SPH(), bel, 3.2 * R, 0.7 * R, 2.4 * R, 0, -0.25 * R, 0);
  for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; part(shell, CON(), spike, 0.22 * R, 0.6 * R, 0.22 * R, Math.sin(a) * 1.65 * R, 0.25 * R, Math.cos(a) * 1.2 * R, Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2); }
  for (let i = 0; i < 12; i++) part(shell, SPH_LO(), dk, 0.4 * R, 0.25 * R, 0.4 * R, (hash2(i, 1) - 0.5) * 2.4 * R, 0.75 * R, (hash2(i, 2) - 0.5) * 1.6 * R);
  if (P.glow) for (let i = 0; i < 10; i++) part(shell, BOX(), M(P.accent, 'glow'), 0.08 * R, 0.05 * R, (0.5 + hash2(i, 3)) * R, (hash2(i, 4) - 0.5) * 2.6 * R, 0.78 * R, (hash2(i, 5) - 0.5) * 1.6 * R, 0, hash2(i, 6) * 3, 0);
  for (const sd of [-1, 1]) { rod(shell, dk, V(sd * 0.4 * R, 0.6 * R, 1.0 * R), V(sd * 0.55 * R, 1.5 * R, 1.25 * R), 0.1 * R); part(shell, SPH(), eye, 0.32 * R, 0.32 * R, 0.32 * R, sd * 0.55 * R, 1.6 * R, 1.28 * R); part(shell, SPH_LO(), M(0x080808), 0.16 * R, 0.16 * R, 0.1 * R, sd * 0.55 * R, 1.62 * R, 1.42 * R); }
  mergeParts(shell);
  const legs = []; for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const z = (0.75 - i * 0.5) * R, lg = grp(body, sd * 1.5 * R, 0.05 * R, z), sp = 0.45 - i * 0.32;
    const K = V(sd * 1.7 * R, 1.35 * R, sp * 1.4 * R), F = V(sd * 3.1 * R, -1.1 * R, sp * 2.8 * R); rod(lg, sh, V(0, 0, 0), K, 0.2 * R); part(lg, SPH_LO(), dk, 0.45 * R, 0.45 * R, 0.45 * R, K.x, K.y, K.z); rod(lg, dk, K, F, 0.15 * R);
    for (let k = 1; k < 4; k++) part(lg, CON(), spike, 0.1 * R, 0.25 * R, 0.1 * R, K.x + (F.x - K.x) * k / 4, K.y + (F.y - K.y) * k / 4 + 0.15 * R, K.z + (F.z - K.z) * k / 4);
    mergeParts(lg); legs.push({ up1: lg, sd, ph: i * 1.3 + (sd > 0 ? 0 : 0.6) }); }
  const claws = [-1, 1].map((sd) => { const arm = grp(body, sd * 1.25 * R, 0.35 * R, 1.15 * R), E = V(sd * 1.1 * R, 1.25 * R, 0.9 * R), Hh = V(sd * 0.75 * R, 1.05 * R, 2.3 * R);
    rod(arm, sh, V(0, 0, 0), E, 0.32 * R); part(arm, SPH_LO(), dk, 0.75 * R, 0.75 * R, 0.75 * R, E.x, E.y, E.z); rod(arm, sh, E, Hh, 0.3 * R); for (let k = 0; k < 3; k++) part(arm, CON(), spike, 0.12 * R, 0.35 * R, 0.12 * R, E.x + (Hh.x - E.x) * (k + 0.5) / 3, E.y + (Hh.y - E.y) * (k + 0.5) / 3 + 0.3 * R, E.z + (Hh.z - E.z) * (k + 0.5) / 3);
    const hand = grp(arm, Hh.x, Hh.y, Hh.z); part(hand, SPH(), sh, 1.5 * R, 1.15 * R, 2.5 * R, 0, 0, 0.7 * R); part(hand, SPH(), bel, 1.2 * R, 0.6 * R, 2.0 * R, 0, -0.35 * R, 0.7 * R);
    part(hand, CON(), dk, 0.6 * R, 2.0 * R, 0.5 * R, 0, 0.22 * R, 2.6 * R, Math.PI / 2 + 0.12); for (let k = 0; k < 4; k++) part(hand, CON(), M(0xf0e6d0), 0.09 * R, 0.24 * R, 0.09 * R, 0, -0.05 * R, 1.9 * R + k * 0.32 * R, Math.PI);
    const pin = grp(hand, 0, -0.35 * R, 1.7 * R); part(pin, CON(), dk, 0.5 * R, 1.8 * R, 0.42 * R, 0, 0, 0.9 * R, Math.PI / 2 - 0.12); for (let k = 0; k < 4; k++) part(pin, CON(), M(0xf0e6d0), 0.08 * R, 0.22 * R, 0.08 * R, 0, 0.18 * R, 0.25 * R + k * 0.3 * R);
    mergeParts(arm); mergeParts(hand); mergeParts(pin); return { arm, pin, sd }; });
  let t = 0; function anim(dt, st) { t += dt * (2 + st.speed * 6); for (const L of legs) { L.up1.rotation.z = L.sd * Math.max(0, Math.sin(t + L.ph)) * 0.22 * (0.3 + st.speed); L.up1.rotation.y = Math.cos(t + L.ph) * 0.2 * (0.3 + st.speed); }
    for (const C of claws) { C.arm.rotation.x = -0.05 - st.attack * 0.55 + Math.sin(t * 0.4 + C.sd) * 0.06; C.pin.rotation.x = 0.05 + Math.abs(Math.sin(t * 0.7 + C.sd)) * 0.4 + st.attack * 0.3; }
    body.position.y = lerp(-0.35 * R, -4 * R, st.dive) + Math.abs(Math.sin(t)) * 0.05 * R; }
  return { g, size: 3 * R, top: 3 * R, anim, mats: [] };
}

// ---------- abyssal angler ----------
// modelled on the deep-sea anglerfish: a huge head that is mostly mouth, the lower jaw jutting past the upper and tilted up,
// long needle fangs of uneven length leaning inward, tiny eyes set high, lumpy dark skin, and the fishing rod (illicium)
// arcing forward from the brow to a glowing lure (esca) with trailing threads
function needles(parent, mat, n, w, z0, z1, y, len, down, seed) { for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * 2 - 1, x = t * w, z = z1 - (z1 - z0) * t * t, f = 1 - 0.45 * Math.abs(t), l = len * f * (0.55 + 0.75 * hash2(i, seed));
  const tooth = part(parent, CON(), mat, l * 0.13, l, l * 0.13, x, y + (down ? -l * 0.45 : l * 0.45), z - l * 0.15, down ? Math.PI + 0.3 : -0.3, 0, -t * 0.25); tooth.rotation.order = 'YXZ'; tooth.rotation.y = t * 0.8; } }
function angler(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1 * S, sk = M(P.top), dk = M(P.dark || lerpHex(P.top, 0, 0.45)), lip = M(lerpHex(P.top, 0x5a1010, 0.45)), bone = M(0xf4f0e2), glow = M(P.accent, 'glow'), mouth = M(0x120406);
  const hd = grp(body, 0, 0.2 * R, 0); hd.rotation.x = -0.18;
  // cranium: a high dome over the mouth, running back into the body
  part(hd, SPH(), sk, 3.3 * R, 2.9 * R, 3.5 * R, 0, 0.75 * R, -0.1 * R); part(hd, SPH(), sk, 2.7 * R, 2.2 * R, 2.4 * R, 0, 0.55 * R, 1.1 * R);
  for (let i = 0; i < 22; i++) { const a = hash2(i, 9) * 2.4 - 1.2, b = hash2(i, 8) * 1.3 + 0.1; part(hd, SPH_LO(), dk, 0.28 * R, 0.18 * R, 0.28 * R, Math.sin(a) * 1.55 * R * Math.cos(b * 0.6), 0.75 * R + Math.sin(b) * 1.3 * R, -0.1 * R + Math.cos(a) * 1.4 * R * Math.cos(b * 0.6)); }
  for (const sd of [-1, 1]) { part(hd, SPH(), M(0x050505), 0.36 * R, 0.36 * R, 0.36 * R, sd * 0.88 * R, 1.55 * R, 1.25 * R); part(hd, SPH(), M(P.eye, 'glow'), 0.24 * R, 0.24 * R, 0.24 * R, sd * 0.98 * R, 1.57 * R, 1.33 * R); }
  // upper jaw: a lip line low on the face with a row of needles hanging down and back
  part(hd, SPH(), lip, 2.9 * R, 0.4 * R, 2.6 * R, 0, -0.32 * R, 0.85 * R); part(hd, SPH(), mouth, 2.6 * R, 1.6 * R, 2.6 * R, 0, -0.75 * R, 0.6 * R);
  needles(hd, bone, 13, 1.3 * R, -0.3 * R, 2.05 * R, -0.4 * R, 0.85 * R, true, 3);
  // lower jaw: a deep scoop hinged far back, jutting past the upper jaw, lined with the longest fangs
  const jaw = grp(hd, 0, -0.55 * R, -1.0 * R); part(jaw, SPH(), sk, 3.3 * R, 1.6 * R, 4.0 * R, 0, -0.55 * R, 1.55 * R); part(jaw, SPH(), dk, 2.9 * R, 0.9 * R, 3.6 * R, 0, -0.95 * R, 1.5 * R);
  part(jaw, SPH(), lip, 3.0 * R, 0.4 * R, 3.7 * R, 0, 0.0 * R, 1.65 * R); part(jaw, SPH(), mouth, 2.6 * R, 0.5 * R, 3.2 * R, 0, 0.12 * R, 1.55 * R);
  needles(jaw, bone, 13, 1.4 * R, 0.0 * R, 3.35 * R, 0.1 * R, 1.25 * R, false, 7);
  mergeParts(hd); // before the lure goes on, so the lure stays its own mesh to pulse
  // the rod and the lure
  const rodPts = curvePts([V(0, 2.05 * R, 0.9 * R), V(0, 3.1 * R, 0.9 * R), V(0, 3.75 * R, 1.9 * R), V(0, 3.35 * R, 3.1 * R)], 16); hd.add(new THREE.Mesh(taperTube(rodPts, { radial: 6, r: (s) => 0.13 * R * (1 - s * 0.65) }), dk));
  const esca = grp(hd, 0, 3.2 * R, 3.15 * R); const lure = part(esca, SPH(), glow, 0.55 * R, 0.6 * R, 0.55 * R); part(esca, CON(), glow, 0.18 * R, 0.45 * R, 0.18 * R, 0, 0.42 * R, 0);
  const halo = part(esca, SPH(), new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }), 1.3 * R, 1.3 * R, 1.3 * R);
  for (let i = 0; i < 4; i++) { const a = i * 1.7; const fp = curvePts([V(0, -0.2 * R, 0), V(Math.cos(a) * 0.25 * R, -0.7 * R, Math.sin(a) * 0.25 * R), V(Math.cos(a) * 0.45 * R, -1.3 * R, Math.sin(a) * 0.4 * R)], 8); esca.add(new THREE.Mesh(taperTube(fp, { radial: 4, r: (s) => 0.04 * R * (1 - s * 0.7) }), glow)); }
  // body: short and tapering behind the head, with small fins and a rounded tail
  const bp = curvePts([V(0, 0.75 * R, -0.6 * R), V(0, 0.6 * R, -2.2 * R), V(0, 0.45 * R, -3.9 * R)], 14); body.add(new THREE.Mesh(taperTube(bp, { radial: 16, wide: 0.82, r: (s) => R * (1.6 * Math.pow(1 - s, 0.75) + 0.24), color: (s, a, c) => { c.setHex(P.top); if (hash2(Math.floor(s * 30), Math.floor(a * 3)) > 0.8) c.multiplyScalar(0.7); } }), glowVC()));
  const finM = M(P.fin || P.top, 'fin');
  for (const sd of [-1, 1]) { const pf = part(body, FAN(), finM, 1.2 * R, 1.0 * R, 1, sd * 1.35 * R, -0.1 * R, -1.2 * R); pf.rotation.set(0, sd * (Math.PI / 2 + 0.7), -0.4); if (sd < 0) pf.scale.x *= -1; }
  part(body, FINTRI(), finM, 0.9 * R, 0.9 * R, 1, 0, 1.2 * R, -3.0 * R, 0, Math.PI / 2, 0); part(body, FINTRI(), finM, 0.8 * R, 0.8 * R, 1, 0, -0.35 * R, -3.0 * R, Math.PI, Math.PI / 2, 0);
  const tail = grp(body, 0, 0.4 * R, -4.0 * R); part(tail, FAN(), finM, 1.9 * R, 1.8 * R, 1, 0, 0, -0.2 * R).rotation.set(0, -Math.PI / 2, Math.PI);
  mergeParts(tail);
  let t = 0; function anim(dt, st) { t += dt * (1.2 + st.speed * 3); jaw.rotation.x = 0.28 + st.attack * 0.85 + Math.sin(t * 0.5) * 0.05; tail.rotation.y = Math.sin(t * 2) * 0.45;
    const pu = 1 + Math.sin(t * 3) * 0.14; lure.scale.set(0.55 * R * pu, 0.6 * R * pu, 0.55 * R * pu); halo.scale.setScalar(1.3 * R * pu * (1 + st.attack * 0.6)); esca.rotation.z = Math.sin(t * 1.3) * 0.25; esca.rotation.x = Math.sin(t * 0.9) * 0.2;
    body.position.y = lerp(0.55 * R, -5 * R, st.dive) + Math.sin(t * 0.8) * 0.1 * R; hd.rotation.x = -0.18 - st.attack * 0.3; }
  return { g, size: 2.6 * R, top: 4.2 * R, anim, mats: [] };
}

// ---------- storm jellyfish ----------
function jelly(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 0.8 * S, bellM = new THREE.MeshPhongMaterial({ color: P.top, transparent: true, opacity: 0.6, emissive: P.accent, emissiveIntensity: 0.35, shininess: 80, depthWrite: false, side: THREE.DoubleSide });
  const bell = grp(body); const bg = new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI * 0.55); const bp = bg.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i), a = Math.atan2(bp.getZ(i), bp.getX(i)); if (y < 0.25) { const k = 1 + Math.sin(a * 8) * 0.06 * (1 - y * 3); bp.setX(i, bp.getX(i) * k); bp.setZ(i, bp.getZ(i) * k); } } bg.computeVertexNormals();
  const bm = new THREE.Mesh(bg, bellM); bm.scale.set(1.6 * R, 2.2 * R, 1.6 * R); bell.add(bm); part(bell, SPH(), M(P.accent, 'glow'), 1.0 * R, 0.6 * R, 1.0 * R, 0, 0.5 * R, 0);
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4; part(bell, TOR(), M(P.accent, 'glow'), 0.6 * R, 0.6 * R, 0.6, Math.cos(a) * 0.5 * R, 0.6 * R, Math.sin(a) * 0.5 * R, Math.PI / 2); }
  const arms = []; for (let i = 0; i < 5; i++) { const tb = new SpineTube(14, { radial: 6, mat: glowVC({ transparent: true, opacity: 0.75 }), r: (s) => 0.22 * R * (1 - s * 0.8), color: (s, a, c) => c.setHex(s % 0.2 < 0.1 ? P.accent : P.top), glow: () => 0.6 }); body.add(tb.mesh); arms.push({ tb, a: (i / 5) * TAU, pts: Array.from({ length: 14 }, () => new THREE.Vector3()) }); }
  const NL = 18, lineP = new Float32Array(NL * 10 * 2 * 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lineP, 3)); const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: P.accent, transparent: true, opacity: 0.8 })); lines.frustumCulled = false; body.add(lines);
  let t = Math.random() * 5; function anim(dt, st) { t += dt * (1 + st.attack * 2); const pulse = Math.sin(t * 2.4); bell.scale.set(1 + pulse * 0.08, 1 - pulse * 0.1, 1 + pulse * 0.08);
    for (const A of arms) { for (let k = 0; k < 14; k++) { const s = k / 13; A.pts[k].set(Math.cos(A.a) * 0.5 * R + Math.sin(t + s * 4 + A.a) * 0.4 * R * s, -s * 4 * R, Math.sin(A.a) * 0.5 * R + Math.cos(t * 0.8 + s * 3 + A.a) * 0.4 * R * s); } A.tb.set(A.pts); }
    let k = 0; for (let i = 0; i < NL; i++) { const a = (i / NL) * TAU, r0 = 1.8 * R; let px = Math.cos(a) * r0, pz = Math.sin(a) * r0, py = 0; for (let j = 0; j < 10; j++) { const nx = px + Math.sin(t * 1.3 + i + j * 0.6) * 0.25 * R, ny = py - 0.7 * R, nz = pz + Math.cos(t * 1.1 + i * 2 + j * 0.5) * 0.25 * R; lineP[k++] = px; lineP[k++] = py; lineP[k++] = pz; lineP[k++] = nx; lineP[k++] = ny; lineP[k++] = nz; px = nx; py = ny; pz = nz; } } lg.attributes.position.needsUpdate = true;
    body.position.y = lerp(-0.2 * R, -6 * R, st.dive) + pulse * 0.15 * R; bellM.emissiveIntensity = 0.35 + st.attack * 1.2 + st.hurt; }
  return { g, size: 2 * R, top: 1.8 * R, anim, mats: [] };
}

// ---------- porpoise (friendly: pods swim with your ship and ride its bow wave) ----------
function porpoise(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1.9 * S, L = 18 * S, N = 24, mat = glowVC();
  const prof = (s) => (s < 0.18 ? 0.55 + 0.45 * Math.sin((s / 0.18) * Math.PI / 2) : 0.08 + 0.92 * Math.pow(Math.max(0, 1 - (s - 0.18) / 0.82), 1.4));
  const tube = new SpineTube(N, { radial: 14, flat: 0.9, mat, r: (s) => R * prof(s), color: (s, a, c) => { skin(P, s, a, c, 30); const down = -Math.cos(a); if (down > 0.2 && Math.sin(a * 22) > 0.3) c.multiplyScalar(0.8); if (hash2(Math.floor(s * 70), Math.floor(a * 5)) > 0.93 && down < 0.3) c.setHex(0xd8d4c8); } });
  body.add(tube.mesh);
  const head = grp(body); part(head, SPH(), M(P.top), R * 1.1, R * 1.0, R * 1.0, 0, 0, R * 0.2); part(head, BOX(), M(lerpHex(P.top, 0, 0.5)), R * 1.05, R * 0.05, R * 1.2, 0, -R * 0.35, -R * 0.3);
  for (const sd of [-1, 1]) part(head, SPH(), M(P.eye, P.eye === 0x0a0a0a ? 'skin' : 'glow'), R * 0.12, R * 0.12, R * 0.12, sd * R * 0.5, -R * 0.2, -R * 0.6);
  part(head, CYL(), M(0x101010), R * 0.12, R * 0.04, R * 0.2, 0, R * 0.48, -R * 0.4); mergeParts(head);
  const flukes = grp(body); for (const sd of [-1, 1]) { const f = part(flukes, FINTRI(), M(P.top, 'fin'), R * 2.2, R * 2.6, 1, sd * R * 0.6, 0, 0); f.rotation.set(-Math.PI / 2, 0, -sd * Math.PI / 2 - sd * 0.3); }
  const pecs = [-1, 1].map((sd) => { const p = grp(body); const f = part(p, FINTRI(), M(P.top, 'fin'), R * 0.9, R * 2.4, 1, 0, 0, 0); f.rotation.set(-Math.PI / 2, 0, -sd * Math.PI / 2 + sd * 0.4); p.userData.sd = sd; return p; });
  const pts = Array.from({ length: N }, () => new THREE.Vector3()); let ph = Math.random() * 5;
  function anim(dt, st) { ph += dt * (1 + st.speed * 1.5); for (let i = 0; i < N; i++) { const s = i / (N - 1); pts[i].set(0, Math.sin(ph - s * 3) * R * 0.35 * s * s, (0.35 - s) * L); } tube.set(pts); stick(head, tube, pts, 0, 0, 0, true); stick(flukes, tube, pts, N - 1); for (const p of pecs) stick(p, tube, pts, 5, -R * 0.4, p.userData.sd * R * 0.85);
    const breach = Math.sin(Math.min(1, st.attack) * Math.PI); body.position.y = lerp(-R * 0.4, -R * 4, st.dive) + breach * R * 5; body.rotation.x = -Math.cos(Math.min(1, st.attack) * Math.PI) * 0.7 * (st.attack > 0 ? 1 : 0); }
  return { g, size: L * 0.42, top: R * 2.4, anim, mats: [mat], spout: V(0, R * 1.0, L * 0.3) };
}

// ---------- the Elder One, rising from the deep ----------
// one smooth body: broad shoulders the arms grow out of (each arm is a single bending tube from inside the shoulder,
// through a rounded elbow to the wrist), a neck into the octopoid head, a beard of feeding tentacles, clawed hands and
// great ribbed wings
function elder(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1 * S, sk = M(P.top), dk = M(P.dark || lerpHex(P.top, 0, 0.45)), bel = M(P.belly), eye = M(P.eye, 'glow'), claw = M(0x16140e), mem = M(P.wing || P.dark || P.top, 'fin');
  const torso = grp(body);
  part(torso, SPH(), sk, 5.4 * R, 6.6 * R, 4.0 * R, 0, 3.0 * R, 0); part(torso, SPH(), bel, 4.0 * R, 5.4 * R, 2.5 * R, 0, 2.7 * R, 1.0 * R);
  part(torso, SPH(), sk, 8.6 * R, 3.3 * R, 3.9 * R, 0, 5.7 * R, -0.1 * R); // shoulder yoke the arms grow from
  part(torso, SPH(), sk, 3.1 * R, 2.8 * R, 2.9 * R, 0, 6.9 * R, 0.3 * R); // neck
  for (const sd of [-1, 1]) { part(torso, SPH(), sk, 2.9 * R, 2.3 * R, 1.5 * R, sd * 1.35 * R, 4.7 * R, 1.35 * R, 0, 0, sd * 0.15); part(torso, SPH(), dk, 2.4 * R, 1.6 * R, 2.2 * R, sd * 3.3 * R, 5.9 * R, -0.2 * R, 0, 0, sd * 0.5); }
  for (let i = 0; i < 6; i++) part(torso, CAP(), dk, 0.2 * R, (1.55 - Math.abs(i - 2.5) * 0.18) * R, 0.2 * R, 0, (0.9 + i * 0.62) * R, (2.05 + Math.sin(i * 0.5) * 0.08) * R, 0, 0, Math.PI / 2);
  for (let i = 0; i < 9; i++) part(torso, CON(), dk, 0.45 * R, (1.3 + Math.sin(i * 0.7) * 0.4) * R, 0.45 * R, 0, (3.2 + i * 0.55) * R, (-1.75 - Math.sin(i * 0.3) * 0.15) * R, -0.85);
  for (let i = 0; i < 26; i++) { const a = hash2(i, 4) * TAU, y = 1.2 + hash2(i, 5) * 5.2; part(torso, SPH_LO(), dk, 0.35 * R, 0.22 * R, 0.35 * R, Math.cos(a) * 2.3 * R * (1 - Math.abs(y - 4) * 0.08), y * R, Math.sin(a) * 1.6 * R - 0.2 * R); }
  if (P.glow) for (let i = 0; i < 8; i++) part(torso, BOX(), M(P.accent, 'glow'), 0.1 * R, (0.4 + hash2(i, 6) * 0.6) * R, 0.06 * R, (hash2(i, 7) - 0.5) * 2.4 * R, (2.5 + hash2(i, 8) * 2.6) * R, 1.95 * R, 0, 0, hash2(i, 9) * 2);
  // head: the tall squid dome leaning back, ridged, with deep sockets, a pair of small upper eyes and gill slits
  const head = grp(torso, 0, 7.6 * R, 0.7 * R);
  part(head, SPH(), sk, 3.6 * R, 4.6 * R, 4.6 * R, 0, 1.5 * R, -1.0 * R, -0.5); part(head, SPH(), sk, 3.1 * R, 2.5 * R, 2.7 * R, 0, 0, 0.55 * R);
  for (let i = 0; i < 4; i++) part(head, CAP(), dk, 0.26 * R, (2.6 - i * 0.3) * R, 0.26 * R, 0, (1.2 + i * 0.75) * R, (0.3 - i * 0.55) * R, -0.5 - i * 0.22, 0, Math.PI / 2);
  for (let i = 0; i < 12; i++) part(head, SPH_LO(), dk, 0.55 * R, 0.35 * R, 0.55 * R, (hash2(i, 1) - 0.5) * 2.8 * R, 1.6 * R + hash2(i, 2) * 2.0 * R, -1.3 * R + (hash2(i, 3) - 0.5) * 2 * R);
  for (const sd of [-1, 1]) { part(head, SPH(), M(0x050505), 0.95 * R, 0.72 * R, 0.6 * R, sd * 0.95 * R, 0.5 * R, 1.45 * R); part(head, SPH(), eye, 0.72 * R, 0.5 * R, 0.5 * R, sd * 1.0 * R, 0.52 * R, 1.62 * R); part(head, BOX(), M(0x050505), 0.5 * R, 0.08 * R, 0.1 * R, sd * 1.05 * R, 0.52 * R, 1.86 * R);
    part(head, CAP(), dk, 0.42 * R, 1.15 * R, 0.42 * R, sd * 0.92 * R, 0.98 * R, 1.42 * R, 0, 0, Math.PI / 2 + sd * 0.32); part(head, SPH(), eye, 0.24 * R, 0.2 * R, 0.2 * R, sd * 0.55 * R, 1.55 * R, 1.35 * R);
    for (let k = 0; k < 3; k++) part(head, BOX(), M(0x0a0a0a), 0.06 * R, 0.9 * R, 0.1 * R, sd * 1.45 * R, (0.2 - k * 0.3) * R, (0.2 - k * 0.15) * R, 0.2, 0, sd * 0.2); }
  if (P.crown) for (let i = 0; i < 7; i++) part(head, CON(), M(P.accent, 'glow'), 0.3 * R, (1.0 + (3 - Math.abs(i - 3)) * 0.25) * R, 0.3 * R, (i - 3) * 0.55 * R, 3.0 * R - Math.abs(i - 3) * 0.25 * R, 0.0 * R, -0.35, 0, (i - 3) * 0.12);
  mergeParts(torso);
  // beard of feeding tentacles with pale suckers underneath
  const mat = glowVC(), feelers = []; for (let i = 0; i < 12; i++) { const tb = new SpineTube(18, { radial: 8, mat, r: (s) => R * 0.48 * Math.pow(1 - s * 0.92, 1.1), color: (s, a, c) => { c.setHex(P.top); const under = -Math.cos(a); if (under > 0.3) { c.setHex(P.belly); if (Math.abs(Math.sin(s * 40)) > 0.75) c.lerp(tmpC.setHex(0xf0e0d0), 0.6); } }, glow: P.glow ? (s) => (Math.abs(Math.sin(s * 20)) > 0.92 ? 1.2 : 0) : null }); body.add(tb.mesh);
    const a = ((i + 0.5) / 12) * Math.PI - Math.PI / 2; feelers.push({ tb, x: Math.sin(a) * 1.1 * R, z: 1.6 * R + Math.cos(a) * 0.5 * R, ph: i * 0.9, len: 0.85 + hash2(i, 11) * 0.35, pts: Array.from({ length: 18 }, () => new THREE.Vector3()) }); }
  // arms: one tube each, bulging at the biceps and forearm, rooted deep in the shoulder yoke
  const armMat = glowVC(), arms = [-1, 1].map((sd) => { const tb = new SpineTube(20, { radial: 12, mat: armMat, r: (s) => R * (1.35 - 0.78 * s + 0.16 * Math.sin(s * TAU - 0.4) + (s < 0.12 ? (0.12 - s) * 3 : 0)), color: (s, a, c) => { c.setHex(P.top); const inner = Math.cos(a) < -0.2; if (inner) c.lerp(tmpC.setHex(P.belly), 0.45); if (hash2(Math.floor(s * 40), Math.floor(a * 3)) > 0.82) c.multiplyScalar(0.78); } }); body.add(tb.mesh);
    const hand = grp(body); part(hand, SPH(), sk, 1.7 * R, 0.75 * R, 1.6 * R, 0, 0, 0.45 * R);
    for (let k = 0; k < 4; k++) { const x = (k - 1.5) * 0.42 * R, f = curvePts([V(x, 0, 0.9 * R), V(x * 1.25, -0.15 * R, 2.1 * R), V(x * 1.35, -0.75 * R, 3.0 * R), V(x * 1.35, -1.4 * R, 3.3 * R)], 10); hand.add(new THREE.Mesh(taperTube(f, { radial: 7, r: (s) => R * (0.26 - s * 0.16) }), sk));
      part(hand, CON(), claw, 0.16 * R, 0.85 * R, 0.16 * R, x * 1.35, -1.85 * R, 3.25 * R, Math.PI - 0.25); }
    const th = curvePts([V(sd * -0.7 * R, 0, 0.4 * R), V(sd * -1.3 * R, -0.2 * R, 1.2 * R), V(sd * -1.4 * R, -0.7 * R, 1.9 * R)], 8); hand.add(new THREE.Mesh(taperTube(th, { radial: 7, r: (s) => R * (0.28 - s * 0.15) }), sk)); part(hand, CON(), claw, 0.16 * R, 0.7 * R, 0.16 * R, sd * -1.42 * R, -1.05 * R, 2.15 * R, Math.PI - 0.5);
    const web = part(hand, FAN(), M(P.wing || P.dark || P.top, 'fin'), 1.4 * R, 1.6 * R, 1, 0, -0.05 * R, 1.1 * R); web.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI / 2); mergeParts(hand);
    return { tb, hand, sd, pts: Array.from({ length: 20 }, () => new THREE.Vector3()) }; });
  // wings from the upper back: bones taper from thick roots, a hooked claw at each wing's thumb
  const wings = [-1, 1].map((sd) => { const w = grp(body, sd * 1.8 * R, 7.0 * R, -1.6 * R); const m = part(w, WING(), mem, 11 * R, 9 * R, 1, 0, 0, 0); m.rotation.x = -Math.PI / 2;
    for (const [x, z] of [[1, -1], [1.05, -0.55], [0.85, -0.25], [0.62, 0], [0.38, 0.2]]) rod(w, dk, V(0, 0, 0), V(x * 11 * R, 0.1, z * 9 * R), 0.3 * R, CON());
    part(w, CON(), claw, 0.3 * R, 1.3 * R, 0.3 * R, 11.6 * R, 0.4 * R, -9.6 * R, 0.4, 0, -0.6); part(w, SPH(), dk, 1.2 * R, 0.9 * R, 1.2 * R, 0, 0, 0); if (sd < 0) w.scale.x = -1; return w; });
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpE = new THREE.Vector3(), tmpW = new THREE.Vector3(), tmpN = new THREE.Vector3();
  let t = 0; function anim(dt, st) { t += dt * (1 + st.speed); const rise = st.rise ?? 1;
    for (const F of feelers) { for (let k = 0; k < 18; k++) { const s = (k / 17) * F.len; F.pts[k].set(F.x * (1 + s * 0.35) + Math.sin(t * 1.4 + F.ph + s * 3) * 0.55 * R * s, 7.3 * R - s * 4.6 * R * (1 - st.attack * 0.4), F.z + s * (0.8 + st.attack * 2.8) * R + Math.cos(t * 1.1 + F.ph + s * 2) * 0.45 * R * s); } F.tb.set(F.pts); }
    for (const A of arms) { const sd = A.sd, th = 0.45 + Math.sin(t * 0.7 + sd) * 0.15 + st.attack * 1.5, ph = 0.95 - st.attack * 0.5;
      const S0 = tmpA.set(sd * 2.6 * R, 5.8 * R, 0.1 * R), u = tmpB.set(sd * 0.42, -Math.cos(th), Math.sin(th)).normalize();
      const E = tmpE.copy(S0).addScaledVector(u, 3.9 * R), f = tmpN.set(sd * 0.12, -Math.cos(th + ph), Math.sin(th + ph)).normalize(), W = tmpW.copy(E).addScaledVector(f, 3.6 * R);
      // a quadratic curve through the elbow gives one smooth limb; it starts a little inside the shoulder
      const cx = 2 * E.x - (S0.x + W.x) / 2, cy = 2 * E.y - (S0.y + W.y) / 2, cz = 2 * E.z - (S0.z + W.z) / 2, sx = S0.x - u.x * 0.9 * R, sy = S0.y - u.y * 0.9 * R, sz = S0.z - u.z * 0.9 * R;
      for (let k = 0; k < 20; k++) { const q = k / 19, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q; A.pts[k].set(a * sx + b * cx + c * W.x, a * sy + b * cy + c * W.y, a * sz + b * cz + c * W.z); }
      A.tb.set(A.pts); const fr = A.tb.frameAt(19); A.hand.position.copy(W); orient(A.hand, tmpV.copy(fr.T), tmpV2.copy(fr.N)); A.hand.rotateZ(sd * 0.2); }
    wings.forEach((w, i) => { const sd = i ? 1 : -1; w.rotation.set(0.6, sd * -0.5, sd * (0.5 + Math.sin(t * 1.2) * 0.25 + st.attack * 0.3)); });
    body.position.y = lerp(-9 * R, -1.5 * R, rise) * (1 - st.dive) - st.dive * 14 * R + Math.sin(t * 0.7) * 0.3 * R; }
  return { g, size: 4.5 * R, top: 11 * R, anim, mats: [mat, armMat] };
}

// ---------- registry ----------
export const SPECIES = {
  shark: { name: 'Shark', build: shark, variants: [
    { name: 'Reef Shark', top: 0x6c8496, belly: 0xe8eef2, accent: 0x51667a, scale: 1 },
    { name: 'Tiger Shark', top: 0x7c7a62, belly: 0xece6d6, accent: 0x34321e, pattern: 'stripes', scale: 1.25 },
    { name: 'Hammerhead', top: 0x667686, belly: 0xe2e8ec, accent: 0x4a5a6a, hammer: true, scale: 1.35 },
    { name: 'Great White', top: 0x56626c, belly: 0xf6f8fa, accent: 0x3e4a54, scale: 1.75 } ] },
  // megalodons: four times a shark's length, a heavier skull, double rows of jagged teeth; each type has its own look
  megalodon: { name: 'Megalodon', build: megalodon, variants: [
    { name: 'Ancient Megalodon', top: 0x4a5a50, belly: 0xc8ccc0, accent: 0x2a342e, pattern: 'scars', eye: 0xffd27a, barnacles: true, scale: 4 },
    { name: 'Crested Megalodon', top: 0xc8642a, belly: 0xf2e6d0, accent: 0x5a2410, pattern: 'bands', eye: 0xffd23a, crest: true, scale: 4.1 },
    { name: 'Ravening Megalodon', top: 0x2a221e, belly: 0x8a7a70, accent: 0x6a1a1a, pattern: 'scars', eye: 0xff2a1a, barnacles: true, scale: 4.3 },
    { name: 'Shadow Megalodon', top: 0x111418, belly: 0x2a2e34, accent: 0xbff4ff, pattern: 'rings', glow: true, eye: 0x9affff, scale: 4.4 },
    { name: 'Phantom Megalodon', top: 0xd6e2e6, belly: 0xffffff, accent: 0x7ad8e6, pattern: 'spots', glow: true, eye: 0x6affff, scale: 4.6 } ] },
  serpent: { name: 'Sea Serpent', build: serpent, variants: [
    { name: 'Emerald Serpent', top: 0x1f7a3e, belly: 0xe6d47a, accent: 0x0f4a24, fin: 0xd8b03a, eye: 0xffd23a, pattern: 'diamond' },
    { name: 'Crimson Wyrm', top: 0x9a1a1a, belly: 0x2a1a1a, accent: 0x1a0a0a, fin: 0x1a0a0a, eye: 0xffe23a, pattern: 'bands', horn: 0x1a1a1a },
    { name: 'Azure Serpent', top: 0x1f5aa8, belly: 0xe8f2ff, accent: 0x6ad6ff, fin: 0x6ad6ff, eye: 0x9affff, pattern: 'stripes', glow: true },
    { name: 'Golden Naga', top: 0xd8a02a, belly: 0x5a2a7a, accent: 0x6a2a8a, fin: 0x7a3aa8, eye: 0xff4a4a, pattern: 'diamond', whiskers: true },
    { name: 'Obsidian Horror', top: 0x16141a, belly: 0x3a1a1a, accent: 0xff3a1a, fin: 0x2a0a0a, eye: 0xff3a1a, pattern: 'runes', glow: true, horn: 0x3a3a3a },
    { name: 'Frost Wyrm', top: 0xb8dcf0, belly: 0xffffff, accent: 0x5aa8e0, fin: 0xe0f4ff, eye: 0x5affff, pattern: 'spots', horn: 0xdff6ff },
    { name: 'Sea Dragon', top: 0x2a6a5a, belly: 0xd8c890, accent: 0x14382e, fin: 0xc84a2a, wing: 0x8a3a2a, eye: 0xffa01a, pattern: 'diamond', wings: true, whiskers: true } ] },
  eel: { name: 'Lightning Eel', build: eel, variants: [
    { name: 'Thunder Eel', top: 0x1a2a4a, belly: 0xc8d8f0, accent: 0xffe23a, fin: 0x3a5a9a, eye: 0xffffff, pattern: 'stripes', glow: true },
    { name: 'Venom Eel', top: 0x1a3a1a, belly: 0xc8e0a0, accent: 0x7dff3a, fin: 0x2a5a2a, eye: 0x7dff3a, pattern: 'stripes', glow: true },
    { name: 'Ember Eel', top: 0x2a1410, belly: 0xe0b090, accent: 0xff7a1a, fin: 0x5a2a1a, eye: 0xffd23a, pattern: 'spots', glow: true } ] },
  octopus: { name: 'Giant Octopus', build: octopus, variants: [
    { name: 'Crimson Octopus', top: 0xb83a2a, belly: 0xf0b8a0, accent: 0x7a1a12, eye: 0xffd23a, pattern: 'spots' },
    { name: 'Violet Octopus', top: 0x6a2a8a, belly: 0xe0c0f0, accent: 0x3a1050, eye: 0x7dff3a, pattern: 'spots' },
    { name: 'Blue-Ringed Octopus', top: 0xd8b04a, belly: 0xf0e0b0, accent: 0x1a8aff, eye: 0x1a1a1a, pattern: 'rings', glow: true },
    { name: 'Ghost Octopus', top: 0xd8e0e4, belly: 0xffffff, accent: 0x9ab0c0, eye: 0x6affff, pattern: 'spots' } ] },
  kraken: { name: 'Kraken', build: kraken, variants: [
    { name: 'Bone Kraken', top: 0xd8d2c4, belly: 0xb0a098, accent: 0xaea496, dark: 0x6a6058, eye: 0x5aff5a, sucker: 0xe4d2cc, pattern: 'scars' },
    { name: 'Abyssal Kraken', top: 0x6a1818, belly: 0xd09888, accent: 0x3a0a0a, dark: 0x2a0808, eye: 0xffd23a, sucker: 0xe8b8a8, pattern: 'spots' },
    { name: 'Storm Kraken', top: 0x3a4a5a, belly: 0xb8c4d0, accent: 0x6ad6ff, dark: 0x1e2a36, eye: 0x9affff, sucker: 0xd8e4f0, pattern: 'rings', glow: true },
    { name: 'Elder Kraken', top: 0x3a4a2a, belly: 0xb0b088, accent: 0x1a2410, dark: 0x14200c, eye: 0xff4a1a, sucker: 0xd8d0a8, pattern: 'scars' } ] },
  squid: { name: 'Giant Squid', build: squid, variants: [
    { name: 'Abyssal Squid', top: 0x7a1a1a, belly: 0xe0a090, accent: 0x3a0a0a, fin: 0x5a1010, eye: 0xffd23a, pattern: 'spots' },
    { name: 'Storm Squid', top: 0x3a4a5a, belly: 0xc0ccd8, accent: 0x6ad6ff, fin: 0x2a3a4a, eye: 0x9affff, pattern: 'rings', glow: true },
    { name: 'Elder Squid', top: 0x3a4a2a, belly: 0xb8b890, accent: 0x1a2410, fin: 0x2a3a1a, eye: 0xff4a1a, pattern: 'scars' } ] },
  crab: { name: 'Giant Crab', build: crab, variants: [
    { name: 'Rust Crab', top: 0xb8501e, belly: 0xf0c8a0, accent: 0xf0e0c0, eye: 0x1a1a1a },
    { name: 'Iron Crab', top: 0x3a5a62, belly: 0x9ab0b4, accent: 0xc0d0d4, eye: 0xffd23a },
    { name: 'Lava Crab', top: 0x1e1a1a, belly: 0x3a2a24, accent: 0xff6a1a, eye: 0xff3a1a, glow: true } ] },
  angler: { name: 'Abyssal Angler', build: angler, variants: [
    { name: 'Deep Angler', top: 0x2a2a34, accent: 0x7affea, eye: 0xe0ffff, fin: 0x3a3a4a },
    { name: 'Pale Angler', top: 0xb8a8a0, accent: 0xffd23a, eye: 0xff4a1a, fin: 0x8a7a70 } ] },
  jelly: { name: 'Storm Jelly', build: jelly, variants: [
    { name: 'Pink Stormjelly', top: 0xff7ab8, accent: 0xff3a9a }, { name: 'Blue Stormjelly', top: 0x7ad0ff, accent: 0x3a8aff }, { name: 'Gold Stormjelly', top: 0xffd27a, accent: 0xffa01a } ] },
  porpoise: { name: 'Porpoise', build: porpoise, friendly: true, variants: [
    { name: 'Harbour Porpoise', top: 0x5a6670, belly: 0xd8dde0, accent: 0x3a444e, eye: 0x0a0a0a, scale: 0.16 },
    { name: 'Spotted Porpoise', top: 0x4a5866, belly: 0xc8d0d6, accent: 0xe8eef2, eye: 0x0a0a0a, pattern: 'spots', scale: 0.17 },
    { name: 'Painted Porpoise', top: 0x16181c, belly: 0xf2f4f6, accent: 0x2a2e34, eye: 0x0a0a0a, scale: 0.18 } ] },
  leviathan: { name: 'Leviathan', build: leviathan, variants: [
    { name: 'Grey Leviathan', top: 0x4a5560, belly: 0xa8b0b4, accent: 0x2a3036, fin: 0x6a2a2a, eye: 0xffa01a, pattern: 'scars', horn: 0xd8d0c0, scale: 1.3 },
    { name: 'White Leviathan', top: 0xdfe4e6, belly: 0xffffff, accent: 0x9aa8b0, fin: 0x8ab8d0, eye: 0xff2a1a, pattern: 'scars', horn: 0x2a2a2a, scale: 1.5 },
    { name: 'Black Leviathan', top: 0x141418, belly: 0x3a2a2a, accent: 0xff3a1a, fin: 0x3a0a0a, eye: 0xffd23a, pattern: 'runes', glow: true, horn: 0x8a1a1a, scale: 1.8 } ] },
  elder: { name: 'The Elder One', build: elder, variants: [
    { name: 'The Dreamer', top: 0x3e5a3a, belly: 0x8a9a6a, dark: 0x1e2e1c, wing: 0x2a3a26, eye: 0xffe23a, accent: 0xb8ff3a },
    { name: 'Void Dreamer', top: 0x3a2a5a, belly: 0x7a6aa0, dark: 0x1a1030, wing: 0x2a1a44, eye: 0x6affff, accent: 0x6affff, glow: true, crown: true },
    { name: 'Drowned God', top: 0xb8c0b0, belly: 0xe0e4d8, dark: 0x5a6a5a, wing: 0x6a7a6a, eye: 0x3aff8a, accent: 0x3aff8a, crown: true } ] },
  jormungandr: { name: 'Jormungandr', build: jormungandr, variants: [
    { name: 'Jormungandr', top: 0x2a4a3a, belly: 0xc8b878, accent: 0x7affc8, fin: 0x1a2a20, eye: 0x7affc8, pattern: 'runes', glow: true, horn: 0xe8dcc0 },
    { name: 'Jormungandr the Ashen', top: 0x3a3a3a, belly: 0xa89880, accent: 0xff8a2a, fin: 0x1a1a1a, eye: 0xff8a2a, pattern: 'runes', glow: true, horn: 0x1a1a1a } ] },
};
// Helheim's undead: each of its seas raises its own dead from the same beasts. Their colours rot toward the sea's own
// (drowned green, rime blue, burnt black, corpse purple, bare bone), their eyes burn, and glowing bands show like ribs
export const UNDEAD = {
  home: { pre: 'Drowned', top: 0x3a4a3e, belly: 0x8a9a84, accent: 0x6affb0, eye: 0x9affc8, fin: 0x2a3a30, k: 0.6 },
  frost: { pre: 'Rime-dead', top: 0x8aa8bc, belly: 0xe8f4fa, accent: 0x9ae6ff, eye: 0xbff4ff, fin: 0x5a7a90, k: 0.62 },
  storm: { pre: 'Burning', top: 0x1e1612, belly: 0x5a3a2a, accent: 0xff7a2a, eye: 0xffb03a, fin: 0x3a1a10, k: 0.68 },
  mist: { pre: 'Corpse', top: 0x4a3a4c, belly: 0xb0a0b0, accent: 0xc46aff, eye: 0xd8a0ff, fin: 0x2a1e2c, k: 0.6 },
  warm: { pre: 'Bone', top: 0xd8d0bc, belly: 0xf4efe4, accent: 0xb06aff, eye: 0xc88aff, fin: 0x9a9080, k: 0.72 },
};
export function undeadPal(P, sea) { const U = UNDEAD[sea] || UNDEAD.home, mix = (a, b) => (a == null ? a : lerpHex(a, b, U.k));
  return { ...P, name: P.name.includes(U.pre) ? P.name : /^The /.test(P.name) ? 'The ' + U.pre + ' ' + P.name.slice(4) : U.pre + ' ' + P.name, top: mix(P.top, U.top), belly: mix(P.belly ?? P.top, U.belly), accent: U.accent, fin: mix(P.fin, U.fin), wing: mix(P.wing, U.fin), dark: mix(P.dark, U.top), horn: mix(P.horn, U.belly), eye: U.eye, glow: true, pattern: 'rings', undead: sea }; }
export function makeMonster(type, vi = 0, scale = 1, undead = null) { const sp = SPECIES[type], P0 = sp.variants[((vi % sp.variants.length) + sp.variants.length) % sp.variants.length], P = undead ? undeadPal(P0, undead) : P0; const m = sp.build(P, scale * (P.scale || 1)); m.type = type; m.variant = P; m.name = P.name;
  m.g.traverse((o) => { if (o.isMesh || o.isLine || o.isLineSegments) o.castShadow = false; }); return m; }

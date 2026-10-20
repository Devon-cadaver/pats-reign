// Pats Reign: the sea monsters. Every creature is built from smooth shapes and live "spine tubes" (bodies that bend every
// frame), with teeth, slit eyes, fins, suckers, horns and glowing markings, in several colour variants each:
// sharks, sea serpents (and the winged sea dragon), lightning eels, giant octopus, the kraken, iron crabs, abyssal anglers,
// storm jellyfish, leviathan whales, the Elder One rising from the deep, and Jormungandr the world serpent.
// Interface: makeMonster(type, variant, scale) -> { g, size, top, anim(dt, st), mats, name }
//   g faces +z and sits at the sea surface (the game sets g.position to the water height and g.rotation.y to the heading).
//   st = { t, speed 0..1, attack 0..1 (lunge / slam), dive 0..1 (0 surfaced), hurt 0..1, rise 0..1 (bosses) }
import * as THREE from 'three';
import { M, part, grp, rod, V, SpineTube, taperTube, curvePts, orient, SPH, SPH_LO, HEMI, CAP, CON, CYL, BOX, RBX, TOR, glowVC, FAN, FINTRI, CRESCENT, WING, hash2, smooth } from './geom.js';
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

// ---------- sharks ----------
function shark(P, S) {
  const g = new THREE.Group(), body = grp(g), L = 4.6 * S, R = 0.5 * S, N = 16, mat = glowVC();
  const prof = (s) => (s < 0.28 ? 0.32 + 0.68 * Math.sin((s / 0.28) * Math.PI / 2) : 0.1 + 0.9 * Math.pow(1 - (s - 0.28) / 0.72, 1.25));
  const tube = new SpineTube(N, { radial: 12, flat: 1.12, mat, r: (s) => R * prof(s), color: (s, a, c) => { skin(P, s, a, c, 40); const down = -Math.cos(a); c.lerp(tmpC.setHex(P.belly), down > 0.05 ? 1 : 0); } });
  body.add(tube.mesh);
  const sk = M(P.top), bel = M(P.belly), bone = M(0xf6f2e6), mouth = M(0x7a1a22), eye = M(P.eye || 0x0a0a0a, P.eye ? 'glow' : 'skin'), fin = M(P.top, 'fin'), finD = M(P.accent || P.top, 'fin');
  const head = grp(body); part(head, SPH(), sk, R * 0.66, R * 0.6, R * 1.1, 0, R * 0.04, R * 0.12); part(head, SPH(), bel, R * 0.6, R * 0.34, R * 0.9, 0, -R * 0.18, R * 0.05);
  for (const sd of [-1, 1]) { part(head, SPH(), eye, R * 0.12, R * 0.12, R * 0.12, sd * R * 0.3, R * 0.12, R * 0.12); for (let i = 0; i < 4; i++) part(head, BOX(), M(lerpHex(P.top, 0x000000, 0.4)), R * 0.02, R * 0.36, R * 0.04, sd * R * 0.47, -R * 0.02, -R * 0.4 - i * R * 0.13, 0.2, 0, 0); }
  if (P.hammer) { part(head, RBX(), sk, R * 2.4, R * 0.18, R * 0.56, 0, R * 0.06, R * 0.42); for (const sd of [-1, 1]) part(head, SPH(), eye, R * 0.16, R * 0.16, R * 0.16, sd * R * 1.2, R * 0.1, R * 0.42); }
  teethRow(head, bone, 6, R * 0.32, R * 0.06, -R * 0.24, -R * 0.15, R * 0.38, R * 0.16);
  const jaw = grp(head, 0, -R * 0.26, -R * 0.2); part(jaw, SPH(), bel, R * 0.52, R * 0.2, R * 0.8, 0, -R * 0.06, R * 0.26); part(jaw, SPH(), mouth, R * 0.44, R * 0.12, R * 0.6, 0, R * 0.03, R * 0.24); teethRow(jaw, bone, 6, R * 0.28, R * 0.06, R * 0.05, R * 0.0, R * 0.5, R * 0.14, false);
  const dorsal = grp(body); part(dorsal, FINTRI(), fin, R * 1.5, R * 1.7, 1, 0, 0, 0, 0, Math.PI / 2, 0);
  const dorsal2 = grp(body); part(dorsal2, FINTRI(), fin, R * 0.5, R * 0.55, 1, 0, 0, 0, 0, Math.PI / 2, 0);
  const pecs = [-1, 1].map((sd) => { const p = grp(body); part(p, FINTRI(), finD, R * 1.3, R * 1.5, 1, 0, 0, 0, Math.PI / 2, 0, 0).rotation.set(-Math.PI / 2 + 0.2, 0, sd * -0.5); p.userData.sd = sd; return p; });
  const tail = grp(body); part(tail, CRESCENT(), fin, R * 2.2, R * 2.2, 1, 0, 0, 0, 0, Math.PI / 2, 0);
  for (const gg of [head, jaw, dorsal, dorsal2, tail, ...pecs]) mergeParts(gg);
  const pts = Array.from({ length: N }, () => new THREE.Vector3()); let ph = Math.random() * 6;
  function anim(dt, st) {
    ph += dt * (2.5 + st.speed * 5); const amp = R * 0.38 * (0.5 + st.speed) * (1 + st.attack);
    for (let i = 0; i < N; i++) { const s = i / (N - 1); pts[i].set(Math.sin(ph - s * 4.2) * amp * (s * s * 1.2 + 0.06), 0, (0.42 - s) * L); }
    tube.set(pts); stick(head, tube, pts, 0, 0, 0, true); head.position.addScaledVector(tube.frameAt(0).T, R * 0.25); jaw.rotation.x = 0.15 + st.attack * 0.75;
    stick(dorsal, tube, pts, 5, R * 0.9); stick(dorsal2, tube, pts, 10, R * 0.4); stick(tail, tube, pts, N - 1, 0); tail.rotation.z += 0; for (const p of pecs) stick(p, tube, pts, 4, -R * 0.35, p.userData.sd * R * 0.62);
    const leap = Math.sin(Math.min(1, st.attack) * Math.PI); body.position.y = lerp(-R * 1.02, -R * 4, st.dive) + leap * R * 3.5; body.rotation.x = -Math.cos(st.attack * Math.PI) * 0.5 * leap;
  }
  return { g, size: L * 0.45, top: R * 2, anim, mats: [mat] };
}
const lerpHex = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

// ---------- serpent head (shared by serpents, eels, the sea dragon and Jormungandr) ----------
function serpentHead(R, P, big = false) {
  const h = new THREE.Group(), sk = M(P.top), bl = M(P.belly), dk = M(P.dark || lerpHex(P.top, 0, 0.45)), bone = M(0xf2ead8), eye = M(P.eye, 'glow'), mouth = M(0x5a1018), black = M(0x080808), fin = M(P.fin || P.accent, 'fin'), horn = M(P.horn || 0xe8dcc0);
  part(h, SPH(), sk, 1.9 * R, 1.4 * R, 2.6 * R, 0, 0.2 * R, 0.8 * R); part(h, SPH(), sk, 1.35 * R, 0.85 * R, 2.4 * R, 0, 0.05 * R, 2.0 * R); part(h, SPH(), bl, 1.15 * R, 0.4 * R, 2.1 * R, 0, -0.32 * R, 1.85 * R);
  for (const sd of [-1, 1]) { part(h, CAP(), dk, 0.32 * R, 0.8 * R, 0.32 * R, sd * 0.6 * R, 0.62 * R, 1.25 * R, Math.PI / 2 - 0.35, 0, sd * 0.25); part(h, SPH(), eye, 0.46 * R, 0.36 * R, 0.42 * R, sd * 0.74 * R, 0.42 * R, 1.42 * R); part(h, BOX(), black, 0.07 * R, 0.3 * R, 0.08 * R, sd * 0.94 * R, 0.42 * R, 1.48 * R);
    part(h, SPH_LO(), black, 0.12 * R, 0.08 * R, 0.1 * R, sd * 0.28 * R, 0.36 * R, 3.05 * R);
    const fr = part(h, FAN(), fin, 1.5 * R, 1.3 * R, 1, sd * 0.85 * R, 0.25 * R, 0.25 * R); fr.rotation.set(0, sd * (Math.PI / 2 + 0.5), sd * 0.2); if (sd < 0) fr.scale.x *= -1;
    if (P.horns !== false) { part(h, CON(), horn, 0.3 * R, (big ? 2.6 : 1.7) * R, 0.3 * R, sd * 0.52 * R, 0.95 * R, 0.25 * R, -1.15, 0, sd * 0.3); part(h, CON(), horn, 0.18 * R, 0.9 * R, 0.18 * R, sd * 0.75 * R, 0.6 * R, -0.1 * R, -1.3, 0, sd * 0.7); }
    if (P.whiskers) { const w = curvePts([V(sd * 0.55 * R, -0.05 * R, 2.7 * R), V(sd * 1.3 * R, -0.4 * R, 2.4 * R), V(sd * 2.0 * R, -1.1 * R, 1.6 * R), V(sd * 2.2 * R, -1.8 * R, 0.8 * R)], 12); h.add(new THREE.Mesh(taperTube(w, { radial: 5, r: (s) => 0.09 * R * (1 - s) + 0.01 }), dk)); } }
  for (let i = 0; i < 5; i++) part(h, CON(), fin, 0.24 * R, (0.8 - i * 0.1) * R, 0.1 * R, 0, (0.95 - i * 0.06) * R, (0.9 - i * 0.45) * R, -1.0);
  teethRow(h, bone, 8, 0.6 * R, 0.3 * R, -0.42 * R, 0.9 * R, 3.0 * R, 0.42 * R); for (const sd of [-1, 1]) part(h, CON(), bone, 0.2 * R, 0.8 * R, 0.2 * R, sd * 0.36 * R, -0.6 * R, 2.85 * R, Math.PI);
  const jaw = grp(h, 0, -0.42 * R, 0.6 * R); part(jaw, SPH(), sk, 1.4 * R, 0.5 * R, 2.5 * R, 0, -0.15 * R, 1.2 * R); part(jaw, SPH(), bl, 1.2 * R, 0.3 * R, 2.2 * R, 0, -0.3 * R, 1.1 * R); part(jaw, SPH(), mouth, 1.12 * R, 0.24 * R, 2.15 * R, 0, 0.06 * R, 1.2 * R);
  teethRow(jaw, bone, 7, 0.52 * R, 0.24 * R, 0.08 * R, 0.4 * R, 2.3 * R, 0.36 * R, false);
  const tongue = grp(jaw, 0, 0.1 * R, 1.6 * R); part(tongue, CAP(), M(0xc83a5a), 0.14 * R, 1.2 * R, 0.06 * R, 0, 0, 0.6 * R, Math.PI / 2); for (const sd of [-1, 1]) part(tongue, CON(), M(0xc83a5a), 0.1 * R, 0.5 * R, 0.05 * R, sd * 0.12 * R, 0, 1.4 * R, Math.PI / 2, 0, -sd * 0.3);
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
  const tube = new SpineTube(N, { radial: o.radial || 12, mat, r: (s) => R * (s < 0.05 ? 0.78 + (s / 0.05) * 0.22 : 0.06 + 0.94 * Math.pow(1 - (s - 0.05) / 0.95, 0.75)), color: (s, a, c) => skin(P, s, a, c, freq), glow: (s, a) => glowAt(P, s, a, freq),
    fin: o.fin === false ? null : (s) => (s < 0.04 || s > 0.96 ? 0 : R * (o.finH || 0.75) * (0.55 + 0.45 * Math.abs(Math.sin(s * Math.PI * (o.spikes || 26)))) * (1 - s * 0.6)), finMat: M(P.fin || P.accent, 'fin') });
  g.add(tube.mesh); if (tube.finMesh) g.add(tube.finMesh);
  const { h: head, jaw, tongue } = serpentHead(R * (o.headK || 1), P, o.big); g.add(head);
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
      pts[i].y = lerp(-R * 1.15 + hump * smooth(2 * S, 6 * S, arc) * (1 - s * 0.35), R * (4.6 + st.attack * 3.5), neck) * surf + (-R * 4) * st.dive;
      pts[i].x += Math.sin(arc * 0.35 - ph * 2) * R * 0.5 * smooth(3 * S, 8 * S, arc); }
    tube.set(pts); stick(head, tube, pts, 0, 0, 0, true); head.position.addScaledVector(tube.frameAt(0).T, -R * 0.4); head.rotateX(-0.25 + st.attack * 0.6 - Math.sin(ph) * 0.06);
    jaw.rotation.x = 0.12 + st.attack * 0.65 + Math.max(0, Math.sin(ph * 0.7)) * 0.12; tongue.visible = st.attack > 0.2; tongue.position.z = 1.6 * R * (o.headK || 1) * (0.5 + st.attack * 0.6);
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
function jormungandr(P, S) { const m = serpentBody(P, S, { R: 2.1, N: 80, seg: 1.35, humps: 3.4, lambda: 22, spikes: 44, finH: 0.6, big: true, radial: 16, freq: 120, headK: 0.9 }); m.size = 2.1 * S * 5; return m; }

// ---------- octopus / kraken ----------
function tentacle(P, R, n, len, mat, glowFn) { return new SpineTube(n, { radial: 9, mat, r: (s) => R * Math.pow(1 - s * 0.94, 1.15) + R * 0.03, color: (s, a, c) => { c.setHex(P.top); if (P.pattern === 'rings' && Math.abs(Math.sin(s * 30)) > 0.85) c.setHex(P.accent); const under = smooth(0.35, 0.95, -Math.cos(a)); c.multiplyScalar(0.8 + 0.25 * Math.max(0, Math.cos(a))); if (under > 0) { c.lerp(tmpC.setHex(P.belly), under * 0.55); if (Math.abs(Math.sin(s * len * 3.2)) > 0.7 && under > 0.5) c.lerp(tmpC.setHex(P.sucker || 0xf2d8d0), 0.7); } }, glow: glowFn }); }
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
  for (const sd of [-1, 1]) { part(face, SPH(), M(0xe8e0b0), 0.7 * R, 0.62 * R, 0.6 * R, sd * 0.85 * R, 0.25 * R, 0.45 * R); part(face, SPH(), eye, 0.56 * R, 0.5 * R, 0.5 * R, sd * 0.9 * R, 0.25 * R, 0.55 * R); part(face, BOX(), black, 0.36 * R, 0.08 * R, 0.08 * R, sd * 1.05 * R, 0.25 * R, 0.72 * R); part(face, CAP(), dk, 0.3 * R, 0.6 * R, 0.3 * R, sd * 0.8 * R, 0.62 * R, 0.4 * R, 0, 0, Math.PI / 2 + sd * 0.25); }
  part(face, CON(), M(0x2a1a14), 0.5 * R, 0.6 * R, 0.5 * R, 0, -0.6 * R, 0.55 * R, Math.PI + 0.4); // beak
  mergeParts(face); mergeParts(mantle);
  for (let i = 0; i < nA; i++) { const long = kraken && i >= 8; const tb = tentacle(P, R * (long ? 0.34 : 0.55), long ? 30 : 22, long ? 16 : 10, mat, P.glow ? (s) => (Math.abs(Math.sin(s * 30)) > 0.85 ? 1.3 : 0) : null); body.add(tb.mesh);
    const club = long ? (() => { const cg = grp(body); part(cg, SPH(), M(P.top), R * 0.7, R * 0.45, R * 1.7, 0, 0, R * 0.5); for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) part(cg, CON(), M(0xf0e0c8), R * 0.1, R * 0.22, R * 0.1, sd * R * 0.2, -R * 0.18, k * R * 0.26, Math.PI); mergeParts(cg); return cg; })() : null; arms.push({ tb, a0: (i / Math.min(8, nA)) * TAU + (long ? 0.3 : 0) + (i % 2) * 0.1, ph: Math.random() * TAU, long, club, pts: Array.from({ length: long ? 30 : 22 }, () => new THREE.Vector3()) }); }
  let t = 0; const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  function anim(dt, st) { t += dt * (1 + st.speed); const surf = 1 - st.dive;
    for (const A of arms) { const n = A.pts.length, segL = (A.long ? 0.9 : 0.62) * R; const rise = (A.long ? 0.7 : 1) * ((kraken ? 0.75 : 0.5) + (kraken ? 0.35 : 0.5) * Math.sin(t * 0.9 + A.ph)) * surf + st.attack * 1.2;
      const az = A.a0 + Math.sin(t * 0.5 + A.ph) * 0.25; dir.set(Math.sin(az), 0, Math.cos(az)); side.crossVectors(up, dir);
      const p = A.pts[0].set(dir.x * R * 0.9, R * 0.1, dir.z * R * 0.9 + R * 0.4); let ang = -0.35, yaw = 0;
      for (let k = 1; k < n; k++) { const s = k / (n - 1); ang += (rise * 3.6 / n) * (0.35 + s * 1.5) * (1 + Math.sin(t * 2 + A.ph + s * 4) * 0.3) + Math.sin(t * 1.7 + A.ph + s * 7) * 0.07; yaw = Math.sin(t * 1.3 + A.ph + s * 3) * 0.35 * s;
        const ca = Math.cos(ang), sa = Math.sin(ang), d2 = tmpV.copy(dir).multiplyScalar(ca).addScaledVector(up, sa).addScaledVector(side, yaw); A.pts[k].copy(A.pts[k - 1]).addScaledVector(d2.normalize(), segL); }
      void p; A.tb.set(A.pts); if (A.club) { A.club.position.copy(A.pts[n - 1]); const fr = A.tb.frameAt(n - 1); orient(A.club, tmpV2.copy(fr.T).negate().negate(), fr.N); } }
    body.position.y = lerp(-R * 0.55, -R * 6, st.dive) + (kraken ? R * 0.15 : 0) + Math.sin(t * 0.8) * R * 0.08; face.rotation.x = Math.sin(t * 0.6) * 0.05 - st.attack * 0.2; }
  return { g, size: R * (kraken ? 6 : 4.2), top: R * (kraken ? 7 : 4), anim, mats: [mat] };
}
const octopus = (P, S) => cephalopod(P, S, false), kraken = (P, S) => cephalopod(P, S, true);

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
function angler(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1 * S, sk = M(P.top), dk = M(P.dark || lerpHex(P.top, 0, 0.5)), bone = M(0xeee8d8), glow = M(P.accent, 'glow'), mouth = M(0x1a0608);
  const hd = grp(body); part(hd, SPH(), sk, 3.2 * R, 2.6 * R, 3.4 * R, 0, 0, 0); part(hd, SPH(), dk, 2.6 * R, 1.6 * R, 2.4 * R, 0, -0.5 * R, -1.1 * R);
  for (let i = 0; i < 16; i++) { const a = hash2(i, 9) * TAU, b = hash2(i, 8) * 1.2; part(hd, SPH_LO(), glow, 0.12 * R, 0.12 * R, 0.12 * R, Math.cos(a) * 1.5 * R * Math.cos(b), Math.sin(b) * 1.2 * R, -Math.abs(Math.sin(a)) * 1.6 * R); }
  for (const sd of [-1, 1]) { part(hd, SPH(), M(P.eye, 'glow'), 0.36 * R, 0.36 * R, 0.36 * R, sd * 0.9 * R, 0.8 * R, 1.0 * R); part(hd, SPH_LO(), M(0x060606), 0.18 * R, 0.2 * R, 0.12 * R, sd * 1.0 * R, 0.82 * R, 1.15 * R); const pf = part(hd, FAN(), M(P.fin || P.top, 'fin'), 1.6 * R, 1.3 * R, 1, sd * 1.5 * R, -0.3 * R, -0.6 * R); pf.rotation.set(0, sd * (Math.PI / 2 + 0.6), -0.3); if (sd < 0) pf.scale.x *= -1; }
  part(hd, SPH(), mouth, 2.6 * R, 1.0 * R, 1.2 * R, 0, -0.35 * R, 1.25 * R); teethRow(hd, bone, 9, 1.2 * R, 0.2 * R, -0.1 * R, 0.8 * R, 1.6 * R, 0.75 * R);
  const jaw = grp(hd, 0, -0.6 * R, 0.2 * R); part(jaw, SPH(), dk, 3.0 * R, 1.0 * R, 3.0 * R, 0, -0.3 * R, 0.6 * R); teethRow(jaw, bone, 9, 1.3 * R, 0.25 * R, 0.1 * R, 0.6 * R, 1.9 * R, 0.85 * R, false);
  const stalkPts = curvePts([V(0, 1.1 * R, 0.6 * R), V(0, 2.6 * R, 0.4 * R), V(0, 3.3 * R, 1.6 * R), V(0, 2.8 * R, 2.6 * R)], 14); hd.add(new THREE.Mesh(taperTube(stalkPts, { radial: 6, r: (s) => 0.12 * R * (1 - s * 0.6) }), dk));
  const lure = part(hd, SPH(), glow, 0.6 * R, 0.6 * R, 0.6 * R, 0, 2.55 * R, 2.65 * R); const halo = part(hd, SPH(), new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }), 1.1 * R, 1.1 * R, 1.1 * R, 0, 2.55 * R, 2.65 * R);
  const tail = grp(body, 0, 0, -1.8 * R); part(tail, FAN(), M(P.fin || P.top, 'fin'), 2.2 * R, 2.0 * R, 1, 0, 0, -0.4 * R).rotation.set(0, -Math.PI / 2, Math.PI);
  mergeParts(jaw); mergeParts(tail);
  let t = 0; function anim(dt, st) { t += dt * (1.5 + st.speed * 3); jaw.rotation.x = 0.15 + st.attack * 0.7 + Math.sin(t * 0.6) * 0.05; tail.rotation.y = Math.sin(t * 2) * 0.4; const pu = 1 + Math.sin(t * 3) * 0.12; lure.scale.setScalar(0.6 * R * pu); halo.scale.setScalar(1.1 * R * pu * (1 + st.attack * 0.5));
    body.position.y = lerp(-0.45 * R, -5 * R, st.dive); hd.rotation.x = -st.attack * 0.25; }
  return { g, size: 2.4 * R, top: 3.6 * R, anim, mats: [] };
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

// ---------- leviathan whale ----------
function whale(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1.9 * S, L = 18 * S, N = 24, mat = glowVC();
  const prof = (s) => (s < 0.18 ? 0.55 + 0.45 * Math.sin((s / 0.18) * Math.PI / 2) : 0.08 + 0.92 * Math.pow(1 - (s - 0.18) / 0.82, 1.4));
  const tube = new SpineTube(N, { radial: 14, flat: 0.9, mat, r: (s) => R * prof(s), color: (s, a, c) => { skin(P, s, a, c, 30); const down = -Math.cos(a); if (down > 0.2 && Math.sin(a * 22) > 0.3) c.multiplyScalar(0.8); if (hash2(Math.floor(s * 70), Math.floor(a * 5)) > 0.93 && down < 0.3) c.setHex(0xd8d4c8); } });
  body.add(tube.mesh);
  const head = grp(body); part(head, SPH(), M(P.top), R * 1.1, R * 1.0, R * 1.0, 0, 0, R * 0.2); part(head, BOX(), M(lerpHex(P.top, 0, 0.5)), R * 1.05, R * 0.05, R * 1.2, 0, -R * 0.35, -R * 0.3);
  for (const sd of [-1, 1]) part(head, SPH(), M(P.eye, P.eye === 0x0a0a0a ? 'skin' : 'glow'), R * 0.12, R * 0.12, R * 0.12, sd * R * 0.5, -R * 0.2, -R * 0.6);
  part(head, CYL(), M(0x101010), R * 0.12, R * 0.04, R * 0.2, 0, R * 0.48, -R * 0.4); mergeParts(head);
  const flukes = grp(body); for (const sd of [-1, 1]) { const f = part(flukes, FINTRI(), M(P.top, 'fin'), R * 2.2, R * 2.6, 1, sd * R * 0.6, 0, 0); f.rotation.set(-Math.PI / 2, 0, -sd * Math.PI / 2 - sd * 0.3); }
  const pecs = [-1, 1].map((sd) => { const p = grp(body); const f = part(p, FINTRI(), M(P.top, 'fin'), R * 0.9, R * 2.4, 1, 0, 0, 0); f.rotation.set(-Math.PI / 2, 0, -sd * Math.PI / 2 + sd * 0.4); p.userData.sd = sd; return p; });
  const pts = Array.from({ length: N }, () => new THREE.Vector3()); let ph = Math.random() * 5;
  function anim(dt, st) { ph += dt * (1 + st.speed * 1.5); for (let i = 0; i < N; i++) { const s = i / (N - 1); pts[i].set(0, Math.sin(ph - s * 3) * R * 0.35 * s * s, (0.35 - s) * L); } tube.set(pts); stick(head, tube, pts, 0, 0, 0, true); stick(flukes, tube, pts, N - 1); for (const p of pecs) stick(p, tube, pts, 5, -R * 0.4, p.userData.sd * R * 0.85);
    const breach = Math.sin(Math.min(1, st.attack) * Math.PI); body.position.y = lerp(-R * 0.4, -R * 4, st.dive) + breach * R * 1.6; body.rotation.x = -breach * 0.3; }
  return { g, size: L * 0.42, top: R * 2.4, anim, mats: [mat], spout: V(0, R * 1.0, L * 0.3) };
}

// ---------- the Elder One, rising from the deep ----------
function elder(P, S) {
  const g = new THREE.Group(), body = grp(g), R = 1 * S, sk = M(P.top), dk = M(P.dark || lerpHex(P.top, 0, 0.45)), bel = M(P.belly), eye = M(P.eye, 'glow'), claw = M(0x1a1a14), mem = M(P.wing || P.dark || P.top, 'fin');
  const torso = grp(body, 0, 0, 0); part(torso, SPH(), sk, 5.2 * R, 6.5 * R, 3.8 * R, 0, 3 * R, 0); part(torso, SPH(), bel, 3.8 * R, 5.4 * R, 2.4 * R, 0, 2.6 * R, 1.0 * R);
  for (let i = 0; i < 5; i++) part(torso, CAP(), dk, 0.25 * R, 2.6 * R, 0.25 * R, 0, 1.2 * R + i * 0.9 * R, 2.05 * R, 0, 0, Math.PI / 2);
  for (const sd of [-1, 1]) part(torso, SPH(), sk, 2.6 * R, 2.2 * R, 2.4 * R, sd * 2.6 * R, 5.4 * R, 0);
  for (let i = 0; i < 7; i++) part(torso, CON(), dk, 0.5 * R, 1.6 * R, 0.5 * R, 0, 3.5 * R + i * 0.6 * R, -1.6 * R - i * 0.05 * R, -0.9);
  const head = grp(torso, 0, 7.2 * R, 0.6 * R); part(head, SPH(), sk, 3.6 * R, 4.4 * R, 4.6 * R, 0, 1.4 * R, -0.9 * R, -0.5); part(head, SPH(), sk, 3.0 * R, 2.4 * R, 2.6 * R, 0, 0, 0.6 * R);
  for (let i = 0; i < 9; i++) part(head, SPH_LO(), dk, 0.6 * R, 0.4 * R, 0.6 * R, (hash2(i, 1) - 0.5) * 2.6 * R, 1.6 * R + hash2(i, 2) * 1.8 * R, -1.2 * R + (hash2(i, 3) - 0.5) * 2 * R);
  for (const sd of [-1, 1]) { part(head, SPH(), eye, 0.7 * R, 0.5 * R, 0.5 * R, sd * 0.95 * R, 0.55 * R, 1.6 * R); part(head, BOX(), M(0x050505), 0.5 * R, 0.08 * R, 0.1 * R, sd * 1.0 * R, 0.55 * R, 1.84 * R); part(head, CAP(), dk, 0.4 * R, 1.0 * R, 0.4 * R, sd * 0.9 * R, 0.95 * R, 1.4 * R, 0, 0, Math.PI / 2 + sd * 0.3); }
  if (P.crown) for (let i = 0; i < 5; i++) part(head, CON(), M(P.accent, 'glow'), 0.3 * R, 1.4 * R, 0.3 * R, (i - 2) * 0.6 * R, 2.8 * R - Math.abs(i - 2) * 0.3 * R, 0.3 * R, -0.3);
  mergeParts(torso); mergeParts(head);
  const mat = glowVC(), feelers = []; for (let i = 0; i < 8; i++) { const tb = new SpineTube(16, { radial: 7, mat, r: (s) => R * 0.42 * (1 - s * 0.9), color: (s, a, c) => { c.setHex(P.top); if (-Math.cos(a) > 0.4) c.setHex(P.belly); }, glow: P.glow ? (s) => (Math.abs(Math.sin(s * 20)) > 0.92 ? 1.2 : 0) : null }); body.add(tb.mesh); const a = ((i + 0.5) / 8) * Math.PI - Math.PI / 2; feelers.push({ tb, x: Math.sin(a) * 1.0 * R, z: 1.3 * R + Math.cos(a) * 0.4 * R, ph: i * 0.9, pts: Array.from({ length: 16 }, () => new THREE.Vector3()) }); }
  const arms = [-1, 1].map((sd) => { const sh = grp(body, sd * 3.2 * R, 5.6 * R, 0.2 * R); part(sh, CAP(), sk, 1.4 * R, 3.6 * R, 1.4 * R, sd * 0.6 * R, -1.8 * R, 0.4 * R, 0.3, 0, sd * 0.3); const fa = grp(sh, sd * 1.1 * R, -3.6 * R, 1.0 * R); part(fa, CAP(), sk, 1.2 * R, 3.4 * R, 1.2 * R, 0, 0.2 * R, 1.6 * R, Math.PI / 2 - 0.2);
    const hand = grp(fa, 0, 0.4 * R, 3.6 * R); part(hand, SPH(), dk, 1.5 * R, 0.8 * R, 1.5 * R, 0, 0, 0); for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.4; part(hand, CON(), claw, 0.3 * R, 1.6 * R, 0.3 * R, Math.sin(a) * 0.6 * R, 0.4 * R, 0.8 * R + Math.cos(a) * 0.2 * R, 0.6, 0, -a); }
    mergeParts(sh); mergeParts(fa); mergeParts(hand); return { sh, fa, sd }; });
  const wings = [-1, 1].map((sd) => { const w = grp(body, sd * 1.6 * R, 7.2 * R, -1.6 * R); const m = part(w, WING(), mem, 11 * R, 9 * R, 1, 0, 0, 0); m.rotation.x = -Math.PI / 2; for (const [x, z] of [[1, -1], [1.05, -0.55], [0.85, -0.25], [0.62, 0], [0.38, 0.2]]) rod(w, dk, V(0, 0, 0), V(x * 11 * R, 0.1, z * 9 * R), 0.16 * R); if (sd < 0) w.scale.x = -1; return w; });
  let t = 0; function anim(dt, st) { t += dt * (1 + st.speed); const rise = st.rise ?? 1;
    for (const F of feelers) { for (let k = 0; k < 16; k++) { const s = k / 15; F.pts[k].set(F.x * (1 + s * 0.3) + Math.sin(t * 1.4 + F.ph + s * 3) * 0.5 * R * s, 6.8 * R - s * 4.2 * R * (1 - st.attack * 0.4), F.z + s * (0.8 + st.attack * 2.5) * R + Math.cos(t * 1.1 + F.ph + s * 2) * 0.4 * R * s); } F.tb.set(F.pts); }
    for (const A of arms) { A.sh.rotation.x = -0.3 - st.attack * 1.3 + Math.sin(t * 0.7 + A.sd) * 0.1; A.sh.rotation.z = A.sd * (0.2 + Math.sin(t * 0.5) * 0.05); A.fa.rotation.x = -0.4 - st.attack * 0.4; }
    wings.forEach((w, i) => { const sd = i ? 1 : -1; w.rotation.set(0.6, sd * -0.5, sd * (0.5 + Math.sin(t * 1.2) * 0.25 + st.attack * 0.3)); });
    body.position.y = lerp(-9 * R, -1.5 * R, rise) * (1 - st.dive) - st.dive * 14 * R + Math.sin(t * 0.7) * 0.3 * R; }
  return { g, size: 4.5 * R, top: 11 * R, anim, mats: [mat] };
}

// ---------- registry ----------
export const SPECIES = {
  shark: { name: 'Shark', build: shark, variants: [
    { name: 'Reef Shark', top: 0x6c8496, belly: 0xe8eef2, accent: 0x51667a, scale: 1 },
    { name: 'Tiger Shark', top: 0x7c7a62, belly: 0xece6d6, accent: 0x34321e, pattern: 'stripes', scale: 1.25 },
    { name: 'Hammerhead', top: 0x667686, belly: 0xe2e8ec, accent: 0x4a5a6a, hammer: true, scale: 1.35 },
    { name: 'Great White', top: 0x56626c, belly: 0xf6f8fa, accent: 0x3e4a54, scale: 1.75 },
    { name: 'Megalodon', top: 0x2a3540, belly: 0xb4bec4, accent: 0xc8d2d6, pattern: 'scars', eye: 0xff3a1a, scale: 3.2 } ] },
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
    { name: 'Abyssal Kraken', top: 0x7a1a1a, belly: 0xe0a090, accent: 0x3a0a0a, fin: 0x5a1010, eye: 0xffd23a, pattern: 'spots' },
    { name: 'Storm Kraken', top: 0x3a4a5a, belly: 0xc0ccd8, accent: 0x6ad6ff, fin: 0x2a3a4a, eye: 0x9affff, pattern: 'rings', glow: true },
    { name: 'Elder Kraken', top: 0x3a4a2a, belly: 0xb8b890, accent: 0x1a2410, fin: 0x2a3a1a, eye: 0xff4a1a, pattern: 'scars' } ] },
  crab: { name: 'Giant Crab', build: crab, variants: [
    { name: 'Rust Crab', top: 0xb8501e, belly: 0xf0c8a0, accent: 0xf0e0c0, eye: 0x1a1a1a },
    { name: 'Iron Crab', top: 0x3a5a62, belly: 0x9ab0b4, accent: 0xc0d0d4, eye: 0xffd23a },
    { name: 'Lava Crab', top: 0x1e1a1a, belly: 0x3a2a24, accent: 0xff6a1a, eye: 0xff3a1a, glow: true } ] },
  angler: { name: 'Abyssal Angler', build: angler, variants: [
    { name: 'Deep Angler', top: 0x2a2a34, accent: 0x7affea, eye: 0xe0ffff, fin: 0x3a3a4a },
    { name: 'Pale Angler', top: 0xb8a8a0, accent: 0xffd23a, eye: 0xff4a1a, fin: 0x8a7a70 } ] },
  jelly: { name: 'Storm Jelly', build: jelly, variants: [
    { name: 'Pink Stormjelly', top: 0xff7ab8, accent: 0xff3a9a }, { name: 'Blue Stormjelly', top: 0x7ad0ff, accent: 0x3a8aff }, { name: 'Gold Stormjelly', top: 0xffd27a, accent: 0xffa01a } ] },
  whale: { name: 'Leviathan', build: whale, variants: [
    { name: 'Grey Leviathan', top: 0x4a5560, belly: 0xc8ccd0, accent: 0x3a444e, eye: 0x0a0a0a },
    { name: 'White Leviathan', top: 0xe6e8ea, belly: 0xffffff, accent: 0xc8ccd0, eye: 0xff3a1a, pattern: 'scars' },
    { name: 'Black Leviathan', top: 0x16181c, belly: 0x5a6068, accent: 0xb0b8c0, eye: 0xffd23a, pattern: 'scars' } ] },
  elder: { name: 'The Elder One', build: elder, variants: [
    { name: 'The Dreamer', top: 0x3e5a3a, belly: 0x8a9a6a, dark: 0x1e2e1c, wing: 0x2a3a26, eye: 0xffe23a, accent: 0xb8ff3a },
    { name: 'Void Dreamer', top: 0x3a2a5a, belly: 0x7a6aa0, dark: 0x1a1030, wing: 0x2a1a44, eye: 0x6affff, accent: 0x6affff, glow: true, crown: true },
    { name: 'Drowned God', top: 0xb8c0b0, belly: 0xe0e4d8, dark: 0x5a6a5a, wing: 0x6a7a6a, eye: 0x3aff8a, accent: 0x3aff8a, crown: true } ] },
  jormungandr: { name: 'Jormungandr', build: jormungandr, variants: [
    { name: 'Jormungandr', top: 0x2a4a3a, belly: 0xc8b878, accent: 0x7affc8, fin: 0x1a2a20, eye: 0x7affc8, pattern: 'runes', glow: true, horn: 0xe8dcc0 },
    { name: 'Jormungandr the Ashen', top: 0x3a3a3a, belly: 0xa89880, accent: 0xff8a2a, fin: 0x1a1a1a, eye: 0xff8a2a, pattern: 'runes', glow: true, horn: 0x1a1a1a } ] },
};
export function makeMonster(type, vi = 0, scale = 1) { const sp = SPECIES[type], P = sp.variants[((vi % sp.variants.length) + sp.variants.length) % sp.variants.length]; const m = sp.build(P, scale * (P.scale || 1)); m.type = type; m.variant = P; m.name = P.name;
  m.g.traverse((o) => { if (o.isMesh || o.isLine || o.isLineSegments) o.castShadow = false; }); return m; }

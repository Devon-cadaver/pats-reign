// Valhalla's Tide: boss gore (v1.15.2, Sean). A part taken out of a big boss bursts and oozes the boss's own colour of goo: a
// severed arm falls into the sea and sinks while goo pours from its stump; a put-out eye pops and oozes down the face; the
// goo that reaches the water spreads a stain of that colour on the waves round it. Jormungandr and the Elder, who have no
// parts to break, ooze from each hard hit, and every boss leaves a great stain where it sinks.
import * as THREE from 'three';
import { taperTube } from './geom.js';

// each boss's goo (Sean: different colours), by its lair, else by its kind and realm
const GOO = { kraken: 0x5aff2a, squid: 0x1c2a5c, jorm: 0xd4e23a, rlyeh: 0x9a3aff, hafgufa: 0x0e0e10, surtr: 0xff6a10, nidhogg: 0x7a0c0c };
const BY_TYPE = { kraken: 'kraken', squid: 'squid', jormungandr: 'jorm', elder: 'rlyeh' }, BY_TYPE_HEL = { kraken: 'hafgufa', squid: 'hafgufa', jormungandr: 'nidhogg', elder: 'surtr' };
export function gooColor(mon, hel) { return GOO[mon.lair] ?? GOO[(hel ? BY_TYPE_HEL : BY_TYPE)[mon.type]] ?? GOO.kraken; }
const GLOWS = new Set([GOO.kraken, GOO.surtr, GOO.rlyeh]); // these shine a little even at night

const MAXD = 600, MAXS = 14, TAU = Math.PI * 2;
export function createGore(G) { // G: scene, seaY(x, z), splash(x, z, k)
  const scene = G.scene, V = () => new THREE.Vector3(), tmp = V(), tmpC = new THREE.Color();
  // the drops: one instanced mesh of wet blobs, each tinted its goo
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.15, emissive: 0x0a0a0a });
  const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), dropMat, MAXD); dropMesh.count = 0; dropMesh.frustumCulled = false; dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dropMesh.setColorAt(0, tmpC.set(0xffffff)); scene.add(dropMesh);
  const woundGeo = new THREE.SphereGeometry(1, 18, 12), drops = [], slicks = [], pieces = [], sources = [], dummy = new THREE.Object3D();
  // the stain's soft, blotchy edge: one canvas texture shared by every stain, tinted by its material
  const blot = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { const a = rnd() * TAU, d = i ? rnd() * 34 : 0, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, r = i ? 14 + rnd() * 22 : 40, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const plane = new THREE.PlaneGeometry(1, 1, 8, 8); plane.rotateX(-Math.PI / 2);
  // the wounds ride on the beasts: shared, so freeing a beast that is removed must leave them be
  woundGeo.userData.shared = true;

  // a drop of goo flung or dripping from (x, y, z): it falls, and where it meets the sea it feeds the stain there
  function drop(c, x, y, z, vx, vy, vz, s, m) { if (drops.length >= MAXD) drops.shift(); drops.push({ c, x, y, z, vx, vy, vz, s, m, t: 0 }); }
  // a burst: goo sprayed out from a wound, k = the size of the beast (its R)
  function burst(c, x, y, z, k, n = 36) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, up = Math.random(), sp = k * (0.4 + Math.random() * 0.9); drop(c, x, y, z, Math.cos(a) * sp, k * (0.3 + up * 1.1), Math.sin(a) * sp, k * (0.05 + Math.random() * 0.07), k * 2.4); } }
  // a source that pours goo from a moving point (a stump, a socket) for dur seconds: hard at first, then a trickle
  function pour(c, at, k, dur = 30, alive = () => true) { sources.push({ c, at, k, dur, t: 0, acc: 0, alive }); }
  // the stain on the water: grows toward what has been poured into it, never past max, then fades long after it stops being fed
  function stain(c, x, z, r, max = r * 3) { let S = slicks.find((q) => q.c === c && Math.hypot(q.x - x, q.z - z) < q.max * 0.85);
    if (!S) { if (slicks.length >= MAXS) kill(slicks[0]); const mat = new THREE.MeshBasicMaterial({ color: c, map: blot, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const m = new THREE.Mesh(plane.clone(), mat); m.renderOrder = 3; m.frustumCulled = false; m.rotation.y = Math.random() * TAU; scene.add(m); S = { c, x, z, r: r * 0.2, rT: r, max, m, fed: 0, a: 0, spin: m.rotation.y }; slicks.push(S); }
    S.max = Math.max(S.max, max); S.rT = Math.min(S.max, S.rT + r * 0.06); S.fed = 0; return S; }
  function kill(S) { scene.remove(S.m); S.m.geometry.dispose(); S.m.material.dispose(); slicks.splice(slicks.indexOf(S), 1); }

  // a severed arm: the piece past the cut becomes its own mesh that drops into the sea and sinks; goo pours from the stump
  // (m: the beast's model, its arms' points live in m.body; A: the arm, with A.cut set; R: the beast's size unit)
  function sever(c, m, A, R, alive) { const body = m.body, n = A.pts.length, cut = A.cut, tb = A.tb; body.updateWorldMatrix(true, false); const ws = body.getWorldScale(V()).x;
    const pts = []; for (let i = cut; i < n; i++) pts.push(body.localToWorld(A.pts[i].clone()));
    const mid = pts.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / pts.length), cs = cut / (n - 1), col = tb.mesh.geometry.attributes.color.array, rad = tb.radial;
    const geo = taperTube(pts.map((p) => p.clone().sub(mid)), { radial: 9, r: (s) => tb.r(cs + s * (1 - cs)) * ws, color: (s, a, cc) => { const i = Math.round(cut + s * (n - 1 - cut)), j = Math.round((a / TAU) * rad) % (rad + 1), k = (i * (rad + 1) + j) * 3; cc.setRGB(col[k], col[k + 1], col[k + 2]); } });
    const g = new THREE.Group(), piece = new THREE.Mesh(geo, tb.mesh.material); g.add(piece); g.position.copy(mid); scene.add(g);
    // the raw end of the piece, where it was cut
    const wound = new THREE.Mesh(woundGeo, woundMat(c)); wound.position.copy(pts[0]).sub(mid); wound.scale.setScalar(tb.r(cs) * ws * 1.05); g.add(wound);
    const out = V().subVectors(mid, body.getWorldPosition(V())).setY(0).normalize();
    pieces.push({ g, v: out.multiplyScalar(R * 0.35).setY(R * 0.25), w: V().set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.9), t: 0, wet: false, c, R });
    pour(c, () => g.localToWorld(tmp.copy(wound.position)), R * 0.5, 2.5, () => g.parent === scene);
    // the stump keeps a raw wound too and pours goo
    A.cap = new THREE.Mesh(woundGeo, woundMat(c)); A.cap.scale.setScalar(tb.r(cs) * 1.08); A.cap.position.copy(A.pts[cut]); body.add(A.cap); (m.gore = m.gore || []).push(A.cap);
    burst(c, pts[0].x, pts[0].y, pts[0].z, R * 0.5, 42); pour(c, () => body.localToWorld(tmp.copy(A.pts[cut])), R * 0.5, 40, alive); }
  const woundMats = new Map(); function woundMat(c) { if (!woundMats.has(c)) { const wm = new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.1, emissive: c, emissiveIntensity: GLOWS.has(c) ? 0.45 : 0.08 }); wm.userData.shared = true; woundMats.set(c, wm); } return woundMats.get(c); }

  // a put-out eye: it pops (the glow goes dark behind a burst socket) and goo oozes from it down the face
  function popEye(c, m, i, eyeR, R, alive) { const head = m.head, eyeLocal = m.eyes[i], sock = new THREE.Mesh(woundGeo, new THREE.MeshStandardMaterial({ color: 0x160606, roughness: 0.45 })); sock.position.copy(eyeLocal); sock.scale.set(eyeR * 1.15, eyeR * 1.05, eyeR * 0.9); head.add(sock);
    const ooze = new THREE.Mesh(woundGeo, woundMat(c)); ooze.position.copy(eyeLocal).add(V().set(0, -eyeR * 0.45, eyeR * 0.55)); ooze.scale.set(eyeR * 0.75, eyeR * 0.55, eyeR * 0.45); head.add(ooze); (m.gore = m.gore || []).push(sock, ooze);
    const front = () => head.localToWorld(tmp.copy(eyeLocal).add(V().set(0, -eyeR * 0.6, eyeR * 0.9))); head.updateWorldMatrix(true, false); const p = front(); burst(c, p.x, p.y, p.z, R * 0.45, 46); pour(c, front, R * 0.35, 45, alive); }

  // a beast that comes back for another fight has grown its arms and eyes back
  function heal(m) { for (const b of m.gore || []) if (b.parent) b.parent.remove(b); m.gore = []; for (const A of m.arms || []) { A.cut = null; A.cap = null; } }
  // Jormungandr's and the Elder's wounds: a spurt from the hit and a short ooze
  function wound(c, x, y, z, R) { burst(c, x, y, z, R * 0.6, 22); const at = V().set(x, y, z); pour(c, () => at, R * 0.4, 3); }
  // where a boss sinks: a great stain
  function sink(c, x, z, R) { const S = stain(c, x, z, R * 3.2, R * 3.4); S.rT = Math.max(S.rT, R * 3.2); burst(c, x, G.seaY(x, z) + R, z, R * 0.6, 30); }

  function update(dt) { if (!dt) return;
    // the sources pour
    for (let i = sources.length - 1; i >= 0; i--) { const s = sources[i]; s.t += dt; if (s.t > s.dur || !s.alive()) { sources.splice(i, 1); continue; } const rate = s.t < 3 ? 26 : s.t < 10 ? 9 : 3; s.acc += rate * dt;
      while (s.acc >= 1) { s.acc--; const p = s.at(); drop(s.c, p.x + (Math.random() - 0.5) * s.k * 0.3, p.y, p.z + (Math.random() - 0.5) * s.k * 0.3, (Math.random() - 0.5) * s.k * 0.3, -s.k * 0.2, (Math.random() - 0.5) * s.k * 0.3, s.k * (0.06 + Math.random() * 0.08), s.k * 3); } }
    // the drops fall; in the sea they feed a stain
    let n = 0; for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.t += dt; d.vy -= 26 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; const sy = G.seaY(d.x, d.z);
      if (d.y < sy || d.t > 6) { if (d.y < sy) { stain(d.c, d.x, d.z, d.s * 4, d.m); if (Math.random() < 0.08) G.splash(d.x, d.z, 0.4); } drops.splice(i, 1); continue; } }
    for (const d of drops) { if (n >= MAXD) break; const st = Math.min(2.2, 1 + Math.abs(d.vy) * 0.04); dummy.position.set(d.x, d.y, d.z); dummy.scale.set(d.s, d.s * st, d.s); dummy.updateMatrix(); dropMesh.setMatrixAt(n, dummy.matrix); dropMesh.setColorAt(n, tmpC.setHex(d.c)); n++; }
    dropMesh.count = n; dropMesh.instanceMatrix.needsUpdate = true; if (dropMesh.instanceColor) dropMesh.instanceColor.needsUpdate = true;
    // the stains spread, hug the waves and, long after they stop being fed, fade
    for (let i = slicks.length - 1; i >= 0; i--) { const S = slicks[i]; S.fed += dt; S.r += (S.rT - S.r) * Math.min(1, dt * 0.5); S.a = S.fed < 50 ? Math.min(GLOWS.has(S.c) ? 0.7 : 0.62, S.a + dt * 0.8) : S.a - dt * 0.02; if (S.a <= 0) { kill(S); continue; }
      S.m.material.opacity = S.a; const pa = S.m.geometry.attributes.position, base = plane.attributes.position, cy = Math.cos(S.spin), sy2 = Math.sin(S.spin);
      for (let k = 0; k < pa.count; k++) { const lx = base.getX(k) * S.r * 2, lz = base.getZ(k) * S.r * 2, wx = S.x + lx * cy + lz * sy2, wz = S.z - lx * sy2 + lz * cy; pa.setXYZ(k, base.getX(k) * S.r * 2, G.seaY(wx, wz) + 0.12, base.getZ(k) * S.r * 2); }
      pa.needsUpdate = true; S.m.position.set(S.x, 0, S.z); }
    // the severed pieces fall, splash, and sink out of sight
    for (let i = pieces.length - 1; i >= 0; i--) { const P = pieces[i]; P.t += dt; const g = P.g, sy = G.seaY(g.position.x, g.position.z);
      if (!P.wet) { P.v.y -= 22 * dt; g.position.addScaledVector(P.v, dt); g.rotation.x += P.w.x * dt; g.rotation.z += P.w.z * dt; if (g.position.y < sy + P.R * 0.2) { P.wet = true; G.splash(g.position.x, g.position.z, 3); burst(P.c, g.position.x, sy + 0.5, g.position.z, P.R * 0.35, 20); stain(P.c, g.position.x, g.position.z, P.R * 1.2, P.R * 1.8); } }
      else { g.position.y -= P.R * 0.12 * dt; g.position.x += P.v.x * 0.15 * dt; g.position.z += P.v.z * 0.15 * dt; g.rotation.x += P.w.x * 0.2 * dt; if (g.position.y < sy - P.R * 2.5 || P.t > 25) { scene.remove(g); g.children[0].geometry.dispose(); pieces.splice(i, 1); } } } }
  function clear() { drops.length = 0; sources.length = 0; while (slicks.length) kill(slicks[0]); for (const P of pieces) { scene.remove(P.g); P.g.children[0].geometry.dispose(); } pieces.length = 0; dropMesh.count = 0; }
  return { burst, pour, stain, sever, popEye, heal, wound, sink, update, clear, get counts() { return { drops: drops.length, slicks: slicks.length, pieces: pieces.length, sources: sources.length }; }, get slickList() { return slicks; } };
}

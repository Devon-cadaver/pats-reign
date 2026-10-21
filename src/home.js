// ---------- Valholm grows (v1.6.0, Sean's design doc step two: bring the loot home and watch the city grow) ----------
// Ten buildings, picked from a list at Valholm's harbour, each with three levels and a set place on the island. People
// are thralls taken in raids plus families who arrive over time (faster with fish racks), up to what the longhouses
// hold; they earn a little gold. Valholm's stage (Landing, Hamlet, Village, Town, Stronghold) follows its people and
// buildings; it decides how many islands you can claim. Everything shows on the island: buildings, smoke, villagers.
import * as THREE from 'three';
import { M, V, part, grp, BOX, CYL6, CON, CON4, SPH_LO } from './geom.js';
import { mergeParts } from './perf.js';

export const BUILDINGS = {
  longhouse: { icon: '🏠', name: 'Longhouse', effect: (l) => 'Room for ' + capOf(l) + ' people', base: [40, 10, 150] },
  fishracks: { icon: '🐟', name: 'Fish racks', effect: (l) => 'Families join ' + (1 + l) + 'x as fast', base: [30, 5, 120] },
  smithy: { icon: '⚒', name: 'Smithy', effect: (l) => '+' + 5 * l + '% attack', base: [40, 30, 250] },
  shipyard: { icon: '⛵', name: 'Shipyard', effect: (l) => 'Repairs ' + 15 * l + '% cheaper', base: [60, 20, 200] },
  bonesmith: { icon: '🦴', name: 'Bone-smith', effect: (l) => '+' + 4 * l + '% hull (trophy gear coming)', base: [50, 25, 300] },
  watchtower: { icon: '🗼', name: 'Watchtower', effect: (l) => 'Shoots raiders at Valholm (' + l + ' archers; raids on Valholm come next)', base: [50, 15, 180] },
  walls: { icon: '🧱', name: 'Walls', effect: (l) => 'Holds off raiders at Valholm (level ' + l + '; raids on Valholm come next)', base: [80, 30, 220] },
  temple: { icon: '⛩', name: 'Temple', effect: (l) => 'Spells recharge ' + 8 * l + '% faster', base: [60, 20, 400] },
  market: { icon: '⚖', name: 'Market', effect: (l) => 'Fish and trade-post gold +' + 15 * l + '%', base: [50, 10, 350] },
  beacon: { icon: '🔥', name: 'Beacon', effect: (l) => '+' + 3 * l + '% sailing speed', base: [30, 20, 200] },
};
const capOf = (l) => [5, 15, 40, 90][l] || 5;
export const STAGES = [
  { name: 'Landing', need: 'start' },
  { name: 'Hamlet', pop: 10, blds: 2 },
  { name: 'Village', pop: 30, blds: 5, raids: 2 },
  { name: 'Town', pop: 70, blds: 8, raids: 5 },
  { name: 'Stronghold', pop: 150, blds: 10, raids: 8, legend: 1 },
];
export const CLAIM_MAX = [1, 1, 2, 3, 5]; // islands you may hold, by stage (Landing, Hamlet, Village, Town, Stronghold)
const MAXLV = 3;
export const costOf = (k, l) => { const f = Math.pow(2.6, l); return BUILDINGS[k].base.map((n) => Math.round(n * f)); }; // l = the level you are buying (0 -> 1 uses f=1)

export function createHome(G) {
  const { scene, ocean, smoke } = G; let built = null, figs = null, folk = [], famT = 0, incT = 0, stageShown = -1, slots = null;
  const H = () => { const P = G.P; if (!P.valholm || typeof P.valholm !== 'object') P.valholm = { b: {}, families: 0 }; P.valholm.b = P.valholm.b || {}; return P.valholm; };
  const lv = (k) => H().b[k] || 0;
  const pop = () => Math.min(capOf(lv('longhouse')), (G.P.thralls || 0) + (H().families || 0));
  const nBuilt = () => Object.values(H().b).filter((n) => n > 0).length;
  function stage() { const P = G.P, raidsDone = Object.values(P.sacks || {}).reduce((s, n) => s + n, 0), leg = Object.keys(P.legends || {}).length; let s = 0;
    for (let i = 1; i < STAGES.length; i++) { const S = STAGES[i]; if (pop() >= S.pop && nBuilt() >= S.blds && raidsDone >= (S.raids || 0) && leg >= (S.legend || 0)) s = i; else break; } return s; }
  // the island: Valholm is the first harbour; buildings sit on a ring away from the harbour's side
  const isl = () => G.world().harbors[0] && G.world().harbors[0].isl;
  const ray = new THREE.Raycaster(), down = V(0, -1, 0);
  function groundY(x, z) { const I = isl(); if (!I || !I.mesh) return 0; I.mesh.updateMatrixWorld(true); ray.set(V(x, 400, z), down); const hit = ray.intersectObject(I.mesh, false)[0]; return hit ? hit.point.y : 0; }
  function makeSlots() { const I = isl(), h = G.world().harbors[0]; if (!I) return []; const hd = Math.atan2(h.x - I.x, h.z - I.z), out = [];
    for (let k = 0; k < 40 && out.length < 10; k++) { const a = hd + 0.9 + (k / 40) * (Math.PI * 2 - 1.8), rr = I.R * (0.32 + (k % 3) * 0.12), x = I.x + Math.sin(a) * rr, z = I.z + Math.cos(a) * rr, y = groundY(x, z); if (y < 0.8 || out.some((o) => Math.hypot(o.x - x, o.z - z) < 9)) continue; out.push({ x, z, y, a }); }
    while (out.length < 10) { const a = hd + Math.PI + (out.length - 5) * 0.3, x = I.x + Math.sin(a) * I.R * 0.2, z = I.z + Math.cos(a) * I.R * 0.2; out.push({ x, z, y: Math.max(1, groundY(x, z)), a }); } return out; }
  // ---------- the models ----------
  const W = () => M(0x7a5232), D = () => M(0x4a2e18), R = () => M(0x9a7a3a), S = () => M(0x8a8a86, 'flat'), GL = () => M(0xffb24a, 'glow');
  function model(k, l, g) { const s = 0.8 + l * 0.2;
    if (k === 'longhouse') { for (let i = 0; i < l; i++) { const h = grp(g, (i - (l - 1) / 2) * 7, 0, 0); part(h, BOX(), W(), 4.5, 2.4, 10, 0, 1.2, 0); for (const sd of [-1, 1]) { const rf = part(h, BOX(), R(), 3.6, 0.3, 11, sd * 1.5, 3.1, 0); rf.rotation.z = sd * -0.75; } } }
    else if (k === 'fishracks') { for (let i = 0; i < l + 1; i++) { const r = grp(g, i * 3 - l * 1.5, 0, 0); for (const sd of [-1, 1]) part(r, CYL6(), D(), 0.18, 2.4, 0.18, sd * 1.2, 1.2, 0); part(r, BOX(), D(), 2.6, 0.12, 0.12, 0, 2.3, 0); for (let f = 0; f < 4; f++) part(r, SPH_LO(), M(0xb8b0a0), 0.25, 0.7, 0.2, -0.9 + f * 0.6, 1.8, 0); } }
    else if (k === 'smithy') { part(g, BOX(), S(), 4 * s, 2.4, 4 * s, 0, 1.2, 0); part(g, CON4(), R(), 4.6 * s, 1.6, 4.6 * s, 0, 3.2, 0, 0, Math.PI / 4); part(g, CYL6(), S(), 0.7, 3, 0.7, 1.2 * s, 3.5, 1.2 * s); part(g, BOX(), GL(), 1.2, 0.8, 0.1, 0, 0.8, 2 * s + 0.05); }
    else if (k === 'shipyard') { part(g, BOX(), D(), 3, 0.3, 12 * s, 0, 0.6, 0); for (let i = 0; i < 4 + l; i++) { const rib = part(g, BOX(), W(), 0.2, 1.4 + Math.sin(i / (3 + l) * Math.PI) * 0.8, 0.2, 0, 1.4, -4 * s + i * (8 * s / (3 + l))); void rib; } for (const sd of [-1, 1]) part(g, CYL6(), D(), 0.2, 5, 0.2, sd * 2.4, 2.5, 0); part(g, BOX(), D(), 5, 0.2, 0.2, 0, 5, 0); }
    else if (k === 'bonesmith') { part(g, BOX(), W(), 3.6 * s, 2.2, 3.6 * s, 0, 1.1, 0); part(g, CON4(), R(), 4 * s, 1.5, 4 * s, 0, 3, 0, 0, Math.PI / 4); for (const sd of [-1, 1]) { const rib = part(g, CON(), M(0xe0d8c4), 0.35, 4.5, 0.35, sd * 2.6, 2, 2.4); rib.rotation.z = sd * 0.5; } part(g, SPH_LO(), M(0xe0d8c4), 1.2, 0.9, 1.4, 0, 4.2, 0); }
    else if (k === 'watchtower') { const ht = 7 + l * 2; for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, CYL6(), D(), 0.3, ht, 0.3, ox, ht / 2, oz); part(g, BOX(), W(), 3, 0.35, 3, 0, ht, 0); part(g, CON4(), R(), 3.2, 2, 3.2, 0, ht + 1.6, 0, 0, Math.PI / 4); part(g, BOX(), M(0xb8322a), 0.08, 1.4, 1, 1.6, ht - 0.8, 0); }
    else if (k === 'walls') { for (let i = -3 - l; i <= 3 + l; i++) { const p = part(g, CON(), D(), 0.6, 3.5 + l * 0.6, 0.6, i * 1.1, 1.6 + l * 0.3, 0); void p; } if (l >= 2) part(g, BOX(), S(), (7 + 2 * l) * 1.1, 1.2, 0.8, 0, 0.6, 0.8); }
    else if (k === 'temple') { part(g, BOX(), W(), 4 * s, 3, 6 * s, 0, 1.5, 0); for (let i = 0; i < 3; i++) part(g, CON4(), R(), (4.6 - i * 1.2) * s, 1.4, (6.4 - i * 1.4) * s, 0, 3.6 + i * 1.1, 0, 0, Math.PI / 4); part(g, SPH_LO(), GL(), 0.6, 0.6, 0.6, 0, 7.2, 0); }
    else if (k === 'market') { for (let i = 0; i < l + 1; i++) { const st = grp(g, (i - l / 2) * 3.4, 0, 0); for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(st, CYL6(), D(), 0.15, 2.2, 0.15, ox * 1.2, 1.1, oz); part(st, BOX(), M([0xb8322a, 0x2a6a9a, 0xd8b04a][i % 3]), 2.8, 0.15, 2.4, 0, 2.3, 0); part(st, BOX(), W(), 2.2, 0.8, 1.4, 0, 0.5, 0); } }
    else if (k === 'beacon') { part(g, CYL6(), S(), 1.6, 3 + l * 2, 1.6, 0, (3 + l * 2) / 2, 0); part(g, SPH_LO(), GL(), 1.4 + l * 0.3, 1.2 + l * 0.3, 1.4 + l * 0.3, 0, 3.6 + l * 2, 0); } }
  function rebuild() { const I = isl(); if (!I) return; if (built) { scene.remove(built); built.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); } built = new THREE.Group(); slots = slots || makeSlots();
    Object.keys(BUILDINGS).forEach((k, i) => { const l = lv(k), s = slots[i]; if (!l || !s) return; const g = grp(built, s.x, s.y - 0.1, s.z); g.rotation.y = s.a + Math.PI / 2; model(k, l, g); mergeParts(g); g.traverse((o) => { if (o.isGroup && o !== g) mergeParts(o); }); });
    // villagers: up to 36 walking between the buildings and the harbour village
    const n = Math.min(36, Math.round(pop() / 2.5)); figs = new THREE.InstancedMesh(FIG(), new THREE.MeshLambertMaterial(), Math.max(1, n)); figs.count = n; figs.frustumCulled = false; const col = new THREE.Color(), cols = [0x8a5a3a, 0x5a6a8a, 0x7a3a2a, 0x6a7a4a, 0xc8b89a];
    folk = []; const pts = slots.filter((s, i) => lv(Object.keys(BUILDINGS)[i])).concat([{ x: G.world().harbors[0].x, z: G.world().harbors[0].z }]); for (let i = 0; i < n; i++) { const p = pts[i % pts.length]; folk.push({ x: p.x + (Math.random() - 0.5) * 6, z: p.z + (Math.random() - 0.5) * 6, to: null, wait: Math.random() * 3, pts }); figs.setColorAt(i, col.setHex(cols[i % cols.length])); }
    built.add(figs); scene.add(built); }
  let figGeo = null; function FIG() { if (!figGeo) { figGeo = new THREE.CapsuleGeometry(0.28, 0.75, 2, 6); figGeo.translate(0, 0.65, 0); } return figGeo; }
  const tmp = new THREE.Object3D(); const yC = new Map(); const gy = (x, z) => { const k = Math.round(x) + ',' + Math.round(z); let y = yC.get(k); if (y === undefined) { y = Math.max(0.3, groundY(x, z)); yC.set(k, y); } return y; };
  // ---------- each frame ----------
  function update(dt, time, playing) { if (!isl() || G.world().realm !== 'mid') { if (built) built.visible = false; return; } if (!built) rebuild(); const P = G.P, hm = H();
    if (playing) { famT += dt; const room = capOf(lv('longhouse')) - pop(); if (famT > 45 / (1 + lv('fishracks')) && room > 0) { famT = 0; hm.families = (hm.families || 0) + 1; }
      incT += dt; if (incT >= 60) { incT = 0; const g = Math.round(pop() * 0.25 * (P.tier + 1)); if (g > 0) { P.res.g += g; G.pop(G.boat.x, G.boat.y + 5, G.boat.z, '🏠 +' + g + ' 🪙 Valholm', '#ffd24a'); } }
      const s = stage(); if (stageShown >= 0 && s > stageShown) { G.warn('🏰 VALHOLM GROWS: NOW A ' + STAGES[s].name.toUpperCase() + '!', 4); G.sfx.horn && G.sfx.horn(); rebuild(); } stageShown = s; P.homeStage = s; }
    const near = Math.hypot(isl().x - G.boat.x, isl().z - G.boat.z) < 260; built.visible = near; if (!near) return;
    for (let i = 0; i < folk.length; i++) { const f = folk[i]; if (f.wait > 0) f.wait -= dt; else { if (!f.to || Math.hypot(f.to[0] - f.x, f.to[1] - f.z) < 0.6) { const p = f.pts[(Math.random() * f.pts.length) | 0]; f.to = [p.x + (Math.random() - 0.5) * 6, p.z + (Math.random() - 0.5) * 6]; f.wait = 1 + Math.random() * 4; } const dx = f.to[0] - f.x, dz = f.to[1] - f.z, d = Math.hypot(dx, dz) || 1; f.x += (dx / d) * 1.2 * dt; f.z += (dz / d) * 1.2 * dt; f.yaw = Math.atan2(dx, dz); }
      tmp.position.set(f.x, gy(f.x, f.z), f.z); tmp.rotation.set(0, f.yaw || 0, 0); tmp.updateMatrix(); figs.setMatrixAt(i, tmp.matrix); } if (figs) figs.instanceMatrix.needsUpdate = true;
    if (Math.random() < dt * 2 && slots) { const i = (Math.random() * 10) | 0, k = Object.keys(BUILDINGS)[i]; if (lv(k) && (k === 'longhouse' || k === 'smithy' || k === 'temple')) smoke.add(slots[i].x, slots[i].z, { spray: true, y: slots[i].y + 4, vx: 0.4, vz: 0.2, vy: 1.6, g: -0.1, s: 1.2, grow: 1.4, life: 5, a: 0.4 }); } }
  // ---------- the harbour card and the build panel ----------
  function card(list) { const d = document.createElement('div'); d.className = 'card ship'; const s = stage(), nx = STAGES[s + 1];
    d.innerHTML = `<div class="ic">🏰</div><div class="tx"><b>Valholm: ${STAGES[s].name}</b><div>👥 ${pop()} / ${capOf(lv('longhouse'))} people · 🏗 ${nBuilt()} / 10 buildings · hold up to ${CLAIM_MAX[s]} islands</div><div class="cost">${nx ? 'Next, ' + nx.name + ': ' + [nx.pop + ' people', nx.blds + ' buildings', nx.raids ? nx.raids + ' raids won' : '', nx.legend ? 'a legend slain' : ''].filter(Boolean).join(', ') : 'Valholm is a Stronghold.'}</div></div>`;
    const b = document.createElement('button'); b.textContent = 'BUILD'; b.onclick = (e) => { e.stopPropagation(); openPanel(); }; d.appendChild(b); list.appendChild(d); }
  function openPanel() { let el = document.getElementById('buildPanel'); if (!el) { el = document.createElement('div'); el.id = 'buildPanel'; document.body.appendChild(el); } const P = G.P;
    el.innerHTML = '<h3>🏰 Build in Valholm</h3><p>Each building has its own place on the island. 🪵 ' + P.res.w + ' · ⚙️ ' + P.res.i + ' · 🪙 ' + P.res.g + '</p><div class="blist">' + Object.entries(BUILDINGS).map(([k, B]) => { const l = lv(k), max = l >= MAXLV, c = max ? null : costOf(k, l); return `<div class="brow"><div class="bt"><b>${B.icon} ${B.name}</b> <span class="pips">${'◆'.repeat(l)}${'◇'.repeat(MAXLV - l)}</span><div>${l ? 'Now: ' + B.effect(l) + '.' : ''} ${max ? 'Complete.' : 'Next: ' + B.effect(l + 1) + '.'}</div>${max ? '' : `<div class="cost">${G.costHtml(c)}</div>`}</div>${max ? '' : `<button data-k="${k}" ${G.can(c) ? '' : 'disabled'}>${l ? 'UPGRADE' : 'BUILD'}</button>`}</div>`; }).join('') + '</div><button class="ghost" id="buildClose">CLOSE</button>';
    el.classList.remove('hidden'); el.querySelectorAll('[data-k]').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); const k = bt.dataset.k, l = lv(k), c = costOf(k, l); if (l >= MAXLV || !G.can(c)) return; G.pay(c); H().b[k] = l + 1; G.sfx.horn && G.sfx.horn(); rebuild(); G.hud(); G.save(); G.redraw(); openPanel(); }; });
    el.querySelector('#buildClose').onclick = (e) => { e.stopPropagation(); el.classList.add('hidden'); G.redraw(); }; }
  // effects the game reads
  const K = { atk: () => 1 + 0.05 * lv('smithy'), hp: () => 1 + 0.04 * lv('bonesmith'), spd: () => 1 + 0.03 * lv('beacon'), repair: () => 1 - 0.15 * lv('shipyard'), spellCd: () => 1 - 0.08 * lv('temple'), market: () => 1 + 0.15 * lv('market') };
  return { update, card, openPanel, rebuild, stage, pop, lv, K, claimMax: () => CLAIM_MAX[stage()] };
}

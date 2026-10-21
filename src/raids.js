// ---------- raids (v1.3.0, Sean's design doc "Raids and the Home Island", step one: smashing islands) ----------
// Enemy settlements on islands without a harbour: Home waters' rival jarls and the Storm Sea's Fire cult of Muspel.
// Each has a name, a jarl, a faith, houses, a landmark, watchtowers that shoot, a ring of stakes in the shallows and
// villagers walking about (one instanced batch). Break the towers and the stakes from the ship (big explosions), sail to
// the landing, tap RAID: the crew storm ashore, houses burn, a loot bar fills while the island's allies come for you.
// Sail free meanwhile; if trouble starts while you are away a flare goes up and RETURN sails you back. A sacked village
// rebuilds after a while under a new faith that wards against how you beat it. The Fire cult's village gives the
// Dragon's Breath spell: a cone of fire from the bow.
import * as THREE from 'three';
import { M, V, part, grp, BOX, CYL6, CON, CON4, SPH_LO, rod } from './geom.js';
import { mergeParts } from './perf.js';

const PEOPLES = {
  home: { name: 'rival jarls', icon: '🏘', wood: 0x7a5232, dark: 0x4a2e18, roof: 0x9a7a3a, banner: 0xb8322a, glow: 0xffb24a, folk: [0x8a5a3a, 0x5a6a8a, 0x7a3a2a, 0x6a7a4a], towerHp: 1, dmg: 1 },
  storm: { name: 'Fire cult of Muspel', icon: '🔥', wood: 0x2a2624, dark: 0x141210, roof: 0x3a2a24, banner: 0xff5a1a, glow: 0xff6a1a, folk: [0x5a2a1a, 0x3a3030, 0x7a2a10, 0x2a2a2a], towerHp: 1.3, dmg: 1.2 },
};
const NAMES = { home: [['Ormsby', 'Ulf the Crow-Fed'], ['Hrafnsey', 'Sigrid Iron-Tongue'], ['Kalvskar', 'Bjorn Half-Hand'], ['Torvik', 'Gunnar the Grey']], storm: [['Ashgard', 'Surt-Born Hakon'], ['Emberhold', 'Ragna Cinder-Eye'], ['Brimfell', 'Kol the Kindler']] };
// faiths: a sacked village returns under a new god, warded against what broke it last time
export const FAITHS = {
  odin: { name: 'Odin the All-Father', icon: 'ᚨ', ward: null, desc: 'Their towers see far.' },
  ran: { name: 'Rán of the Waves', icon: '🌊', ward: 'fire', desc: 'Sea-water wards: fire does half damage.' },
  thor: { name: 'Thor the Thunderer', icon: '⚡', ward: 'bolt', desc: 'Iron-bound towers: ballista bolts do less.' },
  frey: { name: 'Frey of the Harvest', icon: '🌾', ward: 'regrow', desc: 'Their stakes grow back if you leave them.' },
  surtr: { name: 'Surtr the Burning', icon: '🔥', ward: 'fire', desc: 'Fire-born: fire does half damage.' },
  loki: { name: 'Loki the Trickster', icon: '🐍', ward: 'spear', desc: 'Hidden shields: spears do less.' },
};
const START_FAITH = { home: 'odin', storm: 'surtr' };
const COUNTER = { fire: 'ran', bolt: 'thor', spear: 'loki', breath: 'ran' };
const REBUILD = 480; // seconds of play before a sacked village is back

export function createRaids(G) {
  const { scene, world, ocean, foam, smoke, embers, sfx } = G;
  const list = []; let alertT = 0, flare = null, raid = null, btns = null, shakeOut = 0;
  const tmp = new THREE.Object3D(), ray = new THREE.Raycaster(), down = V(0, -1, 0);
  // ---------- where they go: one per suitable island, up to four per sea ----------
  function groundY(x, z) { ray.set(V(x, 80, z), down); const hit = ray.intersectObject(world.group, true).find((h) => h.object.isMesh && !h.object.isInstancedMesh); return hit ? hit.point.y : 0; }
  function pickIslands() { const out = { home: [], storm: [] }; const docks = world.harbors.map((h) => h.dock);
    for (const isl of world.islands) { if (isl.harbor != null || isl.R < 8 || isl.R > 34) continue; const reg = world.regionAt(isl.x, isl.z); if (!out[reg] || out[reg].length >= NAMES[reg].length) continue;
      if (docks.some((d) => Math.hypot(d.x - isl.x, d.z - isl.z) < 90) || world.lairs.some((l) => Math.hypot(l.x - isl.x, l.z - isl.z) < 200) || Math.hypot(isl.x, isl.z) < 110 || out[reg].some((o) => Math.hypot(o.x - isl.x, o.z - isl.z) < 120)) continue; out[reg].push(isl); }
    return out; }
  // the landing: the coast point facing open water, found by walking out from the centre
  function landing(isl) { let best = null; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a); let r = isl.R * 0.5; while (r < isl.R * 2 && world.blockAt(isl.x + dx * r, isl.z + dz * r, 0)) r += 1; let open = 0; for (let s = 8; s <= 60; s += 6) if (!world.blockAt(isl.x + dx * (r + s), isl.z + dz * (r + s), 4)) open++; if (!best || open > best.open) best = { a, dx, dz, r, open }; } return best; }
  // ---------- building one settlement ----------
  function build(S) { const pp = PEOPLES[S.people], g = new THREE.Group(), st = grp(g), isl = S.isl, L = S.land, fire = S.people === 'storm';
    const wood = M(pp.wood), dark = M(pp.dark), roof = M(pp.roof), glow = M(pp.glow, 'glow'), banner = M(FAITH_COL[S.faith] || pp.banner), stone = M(fire ? 0x2e2a28 : 0x8a8a86, 'flat');
    S.houses = []; S.towers = []; S.hf = null; const spots = [];
    // houses on a ring inland of the landing, a hall at the heart
    const cx = isl.x + L.dx * (L.r - isl.R * 0.55), cz = isl.z + L.dz * (L.r - isl.R * 0.55); S.cx = cx; S.cz = cz;
    const nH = S.size === 'village' ? 7 : 4;
    for (let i = 0; i < nH + 1; i++) { const hall = i === 0, a = (i / nH) * Math.PI * 2 + S.seed, rr = hall ? 0 : isl.R * (0.22 + ((i * 37) % 10) / 40), x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr; if (!world.blockAt(x, z, 0)) continue; const y = groundY(x, z); if (y < 0.4) continue;
      const h = grp(g, x, y, z); h.rotation.y = a + Math.PI / 2; const w = hall ? 5 : 3, l = hall ? 9 : 4.5;
      if (fire) { part(h, BOX(), stone, w, 2.2, l, 0, 1.1, 0); part(h, CON4(), roof, w * 1.15, 1.8, l * 0.8, 0, 3.1, 0, 0, Math.PI / 4); part(h, BOX(), glow, 0.9, 1.2, 0.1, 0, 0.7, l / 2 + 0.02); }
      else { part(h, BOX(), wood, w, 2, l, 0, 1, 0); for (const s of [-1, 1]) { const rf = part(h, BOX(), roof, w * 0.78, 0.28, l + 0.6, s * w * 0.32, 2.5, 0); rf.rotation.z = s * -0.72; } part(h, BOX(), dark, 0.8, 1.3, 0.1, 0, 0.65, l / 2 + 0.02); }
      mergeParts(h); S.houses.push({ g: h, x, z, y, hall, burn: 0 }); spots.push([x, z]); }
    // the landmark: a god idol (jarls) or a fire altar with a burning brazier (fire cult)
    { const y = groundY(cx, cz + 0.01), lm = grp(g, cx + L.dx * 6, y, cz + L.dz * 6); if (fire) { part(lm, CON(), stone, 2.4, 6, 2.4, 0, 3, 0); part(lm, SPH_LO(), glow, 1.6, 1.2, 1.6, 0, 6.2, 0); } else { part(lm, CYL6(), dark, 0.9, 6, 0.9, 0, 3, 0); part(lm, SPH_LO(), wood, 1.5, 1.6, 1.3, 0, 6.4, 0); for (const s of [-1, 1]) part(lm, BOX(), dark, 0.3, 1.6, 0.3, s * 0.7, 7.4, 0, 0, 0, s * 0.5); } mergeParts(lm); S.landmark = lm; }
    // watchtowers on the shore either side of the landing, facing the sea
    const nT = S.size === 'village' ? 2 : 1;
    for (let i = 0; i < nT; i++) { const a = L.a + (nT === 1 ? 0.5 : (i ? 0.7 : -0.7)), dx = Math.sin(a), dz = Math.cos(a); let r = isl.R * 0.4; while (r < isl.R * 2 && world.blockAt(isl.x + dx * (r + 3), isl.z + dz * (r + 3), 0)) r += 1; const x = isl.x + dx * r, z = isl.z + dz * r, y = Math.max(0.3, groundY(x, z));
      const t = grp(g, x, y, z); if (fire) { part(t, CYL6(), stone, 3, 9, 3, 0, 4.5, 0); part(t, BOX(), stone, 3.8, 0.6, 3.8, 0, 9.2, 0); part(t, SPH_LO(), glow, 1.4, 1.4, 1.4, 0, 10.2, 0); }
      else { for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(t, CYL6(), dark, 0.35, 9, 0.35, ox * 1.2, 4.5, oz * 1.2); part(t, BOX(), wood, 3.6, 0.4, 3.6, 0, 8.6, 0); part(t, CON4(), roof, 3.8, 2.2, 3.8, 0, 10.6, 0, 0, Math.PI / 4); }
      part(t, BOX(), banner, 0.08, 1.4, 1.1, 1.9, 8, 0); mergeParts(t);
      const hp = Math.round(260 * Math.pow(1.6, S.lvl) * pp.towerHp); S.towers.push({ g: t, x, z, y, top: y + 9.5, hp, max: hp, cd: 2 + i, dead: false, kind: 'tower', name: 'Watchtower' }); }
    // the stake ring: sharpened logs in the shallows round the landing
    S.wall = null; if (S.size === 'village') { const wg = grp(g), stakes = []; const R0 = L.r + 7; for (let k = -7; k <= 7; k++) { if (Math.abs(k) <= 1) continue; const a = L.a + k * 0.09, x = isl.x + Math.sin(a) * R0, z = isl.z + Math.cos(a) * R0; const s = part(wg, CON(), dark, 0.55, 3.4, 0.55, x - isl.x, 0.6, z - isl.z); s.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); stakes.push([x, z]); } wg.position.set(isl.x, 0, isl.z); mergeParts(wg);
      const hp = Math.round(200 * Math.pow(1.6, S.lvl)); S.wall = { g: wg, x: isl.x + L.dx * R0, z: isl.z + L.dz * R0, y: 1, top: 3, hp, max: hp, dead: false, kind: 'wall', name: 'Stake wall', R0, stakes }; }
    // the dock: planks on posts from the shore out past the stakes (bigger settlement, longer dock); its end is the landing
    const dl = S.size === 'village' ? 13 : 8, dock = grp(g, isl.x + L.dx * (L.r - 1), 0, isl.z + L.dz * (L.r - 1)); dock.rotation.y = Math.atan2(L.dx, L.dz);
    part(dock, BOX(), wood, 3, 0.3, dl, 0, 0.9, dl / 2); for (let i = 0; i <= dl; i += 2.2) for (const s of [-1, 1]) part(dock, CYL6(), dark, 0.32, 3, 0.32, s * 1.35, -0.4, i); for (const s of [-1, 1]) part(dock, CYL6(), dark, 0.3, 1.3, 0.3, s * 1.25, 1.4, dl - 0.4); mergeParts(dock);
    const lx = isl.x + L.dx * (L.r + dl + 3), lz = isl.z + L.dz * (L.r + dl + 3); S.lx = lx; S.lz = lz;
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 32), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.8, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(lx, 0.3, lz); ring.visible = false; scene.add(ring); S.ring = ring;
    // villagers: one instanced batch, walking between houses
    const nF = S.size === 'village' ? 22 : 12, fig = new THREE.InstancedMesh(FIG(), new THREE.MeshLambertMaterial(), nF); fig.instanceMatrix.setUsage(THREE.DynamicDrawUsage); const col = new THREE.Color();
    S.folk = []; for (let i = 0; i < nF; i++) { const [x, z] = spots[i % spots.length] || [cx, cz]; S.folk.push({ x: x + (Math.random() - 0.5) * 4, z: z + (Math.random() - 0.5) * 4, to: null, v: 1 + Math.random() * 0.6, wait: Math.random() * 3 }); fig.setColorAt(i, col.setHex(pp.folk[i % pp.folk.length])); }
    fig.frustumCulled = false; g.add(fig); S.fig = fig; S.spots = spots.length ? spots : [[cx, cz]]; if (!S.houses.length) { const y = Math.max(0.3, groundY(cx, cz)), h = grp(g, cx, y, cz); S.houses.push({ g: h, x: cx, z: cz, y, hall: true, burn: 0 }); }
    // the raiding crew (hidden until a raid): orange torches
    const crew = new THREE.InstancedMesh(FIG(), new THREE.MeshLambertMaterial({ color: 0xd8a040 }), 8); crew.frustumCulled = false; crew.visible = false; g.add(crew); S.crew = crew; S.crewPos = [];
    scene.add(g); S.g = g; }
  const FAITH_COL = { odin: 0x2a4a8a, ran: 0x2a8ab8, thor: 0xb8b8c8, frey: 0x4a8a2a, surtr: 0xff5a1a, loki: 0x4a2a6a };
  let figGeo = null; function FIG() { if (!figGeo) { const a = new THREE.CapsuleGeometry(0.28, 0.75, 2, 6); a.translate(0, 0.65, 0); figGeo = a; } return figGeo; }
  function clear(S) { if (S.g) { scene.remove(S.g); S.g.traverse((o) => { if (o.geometry && o.geometry !== figGeo && !o.geometry.userData.shared) o.geometry.dispose(); }); S.g = null; } if (S.ring) { scene.remove(S.ring); S.ring.geometry.dispose(); S.ring = null; } }
  // ---------- setup from the save ----------
  function init(saved) { for (const S of list) clear(S); list.length = 0; if (world.realm !== 'mid') return; const isl = pickIslands();
    for (const reg of ['home', 'storm']) isl[reg].forEach((I, i) => { const [name, jarl] = NAMES[reg][i], id = reg + i, sv = (saved && saved[id]) || {}; const S = { id, name, jarl, people: reg, isl: I, land: landing(I), seed: i * 1.7, size: i === 0 || reg === 'storm' ? 'village' : 'camp', lvl: reg === 'storm' ? 2 + i * 0.5 : i * 0.5, faith: sv.faith || START_FAITH[reg], sacked: sv.sacked || 0, raids: sv.raids || 0, state: 'idle', seen: !!sv.seen };
      if (!S.land) return; list.push(S); if (S.sacked > 0) S.state = 'ruin'; build(S); if (S.state === 'ruin') ruin(S, true); }); }
  function saveData() { const o = {}; for (const S of list) o[S.id] = { faith: S.faith, sacked: Math.round(S.sacked), raids: S.raids, seen: S.seen }; return o; }
  // ---------- explosions ----------
  const bursts = [], debris = [], debGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6); const fbTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,0.95)'); gr.addColorStop(0.6, 'rgba(230,80,20,0.6)'); gr.addColorStop(1, 'rgba(80,20,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ringGeo = new THREE.RingGeometry(0.85, 1, 40); ringGeo.rotateX(-Math.PI / 2); const flash = new THREE.PointLight(0xffa040, 0, 120, 1.5); scene.add(flash); let flashT = 0;
  function explode(x, y, z, size = 1, col = 0xffffff) { sfx.boom(); flash.position.set(x, y + 3, z); flash.intensity = 60 * size; flashT = 0.35; shakeOut = Math.max(shakeOut, 0.5 + size * 0.4);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.set(x + (Math.random() - 0.5) * 2 * size, y + 1 + k * 1.2 * size, z + (Math.random() - 0.5) * 2 * size); scene.add(sp); bursts.push({ o: sp, t: -k * 0.08, life: 0.9 + k * 0.2, s0: 3 * size, s1: 14 * size, vy: 2 + k }); }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })); ring.position.set(x, ocean.heightAt(x, z) + 0.35, z); scene.add(ring); bursts.push({ o: ring, t: 0, life: 1.1, s0: 2 * size, s1: 26 * size, ring: true });
    const dm = M(0x3a2a1a); for (let k = 0; k < Math.round(10 * size); k++) { const m = new THREE.Mesh(debGeo, Math.random() < 0.3 ? M(0xff8a2a, 'glow') : dm); m.position.set(x, y + 2, z); const a = Math.random() * 6.28, sp = (6 + Math.random() * 10) * size; debris.push({ m, vx: Math.sin(a) * sp * 0.6, vz: Math.cos(a) * sp * 0.6, vy: 8 + Math.random() * 10 * size, r: Math.random() * 6, t: 0 }); m.scale.setScalar(0.5 + Math.random() * size); scene.add(m); }
    for (let k = 0; k < 14 * size; k++) smoke.add(x + (Math.random() - 0.5) * 4 * size, z + (Math.random() - 0.5) * 4 * size, { spray: true, y: y + 2, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4, g: -0.3, s: 2 + Math.random() * 3 * size, grow: 1.4, life: 5 + Math.random() * 3, a: 0.75 });
    for (let k = 0; k < 18 * size; k++) embers.add(x, z, { spray: true, y: y + 2, vx: (Math.random() - 0.5) * 12, vz: (Math.random() - 0.5) * 12, vy: 4 + Math.random() * 10, g: 9, s: 0.4, life: 1.6, a: 1 });
    foam.splash(x, z, 2.5 * size); }
  function updateFx(dt) { for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.t += dt; if (b.t < 0) continue; const k = b.t / b.life; if (k >= 1) { scene.remove(b.o); b.o.material.dispose(); bursts.splice(i, 1); continue; } const s = b.s0 + (b.s1 - b.s0) * (1 - Math.pow(1 - k, 2)); b.o.scale.set(s, b.ring ? 1 : s, s); b.o.material.opacity = (1 - k) * (b.ring ? 0.8 : 1); if (!b.ring) b.o.position.y += b.vy * dt; }
    for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.t += dt; d.vy -= 22 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; d.m.rotation.x += d.r * dt; d.m.rotation.z += d.r * dt; if (d.m.position.y < ocean.heightAt(d.m.position.x, d.m.position.z) - 0.3 || d.t > 3) { if (d.m.position.y < 1) foam.splash(d.m.position.x, d.m.position.z, 0.5); scene.remove(d.m); debris.splice(i, 1); } }
    if (flashT > 0) { flashT -= dt; flash.intensity = Math.max(0, flash.intensity - dt * 200); } }
  // ---------- damage to their defences ----------
  function wardK(S, kind) { const w = FAITHS[S.faith].ward; return w && w === kind ? 0.5 : 1; }
  function hit(t, dmg, kind) { const S = t.S; if (t.dead || !S) return; const d = Math.round(dmg * wardK(S, kind)); t.hp -= d; G.pop(t.x, t.top, t.z, (wardK(S, kind) < 1 ? '🛡 ' : '−') + d, wardK(S, kind) < 1 ? '#9fe0ff' : '#ffd24a'); sfx.hit(); S.lastHit = kind; if (S.state === 'idle') alarm(S);
    if (t.hp <= 0) { t.dead = true; explode(t.x, t.y + (t.kind === 'tower' ? 6 : 1), t.z, t.kind === 'tower' ? 1.4 : 1); if (t.kind === 'tower') { t.g.rotation.z = 1.2; t.g.position.y -= 3; } else { t.g.visible = false; } G.say('💥 ' + t.name + ' of ' + S.name + ' DESTROYED!', 2.5); if (open(S)) { S.ring.visible = true; G.warn('⚓ ' + S.name.toUpperCase() + ' LIES OPEN: SAIL TO THE GOLD RING AND RAID!', 3.5); } } }
  const open = (S) => S.towers.every((t) => t.dead) && (!S.wall || S.wall.dead);
  function alarm(S) { if (S.state !== 'idle') return; S.state = 'alert'; sfx.horn && sfx.horn(); G.warn('🔔 ' + S.name.toUpperCase() + ' SOUNDS THE ALARM!', 2.5); }
  // targets for the ship's spears: live towers and walls in range, nearest first
  function targets() { const o = []; for (const S of list) { if (S.state === 'ruin' || S.state === 'raid') continue; for (const t of S.towers) if (!t.dead) { t.S = S; o.push(t); } if (S.wall && !S.wall.dead) { S.wall.S = S; o.push(S.wall); } } return o; }
  function nearestTarget(x, z, range) { let best = null, bd = range; for (const t of targets()) { const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t; } } return best; }
  // ---------- the raid ----------
  function ensureBtns() { if (btns) return; const mk = (id, html, cls) => { const b = document.createElement('button'); b.id = id; b.className = cls; b.innerHTML = html; b.classList.add('hidden'); document.body.appendChild(b); return b; };
    btns = { trade: mk('tradeBtn', '⚖ TRADE', 'raidBtn trade'), raid: mk('raidBtn', '⚔ RAID', 'raidBtn'), ret: mk('returnBtn', '🔥 RETURN', 'raidBtn ret'), breath: mk('breathBtn', '<em>🐉</em><small>BREATH</small><i class="cd"></i>', 'act breath'), bar: mk('raidBar', '<b></b><i></i>', 'raidBar') };
    btns.raid.onclick = (e) => { e.stopPropagation(); startRaid(); }; btns.ret.onclick = (e) => { e.stopPropagation(); if (flare) G.sailTo(flare.x, flare.z, flare.name); btns.ret.classList.add('hidden'); };
    btns.breath.onclick = (e) => { e.stopPropagation(); breath(); }; btns.trade.onclick = (e) => { e.stopPropagation(); openTrade(); }; const acts = document.getElementById('acts'); if (acts) acts.insertBefore(btns.breath, acts.firstChild); }
  function startRaid() { const S = list.find((q) => q.state === 'alert' && open(q) && Math.hypot(q.lx - G.boat.x, q.lz - G.boat.z) < 16); if (!S) return; S.state = 'raid'; S.ring.visible = false; const need = S.size === 'village' ? 40 : 22; raid = { S, t: 0, need, wave: 0, nextWave: 8 };
    S.crew.visible = true; S.crewPos = Array.from({ length: 8 }, (_, i) => ({ x: S.lx + (i % 4) - 1.5, z: S.lz + (i >> 2), tx: 0, tz: 0, i })); sfx.horn && sfx.horn(); G.warn('⚔ THE CREW STORM ' + S.name.toUpperCase() + '! HOLD THE SEA WHILE THEY LOOT', 3.5); }
  function updateRaid(dt) { const R = raid, S = R.S, b = G.boat; R.t += dt; const away = Math.hypot(S.lx - b.x, S.lz - b.z);
    // houses burn one by one
    const k = R.t / R.need, nb = Math.floor(k * S.houses.length); S.houses.forEach((h, i) => { if (i < nb && h.burn === 0) h.burn = 0.01; });
    // the island's allies: a guard boat or two from the far side
    if (R.t > R.nextWave && R.wave < (S.size === 'village' ? 2 : 1)) { R.wave++; R.nextWave = R.t + 14; const a = S.land.a + Math.PI + (Math.random() - 0.5), r = S.isl.R + 40; G.spawnGuard(S.isl.x + Math.sin(a) * r, S.isl.z + Math.cos(a) * r, S); if (away > 70) sendFlare(S, 'Their ships come for your crew at ' + S.name + '!'); else G.warn('⛵ ' + S.name.toUpperCase() + ' CALLS ITS ALLIES!', 2.5); }
    btns.bar.classList.remove('hidden'); btns.bar.querySelector('b').textContent = '⚔ Raiding ' + S.name + ' · ' + Math.round(k * 100) + '%'; btns.bar.querySelector('i').style.width = Math.min(100, k * 100) + '%';
    if (R.t >= R.need) finishRaid(); }
  function finishRaid() { const S = raid.S, P = G.P, t = P.tier + 1, big = S.size === 'village' ? 1.8 : 1, fk = S.people === 'storm' ? 1.4 : 1, thralls = Math.round((S.size === 'village' ? 6 : 3) * (1 + S.lvl * 0.3));
    const r = { g: Math.round(120 * t * big * fk), w: Math.round(30 * t * big), i: Math.round(15 * t * big * fk), f: Math.round(20 * big) }; G.reward(r, S.cx, 6, S.cz); P.thralls = (P.thralls || 0) + thralls; S.raids++; S.sacked = REBUILD; S.state = 'ruin'; S.crew.visible = false; raid = null; btns.bar.classList.add('hidden'); btns.ret.classList.add('hidden'); flare = null;
    ruin(S); let extra = ''; if (S.people === 'storm' && !(P.spells && P.spells.breath)) { P.spells = P.spells || {}; P.spells.breath = true; extra = ' Their fire-priests\' secret is yours: <b>🐉 DRAGON\'S BREATH</b>!'; }
    G.say('🏆 <b>' + S.name.toUpperCase() + ' IS SACKED!</b> ' + thralls + ' thralls taken.' + extra, 5); sfx.coins && sfx.coins(); G.save(); }
  function ruin(S, quiet) { for (const h of S.houses) { h.burn = Math.max(h.burn, 0.5); h.g.scale.y = 0.45; h.g.traverse((o) => { if (o.isMesh && o.material && o.material.color && !o.userData.charred) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.25); o.userData.charred = true; } }); } for (const t of S.towers) { t.dead = true; t.g.rotation.z = 1.2; } if (S.wall) { S.wall.dead = true; S.wall.g.visible = false; } S.fig.count = Math.max(2, Math.round(S.folk.length * 0.2)); void quiet; }
  function rebuild(S) { const why = S.lastHit; S.faith = (why && COUNTER[why]) || Object.keys(FAITHS)[(Object.keys(FAITHS).indexOf(S.faith) + 2) % 6]; if (S.faith === S.lastFaith) S.faith = 'odin'; S.lastFaith = S.faith; S.lvl += 0.6; S.state = 'idle'; S.sacked = 0; clear(S); build(S); S.seen = false; G.say('🏗 ' + S.name + ' has risen again under ' + FAITHS[S.faith].name + '. ' + FAITHS[S.faith].desc, 5); }
  function sendFlare(S, why) { flare = { x: S.lx, z: S.lz, name: S.name, t: 0 }; G.warn('🔴 A FLARE OVER ' + S.name.toUpperCase() + '! ' + why, 4); btns.ret.classList.remove('hidden'); }
  // ---------- trading at a calm settlement's dock ----------
  const GOODS = { home: { sell: 'w', name: 'timber', ic: '🪵', per: 2 }, storm: { sell: 'i', name: 'iron', ic: '⚙️', per: 4 } };
  function openTrade() { const S = list.find((q) => q.state === 'idle' && Math.hypot(q.lx - G.boat.x, q.lz - G.boat.z) < 14); if (!S) return; let el = document.getElementById('tradePanel'); if (!el) { el = document.createElement('div'); el.id = 'tradePanel'; document.body.appendChild(el); }
    const P = G.P, gd = GOODS[S.people], t = P.tier + 1, q = 20 * t, cost = Math.round(q * gd.per * (1 + S.lvl * 0.1)), fishG = 4 + P.tier + (S.people === 'storm' ? 2 : 0);
    el.innerHTML = '<h3>⚖ ' + S.name + '</h3><p>' + S.jarl + ' trades with you, for now. They have ' + gd.name + ' to spare.</p><button id="trBuy">Buy ' + q + ' ' + gd.ic + ' for ' + cost + ' 🪙</button><button id="trFish">Sell your ' + (P.res.f || 0) + ' 🐟 for ' + (P.res.f || 0) * fishG + ' 🪙</button><button id="trClose" class="ghost">CLOSE</button>'; el.classList.remove('hidden');
    const buy = el.querySelector('#trBuy'), fish = el.querySelector('#trFish'); buy.disabled = P.res.g < cost; fish.disabled = !P.res.f;
    buy.onclick = () => { if (P.res.g < cost) return; P.res.g -= cost; P.res[gd.sell] = (P.res[gd.sell] || 0) + q; sfx.coins && sfx.coins(); G.hud(); openTrade(); };
    fish.onclick = () => { if (!P.res.f) return; P.res.g += P.res.f * fishG; P.res.f = 0; sfx.coins && sfx.coins(); G.hud(); openTrade(); };
    el.querySelector('#trClose').onclick = () => el.classList.add('hidden'); }
  // ---------- Dragon's Breath: a cone of fire from the bow ----------
  let breathCd = 0, breathT = 0;
  function breath() { const P = G.P; if (!P.spells || !P.spells.breath || breathCd > 0 || G.state() !== 'play') return; breathCd = 22; breathT = 1.6; sfx.boom(); G.say('🐉 DRAGON\'S BREATH!', 1.5);
    const b = G.boat, reach = 34 + G.T().L, dmg = G.attack() * 4; for (const t of targets()) { const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz); if (d < reach && Math.abs(G.angDiff(Math.atan2(dx, dz), b.yaw)) < 0.45) setTimeout(() => { hit(t, dmg, 'breath'); }, 250 + d * 12); }
    G.breathHit(reach, 0.45, dmg); }
  function updateBreath(dt) { breathCd = Math.max(0, breathCd - dt); if (btns) { const has = G.P.spells && G.P.spells.breath; btns.breath.classList.toggle('hidden', !has || G.state() !== 'play'); btns.breath.classList.toggle('ready', breathCd <= 0); btns.breath.querySelector('.cd').style.height = (breathCd / 22) * 100 + '%'; }
    if (breathT > 0) { breathT -= dt; const b = G.boat, L = G.T().L, fx = b.x + Math.sin(b.yaw) * L * 0.5, fz = b.z + Math.cos(b.yaw) * L * 0.5; for (let k = 0; k < 10; k++) { const sp = 22 + Math.random() * 14, a = b.yaw + (Math.random() - 0.5) * 0.5; embers.add(fx, fz, { spray: true, y: b.y + 2.5, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, vy: Math.random() * 3, g: 1, s: 0.9 + Math.random() * 0.8, grow: 2.2, life: 1.1, a: 1 }); if (k % 3 === 0) smoke.add(fx, fz, { spray: true, y: b.y + 3, vx: Math.sin(a) * sp * 0.6, vz: Math.cos(a) * sp * 0.6, vy: 1.5, g: -0.2, s: 1.6, grow: 1.6, life: 1.6, a: 0.5 }); } } }
  // ---------- each frame ----------
  function update(dt, time) { ensureBtns(); updateFx(dt); updateBreath(dt); if (shakeOut > 0) { G.boat.shake = Math.max(G.boat.shake || 0, shakeOut); shakeOut = 0; }
    const b = G.boat, playing = G.state() === 'play'; if (raid) updateRaid(dt);
    if (flare) { flare.t += dt; if (Math.random() < dt * 8) embers.add(flare.x, flare.z, { spray: true, y: 22 + Math.sin(flare.t) * 2, vx: 0, vz: 0, vy: 0.5, g: 0, s: 2.2, grow: 0.2, life: 0.6, a: 1 }); }
    let canRaid = false, canTrade = false;
    for (const S of list) { const d = Math.hypot(S.cx - b.x, S.cz - b.z), near = d < 230;
      if (S.state === 'ruin') { S.sacked -= dt; if (S.sacked <= 0 && d > 160) rebuild(S); }
      if (!S.seen && d < 110 && playing) { S.seen = true; const F = FAITHS[S.faith]; G.say(PEOPLES[S.people].icon + ' <b style="color:' + G.danger(S.lvl) + '">' + S.name + ' (Lv ' + (Math.round(S.lvl) + 1) + ')</b>, a ' + S.size + ' of the ' + PEOPLES[S.people].name + '. Jarl: ' + S.jarl + '. They worship ' + F.icon + ' ' + F.name + '. ' + F.desc, 6); }
      if (S.g) S.g.visible = near; if (!near) continue;
      // villagers walk between houses; when the alarm sounds they run for the hall
      const scared = S.state === 'alert' || S.state === 'raid', n = S.fig.count;
      for (let i = 0; i < n; i++) { const f = S.folk[i]; if (f.wait > 0 && !scared) f.wait -= dt; else { if (!f.to || Math.hypot(f.to[0] - f.x, f.to[1] - f.z) < 0.6) { f.to = scared ? [S.cx + (Math.random() - 0.5) * 3, S.cz + (Math.random() - 0.5) * 3] : S.spots[(Math.random() * S.spots.length) | 0].map((v) => v + (Math.random() - 0.5) * 5); f.wait = scared ? 0 : 1 + Math.random() * 4; }
          const dx = f.to[0] - f.x, dz = f.to[1] - f.z, dd = Math.hypot(dx, dz) || 1, sp = f.v * (scared ? 3 : 1); f.x += (dx / dd) * sp * dt; f.z += (dz / dd) * sp * dt; f.yaw = Math.atan2(dx, dz); }
        tmp.position.set(f.x, groundYFast(S, f.x, f.z) + Math.abs(Math.sin(time * 8 + i)) * (f.wait > 0 ? 0 : 0.12), f.z); tmp.rotation.set(0, f.yaw || 0, 0); tmp.updateMatrix(); S.fig.setMatrixAt(i, tmp.matrix); }
      S.fig.instanceMatrix.needsUpdate = true;
      // the raiding crew run from the landing to the burning houses
      if (S.state === 'raid') { S.crewPos.forEach((c, i) => { const h = S.houses[(i + Math.floor(raid.t / 3)) % S.houses.length]; const dx = h.x - c.x, dz = h.z - c.z, dd = Math.hypot(dx, dz) || 1; if (dd > 1.5) { c.x += (dx / dd) * 4 * dt; c.z += (dz / dd) * 4 * dt; } tmp.position.set(c.x, groundYFast(S, c.x, c.z), c.z); tmp.rotation.set(0, Math.atan2(dx, dz), 0); tmp.updateMatrix(); S.crew.setMatrixAt(i, tmp.matrix); if (Math.random() < dt * 3) embers.add(c.x, c.z, { spray: true, y: tmp.position.y + 1.8, vy: 1.5, g: -0.5, s: 0.35, life: 0.5, a: 1 }); }); S.crew.instanceMatrix.needsUpdate = true; }
      // burning houses
      for (const h of S.houses) if (h.burn > 0 && h.burn < 1) { h.burn = Math.min(0.99, h.burn + dt * 0.05); if (Math.random() < dt * 6) embers.add(h.x + (Math.random() - 0.5) * 3, h.z + (Math.random() - 0.5) * 3, { spray: true, y: h.y + 2, vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), vy: 3 + Math.random() * 3, g: -0.5, s: 0.7, life: 1.2, a: 1 }); if (Math.random() < dt * 3) smoke.add(h.x, h.z, { spray: true, y: h.y + 3, vx: 0.5, vz: 0.2, vy: 2.5, g: -0.2, s: 2, grow: 1.5, life: 6, a: 0.6 }); }
      // the stake ring holds you off until it is broken
      if (S.wall && !S.wall.dead && S.state !== 'ruin') { const W = S.wall; for (const [x, z] of W.stakes) { const dx = b.x - x, dz = b.z - z, dd = Math.hypot(dx, dz); if (dd < 2.6) { b.x += (dx / (dd || 1)) * (2.6 - dd); b.z += (dz / (dd || 1)) * (2.6 - dd); if (b.v > 3) { b.v *= 0.5; G.damage(G.maxHp() * 0.02, 'The stakes tear at your hull! Break the stake wall first.'); } } } }
      // towers shoot when you come close
      if (playing && S.state !== 'ruin') for (const t of S.towers) { if (t.dead) continue; const dt2 = Math.hypot(t.x - b.x, t.z - b.z); if (dt2 > 70) continue; if (S.state === 'idle' && dt2 < 55 && S.raids > 0) alarm(S); t.cd -= dt; if (t.cd <= 0 && S.state !== 'idle') { t.cd = 2.6 - Math.min(1, S.lvl * 0.15); const pp = PEOPLES[S.people], hurt = 6 * Math.pow(1.55, S.lvl) * pp.dmg * (1 - G.defense()); for (let k = 0; k < 3; k++) G.launch({ x: t.x, y: t.top, z: t.z }, { x: b.x + (Math.random() - 0.5) * 3, y: b.y + 1.5, z: b.z + (Math.random() - 0.5) * 3 }, 'arrow', k ? null : () => G.damage(hurt, null)); if (S.people === 'storm' && Math.random() < 0.5) setTimeout(() => explode(b.x + (Math.random() - 0.5) * 10, 0.5, b.z + (Math.random() - 0.5) * 10, 0.5, 0xff8a40), 700); } }
      if (S.state === 'idle' && Math.hypot(S.lx - b.x, S.lz - b.z) < 14 && b.v < 4) canTrade = true;
      if (S.state === 'alert' && open(S)) { S.ring.visible = true; S.ring.material.opacity = 0.5 + 0.4 * Math.sin(time * 5); if (Math.hypot(S.lx - b.x, S.lz - b.z) < 16) canRaid = true; } }
    if (btns) { btns.raid.classList.toggle('hidden', !(canRaid && playing && !raid)); btns.trade.classList.toggle('hidden', !(canTrade && playing)); if (!canTrade) { const tp = document.getElementById('tradePanel'); if (tp) tp.classList.add('hidden'); } } }
  // the ground under a villager: a 2-unit height grid sampled once per village (no ray casts while they walk)
  function groundYFast(S, x, z) { if (!S.hf) { const R = S.isl.R * 1.3, n = Math.ceil((R * 2) / 2) + 1, a = new Float32Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) a[j * n + i] = Math.max(0.2, groundY(S.isl.x - R + i * 2, S.isl.z - R + j * 2)); S.hf = { x0: S.isl.x - R, z0: S.isl.z - R, n, a }; }
    const H = S.hf, fx = Math.max(0, Math.min(H.n - 1.001, (x - H.x0) / 2)), fz = Math.max(0, Math.min(H.n - 1.001, (z - H.z0) / 2)), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, A = H.a, n = H.n; return A[j * n + i] * (1 - u) * (1 - v) + A[j * n + i + 1] * u * (1 - v) + A[(j + 1) * n + i] * (1 - u) * v + A[(j + 1) * n + i + 1] * u * v; }
  return { init, update, saveData, nearestTarget, hit, explode, list, targets, startRaid, breath, get raid() { return raid; }, get flare() { return flare; }, FAITHS, PEOPLES };
}

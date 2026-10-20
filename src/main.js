// Pats Reign: a Viking ship on a monster sea. Sail with the steering circle, a tap on the sea or the map; fish up
// supplies, fight sea monsters and raiders in battle mini-games, upgrade at harbours, ride out storms (catch lightning
// for Thor's Fury), rogue waves, waterspouts and sea tornadoes, and slay the three legends to reign.
import * as THREE from 'three';
import { createOcean, createFoam } from './ocean.js';
import { createEnv } from './env.js';
import { buildShip, SHIP_TIERS, PLAYER_PAL, RAIDER_PALS, GHOST_PAL } from './ship.js';
import { makeMonster, SPECIES } from './monsters.js';
import { buildWorld, WORLD, HALF, REGIONS, LAIRS } from './world.js';
import { createMinis } from './minigames.js';
import { createTwisters } from './tornado.js';
import { sfx, unlockAudio, startMusic, setMusicChase, soundToggle, setSea } from './audio.js';
import { initFullscreen } from './fullscreen.js';
import { VERSION } from './version.js';
import { M, V } from './geom.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------- renderer, scene, sea, world ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xa6cade, 120, 330); scene.background = new THREE.Color(0xa6cade);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 6000);
const hemi = new THREE.HemisphereLight(0xdcefff, 0x2a4a5a, 1.4); scene.add(hemi); const sun = new THREE.DirectionalLight(0xfff0d0, 1.2); scene.add(sun); scene.add(sun.target);
const world = buildWorld(scene);
const ocean = createOcean(scene, { size: 440, seg: 170, world: WORLD, shore: world.shore });
const foam = createFoam(scene, ocean, 800); const env = createEnv(scene, ocean, hemi, sun);
let flash = 0;
const twisters = createTwisters(scene, { onBolt: () => { flash = Math.max(flash, 0.4); } });
const minis = createMinis({ sfx, hooks: { shoot: (mult, dmg, txt, fire) => battleShoot(mult, dmg, txt, fire), hurt: (d) => battleHurt(d), foeAct: (d) => battleFoeAct(d), cast: () => fishCast(), pull: () => {} } });
let viewOff = false;
function applyView() { if (viewOff) { camera.aspect = innerWidth / (innerHeight * 1.5); camera.setViewOffset(innerWidth, innerHeight * 1.5, 0, innerHeight * 0.5, innerWidth, innerHeight); } else { camera.aspect = innerWidth / innerHeight; camera.clearViewOffset(); } camera.updateProjectionMatrix(); }
function resize() { renderer.setSize(innerWidth, innerHeight, false); applyView(); } addEventListener('resize', resize); resize();

// ---------- data: upgrades and costs [timber, iron, gold] ----------
const UPG = {
  shields: { name: 'Shield Wall', icon: '🛡', max: 3, desc: ['Wooden shields along the rails', 'Painted war shields', 'Iron-rimmed shields'], eff: 'Blocks harder (−12% damage each)', cost: [[20, 5, 30], [45, 20, 90], [80, 60, 220]] },
  armor: { name: 'Iron Plates', icon: '⛓', max: 3, desc: ['Iron bands at the waterline', 'Riveted iron plates', 'Full iron hull'], eff: '+25% hull and −8% damage each', cost: [[10, 30, 60], [25, 75, 160], [40, 150, 380]] },
  ballista: { name: 'Ballista', icon: '🏹', max: 3, desc: ['A bow ballista', 'Heavy bolts', 'Twin ballistas'], eff: '+30% damage, longer shots, a bigger weak spot', cost: [[30, 15, 50], [60, 45, 150], [110, 100, 340]] },
  fire: { name: 'Fire Pots', icon: '🔥', max: 3, desc: ['Two fire pots', 'Three fire pots', 'Four fire pots'], eff: 'Big burning hits in battle', cost: [[10, 10, 80], [20, 25, 190], [35, 55, 400]] },
  ram: { name: 'Iron Ram', icon: '🐏', max: 2, desc: ['An iron ram at the bow', 'A great beaked ram'], eff: 'Ram monsters at speed for free damage', cost: [[25, 40, 110], [45, 110, 320]] },
  sail: { name: 'Sail', icon: '⛵', max: 3, desc: ['Striped war sail', 'Fine wool sail', 'Royal sail'], eff: '+10% speed each', cost: [[30, 0, 60], [60, 10, 150], [90, 30, 330]] },
  oars: { name: 'Oars & Crew', icon: '🚣', max: 3, desc: ['More rowers', 'Strong rowers', 'Berserker rowers'], eff: 'Faster turns and acceleration', cost: [[25, 5, 40], [50, 20, 120], [80, 50, 280]] },
  nets: { name: 'Nets', icon: '🕸', max: 3, desc: ['Rope nets', 'Wide nets', 'Iron-weighted nets'], eff: 'Bigger catch box, bigger catches', cost: [[20, 5, 30], [40, 15, 90], [60, 40, 200]] },
};
const TIER_COST = [null, [60, 20, 90], [150, 70, 250], [320, 160, 560], [650, 330, 1300]];
// monster levels per species variant, speeds, and what their attacks are called in battle
const MLV = { shark: [0, 0.6, 1.2, 2, 3.4], serpent: [1.3, 2, 2.4, 3, 3.6, 3, 4.1], eel: [0.4, 1, 1.6], octopus: [0.9, 1.6, 2.2, 2.8], crab: [1, 2, 3], angler: [2, 3], jelly: [0, 0.3, 0.5], whale: [2, 3, 4.2], kraken: [5, 5, 5], elder: [5.6, 5.6, 5.6], jormungandr: [6.2, 6.2] };
const MSPEED = { shark: 10.5, serpent: 9.2, eel: 10, octopus: 7, crab: 6, angler: 7.5, jelly: 1.2, whale: 8, kraken: 6, elder: 5, jormungandr: 9 };
const ATK = { shark: { L: 'lunges from the right', R: 'lunges from the left', U: 'leaps to bite' }, serpent: { L: 'whips its tail from the right', R: 'whips its tail from the left', U: 'rears up to strike' }, eel: { L: 'arcs lightning from the right', R: 'arcs lightning from the left', U: 'coils to shock' },
  octopus: { L: 'swings a tentacle from the right', R: 'swings a tentacle from the left', U: 'slams down its arms' }, kraken: { L: 'sweeps a tentacle from the right', R: 'sweeps a tentacle from the left', U: 'drags at the hull' }, crab: { L: 'snaps a claw from the right', R: 'snaps a claw from the left', U: 'crushes with both claws' },
  angler: { L: 'snaps from the right', R: 'snaps from the left', U: 'lunges with its jaws' }, whale: { L: 'rams from the right', R: 'rams from the left', U: 'breaches to crash down' }, jelly: { L: 'stings from the right', R: 'stings from the left', U: 'pulses' },
  elder: { L: 'claws from the right', R: 'claws from the left', U: 'calls the crushing deep' }, jormungandr: { L: 'coils in from the right', R: 'coils in from the left', U: 'strikes with venom' } };
const REGION_BIAS = { frost: { serpent: 2, whale: 2, crab: 0.5 }, storm: { eel: 3, jelly: 2, octopus: 1.5 }, mist: { angler: 3, octopus: 1.5, ghost: 3, raider: 1.5 }, warm: { shark: 2, crab: 3, jelly: 1.5 }, home: { shark: 1.5, jelly: 1.5 } };

// ---------- player ----------
const P = { tier: 0, up: { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 0, oars: 0, nets: 0 }, res: { w: 20, i: 5, g: 40, f: 0 }, hp: 100, legends: {}, kills: 0, home: 0, won: false, tod: 0.16 };
const boat = { grace: 0, x: 0, z: -20, yaw: Math.PI, v: 0, want: Math.PI, thr: 0, wp: null, fireCd: 0, thor: 0, boost: 0, spin: 0, shake: 0, hitCd: 0, y: 0, pitch: 0, roll: 0 };
const T = () => SHIP_TIERS[P.tier];
const maxHp = () => Math.round(100 * Math.pow(1.75, P.tier) * (1 + 0.25 * P.up.armor));
const topSpeed = () => T().speed * (1 + 0.1 * P.up.sail) * (boat.boost > 0 ? 1.35 : 1);
const turnRate = () => T().turn * (1 + 0.14 * P.up.oars);
const defense = () => Math.min(0.85, 0.12 * P.up.shields + 0.08 * P.up.armor + (boat.thor > 0 ? 0.3 : 0));
const attack = () => 12 * Math.pow(1.65, P.tier) * (1 + 0.3 * P.up.ballista);
const fireRange = () => (P.up.ballista ? 24 + 6 * P.up.ballista : 16) + P.tier * 2;
let ship = null;
function rebuildShip() { if (ship) scene.remove(ship.g); ship = buildShip(P.tier, P.up, PLAYER_PAL, 7); scene.add(ship.g); ship.g.position.set(boat.x, 0, boat.z); hud(); }

// ---------- state ----------
let state = 'title', time = 0, zoom = 1, viewMode = 'top', camYaw = Math.PI, camPos = new THREE.Vector3(0, 40, 40), camTgt = new THREE.Vector3();
const mons = [], floats = [], spots = [], projs = [], rings = [], bolts = [], pops = [], spouts = [];
const wx = { type: 'clear', k: 0, t: 30, next: 45, fading: false };
let battle = null, fishing = null, rogueT = -1, rogueHit = false, spawnT = 0, floatT = 0, spotT = 0, saveT = 0, boltT = 3, msgT = 0, warnT = 0;

// ---------- input: steering circle (left half), tap the sea to set a course, pinch to zoom ----------
const stick = { id: null, x: 0, y: 0, cx: 0, cy: 0 }, knob = $('knob'), stickEl = $('stick'); let tapStart = null; const touches = new Map(); let pinch0 = 0, zoom0 = 1;
function stickDown(id, x, y) { if (x < innerWidth * 0.66 && y > innerHeight * 0.4 && stick.id === null) { stick.id = id; stick.cx = x; stick.cy = y; stickEl.style.left = (x - 65) + 'px'; stickEl.style.top = (y - 65) + 'px'; stickEl.style.bottom = 'auto'; boat.wp = null; return; } tapStart = { id, x, y, t: performance.now() }; }
function stickMove(id, x, y) { if (id !== stick.id) return; const dx = x - stick.cx, dy = y - stick.cy, d = Math.hypot(dx, dy) || 1, m = Math.min(d, 56); stick.x = (dx / d) * m / 56; stick.y = (dy / d) * m / 56; knob.style.transform = `translate(calc(-50% + ${stick.x * 40}px), calc(-50% + ${stick.y * 40}px))`; }
function stickUp(id, x, y) { if (id === stick.id) { stick.id = null; stick.x = stick.y = 0; knob.style.transform = 'translate(-50%, -50%)'; return; } if (tapStart && tapStart.id === id) { if (performance.now() - tapStart.t < 350 && Math.hypot(x - tapStart.x, y - tapStart.y) < 18) tapSea(x, y); tapStart = null; } }
canvas.addEventListener('pointerdown', (e) => { if (state !== 'play' || battle || fishing) return; touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = zoom; tapStart = null; return; } stickDown(e.pointerId, e.clientX, e.clientY); try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
canvas.addEventListener('pointermove', (e) => { if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; zoom = clamp(zoom0 * pinch0 / (Math.hypot(a[0] - b[0], a[1] - b[1]) || 1), 0.55, 2.2); return; } stickMove(e.pointerId, e.clientX, e.clientY); });
const pUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; stickUp(e.pointerId, e.clientX, e.clientY); }; canvas.addEventListener('pointerup', pUp); canvas.addEventListener('pointercancel', pUp);
canvas.addEventListener('wheel', (e) => { zoom = clamp(zoom * Math.exp(e.deltaY * 0.001), 0.55, 2.2); }, { passive: true });
const keys = {}; addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (e.key === ' ' && state === 'play') fire(); }); addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
const ray = new THREE.Raycaster(), seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function tapSea(x, y) { ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(seaPlane, p)) return; setCourse(p.x, p.z); }
function setCourse(x, z) { boat.wp = { x: clamp(x, -HALF + 20, HALF - 20), z: clamp(z, -HALF + 20, HALF - 20) }; courseMark.visible = true; sfx.throw(); }
const courseMark = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.8, depthWrite: false })); courseMark.rotation.x = -Math.PI / 2; courseMark.visible = false; scene.add(courseMark);

// ---------- HUD ----------
const rname = (k) => REGIONS[k].name;
function hud() { P.hp = Math.min(P.hp, maxHp()); $('hullFill').style.width = clamp(P.hp / maxHp(), 0, 1) * 100 + '%'; $('hullTxt').textContent = Math.ceil(P.hp) + ' / ' + maxHp(); $('rW').textContent = P.res.w; $('rI').textContent = P.res.i; $('rG').textContent = P.res.g; $('rF').textContent = P.res.f; $('shipName').textContent = T().name; }
function say(t, secs = 2.6) { const m = $('msg'); m.innerHTML = t; m.style.opacity = 1; msgT = secs; }
function warn(t, secs = 3) { $('warn').innerHTML = t; warnT = secs; }
const tmpV = new THREE.Vector3();
function toScreen(x, y, z) { tmpV.set(x, y, z).project(camera); return tmpV.z < 1 ? [(tmpV.x * 0.5 + 0.5) * innerWidth, (-tmpV.y * 0.5 + 0.5) * innerHeight] : null; }
function pop(x, y, z, text, color = '#fff', life = 1.3) { const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.style.color = color; document.body.appendChild(el); pops.push({ el, x, y, z, t: 0, life }); }
function reward(r, x, y, z) { const parts = []; for (const [k, ic] of [['w', '🪵'], ['i', '⚙️'], ['g', '🪙'], ['f', '🐟']]) if (r[k]) { P.res[k] += r[k]; parts.push('+' + r[k] + ic); } if (parts.length) { pop(x, y, z, parts.join(' '), '#ffe27a', 1.8); sfx.coins(); } hud(); }
function hurtFx() { const h = $('hurt'); h.classList.add('on'); setTimeout(() => h.classList.remove('on'), 120); boat.shake = 0.4; }
const dmgLog = []; function damage(d, why) { d = Math.round(d); if (d <= 0) return; dmgLog.push([Math.round(time), d, why || '']); P.hp -= d; hurtFx(); sfx.hurt(); pop(boat.x, boat.y + 3, boat.z, '−' + d, '#ff6a4a'); if (why) say(why); hud(); if (P.hp <= 0 && state === 'play') sink(); }

// ---------- monsters and raiders ----------
const danger = (lv) => { const d = lv - P.tier; return d < -0.6 ? '#7dff3a' : d < 0.6 ? '#ffffff' : d < 1.6 ? '#ffb03a' : d < 3 ? '#ff4a3a' : '#d06aff'; };
function spawnTable(region, night) { const out = [], tier = P.tier, bias = REGION_BIAS[region] || {};
  for (const [type, lvs] of Object.entries(MLV)) { if (type === 'kraken' || type === 'elder' || type === 'jormungandr') continue; lvs.forEach((lv, v) => { if (lv > tier + 1.7 || lv < tier - 1.4) return; let w = (bias[type] || 1) * (lv > tier + 0.8 ? 0.45 : 1); if (type === 'angler') w *= night ? 3 : 0.3; if (type === 'serpent' && tier === 0) w *= 0.6; out.push({ type, v, lv, w }); }); }
  for (let st = 0; st <= 4; st++) { const lv = st + 0.4; if (lv > tier + 1.6 || lv < tier - 1.2) continue; out.push({ type: 'raider', v: st, lv, w: 0.6 * (bias.raider || 1) }); }
  if (night && tier >= 2) out.push({ type: 'ghost', v: 3, lv: 3.5, w: 0.8 * (bias.ghost || 1) });
  return out; }
function spawnMon(e, x, z, o = {}) {
  let m, size, top, naval = false;
  if (e.type === 'raider' || e.type === 'ghost') { const pal = e.type === 'ghost' ? GHOST_PAL : RAIDER_PALS[(Math.random() * RAIDER_PALS.length) | 0]; const lvl = Math.min(3, e.v); const s = buildShip(e.v, { shields: lvl, armor: e.v > 2 ? 1 : 0, ballista: e.v > 1 ? 1 : 0, fire: 0, ram: 0, sail: e.v }, pal, (Math.random() * 999) | 0);
    m = { g: s.g, anim: (dt, st) => s.anim(dt, { speed: st.speed * s.t.speed, time, night: isNight() }), name: pal.name, ship: s }; size = s.len * 0.5; top = s.mastTop + 1; naval = true; }
  else { m = makeMonster(e.type, e.v, o.scale || 1); size = m.size; top = m.top; }
  m.g.position.set(x, 0, z); scene.add(m.g);
  const lv = e.lv, hpMax = Math.round(45 * Math.pow(1.65, lv) * (o.boss ? 0.8 : 1));
  const tag = document.createElement('div'); tag.className = 'tag'; $('tags').appendChild(tag);
  const mon = { e, m, g: m.g, type: e.type, lv, hp: hpMax, maxHp: hpMax, dmg: Math.round(9 * Math.pow(1.5, lv)), speed: (MSPEED[e.type] || (naval ? SHIP_TIERS[e.v].speed * 0.85 : 8)), size, top, naval, boss: !!o.boss, lair: o.lair || null,
    x, z, yaw: Math.random() * 6.28, state: o.boss ? 'rise' : 'wander', t: 0, wanderT: 0, att: 0, attT: -1, dive: o.boss ? 1 : 0, rise: o.boss ? 0 : 1, stun: 0, tag, name: m.name || SPECIES[e.type]?.variants[e.v]?.name || 'Monster', shotT: rnd(2, 4), dead: 0 };
  mon.passive = e.type === 'jelly' || (e.type === 'whale' && Math.random() < 0.5);
  mons.push(mon); return mon; }
function removeMon(mon) { scene.remove(mon.g); mon.tag.remove(); const i = mons.indexOf(mon); if (i >= 0) mons.splice(i, 1); }
function updateSpawns(dt) { spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
  for (const mon of [...mons]) { if (mon.boss) continue; if (Math.hypot(mon.x - boat.x, mon.z - boat.z) > 280 && !mon.dead) removeMon(mon); }
  const maxN = 5 + P.tier + (isNight() ? 2 : 0); if (mons.filter((m) => !m.boss).length >= maxN) return;
  const a = Math.random() * 6.28, d = rnd(95, 170), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30 || world.blockAt(x, z, 12) || Math.hypot(x, z + 40) < 70) return;
  const table = spawnTable(world.regionAt(x, z), isNight()); if (!table.length) return; let sum = table.reduce((s, e) => s + e.w, 0), pick = Math.random() * sum; let e = table[0]; for (const t of table) { pick -= t.w; if (pick <= 0) { e = t; break; } }
  if (e.type === 'jelly') { for (let k = 0; k < 3; k++) spawnMon(e, x + rnd(-8, 8), z + rnd(-8, 8)); } else spawnMon(e, x, z); }
function isNight() { return P.tod > 0.68 && P.tod < 0.97; }
function sightRange(mon) { let r = 34 + mon.lv * 6; if (wx.type === 'fog') r *= 0.45; if (isNight()) r *= 0.8; return r; }
function updateMons(dt) {
  for (const mon of [...mons]) {
    const st = mon.stState || (mon.stState = { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 }); st.t += dt;
    if (mon.dead) { mon.dead += dt; st.dive = Math.min(1, mon.dead / 2); mon.g.position.y -= dt * (mon.naval ? 1.2 : 0.6); if (mon.naval) { mon.g.rotation.z = Math.min(1.2, mon.dead * 0.5); } mon.m.anim(dt, st); if (mon.dead > 3.5) removeMon(mon); continue; }
    if (battle && battle.mon === mon) { animMon(mon, dt, st); continue; }
    const dx = boat.x - mon.x, dz = boat.z - mon.z, d = Math.hypot(dx, dz); mon.t += dt; mon.stun = Math.max(0, mon.stun - dt);
    let want = mon.yaw, spd = 0.35;
    if (mon.state === 'rise') { mon.rise = Math.min(1, mon.rise + dt * 0.35); mon.dive = 1 - mon.rise; if (mon.rise >= 1) { mon.state = 'chase'; } spd = 0; }
    else if (mon.stun > 0 || (mon.passive && mon.state !== 'chase')) { mon.wanderT -= dt; if (mon.wanderT <= 0) { mon.wanderT = rnd(3, 7); mon.wy = mon.yaw + rnd(-1.2, 1.2); } want = mon.wy ?? mon.yaw; spd = mon.stun > 0 ? 0.5 : 0.25; if (mon.stun > 0) want = Math.atan2(-dx, -dz); }
    else if (mon.state === 'chase' || (d < sightRange(mon) && state === 'play')) { if (mon.state !== 'chase') { mon.state = 'chase'; if (mon.lv > P.tier + 0.6) say('<span style="color:' + danger(mon.lv) + '">' + mon.name + '</span> has seen you!'); sfx.groan && sfx.groan(); }
      want = Math.atan2(dx, dz); spd = 1; if (d > sightRange(mon) * 1.8 && !mon.boss) mon.state = 'wander';
      if (mon.naval && d < 34 && d > 12) { mon.shotT -= dt; if (mon.shotT <= 0) { mon.shotT = rnd(2.5, 4); enemyArrows(mon); } } }
    else { mon.wanderT -= dt; if (mon.wanderT <= 0) { mon.wanderT = rnd(3, 8); mon.wy = mon.yaw + rnd(-1.4, 1.4); } want = mon.wy ?? mon.yaw; spd = 0.3; }
    // steer around islands
    const ax = mon.x + Math.sin(want) * (mon.size + 8), az = mon.z + Math.cos(want) * (mon.size + 8); if (world.blockAt(ax, az, 2)) want += 1.2;
    mon.yaw += clamp(angDiff(want, mon.yaw), -dt * 1.6, dt * 1.6); let sp = mon.speed * spd * (mon.state === 'chase' ? 1 : 0.5); if (mon.state === 'chase' && mon.lv > P.tier + 0.5 && !mon.boss) sp = Math.min(sp, topSpeed() * 0.86);
    if (mon.state === 'chase') { mon.chaseT = (mon.chaseT || 0) + dt; if (mon.chaseT > 24 && d > 22 && !mon.boss) { mon.state = 'wander'; mon.chaseT = 0; mon.stun = 10; } } else mon.chaseT = 0;
    let nx = mon.x + Math.sin(mon.yaw) * sp * dt, nz = mon.z + Math.cos(mon.yaw) * sp * dt; const bl = world.blockAt(nx, nz, mon.size * 0.4); if (bl) { nx = mon.x + bl.nx * dt * 3; nz = mon.z + bl.nz * dt * 3; mon.yaw += dt * 2; } mon.x = nx; mon.z = nz;
    st.speed = spd; animMon(mon, dt, st);
    // contact
    if (state === 'play' && !battle && !fishing && boat.grace <= 0 && mon.stun <= 0 && mon.rise >= 1 && d < mon.size * 0.7 + T().L * 0.42) contact(mon);
  }
}
function animMon(mon, dt, st) { if (mon.attT >= 0) { mon.attT += dt; st.attack = Math.sin(Math.min(1, mon.attT / 0.9) * Math.PI); if (mon.attT > 0.9) { mon.attT = -1; st.attack = 0; } } else st.attack = Math.max(0, st.attack - dt * 2);
  st.dive = mon.dive; st.rise = mon.rise; st.hurt = Math.max(0, (st.hurt || 0) - dt * 2); mon.g.position.x = mon.x; mon.g.position.z = mon.z; mon.g.rotation.y = mon.yaw;
  if (mon.naval) { const tl = ocean.tiltAt(mon.x, mon.z, mon.yaw, mon.size * 2, mon.size * 0.4); mon.g.position.y = tl.y; mon.m.ship.body.rotation.x = -tl.pitch * 0.8; mon.m.ship.body.rotation.z = -tl.roll * 0.8; } else mon.g.position.y = ocean.heightAt(mon.x, mon.z);
  mon.m.anim(dt, st); }
function contact(mon) {
  const fwd = Math.atan2(mon.x - boat.x, mon.z - boat.z), head = Math.abs(angDiff(fwd, boat.yaw)) < 0.6;
  if (P.up.ram && head && boat.v > topSpeed() * 0.55) { const d = Math.round(attack() * (0.6 + 0.5 * P.up.ram) * (boat.thor > 0 ? 2 : 1)); mon.hp -= d; pop(mon.x, mon.top, mon.z, 'RAMMED −' + d, '#ffd24a'); sfx.boom(); foam.splash(mon.x, mon.z, 1.5); if (mon.hp <= 0) { killMon(mon); return; } }
  if (mon.type === 'jelly') { damage(maxHp() * 0.04 * (1 - defense()), 'Stung by a ' + mon.name + '!'); mon.stun = 3; if (boat.v > 3) { mon.hp -= attack() * 0.6; if (mon.hp <= 0) killMon(mon); } return; }
  startBattle(mon, false); }
function enemyArrows(mon) { for (let k = 0; k < 4; k++) setTimeout(() => { if (state !== 'play') return; launch({ x: mon.x, y: 3, z: mon.z }, { x: boat.x + rnd(-2, 2), y: 1, z: boat.z + rnd(-2, 2) }, 'arrow', () => { if (!battle) damage(mon.dmg * 0.12 * (1 - defense())); }); }, k * 120); sfx.throw(); }
function killMon(mon) { mon.dead = 0.01; mon.tag.remove(); P.kills++; const lv = mon.lv, r = mon.naval ? { w: Math.round(12 * Math.pow(1.6, lv)), i: Math.round(3 + lv * 3), g: Math.round(16 * Math.pow(1.6, lv)) } : { i: Math.round(1 + lv * 2.5), g: Math.round(12 * Math.pow(1.6, lv)) };
  if (mon.type === 'jelly') { r.i = 0; r.g = Math.round(r.g * 0.4); } reward(r, mon.x, mon.top + 1, mon.z); foam.splash(mon.x, mon.z, 2);
  if (mon.boss) { P.legends[mon.lair] = true; world.lairs.find((l) => l.key === mon.lair).beaten = true; say('<b>' + mon.name.toUpperCase() + ' IS SLAIN!</b> Legends beaten: ' + Object.keys(P.legends).length + ' / 3', 5); sfx.horn(); if (Object.keys(P.legends).length >= 3 && !P.won) setTimeout(winGame, 2500); save(); } }

// ---------- projectiles (spears, bolts, enemy arrows) ----------
const spearGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5); spearGeo.rotateX(Math.PI / 2); const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.4, 6); boltGeo.rotateX(Math.PI / 2);
function launch(a, b, kind, onHit) { const g = new THREE.Group(); const m = new THREE.Mesh(kind === 'bolt' ? boltGeo : spearGeo, M(kind === 'arrow' ? 0xff8a2a : 0x8a6a4a, kind === 'arrow' ? 'glow' : 'skin')); g.add(m); if (kind !== 'arrow') { const tip = new THREE.Mesh(new THREE.ConeGeometry(kind === 'bolt' ? 0.18 : 0.1, 0.4, 6), M(0xb8c0c8)); tip.rotation.x = Math.PI / 2; tip.position.z = kind === 'bolt' ? 1.3 : 0.9; g.add(tip); }
  g.position.set(a.x, a.y, a.z); scene.add(g); const dist = Math.hypot(b.x - a.x, b.z - a.z); projs.push({ g, a: V(a.x, a.y, a.z), b: V(b.x, b.y, b.z), t: 0, dur: clamp(dist / 34, 0.25, 1.1), arc: dist * 0.12, onHit, kind }); }
function updateProjs(dt) { for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.t += dt / p.dur; const k = Math.min(1, p.t); const pos = p.a.clone().lerp(p.b, k); pos.y += Math.sin(k * Math.PI) * p.arc; const nxt = p.a.clone().lerp(p.b, Math.min(1, k + 0.02)); nxt.y += Math.sin(Math.min(1, k + 0.02) * Math.PI) * p.arc; p.g.position.copy(pos); p.g.lookAt(nxt);
    if (p.t >= 1) { scene.remove(p.g); projs.splice(i, 1); if (p.onHit) p.onHit(); } } }
function fire() { if (state !== 'play' || battle || fishing || boat.fireCd > 0) return; const range = fireRange(); let best = null, bd = 1e9;
  for (const mon of mons) { if (mon.dead || mon.rise < 1) continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (d < range && d < bd) { bd = d; best = mon; } }
  const kind = P.up.ballista ? 'bolt' : 'spear'; boat.fireCd = P.up.ballista ? 2.2 - P.up.ballista * 0.25 : 1.2; const from = { x: boat.x + Math.sin(boat.yaw) * T().L * 0.35, y: boat.y + 2, z: boat.z + Math.cos(boat.yaw) * T().L * 0.35 };
  if (!best) { const tx = boat.x + Math.sin(boat.yaw) * range * 0.8, tz = boat.z + Math.cos(boat.yaw) * range * 0.8; launch(from, { x: tx, y: 0, z: tz }, kind, () => { foam.splash(tx, tz, 0.6); sfx.splash(0.6); }); say('No target in range'); sfx.throw(); return; }
  const tgt = best; sfx.throw(); launch(from, { x: tgt.x, y: Math.max(1, tgt.top * 0.4) + tgt.g.position.y, z: tgt.z }, kind, () => { if (tgt.dead) return; const d = Math.round(attack() * (kind === 'bolt' ? 0.75 : 0.45) * (boat.thor > 0 ? 2 : 1) * rnd(0.85, 1.15)); tgt.hp -= d; tgt.stState && (tgt.stState.hurt = 1); pop(tgt.x, tgt.top + tgt.g.position.y, tgt.z, '−' + d, '#ffd24a'); sfx.hit(); foam.splash(tgt.x, tgt.z, 0.7);
    if (tgt.hp <= 0) killMon(tgt); else if (!tgt.passive || tgt.type === 'whale') { tgt.state = 'chase'; tgt.passive = false; } }); }

// ---------- battle ----------
function startBattle(mon, firstStrike) {
  if (battle) return; battle = { mon, t: 0 }; boat.wp = null; stick.id = null; stick.x = stick.y = 0; knob.style.transform = 'translate(-50%, -50%)'; setMusicChase(true);
  // place the foe beside the ship, facing it
  const gap = T().L * 0.25 + mon.size * 0.75 + 4; let side = boat.yaw + Math.PI / 2; const toFoe = Math.atan2(mon.x - boat.x, mon.z - boat.z);
  for (const c of [toFoe, boat.yaw + Math.PI / 2, boat.yaw - Math.PI / 2, boat.yaw + Math.PI, boat.yaw, toFoe + 2.4, toFoe - 2.4]) { const x = boat.x + Math.sin(c) * gap, z = boat.z + Math.cos(c) * gap; if (!world.blockAt(x, z, mon.size * 0.6 + 2) && !world.blockAt((x + boat.x) / 2, (z + boat.z) / 2, 2)) { side = c; break; } }
  mon.bx = boat.x + Math.sin(side) * gap; mon.bz = boat.z + Math.cos(side) * gap; battle.side = side;
  $('acts').classList.add('hidden'); $('stick').classList.add('hidden');
  const foe = { name: mon.name, lvShow: Math.round(mon.lv) + 1, lv: Math.round(mon.lv * 10) / 10, hp: mon.hp, maxHp: mon.maxHp, dmg: mon.dmg, naval: mon.naval, boss: mon.boss, attacks: mon.boss ? 3 : mon.lv >= 3 ? 2 : 1, attackNames: ATK[mon.type] };
  const you = { hp: P.hp, maxHp: maxHp(), def: defense(), atk: attack(), zone: 0.15 + P.up.ballista * 0.04, fire: P.up.fire ? P.up.fire + 1 : 0, thor: boat.thor > 0, shots: 3, weapon: P.up.ballista ? 'BALLISTA' : 'SPEARS' };
  battle.foe = foe; battle.you = you;
  minis.battle({ foe, you, youName: T().name, firstStrike, intro: mon.boss ? mon.name.toUpperCase() + '!' : undefined }, (res) => {
    P.hp = Math.max(0, you.hp); mon.hp = foe.hp; setMusicChase(false); boat.grace = 3.5; $('acts').classList.remove('hidden'); $('stick').classList.remove('hidden'); const b = battle; battle = null; hud();
    if (res.result === 'win') { killMon(mon); }
    else if (res.result === 'flee') { mon.stun = 7; boat.boost = 3.5; boat.v = topSpeed(); say('You row hard and break away!'); }
    if (res.result === 'sunk' || P.hp <= 0) { sink(); return; } void b; });
}
function battleShoot(mult, dmg, txt, fireP) { if (!battle) return; const mon = battle.mon, from = { x: boat.x, y: boat.y + 2.5, z: boat.z }; launch(from, { x: mon.x, y: mon.g.position.y + Math.max(1, mon.top * 0.45), z: mon.z }, P.up.ballista ? 'bolt' : 'spear', () => { if (mult > 0) { foam.splash(mon.x, mon.z, fireP ? 2 : 1); mon.stState && (mon.stState.hurt = 1); pop(mon.x, mon.g.position.y + mon.top, mon.z, (fireP ? '🔥 ' : '') + '−' + dmg, fireP ? '#ff8a2a' : mult >= 2 ? '#ffd24a' : '#fff'); } else { foam.splash(mon.x + rnd(-4, 4), mon.z + rnd(-4, 4), 0.6); } });
  if (fireP) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), M(0xff8a2a, 'glow')); scene.add(f); projs.push({ g: f, a: V(from.x, from.y, from.z), b: V(mon.x, mon.g.position.y + mon.top * 0.4, mon.z), t: 0, dur: 0.6, arc: 4, onHit: () => { for (let k = 0; k < 12; k++) foam.add(mon.x + rnd(-2, 2), mon.z + rnd(-2, 2), { spray: true, y: mon.g.position.y + 1, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(3, 7), s: 0.8, life: 0.8, a: 0.9 }); } }); } }
function battleHurt(d) { boat.shake = 0.5; hurtFx(); P.hp = Math.max(0, P.hp - 0); pop(boat.x, boat.y + 3, boat.z, '−' + d, '#ff6a4a'); foam.splash(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), 1.2); sfx.splash(); $('hullFill').style.width = clamp(battle.you.hp / maxHp(), 0, 1) * 100 + '%'; $('hullTxt').textContent = Math.max(0, Math.ceil(battle.you.hp)) + ' / ' + maxHp(); }
function battleFoeAct(d) { if (!battle) return; const mon = battle.mon; mon.attT = 0; battle.lunge = d; sfx.groan && sfx.groan(); if (mon.naval) { setTimeout(() => { if (!battle) return; for (let k = 0; k < 5; k++) launch({ x: mon.x, y: 3, z: mon.z }, { x: boat.x + rnd(-3, 3), y: 1.5, z: boat.z + rnd(-3, 3) }, 'arrow'); }, 200); } }
function updateBattle(dt) { const mon = battle.mon; battle.t += dt; mon.x += (mon.bx - mon.x) * Math.min(1, dt * 2); mon.z += (mon.bz - mon.z) * Math.min(1, dt * 2); mon.yaw += angDiff(Math.atan2(boat.x - mon.x, boat.z - mon.z), mon.yaw) * Math.min(1, dt * 3);
  if (mon.attT >= 0 && mon.attT < 0.5) { const k = Math.sin((mon.attT / 0.5) * Math.PI) * 2; mon.x += Math.sin(mon.yaw) * k * dt * 4; mon.z += Math.cos(mon.yaw) * k * dt * 4; } boat.v *= 1 - dt * 2; }

// ---------- fishing spots, floating supplies, wrecks ----------
const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
function spawnSpot() { const a = Math.random() * 6.28, d = rnd(40, 130), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30 || world.blockAt(x, z, 8)) return; const r = Math.random(); const kind = r < 0.5 ? 'fish' : r < 0.85 ? 'flotsam' : 'treasure';
  const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 24), spotMat.clone()); m.rotation.x = -Math.PI / 2; m.userData.k = k; g.add(m); }
  const jumper = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), M(kind === 'treasure' ? 0xffd24a : kind === 'flotsam' ? 0x8a5a32 : 0x9ab8c8, kind === 'treasure' ? 'glow' : 'skin')); jumper.scale.set(1, 0.7, 2.2); g.add(jumper); g.userData.jumper = jumper;
  g.position.set(x, 0, z); scene.add(g); spots.push({ g, x, z, kind, t: Math.random() * 5 }); }
function spawnFloat(x, z, kind, amt) { const g = new THREE.Group(); if (kind === 'g') { const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), M(0x7a4a22)); g.add(c); const l = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.65), M(0xe6b43a)); l.position.y = 0.25; g.add(l); }
  else if (kind === 'f') { const f = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M(0x9ab8c8)); f.scale.set(1, 0.6, 2); g.add(f); }
  else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1, 10), M(kind === 'i' ? 0x5a5e66 : 0x8a5a32)); b.rotation.z = Math.PI / 2; g.add(b); for (const s of [-0.3, 0.3]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 4, 12), M(0x3a2414)); h.rotation.y = Math.PI / 2; h.position.x = s; g.add(h); } }
  g.position.set(x, 0, z); scene.add(g); floats.push({ g, x, z, kind, amt, t: Math.random() * 6 }); }
function updateSea(dt) {
  spotT -= dt; if (spotT <= 0) { spotT = 2; for (let i = spots.length - 1; i >= 0; i--) { const s = spots[i]; if (Math.hypot(s.x - boat.x, s.z - boat.z) > 200) { scene.remove(s.g); spots.splice(i, 1); } } if (spots.length < 4) spawnSpot();
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; if (Math.hypot(f.x - boat.x, f.z - boat.z) > 220) { scene.remove(f.g); floats.splice(i, 1); } } if (floats.length < 7) { const a = Math.random() * 6.28, d = rnd(40, 150), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (!world.blockAt(x, z, 4) && Math.abs(x) < HALF - 20 && Math.abs(z) < HALF - 20) { const r = Math.random(); spawnFloat(x, z, r < 0.55 ? 'w' : r < 0.85 ? 'i' : 'g', 0); } } }
  for (const s of spots) { s.t += dt; s.g.position.y = ocean.heightAt(s.x, s.z) + 0.05; for (const m of s.g.children) if (m.userData.k != null) { const k = ((s.t * 0.6 + m.userData.k / 3) % 1); m.scale.setScalar(1 + k * 4); m.material.opacity = 0.6 * (1 - k); }
    const j = s.g.userData.jumper, ph = (s.t * 0.8) % 2.2; if (ph < 0.8) { const k = ph / 0.8; j.visible = true; j.position.set(Math.sin(s.t) * 2, Math.sin(k * Math.PI) * 1.6, Math.cos(s.t) * 2 + (k - 0.5) * 3); j.rotation.x = (k - 0.5) * 2; } else j.visible = false; }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; f.g.position.set(f.x, ocean.heightAt(f.x, f.z) + 0.1 + Math.sin(f.t * 2) * 0.08, f.z); f.g.rotation.set(Math.sin(f.t * 1.3) * 0.25, f.t * 0.3, Math.cos(f.t * 1.1) * 0.25);
    if (state === 'play' && Math.hypot(f.x - boat.x, f.z - boat.z) < T().L * 0.5 + 1.5) { const k = 1 + P.tier * 0.6, r = f.kind === 'w' ? { w: Math.round(rnd(3, 7) * k) } : f.kind === 'i' ? { i: Math.round(rnd(1, 4) * k) } : f.kind === 'f' ? { f: f.amt || 1 } : { g: Math.round(rnd(10, 30) * k) }; reward(r, f.x, 2, f.z); foam.splash(f.x, f.z, 0.5); scene.remove(f.g); floats.splice(i, 1); } }
  for (const w of world.wrecks) if (w.looted && time > w.looted) w.looted = false;
}
function actionContext() { if (battle || fishing) return null; const v = boat.v;
  for (const h of world.harbors) if (Math.hypot(h.dock.x - boat.x, h.dock.z - boat.z) < 16 + T().L * 0.3) return v < 4.5 ? { kind: 'dock', h, icon: '⚓', label: 'DOCK' } : { kind: 'slow', icon: '⚓', label: 'SLOW' };
  let nearM = null, nd = 1e9; for (const mon of mons) { if (mon.dead || mon.rise < 1 || mon.type === 'jelly') continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (d < 22 + mon.size && d < nd) { nd = d; nearM = mon; } } if (nearM) return { kind: 'fight', mon: nearM, icon: '⚔', label: 'FIGHT' };
  for (const w of world.wrecks) if (!w.looted && Math.hypot(w.x - boat.x, w.z - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'salvage', w, icon: '🪝', label: 'SALVAGE' } : { kind: 'slow', icon: '🪝', label: 'SLOW' };
  for (const s of spots) if (Math.hypot(s.x - boat.x, s.z - boat.z) < 9 + T().L * 0.35) return v < 3.5 ? { kind: 'fish', s, icon: s.kind === 'treasure' ? '💰' : s.kind === 'flotsam' ? '📦' : '🎣', label: 'FISH' } : { kind: 'slow', icon: '🎣', label: 'SLOW' };
  return null; }
let ctx = null;
function doAction() { if (!ctx || state !== 'play') return; if (ctx.kind === 'dock') openHarbor(ctx.h); else if (ctx.kind === 'fight') startBattle(ctx.mon, true); else if (ctx.kind === 'fish') startFishing(ctx.s); else if (ctx.kind === 'salvage') startSalvage(ctx.w); else if (ctx.kind === 'slow') say('Slow down first (let go of the steering circle).'); }
const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xf2e6c8 })); line.visible = false; scene.add(line);
function startFishing(s) { fishing = { s }; boat.wp = null; $('acts').classList.add('hidden'); $('stick').classList.add('hidden'); line.visible = true;
  minis.fish({ kind: s.kind, nets: P.up.nets, tier: P.tier, biteChance: 0.07 }, (res) => { $('acts').classList.remove('hidden'); $('stick').classList.remove('hidden'); line.visible = false; fishing = null; boat.grace = 2.5;
    const k = 1 + P.tier * 0.6, q = res.q || 0.4;
    if (res.result === 'catch') { const r = s.kind === 'fish' ? { f: Math.round(2 + P.up.nets * 1.5 + q * 3 + P.tier) } : s.kind === 'flotsam' ? { w: Math.round((5 + q * 6) * k * (1 + P.up.nets * 0.2)), i: Math.round((1 + q * 3) * k) } : { g: Math.round((18 + q * 40) * k * (1 + P.up.nets * 0.15)) }; reward(r, s.x, 2.5, s.z); removeSpot(s); }
    else if (res.result === 'bite') { removeSpot(s); const lv = Math.max(0, P.tier + rnd(-0.3, 0.6)), vi = MLV.shark.reduce((bi, l, i) => (Math.abs(l - lv) < Math.abs(MLV.shark[bi] - lv) ? i : bi), 0); const mon = spawnMon({ type: 'shark', v: vi, lv: MLV.shark[vi] }, s.x, s.z); mon.state = 'chase'; startBattle(mon, false); } }); }
function removeSpot(s) { scene.remove(s.g); const i = spots.indexOf(s); if (i >= 0) spots.splice(i, 1); }
function fishCast() { if (!fishing) return; foam.splash(fishing.s.x, fishing.s.z, 0.6); sfx.splash(0.5); }
function startSalvage(w) { fishing = { s: w }; $('acts').classList.add('hidden'); $('stick').classList.add('hidden');
  minis.salvage({ tier: P.tier }, (res) => { $('acts').classList.remove('hidden'); $('stick').classList.remove('hidden'); fishing = null; const k = (1 + P.tier * 0.6) * (res.frac || 0); if (res.result !== 'stop' || res.frac > 0.3) { reward({ w: Math.round(rnd(10, 20) * k), i: Math.round(rnd(4, 10) * k), g: Math.round(rnd(20, 45) * k) }, w.x, 3, w.z); w.looted = time + 480; } }); }

// ---------- weather: rain, storms with lightning to catch, fog, rogue waves, waterspouts, sea tornadoes ----------
const WXNAME = { clear: '', calm: 'Calm', rain: '🌧 Rain', storm: '⛈ Storm', fog: '🌫 Fog', spout: '💧 Waterspouts', tornado: '🌪 Sea tornado', rogue: '🌊 Rogue waves' };
const LOOK = { clear: null, calm: 'calm', rain: 'rain', storm: 'storm', fog: 'fog', spout: 'rain', tornado: 'storm', rogue: 'storm' };
function pickWeather() { const reg = world.regionAt(boat.x, boat.z), opts = { home: ['calm', 'rain', 'fog', 'storm', 'spout'], frost: ['fog', 'storm', 'rogue', 'calm', 'rain'], storm: ['storm', 'storm', 'tornado', 'rogue', 'spout', 'rain'], mist: ['fog', 'fog', 'rain', 'storm', 'spout'], warm: ['calm', 'spout', 'storm', 'rain', 'tornado'] }[reg]; return opts[(Math.random() * opts.length) | 0]; }
function setWeather(type) { if (type === 'clear') { if (wx.type !== 'clear') wx.fading = true; return; } wx.type = type; wx.k = 0; wx.fading = false; wx.t = rnd(40, 70); boltT = 3;
  const tip = { storm: 'A storm! Sail into a blue ring to catch the lightning.', tornado: 'A sea tornado is coming! Keep away from it.', spout: 'Waterspouts! Steer clear of the spinning columns.', rogue: 'Rogue wave weather. Turn your bow into the big waves!', fog: 'Fog rolls in. Monsters lurk close.', rain: 'Rain.', calm: 'The sea goes calm.' }[type]; say(tip, 3.5); sfx.whoosh();
  if (type === 'spout') for (let k = 0; k < 2; k++) spawnSpout('waterspout', 2.0); if (type === 'tornado') spawnSpout('seastorm', 2.7); if (type === 'rogue') rogueT = 6; }
function spawnSpout(skin, sc) { const a = Math.random() * 6.28, d = rnd(60, 100), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; const g = twisters.make(true, [], skin); g.scale.setScalar(0.01); g.position.set(x, 0, z); scene.add(g); spouts.push({ g, x, z, sc, r: sc * 3.4, dir: Math.atan2(boat.x - x, boat.z - z) + rnd(-0.6, 0.6), life: wx.t, age: 0, tornado: skin === 'seastorm' }); }
const ringGeo = new THREE.RingGeometry(0.85, 1, 40), boltMat = new THREE.LineBasicMaterial({ color: 0xffffff }), boltGlow = new THREE.LineBasicMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0.6 });
function warnRing() { const ahead = Math.random() < 0.6, a = ahead ? boat.yaw + rnd(-0.5, 0.5) : Math.random() * 6.28, d = ahead ? rnd(14, 30) + boat.v * 1.5 : rnd(10, 45); const x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; const R = 4 + T().B * 0.6;
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x5ab8ff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.scale.setScalar(R); scene.add(m); const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x5ab8ff, transparent: true, opacity: 0.18, depthWrite: false })); inner.rotation.x = -Math.PI / 2; inner.scale.setScalar(R); scene.add(inner);
  rings.push({ m, inner, x, z, R, t: 0, dur: 2.6 }); }
function landBolt(x, z, R) { const pts = []; let px = x + rnd(-3, 3), pz = z + rnd(-3, 3); for (let y = 60; y > 0; y -= 4) { pts.push(V(px, y, pz)); px += (px < x ? 1 : -1) * Math.random() * 2 + rnd(-1, 1); pz += (pz < z ? 1 : -1) * Math.random() * 2 + rnd(-1, 1); } pts.push(V(x, ocean.heightAt(x, z), z));
  const g = new THREE.Group(); g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), boltMat)); for (const o of [[0.25, 0], [-0.25, 0], [0, 0.25]]) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((q) => V(q.x + o[0], q.y, q.z + o[1]))), boltGlow)); scene.add(g); bolts.push({ g, t: 0.22 });
  flash = 1; sfx.thunder(); foam.splash(x, z, 1.4);
  if (Math.hypot(boat.x - x, boat.z - z) < R + T().B * 0.5 && state === 'play') { boat.thor = 22; say('<span style="color:#9fe0ff">⚡ THOR\'S FURY! ⚡</span> Double damage and a mighty shield for 22 s', 3.5); sfx.zap(); sfx.horn(); P.hp = Math.min(maxHp(), P.hp + maxHp() * 0.05); hud(); }
  for (const mon of mons) if (!mon.dead && Math.hypot(mon.x - x, mon.z - z) < R + mon.size * 0.5) { const d = Math.round(mon.maxHp * 0.3); mon.hp -= d; pop(mon.x, mon.top, mon.z, '⚡−' + d, '#9fe0ff'); if (mon.hp <= 0) killMon(mon); } }
function updateWeather(dt) {
  if (wx.type === 'clear') { wx.next -= dt; if (wx.next <= 0) setWeather(pickWeather()); }
  else if (wx.fading) { wx.k = Math.max(0, wx.k - dt / 5); if (wx.k <= 0) { wx.type = 'clear'; wx.fading = false; wx.next = rnd(35, 70); } }
  else { wx.k = Math.min(1, wx.k + dt / 5); wx.t -= dt; if (wx.t <= 0) { setWeather('clear'); say('The weather clears.'); } }
  // lightning: blue warning rings, then the bolt (catch it with your ship for Thor's Fury)
  if ((wx.type === 'storm' || wx.type === 'tornado' || wx.type === 'rogue') && wx.k > 0.6 && !wx.fading && state === 'play') { boltT -= dt; if (boltT <= 0) { boltT = rnd(2.2, 4.5); warnRing(); } }
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const y = ocean.heightAt(r.x, r.z) + 0.15; r.m.position.set(r.x, y, r.z); r.inner.position.set(r.x, y + 0.02, r.z); const k = r.t / r.dur; r.m.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(r.t * (6 + k * 14))); r.inner.material.opacity = 0.12 + k * 0.3;
    if (r.t >= r.dur) { landBolt(r.x, r.z, r.R); scene.remove(r.m); scene.remove(r.inner); r.inner.material.dispose(); r.m.material.dispose(); rings.splice(i, 1); } }
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t -= dt; b.g.visible = Math.random() < 0.85; if (b.t <= 0) { scene.remove(b.g); bolts.splice(i, 1); } }
  flash = Math.max(0, flash - dt * 3);
  // rogue waves: a warning, then a wall of water rolls through; bow into it rides it, side-on gets smashed
  const R = ocean.rogue;
  if (wx.type === 'rogue' && !wx.fading && rogueT >= 0) { rogueT -= dt; if (rogueT <= 0 && R.k === 0 && state === 'play') { const a = Math.random() * 6.28; R.dx = Math.sin(a); R.dz = Math.cos(a); R.x = boat.x - R.dx * 150; R.z = boat.z - R.dz * 150; R.H = 6 + P.tier * 0.7; R.w = 8 + P.tier; R.Lc = 90; R.k = 0.01; rogueHit = false;
      const comp = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((Math.atan2(-R.dx, R.dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8]; warn('🌊 ROGUE WAVE from the ' + comp + '! Turn your bow into it!', 6); sfx.horn(); } }
  if (R.k > 0) { R.x += R.dx * 15 * dt; R.z += R.dz * 15 * dt; const al = (boat.x - R.x) * R.dx + (boat.z - R.z) * R.dz; R.k = Math.min(1, R.k + dt * 0.6); if (al < -170) { R.k = 0; rogueT = rnd(14, 24); }
    if (!rogueHit && Math.abs(al) < R.w * 0.5 && state === 'play' && !battle) { rogueHit = true; const into = Math.sin(boat.yaw) * -R.dx + Math.cos(boat.yaw) * -R.dz; if (into > 0.6) { say('You crest the rogue wave! Skål!', 3); reward({ g: 10 + P.tier * 10 }, boat.x, 4, boat.z); } else { damage(maxHp() * (0.34 - 0.24 * Math.max(0, into)) * (1 - P.up.armor * 0.1), 'The rogue wave smashes into you!'); boat.spin = 2.5 * (Math.random() < 0.5 ? -1 : 1); } } }
  // waterspouts / tornadoes
  for (let i = spouts.length - 1; i >= 0; i--) { const s = spouts[i]; s.age += dt; s.life -= dt; const grow = clamp(Math.min(s.age / 4, s.life / 4), 0, 1); s.g.scale.setScalar(s.sc * Math.max(0.01, grow));
    s.dir += rnd(-0.4, 0.4) * dt + angDiff(Math.atan2(boat.x - s.x, boat.z - s.z), s.dir) * dt * 0.08; const sp = s.tornado ? 5 : 4; s.x += Math.sin(s.dir) * sp * dt; s.z += Math.cos(s.dir) * sp * dt; s.g.position.set(s.x, 0, s.z); if (Math.random() < dt * 8) foam.add(s.x + rnd(-s.r, s.r), s.z + rnd(-s.r, s.r), { spray: true, y: 0.5, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(4, 9), s: 1, life: 1.2, a: 0.7 });
    const d = Math.hypot(boat.x - s.x, boat.z - s.z), R2 = s.r * grow * 1.4; if (d < R2 && state === 'play' && !battle) { boat.spin = Math.max(boat.spin, 1.6); const tx = -(boat.z - s.z) / (d || 1), tz = (boat.x - s.x) / (d || 1); boat.x += tx * dt * 9 + (boat.x - s.x) / (d || 1) * dt * 3; boat.z += tz * dt * 9 + (boat.z - s.z) / (d || 1) * dt * 3; boat.hitCd -= dt; if (boat.hitCd <= 0) { boat.hitCd = 0.6; damage(maxHp() * (s.tornado ? 0.06 : 0.035) * (1 - defense() * 0.5), s.tornado ? 'Caught in the sea tornado!' : 'Caught in a waterspout!'); } }
    for (const mon of mons) if (!mon.dead && Math.hypot(mon.x - s.x, mon.z - s.z) < R2) { mon.hp -= mon.maxHp * 0.08 * dt; mon.yaw += dt * 3; if (mon.hp <= 0) killMon(mon); }
    for (let j = spots.length - 1; j >= 0; j--) { const sp2 = spots[j]; if (sp2.kind === 'fish' && Math.hypot(sp2.x - s.x, sp2.z - s.z) < R2) { removeSpot(sp2); for (let k = 0; k < 6; k++) spawnFloat(boat.x + rnd(-25, 25), boat.z + rnd(-25, 25), 'f', 1); say('It\'s raining fish! 🐟', 2.5); } }
    if (s.life <= 0) { twisters.remove(s.g); spouts.splice(i, 1); } }
  twisters.update(dt);
  // rain
  const wet = (LOOK[wx.type] === 'rain' || LOOK[wx.type] === 'storm') ? wx.k : 0; rain.visible = wet > 0.05; rain.material.opacity = 0.35 * wet; if (rain.visible) { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { let y = p.getY(i) - dt * 40; let x = p.getX(i), z = p.getZ(i); if (y < -2 || Math.abs(x - camTgt.x) > 50 || Math.abs(z - camTgt.z) > 50) { x = camTgt.x + rnd(-50, 50); z = camTgt.z + rnd(-50, 50); y = rnd(20, 50); } p.setXYZ(i, x, y, z); p.setXYZ(i + 1, x + 0.3, y + 1.6, z + 0.2); } p.needsUpdate = true; }
}
const rain = (() => { const n = 700, a = new Float32Array(n * 6); for (let i = 0; i < n * 6; i += 3) { a[i] = rnd(-50, 50); a[i + 1] = rnd(0, 50); a[i + 2] = rnd(-50, 50); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.3 })); l.frustumCulled = false; l.visible = false; scene.add(l); return l; })();

// ---------- harbours, upgrades ----------
let atHarbor = null;
function openHarbor(h) { state = 'harbor'; atHarbor = h; P.home = h.idx; boat.v = 0; boat.wp = null; $('hud').classList.add('hidden'); $('harbor').classList.remove('hidden'); $('hbName').textContent = h.name.toUpperCase();
  let txt = 'Welcome to ' + h.name + '.'; if (P.res.f > 0) { const g = P.res.f * (3 + P.tier); txt += ' Your catch of ' + P.res.f + ' 🐟 sold for ' + g + ' 🪙.'; P.res.g += g; P.res.f = 0; sfx.coins(); } $('hbText').textContent = txt; save(); drawHarbor(); sfx.horn(); }
const can = (c) => P.res.w >= c[0] && P.res.i >= c[1] && P.res.g >= c[2];
const costHtml = (c) => [['🪵', c[0], P.res.w], ['⚙️', c[1], P.res.i], ['🪙', c[2], P.res.g]].filter(([, n]) => n > 0).map(([ic, n, have]) => '<span class="' + (have < n ? 'no' : '') + '">' + n + ic + '</span>').join(' ');
function drawHarbor() { $('hbRes').innerHTML = `<span>🪵 ${P.res.w}</span><span>⚙️ ${P.res.i}</span><span>🪙 ${P.res.g}</span><span>❤️ ${Math.ceil(P.hp)}/${maxHp()}</span>`; const list = $('hbList'); list.innerHTML = '';
  const miss = maxHp() - P.hp; if (miss > 0.5) { const c = [Math.ceil(miss / 10), 0, Math.ceil(miss / 6)]; const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">🔨</div><div class="tx"><b>Repair the hull</b><div>${Math.ceil(miss)} damage to mend</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'REPAIR'; b.disabled = !can(c); b.onclick = () => { if (!can(c)) return; P.res.w -= c[0]; P.res.g -= c[2]; P.hp = maxHp(); sfx.pickup(); drawHarbor(); hud(); save(); }; d.appendChild(b); list.appendChild(d); }
  if (P.tier < 4) { const c = TIER_COST[P.tier + 1], nt = SHIP_TIERS[P.tier + 1]; const d = document.createElement('div'); d.className = 'card ship'; d.innerHTML = `<div class="ic">🐉</div><div class="tx"><b>Build a ${nt.name}</b><div>Ship size ${P.tier + 2} of 5 · ${nt.crew} crew · hull ${Math.round(100 * Math.pow(1.75, P.tier + 1))} · stronger seas</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'BUILD'; b.disabled = !can(c); b.onclick = () => { if (!can(c)) return; P.res.w -= c[0]; P.res.i -= c[1]; P.res.g -= c[2]; P.tier++; P.hp = maxHp(); rebuildShip(); sfx.horn(); drawHarbor(); save(); }; d.appendChild(b); list.appendChild(d); }
  for (const [k, u] of Object.entries(UPG)) { const lv = P.up[k], d = document.createElement('div'); d.className = 'card'; const capped = lv >= u.max, locked = !capped && lv >= P.tier + 1, c = capped ? null : u.cost[lv];
    d.innerHTML = `<div class="ic">${u.icon}</div><div class="tx"><b>${u.name}</b><span class="pips">${'◆'.repeat(lv)}${'◇'.repeat(u.max - lv)}</span><div>${capped ? 'Fully upgraded' : u.desc[lv] + ' · ' + u.eff}</div><div class="cost">${capped ? '' : locked ? '<span class="no">Needs a bigger ship</span>' : costHtml(c)}</div></div>`;
    if (!capped) { const b = document.createElement('button'); b.textContent = 'BUY'; b.disabled = locked || !can(c); b.onclick = () => { if (locked || !can(c)) return; P.res.w -= c[0]; P.res.i -= c[1]; P.res.g -= c[2]; P.up[k]++; if (k === 'armor') P.hp += maxHp() - Math.round(maxHp() / (1 + 0.25 * P.up.armor) * (1 + 0.25 * (P.up.armor - 1))); P.hp = Math.min(P.hp, maxHp()); rebuildShip(); sfx.pickup(); drawHarbor(); save(); }; d.appendChild(b); }
    list.appendChild(d); } }
$('hbSail').onclick = () => { $('harbor').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; const h = atHarbor; if (h) { boat.x = h.dock.x + Math.cos(h.dir) * 10; boat.z = h.dock.z + Math.sin(h.dir) * 10; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); } atHarbor = null; hud(); say('Fair winds!'); };

// ---------- lairs (legend bosses) ----------
const LAIR_NAMES = { kraken: 'The Kraken', jorm: 'Jormungandr', rlyeh: 'The Elder One' }, LAIR_NEED = { kraken: 2, jorm: 3, rlyeh: 4 };
let lairWarned = {};
function updateLairs() { for (const L of world.lairs) { if (L.beaten || P.legends[L.key]) continue; const d = Math.hypot(boat.x - L.x, boat.z - L.z);
    if (d < 95 && !lairWarned[L.key]) { lairWarned[L.key] = true; say(P.tier >= LAIR_NEED[L.key] ? 'You enter ' + L.name + '. ' + LAIR_NAMES[L.key] + ' stirs below…' : L.name + ': ' + LAIR_NAMES[L.key] + ' sleeps here. Come back with a ' + SHIP_TIERS[LAIR_NEED[L.key]].name + ' or bigger.', 4); }
    if (d > 130) lairWarned[L.key] = false;
    if (d < 40 && P.tier >= LAIR_NEED[L.key] && !mons.some((m) => m.boss && m.lair === L.key)) { const lv = MLV[L.monster][0], mon = spawnMon({ type: L.monster, v: L.key === 'jorm' ? 0 : 0, lv }, L.x, L.z, { boss: true, lair: L.key, scale: L.monster === 'kraken' ? 1.6 : L.monster === 'elder' ? 1.5 : 1 }); mon.name = LAIR_NAMES[L.key]; warn('⚠ ' + LAIR_NAMES[L.key].toUpperCase() + ' RISES! ⚠', 4); sfx.horn(); sfx.thunder(); flash = 1; } } }

// ---------- sinking, saving ----------
function sink() { if (state !== 'play') return; state = 'sunk'; battle = null; fishing = null; minis.close(); const lost = {}; for (const k of ['w', 'i', 'g', 'f']) { lost[k] = Math.floor(P.res[k] / 2); P.res[k] -= lost[k]; }
  $('sunkText').innerHTML = 'Your ship goes down beneath the waves. The gods send you back to ' + homeHarbor().name + ' with a new hull, but half your cargo is lost: ' + lost.w + ' 🪵 ' + lost.i + ' ⚙️ ' + lost.g + ' 🪙 ' + lost.f + ' 🐟.'; $('hud').classList.add('hidden'); $('sunk').classList.remove('hidden'); sfx.over(); setMusicChase(false); }
$('sunkBtn').onclick = () => { const h = homeHarbor(); P.hp = maxHp(); boat.x = h.dock.x + Math.cos(h.dir) * 10; boat.z = h.dock.z + Math.sin(h.dir) * 10; boat.v = 0; boat.wp = null; for (const m of [...mons]) removeMon(m); $('sunk').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; hud(); save(); };
function winGame() { P.won = true; state = 'won'; $('hud').classList.add('hidden'); $('won').classList.remove('hidden'); $('wonText').innerHTML = 'The Kraken, Jormungandr and the Elder One have fallen. Every fjord sings of Pat, ruler of the monster sea.<br><br>' + P.kills + ' foes slain.'; sfx.horn(); save(); }
$('wonBtn').onclick = () => { $('won').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; };
const SAVE = 'pr_save';
function homeHarbor() { return world.harbors.find((h) => h.idx === P.home) || world.harbors[0]; }
function save() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 1, tier: P.tier, up: P.up, res: P.res, hp: P.hp, legends: P.legends, kills: P.kills, home: P.home, won: P.won, tod: P.tod, x: boat.x, z: boat.z, yaw: boat.yaw })); } catch { /* ignore */ } }
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (!s || s.v !== 1) return false; Object.assign(P, { tier: s.tier, up: { ...P.up, ...s.up }, res: s.res, hp: s.hp, legends: s.legends || {}, kills: s.kills || 0, home: s.home || 0, won: !!s.won, tod: s.tod ?? 0.2 }); boat.x = s.x; boat.z = s.z; boat.yaw = s.yaw; for (const L of world.lairs) if (P.legends[L.key]) L.beaten = true; return true; } catch { return false; } }

// ---------- minimap and chart ----------
const mapEl = $('map'), mapCtx = mapEl.getContext('2d'), chartEl = $('chartCv'), chartCtx = chartEl.getContext('2d');
function drawMap(cv, g, full) { const dpr = Math.min(2, devicePixelRatio || 1), S = Math.round(cv.clientWidth * dpr) || 1; if (cv.width !== S) cv.width = cv.height = S; const k = S / WORLD, P2 = (x, z) => [(x + HALF) * k, (z + HALF) * k];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.save(); if (!full) { g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 6.2832); g.clip(); }
  g.drawImage(world.mapCanvas, 0, 0, S, S); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = '#ffffff22'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4, S); g.moveTo(0, i * S / 4); g.lineTo(S, i * S / 4); g.stroke(); }
  const fs = (full ? 18 : 10) * dpr; g.font = fs + 'px serif';
  for (const h of world.harbors) { const [x, y] = P2(h.dock.x, h.dock.z); g.fillText('⚓', x, y); if (full) { g.font = 'bold ' + 11 * dpr + 'px Georgia'; g.fillStyle = '#f2e6c8'; g.fillText(h.name, x, y + 14 * dpr); g.font = fs + 'px serif'; } }
  for (const L of world.lairs) { const [x, y] = P2(L.x, L.z); g.globalAlpha = L.beaten ? 0.4 : 1; g.fillText(L.beaten ? '✔' : L.icon, x, y); g.globalAlpha = 1; }
  for (const w of world.wrecks) { if (w.looted) continue; const [x, y] = P2(w.x, w.z); g.fillStyle = '#c8a070'; g.fillRect(x - 1.5 * dpr, y - 1.5 * dpr, 3 * dpr, 3 * dpr); }
  const fog = wx.type === 'fog' && wx.k > 0.5; for (const s of spots) { const [x, y] = P2(s.x, s.z); g.fillStyle = s.kind === 'treasure' ? '#ffd24a' : s.kind === 'flotsam' ? '#c8a070' : '#bfe6ff'; g.beginPath(); g.arc(x, y, 1.8 * dpr, 0, 6.28); g.fill(); }
  for (const mon of mons) { if (mon.dead) continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (fog && d > 45 && !mon.boss) continue; const [x, y] = P2(mon.x, mon.z); g.fillStyle = mon.naval ? '#ff9a3a' : danger(mon.lv); g.beginPath(); g.arc(x, y, (mon.boss ? 4 : 2.2) * dpr, 0, 6.28); g.fill(); }
  for (const s of spouts) { const [x, y] = P2(s.x, s.z); g.fillText('🌪', x, y); }
  if (boat.wp) { const [x, y] = P2(boat.wp.x, boat.wp.z); g.strokeStyle = '#ffd24a'; g.lineWidth = 2 * dpr; const q = 4 * dpr; g.beginPath(); g.moveTo(x - q, y - q); g.lineTo(x + q, y + q); g.moveTo(x + q, y - q); g.lineTo(x - q, y + q); g.stroke(); const [bx, by] = P2(boat.x, boat.z); g.setLineDash([3 * dpr, 4 * dpr]); g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
  const [bx, by] = P2(boat.x, boat.z); g.save(); g.translate(bx, by); g.rotate(-boat.yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1; const s2 = (full ? 7 : 5) * dpr; g.beginPath(); g.moveTo(0, -s2 * 1.4); g.lineTo(s2, s2); g.lineTo(-s2, s2); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.restore(); }
function mapTap(cv, e) { const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * WORLD - HALF, z = ((e.clientY - r.top) / r.height) * WORLD - HALF; setCourse(x, z); say('Course set. Let go of the steering circle to sail there.'); }
mapEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (state === 'play' && !battle && !fishing) mapTap(mapEl, e); });
$('chartBtn').onclick = () => { if (state !== 'play' || battle || fishing) return; state = 'chart'; $('chart').classList.remove('hidden'); drawMap(chartEl, chartCtx, true); };
chartEl.addEventListener('pointerdown', (e) => { e.preventDefault(); mapTap(chartEl, e); drawMap(chartEl, chartCtx, true); setTimeout(() => { $('chart').classList.add('hidden'); state = 'play'; }, 350); });
$('chartClose').onclick = () => { $('chart').classList.add('hidden'); state = 'play'; };

// ---------- tags and pops ----------
function updateTags(dt) { for (const mon of mons) { const t = mon.tag; if (mon.dead || state === 'title') { t.style.display = 'none'; continue; } const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); const sp = d < 90 && mon.rise > 0.5 ? toScreen(mon.x, mon.g.position.y + mon.top + 1.2, mon.z) : null; if (!sp || (wx.type === 'fog' && wx.k > 0.5 && d > 40)) { t.style.display = 'none'; continue; }
    t.style.display = 'block'; t.style.left = sp[0] + 'px'; t.style.top = sp[1] + 'px'; const html = '<span style="color:' + (mon.naval ? '#ffb03a' : danger(mon.lv)) + '">' + mon.name + ' · ' + (mon.lv - P.tier > 1.6 ? '💀 Lv ' + (Math.round(mon.lv) + 1) : 'Lv ' + (Math.round(mon.lv) + 1)) + '</span>' + (mon.hp < mon.maxHp ? '<i><b style="width:' + clamp(mon.hp / mon.maxHp, 0, 1) * 100 + '%"></b></i>' : ''); if (t._h !== html) { t.innerHTML = html; t._h = html; } }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; const sp = toScreen(p.x, p.y + p.t * 2.5, p.z); if (!sp || p.t > p.life) { p.el.remove(); pops.splice(i, 1); continue; } p.el.style.left = sp[0] + 'px'; p.el.style.top = sp[1] + 'px'; p.el.style.opacity = Math.min(1, (p.life - p.t) * 2); } }

// ---------- ship movement ----------
function updateBoat(dt) {
  const t = T(); let thr = 0, want = boat.yaw; const sx = stick.x + (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), sy = stick.y + (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const mag = Math.min(1, Math.hypot(sx, sy));
  if (state === 'play' && !battle && !fishing && mag > 0.15) { const lx = Math.sin(camYaw), lz = Math.cos(camYaw), rx = -Math.cos(camYaw), rz = Math.sin(camYaw); const dx = rx * sx + lx * -sy, dz = rz * sx + lz * -sy; want = Math.atan2(dx, dz); thr = mag; boat.wp = null; courseMark.visible = false; }
  else if (boat.wp && state === 'play' && !battle && !fishing) { const dx = boat.wp.x - boat.x, dz = boat.wp.z - boat.z, d = Math.hypot(dx, dz); want = steerAround(Math.atan2(dx, dz), Math.min(d, 26 + t.L)); thr = clamp(d / 18, 0.25, 1); if (Math.abs(angDiff(want, boat.yaw)) > 1.2) thr *= 0.5; if (d < 4 + t.L * 0.3) { boat.wp = null; courseMark.visible = false; } else { courseMark.position.set(boat.wp.x, ocean.heightAt(boat.wp.x, boat.wp.z) + 0.2, boat.wp.z); courseMark.rotation.z += dt; } }
  const tr = turnRate() * (0.45 + 0.55 * Math.min(1, boat.v / (t.speed * 0.6))); boat.yaw += clamp(angDiff(want, boat.yaw), -tr * dt, tr * dt) + boat.spin * dt; boat.spin *= 1 - dt * 1.2;
  const top = topSpeed() * (1 - (LOOK[wx.type] === 'storm' ? 0.15 * wx.k : 0)); const acc = 3.2 * (1 + 0.15 * P.up.oars); boat.v += clamp(thr * top - boat.v, -acc * 1.2 * dt, acc * dt); boat.boost = Math.max(0, boat.boost - dt); boat.thor = Math.max(0, boat.thor - dt); boat.grace = Math.max(0, boat.grace - dt);
  let nx = boat.x + Math.sin(boat.yaw) * boat.v * dt, nz = boat.z + Math.cos(boat.yaw) * boat.v * dt;
  const bl = world.blockAt(nx, nz, t.B * 0.5 + t.L * 0.18) || world.blockAt(nx + Math.sin(boat.yaw) * t.L * 0.4, nz + Math.cos(boat.yaw) * t.L * 0.4, t.B * 0.3);
  if (bl) { nx = boat.x + bl.nx * dt * 4; nz = boat.z + bl.nz * dt * 4; if (boat.v > 5 && boat.hitCd <= 0) { boat.hitCd = 1.5; damage((boat.v - 4.5) * 1.6 * Math.pow(1.4, P.tier) * (1 - defense()) * (bl.kind === 'berg' ? 1.6 : 1), bl.kind === 'berg' ? 'You hit an iceberg!' : 'Ran aground!'); foam.splash(nx, nz, 1.2); sfx.creak(); } boat.v *= 0.35; boat.wp = null; }
  boat.hitCd = Math.max(0, boat.hitCd - dt);
  if (Math.abs(nx) > HALF - 15 || Math.abs(nz) > HALF - 15) { nx = clamp(nx, -HALF + 15, HALF - 15); nz = clamp(nz, -HALF + 15, HALF - 15); if (msgT <= 0) say('The edge of the world. Only mist and falling water beyond.'); }
  boat.x = nx; boat.z = nz;
  // ride the sea
  const tl = ocean.tiltAt(boat.x, boat.z, boat.yaw, t.L, t.B); boat.y += (tl.y - boat.y) * Math.min(1, dt * 6); boat.pitch += (tl.pitch * 0.85 - boat.pitch) * Math.min(1, dt * 5); boat.roll += (-tl.roll * 0.85 - boat.roll) * Math.min(1, dt * 5);
  boat.shake = Math.max(0, boat.shake - dt); const sh = boat.shake * 0.6;
  ship.g.position.set(boat.x + rnd(-sh, sh), boat.y, boat.z + rnd(-sh, sh)); ship.g.rotation.y = boat.yaw; ship.body.rotation.x = -boat.pitch; ship.body.rotation.z = boat.roll + Math.sin(time * 9) * sh * 0.1 - clamp(angDiff(want, boat.yaw), -1, 1) * Math.min(1, boat.v / 8) * 0.06;
  ship.anim(dt, { speed: boat.v, time, night: isNight() });
  if (boat.thor > 0) { ship.sailMat.emissive.setHex(0x1a6aff); ship.sailMat.emissiveIntensity = 0.4 + Math.abs(Math.sin(time * 9)) * 0.5; if (Math.random() < dt * 10) foam.add(boat.x + rnd(-t.B, t.B), boat.z + rnd(-t.L / 2, t.L / 2), { spray: true, y: boat.y + rnd(1, t.mast), vx: rnd(-2, 2), vz: rnd(-2, 2), vy: rnd(1, 3), s: 0.4, life: 0.4, a: 1 }); } else if (ship.sailMat.emissiveIntensity !== 0) { ship.sailMat.emissive.setHex(0); ship.sailMat.emissiveIntensity = 0; }
  // wake and bow spray
  boat.wakeT = (boat.wakeT || 0) - dt; if (boat.v > 1.5 && boat.wakeT <= 0) { boat.wakeT = 0.09; const fx = Math.sin(boat.yaw), fz = Math.cos(boat.yaw), k = boat.v / t.speed; for (const s of [-1, 1]) foam.add(boat.x + fx * t.L * 0.42 + fz * s * t.B * 0.4, boat.z + fz * t.L * 0.42 - fx * s * t.B * 0.4, { vx: fz * s * 1.6 * k - fx * 0.5, vz: -fx * s * 1.6 * k - fz * 0.5, s: 0.5 + t.B * 0.25, grow: 1 + k, life: 3, a: 0.55 * k });
    foam.add(boat.x - fx * t.L * 0.45, boat.z - fz * t.L * 0.45, { s: t.B * 0.6, grow: 0.8, life: 3.5, a: 0.45 * k }); if (k > 0.6 && Math.random() < 0.5) foam.add(boat.x + fx * t.L * 0.5, boat.z + fz * t.L * 0.5, { spray: true, y: boat.y + 0.4, vx: fx * boat.v * 0.4 + rnd(-1, 1), vz: fz * boat.v * 0.4 + rnd(-1, 1), vy: rnd(2, 4), s: 0.6, life: 0.8, a: 0.7 }); }
}
// autopilot: if the course runs into land, swing to the nearest clear heading
function steerAround(want, look) { const t = T(), pad = t.B * 0.6 + 2; const clear = (a) => { for (const k of [0.35, 0.65, 1]) { const r = look * k + t.L * 0.5; if (world.blockAt(boat.x + Math.sin(a) * r, boat.z + Math.cos(a) * r, pad)) return false; } return true; };
  if (clear(want)) return want; for (const k of [0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2]) { const a = want + (boat.side || 1) * k; if (clear(a)) { boat.side = Math.sign(k) * (boat.side || 1); return a; } } return want + Math.PI / 2; }
// the sea hugs the hulls of your ship and nearby raiders
function updateHulls() { const list = []; const push = (s, x, z, yaw) => { s.g.updateMatrixWorld(true); const e = s.body.matrixWorld.elements; list.push({ x, z, yaw, hl: s.len * 0.5, hb: s.beam * 0.5, y0: s.g.position.y, ps: e[9] / Math.hypot(e[8], e[10]), rs: e[1] / Math.hypot(e[0], e[2]), foam: clamp(boat.v / 8, 0.15, 0.8) }); };
  if (ship) push(ship, boat.x, boat.z, boat.yaw); for (const mon of mons) if (mon.naval && !mon.dead && list.length < 6 && Math.hypot(mon.x - boat.x, mon.z - boat.z) < 150) push(mon.m.ship, mon.x, mon.z, mon.yaw); ocean.setHulls(list); }

// ---------- camera ----------
$('viewBtn').onclick = () => { viewMode = viewMode === 'top' ? 'chase' : 'top'; $('viewBtn').textContent = viewMode === 'top' ? 'TOP' : 'CHASE'; };
function updateCamera(dt) { const t = T(); let tgt, dist, pitch;
  if (state === 'title') { const a = time * 0.06; tgt = V(boat.x, 2, boat.z); dist = t.L * 2.2 + 14; pitch = 0.28; camYaw = a; }
  else if (battle) { const mon = battle.mon; tgt = V((boat.x + mon.x) / 2, 1.5, (boat.z + mon.z) / 2); const hfov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect, needW = Math.hypot(mon.x - boat.x, mon.z - boat.z) + t.L * 0.7 + mon.size + 6; dist = Math.max(needW / (2 * hfov * 0.9), mon.top * 2.2 + 10); pitch = 0.4; const want = Math.atan2(mon.x - boat.x, mon.z - boat.z) + Math.PI / 2; camYaw += angDiff(want - Math.PI, camYaw) * Math.min(1, dt * 1.5); }
  else { tgt = V(boat.x + Math.sin(boat.yaw) * boat.v * 0.6, 0, boat.z + Math.cos(boat.yaw) * boat.v * 0.6); const W = (34 + t.L * 1.6) * (viewMode === 'top' ? 1 : 0.7); dist = (W / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1))) * 0.62 * zoom; pitch = viewMode === 'top' ? 0.98 : 0.42; const wantYaw = viewMode === 'top' ? Math.PI : boat.yaw; camYaw += angDiff(wantYaw, camYaw) * Math.min(1, dt * (viewMode === 'top' ? 3 : 1.5)); }
  const off = !!(battle || fishing); if (off !== viewOff) { viewOff = off; applyView(); }
  if (fishing && !battle) { const s = fishing.s; tgt = V((boat.x + s.x) / 2, 0, (boat.z + s.z) / 2); dist = 26 + t.L * 1.4; pitch = 0.75; }
  camTgt.lerp(tgt, Math.min(1, dt * 4)); const lx = Math.sin(camYaw), lz = Math.cos(camYaw); const want = V(camTgt.x - lx * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 2, camTgt.z - lz * Math.cos(pitch) * dist); camPos.lerp(want, Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(camTgt); }

// ---------- HUD buttons ----------
$('fireBtn').onclick = (e) => { e.stopPropagation(); unlockAudio(); fire(); }; $('actBtn').onclick = (e) => { e.stopPropagation(); doAction(); };
$('pauseBtn').onclick = () => { if (state !== 'play' || battle || fishing) return; state = 'paused'; $('pauseText').textContent = T().name + ' · ' + P.kills + ' foes slain · legends ' + Object.keys(P.legends).length + ' / 3'; $('paused').classList.remove('hidden'); };
$('resumeBtn').onclick = () => { $('paused').classList.add('hidden'); state = 'play'; };
$('saveQuit').onclick = () => { save(); $('paused').classList.add('hidden'); toTitle(); };
$('howBtn').onclick = () => { $('title').classList.add('hidden'); $('how').classList.remove('hidden'); }; $('howBack').onclick = () => { $('how').classList.add('hidden'); $('title').classList.remove('hidden'); };
function begin(cont) { unlockAudio(); startMusic(); if (!cont) { localStorage.removeItem(SAVE); Object.assign(P, { tier: 0, up: { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 0, oars: 0, nets: 0 }, res: { w: 20, i: 5, g: 40, f: 0 }, legends: {}, kills: 0, home: 0, won: false, tod: 0.16 }); P.hp = maxHp(); const h = world.harbors[0]; boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); for (const L of world.lairs) L.beaten = false; }
  boat.v = 0; boat.wp = null; for (const m of [...mons]) removeMon(m); rebuildShip(); $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; fsCtl.play(); hud();
  say(cont ? 'Back at sea. Skål!' : 'Sail out from Patsholm. Fish the bubbling water, grab floating crates, and beware the deep.', 4.5); camYaw = Math.PI; }
$('playBtn').onclick = () => begin(false); $('contBtn').onclick = () => begin(true);
function toTitle() { state = 'title'; $('hud').classList.add('hidden'); $('title').classList.remove('hidden'); $('contBtn').classList.toggle('hidden', !localStorage.getItem(SAVE)); }
const fsCtl = initFullscreen(() => state === 'play');
soundToggle($('title').querySelector('.menu')); $('ver').textContent = 'v' + VERSION;

// ---------- main loop ----------
let last = performance.now(), ctxKey = '', fireKey = '';
let timeScale = 1;
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000) * timeScale; last = now; time += dt;
  if (state === 'play' || state === 'title' || state === 'harbor' || state === 'chart') {
    if (state === 'play') { P.tod = (P.tod + dt / 420) % 1; updateWeather(dt); updateSpawns(dt); updateLairs(); boat.fireCd = Math.max(0, boat.fireCd - dt); saveT += dt; if (saveT > 30) { saveT = 0; save(); } }
    if (state !== 'harbor') updateBoat(dt); updateMons(dt); if (battle) updateBattle(dt); updateSea(dt); updateProjs(dt); minis.update(dt);
    if (fishing) { const s = fishing.s, a = V(boat.x, boat.y + T().mast * 0.5, boat.z), b = V(s.x, ocean.heightAt(s.x, s.z), s.z); line.geometry.setFromPoints([a, b]); }
  }
  for (const s of world.harbors) { const f = s.g.userData.fire; if (f) f.scale.set(0.9 + Math.sin(time * 9) * 0.15, 1.4 + Math.sin(time * 13) * 0.3, 0.9); const b = s.g.userData.banner; if (b) b.rotation.y = Math.sin(time * 2) * 0.3; }
  const wxLook = { type: LOOK[wx.type], k: wx.k }; env.apply(P.tod, wxLook, dt, flash * flash, 0); setSea(state === 'play' ? 1 : 0.6, LOOK[wx.type] === 'storm' ? wx.k : 0);
  updateCamera(dt); updateHulls(); ocean.update(dt, camTgt, camera); foam.update(dt); foam.mat.uniforms.uLight.value = 0.35 + env.cur.ambient;
  if (state === 'play') { updateTags(dt); if ((now | 0) % 2 === 0) drawMap(mapEl, mapCtx, false);
    ctx = actionContext(); const key = ctx ? ctx.kind + ctx.label : ''; if (key !== ctxKey) { ctxKey = key; const b = $('actBtn'); if (ctx) { b.classList.remove('hidden'); b.innerHTML = '<em>' + ctx.icon + '</em><small>' + ctx.label + '</small>'; b.style.borderColor = ctx.kind === 'fight' ? '#ff5a3a' : ctx.kind === 'slow' ? '#c8c8c8' : '#7dff3a'; } else b.classList.add('hidden'); }
    const wk = P.up.ballista ? 'b' : 's'; if (wk !== fireKey) { fireKey = wk; $('fireBtn').innerHTML = '<em>' + (P.up.ballista ? '🏹' : '🗡') + '</em><small>' + (P.up.ballista ? 'BALLISTA' : 'SPEARS') + '</small><i class="cd" id="fireCd"></i>'; } $('fireCd').style.height = (boat.fireCd > 0 ? clamp(boat.fireCd / (P.up.ballista ? 2 : 1.2), 0, 1) * 100 : 0) + '%';
    $('region').textContent = rname(world.regionAt(boat.x, boat.z)) + (isNight() ? ' · 🌙' : ''); $('wxTxt').textContent = wx.k > 0.3 ? WXNAME[wx.type] : ''; $('buff').textContent = boat.thor > 0 ? '⚡ Thor ' + Math.ceil(boat.thor) + 's' : ''; $('hurt').classList.toggle('thor', boat.thor > 0); }
  else for (const mon of mons) mon.tag.style.display = 'none';
  msgT -= dt; if (msgT <= 0) $('msg').style.opacity = 0; warnT -= dt; if (warnT <= 0) $('warn').innerHTML = '';
  renderer.render(scene, camera); requestAnimationFrame(frame); }
// start on the title: the ship rides at anchor off Patsholm
{ const h = world.harbors[0]; boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); }
const hadSave = load(); if (!hadSave) P.hp = maxHp(); rebuildShip(); toTitle(); env.snap(P.tod, null); camTgt.set(boat.x, 0, boat.z);
requestAnimationFrame(frame);
window.__pr = { set timeScale(v) { timeScale = v; }, dmgLog, P, boat, mons, spots, floats, world, ocean, wx, setWeather, spawnMon, startBattle, startFishing, openHarbor, fire, get state() { return state; }, set state(v) { state = v; }, get battle() { return battle; }, minis, MLV, killMon, landBolt, warnRing, spawnSpout, rebuildShip, save, load, camera, renderer, scene, get ship() { return ship; }, setCourse };

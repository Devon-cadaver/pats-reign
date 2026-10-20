// Asset showcase: the ocean under every weather and time of day, the five ship sizes, raiders, and the monsters.
import * as THREE from 'three';
import { createOcean, createFoam } from './ocean.js';
import { createEnv } from './env.js';
import { buildShip, SHIP_TIERS, RAIDER_PALS, GHOST_PAL, TREASURE_PAL, addCargo } from './ship.js';
import { createTwisters } from './tornado.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xb4d2e2, 120, 330);
const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 6000);
const hemi = new THREE.HemisphereLight(0xdcefff, 0x2a4a5a, 1.4); scene.add(hemi); const sun = new THREE.DirectionalLight(0xfff0d0, 1.2); scene.add(sun); scene.add(sun.target);
const ocean = createOcean(scene, {}); const foam = createFoam(scene, ocean); const env = createEnv(scene, ocean, hemi, sun);
const S = { tod: 0.3, wx: { type: null, k: 0 }, show: { kind: 'ship', tier: 0, pal: null }, yaw: 0.9, pitch: 0.42, dist: 16, spin: true };
const TOD = { Day: 0.3, Sunset: 0.63, Night: 0.8, Dawn: 0.03 };
let subject = null, extra = [];
function clearSubject() { if (subject) scene.remove(subject.g); for (const e of extra) scene.remove(e.g); subject = null; extra = []; }
function showShip(tier, pal = null, up = null) {
  clearSubject(); const lv = Math.min(3, tier); const u = up || { shields: tier === 0 ? 0 : Math.min(3, tier), armor: tier >= 3 ? tier - 2 : 0, ballista: tier >= 2 ? Math.min(3, tier - 1) : 0, fire: tier >= 3 ? tier - 2 : 0, ram: tier >= 4 ? 2 : 0, sail: lv + (tier >= 4 ? 1 : 0) };
  subject = buildShip(tier, u, pal || undefined, 3); scene.add(subject.g); S.dist = SHIP_TIERS[tier].L * 1.55 + 6; setLabel(pal ? pal.name : SHIP_TIERS[tier].name, pal ? (pal.ghost ? 'Haunts the night sea' : 'Raider longship') : 'Ship size ' + (tier + 1) + ' of 5');
}
const label = document.getElementById('label'); function setLabel(a, b) { label.innerHTML = a + '<small>' + b + '</small>'; }
// buttons
const bar = document.getElementById('bar'); const groups = {};
function btn(group, text, fn) { const b = document.createElement('button'); b.textContent = text; b.onclick = () => { for (const o of groups[group] || []) o.classList.remove('on'); b.classList.add('on'); fn(); }; (groups[group] = groups[group] || []).push(b); bar.appendChild(b); return b; }
SHIP_TIERS.forEach((t, i) => btn('subj', '⛵' + (i + 1), () => showShip(i)));
RAIDER_PALS.forEach((p, i) => btn('subj', '☠' + (i + 1), () => showShip(Math.min(4, 1 + i), p, { shields: 2, armor: i > 1 ? 1 : 0, ballista: 1, fire: 0, ram: 0 })));
btn('subj', '👻', () => showShip(3, GHOST_PAL, { shields: 2, armor: 0, ballista: 0, fire: 0, ram: 0 }));
btn('subj', '💰', () => { showShip(2, TREASURE_PAL, { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 2 }); addCargo(subject); setLabel(TREASURE_PAL.name, 'Runs from you, dumping cargo'); });
export const extraButtons = (fn) => fn(btn, { scene, ocean, foam, setLabel, clearSubject, setSubject: (s, d, a, b) => { clearSubject(); subject = s; scene.add(s.g); S.dist = d; setLabel(a, b); } });
const sep = () => { const d = document.createElement('div'); d.style.width = '100%'; d.style.height = '0'; bar.appendChild(d); };
sep(); for (const [k, v] of Object.entries(TOD)) btn('tod', k, () => { S.tod = v; });
btn('wx', 'Calm', () => { S.wx = { type: 'calm', k: 1 }; }); btn('wx', 'Normal', () => { S.wx = { type: null, k: 0 }; }); btn('wx', 'Rain', () => { S.wx = { type: 'rain', k: 1 }; }); btn('wx', 'Storm', () => { S.wx = { type: 'storm', k: 1 }; }); btn('wx', 'Fog', () => { S.wx = { type: 'fog', k: 1 }; });
const twisters = createTwisters(scene, { onBolt: () => { flash = Math.max(flash, 0.5); } }); const spouts = [];
function spout(skin) { const g = twisters.make(true, [], skin); g.scale.setScalar(skin === 'seastorm' ? 2.6 : 2.0); g.position.set(focus.x + 14, 0, focus.z - 10); scene.add(g); spouts.push({ g, t: 0 }); if (spouts.length > 2) { twisters.remove(spouts[0].g); spouts.shift(); } }
function rogueWave() { const R = ocean.rogue, a = S.yaw + Math.PI; R.dx = Math.sin(a + 0.5); R.dz = Math.cos(a + 0.5); R.x = focus.x - R.dx * 110; R.z = focus.z - R.dz * 110; R.H = 7.5; R.w = 9; R.Lc = 70; R.k = 0.01; rogueT = 0; }
let rogueT = -1;
sep(); btn('fx', '🌊 Rogue wave', rogueWave); btn('fx', '💧 Waterspout', () => spout('waterspout')); btn('fx', '🌪 Sea tornado', () => spout('seastorm')); btn('fx', '🦈 Sharknado', () => spout('shark'));
sep(); btn('cam', '🎥 low', () => { S.pitch = 0.16; }); btn('cam', '🎥 high', () => { S.pitch = 0.42; }); btn('cam', '🎥 top', () => { S.pitch = 1.1; });
groups.subj[0].classList.add('on'); groups.tod[0].classList.add('on'); groups.wx[1].classList.add('on'); groups.cam[1].classList.add('on');
// orbit: drag to turn, pinch / wheel to zoom
const pts = new Map(); let pinch = 0;
canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); S.spin = false; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; if (pts.size === 2) { const [a, b] = [...pts.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pts.set(e.pointerId, [e.clientX, e.clientY]); const [c, d] = [...pts.values()]; const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]); if (pinch) S.dist *= d0 / d1; pinch = 1; return; }
  S.yaw -= (e.clientX - p[0]) * 0.008; S.pitch = Math.max(0.05, Math.min(1.35, S.pitch + (e.clientY - p[1]) * 0.005)); pts.set(e.pointerId, [e.clientX, e.clientY]); });
const up = (e) => { pts.delete(e.pointerId); pinch = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', (e) => { S.dist *= Math.exp(e.deltaY * 0.001); }, { passive: true });
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); } addEventListener('resize', resize); resize();
showShip(0); env.snap(S.tod, S.wx);
let last = performance.now(), time = 0, wakeT = 0, flash = 0, boltT = 2;
const center = new THREE.Vector3(), focus = new THREE.Vector3();
function frame(now, manual) { const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
  if (S.spin) S.yaw += dt * 0.12;
  // the subject rides the waves
  if (subject) { const g = subject.g, len = subject.len || 6, beam = subject.beam || 2; const tl = ocean.tiltAt(0, 0, g.rotation.y, len, beam); g.position.y += (tl.y - g.position.y) * Math.min(1, dt * 5); subject.body.rotation.x = -tl.pitch * 0.8; subject.body.rotation.z = -tl.roll * 0.8;
    if (subject.anim) subject.anim(dt, { speed: SHIP_TIERS[Math.min(4, subject.tier ?? 0)].speed * 0.6, time, night: S.tod > 0.66 && S.tod < 0.97 });
    for (const e of extra) e.anim && e.anim(dt, time);
    wakeT -= dt; if (wakeT <= 0 && subject.len) { wakeT = 0.12; const L = subject.len; for (const s of [-1, 1]) foam.add(s * subject.beam * 0.45, L * 0.45, { vx: s * 1.2, vz: -0.6, s: 0.7, grow: 0.9, life: 2.6, a: 0.55 }); } }
  if (rogueT >= 0) { const R = ocean.rogue; rogueT += dt; R.x += R.dx * 15 * dt; R.z += R.dz * 15 * dt; R.k = Math.min(1, rogueT / 2) * Math.min(1, Math.max(0, (16 - rogueT) / 3)); if (rogueT > 16) { R.k = 0; rogueT = -1; } }
  for (const sp of spouts) { sp.t += dt; sp.g.position.x += Math.sin(sp.t * 0.3) * dt * 2; sp.g.position.z += Math.cos(sp.t * 0.2) * dt * 2; } twisters.update(dt);
  // the sea hugs the ship's waterline
  if (subject && subject.len && subject.body.matrixWorld) { subject.g.updateMatrixWorld(true); const e = subject.body.matrixWorld.elements; ocean.setHulls([{ x: subject.g.position.x, z: subject.g.position.z, yaw: subject.g.rotation.y, hl: subject.len * 0.5, hb: subject.beam * 0.5, y0: subject.g.position.y, ps: e[9] / Math.hypot(e[8], e[10]), rs: e[1] / Math.hypot(e[0], e[2]) }]); } else ocean.setHulls([]);
  if (S.wx.type === 'storm') { boltT -= dt; if (boltT <= 0) { boltT = 2 + Math.random() * 3; flash = 1; } } flash = Math.max(0, flash - dt * 3);
  env.apply(S.tod, S.wx, dt, flash * flash);
  ocean.update(dt, center, camera); foam.update(dt);
  const tgt = new THREE.Vector3(0, subject ? (subject.focusY ?? 1.5) : 1.5, 0); if (subject && subject.follow) { focus.lerp(subject.follow(), Math.min(1, dt * 3)); tgt.x = focus.x; tgt.z = focus.z; } camera.position.set(tgt.x + Math.sin(S.yaw) * Math.cos(S.pitch) * S.dist, Math.sin(S.pitch) * S.dist + 1, tgt.z + Math.cos(S.yaw) * Math.cos(S.pitch) * S.dist); center.set(tgt.x, 0, tgt.z); camera.lookAt(tgt);
  renderer.render(scene, camera); if (!manual) requestAnimationFrame(frame); }
requestAnimationFrame(frame);
window.__sc = { step(n = 30, dt = 1 / 30) { for (let i = 0; i < n; i++) { const now = performance.now(); last = now - dt * 1000; frame(now, true); } }, S, showShip, ocean, env, scene, camera, renderer, get subject() { return subject; } };
import('./showcase-monsters.js').then((m) => m.install && m.install(extraButtons)).catch((e) => console.warn('monsters not ready', e));

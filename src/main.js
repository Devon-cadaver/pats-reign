// Pats Reign: a Viking ship on a monster sea. Sail with the ship's wheel and the sail telegraph, a tap on the sea or the map; fish up
// supplies, fight sea monsters and raiders in battle mini-games, upgrade at harbours, ride out storms (catch lightning
// for Thor's Fury), rogue waves, waterspouts and sea tornadoes, maelstroms, ambushes, raider fleets and treasure ships,
// and slay the three legends to reign.
import * as THREE from 'three';
import { createOcean, createFoam } from './ocean.js';
import { createEnv } from './env.js';
import { buildShip, SHIP_TIERS, PLAYER_PAL, RAIDER_PALS, GHOST_PAL, TREASURE_PAL, addCargo } from './ship.js';
import { makeMonster, SPECIES, tentacle } from './monsters.js';
import { buildWorld, WORLD, HALF, REGIONS, LAIRS } from './world.js';
import { createMinis } from './minigames.js';
import { createTwisters } from './tornado.js';
import { createAurora } from './aurora.js';
import { sfx, unlockAudio, soundToggle, setSea } from './audio.js';
import { startSaga, setBattle, setMusicSea } from './music.js';
import { initFullscreen } from './fullscreen.js';
import { VERSION } from './version.js';
import { initSaveCodes } from './savecode.js';
import { M, V, glowVC } from './geom.js';

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
let viewOff = false, helmLift = 0; // helmLift: the view is shifted up by this many px so the ship clears the wheel
// battles lift the action up the screen: the classic one to a quarter of the way down (its controls fill the bottom), the broadside to 40%
function applyView() { if (viewOff) { const f = viewOff === 'broad' ? 1.2 : 1.5; camera.aspect = innerWidth / (innerHeight * f); camera.setViewOffset(innerWidth, innerHeight * f, 0, innerHeight * (f - 1), innerWidth, innerHeight); } else if (helmLift) { camera.aspect = innerWidth / (innerHeight + helmLift); camera.setViewOffset(innerWidth, innerHeight + helmLift, 0, helmLift, innerWidth, innerHeight); } else { camera.aspect = innerWidth / innerHeight; camera.clearViewOffset(); } camera.updateProjectionMatrix(); }
function resize() { renderer.setSize(innerWidth, innerHeight, false); applyView(); } addEventListener('resize', resize); resize();

// ---------- data: upgrades and costs [timber, iron, gold] ----------
const UPG = {
  shields: { name: 'Shield Wall', icon: '🛡', max: 3, desc: ['Wooden shields along the rails', 'Painted war shields', 'Iron-rimmed shields'], eff: 'Blocks harder (−12% damage each)', cost: [[20, 5, 30], [45, 20, 90], [80, 60, 220]] },
  armor: { name: 'Iron Plates', icon: '⛓', max: 3, desc: ['Iron bands at the waterline', 'Riveted iron plates', 'Full iron hull'], eff: '+25% hull and −8% damage each', cost: [[10, 30, 60], [25, 75, 160], [40, 150, 380]] },
  ballista: { name: 'Ballista', icon: '🏹', max: 3, desc: ['A bow ballista', 'Heavy bolts', 'Twin ballistas'], eff: '+30% damage, longer shots, a bigger weak spot', cost: [[30, 15, 50], [60, 45, 150], [110, 100, 340]] },
  fire: { name: 'Fire Pots', icon: '🔥', max: 3, desc: ['Two fire pots', 'Three fire pots', 'Four fire pots'], eff: 'Big burning hits in battle', cost: [[10, 10, 80], [20, 25, 190], [35, 55, 400]] },
  ram: { name: 'Iron Ram', icon: '🐏', max: 2, desc: ['An iron ram at the bow', 'A great beaked ram'], eff: 'Ram monsters at speed for free damage', cost: [[25, 40, 110], [45, 110, 320]] },
  sail: { name: 'Sail', icon: '⛵', max: 3, desc: ['Striped war sail', 'Fine wool sail', 'Royal sail'], eff: '+10% speed each', cost: [[30, 0, 60], [60, 10, 150], [90, 30, 330]] },
  oars: { name: 'Oars & Crew', icon: '🚣', max: 3, desc: ['More rowers, who patch the hull at sea', 'Strong rowers: they patch it twice as fast', 'Berserker rowers: the hull mends quickly'], eff: 'Faster turns and acceleration; the crew mend the hull at sea when no one is hitting you', cost: [[25, 5, 40], [50, 20, 120], [80, 50, 280]] },
  lights: { name: 'Lanterns', icon: '🏮', max: 3, desc: ['A stern lantern', 'Bow and mast lanterns', 'Great iron fire braziers'], eff: 'Light the sea around you at night and see further', cost: [[10, 10, 40], [20, 25, 110], [40, 60, 260]] },
  compass: { name: 'Compass', icon: '🧭', max: 2, desc: ['A lodestone compass shows which way you face', 'A Viking sunstone also points to the nearest harbour, even in fog'], eff: '', cost: [[5, 10, 35], [10, 25, 120]] },
  hooks: { name: 'Grappling Hooks', icon: '🪝', max: 3, desc: ['Iron grappling hooks: board a Faering or a Karvi', 'Barbed hooks and boarding planks: board a Snekkja or a Skeid', 'Rune-carved hooks: board anything, even a Drakkar'], eff: 'Board a ship in battle once her hull is below 40%', cost: [[20, 25, 70], [40, 70, 200], [80, 150, 450]] },
  nets: { name: 'Nets', icon: '🕸', max: 3, desc: ['Rope nets', 'Wide nets', 'Iron-weighted nets'], eff: 'Bigger catch box, bigger catches', cost: [[20, 5, 30], [40, 15, 90], [60, 40, 200]] },
};
const TIER_COST = [null, [60, 20, 90], [150, 70, 250], [320, 160, 560], [650, 330, 1300]];
// monster levels per species variant, speeds, and what their attacks are called in battle
const MLV = { shark: [0, 0.6, 1.2, 2], megalodon: [3.4, 3.8, 4.2, 4.6, 5.0], serpent: [1.3, 2, 2.4, 3, 3.6, 3, 4.1], eel: [0.4, 1, 1.6], octopus: [0.9, 1.6, 2.2, 2.8], crab: [1, 2, 3], angler: [2, 3], jelly: [0, 0.3, 0.5], leviathan: [2, 3, 4.2], kraken: [5, 5, 5], elder: [5.6, 5.6, 5.6], jormungandr: [6.2, 6.2] };
const MSPEED = { shark: 10.5, megalodon: 9.5, serpent: 9.2, eel: 10, octopus: 7, crab: 6, angler: 7.5, jelly: 1.2, leviathan: 8.5, kraken: 6, elder: 5, jormungandr: 9 };
const ATK = { shark: { L: 'lunges from the right', R: 'lunges from the left', U: 'leaps to bite' }, serpent: { L: 'whips its tail from the right', R: 'whips its tail from the left', U: 'rears up to strike' }, eel: { L: 'arcs lightning from the right', R: 'arcs lightning from the left', U: 'coils to shock' },
  octopus: { L: 'swings a tentacle from the right', R: 'swings a tentacle from the left', U: 'slams down its arms' }, kraken: { L: 'sweeps a tentacle from the right', R: 'sweeps a tentacle from the left', U: 'drags at the hull' }, crab: { L: 'snaps a claw from the right', R: 'snaps a claw from the left', U: 'crushes with both claws' },
  angler: { L: 'snaps from the right', R: 'snaps from the left', U: 'lunges with its jaws' }, leviathan: { L: 'snaps three jaws from the right', R: 'snaps three jaws from the left', U: 'strikes with all three heads' }, megalodon: { L: 'rams from the right', R: 'rams from the left', U: 'surges up to swallow you whole' }, jelly: { L: 'stings from the right', R: 'stings from the left', U: 'pulses' },
  elder: { L: 'claws from the right', R: 'claws from the left', U: 'calls the crushing deep' }, jormungandr: { L: 'coils in from the right', R: 'coils in from the left', U: 'strikes with venom' } };
const VBIAS = { frost: { 'serpent:5': 5, 'leviathan:1': 3, 'megalodon:0': 2, 'octopus:3': 2, 'jelly:1': 2 }, storm: { 'megalodon:2': 3, 'serpent:1': 3, 'serpent:6': 2, 'crab:2': 5, 'eel:0': 3, 'eel:2': 3 }, mist: { 'megalodon:3': 3, 'serpent:4': 5, 'octopus:3': 4, 'angler:0': 2, 'eel:1': 2 }, warm: { 'megalodon:1': 3, 'serpent:3': 5, 'crab:0': 3, 'shark:1': 2, 'shark:2': 2, 'jelly:0': 2, 'jelly:2': 2 } };
const REGION_BIAS = { frost: { serpent: 2, leviathan: 2, crab: 0.5 }, storm: { eel: 3, jelly: 2, octopus: 1.5 }, mist: { angler: 3, octopus: 1.5, ghost: 3, raider: 1.5 }, warm: { shark: 2, crab: 3, jelly: 1.5 }, home: { shark: 1.5, jelly: 1.5 } };

// ---------- player ----------
const P = { tier: 0, up: { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 0, oars: 0, nets: 0, lights: 0, compass: 0, hooks: 0 }, res: { w: 20, i: 5, g: 40, f: 0 }, hp: 100, legends: {}, kills: 0, home: 0, won: false, tod: 0.16, wreck: null, prizes: [], maps: [], relics: {}, skin: 'pats' };
const boat = { grace: 0, x: 0, z: -20, yaw: Math.PI, v: 0, want: Math.PI, thr: 0, wp: null, fireCd: 0, thor: 0, boost: 0, spin: 0, shake: 0, hitCd: 0, y: 0, pitch: 0, roll: 0 };
const T = () => SHIP_TIERS[P.tier];
const MEND = [0, 0.0012, 0.0025, 0.004]; // Oars & Crew level -> share of the hull mended per second at sea (about 7%, 15%, 24% a minute)
const maxHp = () => Math.round(100 * Math.pow(1.75, P.tier) * (1 + 0.25 * P.up.armor));
const topSpeed = () => T().speed * (1 + 0.1 * P.up.sail) * (boat.boost > 0 ? 1.35 : 1) * (boat.bifrost > 0 ? 1.25 : 1) * (boat.pod ? 1.1 : 1);
const turnRate = () => T().turn * (1 + 0.14 * P.up.oars);
const defense = () => clamp(0.12 * P.up.shields + 0.08 * P.up.armor + (boat.thor > 0 ? 0.3 : 0) - (boat.curse > 0 ? 0.2 : 0), 0, 0.85);
const attack = () => 12 * Math.pow(1.65, P.tier) * (1 + 0.3 * P.up.ballista);
const fireRange = () => (P.up.ballista ? 24 + 6 * P.up.ballista : 16) + P.tier * 2;
let ship = null;
function rebuildShip() { if (ship) scene.remove(ship.g); ship = buildShip(P.tier, P.up, palOf(P.skin), 7); scene.add(ship.g); ship.g.position.set(boat.x, 0, boat.z); hud(); }

// ---------- state ----------
let state = 'title', time = 0, zoom = 1.6, viewMode = 'chase', camYaw = Math.PI, camPos = new THREE.Vector3(0, 40, 40), camTgt = new THREE.Vector3();
const mons = [], floats = [], spots = [], projs = [], rings = [], bolts = [], pops = [], spouts = [];
const wx = { type: 'clear', k: 0, t: 30, next: 45, fading: false };
let battle = null, fishing = null, rogueT = -1, rogueHit = false, spawnT = 0, floatT = 0, spotT = 0, saveT = 0, boltT = 3, msgT = 0, warnT = 0;

// ---------- input: tap the sea to set a course, pinch to zoom; steering is the ship's wheel and the sail telegraph ----------
let tapStart = null; const touches = new Map(); let pinch0 = 0, zoom0 = 1;
canvas.addEventListener('pointerdown', (e) => { if (state !== 'play' || fishing) return; touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = zoom; tapStart = null; return; } if (battle && !battle.legend) return; tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
canvas.addEventListener('pointermove', (e) => { if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; zoom = clamp(zoom0 * pinch0 / (Math.hypot(a[0] - b[0], a[1] - b[1]) || 1), 0.3, 2.6); } });
const pUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; if (tapStart && tapStart.id === e.pointerId) { if (performance.now() - tapStart.t < 350 && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 18) tapSea(e.clientX, e.clientY); tapStart = null; } }; canvas.addEventListener('pointerup', pUp); canvas.addEventListener('pointercancel', pUp);

// ---------- the helm: a big ship's wheel across the bottom of the screen, its hub just below the edge so the top half
// shows. Swipe along it to turn it; it stays where you leave it, and on a set course it steers itself back toward the
// mark when you let go. Double-tap it to centre it. The sail telegraph (BACK / STOP / ROW / HALF / FULL; a column on the controls side, see ⇄) sets sail and
// oar power with a tap; STOP furls the sails and cancels the course. Taps and sideways swipes only, so nothing on the
// controls is a downward swipe (iPad Safari closes full screen on those). ----------
const HMAX = 2.4; // the wheel turns about 140 degrees each way
const helm = { angle: 0, held: false, id: null, last: 0, tapT: 0 }; const helmEl = $('helm'), helmCtx = helmEl.getContext('2d'); let helmDrawn = null;
const helmBox = { R: 150, cw: 354, ch: 168 }; // R: rim radius in CSS px; the hub sits 0.06 R below the canvas
function layoutHelm() { const W = innerWidth, H = innerHeight, tablet = Math.min(W, H) >= 700;
  // phones: a small wheel (Sean); tablets: a big one
  const R = Math.round(tablet ? clamp(Math.min(W * 0.3, H * 0.28), 100, 240) : clamp(Math.min(W * 0.24, H * 0.15), 64, 105)), cw = Math.round(R * 2.36), ch = Math.round(R * 1.12);
  Object.assign(helmBox, { R, cw, ch }); helmEl.style.width = cw + 'px'; helmEl.style.height = ch + 'px'; helmEl.style.clipPath = 'circle(' + Math.round(R * 1.18) + 'px at 50% ' + Math.round(ch + R * 0.06) + 'px)';
  const wrap = $('helmWrap'); wrap.style.width = cw + 'px'; wrap.style.height = ch + 'px';
  document.documentElement.style.setProperty('--helmH', ch + 'px'); document.documentElement.classList.toggle('tabletHud', tablet); helmDrawn = null; helmLift = Math.round(ch * 0.9); applyView(); }
addEventListener('resize', layoutHelm); layoutHelm();
function helmHub() { const r = helmEl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height + helmBox.R * 0.06]; }
function helmAngleAt(e) { const [cx, cy] = helmHub(); return Math.atan2(e.clientY - cy, e.clientX - cx); }
helmEl.addEventListener('pointerdown', (e) => { const [cx, cy] = helmHub(); if (Math.hypot(e.clientX - cx, e.clientY - cy) > helmBox.R * 1.18) return; e.preventDefault(); e.stopPropagation(); if (state !== 'play') return; unlockAudio(); helm.held = true; helm.id = e.pointerId; helm.last = helmAngleAt(e); try { helmEl.setPointerCapture(e.pointerId); } catch { /* ignore */ } const now = performance.now(); if (now - helm.tapT < 300) helm.angle = 0; helm.tapT = now; });
helmEl.addEventListener('pointermove', (e) => { if (!helm.held || e.pointerId !== helm.id) return; const a = helmAngleAt(e); helm.angle = clamp(helm.angle + angDiff(a, helm.last) * 0.8, -HMAX, HMAX); helm.last = a; });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) helmEl.addEventListener(ev, (e) => { if (e.pointerId === helm.id) { helm.held = false; helm.id = null; } });
function drawHelm() { if (!helmEl.clientWidth) return; const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(helmBox.cw * dpr), Hh = Math.round(helmBox.ch * dpr); if (helmEl.width !== W || helmEl.height !== Hh) { helmEl.width = W; helmEl.height = Hh; helmDrawn = null; } if (helmDrawn !== null && Math.abs(helmDrawn - helm.angle) < 0.002) return; helmDrawn = helm.angle;
  const g = helmCtx, R = helmBox.R * dpr, k = R / 70, cx = W / 2, cy = Hh + R * 0.06, rim = R, hub = R * 0.3; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, Hh);
  g.translate(cx, cy); g.rotate(helm.angle); g.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), king = i === 0;
    // spoke from the hub out through the rim to a turned handle
    g.strokeStyle = '#2a1608'; g.lineWidth = 9 * k; g.beginPath(); g.moveTo(ca * hub, sa * hub); g.lineTo(ca * rim * 1.15, sa * rim * 1.15); g.stroke();
    g.strokeStyle = king ? '#e6b43a' : '#8a5a32'; g.lineWidth = 6 * k; g.beginPath(); g.moveTo(ca * hub, sa * hub); g.lineTo(ca * rim, sa * rim); g.stroke();
    g.strokeStyle = king ? '#f2d27a' : '#a87444'; g.lineWidth = 9 * k; g.beginPath(); g.moveTo(ca * rim * 1.03, sa * rim * 1.03); g.lineTo(ca * rim * 1.14, sa * rim * 1.14); g.stroke();
    g.fillStyle = king ? '#f2d27a' : '#c08a52'; g.beginPath(); g.arc(ca * rim * 1.15, sa * rim * 1.15, 5 * k, 0, 6.2832); g.fill(); }
  // rim: a dark outer band, the wood, a bright inner bead; an inner ring nearer the hub
  g.strokeStyle = '#2a1608'; g.lineWidth = 13 * k; g.beginPath(); g.arc(0, 0, rim, 0, 6.2832); g.stroke(); g.strokeStyle = '#7a4c2a'; g.lineWidth = 9 * k; g.stroke(); g.strokeStyle = '#b8864e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(0, 0, rim - 3 * k, 0, 6.2832); g.stroke();
  g.strokeStyle = '#2a1608'; g.lineWidth = 7 * k; g.beginPath(); g.arc(0, 0, R * 0.62, 0, 6.2832); g.stroke(); g.strokeStyle = '#8a5a32'; g.lineWidth = 4 * k; g.stroke();
  g.fillStyle = '#4a2e18'; g.beginPath(); g.arc(0, 0, hub, 0, 6.2832); g.fill(); g.strokeStyle = '#e6b43a'; g.lineWidth = 2 * k; g.stroke();
  // the mark at the top: where the king spoke sits when the rudder is straight
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#f2d27a'; g.strokeStyle = '#2a1608'; g.lineWidth = 1.5 * dpr; g.beginPath(); g.moveTo(cx - 7 * dpr, 1 * dpr); g.lineTo(cx + 7 * dpr, 1 * dpr); g.lineTo(cx, 10 * dpr); g.closePath(); g.fill(); g.stroke(); }
const thrEl = $('throttle'), THR_LV = [-0.22, 0, 0.3, 0.6, 1]; // BACK (a slow reverse), STOP, ROW, HALF, FULL
function setThrottle(v, quiet) { v = clamp(v, THR_LV[0], 1); if (Math.abs(v) < 0.06) v = 0; if (v > 0.95) v = 1; const was = boat.throttle || 0; boat.throttle = v; if (v <= 0 && was > 0 && boat.wp) { boat.wp = null; courseMark.visible = false; if (!quiet) say('Sails furled. Course cancelled.'); } drawThrottle(); }
function drawThrottle() { const v = boat.throttle || 0, n = v < -0.05 ? 0 : v === 0 ? 1 : v < 0.4 ? 2 : v < 0.75 ? 3 : 4; thrEl.querySelectorAll('button').forEach((b, i) => { if (b.classList.contains('on') !== (i === n)) b.classList.toggle('on', i === n); }); }
// tap a notch, or slide sideways along the row
function thrPick(e) { const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest && el.closest('#throttle button'); if (b) setThrottle(THR_LV[+b.dataset.n]); }
let thrId = null; thrEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (state !== 'play') return; unlockAudio(); thrId = e.pointerId; try { thrEl.setPointerCapture(e.pointerId); } catch { /* ignore */ } thrPick(e); });
thrEl.addEventListener('pointermove', (e) => { if (e.pointerId === thrId) thrPick(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) thrEl.addEventListener(ev, (e) => { if (e.pointerId === thrId) thrId = null; });
canvas.addEventListener('wheel', (e) => { zoom = clamp(zoom * Math.exp(e.deltaY * 0.001), 0.3, 2.6); }, { passive: true });
// W / S (or up / down): a tap moves the sail telegraph one notch (STOP, ROW, HALF, FULL); held, it steps on through them
const thrKeyOk = () => state === 'play' && !fishing && (!battle || !!battle.broad);
function thrKeyStep(dir) { if (!thrKeyOk()) return; const cur = boat.throttle || 0, next = dir > 0 ? THR_LV.find((l) => l > cur + 0.02) : [...THR_LV].reverse().find((l) => l < cur - 0.02); if (next != null) setThrottle(next); }
let thrHold = 0;
const keys = {}; addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); keys[k] = true; if (e.key === ' ' && !/INPUT|TEXTAREA/.test(e.target.tagName || '')) { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); if (state === 'play') fire(true); }
  // C changes the view; E opens and shuts the sea chart
  if (k === 'c' && state === 'play' && !battle && !fishing) $('viewBtn').click(); if (k === 'e') { if (state === 'chart') closeChart(); else $('chartBtn').click(); }
  if (!e.repeat && (k === 'w' || k === 's' || k === 'arrowup' || k === 'arrowdown')) { thrHold = 0; thrKeyStep(k === 'w' || k === 'arrowup' ? 1 : -1); } }); addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
const ray = new THREE.Raycaster(), seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function tapSea(x, y) { if (battle && battle.legend) { legendTap(x, y); return; } ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(seaPlane, p)) return; setCourse(p.x, p.z); }
function setCourse(x, z) { boat.wp = { x: clamp(x, -HALF + 20, HALF - 20), z: clamp(z, -HALF + 20, HALF - 20) }; courseMark.visible = true; sfx.throw(); if ((boat.throttle || 0) < 0.3) setThrottle(0.8, true); }
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
const dmgLog = []; function damage(d, why) { d = Math.round(d); if (d <= 0) return; dmgLog.push([Math.round(time), d, why || '']); P.hp -= d; boat.lastHit = time; hurtFx(); sfx.hurt(); pop(boat.x, boat.y + 3, boat.z, '−' + d, '#ff6a4a'); if (why) say(why); hud(); if (P.hp <= 0 && state === 'play') sink(); }

// ---------- monsters and raiders ----------
const danger = (lv) => { const d = lv - P.tier; return d < -0.6 ? '#7dff3a' : d < 0.6 ? '#ffffff' : d < 1.6 ? '#ffb03a' : d < 3 ? '#ff4a3a' : '#d06aff'; };
function spawnTable(region, night) { const out = [], tier = P.tier, bias = REGION_BIAS[region] || {};
  for (const [type, lvs] of Object.entries(MLV)) { if (type === 'kraken' || type === 'elder' || type === 'jormungandr') continue; lvs.forEach((lv, v) => { if (lv > tier + 1.7 || lv < tier - 1.4) return; let w = (bias[type] || 1) * (lv > tier + 0.8 ? 0.45 : 1); if (type === 'angler') w *= night ? 3 : 0.3; if (type === 'serpent' && tier === 0) w *= 0.6; if (type === 'megalodon') w *= v === 4 ? (night ? 1 : 0.08) : 0.35; w *= (VBIAS[region] || {})[type + ':' + v] || 1; out.push({ type, v, lv, w }); }); }
  for (let st = 0; st <= 4; st++) { const lv = st + 0.4; if (lv > tier + 1.6 || lv < tier - 1.2) continue; out.push({ type: 'raider', v: st, lv, w: 0.6 * (bias.raider || 1) }); }
  if ((night || region === 'mist') && tier >= 2) out.push({ type: 'ghost', v: 3, lv: 3.5, w: 0.8 * (bias.ghost || 1) });
  return out; }
function spawnMon(e, x, z, o = {}) {
  let m, size, top, naval = false;
  if (e.type === 'raider' || e.type === 'ghost') { const pal = e.type === 'ghost' ? GHOST_PAL : o.pal || RAIDER_PALS[(Math.random() * RAIDER_PALS.length) | 0], arm = !o.merchant; const lvl = arm ? Math.min(3, e.v) : 0; const s = buildShip(e.v, { shields: lvl, armor: arm && e.v > 2 ? 1 : 0, ballista: arm && e.v > 1 ? 1 : 0, fire: 0, ram: 0, sail: e.v }, pal, (Math.random() * 999) | 0); if (o.merchant) addCargo(s);
    m = { g: s.g, anim: (dt, st) => s.anim(dt, { speed: st.speed * s.t.speed, time, night: isNight() }), name: pal.name, ship: s, skinKey: e.type === 'ghost' ? 'ghost' : pal === TREASURE_PAL ? 'treasure' : pal.name }; size = s.len * 0.5; top = s.mastTop + 1; naval = true; }
  else { m = makeMonster(e.type, e.v, o.scale || 1); size = m.size; top = m.top; }
  m.g.position.set(x, 0, z); scene.add(m.g);
  const lv = e.lv, hpMax = Math.round(45 * Math.pow(1.65, lv) * (o.boss ? 0.8 : 1));
  const tag = document.createElement('div'); tag.className = 'tag'; $('tags').appendChild(tag);
  const mon = { e, m, g: m.g, type: e.type, lv, hp: hpMax, maxHp: hpMax, dmg: Math.round(9 * Math.pow(1.5, lv)), speed: (MSPEED[e.type] || (naval ? SHIP_TIERS[e.v].speed * 0.85 : 8)), size, top, naval, boss: !!o.boss, lair: o.lair || null,
    giant: !!m.giant, skinKey: m.skinKey, x, z, yaw: Math.random() * 6.28, state: o.boss ? 'rise' : 'wander', t: 0, wanderT: 0, att: 0, attT: -1, dive: o.boss ? 1 : 0, rise: o.boss ? 0 : 1, stun: 0, tag, name: m.name || SPECIES[e.type]?.variants[e.v]?.name || 'Monster', shotT: rnd(2, 4), dead: 0 };
  mon.passive = e.type === 'jelly';
  mons.push(mon); return mon; }
function removeMon(mon) { scene.remove(mon.g); mon.tag.remove(); const i = mons.indexOf(mon); if (i >= 0) mons.splice(i, 1); }
function updateSpawns(dt) { spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
  for (const mon of [...mons]) { if (mon.boss) continue; if (Math.hypot(mon.x - boat.x, mon.z - boat.z) > 280 && !mon.dead) removeMon(mon); }
  const maxN = 5 + P.tier + (isNight() ? 2 : 0); if (mons.filter((m) => !m.boss).length >= maxN) return;
  const a = Math.random() * 6.28, d = rnd(95, 170), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30 || world.blockAt(x, z, 12) || Math.hypot(x, z + 40) < 70) return;
  const table = spawnTable(world.regionAt(x, z), isNight()); if (!table.length) return; let sum = table.reduce((s, e) => s + e.w, 0), pick = Math.random() * sum; let e = table[0]; for (const t of table) { pick -= t.w; if (pick <= 0) { e = t; break; } }
  if (e.type === 'jelly') { for (let k = 0; k < 3; k++) spawnMon(e, x + rnd(-8, 8), z + rnd(-8, 8)); } else spawnMon(e, x, z); }
function isNight() { return P.tod > 0.68 && P.tod < 0.97; }
function sightRange(mon) { let r = 34 + mon.lv * 6; if (wx.type === 'fog') r *= 0.45; if (isNight()) r *= P.skin === 'ghost' ? 0.5 : 0.8; return r; }
function updateMons(dt) {
  for (const mon of [...mons]) {
    const st = mon.stState || (mon.stState = { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 }); st.t += dt;
    if (mon.dead) { mon.dead += dt; st.dive = Math.min(1, mon.dead / 2); mon.g.position.y -= dt * (mon.naval ? 1.2 : 0.6); if (mon.naval) { mon.g.rotation.z = Math.min(1.2, mon.dead * 0.5); } mon.m.anim(dt, st); if (mon.dead > 3.5) removeMon(mon); continue; }
    if (inFight(mon)) { animMon(mon, dt, st); continue; }
    if (mon.air) { const A = mon.air; flyStep(A, mon, dt); st.speed = 0; st.dive = 0; mon.g.position.set(mon.x, ocean.heightAt(mon.x, mon.z) + A.h, mon.z); mon.g.rotation.y = mon.yaw;
      if (mon.naval) { mon.m.ship.body.rotation.x = -A.pitch; mon.m.ship.body.rotation.z = A.roll; } else { mon.g.rotation.x = A.pitch * 0.6; mon.g.rotation.z = A.roll * 0.6; }
      mon.m.anim(dt, st); if (A.done) { mon.g.rotation.x = mon.g.rotation.z = 0; landMon(mon, A); } continue; }
    const dx = boat.x - mon.x, dz = boat.z - mon.z, d = Math.hypot(dx, dz); mon.t += dt; mon.stun = Math.max(0, mon.stun - dt); if (mon.hunt) mon.hunt = Math.max(0, mon.hunt - dt);
    let want = mon.yaw, spd = 0.35;
    if (mon.state === 'rise') { mon.rise = Math.min(1, mon.rise + dt * (mon.riseK || 0.35)); mon.dive = 1 - mon.rise; if (mon.rise >= 1) { mon.state = 'chase'; } spd = 0; }
    else if (mon.treasure) { mon.flee -= dt; want = Math.atan2(-dx, -dz) + Math.sin(mon.t * 0.6) * 0.45; spd = 1;
      if (d < 75 && state === 'play') { mon.dropT -= dt; if (mon.dropT <= 0) { mon.dropT = rnd(2.5, 4); const r = Math.random(); spawnFloat(mon.x - Math.sin(mon.yaw) * (mon.size + 2), mon.z - Math.cos(mon.yaw) * (mon.size + 2), r < 0.5 ? 'g' : r < 0.8 ? 'i' : 'w', 0); if (!mon.dropSaid) { mon.dropSaid = true; say('They\'re throwing cargo overboard to lighten the ship!'); } } }
      if (mon.flee <= 0 && d > 55) { say('The treasure knarr slips away over the horizon.'); removeMon(mon); continue; } }
    else if (mon.stun > 0 || (mon.passive && mon.state !== 'chase')) { mon.wanderT -= dt; if (mon.wanderT <= 0) { mon.wanderT = rnd(3, 7); mon.wy = mon.yaw + rnd(-1.2, 1.2); } want = mon.wy ?? mon.yaw; spd = mon.stun > 0 ? 0.5 : 0.25; if (mon.stun > 0) want = Math.atan2(-dx, -dz); }
    else if (mon.state === 'chase' || (d < sightRange(mon) && state === 'play')) { if (mon.state !== 'chase') { mon.state = 'chase'; if (mon.lv > P.tier + 0.6) say('<span style="color:' + danger(mon.lv) + '">' + mon.name + '</span> has seen you!'); sfx.groan && sfx.groan(); }
      want = Math.atan2(dx, dz); if (mon.fleetOff && d > 40) { const o = mon.fleetOff * Math.min(1, (d - 40) / 60); want = Math.atan2(dx + (dz / d) * o, dz - (dx / d) * o); } spd = 1; if (d > sightRange(mon) * 1.8 && !mon.boss && !mon.hunt) mon.state = 'wander';
      if (mon.naval && d < 34 && d > 12) { mon.shotT -= dt; if (mon.shotT <= 0) { mon.shotT = rnd(2.5, 4); enemyArrows(mon); } } }
    else { mon.wanderT -= dt; if (mon.wanderT <= 0) { mon.wanderT = rnd(3, 8); mon.wy = mon.yaw + rnd(-1.4, 1.4); } want = mon.wy ?? mon.yaw; spd = 0.3; }
    // steer around islands
    const ax = mon.x + Math.sin(want) * (mon.size + 8), az = mon.z + Math.cos(want) * (mon.size + 8); if (world.blockAt(ax, az, 2)) want += 1.2;
    mon.yaw += clamp(angDiff(want, mon.yaw), -dt * 1.6, dt * 1.6); let sp = mon.speed * spd * (mon.state === 'chase' ? 1 : 0.5); if (mon.state === 'chase' && mon.lv > P.tier + 0.5 && !mon.boss) sp = Math.min(sp, topSpeed() * 0.86); if (mon.treasure) sp = topSpeed() * (d < 25 ? 0.7 : 0.8);
    if (mon.state === 'chase') { mon.chaseT = (mon.chaseT || 0) + dt; if (mon.chaseT > 24 && d > 22 && !mon.boss && !mon.hunt) { mon.state = 'wander'; mon.chaseT = 0; mon.stun = 10; } } else mon.chaseT = 0;
    let nx = mon.x + Math.sin(mon.yaw) * sp * dt, nz = mon.z + Math.cos(mon.yaw) * sp * dt; const bl = world.blockAt(nx, nz, mon.size * 0.4); if (bl) { nx = mon.x + bl.nx * dt * 3; nz = mon.z + bl.nz * dt * 3; mon.yaw += dt * 2; } mon.x = nx; mon.z = nz;
    st.speed = spd; animMon(mon, dt, st);
    // contact
    if (state === 'play' && !battle && !fishing && !boat.air && boat.grace <= 0 && mon.stun <= 0 && mon.rise >= 1 && d < mon.size * 0.7 + T().L * 0.42) contact(mon);
  }
}
// smoke and sparks from a burning ship
function shipSmoke(s, dt) { if (!s.dmg || s.dmg.k < 0.55) return; for (const p of s.fireSpots()) { if (Math.random() < dt * 4) smoke.add(p.x, p.z, { spray: true, y: p.y + 1, vx: rnd(-0.4, 0.4), vz: rnd(-0.4, 0.4), vy: rnd(1.5, 2.6), g: -0.1, s: rnd(1.2, 2), grow: 1.4, life: 3.5, a: 0.45 });
  if (Math.random() < dt * 6) embers.add(p.x + rnd(-0.4, 0.4), p.z + rnd(-0.4, 0.4), { spray: true, y: p.y + 0.6, vx: rnd(-1, 1), vz: rnd(-1, 1), vy: rnd(3, 5), g: 3, s: 0.3, grow: 0, life: 0.8, a: 1 }); } }
function animMon(mon, dt, st) { if (mon.attT >= 0) { mon.attT += dt; st.attack = Math.sin(Math.min(1, mon.attT / 0.9) * Math.PI); if (mon.attT > 0.9) { mon.attT = -1; st.attack = 0; } } else st.attack = Math.max(0, st.attack - dt * 2);
  st.dive = mon.dive; st.rise = mon.rise; st.hurt = Math.max(0, (st.hurt || 0) - dt * 2); mon.g.position.x = mon.x; mon.g.position.z = mon.z; mon.g.rotation.y = mon.yaw;
  if (mon.naval) { const tl = ocean.tiltAt(mon.x, mon.z, mon.yaw, mon.size * 2, mon.size * 0.4); mon.g.position.y = tl.y; mon.m.ship.body.rotation.x = -tl.pitch * 0.8; mon.m.ship.body.rotation.z = -tl.roll * 0.8; } else mon.g.position.y = ocean.heightAt(mon.x, mon.z);
  mon.m.anim(dt, st); if (mon.naval) { mon.m.ship.setDamage(mon.dead ? 1 : 1 - (battle && battle.mon === mon && battle.foe && !battle.broad ? battle.foe.hp : mon.hp) / mon.maxHp); if (Math.hypot(mon.x - boat.x, mon.z - boat.z) < 150) shipSmoke(mon.m.ship, dt); } }
function contact(mon) {
  const fwd = Math.atan2(mon.x - boat.x, mon.z - boat.z), head = Math.abs(angDiff(fwd, boat.yaw)) < 0.6;
  if (P.up.ram && head && boat.v > topSpeed() * 0.55) { const d = Math.round(attack() * (0.6 + 0.5 * P.up.ram) * (boat.thor > 0 ? 2 : 1)); mon.hp -= d; pop(mon.x, mon.top, mon.z, 'RAMMED −' + d, '#ffd24a'); sfx.boom(); foam.splash(mon.x, mon.z, 1.5); if (mon.hp <= 0) { killMon(mon); return; } }
  if (mon.type === 'jelly') { damage(maxHp() * 0.04 * (1 - defense()), 'Stung by a ' + mon.name + '!'); mon.stun = 3; if (boat.v > 3) { mon.hp -= attack() * 0.6; if (mon.hp <= 0) killMon(mon); } return; }
  startBattle(mon, !!mon.treasure); }
function enemyArrows(mon) { for (let k = 0; k < 4; k++) setTimeout(() => { if (state !== 'play') return; launch({ x: mon.x, y: 3, z: mon.z }, { x: boat.x + rnd(-2, 2), y: 1, z: boat.z + rnd(-2, 2) }, 'arrow', () => { if (!battle) damage(mon.dmg * 0.12 * (1 - defense())); }); }, k * 120); sfx.throw(); }
function killMon(mon) { mon.dead = 0.01; mon.tag.remove(); P.kills++; const lv = mon.lv, r = mon.naval ? { w: Math.round(12 * Math.pow(1.6, lv)), i: Math.round(3 + lv * 3), g: Math.round(16 * Math.pow(1.6, lv)) } : { i: Math.round(1 + lv * 2.5), g: Math.round(12 * Math.pow(1.6, lv)) };
  if (mon.type === 'jelly') { r.i = 0; r.g = Math.round(r.g * 0.4); } if (mon.treasure) { r.g *= 3; r.i = Math.round(r.i * 1.5); say('<b>💰 The treasure is yours!</b>', 3.5); } if (mon.ambush) r.g = Math.round(r.g * 1.5);
  if (mon.young) { r.g = Math.round(r.g * 1.5); lairCool[mon.young] = time + rnd(60, 110); setTimeout(() => say('<b>The ' + mon.name + ' is slain!</b> ' + LAIR_NAMES[mon.young] + ' still sleeps below.', 4.5), 600); }
  reward(r, mon.x, mon.top + 1, mon.z); foam.splash(mon.x, mon.z, 2); if (mon.fleet) fleetDown(mon.fleet);
  if (mon.type === 'ghost' && !P.relics.bane && !P.maps.some((m) => m.kind === 'relic')) setTimeout(() => giveMap('relic'), 1500); else if (mon.naval && Math.random() < (mon.treasure ? 0.6 : 0.12)) setTimeout(() => giveMap(), 1600);
  if (mon.boss) { P.legends[mon.lair] = true; world.lairs.find((l) => l.key === mon.lair).beaten = true; say('<b>' + mon.name.toUpperCase() + ' IS SLAIN!</b> Legends beaten: ' + Object.keys(P.legends).length + ' / 3', 5); sfx.horn(); if (Object.keys(P.legends).length >= 3 && !P.won) setTimeout(winGame, 2500); save(); } }

// ---------- projectiles (spears, bolts, enemy arrows) ----------
const spearGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5); spearGeo.rotateX(Math.PI / 2); const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.4, 6); boltGeo.rotateX(Math.PI / 2);
function launch(a, b, kind, onHit) { const g = new THREE.Group(); const m = new THREE.Mesh(kind === 'bolt' ? boltGeo : spearGeo, M(kind === 'arrow' ? 0xff8a2a : 0x8a6a4a, kind === 'arrow' ? 'glow' : 'skin')); g.add(m); if (kind !== 'arrow') { const tip = new THREE.Mesh(new THREE.ConeGeometry(kind === 'bolt' ? 0.18 : 0.1, 0.4, 6), M(0xb8c0c8)); tip.rotation.x = Math.PI / 2; tip.position.z = kind === 'bolt' ? 1.3 : 0.9; g.add(tip); }
  g.position.set(a.x, a.y, a.z); scene.add(g); const dist = Math.hypot(b.x - a.x, b.z - a.z); projs.push({ g, a: V(a.x, a.y, a.z), b: V(b.x, b.y, b.z), t: 0, dur: clamp(dist / 34, 0.25, 1.1), arc: dist * 0.12, onHit, kind }); }
function updateProjs(dt) { for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.t += dt / p.dur; const k = Math.min(1, p.t); const pos = p.a.clone().lerp(p.b, k); pos.y += Math.sin(k * Math.PI) * p.arc; const nxt = p.a.clone().lerp(p.b, Math.min(1, k + 0.02)); nxt.y += Math.sin(Math.min(1, k + 0.02) * Math.PI) * p.arc; p.g.position.copy(pos); p.g.lookAt(nxt);
    if (p.t >= 1) { scene.remove(p.g); projs.splice(i, 1); if (p.onHit) p.onHit(); } } }
// a spear or bolt hitting a monster
function spearHit(tgt, kind) { if (tgt.dead) return; const d = Math.round(attack() * (kind === 'bolt' ? 0.75 : 0.45) * (boat.thor > 0 ? 2 : 1) * rnd(0.85, 1.15)); tgt.hp -= d; tgt.stState && (tgt.stState.hurt = 1); pop(tgt.x, tgt.top + tgt.g.position.y, tgt.z, '−' + d, '#ffd24a'); sfx.hit(); foam.splash(tgt.x, tgt.z, 0.7);
  if (tgt.hp <= 0) killMon(tgt); else if (!tgt.passive) tgt.state = 'chase'; }
// ahead (Space on a keyboard): only aim at a monster in front of the bow, else throw straight ahead (it still hits what it lands on)
function fire(ahead = false) { if (battle && battle.broad) { broadFire(); return; } if (battle && battle.legend) { legendFire(); return; } if (state !== 'play' || battle || fishing || boat.fireCd > 0) return; const range = fireRange(); let best = null, bd = 1e9;
  for (const mon of mons) { if (mon.dead || mon.rise < 1) continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (ahead && Math.abs(angDiff(Math.atan2(mon.x - boat.x, mon.z - boat.z), boat.yaw)) > 0.55) continue; if (d < range && d < bd) { bd = d; best = mon; } }
  const kind = P.up.ballista ? 'bolt' : 'spear'; boat.fireCd = P.up.ballista ? 2.2 - P.up.ballista * 0.25 : 1.2; const from = { x: boat.x + Math.sin(boat.yaw) * T().L * 0.35, y: boat.y + 2, z: boat.z + Math.cos(boat.yaw) * T().L * 0.35 };
  if (!best) { const tx = boat.x + Math.sin(boat.yaw) * range * 0.8, tz = boat.z + Math.cos(boat.yaw) * range * 0.8; launch(from, { x: tx, y: 0, z: tz }, kind, () => { const hit = mons.find((m) => !m.dead && m.rise >= 1 && Math.hypot(m.x - tx, m.z - tz) < m.size * 0.5 + 2); if (hit) spearHit(hit, kind); else { foam.splash(tx, tz, 0.6); sfx.splash(0.6); } }); if (!ahead) say('No target in range'); sfx.throw(); return; }
  const tgt = best; sfx.throw(); launch(from, { x: tgt.x, y: Math.max(1, tgt.top * 0.4) + tgt.g.position.y, z: tgt.z }, kind, () => spearHit(tgt, kind)); }

// ---------- battle ----------
function startBattle(mon, firstStrike, opts = {}) {
  if (autoOn()) { autoFlee(mon); return; } // SAIL TO DOCK: flee every fight
  if (battle) return; if (mon.naval && BROAD.on && !opts.classic && startBroadside(mon)) return; if (!mon.naval && !opts.classic && startLegend(mon)) return; battle = { mon, t: 0 }; boat.wp = null; helm.held = false; setBattle(true);
  // place the foe beside the ship, facing it
  const gap = mon.giant ? mon.size * 0.36 + T().L * 0.3 : T().L * 0.25 + mon.size * 0.75 + 4; let side = boat.yaw + Math.PI / 2; const toFoe = Math.atan2(mon.x - boat.x, mon.z - boat.z);
  for (const c of [toFoe, boat.yaw + Math.PI / 2, boat.yaw - Math.PI / 2, boat.yaw + Math.PI, boat.yaw, toFoe + 2.4, toFoe - 2.4]) { const x = boat.x + Math.sin(c) * gap, z = boat.z + Math.cos(c) * gap; if (!world.blockAt(x, z, mon.size * 0.6 + 2) && !world.blockAt((x + boat.x) / 2, (z + boat.z) / 2, 2)) { side = c; break; } }
  mon.bx = boat.x + Math.sin(side) * gap; mon.bz = boat.z + Math.cos(side) * gap; battle.side = side;
  $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy');
  const foe = { name: mon.name, lvShow: Math.round(mon.lv) + 1, lv: Math.round(mon.lv * 10) / 10, hp: mon.hp, maxHp: mon.maxHp, dmg: mon.dmg, naval: mon.naval, boss: mon.boss, attacks: mon.boss ? 3 : mon.lv >= 3 ? 2 : 1, attackNames: ATK[mon.type] };
  const you = { hp: P.hp, maxHp: maxHp(), def: defense(), atk: attack(), zone: 0.15 + P.up.ballista * 0.04, fire: P.up.fire ? P.up.fire + 1 : 0, thor: boat.thor > 0, shots: 3, weapon: P.up.ballista ? 'BALLISTA' : 'SPEARS' };
  Object.assign(foe, { crew: mon.naval ? (mon.type === 'ghost' ? 25 : SHIP_TIERS[mon.e.v].crew) : 0, ghost: mon.type === 'ghost', boardBlock: boardInfo(mon) }); Object.assign(you, { hooks: P.up.hooks, crew: T().crew + 2 * P.up.oars });
  battle.foe = foe; battle.you = you;
  minis.battle({ foe, you, youName: T().name, firstStrike, board: !!opts.board, intro: mon.boss ? mon.name.toUpperCase() + '!' : mon.treasure ? 'BOARD HER!' : mon.ambush ? 'AMBUSH!' : mon.fleet ? 'FLEET BATTLE!' : undefined }, (res) => {
    P.hp = Math.max(0, you.hp); mon.hp = foe.hp; boat.lastHit = time; setBattle(false); boat.grace = 3.5; $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); const b = battle; battle = null; hud();
    if (res.result === 'win') { killMon(mon); setThrottle(0, true); } // stop after a win so the kill is right beside you
    else if (res.result === 'boarded') { setThrottle(0, true); prizeChoice(mon); }
    if (res.cursed) { boat.curse = 60; setTimeout(() => say('☠ The draugr curse you: your defence is weakened for 60 s.', 4), 400); }
    else if (res.result === 'flee') { mon.stun = 7; boat.boost = 3.5; boat.v = topSpeed(); setThrottle(1, true); say('You row hard and break away!'); }
    if (res.result === 'sunk' || P.hp <= 0) { sink(); return; } void b; });
}
function battleShoot(mult, dmg, txt, fireP) { if (!battle) return; const mon = battle.mon, from = { x: boat.x, y: boat.y + 2.5, z: boat.z }; launch(from, { x: mon.x, y: mon.g.position.y + Math.max(1, mon.top * 0.45), z: mon.z }, P.up.ballista ? 'bolt' : 'spear', () => { if (mult > 0) { foam.splash(mon.x, mon.z, fireP ? 2 : 1); mon.stState && (mon.stState.hurt = 1); pop(mon.x, mon.g.position.y + mon.top, mon.z, (fireP ? '🔥 ' : '') + '−' + dmg, fireP ? '#ff8a2a' : mult >= 2 ? '#ffd24a' : '#fff'); } else { foam.splash(mon.x + rnd(-4, 4), mon.z + rnd(-4, 4), 0.6); } });
  if (fireP) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), M(0xff8a2a, 'glow')); scene.add(f); projs.push({ g: f, a: V(from.x, from.y, from.z), b: V(mon.x, mon.g.position.y + mon.top * 0.4, mon.z), t: 0, dur: 0.6, arc: 4, onHit: () => { for (let k = 0; k < 12; k++) foam.add(mon.x + rnd(-2, 2), mon.z + rnd(-2, 2), { spray: true, y: mon.g.position.y + 1, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(3, 7), s: 0.8, life: 0.8, a: 0.9 }); } }); } }
function battleHurt(d) { boat.shake = 0.5; hurtFx(); P.hp = Math.max(0, P.hp - 0); pop(boat.x, boat.y + 3, boat.z, '−' + d, '#ff6a4a'); foam.splash(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), 1.2); sfx.splash(); $('hullFill').style.width = clamp(battle.you.hp / maxHp(), 0, 1) * 100 + '%'; $('hullTxt').textContent = Math.max(0, Math.ceil(battle.you.hp)) + ' / ' + maxHp(); }
function battleFoeAct(d) { if (!battle) return; const mon = battle.mon; mon.attT = 0; battle.lunge = d; sfx.groan && sfx.groan(); if (mon.naval) { setTimeout(() => { if (!battle) return; for (let k = 0; k < 5; k++) launch({ x: mon.x, y: 3, z: mon.z }, { x: boat.x + rnd(-3, 3), y: 1.5, z: boat.z + rnd(-3, 3) }, 'arrow'); }, 200); } }
function updateBattle(dt) { if (battle.broad) { updateBroadside(dt); return; } if (battle.legend) { updateLegend(dt); return; } const mon = battle.mon; battle.t += dt; mon.x += (mon.bx - mon.x) * Math.min(1, dt * 2); mon.z += (mon.bz - mon.z) * Math.min(1, dt * 2); mon.yaw += angDiff(Math.atan2(boat.x - mon.x, boat.z - mon.z), mon.yaw) * Math.min(1, dt * 3);
  if (mon.attT >= 0 && mon.attT < 0.5) { const k = Math.sin((mon.attT / 0.5) * Math.PI) * 2; mon.x += Math.sin(mon.yaw) * k * dt * 4; mon.z += Math.cos(mon.yaw) * k * dt * 4; } boat.v *= 1 - dt * 2; }

// ---------- ACTION SHIP BATTLE (broadside): a battle line ----------
// You and the enemy lie side by side on two straight lanes, a gap apart. You ease forward and back (the telegraph sets how
// much; STOP holds you still); she sails past you, now and then stopping abeam to trade volleys, then turns back. Other
// ships of her fleet join the line astern of her, so every ship in the fight can shoot and be shot. Your gold arrow points
// across at her lane; fire as a ship comes abeam (the timing strip shows when). One-on-one, you sometimes come about: the
// two ships circle round each other once and swap sides. The camera only slides along the line, it never spins.
// The pause menu switches ship fights between this and the classic battle.
const BROAD = { on: true }; try { BROAD.on = localStorage.getItem('pr_broad') !== '0'; } catch (e) { /* ignore */ }
const arrowGeo = (() => { const s = new THREE.Shape(); s.moveTo(-0.35, 0); s.lineTo(0.35, 0); s.lineTo(0.35, 0.82); s.lineTo(0.9, 0.82); s.lineTo(0, 1); s.lineTo(-0.9, 0.82); s.lineTo(-0.35, 0.82); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g; })(); // points along +z, length 1
function broadArrow(color) { const m = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 6; scene.add(m); return m; }
const inFight = (mon) => !!battle && (battle.mon === mon || (!!battle.broad && battle.broad.foes.includes(mon)));
const tierOf = (mon) => SHIP_TIERS[mon.e.v] || SHIP_TIERS[2];
function startBroadside(mon) {
  const t = T(), foes = [mon, ...mons.filter((m) => m !== mon && m.naval && !m.dead && !m.boss && !m.treasure && !m.air && !mon.treasure && (m.state === 'chase' || (mon.fleet && m.fleet === mon.fleet)) && Math.hypot(m.x - boat.x, m.z - boat.z) < 90).slice(0, 3)];
  const Lmax = Math.max(...foes.map((f) => tierOf(f).L)), Bmax = Math.max(...foes.map((f) => tierOf(f).B)), gap = 9 + (t.B + Bmax) * 1.1, spacing = Lmax + 7, Lh = 20 + ((foes.length - 1) * spacing) / 2 + Lmax * 0.5;
  // the line runs across the line between you and her (so she starts beside you); try other headings and centres for open water
  const toHer = Math.atan2(mon.x - boat.x, mon.z - boat.z), mx = (boat.x + mon.x) / 2, mz = (boat.z + mon.z) / 2; let F = null;
  for (let c = 0; c < 24 && !F; c++) { const th = toHer + Math.PI / 2 + [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.57][c % 8], sh = Math.floor(c / 8) * 18, ax = Math.sin(th), az = Math.cos(th), cx = Math.sin(th - Math.PI / 2), cz = Math.cos(th - Math.PI / 2), ox = mx + cx * sh * (c % 2 ? 1 : -1), oz = mz + cz * sh * (c % 2 ? 1 : -1);
    let ok = true; for (let u = -(Lh + Lmax); ok && u <= Lh + Lmax; u += 5) for (const v of [-(gap / 2 + t.B + 3), 0, gap / 2 + Bmax + 3]) { const x = ox + ax * u + cx * v, z = oz + az * u + cz * v; if (Math.abs(x) > HALF - 25 || Math.abs(z) > HALF - 25 || world.blockAt(x, z, 1)) { ok = false; break; } }
    if (ok) F = { ox, oz, ax, az, cx, cz }; }
  if (!F) return false;
  const B = { ...F, gap, spacing, Lh, foes, yC: -gap / 2, eC: gap / 2, sp: 0, vp: 0, anchor: Lh * 0.7, ve: 0, mode: 'move', target: -Lh * 0.75, holdT: 0, stopNext: Math.random() < 0.5, sweeps: 0, swap: null, k: 0, reload: 0.8, start: [[boat.x, boat.z], ...foes.map((f) => [f.x, f.z])], camYaw: Math.atan2(F.cx, F.cz), my: broadArrow(0xffd24a), shots: [], burn: new Map() };
  for (const f of foes) { f.bx = { reload: 2 + Math.random(), err: 0, last: null, aimT: 0, arrow: broadArrow(0xff4a3a) }; f.state = 'chase'; }
  battle = { mon, t: 0, broad: B }; boat.wp = null; helm.held = false; setBattle(true); if ((boat.throttle || 0) < 0.3) setThrottle(0.6, true);
  $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy', 'broadOn');
  const ui = document.createElement('div'); ui.id = 'broad';
  ui.innerHTML = `<div class="bFoe"><b id="bFoeName"></b><div class="hp foe"><i id="bFoeHp"></i></div></div><div class="bHint" id="bHint">Fire when a red mark is in the green: your volley lands as she comes abeam of your gold arrow.</div><div class="bStrip"><b id="bZone"></b><b id="bPerf"></b><em>▲</em>${foes.map((_, i) => `<i id="bShip${i}"></i>`).join('')}<span id="bAim">⚠ SHE AIMS</span></div>
    <button class="bFire" id="bFire">FIRE<i id="bLoad"></i></button><div class="bSide"><button class="mgBoard hidden" id="bBoard">🪝 BOARD HER</button><button class="ghost" id="bFlee">FLEE</button></div>`;
  $('hud').appendChild(ui); $('bFire').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); broadFire(); }; $('bFlee').onclick = (e) => { e.stopPropagation(); endBroadside('flee'); }; $('bBoard').onclick = (e) => { e.stopPropagation(); endBroadside('board'); };
  warn(mon.treasure ? '⚔ RUN HER DOWN! ⚔' : foes.length > 1 ? '⚔ ' + foes.length + ' SHIPS FORM A BATTLE LINE! ⚔' : '⚔ SHIP BATTLE! ⚔', 2.5); sfx.horn(); return true; }
const lanePos = (B, s, v) => [B.ox + B.ax * s + B.cx * v, B.oz + B.az * s + B.cz * v];
const foeAt = (B, i) => B.anchor + (i - (B.foes.length - 1) / 2) * B.spacing; // the column: lead ship first, in line astern
function nearFoe(B) { let best = 0, bd = 1e9; B.foes.forEach((f, i) => { const d = Math.abs(foeAt(B, i) - B.sp); if (d < bd) { bd = d; best = i; } }); return best; }
const broadReload = () => 2.4 - 0.3 * P.up.ballista;
const broadFlight = () => clamp(battle.broad.gap / 34, 0.25, 1.1); // the same time launch() gives a bolt over that gap
function broadFire() { const B = battle && battle.broad; if (!B || B.reload > 0 || B.k < 1 || B.swap) return; B.reload = broadReload(); unlockAudio(); sfx.throw();
  const t = T(), n = 3 + P.up.ballista, dir = Math.sign(B.eC - B.yC);
  for (let i = 0; i < n; i++) { const s = (i / (n - 1) - 0.5) * t.L * 0.6, [fx, fz] = lanePos(B, B.sp + s, B.yC + dir * t.B * 0.5), [hx, hz] = lanePos(B, B.sp + s, B.eC);
    setTimeout(() => { if (battle && battle.broad === B) launch({ x: fx, y: boat.y + 1.8, z: fz }, { x: hx, y: 1, z: hz }, P.up.ballista ? 'bolt' : 'spear'); }, i * 50); }
  B.shots.push({ me: true, s: B.sp, t: broadFlight() + 0.05 }); }
function broadFoeFire(B, f, i) { const L = tierOf(f).L, dir = Math.sign(B.yC - B.eC), se = foeAt(B, i);
  for (let k = 0; k < 4; k++) { const s = (k / 3 - 0.5) * L * 0.6, [fx, fz] = lanePos(B, se + s, B.eC + dir * tierOf(f).B * 0.5), [hx, hz] = lanePos(B, se + s, B.yC); setTimeout(() => { if (battle && battle.broad === B) launch({ x: fx, y: 2.5, z: fz }, { x: hx, y: 1, z: hz }, 'arrow'); }, k * 60); }
  B.shots.push({ me: false, f, s: se, t: broadFlight() + 0.05 }); sfx.throw(); }
// her column: sail past you to the far end, sometimes stopping abeam to trade volleys; one-on-one, sometimes come about
function broadAI(B, dt) { const lv = B.foes[0].lv, vmax = 5.5 + 0.3 * Math.min(4, lv);
  if (B.mode === 'hold') { B.ve += clamp(-B.ve, -4 * dt, 4 * dt); B.holdT -= dt; if (B.holdT <= 0) B.mode = 'move'; return; }
  const d = B.target - B.anchor, want = Math.sign(d) * Math.min(vmax, Math.abs(d) * 0.8 + 0.6); B.ve += clamp(want - B.ve, -3.5 * dt, 3.5 * dt);
  if (B.stopNext && Math.abs(B.anchor - B.sp) < 1.2 && Math.abs(B.ve) > 0.5) { B.stopNext = false; B.mode = 'hold'; B.holdT = 1.6 + Math.random() * 1.2; warn('⚔ SHE HEAVES TO: TRADE VOLLEYS! ⚔', 1.6); return; }
  if (Math.abs(d) < 1) { B.sweeps++; B.target = -Math.sign(B.target) * B.Lh * 0.75; B.stopNext = Math.random() < 0.45; B.mode = 'hold'; B.holdT = 0.6 + Math.random() * 0.6;
    if (B.foes.length === 1 && B.sweeps % 3 === 0 && Math.random() < 0.6) broadSwap(B); } }
// coming about: both ships circle the point between them by half a turn and end on each other's side of the line
function broadSwap(B) { const f = B.foes[0], [yx, yz] = lanePos(B, B.sp, B.yC), [ex, ez] = lanePos(B, foeAt(B, 0), B.eC), mx = (yx + ex) / 2, mz = (yz + ez) / 2;
  B.swap = { t: 0, dur: 5, mx, mz, y: [yx - mx, yz - mz], e: [ex - mx, ez - mz], yaw0: boat.yaw, eyaw0: f.yaw }; $('bHint').textContent = 'Coming about! Hold your fire.'; }
function updateBroadside(dt) { const B = battle.broad, t = T(); battle.t += dt; B.k = Math.min(1, B.k + dt / 1.4); const e = B.k * B.k * (3 - 2 * B.k);
  for (const f of B.foes) f.stun = Math.max(0, (f.stun || 0) - dt);
  const tf = broadFlight(), hlY = t.L / 2 + 1.5;
  if (B.swap) { const S = B.swap; S.t += dt; const u = Math.min(1, S.t / S.dur), a = Math.PI * u * u * (3 - 2 * u), c = Math.cos(a), s = Math.sin(a), rot = (v) => [v[0] * c + v[1] * s, -v[0] * s + v[1] * c];
    const [yx, yz] = rot(S.y), [ex, ez] = rot(S.e), f = B.foes[0]; boat.x = S.mx + yx; boat.z = S.mz + yz; f.x = S.mx + ex; f.z = S.mz + ez; boat.yaw = S.yaw0 + a; f.yaw = S.eyaw0 + a; boat.v = 4;
    if (u >= 1) { B.ox = 2 * S.mx - B.ox; B.oz = 2 * S.mz - B.oz; B.ax = -B.ax; B.az = -B.az; B.cx = -B.cx; B.cz = -B.cz; B.swap = null; $('bHint').textContent = 'Fire when a red mark is in the green: your volley lands as she comes abeam of your gold arrow.'; } }
  else {
    // you ease forward and back (STOP holds you); she works her column along her lane
    const thr = clamp(boat.throttle || 0, 0, 1), vpWant = thr * 3.2 * Math.cos(battle.t * 0.45); B.vp += clamp(vpWant - B.vp, -3 * dt, 3 * dt); B.sp = clamp(B.sp + B.vp * dt * e, -8, 8);
    if (B.k >= 1) broadAI(B, dt); B.anchor += B.ve * dt * e; B.reload = Math.max(0, B.reload - dt);
    const [px, pz] = lanePos(B, B.sp, B.yC); boat.x = lerp(B.start[0][0], px, e); boat.z = lerp(B.start[0][1], pz, e); boat.yaw += angDiff(Math.atan2(B.ax, B.az), boat.yaw) * Math.min(1, dt * 3); boat.v = Math.abs(B.vp);
    // each ship to its slot in the column (it closes up smoothly when a ship goes down)
    B.foes.forEach((f, i) => { const [fx, fz] = lanePos(B, foeAt(B, i), B.eC), st0 = B.start[i + 1] || [fx, fz]; if (B.k < 1) { f.x = lerp(st0[0], fx, e); f.z = lerp(st0[1], fz, e); } else { f.x += (fx - f.x) * Math.min(1, dt * 3); f.z += (fz - f.z) * Math.min(1, dt * 3); } f.yaw += angDiff(Math.atan2(-B.ax, -B.az), f.yaw) * Math.min(1, dt * 3); });
    // her aim, ship by ship: a random error per pass (smaller for higher levels); she fires when her reckoning of where you
    // will be (at your current speed) when her volley lands crosses it; her arrow flashes as she aims; change speed to spoil it
    B.foes.forEach((f, i) => { const A = f.bx, se = foeAt(B, i); A.reload = Math.max(0, A.reload - dt * (f.stun > 0 ? 0.3 : 1));
      if (B.k < 1 || f.treasure || A.reload > 0 || Math.abs(se - B.sp) > 14) { A.last = null; A.aimT = 0; return; }
      if (A.last == null) A.err = (Math.random() * 2 - 1) * hlY * clamp(2.6 - 0.3 * f.lv, 1, 2.6);
      const diff = se - (B.sp + B.vp * tf) - A.err; A.aimT = Math.abs(diff) < 3 ? A.aimT + dt : 0; if (A.last != null && Math.sign(diff) !== Math.sign(A.last)) { broadFoeFire(B, f, i); A.reload = 3.2; A.last = null; A.aimT = 0; } else A.last = diff; }); }
  // the arrows: yours from your hull across to her lane, each of theirs from her hull across to yours
  const dirE = Math.sign(B.eC - B.yC), yawE = Math.atan2(B.cx * dirE, B.cz * dirE), y0 = ocean.heightAt(boat.x, boat.z) + 0.4, show = !B.swap && B.k >= 1;
  const [ax0, az0] = lanePos(B, B.sp, B.yC + dirE * t.B * 0.6); B.my.position.set(ax0, y0, az0); B.my.rotation.y = yawE; B.my.scale.set(1.4, 1, B.gap + 4 - t.B * 0.6); B.my.visible = show;
  B.my.material.opacity = B.reload <= 0 ? 0.85 : 0.25; B.my.material.color.setHex(B.reload <= 0 ? 0xffd24a : 0x9a8a6a);
  B.foes.forEach((f, i) => { const A = f.bx, eT = tierOf(f), [hx, hz] = lanePos(B, foeAt(B, i), B.eC - dirE * eT.B * 0.6); A.arrow.position.set(hx, y0, hz); A.arrow.rotation.y = yawE + Math.PI; A.arrow.scale.set(1.4, 1, B.gap + 4 - eT.B * 0.6); A.arrow.visible = show;
    A.arrow.material.opacity = f.treasure ? 0.12 : A.aimT > 0 ? 0.55 + 0.4 * Math.sin(battle.t * 30) : 0.3; });
  // volleys landing
  for (let i = B.shots.length - 1; i >= 0; i--) { const s = B.shots[i]; s.t -= dt; if (s.t > 0) continue; B.shots.splice(i, 1);
    if (s.me) { let hit = -1, best = 1e9; B.foes.forEach((f, j) => { const off = Math.abs(foeAt(B, j) - s.s); if (off < tierOf(f).L / 2 + 1.5 && off < best) { best = off; hit = j; } }); const [hx, hz] = lanePos(B, s.s, B.eC);
      if (hit >= 0) { const f = B.foes[hit], perfect = best < (tierOf(f).L / 2 + 1.5) * 0.35, d = Math.round(attack() * 1.15 * (perfect ? 1.6 : 1) * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); f.hp -= d; if (f.stState) f.stState.hurt = 1; sfx.hit(); foam.splash(f.x, f.z, 1.4);
        pop(f.x, f.g.position.y + f.top + 1, f.z, (perfect ? 'PERFECT! ' : '') + '−' + d, perfect ? '#ffd24a' : '#ffffff'); if (P.up.fire) B.burn.set(f, 3 + P.up.fire); }
      else { foam.splash(hx, hz, 0.9); sfx.splash(0.6); pop(hx, 3, hz, 'MISS', '#9ab8c8'); } }
    else if (B.foes.includes(s.f)) { const off = Math.abs(B.sp - s.s), [hx, hz] = lanePos(B, s.s, B.yC);
      if (off < hlY) { boat.shake = 0.5; damage(s.f.dmg * (off < hlY * 0.35 ? 1.25 : 1) * (1 - defense()), s.f.name + ' hits you with a volley!'); if (!battle) return; } else { foam.splash(hx, hz, 0.8); sfx.splash(0.5); } } }
  // burning ships, and ships going down
  for (const [f, tb] of B.burn) { if (tb <= 0 || f.dead) { B.burn.delete(f); continue; } B.burn.set(f, tb - dt); f.hp -= attack() * 0.12 * dt; if (Math.random() < dt * 14) embers.add(f.x + rnd(-1.5, 1.5), f.z + rnd(-1.5, 1.5), { spray: true, y: f.g.position.y + 2, vx: rnd(-1, 1), vz: rnd(-1, 1), vy: rnd(3, 6), g: 3, s: 0.4, grow: 0, life: 0.9, a: 1 }); }
  for (const f of [...B.foes]) if (f.hp <= 0) { const i = B.foes.indexOf(f); B.foes.splice(i, 1); scene.remove(f.bx.arrow); f.bx.arrow.material.dispose(); B.burn.delete(f); killMon(f); const el = $('bShip' + B.foes.length); if (el) el.remove(); if (B.foes.length) battle.mon = B.foes[0]; }
  if (!B.foes.length) { endBroadside('win'); return; }
  // the timing strip: every ship's place along the line from your arrow, the green zone where one must be when you fire
  // (her column's speed times the flight already allowed for), its PERFECT middle, and the warning while one aims
  const SPAN = 24, xOf = (v) => 50 + clamp(v / SPAN, -1, 1) * 50, ni = nearFoe(B), hl = tierOf(B.foes[ni]).L / 2 + 1.5, lead = -B.ve * tf;
  $('bZone').style.left = xOf(lead - hl) + '%'; $('bZone').style.width = xOf(lead + hl) - xOf(lead - hl) + '%'; $('bPerf').style.left = xOf(lead - hl * 0.35) + '%'; $('bPerf').style.width = xOf(lead + hl * 0.35) - xOf(lead - hl * 0.35) + '%';
  B.foes.forEach((f, i) => { const el = $('bShip' + i); if (!el) return; const v = foeAt(B, i) - B.sp; el.style.left = xOf(v) + '%'; el.style.opacity = B.swap ? 0 : Math.abs(v) < SPAN ? 1 : 0.25; });
  $('bAim').style.opacity = B.foes.some((f) => f.bx.aimT > 0) ? 1 : 0; document.querySelector('#broad .bStrip').style.opacity = B.swap ? 0.3 : 1;
  B.hudT = (B.hudT || 0) - dt; if (B.hudT <= 0) { B.hudT = 0.1; broadHud(); } }
function broadHud() { const B = battle && battle.broad; if (!B || !B.foes.length) return; const f = B.foes[nearFoe(B)];
  $('bFoeName').innerHTML = f.name + ' <small>Lv ' + (Math.round(f.lv) + 1) + '</small>' + (B.foes.length > 1 ? ' <small>· ' + B.foes.length + ' ships</small>' : ''); $('bFoeHp').style.width = clamp(f.hp / f.maxHp, 0, 1) * 100 + '%';
  $('bLoad').style.width = (1 - clamp(B.reload / broadReload(), 0, 1)) * 100 + '%'; $('bFire').classList.toggle('ready', B.reload <= 0 && B.k >= 1 && !B.swap);
  const bf = boardTarget(B), bi = bf ? boardInfo(bf) : undefined, bb = $('bBoard'); bb.classList.toggle('hidden', !bf); if (bf) { bb.textContent = bi ? '🪝 ' + bi : '🪝 BOARD HER'; bb.classList.toggle('off', !!bi); } }
// the ship you can board: the nearest one abeam whose hull is below 40%
function boardTarget(B) { let best = null, bd = 1e9; B.foes.forEach((f, i) => { const d = Math.abs(foeAt(B, i) - B.sp); if (f.hp / f.maxHp <= 0.4 && d < bd && d < 16) { bd = d; best = f; } }); return best; }
function clearBroadside() { const B = battle && battle.broad; if (!B) return; for (const a of [B.my, ...B.foes.map((f) => f.bx.arrow)]) { scene.remove(a); a.material.dispose(); } const ui = $('broad'); if (ui) ui.remove(); document.body.classList.remove('busy', 'broadOn'); $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); }
function endBroadside(result) { const B = battle && battle.broad; if (!B) return; const foes = [...B.foes], target = result === 'board' ? boardTarget(B) : null; clearBroadside(); battle = null; setBattle(false); boat.lastHit = time; boat.grace = 3.5; hud();
  if (result === 'win') setThrottle(0, true);
  else if (result === 'flee') { damage(Math.max(...foes.map((f) => f.dmg)) * 0.5 * (1 - defense()), 'You break away under fire!'); for (const f of foes) f.stun = 7; boat.boost = 3.5; boat.v = topSpeed(); setThrottle(1, true); }
  else if (result === 'board' && target) { if (boardInfo(target)) return; for (const f of foes) if (f !== target) f.stun = 9; startBattle(target, true, { classic: true, board: true }); } }
$('pauseBtn').addEventListener('click', () => { const b = $('broadToggle'); if (b) b.textContent = '⚔ BATTLES: ' + (BROAD.on ? 'ACTION' : 'CLASSIC'); });
{ const b = document.createElement('button'); b.id = 'broadToggle'; b.className = 'ghost'; b.onclick = () => { BROAD.on = !BROAD.on; try { localStorage.setItem('pr_broad', BROAD.on ? '1' : '0'); } catch (e) { /* ignore */ } b.textContent = '⚔ BATTLES: ' + (BROAD.on ? 'ACTION' : 'CLASSIC'); }; $('paused').insertBefore(b, $('saveQuit')); }

// ---------- LEGEND FIGHTS: each legend (and its young) fights its own way, live on the water ----------
// KRAKEN, the tentacle siege: it holds your ship fast. Tentacles burst up around you (a red ring warns where), rear back and
// slam down on your deck: shoot them first (tap one, or FIRE / Space for the one about to strike); each one you cut down hurts
// the Kraken. Now and then its great eye opens (a gold ring): hit it for heavy damage, and every rearing tentacle flinches
// away. Below half its health it sends them faster and more at once. FLEE breaks its grip at a cost.
const LEGEND_KIND = { kraken: 'kraken' };
const lgRingGeo = (() => { const g = new THREE.RingGeometry(0.8, 1, 36); g.rotateX(-Math.PI / 2); return g; })();
function legendRing(color, geo = lgRingGeo) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 7; scene.add(m); return m; }
const eyeRingGeo = new THREE.TorusGeometry(1, 0.09, 6, 40);
// the Kraken's eye in the world (the same spot the giant camera frames)
function krakenEye(mon) { const Rk = mon.size / 6, sy = Math.sin(mon.yaw), cy = Math.cos(mon.yaw), lx = 0.9 * Rk, lz = 1.15 * Rk; return [mon.x + lx * cy + lz * sy, mon.g.position.y + Rk * 0.45, mon.z + lz * cy - lx * sy, Rk]; }
function startLegend(mon) {
  const kind = LEGEND_KIND[mon.type]; if (!kind || !BROAD.on) return false;
  const t = T(), young = !!mon.young, L = { kind, young, reload: 0.6, tents: [], spawnT: 1.4, eyeT: rnd(6, 8), eyeOpen: 0, eyeMark: null };
  // the Kraken rises ahead of the bow, facing you; your ship is held fast
  const dist = mon.giant ? mon.size * 0.55 + t.L * 0.6 : mon.size * 0.55 + t.L * 0.6 + 4; let dir = boat.yaw;
  for (const c of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) { const a = boat.yaw + c, x = boat.x + Math.sin(a) * dist, z = boat.z + Math.cos(a) * dist; if (!world.blockAt(x, z, mon.size * 0.3)) { dir = a; break; } }
  mon.x = boat.x + Math.sin(dir) * dist; mon.z = boat.z + Math.cos(dir) * dist; mon.yaw = dir + Math.PI; mon.state = 'chase'; if (mon.boss && !mon.legendHp) { mon.legendHp = true; mon.maxHp *= 1.5; mon.hp *= 1.5; } (mon.stState || (mon.stState = { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 })).reach = 0.35;
  battle = { mon, t: 0, legend: L }; boat.wp = null; helm.held = false; setThrottle(0, true); boat.v = 0; setBattle(true);
  $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy', 'legendOn');
  const ui = document.createElement('div'); ui.id = 'broad'; ui.className = 'legend';
  ui.innerHTML = `<div class="bFoe"><b>${mon.name} <small>Lv ${Math.round(mon.lv) + 1}</small></b><div class="hp foe"><i id="bFoeHp"></i></div></div><div class="bHint" id="bHint">Tentacles rise where the red rings are: tap one (or FIRE) to cut it down before it slams your deck!</div>
    <button class="bFire" id="bFire">FIRE<i id="bLoad"></i></button><div class="bSide"><button class="ghost" id="bFlee">FLEE</button></div>`;
  $('hud').appendChild(ui); $('bFire').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); legendFire(); }; $('bFlee').onclick = (e) => { e.stopPropagation(); endLegend('flee'); };
  warn(young ? '⚠ THE HATCHLING ATTACKS! ⚠' : '⚠ THE KRAKEN SEIZES YOUR SHIP! ⚠', 3); sfx.horn(); sfx.thunder(); return true; }
const legendReload = () => (battle && battle.legend && battle.legend.grab ? 0.2 : P.up.ballista ? 0.6 : 0.8);
function krakenTentacle(L) { const t = T(), mon = battle.mon, taken = L.tents.map((x) => x.a), behind = Math.atan2(boat.x - mon.x, boat.z - mon.z); let a = 0;
  for (let k = 0; k < 16; k++) { a = Math.random() * Math.PI * 2; if (Math.abs(angDiff(a, behind)) > 1.0 && taken.every((b) => Math.abs(angDiff(a, b)) > 0.7)) break; }
  const r = t.L * 0.5 + rnd(4.5, 8), bx = boat.x + Math.sin(a) * r, bz = boat.z + Math.cos(a) * r, n = 18;
  const tb = tentacle(SPECIES.kraken.variants[0], L.young ? 0.42 : 0.66, n, 0, glowVC(), null); tb.mesh.frustumCulled = false; tb.mesh.visible = false; scene.add(tb.mesh);
  const ring = legendRing(0xff3a2a); ring.position.set(bx, ocean.heightAt(bx, bz) + 0.3, bz); ring.scale.setScalar(2.4);
  return { a, r, bx, bz, tb, ring, pts: Array.from({ length: n }, () => new THREE.Vector3()), phase: 'warn', t: 0, hp: L.young ? 1 : 3, len: r + 3.5 }; }
// a tentacle's shape: it grows up out of the water, bending toward your ship by `lean` at the root and `curl` along its length
function poseTentacle(K, grow, lean, curl, sway) { const n = K.pts.length, dx = boat.x - K.bx, dz = boat.z - K.bz, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, seg = (K.len / (n - 1)) * Math.max(0.02, grow);
  let x = K.bx, y = ocean.heightAt(K.bx, K.bz) - 0.6, z = K.bz; K.pts[0].set(x, y, z);
  for (let k = 1; k < n; k++) { const s = k / (n - 1), phi = lean + curl * Math.pow(s, 1.4) + Math.sin(battle.t * 3 + K.a * 5 + s * 5) * sway * s, sp = Math.sin(phi); x += ux * sp * seg; y += Math.cos(phi) * seg; z += uz * sp * seg; K.pts[k].set(x, y, z); }
  K.tb.set(K.pts); }
function dropTentacle(K) { scene.remove(K.tb.mesh); K.tb.mesh.geometry.dispose(); scene.remove(K.ring); K.ring.material.dispose(); }
function krakenHint(L) { if (!L.grab && $('bHint')) $('bHint').textContent = 'Tentacles rise where the red rings are: tap one (or FIRE) to cut it down before it slams your deck!'; }
function updateKraken(dt) { const L = battle.legend, mon = battle.mon, t = T(), enraged = mon.hp < mon.maxHp * 0.5, st = mon.stState || (mon.stState = { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 });
  const coilDur = L.young ? 2.1 : enraged ? 1.15 : 1.6, maxT = L.young ? (enraged ? 2 : 1) : enraged ? 4 : 3;
  L.spawnT -= dt; if (L.spawnT <= 0 && L.tents.filter((K) => K.phase !== 'sink' && K.phase !== 'cut').length < maxT) { L.tents.push(krakenTentacle(L)); L.spawnT = enraged ? rnd(0.7, 1.2) : rnd(1.1, 1.9); }
  for (const K of [...L.tents]) { K.t += dt; const u = K.t;
    if (K.phase === 'warn') { K.ring.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(u * 9)); K.ring.scale.setScalar(2.4 - u * 0.6); if (u > (L.young ? 1 : 0.8)) { K.phase = 'rise'; K.t = 0; K.tb.mesh.visible = true; foam.splash(K.bx, K.bz, 1.1); sfx.splash(0.7); } }
    else if (K.phase === 'rise') { const g = Math.min(1, u / 0.7); poseTentacle(K, g * (2 - g), -0.1, 0.5, 0.15); K.ring.material.opacity = 0.6 * (1 - g); if (u > 0.7) { K.phase = 'coil'; K.t = 0; } }
    else if (K.phase === 'coil') { const k = u / coilDur; poseTentacle(K, 1, -0.15 - 0.1 * k, -0.55 - 0.25 * k, 0.2 + k * 0.5); if (u > coilDur) { K.t = 0; if (!L.grab && !boat.air && Math.random() < (L.young ? 0.15 : enraged ? 0.4 : 0.28)) { K.phase = 'grab'; L.grab = { K, t: 0, hits: 0, need: L.young ? 3 : 5, under: 0 }; warn('🦑 GRABBED! Hit it fast to break free!', 2.5); sfx.creak(); } else K.phase = 'slam'; } }
    else if (K.phase === 'grab') { const G = L.grab; poseTentacle(K, 1, 1.0, 2.5 + Math.sin(battle.t * 12) * 0.08, 0.03); boat.shake = Math.max(boat.shake, 0.25); G.t += dt;
      $('bHint').textContent = '🦑 GRABBED! Hit the tentacle fast to break free! ' + G.hits + ' / ' + G.need;
      if (G.hits >= G.need) { K.phase = 'cut'; K.t = 0; L.grab = null; mon.hp -= attack() * 0.5; pop(boat.x, boat.y + 4, boat.z, 'BROKE FREE!', '#7dff3a'); sfx.hit(); krakenHint(L); }
      else if (G.t > 3.5) { K.phase = 'drag'; K.t = 0; G.under = 0; if (ship.mask) ship.mask.visible = false; damage(mon.dmg * 1.4 * (1 - defense()), 'The Kraken drags you under!'); sfx.splash(); sfx.boom(); if (!battle) return; } }
    else if (K.phase === 'drag') { const k = Math.min(1, u / 1.2); poseTentacle(K, 1, 1.0 + k * 0.4, 2.5 + k, 0.03); boat.dunk = Math.sin(k * Math.PI) * 4.5; if (Math.random() < dt * 20) foam.splash(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), 1.2);
      if (k >= 1) { boat.dunk = 0; L.grab = null; K.phase = 'sink'; K.t = 0; boat.air = startAir(boat, { x: boat.x + rnd(-1, 1), z: boat.z + rnd(-1, 1), r: 6, vs: 1 }, 0.45, 0.8); say('…and hurls you across the sea!', 2.5); sfx.whoosh(); krakenHint(L); } }
    else if (K.phase === 'slam') { const k = Math.min(1, u / 0.28); poseTentacle(K, 1, lerp(-0.4, 1.15, k), lerp(-1.2, 1.9, k), 0.05);
      if (u > 0.28) { K.phase = 'sink'; K.t = 0; boat.shake = 0.6; foam.splash(boat.x + rnd(-1, 1), boat.z + rnd(-1, 1), 1.6); sfx.boom(); damage(mon.dmg * 0.6 * (1 - defense()), 'A tentacle smashes your deck!'); if (!battle) return; } }
    else if (K.phase === 'sink' || K.phase === 'cut') { const k = Math.min(1, u / (K.phase === 'cut' ? 0.5 : 0.8)); poseTentacle(K, 1 - k, K.phase === 'cut' ? -0.6 : 0.6, K.phase === 'cut' ? -1.6 : 1.2, 0.1); if (k >= 1) { dropTentacle(K); L.tents.splice(L.tents.indexOf(K), 1); } } }
  // the eye
  const [ex, ey, ez, Rk] = krakenEye(mon); L.eyeT -= dt;
  if (!L.eyeOpen && L.eyeT <= 0) { L.eyeOpen = L.young ? 2.8 : 2.2; L.eyeMark = L.eyeMark || legendRing(0xffd24a, eyeRingGeo); if (!L.grab) $('bHint').textContent = '👁 THE EYE IS OPEN! Tap it (or FIRE) for a mighty blow!'; sfx.groan && sfx.groan(); }
  if (L.eyeOpen) { L.eyeOpen -= dt; const m = L.eyeMark; m.visible = true; m.position.set(ex, ey, ez); m.scale.setScalar(Rk * (0.7 + 0.12 * Math.sin(battle.t * 10))); m.lookAt(camera.position); st.attack = 0.4;
    if (L.eyeOpen <= 0) { L.eyeOpen = 0; m.visible = false; L.eyeT = rnd(8, 11); st.attack = 0; krakenHint(L); } }
  if (mon.hp <= 0) { endLegend('win'); return; } }
// what FIRE / Space shoots: the open eye first, else the tentacle that will strike soonest
function krakenTarget(L) { if (L.grab && L.grab.K.phase === 'grab') return { K: L.grab.K }; if (L.eyeOpen) return { eye: true }; let best = null, bt = 1e9; for (const K of L.tents) { const left = K.phase === 'rise' ? 9 + (0.7 - K.t) : K.phase === 'coil' ? 0 + (9 - K.t) : 1e9; if (left < bt) { bt = left; best = K; } } return best ? { K: best } : null; }
function legendFire(target) { const L = battle && battle.legend; if (!L || L.reload > 0) return; const tg = target || krakenTarget(L); if (!tg) return; L.reload = legendReload(); unlockAudio(); sfx.throw();
  const mon = battle.mon, kind = P.up.ballista ? 'bolt' : 'spear', from = { x: boat.x, y: boat.y + 2.2, z: boat.z };
  if (tg.eye) { const [ex, ey, ez] = krakenEye(mon); launch(from, { x: ex, y: ey, z: ez }, kind, () => { const L2 = battle && battle.legend; if (L2 !== L || !L.eyeOpen) { pop(ex, ey + 1, ez, 'MISS', '#9ab8c8'); return; }
      const d = Math.round(attack() * 2.4 * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); mon.hp -= d; mon.stState.hurt = 1; pop(ex, ey + 2, ez, '👁 THE EYE! −' + d, '#ffd24a'); sfx.hit(); sfx.boom();
      for (const K of L.tents) if (K.phase === 'rise' || K.phase === 'coil') { K.phase = 'sink'; K.t = 0; } L.eyeOpen = 0.01; }); return; }
  const K = tg.K, p = K.pts[Math.floor(K.pts.length * 0.6)]; launch(from, { x: p.x, y: p.y, z: p.z }, kind, () => { if (K.phase === 'grab') { if (L.grab && L.grab.K === K) L.grab.hits++; mon.hp -= attack() * 0.1; sfx.hit(); pop(p.x, p.y + 1, p.z, 'HACK!', '#ffffff'); return; } if (K.phase !== 'rise' && K.phase !== 'coil') return;
    K.hp--; const d = Math.round(attack() * (K.phase === 'grab' ? 0.1 : K.hp <= 0 ? 0.35 : 0.12) * (boat.thor > 0 ? 2 : 1)); mon.hp -= d; sfx.hit(); foam.splash(p.x, p.z, 0.6); pop(p.x, p.y + 1, p.z, (K.hp <= 0 ? 'SEVERED! ' : '') + '−' + d, K.hp <= 0 ? '#ffd24a' : '#ffffff');
    if (K.hp <= 0) { K.phase = 'cut'; K.t = 0; } else if (K.phase === 'coil') K.t = Math.max(0, K.t - 0.7); }); }
// a tap in a legend fight shoots what is under your finger (the open eye or a tentacle), if anything
function legendTap(x, y) { const L = battle.legend, mon = battle.mon; let best = null, bd = 80;
  if (L.eyeOpen) { const [ex, ey, ez] = krakenEye(mon), s = toScreen(ex, ey, ez); if (s) { const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd + 30) { bd = d; best = { eye: true }; } } }
  for (const K of L.tents) { if (K.phase !== 'rise' && K.phase !== 'coil' && K.phase !== 'grab') continue; for (const i of [6, 10, 14]) { const p = K.pts[i], s = toScreen(p.x, p.y, p.z); if (!s) continue; const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = { K }; } } }
  if (best) legendFire(best); }
function updateLegend(dt) { const L = battle.legend, mon = battle.mon; battle.t += dt; L.reload = Math.max(0, L.reload - dt); boat.v = 0; boat.wp = null;
  if (L.kind === 'kraken') updateKraken(dt); if (!battle) return;
  L.hudT = (L.hudT || 0) - dt; if (L.hudT <= 0) { L.hudT = 0.1; $('bFoeHp').style.width = clamp(mon.hp / mon.maxHp, 0, 1) * 100 + '%'; $('bLoad').style.width = (1 - clamp(L.reload / legendReload(), 0, 1)) * 100 + '%'; $('bFire').classList.toggle('ready', L.reload <= 0); } }
function clearLegend() { const L = battle && battle.legend; if (!L) return; boat.dunk = 0; L.grab = null; if (ship.mask && !boat.air) ship.mask.visible = true; for (const K of L.tents) dropTentacle(K); L.tents.length = 0; if (L.eyeMark) { scene.remove(L.eyeMark); L.eyeMark.material.dispose(); }
  const ui = $('broad'); if (ui) ui.remove(); document.body.classList.remove('busy', 'legendOn'); $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); if (battle.mon.stState) { battle.mon.stState.attack = 0; battle.mon.stState.reach = 1; } }
function endLegend(result) { const L = battle && battle.legend; if (!L) return; const mon = battle.mon; clearLegend(); battle = null; setBattle(false); boat.lastHit = time; boat.grace = 4; hud();
  if (result === 'win') { killMon(mon); setThrottle(0, true); }
  else if (result === 'flee') { damage(mon.dmg * 0.6 * (1 - defense()), 'You tear free of its grip!'); mon.stun = 8; boat.boost = 3.5; boat.v = topSpeed(); setThrottle(1, true); } }

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
  if (P.wreck && Math.hypot(P.wreck.x - boat.x, P.wreck.z - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'salvage', w: 'mine', icon: '☠', label: 'SALVAGE' } : { kind: 'slow', icon: '☠', label: 'SLOW' };
  for (const w of world.wrecks) if (!w.looted && Math.hypot(w.x - boat.x, w.z - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'salvage', w, icon: '🪝', label: 'SALVAGE' } : { kind: 'slow', icon: '🪝', label: 'SLOW' };
  for (const m of P.maps) if (Math.hypot(m.lx - boat.x, m.lz - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'land', m, icon: '⛏', label: 'LAND' } : { kind: 'slow', icon: '⛏', label: 'SLOW' };
  for (const s of spots) if (Math.hypot(s.x - boat.x, s.z - boat.z) < 9 + T().L * 0.35) return v < 3.5 ? { kind: 'fish', s, icon: s.kind === 'treasure' ? '💰' : s.kind === 'flotsam' ? '📦' : '🎣', label: 'FISH' } : { kind: 'slow', icon: '🎣', label: 'SLOW' };
  return null; }
let ctx = null;
function doAction() { if (!ctx || state !== 'play') return; if (autoOn() && ctx.kind !== 'dock') autoDock(false); if (ctx.kind === 'dock') openHarbor(ctx.h); else if (ctx.kind === 'fight') startBattle(ctx.mon, true); else if (ctx.kind === 'fish') startFishing(ctx.s); else if (ctx.kind === 'salvage') startSalvage(ctx.w); else if (ctx.kind === 'land') startDig(ctx.m); else if (ctx.kind === 'slow') say('Tap STOP or ROW to slow down first.'); }
const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xf2e6c8 })); line.visible = false; scene.add(line);
function startFishing(s) { fishing = { s }; boat.wp = null; $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy'); line.visible = true;
  minis.fish({ kind: s.kind, nets: P.up.nets, tier: P.tier, biteChance: 0.07 }, (res) => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); line.visible = false; fishing = null; boat.grace = 2.5;
    const k = 1 + P.tier * 0.6, q = res.q || 0.4;
    if (res.result === 'catch') { const r = s.kind === 'fish' ? { f: Math.round(2 + P.up.nets * 1.5 + q * 3 + P.tier) } : s.kind === 'flotsam' ? { w: Math.round((5 + q * 6) * k * (1 + P.up.nets * 0.2)), i: Math.round((1 + q * 3) * k) } : { g: Math.round((18 + q * 40) * k * (1 + P.up.nets * 0.15)) }; reward(r, s.x, 2.5, s.z); removeSpot(s); }
    else if (res.result === 'bite') { removeSpot(s); const lv = Math.max(0, P.tier + rnd(-0.3, 0.6)), vi = MLV.shark.reduce((bi, l, i) => (Math.abs(l - lv) < Math.abs(MLV.shark[bi] - lv) ? i : bi), 0); const mon = spawnMon({ type: 'shark', v: vi, lv: MLV.shark[vi] }, s.x, s.z); mon.state = 'chase'; startBattle(mon, false); } }); }
function removeSpot(s) { scene.remove(s.g); const i = spots.indexOf(s); if (i >= 0) spots.splice(i, 1); }
function fishCast() { if (!fishing) return; foam.splash(fishing.s.x, fishing.s.z, 0.6); sfx.splash(0.5); }
function startSalvage(w) { const mine = w === 'mine'; if (mine) w = P.wreck; if (!w) return; fishing = { s: w }; $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy');
  minis.salvage({ tier: P.tier }, (res) => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); fishing = null;
    if (mine) { const frac = res.result === 'done' ? 1 : clamp(res.frac || 0, 0, 1) * 0.8; if (P.wreck && frac > 0.05) { takeWreck(frac, w.x, w.z); say(P.wreck ? 'You raise part of your cargo. The rest still lies below.' : 'You raise all the cargo from your wreck! ☠', 3.5); } return; }
    const k = (1 + P.tier * 0.6) * (res.frac || 0); if (res.result !== 'stop' || res.frac > 0.3) { reward({ w: Math.round(rnd(10, 20) * k), i: Math.round(rnd(4, 10) * k), g: Math.round(rnd(20, 45) * k) }, w.x, 3, w.z); w.looted = time + 480; if (Math.random() < 0.3) setTimeout(() => giveMap(), 1200); } }); }

// ---------- weather: rain, storms with lightning to catch, fog, rogue waves, waterspouts, sea tornadoes ----------
const WXNAME = { clear: '', calm: 'Calm', rain: '🌧 Rain', storm: '⛈ Storm', fog: '🌫 Fog', spout: '💧 Waterspouts', tornado: '🌪 Sea tornado', rogue: '🌊 Rogue waves' };
const LOOK = { clear: null, calm: 'calm', rain: 'rain', storm: 'storm', fog: 'fog', spout: 'rain', tornado: 'storm', rogue: 'storm' };
function pickWeather() { const reg = world.regionAt(boat.x, boat.z), opts = { home: ['calm', 'rain', 'fog', 'storm', 'spout'], frost: ['fog', 'storm', 'rogue', 'calm', 'rain'], storm: ['storm', 'storm', 'tornado', 'rogue', 'spout', 'rain'], mist: ['fog', 'fog', 'rain', 'storm', 'spout'], warm: ['calm', 'spout', 'storm', 'rain', 'tornado'] }[reg]; return opts[(Math.random() * opts.length) | 0]; }
function setWeather(type) { if (type === 'clear') { if (wx.type !== 'clear') wx.fading = true; return; } wx.type = type; wx.k = 0; wx.fading = false; wx.t = rnd(40, 70); boltT = 3;
  const tip = { storm: 'A storm! Sail into a blue ring to catch the lightning.', tornado: 'A sea tornado is coming! Keep away from it.', spout: 'Waterspouts! Steer clear of the spinning columns.', rogue: 'Rogue wave weather. Turn your bow into the big waves!', fog: 'Fog rolls in. Monsters lurk close.', rain: 'Rain.', calm: 'The sea goes calm.' }[type]; say(tip, 3.5); sfx.whoosh();
  if (type === 'spout') for (let k = 0; k < 2; k++) spawnSpout('waterspout', 2.0 * vortexSize()); if (type === 'tornado') { const vs = vortexSize(); spawnSpout('seastorm', 2.7 * vs); if (vs > 2) warn('🌪 A HUGE SEA TORNADO! It can lift even a Drakkar. Keep away!', 5); } if (type === 'rogue') rogueT = 6; }
// vortex size relative to the old fixed size: 60% about the same, 30% bigger, 10% huge
function vortexSize() { const r = Math.random(); return r < 0.6 ? rnd(1, 1.35) : r < 0.9 ? rnd(1.35, 2.1) : rnd(2.3, 3.1); }
function spawnSpout(skin, sc) { const a = Math.random() * 6.28, d = rnd(60, 100), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; const g = twisters.make(true, [], skin); g.scale.setScalar(0.01); g.position.set(x, 0, z); scene.add(g); spouts.push({ g, x, z, sc, vs: sc / (skin === 'seastorm' ? 2.7 : 2.0), r: sc * 3.4, dir: Math.atan2(boat.x - x, boat.z - z) + rnd(-0.6, 0.6), life: wx.t, age: 0, tornado: skin === 'seastorm' }); }
// ---------- caught by a vortex: lifted spinning up the funnel, then flung out to crash down far away ----------
// k: 1 for small things, falling to 0 at about a Drakkar's size; giants are never lifted
const GIANTS = new Set(['megalodon', 'kraken', 'elder', 'jormungandr', 'leviathan']);
const liftK = (size, vs = 1) => clamp((10.5 * vs - size) / (7 * vs), 0, 1);
function startAir(e, s, k, str) { return { s, k, str, ph: 'lift', t: 0, dur: 1 + 1.3 * str, ang: Math.atan2(e.x - s.x, e.z - s.z), r0: Math.max(1, Math.hypot(e.x - s.x, e.z - s.z)), H: (8 + 26 * k) * str, h: 0, pitch: 0, roll: 0, spin: 1 }; }
function flyStep(A, e, dt) { A.t += dt;
  if (A.ph === 'lift') { const u = Math.min(1, A.t / A.dur), q = u * u * (3 - 2 * u); A.ang += dt * (2.2 + 5 * u); const r = A.r0 + (A.s.r * 0.3 - A.r0) * q;
    e.x = A.s.x + Math.sin(A.ang) * r; e.z = A.s.z + Math.cos(A.ang) * r; A.h = A.H * q; e.yaw += dt * (3 + 7 * u); A.pitch = Math.sin(A.t * 6) * 0.45 * u; A.roll = Math.cos(A.t * 4.5) * 0.7 * u;
    if (u >= 1) { // spit out along the spin and a little outward, shortened until it lands in open water
      let dx = Math.cos(A.ang) + Math.sin(A.ang) * 0.6, dz = -Math.sin(A.ang) + Math.cos(A.ang) * 0.6; const dl = Math.hypot(dx, dz); dx /= dl; dz /= dl;
      let D = (30 + 42 * A.k) * A.str; for (let i = 0; i < 8; i++) { const x = e.x + dx * D, z = e.z + dz * D; if (!world.blockAt(x, z, 4) && Math.abs(x) < HALF - 20 && Math.abs(z) < HALF - 20) break; D *= 0.72; }
      Object.assign(A, { ph: 'fly', t: 0, fd: 1 + 0.6 * A.str, x0: e.x, z0: e.z, x1: e.x + dx * D, z1: e.z + dz * D, h0: A.h }); } }
  else { const u = Math.min(1, A.t / A.fd); e.x = A.x0 + (A.x1 - A.x0) * u; e.z = A.z0 + (A.z1 - A.z0) * u; A.h = A.h0 * (1 - u) * (1 - u * 0.3) + Math.sin(u * Math.PI) * A.H * 0.3; e.yaw += dt * 9 * (1 - u * 0.75);
    A.pitch = Math.sin(A.t * 5) * 0.4 * (1 - u); A.roll = Math.cos(A.t * 4) * 0.6 * (1 - u); if (u >= 1) A.done = true; } }
function landBoat(A) { boat.air = null; boat.airCd = 5; if (ship.mask) ship.mask.visible = true; boat.y = ocean.heightAt(boat.x, boat.z); boat.v *= 0.3; boat.spin = (Math.random() < 0.5 ? -1 : 1) * 1.6; boat.shake = 0.9; boat.grace = 2.5; boat.wp = null; courseMark.visible = false;
  foam.splash(boat.x, boat.z, 2.6); foam.splash(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), 1.6); sfx.splash(); sfx.boom(); damage(maxHp() * (A.s.tornado ? 0.16 : 0.07) * A.k * Math.min(1.6, Math.sqrt(A.s.vs || 1)) * (1 - defense() * 0.5), A.s.tornado ? 'The sea tornado spits you out and you crash down!' : 'The waterspout throws you clear!'); }
function landMon(mon, A) { mon.air = null; mon.airCd = time + 5; if (mon.naval && mon.m.ship.mask) mon.m.ship.mask.visible = true; mon.stun = 4; foam.splash(mon.x, mon.z, 2); mon.hp -= mon.maxHp * (A.s.tornado ? 0.3 : 0.15) * A.k * Math.min(1.6, Math.sqrt(A.s.vs || 1)); if (mon.hp <= 0) killMon(mon); }
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
    if (!rogueHit && Math.abs(al) < R.w * 0.5 && state === 'play' && !battle && !boat.air) { rogueHit = true; const into = Math.sin(boat.yaw) * -R.dx + Math.cos(boat.yaw) * -R.dz; if (into > 0.6) { say('You crest the rogue wave! Skål!', 3); reward({ g: 10 + P.tier * 10 }, boat.x, 4, boat.z); } else { damage(maxHp() * (0.34 - 0.24 * Math.max(0, into)) * (1 - P.up.armor * 0.1), 'The rogue wave smashes into you!'); boat.spin = 2.5 * (Math.random() < 0.5 ? -1 : 1); } } }
  // waterspouts / tornadoes
  for (let i = spouts.length - 1; i >= 0; i--) { const s = spouts[i]; s.age += dt; s.life -= dt; const grow = clamp(Math.min(s.age / 4, s.life / 4), 0, 1); s.g.scale.setScalar(s.sc * Math.max(0.01, grow));
    s.dir += rnd(-0.4, 0.4) * dt + angDiff(Math.atan2(boat.x - s.x, boat.z - s.z), s.dir) * dt * 0.08; const sp = (s.tornado ? 5 : 4) / Math.sqrt(s.vs || 1); s.x += Math.sin(s.dir) * sp * dt; s.z += Math.cos(s.dir) * sp * dt; s.g.position.set(s.x, 0, s.z); if (Math.random() < dt * 8) foam.add(s.x + rnd(-s.r, s.r), s.z + rnd(-s.r, s.r), { spray: true, y: 0.5, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(4, 9), s: 1, life: 1.2, a: 0.7 });
    const vs = s.vs || 1, d = Math.hypot(boat.x - s.x, boat.z - s.z), R2 = s.r * grow * 1.4, str = (s.tornado ? 1 : 0.55) * Math.sqrt(vs), kb = liftK(T().L * 0.5, vs);
    // your ship: dragged round and in, then lifted up the funnel (a bigger ship feels it less; a Drakkar not at all)
    if (d < R2 * 1.7 && kb > 0 && state === 'play' && !battle && !boat.air && !(boat.airCd > 0) && grow > 0.6) { const ux = (boat.x - s.x) / (d || 1), uz = (boat.z - s.z) / (d || 1), pull = kb * str * (d < R2 ? 7 : 3.5);
      boat.x += (-uz * 6 * kb * str - ux * pull) * dt; boat.z += (ux * 6 * kb * str - uz * pull) * dt; boat.spin = Math.max(boat.spin, 1.2 * kb);
      if (d < R2 * 0.8) { boat.air = startAir(boat, s, kb, str); if (ship.mask) ship.mask.visible = false; say(s.tornado ? 'The sea tornado lifts you into the sky!' : 'The waterspout lifts you off the sea!', 2.5); sfx.whoosh(); } }
    for (const mon of mons) { if (mon.dead || mon.air || mon.boss || GIANTS.has(mon.type) || mon.airCd > time || inFight(mon)) continue; const dm = Math.hypot(mon.x - s.x, mon.z - s.z), km = liftK(mon.size, vs); if (km <= 0 || dm > R2) continue;
      if (dm < R2 * 0.8) { mon.air = startAir(mon, s, km, str); if (mon.naval && mon.m.ship.mask) mon.m.ship.mask.visible = false; } else { mon.x += ((mon.x - s.x) / dm) * -4 * dt; mon.z += ((mon.z - s.z) / dm) * -4 * dt; mon.yaw += dt * 3; } }
    for (let j = spots.length - 1; j >= 0; j--) { const sp2 = spots[j]; if (sp2.kind === 'fish' && Math.hypot(sp2.x - s.x, sp2.z - s.z) < R2) { removeSpot(sp2); for (let k = 0; k < 6; k++) spawnFloat(boat.x + rnd(-25, 25), boat.z + rnd(-25, 25), 'f', 1); say('It\'s raining fish! 🐟', 2.5); } }
    if (s.life <= 0) { twisters.remove(s.g); spouts.splice(i, 1); } }
  twisters.update(dt);
  // rain
  const wet = (LOOK[wx.type] === 'rain' || LOOK[wx.type] === 'storm') ? wx.k : 0; rain.visible = wet > 0.05; rain.material.opacity = 0.35 * wet; if (rain.visible) { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { let y = p.getY(i) - dt * 40; let x = p.getX(i), z = p.getZ(i); if (y < -2 || Math.abs(x - camTgt.x) > 50 || Math.abs(z - camTgt.z) > 50) { x = camTgt.x + rnd(-50, 50); z = camTgt.z + rnd(-50, 50); y = rnd(20, 50); } p.setXYZ(i, x, y, z); p.setXYZ(i + 1, x + 0.3, y + 1.6, z + 0.2); } p.needsUpdate = true; }
}
const rain = (() => { const n = 700, a = new Float32Array(n * 6); for (let i = 0; i < n * 6; i += 3) { a[i] = rnd(-50, 50); a[i + 1] = rnd(0, 50); a[i + 2] = rnd(-50, 50); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.3 })); l.frustumCulled = false; l.visible = false; scene.add(l); return l; })();

// ---------- sea events: a maelstrom, a serpent ambush, a raider fleet, a treasure ship to run down, the northern lights ----------
const EV = { next: 80, whirl: null, ambush: null, fleets: {}, fleetN: 0, aurora: { tonight: false, forced: false, k: 0, shown: false, wasNight: false, nextPillar: 0 } };
const COMPASS8 = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const compassName = (vx, vz) => COMPASS8[Math.round(((Math.atan2(vx, -vz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
// how likely each event is in each sea
const EVW = { whirl: { home: 1, frost: 1.2, storm: 1, mist: 1.6, warm: 0.8 }, ambush: { home: 0.8, frost: 1.5, storm: 1, mist: 1.5, warm: 1 }, fleet: { home: 0.5, frost: 0.8, storm: 1.2, mist: 1.4, warm: 1 }, treasure: { home: 1, frost: 0.7, storm: 0.6, mist: 0.6, warm: 1.8 } };
function openAt(x, z, r) { if (Math.abs(x) > HALF - r - 15 || Math.abs(z) > HALF - r - 15 || world.blockAt(x, z, 4)) return false;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283, px = x + Math.sin(a) * r * 1.25, pz = z + Math.cos(a) * r * 1.25; if (world.blockAt(px, pz, 4) || ocean.shoreAt(px, pz) > 0.08) return false; } return true; }
function updateEvents(dt) {
  if (!battle && !fishing && !EV.ambush) { EV.next -= dt; if (EV.next <= 0) { EV.next = rnd(60, 115); const reg = world.regionAt(boat.x, boat.z);
    const opts = Object.keys(EVW).filter((k) => !(k === 'whirl' && (EV.whirl || spouts.some((s) => s.tornado))) && !(k === 'fleet' && Object.keys(EV.fleets).length) && !(k === 'treasure' && mons.some((m) => m.treasure)));
    let sum = 0; for (const k of opts) sum += EVW[k][reg]; let pick = Math.random() * sum; for (const k of opts) { pick -= EVW[k][reg]; if (pick <= 0) { if (!startEvent(k)) EV.next = 8; break; } } } }
  updateAmbush(dt); updateWhirl(dt); updateAurora(dt);
  for (const id in EV.fleets) if (!mons.some((m) => m.fleet === +id && !m.dead)) { if (EV.fleets[id].killed < EV.fleets[id].n) say('The rest of the raider fleet turns away.'); delete EV.fleets[id]; } }
function startEvent(kind) { if (kind === 'aurora') { EV.aurora.tonight = EV.aurora.forced = true; return true; } return kind === 'whirl' ? startWhirl() : kind === 'ambush' ? serpentAmbush() : kind === 'fleet' ? raiderFleet() : kind === 'treasure' ? treasureShip() : false; }

// the maelstrom: the sea sinks into a spinning funnel that drags ships round and in; gold circles inside it, and when it
// closes it spits up wreckage. The ocean shader draws the funnel and its foam arms (ocean.whirl).
function startWhirl() { const R = 24 + P.tier * 3.5;
  for (let tries = 0; tries < 14; tries++) { const a = boat.yaw + rnd(-1.2, 1.2), d = R * 1.3 + rnd(10, 30) + boat.v * 2, x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d;
    if (!openAt(x, z, R) || Math.hypot(x, z + 40) < 80 + R) continue;
    Object.assign(ocean.whirl, { x, z, R, D: 3.2 + P.tier * 0.5, k: 0 }); EV.whirl = { x, z, R, age: 0, life: rnd(40, 55), hitT: 0, fxT: 0, sndT: 0, warned: false };
    warn('🌀 A MAELSTROM opens to the ' + compassName(x - boat.x, z - boat.z) + '! Full sail to break free of its pull.', 5); sfx.horn(); sfx.whoosh();
    for (let k = 0; k < 3; k++) { const aa = Math.random() * 6.28, rr = R * rnd(0.45, 0.8); spawnFloat(x + Math.sin(aa) * rr, z + Math.cos(aa) * rr, 'g', 0); }
    return true; } return false; }
// the maelstrom's water at (x, z): round and round (fastest near the eye) and in toward it
function swirlAt(x, z, E, k) { const qx = x - E.x, qz = z - E.z, d = Math.hypot(qx, qz) || 0.001, r = d / E.R; if (r > 1.9) return null; const edge = Math.min(1, (1.9 - r) * 1.5), e = Math.exp(-r * r * 1.3);
  const tan = k * edge * (2 + 8 * e), inn = k * edge * (1 + 5.5 * Math.exp(-r * r * 1.5)); return { vx: (qz / d) * tan - (qx / d) * inn, vz: (-qx / d) * tan - (qz / d) * inn, tx: (qz / d) * tan, tz: (-qx / d) * tan, r, e }; }
function updateWhirl(dt) { const E = EV.whirl, W = ocean.whirl; if (!E) return; E.age += dt; const k = clamp(Math.min(E.age / 6, (E.life - E.age) / 5), 0, 1); W.k = k;
  if (E.age >= E.life) { W.k = 0; EV.whirl = null; for (let i = 0; i < 6; i++) { const r = Math.random(); spawnFloat(E.x + rnd(-7, 7), E.z + rnd(-7, 7), r < 0.4 ? 'g' : r < 0.7 ? 'i' : 'w', 0); } foam.splash(E.x, E.z, 3); if (Math.hypot(boat.x - E.x, boat.z - E.z) < 160) say('The maelstrom closes and spits up wreckage! 🪙', 3.5); return; }
  if (state === 'play' && !battle && !boat.air) { const s = swirlAt(boat.x, boat.z, E, k); if (s) { const nx = boat.x + s.vx * dt, nz = boat.z + s.vz * dt; if (!world.blockAt(nx, nz, T().B * 0.5 + 1)) { boat.x = nx; boat.z = nz; } boat.yaw += k * 0.55 * s.e * dt;
      if (!E.warned && s.r < 1.15) { E.warned = true; say('The maelstrom has you! Full sail and steer out of the spin.', 3); }
      E.sndT -= dt; if (E.sndT <= 0) { E.sndT = 2.2; sfx.whoosh(); }
      if (s.r < 0.32) { E.hitT -= dt; if (E.hitT <= 0) { E.hitT = 0.8; damage(maxHp() * 0.045 * (1 - defense() * 0.5), 'The maelstrom grinds your hull!'); sfx.creak(); } } } }
  for (const mon of mons) { if (mon.dead || mon.air || mon.boss || inFight(mon)) continue; const s = swirlAt(mon.x, mon.z, E, k); if (!s) continue; mon.x += s.vx * dt * 0.8; mon.z += s.vz * dt * 0.8; mon.yaw += k * s.e * dt; if (s.r < 0.3) { mon.hp -= mon.maxHp * 0.06 * dt; if (mon.hp <= 0) killMon(mon); } }
  for (const f of floats) { const s = swirlAt(f.x, f.z, E, k); if (!s) continue; f.x += (s.tx + (s.vx - s.tx) * 0.12) * dt * 0.8; f.z += (s.tz + (s.vz - s.tz) * 0.12) * dt * 0.8; }
  // foam streaks circling down into the eye, spray thrown up from it
  E.fxT -= dt; while (E.fxT <= 0) { E.fxT += 0.035; const a = Math.random() * 6.28, rr = E.R * rnd(0.2, 1.5), px = E.x + Math.sin(a) * rr, pz = E.z + Math.cos(a) * rr, s = swirlAt(px, pz, E, k); if (s) foam.add(px, pz, { vx: s.vx * 1.3, vz: s.vz * 1.3, s: rnd(0.8, 1.8), grow: 0.3, life: 2.2, a: 0.5 * k }); }
  if (Math.random() < dt * 6 * k) foam.add(E.x + rnd(-2, 2), E.z + rnd(-2, 2), { spray: true, y: ocean.heightAt(E.x, E.z) + 0.3, vx: rnd(-2, 2), vz: rnd(-2, 2), vy: rnd(3, 6), s: 0.8, life: 1, a: 0.6 }); }

// serpent ambush: the water boils beside the ship, then a serpent bursts out and strikes. Sail hard to leave it behind.
function serpentAmbush() { const reg = world.regionAt(boat.x, boat.z), lvs = MLV.serpent, vb = VBIAS[reg] || {};
  let v = -1; for (let i = 0; i < lvs.length; i++) if (vb['serpent:' + i]) v = i;
  if (v < 0) { const ok = lvs.map((lv, i) => i).filter((i) => lvs[i] <= P.tier + 1.6); v = ok.length ? ok[(Math.random() * ok.length) | 0] : 0; }
  const rel = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + rnd(-0.5, 0.3)), gap = T().B * 0.5 + 5 + P.tier;
  EV.ambush = { rel, gap, t: 1.6, e: { type: 'serpent', v, lv: clamp(P.tier + rnd(0.1, 0.7), 0.3, lvs[v] + 0.5) } };
  warn('⚠ The water boils beside you…', 1.8); sfx.groan && sfx.groan(); return true; }
function updateAmbush(dt) { const A = EV.ambush; if (!A) return; if (battle || fishing || state !== 'play') { EV.ambush = null; return; }
  const a = boat.yaw + A.rel, x = boat.x + Math.sin(a) * A.gap, z = boat.z + Math.cos(a) * A.gap; A.t -= dt;
  if (Math.random() < dt * 30) foam.add(x + rnd(-2.5, 2.5), z + rnd(-2.5, 2.5), { s: rnd(0.4, 0.9), grow: 1.2, life: 0.9, a: 0.8 });
  if (Math.random() < dt * 8) foam.add(x + rnd(-1.5, 1.5), z + rnd(-1.5, 1.5), { spray: true, y: ocean.heightAt(x, z) + 0.2, vx: rnd(-1, 1), vz: rnd(-1, 1), vy: rnd(2, 4), s: 0.4, life: 0.6, a: 0.7 });
  if (A.t > 0) return; EV.ambush = null; if (world.blockAt(x, z, 3)) return;
  const mon = spawnMon(A.e, x, z); Object.assign(mon, { state: 'rise', rise: 0.1, dive: 0.9, riseK: 1.1, ambush: true, yaw: Math.atan2(boat.x - x, boat.z - z) });
  foam.splash(x, z, 3); foam.splash(x + rnd(-2, 2), z + rnd(-2, 2), 2); for (let k = 0; k < 26; k++) foam.add(x + rnd(-1.5, 1.5), z + rnd(-1.5, 1.5), { spray: true, y: ocean.heightAt(x, z) + 0.5, vx: rnd(-2.5, 2.5), vz: rnd(-2.5, 2.5), vy: rnd(8, 15), s: rnd(0.6, 1.2), life: 1.6, a: 0.9 });
  boat.shake = 0.9; boat.spin += (A.rel > 0 ? -1 : 1) * 0.7; sfx.splash(); sfx.boom(); warn('🐍 AMBUSH! Sail hard to escape it, or stand and fight!', 3); damage(maxHp() * 0.06 * (1 - defense()), 'AMBUSH! ' + (/^[AEIOU]/i.test(mon.name) ? 'An ' : 'A ') + mon.name + ' bursts up beside you!'); }

// raider fleet: a warlord and his ships in formation come over the horizon hunting you. Sink them all for their war chest.
function raiderFleet() { const n = P.tier === 0 ? 2 : P.tier < 3 ? 3 : 4;
  for (let tries = 0; tries < 8; tries++) { const a = Math.random() * 6.28, cx = boat.x + Math.sin(a) * 150, cz = boat.z + Math.cos(a) * 150; if (!openAt(cx, cz, 22)) continue;
    const id = ++EV.fleetN, pal = RAIDER_PALS[(Math.random() * RAIDER_PALS.length) | 0], hd = Math.atan2(boat.x - cx, boat.z - cz); let got = 0;
    for (let i = 0; i < n; i++) { const lead = i === 0, st = lead ? Math.min(4, P.tier) : Math.max(0, P.tier - 1), row = Math.ceil(i / 2), off = lead ? 0 : (i % 2 ? 1 : -1) * 16 * row, back = 12 * row;
      const x = cx + Math.cos(hd) * off - Math.sin(hd) * back, z = cz - Math.sin(hd) * off - Math.cos(hd) * back; if (world.blockAt(x, z, 6)) continue;
      const mon = spawnMon({ type: 'raider', v: st, lv: st + 0.4 + (lead ? 0.3 : 0) }, x, z, { pal }); Object.assign(mon, { yaw: hd, state: 'chase', hunt: 80, fleet: id, fleetOff: off }); if (lead) mon.name = 'Warlord of the ' + pal.name; got++; }
    if (!got) return false; EV.fleets[id] = { n: got, killed: 0, pal };
    warn('⚔ A RAIDER FLEET to the ' + compassName(cx - boat.x, cz - boat.z) + '! ' + got + ' ships of the ' + pal.name + '. Fight them or outrun them!', 5); sfx.horn(); setTimeout(() => sfx.horn(), 800); return true; }
  return false; }
function fleetDown(id) { const f = EV.fleets[id]; if (!f) return; f.killed++; if (f.killed < f.n) { setTimeout(() => say('A raider ship goes down! ' + (f.n - f.killed) + ' left in the fleet.', 3), 600); return; }
  delete EV.fleets[id]; const k = P.tier + 1; setTimeout(() => { reward({ w: 25 * k, i: 12 * k, g: 60 * k }, boat.x, 4, boat.z); say('<b>⚔ THE FLEET IS BROKEN! ⚔</b> Their war chest is yours.', 4.5); sfx.horn(); }, 1200); }

// treasure knarr: a fat merchant ship runs from you, dumping cargo as you close in. Catch it and board her.
function treasureShip() { for (let tries = 0; tries < 10; tries++) { const a = boat.yaw + rnd(-1.2, 1.2), d = rnd(70, 95), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (!openAt(x, z, 10)) continue;
    const v = clamp(P.tier, 1, 3), mon = spawnMon({ type: 'raider', v, lv: P.tier + 0.2 }, x, z, { pal: TREASURE_PAL, merchant: true });
    Object.assign(mon, { treasure: true, flee: 75, dropT: 3, name: '💰 Treasure Knarr', yaw: Math.atan2(x - boat.x, z - boat.z) }); mon.dmg = Math.round(mon.dmg * 0.45);
    warn('💰 A TREASURE KNARR to the ' + compassName(x - boat.x, z - boat.z) + '! Run it down before it gets away!', 5); sfx.horn(); return true; } return false; }

// northern lights: some nights in the Frost Sea the sky burns green, and the Bifröst touches the sea nearby. Sail into it:
// your hull mends and your sails fill (+25% speed) for 30 s.
const aur = createAurora(scene, ocean), AUR_HEMI = new THREE.Color(0x6affc0), AUR_FOG = new THREE.Color(0x1a5a4a);
function placePillar() { for (let tries = 0; tries < 16; tries++) { const a = Math.random() * 6.28, d = rnd(55, 105), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (!openAt(x, z, 6)) continue; aur.showPillar(x, z); return true; } return false; }
function updateAurora(dt) { const A = EV.aurora, night = isNight();
  if (night && !A.wasNight) A.tonight = A.forced || Math.random() < 0.75; if (!night && A.wasNight) { A.forced = false; A.shown = false; A.tonight = false; aur.hidePillar(); } A.wasNight = night;
  if (A.k > 0.5 && !A.shown) { A.shown = true; say('🌌 The northern lights! Find where the Bifröst touches the sea.', 4.5); sfx.horn(); placePillar(); }
  const pa = aur.pillarAt; if (pa) { const d = Math.hypot(pa.x - boat.x, pa.z - boat.z);
    if (d > 260 || A.k < 0.05) aur.hidePillar();
    else if (d < 6 + T().B * 0.5 && !battle) { aur.hidePillar(); boat.bifrost = 30; A.nextPillar = 60; say('🌈 <span style="color:#9fffd0">BIFRÖST!</span> The gods\' light mends your hull and fills your sails for 30 s', 4); sfx.zap(); sfx.horn(); foam.splash(boat.x, boat.z, 1.5); } }
  else if (A.shown && A.k > 0.5) { A.nextPillar -= dt; if (A.nextPillar <= 0) { A.nextPillar = 20; placePillar(); } } }
function updateAuroraFx(dt) { const A = EV.aurora, want = A.tonight && isNight() ? clamp(((rw.frost || 0) - 0.35) / 0.4, 0, 1) : 0; A.k += (want - A.k) * Math.min(1, dt * 0.4); const k = A.k * env.cur.moon;
  aur.update(dt, k, camera.position); ocean.uniforms.uAur.value = k * 0.9;
  if (k > 0.01) { hemi.color.lerp(AUR_HEMI, k * 0.3); scene.fog.color.lerp(AUR_FOG, k * 0.3); ocean.uniforms.uHorizon.value.lerp(AUR_FOG, k * 0.3); } }

// ---------- your own wreck: half the cargo goes down with the ship. Sail back and salvage it, or hire a harbour crew ----------
let wreckG = null;
function placeWreck() { if (wreckG) { scene.remove(wreckG); wreckG = null; } if (!P.wreck) return; const g = new THREE.Group(), wood = M(0x5a3a22), dark = M(0x3a2414);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 7, 7), wood); mast.position.set(0, 2.2, 0); mast.rotation.z = 0.55; g.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 6), wood); yard.rotation.z = Math.PI / 2 + 0.55; yard.position.set(-1.46, 4.6, 0); g.add(yard);
  const rag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2), new THREE.MeshLambertMaterial({ color: 0xb8322a, side: THREE.DoubleSide })); rag.position.set(-0.9, 3.7, 0.08); rag.rotation.z = 0.55; g.add(rag);
  const keel = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), dark); keel.scale.set(1.5, 0.75, 4.2); keel.position.set(1.2, 0.05, 0.3); keel.rotation.set(0.12, 0.35, 0.5); g.add(keel); const strake = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, 6.283, 0, 1.1), wood); strake.scale.set(1.45, 0.8, 4.1); strake.position.copy(keel.position); strake.rotation.copy(keel.rotation); strake.position.y += 0.06; g.add(strake);
  const stem = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3, 6), dark); stem.position.set(2.6, 0.6, 1); stem.rotation.set(0.3, 0, -0.9); g.add(stem);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(rnd(1.2, 2.4), 0.14, 0.4), wood); p.position.set(rnd(-4, 4), 0.55, rnd(-4, 4)); p.rotation.y = Math.random() * 3; g.add(p); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), M(0xff5a3a, 'glow')); beacon.position.set(-1.85, 5.3, 0); g.add(beacon); g.userData.beacon = beacon;
  g.position.set(P.wreck.x, 0, P.wreck.z); scene.add(g); wreckG = g; }
function updateWreck() { if (!wreckG || !P.wreck) return; wreckG.position.y = ocean.heightAt(P.wreck.x, P.wreck.z) - 0.6; wreckG.rotation.y = Math.sin(time * 0.2) * 0.05; wreckG.userData.beacon.scale.setScalar(0.8 + Math.abs(Math.sin(time * 2.5)) * 0.6); }
const wreckSum = (r) => [['🪵', r.w], ['⚙️', r.i], ['🪙', r.g], ['🐟', r.f]].filter(([, n]) => n > 0).map(([ic, n]) => n + ' ' + ic).join(' ') || 'nothing';
const wreckCost = () => { const r = P.wreck.res; return 15 + 10 * P.tier + Math.round(0.15 * ((r.w || 0) + 2 * (r.i || 0) + (r.g || 0))); };
function takeWreck(frac, x, z) { const r = P.wreck.res, got = {}; for (const k of ['w', 'i', 'g', 'f']) { got[k] = Math.round((r[k] || 0) * frac); r[k] = (r[k] || 0) - got[k]; } reward(got, x, 3, z); if (!(r.w + r.i + r.g + r.f > 0)) { P.wreck = null; placeWreck(); } save(); }

// ---------- porpoises: friendly pods that swim with your ship, leap, and ride its bow wave (+10% speed while 2+ are with you) ----------
const pods = []; let podT = 30;
function spawnPod() { if (world.regionAt(boat.x, boat.z) === 'storm') return; const a = Math.random() * 6.28, d = rnd(60, 110), cx = boat.x + Math.sin(a) * d, cz = boat.z + Math.cos(a) * d; if (world.blockAt(cx, cz, 10) || Math.abs(cx) > HALF - 20 || Math.abs(cz) > HALF - 20) return;
  const v = (Math.random() * 3) | 0, n = 3 + ((Math.random() * 3) | 0), members = [];
  for (let i = 0; i < n; i++) { const m = makeMonster('porpoise', v, 1), x = cx + rnd(-6, 6), z = cz + rnd(-6, 6); m.g.position.set(x, 0, z); scene.add(m.g); members.push({ m, x, z, yaw: Math.random() * 6.28, leap: -1, st: { t: 0, speed: 0.6, attack: 0, dive: 0, hurt: 0, rise: 1 }, slot: (i / n) * 2 - 1, r: rnd(0, 1) }); }
  pods.push({ members, life: rnd(80, 120) }); }
function updatePods(dt) { podT -= dt; if (podT <= 0) { podT = rnd(40, 75); if (pods.length < 2 && !battle) spawnPod(); }
  let riders = 0; const fx = Math.sin(boat.yaw), fz = Math.cos(boat.yaw), t = T();
  for (let p = pods.length - 1; p >= 0; p--) { const pod = pods[p]; pod.life -= dt; const leaving = pod.life <= 0; let far = 0;
    for (const Mb of pod.members) { const d = Math.hypot(boat.x - Mb.x, boat.z - Mb.z); let tx, tz, sp;
      if (leaving) { tx = Mb.x + Math.sin(Mb.yaw) * 10; tz = Mb.z + Math.cos(Mb.yaw) * 10; sp = 9; }
      else if (d < 45) { const side = Mb.slot < 0 ? -1 : 1, ahead = t.L * 0.55 + 2 + Mb.r * 5 - Math.abs(Mb.slot) * 4, out = t.B * 0.7 + 1.5 + Math.abs(Mb.slot) * 3; tx = boat.x + fx * ahead + fz * side * out; tz = boat.z + fz * ahead - fx * side * out; sp = Math.max(5, boat.v * 1.05 + Math.min(4, Math.hypot(tx - Mb.x, tz - Mb.z) * 0.5)); }
      else { tx = boat.x; tz = boat.z; sp = 9; }
      const want = Math.atan2(tx - Mb.x, tz - Mb.z); Mb.yaw += clamp(angDiff(want, Mb.yaw), -dt * 2.6, dt * 2.6); const spd = Math.min(sp, Math.hypot(tx - Mb.x, tz - Mb.z) * 2 + 1.5);
      let nx = Mb.x + Math.sin(Mb.yaw) * spd * dt, nz = Mb.z + Math.cos(Mb.yaw) * spd * dt; if (world.blockAt(nx, nz, 1)) { Mb.yaw += dt * 3; nx = Mb.x; nz = Mb.z; } Mb.x = nx; Mb.z = nz;
      if (Mb.leap < 0 && Math.random() < dt * 0.22) Mb.leap = 0; if (Mb.leap >= 0) { Mb.leap += dt / 1.2; Mb.st.attack = Math.min(1, Mb.leap); if (Mb.leap >= 1) { Mb.leap = -1; Mb.st.attack = 0; foam.splash(Mb.x, Mb.z, 0.45); } }
      Mb.st.speed = Math.min(1, spd / 10); Mb.m.g.position.set(Mb.x, ocean.heightAt(Mb.x, Mb.z), Mb.z); Mb.m.g.rotation.y = Mb.yaw; Mb.m.anim(dt, Mb.st);
      if (!leaving && d < 20) riders++; if (d > (leaving ? 140 : 320)) far++; }
    if (far === pod.members.length) { for (const Mb of pod.members) scene.remove(Mb.m.g); pods.splice(p, 1); } }
  const was = boat.pod; boat.pod = riders >= 2 && boat.v > 3 && state === 'play'; if (boat.pod && !was && !boat.podSaid) { boat.podSaid = true; say('🐬 Porpoises ride your bow wave! +10% speed while they swim with you.', 3.5); } }

// ---------- boarding prizes: plunder her hold, or claim her (a prize crew sails her to your home harbour) ----------
const HOOK_NEED = (v) => (v <= 1 ? 1 : v <= 3 ? 2 : 3); // grappling hook level needed to board a ship of size v
const palOf = (skin) => (skin === 'ghost' ? GHOST_PAL : skin === 'treasure' ? TREASURE_PAL : RAIDER_PALS.find((p) => p.name === skin) || PLAYER_PAL);
const skinLabel = (skin) => (!skin || skin === 'pats' ? "Pat's colours" : skin === 'ghost' ? 'the Draugr ghost hull' : skin === 'treasure' ? 'a treasure knarr' : 'the ' + skin + ' colours');
const shipValue = (pz) => Math.round([70, 220, 480, 950, 1800][pz.tier] * (pz.skin === 'ghost' ? 3 : pz.skin === 'treasure' ? 2 : 1));
function boardInfo(mon) { if (!mon.naval) return undefined; const need = mon.type === 'ghost' ? 3 : HOOK_NEED(mon.e.v);
  if (!P.up.hooks) return 'NEEDS GRAPPLING HOOKS'; if (P.up.hooks < need) return 'NEEDS HOOKS ' + ['', 'I', 'II', 'III'][need];
  if (mon.type === 'ghost' && !P.relics.bane) return "HOOKS PASS THROUGH HER: FIND DRAUGR'S BANE"; if (mon.type === 'ghost' && !isNight()) return 'ONLY AT NIGHT'; return null; }
function prizeChoice(mon) { state = 'prize'; const full = P.prizes.length >= 3, tn = SHIP_TIERS[mon.e.v].name, ghost = mon.type === 'ghost';
  $('prizeText').innerHTML = (ghost ? 'The draugr fall back into the mist. The ghost ship is yours to take.' : 'The crew of the ' + mon.name + ' throw down their axes.') + '<br><br>Strip her hold and scuttle her, or put a prize crew aboard and send her to ' + homeHarbor().name + ' (sail her or sell her there).';
  $('prizeClaim').disabled = full; $('prizeClaim').textContent = full ? 'CLAIM (your 3 moorings are full)' : 'CLAIM THE ' + (ghost ? 'GHOST SHIP' : tn.toUpperCase());
  $('hud').classList.add('hidden'); $('prize').classList.remove('hidden'); sfx.horn();
  const finish = () => { $('prize').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; hud(); save(); };
  $('prizePlunder').onclick = () => { finish(); const lv = mon.lv; killMon(mon); reward({ w: Math.round(10 * Math.pow(1.6, lv)), i: Math.round(4 + lv * 4), g: Math.round(30 * Math.pow(1.6, lv) * (ghost ? 3 : 1)) }, mon.x, mon.top + 2, mon.z); say('You strip her hold to the keel and scuttle her!', 3.5); if (!ghost && Math.random() < 0.45) setTimeout(() => giveMap(), 1500); };
  $('prizeClaim').onclick = () => { if (P.prizes.length >= 3) return; finish(); P.prizes.push({ tier: mon.e.v, skin: mon.skinKey || 'pats' }); P.kills++; if (mon.fleet) fleetDown(mon.fleet); removeMon(mon);
    reward({ g: Math.round(10 * Math.pow(1.6, mon.lv)) }, boat.x, 4, boat.z); say((ghost ? 'A prize crew takes the ghost ship' : 'A prize crew takes the ' + tn) + ' to ' + homeHarbor().name + '. Sail her or sell her at the harbour.', 4.5); sfx.horn(); };
}

// ---------- treasure maps: an ✕ on a real island; land there and dig ----------
const LANDMARK = { home: ['🌲', 'the lone pine'], frost: ['🧊', 'the ice rock'], storm: ['🪨', 'the black rock'], mist: ['🗿', 'the standing stone'], warm: ['🌴', 'the leaning palm'] };
function giveMap(kind = null) { if (P.maps.length >= 3) { say('You find another treasure map, but your sea chest already holds three.', 3); return false; }
  const relic = kind === 'relic', taken = new Set(P.maps.map((m) => m.isl)), isl0 = world.islands;
  const cands = isl0.map((isl, i) => ({ isl, i, d: Math.hypot(isl.x - boat.x, isl.z - boat.z) })).filter(({ isl, i }) => isl.harbor == null && isl.R >= 7 && !isl.volcano && !taken.has(i) && (relic ? isl.region === 'mist' : true)).sort((a, b) => Math.abs(a.d - 320) - Math.abs(b.d - 320)).slice(0, 8);
  for (let tries = 0; tries < 12 && cands.length; tries++) { const { isl, i } = cands[(Math.random() * cands.length) | 0];
    for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, cr = isl.R * isl.shape(a), wa = a + isl.rot, lx = isl.x + Math.cos(wa) * (cr + 9), lz = isl.z + Math.sin(wa) * (cr + 9);
      if (world.blockAt(lx, lz, 3) || Math.abs(lx) > HALF - 25 || Math.abs(lz) > HALF - 25) continue;
      const ri = (n) => (Math.random() * n) | 0; let mk, cell, dec; do { mk = [ri(5), ri(4)]; cell = [ri(5), ri(4)]; dec = [ri(5), ri(4)]; } while (Math.abs(mk[0] - cell[0]) + Math.abs(mk[1] - cell[1]) < 2 || (dec[0] === mk[0] && dec[1] === mk[1]) || (dec[0] === cell[0] && dec[1] === cell[1]));
      const [icon, name] = LANDMARK[isl.region] || LANDMARK.home, dx = cell[0] - mk[0], dy = cell[1] - mk[1], p = (n) => n + ' pace' + (n === 1 ? '' : 's'), parts = [];
      if (dx) parts.push(p(Math.abs(dx)) + (dx > 0 ? ' east' : ' west')); if (dy) parts.push(p(Math.abs(dy)) + (dy > 0 ? ' south' : ' north'));
      const clue = (relic ? 'Where the drowned king sleeps: from ' : 'From ') + name + ', walk ' + parts.join(' and ') + '.';
      const m = { isl: i, lx, lz, kind: relic ? 'relic' : 'gold', region: isl.region, cell, clue, marks: [{ c: mk, icon }, { c: dec, icon: ['🦴', '⚓', '🐚'][ri(3)] }] };
      P.maps.push(m); save(); sfx.coins();
      say((relic ? '📜 A map scratched on bone!' : '📜 A treasure map!') + ' An ✕ marks an island in the ' + rname(isl.region) + ', ' + compassName(lx - boat.x, lz - boat.z) + ' of here. Sail to it and LAND.', 5);
      return true; } }
  return false; }
function startDig(m) { fishing = { s: { x: m.lx, z: m.lz } }; boat.wp = null; $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy');
  minis.dig({ map: m, risk: m.region === 'mist' ? 0.2 : 0.13 }, (res) => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); fishing = null; boat.grace = 2; const k = P.tier + 1;
    if (res.result === 'found') { P.maps.splice(P.maps.indexOf(m), 1);
      if (m.kind === 'relic') { P.relics.bane = true; reward({ g: 80 * k }, m.lx, 3, m.lz); say("🗝 DRAUGR'S BANE! With this rune-carved relic your grappling hooks can bite into a ghost ship (Grappling Hooks III, at night).", 6); sfx.horn(); }
      else { reward({ w: Math.round(rnd(20, 40) * k), i: Math.round(rnd(8, 18) * k), g: Math.round(rnd(90, 180) * k) }, m.lx, 3, m.lz); say('💰 You dig up a chest of hacksilver and gold!', 4); }
      save(); }
    else if (res.result === 'guardian') { const v = clamp(Math.round(P.tier - 1), 0, 2); let first = null; for (let n = 0; n < 2; n++) { const a = Math.random() * 6.28, mon = spawnMon({ type: 'crab', v, lv: MLV.crab[v] }, m.lx + Math.sin(a) * 9, m.lz + Math.cos(a) * 9); mon.state = 'chase'; if (!first) first = mon; }
      warn('🦀 Giant crabs burst out of the sand!', 3); if (first) startBattle(first, false); }
    else say('The tide turns. The treasure stays buried, and your map still shows the way.', 3.5); }); }

// ---------- harbours, upgrades ----------
let atHarbor = null;
function openHarbor(h) { state = 'harbor'; atHarbor = h; P.home = h.idx; boat.v = 0; boat.wp = null; $('hud').classList.add('hidden'); $('harbor').classList.remove('hidden'); $('hbName').textContent = h.name.toUpperCase();
  let txt = 'Welcome to ' + h.name + '.'; if (P.res.f > 0) { const g = P.res.f * (3 + P.tier); txt += ' Your catch of ' + P.res.f + ' 🐟 sold for ' + g + ' 🪙.'; P.res.g += g; P.res.f = 0; sfx.coins(); } $('hbText').textContent = txt; const last = !!tut && tut.i === TUT.length - 1; $('hbTip').classList.toggle('hidden', !last); if (last) tutEnd(); save(); drawHarbor(); sfx.horn(); }
const can = (c) => P.res.w >= c[0] && P.res.i >= c[1] && P.res.g >= c[2];
const costHtml = (c) => [['🪵', c[0], P.res.w], ['⚙️', c[1], P.res.i], ['🪙', c[2], P.res.g]].filter(([, n]) => n > 0).map(([ic, n, have]) => '<span class="' + (have < n ? 'no' : '') + '">' + n + ic + '</span>').join(' ');
function drawHarbor() { $('hbRes').innerHTML = `<span>🪵 ${P.res.w}</span><span>⚙️ ${P.res.i}</span><span>🪙 ${P.res.g}</span><span>❤️ ${Math.ceil(P.hp)}/${maxHp()}</span>`; const list = $('hbList'); list.innerHTML = '';
  const miss = maxHp() - P.hp; if (miss > 0.5) { const c = [Math.ceil(miss / 10), 0, Math.ceil(miss / 6)]; const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">🔨</div><div class="tx"><b>Repair the hull</b><div>${Math.ceil(miss)} damage to mend</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'REPAIR'; b.disabled = !can(c); b.onclick = () => { if (!can(c)) return; P.res.w -= c[0]; P.res.g -= c[2]; P.hp = maxHp(); sfx.pickup(); drawHarbor(); hud(); save(); }; d.appendChild(b); list.appendChild(d); }
  if (P.wreck) { const c = [0, 0, wreckCost()]; const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">☠</div><div class="tx"><b>Hire a salvage crew</b><div>They raise your wreck and bring back ${wreckSum(P.wreck.res)}</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'RAISE'; b.disabled = !can(c); b.onclick = () => { if (!can(c) || !P.wreck) return; P.res.g -= c[2]; const r = P.wreck.res; for (const k of ['w', 'i', 'g', 'f']) P.res[k] += r[k] || 0; P.wreck = null; placeWreck(); sfx.coins(); drawHarbor(); hud(); save(); }; d.appendChild(b); list.appendChild(d); }
  P.prizes.forEach((pz, i) => { const t = SHIP_TIERS[pz.tier], val = shipValue(pz), d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<div class="ic">${pz.skin === 'ghost' ? '👻' : pz.skin === 'treasure' ? '💰' : '⚓'}</div><div class="tx"><b>Moored here: a ${t.name}</b><div>In ${skinLabel(pz.skin)}. Sail her (your ${T().name} waits here in her place) or sell her.${pz.skin === 'ghost' ? ' Night monsters hardly see a ghost hull.' : ''}</div><div class="cost"><span>Sells for ${val}🪙</span></div></div>`;
    const col = document.createElement('div'); col.className = 'btn2'; const b1 = document.createElement('button'); b1.textContent = 'SAIL HER'; b1.onclick = () => { const cur = { tier: P.tier, skin: P.skin }; P.prizes[i] = cur; P.tier = pz.tier; P.skin = pz.skin; P.hp = maxHp(); rebuildShip(); sfx.horn(); drawHarbor(); hud(); save(); };
    const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = 'SELL'; b2.onclick = () => { P.res.g += val; P.prizes.splice(i, 1); sfx.coins(); drawHarbor(); hud(); save(); };
    col.append(b1, b2); d.appendChild(col); list.appendChild(d); });
  if (P.tier < 4) { const c = TIER_COST[P.tier + 1], nt = SHIP_TIERS[P.tier + 1]; const d = document.createElement('div'); d.className = 'card ship'; d.innerHTML = `<div class="ic">🐉</div><div class="tx"><b>Build a ${nt.name}</b><div>Ship size ${P.tier + 2} of 5 · ${nt.crew} crew · hull ${Math.round(100 * Math.pow(1.75, P.tier + 1))} · stronger seas</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'BUILD'; b.disabled = !can(c); b.onclick = () => { if (!can(c)) return; P.res.w -= c[0]; P.res.i -= c[1]; P.res.g -= c[2]; P.tier++; P.skin = 'pats'; P.hp = maxHp(); rebuildShip(); sfx.horn(); drawHarbor(); save(); }; d.appendChild(b); list.appendChild(d); }
  for (const [k, u] of Object.entries(UPG)) { const lv = P.up[k], d = document.createElement('div'); d.className = 'card'; const capped = lv >= u.max, locked = !capped && lv >= P.tier + 1, c = capped ? null : u.cost[lv];
    d.innerHTML = `<div class="ic">${u.icon}</div><div class="tx"><b>${u.name}</b><span class="pips">${'◆'.repeat(lv)}${'◇'.repeat(u.max - lv)}</span><div>${capped ? 'Fully upgraded' : u.desc[lv] + (u.eff ? ' · ' + u.eff : '')}</div><div class="cost">${capped ? '' : locked ? '<span class="no">Needs a bigger ship</span>' : costHtml(c)}</div></div>`;
    if (!capped) { const b = document.createElement('button'); b.textContent = 'BUY'; b.disabled = locked || !can(c); b.onclick = () => { if (locked || !can(c)) return; P.res.w -= c[0]; P.res.i -= c[1]; P.res.g -= c[2]; P.up[k]++; if (k === 'armor') P.hp += maxHp() - Math.round(maxHp() / (1 + 0.25 * P.up.armor) * (1 + 0.25 * (P.up.armor - 1))); P.hp = Math.min(P.hp, maxHp()); rebuildShip(); sfx.pickup(); drawHarbor(); save(); }; d.appendChild(b); }
    list.appendChild(d); } }
$('hbSail').onclick = () => { $('harbor').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; const h = atHarbor; if (h) { boat.x = h.dock.x + Math.cos(h.dir) * 10; boat.z = h.dock.z + Math.sin(h.dir) * 10; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); } atHarbor = null; setThrottle(0, true); helm.angle = 0; hud(); say('Fair winds! Tap HALF or FULL to set sail.'); };

// ---------- lairs (legend bosses) ----------
const LAIR_NAMES = { kraken: 'The Kraken', jorm: 'Jormungandr', rlyeh: 'The Elder One' }, LAIR_NEED = { kraken: 2, jorm: 3, rlyeh: 4 };
// the legends always rise. With a big enough ship it is the legend itself. In a smaller ship it is usually one of its
// young (a hard but fair fight, half again the gold, not a legend slain), now and then the legend itself, who will wreck
// you: flee, and it sinks back into the deep once you are away. Stay in a lair and another rises every minute or two,
// each wave a little tougher (and richer), and the chance of the legend itself grows. Leaving the lair resets the waves.
// Once a legend is slain its young still rise there for anyone who wants the gold.
const YOUNG_NAMES = { kraken: 'Kraken Hatchling', jorm: "Jormungandr's Whelp", rlyeh: 'Spawn of the Elder One' }, YOUNG_SCALE = { kraken: 3.5, jormungandr: 0.7, elder: 1.1 }, PAPA_CHANCE = 0.2;
let lairWarned = {}; const lairCool = {}, lairWave = {};
function lairSpawn(L, big) { const w = (lairWave[L.key] = (lairWave[L.key] || 0) + 1), slain = L.beaten || !!P.legends[L.key];
  if (!slain && (big || Math.random() < Math.min(0.6, PAPA_CHANCE + 0.07 * (w - 1)))) { const lv = MLV[L.monster][0], mon = spawnMon({ type: L.monster, v: 0, lv }, L.x, L.z, { boss: true, lair: L.key, scale: L.monster === 'kraken' ? 17.5 : L.monster === 'elder' ? 1.5 : 1 }); mon.name = LAIR_NAMES[L.key]; mon.papa = !big;
    warn('⚠ ' + LAIR_NAMES[L.key].toUpperCase() + ' RISES! ⚠' + (big ? '' : '<br>Your ' + T().name + ' is far too small: FLEE!'), big ? 4 : 6); sfx.horn(); sfx.thunder(); flash = 1; return; }
  const lv = clamp(P.tier + 1 + 0.4 * (w - 1), 1, MLV[L.monster][0] - 0.3), mon = spawnMon({ type: L.monster, v: 0, lv }, L.x, L.z, { lair: L.key, scale: YOUNG_SCALE[L.monster] || 0.6 });
  Object.assign(mon, { name: YOUNG_NAMES[L.key], young: L.key, state: 'rise', rise: 0, dive: 1, riseK: 0.6, hunt: true });
  warn('⚠ ' + YOUNG_NAMES[L.key].toUpperCase() + ' RISES! ⚠<br>' + (w > 1 ? 'The deep stirs again: wave ' + w + ', stronger than the last.' : 'Only a young one…'), 4); sfx.horn(); }
function updateLairs() { for (const L of world.lairs) { const d = Math.hypot(boat.x - L.x, boat.z - L.z), big = P.tier >= LAIR_NEED[L.key], slain = L.beaten || !!P.legends[L.key];
    if (d < 95 && !lairWarned[L.key]) { lairWarned[L.key] = true; say(slain ? L.name + ': ' + LAIR_NAMES[L.key] + ' is slain, but its young still stir here.' : big ? 'You enter ' + L.name + '. ' + LAIR_NAMES[L.key] + ' stirs below…' : L.name + ': ' + LAIR_NAMES[L.key] + ' sleeps below. It takes a ' + SHIP_TIERS[LAIR_NEED[L.key]].name + ' to face it; in a ' + T().name + ', pray only its young wake…', 5); }
    if (d > 130) { lairWarned[L.key] = false; lairWave[L.key] = 0; }
    for (const m of mons) if (m.papa && m.lair === L.key && !m.dead && !inFight(m) && d > 120) { removeMon(m); lairCool[L.key] = time + 60; say(LAIR_NAMES[L.key] + ' sinks back into the deep.', 3); }
    if (!battle && !(lairCool[L.key] > time) && (d < 40 || (lairWave[L.key] > 0 && d < 95)) && !mons.some((m) => !m.dead && m.lair === L.key)) lairSpawn(L, big); } }

// ---------- sinking, saving ----------
function sink() { if (state !== 'play') return; state = 'sunk'; clearBroadside(); clearLegend(); if (boat.air) { boat.air = null; if (ship.mask) ship.mask.visible = true; } battle = null; fishing = null; minis.close(); const lost = {}; for (const k of ['w', 'i', 'g', 'f']) { lost[k] = Math.floor(P.res[k] / 2); P.res[k] -= lost[k]; }
  const old = P.wreck, any = lost.w + lost.i + lost.g + lost.f > 0; EV.ambush = null; if (any) { P.wreck = { x: boat.x, z: boat.z, res: lost }; placeWreck(); }
  $('sunkText').innerHTML = 'Your ship goes down beneath the waves. The gods send you back to ' + homeHarbor().name + ' with a new hull. ' + (any ? 'Half your cargo went down with the wreck: ' + wreckSum(lost) + '.<br><br>Sail back to the ☠ on the map and SALVAGE it to get it all back, or hire a salvage crew at any harbour.' + (old ? ' Your older wreck is lost to the deep.' : '') : 'Your hold was empty, so nothing was lost.'); $('hud').classList.add('hidden'); $('sunk').classList.remove('hidden'); sfx.over(); setBattle(false); }
$('sunkBtn').onclick = () => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); const h = homeHarbor(); P.hp = maxHp(); setThrottle(0, true); helm.angle = 0; boat.x = h.dock.x + Math.cos(h.dir) * 10; boat.z = h.dock.z + Math.sin(h.dir) * 10; boat.v = 0; boat.wp = null; for (const m of [...mons]) removeMon(m); $('sunk').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; hud(); save(); };
function winGame() { P.won = true; state = 'won'; $('hud').classList.add('hidden'); $('won').classList.remove('hidden'); $('wonText').innerHTML = 'The Kraken, Jormungandr and the Elder One have fallen. Every fjord sings of Pat, ruler of the monster sea.<br><br>' + P.kills + ' foes slain.'; sfx.horn(); save(); }
$('wonBtn').onclick = () => { $('won').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; };
const SAVE = 'pr_save';
function homeHarbor() { return world.harbors.find((h) => h.idx === P.home) || world.harbors[0]; }
function save() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 1, tier: P.tier, up: P.up, res: P.res, hp: P.hp, legends: P.legends, kills: P.kills, home: P.home, won: P.won, tod: P.tod, x: boat.x, z: boat.z, yaw: boat.yaw, wreck: P.wreck, prizes: P.prizes, maps: P.maps, relics: P.relics, skin: P.skin })); } catch { /* ignore */ } }
// a save (from this browser, or from a save code someone pasted) is trusted only as numbers and names from the game's own
// lists: anything else is clamped or dropped, so a doctored code cannot slip markup or script into the page
function cleanSave(s) {
  const num = (v, lo, hi, d = lo) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d), int = (v, lo, hi, d = lo) => Math.round(num(v, lo, hi, d));
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), arr = (v) => (Array.isArray(v) ? v : []);
  const SKINS = ['pats', 'ghost', 'treasure', ...RAIDER_PALS.map((p) => p.name)], skin = (v) => (SKINS.includes(v) ? v : 'pats');
  const ICONS = [...Object.values(LANDMARK).map((l) => l[0]), '🦴', '⚓', '🐚'], text = (v) => String(v ?? '').replace(/[<>&"'`]/g, '').slice(0, 200);
  const res = (r) => { r = obj(r); return { w: int(r.w, 0, 1e7), i: int(r.i, 0, 1e7), g: int(r.g, 0, 1e7), f: int(r.f, 0, 1e7) }; };
  const cell = (c) => [int(arr(c)[0], 0, 4), int(arr(c)[1], 0, 3)], E = HALF - 20, nIsl = world.islands.length;
  const up = {}; for (const k in P.up) up[k] = int(obj(s.up)[k], 0, UPG[k] ? UPG[k].max : 3);
  const legends = {}; for (const L of world.lairs) if (obj(s.legends)[L.key] === true) legends[L.key] = true;
  const w = obj(s.wreck), h = world.harbors[int(s.home, 0, world.harbors.length - 1)];
  const p = { tier: int(s.tier, 0, SHIP_TIERS.length - 1), up, res: res(s.res), hp: num(s.hp, 1, 1e6, 1e6), legends, kills: int(s.kills, 0, 1e7), home: h.idx, won: s.won === true, tod: num(s.tod, 0, 1, 0.2),
    wreck: w.res ? { x: num(w.x, -E, E, 0), z: num(w.z, -E, E, 0), res: res(w.res) } : null,
    prizes: arr(s.prizes).slice(0, 3).map((q) => ({ tier: int(obj(q).tier, 0, SHIP_TIERS.length - 1), skin: skin(obj(q).skin) })),
    maps: arr(s.maps).slice(0, 3).filter((m) => obj(m).isl != null).map((m) => ({ isl: int(m.isl, 0, nIsl - 1), lx: num(m.lx, -E, E, 0), lz: num(m.lz, -E, E, 0), kind: m.kind === 'relic' ? 'relic' : 'gold', region: REGIONS[m.region] ? m.region : 'home',
      cell: cell(m.cell), clue: text(m.clue), marks: arr(m.marks).slice(0, 2).map((k) => ({ c: cell(obj(k).c), icon: ICONS.includes(obj(k).icon) ? k.icon : '🪨' })) })),
    relics: obj(s.relics).bane === true ? { bane: true } : {}, skin: skin(s.skin) };
  const home = (a) => (a === 'x' ? h.dock.x + Math.cos(h.dir) * 12 : h.dock.z + Math.sin(h.dir) * 12);
  return { p, x: num(s.x, -E, E, home('x')), z: num(s.z, -E, E, home('z')), yaw: num(s.yaw, -1e3, 1e3, 0) }; }
function load() { try { const raw = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (!raw || raw.v !== 1) return false; const s = cleanSave(raw); Object.assign(P, s.p); P.hp = Math.min(P.hp, maxHp()); boat.x = s.x; boat.z = s.z; boat.yaw = s.yaw; for (const L of world.lairs) if (P.legends[L.key]) L.beaten = true; return true; } catch { return false; } }

// ---------- minimap and chart ----------
const mapEl = $('map'), mapCtx = mapEl.getContext('2d'), chartEl = $('chartCv'), chartCtx = chartEl.getContext('2d');
function drawMap(cv, g, full) { const dpr = Math.min(2, devicePixelRatio || 1), S = Math.round(cv.clientWidth * dpr) || 1; if (cv.width !== S) cv.width = cv.height = S; const VW = full ? chartView : MINI_VIEW, k = (S / WORLD) * VW.zoom, P2 = (x, z) => [S / 2 + (x - VW.cx) * k, S / 2 + (z - VW.cz) * k];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.save(); if (!full) { g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 6.2832); g.clip(); }
  { const [ox, oy] = P2(-HALF, -HALF); g.imageSmoothingEnabled = true; g.drawImage(world.mapCanvas, ox, oy, WORLD * k, WORLD * k); } g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = '#ffffff22'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { const v = -HALF + (i * WORLD) / 4, [gx] = P2(v, 0), [, gy] = P2(0, v); g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, S); g.moveTo(0, gy); g.lineTo(S, gy); g.stroke(); }
  const fs = (full ? 18 : 10) * dpr; g.font = fs + 'px serif';
  for (const h of world.harbors) { const [x, y] = P2(h.dock.x, h.dock.z); g.fillText('⚓', x, y); if (full) { g.font = 'bold ' + 11 * dpr + 'px Georgia'; g.fillStyle = '#f2e6c8'; g.fillText(h.name, x, y + 14 * dpr); g.font = fs + 'px serif'; } }
  for (const L of world.lairs) { const [x, y] = P2(L.x, L.z); g.globalAlpha = L.beaten ? 0.4 : 1; g.fillText(L.beaten ? '✔' : L.icon, x, y); g.globalAlpha = 1; }
  for (const w of world.wrecks) { if (w.looted) continue; const [x, y] = P2(w.x, w.z); g.fillStyle = '#c8a070'; g.fillRect(x - 1.5 * dpr, y - 1.5 * dpr, 3 * dpr, 3 * dpr); }
  g.font = 'bold ' + (full ? 20 : 13) * dpr + 'px Georgia'; for (const mp of P.maps) { const [x, y] = P2(mp.lx, mp.lz); g.fillStyle = '#1a0e06'; g.fillText('✕', x + 1 * dpr, y + 1 * dpr); g.fillStyle = mp.kind === 'relic' ? '#d08aff' : '#ff4a3a'; g.fillText('✕', x, y); } g.font = fs + 'px serif';
  const fog = wx.type === 'fog' && wx.k > 0.5; for (const s of spots) { const [x, y] = P2(s.x, s.z); g.fillStyle = s.kind === 'treasure' ? '#ffd24a' : s.kind === 'flotsam' ? '#c8a070' : '#bfe6ff'; g.beginPath(); g.arc(x, y, 1.8 * dpr, 0, 6.28); g.fill(); }
  for (const mon of mons) { if (mon.dead) continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (fog && d > 45 && !mon.boss) continue; const [x, y] = P2(mon.x, mon.z); g.fillStyle = mon.treasure ? '#ffd24a' : mon.fleet ? '#ff4a3a' : mon.naval ? '#ff9a3a' : danger(mon.lv); g.beginPath(); g.arc(x, y, (mon.boss ? 4 : mon.treasure ? 3.6 : 2.2) * dpr, 0, 6.28); g.fill(); }
  for (const s of spouts) { const [x, y] = P2(s.x, s.z); g.fillText('🌪', x, y); }
  g.fillStyle = '#e8f6ff'; for (const pod of pods) for (const Mb of pod.members) { const [x, y] = P2(Mb.x, Mb.z); g.fillRect(x - 1 * dpr, y - 1 * dpr, 2 * dpr, 2 * dpr); }
  if (EV.whirl) { const [x, y] = P2(EV.whirl.x, EV.whirl.z); g.fillText('🌀', x, y); } { const pa = aur.pillarAt; if (pa) { const [x, y] = P2(pa.x, pa.z); g.fillText('🌈', x, y); } } if (P.wreck) { const [x, y] = P2(P.wreck.x, P.wreck.z); g.fillText('☠', x, y); }
  if (boat.wp) { const [x, y] = P2(boat.wp.x, boat.wp.z); g.strokeStyle = '#ffd24a'; g.lineWidth = 2 * dpr; const q = 4 * dpr; g.beginPath(); g.moveTo(x - q, y - q); g.lineTo(x + q, y + q); g.moveTo(x + q, y - q); g.lineTo(x - q, y + q); g.stroke(); const [bx, by] = P2(boat.x, boat.z); g.setLineDash([3 * dpr, 4 * dpr]); g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
  const [bx, by] = P2(boat.x, boat.z); g.save(); g.translate(bx, by); g.rotate(-boat.yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1; const s2 = (full ? 7 : 5) * dpr; g.beginPath(); g.moveTo(0, -s2 * 1.4); g.lineTo(s2, s2); g.lineTo(-s2, s2); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.restore(); }
// the sea chart: pinch to zoom, drag to look around, tap to set a course; the corner map always shows the whole sea
const chartView = { zoom: 1, cx: 0, cz: 0 }, MINI_VIEW = { zoom: 1, cx: 0, cz: 0 }; const cptr = new Map(); let cDrag = false, cPinch = 0, cDown = null;
function chartClamp() { chartView.zoom = clamp(chartView.zoom, 1, 8); const lim = HALF - HALF / chartView.zoom; chartView.cx = clamp(chartView.cx, -lim, lim); chartView.cz = clamp(chartView.cz, -lim, lim); }
function chartWorld(x, y) { const r = chartEl.getBoundingClientRect(), k = (r.width / WORLD) * chartView.zoom; return [chartView.cx + (x - r.left - r.width / 2) / k, chartView.cz + (y - r.top - r.height / 2) / k]; }
function closeChart() { $('chart').classList.add('hidden'); state = 'play'; cptr.clear(); }
function mapTap(cv, e) { const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * WORLD - HALF, z = ((e.clientY - r.top) / r.height) * WORLD - HALF; setCourse(x, z); say('Course set. Turn the wheel any time; let go and the helmsman steers back to the mark.'); }
let mapTapT = 0; mapEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (state === 'play' && !battle && !fishing) { mapTapT = performance.now(); mapTap(mapEl, e); } });
mapEl.addEventListener('touchend', (e) => { if (performance.now() - mapTapT < 600 || state !== 'play' || battle || fishing) return; const t = e.changedTouches[0]; if (t) { e.preventDefault(); mapTap(mapEl, { clientX: t.clientX, clientY: t.clientY }); } }, { passive: false });
$('chartBtn').onclick = () => { if (state !== 'play' || battle || fishing) return; if (tut) tut.chart = true; state = 'chart'; chartView.zoom = 1; chartView.cx = 0; chartView.cz = 0; cptr.clear(); $('chart').classList.remove('hidden'); drawMap(chartEl, chartCtx, true); };
chartEl.addEventListener('pointerdown', (e) => { e.preventDefault(); try { chartEl.setPointerCapture(e.pointerId); } catch { /* ignore */ } cptr.set(e.pointerId, [e.clientX, e.clientY]); if (cptr.size === 1) { cDown = { x: e.clientX, y: e.clientY, t: performance.now() }; cDrag = false; } else { cDrag = true; const [a, b] = [...cptr.values()]; cPinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
chartEl.addEventListener('pointermove', (e) => { if (!cptr.has(e.pointerId)) return; const prev = cptr.get(e.pointerId); cptr.set(e.pointerId, [e.clientX, e.clientY]); const r = chartEl.getBoundingClientRect();
  if (cptr.size >= 2) { const [a, b] = [...cptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (cPinch > 0 && d > 0) { const [wx, wz] = chartWorld(mx, my); chartView.zoom *= d / cPinch; chartClamp(); const k2 = (r.width / WORLD) * chartView.zoom; chartView.cx = wx - (mx - r.left - r.width / 2) / k2; chartView.cz = wz - (my - r.top - r.height / 2) / k2; chartClamp(); } cPinch = d; drawMap(chartEl, chartCtx, true); return; }
  if (cDown && Math.hypot(e.clientX - cDown.x, e.clientY - cDown.y) > 10) cDrag = true; if (cDrag) { const k = (r.width / WORLD) * chartView.zoom; chartView.cx -= (e.clientX - prev[0]) / k; chartView.cz -= (e.clientY - prev[1]) / k; chartClamp(); drawMap(chartEl, chartCtx, true); } });
chartEl.addEventListener('pointerup', (e) => { if (!cptr.has(e.pointerId)) return; cptr.delete(e.pointerId); if (cptr.size < 2) cPinch = 0; if (cptr.size === 0) { if (!cDrag && cDown && performance.now() - cDown.t < 500) { const [x, z] = chartWorld(e.clientX, e.clientY); setCourse(x, z); say('Course set. Turn the wheel any time; let go and the helmsman steers back to the mark.'); drawMap(chartEl, chartCtx, true); setTimeout(closeChart, 350); } cDown = null; } });
chartEl.addEventListener('pointercancel', (e) => { cptr.delete(e.pointerId); if (cptr.size < 2) cPinch = 0; });
chartEl.addEventListener('wheel', (e) => { e.preventDefault(); const [wx, wz] = chartWorld(e.clientX, e.clientY), r = chartEl.getBoundingClientRect(); chartView.zoom *= Math.exp(-e.deltaY * 0.0015); chartClamp(); const k2 = (r.width / WORLD) * chartView.zoom; chartView.cx = wx - (e.clientX - r.left - r.width / 2) / k2; chartView.cz = wz - (e.clientY - r.top - r.height / 2) / k2; chartClamp(); drawMap(chartEl, chartCtx, true); }, { passive: false });
$('chartClose').onclick = closeChart;


// ---------- tags and pops ---------- (an enemy in a broadside has her bar at the top instead)
function updateTags(dt) { for (const mon of mons) { const t = mon.tag; if (mon.dead || state === 'title' || (battle && battle.broad && battle.broad.foes.includes(mon))) { t.style.display = 'none'; continue; } const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); const sp = d < 90 && mon.rise > 0.5 ? toScreen(mon.x, mon.g.position.y + mon.top + 1.2, mon.z) : null; if (!sp || (wx.type === 'fog' && wx.k > 0.5 && d > 40)) { t.style.display = 'none'; continue; }
    t.style.display = 'block'; t.style.left = sp[0] + 'px'; t.style.top = sp[1] + 'px'; const html = '<span style="color:' + (mon.naval ? '#ffb03a' : danger(mon.lv)) + '">' + mon.name + ' · ' + (mon.lv - P.tier > 1.6 ? '💀 Lv ' + (Math.round(mon.lv) + 1) : 'Lv ' + (Math.round(mon.lv) + 1)) + '</span>' + (mon.hp < mon.maxHp ? '<i><b style="width:' + clamp(mon.hp / mon.maxHp, 0, 1) * 100 + '%"></b></i>' : ''); if (t._h !== html) { t.innerHTML = html; t._h = html; } }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; const sp = toScreen(p.x, p.y + p.t * 2.5, p.z); if (!sp || p.t > p.life) { p.el.remove(); pops.splice(i, 1); continue; } p.el.style.left = sp[0] + 'px'; p.el.style.top = sp[1] + 'px'; p.el.style.opacity = Math.min(1, (p.life - p.t) * 2); } }

// ---------- ship movement ----------
function updateBoat(dt) {
  if (boat.air) { const A = boat.air; flyStep(A, boat, dt); boat.y = ocean.heightAt(boat.x, boat.z) + A.h; boat.pitch = A.pitch; boat.roll = A.roll; boat.v *= 1 - dt * 0.5;
    ship.g.position.set(boat.x, boat.y, boat.z); ship.g.rotation.y = boat.yaw; ship.body.rotation.x = -boat.pitch; ship.body.rotation.z = boat.roll; ship.anim(dt, { speed: 0, time, night: isNight(), sail: boat.sailK ?? 0 });
    if (Math.random() < dt * 14) foam.add(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), { spray: true, y: boat.y - 0.5, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(-2, 1), s: 0.8, life: 0.8, a: 0.7 });
    if (A.done) landBoat(A); return; }
  if (boat.airCd > 0) boat.airCd -= dt;
  const t = T(); let thr = boat.throttle || 0, want = null;
  const kTurn = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), kThr = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
  if (kThr && thrKeyOk()) { thrHold += dt; if (thrHold > 0.4) { thrHold -= 0.22; thrKeyStep(kThr); } } else thrHold = 0; // held: the next notch every 0.22 s after 0.4 s
  if (state === 'play' && !battle && !fishing) { if (kTurn) helm.angle = clamp(helm.angle + kTurn * dt * 2.2, -HMAX, HMAX);
    if (boat.wp) { const dx = boat.wp.x - boat.x, dz = boat.wp.z - boat.z, d = Math.hypot(dx, dz);
      if (d < 4 + t.L * 0.3) { const au = autoOn() && boat.auto.h; boat.wp = null; boat.auto = null; courseMark.visible = false; setThrottle(0, true); if (au) openHarbor(au); else say('Arrived. Sails furled.'); }
      else { courseMark.position.set(boat.wp.x, ocean.heightAt(boat.wp.x, boat.wp.z) + 0.2, boat.wp.z); courseMark.rotation.z += dt; thr = Math.min(thr, clamp(d / 18, 0.25, 1));
        // hands off the wheel: the helmsman turns it back toward the mark (and around land)
        if (!helm.held && !kTurn) { want = steerAround(Math.atan2(dx, dz), Math.min(d, 26 + t.L)); const target = -clamp(angDiff(want, boat.yaw) * 1.8, -1, 1) * HMAX; helm.angle += clamp(target - helm.angle, -dt * 3.5, dt * 3.5); } } } }
  else thr = 0;
  // backing water (BACK), the wheel steers like reversing a car
  const r0 = helm.angle / HMAX, rudder = Math.sign(r0) * Math.pow(Math.abs(r0), 1.4), tr = turnRate() * (0.35 + 0.65 * Math.min(1, Math.abs(boat.v) / (t.speed * 0.6))); boat.yaw += -rudder * tr * dt * (boat.v < -0.3 ? -1 : 1) + boat.spin * dt; boat.spin *= 1 - dt * 1.2;
  boat.sailK = (boat.sailK ?? 0) + (clamp((thr - 0.3) / 0.45, 0, 1) - (boat.sailK ?? 0)) * Math.min(1, dt * 1.5);
  const top = topSpeed() * (1 - (LOOK[wx.type] === 'storm' ? 0.15 * wx.k : 0)); const acc = 3.2 * (1 + 0.15 * P.up.oars); boat.v += clamp(thr * top - boat.v, -acc * 1.2 * dt, acc * dt); boat.boost = Math.max(0, boat.boost - dt); boat.thor = Math.max(0, boat.thor - dt); boat.curse = Math.max(0, (boat.curse || 0) - dt);
  // the crew patch the hull at sea (Oars & Crew): out of battle, once nothing has hit you for 8 s
  boat.mending = state === 'play' && !!P.up.oars && !battle && !boat.bifrost && P.hp < maxHp() && time - (boat.lastHit ?? -99) > 8;
  if (boat.mending) { P.hp = Math.min(maxHp(), P.hp + maxHp() * MEND[P.up.oars] * dt); boat.hudT = (boat.hudT || 0) - dt; if (boat.hudT <= 0) { boat.hudT = 0.25; hud(); } }
  if (boat.bifrost > 0) { boat.bifrost = Math.max(0, boat.bifrost - dt); if (!battle && P.hp < maxHp()) { P.hp = Math.min(maxHp(), P.hp + maxHp() * 0.02 * dt); boat.hudT = (boat.hudT || 0) - dt; if (boat.hudT <= 0) { boat.hudT = 0.25; hud(); } } } boat.grace = Math.max(0, boat.grace - dt);
  let nx = boat.x + Math.sin(boat.yaw) * boat.v * dt, nz = boat.z + Math.cos(boat.yaw) * boat.v * dt;
  const bl = world.blockAt(nx, nz, t.B * 0.5 + t.L * 0.18) || world.blockAt(nx + Math.sin(boat.yaw) * t.L * 0.4, nz + Math.cos(boat.yaw) * t.L * 0.4, t.B * 0.3);
  if (bl) { nx = boat.x + bl.nx * dt * 4; nz = boat.z + bl.nz * dt * 4; if (boat.v > 5 && boat.hitCd <= 0) { boat.hitCd = 1.5; damage((boat.v - 4.5) * 1.6 * Math.pow(1.4, P.tier) * (1 - defense()) * (bl.kind === 'berg' ? 1.6 : 1), bl.kind === 'berg' ? 'You hit an iceberg!' : 'Ran aground!'); foam.splash(nx, nz, 1.2); sfx.creak(); } boat.v *= 0.35; if (autoOn()) autoReplan(); else boat.wp = null; }
  boat.hitCd = Math.max(0, boat.hitCd - dt);
  if (Math.abs(nx) > HALF - 15 || Math.abs(nz) > HALF - 15) { nx = clamp(nx, -HALF + 15, HALF - 15); nz = clamp(nz, -HALF + 15, HALF - 15); if (msgT <= 0) say('The edge of the world. Only mist and falling water beyond.'); }
  boat.x = nx; boat.z = nz;
  // ride the sea
  const tl = ocean.tiltAt(boat.x, boat.z, boat.yaw, t.L, t.B); boat.y += (tl.y - boat.y) * Math.min(1, dt * 6); boat.pitch += (tl.pitch * 0.85 - boat.pitch) * Math.min(1, dt * 5); boat.roll += (-tl.roll * 0.85 - boat.roll) * Math.min(1, dt * 5);
  boat.shake = Math.max(0, boat.shake - dt); const sh = boat.shake * 0.6;
  ship.g.position.set(boat.x + rnd(-sh, sh), boat.y - (boat.dunk || 0), boat.z + rnd(-sh, sh)); ship.g.rotation.y = boat.yaw; ship.body.rotation.x = -boat.pitch; ship.body.rotation.z = boat.roll + Math.sin(time * 9) * sh * 0.1 + (helm.angle / HMAX) * Math.min(1, boat.v / 8) * 0.07;
  ship.anim(dt, { speed: boat.v, time, night: isNight(), sail: boat.sailK ?? 0 });
  ship.setDamage(1 - (battle && battle.you && !battle.broad ? battle.you.hp : P.hp) / maxHp()); shipSmoke(ship, dt);
  if (boat.thor > 0) { ship.sailMat.emissive.setHex(0x1a6aff); ship.sailMat.emissiveIntensity = 0.4 + Math.abs(Math.sin(time * 9)) * 0.5; if (Math.random() < dt * 10) foam.add(boat.x + rnd(-t.B, t.B), boat.z + rnd(-t.L / 2, t.L / 2), { spray: true, y: boat.y + rnd(1, t.mast), vx: rnd(-2, 2), vz: rnd(-2, 2), vy: rnd(1, 3), s: 0.4, life: 0.4, a: 1 }); } else if (boat.bifrost > 0) { ship.sailMat.emissive.setHex(0x1aff8a); ship.sailMat.emissiveIntensity = 0.25 + Math.abs(Math.sin(time * 3)) * 0.3; } else if (ship.sailMat.emissiveIntensity !== 0) { ship.sailMat.emissive.setHex(0); ship.sailMat.emissiveIntensity = 0; }
  // wake and bow spray
  boat.wakeT = (boat.wakeT || 0) - dt; if (boat.v > 1.5 && boat.wakeT <= 0) { boat.wakeT = 0.09; const fx = Math.sin(boat.yaw), fz = Math.cos(boat.yaw), k = boat.v / t.speed; for (const s of [-1, 1]) foam.add(boat.x + fx * t.L * 0.42 + fz * s * t.B * 0.4, boat.z + fz * t.L * 0.42 - fx * s * t.B * 0.4, { vx: fz * s * 1.6 * k - fx * 0.5, vz: -fx * s * 1.6 * k - fz * 0.5, s: 0.5 + t.B * 0.25, grow: 1 + k, life: 3, a: 0.55 * k });
    foam.add(boat.x - fx * t.L * 0.45, boat.z - fz * t.L * 0.45, { s: t.B * 0.6, grow: 0.8, life: 3.5, a: 0.45 * k }); if (k > 0.6 && Math.random() < 0.5) foam.add(boat.x + fx * t.L * 0.5, boat.z + fz * t.L * 0.5, { spray: true, y: boat.y + 0.4, vx: fx * boat.v * 0.4 + rnd(-1, 1), vz: fz * boat.v * 0.4 + rnd(-1, 1), vy: rnd(2, 4), s: 0.6, life: 0.8, a: 0.7 }); }
}
// autopilot: if the course runs into land, swing to the nearest clear heading
function steerAround(want, look) { const t = T(), pad = t.B * 0.6 + 2; const clear = (a) => { for (const k of [0.35, 0.65, 1]) { const r = look * k + t.L * 0.5; if (world.blockAt(boat.x + Math.sin(a) * r, boat.z + Math.cos(a) * r, pad)) return false; } return true; };
  if (clear(want)) return want; for (const k of [0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2]) { const a = want + (boat.side || 1) * k; if (clear(a)) { boat.side = Math.sign(k) * (boat.side || 1); return a; } } return want + Math.PI / 2; }
// the sea hugs the hulls of your ship and nearby raiders
function updateHulls() { const list = []; const push = (s, x, z, yaw) => { s.g.updateMatrixWorld(true); const e = s.body.matrixWorld.elements; list.push({ x, z, yaw, hl: s.len * 0.5, hb: s.beam * 0.5, y0: s.g.position.y, ps: e[9] / Math.hypot(e[8], e[10]), rs: e[1] / Math.hypot(e[0], e[2]), foam: clamp(boat.v / 8, 0.15, 0.8) }); };
  if (ship && !boat.air) push(ship, boat.x, boat.z, boat.yaw); for (const mon of mons) if (mon.naval && !mon.dead && !mon.air && list.length < 6 && Math.hypot(mon.x - boat.x, mon.z - boat.z) < 150) push(mon.m.ship, mon.x, mon.z, mon.yaw); ocean.setHulls(list); }

// ---------- camera ----------
// views: TOP (high), CHASE (behind), HELM (the captain's eye at the steering place on the stern; the sail goes see-through)
$('viewBtn').onclick = () => { viewMode = viewMode === 'top' ? 'chase' : viewMode === 'chase' ? 'helm' : 'top'; $('viewBtn').textContent = viewMode.toUpperCase(); if (tut) tut.views.add(viewMode); };
// battles get their own zoom: each starts framed (1), pinch or the wheel zooms it, and your sailing zoom comes back after
let camBattle = false, zoomSail = 1;
function updateCamera(dt) { const t = T(); let tgt, dist, pitch; if (!!battle !== camBattle) { camBattle = !!battle; if (camBattle) { zoomSail = zoom; zoom = 1; } else zoom = zoomSail; }
  if (state === 'title') { const a = time * 0.06; tgt = V(boat.x, 2, boat.z); dist = t.L * 2.2 + 14; pitch = 0.28; camYaw = a; }
  else if (battle && battle.broad) { // the battle line side-on: the camera slides along the line and never turns
    const B = battle.broad, ni = nearFoe(B), f = B.foes[ni] || battle.mon, sep = clamp((B.foes.length ? foeAt(B, ni) : B.sp) - B.sp, -16, 16), [fx, fz] = lanePos(B, B.sp + sep / 2, (B.yC + B.eC) / 2), hfov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect, W = Math.max(18, Math.abs(sep) + tierOf(f).L + 6, t.L * 2.2);
    tgt = V(fx, 1.2, fz); dist = Math.max(5, clamp(W / (2 * hfov), 16, 60) * zoom); pitch = 0.28; camYaw += angDiff(B.camYaw, camYaw) * Math.min(1, dt * 2.5); }
  else if (battle && battle.legend) { const mon = battle.mon, [ex, , ez] = krakenEye(mon), d = Math.hypot(ex - boat.x, ez - boat.z); tgt = V(lerp(boat.x, ex, 0.5), 1, lerp(boat.z, ez, 0.5)); dist = Math.max(8, (d * 0.8 + mon.size * 0.55 + t.L * 1.6 + 18) * zoom); pitch = 0.62; camYaw += angDiff(Math.atan2(ex - boat.x, ez - boat.z), camYaw) * Math.min(1, dt * 2); }
  else if (battle && battle.mon.giant) { // frame your ship against one of the giant's eyes (the kraken's eye is about a ship long)
    const mon = battle.mon, Rk = mon.size / 6, sy = Math.sin(mon.yaw), cy = Math.cos(mon.yaw), lx = 0.9 * Rk, lz = 1.15 * Rk, ex = mon.x + lx * cy + lz * sy, ez = mon.z + lz * cy - lx * sy, de = Math.hypot(ex - boat.x, ez - boat.z);
    tgt = V((boat.x + ex) / 2, Rk * 0.3, (boat.z + ez) / 2); dist = Math.max(8, (de * 0.5 + t.L * 1.8 + 12) * zoom); pitch = 0.16; const want = Math.atan2(ex - boat.x, ez - boat.z); camYaw += angDiff(want, camYaw) * Math.min(1, dt * 1.5); }
  else if (battle) { const mon = battle.mon; tgt = V((boat.x + mon.x) / 2, 1.5, (boat.z + mon.z) / 2); const hfov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect, needW = Math.hypot(mon.x - boat.x, mon.z - boat.z) + t.L * 0.7 + mon.size + 6; dist = Math.max(6, Math.max(needW / (2 * hfov * 0.9), mon.top * 2.2 + 10) * zoom); pitch = 0.4; const want = Math.atan2(mon.x - boat.x, mon.z - boat.z) + Math.PI / 2; camYaw += angDiff(want - Math.PI, camYaw) * Math.min(1, dt * 1.5); }
  else { tgt = V(boat.x + Math.sin(boat.yaw) * boat.v * 0.6, boat.air ? boat.air.h * 0.85 : 0, boat.z + Math.cos(boat.yaw) * boat.v * 0.6); const W = (34 + t.L * 1.6) * (viewMode === 'top' ? 1 : 0.7); dist = (W / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1))) * 0.62 * zoom * (boat.air ? 1 + boat.air.h / 20 : 1); pitch = viewMode === 'top' ? 0.98 : 0.42; const wantYaw = viewMode === 'top' ? Math.PI : boat.yaw; camYaw += angDiff(wantYaw, camYaw) * Math.min(1, dt * (viewMode === 'top' ? 3 : 1.5)); }
  const off = battle && (battle.broad || battle.legend) ? 'broad' : !!(battle || fishing); if (off !== viewOff) { viewOff = off; applyView(); }
  if (fishing && !battle) { const s = fishing.s; tgt = V((boat.x + s.x) / 2, 0, (boat.z + s.z) / 2); dist = 26 + t.L * 1.4; pitch = 0.75; }
  camTgt.lerp(tgt, Math.min(1, dt * 4)); const lx = Math.sin(camYaw), lz = Math.cos(camYaw); const want = V(camTgt.x - lx * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 2, camTgt.z - lz * Math.cos(pitch) * dist); camPos.lerp(want, Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(camTgt);
  const helmCam = viewMode === 'helm' && !battle && !fishing && state !== 'title' && ship; if (helmCam) { ship.g.updateMatrixWorld(true); const eye = ship.body.localToWorld(V(t.B * 0.28, ship.deckY + 2.2 + t.L * 0.04, -t.L * 0.36)), look = ship.body.localToWorld(V(t.B * 0.1, ship.deckY + 0.6, t.L * 3)); camPos.copy(eye); camTgt.copy(look); camera.position.copy(eye); camera.lookAt(look); camera.rotateZ(-boat.roll * 0.5); }
  const fov = helmCam ? 66 : 50; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (ship) { const op = helmCam ? 0.35 : 1; if (ship.sailMat.opacity !== op) { ship.sailMat.transparent = op < 1 || P.skin === 'ghost'; ship.sailMat.opacity = op; ship.sailMat.depthWrite = op === 1; ship.sailMat.needsUpdate = true; } } }

// ---------- HUD buttons ----------
$('fireBtn').onclick = (e) => { e.stopPropagation(); unlockAudio(); fire(); }; $('actBtn').onclick = (e) => { e.stopPropagation(); doAction(); };
$('pauseBtn').onclick = () => { if (state !== 'play') return; state = 'paused'; $('pauseText').textContent = T().name + ' · ' + P.kills + ' foes slain · legends ' + Object.keys(P.legends).length + ' / 3'; $('paused').classList.remove('hidden'); };
$('resumeBtn').onclick = () => { $('paused').classList.add('hidden'); state = 'play'; };
$('saveQuit').onclick = () => { save(); $('paused').classList.add('hidden'); toTitle(); };
$('howBtn').onclick = () => { $('title').classList.add('hidden'); $('how').classList.remove('hidden'); }; $('howBack').onclick = () => { $('how').classList.add('hidden'); $('title').classList.remove('hidden'); };
function begin(cont) { unlockAudio(); startSaga(); if (!cont) { localStorage.removeItem(SAVE); Object.assign(P, { tier: 0, up: { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 0, oars: 0, nets: 0, lights: 0, compass: 0, hooks: 0 }, res: { w: 20, i: 5, g: 40, f: 0 }, legends: {}, kills: 0, home: 0, won: false, tod: 0.16, wreck: null, prizes: [], maps: [], relics: {}, skin: 'pats' }); placeWreck(); P.hp = maxHp(); const h = world.harbors[0]; boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); for (const L of world.lairs) L.beaten = false; }
  boat.v = 0; boat.wp = null; for (const m of [...mons]) removeMon(m); rebuildShip(); $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; fsCtl.play(); hud();
  boat.throttle = 0; helm.angle = 0; drawThrottle(); helmDrawn = null; if (tutForce || (!cont && !tutSeen())) { tutForce = false; tutStart(); } else if (!tut) say(cont ? 'Back at sea. Skål! Tap ROW, HALF or FULL to get under way.' : 'Tap ROW, HALF or FULL to get under way, and swipe along the wheel to steer. Tap the sea or the map to set a course.', 5.5); camYaw = Math.PI; }
const codes = initSaveCodes(); $('codeBtn').onclick = () => codes.open(); $('pauseCode').onclick = () => { save(); codes.open(); };
$('playBtn').onclick = () => begin(false); $('contBtn').onclick = () => begin(true);
function toTitle() { state = 'title'; $('hud').classList.add('hidden'); $('title').classList.remove('hidden'); $('contBtn').classList.toggle('hidden', !localStorage.getItem(SAVE)); }
const fsCtl = initFullscreen(() => state === 'play');
soundToggle($('title').querySelector('.menu'), $('paused')); $('ver').textContent = 'v' + VERSION;


// ---------- SAIL TO DOCK: the crew sail you to the nearest harbour, around land, fleeing every fight, until you take the helm ----------
// it lasts while the course it set is still the course: STOP, a new course or tapping ⚓ again ends it; arriving docks you
function nearestHarbor() { let best = null, bd = 1e9; for (const h of world.harbors) { const d = Math.hypot(h.dock.x - boat.x, h.dock.z - boat.z); if (d < bd) { bd = d; best = h; } } return best; }
const autoOn = () => !!boat.auto && !!boat.wp && boat.wp === boat.auto.wp;
function autoDock(on) {
  if (!on) { if (autoOn()) { boat.wp = null; courseMark.visible = false; say('You take the helm.', 2); } boat.auto = null; return; }
  if (state !== 'play' || battle || fishing) return; if (ctx && ctx.kind === 'dock') { openHarbor(ctx.h); return; }
  const h = nearestHarbor(); if (!h) return;
  boat.auto = { h, path: null, i: 0, wp: null, replanT: 0 }; autoPlan(); setThrottle(1, true);
  say('⚓ Sailing for ' + h.name + '. The crew steer around land and flee every fight. Tap STOP or ⚓ to take the helm.', 4.5); }
// plan (or plan again) from where the ship is now to just off the harbour's dock, then sail it leg by leg
function autoPlan() { const A = boat.auto, h = A.h, gx = h.dock.x + Math.cos(h.dir) * 10, gz = h.dock.z + Math.sin(h.dir) * 10;
  A.path = planRoute(boat.x, boat.z, gx, gz) || [[gx, gz]]; A.i = 0; autoLeg(); }
function autoLeg() { const A = boat.auto, p = A.path[A.i]; boat.wp = { x: p[0], z: p[1] }; courseMark.visible = true; A.wp = boat.wp; }
// each frame: on to the next leg when close to this one's end
function updateAuto(dt) { if (!autoOn()) return; const A = boat.auto, p = A.path[A.i]; A.replanT -= dt;
  if (A.i < A.path.length - 1 && Math.hypot(p[0] - boat.x, p[1] - boat.z) < 12 + T().L * 0.3) { A.i++; autoLeg(); } }
// shoved onto land (a wave, a whirlpool, a fleeing turn): plan again from here instead of giving up
function autoReplan() { const A = boat.auto; if (A.replanT > 0) return; A.replanT = 1.5; autoPlan(); }
// the route: A* over a 6-unit grid of open water kept a hull's width off every coast, then the corners pulled straight
// wherever the line between two points is clear
function planRoute(x0, z0, x1, z1) {
  const C = 6, N = Math.floor(WORLD / C), E = HALF - 25, pad = T().B * 0.6 + 2.5, cellOf = (v) => clamp(Math.floor((v + HALF) / C), 0, N - 1), mid = (i) => -HALF + (i + 0.5) * C;
  const memo = new Int8Array(N * N); // 0 not looked at yet, 1 water, 2 land or the edge of the world
  const free = (i, j) => { const k = j * N + i; if (!memo[k]) { const x = mid(i), z = mid(j); memo[k] = Math.abs(x) > E || Math.abs(z) > E || world.blockAt(x, z, pad) ? 2 : 1; } return memo[k] === 1; };
  const near = (i, j) => { if (free(i, j)) return [i, j]; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (Math.max(Math.abs(di), Math.abs(dj)) === r && a >= 0 && b >= 0 && a < N && b < N && free(a, b)) return [a, b]; } return null; };
  const s = near(cellOf(x0), cellOf(z0)), g = near(cellOf(x1), cellOf(z1)); if (!s || !g) return null;
  const S = s[1] * N + s[0], G = g[1] * N + g[0], cost = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1), done = new Uint8Array(N * N);
  const hx = (k) => { const dx = Math.abs((k % N) - g[0]), dz = Math.abs(((k / N) | 0) - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  cost[S] = 0; push(S, hx(S)); let found = false, guard = 0;
  while (heap.length && guard++ < 80000) { const k = pop()[1]; if (done[k]) continue; done[k] = 1; if (k === G) { found = true; break; } const i = k % N, j = (k / N) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N || !free(a, b)) continue;
      if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue; // never cut a corner of land
      const nk = b * N + a, nc = cost[k] + (di && dj ? 1.414 : 1); if (nc < cost[nk]) { cost[nk] = nc; from[nk] = k; push(nk, nc + hx(nk)); } } }
  if (!found) return null;
  const pts = []; for (let k = G; k !== -1; k = from[k]) pts.push([mid(k % N), mid((k / N) | 0)]); pts.reverse(); pts.push([x1, z1]);
  const clearLine = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3); for (let q = 1; q < n; q++) { const f = q / n; if (world.blockAt(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, pad)) return false; } return true; };
  const out = []; let from0 = [x0, z0], at = 0; while (at < pts.length - 1) { let k = Math.min(pts.length - 1, at + 30); while (k > at + 1 && !clearLine(from0, pts[k])) k--; out.push(pts[k]); from0 = pts[k]; at = k; }
  return out; }
// fleeing instead of fighting: a parting bite (half a hit, like FLEE in a battle), the foe stunned behind you, the oars pulling hard
function autoFlee(mon) { mon.stun = 7; boat.boost = 3.5; boat.grace = 3; boat.v = Math.max(boat.v, topSpeed()); damage(mon.dmg * 0.5 * (1 - defense()), mon.name + ' lunges as you flee!'); }
// controls on the right (the default) or on the left: the swap button beside the minimap mirrors the HUD, remembered on this device
const setHand = (left) => { document.documentElement.classList.toggle('leftHand', left); try { localStorage.setItem('pr_hand', left ? 'L' : 'R'); } catch (e) { /* ignore */ } };
try { setHand(localStorage.getItem('pr_hand') === 'L'); } catch (e) { /* ignore */ }
$('swapBtn').onclick = (e) => { e.stopPropagation(); setHand(!document.documentElement.classList.contains('leftHand')); say(document.documentElement.classList.contains('leftHand') ? 'Controls on the left.' : 'Controls on the right.', 1.6); };
$('dockBtn').onclick = (e) => { e.stopPropagation(); unlockAudio(); if (tut) tut.dockTap = true; autoDock(!autoOn()); };
let dockShown = null; function drawDockBtn() { const on = autoOn(); if (on !== dockShown) { dockShown = on; $('dockBtn').classList.toggle('on', on); } }

// ---------- the first-voyage tutorial: five steps, each one waits until you do it; SKIP ends it, HOW TO PLAY replays it ----------
const TUT_KEY = 'pr_tut', keyPad = matchMedia('(pointer: fine)').matches; let tut = null, tutForce = false;
const tutSeen = () => { try { return !!localStorage.getItem(TUT_KEY); } catch (e) { return true; } };
const TUT = [
  { txt: '⛵ <b>Raise the sail.</b> Tap HALF or FULL. STOP furls it again.', keys: 'W and S', at: () => thrEl.querySelector('[data-n="3"]'), done: () => (boat.throttle || 0) > 0.4 },
  { txt: '☸ <b>Steer.</b> Swipe along the wheel to turn. It stays where you leave it; double-tap to centre it.', keys: 'A and D', at: () => 'wheel', done: () => tut.turn > 1.1 },
  { txt: '👁 <b>Change the view.</b> Tap TOP to switch the camera: TOP looks down from above, CHASE follows the ship, HELM puts you at the wheel. Try all three.', at: () => $('viewBtn'), done: () => tut.views.size >= 3 },
  { txt: '🔍 <b>Zoom.</b> Pinch the sea with two fingers to zoom in and out.', keys: 'the mouse wheel', at: () => 'pinch', done: () => Math.abs(zoom - tut.zoom0) > 0.15 },
  { txt: '🧭 <b>The little map</b> shows what is near: ⚓ harbours, monsters as coloured dots, ✕ treasure. Tap it (or the sea) to set a course, and the helmsman steers you there.', at: () => $('map'), done: () => !!boat.wp && boat.wp !== tut.wp0 },
  { txt: '🗺 <b>The sea chart</b> shows the whole world. Tap 🗺 to open it: pinch and drag to look around, tap anywhere to set a course, CLOSE to come back.', at: () => $('chartBtn'), done: () => tut.chart },
  { txt: '🦈 <b>A shark!</b> A white name is a fair fight, green is weaker, red and purple are stronger. Throw SPEARS, then win the fight: hit the weak spot and dodge.', at: () => $('fireBtn'), enter: () => tutShark(), done: () => tut.mon && tut.mon.dead },
  { txt: '⚓ <b>Head home.</b> Tap ⚓ DOCK and the crew sail you to the nearest harbour, fleeing any fight (STOP takes the helm back). Or sail there yourself and tap DOCK.', at: () => (ctx && ctx.kind === 'dock' ? $('actBtn') : autoOn() ? null : $('dockBtn')), done: () => false },
];
function tutStart() { tut = { i: -1, turn: 0, yaw: boat.yaw, mon: null, wait: 0, views: new Set([viewMode]), zoom0: zoom, wp0: null, chart: false }; document.body.classList.add('tutOn'); $('tut').classList.remove('hidden'); tutNext(); }
function tutNext() { tut.i++; const st = TUT[tut.i]; tut.yaw = boat.yaw; tut.turn = 0; tut.zoom0 = zoom; tut.wp0 = boat.wp;
  $('tutN').textContent = 'TUTORIAL · ' + (tut.i + 1) + ' / ' + TUT.length; $('tutTxt').innerHTML = st.txt + (keyPad && st.keys ? ' <i>On a computer: ' + st.keys + '.</i>' : '');
  const el = $('tut'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (tut.i) sfx.coins(); if (st.enter) st.enter(); }
function tutEnd(msg) { try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {} tut = null; document.body.classList.remove('tutOn'); $('tut').classList.add('hidden'); $('tutHand').classList.add('hidden'); if (msg) say(msg, 4); }
function tutShark() { const want = P.tier - 0.3, vi = MLV.shark.reduce((bi, l, i) => (Math.abs(l - want) < Math.abs(MLV.shark[bi] - want) ? i : bi), 0);
  for (let k = 0; k < 14; k++) { const a = boat.yaw + rnd(-0.7, 0.7), d = rnd(36, 50), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (world.blockAt(x, z, 6)) continue;
    tut.mon = spawnMon({ type: 'shark', v: vi, lv: MLV.shark[vi] }, x, z); tut.mon.state = 'chase'; return; }
  tut.wait = 2; }
function updateTut(dt) { if (!tut) return; const st = TUT[tut.i];
  tut.turn += Math.abs(angDiff(boat.yaw, tut.yaw)); tut.yaw = boat.yaw;
  if (st.enter && (!tut.mon || (!tut.mon.dead && !mons.includes(tut.mon)))) { tut.mon = null; tut.wait -= dt; if (tut.wait <= 0) tutShark(); } // the shark got away or you sank: send another
  if (st.done()) { tutNext(); return; }
  // the pointing hand: beside a button (pointing in from the middle of the screen), or swiping along the wheel
  const hand = $('tutHand'), at = st.at(); if (!at || battle || fishing) { hand.classList.add('hidden'); return; }
  let x, y, cls;
  if (at === 'wheel') { const [cx, cy] = helmHub(); x = cx; y = cy - helmBox.R * 0.7; cls = 'swipe'; }
  else if (at === 'pinch') { x = innerWidth / 2 + 40; y = innerHeight * 0.42; cls = 'pinch'; }
  else { const r = at.getBoundingClientRect(); if (!r.width) { hand.classList.add('hidden'); return; } if (at.closest('#throttle') && thrEl.offsetWidth > thrEl.offsetHeight) { x = r.left + r.width / 2; y = r.top - 26; cls = 'D'; } // the tablet telegraph is a row: point down onto it
    else { const right = r.left + r.width / 2 > innerWidth / 2; x = right ? r.left - 24 : r.right + 24; y = r.top + r.height / 2; cls = right ? 'R' : 'L'; } }
  if (hand._c !== cls) { hand.className = cls; hand._c = cls; hand.textContent = { swipe: '👆', R: '👉', L: '👈', D: '👇', pinch: '🤏' }[cls]; }
  hand.classList.remove('hidden'); hand.style.left = x + 'px'; hand.style.top = y + 'px'; }
$('tutSkip').onclick = (e) => { e.stopPropagation(); tutEnd('Tutorial skipped. HOW TO PLAY can run it again.'); };
$('howTut').onclick = () => { $('how').classList.add('hidden'); tutForce = true; begin(!!localStorage.getItem(SAVE)); };

// ---------- the four seas: a banner when you cross into one, falling snow or ash, volcano smoke and embers, storm flicker ----------
const rw = {}; let curSea = 'home', stormT = 5;
const SEA_INTRO = { home: ['⚓ HOME WATERS ⚓', 'Green isles around Patsholm'], frost: ['❄ THE FROST SEA ❄', 'Ice floes, snow peaks and frost wyrms'], storm: ['🌋 THE STORM SEA 🌋', 'Fire mountains, black rock and lightning'], mist: ['🌫 THE MIST SEA 🌫', 'Dead marshes, old stones and ghost lights'], warm: ['🌴 THE WARM SEA 🌴', 'White sands, palms and coral reefs'] };
function seaBanner(k) { const el = $('seaBanner'); el.innerHTML = '<b>' + SEA_INTRO[k][0] + '</b><small>' + SEA_INTRO[k][1] + '</small>'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); sfx.horn(); }
const fall = (() => { const n = 700, pos = new Float32Array(n * 3), vel = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-45, 45); pos[i * 3 + 1] = rnd(0, 40); pos[i * 3 + 2] = rnd(-45, 45); vel[i] = rnd(0.6, 1.4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, opacity: 0, depthWrite: false }); const p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false; scene.add(p); return { p, m, g, pos, vel, n }; })();
const smoke = createFoam(scene, ocean, 320, { color: 0x3c3836 }), embers = createFoam(scene, ocean, 160, { color: 0xff7a2a });
const ashC = new THREE.Color(0x8a8480), snowC = new THREE.Color(0xffffff);
function updateSeas(dt) {
  world.regionWeights(boat.x, boat.z, rw); let best = 'home', bw = rw.home; for (const k of ['frost', 'storm', 'mist', 'warm']) if (rw[k] > bw) { bw = rw[k]; best = k; }
  if (best !== curSea && bw > 0.62) { curSea = best; if (state === 'play') seaBanner(best); }
  setMusicSea(curSea); // each sea has its own song (it changes on the next bar line)
  // snow in the Frost Sea, ash in the Storm Sea
  const sn = rw.frost || 0, as = rw.storm || 0, k = Math.max(sn, as); fall.p.visible = k > 0.04; if (fall.p.visible) { const ashy = as / (sn + as + 1e-6); fall.m.color.copy(snowC).lerp(ashC, ashy); fall.m.size = 0.55 - ashy * 0.25; fall.m.opacity = 0.6 * k;
    const sp = 3.2 - ashy * 1.8; fall.p.position.set(camTgt.x, 0, camTgt.z); const P3 = fall.pos; for (let i = 0; i < fall.n; i++) { P3[i * 3 + 1] -= sp * fall.vel[i] * dt; P3[i * 3] += Math.sin(time * 0.8 + i) * dt * 0.6; if (P3[i * 3 + 1] < -1) { P3[i * 3 + 1] = 40; P3[i * 3] = rnd(-45, 45); P3[i * 3 + 2] = rnd(-45, 45); } } fall.g.attributes.position.needsUpdate = true; }
  // volcanoes smoke and spit embers
  for (const v of world.volcanoes) { if (Math.abs(v.x - boat.x) > 230 || Math.abs(v.z - boat.z) > 230) continue;
    if (Math.random() < dt * 5) smoke.add(v.x + rnd(-v.r, v.r), v.z + rnd(-v.r, v.r), { spray: true, y: v.y, vx: rnd(-0.5, 0.5) + 1.2, vz: rnd(-0.5, 0.5), vy: rnd(2.5, 4), g: -0.15, s: rnd(2.5, 4), grow: 1.6, life: 7, a: 0.5 });
    if (Math.random() < dt * 7) embers.add(v.x + rnd(-v.r, v.r) * 0.6, v.z + rnd(-v.r, v.r) * 0.6, { spray: true, y: v.y, vx: rnd(-2, 2), vz: rnd(-2, 2), vy: rnd(5, 10), g: 4, s: 0.35, grow: 0, life: 2, a: 1 }); }
  smoke.update(dt); embers.update(dt); smoke.mat.uniforms.uLight.value = 0.35 + env.cur.ambient * 0.8; embers.mat.uniforms.uLight.value = 1.6;
  // the Storm Sea never quite stops flickering
  if (as > 0.6 && state === 'play') { stormT -= dt; if (stormT <= 0) { stormT = rnd(4, 11); flash = Math.max(flash, rnd(0.12, 0.3)); setTimeout(() => sfx.thunder(), rnd(400, 1600)); } }
}

// ---------- lanterns: a warm light on deck and on the water around the ship at night ----------
const shipLight = new THREE.PointLight(0xffb060, 0, 30, 1); scene.add(shipLight);
function updateLanterns() { const night = env.cur.moon, lv = P.up.lights || 0, on = state !== 'title' ? 1 : 0.4;
  shipLight.intensity = night * [0, 5, 8, 12][lv] * on; shipLight.distance = [14, 26, 34, 44][lv]; shipLight.position.set(boat.x, boat.y + T().mast * 0.7, boat.z);
  ocean.uniforms.uLamp.value.set(boat.x, boat.z, [9, 16, 22, 30][lv], night * [0.12, 0.26, 0.38, 0.5][lv] * on); if (lv) { scene.fog.far += night * lv * 35; scene.fog.near += night * lv * 12; } }

// ---------- compass upgrade: heading needle and cardinal points; the sunstone also points to the nearest harbour ----------
const compEl = $('compass'), compCtx = compEl.getContext('2d'); const DIRS8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function drawCompass() { const lv = P.up.compass || 0; $('compWrap').classList.toggle('hidden', !lv || state !== 'play'); if (!lv || state !== 'play') return;  if (!compEl.clientWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), S = Math.round(compEl.clientWidth * dpr) || 1; if (compEl.width !== S) compEl.width = compEl.height = S; const g = compCtx, c = S / 2, R = S / 2 - 2 * dpr;
  const scr = (dx, dz) => [dx * -Math.cos(camYaw) + dz * Math.sin(camYaw), dx * Math.sin(camYaw) + dz * Math.cos(camYaw)];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); const grd = g.createRadialGradient(c, c * 0.8, 2, c, c, R); grd.addColorStop(0, '#4a3220'); grd.addColorStop(1, '#1a1008'); g.fillStyle = grd; g.beginPath(); g.arc(c, c, R, 0, 6.2832); g.fill(); g.strokeStyle = '#d8b04a'; g.lineWidth = 2 * dpr; g.stroke();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, [sx, sy] = scr(Math.sin(a), -Math.cos(a)), r1 = R - (i % 4 ? 4 : 7) * dpr; g.strokeStyle = i % 4 ? '#8a6a3a' : '#d8b04a'; g.lineWidth = (i % 4 ? 1 : 1.5) * dpr; g.beginPath(); g.moveTo(c + sx * (R - 1 * dpr), c - sy * (R - 1 * dpr)); g.lineTo(c + sx * r1, c - sy * r1); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold ' + 10 * dpr + 'px Georgia';
  for (const [lab, dx, dz] of [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]]) { const [sx, sy] = scr(dx, dz), rr = R - 14 * dpr; g.fillStyle = lab === 'N' ? '#ff6a4a' : '#f2e6c8'; g.fillText(lab, c + sx * rr, c - sy * rr); }
  if (lv >= 2) { let best = null, bd = 1e9; for (const h of world.harbors) { const d = Math.hypot(h.dock.x - boat.x, h.dock.z - boat.z); if (d < bd) { bd = d; best = h; } }
    if (best && bd > 1) { const [ax, ay] = scr((best.dock.x - boat.x) / bd, (best.dock.z - boat.z) / bd); g.fillStyle = '#6ad0ff'; g.beginPath(); g.arc(c + ax * (R - 4 * dpr), c - ay * (R - 4 * dpr), 3.5 * dpr, 0, 6.28); g.fill(); g.font = 9 * dpr + 'px serif'; g.fillText('⚓', c + ax * (R - 24 * dpr), c - ay * (R - 24 * dpr)); } }
  const [hx, hy] = scr(Math.sin(boat.yaw), Math.cos(boat.yaw)), L = R - 20 * dpr; g.save(); g.translate(c, c); g.rotate(Math.atan2(hx, hy)); g.fillStyle = '#f2d27a'; g.strokeStyle = '#3a2208'; g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(0, -L); g.lineTo(5 * dpr, 0); g.lineTo(0, L * 0.35); g.lineTo(-5 * dpr, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#5a3a12'; g.beginPath(); g.arc(0, 0, 3 * dpr, 0, 6.28); g.fill(); g.restore();
  const brg = ((Math.atan2(Math.sin(boat.yaw), -Math.cos(boat.yaw)) * 180) / Math.PI + 360) % 360; const txt = DIRS8[Math.round(brg / 45) % 8] + ' ' + Math.round(brg) + '°'; if ($('compTxt').textContent !== txt) $('compTxt').textContent = txt; }


// ---------- main loop ----------
let last = performance.now(), ctxKey = '', fireKey = '';
let timeScale = 1;
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000) * timeScale; last = now; tick(dt); requestAnimationFrame(frame); }
let mapFlip = 0;
function tick(dt) { time += dt;
  if (state === 'play' || state === 'title' || state === 'harbor' || state === 'chart') {
    if (state === 'play') { P.tod = (P.tod + dt / 420) % 1; updateWeather(dt); updateEvents(dt); updateSpawns(dt); updatePods(dt); updateLairs(); updateTut(dt); updateAuto(dt); boat.fireCd = Math.max(0, boat.fireCd - dt); saveT += dt; if (saveT > 30) { saveT = 0; save(); } }
    if (state !== 'harbor') updateBoat(dt); updateMons(dt); if (battle) updateBattle(dt); updateSea(dt); updateProjs(dt); minis.update(dt);
    if (fishing) { const s = fishing.s, a = V(boat.x, boat.y + T().mast * 0.5, boat.z), b = V(s.x, ocean.heightAt(s.x, s.z), s.z); line.geometry.setFromPoints([a, b]); }
  }
  for (const s of world.harbors) { const f = s.g.userData.fire; if (f) f.scale.set(0.9 + Math.sin(time * 9) * 0.15, 1.4 + Math.sin(time * 13) * 0.3, 0.9); const b = s.g.userData.banner; if (b) b.rotation.y = Math.sin(time * 2) * 0.3; }
  updateSeas(dt); world.update(dt, time, boat.x, boat.z, ocean.heightAt);
  // in a battle the fog thins around the fight (the look eases there, and back after), so you can see the ships
  const wxLook = { type: LOOK[wx.type], k: wx.k * (battle && LOOK[wx.type] === 'fog' ? 0.4 : 1) }; env.apply(P.tod, wxLook, dt, flash * flash, 0, rw);
  // fog thickens with distance from the camera, so push it back by how far the camera sits from what it looks at: your ship
  // (and a fight) stay clear however far out you zoom, and the haze still closes in beyond them
  { const cd = camera.position.distanceTo(camTgt) * 0.85; scene.fog.near += cd; scene.fog.far += cd; }
  updateAuroraFx(dt); updateWreck(); updateLanterns(); drawCompass();
  if (state === 'play') drawHelm(); setSea(state === 'play' ? 1 : 0.6, LOOK[wx.type] === 'storm' ? wx.k : 0);
  updateCamera(dt); updateHulls(); ocean.update(dt, camTgt, camera); foam.update(dt); foam.mat.uniforms.uLight.value = 0.35 + env.cur.ambient;
  if (state === 'play') { updateTags(dt); if ((mapFlip ^= 1)) drawMap(mapEl, mapCtx, false);
    drawDockBtn(); ctx = actionContext(); const key = ctx ? ctx.kind + ctx.label : ''; if (key !== ctxKey) { ctxKey = key; const b = $('actBtn'); if (ctx) { b.classList.remove('hidden'); b.innerHTML = '<em>' + ctx.icon + '</em><small>' + ctx.label + '</small>'; b.style.borderColor = ctx.kind === 'fight' ? '#ff5a3a' : ctx.kind === 'slow' ? '#c8c8c8' : '#7dff3a'; } else b.classList.add('hidden'); }
    const wk = P.up.ballista ? 'b' : 's'; if (wk !== fireKey) { fireKey = wk; $('fireBtn').innerHTML = '<em>' + (P.up.ballista ? '🏹' : '🗡') + '</em><small>' + (P.up.ballista ? 'BALLISTA' : 'SPEARS') + '</small><i class="cd" id="fireCd"></i>'; } $('fireCd').style.height = (boat.fireCd > 0 ? clamp(boat.fireCd / (P.up.ballista ? 2 : 1.2), 0, 1) * 100 : 0) + '%';
    $('region').textContent = rname(world.regionAt(boat.x, boat.z)) + (isNight() ? ' · 🌙' : ''); $('wxTxt').textContent = wx.k > 0.3 ? WXNAME[wx.type] : ''; $('buff').textContent = [boat.thor > 0 ? '⚡ Thor ' + Math.ceil(boat.thor) + 's' : '', boat.bifrost > 0 ? '🌈 Bifröst ' + Math.ceil(boat.bifrost) + 's' : '', boat.curse > 0 ? '☠ Cursed ' + Math.ceil(boat.curse) + 's' : '', boat.mending ? '🔨 Crew mending' : ''].filter(Boolean).join(' · '); $('hurt').classList.toggle('thor', boat.thor > 0); }
  else for (const mon of mons) mon.tag.style.display = 'none';
  msgT -= dt; if (msgT <= 0) $('msg').style.opacity = 0; warnT -= dt; if (warnT <= 0) $('warn').innerHTML = '';
  renderer.render(scene, camera); }
// start on the title: the ship rides at anchor off Patsholm
{ const h = world.harbors[0]; boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); }
const hadSave = load(); if (!hadSave) P.hp = maxHp(); rebuildShip(); placeWreck(); toTitle(); env.snap(P.tod, null, world.regionWeights(boat.x, boat.z, {})); camTgt.set(boat.x, 0, boat.z);
requestAnimationFrame(frame);
window.__pr = { broadSwap, startBroadside, broadFire, endBroadside, BROAD, planRoute, autoDock, cleanSave, giveMap, prizeChoice, startDig, boardInfo, spouts, startAir, liftK, pods, spawnPod, EV, startEvent, aur, get wreck() { return P.wreck; }, sink, get chartView() { return chartView; }, step(n = 30, dt = 1 / 30) { for (let i = 0; i < n; i++) tick(dt); }, helm, setThrottle, set timeScale(v) { timeScale = v; }, dmgLog, P, boat, mons, spots, floats, world, ocean, wx, setWeather, spawnMon, startBattle, startFishing, openHarbor, fire, get state() { return state; }, set state(v) { state = v; }, get battle() { return battle; }, minis, MLV, killMon, landBolt, warnRing, spawnSpout, rebuildShip, save, load, camera, renderer, scene, get ship() { return ship; }, setCourse };

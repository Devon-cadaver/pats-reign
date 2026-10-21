// Valhalla's Tide: a Viking ship on a monster sea. Sail with the ship's wheel and the sail telegraph, a tap on the sea or the map; fish up
// supplies, fight sea monsters and raiders in battle mini-games, upgrade at harbours, ride out storms (catch lightning
// for Thor's Fury), rogue waves, waterspouts and sea tornadoes, maelstroms, ambushes, raider fleets and treasure ships,
// and slay the four legends to reign.
import * as THREE from 'three';
import { createOcean, createFoam } from './ocean.js';
import { createEnv } from './env.js';
import { buildShip, SHIP_TIERS, PLAYER_PAL, RAIDER_PALS, GHOST_PAL, TREASURE_PAL, HEL_PALS, HULL_LOOK, addCargo } from './ship.js';
import { makeMonster, SPECIES, tentacle } from './monsters.js';
import { buildWorld, WORLD, HALF, REGIONS, LAIRS, LAIRS_HEL, GATES } from './world.js';
import { createMinis } from './minigames.js';
import { createTwisters } from './tornado.js';
import { createAurora } from './aurora.js';
import { sfx, unlockAudio, soundToggle, setSea } from './audio.js';
import { startSaga, setBattle, setMusicSea } from './music.js';
import { initFullscreen } from './fullscreen.js';
import { VERSION } from './version.js';
import { initSaveCodes } from './savecode.js';
import { M, V, glowVC, geo as sharedGeo } from './geom.js';
import { makeGate } from './hel.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------- renderer, scene, sea, world ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xa6cade, 120, 330); scene.background = new THREE.Color(0xa6cade);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 6000);
const hemi = new THREE.HemisphereLight(0xdcefff, 0x2a4a5a, 1.4); scene.add(hemi); const sun = new THREE.DirectionalLight(0xfff0d0, 1.2); scene.add(sun); scene.add(sun.target);
// two worlds (v0.8.0): Midgard, and Helheim (built the first time you cross); `world` is the one you sail in
const worlds = { mid: buildWorld(scene) }; let world = worlds.mid;
const ocean = createOcean(scene, { size: 440, seg: 170, world: WORLD, shore: world.shore });
const foam = createFoam(scene, ocean, 800); const env = createEnv(scene, ocean, hemi, sun);
let flash = 0;
const twisters = createTwisters(scene, { onBolt: () => { flash = Math.max(flash, 0.4); } });
const minis = createMinis({ sfx, hooks: { paused: () => state !== 'play', shoot: (mult, dmg, txt, fire) => battleShoot(mult, dmg, txt, fire), hurt: (d) => battleHurt(d), foeAct: (d) => battleFoeAct(d), cast: () => fishCast(), pull: () => {} } });
let viewOff = false, helmLift = 0, wrF = 1.5; // helmLift: the view is shifted up by this many px so the ship clears the wheel
// battles lift the action up the screen: the classic one to a quarter of the way down (its controls fill the bottom), the broadside to 40%
function applyView() { if (viewOff) { const f = viewOff === 'broad' ? 1.2 : viewOff === 'wright' ? wrF : 1.5; camera.aspect = innerWidth / (innerHeight * f); camera.setViewOffset(innerWidth, innerHeight * f, 0, innerHeight * (f - 1), innerWidth, innerHeight); } else if (helmLift) { camera.aspect = innerWidth / (innerHeight + helmLift); camera.setViewOffset(innerWidth, innerHeight + helmLift, 0, helmLift, innerWidth, innerHeight); } else { camera.aspect = innerWidth / innerHeight; camera.clearViewOffset(); } camera.updateProjectionMatrix(); }
function resize() { renderer.setSize(innerWidth, innerHeight, false); applyView(); } addEventListener('resize', resize); resize();

// ---------- data: upgrades and costs [timber, iron, gold] ----------
// costs are [timber, iron, gold] or [timber, iron, gold, souls]; level 4 (a rune level, v0.8.0) is a goal for the Skeid and the
// Drakkar; level 5 also needs souls from Helheim; every great ship opens one more rune level (VI the Busse, VII the Ormen Lange,
// VIII the Naglfar), as an upgrade can go one level past your ship size
const UPG = {
  shields: { name: 'Shield Wall', icon: '🛡', max: 8, desc: ['Wooden shields along the rails', 'Painted war shields', 'Iron-rimmed shields', 'Rune-carved shields', 'Valkyrie shields of gold', 'Shields of Hel-iron', 'Shields of the Einherjar', "Odin's own shield wall"], eff: 'Blocks harder (−12% damage a level, less for rune levels)', cost: [[20, 5, 30], [45, 20, 90], [80, 60, 220], [130, 100, 450], [200, 150, 770, 90], [300, 230, 1400, 160], [430, 330, 2400, 260], [600, 460, 4000, 390]] },
  armor: { name: 'Iron Plates', icon: '⛓', max: 8, desc: ['Iron bands at the waterline', 'Riveted iron plates', 'Full iron hull', 'Rune-iron plates', 'A dwarf-forged hull', 'Draugr-bone plating', 'Nail-iron plates', "A hull of Ymir's bones"], eff: '+25% hull each, −8% damage (rune levels: mostly hull)', cost: [[10, 30, 60], [25, 75, 160], [40, 150, 380], [65, 240, 760], [100, 375, 1330, 100], [150, 560, 2300, 180], [210, 800, 3800, 280], [300, 1100, 6000, 420]] },
  ballista: { name: 'Ballista', icon: '🏹', max: 8, desc: ['A bow ballista', 'Heavy bolts', 'Twin ballistas', 'Glowing rune bolts', "Gungnir's ballista", 'Muspel-fire bolts', 'Twin rune ballistas', "Thor's thunder ballista"], eff: '+30% damage (+15% for rune levels), longer shots, a bigger weak spot', cost: [[30, 15, 50], [60, 45, 150], [110, 100, 340], [175, 160, 680], [275, 250, 1190, 110], [400, 370, 2100, 200], [560, 520, 3500, 300], [780, 720, 5600, 450]] },
  fire: { name: 'Fire Pots', icon: '🔥', max: 8, desc: ['One fire pot a battle', 'Two fire pots a battle', 'Two hotter fire pots', 'Three pots of Muspel fire', "Three pots of Surtr's flame", 'Four pots of Muspel fire', 'Four pots of dragon fire', 'Five pots of the world-fire'], eff: 'A big burning hit (it takes one of your shots)', cost: [[10, 10, 80], [20, 25, 190], [35, 55, 400], [55, 90, 800], [90, 140, 1400, 90], [130, 210, 2400, 150], [190, 300, 3900, 240], [260, 420, 6000, 380]] },
  ram: { name: 'Iron Ram', icon: '🐏', max: 3, desc: ['An iron ram at the bow', 'A great beaked ram', 'A Hel-iron ram'], eff: 'Ram monsters at speed for free damage', cost: [[25, 40, 110], [45, 110, 320], [75, 180, 640]] },
  sail: { name: 'Sail', icon: '⛵', max: 8, desc: ['Striped war sail', 'Fine wool sail', 'Royal sail', 'Royal rune sail', "Skidbladnir's sail", 'Storm-weave sail', 'Valkyrie-wing sail', "Odin's wind sail"], eff: '+10% speed each (+5% for VI to VIII)', cost: [[30, 0, 60], [60, 10, 150], [90, 30, 330], [145, 50, 660], [225, 75, 1160, 90], [330, 110, 2000, 160], [470, 160, 3300, 260], [650, 220, 5200, 390]] },
  oars: { name: 'Oars & Crew', icon: '🚣', max: 8, desc: ['More rowers, who patch the hull at sea', 'Strong rowers: they patch it twice as fast', 'Berserker rowers: the hull mends quickly', 'Einherjar rowers: it mends faster still', 'Valhalla oarsmen: the hull mends very fast', 'Draugr rowers who never tire', 'Einherjar of Hel: faster mending still', "Odin's chosen: the fastest mending of all"], eff: 'Faster turns and acceleration; the crew mend the hull at sea when no one is hitting you', cost: [[25, 5, 40], [50, 20, 120], [80, 50, 280], [130, 80, 560], [200, 125, 980, 90], [300, 180, 1700, 150], [420, 260, 2900, 240], [600, 360, 4600, 380]] },
  lights: { name: 'Lanterns', icon: '🏮', max: 3, desc: ['A stern lantern', 'Bow and mast lanterns', 'Great iron fire braziers'], eff: 'Light the sea at night: more fishing spots after dark, more of them treasure', cost: [[10, 10, 40], [20, 25, 110], [40, 60, 260]] },
  compass: { name: 'Compass', icon: '🧭', max: 2, desc: ['A lodestone compass shows which way you face', 'A Viking sunstone also points to the nearest harbour, your treasure map and your wreck, even in fog'], eff: '', cost: [[5, 10, 35], [10, 25, 120]] },
  hooks: { name: 'Grappling Hooks', icon: '🪝', max: 4, desc: ['Iron grappling hooks: board a Faering or a Karvi', 'Barbed hooks and boarding planks: board a Snekkja or a Skeid', 'Rune-carved hooks: board a Drakkar', 'Hel-forged hooks: board the great ships, Busse to Naglfar'], eff: 'Board a ship in battle once her hull is below 40%', cost: [[20, 25, 70], [40, 70, 200], [80, 150, 450], [130, 240, 900]] },
  nets: { name: 'Nets', icon: '🕸', max: 4, desc: ['Rope nets', 'Wide nets', 'Iron-weighted nets', "Rán's own net"], eff: 'Bigger catch box, bigger catches', cost: [[20, 5, 30], [40, 15, 90], [60, 40, 200], [95, 65, 400]] },
};
// ship sizes: Busse (size 6) needs only timber, iron and gold; the Ormen Lange needs souls; Naglfar needs Helheim's three legends slain
const TIER_COST = [null, [60, 20, 90], [150, 70, 250], [320, 160, 560], [650, 330, 1300], [1300, 650, 4000], [2400, 1300, 8000, 250], [4000, 2400, 14000, 300]];
// the shipwright (v0.8.0): a hull and a sail design for the Jarl's ships, each with a small perk. eff keys: spd turn hp def atk gold
// sight (monsters spot you later) mend fire thor fish souls curse; got: what it costs to have it built, or the legend that gives it
const HULLS = {
  oak: { name: 'Oak', icon: '🌳', perk: 'Sturdy and true', eff: {}, got: { cost: [0, 0, 0] } },
  pine: { name: 'Pine', icon: '🌲', perk: '+5% speed, −5% hull', eff: { spd: 0.05, hp: -0.05 }, got: { cost: [30, 0, 150] } },
  ash: { name: 'Ash', icon: '🪵', perk: '+12% turning', eff: { turn: 0.12 }, got: { cost: [40, 0, 120] } },
  tar: { name: 'Black Tar', icon: '⚫', perk: 'Monsters spot you 15% later', eff: { sight: 0.15 }, got: { cost: [60, 10, 260] } },
  iron: { name: 'Iron-bound', icon: '⛓', perk: '+10% hull, −4% speed', eff: { hp: 0.1, spd: -0.04 }, got: { cost: [40, 140, 320] } },
  gilded: { name: 'Gilded', icon: '👑', perk: '+15% gold from kills', eff: { gold: 0.15 }, got: { cost: [80, 40, 1500] } },
  dragon: { name: 'Dragon-scale', icon: '🐉', perk: '+5% hull and 5% less damage', eff: { hp: 0.05, def: 0.05 }, got: { legend: 'jorm' } },
  bone: { name: 'Hel-bone', icon: '🦴', perk: 'The crew mend 40% faster, +10% souls', eff: { mend: 0.4, souls: 0.1 }, got: { cost: [0, 60, 2500, 150] } },
  naglfar: { name: 'Nail-hull', icon: '📌', perk: '+8% damage, 4% less damage', eff: { atk: 0.08, def: 0.04 }, got: { legend: 'hafgufa' } },
  // v0.8.4: designs for the great ships (need: the ship size the shipwright asks for) and dyed ones that only cost gold
  frost: { name: 'Rime-hull', icon: '🧊', perk: '+12% hull', eff: { hp: 0.12 }, got: { cost: [0, 300, 3000, 160], need: 5 } },
  ember: { name: 'Muspel-forged', icon: '🌋', perk: '+6% damage, fire pots 15% hotter', eff: { atk: 0.06, fire: 0.15 }, got: { cost: [0, 400, 5000, 160], need: 6 } },
  draugr: { name: 'Draugr-wood', icon: '💀', perk: '+15% souls, the crew mend 20% faster', eff: { souls: 0.15, mend: 0.2 }, got: { cost: [500, 0, 4000, 200], need: 6 } },
  ygg: { name: 'World-ash', icon: '🌿', perk: '+8% hull, +6% speed, +8% turning', eff: { hp: 0.08, spd: 0.06, turn: 0.08 }, got: { cost: [2000, 500, 9000, 520], need: 7 } },
  ivory: { name: 'Walrus-ivory', icon: '🦭', perk: '+6% hull', eff: { hp: 0.06 }, got: { cost: [100, 100, 8000] } },
  royal: { name: 'Royal purple', icon: '🟪', perk: 'Monsters spot you 10% later, +5% turning', eff: { sight: 0.1, turn: 0.05 }, got: { cost: [200, 0, 12000] } },
};
const SAILS = {
  pats: { name: "The Jarl's crest", icon: '⚔', perk: 'Grows grander with each Sail upgrade', eff: {}, got: { cost: [0, 0, 0] } },
  stripes: { name: 'Red and white', icon: '🟥', perk: '+3% speed', eff: { spd: 0.03 }, got: { cost: [20, 0, 80] } },
  raven: { name: "Odin's raven", icon: '🐦‍⬛', perk: '+25% catch when fishing', eff: { fish: 0.25 }, got: { cost: [20, 0, 220] } },
  sun: { name: "Sól's sun", icon: '☀', perk: "Thor's Fury lasts 50% longer", eff: { thor: 0.5 }, got: { cost: [20, 10, 380] } },
  wolf: { name: 'Fenrir', icon: '🐺', perk: '+5% damage', eff: { atk: 0.05 }, got: { cost: [30, 20, 420] } },
  serpent: { name: 'World Serpent', icon: '🐍', perk: '+6% speed', eff: { spd: 0.06 }, got: { cost: [40, 20, 900] } },
  gold: { name: 'Cloth of gold', icon: '💰', perk: '+10% gold from kills', eff: { gold: 0.1 }, got: { cost: [0, 0, 2000] } },
  kraken: { name: 'Kraken ink', icon: '🦑', perk: 'Fire pots burn 25% hotter', eff: { fire: 0.25 }, got: { legend: 'kraken' } },
  elder: { name: 'Elder sign', icon: '👁', perk: 'Curses cannot touch you, 3% less damage', eff: { curse: 1, def: 0.03 }, got: { legend: 'rlyeh' } },
  hel: { name: "Hel's shroud", icon: '☯', perk: 'Monsters spot you 20% later, +10% souls', eff: { sight: 0.2, souls: 0.1 }, got: { cost: [0, 0, 3000, 200] } },
  surtr: { name: "Surtr's flame", icon: '🔥', perk: '+8% damage', eff: { atk: 0.08 }, got: { legend: 'surtr' } },
  nidhogg: { name: "Nidhögg's wings", icon: '🦇', perk: '+8% speed, +5% turning', eff: { spd: 0.08, turn: 0.05 }, got: { legend: 'nidhogg' } },
  valkyrie: { name: 'Valkyrie wings', icon: '🕊', perk: '+5% damage, 3% less damage', eff: { atk: 0.05, def: 0.03 }, got: { cost: [0, 0, 3000, 200], need: 5 } },
  ygg: { name: 'Yggdrasil', icon: '🌳', perk: '+8% hull, the crew mend 25% faster', eff: { hp: 0.08, mend: 0.25 }, got: { cost: [0, 0, 5000, 180], need: 6 } },
  draugr: { name: "Draugr's banner", icon: '☠', perk: '+15% souls', eff: { souls: 0.15 }, got: { cost: [0, 0, 6000, 230], need: 6 } },
  ragnarok: { name: 'Ragnarök', icon: '🔥', perk: '+8% damage, +5% hull', eff: { atk: 0.08, hp: 0.05 }, got: { cost: [0, 0, 12000, 600], need: 7 } },
  blood: { name: 'Blood-red', icon: '🩸', perk: '+4% damage', eff: { atk: 0.04 }, got: { cost: [0, 0, 6000] } },
  jade: { name: 'Jade and gold', icon: '🟩', perk: '+4% speed, +4% turning', eff: { spd: 0.04, turn: 0.04 }, got: { cost: [0, 0, 8000] } },
  aurora: { name: 'Northern lights', icon: '🌌', perk: "+6% speed, Thor's Fury lasts 25% longer", eff: { spd: 0.06, thor: 0.25 }, got: { cost: [0, 0, 10000] } },
};
// monster levels per species variant, speeds, and what their attacks are called in battle
const MLV = { shark: [0, 0.6, 1.2, 2], megalodon: [3.4, 3.8, 4.2, 4.6, 5.0], serpent: [1.3, 2, 2.4, 3, 3.6, 3, 4.1], eel: [0.4, 1, 1.6], octopus: [0.9, 1.6, 2.2, 2.8], crab: [1, 2, 3], angler: [2, 3], jelly: [0, 0.3, 0.5], leviathan: [2, 3, 4.2], squid: [3.6, 4.2, 4.8], kraken: [5, 5, 5], elder: [5.6, 5.6, 5.6], jormungandr: [6.2, 6.2] };
const MSPEED = { shark: 10.5, megalodon: 9.5, serpent: 9.2, eel: 10, octopus: 7, crab: 6, angler: 7.5, jelly: 1.2, leviathan: 8.5, squid: 7.5, kraken: 6, elder: 5, jormungandr: 9 };
const ATK = { shark: { L: 'lunges from the right', R: 'lunges from the left', U: 'leaps to bite' }, serpent: { L: 'whips its tail from the right', R: 'whips its tail from the left', U: 'rears up to strike' }, eel: { L: 'arcs lightning from the right', R: 'arcs lightning from the left', U: 'coils to shock' },
  octopus: { L: 'swings a tentacle from the right', R: 'swings a tentacle from the left', U: 'slams down its arms' }, kraken: { L: 'sweeps a tentacle from the right', R: 'sweeps a tentacle from the left', U: 'drags at the hull' }, squid: { L: 'lashes a tentacle from the right', R: 'lashes a tentacle from the left', U: 'drags at the hull' }, crab: { L: 'snaps a claw from the right', R: 'snaps a claw from the left', U: 'crushes with both claws' },
  angler: { L: 'snaps from the right', R: 'snaps from the left', U: 'lunges with its jaws' }, leviathan: { L: 'snaps three jaws from the right', R: 'snaps three jaws from the left', U: 'strikes with all three heads' }, megalodon: { L: 'rams from the right', R: 'rams from the left', U: 'surges up to swallow you whole' }, jelly: { L: 'stings from the right', R: 'stings from the left', U: 'pulses' },
  elder: { L: 'claws from the right', R: 'claws from the left', U: 'calls the crushing deep' }, jormungandr: { L: 'coils in from the right', R: 'coils in from the left', U: 'strikes with venom' } };
const VBIAS = { frost: { 'serpent:5': 5, 'leviathan:1': 3, 'megalodon:0': 2, 'octopus:3': 2, 'jelly:1': 2 }, storm: { 'megalodon:2': 3, 'serpent:1': 3, 'serpent:6': 2, 'crab:2': 5, 'eel:0': 3, 'eel:2': 3 }, mist: { 'megalodon:3': 3, 'serpent:4': 5, 'octopus:3': 4, 'angler:0': 2, 'eel:1': 2 }, warm: { 'megalodon:1': 3, 'serpent:3': 5, 'crab:0': 3, 'shark:1': 2, 'shark:2': 2, 'jelly:0': 2, 'jelly:2': 2 } };
// hunting grounds (v1.1.4, Sean): where each beast is most likely found; drawn on the chart, spawns there favour that beast
const GROUNDS = [{ type: 'shark', name: 'Shark waters', x: 140, z: 120, r: 80 }, { type: 'shark', name: 'Shark waters', x: 120, z: 420, r: 80 }, { type: 'megalodon', name: 'Megalodon deep', x: 430, z: 150, r: 85 }, { type: 'megalodon', name: 'Megalodon deep', x: -470, z: -160, r: 85 }, { type: 'serpent', name: 'Serpent shoals', x: 140, z: -430, r: 80 }, { type: 'leviathan', name: 'Leviathan deep', x: -150, z: -400, r: 80 }, { type: 'eel', name: 'Eel reefs', x: 400, z: -150, r: 75 }, { type: 'octopus', name: 'Octopus holes', x: -400, z: 150, r: 75 }, { type: 'angler', name: 'Angler deeps', x: -430, z: -40, r: 75 }, { type: 'crab', name: 'Crab flats', x: -150, z: 400, r: 75 }];
const GICON = { shark: '🦈', megalodon: '🦷', serpent: '🐉', eel: '⚡', octopus: '🐙', crab: '🦀', angler: '🎣', leviathan: '🐲' };
function grounds() { if (!world.grounds) { const out = [], far = (x, z, list, min) => list.every((o) => Math.hypot(o.x - x, o.z - z) >= min), docks = world.harbors.map((h) => h.dock); for (const g of GROUNDS) { let x = g.x, z = g.z; for (let k = 0; k < 240; k++) { const a = k * 2.4, d = k * 3.5, tx = g.x + Math.cos(a) * d, tz = g.z + Math.sin(a) * d; if (Math.abs(tx) < HALF - 70 || Math.abs(tz) < HALF - 70) { if (Math.abs(tx) < HALF - 70 && Math.abs(tz) < HALF - 70 && !world.blockAt(tx, tz, 36) && far(tx, tz, docks, 110) && far(tx, tz, world.lairs, 120) && far(tx, tz, out, 110)) { x = tx; z = tz; break; } } } out.push({ ...g, x, z }); } world.grounds = out; } return world.grounds; }
function groundAt(x, z, pad = 0) { for (const g of grounds()) if (Math.hypot(x - g.x, z - g.z) < g.r + pad) return g; return null; }
function groundOpen(g) { return spawnTable(world.regionAt(g.x, g.z), isNight()).some((e) => e.type === g.type); }
const REGION_BIAS = { frost: { serpent: 2, leviathan: 2, crab: 0.5 }, storm: { eel: 3, jelly: 2, octopus: 1.5 }, mist: { angler: 3, octopus: 1.5, ghost: 3, raider: 1.5 }, warm: { shark: 2, crab: 3, jelly: 1.5 }, home: { shark: 1.5, jelly: 1.5 } };

// ---------- player ----------
const P = { tier: 0, up: { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 0, oars: 0, nets: 0, lights: 0, compass: 0, hooks: 0 }, res: { w: 20, i: 5, g: 40, f: 0, s: 0 }, hp: 100, legends: {}, kills: 0, home: 0, won: false, tod: 0.16, wreck: null, prizes: [], maps: [], relics: {}, skin: 'pats', realm: 'mid', hull: 'oak', sailD: 'pats', owned: { h: ['oak'], s: ['pats'] }, helWon: false, reborn: {}, hall: 0, tithe: 0, trials: {}, st: { k: {}, d: {}, ships: 0, fish: 0, digs: 0, souls: 0 } };
const boat = { grace: 0, x: 0, z: -20, yaw: Math.PI, v: 0, want: Math.PI, thr: 0, wp: null, fireCd: 0, thor: 0, boost: 0, spin: 0, shake: 0, hitCd: 0, y: 0, pitch: 0, roll: 0 };
const T = () => SHIP_TIERS[P.tier];
const MEND = [0, 0.0012, 0.0025, 0.004, 0.0055, 0.007, 0.008, 0.009, 0.01]; // Oars & Crew level -> share of the hull mended per second at sea (about 7%, 15%, 24%, 33%, 42% a minute, then 48 / 54 / 60%)
// the design perks (only on the Jarl's own ships: a prize ship keeps her own colours and none of them)
const perk = (k) => (P.skin !== 'pats' ? 0 : ((HULLS[P.hull] || HULLS.oak).eff[k] || 0) + ((SAILS[P.sailD] || SAILS.pats).eff[k] || 0));
// shields and plates: the rune levels add less (it would be too easy to shrug everything off)
const SH_DEF = [0, 0.12, 0.24, 0.36, 0.4, 0.44, 0.47, 0.5, 0.52], AR_DEF = [0, 0.08, 0.16, 0.24, 0.26, 0.28, 0.29, 0.3, 0.31];
// past the Drakkar the seas keep growing with you: every species rises one level a ship size (and half a level more in Helheim)
const lvShift = () => Math.max(0, P.tier - 4) + (P.realm === 'hel' ? 0.5 : 0);
const maxHp = () => Math.round(100 * Math.pow(1.75, P.tier) * (1 + 0.25 * P.up.armor) * (1 + perk('hp') + (P.hall >= 5 ? 0.05 : 0)));
const topSpeed = () => T().speed * (1 + 0.1 * Math.min(5, P.up.sail) + 0.05 * Math.max(0, P.up.sail - 5)) * (boat.boost > 0 ? 1.35 : 1) * (boat.bifrost > 0 ? 1.25 : 1) * (boat.pod ? 1.1 : 1) * (1 + perk('spd'));
const turnRate = () => T().turn * (1 + 0.14 * Math.min(5, P.up.oars) + 0.06 * Math.max(0, P.up.oars - 5)) * (1 + perk('turn'));
const defense = () => Math.min(0.85, clamp(SH_DEF[P.up.shields] + AR_DEF[P.up.armor] + perk('def') - (boat.curse > 0 ? 0.2 : 0), 0, 0.7 + 0.02 * Math.max(0, P.up.shields - 5) + 0.01 * Math.max(0, P.up.armor - 5)) + (boat.thor > 0 ? 0.3 : 0));
const attack = () => 12 * Math.pow(1.65, P.tier) * (1 + 0.3 * Math.min(3, P.up.ballista) + 0.15 * Math.max(0, P.up.ballista - 3)) * (1 + perk('atk') + (P.hall >= 5 ? 0.05 : 0));
const fireRange = () => (P.up.ballista ? 24 + 6 * P.up.ballista : 16) + P.tier * 2;
let ship = null;
// the Jarl's own ships wear the shipwright's hull and sail; prize ships keep their own colours
const shipPal = () => (P.skin === 'pats' ? { ...PLAYER_PAL, ...(HULL_LOOK[P.hull] || {}), sail: P.sailD && P.sailD !== 'pats' ? P.sailD : 'pats' } : palOf(P.skin));
function rebuildShip() { if (ship) { scene.remove(ship.g); disposeTree(ship.g); } ship = buildShip(P.tier, P.up, shipPal(), 7); scene.add(ship.g); ship.g.position.set(boat.x, boat.y || 0, boat.z); ship.g.rotation.y = boat.yaw; hud(); }

// ---------- state ----------
let state = 'title', time = 0, zoom = 1.6, viewMode = 'chase', camYaw = Math.PI, camPos = new THREE.Vector3(0, 40, 40), camTgt = new THREE.Vector3(); let helmY = null;
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
  const R = Math.round(tablet ? clamp(Math.min(W * 0.3, H * 0.28, (W / 2 - 170) / 1.18), 100, 240) : clamp(Math.min(W * 0.24, H * 0.15, (W / 2 - 112) / 1.18), 64, 105)), cw = Math.round(R * 2.36), ch = Math.round(R * 1.12);
  Object.assign(helmBox, { R, cw, ch }); helmEl.style.width = cw + 'px'; helmEl.style.height = ch + 'px'; helmEl.style.clipPath = 'circle(' + Math.round(R * 1.18) + 'px at 50% ' + Math.round(ch + R * 0.06) + 'px)';
  const wrap = $('helmWrap'); wrap.style.width = cw + 'px'; wrap.style.height = ch + 'px';
  document.documentElement.style.setProperty('--helmH', ch + 'px'); document.documentElement.classList.toggle('tabletHud', tablet); helmDrawn = null; helmLift = Math.round(ch * 0.9); applyView(); }
addEventListener('resize', layoutHelm); layoutHelm();
function helmHub() { const r = helmEl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height + helmBox.R * 0.06]; }
function helmAngleAt(e) { const [cx, cy] = helmHub(); return Math.atan2(e.clientY - cy, e.clientX - cx); }
helmEl.addEventListener('pointerdown', (e) => { const [cx, cy] = helmHub(); if (Math.hypot(e.clientX - cx, e.clientY - cy) > helmBox.R * 1.18) return; e.preventDefault(); e.stopPropagation(); if (state !== 'play') return; unlockAudio(); helm.held = true; helm.id = e.pointerId; helm.last = helmAngleAt(e); try { helmEl.setPointerCapture(e.pointerId); } catch { /* ignore */ } helm.downT = performance.now(); helm.downX = e.clientX; helm.downY = e.clientY; });
helmEl.addEventListener('pointermove', (e) => { if (!helm.held || e.pointerId !== helm.id) return; const a = helmAngleAt(e); helm.angle = clamp(helm.angle + angDiff(a, helm.last) * 0.8, -HMAX, HMAX); helm.last = a; });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) helmEl.addEventListener(ev, (e) => { if (e.pointerId === helm.id) { helm.held = false; helm.id = null;
  // a tap is short and barely moves; two taps close together centre the wheel
  if (ev === 'pointerup') { const now = performance.now(); if (now - (helm.downT || 0) < 220 && Math.hypot(e.clientX - (helm.downX || 0), e.clientY - (helm.downY || 0)) < 10) { if (now - helm.tapT < 350) helm.angle = 0; helm.tapT = now; } } } });
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
const thrKeyOk = () => state === 'play' && !fishing && (!battle || !!battle.broad || !!(battle.legend && battle.legend.sail));
function thrKeyStep(dir) { if (!thrKeyOk()) return; const cur = boat.throttle || 0, next = dir > 0 ? THR_LV.find((l) => l > cur + 0.02) : [...THR_LV].reverse().find((l) => l < cur - 0.02); if (next != null) setThrottle(next); }
let thrHold = 0;
const keys = {}; addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); keys[k] = true; if (e.key === ' ' && !/INPUT|TEXTAREA/.test(e.target.tagName || '')) { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); if (state === 'play') fire(true); }
  if (state === 'play' && battle && battle.legend && battle.legend.kind === 'elder' && k >= '1' && k <= '4') elderRune(+k - 1);
  // C changes the view; E opens and shuts the sea chart
  if (k === 'c' && !e.repeat && state === 'play' && !battle && !fishing) $('viewBtn').click(); if (k === 'f' && !e.repeat && state === 'play' && !battle && !fishing) doAction(); if (k === 'e' && !e.repeat) { if (state === 'chart') closeChart(); else $('chartBtn').click(); }
  if (!e.repeat && (k === 'w' || k === 's' || k === 'arrowup' || k === 'arrowdown')) { thrHold = 0; thrKeyStep(k === 'w' || k === 'arrowup' ? 1 : -1); } }); addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; }); addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const ray = new THREE.Raycaster(), seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function tapSea(x, y) { if (battle && battle.legend) { legendTap(x, y); return; } ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(seaPlane, p)) return; setCourse(p.x, p.z); }
function setCourse(x, z) { boat.wp = { x: clamp(x, -HALF + 20, HALF - 20), z: clamp(z, -HALF + 20, HALF - 20) }; courseMark.visible = true; sfx.throw(); if ((boat.throttle || 0) < 0.3) setThrottle(0.8, true); }
const courseMark = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.8, depthWrite: false })); courseMark.rotation.x = -Math.PI / 2; courseMark.visible = false; scene.add(courseMark);

// ---------- HUD ----------
const an = (n) => (/^[AEIOU]/i.test(n) ? 'an ' : 'a ') + n;
const rname = (k) => (world.regions || REGIONS)[k].name;
const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1000) + 'k' : String(n));
function hud() { P.hp = Math.min(P.hp, maxHp()); $('hullFill').style.width = clamp(P.hp / maxHp(), 0, 1) * 100 + '%'; $('hullTxt').textContent = Math.ceil(P.hp) + ' / ' + maxHp(); $('rW').textContent = short(P.res.w); $('rI').textContent = short(P.res.i); $('rG').textContent = short(P.res.g); $('rF').textContent = short(P.res.f); $('rS').textContent = short(P.res.s || 0); $('rSw').classList.toggle('hidden', !(P.res.s > 0 || P.realm === 'hel')); $('shipName').textContent = P.shipName ? '“' + P.shipName + '”' : T().name; $('shipName').title = T().name; $('rF').parentElement.classList.toggle('hidden', !P.res.f); }
function say(t, secs = 2.6) { const m = $('msg'); m.innerHTML = t; m.style.opacity = 1; msgT = secs; }
function warn(t, secs = 3) { $('warn').innerHTML = t; warnT = secs; }
const tmpV = new THREE.Vector3();
function toScreen(x, y, z) { tmpV.set(x, y, z).project(camera); return tmpV.z < 1 ? [(tmpV.x * 0.5 + 0.5) * innerWidth, (-tmpV.y * 0.5 + 0.5) * innerHeight] : null; }
function pop(x, y, z, text, color = '#fff', life = 1.3) { const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.style.color = color; document.body.appendChild(el); pops.push({ el, x, y, z, t: 0, life }); }
function reward(r, x, y, z) { const parts = []; for (const [k, ic] of [['w', '🪵'], ['i', '⚙️'], ['g', '🪙'], ['f', '🐟'], ['s', '👻']]) if (r[k]) { P.res[k] = (P.res[k] || 0) + r[k]; if (k === 's' && r[k] > 0 && P.st) P.st.souls = (P.st.souls || 0) + r[k]; parts.push('+' + r[k] + ic); } if (parts.length) { pop(x, y, z, parts.join(' '), '#ffe27a', 1.8); sfx.coins(); } hud(); }
function hurtFx() { const h = $('hurt'); h.classList.add('on'); setTimeout(() => h.classList.remove('on'), 120); boat.shake = 0.4; }
const dmgLog = []; function damage(d, why) { d = Math.round(d); if (d <= 0) return; dmgLog.push([Math.round(time), d, why || '']); P.hp -= d; boat.lastHit = time; hurtFx(); sfx.hurt(); pop(boat.x, boat.y + 3, boat.z, '−' + d, '#ff6a4a'); if (why) say(why); hud(); if (P.hp <= 0 && state === 'play') sink(); }

// ---------- monsters and raiders ----------
const danger = (lv) => { const d = lv - P.tier; return d < -0.6 ? '#7dff3a' : d < 0.6 ? '#ffffff' : d < 1.6 ? '#ffb03a' : d < 3 ? '#ff4a3a' : '#d06aff'; };
// the seas grow with you at every size (v0.8.0, the loop analyst: the old table ran out at level 5). A species may spawn
// while its own level is at most size + 1.7, mostly those near your size; each is levelled from your ship (DELTA: mostly
// your level, one in five stronger) and never below its own level. A beast far above its own level is a 'Dread' one, a
// little bigger. Raiders come in sizes around yours. In Helheim everything is half a level more.
const DELTA = [[-1, 0.2], [-0.5, 0.2], [0, 0.25], [0.5, 0.15], [1, 0.12], [1.5, 0.08]];
function rollDelta() { let r = Math.random(); for (const [d, p] of DELTA) { r -= p; if (r <= 0) return d; } return 0; }
function spawnTable(region, night) { const out = [], tier = P.tier, c = Math.min(tier, 4.6), bias = REGION_BIAS[region] || {};
  for (const [type, lvs] of Object.entries(MLV)) { if (type === 'kraken' || type === 'squid' || type === 'elder' || type === 'jormungandr') continue; lvs.forEach((lv, v) => { if (lv > tier + 1.7) return; let w = (bias[type] || 1) * Math.exp(-((lv - c) ** 2) / 4.5) * (lv > tier + 0.8 ? 0.45 : 1); if (type === 'angler') w *= night ? 3 : 0.3; if (type === 'serpent' && tier === 0) w *= 0.6; if (type === 'megalodon') w *= v === 4 ? (night ? 1 : 0.08) : 0.35; w *= (VBIAS[region] || {})[type + ':' + v] || 1; if (w > 0.01) out.push({ type, v, lv, w }); }); }
  out.push({ type: 'raider', v: -1, lv: 0.4, w: 1.6 * (bias.raider || 1) * (P.realm === 'hel' ? 1.4 : 1) });
  if ((night || region === 'mist') && tier >= 2 && P.realm !== 'hel') out.push({ type: 'ghost', v: -1, lv: 3.5, w: 0.8 * (bias.ghost || 1) });
  return out; }
// level one spawn from your ship: the table entry gives the species and its own level (base)
function levelled(e) { const d = rollDelta(), hb = P.realm === 'hel' ? 0.5 : 0;
  if (e.type === 'raider') { const v = clamp(Math.round(P.tier + d), 0, 7); return { type: 'raider', v, lv: Math.max(0.4, P.tier + d + 0.4) + hb }; }
  if (e.type === 'ghost') return { type: 'ghost', v: clamp(Math.round(P.tier), 3, 7), lv: Math.max(3.5, P.tier + 0.5) + hb };
  return { type: e.type, v: e.v, base: e.lv, lv: Math.max(e.lv, P.tier + d) + hb }; }
function spawnMon(e, x, z, o = {}) {
  let m, size, top, naval = false;
  const hel = P.realm === 'hel', sea = world.regionAt(x, z);
  if (e.type === 'raider' || e.type === 'ghost') { const pal = hel ? (o.pal === TREASURE_PAL ? HEL_PALS.barge || HEL_PALS.home : Object.values(HEL_PALS).includes(o.pal) ? o.pal : HEL_PALS[sea] || HEL_PALS.home) : e.type === 'ghost' ? GHOST_PAL : o.pal || RAIDER_PALS[(Math.random() * RAIDER_PALS.length) | 0], arm = !o.merchant; const lvl = arm ? Math.min(3, e.v) : 0; const s = buildShip(e.v, { shields: lvl, armor: arm && e.v > 2 ? 1 : 0, ballista: arm && e.v > 1 ? 1 : 0, fire: 0, ram: 0, sail: e.v }, pal, (Math.random() * 999) | 0); if (o.merchant) addCargo(s);
    m = { g: s.g, anim: (dt, st) => s.anim(dt, { speed: st.speed * s.t.speed, time, night: isNight() }), name: pal.name, ship: s, skinKey: e.type === 'ghost' ? 'ghost' : pal === TREASURE_PAL ? 'treasure' : pal.name }; size = s.len * 0.5; top = s.mastTop + 1; naval = true; }
  else { const up = e.base != null ? Math.max(0, Math.min(4, e.lv - e.base)) : 0; m = makeMonster(e.type, e.v, (o.scale || 1) * (1 + 0.06 * up), hel ? sea : null); if (up >= 1.5 && !hel) m.name = 'Dread ' + m.name; size = m.size; top = m.top; }
  m.g.position.set(x, 0, z); scene.add(m.g);
  const lv = e.lv, hpMax = Math.round(45 * Math.pow(1.65, lv) * (o.boss ? 0.8 : naval ? 1 : 1.3));
  const tag = document.createElement('div'); tag.className = 'tag'; $('tags').appendChild(tag);
  const mon = { e, m, g: m.g, type: e.type, lv, hp: hpMax, maxHp: hpMax, dmg: Math.round(9 * Math.pow(1.5, Math.min(lv, 4)) * Math.pow(1.75, Math.max(0, lv - 4))), speed: (MSPEED[e.type] || (naval ? SHIP_TIERS[e.v].speed * 0.85 : 8)), size, top, naval, boss: !!o.boss, lair: o.lair || null,
    giant: !!m.giant, skinKey: m.skinKey, x, z, yaw: Math.random() * 6.28, state: o.boss ? 'rise' : 'wander', t: 0, wanderT: 0, att: 0, attT: -1, dive: o.boss ? 1 : 0, rise: o.boss ? 0 : 1, stun: 0, tag, name: m.name || SPECIES[e.type]?.variants[e.v]?.name || 'Monster', shotT: rnd(2, 4), dead: 0 };
  mon.passive = e.type === 'jelly'; mon.undead = hel; if (hel && !o.boss) { mon.hp = mon.maxHp = Math.round(hpMax * (naval ? 1.2 : 1.4 + 0.2 * Math.max(0, P.tier - 4))); mon.dmg = Math.round(mon.dmg * (naval ? 1.1 : 1.2)); }
  mons.push(mon); return mon; }
// free what a removed monster or ship built for itself (its tubes, hull and merged parts); the shared cached shapes and colours stay
function disposeTree(g) { g.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) if (!m.userData.shared) m.dispose(); }); }
function removeMon(mon) { scene.remove(mon.g); disposeTree(mon.g); mon.tag.remove(); const i = mons.indexOf(mon); if (i >= 0) mons.splice(i, 1); }
const calm = () => !!tut || (P.tier === 0 && P.kills < 2);
function updateSpawns(dt) { spawnT -= dt; if (spawnT > 0 || (battle && battle.legend)) return; spawnT = 1.5;
  for (const mon of [...mons]) { if (mon.boss) continue; if (Math.hypot(mon.x - boat.x, mon.z - boat.z) > 280 && !mon.dead) removeMon(mon); }
  const maxN = tut ? 1 : calm() ? 3 : Math.min(10, 5 + P.tier) + (isNight() ? 2 : 0); if (mons.filter((m) => !m.boss && !(tut && m === tut.mon)).length >= maxN) return;
  const a = Math.random() * 6.28, d = rnd(95, 170), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30 || world.blockAt(x, z, 12) || Math.hypot(x, z + 40) < 70) return;
  const table = spawnTable(world.regionAt(x, z), isNight()); if (!table.length) return; { const gr = groundAt(x, z) || groundAt(boat.x, boat.z, 40); if (gr) for (const t of table) if (t.type === gr.type) t.w *= 6; } let sum = table.reduce((s, e) => s + e.w, 0), pick = Math.random() * sum; let e = table[0]; for (const t of table) { pick -= t.w; if (pick <= 0) { e = t; break; } } e = levelled(e);
  if (e.type === 'jelly') { for (let k = 0; k < 3; k++) spawnMon(e, x + rnd(-8, 8), z + rnd(-8, 8)); } else spawnMon(e, x, z); }
// collisions (v1.1.0): a monster inside land is pushed out at once; ships and beasts never pass through your hull or each
// other (a fight's own placing is left alone: the beast beside you in a classic fight, the lanes of a battle line)
function unstick(mon) { for (let k = 0; k < 3; k++) { const bl = world.blockAt(mon.x, mon.z, mon.size * 0.4); if (!bl) break; const push = bl.r - bl.d + 0.2; mon.x += bl.nx * push; mon.z += bl.nz * push; } }
function separateMons() { const t = T(), rad = (m) => (m.naval ? m.size * 0.85 : m.size * 0.5), live = mons.filter((m) => !m.dead && !m.air && m.rise >= 1);
  if (state === 'play' && !boat.air) for (const m of live) { if (inFight(m)) continue; const dx = m.x - boat.x, dz = m.z - boat.z, d = Math.hypot(dx, dz) || 0.01, minD = rad(m) + t.L * 0.33; if (d < minD) { const k = minD - d; m.x += (dx / d) * k; m.z += (dz / d) * k; if (m.naval) boat.v *= 0.9; unstick(m); } }
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const a = live[i], b = live[j]; if (!a.naval && !b.naval) continue; const fa = inFight(a), fb = inFight(b); if (fa && fb) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 0.01, minD = rad(a) + rad(b); if (d < minD) { const k = (minD - d) * (fa || fb ? 1 : 0.5), ux = dx / d, uz = dz / d; if (!fa) { a.x -= ux * k; a.z -= uz * k; unstick(a); } if (!fb) { b.x += ux * k; b.z += uz * k; unstick(b); } } } }
function isNight() { return P.tod > 0.68 && P.tod < 0.97; }
function sightRange(mon) { let r = (34 + Math.min(6, mon.lv) * 6) * (1 - perk('sight')); if (wx.type === 'fog') r *= 0.45; if (isNight()) r *= P.skin === 'ghost' ? 0.5 : 0.8; return r; }
function updateMons(dt) {
  for (const mon of [...mons]) {
    const st = mon.stState || (mon.stState = { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 }); st.t += dt;
    if (mon.dead) { mon.dead += dt; st.dive = Math.min(1, mon.dead / 2); mon.g.position.y -= dt * (mon.naval ? 1.2 : 0.6); if (mon.naval) { mon.g.rotation.z = Math.min(1.2, mon.dead * 0.5); } mon.m.anim(dt, st); if (mon.dead > 3.5) removeMon(mon); continue; }
    if (inFight(mon)) { mon.outT = 0; animMon(mon, dt, st); continue; } if (mon.boss) { mon.outT = (mon.outT || 0) + dt; if (mon.outT > 20 && mon.hp < mon.maxHp) mon.hp = mon.maxHp; }
    if (mon.air) { const A = mon.air; flyStep(A, mon, dt); st.speed = 0; st.dive = 0; mon.g.position.set(mon.x, ocean.heightAt(mon.x, mon.z) + A.h, mon.z); mon.g.rotation.y = mon.yaw;
      if (mon.naval) { mon.m.ship.body.rotation.x = -A.pitch; mon.m.ship.body.rotation.z = A.roll; } else { mon.g.rotation.x = A.pitch * 0.6; mon.g.rotation.z = A.roll * 0.6; }
      mon.m.anim(dt, st); if (A.done) { mon.g.rotation.x = mon.g.rotation.z = 0; landMon(mon, A); } continue; }
    const dx = boat.x - mon.x, dz = boat.z - mon.z, d = Math.hypot(dx, dz); mon.t += dt; mon.stun = Math.max(0, mon.stun - dt); if (mon.hunt) mon.hunt = Math.max(0, mon.hunt - dt);
    let want = mon.yaw, spd = 0.35;
    // an undead shark or megalodon sinks under the black water and bursts up behind your stern
    if (mon.wraith > 0) { mon.wraith -= dt; mon.dive = Math.min(1, mon.dive + dt * 2.5); const bd = T().L * 0.45 + mon.size * 0.5 + 1, bx = boat.x - Math.sin(boat.yaw) * bd, bz = boat.z - Math.cos(boat.yaw) * bd, sa = boat.yaw + (mon.wside || 1) * Math.PI / 2, sd = T().B + mon.size + 4, k = Math.min(1, dt * 3), [gx, gz] = mon.wraith > 0.8 ? [boat.x + Math.sin(sa) * sd, boat.z + Math.cos(sa) * sd] : [bx, bz]; mon.x += (gx - mon.x) * k; mon.z += (gz - mon.z) * k; mon.yaw = Math.atan2(boat.x - mon.x, boat.z - mon.z);
      if (mon.wraith <= 0) { if (!world.blockAt(bx, bz, mon.size * 0.4)) { mon.x = bx; mon.z = bz; } mon.yaw = boat.yaw; mon.dive = 0; foam.splash(mon.x, mon.z, 1.6); say('<b>' + mon.name + ' bursts up behind you!</b>', 2.5); sfx.groan && sfx.groan(); } animMon(mon, dt, st); continue; }
    if (mon.state === 'rise') { mon.rise = Math.min(1, mon.rise + dt * (mon.riseK || 0.35)); mon.dive = 1 - mon.rise; if (mon.rise >= 1) { mon.state = 'chase'; } spd = 0; }
    else if (mon.treasure) { mon.flee -= dt; want = Math.atan2(-dx, -dz) + Math.sin(mon.t * 0.6) * 0.45; spd = 1;
      if (d < 75 && state === 'play' && mon.flee > 0 && (mon.drops || 0) < 6) { mon.dropT -= dt; if (mon.dropT <= 0) { mon.drops = (mon.drops || 0) + 1; mon.dropT = rnd(2.5, 4); const r = Math.random(); const hb = P.realm === 'hel'; spawnFloat(mon.x - Math.sin(mon.yaw) * (mon.size + 2), mon.z - Math.cos(mon.yaw) * (mon.size + 2), hb ? (r < 0.6 ? 's' : 'g') : r < 0.5 ? 'g' : r < 0.8 ? 'i' : 'w', hb ? 3 : 0); if (!mon.dropSaid) { mon.dropSaid = true; say(hb ? 'The ferrymen throw souls overboard to lighten the barge! Sail through them.' : 'They\'re throwing cargo overboard to lighten the ship!'); } } }
      if (mon.flee <= 0 && d > 55) { say((P.realm === 'hel' ? 'The soul barge' : 'The treasure knarr') + ' slips away over the horizon.'); removeMon(mon); continue; } }
    else if (mon.stun > 0 || (mon.passive && mon.state !== 'chase')) { mon.wanderT -= dt; if (mon.wanderT <= 0) { mon.wanderT = rnd(3, 7); mon.wy = mon.yaw + rnd(-1.2, 1.2); } want = mon.wy ?? mon.yaw; spd = mon.stun > 0 ? 0.5 : 0.25; if (mon.stun > 0) want = Math.atan2(-dx, -dz); }
    else if (mon.state === 'chase' || (d < sightRange(mon) && state === 'play' && !(tut && mon !== tut.mon))) { if (mon.state !== 'chase') { mon.state = 'chase'; if (mon.lv > P.tier + 0.6) say('<span style="color:' + danger(mon.lv) + '">' + mon.name + '</span> has seen you!'); sfx.groan && sfx.groan(); }
      want = Math.atan2(dx, dz); if (mon.undead && !mon.wraithDone && (mon.type === 'shark' || mon.type === 'megalodon') && d < 30 && d > 12 && state === 'play' && !battle) { mon.wraithDone = true; mon.wraith = 1.6; mon.wside = Math.random() < 0.5 ? 1 : -1; foam.splash(mon.x, mon.z, 1); } if (mon.fleetOff && d > 40) { const o = mon.fleetOff * Math.min(1, (d - 40) / 60); want = Math.atan2(dx + (dz / d) * o, dz - (dx / d) * o); } spd = 1; if (d > sightRange(mon) * 1.8 && !mon.boss && !mon.hunt) mon.state = 'wander';
      if (mon.naval && d < 34 && d > 12) { mon.shotT -= dt; if (mon.shotT <= 0) { mon.shotT = rnd(2.5, 4); enemyArrows(mon); } } }
    else { mon.wanderT -= dt; if (mon.wanderT <= 0) { mon.wanderT = rnd(3, 8); mon.wy = mon.yaw + rnd(-1.4, 1.4); } want = mon.wy ?? mon.yaw; spd = 0.3; }
    // steer around islands
    const ax = mon.x + Math.sin(want) * (mon.size + 8), az = mon.z + Math.cos(want) * (mon.size + 8); if (world.blockAt(ax, az, 2)) want += 1.2;
    mon.yaw += clamp(angDiff(want, mon.yaw), -dt * 1.6, dt * 1.6); let sp = mon.speed * spd * (mon.state === 'chase' ? 1 : 0.5); if (mon.state === 'chase' && mon.lv > P.tier + 0.5 && !mon.boss) sp = Math.min(sp, topSpeed() * 0.86); if (mon.enrage > 0) { mon.enrage -= dt; if (mon.state === 'chase') sp = Math.max(sp, topSpeed() * 1.1); } if (mon.treasure) sp = topSpeed() * (mon.flee <= 0 ? 1.3 : d < 25 ? 0.7 : 0.8);
    if (mon.state === 'chase') { mon.chaseT = (mon.chaseT || 0) + dt; if (mon.chaseT > 24 && d > 22 && !mon.boss && !mon.hunt) { mon.state = 'wander'; mon.chaseT = 0; mon.stun = 10; } } else mon.chaseT = 0;
    let nx = mon.x + Math.sin(mon.yaw) * sp * dt, nz = mon.z + Math.cos(mon.yaw) * sp * dt; const bl = world.blockAt(nx, nz, mon.size * 0.4); if (bl) { nx = mon.x + bl.nx * dt * 3; nz = mon.z + bl.nz * dt * 3; mon.yaw += dt * 2; } mon.x = nx; mon.z = nz; unstick(mon);
    st.speed = spd; animMon(mon, dt, st); if (mon.undead && Math.random() < dt * 3 && d < 140) soulFx.add(mon.x + rnd(-1, 1) * mon.size * 0.5, mon.z + rnd(-1, 1) * mon.size * 0.5, { spray: true, y: mon.g.position.y + mon.top * rnd(0.2, 0.7), vx: rnd(-0.3, 0.3), vz: rnd(-0.3, 0.3), vy: rnd(0.8, 1.8), g: -0.3, s: rnd(0.25, 0.5), grow: 0.4, life: 1.8, a: 0.85 });
    // contact
    if (state === 'play' && !battle && !fishing && !boat.air && boat.grace <= 0 && mon.stun <= 0 && mon.rise >= 1 && d < mon.size * 0.7 + T().L * 0.42) contact(mon);
  }
}
// smoke and sparks from a burning ship
function shipSmoke(s, dt) { if (!s.dmg || s.dmg.k < 0.55) return; for (const p of s.fireSpots()) { if (Math.random() < dt * 4) smoke.add(p.x, p.z, { spray: true, y: p.y + 1, vx: rnd(-0.4, 0.4), vz: rnd(-0.4, 0.4), vy: rnd(1.5, 2.6), g: -0.1, s: rnd(1.2, 2), grow: 1.4, life: 3.5, a: 0.45 });
  if (Math.random() < dt * 6) embers.add(p.x + rnd(-0.4, 0.4), p.z + rnd(-0.4, 0.4), { spray: true, y: p.y + 0.6, vx: rnd(-1, 1), vz: rnd(-1, 1), vy: rnd(3, 5), g: 3, s: 0.3, grow: 0, life: 0.8, a: 1 }); } }
// in Jormungandr's hunt the fight itself poses it (dive, strike); elsewhere the monster's own state does
function animMon(mon, dt, st) { const posed = !!battle && !!battle.legend && (battle.legend.kind === 'jorm' || battle.legend.kind === 'beast') && battle.mon === mon; if (posed) { /* updateJorm sets st.dive and st.attack */ } else if (mon.attT >= 0) { mon.attT += dt; st.attack = Math.sin(Math.min(1, mon.attT / 0.9) * Math.PI); if (mon.attT > 0.9) { mon.attT = -1; st.attack = 0; } } else st.attack = Math.max(0, st.attack - dt * 2);
  if (!posed) st.dive = mon.dive; st.rise = mon.rise; st.hurt = Math.max(0, (st.hurt || 0) - dt * 2); mon.g.position.x = mon.x; mon.g.position.z = mon.z; mon.g.rotation.y = mon.yaw;
  if (!posed && !mon.naval && battle && battle.mon === mon && !battle.legend && mon.attT >= 0) { const k = Math.sin(Math.min(1, mon.attT / 0.9) * Math.PI), reach = battle.lunge === 'U' ? 0.75 : 0.5; mon.g.position.x = mon.x + (boat.x - mon.x) * reach * k; mon.g.position.z = mon.z + (boat.z - mon.z) * reach * k; }
  if (mon.naval) { const tl = ocean.tiltAt(mon.x, mon.z, mon.yaw, mon.size * 2, mon.size * 0.4); mon.g.position.y = tl.y; mon.m.ship.body.rotation.x = -tl.pitch * 0.8; mon.m.ship.body.rotation.z = -tl.roll * 0.8; } else mon.g.position.y = ocean.heightAt(mon.x, mon.z);
  mon.m.anim(dt, st); if (mon.naval) { mon.m.ship.setDamage(mon.dead ? 1 : 1 - (battle && battle.mon === mon && battle.foe && !battle.broad ? battle.foe.hp : mon.hp) / mon.maxHp); if (Math.hypot(mon.x - boat.x, mon.z - boat.z) < 150) shipSmoke(mon.m.ship, dt); } }
function contact(mon) { if (tut && mon !== tut.mon && !mon.naval) return;
  const fwd = Math.atan2(mon.x - boat.x, mon.z - boat.z), head = Math.abs(angDiff(fwd, boat.yaw)) < 0.6;
  if (P.up.ram && head && !mon.boss && boat.v > topSpeed() * 0.55) { const d = Math.round(Math.min(mon.maxHp * 0.6, attack() * (0.6 + 0.5 * P.up.ram) * (boat.thor > 0 ? 2 : 1))); mon.hp -= d; pop(mon.x, mon.top, mon.z, 'RAMMED −' + d, '#ffd24a'); sfx.boom(); foam.splash(mon.x, mon.z, 1.5); if (mon.hp <= 0) { killMon(mon); return; } }
  if (mon.type === 'jelly') { damage(maxHp() * 0.04 * (1 - defense()), 'Stung by a ' + mon.name + '!'); mon.stun = 3; if (boat.v > 3) { mon.hp -= attack() * 0.6; if (mon.hp <= 0) killMon(mon); } return; }
  startBattle(mon, !!mon.treasure); }
function enemyArrows(mon) { for (let k = 0; k < 4; k++) setTimeout(() => { if (state !== 'play') return; launch({ x: mon.x, y: 3, z: mon.z }, { x: boat.x + rnd(-2, 2), y: 1, z: boat.z + rnd(-2, 2) }, 'arrow', () => { if (!battle && state === 'play') damage(mon.dmg * 0.12 * (1 - defense())); }); }, k * 120); sfx.throw(); }
function killMon(mon) { if (mon.dead) return; mon.dead = 0.01; mon.tag.remove(); P.kills++; const lv = mon.lv, r = mon.naval ? { w: Math.round(12 * Math.pow(1.6, lv)), i: Math.round(3 + lv * 3), g: Math.round(16 * Math.pow(1.6, lv)) } : { i: Math.round(2 + lv * 3), g: Math.round(12 * Math.pow(1.6, lv)) };
  if (mon.type === 'jelly') { r.i = 0; r.g = Math.round(r.g * 0.4); } if (mon.treasure) { r.g *= 3; r.i = Math.round(r.i * 1.5); say('<b>💰 The treasure is yours!</b>', 3.5); } if (mon.ambush) r.g = Math.round(r.g * 1.5);
  r.g = Math.round(r.g * (1 + perk('gold'))); if (mon.undead && mon.type !== 'jelly') r.s = mon.boss && mon.lair ? Math.round((mon.reborn ? 100 : 150) * (1 + 0.25 * (mon.reborn ? (P.reborn[mon.lair] || 0) + 1 : 0)) * (P.tithe > 0 ? 1.25 : 1)) : Math.max(1, Math.round((2 + 2 * (lv - P.tier)) * (mon.naval ? 1.5 : 1) * (mon.young ? 2 : 1) * (mon.treasure ? 3 : 1) * (1 + perk('souls')) * (P.tithe > 0 ? 1.25 : 1)));
  if (mon.lair) lairCool[mon.lair] = Math.max(lairCool[mon.lair] || 0, time + rnd(60, 110)); if (mon.boss && mon.lair) { const rb = mon.reborn ? Math.min(5, (P.reborn[mon.lair] || 0) + 1) : 0; r.g += Math.round(70 * Math.pow(1.6, lv) * (1 + 0.25 * rb)); r.i += 40 + 10 * rb; }
  if (mon.young) { r.g = Math.round(r.g * 1.5); setTimeout(() => say('<b>The ' + mon.name + ' is slain!</b> ' + LAIR_NAMES[mon.young] + ' still sleeps below.', 4.5), 600); }
  reward(r, mon.x, mon.top + 1, mon.z); foam.splash(mon.x, mon.z, 2); if (mon.fleet) fleetDown(mon.fleet); bountyHit('kill', mon); if (mon.naval) P.st.ships = (P.st.ships || 0) + 1; else { P.st.k[mon.type] = (P.st.k[mon.type] || 0) + 1; const vk = mon.undead ? 'u:' + mon.type : mon.type + ':' + mon.e.v; P.st.v = P.st.v || {}; P.st.v[vk] = (P.st.v[vk] || 0) + 1; } sagaCheck();
  if (mon.type === 'ghost' && !P.relics.bane && !P.maps.some((m) => m.kind === 'relic')) setTimeout(() => giveMap('relic'), 1500); else if (mon.naval && Math.random() < (mon.treasure ? 0.6 : 0.12)) setTimeout(() => giveMap(), 1600);
  if (mon.boss && mon.lair && mon.reborn) { const n = (P.reborn[mon.lair] = Math.min(5, (P.reborn[mon.lair] || 0) + 1)); say('<b>' + mon.name.toUpperCase() + ' FALLS AGAIN!</b> Rebirth ' + n + ' of 5: it will rise stronger still.', 5); sfx.horn(); save(); }
  else if (mon.boss && mon.lair) { P.legends[mon.lair] = true; const L0 = world.lairs.find((l) => l.key === mon.lair); if (L0) L0.beaten = true; const hel = P.realm === 'hel', n = legendCount(hel);
    say('<b>' + mon.name.toUpperCase() + ' IS SLAIN!</b> Legends of ' + (hel ? 'Helheim' : 'Midgard') + ': ' + n + ' / ' + Object.keys(hel ? LAIRS_HEL : LAIRS).length, 5); sfx.horn(); setTimeout(() => legendDesigns(mon.lair), 5200);
    if (!hel && n >= Object.keys(LAIRS).length && !P.won) setTimeout(winGame, 2500); if (hel && n >= Object.keys(LAIRS_HEL).length && !P.helWon) { P.helWon = true; setTimeout(helWin, 2500); } save(); } }
const legendCount = (hel) => Object.keys(hel ? LAIRS_HEL : LAIRS).filter((k) => P.legends[k]).length;
// a slain legend leaves something for the shipwright: its hide for a hull, its likeness for a sail
function legendDesigns(key) { sagaCheck(); const got = []; for (const [k, d] of Object.entries(HULLS)) if (d.got.legend === key && !P.owned.h.includes(k)) { P.owned.h.push(k); got.push(d.name + (/hull$/i.test(d.name) ? '' : ' hull')); }
  for (const [k, d] of Object.entries(SAILS)) if (d.got.legend === key && !P.owned.s.includes(k)) { P.owned.s.push(k); got.push(d.name + ' sail'); } if (got.length) { say('🎨 New at every shipwright: the ' + got.join(' and the ') + '!', 5); save(); } }

// ---------- projectiles (spears, bolts, enemy arrows) ----------
const spearGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5); spearGeo.rotateX(Math.PI / 2); const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.4, 6); boltGeo.rotateX(Math.PI / 2);
function launch(a, b, kind, onHit) { const g = new THREE.Group(); const m = new THREE.Mesh(kind === 'bolt' ? boltGeo : spearGeo, M(kind === 'arrow' ? 0xff8a2a : 0x8a6a4a, kind === 'arrow' ? 'glow' : 'skin')); g.add(m); if (kind !== 'arrow') { const tip = new THREE.Mesh(kind === 'bolt' ? sharedGeo('boltTip', () => new THREE.ConeGeometry(0.18, 0.4, 6)) : sharedGeo('spearTip', () => new THREE.ConeGeometry(0.1, 0.4, 6)), M(0xb8c0c8)); tip.rotation.x = Math.PI / 2; tip.position.z = kind === 'bolt' ? 1.3 : 0.9; g.add(tip); }
  g.position.set(a.x, a.y, a.z); scene.add(g); const dist = Math.hypot(b.x - a.x, b.z - a.z); projs.push({ g, a: V(a.x, a.y, a.z), b: V(b.x, b.y, b.z), t: 0, dur: clamp(dist / 34, 0.25, 1.1), arc: dist * 0.12, onHit, kind }); }
function updateProjs(dt) { for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.t += dt / p.dur; const k = Math.min(1, p.t); const pos = p.a.clone().lerp(p.b, k); pos.y += Math.sin(k * Math.PI) * p.arc; const nxt = p.a.clone().lerp(p.b, Math.min(1, k + 0.02)); nxt.y += Math.sin(Math.min(1, k + 0.02) * Math.PI) * p.arc; p.g.position.copy(pos); p.g.lookAt(nxt);
    if (p.t >= 1) { scene.remove(p.g); projs.splice(i, 1); if (p.onHit) p.onHit(); } } }
// a spear or bolt hitting a monster
function spearHit(tgt, kind) { if (tgt.dead) return; if (tgt.boss && !inFight(tgt)) { pop(tgt.x, tgt.top + tgt.g.position.y, tgt.z, 'IT SHRUGS IT OFF', '#c8c8c8'); tgt.state = 'chase'; return; } const d = Math.round(attack() * (kind === 'bolt' ? 0.75 : 0.45) * (boat.thor > 0 ? 2 : 1) * rnd(0.85, 1.15)); tgt.hp -= d; tgt.stState && (tgt.stState.hurt = 1); pop(tgt.x, tgt.top + tgt.g.position.y, tgt.z, '−' + d, '#ffd24a'); sfx.hit(); foam.splash(tgt.x, tgt.z, 0.7);
  if (tgt.hp <= 0) killMon(tgt); else if (!tgt.passive) { tgt.state = 'chase'; tgt.chaseT = 0; if (!tgt.treasure) tgt.enrage = 3.5; } }
// ahead (Space on a keyboard): only aim at a monster in front of the bow, else throw straight ahead (it still hits what it lands on)
function fire(ahead = false) { if (battle && battle.broad) { broadFire(); return; } if (battle && battle.legend) { legendFire(); return; } if (state !== 'play' || battle || fishing || boat.fireCd > 0) return; const range = fireRange(); let best = null, bd = 1e9;
  for (const mon of mons) { if (mon.dead || mon.rise < 1) continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (ahead && Math.abs(angDiff(Math.atan2(mon.x - boat.x, mon.z - boat.z), boat.yaw)) > 0.55) continue; if (d < range && d < bd) { bd = d; best = mon; } }
  const kind = P.up.ballista ? 'bolt' : 'spear'; boat.fireCd = P.up.ballista ? 2.2 - Math.min(5, P.up.ballista) * 0.25 - Math.max(0, P.up.ballista - 5) * 0.05 : 1.2; const from = { x: boat.x + Math.sin(boat.yaw) * T().L * 0.35, y: boat.y + 2, z: boat.z + Math.cos(boat.yaw) * T().L * 0.35 };
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
  const foe = { special: mon.type === 'octopus' || mon.type === 'squid' ? 'grab' : mon.type === 'serpent' || mon.type === 'leviathan' ? 'coil' : (mon.undead && { crab: 'burn', eel: 'burn', shark: 'drain', megalodon: 'drain', angler: 'drain' }[mon.type]) || null, specialK: mon.undead ? 0.3 : 0.22, name: mon.name, lvShow: Math.round(mon.lv) + 1, lv: Math.round(mon.lv * 10) / 10, hp: mon.hp, maxHp: mon.maxHp, dmg: mon.dmg, naval: mon.naval, boss: mon.boss, attacks: mon.boss ? 3 : mon.lv >= 3 ? 2 : 1, attackNames: ATK[mon.type] };
  const you = { hp: P.hp, maxHp: maxHp(), def: defense(), atk: attack(), zone: 0.15 + P.up.ballista * 0.04, fire: P.up.fire ? 1 + Math.floor(P.up.fire / 2) : 0, potK: [0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6][P.up.fire] * (1 + perk('fire')), thor: boat.thor > 0, shots: 3, weapon: P.up.ballista ? 'BALLISTA' : 'SPEARS' };
  Object.assign(foe, { crew: mon.naval ? (mon.type === 'ghost' ? 25 : SHIP_TIERS[mon.e.v].crew) : 0, ghost: mon.type === 'ghost', boardBlock: boardInfo(mon) }); Object.assign(you, { hooks: P.up.hooks, crew: T().crew + 2 * P.up.oars });
  battle.foe = foe; battle.you = you;
  minis.battle({ foe, you, youName: T().name, firstStrike, board: !!opts.board, intro: mon.boss ? mon.name.toUpperCase() + '!' : mon.treasure ? 'BOARD HER!' : mon.ambush ? 'AMBUSH!' : mon.fleet ? 'FLEET BATTLE!' : undefined }, (res) => {
    P.hp = Math.max(0, you.hp); mon.hp = foe.hp; boat.lastHit = time; setBattle(false); boat.grace = 3.5; $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); const b = battle; battle = null; hud();
    if (res.result === 'win') { killMon(mon); setThrottle(0, true); } // stop after a win so the kill is right beside you
    else if (res.result === 'boarded') { setThrottle(0, true); prizeChoice(mon); }
    if (res.cursed && !perk('curse')) { boat.curse = 60; setTimeout(() => say('☠ The draugr curse you: your defence is weakened for 60 s.', 4), 400); }
    else if (res.result === 'flee') { mon.stun = 7; boat.boost = 3.5; boat.v = topSpeed(); setThrottle(1, true); say('You row hard and break away!'); }
    if (res.result === 'sunk' || P.hp <= 0) { sink(); return; } void b; });
}
function battleShoot(mult, dmg, txt, fireP) { if (!battle) return; const mon = battle.mon, from = { x: boat.x, y: boat.y + 2.5, z: boat.z }; launch(from, { x: mon.x, y: mon.g.position.y + Math.max(1, mon.top * 0.45), z: mon.z }, P.up.ballista ? 'bolt' : 'spear', () => { if (mult > 0) { foam.splash(mon.x, mon.z, fireP ? 2 : 1); mon.stState && (mon.stState.hurt = 1); pop(mon.x, mon.g.position.y + mon.top, mon.z, (fireP ? '🔥 ' : '') + '−' + dmg, fireP ? '#ff8a2a' : mult >= 2 ? '#ffd24a' : '#fff'); } else { foam.splash(mon.x + rnd(-4, 4), mon.z + rnd(-4, 4), 0.6); } });
  if (fireP) { const f = new THREE.Mesh(sharedGeo('pot', () => new THREE.SphereGeometry(0.4, 8, 6)), M(0xff8a2a, 'glow')); scene.add(f); projs.push({ g: f, a: V(from.x, from.y, from.z), b: V(mon.x, mon.g.position.y + mon.top * 0.4, mon.z), t: 0, dur: 0.6, arc: 4, onHit: () => { for (let k = 0; k < 12; k++) foam.add(mon.x + rnd(-2, 2), mon.z + rnd(-2, 2), { spray: true, y: mon.g.position.y + 1, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(3, 7), s: 0.8, life: 0.8, a: 0.9 }); } }); } }
function battleHurt(d) { boat.shake = 0.9; hurtFx(); P.hp = Math.max(0, P.hp - 0); pop(boat.x, boat.y + 3, boat.z, '−' + d, '#ff6a4a'); foam.splash(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), 1.2); sfx.splash(); $('hullFill').style.width = clamp(battle.you.hp / maxHp(), 0, 1) * 100 + '%'; $('hullTxt').textContent = Math.max(0, Math.ceil(battle.you.hp)) + ' / ' + maxHp(); }
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
  const t = T(), all = [mon, ...mons.filter((m) => m !== mon && m.naval && !m.dead && !m.boss && !m.treasure && !m.air && !mon.treasure && (m.state === 'chase' || (mon.fleet && m.fleet === mon.fleet)) && Math.hypot(m.x - boat.x, m.z - boat.z) < 90).slice(0, 3)];
  // the line runs across the line between you and her (so she starts beside you); try other headings and centres for open
  // water, then a shorter run-up, then fewer foes (the rest join the chase afterwards)
  const toHer = Math.atan2(mon.x - boat.x, mon.z - boat.z), mx = (boat.x + mon.x) / 2, mz = (boat.z + mon.z) / 2; let F = null, foes, Lmax, Bmax, gap, spacing, Lh;
  for (let nf = all.length; nf >= 1 && !F; nf--) for (const run of [20, 12]) { if (F) break; foes = all.slice(0, nf); Lmax = Math.max(...foes.map((f) => tierOf(f).L)); Bmax = Math.max(...foes.map((f) => tierOf(f).B)); gap = 9 + (t.B + Bmax) * 1.1; spacing = Lmax + 7; Lh = run + ((foes.length - 1) * spacing) / 2 + Lmax * 0.5;
    for (let c = 0; c < 48 && !F; c++) { const th = toHer + Math.PI / 2 + [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.57][c % 8], sh = (Math.floor(c / 8) % 3) * 18, al = c >= 24 ? 30 : 0, ax = Math.sin(th), az = Math.cos(th), cx = Math.sin(th - Math.PI / 2), cz = Math.cos(th - Math.PI / 2), sg = c % 2 ? 1 : -1, ox = mx + cx * sh * sg + ax * al * sg, oz = mz + cz * sh * sg + az * al * sg;
      let ok = true; for (let u = -(Lh + Lmax); ok && u <= Lh + Lmax; u += 5) for (const v of [-(gap / 2 + t.B + 3), 0, gap / 2 + Bmax + 3]) { const x = ox + ax * u + cx * v, z = oz + az * u + cz * v; if (Math.abs(x) > HALF - 25 || Math.abs(z) > HALF - 25 || world.blockAt(x, z, 1)) { ok = false; break; } }
      if (ok) F = { ox, oz, ax, az, cx, cz }; } }
  if (!F) { say('⚔ No sea room for a battle line here: <b>close quarters!</b>', 3); return false; }
  const B = { ...F, gap, spacing, Lh, foes, yC: -gap / 2, eC: gap / 2, sp: 0, vp: 0, anchor: Lh * 0.7, ve: 0, mode: 'move', target: -Lh * 0.75, holdT: 0, stopNext: Math.random() < 0.5, sweeps: 0, swap: null, k: 0, reload: 0.8, start: [[boat.x, boat.z], ...foes.map((f) => [f.x, f.z])], camYaw: Math.atan2(F.cx, F.cz), my: broadArrow(0xffd24a), shots: [], burn: new Map() };
  for (const f of foes) { f.bx = { reload: 2 + Math.random(), err: 0, last: null, aimT: 0, arrow: broadArrow(0xff4a3a) }; f.state = 'chase'; }
  battle = { mon, t: 0, broad: B }; boat.wp = null; helm.held = false; setBattle(true); if ((boat.throttle || 0) < 0.3) setThrottle(0.6, true);
  $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy', 'broadOn');
  const ui = document.createElement('div'); ui.id = 'broad';
  ui.innerHTML = `<div class="bFoe"><b id="bFoeName"></b><div class="hp foe"><i id="bFoeHp"></i></div></div><div class="bHint" id="bHint">Fire when a red mark is in the green: your volley lands as she comes abeam of your gold arrow.</div><div class="bStrip"><b id="bZone"></b><b id="bPerf"></b><em>▲</em>${foes.map((_, i) => `<i id="bShip${i}"></i>`).join('')}<span id="bAim">⚠ SHE AIMS</span></div>
    <button class="bFire" id="bFire">FIRE<i id="bLoad"></i></button><div class="bSide"><button class="mgBoard hidden" id="bBoard">🪝 BOARD HER</button><button class="ghost" id="bFlee">FLEE</button></div>`;
  $('hud').appendChild(ui); $('bFire').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); broadFire(); }; $('bFlee').onclick = (e) => { e.stopPropagation(); endBroadside('flee'); }; $('bBoard').onclick = (e) => { e.stopPropagation(); const B = battle && battle.broad, tg = B && boardTarget(B), why = tg ? boardInfo(tg) : 'NO SHIP TO BOARD'; if (!tg || why) { warn(why, 2); return; } endBroadside('board'); };
  warn(mon.treasure ? '⚔ RUN HER DOWN! ⚔' : foes.length > 1 ? '⚔ ' + foes.length + ' SHIPS FORM A BATTLE LINE! ⚔' : '⚔ SHIP BATTLE! ⚔', 2.5); sfx.horn(); return true; }
const lanePos = (B, s, v) => [B.ox + B.ax * s + B.cx * v, B.oz + B.az * s + B.cz * v];
const foeAt = (B, i) => B.anchor + (i - (B.foes.length - 1) / 2) * B.spacing; // the column: lead ship first, in line astern
function nearFoe(B) { let best = 0, bd = 1e9; B.foes.forEach((f, i) => { const d = Math.abs(foeAt(B, i) - B.sp); if (d < bd) { bd = d; best = i; } }); return best; }
const broadReload = () => 2.4 - 0.3 * Math.min(5, P.up.ballista) - 0.05 * Math.max(0, P.up.ballista - 5);
const broadFlight = () => clamp(battle.broad.gap / 34, 0.25, 1.1); // the same time launch() gives a bolt over that gap
function broadFire() { const B = battle && battle.broad; if (!B || B.reload > 0 || B.k < 1 || B.swap) return; B.reload = broadReload(); unlockAudio(); sfx.throw();
  const t = T(), n = 3 + P.up.ballista, dir = Math.sign(B.eC - B.yC);
  for (let i = 0; i < n; i++) { const s = (i / (n - 1) - 0.5) * t.L * 0.6, [fx, fz] = lanePos(B, B.sp + s, B.yC + dir * t.B * 0.5), [hx, hz] = lanePos(B, B.sp + s, B.eC);
    setTimeout(() => { if (battle && battle.broad === B) launch({ x: fx, y: boat.y + 1.8, z: fz }, { x: hx, y: 1, z: hz }, P.up.ballista ? 'bolt' : 'spear'); }, i * 50); }
  B.shots.push({ me: true, s: B.sp, t: broadFlight() + 0.05 }); }
function broadFoeFire(B, f, i, sAt) { const L = tierOf(f).L, dir = Math.sign(B.yC - B.eC), se = sAt ?? foeAt(B, i);
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
      if (B.k < 1 || f.treasure || A.reload > 0 || Math.abs(se - B.sp) > 14) { A.last = null; A.aimT = 0; A.lock = null; return; }
      // she takes aim for 0.8 s at the spot she has reckoned, then fires there; change speed while SHE AIMS shows and two times in
      // three her volley falls wide
      if (A.lock) { A.lock.t -= dt; A.aimT = 1; if (A.lock.t <= 0) { let sAt = A.lock.s; if (Math.abs((boat.throttle || 0) - A.lock.thr) > 0.05 && Math.random() < 0.65) sAt += (Math.random() < 0.5 ? -1 : 1) * (hlY + 3); broadFoeFire(B, f, i, sAt); A.lock = null; A.reload = 3.2; A.last = null; A.aimT = 0; } return; }
      if (A.last == null) A.err = (Math.random() * 2 - 1) * hlY * clamp(2.6 - 0.3 * f.lv, 1, 2.6);
      const diff = se - (B.sp + B.vp * (tf + 0.8)) - A.err; A.aimT = Math.abs(diff) < 3 ? A.aimT + dt : 0; if (A.last != null && Math.sign(diff) !== Math.sign(A.last)) { A.lock = { s: se, t: 0.8, thr: boat.throttle || 0 }; A.last = null; } else A.last = diff; }); }
  // the arrows: yours from your hull across to her lane, each of theirs from her hull across to yours
  const dirE = Math.sign(B.eC - B.yC), yawE = Math.atan2(B.cx * dirE, B.cz * dirE), y0 = ocean.heightAt(boat.x, boat.z) + 0.4, show = !B.swap && B.k >= 1;
  const [ax0, az0] = lanePos(B, B.sp, B.yC + dirE * t.B * 0.6); B.my.position.set(ax0, y0, az0); B.my.rotation.y = yawE; B.my.scale.set(1.4, 1, B.gap + 4 - t.B * 0.6); B.my.visible = show;
  B.my.material.opacity = B.reload <= 0 ? 0.85 : 0.25; B.my.material.color.setHex(B.reload <= 0 ? 0xffd24a : 0x9a8a6a);
  B.foes.forEach((f, i) => { const A = f.bx, eT = tierOf(f), [hx, hz] = lanePos(B, foeAt(B, i), B.eC - dirE * eT.B * 0.6); A.arrow.position.set(hx, y0, hz); A.arrow.rotation.y = yawE + Math.PI; A.arrow.scale.set(1.4, 1, B.gap + 4 - eT.B * 0.6); A.arrow.visible = show;
    A.arrow.material.opacity = f.treasure ? 0.12 : A.aimT > 0 ? 0.55 + 0.4 * Math.sin(battle.t * 30) : 0.3; });
  // volleys landing
  for (let i = B.shots.length - 1; i >= 0; i--) { const s = B.shots[i]; s.t -= dt; if (s.t > 0) continue; B.shots.splice(i, 1);
    if (s.me) { let hit = -1, best = 1e9; B.foes.forEach((f, j) => { const off = Math.abs(foeAt(B, j) - s.s); if (off < tierOf(f).L / 2 + 1.5 && off < best) { best = off; hit = j; } }); const [hx, hz] = lanePos(B, s.s, B.eC);
      if (hit >= 0) { const f = B.foes[hit], perfect = best < (tierOf(f).L / 2 + 1.5) * 0.35, d = Math.round(attack() * 1.15 * (1 + 0.12 * Math.max(0, P.tier - 4)) * (perfect ? 1.6 : 1) * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); f.hp -= d; if (f.stState) f.stState.hurt = 1; sfx.hit(); foam.splash(f.x, f.z, 1.4);
        pop(f.x, f.g.position.y + f.top + 1, f.z, (perfect ? 'PERFECT! ' : '') + '−' + d, perfect ? '#ffd24a' : '#ffffff'); if (P.up.fire) B.burn.set(f, (3 + P.up.fire) * (1 + perk('fire'))); }
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
const broadLabel = () => { const b = $('broadToggle'); if (!b) return; b.textContent = '⚔ ACTION BATTLES: ' + (BROAD.on ? 'ON' : 'OFF (classic)'); b.classList.toggle('on', BROAD.on); b.classList.toggle('ghost', !BROAD.on); };
$('pauseBtn').addEventListener('click', broadLabel);
{ const b = document.createElement('button'); b.id = 'broadToggle'; b.onclick = () => { BROAD.on = !BROAD.on; try { localStorage.setItem('pr_broad', BROAD.on ? '1' : '0'); } catch (e) { /* ignore */ } broadLabel(); reFight(); say(BROAD.on ? '⚔ Action battles ON: ship fights on the battle line, monster fights at the helm.' : '⚔ Action battles OFF: ship and monster fights use the classic aim bar.', 3); }; $('paused').insertBefore(b, $('saveQuit')); broadLabel(); }

// ---------- LEGEND FIGHTS: each legend (and its young) fights its own way, live on the water ----------
// KRAKEN, the tentacle siege: it holds your ship fast. Tentacles burst up around you (a red ring warns where), rear back and
// slam down on your deck: shoot them first (tap one, or FIRE / Space for the one about to strike); each one you cut down hurts
// the Kraken. Now and then its great eye opens (a gold ring): hit it for heavy damage, and every rearing tentacle flinches
// away. Below half its health it sends them faster and more at once. FLEE breaks its grip at a cost.
const LEGEND_KIND = { kraken: 'kraken', squid: 'kraken', jormungandr: 'jorm', elder: 'elder' }; // the Great Squid fights the tentacle arena too
// the action monster fight (v1.1.0): how each kind of beast strikes when ACTION BATTLES is on
const BEAST_KIND = { shark: 'bite', megalodon: 'bite', angler: 'bite', serpent: 'slam', eel: 'slam', leviathan: 'slam', octopus: 'grab', squid: 'grab', crab: 'claw' };
const BEAST_HINT = { bite: 'It circles under the water. When the red ring appears, turn or change speed to get out of it, or shoot it the moment it rises (SPEARS turns green) to stop the strike and daze it!', slam: 'It rears up to crash across your deck: when the red ring appears, turn or change speed to get clear, then SHOOT it while it is up!', grab: 'It comes for the rail to drag your crew overboard: shoot it as it comes, and if it grabs you, tap FIRE fast to hack it off!', claw: 'It climbs the side to tear at the planks: shoot it as it comes, and keep shooting while it clings on!' };
const lgRingGeo = (() => { const g = new THREE.RingGeometry(0.8, 1, 36); g.rotateX(-Math.PI / 2); return g; })();
function legendRing(color, geo = lgRingGeo) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 7; scene.add(m); return m; }
const eyeRingGeo = new THREE.TorusGeometry(1, 0.09, 6, 40);
// the Kraken's eye in the world (the same spot the giant camera frames)
function krakenEye(mon) { const Rk = mon.size / 6, sy = Math.sin(mon.yaw), cy = Math.cos(mon.yaw), sq = mon.type === 'squid', lx = (sq ? 0.9 : 0.98) * Rk, lz = (sq ? 1.15 : 1.3) * Rk; return [mon.x + lx * cy + lz * sy, mon.g.position.y + Rk * (sq ? 0.45 : 1.12), mon.z + lz * cy - lx * sy, Rk]; }
function startLegend(mon) {
  const kind = LEGEND_KIND[mon.type] || (BROAD.on && !mon.naval && !mon.passive && !mon.boss && BEAST_KIND[mon.type] ? 'beast' : null); if (!kind) return false;
  const t = T(), young = !!mon.young, L = { kind, young, reload: 0.6, tents: [], spawnT: 1.4, eyeT: rnd(6, 8), eyeOpen: 0, eyeMark: null };
  mon.stState = mon.stState || { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 }; mon.state = 'chase'; if (mon.boss && !mon.legendHp) { mon.legendHp = true; mon.maxHp *= 1.5; mon.hp *= 1.5; }
  if (mon.boss && LAIRS_HEL[mon.lair] && !mon.helBuff) { mon.helBuff = true; const hk = mon.lair === 'nidhogg' ? 2.2 : 1.6; mon.maxHp = Math.round(mon.maxHp * hk); mon.hp = Math.round(mon.hp * hk); mon.dmg = Math.round(mon.dmg * (mon.lair === 'nidhogg' ? 2.4 : 1.8)); mon.rageAt = mon.lair === 'nidhogg' ? 1.01 : mon.lair === 'surtr' ? 0.5 : 0.7; }
  if (kind === 'kraken') { // the Kraken rises ahead of the bow, facing you; your ship is held fast
    const dist = mon.giant ? mon.size * 0.55 + t.L * 0.6 : mon.size * 0.55 + t.L * 0.6 + 4; let dir = boat.yaw;
    for (const c of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) { const a = boat.yaw + c, x = boat.x + Math.sin(a) * dist, z = boat.z + Math.cos(a) * dist; if (!world.blockAt(x, z, mon.size * 0.3)) { dir = a; break; } }
    mon.x = boat.x + Math.sin(dir) * dist; mon.z = boat.z + Math.cos(dir) * dist; mon.yaw = dir + Math.PI; mon.stState.reach = 0.35; helm.held = false; setThrottle(0, true); boat.v = 0; }
  else if (kind === 'jorm') jormStart(L, mon);
  else if (kind === 'elder') elderStart(L, mon);
  else if (kind === 'beast') beastStart(L, mon);
  for (const m of [...mons]) if (m !== mon && !m.boss && !m.dead && Math.hypot(m.x - boat.x, m.z - boat.z) < 90) removeMon(m);
  battle = { mon, t: 0, legend: L }; boat.wp = null; setBattle(true);
  const held = !L.sail; if (held) { $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy'); } document.body.classList.add('legendOn');
  const ui = document.createElement('div'); ui.id = 'broad'; ui.className = 'legend' + (held ? '' : ' sail');
  const hint = kind === 'beast' ? (L.learn ? 'It bites at your hull: tap SPEARS to throw at it! Bigger beasts dive, and a red ring shows where they will strike.' : BEAST_HINT[L.bk]) : kind === 'kraken' ? 'Tentacles rise where the red rings are: tap one (or FIRE) to cut it down before it slams your deck!' : kind === 'elder' ? 'Shoot the ghost lights before they reach you! Then watch the runes…' : 'It hunts you under the water. When the red ring appears, turn or change speed to dodge its strike, then shoot its head!';
  ui.innerHTML = `<div class="bFoe"><b>${mon.name} <small>Lv ${Math.round(mon.lv) + 1}</small></b><div class="hp foe"><i id="bFoeHp"></i></div></div><div class="bHint" id="bHint">${hint}</div>` +
    (held ? '<button class="bFire" id="bFire">FIRE<i id="bLoad"></i></button>' : '') + '<div class="bSide"><button class="ghost" id="bFlee">FLEE</button></div>';
  $('hud').appendChild(ui); if (held) $('bFire').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); legendFire(); }; $('bFlee').onclick = (e) => { e.stopPropagation(); endLegend('flee'); };
  warn(kind === 'beast' ? '⚠ ' + mon.name.toUpperCase() + ' ATTACKS! ⚠' : kind === 'kraken' ? (young ? '⚠ ' + mon.name.toUpperCase() + ' ATTACKS! ⚠' : '⚠ ' + mon.name.toUpperCase() + ' SEIZES YOUR SHIP! ⚠') : kind === 'elder' ? (young ? '⚠ ' + mon.name.toUpperCase() + ' BINDS YOUR SHIP! ⚠' : '⚠ ' + mon.name.toUpperCase() + ' BINDS YOUR SHIP! ⚠') : young ? '⚠ ' + mon.name.toUpperCase() + ' HUNTS YOU! ⚠' : '⚠ ' + mon.name.toUpperCase() + ' HUNTS YOU! ⚠', 3); sfx.horn(); sfx.thunder(); return true; }
const legendReload = () => (battle && battle.legend && battle.legend.grab ? 0.2 : P.up.ballista ? 0.6 : 0.8);
function krakenTentacle(L) { const t = T(), mon = battle.mon, taken = L.tents.map((x) => x.a), behind = Math.atan2(boat.x - mon.x, boat.z - mon.z); let a = 0;
  for (let k = 0; k < 16; k++) { a = Math.random() * Math.PI * 2; if (Math.abs(angDiff(a, behind)) > 1.0 && taken.every((b) => Math.abs(angDiff(a, b)) > 0.7)) break; }
  const r = t.L * 0.5 + rnd(4.5, 8), bx = boat.x + Math.sin(a) * r, bz = boat.z + Math.cos(a) * r, n = 18;
  const tb = tentacle(SPECIES[mon.type].variants[0], L.young ? 0.42 : 0.66, n, 0, glowVC(), null); tb.mesh.frustumCulled = false; tb.mesh.visible = false; scene.add(tb.mesh);
  const ring = legendRing(0xff3a2a); ring.position.set(bx, ocean.heightAt(bx, bz) + 0.3, bz); ring.scale.setScalar(2.4);
  return { a, r, bx, bz, tb, ring, pts: Array.from({ length: n }, () => new THREE.Vector3()), phase: 'warn', t: 0, hp: L.young ? 1 : 3, len: r + 3.5 }; }
// a tentacle's shape: it grows up out of the water, bending toward your ship by `lean` at the root and `curl` along its length
function poseTentacle(K, grow, lean, curl, sway) { const n = K.pts.length, dx = boat.x - K.bx, dz = boat.z - K.bz, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, seg = (K.len / (n - 1)) * Math.max(0.02, grow);
  let x = K.bx, y = ocean.heightAt(K.bx, K.bz) - 0.6, z = K.bz; K.pts[0].set(x, y, z);
  for (let k = 1; k < n; k++) { const s = k / (n - 1), phi = lean + curl * Math.pow(s, 1.4) + Math.sin(battle.t * 3 + K.a * 5 + s * 5) * sway * s, sp = Math.sin(phi); x += ux * sp * seg; y += Math.cos(phi) * seg; z += uz * sp * seg; K.pts[k].set(x, y, z); }
  K.tb.set(K.pts); }
function dropTentacle(K) { scene.remove(K.tb.mesh); K.tb.mesh.geometry.dispose(); scene.remove(K.ring); K.ring.material.dispose(); }
function krakenHint(L) { if (!L.grab && $('bHint')) $('bHint').textContent = 'Tentacles rise where the red rings are: tap one (or FIRE) to cut it down before it slams your deck!'; }
function updateKraken(dt) { const L = battle.legend, mon = battle.mon, t = T(), enraged = mon.hp < mon.maxHp * (mon.rageAt || 0.5), st = mon.stState || (mon.stState = { t: 0, speed: 0, attack: 0, dive: 0, hurt: 0, rise: 1 });
  const coilDur = L.young ? 2.1 : enraged ? 1.15 : 1.6, maxT = L.young ? (enraged ? 2 : 1) : enraged ? 4 : 3;
  L.spawnT -= dt; if (L.spawnT <= 0 && L.tents.filter((K) => K.phase !== 'sink' && K.phase !== 'cut').length < maxT) { L.tents.push(krakenTentacle(L)); L.spawnT = enraged ? rnd(0.7, 1.2) : rnd(1.1, 1.9); }
  for (const K of [...L.tents]) { K.t += dt; const u = K.t;
    if (K.phase === 'warn') { K.ring.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(u * 9)); K.ring.scale.setScalar(2.4 - u * 0.6); if (u > (L.young ? 1 : 0.8)) { K.phase = 'rise'; K.t = 0; K.tb.mesh.visible = true; foam.splash(K.bx, K.bz, 1.1); sfx.splash(0.7); } }
    else if (K.phase === 'rise') { const g = Math.min(1, u / 0.7); poseTentacle(K, g * (2 - g), -0.1, 0.5, 0.15); K.ring.material.opacity = 0.6 * (1 - g); if (u > 0.7) { K.phase = 'coil'; K.t = 0; } }
    else if (K.phase === 'coil') { const k = u / coilDur; poseTentacle(K, 1, -0.15 - 0.1 * k, -0.55 - 0.25 * k, 0.2 + k * 0.5); if (u > coilDur) { K.t = 0; if (!L.grab && !boat.air && Math.random() < (L.young ? 0.15 : enraged ? 0.4 : 0.28)) { K.phase = 'grab'; L.grab = { K, t: 0, hits: 0, need: L.young ? 3 : 5, under: 0 }; warn('🦑 GRABBED! Hit it fast to break free!', 2.5); sfx.creak(); } else K.phase = 'slam'; } }
    else if (K.phase === 'grab') { const G = L.grab; poseTentacle(K, 1, 1.0, 2.5 + Math.sin(battle.t * 12) * 0.08, 0.03); boat.shake = Math.max(boat.shake, 0.25); G.t += dt;
      $('bHint').textContent = '🦑 GRABBED! Hit the tentacle fast to break free! ' + G.hits + ' / ' + G.need;
      if (G.hits >= G.need) { K.phase = 'cut'; K.t = 0; L.grab = null; mon.hp -= attack() * 0.5; pop(boat.x, boat.y + 4, boat.z, 'BROKE FREE!', '#7dff3a'); sfx.hit(); krakenHint(L); }
      else if (G.t > 3.5) { K.phase = 'drag'; K.t = 0; G.under = 0; if (ship.mask) ship.mask.visible = false; damage(mon.dmg * 1.4 * (1 - defense()), mon.name + ' drags you under!'); sfx.splash(); sfx.boom(); if (!battle) return; } }
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
function legendFire(target) { const L = battle && battle.legend; if (!L) return; if (L.kind === 'beast') { beastFire(L, battle.mon); return; } if (L.reload > 0) return; if (L.kind === 'jorm') { jormFire(L, battle.mon); return; } if (L.kind === 'elder') { elderFire(L, battle.mon, target); return; } const tg = target || krakenTarget(L); if (!tg) return; L.reload = legendReload(); unlockAudio(); sfx.throw();
  const mon = battle.mon, kind = P.up.ballista ? 'bolt' : 'spear', from = { x: boat.x, y: boat.y + 2.2, z: boat.z };
  if (tg.eye) { const [ex, ey, ez] = krakenEye(mon); launch(from, { x: ex, y: ey, z: ez }, kind, () => { const L2 = battle && battle.legend; if (L2 !== L || !L.eyeOpen) { pop(ex, ey + 1, ez, 'MISS', '#9ab8c8'); return; }
      const d = Math.round(attack() * 2.4 * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); mon.hp -= d; mon.stState.hurt = 1; pop(ex, ey + 2, ez, '👁 THE EYE! −' + d, '#ffd24a'); sfx.hit(); sfx.boom();
      for (const K of L.tents) if (K.phase === 'rise' || K.phase === 'coil') { K.phase = 'sink'; K.t = 0; } L.eyeOpen = 0.01; }); return; }
  const K = tg.K, p = K.pts[Math.floor(K.pts.length * 0.6)]; launch(from, { x: p.x, y: p.y, z: p.z }, kind, () => { if (K.phase === 'grab') { if (L.grab && L.grab.K === K) L.grab.hits++; mon.hp -= attack() * 0.1; sfx.hit(); pop(p.x, p.y + 1, p.z, 'HACK!', '#ffffff'); return; } if (K.phase !== 'rise' && K.phase !== 'coil') return;
    K.hp--; const d = Math.round(attack() * (K.phase === 'grab' ? 0.1 : K.hp <= 0 ? 0.35 : 0.12) * (boat.thor > 0 ? 2 : 1)); mon.hp -= d; sfx.hit(); foam.splash(p.x, p.z, 0.6); pop(p.x, p.y + 1, p.z, (K.hp <= 0 ? 'SEVERED! ' : '') + '−' + d, K.hp <= 0 ? '#ffd24a' : '#ffffff');
    if (K.hp <= 0) { K.phase = 'cut'; K.t = 0; } else if (K.phase === 'coil') K.t = Math.max(0, K.t - 0.7); }); }
// a tap in a legend fight shoots what is under your finger (the open eye or a tentacle), if anything
function legendTap(x, y) { const L = battle.legend, mon = battle.mon; let best = null, bd = 80;
  if (L.kind === 'elder') { elderTap(L, mon, x, y); return; }
  if (L.kind === 'jorm') { const [hx, hy, hz] = jormHead(mon), s0 = toScreen(hx, hy, hz); if (s0 && Math.hypot(s0[0] - x, s0[1] - y) < 110) legendFire(); return; }
  if (L.eyeOpen) { const [ex, ey, ez] = krakenEye(mon), s = toScreen(ex, ey, ez); if (s) { const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd + 30) { bd = d; best = { eye: true }; } } }
  for (const K of L.tents) { if (K.phase !== 'rise' && K.phase !== 'coil' && K.phase !== 'grab') continue; for (const i of [6, 10, 14]) { const p = K.pts[i], s = toScreen(p.x, p.y, p.z); if (!s) continue; const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = { K }; } } }
  if (best) legendFire(best); }
// JORMUNGANDR, the hunt: you sail free (wheel, telegraph) while it stalks you under the water, a dark shadow with a bubble
// trail. Then it locks on: a red ring where it reckons you will be (where you are heading) and it bursts up there a moment
// later, so turn or change speed to dodge. After every strike its head rears up for a few seconds (a gold ring): shoot it
// (SPEARS / Space or tap it); the first hit straight away is a PERFECT. Sometimes it wraps itself round your ship instead
// and charges with lightning: hit its head three times to break the coil, or be electrocuted.
const shadowGeo = (() => { const g = new THREE.CircleGeometry(1, 24); g.rotateX(-Math.PI / 2); return g; })();
function beastStart(L, mon) { const t = T(), bk = BEAST_KIND[mon.type], diver = bk === 'bite' || bk === 'slam';
  const learn = !!tut && tut.mon === mon; Object.assign(L, { sail: true, bk, diver: diver && !learn, learn, mode: learn ? 'learn' : 'circle', rear: false, parried: false, mt: 0, dur: rnd(1.5, 2.5), orbit: Math.atan2(mon.x - boat.x, mon.z - boat.z), side: 1, strike: null, grab: null, away: 0, ticks: 0,
    shadow: (() => { const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); m.renderOrder = 5; m.visible = false; scene.add(m); return m; })(),
    ring: legendRing(0xff3a2a), mark: legendRing(0xffd24a, eyeRingGeo) });
  L.ring.visible = false; L.mark.visible = false; mon.stState.dive = diver ? 1 : 0; mon.stState.attack = 0; mon.stun = 0; mon.rise = 1; if (!mon.actionHp) { mon.actionHp = true; mon.maxHp = Math.round(mon.maxHp * 1.7); mon.hp = Math.round(mon.hp * 1.7); } void t; }
// where a beast's head is (it sinks with dive and rises with attack)
function beastHead(mon) { const st = mon.stState; return [mon.g.position.x, mon.g.position.y + mon.top * (0.55 + 0.35 * st.attack) * (1 - st.dive) - mon.top * 0.6 * st.dive, mon.g.position.z]; }
function beastHint(L, txt) { const h = $('bHint'); if (h) h.textContent = txt || BEAST_HINT[L.bk]; }
function updateBeast(dt) { const L = battle.legend, mon = battle.mon, st = mon.stState, t = T(), lv = mon.lv, enraged = mon.hp < mon.maxHp * 0.5; L.mt += dt;
  const ease = (k, to, r) => k + (to - k) * Math.min(1, dt * r), d = Math.hypot(boat.x - mon.x, boat.z - mon.z), toward = (tx, tz, sp) => { const dx = tx - mon.x, dz = tz - mon.z, dd = Math.hypot(dx, dz); if (dd > 0.1) { const s = Math.min(dd, sp * dt); mon.x += (dx / dd) * s; mon.z += (dz / dd) * s; mon.yaw += angDiff(Math.atan2(dx, dz), mon.yaw) * Math.min(1, dt * 4); } return dd; };
  // outrun it: 70 away for four seconds and it gives up
  L.away = d > 70 ? L.away + dt : 0; if (L.away > 4) { endLegend('escape'); return; }
  const small = P.tier <= 1 ? 1 : 0, lockDur = clamp((L.diver ? 1.9 : 1.6) - lv * 0.07 + small * 0.6, 1.0, 2.5) * (enraged ? 0.8 : 1), rr = 12 + t.L * 0.45 + mon.size * 0.5, dmgK = small ? 0.6 : 1;
  if (L.mode === 'learn') { st.dive = ease(st.dive, 0, 3); L.orbit += dt * 0.5; const tx = boat.x + Math.sin(L.orbit) * (t.L * 0.5 + mon.size * 0.6 + 2), tz = boat.z + Math.cos(L.orbit) * (t.L * 0.5 + mon.size * 0.6 + 2); toward(tx, tz, Math.max(mon.speed, boat.v + 4)); mon.yaw += angDiff(Math.atan2(boat.x - mon.x, boat.z - mon.z), mon.yaw) * Math.min(1, dt * 3); st.attack = ease(st.attack, L.mt > 4 ? 1 : 0.3, 8);
    if (L.mt > 4 && !L.rear) { L.rear = true; L.parried = false; foam.splash(mon.x, mon.z, 0.8); beastHint(L, '🎯 NOW! Hit it as it rears up to stop the bite!'); }
    if (L.mt > 4.5) { L.rear = false; if (L.parried) { L.mt = -2; beastHint(L, '😵 DAZED! Free shots: FIRE!'); } else { L.mt = 0; boat.shake = 0.6; foam.splash(mon.x, mon.z, 1.2); damage(mon.dmg * 0.5 * (1 - defense()), mon.name + ' bites at the hull!'); if (!battle) return; beastHint(L, 'It bites at your hull: tap SPEARS to throw at it! Bigger beasts dive, and a red ring shows where they will strike.'); } } }
  else if (L.mode === 'circle') { st.dive = ease(st.dive, L.diver ? 1 : 0, 3); st.attack = ease(st.attack, 0, 3); L.orbit += dt * (0.45 + (enraged ? 0.2 : 0)) * L.side; const tx = boat.x + Math.sin(L.orbit) * rr, tz = boat.z + Math.cos(L.orbit) * rr; toward(tx, tz, Math.max(mon.speed, boat.v + 4));
    if (L.mt > L.dur) { L.mt = 0; if (L.diver) { const lead = 1.0, sx = boat.x + Math.sin(boat.yaw) * boat.v * lead, sz = boat.z + Math.cos(boat.yaw) * boat.v * lead; L.strike = { x: sx, z: sz, r: t.L * 0.32 + 3, side: Math.random() < 0.5 ? 1 : -1 }; L.mode = 'lock'; L.ring.visible = true; L.ring.position.set(sx, ocean.heightAt(sx, sz) + 0.3, sz); L.ring.scale.setScalar(L.strike.r); beastHint(L, '⚠ IT STRIKES! Turn or change speed to get out of the red ring!'); sfx.groan && sfx.groan(); }
      else { L.mode = 'approach'; L.side = Math.random() < 0.5 ? 1 : -1; beastHint(L, L.bk === 'grab' ? '🐙 IT COMES FOR THE RAIL: shoot it!' : '🦀 IT CLIMBS THE SIDE: shoot it!'); sfx.groan && sfx.groan(); } } }
  else if (L.mode === 'lock') { st.dive = ease(st.dive, 1, 3); const S = L.strike; if (L.mt < lockDur - 0.6) { S.x = boat.x + Math.sin(boat.yaw) * boat.v * 1.0; S.z = boat.z + Math.cos(boat.yaw) * boat.v * 1.0; L.ring.position.set(S.x, ocean.heightAt(S.x, S.z) + 0.3, S.z); } L.ring.material.opacity = (L.mt < lockDur - 0.6 ? 0.35 : 0.55) + 0.4 * Math.abs(Math.sin(L.mt * 12)); toward(S.x - Math.sin(L.orbit) * 6, S.z - Math.cos(L.orbit) * 6, 30);
    if (L.mt > lockDur) { L.mode = 'strike'; L.mt = 0; L.ring.visible = false; const S = L.strike, hit = Math.hypot(boat.x - S.x, boat.z - S.z) < S.r + t.B * (small ? 0.2 : 0.5);
      if (L.bk === 'slam' && hit) { const a = boat.yaw + Math.PI / 2 * S.side; mon.x = boat.x + Math.sin(a) * (t.B * 0.4 + mon.size * 0.25); mon.z = boat.z + Math.cos(a) * (t.B * 0.4 + mon.size * 0.25); mon.yaw = a + Math.PI; } else { mon.x = S.x; mon.z = S.z; mon.yaw = Math.atan2(boat.x - mon.x, boat.z - mon.z); }
      foam.splash(mon.x, mon.z, 2.6); sfx.groan && sfx.groan(); L.strikeHit = hit; L.parried = false; beastHint(L, hit ? '🎯 NOW! Hit it as it rises to stop the strike!' : '🎯 It rises: SHOOT!'); } }
  else if (L.mode === 'strike') { st.dive = ease(st.dive, 0, 9); st.attack = ease(st.attack, 1, 9); if (L.mt > 0.5) { if (L.parried) { L.mode = 'dazed'; L.mt = 0; beastHint(L, '😵 DAZED! Free shots: FIRE!'); } else { sfx.boom(); if (L.strikeHit) { boat.shake = 1; if (mon.type === 'eel') { flash = 0.7; sfx.zap(); } damage(mon.dmg * (L.bk === 'slam' ? 1.5 : 1.3) * dmgK * (1 - defense()), mon.name + (L.bk === 'slam' ? ' crashes down across your deck!' : ' bites into the hull!')); if (!battle) return; L.missed = 0; } else { pop(boat.x, boat.y + 4, boat.z, 'DODGED!', '#7dff3a'); L.missed = (L.missed || 0) + 1; } L.mode = 'exposed'; L.mt = 0; L.perfect = false; beastHint(L, '🎯 It is up: SHOOT IT NOW!'); } } }
  else if (L.mode === 'dazed') { st.dive = ease(st.dive, 0, 6); st.attack = ease(st.attack, 0.15, 4); mon.yaw += Math.sin(L.mt * 9) * dt * 0.8; if (Math.random() < dt * 6) foam.add(mon.x + rnd(-1, 1) * mon.size * 0.3, mon.z + rnd(-1, 1) * mon.size * 0.3, { spray: true, y: mon.g.position.y + mon.top * 0.9, vx: rnd(-1, 1), vz: rnd(-1, 1), vy: rnd(1, 2), s: 0.35, life: 0.8, a: 0.9 }); if (L.mt > (small ? 2.6 : 2.0)) { L.mode = 'circle'; L.mt = 0; L.dur = (enraged ? rnd(1.2, 2) : rnd(1.8, 3)) + small; beastHint(L); } }
  else if (L.mode === 'exposed') { st.dive = ease(st.dive, 0, 6); st.attack = ease(st.attack, 0.5, 3); mon.yaw += angDiff(Math.atan2(boat.x - mon.x, boat.z - mon.z), mon.yaw) * Math.min(1, dt * 2); if (L.mt > 0.6) L.perfect = false;
    if (L.mt > (enraged ? 1.6 : 2.2) + small * 0.8) { L.mode = 'circle'; L.mt = 0; L.dur = (enraged ? rnd(1.2, 2) : rnd(1.8, 3)) * (L.missed ? 0.55 : 1) + small; L.orbit = Math.atan2(mon.x - boat.x, mon.z - boat.z); L.side = Math.random() < 0.5 ? 1 : -1; beastHint(L); } }
  else if (L.mode === 'approach') { st.dive = ease(st.dive, 0, 4); st.attack = ease(st.attack, 0.3, 3); const a = boat.yaw + Math.PI / 2 * L.side, hx = boat.x + Math.sin(a) * (t.B * 0.5 + mon.size * 0.55), hz = boat.z + Math.cos(a) * (t.B * 0.5 + mon.size * 0.55); const dd = toward(hx, hz, Math.max(mon.speed * 1.3, boat.v + 5));
    if (dd < 1.5 || L.mt > 4) { if (dd > 6) { L.mode = 'circle'; L.mt = 0; L.dur = rnd(1, 2); beastHint(L); } else if (L.bk === 'grab') { L.mode = 'hold'; L.mt = 0; L.grab = { hits: 0, need: 5 + Math.min(6, Math.round(lv * 0.8)), t: 0, lost: 0 }; boat.shake = 0.8; sfx.creak(); warn('🐙 ' + mon.name.toUpperCase() + ' GRABS THE RAIL! TAP FIRE TO HACK IT OFF!', 3); beastHint(L, '🪓 HACK! Tap FIRE fast: 0 / ' + L.grab.need); }
      else { L.mode = 'tear'; L.mt = 0; L.ticks = 0; boat.shake = 0.6; sfx.creak(); beastHint(L, '🦀 It clings to the side and tears at the planks: SHOOT IT!'); } } }
  else if (L.mode === 'hold') { const G = L.grab; boat.v = 0; boat.wp = null; st.attack = ease(st.attack, 0.7, 4); const a = boat.yaw + Math.PI / 2 * L.side; mon.x = boat.x + Math.sin(a) * (t.B * 0.45 + mon.size * 0.4); mon.z = boat.z + Math.cos(a) * (t.B * 0.45 + mon.size * 0.4); mon.yaw = a + Math.PI; boat.shake = Math.max(boat.shake, 0.25); G.t += dt;
    if (G.t > 1.1) { G.t = 0; G.lost++; damage(mon.dmg * 0.4 * dmgK * (1 - defense()), G.lost === 1 ? mon.name + ' drags a man over the rail!' : null); if (!battle) return; pop(boat.x + Math.sin(a) * t.B * 0.5, boat.y + 3, boat.z + Math.cos(a) * t.B * 0.5, '−1 CREW', '#ff6a4a'); foam.splash(mon.x, mon.z, 1); }
    if (G.hits >= G.need || L.mt > 7) { L.grab = null; L.mode = 'exposed'; L.mt = 0; L.perfect = true; if (G.hits >= G.need) { mon.hp -= attack() * 0.5; st.hurt = 1; pop(boat.x, boat.y + 4, boat.z, 'HACKED FREE!', '#7dff3a'); sfx.hit(); } else say('It lets go and slides back into the sea.'); mon.x += Math.sin(a) * 6; mon.z += Math.cos(a) * 6; beastHint(L, '🎯 It falls back: SHOOT IT NOW!'); } }
  else if (L.mode === 'tear') { st.attack = 0.5 + 0.5 * Math.abs(Math.sin(L.mt * 6)); const a = boat.yaw + Math.PI / 2 * L.side; mon.x = boat.x + Math.sin(a) * (t.B * 0.5 + mon.size * 0.5); mon.z = boat.z + Math.cos(a) * (t.B * 0.5 + mon.size * 0.5); mon.yaw = a + Math.PI; boat.shake = Math.max(boat.shake, 0.15);
    if (L.mt > 1.2 * (L.ticks + 1)) { L.ticks++; damage(mon.dmg * 0.45 * dmgK * (1 - defense()), L.ticks === 1 ? mon.name + ' tears at the planks!' : null); if (!battle) return; foam.splash(mon.x, mon.z, 0.8); if (L.ticks >= 3) { L.mode = 'circle'; L.mt = 0; L.dur = rnd(1.5, 2.5); beastHint(L); } } }
  // the shadow under a diving beast, the mark on its head when it is up
  const up = st.dive < 0.5; L.shadow.visible = !up; if (!up) { L.shadow.position.set(mon.x, ocean.heightAt(mon.x, mon.z) + 0.15, mon.z); L.shadow.scale.set(mon.size * 0.8, 1, mon.size * 0.8); L.shadow.rotation.y = mon.yaw; if (Math.random() < dt * 14) foam.add(mon.x + rnd(-1, 1) * mon.size * 0.3, mon.z + rnd(-1, 1) * mon.size * 0.3, { s: 0.5, life: 1.1, a: 0.6 }); }
  { const fb = $('fireBtn'), now = !!((L.mode === 'strike' || (L.mode === 'learn' && L.rear)) && !L.parried), soon = !!( (L.mode === 'lock' && L.mt > lockDur - 0.6) || (L.mode === 'learn' && L.mt > 3.4 && L.mt <= 4)), free = !!(L.mode === 'dazed' || (L.mode === 'strike' && L.parried) || L.mode === 'exposed' || L.mode === 'tear' || L.mode === 'hold' || (L.mode === 'learn' && L.mt < 0)); fb.classList.toggle('aimNow', now); fb.classList.toggle('aimSoon', soon && !now); fb.classList.toggle('aimFree', free && !now && !soon); fb.classList.toggle('aimNo', !now && !soon && !free); }
  L.mark.visible = up && (L.mode === 'exposed' || L.mode === 'dazed' || L.mode === 'learn' || L.mode === 'tear' || L.mode === 'approach' || L.mode === 'hold'); if (L.mark.visible) { const [hx, hy, hz] = beastHead(mon); L.mark.position.set(hx, hy, hz); L.mark.scale.setScalar(mon.size * 0.22 * (1.3 + 0.15 * Math.sin(battle.t * 10))); L.mark.lookAt(camera.position); }
  if (mon.hp <= 0) { endLegend('win'); return; } }
// shooting a beast: hacks at a grab (no reload), else a bolt at its head when it is up; a bolt at a diving beast is lost
function beastFire(L, mon) { if (L.mode === 'hold' && L.grab) { const G = L.grab; G.hits++; sfx.hit(); boat.shake = 0.4; beastHint(L, '🪓 HACK! Tap FIRE fast: ' + Math.min(G.hits, G.need) + ' / ' + G.need); pop(mon.x, mon.g.position.y + mon.top * 0.5, mon.z, 'HACK!', '#ffffff'); return; }
  if (L.reload > 0) return; L.reload = legendReload(); unlockAudio(); sfx.throw(); const [hx, hy, hz] = beastHead(mon), perfect = (L.mode === 'strike' || (L.mode === 'learn' && L.rear)) && !L.parried, upNow = mon.stState.dive < 0.5 || perfect; if (perfect) { L.parried = true; pop(hx, hy + 3, hz, 'PERFECT!', '#7dff3a'); sfx.hit(); }
  launch({ x: boat.x, y: boat.y + 2.2, z: boat.z }, { x: hx, y: upNow ? hy : hy + 1, z: hz }, P.up.ballista ? 'bolt' : 'spear', () => { const L2 = battle && battle.legend; if (L2 !== L) return; if (mon.stState.dive >= 0.5) { pop(hx, hy + 2, hz, 'BELOW', '#9ab8c8'); foam.splash(hx, hz, 0.6); return; }
    const d = Math.round(attack() * (P.up.ballista ? 0.8 : L.learn ? 0.7 : 0.5) * (perfect ? 1.6 : 1) * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); mon.hp -= d; mon.stState.hurt = 1; sfx.hit(); foam.splash(hx, hz, 1); pop(hx, hy + 2, hz, (perfect ? 'PERFECT! ' : '') + '−' + d, perfect ? '#ffd24a' : '#ffffff'); }); }
function jormStart(L, mon) { const t = T(), R = mon.size / 5;
  Object.assign(L, { sail: true, R, mode: 'stalk', mt: 0, dur: rnd(3.5, 5), orbit: Math.random() * 6.28, strike: null, hits: 0, coil: null,
    shadow: (() => { const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); m.renderOrder = 5; scene.add(m); return m; })(),
    ring: legendRing(0xff3a2a), mark: legendRing(0xffd24a, eyeRingGeo) });
  L.ring.visible = false; L.mark.visible = false; mon.stState.dive = 1; mon.stState.attack = 0; }
// where its head is in the world (the neck rears higher with attack, and sinks with dive)
function jormHead(mon) { const st = mon.stState, R = mon.size / 5; return [mon.x, mon.g.position.y + R * (4.6 + 3.5 * st.attack) * (1 - st.dive) - R * 4 * st.dive, mon.z]; }
function jormHint(L, txt) { const h = $('bHint'); if (h) h.textContent = txt || 'It hunts you under the water. When the red ring appears, turn or change speed to dodge its strike, then shoot its head!'; }
function updateJorm(dt) { const L = battle.legend, mon = battle.mon, st = mon.stState, t = T(), enraged = mon.hp < mon.maxHp * (mon.rageAt || 0.5); L.mt += dt;
  const ease = (k, to, r) => k + (to - k) * Math.min(1, dt * r);
  if (L.mode === 'stalk' || L.mode === 'lock') { st.dive = ease(st.dive, 1, 3); st.attack = ease(st.attack, 0, 3);
    let tx, tz; if (L.mode === 'stalk') { L.orbit += dt * (0.5 + (enraged ? 0.25 : 0)); const rr = 20 + t.L * 0.6; tx = boat.x + Math.sin(L.orbit) * rr; tz = boat.z + Math.cos(L.orbit) * rr; } else { tx = L.strike.x; tz = L.strike.z; }
    const dx = tx - mon.x, dz = tz - mon.z, d = Math.hypot(dx, dz), sp = Math.min(d * 2.5, (L.mode === 'lock' ? 30 : Math.max(9, boat.v + 5)) * (L.young ? 0.8 : 1)); if (d > 0.1) { mon.x += (dx / d) * sp * dt; mon.z += (dz / d) * sp * dt; mon.yaw += angDiff(Math.atan2(dx, dz), mon.yaw) * Math.min(1, dt * 4); }
    L.shadow.visible = true; L.shadow.position.set(mon.x, ocean.heightAt(mon.x, mon.z) + 0.15, mon.z); L.shadow.scale.set(L.R * 1.6, 1, L.R * 1.6); L.shadow.rotation.y = mon.yaw; if (Math.random() < dt * 18) foam.add(mon.x + rnd(-1, 1) * L.R, mon.z + rnd(-1, 1) * L.R, { s: 0.6, life: 1.2, a: 0.6 });
    if (L.mode === 'stalk' && L.mt > L.dur) { const lead = L.young ? 0.8 : 1.1, sx = boat.x + Math.sin(boat.yaw) * boat.v * lead, sz = boat.z + Math.cos(boat.yaw) * boat.v * lead; L.strike = { x: sx, z: sz, r: t.L * 0.3 + 3 }; L.mode = 'lock'; L.mt = 0;
      L.ring.visible = true; L.ring.position.set(sx, ocean.heightAt(sx, sz) + 0.3, sz); L.ring.scale.setScalar(L.strike.r); jormHint(L, '⚠ IT STRIKES! Turn or change speed to get out of the red ring!'); sfx.groan && sfx.groan(); }
    if (L.mode === 'lock') { L.ring.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(L.mt * 12)); if (L.mt > (L.young ? 2.4 : enraged ? 1.4 : 1.9)) { L.mode = 'strike'; L.mt = 0; mon.x = L.strike.x; mon.z = L.strike.z; mon.yaw = Math.atan2(boat.x - mon.x, boat.z - mon.z); L.ring.visible = false; L.shadow.visible = false;
      foam.splash(mon.x, mon.z, 3); sfx.boom(); const hitR = L.strike.r + t.B * 0.5; if (Math.hypot(boat.x - mon.x, boat.z - mon.z) < hitR) { boat.shake = 0.8; damage(mon.dmg * (L.young ? 0.8 : 1.1) * (1 - defense()), mon.name + ' strikes your ship!'); if (!battle) return; } else pop(boat.x, boat.y + 4, boat.z, 'DODGED!', '#7dff3a'); } } }
  else if (L.mode === 'strike') { st.dive = ease(st.dive, 0, 9); st.attack = ease(st.attack, 1, 9); if (L.mt > 0.45) { L.mode = 'exposed'; L.mt = 0; L.perfect = true; jormHint(L, '🐍 Its head is up: SHOOT IT NOW!'); } }
  else if (L.mode === 'exposed') { st.dive = ease(st.dive, 0, 6); st.attack = ease(st.attack, 0.6, 3); mon.yaw += angDiff(Math.atan2(boat.x - mon.x, boat.z - mon.z), mon.yaw) * Math.min(1, dt * 2); if (L.mt > 0.6) L.perfect = false;
    const [hx, hy, hz] = jormHead(mon); L.mark.visible = true; L.mark.position.set(hx, hy, hz); L.mark.scale.setScalar(L.R * (1.3 + 0.15 * Math.sin(battle.t * 10))); L.mark.lookAt(camera.position);
    if (L.mt > (L.young ? 3.8 : 3.2)) { L.mark.visible = false; const near = Math.hypot(boat.x - mon.x, boat.z - mon.z) < 30;
      if (near && !boat.air && Math.random() < (L.young ? 0.2 : enraged ? 0.45 : 0.3)) { L.mode = 'coil'; L.mt = 0; L.coil = { a: Math.atan2(mon.x - boat.x, mon.z - boat.z), hits: 0, need: L.young ? 2 : 3, charge: 0 }; warn('🐍 IT COILS AROUND YOUR SHIP!', 2.5); sfx.creak(); }
      else { L.mode = 'stalk'; L.mt = 0; L.dur = enraged ? rnd(2.5, 3.5) : rnd(3.5, 5); L.orbit = Math.atan2(mon.x - boat.x, mon.z - boat.z); jormHint(L); } } }
  else if (L.mode === 'coil') { const C = L.coil; boat.v = 0; boat.wp = null; st.dive = ease(st.dive, 0, 6); st.attack = ease(st.attack, 0.35, 3);
    C.a += dt * (C.charge ? 1.2 : 4.2); const rc = t.B * 0.6 + L.R * 1.2; mon.x = boat.x + Math.sin(C.a) * rc; mon.z = boat.z + Math.cos(C.a) * rc; mon.yaw = C.a + Math.PI / 2; boat.shake = Math.max(boat.shake, 0.2);
    const [hx, hy, hz] = jormHead(mon); L.mark.visible = L.mt > 1.2; L.mark.position.set(hx, hy, hz); L.mark.scale.setScalar(L.R * 1.3); L.mark.lookAt(camera.position);
    if (L.mt > 1.2 && !C.charge) { C.charge = 0.01; jormHint(L, '⚡ IT CHARGES WITH LIGHTNING! Hit its head ' + C.need + ' times to break the coil!'); sfx.zap(); }
    if (C.charge) { C.charge += dt; if (Math.random() < dt * 30) foam.add(hx + rnd(-2, 2), hz + rnd(-2, 2), { spray: true, y: hy + rnd(-2, 2), vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(-1, 3), s: 0.5, life: 0.4, a: 1 });
      if (C.hits >= C.need) { L.coil = null; L.mode = 'exposed'; L.mt = 1; mon.hp -= attack() * 0.6; mon.stState.hurt = 1; pop(boat.x, boat.y + 4, boat.z, 'BROKE THE COIL!', '#7dff3a'); sfx.hit(); jormHint(L, '🐍 It reels back: SHOOT ITS HEAD!'); }
      else if (C.charge > 3) { L.coil = null; flash = 1; sfx.zap(); sfx.thunder(); boat.shake = 1; damage(mon.dmg * (L.young ? 1 : 1.5) * (1 - defense()), '⚡ ' + mon.name + ' electrocutes your ship!'); if (!battle) return; L.mode = 'stalk'; L.mt = 0; L.dur = rnd(3, 4.5); L.mark.visible = false; jormHint(L); } } }
  if (mon.hp <= 0) { endLegend('win'); return; } }
function jormFire(L, mon) { if (L.mode !== 'exposed' && !(L.mode === 'coil' && L.coil && L.coil.charge)) return false; L.reload = legendReload(); unlockAudio(); sfx.throw();
  const [hx, hy, hz] = jormHead(mon), perfect = L.mode === 'exposed' && L.perfect; launch({ x: boat.x, y: boat.y + 2.2, z: boat.z }, { x: hx, y: hy, z: hz }, P.up.ballista ? 'bolt' : 'spear', () => { const L2 = battle && battle.legend; if (L2 !== L) return;
    if (L.mode === 'coil' && L.coil) { L.coil.hits++; mon.hp -= attack() * 0.15; sfx.hit(); pop(hx, hy + 2, hz, 'HACK! ' + L.coil.hits + ' / ' + L.coil.need, '#ffffff'); return; }
    if (L.mode !== 'exposed') { pop(hx, hy + 2, hz, 'MISS', '#9ab8c8'); return; } const d = Math.round(attack() * 0.9 * (perfect ? 1.6 : 1) * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); mon.hp -= d; mon.stState.hurt = 1; sfx.hit(); pop(hx, hy + 2, hz, (perfect ? 'PERFECT! ' : '') + '−' + d, perfect ? '#ffd24a' : '#ffffff'); });
  return true; }

// THE ELDER ONE, the ward: its power holds your ship still. A violet ward shields it while ghost lights drift at your
// ship (shoot them first). Then it lights the four runes floating round your ship in a sequence: tap them in the same
// order (or keys 1-4) to shatter the ward, then shoot it while it is down. Get the runes wrong and it lashes out. Each
// round the sequence grows. Sometimes it drags your ship up into the air: shoot its eye while you hang there and it drops
// you; if not, it slams you into the sea, or flings you away like a tornado.
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ'], RUNE_COL = [0xff6a4a, 0x6ad0ff, 0x9fe86a, 0xffd24a];
const runeTex = RUNES.map((r, i) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 74px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r, 64, 66); g.font = 'bold 26px sans-serif'; g.fillText(String(i + 1), 104, 22); return new THREE.CanvasTexture(c); });
const runeGeo = new THREE.PlaneGeometry(1, 1), wardGeo = new THREE.SphereGeometry(1, 24, 16), wispGeo = new THREE.SphereGeometry(1, 10, 8);
// the Elder's eyes (the head sits 7.6 R up the torso, the eyes 1.6 R forward of it)
function elderEye(mon) { const R = mon.size / 4.5, sy = Math.sin(mon.yaw), cy = Math.cos(mon.yaw), f = 2.4 * R; return [mon.x + sy * f, mon.g.position.y + 6.6 * R, mon.z + cy * f, R]; }
function elderStart(L, mon) { const t = T(), R = mon.size / 4.5, dist = (L.young ? 15 : 21) + t.L * 0.5;
  mon.x = boat.x + Math.sin(boat.yaw) * dist; mon.z = boat.z + Math.cos(boat.yaw) * dist; mon.yaw = boat.yaw + Math.PI; helm.held = false; setThrottle(0, true); boat.v = 0;
  const ward = new THREE.Mesh(wardGeo, new THREE.MeshBasicMaterial({ color: 0xb06aff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(ward);
  // four runes on the water round your ship: two toward the Elder, two toward the camera
  const rr = t.L * 0.5 + 5.5, runes = [-0.7, 0.7, -2.4, 2.4].map((da, i) => { const a = boat.yaw + da, x = boat.x + Math.sin(a) * rr, z = boat.z + Math.cos(a) * rr;
    const m = new THREE.Mesh(runeGeo, new THREE.MeshBasicMaterial({ map: runeTex[i], color: RUNE_COL[i], transparent: true, opacity: 0.55, depthTest: false, depthWrite: false })); m.renderOrder = 7; m.position.set(x, ocean.heightAt(x, z) + 1.6, z); m.scale.setScalar(4); scene.add(m); return { m, x, z, lit: 0, da, rr }; });
  Object.assign(L, { R, ward, runes, mode: 'ward', mt: 0, dur: L.young ? 6 : 7.5, seqLen: L.young ? 2 : 3, seq: [], si: 0, wisps: [], wispT: 1.2, lift: null, mark: legendRing(0xffd24a, eyeRingGeo), liftNext: rnd(0.3, 0.5) });
  L.mark.visible = false; mon.stState.rise = 1; mon.stState.dive = 0; }
function elderHint(txt) { const h = $('bHint'); if (h) h.textContent = txt; }
function elderWisp(L, mon) { const [ex, ey, ez] = elderEye(mon), m = new THREE.Mesh(wispGeo, new THREE.MeshBasicMaterial({ color: 0x8affc0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.setScalar(L.young ? 0.8 : 1.1); m.position.set(ex + rnd(-3, 3), ey - 2, ez + rnd(-3, 3)); scene.add(m); L.wisps.push({ m, wob: Math.random() * 6 }); }
function dropWisp(L, W) { scene.remove(W.m); W.m.material.dispose(); L.wisps.splice(L.wisps.indexOf(W), 1); }
function elderRune(i) { const L = battle && battle.legend; if (!L || L.kind !== 'elder' || L.mode !== 'input') return; const R = L.runes[i]; R.lit = 0.35;
  if (L.seq[L.si] === i) { L.si++; R.m.material.color.setHex(0xffffff); sfx.coins(); if (L.si >= L.seq.length) { L.mode = 'open'; L.mt = 0; L.perfect = true; L.ward.visible = false; foam.splash(battle.mon.x, battle.mon.z, 3); sfx.boom(); warn('✨ THE WARD SHATTERS! ✨', 2); elderHint('The ward is down: SHOOT ' + battle.mon.name.toUpperCase() + ' NOW!'); L.seqLen = Math.min(L.young ? 4 : 6, L.seqLen + 1); } }
  else { L.mode = 'ward'; L.mt = 0; L.dur = 4; R.m.material.color.setHex(0xff2a2a); flash = 0.6; sfx.zap(); damage(battle.mon.dmg * 0.8 * (1 - defense()), 'Wrong rune! ' + battle.mon.name + ' lashes out!'); if (battle) elderHint('Shoot the ghost lights before they reach you! Then watch the runes…'); } }
function updateElder(dt) { const L = battle.legend, mon = battle.mon, st = mon.stState, t = T(), enraged = mon.hp < mon.maxHp * (mon.rageAt || 0.5); L.mt += dt;
  const [ex, ey, ez, R] = elderEye(mon); L.ward.position.set(mon.x, mon.g.position.y + 5 * R, mon.z); L.ward.scale.setScalar(R * 6.5 * (1 + 0.03 * Math.sin(battle.t * 3)));
  for (const [i, Rn] of L.runes.entries()) { Rn.lit = Math.max(0, Rn.lit - dt); Rn.m.material.opacity = Rn.lit > 0 ? 1 : L.mode === 'input' ? 0.75 : 0.45; if (Rn.da != null && !boat.dunk) { const a = boat.yaw + Rn.da, k = Math.min(1, dt * 2); Rn.x += (boat.x + Math.sin(a) * Rn.rr - Rn.x) * k; Rn.z += (boat.z + Math.cos(a) * Rn.rr - Rn.z) * k; Rn.m.position.set(Rn.x, ocean.heightAt(Rn.x, Rn.z) + 1.6, Rn.z); } Rn.m.quaternion.copy(camera.quaternion); Rn.m.scale.setScalar(Math.max(4, camera.position.distanceTo(Rn.m.position) * 0.085) * (1 + Rn.lit * 0.6)); if (Rn.lit <= 0) Rn.m.material.color.setHex(RUNE_COL[i]); }
  // ghost lights drift at your ship while the ward is up
  if (L.mode === 'ward') { L.wispT -= dt; if (L.wispT <= 0) { elderWisp(L, mon); L.wispT = (L.young ? 1.3 : enraged ? 0.5 : 0.75) * rnd(0.8, 1.2); } st.attack += (0.15 - st.attack) * Math.min(1, dt * 2);
    if (L.mt > L.dur) { L.mode = 'show'; L.mt = 0; L.seq = Array.from({ length: L.seqLen }, () => (Math.random() * 4) | 0); L.si = 0; elderHint('Watch the runes it lights…'); sfx.groan && sfx.groan(); } }
  for (const W of [...L.wisps]) { W.wob += dt * 3; const p = W.m.position, dx = boat.x - p.x, dy = boat.y + 2 - p.y, dz = boat.z - p.z, d = Math.hypot(dx, dy, dz), sp = (L.young ? 5 : 7) * dt; p.x += (dx / d) * sp + Math.sin(W.wob) * dt * 2; p.y += (dy / d) * sp; p.z += (dz / d) * sp + Math.cos(W.wob) * dt * 2;
    if (d < t.B * 0.6 + 1.5) { dropWisp(L, W); flash = Math.max(flash, 0.3); damage(mon.dmg * 0.35 * (1 - defense()), 'A ghost light burns your ship!'); if (!battle) return; } }
  if (L.mode === 'show') { st.attack += (0.5 - st.attack) * Math.min(1, dt * 3); const step = L.young ? 0.85 : 0.65, k = Math.floor(L.mt / step); if (k < L.seq.length && L.mt - k * step < dt * 1.5) { L.runes[L.seq[k]].lit = step * 0.75; sfx.throw(); }
    if (L.mt > L.seq.length * step + 0.3) { L.mode = 'input'; L.mt = 0; L.limit = 3 + L.seq.length * 1.1; } }
  if (L.mode === 'input') { elderHint('Tap the runes in the same order (or keys 1-4): ' + L.si + ' / ' + L.seq.length + ' · ' + Math.max(0, Math.ceil(L.limit - L.mt)) + ' s');
    if (L.mt > L.limit) { L.mode = 'ward'; L.mt = 0; L.dur = 4; flash = 0.6; sfx.zap(); damage(mon.dmg * 0.8 * (1 - defense()), 'Too slow! ' + mon.name + ' lashes out!'); if (!battle) return; elderHint('Shoot the ghost lights before they reach you! Then watch the runes…'); } }
  if (L.mode === 'open') { st.attack += (0 - st.attack) * Math.min(1, dt * 3); if (L.mt > 0.8) L.perfect = false; L.mark.visible = true; L.mark.position.set(ex, ey, ez); L.mark.scale.setScalar(R * 1.6 * (1 + 0.1 * Math.sin(battle.t * 10))); L.mark.lookAt(camera.position);
    if (L.mt > L.liftNext * (L.young ? 5 : 4) && !L.lift && !boat.air && Math.random() < dt * (enraged ? 0.9 : 0.5)) { L.mode = 'lift'; L.mt = 0; L.lift = { x0: boat.x, z0: boat.z, h: 0, hit: false, grip: 0, win: rnd(0.3, 1.2), wl: L.young ? 0.8 : 0.55 }; L.ward.visible = true; warn('👁 IT LIFTS YOUR SHIP!', 2); elderHint('Wait for its eye to FLASH, then shoot it to break free!'); if (ship.mask) ship.mask.visible = false; sfx.whoosh(); }
    else if (L.mt > (L.young ? 5 : 4)) { L.mode = 'ward'; L.mt = 0; L.dur = L.young ? 6 : 7; L.ward.visible = true; L.mark.visible = false; L.liftNext = rnd(0.3, 0.8); elderHint('The ward returns! Shoot the ghost lights, then watch the runes…'); } }
  if (L.mode === 'lift') { const F = L.lift, k = Math.min(1, L.mt / 1.2), px = mon.x + Math.sin(mon.yaw) * R * 5, pz = mon.z + Math.cos(mon.yaw) * R * 5; st.attack += (1 - st.attack) * Math.min(1, dt * 4);
    boat.x = lerp(F.x0, px, k * 0.6); boat.z = lerp(F.z0, pz, k * 0.6); F.h = R * 6 * k * (2 - k); boat.dunk = -F.h; boat.shake = 0.15;
    const lt = L.mt - 1.2, open = lt >= F.win && lt <= F.win + F.wl; L.mark.visible = true; L.mark.position.set(ex, ey, ez); L.mark.scale.setScalar(R * (open ? 2.2 : 1.2) * (1 + 0.1 * Math.sin(battle.t * 14))); L.mark.material.opacity = open ? 1 : 0.3; L.mark.lookAt(camera.position); if (open && !F.flashed) { F.flashed = true; sfx.zap(); }
    if (F.hit) { L.mode = 'drop'; L.mt = 0; F.from = F.h; L.mark.material.opacity = 0.85; mon.hp -= attack() * 0.8; st.hurt = 1; pop(ex, ey + 2, ez, 'IT DROPS YOU! −' + Math.round(attack() * 0.8), '#7dff3a'); sfx.hit(); }
    else if (L.mt > 1.2 + (L.young ? 2.6 : 2) - F.grip) { L.mark.material.opacity = 0.85; L.mode = 'slam'; L.mt = 0; F.from = F.h; F.throw = Math.random() < 0.35; } }
  if (L.mode === 'drop' || L.mode === 'slam') { const F = L.lift, dur = L.mode === 'drop' ? 0.7 : 0.35, k = Math.min(1, L.mt / dur); if (!F.throw) { boat.x = lerp(boat.x, F.x0, Math.min(1, dt * 2.5)); boat.z = lerp(boat.z, F.z0, Math.min(1, dt * 2.5)); } boat.dunk = -F.from * (1 - k * k);
    if (k >= 1) { boat.dunk = 0; foam.splash(boat.x, boat.z, L.mode === 'slam' ? 3 : 1.6); sfx.splash();
      if (L.mode === 'slam') { boat.shake = 1; sfx.boom(); damage(mon.dmg * (L.young ? 1.1 : 1.6) * (1 - defense()), F.throw ? mon.name + ' hurls your ship away!' : mon.name + ' slams your ship into the sea!'); if (!battle) return;
        if (F.throw) { boat.air = startAir(boat, { x: mon.x, z: mon.z, r: 8, vs: 1 }, 0.6, 1); say('…and flings you away!', 2); } }
      else damage(maxHp() * 0.03 * (1 - defense()), 'You crash back onto the sea!');
      if (!battle) return; if (ship.mask && !boat.air) ship.mask.visible = true; L.lift = null; L.mode = 'ward'; L.mt = 0; L.dur = L.young ? 6 : 7; L.mark.visible = false; L.liftNext = rnd(0.3, 0.8); elderHint('The ward returns! Shoot the ghost lights, then watch the runes…'); } }
  if (mon.hp <= 0) { endLegend('win'); return; } }
// what FIRE / Space shoots in the Elder fight: its eye while you hang in its grip, the Elder while the ward is down, else the nearest ghost light
function elderFire(L, mon, pick) { const [ex, ey, ez] = elderEye(mon), kind = P.up.ballista ? 'bolt' : 'spear', from = { x: boat.x, y: boat.y + 2.2 - (boat.dunk || 0), z: boat.z };
  if (L.mode === 'lift' || (L.mode === 'open' && (!pick || pick.elder))) { L.reload = legendReload(); sfx.throw(); const lifting = L.mode === 'lift', perfect = L.mode === 'open' && L.perfect;
    launch(from, { x: ex, y: ey, z: ez }, kind, () => { const L2 = battle && battle.legend; if (L2 !== L) return; if (lifting) { const F = L.lift; if (L.mode !== 'lift' || !F) return; const lt = L.mt - 1.2; if (lt >= F.win && lt <= F.win + F.wl) { F.hit = true; return; } F.grip += 0.5; pop(ex, ey + 2, ez, lt < F.win ? 'TOO EARLY!' : 'TOO LATE!', '#ff7a5a'); sfx.creak(); return; } if (L.mode !== 'open') { pop(ex, ey + 2, ez, 'WARDED', '#b06aff'); return; }
      const d = Math.round(attack() * 0.3 * (perfect ? 1.6 : 1) * (boat.thor > 0 ? 2 : 1) * rnd(0.9, 1.1)); mon.hp -= d; mon.stState.hurt = 1; sfx.hit(); pop(ex, ey + 2, ez, (perfect ? 'PERFECT! ' : '') + '−' + d, perfect ? '#ffd24a' : '#ffffff'); }); return; }
  let W = pick && pick.W; if (!W) { let bd = 1e9; for (const w of L.wisps) { const d = w.m.position.distanceTo(V(boat.x, boat.y, boat.z)); if (d < bd) { bd = d; W = w; } } } if (!W) return;
  L.reload = legendReload(); sfx.throw(); const p = W.m.position; launch(from, { x: p.x, y: p.y, z: p.z }, kind, () => { if (L.wisps.includes(W)) { pop(W.m.position.x, W.m.position.y + 1, W.m.position.z, 'BANISHED', '#8affc0'); dropWisp(L, W); sfx.hit(); } }); }
function elderTap(L, mon, x, y) { const near = (wx, wy, wz, r) => { const s = toScreen(wx, wy, wz); return s ? Math.hypot(s[0] - x, s[1] - y) < r : false; };
  if (L.mode === 'input') { let best = -1, bd = 90; L.runes.forEach((Rn, i) => { const s = toScreen(Rn.x, Rn.m.position.y, Rn.z); if (s) { const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = i; } } }); if (best >= 0) elderRune(best); return; }
  if (L.reload > 0) return; const [ex, ey, ez] = elderEye(mon); if ((L.mode === 'open' || L.mode === 'lift') && near(ex, ey, ez, 120)) { elderFire(L, mon, { elder: true }); return; }
  for (const W of L.wisps) if (near(W.m.position.x, W.m.position.y, W.m.position.z, 70)) { elderFire(L, mon, { W }); return; } }

function updateLegend(dt) { const L = battle.legend, mon = battle.mon; battle.t += dt; L.reload = Math.max(0, L.reload - dt); if (!L.sail) { boat.v = 0; boat.wp = null; }
  if (L.kind === 'kraken') updateKraken(dt); else if (L.kind === 'jorm') updateJorm(dt); else if (L.kind === 'elder') updateElder(dt); else if (L.kind === 'beast') updateBeast(dt); if (!battle) return;
  L.hudT = (L.hudT || 0) - dt; if (L.hudT <= 0) { L.hudT = 0.1; $('bFoeHp').style.width = clamp(mon.hp / mon.maxHp, 0, 1) * 100 + '%'; if ($('bFire')) { $('bLoad').style.width = (1 - clamp(L.reload / legendReload(), 0, 1)) * 100 + '%'; $('bFire').classList.toggle('ready', L.reload <= 0); } } }
function clearLegend() { const L = battle && battle.legend; if (!L) return; for (const k of ['shadow', 'ring', 'mark', 'ward']) if (L[k]) { scene.remove(L[k]); L[k].material.dispose(); } for (const Rn of L.runes || []) { scene.remove(Rn.m); Rn.m.material.dispose(); } for (const W of [...(L.wisps || [])]) dropWisp(L, W); boat.dunk = 0; L.grab = null; if (ship.mask && !boat.air) ship.mask.visible = true; for (const K of L.tents) dropTentacle(K); L.tents.length = 0; if (L.eyeMark) { scene.remove(L.eyeMark); L.eyeMark.material.dispose(); }
  const ui = $('broad'); if (ui) ui.remove(); $('fireBtn').classList.remove('aimNow', 'aimSoon', 'aimFree', 'aimNo'); document.body.classList.remove('busy', 'legendOn'); $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); if (battle.mon.stState) { battle.mon.stState.attack = 0; battle.mon.stState.reach = 1; } }
function endLegend(result) { const L = battle && battle.legend; if (!L) return; const mon = battle.mon; clearLegend(); battle = null; setBattle(false); boat.lastHit = time; boat.grace = 4; hud();
  if (result === 'win') { killMon(mon); setThrottle(0, true); }
  else if (result === 'flee') { damage(mon.dmg * 1.2 * (1 - defense()), 'You tear free of its grip!'); mon.stun = 2.5; boat.yaw = Math.atan2(boat.x - mon.x, boat.z - mon.z); helm.angle = 0; boat.boost = 3.5; boat.v = topSpeed(); setThrottle(1, true); }
  else if (result === 'escape') { mon.stun = 8; mon.state = 'wander'; mon.chaseT = 0; say(mon.name + ' gives up the chase.', 3); } }

// ---------- fishing spots, floating supplies, wrecks ----------
const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
function spawnSpot() { const a = Math.random() * 6.28, d = rnd(40, 130), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30 || world.blockAt(x, z, 8)) return; const r = Math.random(); const kind = r < 0.5 ? 'fish' : r < (isNight() && P.up.lights ? 0.75 : 0.85) ? 'flotsam' : 'treasure';
  const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(sharedGeo('spotRing', () => new THREE.RingGeometry(0.8, 1.05, 24)), spotMat.clone()); m.rotation.x = -Math.PI / 2; m.userData.k = k; g.add(m); }
  const jumper = new THREE.Mesh(sharedGeo('jumper', () => new THREE.SphereGeometry(0.25, 8, 6)), M(kind === 'treasure' ? 0xffd24a : kind === 'flotsam' ? 0x8a5a32 : 0x9ab8c8, kind === 'treasure' ? 'glow' : 'skin')); jumper.scale.set(1, 0.7, 2.2); g.add(jumper); g.userData.jumper = jumper;
  g.position.set(x, 0, z); scene.add(g); spots.push({ g, x, z, kind, t: Math.random() * 5 }); }
function spawnFloat(x, z, kind, amt) { const g = new THREE.Group(); if (kind === 'g') { const c = new THREE.Mesh(sharedGeo('chest', () => new THREE.BoxGeometry(0.9, 0.6, 0.6)), M(0x7a4a22)); g.add(c); const l = new THREE.Mesh(sharedGeo('chestLid', () => new THREE.BoxGeometry(0.95, 0.12, 0.65)), M(0xe6b43a)); l.position.y = 0.25; g.add(l); }
  else if (kind === 'f') { const f = new THREE.Mesh(sharedGeo('fishF', () => new THREE.SphereGeometry(0.3, 8, 6)), M(0x9ab8c8)); f.scale.set(1, 0.6, 2); g.add(f); }
  else if (kind === 's') { const o = new THREE.Mesh(sharedGeo('orb', () => new THREE.SphereGeometry(0.42, 10, 8)), M(0xd8b0ff, 'glow')); o.position.y = 0.5; g.add(o); const h = new THREE.Mesh(sharedGeo('orbHalo', () => new THREE.SphereGeometry(0.75, 10, 8)), M(0x9a5aff, 'ghost')); h.position.y = 0.5; g.add(h); }
  else { const b = new THREE.Mesh(sharedGeo('barrel', () => new THREE.CylinderGeometry(0.42, 0.42, 1, 10)), M(kind === 'i' ? 0x5a5e66 : 0x8a5a32)); b.rotation.z = Math.PI / 2; g.add(b); for (const s of [-0.3, 0.3]) { const h = new THREE.Mesh(sharedGeo('hoop', () => new THREE.TorusGeometry(0.43, 0.05, 4, 12)), M(0x3a2414)); h.rotation.y = Math.PI / 2; h.position.x = s; g.add(h); } }
  g.position.set(x, 0, z); scene.add(g); floats.push({ g, x, z, kind, amt, t: Math.random() * 6 }); }
function updateSea(dt) {
  spotT -= dt; if (spotT <= 0) { spotT = 2; for (let i = spots.length - 1; i >= 0; i--) { const s = spots[i]; if (Math.hypot(s.x - boat.x, s.z - boat.z) > 200) removeSpot(s); } if (spots.length < 4 + (isNight() ? P.up.lights || 0 : 0)) spawnSpot();
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; if (Math.hypot(f.x - boat.x, f.z - boat.z) > 220) { scene.remove(f.g); floats.splice(i, 1); } } if (floats.length < 7) { const a = Math.random() * 6.28, d = rnd(40, 150), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (!world.blockAt(x, z, 4) && Math.abs(x) < HALF - 20 && Math.abs(z) < HALF - 20) { const r = Math.random(); spawnFloat(x, z, P.realm === 'hel' && r < 0.3 ? 's' : r < 0.55 ? 'w' : r < 0.85 ? 'i' : 'g', 0); } } }
  for (const s of spots) { s.t += dt; s.g.position.y = ocean.heightAt(s.x, s.z) + 0.05; for (const m of s.g.children) if (m.userData.k != null) { const k = ((s.t * 0.6 + m.userData.k / 3) % 1); m.scale.setScalar(1 + k * 4); m.material.opacity = 0.6 * (1 - k); }
    const j = s.g.userData.jumper, ph = (s.t * 0.8) % 2.2; if (ph < 0.8) { const k = ph / 0.8; j.visible = true; j.position.set(Math.sin(s.t) * 2, Math.sin(k * Math.PI) * 1.6, Math.cos(s.t) * 2 + (k - 0.5) * 3); j.rotation.x = (k - 0.5) * 2; } else j.visible = false; }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; f.g.position.set(f.x, ocean.heightAt(f.x, f.z) + 0.1 + Math.sin(f.t * 2) * 0.08, f.z); f.g.rotation.set(Math.sin(f.t * 1.3) * 0.25, f.t * 0.3, Math.cos(f.t * 1.1) * 0.25);
    if (state === 'play' && Math.hypot(f.x - boat.x, f.z - boat.z) < T().L * 0.5 + 1.5) { const k = 1 + P.tier * 0.6, r = f.kind === 'w' ? { w: Math.round(rnd(3, 7) * k) } : f.kind === 'i' ? { i: Math.round(rnd(1, 4) * k) } : f.kind === 'f' ? { f: f.amt || 1 } : f.kind === 's' ? { s: f.amt || 1 } : { g: Math.round(rnd(10, 30) * k) }; reward(r, f.x, 2, f.z); foam.splash(f.x, f.z, 0.5); scene.remove(f.g); floats.splice(i, 1); } }
  for (const w of world.wrecks) if (w.looted && time > w.looted) w.looted = false;
}
function actionContext() { if (battle || fishing || boat.air) return null; const v = boat.v;
  { const G = world.gate; if (G && Math.hypot(G.x - boat.x, G.z - boat.z) < 20 + T().L * 0.3) return v < 6 || !gateOpen() ? { kind: 'gate', icon: P.realm === 'hel' ? '🌅' : '🌀', label: P.realm === 'hel' ? 'HOME' : 'HEL' } : { kind: 'slow', icon: '🌀', label: 'SLOW' }; }
  for (const h of world.harbors) if (Math.hypot(h.dock.x - boat.x, h.dock.z - boat.z) < 16 + T().L * 0.3) return v < 4.5 ? { kind: 'dock', h, icon: '⚓', label: 'DOCK' } : { kind: 'slow', icon: '⚓', label: 'SLOW' };
  let nearM = null, nd = 1e9; for (const mon of mons) { if (mon.dead || mon.rise < 1 || mon.type === 'jelly') continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (d < 22 + mon.size && d < nd) { nd = d; nearM = mon; } } if (nearM) return { kind: 'fight', mon: nearM, icon: '⚔', label: 'FIGHT' };
  if (wreckHere() && Math.hypot(P.wreck.x - boat.x, P.wreck.z - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'salvage', w: 'mine', icon: '☠', label: 'SALVAGE' } : { kind: 'slow', icon: '☠', label: 'SLOW' };
  for (const w of world.wrecks) if (!w.looted && Math.hypot(w.x - boat.x, w.z - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'salvage', w, icon: '🪝', label: 'SALVAGE' } : { kind: 'slow', icon: '🪝', label: 'SLOW' };
  for (const m of P.maps) if ((m.realm || 'mid') === P.realm && Math.hypot(m.lx - boat.x, m.lz - boat.z) < 14 + T().L * 0.3) return v < 3.5 ? { kind: 'land', m, icon: '⛏', label: 'LAND' } : { kind: 'slow', icon: '⛏', label: 'SLOW' };
  for (const s of spots) if (Math.hypot(s.x - boat.x, s.z - boat.z) < 9 + T().L * 0.35) return v < 3.5 ? { kind: 'fish', s, icon: s.kind === 'treasure' ? '💰' : s.kind === 'flotsam' ? '📦' : '🎣', label: 'FISH' } : { kind: 'slow', icon: '🎣', label: 'SLOW' };
  return null; }
let ctx = null;
function doAction() { if (!ctx || state !== 'play') return; if (autoOn() && ctx.kind !== 'dock') autoDock(false); if (ctx.kind === 'dock') openHarbor(ctx.h); else if (ctx.kind === 'fight') startBattle(ctx.mon, true); else if (ctx.kind === 'fish') startFishing(ctx.s); else if (ctx.kind === 'salvage') startSalvage(ctx.w); else if (ctx.kind === 'land') startDig(ctx.m); else if (ctx.kind === 'gate') gateAsk(); else if (ctx.kind === 'slow') say('Tap STOP or ROW to slow down first.'); }
const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xf2e6c8 })); line.visible = false; scene.add(line);
function startFishing(s) { fishing = { s }; boat.wp = null; $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy'); line.visible = true;
  minis.fish({ kind: s.kind, nets: P.up.nets, tier: P.tier, biteChance: 0.07 }, (res) => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); line.visible = false; fishing = null; boat.grace = 2.5;
    const k = 1 + P.tier * 0.6, q = res.q || 0.4;
    if (res.result === 'catch') { const r = s.kind === 'fish' ? { f: Math.round((2 + P.up.nets * 1.5 + q * 3 + P.tier) * (1 + perk('fish'))) } : s.kind === 'flotsam' ? { w: Math.round((5 + q * 6) * k * (1 + P.up.nets * 0.2)), i: Math.round((1 + q * 3) * k) } : { g: Math.round((18 + q * 40) * k * (1 + P.up.nets * 0.15)), s: P.realm === 'hel' ? 2 + Math.round(q * 3) : 0 }; reward(r, s.x, 2.5, s.z); removeSpot(s); bountyHit('fish'); P.st.fish = (P.st.fish || 0) + 1; sagaCheck(); }
    else if (res.result === 'bite') { removeSpot(s); const lv = Math.max(0, P.tier + rnd(-0.3, 0.6)), vi = MLV.shark.reduce((bi, l, i) => (Math.abs(l - lv) < Math.abs(MLV.shark[bi] - lv) ? i : bi), 0); const mon = spawnMon({ type: 'shark', v: vi, lv: Math.max(MLV.shark[vi], lv + (P.realm === 'hel' ? 0.5 : 0)) }, s.x, s.z); mon.state = 'chase'; startBattle(mon, false); } }); }
function removeSpot(s) { scene.remove(s.g); for (const m of s.g.children) if (m.material && m.material !== spotMat && !m.material.userData.shared) m.material.dispose(); const i = spots.indexOf(s); if (i >= 0) spots.splice(i, 1); }
function fishCast() { if (!fishing) return; foam.splash(fishing.s.x, fishing.s.z, 0.6); sfx.splash(0.5); }
function startSalvage(w) { const mine = w === 'mine'; if (mine) w = P.wreck; if (!w) return; fishing = { s: w }; $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy');
  minis.salvage({ tier: P.tier }, (res) => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); fishing = null;
    if (mine) { const frac = res.result === 'done' ? 1 : clamp(res.frac || 0, 0, 1) * 0.8; if (P.wreck && frac > 0.05) { takeWreck(frac, w.x, w.z); say(P.wreck ? 'You raise part of your cargo. The rest still lies below.' : 'You raise all the cargo from your wreck! ☠', 3.5); } return; }
    const k = (1 + P.tier * 0.6) * (res.frac || 0); if (res.result !== 'stop' || res.frac > 0.3) { reward({ w: Math.round(rnd(10, 20) * k), i: Math.round(rnd(4, 10) * k), g: Math.round(rnd(20, 45) * k) }, w.x, 3, w.z); w.looted = time + 480; if (Math.random() < 0.3) setTimeout(() => giveMap(), 1200); } }); }

// ---------- weather: rain, storms with lightning to catch, fog, rogue waves, waterspouts, sea tornadoes ----------
const WXNAME = { clear: '', calm: 'Calm', rain: '🌧 Rain', storm: '⛈ Storm', fog: '🌫 Fog', spout: '💧 Waterspouts', tornado: '🌪 Sea tornado', rogue: '🌊 Rogue waves' };
const WXNAME_HEL = { rain: '🌧 Ash rain', storm: '⛈ Ember storm', fog: '🌫 Grave mist' };
const LOOK = { clear: null, calm: 'calm', rain: 'rain', storm: 'storm', fog: 'fog', spout: 'rain', tornado: 'storm', rogue: 'storm' };
function pickWeather() { if (calm()) return ['calm', 'calm', 'rain'][(Math.random() * 3) | 0]; const reg = world.regionAt(boat.x, boat.z), opts = { home: ['calm', 'rain', 'fog', 'storm', 'spout'], frost: ['fog', 'storm', 'rogue', 'calm', 'rain'], storm: ['storm', 'storm', 'tornado', 'rogue', 'spout', 'rain'], mist: ['fog', 'fog', 'rain', 'storm', 'spout'], warm: ['calm', 'spout', 'storm', 'rain', 'tornado'] }[reg]; return opts[(Math.random() * opts.length) | 0]; }
function setWeather(type) { if (calm() && (type === 'spout' || type === 'tornado' || type === 'storm' || type === 'rogue')) type = 'calm'; if (type === 'clear') { if (wx.type !== 'clear') wx.fading = true; return; } wx.type = type; wx.k = 0; wx.fading = false; wx.t = rnd(40, 70); boltT = 3;
  const tip = { storm: 'A storm! Sail into a blue ring to catch the lightning.', tornado: 'A sea tornado is coming! Keep away from it.', spout: 'Waterspouts! Steer clear of the spinning columns.', rogue: 'Rogue wave weather. Turn your bow into the big waves!', fog: 'Fog rolls in. Monsters lurk close.', rain: 'Rain.', calm: 'The sea goes calm.' }[type]; say(tip, 3.5); sfx.whoosh();
  if (type === 'spout') for (let k = 0; k < 2; k++) spawnSpout('waterspout', 2.0 * vortexSize()); if (type === 'tornado') { const vs = vortexSize(); spawnSpout('seastorm', 2.7 * vs); if (vs > 2) warn('🌪 A HUGE SEA TORNADO! It can lift even a Drakkar. Keep away!', 5); } if (type === 'rogue') rogueT = 6; }
// vortex size relative to the old fixed size: 60% about the same, 30% bigger, 10% huge
function vortexSize() { const r = Math.random(); return r < 0.6 ? rnd(1, 1.35) : r < 0.9 ? rnd(1.35, 2.1) : rnd(2.3, 3.1); }
function spawnSpout(skin, sc) { const a = Math.random() * 6.28, d = rnd(60, 100), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; const g = twisters.make(true, [], skin); g.scale.setScalar(0.01); g.position.set(x, 0, z); scene.add(g); spouts.push({ g, x, z, sc, vs: sc / (skin === 'seastorm' ? 2.7 : 2.0), r: sc * 3.4, dir: Math.atan2(boat.x - x, boat.z - z) + rnd(-0.6, 0.6), life: wx.t, age: 0, tornado: skin === 'seastorm' }); }
// ---------- caught by a vortex: lifted spinning up the funnel, then flung out to crash down far away ----------
// k: 1 for small things, falling to 0 at about a Drakkar's size; giants are never lifted
const GIANTS = new Set(['megalodon', 'squid', 'kraken', 'elder', 'jormungandr', 'leviathan']);
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
  if (Math.hypot(boat.x - x, boat.z - z) < R + T().B * 0.5 && state === 'play') { boat.thor = 22 * (1 + perk('thor')); say('<span style="color:#9fe0ff">⚡ THOR\'S FURY! ⚡</span> Double damage and a mighty shield for 22 s', 3.5); sfx.zap(); sfx.horn(); P.hp = Math.min(maxHp(), P.hp + maxHp() * 0.05); hud(); }
  for (const mon of mons) if (!mon.dead && !mon.boss && !mon.giant && !inFight(mon) && Math.hypot(mon.x - x, mon.z - z) < R + mon.size * 0.5) { const d = Math.round(mon.maxHp * 0.3); mon.hp -= d; pop(mon.x, mon.top, mon.z, '⚡−' + d, '#9fe0ff'); if (mon.hp <= 0) killMon(mon); } }
function updateWeather(dt) {
  if (wx.type === 'clear') { wx.next -= dt; if (wx.next <= 0) setWeather(pickWeather()); }
  else if (wx.fading) { wx.k = Math.max(0, wx.k - dt / 5); if (wx.k <= 0) { wx.type = 'clear'; wx.fading = false; wx.next = rnd(35, 70); } }
  else { wx.k = Math.min(1, wx.k + dt / 5); wx.t -= dt; if (wx.t <= 0) { setWeather('clear'); say('The weather clears.'); } }
  // lightning: blue warning rings, then the bolt (catch it with your ship for Thor's Fury)
  if ((wx.type === 'storm' || wx.type === 'tornado' || wx.type === 'rogue') && wx.k > 0.6 && !wx.fading && state === 'play') { boltT -= dt; if (boltT <= 0) { boltT = rnd(2.2, 4.5); warnRing(); } }
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const y = ocean.heightAt(r.x, r.z) + 0.15; r.m.position.set(r.x, y, r.z); r.inner.position.set(r.x, y + 0.02, r.z); const k = r.t / r.dur; r.m.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(r.t * (6 + k * 14))); r.inner.material.opacity = 0.12 + k * 0.3;
    if (r.t >= r.dur) { landBolt(r.x, r.z, r.R); scene.remove(r.m); scene.remove(r.inner); r.inner.material.dispose(); r.inner.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); } }
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t -= dt; b.g.visible = Math.random() < 0.85; if (b.t <= 0) { scene.remove(b.g); b.g.traverse((o) => o.geometry && o.geometry.dispose()); bolts.splice(i, 1); } }
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
  const wet = (LOOK[wx.type] === 'rain' || LOOK[wx.type] === 'storm') ? wx.k : 0; rain.visible = wet > 0.05; rain.material.opacity = 0.35 * wet; rain.material.color.setHex(P.realm === 'hel' ? 0x9a8a86 : 0xcfe6f2); if (rain.visible) { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { let y = p.getY(i) - dt * 40; let x = p.getX(i), z = p.getZ(i); if (y < -2) { x = camTgt.x + rnd(-50, 50); z = camTgt.z + rnd(-50, 50); y = rnd(20, 50); } x = camTgt.x + wrap100(x - camTgt.x); z = camTgt.z + wrap100(z - camTgt.z); p.setXYZ(i, x, y, z); p.setXYZ(i + 1, x + 0.3, y + 1.6, z + 0.2); } p.needsUpdate = true; }
}
const wrap100 = (d) => ((d + 50) % 100 + 100) % 100 - 50;
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
  if (calm()) EV.next = Math.max(EV.next, 45); if (!battle && !fishing && !EV.ambush) { EV.next -= dt; if (EV.next <= 0) { EV.next = rnd(60, 115); const reg = world.regionAt(boat.x, boat.z);
    const opts = Object.keys(EVW).filter((k) => !(k === 'whirl' && (EV.whirl || spouts.some((s) => s.tornado))) && !(k === 'fleet' && Object.keys(EV.fleets).length) && !(k === 'treasure' && mons.some((m) => m.treasure)));
    let sum = 0; for (const k of opts) sum += EVW[k][reg]; let pick = Math.random() * sum; for (const k of opts) { pick -= EVW[k][reg]; if (pick <= 0) { if (!startEvent(k)) EV.next = 8; break; } } } }
  if (P.realm === 'hel' && P.helWon && P.tier >= 7 && state === 'play' && !battle) { EV.armada = (EV.armada ?? 600) - dt; if (EV.armada <= 0 && !Object.keys(EV.fleets).length) EV.armada = raiderFleet(true) ? rnd(1020, 1380) : 20; }
  updateAmbush(dt); updateWhirl(dt); updateAurora(dt);
  for (const id in EV.fleets) if (!mons.some((m) => m.fleet === +id && !m.dead)) { if (EV.fleets[id].killed < EV.fleets[id].n) say(P.realm === 'hel' ? 'The rest of the draugr fleet sinks back into the dark.' : 'The rest of the raider fleet turns away.'); delete EV.fleets[id]; } }
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
  EV.ambush = { rel, gap, t: 1.6, e: { type: 'serpent', v, base: lvs[v], lv: Math.max(lvs[v], P.tier + rnd(0.1, 0.7)) + (P.realm === 'hel' ? 0.5 : 0) } };
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
function raiderFleet(armada) { const n = armada ? 6 : P.tier === 0 ? 2 : P.tier < 3 ? 3 : 4;
  for (let tries = 0; tries < 8; tries++) { const a = Math.random() * 6.28, cx = boat.x + Math.sin(a) * 150, cz = boat.z + Math.cos(a) * 150; if (!openAt(cx, cz, 22)) continue;
    const id = ++EV.fleetN, pal = P.realm === 'hel' ? HEL_PALS[world.regionAt(cx, cz)] || HEL_PALS.home : RAIDER_PALS[(Math.random() * RAIDER_PALS.length) | 0], hd = Math.atan2(boat.x - cx, boat.z - cz); let got = 0;
    for (let i = 0; i < n; i++) { const lead = i === 0, st = lead || (armada && i < 3) ? Math.min(7, P.tier) : Math.max(0, P.tier - 1), row = Math.ceil(i / 2), off = lead ? 0 : (i % 2 ? 1 : -1) * 16 * row, back = 12 * row;
      const x = cx + Math.cos(hd) * off - Math.sin(hd) * back, z = cz - Math.sin(hd) * off - Math.cos(hd) * back; if (world.blockAt(x, z, 6)) continue;
      const mon = spawnMon({ type: 'raider', v: st, lv: st + 0.4 + (lead ? 0.3 : 0) + (P.realm === 'hel' ? 0.5 : 0) + (armada ? 1 : 0) }, x, z, { pal }); Object.assign(mon, { yaw: hd, state: 'chase', hunt: 80, fleet: id, fleetOff: off }); if (lead) mon.name = armada ? "Hel's Admiral" : 'Warlord of ' + (/^The /.test(pal.name) ? pal.name.replace(/^The /, 'the ') : 'the ' + pal.name); got++; }
    if (!got) return false; EV.fleets[id] = { n: got, killed: 0, pal, armada: !!armada };
    if (armada) { warn("☠ HEL'S ARMADA rises to the " + compassName(cx - boat.x, cz - boat.z) + '! ' + got + ' ships of the dead, and a great war chest of souls.', 6); sfx.horn(); setTimeout(() => sfx.horn(), 700); setTimeout(() => sfx.horn(), 1400); return true; }
    warn((P.realm === 'hel' ? '⚔ A DRAUGR FLEET' : '⚔ A RAIDER FLEET') + ' to the ' + compassName(cx - boat.x, cz - boat.z) + '! ' + got + ' ships of the ' + pal.name + '. Fight them or outrun them!', 5); sfx.horn(); setTimeout(() => sfx.horn(), 800); return true; }
  return false; }
function fleetDown(id) { const f = EV.fleets[id]; if (!f) return; f.killed++; if (f.killed < f.n) { setTimeout(() => say((P.realm === 'hel' ? 'A draugr ship goes down! ' : 'A raider ship goes down! ') + (f.n - f.killed) + ' left in the fleet.', 3), 600); return; }
  delete EV.fleets[id]; bountyHit('fleet'); const k = P.tier + 1, A = f.armada ? 3 : 1; setTimeout(() => { reward({ w: 25 * k * A, i: 12 * k * A, g: 60 * k * A, s: P.realm === 'hel' ? 4 * k * A + (f.armada ? 60 : 0) : 0 }, boat.x, 4, boat.z); say(f.armada ? "<b>☠ HEL'S ARMADA IS BROKEN! ☠</b> Its war chest of souls is yours." : '<b>⚔ THE FLEET IS BROKEN! ⚔</b> Their war chest is yours.', 4.5); sfx.horn(); }, 1200); }

// treasure knarr: a fat merchant ship runs from you, dumping cargo as you close in. Catch it and board her.
function treasureShip() { for (let tries = 0; tries < 10; tries++) { const a = boat.yaw + rnd(-1.2, 1.2), d = rnd(70, 95), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (!openAt(x, z, 10)) continue;
    const v = clamp(P.tier, 1, 7), mon = spawnMon({ type: 'raider', v, lv: P.tier + 0.2 + (P.realm === 'hel' ? 0.5 : 0) }, x, z, { pal: TREASURE_PAL, merchant: true });
    Object.assign(mon, { treasure: true, flee: 75, dropT: 3, name: P.realm === 'hel' ? "💰 Hel's Soul Barge" : '💰 Treasure Knarr', yaw: Math.atan2(x - boat.x, z - boat.z) }); mon.dmg = Math.round(mon.dmg * 0.45);
    warn((P.realm === 'hel' ? "💰 HEL'S SOUL BARGE" : '💰 A TREASURE KNARR') + ' to the ' + compassName(x - boat.x, z - boat.z) + '! Run it down before it gets away!', 5); sfx.horn(); return true; } return false; }

// northern lights: some nights in the Frost Sea the sky burns green, and the Bifröst touches the sea nearby. Sail into it:
// your hull mends and your sails fill (+25% speed) for 30 s.
const aur = createAurora(scene, ocean), AUR_HEMI = new THREE.Color(0x6affc0), AUR_FOG = new THREE.Color(0x1a5a4a);
function placePillar() { for (let tries = 0; tries < 16; tries++) { const a = Math.random() * 6.28, d = rnd(55, 105), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (!openAt(x, z, 6)) continue; aur.showPillar(x, z); return true; } return false; }
function updateAurora(dt) { const A = EV.aurora, night = isNight() && P.realm !== 'hel';
  if (night && !A.wasNight) A.tonight = A.forced || Math.random() < 0.75; if (!night && A.wasNight) { A.forced = false; A.shown = false; A.tonight = false; aur.hidePillar(); } A.wasNight = night;
  if (A.k > 0.5 && !A.shown) { A.shown = true; say('🌌 The northern lights! Find where the Bifröst touches the sea.', 4.5); sfx.horn(); placePillar(); }
  const pa = aur.pillarAt; if (pa) { const d = Math.hypot(pa.x - boat.x, pa.z - boat.z);
    if (d > 260 || A.k < 0.05) aur.hidePillar();
    else if (d < 6 + T().B * 0.5 && !battle) { aur.hidePillar(); boat.bifrost = 30; A.nextPillar = 60; say('🌈 <span style="color:#9fffd0">BIFRÖST!</span> The gods\' light mends your hull and fills your sails for 30 s', 4); sfx.zap(); sfx.horn(); foam.splash(boat.x, boat.z, 1.5); } }
  else if (A.shown && A.k > 0.5) { A.nextPillar -= dt; if (A.nextPillar <= 0) { A.nextPillar = 20; placePillar(); } } }
function updateAuroraFx(dt) { const A = EV.aurora, want = A.tonight && isNight() && P.realm !== 'hel' ? clamp(((rw.frost || 0) - 0.35) / 0.4, 0, 1) : 0; A.k += (want - A.k) * Math.min(1, dt * 0.4); const k = A.k * env.cur.moon;
  aur.update(dt, k, camera.position); ocean.uniforms.uAur.value = k * 0.9;
  if (k > 0.01) { hemi.color.lerp(AUR_HEMI, k * 0.3); scene.fog.color.lerp(AUR_FOG, k * 0.3); ocean.uniforms.uHorizon.value.lerp(AUR_FOG, k * 0.3); } }

// ---------- your own wreck: half the cargo goes down with the ship. Sail back and salvage it, or hire a harbour crew ----------
let wreckG = null;
const wreckHere = () => !!P.wreck && (P.wreck.realm || 'mid') === P.realm;
function placeWreck() { if (wreckG) { scene.remove(wreckG); disposeTree(wreckG); wreckG = null; } if (!wreckHere()) return; const g = new THREE.Group(), wood = M(0x5a3a22), dark = M(0x3a2414);
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
function spawnPod() { if (world.regionAt(boat.x, boat.z) === 'storm' || P.realm === 'hel') return; const a = Math.random() * 6.28, d = rnd(60, 110), cx = boat.x + Math.sin(a) * d, cz = boat.z + Math.cos(a) * d; if (world.blockAt(cx, cz, 10) || Math.abs(cx) > HALF - 20 || Math.abs(cz) > HALF - 20) return;
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
    if (far === pod.members.length) { for (const Mb of pod.members) { scene.remove(Mb.m.g); disposeTree(Mb.m.g); } pods.splice(p, 1); } }
  const was = boat.pod; boat.pod = riders >= 2 && boat.v > 3 && state === 'play'; if (boat.pod && !was && !boat.podSaid) { boat.podSaid = true; say('🐬 Porpoises ride your bow wave! +10% speed while they swim with you.', 3.5); } }

// ---------- boarding prizes: plunder her hold, or claim her (a prize crew sails her to your home harbour) ----------
const HOOK_NEED = (v) => (v <= 1 ? 1 : v <= 3 ? 2 : v <= 4 ? 3 : 4); // grappling hook level needed to board a ship of size v
const palOf = (skin) => (skin === 'ghost' ? GHOST_PAL : skin === 'treasure' ? TREASURE_PAL : RAIDER_PALS.find((p) => p.name === skin) || Object.values(HEL_PALS).find((p) => p.name === skin) || PLAYER_PAL);
const skinLabel = (skin) => (!skin || skin === 'pats' ? "The Jarl's colours" : skin === 'ghost' ? 'the Draugr ghost hull' : skin === 'treasure' ? 'a treasure knarr' : 'the ' + skin + ' colours');
// a prize sells for about one and a half times what plundering her pays (the exploit tester: it was three to five times)
const shipValue = (pz) => Math.round([40, 110, 240, 480, 900, 1700, 3200, 6000][pz.tier] * (pz.skin === 'ghost' ? 1.5 : pz.skin === 'treasure' ? 1.25 : 1));
const shipLock = (tier) => (tier === 5 && !P.won ? 'Slay the Kraken, Jormungandr and the Elder One first' : tier === 7 && !P.helWon ? 'Slay Hafgufa, Surtr and Nidhögg in Helheim first' : null);
// sailing a prize bigger than your ship takes a refit at half her build price
const refitCost = (tier) => (tier > P.tier && TIER_COST[tier] ? TIER_COST[tier].map((n) => Math.round(n * 0.5)) : null);
function boardInfo(mon) { if (!mon.naval) return undefined; const need = mon.type === 'ghost' ? 3 : HOOK_NEED(mon.e.v);
  if (!P.up.hooks) return 'NEEDS GRAPPLING HOOKS'; if (P.up.hooks < need) return 'NEEDS HOOKS ' + ['', 'I', 'II', 'III', 'IV'][need];
  if (mon.type === 'ghost' && !P.relics.bane) return "HOOKS PASS THROUGH HER: FIND DRAUGR'S BANE"; if (mon.type === 'ghost' && !isNight()) return 'ONLY AT NIGHT'; return null; }
function prizeChoice(mon) { state = 'prize'; const full = P.prizes.length >= moorings(), tn = SHIP_TIERS[mon.e.v].name, ghost = mon.type === 'ghost';
  $('prizeText').innerHTML = (ghost ? 'The draugr fall back into the mist. The ghost ship is yours to take.' : 'The crew of the ' + mon.name + ' throw down their axes.') + '<br><br>Strip her hold and scuttle her, or put a prize crew aboard and send her to ' + homeHarbor().name + ' (sail her or sell her there).';
  $('prizeClaim').disabled = full; $('prizeClaim').textContent = full ? 'CLAIM (your ' + moorings() + ' moorings are full)' : 'CLAIM THE ' + (ghost ? 'GHOST SHIP' : tn.toUpperCase());
  $('hud').classList.add('hidden'); $('prize').classList.remove('hidden'); sfx.horn();
  const finish = () => { $('prize').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; hud(); save(); };
  $('prizePlunder').onclick = () => { finish(); const lv = mon.lv; killMon(mon); reward({ w: Math.round(10 * Math.pow(1.6, lv)), i: Math.round(4 + lv * 4), g: Math.round(30 * Math.pow(1.6, lv) * (ghost ? 3 : 1)) }, mon.x, mon.top + 2, mon.z); say('You strip her hold to the keel and scuttle her!', 3.5); if (!ghost && Math.random() < 0.45) setTimeout(() => giveMap(), 1500); };
  $('prizeClaim').onclick = () => { if (P.prizes.length >= moorings()) return; finish(); P.prizes.push({ tier: mon.e.v, skin: mon.skinKey || 'pats' }); P.kills++; if (mon.fleet) fleetDown(mon.fleet); bountyHit('kill', mon); P.st.ships = (P.st.ships || 0) + 1; sagaCheck(); removeMon(mon);
    reward({ g: Math.round(10 * Math.pow(1.6, mon.lv)) }, boat.x, 4, boat.z); say((ghost ? 'A prize crew takes the ghost ship' : 'A prize crew takes the ' + tn) + ' to ' + homeHarbor().name + '. Sail her or sell her at the harbour.', 4.5); sfx.horn(); };
}

// ---------- treasure maps: an ✕ on a real island; land there and dig ----------
const LANDMARK_HEL = { home: ['🪦', 'the leaning grave-stone'], frost: ['🧊', 'the black ice'], storm: ['🌋', 'the smoking rock'], mist: ['💀', 'the skull on a stake'], warm: ['🦴', 'the great rib-bone'] };
const LANDMARK = { home: ['🌲', 'the lone pine'], frost: ['🧊', 'the ice rock'], storm: ['🪨', 'the black rock'], mist: ['🗿', 'the standing stone'], warm: ['🌴', 'the leaning palm'] };
// three maps a realm: Midgard's maps do not fill the chest while you sail Helheim
function giveMap(kind = null) { if (P.maps.filter((m) => (m.realm || 'mid') === P.realm).length >= 3) { say('You find another treasure map, but your sea chest already holds three for these seas.', 3); return false; }
  const relic = kind === 'relic', taken = new Set(P.maps.filter((m) => (m.realm || 'mid') === P.realm).map((m) => m.isl)), isl0 = world.islands;
  const cands = isl0.map((isl, i) => ({ isl, i, d: Math.hypot(isl.x - boat.x, isl.z - boat.z) })).filter(({ isl, i }) => isl.harbor == null && isl.R >= 7 && !isl.volcano && !taken.has(i) && (relic ? isl.region === 'mist' : true)).sort((a, b) => Math.abs(a.d - 320) - Math.abs(b.d - 320)).slice(0, 8);
  for (let tries = 0; tries < 12 && cands.length; tries++) { const { isl, i } = cands[(Math.random() * cands.length) | 0];
    for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, cr = isl.R * isl.shape(a), wa = a + isl.rot, lx = isl.x + Math.cos(wa) * (cr + 9), lz = isl.z + Math.sin(wa) * (cr + 9);
      if (world.blockAt(lx, lz, 3) || Math.abs(lx) > HALF - 25 || Math.abs(lz) > HALF - 25) continue;
      const ri = (n) => (Math.random() * n) | 0; let mk, cell, dec; do { mk = [ri(5), ri(4)]; cell = [ri(5), ri(4)]; dec = [ri(5), ri(4)]; } while (Math.abs(mk[0] - cell[0]) + Math.abs(mk[1] - cell[1]) < 2 || (dec[0] === mk[0] && dec[1] === mk[1]) || (dec[0] === cell[0] && dec[1] === cell[1]));
      const [icon, name] = (P.realm === 'hel' ? LANDMARK_HEL : LANDMARK)[isl.region] || LANDMARK.home, dx = cell[0] - mk[0], dy = cell[1] - mk[1], p = (n) => n + ' pace' + (n === 1 ? '' : 's'), parts = [];
      if (dx) parts.push(p(Math.abs(dx)) + (dx > 0 ? ' east' : ' west')); if (dy) parts.push(p(Math.abs(dy)) + (dy > 0 ? ' south' : ' north'));
      const clue = (relic ? 'Where the drowned king sleeps: from ' : 'From ') + name + ', walk ' + parts.join(' and ') + '.';
      const m = { isl: i, lx, lz, kind: relic ? 'relic' : 'gold', realm: P.realm, region: isl.region, cell, clue, marks: [{ c: mk, icon }, { c: dec, icon: ['🦴', '⚓', '🐚'][ri(3)] }] };
      P.maps.push(m); save(); sfx.coins();
      say((relic ? '📜 A map scratched on bone!' : '📜 A treasure map!') + ' An ✕ marks an island in the ' + rname(isl.region) + ', ' + compassName(lx - boat.x, lz - boat.z) + ' of here. Sail to it and LAND.', 5);
      return true; } }
  return false; }
function startDig(m) { fishing = { s: { x: m.lx, z: m.lz } }; boat.wp = null; $('acts').classList.add('hidden'); $('helmWrap').classList.add('hidden'); document.body.classList.add('busy');
  minis.dig({ map: m, risk: m.region === 'mist' ? 0.2 : 0.13 }, (res) => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); fishing = null; boat.grace = 2; const k = P.tier + 1;
    if (res.result === 'found') { P.maps.splice(P.maps.indexOf(m), 1); P.st.digs = (P.st.digs || 0) + 1; sagaCheck();
      if (m.kind === 'relic') { P.relics.bane = true; reward({ g: 80 * k }, m.lx, 3, m.lz); say("🗝 DRAUGR'S BANE! With this rune-carved relic your grappling hooks can bite into a ghost ship (Grappling Hooks III, at night).", 6); sfx.horn(); }
      else { reward({ w: Math.round(rnd(20, 40) * k), i: Math.round(rnd(8, 18) * k), g: Math.round(rnd(90, 180) * k), s: (m.realm || 'mid') === 'hel' ? 10 + 3 * P.tier : 0 }, m.lx, 3, m.lz); say('💰 You dig up a chest of hacksilver and gold!', 4); }
      save(); }
    else if (res.result === 'guardian') { const v = clamp(Math.round(P.tier - 1), 0, 2); let first = null; for (let n = 0; n < 2; n++) { const a = Math.random() * 6.28, mon = spawnMon({ type: 'crab', v, lv: Math.max(MLV.crab[v], P.tier - 0.4 + (P.realm === 'hel' ? 0.5 : 0)) }, m.lx + Math.sin(a) * 9, m.lz + Math.cos(a) * 9); mon.state = 'chase'; if (!first) first = mon; }
      warn('🦀 Giant crabs burst out of the sand!', 3); if (first) startBattle(first, false); }
    else say('The tide turns. The treasure stays buried, and your map still shows the way.', 3.5); }); }

// ---------- harbours, upgrades ----------
let atHarbor = null;
function openHarbor(h) { state = 'harbor'; atHarbor = h; P.home = h.idx; boat.v = 0; boat.wp = null; $('hud').classList.add('hidden'); $('harbor').classList.remove('hidden'); $('hbName').textContent = h.name.toUpperCase();
  let txt = 'Welcome to ' + h.name + '.'; if (P.res.f > 0) { const g = P.res.f * (3 + P.tier + (P.hall >= 2 ? 2 : 0)); txt += ' Your catch of ' + P.res.f + ' 🐟 sold for ' + g + ' 🪙.'; P.res.g += g; P.res.f = 0; sfx.coins(); } $('hbText').textContent = txt; $('hbTip').classList.toggle('hidden', !(tut && tut.i >= TUT.length - 6)); save(); drawHarbor(); sfx.horn(); }
const can = (c) => P.res.w >= c[0] && P.res.i >= c[1] && P.res.g >= c[2] && (P.res.s || 0) >= (c[3] || 0);
const pay = (c) => { P.res.w -= c[0]; P.res.i -= c[1]; P.res.g -= c[2]; P.res.s = (P.res.s || 0) - (c[3] || 0); };
const costHtml = (c) => [['🪵', c[0], P.res.w], ['⚙️', c[1], P.res.i], ['🪙', c[2], P.res.g], ['👻', c[3] || 0, P.res.s || 0]].filter(([, n]) => n > 0).map(([ic, n, have]) => '<span class="' + (have < n ? 'no' : '') + '">' + n + ic + '</span>').join(' ');
function drawHarbor() { $('hbRes').innerHTML = `<span>🪵 ${P.res.w}</span><span>⚙️ ${P.res.i}</span><span>🪙 ${P.res.g}</span>${P.res.s > 0 || P.realm === 'hel' ? `<span>👻 ${P.res.s || 0}</span>` : ''}<span>❤️ ${Math.ceil(P.hp)}/${maxHp()}</span>`; const list = $('hbList'); list.innerHTML = '';
  const miss = maxHp() - P.hp; if (miss <= 0.5) { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = '<div class="ic">🔨</div><div class="tx"><b>Repair the hull</b><div>Your hull is sound</div></div>'; const b = document.createElement('button'); b.textContent = 'REPAIR'; b.disabled = true; d.appendChild(b); list.appendChild(d); }
  if (miss > 0.5) { const c = [Math.ceil(miss / 10), 0, Math.ceil(miss / 6)]; const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">🔨</div><div class="tx"><b>Repair the hull</b><div>${Math.ceil(miss)} damage to mend</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'REPAIR'; b.disabled = !can(c); b.onclick = () => { if (!can(c)) return; P.res.w -= c[0]; P.res.g -= c[2]; P.hp = maxHp(); sfx.pickup(); drawHarbor(); hud(); save(); }; d.appendChild(b); list.appendChild(d); }
  if (P.wreck) { const c = [0, 0, wreckCost()]; const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">☠</div><div class="tx"><b>Hire a salvage crew</b><div>They raise your wreck and bring back ${wreckSum(P.wreck.res)}</div><div class="cost">${costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'RAISE'; b.disabled = !can(c); b.onclick = () => { if (!can(c) || !P.wreck) return; P.res.g -= c[2]; const r = P.wreck.res; for (const k of ['w', 'i', 'g', 'f']) P.res[k] += r[k] || 0; P.wreck = null; placeWreck(); sfx.coins(); drawHarbor(); hud(); save(); }; d.appendChild(b); list.appendChild(d); }
  hallCard(list); bountyCard(list); if (P.realm === 'hel') titheCard(list); traderCard(list);
  { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">🎨</div><div class="tx"><b>The shipwright</b><div>${(HULLS[P.hull] || HULLS.oak).name} hull, ${(SAILS[P.sailD] || SAILS.pats).name} sail. Fit new hulls and sails, each with a perk (${P.owned.h.length + P.owned.s.length} of ${Object.keys(HULLS).length + Object.keys(SAILS).length} designs).</div></div>`; const b = document.createElement('button'); b.textContent = 'DESIGN'; b.onclick = openWright; d.appendChild(b); list.appendChild(d); }
  P.prizes.forEach((pz, i) => { const t = SHIP_TIERS[pz.tier], val = shipValue(pz), d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<div class="ic">${pz.skin === 'ghost' ? '👻' : pz.skin === 'treasure' ? '💰' : '⚓'}</div><div class="tx"><b>Moored here: a ${t.name}</b><div>In ${skinLabel(pz.skin)}. Sail her (your ${T().name} waits here in her place) or sell her.${pz.skin === 'ghost' ? ' Night monsters hardly see a ghost hull.' : ''}</div><div class="cost"><span>Sells for ${val}🪙</span></div></div>`;
    const col = document.createElement('div'); col.className = 'btn2'; const lockS = shipLock(pz.tier), refit = refitCost(pz.tier), b1 = document.createElement('button'); b1.textContent = lockS ? 'LOCKED' : refit ? 'REFIT' : 'SAIL HER'; b1.disabled = !!lockS || (!!refit && !can(refit)); if (lockS || refit) d.querySelector('.cost').insertAdjacentHTML('beforeend', ' · ' + (lockS ? '<span class="no">' + lockS + '</span>' : 'refit ' + costHtml(refit)));
    b1.onclick = () => { if (lockS || (refit && !can(refit))) return; if (refit) pay(refit); const frac = clamp(P.hp / maxHp(), 0, 1), cur = { tier: P.tier, skin: P.skin }; P.prizes[i] = cur; P.tier = pz.tier; P.skin = pz.skin; P.hp = Math.max(1, Math.round(frac * maxHp())); rebuildShip(); sfx.horn(); sagaCheck(); drawHarbor(); hud(); save(); };
    const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = 'SELL'; b2.onclick = () => { P.res.g += val; P.prizes.splice(i, 1); sfx.coins(); drawHarbor(); hud(); save(); };
    col.append(b1, b2); d.appendChild(col); list.appendChild(d); });
  if (P.tier < SHIP_TIERS.length - 1) { const c = priced(TIER_COST[P.tier + 1]), nt = SHIP_TIERS[P.tier + 1], lockT = shipLock(P.tier + 1); const d = document.createElement('div'); d.className = 'card ship'; d.innerHTML = `<div class="ic">${P.tier + 1 >= 7 ? '☠' : '🐉'}</div><div class="tx"><b>Build ${P.tier + 1 >= 5 ? 'the ' : 'a '}${nt.name}</b><div>Ship size ${P.tier + 2} of ${SHIP_TIERS.length} · ${nt.crew} crew · hull ${Math.round(maxHp() * 1.75)} · stronger seas${P.tier + 1 >= 5 ? ' · rune level ' + ['', '', '', '', '', 'VI', 'VII', 'VIII'][P.tier + 1] + ' upgrades' : ''}${P.tier + 1 === 7 ? ' · the ship of the dead, built from their nails' : ''}</div><div class="cost">${lockT ? '<span class="no">' + lockT + '</span>' : costHtml(c)}</div></div>`; const b = document.createElement('button'); b.textContent = 'BUILD'; b.disabled = !!lockT || !can(c); b.onclick = () => { if (lockT || !can(c)) return; pay(c); P.tier++; P.skin = 'pats'; P.hp = maxHp(); rebuildShip(); sagaCheck(); sfx.horn(); drawHarbor(); save(); }; d.appendChild(b); list.appendChild(d); }
  for (const [k, u] of Object.entries(UPG)) { const lv = P.up[k], d = document.createElement('div'); d.className = 'card'; const capped = lv >= u.max, locked = !capped && lv >= P.tier + 1, c = capped ? null : priced(u.cost[lv]);
    d.innerHTML = `<div class="ic">${u.icon}</div><div class="tx"><b>${u.name}</b><span class="pips">${'◆'.repeat(lv)}${'◇'.repeat(u.max - lv)}</span><div>${capped ? 'Fully upgraded' : u.desc[lv] + (u.eff ? ' · ' + u.eff : '')}</div><div class="cost">${capped ? '' : locked ? '<span class="no">Needs a bigger ship</span>' : costHtml(c)}</div></div>`;
    if (!capped) { const b = document.createElement('button'); b.textContent = 'BUY'; b.disabled = locked || !can(c); b.onclick = () => { if (locked || !can(c) || P.up[k] !== lv) return; pay(c); P.up[k]++; if (k === 'armor') P.hp += maxHp() - Math.round(maxHp() / (1 + 0.25 * P.up.armor) * (1 + 0.25 * (P.up.armor - 1))); P.hp = Math.min(P.hp, maxHp()); rebuildShip(); sfx.pickup(); drawHarbor(); save(); }; d.appendChild(b); }
    list.appendChild(d); } }
// a second tap on the same spot within 0.4 s is a double tap: dropped (a quick tap somewhere else still counts)
let hbLock = { t: 0, x: 0, y: 0 }; for (const id of ['hbList', 'wrList', 'prize']) $(id).addEventListener('click', (e) => { if (!(e.target.closest && e.target.closest('button'))) return; const now = performance.now(), near = Math.hypot(e.clientX - hbLock.x, e.clientY - hbLock.y) < 40; if (now - hbLock.t < 400 && near) { e.stopPropagation(); e.preventDefault(); return; } hbLock = { t: now, x: e.clientX, y: e.clientY }; }, true);
// where a ship leaving the dock starts: 10 out, or further until the whole hull is clear of land
// (a fan of directions out from the dock: some harbours face another island across a narrow channel); returns [x, z, yaw]
function sailOut(h) { const t = T(), pad = t.B * 0.5 + t.L * 0.18 + 1; let best = null, bs = -1e9;
  // every clear spot in a fan out from the dock, scored by the open water ahead of it (and a little for staying close)
  for (let d = 10; d <= 58; d += 4) for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05]) { const a = h.dir + da, x = h.dock.x + Math.cos(a) * d, z = h.dock.z + Math.sin(a) * d;
    if (world.blockAt(x, z, pad)) continue; for (const dy of [0, 0.5, -0.5, 1, -1]) { const yaw = Math.atan2(Math.cos(a), Math.sin(a)) + dy; if (world.blockAt(x - Math.sin(yaw) * t.L * 0.45, z - Math.cos(yaw) * t.L * 0.45, t.B * 0.4)) continue;
      let run = 0; while (run < 90 && !world.blockAt(x + Math.sin(yaw) * (run + t.L * 0.5), z + Math.cos(yaw) * (run + t.L * 0.5), t.B * 0.5 + 1)) run += 5; const sc = run - d * 0.4 - Math.abs(dy) * 6; if (sc > bs) { bs = sc; best = [x, z, yaw]; } } }
  return best || [h.dock.x + Math.cos(h.dir) * 10, h.dock.z + Math.sin(h.dir) * 10, Math.atan2(Math.cos(h.dir), Math.sin(h.dir))]; }
$('hbSail').onclick = () => { $('harbor').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; const h = atHarbor; if (h) { [boat.x, boat.z, boat.yaw] = sailOut(h); } atHarbor = null; setThrottle(0, true); helm.angle = 0; hud(); if (P.tier >= 4 && !P.beenHel && P.realm === 'mid') say('🌀 Your ship is great enough for <b>Hel\'s Gate</b>, far west in the Mist Sea (🌀 on the chart). Helheim awaits.', 6); else say('Fair winds! Tap HALF or FULL to set sail.'); };

// ---------- the Jarl's saga (v0.8.0): deeds in ranks, counted over the whole voyage. Each rank pays out once (souls too once you
// have been to Helheim) and the highest deed you hold names you on the pause screen ----------
const DEEDS = [
  { id: 'kills', name: 'Monster Slayer', title: 'the Slayer', icon: '⚔', at: [25, 100, 400, 1000], n: () => P.kills },
  { id: 'shark', name: 'Shark Hunter', title: 'Shark-bane', icon: '🦈', at: [15, 60, 200], n: () => (P.st.k.shark || 0) + (P.st.k.megalodon || 0) },
  { id: 'serpent', name: 'Serpent Bane', title: 'Wyrm-killer', icon: '🐍', at: [10, 40, 120], n: () => (P.st.k.serpent || 0) + (P.st.k.eel || 0) + (P.st.k.leviathan || 0) },
  { id: 'deep', name: 'Terror of the Deep', title: 'the Deep-diver', icon: '🐙', at: [10, 40, 120], n: () => (P.st.k.octopus || 0) + (P.st.k.angler || 0) + (P.st.k.crab || 0) + (P.st.k.squid || 0) },
  { id: 'ships', name: 'Ship Breaker', title: 'Ship-breaker', icon: '⛵', at: [10, 50, 150], n: () => P.st.ships || 0 },
  { id: 'fish', name: 'Fisher of the Sea', title: 'the Fisher', icon: '🎣', at: [15, 60, 200], n: () => P.st.fish || 0 },
  { id: 'dig', name: 'Treasure Hunter', title: 'Gold-finder', icon: '💰', at: [2, 8, 20], n: () => P.st.digs || 0 },
  { id: 'bounty', name: 'Bounty Hunter', title: 'the Kings\' Blade', icon: '📜', at: [5, 20, 50], n: () => P.bounties || 0 },
  { id: 'legend', name: 'Legend Slayer', title: 'Legend-slayer', icon: '👑', at: [1, 3, 6], n: () => Object.keys(P.legends).length },
  { id: 'souls', name: 'Soul Reaper', title: 'Soul-reaper', icon: '👻', at: [100, 600, 2500, 8000], n: () => P.st.souls || 0 },
  { id: 'beasts', name: 'Bestiary', title: 'the Beast-lorist', icon: '📖', at: [10, 25, 40], n: () => Object.keys(P.st.v || {}).length },
  { id: 'wright', name: 'Master Shipwright', title: 'the Shipwright', icon: '🎨', at: [5, 12, 21, 31], n: () => P.owned.h.length + P.owned.s.length },
  { id: 'fleet', name: 'Lord of Ships', title: 'Sea-lord', icon: '🐉', at: [3, 5, 8], n: () => P.tier + 1 },
];
const RANK = ['I', 'II', 'III', 'IV'];
// check every deed; pay out any new rank
function sagaCheck() { if (!P.st) return; for (const D of DEEDS) { const n = D.n(); for (let got = P.st.d[D.id] || 0; got < D.at.length && n >= D.at[got]; got = P.st.d[D.id]) { P.st.d[D.id] = got + 1; const k = got + 1, t = P.tier + 1, r = { g: Math.round(60 * k * k * t), s: P.st.souls > 0 ? 8 * k * k : 0 };
      setTimeout(() => { reward(r, boat.x, 4, boat.z); say('🏅 <b>Saga deed: ' + D.name + ' ' + RANK[got] + '!</b> ' + rewardHtml(r), 4.5); sfx.horn(); }, 900 + got * 300); save(); } } }
function sagaTitle() { let best = null, bs = 0; for (const D of DEEDS) { const r = P.st.d[D.id] || 0; if (r > bs || (r === bs && r && D.id === 'legend')) { bs = r; best = D; } } return best && bs >= 2 ? 'Jarl ' + best.title : 'The Jarl'; }
function drawSaga() { sagaCheck(); const list = $('sagaList'); list.innerHTML = ''; $('sagaName').textContent = sagaTitle();
  for (const D of DEEDS) { const r = P.st.d[D.id] || 0, n = D.n(), next = D.at[r], d = document.createElement('div'); d.className = 'deed' + (r >= D.at.length ? ' full' : '');
    d.innerHTML = `<span class="di">${D.icon}</span><span class="dt"><b>${D.name}</b> <span class="stars">${'★'.repeat(r)}${'☆'.repeat(D.at.length - r)}</span><i style="width:${next ? Math.min(100, (n / next) * 100) : 100}%"></i></span><span class="dn">${next ? Math.min(n, next) + ' / ' + next : '✔'}</span>`; list.appendChild(d); } }
$('sagaBtn').onclick = () => { $('paused').classList.add('hidden'); $('saga').classList.remove('hidden'); drawSaga(); if (tut) tut.saga = true; }; $('sagaBack').onclick = () => { $('saga').classList.add('hidden'); $('paused').classList.remove('hidden'); };

// ---------- The Jarl's Hall (v0.8.0): raised stage by stage at Valholm, where idle gold goes in the long run. Each stage lasts ----------
const HALL = [
  { name: 'The mead hall', perk: 'a fourth mooring for prize ships', cost: [200, 0, 2000] },
  { name: 'The fish market', perk: 'fish sell for 2 gold more', cost: [400, 100, 5000] },
  { name: "The Jarl's shipyard", perk: 'upgrades and ships cost 10% less gold', cost: [800, 300, 10000] },
  { name: 'The healers\' house', perk: 'the crew mend the hull 25% faster', cost: [1500, 600, 20000] },
  { name: 'The hall of legends', perk: '+5% damage and +5% hull, for ever', cost: [3000, 1200, 40000] },
];
const moorings = () => (P.hall >= 1 ? 4 : 3);
// gold prices at The Jarl's shipyard
const priced = (c) => (c && P.hall >= 3 ? c.map((n, i) => (i === 2 ? Math.round(n * 0.9) : n)) : c);
function hallCard(list) { if (!atHarbor || atHarbor.idx !== 0) return; const n = P.hall || 0, d = document.createElement('div'); d.className = 'card ship';
  const built = HALL.slice(0, n).map((h) => h.name).join(', '), next = HALL[n];
  d.innerHTML = `<div class="ic">🏰</div><div class="tx"><b>The Jarl's Hall</b> <span class="pips">${'◆'.repeat(n)}${'◇'.repeat(HALL.length - n)}</span><div>${next ? 'Next: ' + next.name + ': ' + next.perk + '.' : 'The hall stands complete.'}${built ? ' Built: ' + built + '.' : ''}</div><div class="cost">${next ? costHtml(next.cost) : ''}</div></div>`;
  if (next) { const b = document.createElement('button'); b.textContent = 'RAISE'; b.disabled = !can(next.cost); b.onclick = () => { if ((P.hall || 0) !== n || !can(next.cost)) return; pay(next.cost); P.hall = n + 1; if (P.hall >= 5) P.hp = Math.round(P.hp * 1.05); sfx.horn(); hud(); drawHarbor(); save(); }; d.appendChild(b); } list.appendChild(d); }

// ---------- the jarl's bounties (v0.8.0): every harbour's jarl posts a job: hunt a kind of beast, sink ships, clear a sea, fish,
// break a fleet or slay a legend's young. Take one at a time; it counts as you sail (in the realm you took it), and any harbour
// pays it out. The pay grows with your ship, and in Helheim it includes souls ----------
const BTYPE = { shark: ['sharks', 5, 1], serpent: ['sea serpents', 3, 1.6], eel: ['lightning eels', 4, 1.2], octopus: ['giant octopuses', 3, 1.5], crab: ['giant crabs', 4, 1.3], angler: ['anglers', 3, 1.5], megalodon: ['megalodons', 2, 2.5], leviathan: ['leviathans', 2, 2.5] };
const offers = {};
function makeBounty() { const hel = P.realm === 'hel', seas = ['home', 'frost', 'storm', 'mist', 'warm'], here = {};
  for (const sea of seas) for (const e of spawnTable(sea, false)) if (BTYPE[e.type]) here[e.type] = 1;
  const types = Object.keys(here), r = Math.random(); let b;
  if (types.length && r < 0.42) { const k = types[(Math.random() * types.length) | 0], [, n, w] = BTYPE[k], need = Math.max(1, n + ((Math.random() * 3) | 0) - 1); b = { kind: 'type', key: k, need, v: need * w }; }
  else if (r < 0.6) { const need = 2 + ((Math.random() * 3) | 0); b = { kind: 'ships', key: '', need, v: need * 1.8 }; }
  else if (r < 0.78) { const k = seas[1 + ((Math.random() * 4) | 0)], need = 5 + ((Math.random() * 3) | 0); b = { kind: 'sea', key: k, need, v: need }; }
  else if (r < 0.88) { const need = 3 + ((Math.random() * 3) | 0); b = { kind: 'fish', key: '', need, v: need * 0.9 }; }
  else if (r < 0.95) b = { kind: 'fleet', key: '', need: 1, v: 7 }; else b = { kind: 'young', key: '', need: 1, v: 6 };
  const k = P.tier + 1, m = Math.pow(1.45, P.tier); b.reward = { g: Math.round(b.v * 22 * m), w: Math.round(b.v * 4 * k), i: Math.round(b.v * 2.5 * k), s: hel ? Math.round(b.v * 3) : 0 }; b.n = 0; b.realm = P.realm; return b; }
function bountyText(b) { const many = b.need > 1, sea = () => ((worlds[b.realm] || world).regions || REGIONS)[b.key].name;
  return b.kind === 'type' ? 'Hunt ' + b.need + ' ' + (many ? BTYPE[b.key][0] : BTYPE[b.key][0].replace(/(es|s)$/, '')) : b.kind === 'ships' ? 'Sink or take ' + b.need + ' enemy ships' : b.kind === 'sea' ? 'Slay ' + b.need + ' beasts in ' + sea() : b.kind === 'fish' ? 'Fish ' + b.need + ' bubbling spots' : b.kind === 'fleet' ? 'Break a ' + (b.realm === 'hel' ? 'draugr' : 'raider') + ' fleet' : "Slay one of a legend's young"; }
const rewardHtml = (r) => [['🪙', r.g], ['🪵', r.w], ['⚙️', r.i], ['👻', r.s]].filter(([, n]) => n > 0).map(([ic, n]) => '+' + n + ic).join(' ');
// count a bounty step: what = 'kill' (with the monster), 'fish', 'fleet'
function bountyHit(what, mon) { const b = P.bounty; if (!b || b.n >= b.need || b.realm !== P.realm) return;
  const ok = what === 'fish' ? b.kind === 'fish' : what === 'fleet' ? b.kind === 'fleet' : (b.kind === 'type' && mon.type === b.key) || (b.kind === 'ships' && mon.naval) || (b.kind === 'sea' && !mon.naval && mon.type !== 'jelly' && world.regionAt(mon.x, mon.z) === b.key) || (b.kind === 'young' && !!mon.young);
  if (!ok) return; b.n++; if (b.n >= b.need) { setTimeout(() => { say('📜 <b>Bounty done!</b> ' + bountyText(b) + '. Claim your reward at any harbour.', 4.5); sfx.horn(); }, 1800); } save(); }
function traderCard(list) { const k = 1 + 0.15 * P.tier, qi = 15 * (P.tier + 1), qw = 20 * (P.tier + 1), ci = [0, 0, Math.round(qi * 6 * k)], cw = [0, 0, Math.round(qw * 3 * k)], d = document.createElement('div'); d.className = 'card';
  d.innerHTML = `<div class="ic">⚖</div><div class="tx"><b>The trader</b><div>Iron and timber for gold</div><div class="cost">${qi}⚙️ for ${costHtml(ci)} · ${qw}🪵 for ${costHtml(cw)}</div></div>`; const col = document.createElement('div'); col.className = 'btn2';
  const bi = document.createElement('button'); bi.textContent = '+' + qi + '⚙️'; bi.disabled = !can(ci); bi.onclick = () => { if (!can(ci)) return; pay(ci); P.res.i += qi; sfx.coins(); drawHarbor(); hud(); save(); };
  const bw = document.createElement('button'); bw.className = 'ghost'; bw.textContent = '+' + qw + '🪵'; bw.disabled = !can(cw); bw.onclick = () => { if (!can(cw)) return; pay(cw); P.res.w += qw; sfx.coins(); drawHarbor(); hud(); save(); };
  col.append(bi, bw); d.appendChild(col); list.appendChild(d); }
// Hel's tithe (Helheim's harbours): gold buys +25% souls from every kill for 10 minutes
function titheCard(list) { const c = [0, 0, P.tier <= 4 ? 2500 : 5000 * (P.tier - 3)], on = (P.tithe || 0) > 0, d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="ic">🕯</div><div class="tx"><b>Hel's tithe</b><div>Pay the dead their due: +25% souls from every kill for 10 minutes</div><div class="cost">${on ? '✔ Paid: ' + Math.ceil(P.tithe / 60) + ' min left' : costHtml(c)}</div></div>`;
  const b = document.createElement('button'); b.textContent = 'PAY'; b.disabled = on || !can(c); b.onclick = () => { if ((P.tithe || 0) > 0 || !can(c)) return; pay(c); P.tithe = 600; sfx.coins(); drawHarbor(); hud(); save(); }; d.appendChild(b); list.appendChild(d); }
function bountyCard(list) { const d = document.createElement('div'); d.className = 'card bounty'; let b = P.bounty, btn = null, alt = null;
  if (b && b.n >= b.need) { d.innerHTML = `<div class="ic">📜</div><div class="tx"><b>Bounty done!</b><div>${bountyText(b)}</div><div class="cost">${rewardHtml(b.reward)}</div></div>`; btn = document.createElement('button'); btn.textContent = 'CLAIM'; btn.onclick = () => { if (!P.bounty || P.bounty.n < P.bounty.need) return; const r = P.bounty.reward; P.bounty = null; P.bounties = (P.bounties || 0) + 1; reward(r, boat.x, 3, boat.z); sfx.horn(); sagaCheck(); drawHarbor(); save(); }; }
  else if (b) { d.innerHTML = `<div class="ic">📜</div><div class="tx"><b>Your bounty</b> <span class="pips">${b.n} / ${b.need}</span><div>${bountyText(b)}${b.realm !== P.realm ? ' (in ' + (b.realm === 'hel' ? 'Helheim' : 'Midgard') + ')' : ''}</div><div class="cost">${rewardHtml(b.reward)}</div></div>`; alt = document.createElement('button'); alt.className = 'ghost'; alt.textContent = 'DROP'; alt.onclick = () => { const b0 = P.bounty, bk = b0 && (b0.from || (b0.realm === P.realm && atHarbor ? P.realm + ':' + atHarbor.idx : null)); if (bk) offers[bk] = { ...b0, n: 0 }; P.bounty = null; drawHarbor(); save(); }; }
  else { const key = P.realm + ':' + (atHarbor ? atHarbor.idx : 0); b = offers[key] || (offers[key] = makeBounty()); d.innerHTML = `<div class="ic">📜</div><div class="tx"><b>${P.realm === 'hel' ? "Hel's bounty" : "The jarl's bounty"}</b><div>${bountyText(b)}</div><div class="cost">${rewardHtml(b.reward)}</div></div>`; btn = document.createElement('button'); btn.textContent = 'TAKE IT'; btn.onclick = () => { if (P.bounty) return; P.bounty = { ...b, from: key }; delete offers[key]; sfx.pickup(); drawHarbor(); save(); }; }
  if (btn) d.appendChild(btn); if (alt) d.appendChild(alt); list.appendChild(d); }

// ---------- the shipwright (v0.8.0): fit a hull and a sail design to the Jarl's ships, each with its own small perk. Tap a design to
// see it on your ship (the camera swings round her at the dock); FIT one you own, BUILD one you can afford; legends leave some ----------
let wrightOn = false, wrTab = 'h';
function openWright() { wrightOn = true; $('harbor').classList.add('hidden'); $('wright').classList.remove('hidden'); drawWright(); }
function closeWright() { wrightOn = false; $('wright').classList.add('hidden'); $('harbor').classList.remove('hidden'); rebuildShip(); drawHarbor(); }
function previewDesign(tab, key) { const was = [P.hull, P.sailD], hp0 = P.hp; if (tab === 'h') P.hull = key; else P.sailD = key; rebuildShip(); P.hull = was[0]; P.sailD = was[1]; P.hp = hp0; hud(); }
const cleanName = (v) => (typeof v === 'string' ? v : '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
function drawWright() { $('wrName').textContent = P.shipName ? '✎ “' + P.shipName + '”' : '✎ NAME HER'; const list = $('wrList'); list.innerHTML = ''; $('wrHull').classList.toggle('on', wrTab === 'h'); $('wrSail').classList.toggle('on', wrTab === 's');
  const T0 = wrTab === 'h' ? HULLS : SAILS, owned = wrTab === 'h' ? P.owned.h : P.owned.s, cur = wrTab === 'h' ? P.hull : P.sailD;
  $('wrNote').textContent = P.skin !== 'pats' ? 'You sail a prize ship: she keeps her own colours and no design perks. Designs fit the Jarl\'s own ships.' : 'Tap a design to see it on your ship. Its perk works while it is fitted.';
  $('wrRes').innerHTML = `🪵 ${P.res.w} · ⚙️ ${P.res.i} · 🪙 ${P.res.g}` + (P.res.s > 0 || P.realm === 'hel' ? ` · 👻 ${P.res.s || 0}` : '');
  for (const [k, d] of Object.entries(T0)) { const have = owned.includes(k), on = cur === k, c = d.got.cost, leg = d.got.legend, nd = d.got.need && P.tier < d.got.need ? d.got.need : 0, el = document.createElement('div'); el.className = 'wcard' + (on ? ' on' : '');
    el.innerHTML = `<div class="wic">${d.icon}</div><b>${d.name}</b><div class="wperk">${d.perk}</div><div class="cost">${have ? (on ? '✔ fitted' : '✔ owned') : leg ? '<span class="no">Slay ' + LAIR_NAMES[leg] + '</span>' : nd ? '<span class="no">Needs ' + an(SHIP_TIERS[nd].name) + '</span>' : costHtml(c)}</div>`;
    const b = document.createElement('button'); b.textContent = on ? 'FITTED' : have ? 'FIT' : leg || nd ? 'LOCKED' : 'BUILD'; b.disabled = on || (!have && (!!leg || !!nd || !can(c)));
    b.onclick = (e) => { e.stopPropagation(); if (on || state !== 'harbor') return; if (!have) { if (leg || nd || !can(c) || owned.includes(k)) return; pay(c); owned.push(k); sfx.coins(); sagaCheck(); } const ratio = P.hp / maxHp(); if (wrTab === 'h') P.hull = k; else P.sailD = k; P.hp = Math.max(1, Math.round(ratio * maxHp())); rebuildShip(); sfx.pickup(); hud(); save(); drawWright(); };
    el.onclick = () => { previewDesign(wrTab, k); for (const c2 of list.children) c2.classList.toggle('pv', c2 === el); };
    el.appendChild(b); list.appendChild(el); } }
$('wrName').onclick = () => { let n = null; try { n = prompt('Name your ship (up to 20 letters; leave it empty for none):', P.shipName || ''); } catch { /* ignore */ } if (n == null) return; P.shipName = cleanName(n); hud(); save(); drawWright(); };
$('wrHull').onclick = () => { wrTab = 'h'; rebuildShip(); drawWright(); }; $('wrSail').onclick = () => { wrTab = 's'; rebuildShip(); drawWright(); }; $('wrDone').onclick = () => closeWright();

// ---------- lairs (legend bosses) ----------
const LAIR_NAMES = { squid: 'The Great Squid', kraken: 'The Kraken', jorm: 'Jormungandr', rlyeh: 'The Elder One', hafgufa: 'Hafgufa', surtr: 'Surtr the Burning', nidhogg: 'Nidhögg' }, LAIR_NEED = { squid: 1, kraken: 2, jorm: 3, rlyeh: 4, hafgufa: 5, surtr: 6, nidhogg: 6 };
// Helheim's three legends are the old fights grown dead and far stronger: Hafgufa, mother of every kraken, under the ice of
// Niflhel; Surtr the fire giant warding his forge in Muspelheim; Nidhogg the corpse-dragon gnawing the World Tree's roots
const legendLv = (L) => MLV[L.monster][0] + (LAIRS_HEL[L.key] ? 2.6 : 0);
// the legends always rise. With a big enough ship it is the legend itself. In a smaller ship it is usually one of its
// young (a hard but fair fight, half again the gold, not a legend slain), now and then the legend itself, who will wreck
// you: flee, and it sinks back into the deep once you are away. Stay in a lair and another rises every minute or two,
// each wave a little tougher (and richer), and the chance of the legend itself grows. Leaving the lair resets the waves.
// Once a legend is slain its young still rise there for anyone who wants the gold.
const YOUNG_NAMES = { squid: 'Squid Spawn', kraken: 'Kraken Hatchling', jorm: "Jormungandr's Whelp", rlyeh: 'Spawn of the Elder One', hafgufa: "Hafgufa's Brood", surtr: 'Ember-spawn of Surtr', nidhogg: 'Corpse-wyrm of Nidhögg' }, YOUNG_SCALE = { kraken: 3.5, squid: 3.5, jormungandr: 0.7, elder: 1.1 }, PAPA_CHANCE = 0.2;
let lairWarned = {}; const lairCool = {}, lairWave = {};
// lair trials: holding out to the fifth and the tenth wave at a lair pays once (souls in Helheim)
function lairTrial(L, w) { const r = w >= 10 ? 2 : 1; P.trials = P.trials || {}; if ((P.trials[L.key] || 0) >= r) return; P.trials[L.key] = r; const k = P.tier + 1, rw = { g: Math.round(150 * k * r * r), i: 20 * k * r, s: LAIRS_HEL[L.key] ? (r === 1 ? 100 : 300) : 0 }; setTimeout(() => { reward(rw, boat.x, 4, boat.z); say('🏆 <b>Trial of ' + L.name + ': wave ' + w + '!</b> ' + rewardHtml(rw), 5); sfx.horn(); }, 1500); save(); }
function lairSpawn(L, big) { const w = (lairWave[L.key] = (lairWave[L.key] || 0) + 1), slain = L.beaten || !!P.legends[L.key], hl = !!LAIRS_HEL[L.key], rb = P.reborn[L.key] || 0; if (w === 5 || w === 10) lairTrial(L, w);
  // a slain legend can rise again in the later waves ('Reborn'), each time half a level stronger and richer, five times at most
  const reborn = slain && P.tier >= LAIR_NEED[L.key] + 1 && w >= 2 && rb < 5 && Math.random() < Math.min(0.4, 0.12 + 0.06 * (w - 2));
  if (reborn || (!slain && (big || Math.random() < Math.min(0.6, PAPA_CHANCE + 0.07 * (w - 1))))) { const lv = legendLv(L) + (reborn ? 0.5 * (rb + 1) : 0) + (big ? 0 : 1), mon = spawnMon({ type: L.monster, v: hl && L.monster === 'jormungandr' ? 1 : 0, lv }, L.x, L.z, { boss: true, lair: L.key, scale: (L.monster === 'kraken' || L.monster === 'squid' ? 17.5 : L.monster === 'elder' ? 1.5 : 1) * (hl ? 1.15 : 1) }); mon.name = LAIR_NAMES[L.key] + (reborn ? ' Reborn' : ''); mon.papa = !big; mon.reborn = reborn;
    warn('⚠ ' + mon.name.toUpperCase() + (reborn ? ' RISES AGAIN!' : ' RISES!') + ' ⚠' + (big ? '' : '<br>Your ' + T().name + ' is far too small: FLEE!'), big ? 4 : 6); sfx.horn(); sfx.thunder(); flash = 1; return; }
  const lv = clamp(P.tier + 1 + 0.4 * (w - 1) + (hl ? 0.5 : 0), 1, Math.max(legendLv(L) - 0.3, P.tier + 1.5)), mon = spawnMon({ type: L.monster, v: 0, lv }, L.x, L.z, { lair: L.key, scale: YOUNG_SCALE[L.monster] || 0.6 });
  Object.assign(mon, { name: YOUNG_NAMES[L.key], young: L.key, state: 'rise', rise: 0, dive: 1, riseK: 0.6, hunt: true });
  warn('⚠ ' + YOUNG_NAMES[L.key].toUpperCase() + ' RISES! ⚠<br>' + (w > 1 ? 'The deep stirs again: wave ' + w + ', stronger than the last.' : 'Only a young one…'), 4); sfx.horn(); }
let lairHud = 0;
function updateLairs() { lairHud = 0; for (const L of world.lairs) { if (lairWave[L.key] > 0 && Math.hypot(boat.x - L.x, boat.z - L.z) < 95) lairHud = lairWave[L.key]; const d = Math.hypot(boat.x - L.x, boat.z - L.z), big = P.tier >= LAIR_NEED[L.key], slain = L.beaten || !!P.legends[L.key];
    if (d < 95 && !lairWarned[L.key]) { lairWarned[L.key] = true; say(slain ? L.name + ': ' + LAIR_NAMES[L.key] + ' is slain, but its young still stir here.' : big ? 'You enter ' + L.name + '. ' + LAIR_NAMES[L.key] + ' stirs below…' : L.name + ': ' + LAIR_NAMES[L.key] + ' sleeps below. It takes ' + an(SHIP_TIERS[LAIR_NEED[L.key]].name) + ' to face it; in ' + an(T().name) + ', pray only its young wake…', 5); }
    if (d > 130) { lairWarned[L.key] = false; lairWave[L.key] = 0; }
    for (const m of mons) if (m.papa && m.lair === L.key && !m.dead && !inFight(m) && d > 120) { removeMon(m); lairCool[L.key] = time + 60; say(LAIR_NAMES[L.key] + ' sinks back into the deep.', 3); }
    if (!battle && !(lairCool[L.key] > time) && (d < 40 || (lairWave[L.key] > 0 && d < 95)) && !mons.some((m) => !m.dead && m.lair === L.key)) lairSpawn(L, big); } }

// ---------- the realms (v0.8.0): Midgard and Helheim. Hel's Gate stands in Midgard's Mist Sea; once you sail a Drakkar
// it opens and you can cross. The gate home stands beside Gjallarhofn. Each realm is its own world: its own islands,
// harbours, legends, wreck and treasure maps; your ship, upgrades, cargo and souls cross with you. ----------
const gates = { mid: makeGate('mid'), hel: makeGate('hel') }; for (const k in gates) { gates[k].g.position.set(GATES[k].x, 0, GATES[k].z); scene.add(gates[k].g); }
const gateOpen = () => P.realm === 'hel' || P.tier >= 4;
function setRealm(realm, quiet) { realm = realm === 'hel' ? 'hel' : 'mid'; P.realm = realm;
  if (world.realm !== realm) { scene.remove(world.group); if (worlds[realm]) scene.add(worlds[realm].group); else worlds[realm] = buildWorld(scene, realm === 'hel' ? 6661013 : 20261019, realm); world = worlds[realm]; ocean.setShore(world.shore); }
  env.setRealm(realm); gates.mid.g.visible = realm === 'mid'; gates.hel.g.visible = realm === 'hel'; for (const L of world.lairs) L.beaten = !!P.legends[L.key];
  for (const m of [...mons]) removeMon(m); for (const sp of [...spots]) removeSpot(sp); for (const f of floats) scene.remove(f.g); floats.length = 0; for (const sp of spouts) twisters.remove(sp.g); spouts.length = 0;
  for (const pod of pods) for (const Mb of pod.members) { scene.remove(Mb.m.g); disposeTree(Mb.m.g); } pods.length = 0; EV.whirl = null; ocean.whirl.k = 0; EV.ambush = null; for (const id in EV.fleets) delete EV.fleets[id]; EV.next = 60; aur.hidePillar();
  lairWarned = {}; for (const k in lairWave) lairWave[k] = 0; curSea = ''; placeWreck(); if (!quiet) hud(); }
function updateGates(dt) { const G = gates[P.realm], k = gateOpen() ? 1 : 0.25; G.update(dt, time, k); G.g.position.y = ocean.heightAt(GATES[P.realm].x, GATES[P.realm].z) * 0.3;
  if (state === 'play' && Math.random() < dt * 8 * k && Math.hypot(GATES[P.realm].x - boat.x, GATES[P.realm].z - boat.z) < 220) { const a = Math.random() * 6.28, r = rnd(2, 17); soulFx.add(GATES[P.realm].x + Math.cos(a) * r, GATES[P.realm].z + Math.sin(a) * r, { spray: true, y: 0.5, vx: 0, vz: 0, vy: rnd(3, 7), g: -0.2, s: rnd(0.4, 0.9), grow: 0.3, life: 3, a: 0.9 }); } }
function gateAsk() { if (state !== 'play') return; if (!gateOpen()) { say("🌀 Hel's Gate is sealed. Only a Drakkar (ship size 5) is great enough to pass through to Helheim.", 5); return; }
  const hel = P.realm === 'hel'; state = 'gate'; boat.v = 0; setThrottle(0, true); $('gateTitle').textContent = hel ? 'THE GATE OF THE LIVING' : "HEL'S GATE";
  $('gateText').innerHTML = hel ? 'Sail back up to Midgard? Your ship, cargo and souls come with you, and you can return here through Hel\'s Gate whenever you like.' : 'Below lies <b>Helheim</b>, the realm of the dead. Every ship there is a draugr ship and every monster is undead, and all of them are a little stronger than Midgard\'s.<br><br>Every kill in Helheim gives <b>souls 👻</b>: spend them on rune upgrades, new shipwright designs and the greatest ships of all. Hafgufa, Surtr and Nidhögg rule there.<br><br>The gate home stands beside Gjallarhöfn.';
  $('gateGo').textContent = hel ? 'RETURN TO MIDGARD' : 'DESCEND INTO HELHEIM'; $('gateNo').textContent = hel ? 'STAY' : 'NOT YET'; $('hud').classList.add('hidden'); $('gate').classList.remove('hidden'); sfx.horn(); }
$('gateNo').onclick = () => { $('gate').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; boat.grace = 2; };
$('gateGo').onclick = () => { $('gate').classList.add('hidden'); crossRealm(); };
function crossRealm() { const to = P.realm === 'hel' ? 'mid' : 'hel'; state = 'cross'; $('fade').classList.add('on'); sfx.whoosh(); sfx.thunder();
  setTimeout(() => { setRealm(to); if (to === 'hel') P.beenHel = true; const G = GATES[to], dir = Math.atan2(-G.x, -G.z); boat.x = G.x + Math.sin(dir) * 32; boat.z = G.z + Math.cos(dir) * 32; curSea = world.regionAt(boat.x, boat.z); boat.yaw = dir; boat.v = 0; boat.wp = null; courseMark.visible = false; boat.grace = 6; setThrottle(0, true); helm.angle = 0;
    P.home = nearestHarbor().idx; env.snap(P.tod, null, world.regionWeights(boat.x, boat.z, {})); camTgt.set(boat.x, 0, boat.z); save(); $('hud').classList.remove('hidden'); state = 'play'; hud();
    setTimeout(() => $('fade').classList.remove('on'), 250); const el = $('seaBanner'); el.innerHTML = to === 'hel' ? '<b>☠ HELHEIM ☠</b><small>The realm of the dead</small>' : '<b>⚓ MIDGARD ⚓</b><small>The world of the living</small>'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); sfx.horn();
    say(to === 'hel' ? 'You pass through Hel\'s Gate into the realm of the dead. Every kill here gives souls 👻. ' + (P.res.s ? '' : 'Spend them at Helheim\'s harbours, or back in Midgard.') : 'You rise through the gate into Midgard, the world of the living.', 6); }, 1100); }
function helWin() { if (state !== 'play') { setTimeout(helWin, 1000); return; } state = 'won'; $('hud').classList.add('hidden'); $('won').classList.remove('hidden'); $('wonTitle').innerHTML = "HEL'S<br>REIGN"; $('wonText').innerHTML = 'Hafgufa, Surtr and Nidhögg have fallen. Even the dead bow to the Jarl.<br><br>The shipwrights of Helheim will now build you <b>NAGLFAR</b>, the ship of nails.<br><br>' + P.kills + (P.kills === 1 ? ' foe' : ' foes') + ' slain.'; sfx.horn(); save(); }
// ---------- sinking, saving ----------
// end any fight or mini-game at once (quitting to the title, a new voyage)
// the fight you are in, staged again the other way (classic <-> action) with the hull each side has now
function reFight() { if (!battle || !battle.mon) return; const mon = battle.mon, foeHp = battle.foe ? battle.foe.hp : mon.hp, youHp = battle.you ? battle.you.hp : P.hp; if (battle.legend && (battle.legend.kind !== 'beast')) return; abortFight(); mon.hp = Math.max(1, foeHp); P.hp = Math.max(1, youHp); mon.stun = 0; mon.rise = 1; mon.dive = 0; boat.grace = 0; startBattle(mon, false, BROAD.on ? {} : { classic: true }); hud(); }
function abortFight() { clearBroadside(); clearLegend(); if (boat.air) { boat.air = null; if (ship && ship.mask) ship.mask.visible = true; } battle = null; fishing = null; minis.close(); setBattle(false); document.body.classList.remove('busy', 'broadOn', 'legendOn'); $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); line.visible = false; }
function sink() { if (state !== 'play') return; state = 'sunk'; clearBroadside(); clearLegend(); if (boat.air) { boat.air = null; if (ship.mask) ship.mask.visible = true; } battle = null; fishing = null; minis.close(); const lost = {}; for (const k of ['w', 'i', 'g', 'f']) { lost[k] = Math.floor(P.res[k] / 2); P.res[k] -= lost[k]; }
  const old = P.wreck, any = lost.w + lost.i + lost.g + lost.f > 0; EV.ambush = null; if (any) { P.wreck = { x: boat.x, z: boat.z, res: lost, realm: P.realm }; placeWreck(); }
  $('sunkText').innerHTML = 'Your ship goes down beneath the waves. The gods send you back to ' + homeHarbor().name + ' with a new hull. ' + (any ? 'Half your cargo went down with the wreck: ' + wreckSum(lost) + '.<br><br>Sail back to the ☠ on the map and SALVAGE it to get it all back, or hire a salvage crew at any harbour.' + (old ? ' Your older wreck is lost to the deep.' : '') : 'Your hold was empty, so nothing was lost.'); $('hud').classList.add('hidden'); $('sunk').classList.remove('hidden'); sfx.over(); setBattle(false); }
$('sunkBtn').onclick = () => { $('acts').classList.remove('hidden'); $('helmWrap').classList.remove('hidden'); document.body.classList.remove('busy'); const h = homeHarbor(); P.hp = maxHp(); setThrottle(0, true); helm.angle = 0; [boat.x, boat.z, boat.yaw] = sailOut(h); boat.v = 0; boat.wp = null; for (const m of [...mons]) removeMon(m); $('sunk').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; hud(); save(); };
function winGame() { if (state !== 'play') { setTimeout(winGame, 1000); return; } P.won = true; state = 'won'; $('hud').classList.add('hidden'); $('won').classList.remove('hidden'); $('wonTitle').innerHTML = "LORD OF<br>THE SEA"; $('wonText').innerHTML = 'The Kraken, Jormungandr and the Elder One have fallen. Every fjord sings of the Jarl, ruler of the monster sea.<br><br>But the saga is not over: the shipwrights will now build you a <b>Busse</b>, and ' + (P.tier >= 4 ? 'Hel\'s Gate in the Mist Sea stands open for your ship. Helheim waits.' : 'Hel\'s Gate in the Mist Sea opens for a Drakkar. Helheim waits.') + ' Slain legends rise again, stronger, in their lairs.<br><br>' + P.kills + (P.kills === 1 ? ' foe' : ' foes') + ' slain.'; sfx.horn(); save(); }
$('wonBtn').onclick = () => { $('won').classList.add('hidden'); $('paused').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; };
const SAVE = 'pr_save';
function homeHarbor() { return world.harbors.find((h) => h.idx === P.home) || world.harbors[0]; }
function save() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 1, tier: P.tier, up: P.up, res: P.res, hp: P.hp, legends: P.legends, kills: P.kills, home: P.home, won: P.won, tod: P.tod, x: boat.x, z: boat.z, yaw: boat.yaw, wreck: P.wreck, prizes: P.prizes, maps: P.maps, relics: P.relics, skin: P.skin, realm: P.realm, hull: P.hull, sailD: P.sailD, owned: P.owned, shipName: P.shipName || '', bounty: P.bounty, bounties: P.bounties, st: P.st, beenHel: !!P.beenHel, reborn: P.reborn, hall: P.hall || 0, tithe: P.tithe || 0, trials: P.trials || {} })); } catch { /* ignore */ } }
// a save (from this browser, or from a save code someone pasted) is trusted only as numbers and names from the game's own
// lists: anything else is clamped or dropped, so a doctored code cannot slip markup or script into the page
function cleanSave(s) {
  const num = (v, lo, hi, d = lo) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d), int = (v, lo, hi, d = lo) => Math.round(num(v, lo, hi, d));
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), arr = (v) => (Array.isArray(v) ? v : []);
  const SKINS = ['pats', 'ghost', 'treasure', ...RAIDER_PALS.map((p) => p.name), ...Object.values(HEL_PALS).map((p) => p.name)], skin = (v) => (SKINS.includes(v) ? v : 'pats');
  const ICONS = [...Object.values(LANDMARK).map((l) => l[0]), ...Object.values(LANDMARK_HEL).map((l) => l[0]), '🦴', '⚓', '🐚'], text = (v) => (typeof v === 'string' ? v : '').replace(/[<>&"'`]/g, '').slice(0, 200), has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const res = (r) => { r = obj(r); return { w: int(r.w, 0, 1e7), i: int(r.i, 0, 1e7), g: int(r.g, 0, 1e7), f: int(r.f, 0, 1e7), s: int(r.s, 0, 1e7) }; };
  const cell = (c) => [int(arr(c)[0], 0, 4), int(arr(c)[1], 0, 3)], E = HALF - 20, nIsl = world.islands.length;
  const tier = int(s.tier, 0, SHIP_TIERS.length - 1), up = {}, capT = Math.max(tier, ...arr(s.prizes).slice(0, 4).map((q) => int(obj(q).tier, 0, SHIP_TIERS.length - 1))); for (const k in P.up) up[k] = int(obj(s.up)[k], 0, Math.min(UPG[k] ? UPG[k].max : 3, capT + 1));
  const legends = {}; for (const key of [...Object.keys(LAIRS), ...Object.keys(LAIRS_HEL)]) if (obj(s.legends)[key] === true) legends[key] = true;
  const own = obj(s.owned), hs = [...new Set(['oak', ...arr(own.h).filter((k) => has(HULLS, k))])], ss = [...new Set(['pats', ...arr(own.s).filter((k) => has(SAILS, k))])], realm = s.realm === 'hel' ? 'hel' : 'mid';
  for (const [k, d] of Object.entries(HULLS)) if (d.got.legend && legends[d.got.legend] && !hs.includes(k)) hs.push(k); for (const [k, d] of Object.entries(SAILS)) if (d.got.legend && legends[d.got.legend] && !ss.includes(k)) ss.push(k);
  const trials = {}; for (const key of [...Object.keys(LAIRS), ...Object.keys(LAIRS_HEL)]) { const t = int(obj(s.trials)[key], 0, 2); if (t) trials[key] = t; }
  const w = obj(s.wreck), h = world.harbors.find((x) => x.idx === int(s.home, 0, 5)) || world.harbors[0];
  const p = { tier, up, realm, owned: { h: hs, s: ss }, hull: hs.includes(s.hull) ? s.hull : 'oak', sailD: ss.includes(s.sailD) ? s.sailD : 'pats', helWon: Object.keys(LAIRS_HEL).every((k) => legends[k]), res: res(s.res), hp: num(s.hp, 1, 1e6, 1e6), legends, kills: int(s.kills, 0, 1e7), home: h.idx, won: s.won === true, tod: num(s.tod, 0, 1, 0.2),
    wreck: w.res ? { x: num(w.x, -E, E, 0), z: num(w.z, -E, E, 0), res: res(w.res), realm: w.realm === 'hel' ? 'hel' : 'mid' } : null,
    prizes: arr(s.prizes).slice(0, 4).map((q) => ({ tier: int(obj(q).tier, 0, SHIP_TIERS.length - 1), skin: skin(obj(q).skin) })),
    maps: arr(s.maps).slice(0, 6).filter((m) => obj(m).isl != null).map((m) => ({ isl: int(m.isl, 0, nIsl - 1), lx: num(m.lx, -E, E, 0), lz: num(m.lz, -E, E, 0), kind: m.kind === 'relic' ? 'relic' : 'gold', realm: m.realm === 'hel' ? 'hel' : 'mid', region: has(REGIONS, m.region) ? m.region : 'home',
      cell: cell(m.cell), clue: text(m.clue), marks: arr(m.marks).slice(0, 2).map((k) => ({ c: cell(obj(k).c), icon: ICONS.includes(obj(k).icon) ? k.icon : '🪨' })) })),
    relics: obj(s.relics).bane === true ? { bane: true } : {}, skin: skin(s.skin), bounties: int(s.bounties, 0, 1e6), shipName: typeof s.shipName === 'string' ? s.shipName.replace(/[<>&"'`\\]/g, '').slice(0, 20) : '', reborn: {}, hall: int(s.hall, 0, 5), tithe: num(s.tithe, 0, 600, 0), trials, beenHel: s.beenHel === true || realm === 'hel', bounty: null, st: { k: {}, d: {}, ships: 0, fish: 0, digs: 0, souls: 0 } };
  { const t = obj(s.st), k = obj(t.k), d = obj(t.d); for (const key of Object.keys(MLV)) if (k[key] != null) p.st.k[key] = int(k[key], 0, 1e7); for (const D of DEEDS) if (d[D.id] != null) p.st.d[D.id] = int(d[D.id], 0, D.at.length); for (const key of ['ships', 'fish', 'digs', 'souls']) p.st[key] = int(t[key], 0, 1e7); p.st.v = {}; const vv = obj(t.v); for (const key of Object.keys(vv)) { const m = /^(u:([a-z]+)|([a-z]+):([0-9]))$/.exec(key), ty = m && (m[2] || m[3]); if (ty && has(MLV, ty)) p.st.v[key] = int(vv[key], 0, 1e7); } }
  { const b = obj(s.bounty), kinds = ['type', 'ships', 'sea', 'fish', 'fleet', 'young'], keyOk = b.kind === 'type' ? has(BTYPE, b.key) : b.kind === 'sea' ? ['home', 'frost', 'storm', 'mist', 'warm'].includes(b.key) : true;
    for (const key of [...Object.keys(LAIRS), ...Object.keys(LAIRS_HEL)]) { const n = obj(s.reborn)[key]; if (n != null) p.reborn[key] = int(n, 0, 5); }
    if (kinds.includes(b.kind) && keyOk) { const need = int(b.need, 1, 12, 1); p.bounty = { kind: b.kind, key: b.kind === 'type' || b.kind === 'sea' ? b.key : '', need, n: int(b.n, 0, need), v: num(b.v, 0, 40, 1), realm: b.realm === 'hel' ? 'hel' : 'mid', reward: res(b.reward) }; } }
  const home = (a) => (a === 'x' ? h.dock.x + Math.cos(h.dir) * 12 : h.dock.z + Math.sin(h.dir) * 12);
  return { p, x: num(s.x, -E, E, home('x')), z: num(s.z, -E, E, home('z')), yaw: num(s.yaw, -1e3, 1e3, 0) }; }
// a save that cannot be read is kept as pr_save_bad and CONTINUE is hidden, rather than continuing as a new voyage over it
let saveBad = false;
function load() { try { const raw = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (!raw || raw.v !== 1) return false; const s = cleanSave(raw); Object.assign(P, s.p); setRealm(P.realm, true); P.hp = Math.min(P.hp, maxHp()); boat.x = s.x; boat.z = s.z; boat.yaw = s.yaw; for (const L of world.lairs) if (P.legends[L.key]) L.beaten = true;
    // a ship saved inside land is put back at her home harbour
    if (world.blockAt(boat.x, boat.z, T().B * 0.5 + 2)) { const h = homeHarbor(); boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); } return true; }
  catch { saveBad = true; try { localStorage.setItem('pr_save_bad', localStorage.getItem(SAVE) || ''); } catch { /* ignore */ } return false; } }

// ---------- minimap and chart ----------
const mapEl = $('map'), mapCtx = mapEl.getContext('2d'), chartEl = $('chartCv'), chartCtx = chartEl.getContext('2d');
function drawMap(cv, g, full) { const dpr = Math.min(2, devicePixelRatio || 1), S = Math.round(cv.clientWidth * dpr) || 1; if (cv.width !== S) cv.width = cv.height = S; const VW = full ? chartView : MINI_VIEW, k = (S / WORLD) * VW.zoom, P2 = (x, z) => [S / 2 + (x - VW.cx) * k, S / 2 + (z - VW.cz) * k];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.save(); if (!full) { g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 6.2832); g.clip(); }
  { const [ox, oy] = P2(-HALF, -HALF); g.imageSmoothingEnabled = true; g.drawImage(world.mapCanvas, ox, oy, WORLD * k, WORLD * k); } g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = '#ffffff22'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { const v = -HALF + (i * WORLD) / 4, [gx] = P2(v, 0), [, gy] = P2(0, v); g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, S); g.moveTo(0, gy); g.lineTo(S, gy); g.stroke(); }
  const fs = (full ? 18 : 10) * dpr; g.font = fs + 'px serif';
  for (const h of world.harbors) { const [x, y] = P2(h.dock.x, h.dock.z); g.fillText('⚓', x, y); if (full && P.bounty && P.bounty.kind === 'sea' && P.bounty.realm === P.realm && P.bounty.n < P.bounty.need && h === world.harbors[0]) { const C = { frost: [0, -400], storm: [400, 0], mist: [-400, 0], warm: [0, 400], home: [0, 0] }[P.bounty.key] || [0, 0], [bx, by] = P2(C[0], C[1]); g.font = 'bold ' + 22 * dpr + 'px serif'; g.fillStyle = '#ffd24a'; g.fillText('📜', bx, by + 8 * dpr); g.font = 'bold ' + 11 * dpr + 'px Georgia'; g.fillText('BOUNTY', bx, by + 24 * dpr); } if (full) { g.font = 'bold ' + 11 * dpr + 'px Georgia'; g.fillStyle = '#f2e6c8'; g.fillText(h.name, x, y + 14 * dpr); g.font = fs + 'px serif'; } }
  for (const gr of grounds()) { const [x, y] = P2(gr.x, gr.z), rr = gr.r * k; g.globalAlpha = groundOpen(gr) ? 1 : 0.4; g.fillStyle = '#ff6a4a16'; g.strokeStyle = '#ff8a6a99'; g.lineWidth = 1 * dpr; g.setLineDash([4 * dpr, 3 * dpr]); g.beginPath(); g.arc(x, y, rr, 0, 6.2832); g.fill(); g.stroke(); g.setLineDash([]); g.font = (full ? 15 : 9) * dpr + 'px serif'; g.fillStyle = '#fff'; g.fillText(GICON[gr.type], x, y); if (full && chartView.zoom >= 1.5) { g.font = 'bold ' + 9.5 * dpr + 'px Georgia'; g.fillStyle = '#ffb8a8'; g.fillText(gr.name.toUpperCase(), x, y + rr + 7 * dpr); } g.globalAlpha = 1; g.font = fs + 'px serif'; }
  for (const L of world.lairs) { const [x, y] = P2(L.x, L.z); g.globalAlpha = L.beaten ? 0.4 : 1; g.fillText(L.beaten ? '✔' : L.icon, x, y); g.globalAlpha = 1; }
  for (const w of world.wrecks) { if (w.looted) continue; const [x, y] = P2(w.x, w.z); g.fillStyle = '#c8a070'; g.fillRect(x - 1.5 * dpr, y - 1.5 * dpr, 3 * dpr, 3 * dpr); }
  g.font = 'bold ' + (full ? 20 : 13) * dpr + 'px Georgia'; for (const mp of P.maps) { if ((mp.realm || 'mid') !== P.realm) continue; const [x, y] = P2(mp.lx, mp.lz); g.fillStyle = '#1a0e06'; g.fillText('✕', x + 1 * dpr, y + 1 * dpr); g.fillStyle = mp.kind === 'relic' ? '#d08aff' : '#ff4a3a'; g.fillText('✕', x, y); } g.font = fs + 'px serif';
  const fog = wx.type === 'fog' && wx.k > 0.5; for (const s of spots) { const [x, y] = P2(s.x, s.z); g.fillStyle = s.kind === 'treasure' ? '#ffd24a' : s.kind === 'flotsam' ? '#c8a070' : '#bfe6ff'; g.beginPath(); g.arc(x, y, 1.8 * dpr, 0, 6.28); g.fill(); }
  for (const mon of mons) { if (mon.dead) continue; const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); if (fog && d > 45 && !mon.boss) continue; const [x, y] = P2(mon.x, mon.z); g.fillStyle = mon.treasure ? '#ffd24a' : mon.fleet ? '#ff4a3a' : mon.naval ? '#ff9a3a' : danger(mon.lv); g.beginPath(); g.arc(x, y, (mon.boss ? 4 : mon.treasure ? 3.6 : 2.2) * dpr, 0, 6.28); g.fill(); }
  for (const s of spouts) { const [x, y] = P2(s.x, s.z); g.fillText('🌪', x, y); }
  g.fillStyle = '#e8f6ff'; for (const pod of pods) for (const Mb of pod.members) { const [x, y] = P2(Mb.x, Mb.z); g.fillRect(x - 1 * dpr, y - 1 * dpr, 2 * dpr, 2 * dpr); }
  if (EV.whirl) { const [x, y] = P2(EV.whirl.x, EV.whirl.z); g.fillText('🌀', x, y); } { const pa = aur.pillarAt; if (pa) { const [x, y] = P2(pa.x, pa.z); g.fillText('🌈', x, y); } } if (wreckHere()) { const [x, y] = P2(P.wreck.x, P.wreck.z); g.fillText('☠', x, y); } { const G = world.gate; if (G) { const [x, y] = P2(G.x, G.z); g.fillText(P.realm === 'hel' ? '🌅' : '🌀', x, y); if (full) { g.font = 'bold ' + 11 * dpr + 'px Georgia'; g.fillStyle = '#e0c8ff'; const lb = P.realm === 'hel' ? 'Gate to Midgard' : "Hel's Gate", hw = g.measureText(lb).width / 2 + 3 * dpr; g.fillText(lb, clamp(x, hw, g.canvas.width - hw), y + 14 * dpr); g.font = fs + 'px serif'; } } }
  if (full && tut && tut.target && !(boat.wp && boat.wp !== tut.wp0)) { if (chartView.zoom > 1.8) tut.zoomed = true; const zoomed = tut.zoomed, [x, y] = P2(tut.target.x, tut.target.z), pulse = 1 + 0.25 * Math.sin(performance.now() / 180), col = zoomed ? '#7dff3a' : '#ffd24a'; g.strokeStyle = col; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, (zoomed ? 16 : 22) * dpr * pulse, 0, 6.28); g.stroke(); g.fillStyle = col; g.font = 'bold ' + 22 * dpr + 'px Georgia'; g.textAlign = 'center'; g.fillText('✕', x, y + 8 * dpr); g.font = 'bold ' + 13 * dpr + 'px Georgia'; g.fillText(zoomed ? (keyPad ? 'CLICK HERE' : 'TAP HERE') : (keyPad ? 'SCROLL TO ZOOM IN HERE' : 'PINCH TO ZOOM IN HERE'), x, y - 26 * dpr); }
  if (boat.wp) { const [x, y] = P2(boat.wp.x, boat.wp.z); g.strokeStyle = '#ffd24a'; g.lineWidth = 2 * dpr; const q = 4 * dpr; g.beginPath(); g.moveTo(x - q, y - q); g.lineTo(x + q, y + q); g.moveTo(x + q, y - q); g.lineTo(x - q, y + q); g.stroke(); const [bx, by] = P2(boat.x, boat.z); g.setLineDash([3 * dpr, 4 * dpr]); g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
  const [bx, by] = P2(boat.x, boat.z); g.save(); g.translate(bx, by); g.rotate(-boat.yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1; const s2 = (full ? 7 : 5) * dpr; g.beginPath(); g.moveTo(0, -s2 * 1.4); g.lineTo(s2, s2); g.lineTo(-s2, s2); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.restore(); }
// the sea chart: pinch to zoom, drag to look around, tap to set a course; the corner map always shows the whole sea
const chartView = { zoom: 1, cx: 0, cz: 0 }, MINI_VIEW = { zoom: 1, cx: 0, cz: 0 }; const cptr = new Map(); let cDrag = false, cPinch = 0, cDown = null;
function chartClamp() { chartView.zoom = clamp(chartView.zoom, 1, 8); const lim = HALF - HALF / chartView.zoom; chartView.cx = clamp(chartView.cx, -lim, lim); chartView.cz = clamp(chartView.cz, -lim, lim); }
function chartWorld(x, y) { const r = chartEl.getBoundingClientRect(), k = (r.width / WORLD) * chartView.zoom; return [chartView.cx + (x - r.left - r.width / 2) / k, chartView.cz + (y - r.top - r.height / 2) / k]; }
function closeChart() { $('chart').classList.add('hidden'); state = 'play'; cptr.clear(); }
function mapTap(cv, e) { const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * WORLD - HALF, z = ((e.clientY - r.top) / r.height) * WORLD - HALF; setCourse(x, z); say('Course set. Turn the wheel any time; let go and the helmsman steers back to the mark.'); }
let mapTapT = 0; mapEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (state === 'play' && !battle && !fishing) { mapTapT = performance.now(); $('chartBtn').click(); } });
mapEl.addEventListener('touchend', (e) => { if (performance.now() - mapTapT < 600 || state !== 'play' || battle || fishing) return; e.preventDefault(); $('chartBtn').click(); }, { passive: false });
$('chartBtn').onclick = () => { if (state !== 'play' || battle || fishing) return; if (tut) tut.chart = true; state = 'chart'; chartView.zoom = 1; chartView.cx = 0; chartView.cz = 0; cptr.clear(); $('chart').classList.remove('hidden'); drawMap(chartEl, chartCtx, true); requestAnimationFrame(() => { if (state === 'chart') drawMap(chartEl, chartCtx, true); }); };
chartEl.addEventListener('pointerdown', (e) => { e.preventDefault(); try { chartEl.setPointerCapture(e.pointerId); } catch { /* ignore */ } cptr.set(e.pointerId, [e.clientX, e.clientY]); if (cptr.size === 1) { cDown = { x: e.clientX, y: e.clientY, t: performance.now() }; cDrag = false; } else { cDrag = true; const [a, b] = [...cptr.values()]; cPinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
chartEl.addEventListener('pointermove', (e) => { if (!cptr.has(e.pointerId)) return; const prev = cptr.get(e.pointerId); cptr.set(e.pointerId, [e.clientX, e.clientY]); const r = chartEl.getBoundingClientRect();
  if (cptr.size >= 2) { const [a, b] = [...cptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (cPinch > 0 && d > 0) { const [wx, wz] = chartWorld(mx, my); chartView.zoom *= d / cPinch; chartClamp(); const k2 = (r.width / WORLD) * chartView.zoom; chartView.cx = wx - (mx - r.left - r.width / 2) / k2; chartView.cz = wz - (my - r.top - r.height / 2) / k2; chartClamp(); } cPinch = d; drawMap(chartEl, chartCtx, true); return; }
  if (cDown && Math.hypot(e.clientX - cDown.x, e.clientY - cDown.y) > 10) cDrag = true; if (cDrag) { const k = (r.width / WORLD) * chartView.zoom; chartView.cx -= (e.clientX - prev[0]) / k; chartView.cz -= (e.clientY - prev[1]) / k; chartClamp(); drawMap(chartEl, chartCtx, true); } });
chartEl.addEventListener('pointerup', (e) => { if (!cptr.has(e.pointerId)) return; cptr.delete(e.pointerId); if (cptr.size < 2) cPinch = 0; if (cptr.size === 0) { if (!cDrag && cDown && performance.now() - cDown.t < 500 && tut && tut.target && !tut.zoomed) { say(keyPad ? 'Scroll to zoom in on the glowing ✕ first.' : 'Pinch to zoom in on the glowing ✕ first.', 2.5); drawMap(chartEl, chartCtx, true); } else if (!cDrag && cDown && performance.now() - cDown.t < 500) { const [x, z] = chartWorld(e.clientX, e.clientY); setCourse(x, z); say('Course set. Turn the wheel any time; let go and the helmsman steers back to the mark.'); drawMap(chartEl, chartCtx, true); setTimeout(closeChart, 350); } cDown = null; } });
chartEl.addEventListener('pointercancel', (e) => { cptr.delete(e.pointerId); if (cptr.size < 2) cPinch = 0; });
chartEl.addEventListener('wheel', (e) => { e.preventDefault(); const [wx, wz] = chartWorld(e.clientX, e.clientY), r = chartEl.getBoundingClientRect(); chartView.zoom *= Math.exp(-e.deltaY * 0.0015); chartClamp(); const k2 = (r.width / WORLD) * chartView.zoom; chartView.cx = wx - (e.clientX - r.left - r.width / 2) / k2; chartView.cz = wz - (e.clientY - r.top - r.height / 2) / k2; chartClamp(); drawMap(chartEl, chartCtx, true); }, { passive: false });
$('chartClose').onclick = closeChart;


// ---------- tags and pops ---------- (an enemy in a broadside has her bar at the top instead)
function updateTags(dt) { for (const mon of mons) { const t = mon.tag; if (mon.dead || state === 'title' || (battle && (battle.broad ? battle.broad.foes.includes(mon) : !!battle.legend && battle.mon === mon))) { t.style.display = 'none'; continue; } const d = Math.hypot(mon.x - boat.x, mon.z - boat.z); const sp = d < 90 && mon.rise > 0.5 ? toScreen(mon.x, mon.g.position.y + mon.top + 1.2, mon.z) : null; if (!sp || (wx.type === 'fog' && wx.k > 0.5 && d > 40)) { t.style.display = 'none'; continue; }
    t.style.display = 'block'; t.style.left = sp[0] + 'px'; t.style.top = sp[1] + 'px'; const html = '<span style="color:' + (mon.naval ? '#ffb03a' : danger(mon.lv)) + '">' + mon.name + ' · ' + (mon.lv - P.tier > 1.6 ? '💀 Lv ' + (Math.round(mon.lv) + 1) : 'Lv ' + (Math.round(mon.lv) + 1)) + '</span>' + (mon.hp < mon.maxHp ? '<i><b style="width:' + clamp(mon.hp / mon.maxHp, 0, 1) * 100 + '%"></b></i>' : ''); if (t._h !== html) { t.innerHTML = html; t._h = html; } }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; const sp = toScreen(p.x, p.y + p.t * 2.5, p.z); if (!sp || p.t > p.life) { p.el.remove(); pops.splice(i, 1); continue; } p.el.style.left = sp[0] + 'px'; p.el.style.top = sp[1] + 'px'; p.el.style.opacity = Math.min(1, (p.life - p.t) * 2); } }

// ---------- ship movement ----------
// a wreck ahead within a ship's length or two: the helmsman eases off so you can salvage without ramming it
function wreckNear() { const R0 = 14 + T().L * 0.3 + 18, fx = Math.sin(boat.yaw), fz = Math.cos(boat.yaw), near = (x, z) => { const dx = x - boat.x, dz = z - boat.z, d = Math.hypot(dx, dz); return d < R0 && (d < 10 || (dx * fx + dz * fz) / d > 0.2); }; if (wreckHere() && near(P.wreck.x, P.wreck.z)) return true; for (const w of world.wrecks) if (!w.looted && near(w.x, w.z)) return true; return false; }
function updateBoat(dt) {
  if (boat.air) { const A = boat.air; flyStep(A, boat, dt); boat.y = ocean.heightAt(boat.x, boat.z) + A.h; boat.pitch = A.pitch; boat.roll = A.roll; boat.v *= 1 - dt * 0.5;
    ship.g.position.set(boat.x, boat.y, boat.z); ship.g.rotation.y = boat.yaw; ship.body.rotation.x = -boat.pitch; ship.body.rotation.z = boat.roll; ship.anim(dt, { speed: 0, time, night: isNight(), sail: boat.sailK ?? 0 });
    if (Math.random() < dt * 14) foam.add(boat.x + rnd(-2, 2), boat.z + rnd(-2, 2), { spray: true, y: boat.y - 0.5, vx: rnd(-3, 3), vz: rnd(-3, 3), vy: rnd(-2, 1), s: 0.8, life: 0.8, a: 0.7 });
    if (A.done) landBoat(A); return; }
  if (boat.airCd > 0) boat.airCd -= dt;
  const t = T(); let thr = boat.throttle || 0, want = null;
  const kTurn = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), kThr = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
  if (kThr && thrKeyOk()) { thrHold += dt; if (thrHold > 0.4) { thrHold -= 0.22; thrKeyStep(kThr); } } else thrHold = 0; // held: the next notch every 0.22 s after 0.4 s
  if (state === 'play' && (!battle || (battle.legend && battle.legend.sail && !battle.legend.coil)) && !fishing) { if (kTurn) helm.angle = clamp(helm.angle + kTurn * dt * 2.2, -HMAX, HMAX);
    if (boat.wp) { const dx = boat.wp.x - boat.x, dz = boat.wp.z - boat.z, d = Math.hypot(dx, dz);
      if (d < 4 + t.L * 0.3) { const au = autoOn() && boat.auto.h; boat.wp = null; boat.auto = null; courseMark.visible = false; setThrottle(0, true); if (au) openHarbor(au); else say('Arrived. Sails furled.'); }
      else { courseMark.position.set(boat.wp.x, ocean.heightAt(boat.wp.x, boat.wp.z) + 0.2, boat.wp.z); courseMark.rotation.z += dt; thr = Math.min(thr, clamp(d / 18, 0.25, 1));
        // hands off the wheel: the helmsman turns it back toward the mark (and around land)
        if (!helm.held && !kTurn) { want = steerAround(Math.atan2(dx, dz), Math.min(d, 26 + t.L)); const target = -clamp(angDiff(want, boat.yaw) * 1.8, -1, 1) * HMAX; helm.angle += clamp(target - helm.angle, -dt * 3.5, dt * 3.5); } } } }
  else thr = 0;
  // backing water (BACK), the wheel steers like reversing a car
  const r0 = helm.angle / HMAX, rudder = Math.sign(r0) * Math.pow(Math.abs(r0), 1.4), tr = turnRate() * (0.35 + 0.65 * Math.min(1, Math.abs(boat.v) / (t.speed * 0.6))); boat.yaw += -rudder * tr * dt * (boat.v < -0.3 ? -1 : 1) + boat.spin * dt; boat.spin *= 1 - dt * 1.2;
  boat.sailK = (boat.sailK ?? 0) + (clamp((thr - 0.3) / 0.45, 0, 1) - (boat.sailK ?? 0)) * Math.min(1, dt * 1.5);
  let top = topSpeed() * (1 - (LOOK[wx.type] === 'storm' ? 0.15 * wx.k : 0)); if (!battle && !boat.air && thr > 0 && wreckNear()) top = Math.min(top, 3); const acc = 3.2 * (1 + 0.15 * P.up.oars); boat.v += clamp(thr * top - boat.v, -acc * 1.2 * dt, acc * dt); boat.boost = Math.max(0, boat.boost - dt); boat.thor = Math.max(0, boat.thor - dt); boat.curse = Math.max(0, (boat.curse || 0) - dt);
  // the crew patch the hull at sea (Oars & Crew): out of battle, once nothing has hit you for 8 s
  if (P.tithe > 0 && state === 'play' && P.realm === 'hel') P.tithe = Math.max(0, P.tithe - dt); boat.mending = state === 'play' && !!P.up.oars && !battle && !boat.bifrost && P.hp < maxHp() && time - (boat.lastHit ?? -99) > 8;
  if (boat.mending) { P.hp = Math.min(maxHp(), P.hp + maxHp() * MEND[P.up.oars] * (1 + perk('mend') + (P.hall >= 4 ? 0.25 : 0)) * dt); boat.hudT = (boat.hudT || 0) - dt; if (boat.hudT <= 0) { boat.hudT = 0.25; hud(); } }
  if (boat.bifrost > 0) { boat.bifrost = Math.max(0, boat.bifrost - dt); if (!battle && P.hp < maxHp()) { P.hp = Math.min(maxHp(), P.hp + maxHp() * 0.02 * dt); boat.hudT = (boat.hudT || 0) - dt; if (boat.hudT <= 0) { boat.hudT = 0.25; hud(); } } } boat.grace = Math.max(0, boat.grace - dt);
  let nx = boat.x + Math.sin(boat.yaw) * boat.v * dt, nz = boat.z + Math.cos(boat.yaw) * boat.v * dt;
  const bl = world.blockAt(nx, nz, t.B * 0.5 + t.L * 0.18) || world.blockAt(nx + Math.sin(boat.yaw) * t.L * 0.4, nz + Math.cos(boat.yaw) * t.L * 0.4, t.B * 0.3);
  if (bl) { nx = boat.x + bl.nx * dt * 4; nz = boat.z + bl.nz * dt * 4; if (boat.v > 5 && boat.hitCd <= 0) { boat.hitCd = 1.5; damage((boat.v - 4.5) * 1.6 * Math.pow(1.4, P.tier) * (1 - defense()) * (bl.kind === 'berg' ? 1.6 : 1), bl.kind === 'berg' ? 'You hit an iceberg!' : 'Ran aground!'); foam.splash(nx, nz, 1.2); sfx.creak(); } boat.v *= 0.35; if (autoOn()) autoReplan(); else boat.wp = null; }
  boat.hitCd = Math.max(0, boat.hitCd - dt);
  if (Math.abs(nx) > HALF - 15 || Math.abs(nz) > HALF - 15) { nx = clamp(nx, -HALF + 15, HALF - 15); nz = clamp(nz, -HALF + 15, HALF - 15); if (msgT <= 0) say('The edge of the world: the gods let no ship sail further.'); }
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
  if (wrightOn) { // frame the whole ship in the space above the shipwright's sheet
    const free = clamp(1 - ($('wright').offsetHeight || innerHeight * 0.4) / innerHeight, 0.3, 1), f = clamp(2 - free, 1, 1.75); if (Math.abs(f - wrF) > 0.01) { wrF = f; viewOff = null; }
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hf = tv * camera.aspect; tgt = V(boat.x, (t.mast + 2) * 0.42, boat.z); dist = Math.max((t.L + 8) / (2 * hf), ((t.mast + 3) * f) / (2 * tv * free * 0.85)); pitch = 0.12; camYaw = boat.yaw + Math.PI * 0.5 + Math.sin(time * 0.15) * 0.9; }
  else if (state === 'title') { const a = time * 0.06; tgt = V(boat.x, 2, boat.z); dist = t.L * 2.2 + 14; pitch = 0.28; camYaw = a; }
  else if (battle && battle.broad) { // the battle line side-on: the camera slides along the line and never turns
    const B = battle.broad, ni = nearFoe(B), f = B.foes[ni] || battle.mon, sep = clamp((B.foes.length ? foeAt(B, ni) : B.sp) - B.sp, -16, 16), [fx, fz] = lanePos(B, B.sp + sep / 2, (B.yC + B.eC) / 2), hfov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect, cc = B.sp + sep / 2; let need = Math.abs(sep) + tierOf(f).L + 6; B.foes.forEach((g, i) => { const a = foeAt(B, i); if (Math.abs(a - B.sp) < 34) need = Math.max(need, 2 * Math.abs(a - cc) + tierOf(g).L + 6); }); const W = Math.max(18, need, t.L * 2.2);
    tgt = V(fx, 1.2, fz); dist = Math.max(5, clamp(W / (2 * hfov), 16, 60) * zoom); pitch = 0.28; camYaw += angDiff(B.camYaw, camYaw) * Math.min(1, dt * 2.5); }
  else if (battle && battle.legend && battle.legend.kind === 'beast') { const mon = battle.mon, sep = Math.min(50, Math.hypot(mon.x - boat.x, mon.z - boat.z)); tgt = V(lerp(boat.x, mon.x, 0.3), 1.5, lerp(boat.z, mon.z, 0.3)); dist = Math.max(8, (14 + t.L * 1.3 + sep * 0.55 + mon.size * 0.5) * zoom); pitch = 0.6; camYaw += angDiff(boat.yaw, camYaw) * Math.min(1, dt * 1.5); }
  else if (battle && battle.legend && battle.legend.kind === 'jorm') { const mon = battle.mon, sep = Math.min(60, Math.hypot(mon.x - boat.x, mon.z - boat.z)); tgt = V(lerp(boat.x, mon.x, 0.25), 1, lerp(boat.z, mon.z, 0.25)); dist = Math.max(10, (40 + t.L * 1.6 + sep * 0.7 + mon.size * 0.6) * zoom); pitch = 0.82; camYaw += angDiff(boat.yaw, camYaw) * Math.min(1, dt * 1.5); }
  else if (battle && battle.legend && battle.legend.kind === 'elder') { const mon = battle.mon, d = Math.hypot(mon.x - boat.x, mon.z - boat.z); tgt = V(lerp(boat.x, mon.x, 0.45), 4 - (boat.dunk || 0) * 0.5, lerp(boat.z, mon.z, 0.45)); dist = Math.max(8, (d * 0.9 + mon.size * 2.2 + t.L * 1.4 + 14) * zoom); pitch = 0.42; camYaw += angDiff(Math.atan2(mon.x - boat.x, mon.z - boat.z), camYaw) * Math.min(1, dt * 2); }
  else if (battle && battle.legend) { const mon = battle.mon, [ex, , ez] = krakenEye(mon), d = Math.hypot(ex - boat.x, ez - boat.z); tgt = V(lerp(boat.x, ex, 0.5), 1, lerp(boat.z, ez, 0.5)); dist = Math.max(8, (d * 0.8 + mon.size * 0.55 + t.L * 1.6 + 18) * zoom); pitch = 0.62; camYaw += angDiff(Math.atan2(ex - boat.x, ez - boat.z), camYaw) * Math.min(1, dt * 2); }
  else if (battle && battle.mon.giant) { // frame your ship against one of the giant's eyes (the kraken's eye is about a ship long)
    const mon = battle.mon, Rk = mon.size / 6, sy = Math.sin(mon.yaw), cy = Math.cos(mon.yaw), lx = 0.9 * Rk, lz = 1.15 * Rk, ex = mon.x + lx * cy + lz * sy, ez = mon.z + lz * cy - lx * sy, de = Math.hypot(ex - boat.x, ez - boat.z);
    tgt = V((boat.x + ex) / 2, Rk * 0.3, (boat.z + ez) / 2); dist = Math.max(8, (de * 0.5 + t.L * 1.8 + 12) * zoom); pitch = 0.16; const want = Math.atan2(ex - boat.x, ez - boat.z); camYaw += angDiff(want, camYaw) * Math.min(1, dt * 1.5); }
  else if (battle) { const mon = battle.mon; tgt = V((boat.x + mon.x) / 2, 1.5, (boat.z + mon.z) / 2); const hfov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect, needW = Math.hypot(mon.x - boat.x, mon.z - boat.z) + t.L * 0.7 + mon.size + 6; dist = Math.max(6, Math.max(needW / (2 * hfov * 0.9), mon.top * 2.2 + 10) * zoom); pitch = 0.4; const want = Math.atan2(mon.x - boat.x, mon.z - boat.z) + Math.PI / 2; camYaw += angDiff(want - Math.PI, camYaw) * Math.min(1, dt * 1.5); }
  else { tgt = V(boat.x + Math.sin(boat.yaw) * boat.v * 0.6, boat.air ? boat.air.h * 0.85 : 0, boat.z + Math.cos(boat.yaw) * boat.v * 0.6); const W = (34 + t.L * 1.6) * (viewMode === 'top' ? 1 : 0.7); dist = (W / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1))) * 0.62 * zoom * (boat.air ? 1 + boat.air.h / 20 : 1); pitch = viewMode === 'top' ? 0.98 : 0.42; const wantYaw = viewMode === 'top' ? Math.PI : boat.yaw; camYaw += angDiff(wantYaw, camYaw) * Math.min(1, dt * (viewMode === 'top' ? 3 : 1.5)); }
  const off = wrightOn ? 'wright' : battle && (battle.broad || battle.legend) ? 'broad' : !!(battle || fishing); if (off !== viewOff) { viewOff = off; applyView(); }
  if (fishing && !battle) { const s = fishing.s; tgt = V((boat.x + s.x) / 2, 0, (boat.z + s.z) / 2); dist = 26 + t.L * 1.4; pitch = 0.75; }
  camTgt.lerp(tgt, Math.min(1, dt * 4)); const lx = Math.sin(camYaw), lz = Math.cos(camYaw); const want = V(camTgt.x - lx * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 2, camTgt.z - lz * Math.cos(pitch) * dist); camPos.lerp(want, Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(camTgt);
  const helmCam = viewMode === 'helm' && !battle && !fishing && state !== 'title' && ship; if (helmCam) { ship.g.updateMatrixWorld(true); const zb = clamp(zoom - 0.9, 0, 1.7), eye = ship.g.localToWorld(V(t.B * 0.28, ship.deckY + 2.2 + t.L * 0.04 + zb * 3, -t.L * 0.36 - zb * 7)), look = ship.g.localToWorld(V(t.B * 0.1, ship.deckY + 0.6, t.L * 3)); helmY = helmY == null ? eye.y : helmY + (eye.y - helmY) * Math.min(1, dt * 1.5); eye.y = helmY; look.y = helmY - 1.6 - zb * 3; camPos.copy(eye); camTgt.copy(look); camera.position.copy(eye); camera.lookAt(look); } else helmY = null;
  const fov = helmCam ? 66 : 50; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (ship) { const op = helmCam ? 0.35 : 1; if (ship.sailMat.opacity !== op) { ship.sailMat.transparent = op < 1 || P.skin === 'ghost'; ship.sailMat.opacity = op; ship.sailMat.depthWrite = op === 1; ship.sailMat.needsUpdate = true; } } }

// ---------- HUD buttons ----------
$('fireBtn').onclick = (e) => { e.stopPropagation(); unlockAudio(); fire(); }; $('actBtn').onclick = (e) => { e.stopPropagation(); doAction(); };
$('pauseBtn').onclick = () => { if (state !== 'play') return; state = 'paused'; $('saveQuit').disabled = !!(battle || fishing); $('saveQuit').textContent = battle || fishing ? 'FINISH THE FIGHT FIRST' : 'SAVE & QUIT TO TITLE'; $('pauseName').textContent = sagaTitle(); $('pauseText').textContent = T().name + ' · ' + P.kills + ' foes slain · legends of Midgard ' + legendCount(false) + ' / 3' + (P.realm === 'hel' || legendCount(true) ? ' · of Helheim ' + legendCount(true) + ' / 3' : ''); $('paused').classList.remove('hidden'); };
$('resumeBtn').onclick = () => { $('paused').classList.add('hidden'); state = 'play'; };
$('saveQuit').onclick = () => { if (battle || fishing) return; save(); $('paused').classList.add('hidden'); toTitle(); };
const howPager = (() => { let page = 0, pages = []; const nav = document.createElement('div'); nav.className = 'howNav'; nav.innerHTML = '<button class="ghost" id="howPrev">◀</button><span id="howPg"></span><button class="ghost" id="howNext">▶</button>'; $('how').insertBefore(nav, $('how').querySelector('.howBtns'));
  const show = (k) => { if (!pages.length) { const ps = [...$('how').querySelectorAll('.howList > p')]; for (let i = 0; i < ps.length; i += 2) pages.push(ps.slice(i, i + 2)); } page = (k + pages.length) % pages.length; pages.forEach((pg, i) => pg.forEach((p) => { p.style.display = i === page ? '' : 'none'; })); $('howPg').textContent = (page + 1) + ' / ' + pages.length; };
  $('howPrev').onclick = () => show(page - 1); $('howNext').onclick = () => show(page + 1); return { show }; })();
$('howBtn').onclick = () => { $('title').classList.add('hidden'); $('how').classList.remove('hidden'); howPager.show(0); }; $('howBack').onclick = () => { $('how').classList.add('hidden'); $('title').classList.remove('hidden'); };
function begin(cont) { abortFight(); unlockAudio(); startSaga(); if (cont && saveBad) cont = false; for (const k in offers) delete offers[k]; if (!cont) { saveBad = false; localStorage.removeItem(SAVE); Object.assign(P, { tier: 0, up: { shields: 0, armor: 0, ballista: 0, fire: 0, ram: 0, sail: 0, oars: 0, nets: 0, lights: 0, compass: 0, hooks: 0 }, res: { w: 20, i: 5, g: 40, f: 0, s: 0 }, legends: {}, kills: 0, home: 0, won: false, tod: 0.16, wreck: null, prizes: [], maps: [], relics: {}, skin: 'pats', hull: 'oak', sailD: 'pats', owned: { h: ['oak'], s: ['pats'] }, helWon: false, beenHel: false, reborn: {}, hall: 0, tithe: 0, trials: {}, shipName: '', bounty: null, bounties: 0, st: { k: {}, d: {}, ships: 0, fish: 0, digs: 0, souls: 0 } }); setRealm('mid', true); placeWreck(); P.hp = maxHp(); const h = world.harbors[0]; boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); for (const L of world.lairs) L.beaten = false; }
  boat.v = 0; boat.wp = null; for (const m of [...mons]) removeMon(m); rebuildShip(); $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); state = 'play'; fsCtl.play(); hud();
  boat.throttle = 0; helm.angle = 0; drawThrottle(); helmDrawn = null; if (tutForce || (!cont && !tutSeen())) { tutForce = false; tutStart(); } else if (!tut) say(cont ? 'Back at sea. Skål! Tap ROW, HALF or FULL to get under way.' : 'Tap ROW, HALF or FULL to get under way, and swipe along the wheel to steer. Tap the sea or the map to set a course.', 5.5); camYaw = Math.PI; }
const codes = initSaveCodes(); $('codeBtn').onclick = () => codes.open(); $('pauseCode').onclick = () => { save(); codes.open(); };
// a new voyage replaces the saved one, so with a save it takes a second tap within 4 s
let newArm = 0; $('playBtn').onclick = () => { const has = !!localStorage.getItem(SAVE) && !saveBad; if (has && performance.now() - newArm > 4000) { newArm = performance.now(); $('playBtn').textContent = '⚠ TAP AGAIN: A NEW VOYAGE REPLACES YOUR SAVED ONE'; setTimeout(() => { if (performance.now() - newArm >= 3900) $('playBtn').textContent = 'NEW VOYAGE'; }, 4000); return; } newArm = 0; begin(false); }; $('contBtn').onclick = () => begin(true);
function toTitle() { state = 'title'; $('hud').classList.add('hidden'); $('title').classList.remove('hidden'); const has = !!localStorage.getItem(SAVE) && !saveBad; $('contBtn').classList.toggle('hidden', !has); { const c = $('contBtn'); c.textContent = 'CONTINUE VOYAGE'; if (has) { let info = ''; try { const sv = JSON.parse(localStorage.getItem(SAVE)); const t = SHIP_TIERS[clamp(Math.round(+sv.tier || 0), 0, SHIP_TIERS.length - 1)]; info = (typeof sv.shipName === 'string' && sv.shipName ? '“' + sv.shipName.slice(0, 20) + '” · ' : '') + t.name + (sv.realm === 'hel' ? ' · in Helheim' : ''); } catch { /* ignore */ } if (info) { const sm = document.createElement('small'); sm.className = 'contInfo'; sm.textContent = info; c.appendChild(sm); } } } $('playBtn').textContent = has ? 'NEW VOYAGE' : 'SET SAIL'; $('playBtn').classList.toggle('ghost', has); if (has) $('contBtn').after($('playBtn')); else $('contBtn').before($('playBtn')); document.body.classList.add('ready'); }
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
  const C = 6, N = Math.floor(WORLD / C), E = HALF - 25, pad = Math.max(T().B * 0.6 + 2.5, T().B * 0.5 + T().L * 0.15 + 1.5), cellOf = (v) => clamp(Math.floor((v + HALF) / C), 0, N - 1), mid = (i) => -HALF + (i + 0.5) * C;
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
  { txt: '⛵ Tap <b>HALF</b> or <b>FULL</b> to raise the sail.', keys: 'W and S', at: () => thrEl.querySelector('[data-n="3"]'), done: () => (boat.throttle || 0) > 0.4 },
  { txt: '☸ Swipe along the <b>wheel</b> to turn.', keys: 'A and D', at: () => 'wheel', done: () => tut.turn > 1.1 },
  { txt: '⏹ Tap <b>STOP</b> to furl the sail.', keys: 'S', at: () => thrEl.querySelector('[data-n="1"]'), done: () => (boat.throttle || 0) <= 0.05 && boat.v < 2 },
  { txt: '👁 Tap <b>TOP</b> to change the view. Try all three.', at: () => $('viewBtn'), done: () => tut.views.size >= 3 },
  { txt: '🔍 <b>Pinch</b> the sea to zoom.', pc: '🔍 Roll the <b>mouse wheel</b> over the sea to zoom.', at: () => 'pinch', done: () => Math.abs(zoom - tut.zoom0) > 0.15 },
  { txt: '🧭 Tap the <b>little map</b> to open the chart. Zoom in on the glowing ✕, then tap it to set a course.', pc: '🧭 Click the <b>little map</b> (or E) to open the chart. Scroll in on the glowing ✕, then click it to set a course.', at: () => $('map'), enter: () => tutTarget(), done: () => tut.chart && tut.zoomed && !!boat.wp && boat.wp !== tut.wp0 },
  { txt: '⚔ <b>Pick your fights.</b> ACTION: dodge and shoot at the helm. CLASSIC: an aim bar, turn by turn. Change it any time in the pause menu.', choice: true, at: () => null, done: () => tut.choice },
  { txt: () => (BROAD.on ? '🦈 <b>A shark!</b> Tap <b>SPEARS</b> when it turns green to stop the bite, then keep throwing.' : '🦈 <b>A shark!</b> Throw <b>SPEARS</b> at its weak spot.'), keys: 'Space throws a spear', at: () => $('fireBtn'), enter: () => { tut.kills0 = P.kills; tutShark(); }, done: () => (tut.mon && tut.mon.dead) || P.kills > (tut.kills0 || 0) },
  { txt: '⚓ Tap <b>DOCK</b>: the crew sail you to the nearest harbour.', at: () => (ctx && ctx.kind === 'dock' ? $('actBtn') : autoOn() ? null : $('dockBtn')), done: () => state === 'harbor' },
  { txt: '🔨 Tap <b>REPAIR</b> to mend the hull. Do it every time you dock.', at: () => { const c = [...$('hbList').querySelectorAll('.card')].find((c) => /Repair the hull/.test(c.textContent)); return c ? c.querySelector('button') : null; }, done: () => state === 'harbor' && P.hp >= maxHp() - 0.5 },
  { txt: '📜 Tap <b>TAKE IT</b> to take a bounty.', at: () => { const c = [...$('hbList').querySelectorAll('.card.bounty button')].find((b) => /TAKE IT/.test(b.textContent)); return c || null; }, done: () => !!P.bounty },
  { txt: () => '📜 <b>Bounty taken: ' + (P.bounty ? bountyText(P.bounty) : '') + '.</b> Now tap <b>SET SAIL</b>.', at: () => $('hbSail'), done: () => state === 'play' },
  { txt: () => { const b = P.bounty; return '📜 <b>Your bounty shows here.</b> ' + (b ? BOUNTY_HOW[b.kind] : '') + ' Then CLAIM it at a harbour.'; }, at: () => $('buff'), done: () => tut.st > 14 || !!(P.bounty && P.bounty.n > 0) },
  { txt: '🏅 Tap <b>⏸</b> then <b>THE SAGA</b> to see your deeds and titles.', at: () => (state === 'paused' ? $('sagaBtn') : $('pauseBtn')), done: () => tut.saga },
];
// the chart's glowing ✕ during the tutorial: open water 60-90 ahead; the first shark waits there
function tutTarget() { for (let k = 0; k < 40; k++) { const a = boat.yaw + rnd(-0.8, 0.8), d = rnd(60, 90), x = boat.x + Math.sin(a) * d, z = boat.z + Math.cos(a) * d; if (Math.abs(x) > HALF - 40 || Math.abs(z) > HALF - 40 || world.blockAt(x, z, 14)) continue; tut.target = { x, z }; return; } tut.target = null; }
const BOUNTY_HOW = { type: 'Their hunting ground is a red circle on the chart: sail there and slay them.', ships: 'Fight the enemy longships you meet.', sea: 'Sail to that sea (📜 on the chart) and slay beasts.', fish: 'FISH at bubbling spots.', fleet: 'Break the raider fleet when it hunts you.', young: "Slay a legend's young at its lair (on the chart)." };
function tutStart() { tut = { i: -1, st: 0, turn: 0, yaw: boat.yaw, mon: null, wait: 0, views: new Set([viewMode]), zoom0: zoom, wp0: null, chart: false, zoomed: false, target: null, choice: false, saga: false }; document.body.classList.add('tutOn'); $('tut').classList.remove('hidden'); tutNext(); }
function tutNext() { tut.i++; const st = TUT[tut.i]; tut.yaw = boat.yaw; tut.turn = 0; tut.st = 0; tut.zoom0 = zoom; tut.wp0 = boat.wp;
  $('tutN').textContent = 'TUTORIAL · ' + (tut.i + 1) + ' / ' + TUT.length; $('tutTxt').innerHTML = (keyPad && st.pc ? st.pc : typeof st.txt === 'function' ? st.txt() : st.txt) + (keyPad && st.keys ? ' <i>On a computer: ' + st.keys + '.</i>' : '') + (st.choice ? '<div class="tutChoice"><button id="tutAct">⚔ ACTION</button><button id="tutCls" class="ghost">🎯 CLASSIC</button></div>' : '');
  if (st.choice) for (const [id, on] of [['tutAct', true], ['tutCls', false]]) $(id).onclick = (e) => { e.stopPropagation(); BROAD.on = on; try { localStorage.setItem('pr_broad', on ? '1' : '0'); } catch (e2) { /* ignore */ } broadLabel(); tut.choice = true; sfx.pickup(); };
  const el = $('tut'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (tut.i) sfx.coins(); if (st.enter) st.enter(); }
function tutEnd(msg) { try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {} tut = null; document.body.classList.remove('tutOn'); $('harbor').style.paddingTop = ''; $('tut').classList.add('hidden'); $('tutHand').classList.add('hidden'); if (msg) say(msg, 4); }
function tutShark() { const want = P.tier - 0.3, vi = MLV.shark.reduce((bi, l, i) => (Math.abs(l - want) < Math.abs(MLV.shark[bi] - want) ? i : bi), 0); const T0 = tut.target && Math.hypot(tut.target.x - boat.x, tut.target.z - boat.z) < 70 ? tut.target : null;
  for (let k = 0; k < 14; k++) { const a = boat.yaw + rnd(-0.7, 0.7), d = rnd(36, 50), x = T0 ? T0.x + rnd(-8, 8) : boat.x + Math.sin(a) * d, z = T0 ? T0.z + rnd(-8, 8) : boat.z + Math.cos(a) * d; if (world.blockAt(x, z, 6)) continue;
    tut.mon = spawnMon({ type: 'shark', v: vi, lv: MLV.shark[vi] }, x, z); tut.mon.state = 'chase'; return; }
  tut.wait = 2; }
function updateTut(dt) { if (!tut) return; const st = TUT[tut.i]; tut.st += dt;
  tut.turn += Math.abs(angDiff(boat.yaw, tut.yaw)); tut.yaw = boat.yaw;
  if (st.enter && (!tut.mon || (!tut.mon.dead && !mons.includes(tut.mon)))) { tut.mon = null; tut.wait -= dt; if (tut.wait <= 0) tutShark(); } // the shark got away or you sank: send another
  if (st.done()) { if (tut.i >= TUT.length - 1) { tutEnd(); say('Skål! The tutorial is done. Explore the seas, grow your ship, and face the legends.', 4); return; } tutNext(); return; }
  // the pointing hand: beside a button (pointing in from the middle of the screen), or swiping along the wheel
  const hand = $('tutHand'), at0 = st.at(), at = state === 'chart' ? null : state === 'harbor' && at0 && !$('harbor').contains(at0) ? null : at0; if (state !== 'harbor') $('harbor').style.paddingTop = ''; $('tut').classList.toggle('strip', !!battle); const fightBtn = battle && st.enter ? ($('bFire') || $('fireBtn')) : null; if (!at || (battle && !fightBtn) || fishing) { hand.classList.add('hidden'); if (!at && !battle && !fishing) placeTut(null, 0, 0, ''); else if (battle) { const el = $('tut'); el.style.left = '8px'; el.style.top = '2px'; el.style.width = 'calc(100vw - 16px)'; } return; }
  if (fightBtn) { const r = fightBtn.getBoundingClientRect(); if (r.width && !(battle.legend && battle.legend.mode !== 'learn' && battle.mon.stState.dive >= 0.5)) { const right = r.left + r.width / 2 > innerWidth / 2, x = right ? r.left - 24 : r.right + 24, y = r.top + r.height / 2, cls = right ? 'R' : 'L'; if (hand._c !== cls) { hand.className = cls; hand._c = cls; hand.textContent = right ? '👉' : '👈'; } hand.classList.remove('hidden'); hand.style.left = x + 'px'; hand.style.top = y + 'px'; } else hand.classList.add('hidden'); const el = $('tut'); el.style.left = '8px'; el.style.top = '2px'; el.style.width = 'calc(100vw - 16px)'; return; }
  let x, y, cls;
  if (at === 'wheel') { const [cx, cy] = helmHub(); x = cx; y = cy - helmBox.R * 0.7; cls = 'swipe'; }
  else if (at === 'pinch') { x = innerWidth / 2 + 40; y = innerHeight * 0.42; cls = 'pinch'; }
  else { const r = at.getBoundingClientRect(); if (!r.width) { hand.classList.add('hidden'); return; } if (at.closest('#throttle') && thrEl.offsetWidth > thrEl.offsetHeight) { x = r.left + r.width / 2; y = r.top - 26; cls = 'D'; } // the tablet telegraph is a row: point down onto it
    else { const right = r.left + r.width / 2 > innerWidth / 2; x = right ? r.left - 24 : r.right + 24; y = r.top + r.height / 2; cls = right ? 'R' : 'L'; } }
  if (hand._c !== cls) { hand.className = cls; hand._c = cls; hand.textContent = { swipe: '👆', R: '👉', L: '👈', D: '👇', pinch: '🤏' }[cls]; }
  hand.classList.remove('hidden'); hand.style.left = x + 'px'; hand.style.top = y + 'px'; placeTut(at, x, y, cls); }
// the tutorial card sits beside what the hand points at: left of the right-hand buttons, above the wheel, the map or the
// sea, and upper-middle when there is nothing to point at (the battle choice)
function placeTut(at, x, y, cls) { const el = $('tut'), W = innerWidth, H = innerHeight, narrow = W < 520, m = 8; el.style.width = narrow ? (W - 112) + 'px' : 'min(92vw, 400px)'; el.style.right = 'auto'; el.style.transform = 'none'; const r = el.getBoundingClientRect(), top = m + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--padTop')) || 0); let cx, cy;
  if (state === 'chart') { const cv = $('chartCv').getBoundingClientRect(), side = W > H && (W - cv.width) / 2 >= 200; if (side) { el.style.width = ((W - cv.width) / 2 - 2 * m) + 'px'; const r2 = el.getBoundingClientRect(); cx = m; cy = H / 2 - r2.height / 2; el.style.left = cx + 'px'; el.style.top = clamp(cy, top, H - r2.height - m) + 'px'; } else { el.style.width = 'min(92vw, 400px)'; const r2 = el.getBoundingClientRect(); cx = W / 2 - r2.width / 2; cy = Math.max(cv.bottom + 44, H - r2.height - m); el.style.left = clamp(cx, m, W - r2.width - m) + 'px'; el.style.top = Math.min(cy, H - r2.height - m) + 'px'; } return; }
  if (state === 'harbor') { cx = W / 2 - r.width / 2; cy = top; $('harbor').style.paddingTop = (cy + r.height + 10) + 'px'; } else if (state === 'paused') { cx = W / 2 - r.width / 2; cy = top; } else if (narrow) { cx = m; const tr = at && at.getBoundingClientRect ? at.getBoundingClientRect() : null; cy = !at ? Math.min(H * 0.22, H - r.height - m) : tr && tr.top < top + r.height + 14 ? tr.bottom + 14 : cls === 'R' ? y - r.height / 2 : (tr ? tr.top : y - 40) - 14 - r.height; }
  else if (!at) { cx = W / 2 - r.width / 2; cy = Math.min(H * 0.22, H - r.height - m); } else if (cls === 'R') { cx = x - 26 - r.width; cy = y - r.height / 2; } else if (cls === 'L') { cx = x + 26; cy = y - r.height / 2; } else if (cls === 'D') { cx = x - r.width / 2; cy = y - 24 - r.height; } else { cx = x - r.width / 2; cy = y - 44 - r.height; }
  el.style.left = clamp(cx, m, W - r.width - m) + 'px'; el.style.top = clamp(cy, top, H - r.height - m) + 'px'; }
$('tutSkip').onclick = (e) => { e.stopPropagation(); tutEnd('Tutorial skipped. HOW TO PLAY can run it again.'); };
$('howTut').onclick = () => { $('how').classList.add('hidden'); tutForce = true; begin(!!localStorage.getItem(SAVE)); };

// ---------- the four seas: a banner when you cross into one, falling snow or ash, volcano smoke and embers, storm flicker ----------
const rw = {}; let curSea = 'home', stormT = 5;
const SEA_INTRO_HEL = { home: ['☠ GJÖLL ☠', 'The black river of the dead'], frost: ['❄ NIFLHEL ❄', 'Frozen mist where the dead wander'], storm: ['🔥 MUSPELHEIM 🔥', 'Seas of fire and burning ships'], mist: ['🦴 NÁSTROND 🦴', 'The corpse shore, where Nidhögg feeds'], warm: ['💀 GINNUNGAGAP 💀', 'Shores of bare bone over the abyss'] };
const SEA_INTRO = { home: ['⚓ HOME WATERS ⚓', 'Green isles around Valholm'], frost: ['❄ THE FROST SEA ❄', 'Ice floes, snow peaks and frost wyrms'], storm: ['🌋 THE STORM SEA 🌋', 'Fire mountains, black rock and lightning'], mist: ['🌫 THE MIST SEA 🌫', 'Dead marshes, old stones and ghost lights'], warm: ['🌴 THE WARM SEA 🌴', 'White sands, palms and coral reefs'] };
function seaBanner(k) { const el = $('seaBanner'), I = (P.realm === 'hel' ? SEA_INTRO_HEL : SEA_INTRO)[k]; el.innerHTML = '<b>' + I[0] + '</b><small>' + I[1] + '</small>'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); sfx.horn(); }
const wrap90 = (d) => ((d + 45) % 90 + 90) % 90 - 45; // flakes and drops live in world space and wrap around the camera target
const fall = (() => { const n = 700, pos = new Float32Array(n * 3), vel = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-45, 45); pos[i * 3 + 1] = rnd(0, 40); pos[i * 3 + 2] = rnd(-45, 45); vel[i] = rnd(0.6, 1.4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, opacity: 0, depthWrite: false }); const p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false; scene.add(p); return { p, m, g, pos, vel, n }; })();
const smoke = createFoam(scene, ocean, 320, { color: 0x3c3836 }), embers = createFoam(scene, ocean, 160, { color: 0xff7a2a });
const ashC = new THREE.Color(0x8a8480), snowC = new THREE.Color(0xffffff), helAsh = new THREE.Color(0x7a6a6e), emberC = new THREE.Color(0xff8a3a), rimeC = new THREE.Color(0xd8e4f4);
const soulFx = createFoam(scene, ocean, 260, { color: 0xc8a0ff });
function updateSeas(dt) {
  world.regionWeights(boat.x, boat.z, rw); let best = 'home', bw = rw.home; for (const k of ['frost', 'storm', 'mist', 'warm']) if (rw[k] > bw) { bw = rw[k]; best = k; }
  if (best !== curSea && bw > 0.62) { curSea = best; if (state === 'play') seaBanner(best); }
  setMusicSea(P.realm === 'hel' ? (curSea === 'storm' ? 'muspel' : 'hel') : curSea); // each sea has its own song (it changes on the next bar line); Helheim has its own two
  updateGates(dt);
  // snow in the Frost Sea, ash in the Storm Sea
  // in Helheim ash drifts down everywhere, embers glow in Muspelheim and rime in Niflhel
  const hel = P.realm === 'hel', sn = rw.frost || 0, as = rw.storm || 0, k = hel ? Math.max(0.5, sn, as) : Math.max(sn, as); fall.p.visible = k > 0.04; if (fall.p.visible) { const ashy = as / (sn + as + 1e-6); if (hel) { fall.m.color.copy(helAsh).lerp(emberC, as).lerp(rimeC, sn * 0.8); fall.m.size = 0.4; } else { fall.m.color.copy(snowC).lerp(ashC, ashy); fall.m.size = 0.55 - ashy * 0.25; } fall.m.opacity = 0.6 * k;
    const sp = hel ? 1.1 + sn * 1.4 : 3.2 - ashy * 1.8, cx = camTgt.x, cz = camTgt.z, P3 = fall.pos; for (let i = 0; i < fall.n; i++) { P3[i * 3 + 1] -= sp * fall.vel[i] * dt; P3[i * 3] += Math.sin(time * 0.8 + i) * dt * 0.6; if (P3[i * 3 + 1] < -1) { P3[i * 3 + 1] = 40; P3[i * 3] = cx + rnd(-45, 45); P3[i * 3 + 2] = cz + rnd(-45, 45); } P3[i * 3] = cx + wrap90(P3[i * 3] - cx); P3[i * 3 + 2] = cz + wrap90(P3[i * 3 + 2] - cz); } fall.g.attributes.position.needsUpdate = true; }
  // volcanoes smoke and spit embers
  for (const v of world.volcanoes) { if (Math.abs(v.x - boat.x) > 230 || Math.abs(v.z - boat.z) > 230) continue;
    if (Math.random() < dt * 5) smoke.add(v.x + rnd(-v.r, v.r), v.z + rnd(-v.r, v.r), { spray: true, y: v.y, vx: rnd(-0.5, 0.5) + 1.2, vz: rnd(-0.5, 0.5), vy: rnd(2.5, 4), g: -0.15, s: rnd(2.5, 4), grow: 1.6, life: 7, a: 0.5 });
    if (Math.random() < dt * 7) embers.add(v.x + rnd(-v.r, v.r) * 0.6, v.z + rnd(-v.r, v.r) * 0.6, { spray: true, y: v.y, vx: rnd(-2, 2), vz: rnd(-2, 2), vy: rnd(5, 10), g: 4, s: 0.35, grow: 0, life: 2, a: 1 }); }
  smoke.update(dt); embers.update(dt); soulFx.update(dt); soulFx.mat.uniforms.uLight.value = 1.8; smoke.mat.uniforms.uLight.value = 0.35 + env.cur.ambient * 0.8; embers.mat.uniforms.uLight.value = 1.6;
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
    if (best && bd > 1) { const [ax, ay] = scr((best.dock.x - boat.x) / bd, (best.dock.z - boat.z) / bd); g.fillStyle = '#6ad0ff'; g.beginPath(); g.arc(c + ax * (R - 4 * dpr), c - ay * (R - 4 * dpr), 3.5 * dpr, 0, 6.28); g.fill(); g.font = 9 * dpr + 'px serif'; g.fillText('⚓', c + ax * (R - 24 * dpr), c - ay * (R - 24 * dpr)); }
    // the sunstone also finds your nearest treasure map's ✕ and your wreck in this realm
    const marks = []; let bm = null, bmd = 1e9; for (const m of P.maps) { if ((m.realm || 'mid') !== P.realm) continue; const d = Math.hypot(m.lx - boat.x, m.lz - boat.z); if (d < bmd) { bmd = d; bm = m; } } if (bm) marks.push([bm.lx, bm.lz, '✕', bm.kind === 'relic' ? '#d08aff' : '#ff6a4a']); if (wreckHere()) marks.push([P.wreck.x, P.wreck.z, '☠', '#e8e0d0']); if (P.realm === 'mid' && !P.beenHel && gateOpen() && world.gate) marks.push([world.gate.x, world.gate.z, '🌀', '#c89aff']);
    for (const [mx, mz, ic, col] of marks) { const d = Math.hypot(mx - boat.x, mz - boat.z); if (d < 1) continue; const [ax, ay] = scr((mx - boat.x) / d, (mz - boat.z) / d); g.fillStyle = col; g.beginPath(); g.arc(c + ax * (R - 4 * dpr), c - ay * (R - 4 * dpr), 3 * dpr, 0, 6.28); g.fill(); g.font = 'bold ' + 9 * dpr + 'px serif'; g.fillText(ic, c + ax * (R - 24 * dpr), c - ay * (R - 24 * dpr)); } }
  const [hx, hy] = scr(Math.sin(boat.yaw), Math.cos(boat.yaw)), L = R - 20 * dpr; g.save(); g.translate(c, c); g.rotate(Math.atan2(hx, hy)); g.fillStyle = '#f2d27a'; g.strokeStyle = '#3a2208'; g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(0, -L); g.lineTo(5 * dpr, 0); g.lineTo(0, L * 0.35); g.lineTo(-5 * dpr, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#5a3a12'; g.beginPath(); g.arc(0, 0, 3 * dpr, 0, 6.28); g.fill(); g.restore();
  const brg = ((Math.atan2(Math.sin(boat.yaw), -Math.cos(boat.yaw)) * 180) / Math.PI + 360) % 360; const txt = DIRS8[Math.round(brg / 45) % 8] + ' ' + Math.round(brg) + '°'; if ($('compTxt').textContent !== txt) $('compTxt').textContent = txt; }


// ---------- main loop ----------
let last = performance.now(), ctxKey = '', fireKey = '';
let timeScale = 1;
// the next frame is asked for first, so one error in a frame can never freeze the game (it is logged, the game runs on)
function frame(now) { requestAnimationFrame(frame); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)) * timeScale; last = now; try { tick(dt); } catch (e) { console.error(e); } }
let mapFlip = 0;
function tick(dt) { time += dt;
  if (state === 'chart' && tut && tut.target) drawMap(chartEl, chartCtx, true);
  if (tut && (state === 'play' || state === 'harbor' || state === 'paused' || state === 'chart')) updateTut(dt);
  if (state === 'play' || state === 'title' || state === 'harbor' || state === 'chart') {
    if (state === 'play') { P.tod = (P.tod + dt / 420) % 1; updateWeather(dt); updateEvents(dt); updateSpawns(dt); updatePods(dt); updateLairs(); updateAuto(dt); boat.fireCd = Math.max(0, boat.fireCd - dt); saveT += dt; if (saveT > 30 && !battle && !fishing) { saveT = 0; save(); } if (P.hp <= 0 && !battle) sink(); }
    if (state !== 'harbor') updateBoat(dt); updateMons(dt); separateMons(); if (battle && state !== 'title') updateBattle(dt); updateSea(dt); updateProjs(dt); minis.update(dt);
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
    $('region').textContent = rname(world.regionAt(boat.x, boat.z)) + (isNight() ? ' · 🌙' : ''); $('wxTxt').textContent = wx.k > 0.3 ? (P.realm === 'hel' && WXNAME_HEL[wx.type]) || WXNAME[wx.type] : ''; $('buff').textContent = [boat.thor > 0 ? '⚡ Thor ×2 damage ' + Math.ceil(boat.thor) + 's' : '', boat.curse > 0 ? '☠ Cursed ' + Math.ceil(boat.curse) + 's' : '', lairHud ? '⚔ Lair wave ' + lairHud : '', P.bounty ? '📜 ' + (P.bounty.n >= P.bounty.need ? 'Bounty done: claim it at a harbour' : bountyText(P.bounty) + ' ' + P.bounty.n + '/' + P.bounty.need) : '', boat.pod ? '🐬 Porpoises +10% speed' : '', boat.boost > 0 ? '💨 Escape +35% speed' : '', boat.bifrost > 0 ? '🌈 Bifröst +25% speed, mending ' + Math.ceil(boat.bifrost) + 's' : '', P.tithe > 0 && P.realm === 'hel' ? '🕯 Tithe +25% souls ' + Math.ceil(P.tithe / 60) + 'm' : '', boat.mending ? '🔨 Crew mending' : ''].filter(Boolean).join(' · '); $('hurt').classList.toggle('thor', boat.thor > 0); }
  else for (const mon of mons) mon.tag.style.display = 'none';
  msgT -= dt; if (msgT <= 0) $('msg').style.opacity = 0; warnT -= dt; if (warnT <= 0) $('warn').innerHTML = '';
  renderer.render(scene, camera); }
// start on the title: the ship rides at anchor off Valholm
{ const h = world.harbors[0]; boat.x = h.dock.x + Math.cos(h.dir) * 12; boat.z = h.dock.z + Math.sin(h.dir) * 12; boat.yaw = Math.atan2(Math.cos(h.dir), Math.sin(h.dir)); }
const hadSave = load(); if (!hadSave) P.hp = maxHp(); rebuildShip(); placeWreck(); toTitle(); env.snap(P.tod, null, world.regionWeights(boat.x, boat.z, {})); camTgt.set(boat.x, 0, boat.z);
requestAnimationFrame(frame);
window.__pr = { get tut() { return tut; }, grounds, groundAt, get fall() { return fall; }, get rain() { return rain; }, broadSwap, startBroadside, broadFire, endBroadside, endLegend, abortFight, BROAD, planRoute, autoDock, cleanSave, giveMap, prizeChoice, startDig, boardInfo, spouts, startAir, liftK, pods, spawnPod, EV, startEvent, aur, get wreck() { return P.wreck; }, sink, get chartView() { return chartView; }, step(n = 30, dt = 1 / 30) { for (let i = 0; i < n; i++) tick(dt); }, helm, setThrottle, set timeScale(v) { timeScale = v; }, dmgLog, P, boat, mons, spots, floats, get world() { return world; }, worlds, setRealm, makeBounty, bountyText, bountyHit, crossRealm, gateAsk, gates, GATES, HULLS, SAILS, perk, UPG, TIER_COST, legendCount, lvShift, spawnTable, ocean, wx, setWeather, spawnMon, startBattle, startFishing, openHarbor, fire, get state() { return state; }, set state(v) { state = v; }, get battle() { return battle; }, minis, MLV, killMon, landBolt, warnRing, spawnSpout, rebuildShip, save, load, camera, renderer, scene, get ship() { return ship; }, setCourse };

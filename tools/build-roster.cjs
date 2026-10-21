// Builds release/valhallas-tide-bestiary.html: every monster and enemy ship with pictures (release/roster-img, captured from
// showcase.html with window.__roster set), what it does, and a notes box per monster. Notes live in the artifact's db
// (collection "notes", doc per id: { text, redesign, at }) so Claude can read them back; localStorage is the fallback.
// Run: node tools/build-roster.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), IMG = path.join(ROOT, 'release', 'roster-img');
const img = (n) => { const f = path.join(IMG, n); return fs.existsSync(f) ? 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64') : ''; };
const SHIPS = ['Faering', 'Karvi', 'Snekkja', 'Skeid', 'Drakkar'];
const lvShow = (lv) => Math.round(lv) + 1, hull = (lv, boss) => Math.round(45 * Math.pow(1.65, lv) * (boss ? 0.8 : 1)), hit = (lv) => Math.round(9 * Math.pow(1.5, lv));
function meets(lv) { const t = []; for (let i = 0; i < 5; i++) if (lv <= i + 1.7 && lv >= i - 1.4) t.push(i); if (!t.length) return 'never at random'; return t.length === 1 ? SHIPS[t[0]] : SHIPS[t[0]] + ' to ' + SHIPS[t[t.length - 1]]; }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- the roster ----------
const SPECIES = [
  { key: 'shark', name: 'Sharks', speed: 10.5, atk: ['Lunges from the right', 'Lunges from the left', 'Leaps to bite'],
    does: ['Fast hunters that cruise just under the surface, so mostly you see the dorsal fin; they leap clear of the water to bite.', 'Jaws-style heads: a pointed snout overhangs a mouth of triangular teeth, and when one bites the snout lifts and the jaw thrusts forward.', 'A shark can take your bait while you fish: a bite starts a battle on the spot.', 'Most common in Home Waters and the Warm Sea.'],
    v: [['Reef Shark', 0, 'The first shark you meet. Grey-blue back, white belly.'], ['Tiger Shark', 0.6, 'Olive with dark stripes, a quarter bigger.', 'Warm Sea'], ['Hammerhead', 1.2, 'Hammer-shaped head, a third bigger.', 'Warm Sea'], ['Great White', 2, 'Three-quarters bigger again, pale belly.']] },
  { key: 'megalodon', name: 'Megalodons', speed: 9.5, atk: ['Rams from the right', 'Rams from the left', 'Surges up to swallow you whole'],
    does: ['Four times a shark\'s length, with a heavier skull, a brow over the eyes and double rows of jagged teeth. Rare.', 'Each type has its own look and its own sea; the Phantom only hunts at night.'],
    v: [['Ancient Megalodon', 3.4, 'Slate green and scarred, crusted with barnacles, amber eyes.', 'Frost Sea'], ['Crested Megalodon', 3.8, 'Orange with dark bands and a crest of spines down its back.', 'Warm Sea'], ['Ravening Megalodon', 4.2, 'Near black, scarred and barnacled, with glowing red eyes.', 'Storm Sea'], ['Shadow Megalodon', 4.6, 'Black with glowing pale bands and cyan eyes.', 'Mist Sea'], ['Phantom Megalodon', 5, 'Ghost white with glowing spots. Night only.']] },
  { key: 'serpent', name: 'Sea Serpents', speed: 9.2, atk: ['Whips its tail from the right', 'Whips its tail from the left', 'Rears up to strike'],
    does: ['Long bodies that arch out of the sea in humps behind a rearing neck; the head rises high when it strikes.', 'The head: a scowling brow over sunken glowing eyes, long fangs and a wide gape, joined to the neck by a ball joint.', 'Every sea has its own breed. Serpent ambushes (the water boils, then one bursts up beside you) use the local breed.', 'Twice as common in the Frost Sea.'],
    v: [['Emerald Serpent', 1.3, 'Green with a gold diamond pattern and gold fins. Found everywhere.'], ['Crimson Wyrm', 2, 'Blood red with dark bands and black horns.', 'Storm Sea'], ['Azure Serpent', 2.4, 'Deep blue with glowing cyan stripes.'], ['Golden Naga', 3, 'Gold scales, purple belly, long whiskers.', 'Warm Sea'], ['Obsidian Horror', 3.6, 'Black, with glowing red runes and horns.', 'Mist Sea'], ['Frost Wyrm', 3, 'Ice blue and white, spotted, with ice horns.', 'Frost Sea'], ['Sea Dragon', 4.1, 'Sea-green with red bat wings and whiskers.', 'Storm Sea']] },
  { key: 'eel', name: 'Lightning Eels', speed: 10, atk: ['Arcs lightning from the right', 'Arcs lightning from the left', 'Coils to shock'],
    does: ['Thin, fast serpents with glowing stripes. Lightning arcs crackle around them and flare when they strike.', 'Built on the serpent body with a thinner neck, joined to the head by the same ball joint, with no gap.', 'Three times as common in the Storm Sea.'],
    v: [['Thunder Eel', 0.4, 'Navy with glowing yellow stripes and yellow sparks.', 'Storm Sea'], ['Venom Eel', 1, 'Dark green with glowing lime stripes.', 'Mist Sea'], ['Ember Eel', 1.6, 'Charcoal with glowing orange spots.', 'Storm Sea']] },
  { key: 'octopus', name: 'Giant Octopuses', speed: 7, atk: ['Swings a tentacle from the right', 'Swings a tentacle from the left', 'Slams down its arms'],
    does: ['Sit at the surface with eight arms curling out of the water. Slow, but they hit hard for their level.', 'More common in the Storm and Mist seas.'],
    v: [['Crimson Octopus', 0.9, 'Red with pale spots and gold eyes.'], ['Violet Octopus', 1.6, 'Purple with green eyes.'], ['Blue-Ringed Octopus', 2.2, 'Gold with glowing blue rings.'], ['Ghost Octopus', 2.8, 'Pale white with cyan eyes.', 'Mist and Frost seas']] },
  { key: 'crab', name: 'Giant Crabs', speed: 6, atk: ['Snaps a claw from the right', 'Snaps a claw from the left', 'Crushes with both claws'],
    does: ['Armoured and slow, easy to outrun. Big claws, stalk eyes, spiked legs.', 'Three times as common in the Warm Sea, rare in the Frost Sea.'],
    v: [['Rust Crab', 1, 'Orange-red shell.', 'Warm Sea'], ['Iron Crab', 2, 'Blue-grey armour, gold eyes.'], ['Lava Crab', 3, 'Black shell with glowing orange cracks.', 'Storm Sea']] },
  { key: 'angler', name: 'Abyssal Anglers', speed: 7.5, atk: ['Snaps from the right', 'Snaps from the left', 'Lunges with its jaws'],
    does: ['Built on the real deep-sea anglerfish: a huge upturned mouth with an underbite, long needle fangs leaning inward, tiny eyes set high, lumpy dark skin.', 'Night hunters: three times as common after dark and rare by day. The glowing lure on its rod gives it away.', 'Three times as common in the Mist Sea.'],
    v: [['Deep Angler', 2, 'Dark body with a cyan lure.', 'Mist Sea'], ['Pale Angler', 3, 'Bone-pale body with a gold lure and red eyes.']] },
  { key: 'jelly', name: 'Storm Jellies', speed: 1.2, atk: ['Stings from the right', 'Stings from the left', 'Pulses'],
    does: ['Drift in groups of three and never chase. Touching one stings for 4% of your hull instead of starting a battle; sailing through fast tears it apart.', 'Poor loot: no iron and less gold. The FIGHT button never targets them.', 'Twice as common in the Storm Sea.'],
    v: [['Pink Stormjelly', 0, 'Glowing pink bell and trailing tentacles.', 'Warm Sea'], ['Blue Stormjelly', 0.3, 'Glowing blue.', 'Frost Sea'], ['Gold Stormjelly', 0.5, 'Glowing gold.', 'Warm Sea']] },
  { key: 'leviathan', name: 'Leviathans', speed: 8.5, atk: ['Snaps three jaws from the right', 'Snaps three jaws from the left', 'Strikes with all three heads'],
    does: ['Three-headed sea dragons with no limbs: a serpent body that splits at the chest into three necks, each with its own head. The necks weave out of step and all three strike together.', 'Always hostile. Twice as common in the Frost Sea.'],
    v: [['Grey Leviathan', 2, 'Slate grey and scarred, dark red frills, amber eyes.'], ['White Leviathan', 3, 'Bone white and scarred, black horns, red eyes.', 'Frost Sea'], ['Black Leviathan', 4.2, 'Black with glowing red runes, red horns and gold eyes.']] },
  { key: 'squid', name: 'Giant Squid', speed: 7.5, atk: ['Lashes a tentacle from the right', 'Lashes a tentacle from the left', 'Drags at the hull'],
    does: ['The old kraken shape, now a beast of the open sea: a long finned mantle rising at an angle, eight arms and two long clubbed tentacles. In an action fight it comes for the rail like an octopus; in a classic fight it may wrap your hull.', 'Hostile. Found in the Mist Sea (twice as often) and the Frost Sea; its hunting ground, Squid deep, is marked on the chart.'],
    v: [['Abyssal Squid', 3.6, 'Dark red with pale spots, amber eyes.'], ['Storm Squid', 4.2, 'Slate grey with glowing cyan rings.', 'Mist Sea'], ['Elder Squid', 4.8, 'Moss green and scarred, red eyes.']] },
  { key: 'porpoise', name: 'Porpoises', friendly: true, speed: 'about your own', atk: [],
    does: ['Friendly. A pod of three to five finds you now and then, swims alongside and leaps. While two or more ride your bow wave you sail 10% faster.', 'They never fight; spears and battles ignore them. Never in the Storm Sea.'],
    v: [['Harbour Porpoise', 0, 'Grey back, pale belly.'], ['Spotted Porpoise', 0, 'Grey with pale spots.'], ['Painted Porpoise', 0, 'Black and white.']] },
];
const LEGENDS = [
  { key: 'kraken', name: 'The Kraken', lair: "Kraken's Maw, far north-east", need: 'Snekkja', speed: 6, atk: ['Sweeps a tentacle from the right', 'Sweeps a tentacle from the left', 'Drags at the hull'], lv: 5,
    does: 'A true giant, octopus-shaped since v1.2.0: a tall crested dome of bone, a heavy brow over glowing eyes, eight suckered arms. Each eye is about as long as a Snekkja. It lies mostly underwater with tentacles thicker than your hull rising all around you, and in battle the camera looks past your ship at one great eye. Sleeps at its lair until you sail in with a Snekkja or bigger.',
    v: [['Bone Kraken', true, 'Bone white with a crested, spined dome, a heavy brow, deep green eyes and suckered arms (from Sean\'s picture, v1.2.0). This is the one in the game.'], ['Abyssal Kraken', false, 'Dark red, amber eyes. Designed but not used yet.'], ['Storm Kraken', false, 'Slate grey with glowing cyan rings. Designed but not used yet.'], ['Elder Kraken', false, 'Moss green and scarred, red eyes. Designed but not used yet.']] },
  { key: 'jormungandr', name: 'Jormungandr', lair: "Serpent's Coil, far north", need: 'Skeid', speed: 9, atk: ['Coils in from the right', 'Coils in from the left', 'Strikes with venom'], lv: 6.2,
    does: 'The world serpent: a serpent body three times thicker and far longer, with glowing runes, bone horns and the serpents\' new head and neck joint. Rises when you reach its lair in a Skeid or bigger.',
    v: [['Jormungandr', true, 'Deep green with glowing jade runes. This is the one in the game.'], ['Jormungandr the Ashen', false, 'Ash grey with glowing orange runes. Designed but not used yet.']] },
  { key: 'elder', name: 'The Elder One', lair: "R'lyeh, far south-west", need: 'Drakkar', speed: 5, atk: ['Claws from the right', 'Claws from the left', 'Calls the crushing deep'], lv: 5.6,
    does: 'The Cthulhu-like god: a squid face with twelve feeding tentacles and a pair of small upper eyes, a neck into a broad shoulder yoke, arms that flow out of it in one piece to clawed, webbed hands, rib plates, back spines and great wings with clawed tips. Rises at R\'lyeh for a Drakkar.',
    v: [['The Dreamer', true, 'Moss green with yellow eyes. This is the one in the game.'], ['Void Dreamer', false, 'Purple with a crown and glowing cyan eyes. Designed but not used yet.'], ['Drowned God', false, 'Bone white with a crown and green eyes. Designed but not used yet.']] },
];
const SHIPFOES = [
  { id: 'raider-0', name: 'Black Sail Raiders', img: 'raider-0.jpg', lv: 'Lv 1 to 5 (any ship size)', what: 'Black sail with a red emblem, black and red shields.' },
  { id: 'raider-1', name: 'Sons of the Wolf', img: 'raider-1.jpg', lv: 'Lv 1 to 5', what: 'Grey and bone striped sail with a black wolf head.' },
  { id: 'raider-2', name: 'Jade Fleet', img: 'raider-2.jpg', lv: 'Lv 1 to 5', what: 'Green and gold striped sail with a jade emblem.' },
  { id: 'raider-3', name: 'Blood Axes', img: 'raider-3.jpg', lv: 'Lv 1 to 5', what: 'Blood red sail with three gold axe blades.' },
  { id: 'ghost-0', name: 'Draugr Ghost Ship', img: 'ghost-0.jpg', lv: 'Lv 5', what: 'Ragged see-through sail and a dead crew, all glowing green. Sails at night, or any time in the Mist Sea, once you have a Snekkja.' },
  { id: 'treasure-0', name: 'Treasure Knarr', img: 'treasure-0.jpg', lv: 'Your level', what: 'Golden sail with a coin, chests with glowing gold lids, no weapons. A sea event: it runs from you at 80% of your top speed and throws cargo overboard as you close in. Catch it to board her (you strike first, it hits weakly) for triple gold.' },
];

// ---------- page ----------
const cards = [];
const noteBox = (id, label, flag = 'Needs a redesign') => `<div class="note" data-id="${id}"><label for="n-${id}">${esc(label)}</label><p class="reply" hidden></p><textarea id="n-${id}" rows="2" placeholder="What should change? Shape, colour, size, how it moves…"></textarea><div class="noterow"><button type="button" class="flag" aria-pressed="false">${esc(flag)}</button><span class="st" aria-live="polite"></span></div></div>`;
function variantCard(id, name, chips, lines, sea, full, seaCap = '') {
  cards.push(id);
  return `<article class="card" id="${id}"><div class="pics">${sea ? `<figure><img src="${sea}" alt="${esc(name)} in the sea" loading="lazy" width="300" height="300"><figcaption>${seaCap || 'In the sea'}</figcaption></figure>` : ''}${full ? `<figure><img src="${full}" alt="${esc(name)}, full body" loading="lazy" width="300" height="300"><figcaption>Full body</figcaption></figure>` : ''}</div>
<div class="body"><h3>${esc(name)}</h3><div class="chips">${chips.map((c) => `<span class="chip${c[1] ? ' ' + c[1] : ''}">${esc(c[0])}</span>`).join('')}</div>${lines.map((l) => `<p>${l}</p>`).join('')}${noteBox(id, 'Notes for ' + name)}</div></article>`;
}
let nav = '', sections = '';
for (const sp of SPECIES) {
  nav += `<a href="#sp-${sp.key}">${sp.name}</a>`;
  let vs = '';
  sp.v.forEach(([name, lv, look, where], i) => {
    const chips = sp.friendly ? [['Friendly', 'sea']] : [['Lv ' + lvShow(lv), 'lv'], ['Hull ' + hull(lv)], ['Hits ' + hit(lv)]]; if (where) chips.push(['Common: ' + where, 'sea']);
    vs += variantCard(sp.key + '-' + i, name, chips, sp.friendly ? [esc(look)] : [esc(look), 'Meets ships from <b>' + meets(lv) + '</b>.'], img(sp.key + '-' + i + '.jpg'), img(sp.key + '-' + i + '-full.jpg'));
  });
  sections += `<section class="species" id="sp-${sp.key}"><header><h2>${sp.name}</h2><span class="count">${sp.v.length} kinds</span></header>
<div class="about"><ul>${sp.does.map((d) => `<li>${esc(d)}</li>`).join('')}<li>Speed ${sp.speed} <span class="dim">(your ships sail at 9 to 13)</span>.</li>${sp.atk.length ? `<li>In battle it ${sp.atk.map((a) => '<em>' + esc(a.toLowerCase()) + '</em>').join(', ').replace(/, ([^,]*)$/, ' or $1')}.</li>` : ''}</ul>${noteBox('sp-' + sp.key, 'Notes for all ' + sp.name)}</div>
<div class="grid">${vs}</div></section>`;
}
nav += '<a href="#legends">Legends</a><a href="#ships">Ships</a><a href="#mechanics">Game mechanics</a>';
let leg = '';
for (const L of LEGENDS) {
  let vs = '';
  L.v.forEach(([name, used, look], i) => {
    const chips = used ? [['Lv ' + lvShow(L.lv), 'lv'], ['Hull ' + hull(L.lv, true)], ['Hits ' + hit(L.lv)], ['Lair boss', 'boss']] : [['Not in the game yet', 'unused']];
    vs += variantCard(L.key + '-' + i, name, chips, [esc(look)], img(L.key === 'kraken' && used ? 'kraken-giant.jpg' : L.key + '-' + i + '.jpg'), img(L.key + '-' + i + '-full.jpg'), L.key === 'kraken' && used ? 'Beside a Snekkja' : '');
  });
  leg += `<div class="legend" id="sp-${L.key}"><header><h3 class="lh">${L.name}</h3><span class="count">${esc(L.lair)} · needs a ${L.need}</span></header><div class="about"><ul><li>${esc(L.does)}</li><li>Speed ${L.speed}. Attacks three times a turn: ${L.atk.map((a) => '<em>' + esc(a.toLowerCase()) + '</em>').join(', ').replace(/, ([^,]*)$/, ' or $1')}.</li></ul>${noteBox('sp-' + L.key, 'Notes for ' + L.name)}</div><div class="grid">${vs}</div></div>`;
}
sections += `<section class="species" id="legends"><header><h2>Legends</h2><span class="count">3 bosses</span></header><div class="about"><ul><li>They never appear at random. Each sleeps in its lair, marked on the map, and rises when you sail in with a big enough ship.</li><li>Slay all three for the LORD OF THE SEA ending.</li></ul></div>${leg}</section>`;
let sh = '';
for (const s of SHIPFOES) sh += variantCard('ship-' + s.id, s.name, [[s.lv, 'lv']], [esc(s.what)], img(s.img), '');
sections += `<section class="species" id="ships"><header><h2>Ships at sea</h2><span class="count">6 kinds</span></header><div class="about"><ul><li>Raider longships come in every ship size (a raider's level is its size). They shoot four-arrow volleys from 12 to 34 away, then fight a ship battle. Half again as common in the Mist Sea.</li><li>Raider fleets (a sea event) bring two to four ships of one clan, led by a Warlord one size bigger. Sink them all for their war chest.</li><li>Winning a ship battle pays timber, iron and gold.</li></ul>${noteBox('sp-ships', 'Notes for all ships')}</div><div class="grid">${sh}</div></section>`;

// ---------- game mechanics (tools/roster-mechanics.cjs): a card and a notes box for every mechanic ----------
const MECH = require('./roster-mechanics.cjs'); let mech = '', mechN = 0;
for (const [group, items] of MECH) { let cs = ''; for (const [key, name, ...lines] of items) { mechN++; cards.push('mech-' + key); cs += `<article class="card mech" id="mech-${key}"><div class="body"><h3>${esc(name)}</h3>${lines.map((l) => '<p>' + esc(l) + '</p>').join('')}${noteBox('mech-' + key, 'Notes for ' + name, 'Needs a change')}</div></article>`; }
  mech += `<div class="legend" id="mg-${esc(group).toLowerCase().replace(/[^a-z]+/g, '-')}"><header><h3 class="lh">${esc(group)}</h3><span class="count">${items.length} mechanics</span></header><div class="grid">${cs}</div></div>`; }
sections += `<section class="species" id="mechanics"><header><h2>Game mechanics</h2><span class="count">${mechN} mechanics (v0.8.7)</span></header><div class="about"><ul><li>Everything the game does, as it stands now: sailing, the world, fighting, harbours and the ship, fishing and treasure, Helheim, saving. Each has a notes box and a <b>Needs a change</b> flag, like the monsters.</li><li>Numbers are the game's own (ship sizes, levels, percentages), so a note can say what should move and by how much.</li></ul>${noteBox('mech-general', 'Notes on the game as a whole (the loop, pacing, what is missing)', 'Needs a change')}</div>${mech}</section>`;

const CSS = `
/* layout: a long single-column bestiary; species blocks of variant cards (2 up on wide screens), sticky jump bar */
:root { --bg: #15100b; --panel: #211810; --panel2: #2a1f15; --line: #43311f; --ink: #efe3c8; --muted: #b9a88a; --gold: #d8b04a; --gold-hi: #f2d27a; --sea: #5cc4d2; --flag: #e2683c; --ok: #9fd46e;
  --display: "Grenze Gotisch", "Georgia", serif; --body: "Alegreya", "Georgia", serif; --label: "Alegreya Sans SC", "Trebuchet MS", sans-serif; color-scheme: dark; }
body { background: var(--bg); color: var(--ink); font: 17px/1.5 var(--body); padding-block: 20px 60px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.wrap { max-width: 1060px; margin: 0 auto; display: grid; gap: 28px; }
h1, h2, .lh { font-family: var(--display); font-weight: 700; color: var(--gold-hi); text-wrap: balance; margin: 0; letter-spacing: .5px; }
h1 { font-size: clamp(40px, 9vw, 72px); line-height: .95; }
h2 { font-size: clamp(30px, 6vw, 44px); line-height: 1; }
.lh { font-size: 30px; }
h3 { margin: 0; font: 700 21px/1.2 var(--body); color: var(--ink); }
.intro { display: grid; gap: 10px; max-width: 68ch; }
.intro p { margin: 0; color: var(--muted); }
.rules { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: grid; gap: 6px; font-size: 15.5px; }
.rules b { color: var(--gold-hi); font-weight: 700; }
.tags span { font-family: var(--label); font-size: 14px; padding: 0 6px; border-radius: 4px; background: #0006; }
#bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); padding-block: 10px; border-bottom: 1px solid var(--line); display: grid; gap: 8px; }
#bar nav { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
#bar nav a { flex: none; font: 15px var(--label); letter-spacing: .6px; color: var(--ink); text-decoration: none; padding: 5px 11px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); }
#bar nav a:hover, #bar nav a:focus-visible { border-color: var(--gold); color: var(--gold-hi); outline: none; }
.tools { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; font: 15px var(--label); letter-spacing: .4px; color: var(--muted); }
.tools b { color: var(--gold-hi); font-variant-numeric: tabular-nums; }
button { font: 700 15px var(--label); letter-spacing: .6px; cursor: pointer; border-radius: 8px; }
#copyAll { background: linear-gradient(var(--gold-hi), var(--gold)); color: #1e140c; border: 0; padding: 7px 14px; }
#onlyFlag { background: transparent; color: var(--ink); border: 1px solid var(--line); padding: 6px 12px; }
#onlyFlag[aria-pressed="true"] { border-color: var(--flag); color: var(--flag); }
button:focus-visible, textarea:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 2px; }
#copyOut { width: 100%; min-height: 120px; background: #0d0906; color: var(--ink); border: 1px solid var(--gold); border-radius: 8px; padding: 8px; font: 14px/1.4 ui-monospace, Menlo, Consolas, monospace; }
.species { display: grid; gap: 16px; scroll-margin-top: 110px; }
.species > header, .legend > header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; border-bottom: 2px solid var(--gold); padding-bottom: 6px; }
.legend > header { border-bottom-width: 1px; }
.count { font: 15px var(--label); letter-spacing: .8px; color: var(--muted); }
.about { display: grid; gap: 12px; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); align-items: start; }
.about ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
.about em { font-style: italic; color: var(--gold-hi); }
.dim { color: var(--muted); }
.legend { display: grid; gap: 14px; scroll-margin-top: 110px; }
.grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.card { display: grid; grid-template-columns: minmax(0, 1fr); background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; scroll-margin-top: 110px; }
.card.mech .body p { color: var(--ink); }
.card.has { border-color: #6a5330; } .card.flagged { border-color: var(--flag); }
.pics { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 2px; background: #000; }
figure { margin: 0; position: relative; }
figure img { display: block; width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; }
figcaption { position: absolute; left: 6px; bottom: 6px; font: 13px var(--label); letter-spacing: .6px; color: #fff; background: #000a; padding: 1px 7px; border-radius: 4px; }
.body { padding: 12px 14px 14px; display: grid; gap: 8px; min-width: 0; }
.body p { margin: 0; font-size: 16px; }
.body b { color: var(--gold-hi); font-weight: 700; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { font: 14px var(--label); letter-spacing: .5px; padding: 1px 8px; border-radius: 5px; background: var(--panel2); border: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.chip.lv { background: var(--gold); color: #1e140c; border-color: var(--gold); font-weight: 700; }
.chip.sea { color: var(--sea); border-color: #2c5a60; }
.chip.boss { color: var(--flag); border-color: #6a3220; }
.chip.unused { color: var(--muted); border-style: dashed; }
.note { display: grid; gap: 5px; }
.note label { font: 14px var(--label); letter-spacing: .6px; color: var(--muted); }
.note textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 54px; background: #0d0906; color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font: 16px/1.4 var(--body); }
.note textarea::placeholder { color: #7d6c55; }
.noterow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.flag { background: transparent; color: var(--muted); border: 1px dashed var(--line); padding: 4px 10px; font-weight: 400; }
.flag[aria-pressed="true"] { color: #1e140c; background: var(--flag); border: 1px solid var(--flag); font-weight: 700; }
.st { font: 13px var(--label); letter-spacing: .5px; color: var(--muted); }
.reply { margin: 0; padding: 6px 10px; border-left: 3px solid var(--ok); background: #1a2414; color: #d6ecc4; font-size: 15px; border-radius: 0 6px 6px 0; }
.st.ok { color: var(--ok); } .st.bad { color: var(--flag); }
body.onlyflag .card:not(.flagged) { display: none; }
body.onlyflag .species .about, body.onlyflag .legend .about { display: none; }
body.onlyflag .legend:not(:has(.card.flagged)) { display: none; }
footer { color: var(--muted); font-size: 14px; }
@media (max-width: 720px) { .grid { grid-template-columns: minmax(0, 1fr); } .about { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
`;

const JS = `
(function () {
  var notes = {}; var db = null; var timers = {}; var saving = {}; var queued = {}; var synced = false;
  var LS = 'pr_roster_notes';
  function readLocal() { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
  function writeLocal() { try { localStorage.setItem(LS, JSON.stringify(notes)); } catch (e) { /* ignore */ } }
  var boxes = {}; document.querySelectorAll('.note').forEach(function (el) { boxes[el.dataset.id] = el; });
  function nameOf(id) { var el = boxes[id]; return el ? el.querySelector('label').textContent.replace(/^Notes for /, '') : id; }
  function paint(id) { var el = boxes[id], n = notes[id] || {}; if (!el) return; var ta = el.querySelector('textarea'), fl = el.querySelector('.flag');
    if (document.activeElement !== ta && ta.value !== (n.text || '')) ta.value = n.text || ''; var rp = el.querySelector('.reply'); rp.hidden = !n.reply; rp.textContent = n.reply ? 'Claude: ' + n.reply : '';
    fl.setAttribute('aria-pressed', n.redesign ? 'true' : 'false');
    var card = el.closest('.card'); if (card) { card.classList.toggle('has', !!(n.text && n.text.trim())); card.classList.toggle('flagged', !!n.redesign); } }
  function tally() { var t = 0, f = 0; Object.keys(notes).forEach(function (k) { var n = notes[k]; if (n.text && n.text.trim()) t++; if (n.redesign) f++; }); document.getElementById('nCount').textContent = t; document.getElementById('fCount').textContent = f; }
  function status(id, text, cls) { var el = boxes[id]; if (!el) return; var s = el.querySelector('.st'); s.textContent = text; s.className = 'st' + (cls ? ' ' + cls : ''); }
  async function save(id) { var body = { text: (notes[id] || {}).text || '', redesign: !!(notes[id] || {}).redesign, reply: (notes[id] || {}).reply || '', at: new Date().toISOString() }; writeLocal();
    if (!db) { status(id, 'Saved on this device', 'ok'); return; }
    if (saving[id]) { queued[id] = true; return; } saving[id] = true; status(id, 'Saving…');
    try { if (!body.text && !body.redesign && !body.reply) await db.collection('notes').doc(id).delete(); else await db.collection('notes').doc(id).set(body); status(id, 'Saved', 'ok'); }
    catch (e) { status(id, e && e.code === 'quota_exceeded' ? 'Notes are full: clear some old ones' : 'Not saved: kept on this device', 'bad'); }
    saving[id] = false; if (queued[id]) { queued[id] = false; save(id); } }
  Object.keys(boxes).forEach(function (id) { var el = boxes[id], ta = el.querySelector('textarea'), fl = el.querySelector('.flag');
    ta.addEventListener('input', function () { notes[id] = notes[id] || {}; notes[id].text = ta.value; paint(id); tally(); status(id, 'Typing…'); clearTimeout(timers[id]); timers[id] = setTimeout(function () { save(id); }, 900); });
    ta.addEventListener('blur', function () { if (timers[id]) { clearTimeout(timers[id]); timers[id] = null; save(id); } });
    fl.addEventListener('click', function () { notes[id] = notes[id] || {}; notes[id].redesign = !notes[id].redesign; paint(id); tally(); save(id); }); });
  notes = readLocal(); Object.keys(boxes).forEach(paint); tally();
  document.getElementById('onlyFlag').addEventListener('click', function () { var on = document.body.classList.toggle('onlyflag'); this.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  document.getElementById('copyAll').addEventListener('click', function () { var lines = [];
    Object.keys(boxes).forEach(function (id) { var n = notes[id]; if (!n || (!(n.text && n.text.trim()) && !n.redesign)) return; lines.push(nameOf(id) + ' [' + id + ']' + (n.redesign ? ' (REDESIGN)' : '') + ': ' + (n.text || '').trim()); });
    var text = lines.length ? 'Valhalla's Tide notes\\n' + lines.join('\\n') : 'No notes yet.'; var out = document.getElementById('copyOut'); var msg = document.getElementById('copyMsg');
    function shown() { out.hidden = false; out.value = text; out.focus(); out.select(); }
    try { navigator.clipboard.writeText(text).then(function () { msg.textContent = 'Copied ' + lines.length + ' notes'; }, function () { shown(); msg.textContent = 'Press and hold the box below, then Copy'; }); } catch (e) { shown(); msg.textContent = 'Press and hold the box below, then Copy'; } });
  // notes live in the artifact's store so Claude can read them back; this device keeps a copy
  var where = document.getElementById('where');
  (async function () { try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
    if (!db) { where.textContent = 'Notes save on this device. Tap Copy all notes and paste them to Claude.'; return; }
    where.textContent = 'Notes save to this page as you type, so Claude can read them.';
    db.collection('notes').onSnapshot(function (snap) { var seen = {}; snap.docs.forEach(function (d) { var b = d.data() || {}; seen[d.id] = 1; if (saving[d.id] || timers[d.id]) return; notes[d.id] = { text: b.text || '', redesign: !!b.redesign, reply: b.reply || '' }; paint(d.id); });
      // notes written on this device before the store answered: push them up once
      if (!synced && !snap.metadata.fromCache) { synced = true; Object.keys(notes).forEach(function (id) { var n = notes[id]; if (!seen[id] && !saving[id] && !timers[id] && ((n.text && n.text.trim()) || n.redesign)) setTimeout(function () { save(id); }, 0); }); }
      writeLocal(); tally(); }, function () { where.textContent = 'Notes save on this device for now. Tap Copy all notes and paste them to Claude.'; db = null; });
  })();
})();
`;

const total = SPECIES.reduce((s, sp) => s + sp.v.length, 0) + LEGENDS.reduce((s, l) => s + l.v.length, 0);
const html = `<title>Valhalla's Tide Bestiary</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,700;1,400&family=Alegreya+Sans+SC:wght@400;700&family=Grenze+Gotisch:wght@700&display=swap">
<style>${CSS}</style>
<div class="wrap">
<div class="intro"><h1>Valhalla's Tide Bestiary</h1>
<p>Every creature and enemy ship in the game: ${total} kinds in 13 families (one of them friendly), plus 6 ships, and now (v0.8.7) <a href="#mechanics" style="color:var(--gold-hi)">every game mechanic</a> at the end, each with its own notes box. Each one has a picture in the sea (how you meet it) and a full-body picture with the sea taken away, so you can judge the whole model.</p>
<p>Write what you would change in any box and tap <b>Needs a redesign</b> to flag it. There is a box for each kind and one for each whole family (use that for changes to the shared body, like the eel's neck).</p></div>
<div class="rules"><div><b>Level.</b> The name tag shows Lv. Its colour compares it with your ship: <span class="tags"><span style="color:#7dff3a">green</span> weaker, <span style="color:#fff">white</span> even, <span style="color:#ffb03a">orange</span> stronger, <span style="color:#ff4a3a">red</span> much stronger, <span style="color:#d06aff">purple</span> deadly.</span></div>
<div><b>Hull and Hits</b> are its health and one hit before your shields. Monsters come from about one level below your ship to nearly two above, so <b>Meets ships</b> says which ship sizes run into it.</div>
<div><b>Chasing.</b> A stronger monster chases at 86% of your top speed and gives up after 24 seconds. Touching one starts a battle where it strikes first; tap FIGHT to strike first yourself.</div></div>
<div id="bar"><nav aria-label="Jump to">${nav}</nav><div class="tools"><span><b id="nCount">0</b> notes · <b id="fCount">0</b> flagged</span><button id="onlyFlag" type="button" aria-pressed="false">Show flagged only</button><button id="copyAll" type="button">Copy all notes</button><span id="copyMsg" aria-live="polite"></span></div><textarea id="copyOut" readonly hidden></textarea><div class="tools" id="where">Notes save to this page as you type.</div></div>
<section class="species" id="general"><header><h2>Overall</h2></header>${noteBox('general', 'Notes for the whole roster (anything that applies to every monster)')}</section>
${sections}
<footer>Pictures captured from the game's showcase page. Levels, hull and hits follow the game's formulas (hull 45 × 1.65 per level, a hit 9 × 1.5 per level; legends at 80% hull).</footer>
</div>
<script>${JS}</script>`;
const out = path.join(ROOT, 'release', 'valhallas-tide-bestiary.html'); fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB,', cards.length, 'cards');

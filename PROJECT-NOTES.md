# Pats Reign: project notes

READ THIS FIRST after a context compaction. Current as of 2026-10-19 (v0.1.0).

## What it is
A phone-first Viking ocean game. Sail a longship on a 1200 x 1200 sea (Megacity in Tornado Alley is about 140 across),
avoid or fight sea monsters, fish up supplies, upgrade at harbours, survive weather, slay three legends.
Same stack as Dead City (D:\ClaudeCode\010_2026-10-16_newgame): Three.js 0.170 + Vite 6, plain JS, synthesized audio.

## Pages
- index.html + src/main.js: the game. Debug hook `window.__pr` (P, boat, mons, setWeather, spawnMon, startBattle, startFishing, openHarbor, landBolt, warnRing, spawnSpout, rebuildShip, timeScale, dmgLog).
- showcase.html + src/showcase.js + src/showcase-monsters.js: asset gallery (ship tiers, raiders, ghost ship, every monster and variant, times of day, weather, rogue wave, waterspout, sea tornado). Debug hook `window.__sc`, `__showMonster(type, variant)`.

## Modules
- src/ocean.js: water. 170x170 grid following the camera, 4 Gerstner waves on the GPU; `heightAt`/`tiltAt` run the same maths in JS (undoing the crest push), so everything floats on the visible surface. Detail normals + Worley foam texture, density-based foam (crests, shores, rogue crest, hull ring), sun glints, sky reflection, light through crests, shore texture (shallows turquoise, waves damped near land). `setHulls` (up to 6): near each hull the sea blends to that hull's waterline plane so crests can't cut through the planks. `rogue` = a moving sech^2 swell + trough (`{x,z,dx,dz,H,w,Lc,k}`). Far ring + sky dome. `createFoam`: instanced wake/spray discs.
- src/env.js: time of day looks (dawn/day/dusk/night) and weather overlays (storm/rain/fog/calm), blended and pushed to ocean uniforms, fog, lights. Horizon colour = fog colour (no seam).
- src/ship.js: `buildShip(tier, up, pal, seed)`. Lofted clinker hull (overlapping strakes, tar below waterline, painted top strake), inner skin, gunwale cap, plank deck, benches, ribs, curved stem/stern posts, heads (plain / spiral / serpent / dragon / royal gold dragon + tail), mast/yard/billowing sail (canvas textures: Pat's crest), rigging, pennant, crew of Vikings, steering oar, instanced rowing oars. Upgrades shown: shields (3 looks), iron plates, ram, ballista (twin at 3), fire pots, cargo. Invisible gunwale "water mask" drawn before the sea. Raider palettes + ghost ship.
- src/monsters.js: `makeMonster(type, variant, scale)` -> `{ g, size, top, anim(dt, st), mats }`. Shark (5), serpent (7 incl. winged Sea Dragon), eel (3, lightning arcs), octopus (4), kraken (3), crab (3), angler (2), jelly (3), whale (3), elder (3, Cthulhu-like), jormungandr (2). SpineTube bodies follow the head's trail and arch out of the sea.
- src/geom.js: material cache, part/grp/rod helpers, taperTube, SpineTube (live tube + dorsal fin), glowVC (vertex-colour glow), fin/wing shapes.
- src/world.js: islands (heightfields, 5 biomes), sea stacks, icebergs, pine/dead/birch tree instancing, 6 harbour villages (dock, longhouse, huts, runestone, fire, boat, lanterns) on flattened plateaus, 16 wrecks, 3 lairs (Kraken's Maw NE, Serpent's Coil N, R'lyeh SW), shore map, collision `blockAt`, minimap canvas. Fixed seed.
- src/minigames.js: overlay mini-games. Battle (aim bar weak spot: CRITICAL/HIT/GRAZE/MISS, fire pots; dodge prompts L/R/U with timer, swipe or tap; flee). Fishing (cast meter, then hold REEL to keep the catch in the net box). Salvage (alternate pulls, tension).
- src/tornado.js: copied from Dead City + `waterspout` and `seastorm` skins. src/audio.js: Dead City audio + horn, splash, thunder, zap, coins, `setSea` surf ambience.

## Rules as built
- Ship tiers: Faering, Karvi, Snekkja, Skeid, Drakkar (hull 100 x 1.75^tier x (1 + 0.25 armour)). Upgrades: shields, armor, ballista, fire, ram, sail, oars, nets; each capped at ship tier + 1. Costs in `UPG` / `TIER_COST` (timber, iron, gold).
- Monsters: level per species variant in `MLV`; spawn table centred on the ship tier (weaker and up to +1.7 stronger), region bias, night anglers and ghost ships. hp 45 x 1.65^lv, dmg 9 x 1.5^lv. Name tag colour = danger. Strong monsters chase at 0.86 x your top speed and give up after 24 s, so you can outrun them.
- Contact starts a battle (they strike first); FIGHT button at range lets you strike first. Ram upgrade hits at speed. Jellies just sting. 3.5 s grace after a battle.
- Fishing spots (fish / crates / treasure) and floating barrels around the ship; wrecks to salvage (8 min respawn). Harbours sell fish, repair, upgrade, save.
- Weather: calm, rain, storm, fog, waterspouts, sea tornado, rogue waves (region-biased). Storms drop blue warning rings; a bolt landing on your ship = Thor's Fury 22 s (x2 damage, +0.3 defence). Rogue wave: bow into it = bonus, side-on = heavy damage + spin. Spouts spin and damage, rain fish.
- Legends: Kraken needs a Snekkja, Jormungandr a Skeid, Elder One a Drakkar. All three = "PAT'S REIGN" ending.
- Sinking: half cargo lost, respawn at last harbour. Save in localStorage `pr_save` (dock, every 30 s, pause menu).
- Controls: left-half drag = steering circle (camera-relative), tap sea = course, tap minimap/chart = course (autopilot steers around land), pinch/wheel zoom, TOP/CHASE camera, FIRE (spears / ballista auto-aim), context button (DOCK / FIGHT / SALVAGE / FISH / SLOW).

## Workflow
- Patch with node .cjs scripts in the scratchpad (normalise CRLF; anchors must match; never put `\n` escapes inside template-literal patch text that writes into JS strings). Build with `npx vite build`. Dev server: preview_start `game` (port 5173, falls back to 5174).
- Testing in the hidden browser pane runs at ~2 fps: use `__pr.timeScale`, drive through `window.__pr`, auto-tap mini-games with DOM events.
- Not yet published anywhere (no GitHub repo). Dead City deploys from Devon-cadaver/office-outbreak via GitHub Pages.

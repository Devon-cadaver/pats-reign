# Pats Reign: project notes and session handoff

READ THIS FIRST after a context compaction. Current as of 2026-10-19, version 0.5.0. Where older notes or memory
disagree with this file, this file wins.

## Where things are
- Folder: D:\ClaudeCode\012_2026-10-19_PatsViking (git, branch `main`).
- Live: https://devon-cadaver.github.io/pats-reign/ (asset gallery: /showcase.html).
- Repo: https://github.com/Devon-cadaver/pats-reign (public). GitHub Pages deploys on every push to `main` via
  .github/workflows/deploy.yml, about 1 minute.
- Built on the Dead City stack (D:\ClaudeCode\010_2026-10-16_newgame, repo Devon-cadaver/office-outbreak):
  Three.js 0.170 + Vite 6, plain JS, synthesized audio, no image or sound files.
- Monster roster ("Pats Reign Bestiary"): private artifact https://claude.ai/artifact/VvRgowx4LA95MUwBJDazNT (db
  capability). Sean writes notes and flags "Needs a redesign" per monster; READ THEM with ArtifactData list, collection
  "notes" (doc ids: general, sp-<species> for a whole family, <species>-<variant index> e.g. eel-0, ship-raider-0..3,
  ship-ghost-0, ship-treasure-0; body { text, redesign, at }). Built by `node tools/build-roster.cjs` from
  release/roster-img/*.jpg into release/pats-reign-roster.html, then republished to the same URL (publish that file path,
  or pass the url from another session). Pictures: showcase.html with `window.__roster = { back }` (serpent-type
  monsters swim straight for a side portrait), `__sc.step(n)`, sea shot then the ocean hidden for the full-body shot.
- Screenshots sent to Sean live in previews/ (01-11 first art pass, 20-27 first gameplay, 30-31 rocks, 40-46 v0.2.0,
  50-56 v0.3.0 sea events, wreck, save code).

## Who the user is and how they work
- Sean (GitHub Devon-cadaver). Plays on an iPhone through Remote Control, so the live site is how they try things.
  Wants one-line requests turned into finished, tested, pushed work, with screenshots sent (SendUserFile) to approve
  looks. Approved publishing to GitHub Pages; normal follow-up pushes to this repo are expected without asking.
- Asked for: game named "Pats Reign"; Viking ship on a huge, mostly-water map (bigger than Megacity); avoid sea
  serpents, sharks, octopus, Cthulhu-like monsters until upgraded; monsters and ship grow together; fish and kill for
  supplies; mini-games for fishing and for fighting ships and monsters; weather with big waves, lightning (catching
  it = temporary damage/defence buff), fog, tornadoes, waterspouts, rogue LARGE waves; water must never clip through
  the hull; Dead City-level detail on assets.
- Later requests, all done: solid rocks; minimap bottom-left; four seas dramatically different; ship's wheel +
  sail lever instead of joystick (wheel stays where set; on a map course it steers back to the X when released;
  pulling the lever back is how you stop auto sailing); Lanterns upgrade; Compass as a bought upgrade; pinch zoom on
  the big chart (tap still sets a course); Viking ballad music and dramatic battle music; wheel less sensitive and
  only touchable on the wheel itself; corner minimap still sets a course on tap (the big chart is the same map,
  bigger and zoomable); v0.3.0: more random sea events (maelstrom, serpent ambush, raider fleet, treasure ship,
  Frost Sea aurora buff), Dead City-style save codes, and sinking leaves a wreck you can salvage (Sean chose "cargo
  only": upgrades are never lost); v0.4.0: monster redesigns from Sean's roster notes (see Monsters below); v0.4.1-0.4.4:
  half-wheel helm + sail telegraph, phone and tablet layouts, home-screen app, battle cues by the action, iPad top inset;
  v0.4.5: tornadoes lift and fling, vortex sizes, STOP after a win; v0.5.0: boarding, prize ships, treasure maps and
  digs, the ghost ship and Draugr's Bane, the HELM camera.

## v0.5.0: boarding, prize ships, treasure maps, the ghost ship, the HELM view (Sean: "go in the order you feel is best")
- Grappling Hooks: UPG.hooks (3 levels, capped at ship tier + 1 like every upgrade). HOOK_NEED(v): ship size 0-1 needs I,
  2-3 needs II, 4 (Drakkar) needs III; the ghost ship needs III + Draugr's Bane + night. boardInfo(mon) returns null (can
  board) or the reason shown on a disabled button ('NEEDS GRAPPLING HOOKS', 'ONLY AT NIGHT', ...); undefined = not a ship.
- Boarding (src/minigames.js battle): when foe.naval and her hull <= 40%, a BOARD HER button sits beside FIRE. Phases:
  grapple (needle over the rail zone; zone 0.1 + 0.03 x hooks wide; 2 + hooks throws; 2 must hold; misses = arrow damage),
  clash (prompts L/R/U like dodging; hit kills ceil(0.3 x your crew + 1), miss loses ceil(0.22 x theirs + 1) crew and
  5% hull, ghost 8%; win when their crew is 0), repel (your crew <= 30%: 12% hull, back to their attack, no second try;
  repelled by draugr = cursed). Crews: yours = SHIP_TIERS crew + 2 x oars; theirs = SHIP_TIERS[v].crew, ghost 25.
  Result 'boarded' -> main prizeChoice(mon) (state 'prize', screen #prize, world paused).
- Prize choice: PLUNDER (killMon rewards + a big extra haul, 45% map) or CLAIM (P.prizes.push({ tier, skin }), max 3,
  the ship is removed, counts as a kill / fleet loss). Skins: 'pats', a raider palette name, 'ghost', 'treasure'
  (mon.skinKey from spawnMon; palOf(skin) -> palette; rebuildShip uses palOf(P.skin)). Harbour shipyard cards
  ("Moored here: a <ship>"): SAIL HER swaps your ship and the moored one (P.tier, P.skin; upgrades kept), SELL gives
  shipValue = [70, 220, 480, 950, 1800][tier] x3 ghost / x2 treasure. Building a new ship resets the skin to Pat's.
  Ghost hull perk: at night monsters see you at half range (sightRange).
- Treasure maps (P.maps, max 3): giveMap(kind) picks a non-harbour island (R >= 7, not a volcano) about 320 away, a landing
  spot 9 off its coast in open water, a 5x4 beach grid with a landmark (LANDMARK per sea: lone pine / ice rock / black
  rock / standing stone / leaning palm), a decoy (bone / anchor / shell) and the chest cell; the clue is exact ("From the
  leaning palm, walk 3 paces west and 1 pace north"). ✕ drawn on the minimap and chart (purple for the relic map). Drops:
  wreck salvage 30%, raider kill 12%, treasure knarr kill 60%, plunder +45%; sinking a ghost ship always gives the bone
  map (kind 'relic', Mist Sea) until you hold Draugr's Bane.
- LAND (context button within 14 + L x 0.3 of the landing spot, slow) -> startDig -> minis.dig: 6 digs, each hole says
  hot (1 away) / warm (2) / cold; after 3 wrong holes each further one risks a guardian (13%, Mist 20%): two crabs at
  your ship's level and a battle. Found: gold/iron/timber x (tier + 1), or P.relics.bane for the relic map. Gave up:
  the map stays.
- Curse: boat.curse 60 s, -0.2 defence, shown in the HUD buff line.
- HELM view: the view button cycles TOP -> CHASE -> HELM. HELM puts the camera at the steering place (body-local
  (0.28 B, deckY + 2.2 + 0.04 L, -0.36 L)) looking down the deck to the bow, rocking with the ship; fov 66; the sail
  goes 35% opaque so it does not block the way ahead.
- Save adds prizes, maps, relics, skin (and up.hooks). Test hooks: __pr.giveMap, prizeChoice, startDig, boardInfo,
  startAir, liftK, spouts, pods.
- Not done yet / ideas: roster page does not show the new ships' skins or the dig; on-foot island exploration (kept as
  the landing-party dig on purpose); more relics; ship names.

## v0.5.1: a quick tutorial and a shorter HOW TO PLAY (Sean: "make a quick tutorial and shorten the how to play")
- Design decision: no fixed-level sea zones. Monsters scale with your ship everywhere (Sean likes free exploration and a
  world that grows with you); the seas only change which monsters appear. Don't re-propose zone levels.
- Tutorial (main.js, section after begin()): TUT is 5 steps, each waits for the player to do it: raise the sail (throttle
  > 0.4), steer (yaw turned > 1.1 rad), set a course (boat.wp), a shark (tutShark spawns a shark near your level 36-50 ahead
  and chasing; respawns if it is lost or you sink; done when it dies), head home (done in openHarbor, which shows #hbTip
  "Last tip" and ends it). Card #tut (inside #hud; hidden by body.busy in mini-games; on a phone it sits left of the chart
  and view buttons) with SKIP; #tutHand is a pointing emoji (beside a button, pointing in from the screen middle; down onto
  the tablet's telegraph row; swiping on the wheel). body.tutOn moves #warn and #msg below the card. Keyboard hints show
  only with a fine pointer.
- When it runs: a new voyage (SET SAIL) if localStorage pr_tut is unset; HOW TO PLAY has a TUTORIAL button that always runs
  it (continuing your voyage if there is a save). SKIP or finishing sets pr_tut. Quitting mid-tutorial and continuing keeps it.
- HOW TO PLAY is now ten one- or two-line entries; BACK and TUTORIAL sit side by side; the screen scrolls from the top when
  it is taller than the phone, and the full screen pill is hidden there.

## v0.5.2: iPad sound crackle, safe save codes, the crew mend the hull (Sean, 2026-10-19)
- Crackling on the iPad (speakers and headphones). Measured in the browser: never clipping (peak 0.15 sailing, 0.38 in a
  battle with thunder, boom and horn), so it was the audio thread running short. Fixes: AudioContext latencyHint 'playback'
  (bigger output buffer); navigator.audioSession.type set once, before the context; setSea only sends a change (it was 2
  automation events a frame); saga music schedules 0.5 s ahead and SKIPS notes whose time has passed (`late`) instead of
  firing a pile of late notes after a hitch; mono 1.8 s reverb (was stereo 2.6 s); choir 2 voices per note with one shared
  vibrato (was 3 voices, each with its own vibrato); lyre drops its saw layer. Battle went from 56 to 45 new nodes a second.
  If Sean still hears it: try a master DynamicsCompressor, fewer drones, or drop the convolver on iOS.
- Save codes cannot reach the git repo (no server; the site cannot write to GitHub; github.io is a separate site from
  github.com). Hardening anyway: cleanSave(s) in main.js runs on every load (so on every pasted code): numbers clamped,
  skins / regions / marker icons only from the game's lists, legends only real lair keys, relics only bane: true, map clues
  stripped of < > & " ' `, at most 3 prizes and 3 maps. The built site also carries a Content-Security-Policy meta (added by
  a build-only plugin in vite.config.js): only the game's own scripts run, no inline handlers. Tested: an injected
  onerror handler is blocked, and a doctored save with markup in the skin, clue and icons loads clean.
  `.claude/launch.json` has "built" (vite preview on 4173) for testing the real build with the CSP.
- Oars & Crew now also mend the hull at sea: MEND = [0, 0.0012, 0.0025, 0.004] of max hull a second (about 7%, 15%, 24% a
  minute), only while sailing (state play), out of battle, not during Bifröst, and 8 s after the last hit (damage() and a
  battle's end set boat.lastHit). The HUD buff line shows "🔨 Crew mending".

## v0.5.3: MUSIC switch separate from SOUND (Sean: turn the music off to listen to his own, keep the game sounds)
- Title and pause screens show 🔊 SOUND and 🎵 MUSIC side by side (soundToggle(...hosts) in audio.js builds a .soundRow on
  each host, all kept in step). SOUND still mutes everything (master); MUSIC mutes only the saga music: it plays through
  its own gain (musicOut, audioNodes().music), and while off music.js schedules nothing at all (late = ... || isMusicOff()),
  which also saves the iPad's audio thread. Saved per device in localStorage pr_music ('0' = off); not in save codes.
- With MUSIC off the iOS audio session is 'ambient' (mixes with other apps, so Spotify or Apple Music keep playing; the
  iPhone silent switch then mutes the game too); with it on, 'playback' (plays through the silent switch, pauses other
  apps). session() in audio.js sets it before the context starts and on each toggle. navigator.audioSession is
  Safari-only, so this part cannot be tested in Chrome.

## v0.5.4: a song for every sea, SAIL TO DOCK, a fuller tutorial, the porpoise NaN (Sean, 2026-10-19)
- Sea songs (music.js THEMES): home = the old D Dorian ballad; frost = A minor 3/4 54 bpm, bells (bell()), cold high choir,
  far drum, distant lur; storm = E Phrygian 104 bpm, war drums with fills, bass ostinato, E then F horn calls, rumble()
  thunder every 8 bars; mist = 56 bpm, D/G# tritone drone, heartbeat drum, whole-tone ghost bells, D-G#-C choir; warm = G
  Mixolydian 6/8 (E = 0.2 s), hand drums, shaker(), marimba pluck() tune, bass walking G F C G. Each theme: drone pitches,
  filter cut, drone level, reverb wet (M.wet), step(t, s, E) and phrases/note()/play() for the melody. main.js
  updateSeas calls setMusicSea(curSea) every frame; the song changes on the next bar line (toTheme glides the drone with
  colour()). Battle music is unchanged and in D (the drone glides to D for it), and after a battle the sea's song returns.
  Tested: all five switch; peaks 0.13-0.19; storm 26, warm 39, battle ~50 new nodes a second. sagaState() reports theme.
  Sean wanted option 3 of: song file from the device, SoundCloud links, sea songs, volume sliders. YouTube needs a
  visible 200x200 player by its terms; Spotify embeds only play 30 s previews in iOS Safari (no sign-in in iframes), so
  for his own music: MUSIC off + the Spotify app.
- SAIL TO DOCK (main.js, section before the tutorial): #dockBtn (⚓ DOCK; right column under TOP on a phone, above the
  chart/view buttons on a tablet; gold .on while active). autoDock(true) picks nearestHarbor(), planRoute() (A* on a 6-unit
  grid, land kept a hull's width away, corners pulled straight; about 15 ms) to the point 10 off the dock, and sails it leg
  by leg (updateAuto); FULL sail. autoOn() = boat.auto and the current wp is its leg. startBattle while autoOn ->
  autoFlee (half a hit, foe stunned 7 s, boost); doAction (any player action but DOCK) ends it; STOP / a new course / the
  button ends it; running aground re-plans (autoReplan, 1.5 s cooldown) instead of cancelling; arriving opens the harbour.
  Tested: a shark contact fled (6 hull, no battle); a 275-unit trip around an island to Mistmere arrived with no grounding.
- Tutorial is now 8 steps: sail, steer, views (TOP/CHASE/HELM, all three), zoom (pinch or mouse wheel), the little map
  (set a course), the sea chart (open it), the shark, head home (⚓ DOCK). Keyboard hints read "On a computer: ...".
- Fixed: porpoise tail tip was NaN (Math.pow of a tiny negative at s = 1) -> computeBoundingSphere NaN errors in the
  console since v0.5.0. All three SpineTube profiles now use Math.max(0, ...).
- Next (Sean asked): an action ship battle (circle each other, broadside timing with a trajectory arrow, side camera,
  they fire back) and visible ship damage (torn sails, holes, cracks, fire).

## v0.6.0: the action ship battle (broadside) (Sean: circle each other, time the shot at the right angle, a trajectory arrow, side view, they fire back)
- main.js section "ACTION SHIP BATTLE (broadside)" (before fishing spots). startBattle(mon, firstStrike, opts): a naval
  foe with BROAD.on and not opts.classic goes to startBroadside(mon) (returns false when there is no open water for the
  rings, then the classic battle runs). Pause menu button #broadToggle: SHIP FIGHTS ACTION / CLASSIC (localStorage
  pr_broad, '0' = classic).
- Rings: you on rIn = 11 + 0.55 L, she on rOut = rIn + gap (gap = 9 + 1.1 (B + her B)), centre found with open water all
  round (13 tries). You circle at 0.42 rad/s x throttle^0.6 (the telegraph sets it; STOP stops you), she at
  0.3 + 0.03 lv the other way, so you pass broadside every ~7-9 s. Ships blend into place over 1.4 s (k).
- Your gold arrow (ShapeGeometry, depthTest off, renderOrder 6) points out of the side facing her; broadFire() (FIRE
  button, Space) launches 3 + ballista bolts along it; reload 2.4 - 0.3 ballista s. A shot resolves after the flight time
  (gap / 34 s, as launch() flies): hit if her angle is within (L/2 + 1.5) / rOut of the shot's line; PERFECT (x1.6) in the
  middle 35%. Damage attack() x 1.15; fire pots set her burning (3 + level s, embers).
- Her aim: per pass a random error within hlP x clamp(2.2 - 0.3 lv, 0.8, 2.2); she fires when her prediction of where you
  will be (at your current speed) crosses it; her red arrow flashes while she aims; changing speed spoils it. Her volley:
  mon.dmg x (1.25 in her perfect middle) x (1 - defense). Treasure knarrs never fire.
- Timing strip above FIRE (#broad .bStrip): her angle from your arrow (+-1.1 rad), the green zone where she must be when
  you fire (lead = her angular speed x flight time), its PERFECT middle, ⚠ SHE AIMS. Camera: inside the rings behind you,
  looking out across hers (dist from the needed width, pitch 0.32); viewOff 'broad' lifts the action to 40% of the screen
  (the classic battle keeps 25%).
- Ends: her hull 0 -> killMon, STOP; FLEE -> half a hit, she is stunned 7 s, FULL; BOARD HER (below 40%, boardInfo) ->
  the classic mini-game straight into the grapple (minis.battle o.board -> boardStart). sink() clears it first.
- Tested: on-time PERFECT 21, late 0; she hit 2 of 2 passes at first (34 each), so her damage went x1.5 -> x1 and her aim
  error wider; win, flee and board end cleanly with no arrows left; phone and tablet layouts.

## v0.6.1: ship damage you can see (Sean: torn sails, fires, holes and cracks)
- ship.js buildShip: setDamage(k) with k = share of the hull lost. Hull marks (8 + 2 x tier, both sides, placed on the real
  hull side with Ln.sec / Ln.vAt): jagged dark holes with a splintered rim, or long thin cracks; each has its own threshold
  between 0.12 and 0.88. Sail: a 128 px alpha map (sailMat.alphaMap, alphaTest 0.5) redrawn per stage: stage 2 (k >= 0.45)
  2 holes, stage 3 (0.6) 4 holes and a rip from the foot, stage 4 (0.78) 7 holes and a long rip; the ghost hull's sails
  are left alone. Fires: 2-4 flame cones (additive) on deck from k 0.55-0.85, flickering in anim(); fireSpots() gives their
  world positions. Everything returns to clean as the hull is repaired or mended.
- main.js: your ship shows P.hp (or battle.you.hp during a classic battle); every enemy ship shows its hull (battle.foe.hp
  during a classic battle); shipSmoke(s, dt) sends smoke and sparks up from the fires (k >= 0.55, ships within 150).
- Broadside polish: camera closer (W = max(18, 2.2 L), min distance 16, pitch 0.28) so ships are bigger; the board button
  is compact so it never covers FIRE; her floating name tag is hidden in a broadside (her bar is at the top).
- Gotcha (twice this session): a // comment appended to a long one-line function cuts off the rest of that line; node
  --check can still pass (the next lines close the braces) while the game breaks at runtime. Put comments on their own line.

## v0.6.2: the broadside becomes a battle line; pause in fights; fleets join (Sean: circling might make people sick; pause did not work in a fight; other fleet ships circled but could not be shot)
- The rings are gone. Lane model (main.js, ACTION SHIP BATTLE section): a straight line O + a*s + c*v; you on lane v = yC,
  her column on v = eC, gap apart; along positions B.sp (you) and foeAt(B, i) = anchor + (i - (n-1)/2) * spacing (the
  column, in line astern). You ease forward and back (vp = throttle x 3.2 x cos(0.45 t), |sp| <= 8; STOP holds you).
  broadAI: the column sails to the far end (+-0.75 Lh), 45% of passes it heaves to abeam for 1.6-2.8 s ("SHE HEAVES TO:
  TRADE VOLLEYS!"), holds briefly at each end; one-on-one, every 3rd sweep 60%: broadSwap = coming about, both ships
  orbit the point between them by half a turn in 5 s (no firing), then the lane frame is flipped (O' = 2M - O, a and c
  negated). The camera looks along the fixed B.camYaw and only slides along the line (it never turns; after a swap she is
  the nearer ship). Measured: camera turns 0.025 rad in 10 s once settled.
- Shots: yours land on her lane at your along position after the flight time; the nearest ship within L/2 + 1.5 is hit
  (PERFECT in the middle 35%). Each foe aims on its own (err within hlY x clamp(2.6 - 0.3 lv, 1, 2.6), reload 3.2 s) when
  within 14 along; its red arrow flashes while it aims. The strip shows a dot per ship (+-24 units), the green zone at
  -column speed x flight time.
- Fleets: startBroadside takes the contacted ship plus up to 3 other naval ships within 90 that are chasing or of the same
  fleet (not bosses, not treasure). inFight(mon) replaces battle.mon === mon checks (their own AI, tornado lifts and
  whirlpools leave them alone; no floating tags). A ship at 0 hull leaves the line (killMon) and the column closes up
  smoothly; the fight is won when the last one sinks. BOARD targets the nearest ship abeam below 40% (others stunned 9 s).
- Pause: the pause button now works in every fight and mini-game (tick runs nothing while state is 'paused').
- Tested: pass, heave-to and return pattern; on-time hit 20, far miss 0; swap; a 3-ship fleet sunk one by one; pause
  freezes the battle clock (classic fights too); phone and tablet.

## v0.6.3: one-handed controls with a side swap (Sean: all buttons on one side but the minimap; a button to switch sides for left-handed play)
- pr.css "one-handed HUD" block (end of file). Default: every control on the right (pause at the end of the top row; chart,
  TOP view and DOCK under it; SPEARS / action above the telegraph; the telegraph a column at the bottom right with FULL on
  top), the minimap bottom left with #swapBtn (⇄) above it. Tablet: the telegraph is now a right-edge column too and the
  chart / view / DOCK buttons sit under pause (no longer above the map). html.leftHand mirrors everything (the top row
  goes row-reverse, pause margin-right auto; the ship / sea names row right-aligns; compass, tutorial card side, the
  broadside BOARD / FLEE column and the SHE AIMS label all swap). setHand() in main.js, localStorage pr_hand ('L').
- Fixed: in a ship battle body.busy hid the telegraph, so speed could not be changed to spoil her aim; now
  body.busy.broadOn keeps it, and W / S work in a ship battle. BOARD / FLEE sit on the minimap's side.

## v0.6.4: zoom in battles; fog thins in a fight (Sean: fog made it too hard to see; zoom all the way in and out)
- Pinch and the mouse wheel now work in every battle (the canvas pointerdown no longer returns in a battle; a tap does
  not set a course there). Each battle has its own zoom: it starts at 1 (the battle framing) and your sailing zoom comes
  back after (camBattle / zoomSail in updateCamera). The battle cameras multiply their distance by zoom (broadside min 5,
  classic min 6, giant min 8). Zoom range everywhere is now 0.3-2.6 (was 0.55-2.2). Measured: battle start 54, pinched
  in 9, wheeled out 142, back to the sailing zoom after.
- In a battle the fog look runs at 0.4 strength (wxLook k), easing in and out with env.apply, so the ships stay visible.

## v0.6.5: W / S step the telegraph (Sean: on PC, a tap moves one step, holding runs all the way)
- keydown (not e.repeat) of W / S / up / down calls thrKeyStep(+-1): the next THR_LV notch (STOP, ROW, HALF, FULL). Held, the
  tick steps again after 0.4 s and then every 0.22 s (thrHold). Works while sailing and in a ship battle (thrKeyOk).

## Pages and modules
- index.html + src/main.js: the game. src/pr.css: all styling (Dead City's style.css is copied but unused).
- showcase.html + src/showcase.js + src/showcase-monsters.js: asset gallery (ships, raiders, ghost ship, every monster
  variant, times of day, weather, rogue wave, waterspout, sea tornado). Hooks `window.__sc`, `__showMonster(type, v)`.
- src/ocean.js: the sea. 170x170 grid following the camera, 4 Gerstner waves on the GPU; `heightAt`/`tiltAt` run the
  same maths in JS so ships and monsters float on the visible surface. Ripple normals, density-based foam (crests,
  shores, rogue crest, hull ring), sun glints, sky reflection, light through crests, shore map (turquoise shallows,
  waves damped near land). `setHulls` (up to 6): near each hull the sea settles onto that hull's waterline plane, so
  crests cannot cut through the planks. `rogue` = moving sech^2 swell + trough. `uLamp` = warm lantern pool.
  `createFoam(scene, ocean, max, { color })`: instanced wake/spray/smoke discs (per-particle gravity `g`).
- src/env.js: time-of-day looks, weather overlays, and `REGION_LOOKS` per sea, blended by `regionWeights`; pushes
  colours to the ocean, sky dome, fog and lights. Horizon colour = fog colour (no seam).
- src/ship.js: `buildShip(tier, up, pal, seed)`. Lofted clinker hull, deck, benches, ribs, curved stems, heads
  (plain / spiral / serpent / dragon / royal gold dragon + tail), mast, reefable billowing sail (Pat's crest
  textures), rigging, Viking crew, steering oar, instanced rowing oars. Upgrades shown on the model: shields, iron
  plates, ram, ballista (twin at 3), fire pots, lanterns (stern / bow + mast / iron braziers). Invisible gunwale
  "water mask" drawn before the sea so no water shows inside the hull. Raider palettes + ghost ship. `anim(dt,
  { speed, time, night, sail })`.
- src/monsters.js: `makeMonster(type, variant, scale)`. Shark (4, Jaws-style head: snout over an underslung jaw of
  triangular teeth, jaw thrusts on a bite), megalodon (5 types: Ancient, Crested, Ravening, Shadow, Phantom; shark(P,S,true)
  with double jagged teeth, brow, barnacles/crest), serpent (7 incl. winged Sea Dragon), eel (3, lightning arcs), octopus
  (4), kraken (3), crab (3), angler (2, real anglerfish: upturned underbite mouth, inward needle fangs, rod + esca), jelly
  (3), leviathan (3, three-headed limbless dragon: serpentBody with noHead + three neck SpineTubes, each a serpentHead),
  porpoise (3, friendly; the old whale model), elder (3, arms are single SpineTubes from a shoulder yoke, clawed hands),
  jormungandr (2). serpentHead v2 (scowl, sunken glowing eyes, fangs, frills) sits on a neck ball joint (no gap).
  serpentBody options: noHead, neckRise, after(dt, st, pts, tube, ph, surf). The lair Kraken spawns at scale 17.5 (giant:
  eye ~ a Snekkja long; m.giant / mon.giant): battle gap and camera are special-cased (camera behind your ship on one eye).
  Porpoise pods live in main.js (`pods`, `updatePods`), not in `mons`: 3-5 swim alongside, leap, +10% speed with 2+.
- src/geom.js: material cache, part/grp/rod, taperTube, SpineTube, glowVC (vertex-colour glow via `aGlow`), shapes.
- src/world.js: 1200 x 1200 sea, fixed seed. `regionAt`, `regionWeights`. Five waters:
  Home (centre, green pines), Frost N (tall snow peaks, snow pines, icebergs, bobbing ice floes), Storm E (black
  volcanic islands with glowing lava rivers, crater smoke + embers, charred trees, basalt columns), Mist W (low marsh
  islands, dead trees, standing stones and arches, green ghost lights), Warm S (white beaches, palms, coral heads).
  Sea stacks in each sea's stone (`STACK_PAL`), 6 harbour villages on flattened plateaus, 16 wrecks, 3 lairs
  (Kraken's Maw NE, Serpent's Coil N, R'lyeh SW), collision `blockAt`, region-tinted 512px map canvas,
  `update()` bobs floes and floats wisps. Exposes `volcanoes` for smoke.
- src/minigames.js: Battle (aim bar weak spot CRITICAL/HIT/GRAZE/MISS, fire pots, dodge prompts L/R/U, flee). Since
  v0.4.2 (Sean: keep eyes on the action) the aim bar, attack line, DODGE/BRACE prompt and timer sit in .mgCue at 39% from
  the top, just under the fight, with a big pulsing side arrow (.mgSide) for left/right dodges; buttons stay at the bottom;
  body.busy hides the map, its buttons and sailing messages during any mini-game.
  Fishing (cast meter, then hold REEL to keep the catch in the net box), Salvage (alternate pulls, tension).
- src/music.js: synthesized saga. Sailing: D Dorian 6/8 ballad at 66 bpm (drone, frame drum, lyre, lur horn, choir).
  Battle: 138 bpm war drums, ostinato, horn calls, "HU!" war cries, choir. `startSaga()`, `setBattle(on)`.
- src/audio.js: Dead City sfx + horn, splash, thunder, zap, coins, creak, `setSea` surf, `audioNodes()`.
- src/aurora.js: northern lights. Additive curtain ribbons low in the northern sky (only seen in chase view and the
  title; the top view never sees the sky) and the Bifröst rainbow pillar + rings. The visible part in top view is the
  ocean shader's `uAur` term (green/violet bands of light on the water) plus a green tint on hemi light and fog.
- src/savecode.js: save codes (ported from Dead City). PR1-<base64url deflate-raw JSON>-<4-char FNV check>; carries
  `pr_save` and `oo_mute`. `initSaveCodes()` returns { open }; buttons: title SAVE CODE, pause SAVE CODE (saves first).
  LOAD needs a second tap within 4 s on the same text, then reloads the page.
- src/tornado.js: Dead City twisters + `waterspout` and `seastorm` skins. fullscreen.js, perf.js: from Dead City.

## Controls (v0.4.1)
- Ship's wheel: a big half-wheel centred across the bottom (hub just below the screen edge; layoutHelm sizes it:
  R = clamp(min(W*0.4 phone / W*0.3 wide, H*0.28), 100, 240)); swipe along it to turn (0.8 x the finger's angle around the
  hub), rudder = sign*|angle/HMAX|^1.4, HMAX 2.4. Only the wheel takes touches (clip-path circle + radius check). It stays
  where you leave it; double-tap centres it. Sean's idea after iPad testing (v0.4.1).
- Sail telegraph above the wheel: tap STOP / ROW / HALF / FULL (0, 0.3, 0.6, 1; slide sideways too). STOP cancels a
  course. No control needs a downward swipe (iPad Safari exits full screen on those).
- Layout (v0.4.3, Sean's phone layout): phones (html:not(.tabletHud), shorter side < 700, portrait or landscape) get a
  small wheel (R = clamp(min(W*0.24, H*0.15), 64, 105)) bottom centre, the telegraph stacked up the left with FULL on top,
  the minimap bottom right with the action buttons above it, a bigger pause top right with the sea chart button and
  TOP/CHASE under it, and the compass on the left under the ship name. Tablets (html.tabletHud): big wheel centred,
  telegraph above it, bigger map bottom left and buttons bottom right. Tablets also keep 28px clear at the top (--padTop):
  the iPad status bar is drawn over the page and iPadOS reports no safe-area inset for it (Sean saw the battery cover the HUD). helmLift shifts the camera view up
  (setViewOffset) by 0.9 x the wheel height so the ship clears the controls; battles use their own offset.
- iPad full screen: Safari's own swipe-down exits element fullscreen and a page cannot stop it. The fix is the home-screen
  web app: public/manifest.webmanifest (display fullscreen) + icons (icon-180/192/512, a gold wheel with PR) +
  apple-mobile-web-app tags; fullscreen.js skips the Fullscreen API when standalone and shows an Add to Home Screen tip
  on the title screen on iOS.
- Courses: tap the sea, tap the corner minimap (whole world, bottom-left), or open the sea chart (🗺 button: pinch
  zoom to 8x, drag to pan, tap to set). Setting a course raises the sail if it was down. Hands off the wheel = the
  helmsman turns it toward the mark and around land (`steerAround`). Arriving furls the sails.
- FIRE (spears, or ballista once bought) auto-aims; context button: DOCK / FIGHT / SALVAGE / FISH / SLOW.
- Pinch or mouse wheel zooms the sea view; view button cycles TOP / CHASE / HELM (captain's eye, v0.5.0). Keyboard: A/D wheel, W/S sails, space fire.
- HUD: hull bar, timber/iron/gold/fish, ship name, sea, weather, Thor timer; compass top-right once bought.

## Rules as built
- Ships: Faering, Karvi, Snekkja, Skeid, Drakkar. Hull 100 x 1.75^tier x (1 + 0.25 x armour). Speeds 9 to 13.
- Upgrades (UPG in main.js, costs timber/iron/gold, each capped at ship tier + 1): shields, armor, ballista, fire
  pots, ram, sail, oars, lights (Lanterns 3), compass (2: lodestone heading, sunstone harbour pointer), nets.
  Ship sizes in TIER_COST.
- Monsters: levels in MLV (megalodon 3.4-5, rare: weight x0.35, Phantom night only; leviathans always hostile); spawn table centred on ship tier (weaker, and up to +1.7 stronger); region type bias
  (REGION_BIAS) and variant bias (VBIAS: Frost Wyrm north, Lava Crab east, Obsidian Horror + ghost ships west,
  Golden Naga south); anglers at night; ghost ships at night or in the Mist Sea. hp 45 x 1.65^lv, dmg 9 x 1.5^lv.
  Tag colour = danger. Strong monsters chase at 0.86 x your top speed and give up after 24 s.
- Contact starts a battle (foe strikes first); FIGHT button lets you strike first; winning furls the sails (STOP); ram hits at speed; jellies sting.
  3.5 s grace after a battle. Win = gold/iron (ships also timber). Flee = hull hit, foe stunned, lever to FULL.
- Fishing spots (fish / crates / treasure), floating barrels, wrecks to salvage (8 min respawn). Harbours sell fish,
  repair, upgrade, save.
- Sea events (EV in main.js, `updateEvents`): one every 60-115 s (first at ~80 s), weighted per sea (EVW), never
  during battle/fishing. `__pr.startEvent(kind)` forces one ('whirl', 'ambush', 'fleet', 'treasure', 'aurora').
  - Maelstrom: ocean.whirl {x,z,R,D,k} sinks a funnel into the sea (shader + JS heightAt match) with spiral foam arms
    and a dark eye; `swirlAt` drags the ship, monsters and floats round and in; the eye grinds 4.5% hull / 0.8 s.
    Full sail escapes from halfway in. 3 gold floats circle inside; when it closes it spits up 6 floats.
  - Serpent ambush: water boils beside the ship 1.6 s, then a region serpent (level near your tier) bursts up (fast
    rise), hits 6%, and battles you if you stay close; ×1.5 gold.
  - Raider fleet: 2-4 ships of one clan (a Warlord one size up) in formation 150 away, hunting 80 s (`mon.hunt`,
    `fleetOff`); sinking all gives a war chest (25/12/60 × (tier+1)).
  - Treasure knarr (TREASURE_PAL, golden sail, glowing chests, no weapons): flees at 0.8× your top speed, dumps cargo
    floats when you're within 75, escapes after 75 s; contact = boarding battle where you strike first; ×3 gold.
  - Aurora: 75% of nights (rolled at nightfall) in the Frost Sea; a Bifröst pillar 55-105 away; touching it =
    `boat.bifrost` 30 s: +25% top speed, 2% hull/s, green sail glow; a new pillar 60 s later.
- Weather (region-biased): calm, rain, storm, fog, waterspouts, sea tornado, rogue waves. Storms drop blue rings; a
  bolt on your ship = Thor's Fury 22 s (x2 damage, +0.3 defence). Rogue wave: bow into it = bonus, side-on = heavy
  damage + spin. Spouts and tornadoes (v0.4.5, Sean): each has a size vs (vortexSize(): 60% x1-1.35, 30% x1.35-2.1, 10% huge x2.3-3.1;
  a huge tornado gets a warning). Within 1.7 R they drag you round and in; inside 0.8 R you are lifted (boat.air /
  mon.air from startAir, flyStep): up the funnel spinning, then flung along the spin to crash down in open water.
  liftK(size, vs) = clamp((10.5 vs - size) / (7 vs), 0, 1) scales lift height, throw and crash damage (size = L/2 for
  ships, mon.size for monsters), so a Drakkar shrugs off normal ones but not a huge one; GIANTS (megalodon, kraken,
  elder, jormungandr, leviathan) and bosses are never lifted. Water masks and hull blending switch off while airborne;
  5 s re-catch cooldown; the camera rises with you. Spouts still rain fish. The Storm Sea flickers and rumbles all the time.
- Each sea: own water/sky/fog/light, minimap colour, entry banner, particles (snow north, ash east), props.
- Night: day cycle 420 s; lanterns light the ship and sea and push the night fog back.
- Legends: Kraken (needs Snekkja), Jormungandr (Skeid), Elder One (Drakkar). All three = "PAT'S REIGN" ending.
- Sinking: half the cargo goes down in your wreck (`P.wreck` {x,z,res}, saved; red-beacon wreck model, ☠ on the maps).
  SALVAGE it (salvage mini-game: hauled up = all, rope snaps = part) or hire a harbour salvage crew (gold = 15 + 10×tier
  + 15% of its value). Only one wreck: sinking again loses the older one. Upgrades are never lost. Respawn at the last
  harbour. Save in localStorage `pr_save` (dock, every 30 s, pause menu).

## Workflow and gotchas
- Patch with node .cjs scripts in the scratchpad; normalise CRLF; anchors must match exactly. Long multi-file bash
  heredocs break in this shell: write patch text files with the Write tool, then run node.
- Never put `\n` escapes in patch text that lands inside JS string literals (it becomes a real newline).
- Build `npx vite build`. Dev server: preview_start `game` (port 5173, falls back to 5174).
- The browser pane is hidden while Sean is on Remote Control and runs at about 1 frame a second. Use
  `__pr.step(n, dt)` to run frames synchronously before screenshots, `__pr.timeScale` for longer runs, and drive
  everything through `window.__pr` (P, boat, helm, setThrottle, chartView, mons, spawnMon, startBattle,
  startFishing, openHarbor, setWeather, landBolt, warnRing, spawnSpout, rebuildShip, minis, world, ocean, dmgLog).
  Screenshots can lag a frame behind: wait 2-3 s and take another if the HUD text looks stale.
- Anything drawn on a canvas must skip when its element is hidden (clientWidth 0), or it throws and freezes the loop.
- Commit as `sean duvall <328185017+Devon-cadaver@users.noreply.github.com>` (set in repo config; GitHub rejects the
  private email). End commit messages with the Co-Authored-By line the system gives. No gh CLI on this PC: GitHub API
  calls use the git credential manager token (`git credential fill`), never printed.
- After pushing, wait for the Pages run (Actions API, head_sha) and check the live JS bundle contains the version.
- Version lives in src/version.js and package.json (bump both).
- `setTimeout` messages (fleet kills, war chest) run in real time, so `__pr.step` alone won't show them: wait ~1.5 s.
- `cat > file` with no heredoc waits on stdin forever; long heredocs still break here, so write patch files with Write.
- A test that calls `minis.close()` mid-battle leaves `battle` set and blocks events; use `boat.grace = 99` instead.

## Ideas not built yet
- Crew management, ship naming, quests from harbour jarls, trade routes between harbours, co-op raids, more boss
  phases, sea birds over the Warm Sea, itch.io zip like Dead City.

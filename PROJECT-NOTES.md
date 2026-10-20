# Pats Reign: project notes and session handoff

READ THIS FIRST after a context compaction. Current as of 2026-10-21, version 0.8.1. Where older notes or memory
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
  digs, the ghost ship and Draugr's Bane, the HELM camera; v0.5.1-0.5.4: tutorial, short HOW TO PLAY, iPad sound fixes,
  safe save codes (cleanSave + CSP), crew mending, MUSIC switch, a song per sea, SAIL TO DOCK; v0.6.0-0.6.9: the action
  ship battle (a battle line, fleets join), visible ship damage, one-handed controls with a side swap, battle zoom and
  lighter fog, keyboard play (W/S notches, Space, C, E, mini-game keys), BACK on the telegraph, chase view to start,
  the legends always rise (young ones or papa); v0.7.0-0.7.2: live legend fights (Kraken siege, Jormungandr hunt, Elder
  One ward) with special moves, and lair waves; v0.8.0 (overnight): the end game: Helheim, three bigger ships, rune
  upgrades, the shipwright's designs, bounties, Pat's saga, Pat's Hall, plus a round of fixes from six tester agents.
  Each has its own section below.

## Where we left off (2026-10-21 morning, v0.8.x, after the overnight end-game build)
- Sean's overnight request (2026-10-20): put Opus and Sonnet agents on bug and exploit testing, play every part, judge the
  loop's fun; build what a long end game needs: bigger ships, upgrades, hull and sail designs, and a second map, the
  Underworld (every ship and monster undead and slightly harder; a burning sky by day, a purple swirling abyss by night).
  "Run through the night. Test as you go."
- Done and live (see the v0.8.0 section below): Helheim (second world, its own seas, harbours, legends, sky, music),
  Hel's Gate in Midgard's Mist Sea (opens with a Drakkar), undead monsters and draugr fleets, souls, rune upgrade levels
  4 and 5, the Busse / Ormen Lange / Naglfar, the shipwright (9 hulls, 12 sails with perks, ship names), bounties, Pat's
  saga (deeds and titles), Pat's Hall (gold sink), reborn legends, ordinary octopus grabs and serpent coils, plus the
  tester fixes (spawns follow the ship at every size, fire pots take a shot, legends only die in their fights, many UI,
  save and memory fixes). Deployed as v0.8.0, later fixes as v0.8.1 (see below).
- Sean has played none of it yet. Expect balance feedback. The knobs: lair waves and rebirths (lairSpawn), souls per
  kill (killMon: 2 + 2 x (level - size)), rune level prices (UPG), TIER_COST 5-7, HALL, bounty pay (makeBounty), monster
  hull x1.3 (spawnMon), DELTA (spawn levels), pots (potK, 1 + floor(level / 2) a battle), Jormungandr's lock 1.9 s.
- Testers: their full reports were delivered as messages in the 2026-10-20 session; the important findings and what
  was done about each are in the v0.8.0 section. qa/BRIEF.md and qa/BRIEF080.md in that session's scratchpad describe
  the set-up (Playwright from the npx cache, a frozen build on its own port per wave).
- Open offers Sean has not answered: an easier whirlpool escape.
- Sean's preferences (unchanged): no fixed-level sea zones (monsters scale with the ship everywhere: now from your ship's
  level at every size); fights engaging and tough, a different style per boss; no constant circling or spinning cameras;
  one-handed controls with a side swap; everything playable from the keyboard on PC; music can be switched off; he
  restarts the dev server himself at times and said I can restart it.
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

## v0.6.6: start in CHASE zoomed out, BACK on the telegraph, keys in the mini-games (Sean)
- The game now starts in the CHASE view at zoom 1.6 (was TOP at 1).
- BACK: THR_LV = [-0.22, 0, 0.3, 0.6, 1], a fifth telegraph button (data-n 0, red) under STOP. setThrottle allows -0.22; any
  throttle <= 0 cancels a course; the sail furls; steering reverses while backing (like a car). Tutorial step 1 points at
  data-n 3 (HALF). Action buttons and the phone battle strip moved up for the taller telegraph.
- Keys in the mini-games (minigames.js, one keydown/keyup listener, never while typing in a text box): battle Space = FIRE
  / THROW / the middle block, A and D = left and right (W too for the block), F = fire pot, B = board; fishing Space = cast,
  hold Space = reel; salvage A / D = pull. Space never presses the last clicked button (main.js blurs it and fires).

## v0.6.7: keyboard: Space throws ahead, C view, E chart (Sean)
- fire(ahead): Space passes true, so it only aims at a monster within 0.55 rad of the bow (and in range); otherwise the spear
  or bolt flies straight ahead and hits any monster it lands on (spearHit). The SPEARS button still aims at the nearest.
- C cycles the view (not in a fight or mini-game); E opens the sea chart and shuts it again.
- Note: a // comment appended to a one-line handler swallowed the rest of the line once more; scratchpad scan-comments.cjs
  flags lines where code follows a comment.

## v0.6.8: lighter fog (Sean: fog and the snowy Frost Sea haze were too hard to see through)
- The real cause: Three.js fog is measured from the camera, and the zoomed-out chase camera (v0.6.6) sits ~70 units back,
  so your own ship was deep in the fog. main.js now adds 0.85 x the camera-to-target distance to scene.fog.near/far each
  frame after env.apply: the ship and a fight stay clear at any zoom and the haze closes in beyond.
- env.js: fog weather near/far 4-46 -> 12-85; Frost Sea 60-260 -> 90-330; Mist Sea 18-125 -> 25-155. Falling snow and
  ash opacity 0.85 -> 0.6 (main.js fall.m.opacity).

## v0.6.9: the legends always rise (Sean: baby versions for small ships, or sometimes papa who wrecks you)
- updateLairs (main.js): at a lair (d < 40) with no lair monster alive and no cooldown: a big enough ship (LAIR_NEED) gets
  the legend as before. A smaller one gets the legend with PAPA_CHANCE (0.25), marked mon.papa, with the warning "Your X is
  far too small: FLEE!"; a papa sinks back into the deep once you are 120 away and not fighting it (lair rests 60 s).
  Otherwise a young one rises: YOUNG_NAMES (Kraken Hatchling, Jormungandr's Whelp, Spawn of the Elder One), YOUNG_SCALE
  (3.5 / 0.7 / 1.1), lv = tier + 1.2 (capped below the legend), not a boss, hunts you; killing it pays x1.5 gold, does not
  count as a legend, and rests the lair 150 s. The approach message now says it takes an X to face the legend.

## v0.7.0: legend fights, part 1: the Kraken's tentacle siege, its grab, lair waves (Sean: boss battles more engaging and tough, a different style per boss, special moves, zoom out for big bosses, keep spawning in the boss zone)
- main.js section "LEGEND FIGHTS" (before fishing spots). startBattle: a non-naval foe whose type is in LEGEND_KIND (only
  kraken so far) goes to startLegend(mon) when BROAD.on (the pause switch, now labelled BATTLES: ACTION / CLASSIC).
  battle.legend = L; updateBattle -> updateLegend; tapSea -> legendTap in a legend fight; canvas taps allowed there;
  sink() -> clearLegend(); viewOff 'broad' framing.
- Kraken siege: the Kraken is placed ahead (giant: 0.55 size + 0.6 L away), your ship held (no sailing), its own arms
  kept close (stState.reach 0.35, used by cephalopod anim in monsters.js). Tentacles (exported tentacle() SpineTube, 18
  points, poseTentacle(grow, lean, curl, sway)) rise around you but never on the camera side: warn (red ring) 0.8 s, rise
  0.7, coil 1.6 s (enraged 1.15, young 2.1), slam (0.6 x dmg x (1 - def)), sink. Up to 3 at once (4 enraged; young 1/2).
  Hits: 3 per tentacle (young 1); each hit 0.12 attack to the Kraken and pushes the coil back 0.7 s, severing 0.35.
  Eye: opens every 8-11 s for 2.2 s (gold ring); a hit does 2.4 attack and every rearing tentacle flinches away.
  Grab (instead of a slam, 28%, enraged 40%, young 15%): hit the gripping tentacle 5 times (young 3) within 3.5 s (reload
  0.2 s while grabbed) to break free (0.5 attack to it); else dragged under (boat.dunk, 1.4 x dmg) and thrown with the
  tornado flight (startAir with a pretend spout). Reload 0.8 s spears / 0.6 ballista. FIRE / Space targets the grab,
  then the open eye, then the tentacle closest to striking; a tap shoots what is under the finger. Legend bosses get 1.5x
  hull in the action fight (once, legendHp). Camera: behind your ship toward the eye, wide enough for the whole Kraken.
- Tested: a Snekkja (ballista, shields) pressing Space ~4 a second won in 37 s with 18 of 306 hull left (3 grabs, 3 eyes).
- Lair waves (updateLairs rewritten, lairSpawn): stay within 95 of a lair and after each kill (or a papa leaving) another
  rises after 60-110 s (lairCool), young levels tier + 1 + 0.4 per wave, papa chance 0.2 + 0.07 per wave (max 0.6);
  leaving (130+) resets the waves. A slain legend's young keep rising there.
- Next: Jormungandr (the hunt: dodge the strike, shoot the head; coil round the ship and electrocute) and the Elder One
  (rune ward; ghost lights; lift and slam / throw, a perfect eye shot drops you). Octopus and serpent specials later.

## v0.7.1: legend fights, part 2: Jormungandr hunts you
- LEGEND_KIND jormungandr -> 'jorm' (jorm.txt section): you sail free (L.sail; the helm, telegraph and W/S work, SPEARS /
  Space fire; no FIRE button, no busy class). Modes: stalk (3.5-5 s, enraged 2.5-3.5; under water: dive 1, a dark shadow
  and bubbles, orbiting you), lock (1.0 s, enraged 0.85, young 1.3; a red ring where you will be in ~1.1 s at your speed),
  strike (bursts up there: 1.1 x dmg if you are inside ring + 0.3 L, else DODGED!), exposed (3.2 s, young 3.8; head up
  with a gold ring; 0.9 x attack a hit, PERFECT x1.6 in the first 0.6 s), then back to stalk or (30%, enraged 45%, young
  20%, if within 30) coil: it circles your ship (the trailing body wraps it), you are held; after 1.2 s it charges:
  hit the head 3 times (young 2) in 3 s to break it (0.6 attack, back to exposed) or be electrocuted (1.5 x dmg, flash).
  jormHead(mon) gives the head position. Camera: high behind your ship (pitch 0.82), pulled back by the separation and
  the serpent size. Legends in a fight have no floating name tag (their bar is at the top).
- Tested: a Skeid that never dodged beat the 1,205-hull Jormungandr in ~40 s with 91 of 536 left.

## v0.7.2: legend fights, part 3: the Elder One's ward
- LEGEND_KIND elder -> 'elder' (elder section in main.js): your ship is held. Modes: ward (7.5 s, young 6; violet ward
  sphere, ghost lights drift at your ship every 0.75 s (enraged 0.5, young 1.3), 0.35 x dmg on contact, one hit banishes
  them), show (it lights a sequence of the four runes RUNES/RUNE_COL floating round your ship, 0.65 s each), input (tap
  them in order or keys 1-4 within 3 + 1.1 s per rune; wrong or slow -> 0.8 x dmg lash and back to ward), open (4 s,
  young 5; ward down, shots 0.3 x attack, PERFECT x1.6 in the first 0.8 s). The sequence grows by one each round (3 -> 6,
  young 2 -> 4). Lift (from the open phase): your ship is dragged up in front of it (boat.dunk negative); after 1.2 s its
  eye flashes open for 0.55 s (young 0.8) at a random moment: a shot landing in that window drops you (0.8 x attack to it),
  one landing early or late tightens the grip (0.5 s less); else slam (1.6 x dmg) or, 35%, flung like a tornado.
  elderEye(mon) gives the eye spot. Camera: behind your ship toward it, low (pitch 0.42).
- Legend fights clear ordinary monsters within 90 and stop new spawns until they end; killMon only marks a legend slain
  when the boss has a lair.
- Tested: a Drakkar bot (perfect runes, Space every 0.27 s) after 90 s had the Elder at 2% and 472 of 938 hull left
  (5 ward breaks, 5 lifts: 2 drops, 2 slams).

## v0.8.0 and v0.8.1: Helheim, the end game (Sean, 2026-10-20 overnight)
- Sean: "put a few agents from opus and sonnet on bug testing and exploit testing ... create larger ships ... ship
  upgrades and designing with new hulls and sails ... a second map ... the underworld where every ship is a version of
  undead and so are the monsters. Burning sky at day, purple swirling abyss at night. All mobs are slightly harder."
  v0.8.0 went live mid-night; v0.8.1 carries the later fixes.
- Testers: six background agents. Wave 1 on a frozen v0.7.2 build (vite preview of scratchpad/snap072 on port 4180):
  exploit + economy (Opus), game loop / progression analyst (Opus), sailing + UI bugs (Sonnet), combat + boss bugs
  (Sonnet). Wave 2 on a frozen v0.8.0 build (snap080 on 4181): Helheim bugs (Sonnet), end-game fun and balance (Opus).
  Each drove its own headless Chromium with Playwright (the package in the npx cache 9833c18b2d85bc59, executablePath the
  installed chromium_headless_shell-1248, with --use-angle=swiftshader). Subagents may not write report files, so each
  sent its report back as its final message; the shared brief is qa/BRIEF.md (+ BRIEF080.md) in that session's
  scratchpad. Reuse the set-up for future test rounds (give each wave a frozen build on its own port so edits to src/ do
  not reload their pages).
- Two realms. `worlds = { mid, hel }`, `let world` is the one you sail in; buildWorld(scene, seed, realm) builds Helheim
  (seed 6661013) the first time you cross (about 1 s, behind the fade) and keeps both after; setRealm(realm) swaps the
  world group, the shore map (ocean.setShore), env looks (env.setRealm), gates, clears monsters, spots, floats, spouts,
  pods and events, and re-marks beaten lairs. P.realm is saved; load() calls setRealm. A new voyage resets to Midgard.
- Helheim's map (world.js): the same five-sea layout with the dead's version of each: Gjöll (centre, black stone, dead
  trees, Gjallarhöfn), Niflhel (north, pale frost, dead white trees), Muspelheim (east, burnt black rock and lava),
  Nástrond (west, bruise-purple marsh, soul lights), Ginnungagap (south, bone shores, bone reefs). BIOME_HEL,
  STACK_PAL_HEL, REGIONS_HEL, HARBOR_NAMES_HEL (Gjallarhöfn, Niflvik, Hrimgard, Surtsholm, Nástrond, Bonestrand; other
  positions than Midgard's), village() in dark wood with purple fires and whale-rib fences, soul lights in every sea, dead
  / charred / bone trees. Lairs (LAIRS_HEL): Hafgufa's Deep (-60, -520, ice-bone spires), Surtr's Forge (520, 250,
  obsidian pillars with molten crowns), Nidhögg's Roots (-440, 380, dead roots of the World Tree).
- The sky (ocean.js SKY_FRAG, uHel and uTime): by day fbm fire clouds rolling over an ember horizon; by night a purple
  abyss, log-spiral arms of violet light turning round a black heart at the zenith. env.js LOOKS_HEL (day / dawn / dusk /
  night), REGION_LOOKS_HEL (water tints, Niflhel / Muspelheim / Nástrond haze), WEATHER_HEL (ember storm, ash rain, grave
  mist, with their own water). Ash falls everywhere, embers in Muspelheim, rime in Niflhel; rain falls as grey ash.
- The gates (hel.js makeGate): Hel's Gate at GATES.mid (-548, 190) in Midgard's Mist Sea (open water; Midgard's islands
  were not moved), the gate home at GATES.hel (62, 36) by Gjallarhöfn. A ring of eight rune stones, a log-spiral shader
  disc and a beam; sealed it smoulders (k 0.25). The context button (🌀 HEL / 🌅 HOME) within 20 + L x 0.3 opens #gate;
  below a Drakkar it only says the gate is sealed. crossRealm: purple #fade 1.1 s, setRealm, the ship 32 out from the
  other gate facing the centre, grace 6 s, home = the nearest harbour, a realm banner. P.beenHel; leaving a harbour with
  a Drakkar before you have been says where the gate is. 🌀 / 🌅 on the maps.
- Undead (monsters.js UNDEAD, undeadPal, makeMonster(type, v, scale, sea)): Helheim's sea picks the kind: Drowned (rot
  green), Rime-dead (pale blue), Burning (charred, ember glow), Corpse (bruise purple), Bone (bare bone, violet glow);
  the colours mix toward the sea's own, the eyes glow and 'rings' glow bands show like ribs. Ships: HEL_PALS in ship.js
  (Draugr Longships, Rime Wraiths, Muspel Burners, Corpse-ships of Nástrond, The Bone Fleet, Hel's Soul Barge) through a
  generalised ghost colour table (GH0 / G, pal.gc). Undead shed soul-light (soulFx). Everything in Helheim is +0.5 level.
- Past the Drakkar the seas keep growing: lvShift() = max(0, tier - 4) (+0.5 in Helheim); spawnTable uses the tier-4
  table with every level raised by the shift; raider sizes follow (up to Naglfar); monsters grow 7% a size; at most 10
  roaming (+2 at night). Fishing-bite sharks, dig guardian crabs, serpent ambushes and fleets follow your level too.
- Souls (P.res.s, 👻): undead kills give max(1, round((0.6 + lv x 0.35) x ship 1.5 x young 3 x barge 3 x perk)); a
  Helheim legend 150; soul orbs (30% of floats in Helheim) 1 each; Helheim treasure spots 2-5; fleets 4 x (tier + 1);
  bounties; deeds. Never lost on sinking. HUD shows 👻 once you have any or are in Helheim; costs show 👻 as a 4th part.
- Upgrades (UPG): rune levels 4 and 5 for shields, armour, ballista, fire pots, sail, oars (ram 3, hooks 4, nets 4),
  costs [w, i, g, souls]. SH_DEF [0, .12, .24, .36, .42, .48], AR_DEF [0, .08, .16, .24, .27, .30], MEND up to 0.007.
  Looks: glowing violet (4) / gold (5) shield bosses, dark rune-iron plates with glowing rivets, glowing bolt tips.
  Pat's sail grows two more stages (purple and gold at 4, black with a ring of glowing runes at 5).
- Ships (ship.js SHIP_TIERS 5-7): Busse (L 26.5, royal head, 1300 / 650 / 2600), Ormen Lange (L 30, a great gold wyrm
  head with a gold crest, 2400 / 1300 / 5000 + 300 souls), Naglfar (L 34, a bone skull figurehead with violet eyes, iron
  nails studding stem and stern, 4000 / 2400 / 9000 + 800 souls, only once Hafgufa, Surtr and Nidhögg are slain: P.helWon).
  HOOK_NEED 4 for sizes 6-8; shipValue up to 9000.
- Helheim's legends (LAIR_NAMES / LAIR_NEED / YOUNG_NAMES, legendLv = Midgard level + 2.6): Hafgufa (kraken siege, need
  Busse, lv 7.6, scale x1.15), Surtr the Burning (the Elder One's ward, need Ormen Lange, lv 8.2), Nidhögg (Jormungandr's
  hunt, need Ormen Lange, lv 8.8, the Ashen variant). Fight messages use the legend's own name. All three: helWin()
  ("HEL'S REIGN", Naglfar unlocked). legendCount(hel); the pause screen shows both realms' counts.
- The shipwright (harbour card 🎨 -> #wright bottom sheet): HULLS (oak, pine, ash, tar, iron, gilded, dragon, bone,
  naglfar) and SAILS (pats, stripes, raven, sun, wolf, serpent, gold, kraken, elder, hel, surtr, nidhogg), each a perk via
  perk(k) (spd turn hp def atk gold sight mend fire thor fish souls curse) applied in maxHp, topSpeed, turnRate, defense,
  attack, sightRange, MEND, fire burn, Thor, fishing, souls, the curse. Bought (got.cost) or left by a slain legend
  (got.legend: Jormungandr -> Dragon-scale hull, Kraken -> Kraken ink sail, Elder One -> Elder sign sail, Hafgufa ->
  Nail-hull, Surtr -> Surtr's flame sail, Nidhögg -> Nidhögg's wings). Looks: HULL_LOOK (plank colours and top strakes)
  and new sail textures in sailTexture. Only on Pat's own ships (shipPal). Tap a card to preview; the camera swings round
  the ship and fits her into the space above the sheet (viewOff 'wright', wrF).
- Bounties (makeBounty, bountyHit, bountyCard): hunt N of a species (BTYPE), sink or take N ships, slay N in a sea, fish N
  spots, break a fleet, slay a legend's young. One at a time, counted only in the realm taken, claimed at any harbour, pay
  v x 22 x 1.45^tier gold + timber + iron (+ v x 2 souls in Helheim). Offers are kept per harbour until taken. HUD: 📜 n/N.
- Pat's saga (DEEDS, sagaCheck, drawSaga; pause menu 📜 PAT'S SAGA): 12 deeds in 3-4 ranks (Monster Slayer, Shark Hunter,
  Serpent Bane, Terror of the Deep, Ship Breaker, Fisher, Treasure Hunter, Bounty Hunter, Legend Slayer, Soul Reaper,
  Master Shipwright, Lord of Ships); each rank pays 60 x rank^2 x (tier + 1) gold (+ 8 x rank^2 souls once you have
  souls); the best deed gives a title on the pause screen. P.st counts kills by kind, ships, fish, digs, souls.
- Smaller: HUD lair wave counter, keyboard digging (arrows / WASD + Space / Enter), "Hel's bounty", no porpoises or
  northern lights in Helheim, the treasure knarr is Hel's Soul Barge there, frame time never negative.
- Showcase: ⛵6-8 ships, 💀1-6 Helheim fleets, 🌍 Midgard / 🔥 Helheim looks, `window.__undead = '<sea>'` before a monster
  button shows its undead version.
- Save: realm, hull, sailD, owned, bounty, bounties, st, beenHel (cleanSave whitelists all of them; upgrades are also
  capped at tier + 1 on load now).
- Tester fixes in v0.8.0 (wave 1 reports; the agents could not write files, their reports came back as messages):
  - Spawns (loop analyst: the old table ran out at level 5, a Drakkar saw 45-70% green, a Naglfar nothing): a species may
    spawn while its own level <= size + 1.7, weighted toward your size (gaussian, sigma 1.5); levelled() sets its level to
    max(own, size + DELTA) with DELTA -1 / -0.5 / 0 / +0.5 / +1 / +1.5 at 20 / 20 / 25 / 15 / 12 / 8%; a beast 1.5+ levels
    above its own is 'Dread' (Midgard) and 6% bigger a level; raiders come in sizes around yours (up to Naglfar).
    lvShift() is no longer used by spawns.
  - Monster damage above level 4 grows 1.75x a level (keeps pace with the hull); sea monsters have 1.3x hull (ships and
    legends unchanged); monster iron 2 + 3 x level.
  - Fire Pots (they were free extra shots): a pot takes one of the volley's three shots, one pot a volley at most, pots a
    battle = 1 + floor(level / 2), hit 2.2 / 2.4 / 2.6 / 2.8 / 3.0 x by level (x perk). Measured after: a Snekkja without
    a ballista beats a same-level beast in about 7 s with one enemy turn (6% hull); fully upgraded, still one volley.
  - Defence tops out at 0.7 (0.85 with Thor's Fury); rune levels SH_DEF 0.40 / 0.44, AR_DEF 0.26 / 0.28; rune ballista
    +15% a level.
  - Legends die only in their own fights: spears and bolts outside it "shrug off" (and make it chase), lightning and the
    ram skip bosses, a legend left alone 20 s heals; legend FLEE costs 1.2 x dmg, stuns it 2.5 s and turns you away from
    it; killMon returns if the monster is already dead (lightning used to pay a kill twice); BATTLES: CLASSIC no longer
    changes legend fights.
  - Legends pay 70 x 1.6^level gold + 40 iron more; after a legend falls the lair rests 60-110 s; a slain legend can rise
    again in wave 2+ ("<name> Reborn", chance 0.12 + 0.06 a wave, max 0.4, only for a big enough ship) at +0.5 level per
    rebirth, five times, paying 25% more each time (P.reborn).
  - Kiting: a beast you shoot turns and sprints at 1.1 x your top speed for 3.5 s (enrage). The ram does at most 60% of a
    beast's hull. The treasure knarr / soul barge escapes at 1.3 x your speed when her time runs out and throws at most six
    loads.
  - Jormungandr: the red ring is the real hit area (r = 0.3 L + 3, hit if within r + B/2) and the lock lasts 1.9 s (1.4
    enraged, 2.4 young), so stopping or turning hard gets you out; it now really dives while it stalks (animMon leaves the
    pose to updateJorm); its FLEE was under the minimap: legend fights hide the minimap and the ⇄ button.
  - The greyed BOARD button no longer ends a ship fight; the battle line frames every fleet ship within 34 along the line.
  - The Elder One's lift no longer creeps the ship into it (it eases back after a drop or slam).
  - Quitting: SAVE & QUIT is disabled in a fight or mini-game ("FINISH THE FIGHT FIRST"); begin() always ends any fight
    (abortFight); updateBattle never runs on the title; no autosave inside a fight; arrows landing in a menu do nothing;
    a hull at 0 out of a fight sinks you next tick; win screens wait until you are sailing and close the pause menu.
  - Harbour: a second tap on the same spot within 0.4 s is dropped (hbLock); the REPAIR card stays ("Your hull is sound")
    so cards never move under your finger; prize ships sell for [40, 110, 240, 480, 900, 1700, 3200, 6000] (x1.5 ghost,
    x1.25 treasure); SAIL HER keeps the hull fraction, needs a refit of half her build price if she is bigger than your
    ship, and obeys the ship locks (shipLock: Busse needs P.won, Naglfar P.helWon); the trader sells 15 x (size + 1) iron
    for 6 gold each and 20 x (size + 1) timber for 3 each (x (1 + 0.15 x size)).
  - The Busse is built only once the Kraken, Jormungandr and the Elder One are slain. Rune level 4 costs timber, iron and
    gold only (a goal for the Skeid and the Drakkar); level 5 adds 70-90 souls.
  - Lanterns: at night +1 fishing spot a level and 25% treasure spots (was purely cosmetic).
  - Saves: the home harbour is found by idx (it swapped Frostvik and Ravenfjord on every load); cleanSave text and keys are
    type- and own-property checked ('constructor' as a design key used to crash perk()); a save that throws is kept as
    pr_save_bad and CONTINUE is hidden; a ship saved inside land is put back at her home harbour; upgrades are capped at
    tier + 1 on load.
  - Save codes: longer than 20,000 characters refused; unpacking stops at 256 KB (a small code could expand to 400 M
    characters); pr_save over 100 KB refused; applyCode puts the old voyage back if the new one cannot be stored; the
    summary shows only what will load.
  - Memory: removeMon frees the monster's own geometry and materials (disposeTree; the shared cached ones are marked
    userData.shared in geom.js and ship.js), as do lightning bolts, warning rings and rebuilt ships (geometry count stays
    flat over 20 rebuilds).
  - UI: on short landscape phones (<= 460 px tall) the context and fire buttons sit beside the telegraph (DOCK covered the
    fire button), and at <= 360 px DOCK sits beside the view button; the treasure dig fits a landscape phone (grid sized by
    height, scrolls); the tutorial card stops short of the view button; the wheel stays clear of the minimap in portrait;
    the wheel centres only on a real double TAP; held C / E do not repeat; keys let go on window blur; HELM view zoom moves
    the eye back and up; DOCK plans with the hull's own clearance; the title leads with CONTINUE VOYAGE and NEW VOYAGE
    takes a second tap within 4 s (it deletes the save); frame time is never negative (it set Thor and Cursed at start).
  - Pat's Hall (Patsholm only, HALL): five stages for 2k / 5k / 10k / 20k / 40k gold (+ timber, iron): a fourth mooring,
    fish +2 gold, 10% off upgrade and ship gold, crew mend +25%, +5% damage and hull.
- Later the same night (after v0.8.0 went live):
  - Ordinary fights: an octopus can wrap its arms round your hull and a serpent or leviathan coil round your ship (22%
    of the first attack of a round; foe.special 'grab' / 'coil' from startBattle). Hack at it fast (the 🪓 HACK AT IT
    button, Space or any dodge key or swipe) 5 + min(5, round(0.7 x level)) times in 2.8 s to break free; too slow and it
    drags you under / crushes you for 1.4 x a hit (minigames.js specialUI, breakTap, answer 'G').
  - Ship battles: when her reckoning crosses she takes aim for 0.8 s (SHE AIMS flashes) and fires at the locked spot; a
    speed change on the telegraph during the aim makes two volleys in three fall wide (measured: steady 6 hits of 6
    volleys, reacting 2 of 7). Her reckoning leads you by the flight time + 0.8 s.
  - The Elder One's runes face the camera, are sized by their distance (about 30 px on a phone) and follow your ship
    round after it is thrown.
  - The sunstone (Compass II) also points to your nearest treasure map's ✕ and your wreck.
  - Name your ship: ✎ NAME HER on the shipwright sheet (prompt, markup stripped, 20 letters), shown in the HUD; saved
    as shipName.

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

## Controls (current, v0.8.1)
- Ship's wheel: a big half-wheel centred across the bottom (hub just below the screen edge; layoutHelm sizes it: phone
  R = clamp(min(W*0.24, H*0.15), 64, 105), tablet R = clamp(min(W*0.3, H*0.28), 100, 240)); swipe along it to turn,
  rudder = sign*|angle/HMAX|^1.4, HMAX 2.4. Only the wheel takes touches. It stays where you leave it; double-tap centres
  it. While backing (BACK) the wheel steers like reversing a car.
- One-handed layout (v0.6.3): every control on one side (default right): pause at the end of the top row; chart 🗺,
  view (TOP / CHASE / HELM) and ⚓ DOCK under it; SPEARS / the action button above the sail telegraph; the telegraph a
  column at the bottom edge, FULL on top: FULL / HALF / ROW / STOP / BACK (THR_LV -0.22, 0, 0.3, 0.6, 1; BACK is red).
  The minimap and the ⇄ swap button sit on the other side; ⇄ mirrors everything (html.leftHand, localStorage pr_hand).
  Tablets keep 28px clear at the top (--padTop). helmLift shifts the camera view up by the wheel height; battles use
  their own offset ('broad' for the action fights puts the fight at 40% of the screen).
- iPad full screen: the home-screen web app (manifest display fullscreen, icons, apple tags); fullscreen.js shows an Add
  to Home Screen tip on iOS. No control needs a downward swipe.
- Courses: tap the sea, the minimap, or the sea chart (pinch / drag / tap). ⚓ DOCK (SAIL TO DOCK) plans a route around the
  islands to the nearest harbour, sails it at FULL, flees fights, docks on arrival; STOP or a new course ends it.
- The game starts in the CHASE view at zoom 1.6. Pinch or the mouse wheel zooms (0.3-2.6); each battle has its own zoom
  starting at 1, and your sailing zoom comes back after.
- Keyboard: W / S (or up / down) step the telegraph one notch, held they run through; A / D the wheel; Space throws a
  spear ahead (aims only at a monster within 0.55 rad of the bow, else straight on) and fires in every fight; C cycles the
  view; E opens and shuts the sea chart; in the mini-games Space = FIRE / THROW / the middle block / cast and hold to
  reel, A / D = dodge or pull left / right, W = block too, F = fire pot, B = board; 1-4 tap the Elder One's runes.
- The SPEARS button still auto-aims at the nearest monster; the context button shows DOCK / FIGHT / SALVAGE / FISH / LAND /
  SLOW. Pause works everywhere, fights included.
- Sound: SOUND and MUSIC switches on the title and pause screens (MUSIC off = no saga music and the iOS audio session goes
  'ambient' so other apps keep playing). The pause menu also has ⚔ BATTLES: ACTION / CLASSIC (localStorage pr_broad).
- HUD: hull bar, timber / iron / gold / fish (and 👻 souls once you have any or are in Helheim), ship name, sea, weather,
  buffs (Thor, Bifröst, Cursed, 🔨 Crew mending, ⚔ Lair wave n, 📜 bounty n/N).
- v0.8.0: the title leads with CONTINUE VOYAGE when there is a save; NEW VOYAGE then needs a second tap within 4 s. SAVE &
  QUIT is disabled during a fight or mini-game. Near Hel's Gate (or the gate home) the context button shows 🌀 HEL / 🌅
  HOME. Pause has 📜 PAT'S SAGA. Short landscape phones put the context and fire buttons beside the telegraph. In the
  treasure dig, arrows / WASD move a marker and Space / Enter digs.

## Rules as built
- Ships: Faering, Karvi, Snekkja, Skeid, Drakkar, and since v0.8.0 Busse, Ormen Lange, Naglfar. Hull 100 x 1.75^tier x
  (1 + 0.25 x armour) (x design / hall perks). Speeds 9 to 14.8. See the v0.8.0 section for the end game's rules (spawns,
  damage, pots, souls, realms), which override the older lines below where they differ.
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
- Never append a `// comment` to code you splice into the middle of a long one-line function: it swallows the rest of
  that line. It bit five times on 2026-10-19/20, and `node --check` can still pass while the game breaks at runtime.
  Put comments on their own line, and run `node tools/scan-comments.cjs` (flags any line where code follows a comment;
  the helm comment block and the SpineTube comment in geom.js are the two known false positives).
- Check syntax with `node --input-type=module --check < src/main.js` after every patch.
- Deploy check: poll the live index for the main bundle and grep it with `grep -F '"0.7.2"'` (a plain grep of 0.7.2
  treats the dots as wildcards and gave a false positive once).
- Dev server: preview_start `game` runs on 5174 (5173 is taken). `.claude/launch.json` also has `built` (vite preview on
  4173) to test the real build with its Content-Security-Policy.
- A browser javascript_tool call that runs longer than ~45 s fails ("Internal error"); split long simulations into
  several calls. Freeze for screenshots with `__pr.timeScale = 0` (then wait 2 s); `__pr.step` also runs the camera.
- Spawn tests: override Math.random briefly (e.g. `Math.random = () => 0.9`) to force a young legend or papa, then
  restore it. Teleporting the boat next to a lair or harbour triggers their messages and spawns; teleporting can also
  leave the test save in odd places (clear pr_save in the test browser if needed).
- `window.__pr` now also has: startBroadside, broadFire, endBroadside, broadSwap, BROAD, planRoute, autoDock, cleanSave,
  killMon, giveMap, prizeChoice, startDig, boardInfo, startAir, liftK, pods, spawnPod, EV, startEvent, wreck, sink.
- New names must not collide with existing ones (ringGeo was taken by the lightning rings; the legend ring is lgRingGeo).

## Ideas not built yet
- From Sean, not yet done: an easier whirlpool escape (offered on 2026-10-20, unanswered).
- From the testers, not done (lower priority): the enemy's aim in the action ship battle barely reacts to your speed
  change ("change speed to spoil her aim" is nearly cosmetic: shrink her error while she aims); the Kraken's tentacles
  can look pale from some angles; at zoom 2.6 in a fight the ocean mesh edge shows as a dark ring; long #msg lines run
  under the right-hand buttons on a landscape phone; the harbour's SET SAIL is at the end of a long scroll on a phone (a
  sticky button would help); world wrecks' "looted" timers are not saved (a reload refills them); the salvage mini-game
  is generous (half the pulls bring up the whole wreck); waterspouts are the most CPU-heavy weather (check on an iPhone).
- Loop analyst ideas not built: a bestiary (collect every variant, rewards at 25/50/75/100%), Ragnarök depth after Hel
  (an endless ladder of harder seas), a finale legend (Hel herself), Helheim hazards per sea (lava seams, blade shoals,
  grinding floes), soul tides (night rings worth double souls), a captain's log, renown titles.
- Loose ends: the roster artifact shows none of the v0.5-v0.8 content (prize skins, young legends, undead, Helheim
  fleets, the new ships); the classic mini-game battle still exists behind ⚔ BATTLES: CLASSIC (ship fights only now).
- Bigger ideas: crew management, quests from harbour jarls (beyond bounties), trade routes between harbours, co-op raids,
  sea birds over the Warm Sea, a song file from the device as music, volume sliders, an itch.io zip like Dead City.

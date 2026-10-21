# Valhalla's Tide (was Pats Reign): project notes and session handoff

READ THIS FIRST after a context compaction. Current as of 2026-10-21, version 1.10.2. The game was renamed Valhalla's Tide at v1.0.0 (2026-10-21): the player is
the Jarl (the Jarl's saga, hall and crest; Valholm is the home harbour); older notes below still say Pats Reign and Pat. Where older notes or memory
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

## Where we left off (2026-10-21, v1.10.2: Sean is playtesting and sending one-line requests; itch.io release in progress)
- The game is Valhalla's Tide (renamed at v1.0.0; the repo and Pages URL keep pats-reign). Sean plays each push and sends
  batches of suggestions; the loop is: build and test each one (one headless browser at a time, see the CPU rule in
  memory), push when a batch is done, and when he says "zip" rebuild release/itch/valhallas-tide-vX.Y.Z-html5.zip with
  C:/Windows/System32/tar.exe (not PowerShell) and send it with SendUserFile. The itch page settings and text are in
  release/itch/itch-page.md; the trailer song, clip prompts, six 540x960 clips, banners, cover and background GIFs are in
  release/itch (the wide-sides background GIF render and a fight-tester rerun were parked when his PC pegged at 99%).
- Test scripts for this round live in the session scratchpad (C:Userssean_AppDataLocalTempclaudeD--ClaudeCode-012-2026-10-19-PatsVikingd01531f-c96e-4dff-94e8-3102c3aaf357scratchpad):
  tutend.cjs (the whole 13-step tutorial), parrytest.cjs (perfect shots), switchtest.cjs (mid-fight mode switch),
  beasttest.cjs / beasttest2.cjs (action beast fights), colltest.cjs (collisions), feel.cjs (helm camera, wreck slow-down,
  status line), thrshot.cjs (telegraph colours). The regression is the older scratchpad's regress.cjs / layout.cjs (see
  the v0.8.0 section) run with URL=http://localhost:4183/ against a vite preview of dist.
- Open from Sean, not yet asked for: nothing pending; the v0.8.x whirlpool-escape tweak (halve the heading twist at FULL
  sail) was offered and not taken up.

## Where we left off before that (2026-10-21 morning, v0.8.x, after the overnight end-game build)
- Sean's overnight request (2026-10-20): put Opus and Sonnet agents on bug and exploit testing, play every part, judge the
  loop's fun; build what a long end game needs: bigger ships, upgrades, hull and sail designs, and a second map, the
  Underworld (every ship and monster undead and slightly harder; a burning sky by day, a purple swirling abyss by night).
  "Run through the night. Test as you go."
- Done and live (see the v0.8.0 section below): Helheim (second world, its own seas, harbours, legends, sky, music),
  Hel's Gate in Midgard's Mist Sea (opens with a Drakkar), undead monsters and draugr fleets, souls, rune upgrade levels
  4 and 5, the Busse / Ormen Lange / Naglfar, the shipwright (9 hulls, 12 sails with perks, ship names), bounties, Pat's
  saga (deeds and titles), Pat's Hall (gold sink), reborn legends, ordinary octopus grabs and serpent coils, plus the
  tester fixes (spawns follow the ship at every size, fire pots take a shot, legends only die in their fights, many UI,
  save and memory fixes). Deployed as v0.8.0, later fixes as v0.8.1 to v0.8.3 (see below). v0.8.4 (the end-game tester:
  the end game was about 1.5 bot-hours) added rune levels VI-VIII (one per great ship), 13 more designs (34 in all), harder undead
  with their own fight moves, tougher Helheim legends, Hel's tithe, lair trials, Hel's armada, and fixed old saves
  never getting their legend designs and a geometry leak. v0.8.5 tuned the pacing from the tester's re-run (Naglfar
  measured at 2.5-3.4 bot-hours with gaps under ~10 min, then 1.5-2 h of rune VIII; a human perhaps 1.5-2.5x that).
  v0.8.6 fixed the bug tester's finds (ballista VI-VIII reloads, rune levels lost on reload aboard a prize ship).
- Sean has played none of it yet. Expect balance feedback. The knobs: lair waves, rebirths and trials (lairSpawn,
  lairTrial), souls per kill (killMon: 2 + 2 x (level - size)), rune level prices (UPG, souls in cost[i][3]), TIER_COST
  5-7, design prices (HULLS / SAILS got.cost, got.need), HALL, Hel's tithe (titheCard), bounty pay (makeBounty), monster
  hull x1.3 and the undead x(1.4 + 0.2 a size past the Drakkar) (spawnMon), Helheim legend multipliers and rageAt
  (startLegend), DELTA (spawn levels), pots (potK), Jormungandr's lock 1.9 s, the armada (raiderFleet(true), EV.armada).
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

## v0.8.0 to v0.8.6: Helheim, the end game (Sean, 2026-10-20 overnight)
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
- v0.8.2 (hotfix after the Helheim tester): Helheim's treasure event (the soul barge) threw inside tick() because
  HEL_PALS had no 'barge' entry, and the frame loop died (the game froze until a reload, about a 75% chance within 10
  minutes in Helheim). HEL_PALS.barge added (gold glow), spawnMon falls back to HEL_PALS.home, and frame() now asks for
  the next frame first and wraps tick() in try/catch (an error is logged; the game runs on). UND() merges GH0 before
  reading colours (Gjöll ships had undefined shield colours). Also: the Bestiary deed (P.st.v counts each Midgard variant
  'type:v' and each undead kind 'u:type'; ranks at 10 / 25 / 40), the phone HUD's second line wraps clear of the right
  column, a named ship shows only its name in the HUD, an empty fish count hides, CONTINUE VOYAGE shows the saved ship and
  realm, Midgard raiders of Naglfar size get the wyrm head (the skull is Naglfar's alone).
- v0.8.3 (the Helheim tester's other findings): HUD numbers shorten (12k, 1.2M) and the counters shrink on phones under
  430 px wide so five fit beside the hull bar; sailOut(h) picks where a ship leaves a harbour (and rises after sinking):
  a fan of spots out from the dock, clear of land for the whole hull, on the heading with the most open water (big ships
  used to start inside Frostvik's channel and crawl); the HELHEIM / MIDGARD banner is no longer overwritten by the sea's
  banner (curSea set after crossing); #gate and #paused scroll from the top on short screens; names ("The Rime-dead
  Dreamer", no "Drowned Drowned God", "Warlord of the Bone Fleet", "an Ormen Lange", "Nail-hull", the young legends'
  own names in their fight warnings, NÁSTROND); treasure dug up in Helheim pays 10 + 3 x size souls and Helheim's maps
  use Helheim landmarks (LANDMARK_HEL: grave-stone, black ice, smoking rock, skull on a stake, great rib-bone); F does
  the round context button's job on PC; no context actions (the gate included) while the ship is in the air.
- v0.8.4 (the end-game tester's report; it had tested a v0.8.0 build from before the wave-1 fixes, so its fire pot, defence
  and price numbers were partly out of date):
  - Leak: every spear and ballista bolt made a new tip cone, every fire pot a sphere, every fishing spot and loot float new
    shapes, none ever freed; they now share cached geometry (geom.js geo(), imported as sharedGeo). Far fishing spots go
    through removeSpot (frees their cloned ring materials); pods and the wreck are freed with disposeTree. A soak test now
    holds flat (~200 geometries over three long runs). The 525 "arrows" seen in an earlier soak were only arrows launched
    by setTimeout while the test froze the clock (timeScale 0); they clear as soon as frames run.
  - Rune levels VI, VII and VIII (shields, plates, ballista, fire pots, sail, oars; UPG max 8): an upgrade can go one level
    past your ship size, so the Busse opens VI, the Ormen Lange VII and the Naglfar VIII. Souls: V 90-110, VI 170-220, VII
    300-380, VIII 500-600 (plus timber, iron and up to 6,000 gold). Effects: SH_DEF .47/.50/.52, AR_DEF .29/.30/.31, the
    defence cap 0.7 + 0.02 a shield level past V (0.76), speed +5% a level past V, turning +6%, mending 48/54/60% a minute,
    fire pots 3.2/3.4/3.6x (4, 4, 5 pots). The ship card says which rune level a new ship opens and shows her real hull.
  - Ships: Busse 4,000 gold; Ormen Lange 8,000 gold + 400 souls; Naglfar 14,000 gold + 1,000 souls.
  - Designs (34 now, 13 new): soul-priced with a ship size (got.need; "Needs a Busse" until then): Rime-hull, Valkyrie wings
    (Busse); Muspel-forged, Draugr-wood, Yggdrasil, Draugr's banner (Ormen Lange); World-ash, Ragnarok (Naglfar); and
    gold-only dyed ones: Walrus-ivory, Royal purple, Blood-red, Jade and gold, Northern lights (6,000-12,000 gold). Hel-bone
    150 souls, Hel's shroud 200. New sail paintings in ship.js (valkyrie, ygg, draugr, aurora, ragnarok). Master Shipwright
    rank IV at 31 designs; Soul Reaper rank IV at 8,000 souls.
  - Old saves (no owned list) are given the designs of the legends they have slain (cleanSave): Sean's v0.7.2 voyage could
    never get Dragon-scale, Kraken ink or Elder sign.
  - Helheim is harder: undead beasts 1.4x hull and 1.2x damage (draugr ships 1.2x / 1.1x) on top of their half level; the
    undead have their own fight moves (30% of a first attack): burning crabs and eels set the deck ablaze (DOUSE THE FLAMES),
    undead sharks, megalodons and anglers feed on you (DRIVE IT OFF, or it heals by what it took); undead sharks and
    megalodons dive under the black water and burst up behind your stern.
  - Helheim's legends: 1.6x more hull, 1.8x damage (Nidhogg 2.4x), they rage at 70% hull (Nidhogg from the start); a papa
    legend (your ship too small) is a level stronger.
  - The great ships hit harder in a broadside: +12% a size past the Drakkar.
  - Hel's tithe (Helheim harbours): 2,500 x (size - 4) gold for +25% souls for 10 minutes (P.tithe, saved, ticks only at sea).
  - Lair trials: holding a lair to its 5th and 10th wave pays once each (Helheim 100 / 300 souls; Midgard gold and iron;
    P.trials).
  - Hel's armada: once Helheim's legends are slain, on a Naglfar in Helheim a fleet of six comes every 17-23 minutes, led
    by Hel's Admiral, for three times the war chest and 60 souls more.
  - The soul barge throws soul orbs worth 3 (and gold) instead of cargo. Hel's bounties pay souls v x 3. DROP leaves the
    bounty offered at that harbour (TAKE IT / DROP used to reroll it). The saga pays every rank a deed has reached at once.
  - The sunstone points at Hel's Gate (🌀) until you have been to Helheim; the full chart names "Hel's Gate".
- v0.8.5 (the end-game tester's re-run of v0.8.4, ~30 game hours of a bot that buys the next ship first, then the cheapest
  thing that costs souls): the Naglfar came at 4.5-5.2 bot-hours with a 43-50 minute dead stretch before it (saving 1,000
  souls with nothing else to buy); income 25-30 souls a minute after the Busse; Surtr won 1 in 3 for average play while
  Nidhogg was the shortest fight; monster fights back to one volley from Busse VI; a Reborn-legend lair paid ~52 souls a
  minute (twice normal) and sank a Busse 13 times; the armada cost a Naglfar 0-2% hull; 300k gold unspent at the end.
  Tuned to its measured recommendations (with them the Naglfar came at 2.5-3.4 h, gaps mostly under 10 min, all rune VIII
  about 1.5-2 h later):
  - Ormen Lange 250 souls, Naglfar 300 (+ Helheim's three legends). Rune soul costs VI x0.9, VII x0.8, VIII x0.75
    (VI 150-200, VII 240-300, VIII 380-450). The Ormen's designs cost 160-230 souls.
  - Undead beasts' hull 1.4x on a Drakkar, +0.2 a size past it (2.0x on a Naglfar), so the great ships keep a dodge round.
  - Surtr rages at half hull (was 70%); Nidhogg has 2.2x extra hull (was 1.6x). Reborn legends rise only for a ship a size
    past the one they need, and pay 100 souls (+25% a rebirth) instead of 150.
  - Hel's armada ships are a level stronger. Hel's tithe 2,500 on a Drakkar, then 5,000 a size past it (10k / 15k / 20k).
    Pat's Hall can be raised from Gjallarhofn too (either home harbour).
  - Armour past V counts 0.01 a level past the 0.7 defence cap (its card says rune levels are mostly hull).
- v0.8.6 (the v0.8.4 bug and exploit tester, Sonnet, on a frozen build; no blockers):
  - Ballista VI-VIII took both reloads to nothing (0.2 s at sea, 0 s in a broadside, 27 volleys in 2 s): the rune levels
    now shave 0.05 s each (sea 0.95 -> 0.8 s, broadside 0.9 -> 0.75 s).
  - A save made while sailing a small prize ship capped the upgrades by her size, so a Naglfar's rune levels were lost
    on reload: the cap is now the biggest ship you own (your own ship waits among the prizes); cleanSave keeps four
    prizes (Pat's Hall's fourth mooring was dropped on load).
  - NEW VOYAGE clears the tithe, the trials and the bounty offers; previewing a design no longer clamps the hull to the
    preview's smaller hull; the chart's gate label is clamped onto the chart; the status line lists Thor, Cursed, lair
    wave and bounty first (a portrait phone cut the end of it).
  - Hel's tithe runs only in Helheim and counts on legend souls; Helheim fleets keep their own colours (the armada showed
    two fleets' names); "draugr" ships in Helheim's fleet messages; DROP returns a bounty to the harbour it came from; the
    ballista weak spot grows to VIII (clamp 0.5); the save-code summary counts levels past V; rune glow colours past V
    (VI Muspel orange, VII Yggdrasil green, VIII Bifrost ice) on shield bosses, plate rivets and bolt tips.
  - Verified working by that tester: rune VI-VIII locks, prices and effects (no NaN), cleanSave caps and save-code round
    trips, old saves getting legend designs, design locks and perks, the tithe, the trials, the armada, the barge orbs,
    bounties, the sunstone, the saga, the undead and legend fights, and the leak fix (geometry flat over 60 cycles).
- v0.8.7: the action battle's line search tries a shorter run-up, more centres and fewer foes before giving up near land
  (it went classic a quarter of the time for a big ship with a fleet) and says "close quarters" when it must; the pause
  switch reads ACTION BATTLES: ON / OFF. The Bestiary artifact gained a Game mechanics section (tools/roster-mechanics.cjs,
  44 cards with notes boxes).
- v1.0.0 (the rename and the itch.io release): Valhalla's Tide; logo public/logo.svg (a longship on a curling wave
  beneath the sun), rendered to the icons and release/itch (cover 630x500, banner 960x400, social 1200x630, icon 1024,
  nine 1920x1080 screenshots, an 8 s 9:16 gameplay clip, video-prompts.md) by scratchpad logo-render.cjs / itchshots.cjs /
  clip.cjs; the itch zip is the plain vite build (base ./, index.html at the root, showcase left out): release/itch/valhallas-tide-v1.0.0-html5.zip,
  made with C:/Windows/System32/tar.exe -a -c -f (PowerShell Compress-Archive writes backslash paths that itch cannot read;
  git-bash tar makes a tarball). Tested unzipped under /html/12345/ inside a 1280x720 iframe (how itch serves it): loads and plays.
  The repo and the Pages URL keep the pats-reign name. The Bestiary is release/valhallas-tide-bestiary.html (same artifact URL).
- v1.0.1: a gentler start: the tutorial says mouse wheel on PC; the little map opens the chart instead of setting a course
  (a tap sent the ship somewhere unseen); during the tutorial the chart shows a glowing TAP HERE mark (tutTarget) and the
  first shark rises there; calm(): during the tutorial no events, one beast, no chases but the tutorial shark; until the
  second kill on a Faering no events and three beasts at most.
- v1.1.0: action monster fights (Sean: "action battles on should also affect the monster battles... more animated action").
  startLegend gives any non-naval, non-boss beast kind 'beast' when BROAD.on (BEAST_KIND: bite shark/megalodon/angler,
  slam serpent/eel/leviathan, grab octopus, claw crab). beastStart / updateBeast / beastFire in main.js: modes circle,
  lock (the red ring tracks the ship, then freezes for the last 0.6 s), strike, exposed (head mark, shots land, PERFECT in
  the first 0.6 s), approach, hold (grab: boat held, −1 CREW a second, hack free with FIRE taps: need 5 + 0.8 x level),
  tear (crab: three ticks). Action beasts have 1.7x hull; strike damage 1.3x (slam 1.5x); a dodged strike brings the next
  one in half the time; 70 away for 4 s ends the fight (endLegend('escape')). Camera: a beast branch in the camera code.
  Classic fights: the beast lunges at the hull on its attacks (animMon offset), battleHurt shakes harder. Measured with
  bots (Skeid, upgrades 2, level 3.4 beasts): a dodging, shooting bot wins in 8-22 s losing 10-18% hull; a passive ship
  loses 11-16% in 25 s. The tutorial asks ACTION or CLASSIC (step 6 of 8, tut.choice); HOW TO PLAY is paged (howPager,
  two topics a page) and sits below the sound buttons on the title.
- v1.1.1 (Sean's first play of v1.1.0): the title menu is laid out in the HTML (sound row included) and hidden until the
  script has settled CONTINUE / SET SAIL (body.ready), so nothing moves under a tap; the tutorial card sits beside what
  the hand points at (placeTut; a narrow left-hugging card in portrait) and collapses to a one-line strip at the top in a
  fight (#tut.strip) with the hand on SPEARS; a STOP step before the view step (9 steps); the chart step needs a zoom-in
  past 1.8 on the glowing mark before the tap counts (tut.zoomed, a tap earlier only says to zoom); the tutorial shark
  fights a simple surface round in action mode (L.learn: it circles on the surface, bites every 4 s for half damage,
  every spear hits) and the strip explains that bigger beasts dive; action fights on a Faering or Karvi are gentler
  (small: longer ring, 0.6x damage, a tighter hit radius, longer rests); calm() also keeps the weather calm (no spouts,
  tornadoes, storms or rogue waves while the tutorial runs or a Faering has under two kills); the telegraph is coloured
  by notch (BACK orange, STOP red, ROW/HALF yellow, FULL green; dull until on).
- v1.1.2 (Sean's second round of play notes): the tutorial has 13 steps: after docking it has you REPAIR the hull, TAKE a
  bounty, explains that bounty (bountyText + a hint per kind; a sea bounty is marked 📜 BOUNTY on the chart at that sea's
  centre), then SET SAIL and open THE SAGA from the pause menu (tut.saga; updateTut now runs in play, harbour and paused;
  #tut and #tutHand live outside the HUD so they show over those screens). The perfect shot in action beast fights: the
  strike lands 0.5 s after the beast rises (mode 'strike'); a shot fired in that window parries it (L.parried: no damage,
  PERFECT, 1.6x) and the beast is dazed (mode 'dazed', 2 s, 2.6 on small ships) for free shots; the learning shark rears
  for 0.5 s before each bite the same way. The SPEARS button shows the timing: aimNo red, aimSoon yellow (last 0.6 s of
  the ring), aimNow green (the rising window), aimFree blue-white (dazed / exposed / grab / tear). ACTION / CLASSIC can
  be switched mid-fight from the pause menu: reFight() aborts and re-stages the same fight the other way with both hulls
  carried over (ship fights broadside <-> classic too). Also: the status line names every bonus (porpoises +10% speed,
  escape +35%, Bifröst, Thor x2 damage, tithe +25% souls); the helmsman eases to 3 (salvage speed) near a wreck ahead
  (wreckNear) without stopping; the HELM camera is level with the horizon (it follows the ship's heading and a smoothed
  height, not its pitch and roll); nights are brighter in both realms (env.js night ambient .44/.48, sunK .72/.66).
- v1.1.3 (Sean's third round, from phone screenshots): the tutorial card got in the way, so every step is now one or two
  short lines ("Tap REPAIR to mend the hull"), the card is smaller, and placeTut keeps it clear: on the chart it sits
  below the chart (portrait) or beside it (landscape; updateTut now runs in the chart state too), in the harbour it sits
  at the top and pushes the harbour content down (harbor paddingTop, reset in tutEnd), and a card for a target near the
  top of the screen goes below the target. The hand shows over the harbour (a stray z-index: 6 on #tutHand hid it), so
  it stays on REPAIR, then TAKE IT, then SET SAIL. The bounty is named in the HUD line (📜 Hunt 4 sharks 1/4; "Bounty
  done: claim it at a harbour") and a 13th step at sea points at it with a one-line how-to per kind (BOUNTY_HOW; done
  after 14 s or the first count). The SPEARS button flashed green every frame at the start of the learn fight:
  classList.toggle(name, undefined) flips the class, and L.rear was unset before the first rear; the aim flags are
  booleans now and beastStart sets rear/parried. Snow and ash followed the ship (the Points object was re-centred on
  the camera every frame): flakes live in world space and wrap around the camera target (wrap90); rain drops wrap too
  (wrap100). __pr exposes tut, fall and rain. Tests: scratchpad learnflash.cjs (colour changes per fight), chartshot.cjs,
  snowtest.cjs, tutend.cjs (14 steps).
- v1.1.4 (Sean: mark shark-infested waters and megalodon deeps on the map so things to hunt are easier to find): hunting
  grounds. GROUNDS lists ten seeds (two Shark waters, two Megalodon deeps, Serpent shoals, Leviathan deep, Eel reefs,
  Octopus holes, Angler deeps, Crab flats; r 75-85); grounds() settles each on open water at least 110 from a harbour
  dock, 120 from a lair and 110 from each other (a spiral search from the seed, cached per world as world.grounds, so
  Helheim gets its own placing). updateSpawns multiplies that beast's table weights by six when the spawn point or the
  ship (r+40) is inside one (measured: 38 of 70 spawns were sharks in Shark waters at tier 2, 8 of 73 in open home
  sea). drawMap draws each as a dashed red circle with the beast's icon (GICON), the chart adds the name below; a
  ground whose beast cannot spawn at your tier yet is dim (groundOpen). The chart hint and the bounty tutorial step
  mention them. __pr exposes grounds and groundAt; scratchpad groundtest.cjs checks placing, bias and screenshots.
- v1.2.0 (Sean sent a picture: a bone-white, octopus-shaped kraken with a crested dome, green eyes and suckered arms towering
  over a longship; "make this the actual Kraken, with multiple types and the undead ones; keep the current krakens as
  something else"): monsters.js kraken() is the new model: a merged head (a tall ellipsoid dome on a brow mass, a brow
  plate, five ridges of cone spines, ribs over the dome, side plates, two horns, deep black sockets with glow eyes and a
  transparent halo, cheek folds, a beak) and eight tentacle() arms (R*0.74, 28 rings) with two rows of suckers as one
  InstancedMesh (SPH_LO, placed on the inner curling face each frame). Same anim(dt, st) interface (dive, attack,
  reach) and size R*6 / top R*4.2, so updateKraken and the lair fight are unchanged; krakenEye moved to the new socket
  (lx 0.98, lz 1.3, y +0.72 Rk). Variants: Bone (used, from the picture), Abyssal, Storm, Elder; undead palettes apply
  as before. The old squid-shaped model is the Giant Squid (species squid: variants Abyssal/Storm/Elder Squid; MLV
  3.6/4.2/4.8, speed 7.5, grab in action fights and the octopus grab in classic, GIANTS, a bounty type, the Terror of
  the Deep deed, Mist and Frost sea bias, a Squid deep hunting ground). Bestiary: a Giant Squid family (the old kraken
  pictures copied to squid-N), new kraken-N / -full / -giant pictures rendered headlessly (scratchpad rosterkraken.cjs).
  Tests: scratchpad krakenshot.cjs (showcase shots), squidtest.cjs (squid fights, the lair fight, the ground).
- v1.2.1 (Sean: "I love it" to the skull candidate; "make the old kraken a different monster name and spawn somewhere
  else with its own arena"): the Kraken head is the skull version: a tall tapered dome (a taperTube lathe along a leaning
  axis, mottled by skin()) with a crown spine, five meridians of spines, bony seams and cracks, bony TOR rims round
  deep sockets, cheekbones, a nasal hollow (CON4), a jaw with a row of teeth and two fangs; the body sits higher
  (-0.15 R at the surface) so the face clears the water, top R*5.8, krakenEye y +1.12 Rk. The Giant Squid is no longer
  an open-sea beast: it is Midgard's fourth legend, The Great Squid, at Ink Deep (500, 320: open water south of
  Thunderhaven; LAIRS_MID.squid has late: true so world.js clear() ignores it and the island layout is unchanged;
  lair() builds basalt spires tipped with ink-light round sunken masts). LEGEND_KIND squid -> kraken (the tentacle
  arena fight), LAIR_NEED 1 (a Karvi), legendLv 3.6, boss scale 17.5, young Squid Spawn at 3.5; krakenTentacle takes
  the colours from SPECIES[mon.type]; krakenEye is per type. Winning Midgard needs all four legends (legendCount vs
  Object.keys(LAIRS).length; the banner says n / 4). Squid removed from spawnTable, BTYPE, the grounds and the region
  bias. Bestiary: The Great Squid is a legend card (old pictures). Tests: scratchpad lairtest.cjs.
- v1.2.2 (Sean: move the DOCK button to just over the mini map): #dockBtn sits above the little map on every layout
  (phone: left 8 / bottom 112, the ⇄ swap button beside it at +54; tablet: left 12 / bottom 172, ⇄ at +114; left-hand
  mode mirrors both to the right), rules appended at the end of pr.css; the short-screen media query that parked DOCK
  beside the view button is gone. scratchpad docklayout.cjs prints the three rects on four viewports both hands.
- v1.2.3 (Sean: "in the roster add a section for the monsters' main attack types… animations that show what each thing
  does… a notes box for my suggestions"): the Bestiary has an Attacks section (tools/roster-attacks.cjs: one entry per
  monster with its ACTION-fight move, its CLASSIC moves, its special and its undead form, text taken from BEAST_KIND /
  BEAST_HINT / ATK / minigames SPECIAL), each card with a clip recorded from the game (release/roster-img/attack-<key>.gif,
  320x180 at 8 fps, ~0.5 MB each: the eight beasts from a low side camera, the Kraken arena and a raider broadside from
  the game camera) and a notes box flagged Needs a change. The recorder is scratchpad attackclips.cjs: one headless
  browser at below-normal priority; it starts an action fight, waits for the beast to commit (lock / approach), hooks
  renderer.render to place a side camera, shoots 40 frames at 0.1 s and ffmpeg makes the GIF (then a second ffmpeg pass
  shrinks it: fps=8, scale=320, 48 colours, no dither). __pr exposes renderer and scene for that. The Legends header
  counts LEGENDS.length (four) and the ending needs all four.
- v1.3.0 (Sean's raid design, step one: smashing islands; the design doc is the Claude Docs page "Valhalla's Tide: Raids and
  the Home Island", https://claude.ai/artifact/RyyttCSs8ZE1z7Hf1a1Ekp, with Sean's answers): src/raids.js. Settlements on
  non-harbour islands (R 8-34, 90+ from docks, 200+ from lairs, 120+ apart): Home waters' rival jarls (2) and the Storm
  Sea's Fire cult of Muspel (up to 3). Each: name, jarl, faith, houses (raycast onto the terrain), a landmark, 1-2
  watchtowers that shoot arrow volleys within 70 (fire cult also fire bursts), a stake ring in the shallows that blocks
  and scrapes the hull, villagers as one InstancedMesh walking between houses (they run for the hall on the alarm).
  Spears/bolts hit the nearest tower or wall when no monster is in range (fire() fallback). Destroyed: explode() =
  additive fireball sprites, a point-light flash, a shockwave ring, debris, smoke, embers, shake. All down: a gold ring
  at the landing, RAID button; the crew (instanced) run between houses, houses burn, a loot bar (22 s camp, 40 s
  village), guard ships spawn (spawnGuard); away > 70 when they come: a flare and RETURN (sailTo via the autopilot).
  Sacked: gold/timber/iron/fish, thralls (P.thralls), charred ruins; after 480 s (and you 160+ away) it rebuilds a
  level higher under a faith that wards what broke it (COUNTER: fire -> Ran, bolt -> Thor, spear -> Loki). The Fire
  cult's sack gives P.spells.breath: Dragon's Breath (#breathBtn, 22 s), a fire cone from the bow, 4x attack to
  towers and monsters in it. Saved in P.raids / P.spells / P.thralls (cleanSave). Chart icons 🏘 🔥 💀.
  Tests: scratchpad raidtest.cjs, raidshots.cjs.
- v1.3.1 (Sean: very low fps on the tablet; every base needs a dock where you can trade before you raid; keep the level
  colours): triangles per frame cut from 520-620k to 175-217k (tablet size, scratchpad perfprobe.cjs / triprobe.cjs):
  trees were one instanced mesh per kind for the whole world, all drawn every frame (240k for pines alone); now split
  into 200-unit tiles (world.treeChunks) hidden beyond the fog by world.setNear(camTgt), lower-poly (5-sided open cones,
  4-sided trunks) and three in five kept. Ocean grid 170 -> 140; shared SPH 14x10 -> 11x8 and CAP 3,10 -> 2,8. The
  villagers' ground height is a per-village 2-unit height grid (no ray casts while they walk). Still heavy: the player's
  ship (~59k at Skeid, crew and shields) and world-wide instanced rocks and bergs (~100k, not tiled yet).
  Settlements: a dock each (camp 8, village 13 long) through a gap in the stakes, its end is the landing; at a calm
  settlement's dock TRADE opens their market (jarls sell timber, the fire cult iron; sell fish); they only sound the
  alarm when attacked (or on sight once you have raided them). Names on the chart and the sighting use danger(lvl).
- v1.3.2 (Sean: music still crackles on the iPad; is draw distance used?): on iPhone/iPad the music reverb is a feedback
  echo (one delay + lowpass) instead of the ConvolverNode; world.setNear also hides islands, harbour villages and lairs
  past the fog; shared CYL 12 -> 8 and DISC 18 -> 12 sides (the Skeid 59k -> 40k triangles). Camera far stays 6000 (the
  sky dome and far-water ring need it).
- v1.3.3 (Sean: entering a save code on the iPhone moved the whole screen): iOS zooms on focus of any input under
  16px; the save-code textareas are 16px, the viewport adds maximum-scale=1, and on blur the page scrolls back to 0,0.
- v1.3.4 (Sean after his first raid: the raid was OK, a great start; mini-games for beasts and raids need work AFTER
  the outposts are in; no damage from hitting islands; ships too fast and turn too fast; never saw the perfect-shot
  colours): bumping land or ice only slows the ship (v x0.5), no damage; turnRate x0.72, topSpeed x0.9; in a beast fight
  the whole SPEARS button fills with the colour (red / yellow / green, scaled up / blue) and its label reads WAIT / READY /
  NOW! / FIRE (fireKey reset in clearLegend restores SPEARS). Sean also said the shark and serpent fights feel too alike.
- v1.3.5 (Sean: his thumb hides the button): the ring on the beast (L.mark) takes the same colour (red / yellow /
  green, bigger and pulsing fast at NOW / blue) and shows at yellow and green even while the beast is still rising.
- v1.4.0 (Sean: build out the other peoples and outposts; at least four settlements per sea; rebuilt villages choose from
  ~24 religions; do not let held islands level the player too fast): raids.js PEOPLES gains frost (Rime clans: ice houses
  under snow domes, ice crystals), mist (seidr witches: stilt huts, bone totem, green lanterns) and warm (southern corsairs:
  sandstone, red awnings, domed hall, sun pillar), each with a style key used by build(); NAMES has five per sea;
  pickIslands relaxes its rules in four passes until each sea has four or five (24 in all). BASE_LV home 0 / storm 2 /
  frost 2.5 / mist 3 / warm 3.5 (+0.5 each). Spells (SPELLS, a #spellBar column above DOCK): breath (Fire cult), frost
  (Rime: freeze nearest tower 6 s + stun beasts within 60, G.freezeNear), veil (witches: boat.veil 8 s, towers blind,
  G.loseSight), sun (corsairs: heal 40%); each people's first sack teaches its spell (SPELL_OF). 24 FAITHS each with a
  ward (range, bolt, fire, regrow, heal, sharp, veil, spear, guards, frost, reload, hp, rich, slow) applied in the fight;
  rebuild picks a faith whose ward counters S.lastHit 75% of the time (COUNTER), else any other, and grows a level.
  CLAIMS: after a sack offerClaim() asks to hold it (3 at most): outpost (free repair at its dock), trade post
  (14 x (tier+1) gold a minute), storehouse (3t timber + 1.5t iron a minute). Balance (scratchpad balance.cjs): a kill
  pays 44 / 95 / 131 at Faering / Snekkja / Skeid, about two a minute; claims were 2-5x hunting, now one island is about
  a quarter of hunting; raid loot x0.6 (about 13 kills). Bestiary: "Peoples, faiths and spells" section
  (tools/roster-peoples.cjs reads src/raids.js) with notes boxes for 5 peoples, 4 + 2 planned spells, 24 faiths, 3 claims.
- v1.5.0 (Sean: more spells and combinations, mini tornadoes and rogue waves, summoning the Kraken and the Elder One;
  summons must be late game and need a combination of spells): src/spells.js. Each people teaches a spell on its first
  sack and another on its second (raids SPELLS_OF, P.sacks): jarls Hammer Fall / Mini Tornado, Fire cult Breath / Fire
  Rain, Rime Frost / Ice Wall, witches Veil / Draugr Boarders, corsairs Sun / Gale; the Great Squid teaches Rogue Wave
  (LEGEND_SPELL). Summons are rituals (SPELLS.kraken / serpent / elder with ritual pair + legend): slay the legend, then
  cast the pair within 4 s (Rogue Wave + Draugr, Tornado + Veil, Frost + Draugr); the beast (makeMonster, real model)
  rises by the target and smashes everything within 22 every 0.9 s. COMBOS: 12 pairs cast within 4 s (Steam Burst,
  Ambush Fire, Blizzard, Thor's Dawn, Firestorm, Ghost Run, Maelstrom, Call of the Deep, Thunder of the Dead, Madness,
  Glacier Wave, Fire Tornado), remembered in P.combos. UI: #spellBar2 (four pinned spells + ✦ BOOK, wraps into two
  columns), #spellBook (cast any, ★ to pin, combos found, rituals). raids.js's own bar is hidden; spells.js calls
  R.cast / R.breath / R.cdOf / R.breathFree for the first four. Saved: spells, combos, bar, sacks. Bestiary: every spell,
  rituals and the 12 combos with notes boxes. Test: scratchpad spelltest.cjs, ritualtest.cjs.
- v1.6.0 (design doc step two: bring the loot home and watch Valholm grow): src/home.js. Ten BUILDINGS picked from a list
  (BUILD on the Valholm card at the home harbour opens #buildPanel), three levels each (costOf: base x 2.6^level), each in
  a set slot on Valholm's island (makeSlots: a ring away from the harbour side, ground by raycasting the island mesh).
  Effects through home.K: smithy +5% attack, bone-smith +4% hull, beacon +3% speed, shipyard repairs -15%, temple spell
  recharge -8% (G.cdK in raids.js and spells.js), market fish gold +15%; longhouse room 5/15/40/90; fish racks speed
  families (one per 45 s / (1 + racks) while there is room). People = thralls + families (capped); each earns 0.25 x
  (tier+1) gold a minute. STAGES Landing / Hamlet / Village / Town / Stronghold by people, buildings, raids won
  (P.sacks) and a legend; CLAIM_MAX by stage 1 / 1 / 2 / 3 / 5 (raids maxClaims). Watchtower and walls are for raids on
  Valholm (next). Villagers (instanced, up to 36) walk between buildings; smoke from longhouse, smithy, temple. Saved as
  P.valholm { b, families } (P.home is the home harbour index: do not reuse it). Test: scratchpad hometest.cjs.
- v1.6.1: Valholm saves as P.valholm (P.home is the home harbour index; reusing it broke loading).
- v1.6.2 (Sean: a quick way to test every boss fight at the level players meet it): ⚔ BOSS ARENA (test) on the title.
  ARENA lists the 7 legends (Midgard and Helheim), 8 beasts and a raider with the expected ship (squid Karvi, Kraken
  Snekkja, Jormungandr Skeid, Elder One Drakkar, Hafgufa Busse, Surtr and Nidhogg Ormen Lange; upgrades tier+1).
  arenaStart: testMode (save() does nothing), begin(false, keep) keeps the real save and skips the tutorial, places the
  ship at the lair and starts the fight; when it ends the monsters clear and AGAIN / ARENA (reload) appear. Test:
  scratchpad arenatest.cjs (all 16 start; the real save is untouched).
- v1.7.0 (Sean: the base should get epically big; monuments for each religion we take on): buildings go to level 5
  (longhouse room 5/15/40/90/180/350), two more stages (Great City: 250 people, 14 raids, 2 legends, 3 monuments;
  Capital of the North: 340, 20 raids, 4 legends, 6 monuments), CLAIM_MAX 1/1/2/3/5/7/9. Set pieces in rebuild(): a gold-roofed
  Great Hall on the hill (Town), a stone sea wall with towers round the island (Stronghold), a stone Odin with his spear
  (Great City). Monuments: the first sack of a village of a faith marks it conquered (P.faithsBeaten); the BUILD panel
  lists them and RAISE builds a statue on a plinth in the faith's colour along the shore (P.valholm.mon), each +1%
  attack and +1% hull; cost rises with each (monCost). Up to 60 villagers. Shot: scratchpad epicshot.cjs.
- v1.8.0 (raids on Valholm, first version; Sean is sending his own ideas for raids): home.js startSiege/updateSiege.
  From Hamlet on, every 15-25 minutes of play (P.valholm.lastSiege / nextSiege) 2-5 raiders (or 2-4 crabs, serpents,
  octopuses: "drawn by the fish store", 30%) appear 130 off Valholm and make for the harbour (m.siege; they chase you within
  55, else sail for the harbour; exempt from the 280 despawn). A horn, a warning, a flare and RETURN (raids.flareAt).
  Valholm has health (400 x (tier+1) x walls x stage), shown in #siegeBar; attackers at the harbour wear it down (walls
  -12% each level); the watchtower shoots bolts at the nearest attacker. All dead: Valholm holds (+gold). Health 0: two or
  three buildings lose a level and a fifth of the people flee. More than 200 away for 2 minutes: settled by walls, towers
  and stage against the attackers' levels. Full destruction and choosing a new god (Sean's earlier answer) are not in yet.
  Test: scratchpad siegetest.cjs.
- v1.9.0 (Sean's raid design: two parts): ⚔ ATTACK near a calm settlement (or shooting a tower) sounds the alarm.
  Part 1, the fleet: 1-5 defenders (by level and size) come out one at a time (updateFleet, spawnGuard at lvl + 0.35 per
  ship). Part 2, the bombardment: the town splits into three quarters (Left, Harbour, Right: buildings sorted by angle
  round the village centre), each with a yellow circle offshore spread across the village side. Every house has health
  now (hall x2). Sail into a circle: the gunner mini-game (#bombGame, body.bombOn hides the HUD; camHook puts the camera on
  the deck looking at the quarter): AIM, 2-7 shrinking targets to tap (count by level), then POWER, a sweeping needle
  with a yellow zone (x1) and a green one (x1.5, else x0.5); the volley (bolts + explosions) deals attack x 7 x (0.25 +
  accuracy) x power, weakest building first; health bars per building; next round until the quarter falls; SAIL OFF
  leaves. All three quarters down: finishRaid (loot, thralls, spell, claim). The old smash-and-dock RAID is retired.
  Tests: scratchpad bombtest2.cjs, bombdbg.cjs, bombshot.cjs (volleys run on real timers: tests must wait in real time).
- v1.10.0 (Sean: legend fights are button mash; ACTION version should be like the raid: ship still, first person from the
  ballista, destroy sections such as tentacles and eyes, special moves like a crashing tentacle you mash FIRE to stop and
  being picked up and tossed to a new spot; CLASSIC stays the easier masher; Kraken and Great Squid first): src/legendgame.js.
  With ACTION on, startLegend gives the Kraken and Squid kind kgame (monsters.js now exposes arms, body, head and eye points).
  Parts: every Kraken arm (8) or the Squid's 4 arms + 2 clubs, and two eyes (shielded until half the arms are cut); health
  = the boss hp shared out. Tap a part marker (projected each frame) to aim: the raid's AIM targets then POWER needle;
  damage attack x 2 x (0.25 + accuracy) x power (eyes x1.3). Cut arms vanish (suckers too). Specials every 9-14 s (faster
  enraged): slam (mash FIRE 7-14 times in 2.6 s or take 1.4x damage; success cuts 35% of that arm) or toss (the ship is
  lifted and thrown round the body to a new angle, small damage). Camera: the bow, above the prow, looking at the target.
  The Kraken rises 0.95 x its size away. Test: scratchpad kgametest.cjs (real-time waits).
- v1.10.1 (Sean: a ballista on screen like the wheel; a pause button in boss fights; third person when tossed; nothing
  may block the view): src/ballista.js, an SVG ballista at the bottom of the screen in both first-person fights (legend
  ballista, raid gunner): swings toward the chosen part or tapped target, kicks and snaps its string on firing, cranks back
  to loaded. ⏸ in the fight header (the HUD with its pause button is hidden): the legend fight drops a half-made shot
  first (interrupt); the raid gunner leaves the circle and re-enters on resume; #paused z-index 60. During a first-person
  fight the player ship is hidden (shipVisible) and the legend's own lair rocks too (L.hideFight, respected by setNear);
  abortFight shows the ship again. Tossed: the ship shows and the camera pulls out to the side to watch it fly. Fixed: the
  special-move choice never picked the toss (a !L.toss that was always true); ATTACK and TRADE showed during fights.
- v1.10.2 (Sean sent two pictures: a heavy ballista seen from just behind, arms across the screen; and a deck with
  shields along the rails): ballista.js redrawn: viewBox -120..920 x 230, slice-fitted across landscape screens (meet on
  portrait), curved arms to the edges with rope lashings, iron-banded uprights, the bolt down the channel, two winch wheels,
  painted shields on the rails and deck planks; 40% of the screen height (34% on tablets). Messages, the power meter and
  FIRE sit above it. The legend camera is lower (rise + 4).

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

## Controls (current, v0.8.6)
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

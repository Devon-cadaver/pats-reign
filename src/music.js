// ---------- the soundtrack (v1.13.0): Sean's songs, made in Suno ----------
// Two sailing songs back to back while you sail (sail-1, sail-2, then round again) and the battle song in every fight. They
// stream from <audio> elements (three 4-minute songs decoded whole would take hundreds of MB on a tablet) through the game's
// music bus (audioNodes().music, the MUSIC switch), each with its own gain for the crossfades. A sailing song crossfades into
// the next over its fade-out; a fight drops straight into the battle song's heavy part (35.1 s in) and loops back there (two
// players take turns, so the loop crossfades too); after the fight the sailing song comes back where it left off. The songs
// pause while the music or the sound is off and while the game is hidden. (Until v1.12 the music was made by a synth here.)
import { audioNodes, isMusicOff, isMuted } from './audio.js';

const DIR = import.meta.env.BASE_URL + 'music/';
const SAIL = [{ src: 'sail-1.mp3', end: 238 }, { src: 'sail-2.mp3', end: 221 }], FIGHT = { src: 'battle.mp3', from: 35.1, end: 212 };
const VOL = { sail: 0.45, fight: 0.6 }, XF = 3; // how loud each plays, and the seconds a crossfade takes
let S = null;
function player(src) { const { ctx, music } = audioNodes(), a = new Audio(DIR + src); a.preload = 'auto'; const g = ctx.createGain(); g.gain.value = 0; ctx.createMediaElementSource(a).connect(g).connect(music); return { a, g, on: false, stopAt: 0 }; }
// ramp a player's volume; one faded to nothing is paused once the fade is over
function fade(p, to, secs) { const { ctx } = audioNodes(), t = ctx.currentTime; p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(to, t + secs); p.on = to > 0; p.stopAt = to > 0 ? 0 : performance.now() + secs * 1000 + 100; if (to > 0 && p.a.paused) p.a.play().catch(() => {}); }
export function startSaga() { if (S || !audioNodes().ctx) return;
  S = { sail: SAIL.map((s) => player(s.src)), fight: [player(FIGHT.src), player(FIGHT.src)], si: 0, fi: 0, battle: false, want: false };
  // a tap is starting the game: let every player start now, so the battle song may start later without one (iOS asks for it)
  for (const p of [...S.sail, ...S.fight]) p.a.play().then(() => { if (!p.on) p.a.pause(); }).catch(() => {});
  fade(S.sail[0], VOL.sail, XF); setInterval(tick, 250); document.addEventListener('visibilitychange', tick); }
export function setBattle(on) { if (S) S.want = !!on; }
export function soundtrackState() { return S && { battle: S.battle, si: S.si, fi: S.fi, sail: S.sail.map((p) => ({ on: p.on, paused: p.a.paused, t: +p.a.currentTime.toFixed(1) })), fight: S.fight.map((p) => ({ on: p.on, paused: p.a.paused, t: +p.a.currentTime.toFixed(1) })) }; }
function tick() { if (!S) return; const all = [...S.sail, ...S.fight];
  if (isMusicOff() || isMuted() || document.hidden) { for (const p of all) if (!p.a.paused) p.a.pause(); return; }
  for (const p of all) { if (p.on && p.a.paused) p.a.play().catch(() => {}); if (!p.on && p.stopAt && performance.now() > p.stopAt) { if (!p.a.paused) p.a.pause(); p.stopAt = 0; } }
  if (S.want !== S.battle) { S.battle = S.want;
    if (S.battle) { const f = S.fight[S.fi]; f.a.currentTime = FIGHT.from; fade(f, VOL.fight, 0.4); fade(S.sail[S.si], 0, 1); } // straight into the heavy part
    else { for (const f of S.fight) if (f.on) fade(f, 0, 2); fade(S.sail[S.si], VOL.sail, XF); } }
  if (S.battle) { const f = S.fight[S.fi]; if (f.a.currentTime >= FIGHT.end) { S.fi ^= 1; const n = S.fight[S.fi]; n.a.currentTime = FIGHT.from; fade(n, VOL.fight, 1); fade(f, 0, 1.5); } }
  else { const s = S.sail[S.si]; if (s.a.currentTime >= SAIL[S.si].end - XF || s.a.ended) { S.si = (S.si + 1) % SAIL.length; const n = S.sail[S.si]; n.a.currentTime = 0; fade(n, VOL.sail, XF); fade(s, 0, XF); } } }

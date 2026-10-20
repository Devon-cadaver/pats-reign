// Valhalla's Tide music, synthesized live (no audio files). Every sea has its own song: crossing into a sea changes the song at
// the next bar line while the drone glides into the new key.
// HOME WATERS: a slow Nordic ballad in D Dorian, a lilting 6/8 at 66 bpm. A hurdy-gurdy style drone on D and A, a frame
//   drum on the strong beats, a plucked lyre singing long modal phrases, a lur horn swelling every few bars and a
//   wordless choir "ooh" on the bigger moments.
// FROST SEA: icy and slow, A minor in 3/4 at 54 bpm. A hollow open-fifth drone, glassy bells, a cold high choir, a far-off
//   drum and a distant lur.
// STORM SEA: drums and thunder, E Phrygian at 104 bpm. War drums with fills, a low driving ostinato, moaning horns, a low
//   lyre and thunder rolling in.
// MIST SEA: eerie, 56 bpm. A tritone drone, a slow heartbeat drum, ghostly whole-tone bells and a choir that never resolves.
// WARM SEA: bright, G Mixolydian in a quick 6/8. Hand drums and a shaker, a marimba tune, a plucked bass walking G F C G.
// HELHEIM (v0.8.0): a dirge for the dead, C Locrian at 46 bpm: a tritone drone, a funeral drum, a tolling bell, a low choir.
// MUSPELHEIM (Helheim's fire sea): fire drums at 96 bpm in D Phrygian dominant, a snarling low ostinato and horns.
// BATTLE (any sea): a war song at 138 bpm. Pounding war drums with fills, a driving low ostinato, horn calls, "HU!" war
//   cries and the full choir. setBattle() switches at the next bar so the change lands on the beat.
import { audioNodes, isMusicOff } from './audio.js';

const D = 146.83; // D3
const st = (n) => D * Math.pow(2, n / 12); // semitones from D3
// D Dorian degrees in semitones: D E F G A B C
const SC = [0, 2, 3, 5, 7, 9, 10];
const deg = (d) => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return SC[i] + 12 * o; };
// ballad phrases: [scale degree, length in eighths]; null = rest. Eight bars of 6/8 (6 eighths each) per phrase.
const PHRASES = [
  [[4, 3], [3, 1], [2, 2], [0, 6], [1, 2], [2, 2], [3, 2], [4, 6], [6, 3], [5, 3], [4, 2], [3, 2], [2, 2], [1, 6], [null, 6]],
  [[7, 4], [6, 2], [4, 6], [5, 2], [4, 2], [3, 2], [2, 6], [3, 3], [4, 3], [5, 2], [4, 2], [2, 2], [0, 9], [null, 3]],
  [[0, 2], [2, 2], [4, 2], [7, 6], [6, 2], [4, 2], [5, 2], [4, 6], [3, 3], [2, 3], [1, 2], [0, 2], [-1, 2], [0, 6], [null, 6]],
  [[4, 6], [2, 3], [3, 3], [4, 2], [5, 2], [6, 2], [7, 6], [6, 2], [5, 2], [4, 2], [3, 6], [null, 6]],
];
// battle: bass ostinato per eighth (semitones from D2) and horn calls per bar
const BASS = [0, 0, 12, 0, 3, 0, 10, 0, -2, -2, 10, -2, -4, -4, 8, -2];
const HORN = [[7, 0, 7, 12], [10, 8, 7, null], [3, 5, 7, 10], [12, 10, 7, 5]];

let M = null; // { ctx, out, ... }
let late = false; // the game stalled and this note's time has passed: skip it, never play a pile of late notes at once (that crackles)
export function startSaga() {
  const n = audioNodes(); if (!n.ctx) return; if (M) return; const ctx = n.ctx;
  const out = ctx.createGain(); out.gain.value = 0.0; out.connect(n.music || n.master); out.gain.setTargetAtTime(0.55, ctx.currentTime, 2);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.8); const wet = ctx.createGain(); wet.gain.value = 0.32; verb.connect(wet).connect(out); // wet: each song sets its own reverb
  const bus = ctx.createGain(); bus.connect(out); bus.connect(verb);
  // drone: detuned saws on D2 and A2 through a breathing lowpass (hurdy-gurdy / tagelharpa)
  const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 520; dl.Q.value = 2; const dg = ctx.createGain(); dg.gain.value = 0.035; dl.connect(dg).connect(bus);
  const drones = [[st(-12), -6], [st(-12), 5], [st(-5), 0], [st(0), 3]].map(([f, det]) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(dl); o.start(); return o; });
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(dl.frequency); lfo.start();
  M = { ctx, out, bus, dl, dg, drones, wet, theme: 'home', noise: n.noiseBuf, battle: false, want: false, next: ctx.currentTime + 0.2, step: 0, bar: 0, phrase: 0, pi: 0, left: 0, timer: null };
  M.timer = setInterval(schedule, 40);
}
export function setBattle(on) { if (M) M.want = !!on; }
export function sagaState() { return M ? { battle: M.battle, bar: M.bar, theme: M.theme } : null; }

// a mono tail: a third of the reverb's work for the audio thread, which the iPad needs (a stereo 2.6 s tail made it crackle)
function impulse(ctx, secs) { const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(1, len, ctx.sampleRate); for (let c = 0; c < 1; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); } return b; }
function env(g, t, a, peak, dec, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + dec); }
// plucked lyre: triangle + octave sine, quick attack, long ring
function lyre(t, f, len, vol = 0.09) { if (late) return; const { ctx, bus } = M; const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + Math.min(2.5, len + 0.8)); g.connect(lp).connect(bus);
  for (const [type, mul, v] of [['triangle', 1, 1.06], ['sine', 2, 0.35]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul; const og = ctx.createGain(); og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + len + 1.6); }
  env(g, t, 0.008, vol, Math.max(0.6, len + 1.2)); }
// lur / war horn: saw through a slow-opening lowpass, swelling in
function horn(t, f, len, vol = 0.07) { if (late) return; const { ctx, bus } = M; const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1500, t + Math.min(0.5, len * 0.5)); lp.frequency.linearRampToValueAtTime(600, t + len); g.connect(lp).connect(bus);
  for (const det of [-7, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); o.detune.value = det; o.connect(g); o.start(t); o.stop(t + len + 0.4); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.35, len * 0.4)); g.gain.setValueAtTime(vol, t + len * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.3); }
// wordless choir: detuned saws through two vowel formants ("ooh"), slow swell
function choir(t, freqs, len, vol = 0.03) { if (late) return; const { ctx, bus } = M; const g = ctx.createGain(); const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 420; f2.frequency.value = 880; f1.Q.value = 5; f2.Q.value = 7; const mix = ctx.createGain(); f1.connect(mix); f2.connect(mix); mix.connect(g).connect(bus);
  const vib = ctx.createOscillator(); vib.frequency.value = 5 + Math.random(); const vg = ctx.createGain(); vg.gain.value = 4; vib.connect(vg); vib.start(t); vib.stop(t + len + 1.5); // one shared vibrato
  for (const f of freqs) for (const det of [-10, 9]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; vg.connect(o.detune); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + len + 1.5); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.35); g.gain.setValueAtTime(vol, t + len * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.2); }
// drums: frame drum / war drum (pitched thump + skin noise)
function drum(t, f = 70, vol = 0.35, len = 0.5, bright = 900) { if (late) return; const { ctx, bus, noise } = M; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + len); o.connect(g).connect(bus); env(g, t, 0.004, vol, len); o.start(t); o.stop(t + len + 0.05);
  const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = bright; const ng = ctx.createGain(); s.connect(bp).connect(ng).connect(bus); env(ng, t, 0.002, vol * 0.35, 0.12); s.start(t); s.stop(t + 0.2); }
function bass(t, f, len, vol = 0.09) { if (late) return; const { ctx, bus } = M; const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + len); o.connect(lp).connect(g).connect(bus); env(g, t, 0.01, vol, len); o.start(t); o.stop(t + len + 0.05); }
// war cry: a shouted "HU!" (noise through a vowel band with a falling pitch underneath)
function cry(t, vol = 0.16) { if (late) return; const { ctx, bus, noise } = M; const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 3; const g = ctx.createGain(); s.connect(bp).connect(g).connect(bus); env(g, t, 0.02, vol, 0.28); s.start(t); s.stop(t + 0.4);
  const o = ctx.createOscillator(), og = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.3); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 2; o.connect(f).connect(og).connect(bus); env(og, t, 0.02, vol * 0.8, 0.3); o.start(t); o.stop(t + 0.4); }

// bell: a pure tone and its inharmonic partial, ringing long (ice, ghosts)
function bell(t, f, len = 2.5, vol = 0.05) { if (late) return; const { ctx, bus } = M; const g = ctx.createGain(); g.connect(bus); env(g, t, 0.004, vol, len);
  for (const [mul, v] of [[1, 1], [2.76, 0.3]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul; const og = ctx.createGain(); og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + len + 0.1); } }
// marimba: a wooden pluck, a sine with a quick knock two octaves up
function pluck(t, f, vol = 0.07, len = 0.55) { if (late) return; const { ctx, bus } = M; const g = ctx.createGain(); g.connect(bus); env(g, t, 0.003, vol, len);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + len + 0.05);
  const k = ctx.createOscillator(), kg = ctx.createGain(); k.type = 'sine'; k.frequency.value = f * 4; k.connect(kg).connect(bus); env(kg, t, 0.002, vol * 0.4, 0.06); k.start(t); k.stop(t + 0.1); }
// shaker: a short hiss
function shaker(t, vol = 0.04) { if (late) return; const { ctx, bus, noise } = M; const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000; const g = ctx.createGain(); s.connect(f).connect(g).connect(bus); env(g, t, 0.01, vol, 0.07); s.start(t); s.stop(t + 0.12); }
// thunder: a low roll of noise swelling and dying away
function rumble(t, len = 3, vol = 0.18) { if (late) return; const { ctx, bus, noise } = M; const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140; const g = ctx.createGain(); s.connect(f).connect(g).connect(bus);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len); s.start(t); s.stop(t + len + 0.05); }

// ---------- the songs: per sea a drone (4 pitches), its filter, drone level and reverb, the beat, and a melody ----------
// phrases are [scale degree, length in steps]; null = rest. note(d) turns a degree into a pitch, play() sounds it.
const mode = (sc) => (d) => { const n = sc.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return sc[i] + 12 * o; };
const AEO = mode([0, 2, 3, 5, 7, 8, 10]), PHR = mode([0, 1, 3, 5, 7, 8, 10]), MIX = mode([0, 2, 4, 5, 7, 9, 10]), WT = mode([0, 2, 4, 6, 8, 10]), LOC = mode([0, 1, 3, 5, 6, 8, 10]), HIJ = mode([0, 1, 4, 5, 7, 8, 10]);
const THEMES = {
  home: { E: 60 / 66 / 3, bar: 6, drone: [st(-12), st(-12), st(-5), st(0)], cut: 520, dg: 0.035, wet: 0.32, phrases: PHRASES, note: (d) => st(deg(d)),
    play: (t, f, n, E) => { lyre(t, f, E * n * 0.95, 0.075); if (n >= 6 && Math.random() < 0.5) lyre(t + E * 0.02, f / 2, E * n, 0.035); },
    step: (t, s, E) => { if (s === 0) { drum(t, 62, 0.22, 0.6, 600); if (M.bar % 4 === 0) horn(t + E * 0.5, st(-12 + (M.bar % 8 === 0 ? 0 : 7)), E * 9, 0.045); if (M.bar % 8 === 4) choir(t, [st(-12), st(-5), st(0)], E * 12, 0.022); }
      if (s === 3) drum(t, 58, 0.14, 0.5, 500); if (s === 5 && M.bar % 2 === 1) drum(t, 80, 0.06, 0.2, 1200); } },
  frost: { E: 60 / 54 / 2, bar: 6, drone: [st(-17), st(-10), st(-5), st(2)], cut: 380, dg: 0.03, wet: 0.45, note: (d) => st(19 + AEO(d)), // bells from A4
    phrases: [[[4, 3], [2, 3], [0, 6], [null, 6], [1, 3], [2, 3], [4, 6], [null, 6]], [[7, 6], [6, 3], [4, 3], [3, 6], [null, 6], [2, 3], [1, 3], [0, 6], [null, 6]],
      [[0, 3], [2, 3], [4, 6], [5, 3], [4, 3], [2, 6], [null, 12]], [[4, 6], [3, 3], [1, 3], [2, 6], [-1, 6], [0, 12], [null, 6]]],
    play: (t, f, n, E) => { bell(t, f, E * n + 1.5, 0.045); if (n >= 6) bell(t + E * 0.5, f / 2, 3, 0.02); },
    step: (t, s, E) => { if (s !== 0) return; if (M.bar % 2 === 0) drum(t, 46, 0.1, 1.1, 260); if (M.bar % 4 === 2) choir(t, [st(7), st(10), st(14)], E * 14, 0.016); if (M.bar % 8 === 0) horn(t + E, st(-5), E * 10, 0.03); } },
  storm: { E: 60 / 104 / 2, bar: 8, drone: [st(-10), st(-10), st(-3), st(2)], cut: 750, dg: 0.04, wet: 0.3, note: (d) => st(2 + PHR(d)), // a low lyre from E3
    phrases: [[[0, 2], [1, 2], [0, 4], [null, 8], [3, 2], [1, 2], [0, 4], [null, 8]], [[4, 4], [3, 2], [1, 2], [0, 8], [null, 8]], [[0, 2], [0, 2], [1, 2], [3, 2], [4, 4], [5, 2], [4, 2], [1, 8], [null, 8]]],
    play: (t, f, n, E) => lyre(t, f, E * n * 0.9, 0.06),
    step: (t, s, E) => { const b = M.bar;
      if (s === 0) drum(t, 50, 0.34, 0.7, 650); if (s === 3) drum(t, 58, 0.2, 0.4, 750); if (s === 4) drum(t, 50, 0.28, 0.6, 650); if (s === 6 || s === 7) drum(t, 72, 0.13, 0.25, 1300);
      if (b % 4 === 3 && s >= 4) drum(t + E / 2, 84 + s * 6, 0.16, 0.2, 1500); // a fill into every fourth bar
      bass(t, st(-10 + [0, 0, 1, 0, 0, 0, -2, 0][s] + (b % 4 === 2 ? 3 : 0)), E * 0.85, 0.06); // E Phrygian ostinato, up to G every third bar
      if (s === 0 && b % 2 === 0) horn(t, st(b % 4 === 0 ? 2 : 3), E * 6, 0.045); // E, then the dark F
      if (s === 0 && b % 8 === 4) rumble(t, 4, 0.2); if (s === 0 && b % 8 === 0) choir(t, [st(-10), st(-3), st(2)], E * 15, 0.018); } },
  mist: { E: 60 / 56 / 2, bar: 8, drone: [st(-12), st(-6), st(0), st(6)], cut: 420, dg: 0.03, wet: 0.5, note: (d) => st(12 + WT(d)), // ghost bells from D4, whole-tone
    phrases: [[[0, 4], [null, 4], [3, 6], [null, 10], [2, 2], [1, 6], [null, 16]], [[5, 8], [null, 8], [4, 3], [3, 3], [null, 18]], [[1, 4], [3, 4], [null, 8], [0, 8], [null, 16]]],
    play: (t, f, n, E) => bell(t, f, E * n + 2, 0.035),
    step: (t, s, E) => { if (s === 0) drum(t, 46, 0.13, 0.45, 240); if (s === 1) drum(t, 42, 0.08, 0.4, 220); // a slow heartbeat
      if (s === 0 && M.bar % 2 === 0) choir(t, [st(0), st(6), st(10)], E * 13, 0.02); if (s === 4 && M.bar % 4 === 3) lyre(t, st(-12), E * 6, 0.05); } },
  warm: { E: 0.2, bar: 6, drone: [st(-7), st(-7), st(0), st(5)], cut: 620, dg: 0.022, wet: 0.25, note: (d) => st(17 + MIX(d)), // marimba from G4
    phrases: [[[0, 1], [2, 1], [4, 1], [7, 3], [6, 1], [4, 2], [5, 3], [4, 3], [2, 3], [0, 3], [null, 3]], [[4, 2], [5, 1], [4, 2], [2, 1], [0, 3], [1, 3], [2, 2], [4, 1], [2, 3], [null, 6]],
      [[7, 2], [8, 1], [7, 2], [6, 1], [4, 3], [5, 3], [4, 2], [2, 1], [0, 6], [null, 6]], [[4, 1], [4, 1], [5, 1], [6, 3], [4, 3], [2, 1], [1, 1], [0, 1], [-1, 3], [0, 6], [null, 3]]],
    play: (t, f, n, E) => { pluck(t, f, 0.07); if (n >= 3) pluck(t + E, f, 0.035); }, // a long note rolls like a marimba
    step: (t, s, E) => { const root = [st(-7), st(-9), st(-14), st(-7)][M.bar % 4]; // G, F, C, G
      if (s === 0) drum(t, 92, 0.18, 0.3, 1600); if (s === 3) drum(t, 110, 0.12, 0.25, 1900); if (s === 5) drum(t, 128, 0.07, 0.15, 2600);
      if (s % 3) shaker(t, s % 3 === 1 ? 0.035 : 0.022); if (s === 0 || s === 3) bass(t, root, E * 2.4, 0.06); if (s === 0 && M.bar % 4 === 0) choir(t, [st(5), st(9), st(12)], E * 22, 0.014); } },
  hel: { E: 60 / 46 / 2, bar: 8, drone: [st(-14), st(-8), st(-2), st(4)], cut: 360, dg: 0.034, wet: 0.55, note: (d) => st(10 + LOC(d)), // bells from C4
    phrases: [[[0, 6], [null, 2], [1, 4], [0, 4], [-2, 8], [null, 8]], [[4, 4], [3, 4], [1, 8], [null, 4], [0, 4], [1, 4], [-1, 12], [null, 8]], [[0, 3], [1, 3], [3, 2], [4, 8], [3, 4], [1, 4], [0, 8], [null, 16]]],
    play: (t, f, n, E) => { bell(t, f, E * n + 2.5, 0.032); if (n >= 8) choir(t, [f / 4, f * 0.375], E * n, 0.012); },
    step: (t, s, E) => { if (s === 0) { drum(t, 40, 0.24, 1.2, 220); bell(t, st(-14), 4, 0.03); if (M.bar % 2 === 1) choir(t, [st(-14), st(-8), st(-2)], E * 15, 0.02); }
      if (s === 4) drum(t, 38, 0.12, 0.9, 200); if (s === 6 && M.bar % 4 === 3) horn(t, st(-14), E * 8, 0.03); } },
  muspel: { E: 60 / 96 / 2, bar: 8, drone: [st(-12), st(-11), st(-5), st(0)], cut: 680, dg: 0.04, wet: 0.3, note: (d) => st(HIJ(d)),
    phrases: [[[0, 2], [1, 2], [2, 4], [1, 2], [0, 6], [null, 16]], [[4, 2], [5, 2], [4, 2], [2, 2], [1, 4], [0, 4], [null, 16]], [[7, 4], [5, 2], [4, 2], [5, 2], [4, 2], [1, 4], [0, 8], [null, 8]]],
    play: (t, f, n, E) => lyre(t, f, E * n * 0.9, 0.06),
    step: (t, s, E) => { const b = M.bar; if (s === 0 || s === 3 || s === 6) drum(t, 48, 0.32, 0.6, 600); if (s === 2 || s === 5) drum(t, 66, 0.16, 0.3, 900); if (s === 7) drum(t, 84, 0.12, 0.2, 1400);
      bass(t, st(-24 + [0, 0, 1, 0, 4, 0, 1, 0][s]), E * 0.85, 0.06); if (s === 0 && b % 2 === 0) horn(t, st(b % 4 === 0 ? 0 : 1), E * 6, 0.045); if (s === 0 && b % 8 === 4) rumble(t, 4, 0.2); if (s === 0 && b % 4 === 2) choir(t, [st(-12), st(-8), st(-5)], E * 14, 0.018); } },
};
let seaWant = 'home';
export function setMusicSea(key) { if (THEMES[key]) seaWant = key; }
// glide the drone, its filter and level, and the reverb into a song's colours
function colour(th, t, k = 1.5) { th.drone.forEach((f, i) => M.drones[i].frequency.setTargetAtTime(f, t, k * 0.8)); M.dl.frequency.setTargetAtTime(th.cut, t, k); M.dg.gain.setTargetAtTime(th.dg, t, k); M.wet.gain.setTargetAtTime(th.wet, t, k * 1.3); }
function toTheme(key, t) { M.theme = key; M.step = 0; M.bar = 0; M.phrase = 0; M.pi = 0; M.left = 0; colour(THEMES[key], t); }
function melody(t, th) { if (M.left <= 0) { const ph = th.phrases[M.phrase % th.phrases.length], note = ph[M.pi]; M.pi++; if (M.pi >= ph.length) { M.pi = 0; M.phrase++; } M.left = note[1]; if (note[0] != null) th.play(t, th.note(note[0]), note[1], th.E); } M.left--; }

function schedule() {
  const { ctx } = M; if (ctx.state !== 'running') { M.next = Math.max(M.next, ctx.currentTime + 0.1); return; }
  while (M.next < ctx.currentTime + 0.5) { // half a second ahead, so a hitch in the game does not starve the music
    const t = M.next; late = t < ctx.currentTime || isMusicOff(); // music off: keep time, play nothing
    if (!M.battle) { // ---------- the sea's song ----------
      const th = THEMES[M.theme], s = M.step % th.bar;
      if (s === 0) { if (M.want) { M.battle = true; M.step = 0; M.bar = 0; colour({ ...THEMES.home, cut: 900, dg: 0.05 }, t, 1); continue; } // battle music is in D
        if (seaWant !== M.theme) { toTheme(seaWant, t); continue; } } // a new sea: its song starts on this bar line
      th.step(t, s, th.E); melody(t, th);
      M.step++; if (M.step % th.bar === 0) M.bar++; M.next += th.E;
    } else { // ---------- battle: 4/4, 138 bpm (eighth = 0.217 s) ----------
      const E = 60 / 138 / 2, s = M.step % 8;
      if (s === 0) { if (!M.want) { M.battle = false; toTheme(seaWant, t); continue; } // back to the song of the sea you are in
        if (M.bar % 2 === 0) choir(t, [st(-12), st(-5), st(0), st(3)], E * 15, 0.03); }
      // war drums: big hits on 1 and 3, pushes on the and-of-2 and 4, a fill every 4th bar
      if (s === 0 || s === 4) drum(t, 52, 0.45, 0.7, 700); if (s === 3 || s === 7) drum(t, 60, 0.28, 0.4, 800); if (s === 2 || s === 6) drum(t, 140, 0.12, 0.15, 3000);
      if (M.bar % 4 === 3 && s >= 4) { drum(t, 90 + s * 6, 0.22, 0.25, 1500); drum(t + E / 2, 96 + s * 6, 0.18, 0.2, 1500); }
      bass(t, st(BASS[(M.step + (M.bar % 2) * 8) % 16] - 24), E * 0.9, 0.085);
      const hc = HORN[M.bar % HORN.length]; if (s % 2 === 0 && hc[s / 2] != null && M.bar % 2 === 1) horn(t, st(hc[s / 2]), E * 1.8, 0.06);
      if (M.bar % 2 === 0 && s === 6) cry(t, 0.12); if (M.bar % 4 === 2 && s === 6) { cry(t, 0.14); cry(t + E, 0.16); }
      M.step++; if (M.step % 8 === 0) M.bar++; M.next += E;
    }
  }
}

// Pats Reign music, synthesized live (no audio files).
// SAILING: a slow Nordic ballad in D Dorian, a lilting 6/8 at 66 bpm. A hurdy-gurdy style drone on D and A, a frame
//   drum on the strong beats, a plucked lyre singing long modal phrases, a lur horn swelling every few bars and a
//   wordless choir "ooh" on the bigger moments.
// BATTLE: a war song at 138 bpm. Pounding war drums with fills, a driving low ostinato, horn calls, "HU!" war cries
//   and the full choir. setBattle() switches at the next bar so the change lands on the beat.
import { audioNodes } from './audio.js';

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
export function startSaga() {
  const n = audioNodes(); if (!n.ctx) return; if (M) return; const ctx = n.ctx;
  const out = ctx.createGain(); out.gain.value = 0.0; out.connect(n.master); out.gain.setTargetAtTime(0.55, ctx.currentTime, 2);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.6); const wet = ctx.createGain(); wet.gain.value = 0.32; verb.connect(wet).connect(out);
  const bus = ctx.createGain(); bus.connect(out); bus.connect(verb);
  // drone: detuned saws on D2 and A2 through a breathing lowpass (hurdy-gurdy / tagelharpa)
  const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 520; dl.Q.value = 2; const dg = ctx.createGain(); dg.gain.value = 0.035; dl.connect(dg).connect(bus);
  const drones = [[st(-12), -6], [st(-12), 5], [st(-5), 0], [st(0), 3]].map(([f, det]) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(dl); o.start(); return o; });
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(dl.frequency); lfo.start();
  M = { ctx, out, bus, dl, dg, drones, noise: n.noiseBuf, battle: false, want: false, next: ctx.currentTime + 0.2, step: 0, bar: 0, phrase: 0, pi: 0, left: 0, timer: null };
  M.timer = setInterval(schedule, 40);
}
export function setBattle(on) { if (M) M.want = !!on; }
export function sagaState() { return M ? { battle: M.battle, bar: M.bar } : null; }

function impulse(ctx, secs) { const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); } return b; }
function env(g, t, a, peak, dec, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + dec); }
// plucked lyre: triangle + octave sine, quick attack, long ring
function lyre(t, f, len, vol = 0.09) { const { ctx, bus } = M; const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + Math.min(2.5, len + 0.8)); g.connect(lp).connect(bus);
  for (const [type, mul, v] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sawtooth', 1, 0.12]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul; const og = ctx.createGain(); og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + len + 1.6); }
  env(g, t, 0.008, vol, Math.max(0.6, len + 1.2)); }
// lur / war horn: saw through a slow-opening lowpass, swelling in
function horn(t, f, len, vol = 0.07) { const { ctx, bus } = M; const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1500, t + Math.min(0.5, len * 0.5)); lp.frequency.linearRampToValueAtTime(600, t + len); g.connect(lp).connect(bus);
  for (const det of [-7, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); o.detune.value = det; o.connect(g); o.start(t); o.stop(t + len + 0.4); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.35, len * 0.4)); g.gain.setValueAtTime(vol, t + len * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.3); }
// wordless choir: detuned saws through two vowel formants ("ooh"), slow swell
function choir(t, freqs, len, vol = 0.03) { const { ctx, bus } = M; const g = ctx.createGain(); const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 420; f2.frequency.value = 880; f1.Q.value = 5; f2.Q.value = 7; const mix = ctx.createGain(); f1.connect(mix); f2.connect(mix); mix.connect(g).connect(bus);
  for (const f of freqs) for (const det of [-11, 0, 9]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; const vib = ctx.createOscillator(); vib.frequency.value = 5 + Math.random(); const vg = ctx.createGain(); vg.gain.value = 4; vib.connect(vg).connect(o.detune); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + len + 1.5); vib.start(t); vib.stop(t + len + 1.5); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.35); g.gain.setValueAtTime(vol, t + len * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.2); }
// drums: frame drum / war drum (pitched thump + skin noise)
function drum(t, f = 70, vol = 0.35, len = 0.5, bright = 900) { const { ctx, bus, noise } = M; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + len); o.connect(g).connect(bus); env(g, t, 0.004, vol, len); o.start(t); o.stop(t + len + 0.05);
  const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = bright; const ng = ctx.createGain(); s.connect(bp).connect(ng).connect(bus); env(ng, t, 0.002, vol * 0.35, 0.12); s.start(t); s.stop(t + 0.2); }
function bass(t, f, len, vol = 0.09) { const { ctx, bus } = M; const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + len); o.connect(lp).connect(g).connect(bus); env(g, t, 0.01, vol, len); o.start(t); o.stop(t + len + 0.05); }
// war cry: a shouted "HU!" (noise through a vowel band with a falling pitch underneath)
function cry(t, vol = 0.16) { const { ctx, bus, noise } = M; const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 3; const g = ctx.createGain(); s.connect(bp).connect(g).connect(bus); env(g, t, 0.02, vol, 0.28); s.start(t); s.stop(t + 0.4);
  const o = ctx.createOscillator(), og = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.3); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 2; o.connect(f).connect(og).connect(bus); env(og, t, 0.02, vol * 0.8, 0.3); o.start(t); o.stop(t + 0.4); }

function schedule() {
  const { ctx } = M; if (ctx.state !== 'running') { M.next = Math.max(M.next, ctx.currentTime + 0.1); return; }
  while (M.next < ctx.currentTime + 0.25) {
    const t = M.next;
    if (!M.battle) { // ---------- ballad: 6/8, 66 bpm dotted-quarter (eighth = 0.303 s) ----------
      const E = 60 / 66 / 3, s = M.step % 6;
      if (s === 0) { if (M.want) { M.battle = true; M.step = 0; M.bar = 0; M.dl.frequency.setTargetAtTime(900, t, 1); M.dg.gain.setTargetAtTime(0.05, t, 1); continue; }
        drum(t, 62, 0.22, 0.6, 600); if (M.bar % 4 === 0) horn(t + E * 0.5, st(-12 + (M.bar % 8 === 0 ? 0 : 7)), E * 9, 0.045); if (M.bar % 8 === 4) choir(t, [st(-12), st(-5), st(0)], E * 12, 0.022); }
      if (s === 3) drum(t, 58, 0.14, 0.5, 500); if (s === 5 && M.bar % 2 === 1) drum(t, 80, 0.06, 0.2, 1200);
      // melody
      if (M.left <= 0) { const ph = PHRASES[M.phrase % PHRASES.length], note = ph[M.pi]; M.pi++; if (M.pi >= ph.length) { M.pi = 0; M.phrase++; }
        M.left = note[1]; if (note[0] != null) { lyre(t, st(deg(note[0])), E * note[1] * 0.95, 0.075); if (note[1] >= 6 && Math.random() < 0.5) lyre(t + E * 0.02, st(deg(note[0]) - 12), E * note[1], 0.035); } }
      M.left--; M.step++; if (M.step % 6 === 0) M.bar++; M.next += E;
    } else { // ---------- battle: 4/4, 138 bpm (eighth = 0.217 s) ----------
      const E = 60 / 138 / 2, s = M.step % 8;
      if (s === 0) { if (!M.want) { M.battle = false; M.step = 0; M.bar = 0; M.left = 0; M.dl.frequency.setTargetAtTime(520, t, 1.5); M.dg.gain.setTargetAtTime(0.035, t, 1.5); continue; }
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

// ---------- the ballista on screen (v1.10.1, Sean: "add a ballista like how we have the wheel") ----------
// Shown at the bottom of the screen in the first-person fights (the legend fight from the bow, the raid gunner). A flat
// SVG like the wheel: no 3D cost on a phone. It swings toward the target, kicks back and snaps its string when fired,
// then cranks back to loaded.
const SVG = `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
<defs>
  <linearGradient id="bWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a1e"/><stop offset=".5" stop-color="#9a6a3a"/><stop offset="1" stop-color="#4a2e18"/></linearGradient>
  <linearGradient id="bDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4426"/><stop offset="1" stop-color="#2e1c0e"/></linearGradient>
  <linearGradient id="bIron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8ccd0"/><stop offset="1" stop-color="#4a4e54"/></linearGradient>
  <linearGradient id="bRope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8b880"/><stop offset="1" stop-color="#8a6a3a"/></linearGradient>
</defs>
<rect x="-40" y="214" width="480" height="40" fill="url(#bDark)"/><rect x="-40" y="212" width="480" height="5" fill="#a87a48"/>
<polygon points="168,240 232,240 216,186 184,186" fill="url(#bDark)" stroke="#1e1208" stroke-width="2"/>
<g class="bAim" transform="rotate(0 200 232)"><g class="bKick">
  <polygon points="180,234 220,234 208,58 192,58" fill="url(#bWood)" stroke="#1e1208" stroke-width="2"/>
  <line x1="200" y1="230" x2="200" y2="62" stroke="#24160a" stroke-width="3"/>
  <rect x="181" y="196" width="38" height="7" rx="2" fill="url(#bIron)"/><rect x="186" y="140" width="28" height="6" rx="2" fill="url(#bIron)"/><rect x="190" y="92" width="20" height="5" rx="2" fill="url(#bIron)"/>
  <rect x="146" y="58" width="108" height="18" rx="5" fill="url(#bDark)" stroke="#1e1208" stroke-width="2"/>
  <ellipse cx="158" cy="67" rx="13" ry="17" fill="url(#bRope)" stroke="#5a3a1e" stroke-width="2"/><ellipse cx="242" cy="67" rx="13" ry="17" fill="url(#bRope)" stroke="#5a3a1e" stroke-width="2"/>
  <path d="M150 60 l16 0 M150 67 l16 0 M150 74 l16 0 M234 60 l16 0 M234 67 l16 0 M234 74 l16 0" stroke="#6a4a26" stroke-width="2"/>
  <path class="bArmL" d="M158 64 Q100 52 38 92" stroke="url(#bWood)" stroke-width="11" fill="none" stroke-linecap="round"/><path class="bArmR" d="M242 64 Q300 52 362 92" stroke="url(#bWood)" stroke-width="11" fill="none" stroke-linecap="round"/>
  <circle cx="38" cy="92" r="7" fill="url(#bIron)"/><circle cx="362" cy="92" r="7" fill="url(#bIron)"/>
  <polyline class="bStrBack" points="38,92 200,206 362,92" fill="none" stroke="#e8dcc0" stroke-width="2.5"/>
  <polyline class="bStrFwd" points="38,92 200,70 362,92" fill="none" stroke="#e8dcc0" stroke-width="2.5"/>
  <g class="bBolt"><line x1="200" y1="204" x2="200" y2="48" stroke="#7a5230" stroke-width="6" stroke-linecap="round"/><polygon points="193,52 207,52 200,28" fill="url(#bIron)" stroke="#2a2a2a" stroke-width="1"/><polygon points="200,196 190,210 200,204 210,210" fill="#c84a2a"/></g>
  <g class="bWinch"><circle cx="200" cy="222" r="11" fill="url(#bIron)" stroke="#2a2a2a" stroke-width="2"/><line x1="182" y1="222" x2="218" y2="222" stroke="#3a3a3a" stroke-width="4" stroke-linecap="round"/></g>
</g></g></svg>`;
let el = null, aimDeg = 0, wantDeg = 0, state = 'loaded', t = 0;
function ensure() { if (el) return el; el = document.createElement('div'); el.id = 'ballistaHud'; el.className = 'hidden loaded'; el.innerHTML = SVG; document.body.appendChild(el); return el; }
export const ballistaHud = {
  show(on) { ensure(); el.classList.toggle('hidden', !on); if (on) { state = 'loaded'; el.classList.remove('fired', 'reload'); el.classList.add('loaded'); } },
  // aim at a screen x (pixels): the ballista swings up to 18 degrees either way
  aim(x) { if (x == null || !isFinite(x)) return; wantDeg = Math.max(-18, Math.min(18, ((x - innerWidth / 2) / (innerWidth / 2)) * 18)); },
  fire() { ensure(); state = 'fired'; t = 0; el.classList.remove('loaded', 'reload'); el.classList.add('fired'); },
  update(dt) { if (!el || el.classList.contains('hidden')) return; aimDeg += (wantDeg - aimDeg) * Math.min(1, dt * 6); el.querySelector('.bAim').setAttribute('transform', 'rotate(' + aimDeg.toFixed(2) + ' 200 232)');
    t += dt; const kick = state === 'fired' ? Math.max(0, 10 * (1 - t / 0.25)) : 0; el.querySelector('.bKick').setAttribute('transform', 'translate(0 ' + kick.toFixed(1) + ')');
    if (state === 'fired' && t > 0.5) { state = 'reload'; t = 0; el.classList.remove('fired'); el.classList.add('reload'); }
    if (state === 'reload') { el.querySelector('.bWinch').setAttribute('transform', 'rotate(' + (t * 720).toFixed(0) + ' 200 222)'); if (t > 0.9) { state = 'loaded'; el.classList.remove('reload'); el.classList.add('loaded'); el.querySelector('.bWinch').setAttribute('transform', ''); } } },
};

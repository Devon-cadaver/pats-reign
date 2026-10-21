// ---------- the ballista on screen (v1.10.2, Sean: "add a ballista like how we have the wheel", then a picture: seen
// from just behind it, long curved arms across nearly the whole screen with rope lashings, two heavy uprights round the
// bolt channel, the bolt pointing forward, winch wheels below). Shown in the first-person fights (the legend fight from
// the bow, the raid gunner). A flat SVG like the wheel: no 3D cost on a phone. It swings toward the target, kicks back
// and snaps its string when fired, then cranks back to loaded.
const LASH = (x0, y0, dir) => Array.from({ length: 6 }, (_, i) => { const x = x0 + dir * i * 7; return `<line x1="${x}" y1="${y0 - 14 + dir * i * 0.6}" x2="${x + dir * 5}" y2="${y0 + 12 + dir * i * 0.6}" stroke="url(#bRope)" stroke-width="5" stroke-linecap="round"/>`; }).join('');
const SVG = `<svg viewBox="-120 0 1040 230" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs>
  <linearGradient id="bWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6440"/><stop offset=".45" stop-color="#5e3e22"/><stop offset="1" stop-color="#2e1c0e"/></linearGradient>
  <linearGradient id="bStock" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2614"/><stop offset=".5" stop-color="#7a5636"/><stop offset="1" stop-color="#3a2614"/></linearGradient>
  <linearGradient id="bPost" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1a0c"/><stop offset=".4" stop-color="#6a4a2c"/><stop offset="1" stop-color="#24160a"/></linearGradient>
  <linearGradient id="bIron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8bcc2"/><stop offset="1" stop-color="#3e4248"/></linearGradient>
  <linearGradient id="bRope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2b47e"/><stop offset="1" stop-color="#7e6034"/></linearGradient>
  <radialGradient id="bShade" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="400" cy="232" rx="420" ry="70" fill="url(#bShade)"/>
<g class="bDeck"><polygon points="560,230 920,230 920,150 700,196" fill="#4a3220"/><path d="M600 230 L760 186 M660 230 L800 178 M720 230 L840 170 M780 230 L880 162" stroke="#2a1a0c" stroke-width="3"/><polygon points="240,230 -120,230 -120,150 100,196" fill="#4a3220"/><path d="M200 230 L40 186 M140 230 L0 178 M80 230 L-40 170 M20 230 L-80 162" stroke="#2a1a0c" stroke-width="3"/><g><circle cx="-96" cy="172" r="44" fill="#6a4a2a" stroke="#2a1a0c" stroke-width="4"/><path d="M-96 128 A44 44 0 0 1 -52 172 L-96 172 Z M-96 216 A44 44 0 0 1 -140 172 L-96 172 Z" fill="#b83a2a" opacity=".85"/><circle cx="-96" cy="172" r="9" fill="url(#bIron)"/></g><g><circle cx="-28" cy="182" r="44" fill="#6a4a2a" stroke="#2a1a0c" stroke-width="4"/><path d="M-28 138 A44 44 0 0 1 16 182 L-28 182 Z M-28 226 A44 44 0 0 1 -72 182 L-28 182 Z" fill="#d8a83a" opacity=".85"/><circle cx="-28" cy="182" r="9" fill="url(#bIron)"/></g><g><circle cx="44" cy="194" r="44" fill="#6a4a2a" stroke="#2a1a0c" stroke-width="4"/><path d="M44 150 A44 44 0 0 1 88 194 L44 194 Z M44 238 A44 44 0 0 1 0 194 L44 194 Z" fill="#2a5a8a" opacity=".85"/><circle cx="44" cy="194" r="9" fill="url(#bIron)"/></g><g><circle cx="756" cy="194" r="44" fill="#6a4a2a" stroke="#2a1a0c" stroke-width="4"/><path d="M756 150 A44 44 0 0 1 800 194 L756 194 Z M756 238 A44 44 0 0 1 712 194 L756 194 Z" fill="#b83a2a" opacity=".85"/><circle cx="756" cy="194" r="9" fill="url(#bIron)"/></g><g><circle cx="828" cy="182" r="44" fill="#6a4a2a" stroke="#2a1a0c" stroke-width="4"/><path d="M828 138 A44 44 0 0 1 872 182 L828 182 Z M828 226 A44 44 0 0 1 784 182 L828 182 Z" fill="#2a5a8a" opacity=".85"/><circle cx="828" cy="182" r="9" fill="url(#bIron)"/></g><g><circle cx="896" cy="172" r="44" fill="#6a4a2a" stroke="#2a1a0c" stroke-width="4"/><path d="M896 128 A44 44 0 0 1 940 172 L896 172 Z M896 216 A44 44 0 0 1 852 172 L896 172 Z" fill="#d8a83a" opacity=".85"/><circle cx="896" cy="172" r="9" fill="url(#bIron)"/></g></g>
<g class="bAim" transform="rotate(0 400 280)"><g class="bKick">
  <path d="M400 106 C300 90 100 100 -70 146 L-74 176 C100 128 300 122 400 132 Z" fill="url(#bWood)" stroke="#1a1008" stroke-width="2.5"/>
  <path d="M400 106 C500 90 700 100 870 146 L874 176 C700 128 500 122 400 132 Z" fill="url(#bWood)" stroke="#1a1008" stroke-width="2.5"/>
  <path d="M398 108 C300 93 100 103 -68 148 M402 108 C500 93 700 103 868 148" stroke="#a88058" stroke-width="2" fill="none" opacity=".7"/>
  ${LASH(-6, 150, 1)}${LASH(806, 150, -1)}
  <circle cx="-62" cy="160" r="9" fill="url(#bIron)" stroke="#1a1a1a" stroke-width="1.5"/><circle cx="862" cy="160" r="9" fill="url(#bIron)" stroke="#1a1a1a" stroke-width="1.5"/>
  <polyline class="bStrBack" points="-62,160 400,236 862,160" fill="none" stroke="#e6d8b8" stroke-width="3"/>
  <polyline class="bStrFwd" points="-62,160 400,126 862,160" fill="none" stroke="#e6d8b8" stroke-width="3"/>
  <polygon points="368,232 432,232 409,48 391,48" fill="url(#bStock)" stroke="#1a1008" stroke-width="2"/>
  <line x1="400" y1="228" x2="400" y2="52" stroke="#1e1208" stroke-width="4"/>
  <g class="bBolt"><line x1="400" y1="214" x2="400" y2="60" stroke="#6e4c2c" stroke-width="7" stroke-linecap="round"/><polygon points="391,62 409,62 400,32" fill="url(#bIron)" stroke="#202020" stroke-width="1"/><polygon points="400,200 388,220 400,212 412,220" fill="#8a2a1a"/></g>
  <rect x="312" y="94" width="50" height="138" rx="8" fill="url(#bPost)" stroke="#120a04" stroke-width="2.5"/><rect x="438" y="94" width="50" height="138" rx="8" fill="url(#bPost)" stroke="#120a04" stroke-width="2.5"/>
  <rect x="309" y="122" width="56" height="9" rx="2" fill="url(#bIron)"/><rect x="435" y="122" width="56" height="9" rx="2" fill="url(#bIron)"/><rect x="309" y="178" width="56" height="9" rx="2" fill="url(#bIron)"/><rect x="435" y="178" width="56" height="9" rx="2" fill="url(#bIron)"/>
  <circle cx="337" cy="106" r="5" fill="url(#bIron)"/><circle cx="463" cy="106" r="5" fill="url(#bIron)"/>
  <g class="bWinch"><g class="bWheel" data-cx="250" data-cy="214"><circle cx="250" cy="214" r="34" fill="none" stroke="#3a2614" stroke-width="9"/><path d="M216 214 H284 M250 180 V248 M226 190 L274 238 M274 190 L226 238" stroke="#4a3018" stroke-width="5"/><circle cx="250" cy="214" r="7" fill="url(#bIron)"/></g>
    <g class="bWheel" data-cx="550" data-cy="214"><circle cx="550" cy="214" r="34" fill="none" stroke="#3a2614" stroke-width="9"/><path d="M516 214 H584 M550 180 V248 M526 190 L574 238 M574 190 L526 238" stroke="#4a3018" stroke-width="5"/><circle cx="550" cy="214" r="7" fill="url(#bIron)"/></g></g>
</g></g></svg>`;
let el = null, aimDeg = 0, wantDeg = 0, state = 'loaded', t = 0;
function ensure() { if (el) return el; el = document.createElement('div'); el.id = 'ballistaHud'; el.className = 'hidden loaded'; el.innerHTML = SVG; document.body.appendChild(el); return el; }
export const ballistaHud = {
  show(on) { ensure(); el.querySelector('svg').setAttribute('preserveAspectRatio', innerWidth > innerHeight ? 'xMidYMax slice' : 'xMidYMax meet'); el.classList.toggle('hidden', !on); if (on) { state = 'loaded'; el.classList.remove('fired', 'reload'); el.classList.add('loaded'); } },
  // aim at a screen x (pixels): the ballista swings up to 10 degrees either way
  aim(x) { if (x == null || !isFinite(x)) return; wantDeg = Math.max(-10, Math.min(10, ((x - innerWidth / 2) / (innerWidth / 2)) * 10)); },
  fire() { ensure(); state = 'fired'; t = 0; el.classList.remove('loaded', 'reload'); el.classList.add('fired'); },
  update(dt) { if (!el || el.classList.contains('hidden')) return; aimDeg += (wantDeg - aimDeg) * Math.min(1, dt * 6); el.querySelector('.bAim').setAttribute('transform', 'rotate(' + aimDeg.toFixed(2) + ' 400 280)');
    t += dt; const kick = state === 'fired' ? Math.max(0, 12 * (1 - t / 0.25)) : 0; el.querySelector('.bKick').setAttribute('transform', 'translate(0 ' + kick.toFixed(1) + ')');
    if (state === 'fired' && t > 0.5) { state = 'reload'; t = 0; el.classList.remove('fired'); el.classList.add('reload'); }
    if (state === 'reload') { el.querySelectorAll('.bWheel').forEach((w) => w.setAttribute('transform', 'rotate(' + (t * 540 * (w.dataset.cx < 400 ? -1 : 1)).toFixed(0) + ' ' + w.dataset.cx + ' ' + w.dataset.cy + ')')); if (t > 0.9) { state = 'loaded'; el.classList.remove('reload'); el.classList.add('loaded'); el.querySelectorAll('.bWheel').forEach((w) => w.setAttribute('transform', '')); } } },
};

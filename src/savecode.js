// Save codes (from Dead City): your whole voyage (ship, upgrades, cargo, legends slain, your wreck, where you are) packed
// into a code you can copy, email to yourself or keep in your notes, then enter on another device or after clearing the
// browser. There is no server: the code IS the save. Format: PR1-<base64url of deflate-raw JSON>-<4-char check>. New keys
// can be added to KEEP at any time; old codes still load (they just don't carry the new ones).
import { SHIP_TIERS } from './ship.js';

const KEEP = /^(pr_save|oo_mute)$/;
const keys = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEEP.test(k)) out.push(k); } } catch { /* ignore */ } return out.sort(); };
const b64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(t, (ch) => ch.charCodeAt(0)); };
const check = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(-4).toUpperCase().padStart(4, '0'); };
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
// unpacking stops past cap bytes, so a small code that expands to hundreds of megabytes is refused (the exploit tester)
const pipeCapped = async (bytes, stream, cap) => { const rd = new Blob([bytes]).stream().pipeThrough(stream).getReader(), parts = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > cap) { try { await rd.cancel(); } catch { /* ignore */ } throw new Error("That code is too big to be a Valhalla's Tide save code."); } parts.push(value); }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

export async function makeCode() {
  const data = {}; for (const k of keys()) data[k] = localStorage.getItem(k);
  const json = new TextEncoder().encode(JSON.stringify(data)); let ver = 'PR0', bytes = json;
  if (typeof CompressionStream !== 'undefined') { try { bytes = await pipe(json, new CompressionStream('deflate-raw')); ver = 'PR1'; } catch { /* plain */ } }
  const body = b64(bytes); return ver + '-' + body + '-' + check(body);
}
// reads a code and returns { data, summary } or throws an Error with a message for the player
export async function readCode(code) {
  const txt = String(code).replace(/\s+/g, '').trim(); if (txt.length > 20000) throw new Error("That code is far too long to be a Valhalla's Tide save code.");
  const m = /^(PR[01])-([A-Za-z0-9_-]+)-([0-9A-Z]{4})$/.exec(txt); if (!m) throw new Error("That doesn't look like a Valhalla's Tide save code.");
  if (check(m[2]) !== m[3]) throw new Error('That code has a typo in it. Copy it again, all of it.');
  let bytes = unb64(m[2]); if (m[1] === 'PR1') { if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to read save codes.'); bytes = await pipeCapped(bytes, new DecompressionStream('deflate-raw'), 262144); } if (bytes.length > 262144) throw new Error("That code is too big to be a Valhalla's Tide save code.");
  const data = JSON.parse(new TextDecoder().decode(bytes)); const clean = {}; for (const k in data) if (KEEP.test(k) && typeof data[k] === 'string') clean[k] = data[k];
  if (!clean.pr_save) throw new Error('That code has no voyage in it.'); try { const v = JSON.parse(clean.pr_save); if (!v || v.v !== 1) throw 0; } catch { throw new Error('That code has no voyage in it.'); } if (clean.pr_save.length > 100000) throw new Error("That code is too big to be a Valhalla's Tide save code.");
  return { data: clean, summary: summarize(clean.pr_save) };
}
// replaces this device's voyage; if the new one cannot be stored, the old one is put back and it returns false
export function applyCode(data) { const old = {}; for (const k of keys()) old[k] = localStorage.getItem(k);
  try { for (const k of keys()) localStorage.removeItem(k); for (const k in data) localStorage.setItem(k, data[k]); return true; }
  catch { try { for (const k of keys()) localStorage.removeItem(k); for (const k in old) localStorage.setItem(k, old[k]); } catch { /* ignore */ } return false; } }
function summarize(raw) {
  let s = null; try { s = JSON.parse(raw || 'null'); } catch { /* ignore */ } if (!s || typeof s !== 'object') return 'No voyage saved yet. Set sail first!';
  const n = (v, hi) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(hi, Math.round(v))) : 0), o = (v) => (v && typeof v === 'object' ? v : {});
  const ups = Object.values(o(s.up)).reduce((a, b) => a + n(b, 8), 0), legends = ['kraken', 'jorm', 'rlyeh', 'hafgufa', 'surtr', 'nidhogg'].filter((k) => Object.prototype.hasOwnProperty.call(o(s.legends), k) && s.legends[k] === true).length, r = o(s.res);
  return '🐉 ' + SHIP_TIERS[n(s.tier, SHIP_TIERS.length - 1)].name + ' · ⚒ ' + ups + ' upgrades · 🪙 ' + n(r.g, 1e7) + ' · 🪵 ' + n(r.w, 1e7) + ' · ⚙️ ' + n(r.i, 1e7) + (n(r.s, 1e7) ? ' · 👻 ' + n(r.s, 1e7) : '') + ' · ⚔ ' + n(s.kills, 1e7) + ' slain · 👑 ' + Math.min(6, legends) + ' legends' + (s.realm === 'hel' ? ' · in Helheim' : '') + (s.wreck ? ' · ☠ a wreck to raise' : '');
}

const CSS = `
#saveBox { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; background: #070504ee; padding: 18px 12px calc(18px + env(safe-area-inset-bottom, 0)); }
#saveBox.hidden { display: none; }
#saveBox .card { width: min(440px, 94vw); display: grid; gap: 8px; padding: 16px; border-radius: 14px; background: #1e140c; border: 2px solid #d8b04a; text-align: left; color: #f2e6c8; box-shadow: 0 10px 30px #000a; }
#saveBox h2 { margin: 0; color: #f2d27a; font: 700 22px Georgia, serif; letter-spacing: 2px; } #saveBox h3 { margin: 8px 0 0; color: #d8b04a; font: 700 14px Georgia, serif; letter-spacing: 2px; }
#saveBox p { margin: 0; font-size: 13px; line-height: 1.35; color: #e8dcc0; } #saveBox .sum { color: #f2d27a; font-weight: 700; }
#saveBox textarea { width: 100%; box-sizing: border-box; min-height: 74px; resize: vertical; font: 16px/1.35 ui-monospace, Menlo, Consolas, monospace; word-break: break-all; color: #f2d27a; background: #0e0905; border: 2px solid #6a4a1a; border-radius: 10px; padding: 8px; -webkit-user-select: text; user-select: text; }
#saveBox .row { display: flex; gap: 8px; flex-wrap: wrap; } #saveBox .row > * { flex: 1; margin: 0; text-align: center; text-decoration: none; }
#saveBox a.ghost { display: inline-block; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #d8b04a; color: #f2e6c8; background: #2a1c12d8; font: 700 14px Georgia, serif; }
#saveBox .msg { min-height: 1.3em; font-weight: 700; } #saveBox .msg.bad { color: #ff7a5a; } #saveBox .msg.good { color: #9fe86a; }
#saveBox .armed { background: linear-gradient(#ff8a5a, #c83a1a); color: #fff; }
`;

// the SAVE CODE panel; returns open(), which shows it with a fresh code for what is saved right now
export function initSaveCodes() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'saveBox'; box.className = 'hidden';
  box.innerHTML = `<div class="card"><h2>💾 SAVE CODE</h2>
    <p>Your voyage lives in this browser. Clearing its history or data wipes it. Keep this code somewhere safe (copy it into your notes, or email it to yourself) and enter it on any device to carry on where you left off.</p>
    <p class="sum" id="saveSum"></p>
    <h3>YOUR CODE</h3><textarea id="saveOut" readonly></textarea>
    <div class="row"><button id="saveCopy">📋 COPY</button><a id="saveMail" class="ghost" target="_blank" rel="noopener">✉️ EMAIL IT</a></div>
    <p class="msg" id="saveOutMsg"></p>
    <h3>LOAD A CODE</h3><p>Paste a code to bring that voyage onto this device. It replaces the one here now.</p>
    <textarea id="saveIn" placeholder="PR1-..."></textarea>
    <button id="saveLoad">⬇️ LOAD</button><p class="msg" id="saveInMsg"></p>
    <button id="saveClose" class="ghost">CLOSE</button></div>`;
  document.body.appendChild(box); const $ = (id) => box.querySelector('#' + id);
  let code = '', pending = null, armT = 0;
  const say = (id, text, cls = '') => { const el = $(id); el.textContent = text; el.className = 'msg ' + cls; };
  const disarm = () => { $('saveLoad').classList.remove('armed'); $('saveLoad').textContent = '⬇️ LOAD'; };
  // iOS: after typing in a box the page can stay scrolled or shifted; put it back when the box loses focus
  for (const id of ['saveIn', 'saveOut']) { const t = $(id); if (t) t.addEventListener('blur', () => setTimeout(() => { window.scrollTo(0, 0); document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; }, 50)); }
  async function open() { box.classList.remove('hidden'); say('saveOutMsg', ''); say('saveInMsg', ''); $('saveIn').value = ''; pending = null; disarm();
    let raw = null; try { raw = localStorage.getItem('pr_save'); } catch { /* ignore */ } $('saveSum').textContent = summarize(raw);
    code = raw ? await makeCode() : ''; $('saveOut').value = code || 'Set sail first: there is no voyage to save yet.';
    $('saveMail').href = 'mailto:?subject=' + encodeURIComponent("My Valhalla's Tide save code") + '&body=' + encodeURIComponent(code + "\n\nTo load it: the Valhalla's Tide title screen → SAVE CODE → paste it under LOAD A CODE → LOAD."); }
  $('saveOut').addEventListener('focus', (e) => e.target.select());
  $('saveCopy').addEventListener('click', async () => { if (!code) return; const sel = () => { const t = $('saveOut'); t.focus(); t.select(); t.setSelectionRange(0, t.value.length); };
    try { await navigator.clipboard.writeText(code); say('saveOutMsg', '✓ Copied! Paste it somewhere safe.', 'good'); }
    catch { sel(); let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ } say('saveOutMsg', ok ? '✓ Copied! Paste it somewhere safe.' : 'The code is selected: press and hold it, then Copy.', ok ? 'good' : ''); } });
  $('saveLoad').addEventListener('click', async () => {
    if (pending && pending.raw === $('saveIn').value && performance.now() - armT < 4000) { if (!applyCode(pending.data)) { pending = null; disarm(); say('saveInMsg', 'That code could not be stored on this device. Your voyage here is unchanged.', 'bad'); return; } say('saveInMsg', '✓ Loaded! Restarting…', 'good'); setTimeout(() => location.reload(), 900); return; }
    try { pending = await readCode($('saveIn').value); pending.raw = $('saveIn').value; armT = performance.now(); $('saveLoad').classList.add('armed'); $('saveLoad').textContent = '⚠️ TAP AGAIN TO REPLACE THIS DEVICE\'S VOYAGE';
      say('saveInMsg', 'This code has: ' + pending.summary, ''); setTimeout(() => { if (performance.now() - armT >= 3900) disarm(); }, 4000); }
    catch (e) { pending = null; say('saveInMsg', e.message || 'That code could not be read.', 'bad'); } });
  $('saveClose').addEventListener('click', () => box.classList.add('hidden'));
  return { open, makeCode, readCode };
}

// ---------- ship battles from the deck, ACTION: aim at her mast, oars and hull (v1.12.0, Sean's request) ----------
// The battle line plays on (she sails past along her lane, heaves to, comes about, aims her volleys at you); your ballista
// no longer fires blind volleys. Tap a marker on her ship (MAST, OARS or HULL) while she is in your arc, then the gunner
// game from the raids and the Kraken: tap the targets (accuracy), stop the power needle (how hard), LOOSE. Her hull is her
// life. Bring down her mast and her sail falls: she loses way and cannot come about. Smash her oars: she slows again. Both
// gone and she is crippled: hull shots bite harder and you can board her whatever her hull. Shots at the mast or oars also
// shake the hull a little.
import * as THREE from 'three';
import { ballistaHud } from './ballista.js';

const PARTS = [
  { k: 'mast', name: 'Mast', icon: '⛵', share: 0.35 },
  { k: 'oars', name: 'Oars', icon: '🚣', share: 0.3 },
  { k: 'hull', name: 'Hull', icon: '🛡' },
];
export function createShipGame(G) {
  let S = null, el = null, uid = 0; const V3 = new THREE.Vector3(), V4 = new THREE.Vector3(), IDLE = '🎯 Tap her MAST, OARS or HULL to aim the ballista';
  // each ship's own parts: the mast and oars have their own health; the hull is her life (f.hp)
  function parts(f) { if (!f.sg) f.sg = { id: ++uid, side: 1, mast: { hp: f.maxHp * 0.35, max: f.maxHp * 0.35, dead: false }, oars: { hp: f.maxHp * 0.3, max: f.maxHp * 0.3, dead: false }, fall: 0 }; return f.sg; }
  const crippled = (f) => !!f.sg && f.sg.mast.dead && f.sg.oars.dead;
  const speedK = (f) => (f.sg ? (crippled(f) ? 0.25 : (f.sg.mast.dead ? 0.55 : 1) * (f.sg.oars.dead ? 0.65 : 1)) : 1);
  const canTurn = (f) => !f.sg || !f.sg.mast.dead;
  // where a part is: the mast below half way up, the oars and the hull on the side of her that faces you
  function partPos(f, k, out = V3) { const sh = f.m.ship, t = sh.t, sd = parts(f).side;
    if (k === 'mast') out.set(0, sh.deckY + t.mast * 0.42, t.L * 0.04); else if (k === 'oars') out.set(sd * (t.B * 0.5 + 0.9), 0.35, -t.L * 0.2); else out.set(sd * t.B * 0.5, sh.deckY * 0.5, t.L * 0.22);
    return sh.body.localToWorld(out); }
  const onScreen = (s) => !!s && s[0] > -10 && s[0] < innerWidth + 10 && s[1] > -10 && s[1] < innerHeight + 10;
  function start(B) { S = { B, phase: 'pick', sel: null, aimId: 0, marks: new Map(), barsFor: null };
    el = document.getElementById('shipGame') || (() => { const d = document.createElement('div'); d.id = 'shipGame'; document.body.appendChild(d); return d; })();
    el.innerHTML = '<div class="bgBars sgBars" id="sgBars"></div><div class="sgMarks" id="sgMarks"></div><div class="bgField" id="sgField"></div>'; el.classList.remove('hidden'); msg(IDLE); }
  // what to do now, in the battle line's hint under her name
  const msg = (t) => { const m = document.getElementById('bHint'); if (m && m.textContent !== t) m.textContent = t; };
  // the bars: the ship you are aiming at, else the nearest one on screen
  function bars(f) { const box = el && el.querySelector('#sgBars'); if (!box) return; if (!f) { box.innerHTML = ''; S.barsFor = null; return; } const p = parts(f), row = (P, hp, max, dead) => '<div class="bgBar' + (dead ? ' dead' : '') + (S.sel && S.sel.f === f && S.sel.k === P.k ? ' sel' : '') + '"><span>' + P.icon + ' ' + P.name + (dead ? ' — gone' : '') + '</span><i style="width:' + Math.max(0, (hp / max) * 100) + '%"></i></div>';
    const html = row(PARTS[0], p.mast.hp, p.mast.max, p.mast.dead) + row(PARTS[1], p.oars.hp, p.oars.max, p.oars.dead) + row(PARTS[2], f.hp, f.maxHp, false) + (crippled(f) ? '<div class="sgCrip">⚓ CRIPPLED: hull shots bite harder, board her!</div>' : ''); if (box._h !== html) { box.innerHTML = html; box._h = html; } S.barsFor = f; }
  // the markers: one per part still standing, on every ship in view (none while coming about or mid-shot)
  function marks(B) { const box = el.querySelector('#sgMarks'), show = S.phase === 'pick' && !B.swap && B.k >= 1, seen = new Set(); let near = null, nd = 1e9;
    for (const f of B.foes) { const p = parts(f); f.m.ship.body.updateWorldMatrix(true, false); p.side = f.m.ship.body.worldToLocal(V4.set(G.boat.x, 0, G.boat.z)).x < 0 ? -1 : 1;
      for (const P of PARTS) { const id = p.id + P.k, gone = P.k !== 'hull' && p[P.k].dead, s = show && !gone ? G.toScreen(...partPos(f, P.k).toArray()) : null; let b = S.marks.get(id);
        if (!onScreen(s)) { if (b) b.style.display = 'none'; continue; } seen.add(id);
        if (!b) { b = document.createElement('button'); b.className = 'lgMark sgMark ' + P.k; b.innerHTML = '<i></i><b>' + P.name.toUpperCase() + '</b>'; b.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); pick(f, P.k); }; box.appendChild(b); S.marks.set(id, b); b._f = f; }
        b.style.display = ''; b.style.left = s[0] + 'px'; b.style.top = s[1] + 'px'; const hp = P.k === 'hull' ? f.hp / f.maxHp : p[P.k].hp / p[P.k].max; b.firstChild.style.height = Math.max(0, hp) * 100 + '%';
        if (P.k === 'hull') { const d = Math.abs(s[0] - innerWidth / 2); if (d < nd) { nd = d; near = f; } } } }
    for (const [id, b] of S.marks) if (!seen.has(id)) b.style.display = 'none';
    return near; }
  // ---------- aim and power, as in the raids and the Kraken ----------
  function pick(f, k) { if (!S || S.phase !== 'pick' || f.dead || f.hp <= 0) return; const aid = ++S.aimId; S.sel = { f, k }; S.phase = 'aim'; const n = S.count = Math.max(3, Math.min(7, 3 + Math.floor(f.lv * 0.6))); S.hits = 0; hideMarks();
    msg('🎯 AIM at her ' + k.toUpperCase() + ': tap the targets (' + n + ')'); const fd = el.querySelector('#sgField'), life = Math.max(0.7, 1.25 - f.lv * 0.06);
    for (let i = 0; i < n; i++) setTimeout(() => { if (!S || S.phase !== 'aim' || S.aimId !== aid) return; const c = document.createElement('button'); c.className = 'bgTarget'; c.style.left = (14 + Math.random() * 72) + '%'; c.style.top = (20 + Math.random() * 52) + '%'; c.style.animationDuration = life + 's'; fd.appendChild(c);
      c.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if (c.dataset.done) return; c.dataset.done = 1; S.hits++; c.classList.add('hit'); G.sfx.hit(); setTimeout(() => c.remove(), 200); };
      setTimeout(() => { if (!c.dataset.done) { c.dataset.done = 1; c.classList.add('miss'); setTimeout(() => c.remove(), 200); } if (S && S.phase === 'aim' && S.aimId === aid && i === n - 1) setTimeout(() => { if (S && S.aimId === aid) power(); }, 400); }, life * 1000); }, 300 + i * 480); }
  function power() { if (!S || S.phase !== 'aim') return; S.phase = 'power'; S.pt = 0; const fd = el.querySelector('#sgField'); fd.innerHTML = '<div class="bgPower"><div class="zone ok"></div><div class="zone sweet"></div><i id="sgNeedle"></i></div><button class="bgStrike" id="sgStrike">🏹 LOOSE!</button>';
    msg('💪 POWER: stop the needle in the green (' + S.hits + ' of ' + S.count + ' on target)'); fd.querySelector('#sgStrike').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); loose(); }; }
  function loose() { if (!S || S.phase !== 'power') return; const { f, k: part } = S.sel, B = S.B; S.phase = 'fire'; el.querySelector('#sgField').innerHTML = ''; ballistaHud.fire(); G.sfx.throw && G.sfx.throw();
    const x = S.needle || 0, k = x > 0.68 && x < 0.82 ? 1.5 : x > 0.5 && x < 0.92 ? 1 : 0.5, acc = S.hits / S.count, b = G.boat, t = G.T(), d = B.fpDir || V4.set(0, 0, 1), from = { x: b.x + d.x * t.B * 0.4, y: b.y + t.rise + 2, z: b.z + d.z * t.B * 0.4 };
    const alive = B.foes.includes(f) && f.hp > 0, to = alive ? partPos(f, part).clone() : null, s = to && G.toScreen(to.x, to.y, to.z);
    if (!alive || !onScreen(s)) { // she has sailed out of your arc: the bolt goes into the sea where she was
      const miss = to || { x: b.x + d.x * B.gap, y: 0, z: b.z + d.z * B.gap }; G.launch(from, { x: miss.x, y: 0, z: miss.z }, 'bolt', () => G.splash(miss.x, miss.z, 1)); msg('💨 She is out of your arc: the bolt falls in the sea'); }
    else { msg((k > 1.2 ? '💥 PERFECT POWER! ' : k > 0.8 ? '💥 Good shot. ' : '💨 Weak shot. ') + Math.round(acc * 100) + '% on target'); const dmg = G.attack() * 2.4 * (0.25 + acc) * k * (G.thor() ? 2 : 1);
      G.launch(from, { x: to.x, y: to.y, z: to.z }, 'bolt', () => { if (S && S.B === B && B.foes.includes(f) && f.hp > 0) hurt(f, part, dmg); }); }
    setTimeout(() => { if (S && S.phase === 'fire') { S.phase = 'pick'; S.sel = null; } }, 1300); }
  function hurt(f, part, dmg) { const p = parts(f), pos = partPos(f, part).clone(); if (f.stState) f.stState.hurt = 1; G.splash(pos.x, pos.z, 1.2); G.sfx.hit();
    if (part === 'hull') { const d = Math.round(dmg * (crippled(f) ? 1.25 : 1)); f.hp -= d; G.pop(pos.x, pos.y + 2, pos.z, '−' + d, '#ffd24a'); G.burn(f); return; }
    const P = p[part]; if (P.dead) { f.hp -= Math.round(dmg * 0.5); G.pop(pos.x, pos.y + 2, pos.z, '−' + Math.round(dmg * 0.5), '#ffffff'); return; }
    const d = Math.round(dmg); P.hp -= d; f.hp -= Math.round(d * 0.25); G.pop(pos.x, pos.y + 2, pos.z, '−' + d, '#ffffff');
    if (P.hp <= 0) { P.dead = true; P.hp = 0; G.explode(pos.x, pos.y, pos.z, 1, part === 'mast' ? 0xd8c8a0 : 0x9a7048); G.sfx.creak && G.sfx.creak();
      if (part === 'mast') G.warn('⛵ HER MAST COMES DOWN! She loses way.', 2.5); else { if (f.m.ship.oars) f.m.ship.oars.visible = false; G.warn('🚣 HER OARS ARE SMASHED! She slows.', 2.5); }
      if (crippled(f)) G.say('⚓ She is crippled, dead in the water: hull shots bite harder, and you can board her.', 4); } }
  // pausing mid-aim drops the half-made shot (the targets run on real time)
  function interrupt() { if (S && (S.phase === 'aim' || S.phase === 'power')) { S.aimId++; S.phase = 'pick'; S.sel = null; if (el) el.querySelector('#sgField').innerHTML = ''; msg(IDLE); } }
  const hideMarks = () => { if (S) for (const b of S.marks.values()) b.style.display = 'none'; };
  // each frame: the markers, the bars, the power needle, the ballista's swing, a falling mast
  function update(dt, B) { if (!S) return; if (S.B !== B) { clear(); return; }
    if (S.sel && (!B.foes.includes(S.sel.f) || S.sel.f.hp <= 0) && (S.phase === 'aim' || S.phase === 'power')) interrupt();
    for (const [id, b] of [...S.marks]) if (!B.foes.includes(b._f)) { b.remove(); S.marks.delete(id); } // her ship went down
    if (S.phase === 'pick' && !B.swap) msg(IDLE); const near = marks(B); bars(S.sel ? S.sel.f : near || (S.barsFor && B.foes.includes(S.barsFor) ? S.barsFor : null));
    if (S.phase === 'power') { S.pt += dt; S.needle = (Math.sin(S.pt * (1.1 + (S.sel.f.lv || 0) * 0.15) * Math.PI) + 1) / 2; const n = el.querySelector('#sgNeedle'); if (n) n.style.left = S.needle * 100 + '%'; }
    const s = S.sel && B.foes.includes(S.sel.f) ? G.toScreen(...partPos(S.sel.f, S.sel.k).toArray()) : null; ballistaHud.aim(s ? s[0] : innerWidth / 2);
    for (const f of B.foes) { const p = parts(f); if (p.mast.dead && p.fall < 1 && f.m.ship.yard) { p.fall = Math.min(1, p.fall + dt / 1.2); const y = f.m.ship.yard, sh = f.m.ship, e = p.fall * p.fall; if (y.userData.y0 == null) y.userData.y0 = y.position.y; y.position.y = y.userData.y0 - (y.userData.y0 - sh.deckY - 0.6) * e; y.rotation.z = e * 0.5 * p.side; y.rotation.x = e * 0.25; } } }
  function clear() { if (S) S.aimId++; S = null; if (el) { el.innerHTML = ''; el.classList.add('hidden'); } }
  return { start, update, clear, interrupt, speedK, canTurn, crippled, get active() { return !!S; }, get S() { return S; } };
}

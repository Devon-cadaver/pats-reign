// ---------- ship spells (v1.5.0, Sean: more spells, combinations, mini tornadoes and rogue waves, summoning the Kraken
// and the Elder One) ----------
// Every people teaches a spell on its first sack and another on its second; each legend teaches one when slain. The first
// four (Breath, Frost, Veil, Sun) live in raids.js; the rest here. Two spells cast within 4 s of each other make a combo
// if the pair is in COMBOS: a banner, an extra effect, and the combo is remembered in P.combos (the Bestiary lists them).
// The spell bar shows four learned spells; the ✦ button opens the whole spell book (tap a spell there to cast it).
import * as THREE from 'three';
import { makeMonster } from './monsters.js';
import { SPELLS } from './raids.js';

export const COMBOS = {
  'breath+frost': { name: 'Steam Burst', icon: '💨', desc: 'Fire on frozen towers shatters them: six times your attack to every frozen target.' },
  'breath+veil': { name: 'Ambush Fire', icon: '🔥', desc: 'Breath from inside the mist: a second cone of fire at no cost.' },
  'frost+gale': { name: 'Blizzard', icon: '🌨', desc: 'Every beast and ship within 70 is frozen for 6 s.' },
  'hammer+sun': { name: "Thor's Dawn", icon: '🌅', desc: 'The storm-light heals another 30% of your hull.' },
  'breath+firerain': { name: 'Firestorm', icon: '🌋', desc: 'Eight more explosions rain on everything near the target.' },
  'gale+veil': { name: 'Ghost Run', icon: '👻', desc: 'Hidden in mist and twice as fast for 10 s.' },
  'rogue+twister': { name: 'Maelstrom', icon: '🌀', desc: 'The tornado rides the wave: four times as long and twice the damage.' },
  'draugr+hammer': { name: 'Thunder of the Dead', icon: '⚡', desc: 'Lightning strikes every enemy ship within 80.' },
  'icewall+rogue': { name: 'Glacier Wave', icon: '🧊', desc: 'The wave freezes as it goes: everything it hits is frozen 8 s.' },
  'firerain+twister': { name: 'Fire Tornado', icon: '🔥', desc: 'The tornado burns: triple damage.' },
};
const OLD = ['breath', 'frost', 'veil', 'sun'];

export function createSpells(G, R) {
  const { scene, ocean, foam, smoke, embers, sfx } = G; const cd = {}, summons = [], twisters = [], walls = []; let last = null, ui = null, book = null, ambush = 0, twK = 1, deepK = 1;
  const P = () => G.P, b = () => G.boat;
  const ahead = (d) => [b().x + Math.sin(b().yaw) * d, b().z + Math.cos(b().yaw) * d];
  // the nearest thing to hit: a raid target (tower, wall), a beast or an enemy ship
  function nearest(range, onlyShips) { let best = null, bd = range; if (!onlyShips) for (const t of R.targets()) { const d = Math.hypot(t.x - b().x, t.z - b().z); if (d < bd) { bd = d; best = { t, x: t.x, z: t.z, y: t.top }; } }
    for (const m of G.mons()) { if (m.dead || m.rise < 1 || m.passive || (onlyShips && !m.naval)) continue; const d = Math.hypot(m.x - b().x, m.z - b().z); if (d < bd) { bd = d; best = { m, x: m.x, z: m.z, y: m.top * 0.5 }; } } return best; }
  function hurtAround(x, z, r, dmg, kind) { for (const t of R.targets()) if (Math.hypot(t.x - x, t.z - z) < r) R.hit(t, dmg, kind); for (const m of G.mons()) if (!m.dead && m.rise >= 1 && !m.passive && Math.hypot(m.x - x, m.z - z) < r) G.hurtMon(m, dmg); }
  const atk = () => G.attack();
  // ---------- the new spells ----------
  const DO = {
    hammer() { const T = nearest(80); if (!T) { G.say('No target for the hammer.'); return false; } bolt(T.x, T.z); setTimeout(() => { R.explode(T.x, (T.y || 4), T.z, 1.4, 0xbfe0ff); if (T.t) R.hit(T.t, atk() * 8, 'bolt'); else G.hurtMon(T.m, atk() * 8); }, 120); return true; },
    twister() { const [x, z] = ahead(12); const g = G.makeTwister(); g.position.set(x, 0, z); g.scale.setScalar(1.6); scene.add(g); twisters.push({ g, x, z, yaw: b().yaw, t: 0, life: 6 * twK, k: twK }); twK = 1; return true; },
    firerain() { const T = nearest(90) || { x: ahead(40)[0], z: ahead(40)[1], y: 0 }; for (let i = 0; i < 6; i++) setTimeout(() => { const x = T.x + (Math.random() - 0.5) * 14, z = T.z + (Math.random() - 0.5) * 14; R.explode(x, 2, z, 0.9, 0xff8a40); hurtAround(x, z, 10, atk() * 1.5, 'fire'); }, 200 + i * 220); return true; },
    icewall() { let n = 0; for (const m of G.mons()) { if (m.dead) continue; if (Math.hypot(m.x - b().x, m.z - b().z) < 55) { m.stun = Math.max(m.stun || 0, 8); n++; } } for (let i = 0; i < 9; i++) { const a = b().yaw + (i - 4) * 0.35, x = b().x + Math.sin(a) * 22, z = b().z + Math.cos(a) * 22; const p = new THREE.Mesh(G.iceGeo(), new THREE.MeshLambertMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.85, emissive: 0x204060 })); p.position.set(x, -3, z); p.scale.set(2.4, 7 + Math.random() * 3, 2.4); scene.add(p); walls.push({ p, t: 0, life: 8 }); } G.say('🧊 An ice wall rises: ' + n + ' held fast.', 2); return true; },
    draugr() { const T = nearest(70, true); if (!T) { G.say('No enemy ship to board.'); return false; } const m = T.m, total = m.maxHp * 0.45; let k = 0; const iv = setInterval(() => { if (G.state() !== 'play') return; if (m.dead || !G.mons().includes(m) || k++ >= 6) { clearInterval(iv); return; } G.hurtMon(m, total / 6); G.pop(m.x, m.top + 2, m.z, '💀 DRAUGR', '#9affc0'); for (let i = 0; i < 8; i++) foam.add(m.x + (Math.random() - 0.5) * 4, m.z + (Math.random() - 0.5) * 4, { spray: true, y: 2, vy: 2, s: 0.6, life: 1, a: 0.8 }); }, 900); m.stun = Math.max(m.stun || 0, 6); return true; },
    gale() { b().boost = Math.max(b().boost || 0, 6); for (let i = 0; i < 30; i++) foam.add(b().x - Math.sin(b().yaw) * 6, b().z - Math.cos(b().yaw) * 6, { spray: true, y: 2, vx: Math.sin(b().yaw) * 18 + (Math.random() - 0.5) * 4, vz: Math.cos(b().yaw) * 18 + (Math.random() - 0.5) * 4, vy: 1, s: 0.8, life: 1.2, a: 0.9 }); return true; },
    rogue(freeze) { const yaw = b().yaw; for (let s = 0; s < 8; s++) setTimeout(() => { for (let k = -5; k <= 5; k++) { const d = 10 + s * 6, a = yaw + k * 0.08, x = b().x + Math.sin(a) * d, z = b().z + Math.cos(a) * d; foam.splash(x, z, 1.4); } }, s * 90);
      for (const m of G.mons()) { if (m.dead || m.rise < 1) continue; const dx = m.x - b().x, dz = m.z - b().z, d = Math.hypot(dx, dz); if (d < 60 && Math.abs(G.angDiff(Math.atan2(dx, dz), yaw)) < 0.5) { m.x += (dx / d) * 18; m.z += (dz / d) * 18; G.hurtMon(m, atk() * 2); if (freeze) m.stun = Math.max(m.stun || 0, 8); } }
      for (const t of R.targets()) { const dx = t.x - b().x, dz = t.z - b().z, d = Math.hypot(dx, dz); if (d < 60 && Math.abs(G.angDiff(Math.atan2(dx, dz), yaw)) < 0.5) { R.hit(t, atk() * 2.5, 'wave'); if (freeze) t.frozen = 8; } } sfx.boom(); return true; },
    kraken() { return summon('kraken', 3.5 * deepK); },
    elder() { return summon('elder', 3); },
    serpent() { return summon('jormungandr', 3); },
  };
  function bolt(x, z) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 80, 6), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 1 })); g.position.set(x, 40, z); scene.add(g); summons.push({ bolt: g, t: 0, life: 0.35 }); G.flashSky && G.flashSky(); sfx.boom(); }
  // a summoned beast rises beside the target, strikes and sinks
  function summon(type, secs) { const T = nearest(110); const x = T ? T.x + 10 : ahead(30)[0], z = T ? T.z + 10 : ahead(30)[1]; const m = makeMonster(type, 0, type === 'kraken' ? 3.5 : 0.8); m.g.position.set(x, -m.size, z); m.g.rotation.y = T ? Math.atan2(T.x - x, T.z - z) : b().yaw; scene.add(m.g);
    summons.push({ m, x, z, T, t: 0, life: secs + 2, hitT: 0.8, st: { t: 0, speed: 0.5, attack: 0, dive: 1, hurt: 0, rise: 0 } }); G.warn((type === 'kraken' ? '🐙 THE KRAKEN' : type === 'elder' ? '👁 THE ELDER ONE' : '🐍 THE WORLD SERPENT') + ' ANSWERS YOUR CALL!', 2.5); sfx.horn && sfx.horn(); deepK = 1; return true; }
  // ---------- casting, combos ----------
  function cast(k) { const p = P(); if (!p.spells || !p.spells[k] || SPELLS[k].ritual || G.state() !== 'play') return false; let ok;
    if (OLD.includes(k)) { const before = R.cdOf(k); if (k === 'breath') R.breath(); else R.cast(k); ok = R.cdOf(k) > before; if (ok && k === 'breath' && ambush > 0) { setTimeout(() => R.breathFree(), 500); } }
    else { if ((cd[k] || 0) > 0) return false; ok = DO[k](); if (ok) { cd[k] = SPELLS[k].cd * (G.cdK ? G.cdK() : 1); G.say(SPELLS[k].icon + ' ' + SPELLS[k].name.toUpperCase() + '!', 1.5); } }
    if (!ok) return false; const now = performance.now(); if (last && now - last.t < 4000 && last.k !== k) { const key = [last.k, k].sort().join('+'), rit = Object.keys(SPELLS).find((r) => SPELLS[r].ritual === key); if (rit) { ritual(rit); return true; } if (COMBOS[key]) { combo(key); return true; } } last = { k, t: now }; return true; }
  function combo(key) { const C = COMBOS[key], p = P(); p.combos = p.combos || {}; const first = !p.combos[key]; p.combos[key] = true; G.warn(C.icon + ' COMBO: ' + C.name.toUpperCase() + '!' + (first ? ' (new!)' : ''), 3); sfx.horn && sfx.horn(); last = null;
    if (key === 'breath+frost') { for (const t of R.targets()) if (t.frozen > 0) R.hit(t, atk() * 6, 'steam'); for (const m of G.mons()) if (!m.dead && m.stun > 0 && Math.hypot(m.x - b().x, m.z - b().z) < 60) G.hurtMon(m, atk() * 6); }
    else if (key === 'breath+veil') { ambush = 1; setTimeout(() => { R.breathFree(); ambush = 0; }, 600); }
    else if (key === 'frost+gale') { for (const m of G.mons()) if (!m.dead && Math.hypot(m.x - b().x, m.z - b().z) < 70) m.stun = Math.max(m.stun || 0, 6); for (const t of R.targets()) if (Math.hypot(t.x - b().x, t.z - b().z) < 70) t.frozen = 6; }
    else if (key === 'hammer+sun') { const h = Math.round(G.maxHp() * 0.3); p.hp = Math.min(G.maxHp(), p.hp + h); G.hud(); G.pop(b().x, b().y + 5, b().z, '🌅 +' + h, '#ffe06a'); }
    else if (key === 'breath+firerain') { const T = nearest(100) || { x: ahead(40)[0], z: ahead(40)[1] }; for (let i = 0; i < 8; i++) setTimeout(() => { const x = T.x + (Math.random() - 0.5) * 24, z = T.z + (Math.random() - 0.5) * 24; R.explode(x, 3, z, 1.2, 0xff6a20); hurtAround(x, z, 12, atk() * 2, 'fire'); }, 300 + i * 160); }
    else if (key === 'gale+veil') { b().veil = Math.max(b().veil || 0, 10); b().boost = Math.max(b().boost || 0, 10); }
    else if (key === 'rogue+twister') { for (const w of twisters) if (w.t < 4 && !w.boosted) { w.boosted = true; w.life = Math.min(30, w.life * 4); w.k = 2; } }
    else if (key === 'draugr+hammer') { for (const m of G.mons()) if (!m.dead && m.naval && Math.hypot(m.x - b().x, m.z - b().z) < 80) { bolt(m.x, m.z); G.hurtMon(m, atk() * 5); } }
    else if (key === 'icewall+rogue') DO.rogue(true);
    else if (key === 'firerain+twister') { for (const w of twisters) w.k = 3; } }
  // a ritual: the legend's relic and the right pair of spells
  function ritual(r) { const p = P(), S = SPELLS[r]; last = null; if (!(G.legends()[S.legend])) { G.warn('🌀 The deep stirs, but answers only one who has slain its master.', 3); return; } if ((cd[r] || 0) > 0) { G.say(S.icon + ' The ritual needs ' + Math.ceil(cd[r]) + ' s more.', 2); return; } cd[r] = S.cd; p.combos = p.combos || {}; p.combos['ritual:' + r] = true; DO[r](); }
  // ---------- each frame ----------
  function update(dt) { for (const k in cd) cd[k] = Math.max(0, cd[k] - dt); ensureUI(); paint();
    for (let i = twisters.length - 1; i >= 0; i--) { const w = twisters[i]; w.t += dt; w.x += Math.sin(w.yaw) * 9 * dt; w.z += Math.cos(w.yaw) * 9 * dt; w.yaw += Math.sin(w.t * 1.3) * dt * 0.6; w.g.position.set(w.x, 0, w.z); hurtTick(w, dt); if (w.t > w.life) { G.removeTwister(w.g); twisters.splice(i, 1); } }
    for (let i = walls.length - 1; i >= 0; i--) { const w = walls[i]; w.t += dt; w.p.position.y = w.t < 0.6 ? -3 + w.t * 6 : w.t > w.life - 1 ? 0.6 - (w.t - w.life + 1) * 4 : 0.6; if (w.t > w.life) { scene.remove(w.p); w.p.material.dispose(); walls.splice(i, 1); } }
    for (let i = summons.length - 1; i >= 0; i--) { const s = summons[i]; s.t += dt;
      if (s.bolt) { s.bolt.material.opacity = 1 - s.t / s.life; if (s.t > s.life) { scene.remove(s.bolt); s.bolt.geometry.dispose(); s.bolt.material.dispose(); summons.splice(i, 1); } continue; }
      const up = s.t < 1 ? s.t : s.t > s.life - 1 ? Math.max(0, s.life - s.t) : 1; s.st.dive = 1 - up; s.st.rise = up; s.st.attack = Math.max(0, Math.sin(s.t * 2.2)); s.m.g.position.y = ocean.heightAt(s.x, s.z) - (1 - up) * s.m.size * 0.6; s.m.anim(dt, s.st);
      s.hitT -= dt; if (up > 0.8 && s.hitT <= 0) { s.hitT = 0.9; const T = s.T; const x = T ? (T.t ? T.t.x : T.m && !T.m.dead ? T.m.x : s.x) : s.x, z = T ? (T.t ? T.t.z : T.m && !T.m.dead ? T.m.z : s.z) : s.z; foam.splash(x, z, 2); hurtAround(x, z, 22, atk() * 3, 'summon'); G.shake && G.shake(0.6); }
      if (s.t > s.life) { scene.remove(s.m.g); s.m.g.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); summons.splice(i, 1); } } }
  function hurtTick(w, dt) { w.tick = (w.tick || 0) + dt; if (w.tick < 0.5) return; w.tick = 0; hurtAround(w.x, w.z, 9, atk() * 0.8 * (w.k || 1), w.k === 3 ? 'fire' : 'wind'); for (let i = 0; i < 6; i++) foam.add(w.x + (Math.random() - 0.5) * 6, w.z + (Math.random() - 0.5) * 6, { spray: true, y: 1, vy: 4, s: 0.7, life: 1, a: 0.8 }); if (w.k === 3) for (let i = 0; i < 6; i++) embers.add(w.x, w.z, { spray: true, y: 2 + Math.random() * 6, vx: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, vy: 3, s: 0.6, life: 1, a: 1 }); }
  // ---------- the spell bar and the book ----------
  const learned = () => Object.keys(SPELLS).filter((k) => !SPELLS[k].ritual && P().spells && P().spells[k]);
  const cdLeft = (k) => (OLD.includes(k) ? R.cdOf(k) : cd[k] || 0);
  function ensureUI() { if (ui) return; ui = document.createElement('div'); ui.id = 'spellBar2'; document.body.appendChild(ui); book = document.createElement('div'); book.id = 'spellBook'; book.className = 'hidden'; document.body.appendChild(book); }
  let sig = '';
  function paint() { const L = learned(), show = G.state() === 'play' && L.length > 0; if (G.inBattle && G.inBattle()) book.classList.add('hidden'); ui.classList.toggle('hidden', !show); if (!show) { book.classList.add('hidden'); return; } const p = P(); p.bar = (p.bar || []).filter((k) => L.includes(k)); for (const k of L) if (p.bar.length < 4 && !p.bar.includes(k)) p.bar.push(k);
    const s = p.bar.join(',') + '|' + L.length; if (s !== sig) { sig = s; ui.innerHTML = p.bar.map((k) => `<button class="act spell" data-k="${k}"><em>${SPELLS[k].icon}</em><small>${SPELLS[k].short || SPELLS[k].name.split(' ').pop().toUpperCase()}</small><i class="cd"></i></button>`).join('') + (L.length > 0 ? '<button class="act more" id="spellMore"><em>✦</em><small>BOOK</small></button>' : '');
      ui.querySelectorAll('[data-k]').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); cast(bt.dataset.k); }; }); ui.querySelector('#spellMore').onclick = (e) => { e.stopPropagation(); openBook(); }; }
    ui.querySelectorAll('[data-k]').forEach((bt) => { const k = bt.dataset.k, c = cdLeft(k); bt.classList.toggle('ready', c <= 0); bt.querySelector('.cd').style.height = (c / SPELLS[k].cd) * 100 + '%'; }); }
  function openBook() { const p = P(), L = learned(); book.innerHTML = '<h3>✦ Spell book</h3><p>Tap to cast. Hold the ★ to put it on the bar (four fit). Cast two within 4 s for a combo.</p><div class="grid">' + L.map((k) => `<div class="sp"><button class="cast" data-k="${k}"><b>${SPELLS[k].icon} ${SPELLS[k].name}</b><span>${cdLeft(k) > 0 ? Math.ceil(cdLeft(k)) + ' s' : 'ready'}</span></button><button class="pin${p.bar.includes(k) ? ' on' : ''}" data-p="${k}">★</button></div>`).join('') + '</div><p class="combos"><b>Combos found:</b> ' + (Object.keys(p.combos || {}).filter((c) => COMBOS[c]).map((c) => COMBOS[c].icon + ' ' + COMBOS[c].name).join(', ') || 'none yet') + ' (' + Object.keys(p.combos || {}).filter((c) => COMBOS[c]).length + ' of ' + Object.keys(COMBOS).length + ')</p><p class="combos"><b>Rituals:</b> ' + Object.keys(SPELLS).filter((r) => SPELLS[r].ritual).map((r) => SPELLS[r].icon + ' ' + SPELLS[r].name + (G.legends()[SPELLS[r].legend] ? ' (ready: ' + SPELLS[r].ritual.split('+').map((q) => SPELLS[q].name).join(' + ') + ')' : ' (slay its legend first)')).join(' · ') + '</p><button class="ghost" id="bookClose">CLOSE</button>'; book.classList.remove('hidden');
    book.querySelectorAll('[data-k]').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); book.classList.add('hidden'); cast(bt.dataset.k); }; });
    book.querySelectorAll('[data-p]').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); const k = bt.dataset.p; if (p.bar.includes(k)) p.bar = p.bar.filter((q) => q !== k); else { if (p.bar.length >= 4) p.bar.shift(); p.bar.push(k); } sig = ''; openBook(); }; });
    book.querySelector('#bookClose').onclick = (e) => { e.stopPropagation(); book.classList.add('hidden'); }; }
  // teach: a people's second sack, a legend
  function teach(k, why) { const p = P(); p.spells = p.spells || {}; if (!SPELLS[k] || p.spells[k]) return; p.spells[k] = true; setTimeout(() => G.say(why + ' <b>' + SPELLS[k].icon + ' ' + SPELLS[k].name.toUpperCase() + '</b> is yours!', 5), 1200); G.save(); }
  return { hurtMon: (m, d) => G.hurtMon(m, d), cast, update, teach, COMBOS, get cd() { return cd; } };
}

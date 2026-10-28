// ---------- the Kraken and the Great Squid, ACTION version (v1.10.0, Sean's design) ----------
// The ship is held still and the camera moves to the ballista on the bow. The legend is made of parts (its tentacles and
// its eyes), each with a health bar; the eyes are shielded until half the tentacles are cut. Tap a part's marker to aim at
// it, then the raid's gunner game: tap the targets (accuracy) and stop the power needle (how hard). Every part down: it
// dies. Its special moves: a tentacle comes crashing down on the deck (mash FIRE to cut it before it lands, or take the
// hit), and sometimes it grabs the ship in a tentacle, smashes it on the sea twice and flings it to a new spot round its
// body. CLASSIC keeps the old, easier fight.
import * as THREE from 'three';
import { ballistaHud } from './ballista.js';
import { HALF } from './world.js';

export function createLegendGame(G) {
  let L = null, el = null; const V3 = new THREE.Vector3(), KCAM = { h: 4.4, w: 7, fill: 0.62, cap: 2, up: 0.12, lk: 0.12 };
  const atk = () => G.attack();
  // the world position of a part: a tentacle (a point along its arm) or an eye
  function partPos(p, out = V3) { const m = L.mon.m; if (p.kind === 'arm') { const A = m.arms[p.i], k = Math.min(A.pts.length - 1, Math.round(A.pts.length * 0.55)); return m.body.localToWorld(out.copy(A.pts[k])); } return m.head.localToWorld(out.copy(m.eyes[p.i])); }
  function start(Lg, mon) { L = Lg; L.mon = mon; G.gore.heal(mon.m); for (const A of mon.m.arms) { A.dead = false; A.tb.mesh.visible = true; if (A.club) A.club.visible = true; } const m = mon.m, squid = mon.type === 'squid', arms = m.arms.map((A, i) => i).filter((i) => (squid ? i >= 4 : true)), nArm = arms.length, armHp = mon.maxHp * (squid ? 0.1 : 0.08), eyeHp = (mon.maxHp - armHp * nArm) / 2;
    L.parts = arms.map((i, n) => ({ id: 'a' + i, kind: 'arm', i, name: (squid && i >= 8 ? 'Club tentacle ' : 'Tentacle ') + (n + 1), hp: armHp, max: armHp, dead: false })).concat([0, 1].map((i) => ({ id: 'e' + i, kind: 'eye', i, name: (i ? 'Right' : 'Left') + ' eye', hp: eyeHp, max: eyeHp, dead: false })));
    L.phase = 'pick'; L.sel = null; L.specialT = 8; { const b = G.boat, d0 = mon.size * 0.95, a = Math.atan2(mon.x - b.x, mon.z - b.z); mon.x = b.x + Math.sin(a) * d0; mon.z = b.z + Math.cos(a) * d0; b.yaw = a; mon.yaw = a + Math.PI; } L.t = 0; L.slam = null; L.toss = null;
    el = document.getElementById('legGame') || (() => { const d = document.createElement('div'); d.id = 'legGame'; document.body.appendChild(d); return d; })(); el.classList.remove('hidden'); document.body.classList.add('legGameOn'); ballistaHud.show(true); G.shipVisible(false); G.hideLair(mon, true); paint(); G.say('🎯 Tap a tentacle to aim the ballista at it. The eyes are shielded until half its tentacles are cut.', 5); }
  const eyesOpen = () => L.parts.filter((p) => p.kind === 'arm' && p.dead).length >= Math.ceil(L.parts.filter((p) => p.kind === 'arm').length / 2);
  const live = () => L.parts.filter((p) => !p.dead);
  function paint() { if (!el || !L) return; const tot = L.parts.reduce((s, p) => s + Math.max(0, p.hp), 0), max = L.parts.reduce((s, p) => s + p.max, 0);
    el.innerHTML = '<button class="ghost lgPause" id="lgPause" aria-label="Pause">⏸</button><button class="ghost lgFlee" id="lgFlee">FLEE</button><div class="lgHead"><b>' + L.mon.name + '</b><div class="lgTot"><i style="width:' + (tot / max) * 100 + '%"></i></div></div><div class="bgBars lgBars">' + L.parts.map((p) => '<div class="bgBar' + (p.dead ? ' dead' : '') + (L.sel === p ? ' sel' : '') + '"><span>' + (p.kind === 'eye' ? (eyesOpen() ? '👁 ' : '🛡 ') : '🐙 ') + p.name + '</span><i style="width:' + Math.max(0, (p.hp / p.max) * 100) + '%"></i></div>').join('') + '</div><div class="lgMarks" id="lgMarks"></div><div class="bgField" id="lgField"></div><div class="bgMsg" id="lgMsg"></div>'; el.querySelector('#lgPause').onclick = (e) => { e.stopPropagation(); interrupt(); G.pause(); }; el.querySelector('#lgFlee').onclick = (e) => { e.stopPropagation(); if (L && !L.toss) G.endLegend('flee'); }; marks(); }
  // pausing mid-aim drops the half-made shot (the targets run on real time); a falling tentacle or a toss just waits
  function interrupt() { if (L && (L.phase === 'aim' || L.phase === 'power')) { L.aimId = (L.aimId || 0) + 1; L.phase = 'pick'; L.sel = null; paint(); } }
  function marks() { const box = el.querySelector('#lgMarks'); if (!box) return; box.innerHTML = ''; if (L.phase !== 'pick') return; for (const p of live()) { if (p.kind === 'eye' && !eyesOpen()) continue; const b = document.createElement('button'); b.className = 'lgMark' + (p.kind === 'eye' ? ' eye' : ''); b.dataset.id = p.id; b.innerHTML = '<i style="height:' + (p.hp / p.max) * 100 + '%"></i>'; b.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); pick(p); }; box.appendChild(b); } placeMarks(); msg('🎯 Tap a ' + (eyesOpen() ? 'tentacle or an EYE' : 'tentacle') + ' to aim at it'); }
  function placeMarks() { if (!el) return; el.querySelectorAll('.lgMark').forEach((b) => { const p = L.parts.find((q) => q.id === b.dataset.id); const s = p && G.toScreen(...partPos(p).toArray()); if (!s) { b.style.display = 'none'; return; } b.style.display = ''; b.style.left = s[0] + 'px'; b.style.top = s[1] + 'px'; }); }
  const msg = (t) => { const m = el && el.querySelector('#lgMsg'); if (m) m.textContent = t; };
  // ---------- aim and power, as in the raid ----------
  function pick(p) { if (L.phase !== 'pick' || p.dead) return; const aid = L.aimId = (L.aimId || 0) + 1; L.sel = p; L.phase = 'aim'; L.count = Math.max(3, Math.min(7, 3 + Math.floor(L.mon.lv * 0.6))); L.shown = 0; L.hits = 0; paint(); msg('🎯 AIM at the ' + p.name.toLowerCase() + ': tap the targets (' + L.count + ')'); const f = el.querySelector('#lgField'), life = Math.max(0.7, 1.25 - L.mon.lv * 0.06);
    for (let i = 0; i < L.count; i++) setTimeout(() => { if (!L || L.phase !== 'aim' || L.aimId !== aid) return; const c = document.createElement('button'); c.className = 'bgTarget'; c.style.left = (14 + Math.random() * 72) + '%'; c.style.top = (20 + Math.random() * 55) + '%'; c.style.animationDuration = life + 's'; f.appendChild(c); L.shown++;
      c.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if (c.dataset.done) return; c.dataset.done = 1; L.hits++; ballistaHud.aim(e.clientX); c.classList.add('hit'); G.sfx.hit(); setTimeout(() => c.remove(), 200); }; setTimeout(() => { if (!c.dataset.done) { c.dataset.done = 1; c.classList.add('miss'); setTimeout(() => c.remove(), 200); } if (L && L.phase === 'aim' && L.aimId === aid && i === L.count - 1) setTimeout(() => { if (L && L.aimId === aid) power(); }, 400); }, life * 1000); }, 300 + i * 480); }
  function power() { if (!L || L.phase !== 'aim') return; L.phase = 'power'; L.pt = 0; const f = el.querySelector('#lgField'); f.innerHTML = '<div class="bgPower"><div class="zone ok"></div><div class="zone sweet"></div><i id="lgNeedle"></i></div><button class="bgStrike" id="lgStrike">🏹 LOOSE!</button>'; msg('💪 POWER: stop the needle in the green (' + L.hits + ' of ' + L.count + ' on target)'); f.querySelector('#lgStrike').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); loose(); }; }
  function loose() { if (!L || L.phase !== 'power') return; ballistaHud.fire(); const x = L.needle || 0, k = x > 0.68 && x < 0.82 ? 1.5 : x > 0.5 && x < 0.92 ? 1 : 0.5, acc = L.hits / L.count, p = L.sel, d = atk() * 2 * (0.25 + acc) * k * (p.kind === 'eye' ? 1.3 : 1); L.phase = 'fire';
    msg((k > 1.2 ? '💥 PERFECT POWER! ' : k > 0.8 ? '💥 Good shot. ' : '💨 Weak shot. ') + Math.round(acc * 100) + '% on target'); const b = G.boat, from = { x: b.x + Math.sin(b.yaw) * G.T().L * 0.4, y: b.y + 2.6, z: b.z + Math.cos(b.yaw) * G.T().L * 0.4 }, to = partPos(p).clone();
    G.launch(from, { x: to.x, y: to.y, z: to.z }, 'bolt', () => { if (!L) return; hurt(p, d); }); G.sfx.throw && G.sfx.throw(); setTimeout(() => { if (L && L.phase === 'fire') { L.phase = 'pick'; L.sel = null; paint(); } }, 1300); }
  function hurt(p, d) { const pos = partPos(p).clone(); p.hp -= d; G.pop(pos.x, pos.y + 2, pos.z, '−' + Math.round(d), p.kind === 'eye' ? '#7dff3a' : '#ffd24a'); G.splash(pos.x, pos.z, 1.5); L.mon.stState.hurt = 1;
    if (p.hp <= 0 && !p.dead) { p.dead = true; p.hp = 0; const goo = G.gooColor(L.mon), R = L.mon.size / 6, alive = () => !!L; G.explode(pos.x, pos.y, pos.z, p.kind === 'eye' ? 1.4 : 1.1, goo);
      // v1.15.2: the arm breaks off at the shot (half way) and falls into the sea, goo pouring from the stump; an eye pops
      if (p.kind === 'arm') { const A = L.mon.m.arms[p.i]; A.dead = true; A.cut = Math.max(2, Math.round((A.pts.length - 1) * 0.5)); G.gore.sever(goo, L.mon.m, A, R, alive); if (A.club) A.club.visible = false; G.say('🐙 ' + p.name + ' severed!' + (eyesOpen() && !L.eyesSaid ? ' Its eyes are open to you now!' : ''), 2.5); if (eyesOpen()) L.eyesSaid = true; } else { G.gore.popEye(goo, L.mon.m, p.i, R * 0.6, R, alive); G.say('👁 An eye is put out!', 2.5); } }
    L.mon.hp = L.parts.reduce((s, q) => s + Math.max(0, q.hp), 0); paint(); if (!live().length) { L.mon.hp = 0; finish(); } }
  function finish() { clear(); G.endLegend('win'); }
  // ---------- special moves ----------
  function special() { const arms = live().filter((p) => p.kind === 'arm'); if (L.phase === 'aim' || L.phase === 'power') { L.specialT = 2; return; } const r = Math.random(); if (arms.length && (r < 0.65 || L.lastSpecial === 'toss')) { L.lastSpecial = 'slam'; slam(arms[(Math.random() * arms.length) | 0]); } else { L.lastSpecial = 'toss'; toss(); } }
  function slam(p) { L.phase = 'slam'; const need = 7 + Math.min(7, Math.round(L.mon.lv)); L.slam = { p, need, n: 0, t: 0, dur: 2.6 }; G.warn('🐙 A TENTACLE RISES OVER YOUR DECK! MASH FIRE!', 2.6); G.sfx.groan && G.sfx.groan(); const f = el.querySelector('#lgField'); el.querySelector('#lgMarks').innerHTML = '';
    f.innerHTML = '<div class="lgSlam"><b>🐙 CUT IT DOWN!</b><div class="lgSlamBar"><i id="lgSlamI"></i></div><span id="lgSlamN">0 / ' + need + '</span></div><button class="bgStrike mash" id="lgMash">🪓 FIRE!</button>'; f.querySelector('#lgMash').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); mash(); }; }
  function mash() { const S = L && L.slam; if (!S) return; S.n++; G.sfx.hit(); const n = el.querySelector('#lgSlamN'); if (n) n.textContent = S.n + ' / ' + S.need; if (S.n >= S.need) { L.slam = null; hurt(S.p, S.p.max * 0.35); if (!L) return; G.say('🪓 You hack it back before it lands!', 2.5); L.phase = 'pick'; L.sel = null; paint(); } }
  // the grab (v1.10.4, Sean: slower, and let us watch it): the camera backs slowly out to the side; a tentacle reaches out and
  // coils round the ship, lifts it, smashes it down on the sea twice, winds up and flings it spinning to a new spot round the
  // legend, as a sea tornado throws ships; then the camera eases back to the ballista. The ship's own update calls held(), so
  // the ship and the arm holding it move together.
  function toss() { const b = G.boat, mon = L.mon, R = mon.size / 6, a0 = Math.atan2(b.x - mon.x, b.z - mon.z), d = Math.hypot(b.x - mon.x, b.z - mon.z), da = 0.9 + Math.random() * 0.8;
    let A = null, best = -9; for (const q of mon.m.arms) { if (q.dead) continue; const s = Math.cos(q.a0) - (q.long ? 0.6 : 0); if (s > best) { best = s; A = q; } } if (!A) { L.specialT = 4; return; } // the live arm nearest the ship (not the squid's club arms: a club is bigger than the ship)
    // it lands round the legend, inside the world, on the side with open water round it (land beside the ship would block the
    // view), else back where it was
    const s0 = Math.random() < 0.5 ? -1 : 1, spot = (a) => [mon.x + Math.sin(a) * d, mon.z + Math.cos(a) * d], wet = (a, r) => { const [x, z] = spot(a); return Math.abs(x) < HALF - 25 && Math.abs(z) < HALF - 25 && !G.world().blockAt(x, z, r); }, opts = [a0 + s0 * da, a0 - s0 * da], a1 = opts.find((a) => wet(a, 30)) ?? opts.find((a) => wet(a, 8)) ?? a0, sg = Math.sign(a1 - a0) || s0; const [x1, z1] = spot(a1), ox = Math.sin(a0) + Math.sin(a1), oz = Math.cos(a0) + Math.cos(a1), ol = Math.hypot(ox, oz) || 1;
    L.phase = 'toss'; L.sel = null; L.toss = { t: 0, A, R, a0, d, sg, x1, z1, ox: ox / ol, oz: oz / ol, w: 0, look: null, shown: false, hits: 0, yaw0: b.yaw }; A.grip = { p: new THREE.Vector3(), up: new THREE.Vector3(), ax: new THREE.Vector3(), r: 1, len: 1, lift: R, k: 0 }; b.held = held;
    // while it holds the ship the arm tapers to a whip, its coil no thicker than the hull (a legend's arm tip is thicker than a ship)
    const r0 = L.toss.r0 = A.tb.r, cap = G.T().B * 0.42; A.tb.r = (s) => { const base = r0(s), k = A.grip ? A.grip.k : 0; return k > 0 ? lerp(base, Math.min(base, cap), sm((s - 0.25) / 0.45) * k) : base; };
    el.querySelector('#lgMarks').innerHTML = ''; el.querySelector('#lgField').innerHTML = ''; msg(''); G.warn('🐙 A TENTACLE REACHES FOR YOUR SHIP!', 2.5); G.sfx.groan && G.sfx.groan(); }
  const sm = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }, lerp = (a, c, u) => a + (c - a) * u, turn = (a, c) => Math.atan2(Math.sin(a - c), Math.cos(a - c));
  const Q = new THREE.Quaternion(), EU = new THREE.Euler(), UP = new THREE.Vector3(), FW = new THREE.Vector3(), TW = new THREE.Vector3(), TV = new THREE.Vector3(), CP = new THREE.Vector3(), CL = new THREE.Vector3();
  function smash(k, why) { const b = G.boat; G.splash(b.x, b.z, 3); G.splash(b.x + (Math.random() - 0.5) * 5, b.z + (Math.random() - 0.5) * 5, 2); G.shake(1.2); G.sfx.boom && G.sfx.boom(); G.sfx.splash && G.sfx.splash(); G.damage(L.mon.dmg * k * (1 - G.defense()), why); }
  // the timeline (seconds): 0 the arm reaches, 1.8 it has the ship and lifts it, 3.4 and 5.4 it smashes it down, 6.0 it winds
  // up, 7.2 it lets go, 9.4 the ship lands, 9.8 to 10.8 the camera goes back to the bow. True while it places the ship itself
  function held(dt) { const T = L && L.toss, b = G.boat; if (!T) { b.held = null; return false; } const mon = L.mon, R = T.R; T.t += dt; const t = T.t, ez = Math.min(1, dt * 4);
    T.w = t < 2.4 ? sm(t / 2.4) : t < 9.8 ? 1 : 1 - sm((t - 9.8) / 1.0);
    const vis = T.w > 0.15; if (vis !== T.shown) { T.shown = vis; G.shipVisible(vis); ballistaHud.show(!vis); }
    const H1 = R * 0.9 + 8, H2 = R * 1.1 + 8, H3 = R * 1.5 + 10, din = T.d * 0.72, back = T.a0 - T.sg * 0.35;
    let mine = true, k = 1, h = 0, ang = T.a0, dist = din;
    if (t < 1.8) { mine = false; k = sm((t - 0.3) / 1.5); }
    else if (t < 3.4) { if (!T.hits) { T.hits = 1; G.warn('🐙 IT HAS YOUR SHIP!', 2.2); G.sfx.creak && G.sfx.creak(); G.shake(0.6); G.splash(b.x, b.z, 2); } const u = sm((t - 1.8) / 1.6); h = H1 * u; dist = lerp(T.d, din, u); }
    else if (t < 4.0) { const u = (t - 3.4) / 0.6; h = H1 * (1 - u * u); }
    else if (t < 5.4) { if (T.hits < 2) { T.hits = 2; smash(0.18, '🐙 It smashes your ship down on the sea!'); if (!L) return true; } h = H2 * sm((t - 4.0) / 1.4); }
    else if (t < 6.0) { const u = (t - 5.4) / 0.6; h = H2 * (1 - u * u); }
    else if (t < 7.2) { if (T.hits < 3) { T.hits = 3; smash(0.18, '🐙 …and again!'); if (!L) return true; } const u = sm((t - 6.0) / 1.2); h = H3 * u; ang = lerp(T.a0, back, u); }
    else if (t < 9.4) { if (T.hits < 4) { T.hits = 4; G.warn('🌪 IT FLINGS YOU AWAY!', 2.2); G.sfx.whoosh && G.sfx.whoosh(); } const u = (t - 7.2) / 2.2, xr = mon.x + Math.sin(back) * din, zr = mon.z + Math.cos(back) * din; k = 1 - sm((t - 7.2) / 0.5);
      b.x = lerp(xr, T.x1, u); b.z = lerp(zr, T.z1, u); b.y = G.seaY(b.x, b.z) + H3 * (1 - u) * (1 - u * 0.3) + Math.sin(u * Math.PI) * R * 1.2; b.yaw += dt * 9 * (1 - u * 0.75); b.pitch += (Math.sin(t * 5) * 0.4 * (1 - u) - b.pitch) * ez; b.roll += (Math.cos(t * 4) * 0.6 * (1 - u) - b.roll) * ez; }
    else { mine = false; k = 0; if (T.hits < 5) { T.hits = 5; b.x = T.x1; b.z = T.z1; smash(0.3, 'You crash back into the sea!'); if (!L) return false; } b.yaw += turn(Math.atan2(mon.x - b.x, mon.z - b.z), b.yaw) * Math.min(1, dt * 3); if (t >= 10.8) { done(); return false; } }
    if (t >= 1.8 && t < 7.2) { b.x = mon.x + Math.sin(ang) * dist; b.z = mon.z + Math.cos(ang) * dist; b.y = G.seaY(b.x, b.z) + h; b.yaw += turn(T.yaw0 + Math.sin(t * 1.3) * 0.35, b.yaw) * ez; b.pitch += (Math.sin(t * 1.7) * 0.3 - b.pitch) * ez; b.roll += (Math.sin(t * 1.1 + 0.5) * 0.45 - b.roll) * ez; }
    b.v = 0;
    // the camera: it aims at the ship (the legend a little beyond it) from out behind it, away from the legend and a little toward
    // where the ship will land; only its position eases after the ship, so the ship stays in view however hard it is yanked
    const fast = t > 7.2 && t < 9.6, rx = b.x - mon.x, rz = b.z - mon.z, rl = Math.hypot(rx, rz) || 1, L0 = G.T().L, D = L0 * 2 + 30; TV.set((rx / rl) * 0.75 + T.ox * 0.25, 0, (rz / rl) * 0.75 + T.oz * 0.25).normalize();
    if (!T.look) { T.look = new THREE.Vector3(); T.dir = TV.clone(); T.cam = null; } else T.dir.lerp(TV, Math.min(1, dt * (fast ? 3 : 2))).normalize(); T.look.set(lerp(b.x, mon.x, 0.12), b.y + 1, lerp(b.z, mon.z, 0.12));
    TW.set(T.look.x + T.dir.x * D, Math.max(4, T.look.y + L0 * 0.3 + 8), T.look.z + T.dir.z * D); if (!T.cam) T.cam = TW.clone(); else T.cam.lerp(TW, Math.min(1, dt * (fast ? 4 : 2.5)));
    // the arm's grip: the ship's waist and axes, in the legend's body space
    const Gp = T.A.grip; if (Gp) { Gp.k = k; if (k > 0) { const body = mon.m.body; body.updateWorldMatrix(true, false); Q.setFromEuler(EU.set(-(b.pitch || 0), b.yaw, b.roll || 0, 'YXZ')); UP.set(0, 1, 0).applyQuaternion(Q); FW.set(0, 0, 1).applyQuaternion(Q); TW.set(b.x, b.y + 1, b.z);
      Gp.p.copy(body.worldToLocal(TV.copy(TW))); Gp.up.copy(body.worldToLocal(TV.copy(TW).add(UP))).sub(Gp.p); const s = Gp.up.length() || 1; Gp.up.divideScalar(s); Gp.ax.copy(body.worldToLocal(TV.copy(TW).add(FW))).sub(Gp.p).normalize(); Gp.r = G.T().B * 0.5 * s; Gp.len = G.T().L * s; Gp.lift = R * s; } }
    return mine; }
  function done() { const T = L.toss, b = G.boat; if (T.A) { T.A.grip = null; T.A.tb.r = T.r0; } L.toss = null; b.held = null; G.shipVisible(false); ballistaHud.show(true); b.yaw = Math.atan2(L.mon.x - b.x, L.mon.z - b.z); L.phase = 'pick'; L.sel = null; paint(); G.say('🎯 A new angle: aim at what you can see.', 2.5); }
  // ---------- each frame ----------
  function update(dt) { if (!L) return; const b = G.boat, mon = L.mon; if (mon.dead || mon.hp <= 0) { finish(); return; } L.t += dt; b.v = 0; ballistaHud.update(dt); if (L.phase === 'pick' || L.phase === 'fire') { const s = L.sel && !L.sel.dead ? G.toScreen(...partPos(L.sel).toArray()) : null; ballistaHud.aim(s ? s[0] : innerWidth / 2); } const fb = document.getElementById('broad'); if (fb) fb.style.display = 'none';
    if (L.phase === 'power') { const sp = 1.1 + mon.lv * 0.15; L.pt += dt; L.needle = (Math.sin(L.pt * sp * Math.PI) + 1) / 2; const n = el.querySelector('#lgNeedle'); if (n) n.style.left = L.needle * 100 + '%'; }
    if (L.phase === 'pick') placeMarks();
    if (L.slam) { const S = L.slam; S.t += dt; const i = el.querySelector('#lgSlamI'); if (i) i.style.width = Math.max(0, 1 - S.t / S.dur) * 100 + '%'; mon.stState.attack = Math.min(1, S.t / S.dur * 1.5);
      if (S.t >= S.dur) { L.slam = null; G.damage(mon.dmg * 1.4 * (1 - G.defense()), 'The tentacle crashes across your deck!'); if (!L) return; G.shake(1.2); G.splash(b.x, b.z, 3); L.phase = 'pick'; L.sel = null; paint(); } }
    if (L.phase === 'pick') { L.specialT -= dt * (mon.hp < mon.maxHp * 0.5 ? 1.5 : 1); if (L.specialT <= 0) { L.specialT = 9 + Math.random() * 5; special(); } } }
  // the ballista's view: on the bow, looking at the chosen part (or the legend's head); in a toss it eases out to the watch,
  // out behind the ship, the legend looming beyond it, and back again
  // the gunner's view (v1.15.0, Sean: too close to see what you shoot at): back from the bow and a little up, far enough that
  // the beast (K.h x R high, K.w x R wide) fits above the ballista; a tall phone stands back further (and sees wide-angle)
  function bowCam(pos, look, cam) { const b = G.boat, t = G.T(), R = L.mon.size / 6, hx = L.mon.x, hz = L.mon.z, mid = L.sel && !L.sel.dead ? partPos(L.sel) : V3.set(hx, R * 1.6, hz), f = t.L * 0.35 + 3;
    const K = KCAM, tv = Math.tan(((cam ? cam.fov : 50) * Math.PI) / 360), asp = cam ? cam.aspect : 2, dH = (R * K.h) / (2 * tv * K.fill), need = Math.min(Math.max(dH, (R * K.w) / (2 * tv * asp)), dH * K.cap);
    const [back, a] = camBack(b, Math.max(0, need - (Math.hypot(hx - b.x, hz - b.z) - f))), yy = b.yaw + Math.PI + a;
    pos.set(b.x + Math.sin(b.yaw) * f + Math.sin(yy) * back, b.y + t.rise + 4 + back * K.up, b.z + Math.cos(b.yaw) * f + Math.cos(yy) * back); look.set(mid.x * 0.5 + hx * 0.5, Math.max(R * 1.2, mid.y * 0.6) + back * K.lk, mid.z * 0.5 + hz * 0.5); }
  // where it stands back: straight back along the deck if that water is clear, else a little to one side; never into land (an
  // island or rocks behind the ship would fill the view). Worked out again only when the ship moves
  function camBack(b, want) { const key = Math.round(b.x) + ',' + Math.round(b.z) + ',' + b.yaw.toFixed(2) + ',' + Math.round(want); if (L.camKey === key) return L.camBest; const W = G.world(); let best = [0, 0];
    for (const a of [0, 0.3, -0.3, 0.6, -0.6]) { const yy = b.yaw + Math.PI + a; let ok = want; for (let s = 6; s < want + 10; s += 6) if (W.blockAt(b.x + Math.sin(yy) * s, b.z + Math.cos(yy) * s, 6)) { ok = Math.max(0, s - 10); break; } if (ok > best[0] + 1) best = [ok, a]; if (ok >= want) break; }
    L.camKey = key; return (L.camBest = best); }
  function camHook(cam) { if (!L) return; bowCam(CP, CL, cam); const T = L.toss;
    if (T && T.cam && T.w > 0) { CP.lerp(T.cam, T.w); CL.lerp(T.look, T.w); }
    cam.position.copy(CP); cam.lookAt(CL); }
  function clear() { if (L && L.toss && L.toss.A) { L.toss.A.grip = null; L.toss.A.tb.r = L.toss.r0; } G.boat.held = null; ballistaHud.show(false); G.shipVisible(true); if (L) G.hideLair(L.mon, false); if (el) el.classList.add('hidden'); document.body.classList.remove('legGameOn'); L = null; }
  return { interrupt, start, update, camHook, clear, mash, hurt, get active() { return !!L; }, get L() { return L; } };
}

// Valhalla's Tide mini-games, drawn as an overlay over the live 3D scene.
//  BATTLE (monsters and enemy ships): your volley (a marker sweeps a bar; tap FIRE on the weak spot: CRITICAL, HIT,
//    GRAZE or MISS; fire pots hit hard), then the foe's attacks (it winds up from one side: swipe or tap the way it shows
//    to dodge, or raise shields to block half). Flee any time. Lightning (Thor's Fury) doubles damage and widens the weak spot.
//  FISHING: cast (stop the power meter in the gold band), then reel (hold REEL to lift the net box and keep the fish in it
//    until the catch bar fills). Sometimes something big takes the line.
//  SALVAGE: haul the wreck's rope with alternating left / right pulls; pull too fast and it snaps.
//  BOARDING (inside a ship battle, with grappling hooks, once her hull is below 40%): throw the hooks onto her rail (two
//    must hold), then the crew clash: strike where their guard opens; lose too many and you are repelled.
//  DIG: the landing party digs on a treasure island's beach using the map's clue; each hole says hot, warm or cold.
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createMinis({ sfx, hooks }) {
  const root = $('mini'); let cur = null;
  function open(cls) { root.className = cls; root.innerHTML = ''; root.classList.remove('hidden'); }
  const keyOf = (e) => (e.key === ' ' ? ' ' : e.key.toLowerCase()), typing = (e) => /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '');
  addEventListener('keydown', (e) => { if (cur && cur.key && !typing(e) && !(hooks.paused && hooks.paused()) && cur.key(keyOf(e), true, e.repeat)) e.preventDefault(); });
  addEventListener('keyup', (e) => { if (cur && cur.key && !typing(e) && cur.key(keyOf(e), false)) e.preventDefault(); });
  function close() { root.className = 'hidden'; root.innerHTML = ''; cur = null; }
  const banner = (txt, color = '#ffd24a') => { const b = el('div', 'mgBanner', txt); b.style.color = color; root.appendChild(b); setTimeout(() => b.remove(), 1100); };

  // ---------- battle ----------
  function battle(o, done) {
    open('battle'); const foe = o.foe, you = o.you; const S = { phase: 'intro', t: 0, shots: 0, maxShots: you.shots || 3, mark: 0, dir: 1, zone: 0.5, attacks: 0, maxAtk: 1, prompt: null, fire: you.fire || 0, ended: false, taken: 0 };
    const top = el('div', 'mgTop'); top.innerHTML = `<div class="hpRow"><b>${o.youName}</b><div class="hp you"><i id="mgYouHp"></i></div><span id="mgYouTxt"></span></div><div class="vs">⚔</div><div class="hpRow"><b>${foe.name} <small>Lv ${foe.lvShow ?? foe.lv}</small></b><div class="hp foe"><i id="mgFoeHp"></i></div><span id="mgFoeTxt"></span></div>`; root.appendChild(top);
    const stage = el('div', 'mgStage'); root.appendChild(stage); const btns = el('div', 'mgBtns'); root.appendChild(btns);
    // cues sit just under the fight itself (the battle camera puts it in the top part of the screen), so your eyes stay on
    // the action; the buttons stay at the bottom under your thumbs
    const cue = el('div', 'mgCue'); root.appendChild(cue); const side = el('div', 'mgSide'); root.appendChild(side);
    const flee = el('button', 'ghost mgFlee', 'FLEE'); flee.onclick = () => end('flee'); root.appendChild(flee);
    const hpDraw = () => { $('mgYouHp').style.width = clamp(you.hp / you.maxHp, 0, 1) * 100 + '%'; $('mgFoeHp').style.width = clamp(foe.hp / foe.maxHp, 0, 1) * 100 + '%'; $('mgYouTxt').textContent = Math.ceil(Math.max(0, you.hp)) + ' / ' + Math.round(you.maxHp); $('mgFoeTxt').textContent = Math.ceil(Math.max(0, foe.hp)) + ' / ' + Math.round(foe.maxHp); };
    hpDraw(); banner(o.intro || (foe.naval ? 'SHIP BATTLE!' : 'BATTLE!'), '#ff6a3a'); sfx.horn && sfx.horn();
    function aimUI() { stage.innerHTML = ''; btns.innerHTML = ''; side.className = 'mgSide'; S.zone = 0.18 + Math.random() * 0.64; S.mark = Math.random(); S.dir = Math.random() < 0.5 ? 1 : -1;
      const zw = clamp((you.zone || 0.16) * (you.thor ? 1.5 : 1), 0.08, 0.5);
      cue.innerHTML = `<div class="mgHint">${foe.naval ? 'Aim at their hull' : 'Aim for the weak spot'} · shot ${S.shots + 1} of ${S.maxShots}</div><div class="track" id="mgTrack"><div class="zone" id="mgZone"></div><div class="zone crit" id="mgCrit"></div><div class="needle" id="mgNeedle"></div></div>`;
      const z = $('mgZone'), c = $('mgCrit'); z.style.left = (S.zone - zw / 2) * 100 + '%'; z.style.width = zw * 100 + '%'; c.style.left = (S.zone - zw * 0.17) * 100 + '%'; c.style.width = zw * 34 + '%'; S.zw = zw;
      const fb = el('button', 'mgBig', you.weapon || 'FIRE'); fb.onclick = shoot; btns.appendChild(fb); $('mgTrack').onpointerdown = (e) => { e.preventDefault(); shoot(); };
      if (S.fire > 0 && !S.potVolley) { const fp = el('button', 'mgFire', '🔥 FIRE POT ×' + S.fire); fp.onclick = firePot; btns.appendChild(fp); }
      if (foe.naval && foe.boardBlock !== undefined && !S.repelled) { if (foe.hp / foe.maxHp <= 0.4) { const b = el('button', 'mgBoard' + (foe.boardBlock ? ' off' : ''), foe.boardBlock ? '🪝 ' + foe.boardBlock : '🪝 BOARD HER'); b.onclick = () => { if (S.phase !== 'aim') return; if (foe.boardBlock) { banner(foe.boardBlock, '#c8c8c8'); return; } boardStart(); }; btns.appendChild(b); }
        else if ((you.hooks || 0) > 0) cue.insertAdjacentHTML('beforeend', '<div class="mgHint">🪝 Bring her hull below 40% to board</div>'); } }
    function dmgRoll(mult) { return Math.max(1, Math.round(you.atk * mult * (you.thor ? 2 : 1) * (0.85 + Math.random() * 0.3))); }
    function shoot() { if (S.phase !== 'aim') return; const d = Math.abs(S.mark - S.zone) / (S.zw / 2); let mult, txt, col;
      if (d < 0.34) { mult = 2; txt = 'CRITICAL!'; col = '#ffd24a'; } else if (d < 1) { mult = 1; txt = 'HIT'; col = '#ffffff'; } else if (d < 2) { mult = 0.4; txt = 'GRAZE'; col = '#c8c8c8'; } else { mult = 0; txt = 'MISS'; col = '#8a9aa8'; }
      const dmg = mult ? dmgRoll(mult) : 0; foe.hp -= dmg; hooks.shoot(mult, dmg, txt); banner(txt + (dmg ? ' −' + dmg : ''), col); (mult >= 1 ? sfx.hit : sfx.throw)(); hpDraw(); S.shots++; S.phase = 'shotFx'; S.t = 0; }
    function firePot() { if (S.phase !== 'aim' || S.fire <= 0 || S.potVolley) return; S.potVolley = true; S.fire--; you.fireUsed = (you.fireUsed || 0) + 1; const k = you.potK || 2.6, dmg = dmgRoll(k); foe.hp -= dmg; hooks.shoot(k, dmg, 'FIRE', true); banner('🔥 BURN −' + dmg, '#ff8a2a'); sfx.boom(); hpDraw(); S.shots++; S.phase = 'shotFx'; S.t = 0; }
    const DIRS = { L: '⬅', R: '➡', U: '⬆' };
    // special moves: an octopus may wrap its arms round your hull, a serpent coil round your ship; hack at it fast to break
    // free (tap, Space or any dodge key), or it drags you under / crushes you for 1.4 x a hit. Helheim's undead have their
    // own: a burning crab or eel sets the deck ablaze (douse it), an undead shark feeds on you and heals by what it takes
    const SPECIAL = { grab: ['wraps its arms round your hull!', '🐙 BREAK FREE!', '🪓 HACK AT IT', 'DRAGGED UNDER −', 'BROKE FREE!'], coil: ['coils round your ship!', '🐍 BREAK ITS COILS!', '🪓 HACK AT IT', 'CRUSHED −', 'BROKE FREE!'],
      burn: ['sets your deck ablaze!', '🔥 DOUSE THE FLAMES!', '🪣 THROW WATER', 'BURNED −', 'DOUSED!'], drain: ["feeds on your crew's souls!", '👻 DRIVE IT OFF!', 'ᛉ RAISE THE WARD', 'IT FEEDS −', 'DRIVEN OFF!'] };
    function specialUI() { stage.innerHTML = ''; btns.innerHTML = ''; const sp = SPECIAL[foe.special] || SPECIAL.grab, need = 5 + Math.min(5, Math.round(foe.lv * 0.7));
      S.prompt = { d: 'G', t: 0, win: 2.8 * (you.thor ? 1.25 : 1), done: false, need, hits: 0 }; hooks.foeAct('U');
      cue.innerHTML = `<div class="mgWarn">${foe.name} ${sp[0]}</div><div class="mgPrompt">${sp[1]} <span id="mgHits">0 / ${need}</span></div><div class="timer"><i id="mgTimer"></i></div>`;
      const b = el('button', 'mgDir lit mgBreak', sp[2]); b.onpointerdown = (e) => { e.preventDefault(); breakTap(); }; btns.appendChild(b); sfx.hurt(); }
    function breakTap() { const P = S.prompt; if (S.phase !== 'defend' || !P || P.done || P.d !== 'G') return; P.hits++; const h = $('mgHits'); if (h) h.textContent = P.hits + ' / ' + P.need; sfx.hit(); if (P.hits >= P.need) answer('G'); }
    function defendUI() { if (foe.special && S.attacks === 0 && Math.random() < (foe.specialK || 0.22)) { specialUI(); return; } stage.innerHTML = ''; btns.innerHTML = ''; const naval = foe.naval; const opts = naval ? ['L', 'R', 'U'] : foe.moves || ['L', 'R', 'U']; const d = opts[(Math.random() * opts.length) | 0];
      const what = naval ? { L: 'Ram from port!', R: 'Ram from starboard!', U: 'Arrow volley!' }[d] : (foe.attackNames || { L: 'swings from the right', R: 'swings from the left', U: 'rears up to slam' })[d];
      const win = Math.max(0.55, (foe.boss ? 1.05 : 1.35) - foe.lv * 0.08) * (you.thor ? 1.25 : 1);
      S.prompt = { d, t: 0, win, done: false }; hooks.foeAct(d);
      cue.innerHTML = `<div class="mgWarn">${foe.name} ${what}</div><div class="mgPrompt">${d === 'U' ? '⬆ BRACE ⬆' : 'DODGE ' + DIRS[d]}</div><div class="timer"><i id="mgTimer"></i></div>`;
      if (d !== 'U') { side.className = 'mgSide on ' + d; side.textContent = DIRS[d]; }
      for (const k of ['L', 'U', 'R']) { const b = el('button', 'mgDir' + (k === d ? ' lit' : ''), k === 'U' ? '🛡' : DIRS[k]); b.onpointerdown = (e) => { e.preventDefault(); answer(k); }; btns.appendChild(b); } }
    function answer(k) { const P = S.prompt; if (S.phase !== 'defend' || !P || P.done) return; if (P.d === 'G' && k !== 'G' && k !== '-') { breakTap(); return; } P.done = true; side.className = 'mgSide';
      let dmg = foe.dmg * (1 - you.def) * (0.85 + Math.random() * 0.3);
      if (P.d === 'G') { if (k === 'G') { dmg = 0; banner((SPECIAL[foe.special] || SPECIAL.grab)[4], '#7dff3a'); sfx.pickup(); } else { dmg *= 1.4; banner((SPECIAL[foe.special] || SPECIAL.grab)[3] + Math.round(dmg) + (foe.special === 'drain' ? ' · IT HEALS' : ''), '#ff5a3a'); sfx.hurt(); if (foe.special === 'drain') foe.hp = Math.min(foe.maxHp, foe.hp + Math.round(dmg)); } }
      else if (k === P.d) { dmg = P.d === 'U' ? dmg * 0.25 : 0; banner(P.d === 'U' ? 'BRACED!' : 'DODGED!', '#7dff3a'); sfx.pickup(); }
      else if (k === 'U') { dmg *= 0.5; banner('BLOCKED −' + Math.round(dmg), '#9fd6ff'); sfx.hit(); }
      else { banner('HIT −' + Math.round(dmg), '#ff5a3a'); sfx.hurt(); }
      dmg = Math.round(dmg); if (dmg > 0) { you.hp -= dmg; S.taken += dmg; hooks.hurt(dmg); } hpDraw(); S.attacks++; S.phase = 'defFx'; S.t = 0; }
    // ---------- boarding ----------
    function boardStart() { S.phase = 'grapple'; S.throws = 2 + (you.hooks || 1); S.bit = 0; S.crewYou = S.crew0 = you.crew || 6; S.crewFoe = foe.crew || 6; S.mark = Math.random(); S.dir = 1; banner('GRAPPLES!', '#ffd24a'); sfx.throw(); grappleUI(); }
    function grappleUI() { btns.innerHTML = ''; side.className = 'mgSide'; const zw = 0.1 + (you.hooks || 1) * 0.03; S.gzw = zw; S.gz = zw / 2 + Math.random() * (1 - zw);
      cue.innerHTML = `<div class="mgHint">Throw the hooks onto her rail · ${S.bit} of 2 holding · ${S.throws} throws left</div><div class="track" id="mgTrack"><div class="zone" id="mgZone"></div><div class="needle" id="mgNeedle"></div></div>`;
      const z = $('mgZone'); z.style.left = (S.gz - zw / 2) * 100 + '%'; z.style.width = zw * 100 + '%';
      const b = el('button', 'mgBig', '🪝 THROW'); b.onclick = throwHook; btns.appendChild(b); $('mgTrack').onpointerdown = (e) => { e.preventDefault(); throwHook(); }; }
    function throwHook() { if (S.phase !== 'grapple') return; S.throws--; if (Math.abs(S.mark - S.gz) <= S.gzw / 2) { S.bit++; banner('HOOKED!', '#7dff3a'); sfx.hit(); }
      else { const dmg = Math.max(1, Math.round(foe.dmg * 0.25 * (1 - you.def))); you.hp -= dmg; S.taken += dmg; hooks.hurt(dmg); banner('MISSED · ARROWS −' + dmg, '#ff8a3a'); sfx.throw(); hpDraw(); }
      S.phase = 'grappleFx'; S.t = 0; }
    function clashUI() { btns.innerHTML = ''; const d = ['L', 'R', 'U'][(Math.random() * 3) | 0], what = { L: 'Their guard opens on the left!', R: 'Their guard opens on the right!', U: 'Leap the rail and strike high!' }[d];
      const win = Math.max(0.6, (foe.ghost ? 0.95 : 1.3) - foe.lv * 0.04 + (you.hooks || 1) * 0.04); S.prompt = { d, t: 0, win, done: false };
      cue.innerHTML = `<div class="mgHint">⚔ Your crew ${Math.max(0, S.crewYou)} · their ${foe.ghost ? 'draugr' : 'crew'} ${Math.max(0, S.crewFoe)}</div><div class="mgWarn">${what}</div><div class="mgPrompt">STRIKE ${DIRS[d]}</div><div class="timer"><i id="mgTimer"></i></div>`;
      if (d !== 'U') { side.className = 'mgSide on ' + d; side.textContent = DIRS[d]; } else side.className = 'mgSide';
      for (const k of ['L', 'U', 'R']) { const b = el('button', 'mgDir' + (k === d ? ' lit' : ''), DIRS[k]); b.onpointerdown = (e) => { e.preventDefault(); clash(k); }; btns.appendChild(b); } }
    function clash(k) { const P = S.prompt; if (S.phase !== 'clash' || !P || P.done) return; P.done = true; side.className = 'mgSide';
      if (k === P.d) { const n = Math.ceil(S.crewYou * 0.3 + 1); S.crewFoe -= n; banner('CUT DOWN ' + n + '!', '#7dff3a'); sfx.hit(); }
      else { const n = Math.ceil(S.crewFoe * 0.22 + 1), dmg = Math.round(you.maxHp * (foe.ghost ? 0.08 : 0.05)); S.crewYou -= n; you.hp -= dmg; S.taken += dmg; hooks.hurt(dmg); banner('−' + n + ' CREW · HULL −' + dmg, '#ff5a3a'); sfx.hurt(); hpDraw(); }
      S.phase = 'clashFx'; S.t = 0; }
    function repel(why) { S.repelled = true; const dmg = Math.round(you.maxHp * 0.12); you.hp -= dmg; S.taken += dmg; hooks.hurt(dmg); hpDraw(); if (foe.ghost) S.cursed = true;
      banner(why || (foe.ghost ? 'REPELLED · CURSED!' : 'REPELLED!'), '#ff5a3a'); sfx.boom(); btns.innerHTML = ''; cue.innerHTML = ''; S.phase = 'defFx'; S.t = 0; S.attacks = 0; S.maxAtk = 1; }
    function end(result) { if (S.ended) return; S.ended = true; if (result === 'flee') { const dmg = Math.round(foe.dmg * (1 - you.def) * 0.5); you.hp -= dmg; S.taken += dmg; hooks.hurt(dmg); }
      cue.innerHTML = ''; side.className = 'mgSide'; banner(result === 'boarded' ? 'SHE IS YOURS!' : result === 'win' ? (foe.naval ? 'SHIP TAKEN!' : 'SLAIN!') : result === 'flee' ? 'ESCAPED' : 'SINKING!', result === 'win' || result === 'boarded' ? '#7dff3a' : '#ff5a3a'); S.phase = 'over'; S.t = 0; S.result = result; }
    // swipes anywhere on the overlay answer a dodge
    let sw = null; root.onpointerdown = (e) => { sw = [e.clientX, e.clientY]; }; root.onpointerup = (e) => { if (!sw || (S.phase !== 'defend' && S.phase !== 'clash')) return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1]; sw = null; if (Math.hypot(dx, dy) < 40) return; (S.phase === 'clash' ? clash : answer)(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : 'U'); };
    // keys: Space = the main action (FIRE, THROW, or the middle block when dodging), A / D = left / right, W = the middle block too, F = fire pot, B = board
    function battleKey(k, down) { if (!down) return k === ' '; const L = k === 'a' || k === 'arrowleft', R = k === 'd' || k === 'arrowright', U = k === ' ' || k === 'w' || k === 'arrowup';
      if (S.phase === 'aim') { if (k === ' ') shoot(); else if (k === 'f') firePot(); else if (k === 'b') { const bb = root.querySelector('.mgBoard'); if (bb) bb.click(); } else return false; return true; }
      if (S.phase === 'grapple' && k === ' ') { throwHook(); return true; }
      if ((S.phase === 'defend' || S.phase === 'clash') && (L || R || U)) { (S.phase === 'clash' ? clash : answer)(L ? 'L' : R ? 'R' : 'U'); return true; }
      return k === ' '; }
    cur = { key: battleKey, update(dt) { S.t += dt;
      if (S.phase === 'intro' && S.t > (o.firstStrike === false ? 0.2 : 1.0)) { if (o.board) boardStart(); else if (o.firstStrike === false) { S.phase = 'defend'; S.maxAtk = foe.attacks || 1; S.attacks = 0; defendUI(); } else { S.phase = 'aim'; aimUI(); } }
      else if (S.phase === 'aim') { const sp = (0.75 + foe.lv * 0.1) * (foe.boss ? 1.25 : 1); S.mark += S.dir * sp * dt; if (S.mark > 1) { S.mark = 2 - S.mark; S.dir = -1; } if (S.mark < 0) { S.mark = -S.mark; S.dir = 1; } const n = $('mgNeedle'); if (n) n.style.left = S.mark * 100 + '%'; }
      else if (S.phase === 'shotFx' && S.t > 0.55) { if (foe.hp <= 0) end('win'); else if (S.shots >= S.maxShots) { S.shots = 0; S.potVolley = false; S.phase = 'defend'; S.maxAtk = foe.attacks || 1; S.attacks = 0; defendUI(); } else { S.phase = 'aim'; aimUI(); } }
      else if (S.phase === 'defend' && S.prompt) { S.prompt.t += dt; const k = 1 - S.prompt.t / S.prompt.win, tm = $('mgTimer'); if (tm) tm.style.width = clamp(k, 0, 1) * 100 + '%'; if (k <= 0 && !S.prompt.done) answer('-'); }
      else if (S.phase === 'defFx' && S.t > 0.6) { if (you.hp <= 0) end('sunk'); else if (S.attacks >= S.maxAtk) { S.phase = 'aim'; aimUI(); } else { S.phase = 'defend'; defendUI(); } }
      else if (S.phase === 'grapple') { const sp = 0.85 + foe.lv * 0.08; S.mark += S.dir * sp * dt; if (S.mark > 1) { S.mark = 2 - S.mark; S.dir = -1; } if (S.mark < 0) { S.mark = -S.mark; S.dir = 1; } const n = $('mgNeedle'); if (n) n.style.left = S.mark * 100 + '%'; }
      else if (S.phase === 'grappleFx' && S.t > 0.5) { if (you.hp <= 0) end('sunk'); else if (S.bit >= 2) { S.phase = 'clash'; banner('BOARD!', '#ffd24a'); sfx.horn && sfx.horn(); clashUI(); } else if (S.throws <= 0) repel("THE HOOKS WON'T HOLD"); else { S.phase = 'grapple'; grappleUI(); } }
      else if (S.phase === 'clash' && S.prompt) { S.prompt.t += dt; const k = 1 - S.prompt.t / S.prompt.win, tm = $('mgTimer'); if (tm) tm.style.width = clamp(k, 0, 1) * 100 + '%'; if (k <= 0 && !S.prompt.done) clash('-'); }
      else if (S.phase === 'clashFx' && S.t > 0.6) { if (you.hp <= 0) end('sunk'); else if (S.crewFoe <= 0) end('boarded'); else if (S.crewYou <= Math.ceil(S.crew0 * 0.3)) repel(); else { S.phase = 'clash'; clashUI(); } }
      else if (S.phase === 'over' && S.t > 1.2) { close(); done({ result: S.result, taken: S.taken, foeHp: foe.hp, fireUsed: you.fireUsed || 0, cursed: !!S.cursed }); } } };
  }

  // ---------- fishing ----------
  function fish(o, done) {
    open('fishing'); const S = { phase: 'cast', t: 0, p: 0, dir: 1, q: 0, fishY: 0.5, fishV: 0, boxY: 0.3, boxV: 0, hold: false, prog: 0.3, tt: 0, ended: false };
    const kind = o.kind; const title = { fish: '🐟 Fish shoal', flotsam: '📦 Sunken crates', treasure: '💰 Glinting treasure' }[kind] || 'Fishing';
    root.innerHTML = `<div class="mgTitle">${title}</div><div class="mgStage" id="fsStage"></div><div class="mgBtns" id="fsBtns"></div>`;
    const stage = $('fsStage'), btns = $('fsBtns'); const quit = el('button', 'ghost mgFlee', 'STOP'); quit.onclick = () => end('lost'); root.appendChild(quit);
    stage.innerHTML = `<div class="mgHint">Cast: stop the meter in the gold band</div><div class="track" id="fsTrack"><div class="zone" style="left:68%;width:20%"></div><div class="zone crit" style="left:75%;width:6%"></div><div class="needle" id="fsNeedle"></div></div>`;
    const cb = el('button', 'mgBig', 'CAST'); cb.onclick = cast; btns.appendChild(cb); $('fsTrack').onpointerdown = (e) => { e.preventDefault(); cast(); };
    function cast() { if (S.phase !== 'cast') return; const d = Math.abs(S.p - 0.78); S.q = d < 0.03 ? 1 : d < 0.1 ? 0.7 : d < 0.2 ? 0.4 : 0.15; hooks.cast && hooks.cast(S.q); sfx.throw();
      banner(S.q >= 1 ? 'PERFECT CAST!' : S.q >= 0.7 ? 'GOOD CAST' : S.q >= 0.4 ? 'OK CAST' : 'POOR CAST', S.q >= 0.7 ? '#ffd24a' : '#ffffff');
      if (Math.random() < (o.biteChance ?? 0.08)) { S.phase = 'bite'; S.t = 0; banner('SOMETHING HUGE BITES!', '#ff5a3a'); sfx.boom(); return; }
      S.phase = 'wait'; S.t = 0; stage.innerHTML = '<div class="mgHint">Waiting for a bite…</div>'; btns.innerHTML = ''; }
    const boxH = () => clamp(0.2 + (o.nets || 0) * 0.055 + S.q * 0.06, 0.18, 0.42);
    function reelUI() { stage.innerHTML = `<div class="mgHint">Hold REEL to lift the net · keep the ${kind === 'fish' ? 'fish' : 'catch'} inside</div><div class="reelWrap"><div class="reel" id="fsReel"><div class="box" id="fsBox"></div><div class="fishI" id="fsFish">${kind === 'fish' ? '🐟' : kind === 'treasure' ? '💰' : '📦'}</div></div><div class="prog"><i id="fsProg"></i></div></div>`;
      btns.innerHTML = ''; const rb = el('button', 'mgBig', 'REEL'); const on = (e) => { e.preventDefault(); S.hold = true; }, off = () => { S.hold = false; }; rb.onpointerdown = on; rb.onpointerup = off; rb.onpointerleave = off; rb.onpointercancel = off; btns.appendChild(rb);
      $('fsReel').onpointerdown = on; $('fsReel').onpointerup = off; }
    function end(result) { if (S.ended) return; S.ended = true; S.phase = 'over'; S.t = 0; S.result = result; if (result === 'catch') { banner('CAUGHT!', '#7dff3a'); sfx.pickup(); } else if (result === 'lost') banner('IT GOT AWAY', '#c8c8c8'); }
    // keys: Space casts, then hold Space to reel
    function fishKey(k, down) { if (k !== ' ') return false; if (down) { if (S.phase === 'cast') cast(); else S.hold = true; } else S.hold = false; return true; }
    cur = { key: fishKey, update(dt) { S.t += dt;
      if (S.phase === 'cast') { S.p += S.dir * dt * 0.9; if (S.p > 1) { S.p = 2 - S.p; S.dir = -1; } if (S.p < 0) { S.p = -S.p; S.dir = 1; } const n = $('fsNeedle'); if (n) n.style.left = S.p * 100 + '%'; }
      else if (S.phase === 'wait' && S.t > 0.8 + Math.random() * 0.6) { S.phase = 'reel'; S.t = 0; banner('BITE!', '#ffd24a'); sfx.help && sfx.help(); reelUI(); }
      else if (S.phase === 'bite' && S.t > 1.1) { close(); done({ result: 'bite' }); }
      else if (S.phase === 'reel') { S.tt += dt; const jumpy = (kind === 'treasure' ? 1.6 : kind === 'flotsam' ? 0.8 : 1.2) * (1 + (o.tier || 0) * 0.08);
        if (Math.random() < dt * 1.6 * jumpy) S.fishV = (Math.random() - 0.5) * 1.8 * jumpy; S.fishY = clamp(S.fishY + S.fishV * dt, 0.03, 0.97); if (S.fishY <= 0.03 || S.fishY >= 0.97) S.fishV *= -1;
        S.boxV += (S.hold ? 1.9 : -1.6) * dt; S.boxV *= 1 - dt * 1.4; const H = boxH(); S.boxY = clamp(S.boxY + S.boxV * dt, 0, 1 - H); if (S.boxY <= 0 || S.boxY >= 1 - H) S.boxV *= -0.3;
        const inside = S.fishY >= S.boxY && S.fishY <= S.boxY + H; S.prog = clamp(S.prog + (inside ? 0.32 + S.q * 0.1 : -0.17) * dt, 0, 1);
        const bx = $('fsBox'), fi = $('fsFish'), pr = $('fsProg'); if (bx) { bx.style.bottom = S.boxY * 100 + '%'; bx.style.height = H * 100 + '%'; bx.classList.toggle('in', inside); } if (fi) fi.style.bottom = S.fishY * 100 + '%'; if (pr) pr.style.height = S.prog * 100 + '%';
        if (S.prog >= 1) end('catch'); else if (S.prog <= 0 || S.tt > 18) end('lost'); }
      else if (S.phase === 'over' && S.t > 1.0) { close(); done({ result: S.result, q: S.q }); } } };
  }

  // ---------- salvage ----------
  function salvage(o, done) {
    open('salvage'); const S = { t: 0, pulls: 0, need: 14, last: null, tension: 0, ended: false, phase: 'haul' };
    root.innerHTML = `<div class="mgTitle">🪝 Salvage the wreck</div><div class="mgStage"><div class="mgHint">Pull left, right, left, right… not too fast or the rope snaps</div><div class="tension"><div class="zone"></div><i id="svT"></i></div><div class="mgCount" id="svC">0 / 14</div><div class="timer"><i id="svTime"></i></div></div><div class="mgBtns" id="svBtns"></div>`;
    const btns = $('svBtns'); for (const k of ['L', 'R']) { const b = el('button', 'mgDir', k === 'L' ? '⬅ PULL' : 'PULL ➡'); b.onpointerdown = (e) => { e.preventDefault(); pull(k); }; btns.appendChild(b); }
    const quit = el('button', 'ghost mgFlee', 'STOP'); quit.onclick = () => end('stop'); root.appendChild(quit);
    function pull(k) { if (S.phase !== 'haul') return; if (k === S.last) { S.tension = Math.max(0, S.tension - 0.15); banner('SLIP', '#c8c8c8'); return; } S.last = k; S.tension += 0.26; if (S.tension > 1) { end('snap'); return; } S.pulls++; hooks.pull && hooks.pull(S.pulls / S.need); sfx.step && sfx.step(); $('svC').textContent = S.pulls + ' / ' + S.need; if (S.pulls >= S.need) end('done'); }
    function end(result) { if (S.ended) return; S.ended = true; S.phase = 'over'; S.t = 0; S.result = result; banner(result === 'done' ? 'HAULED UP!' : result === 'snap' ? 'THE ROPE SNAPS!' : 'STOPPED', result === 'done' ? '#7dff3a' : '#ff8a3a'); (result === 'done' ? sfx.pickup : sfx.hurt)(); }
    cur = { key: (k, down) => { if (!down) return false; if (k === 'a' || k === 'arrowleft') pull('L'); else if (k === 'd' || k === 'arrowright') pull('R'); else return false; return true; }, update(dt) { S.t += dt; if (S.phase === 'haul') { S.tension = Math.max(0, S.tension - dt * 0.55); const tt = $('svT'), tm = $('svTime'); if (tt) { tt.style.width = clamp(S.tension, 0, 1) * 100 + '%'; tt.style.background = S.tension > 0.8 ? '#ff5a3a' : '#7dff3a'; } if (tm) tm.style.width = clamp(1 - S.t / 11, 0, 1) * 100 + '%'; if (S.t > 11) end(S.pulls >= S.need * 0.5 ? 'done' : 'stop'); }
      else if (S.phase === 'over' && S.t > 1.0) { close(); done({ result: S.result, frac: S.pulls / S.need }); } } };
  }
  // ---------- treasure dig ----------
  function dig(o, done) {
    open('dig'); const W = 5, H = 4, m = o.map, S = { t: 0, phase: 'dig', shovels: 6, wrong: 0, ended: false };
    root.innerHTML = `<div class="mgTitle">⛏ ${m.kind === 'relic' ? "The Drowned King's bone map" : 'Treasure map'}</div><div class="mgHint mgClue">“${m.clue}”</div><div class="digGrid" id="dgGrid"></div><div class="mgHint" id="dgInfo">Tap the sand to dig · ${S.shovels} digs before the tide turns</div>`;
    const quit = el('button', 'ghost mgFlee', 'BACK TO SHIP'); quit.onclick = () => end('gaveup'); root.appendChild(quit);
    const grid = $('dgGrid'); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const mk = m.marks.find((q) => q.c[0] === x && q.c[1] === y); const c = el('button', 'digCell' + (mk ? ' mark' : ''), mk ? mk.icon : ''); if (!mk) c.onclick = () => dig1(x, y, c); grid.appendChild(c); }
    // keys: arrows or WASD move a marker over the sand, Space or Enter digs there
    const cells = [...grid.children]; S.cx = 2; S.cy = 1; const sel = () => cells.forEach((c, i) => c.classList.toggle('sel', i === S.cy * W + S.cx)); if (matchMedia('(pointer: fine)').matches) { sel(); $('dgInfo').textContent += ' · keys: arrows and Space'; }
    function digKey(k, down) { if (!down || S.phase !== 'dig') return false; const dx = k === 'a' || k === 'arrowleft' ? -1 : k === 'd' || k === 'arrowright' ? 1 : 0, dy = k === 'w' || k === 'arrowup' ? -1 : k === 's' || k === 'arrowdown' ? 1 : 0;
      if (dx || dy) { S.cx = Math.max(0, Math.min(W - 1, S.cx + dx)); S.cy = Math.max(0, Math.min(H - 1, S.cy + dy)); sel(); return true; }
      if (k === ' ' || k === 'enter') { const c = cells[S.cy * W + S.cx]; if (!c.classList.contains('mark')) dig1(S.cx, S.cy, c); return true; } return false; }
    function dig1(x, y, c) { if (S.phase !== 'dig' || c.classList.contains('dug')) return; c.classList.add('dug'); S.shovels--; sfx.step && sfx.step(); const d = Math.abs(m.cell[0] - x) + Math.abs(m.cell[1] - y);
      if (d === 0) { c.textContent = m.kind === 'relic' ? '🗝' : '💰'; c.classList.add('gold'); end('found'); return; }
      c.textContent = d === 1 ? '🔥' : d === 2 ? '♨' : '❄'; c.classList.add(d === 1 ? 'hot' : d === 2 ? 'warm' : 'cold'); banner(d === 1 ? 'HOT!' : d === 2 ? 'WARM' : 'COLD', d === 1 ? '#ff8a3a' : d === 2 ? '#ffd24a' : '#9fd6ff');
      S.wrong++; if (S.wrong >= 3 && Math.random() < (o.risk ?? 0.15)) { end('guardian'); return; }
      if (S.shovels <= 0) { end('gaveup'); return; } $('dgInfo').textContent = S.shovels + ' digs before the tide turns'; }
    function end(result) { if (S.ended) return; S.ended = true; S.phase = 'over'; S.t = 0; S.result = result;
      banner(result === 'found' ? (m.kind === 'relic' ? "DRAUGR'S BANE!" : 'TREASURE!') : result === 'guardian' ? 'SOMETHING STIRS…' : 'THE TIDE TURNS', result === 'found' ? '#7dff3a' : result === 'guardian' ? '#ff5a3a' : '#c8c8c8'); (result === 'found' ? sfx.pickup : sfx.hurt)(); }
    cur = { key: digKey, update(dt) { S.t += dt; if (S.phase === 'over' && S.t > 1.3) { close(); done({ result: S.result }); } } };
  }
  return { battle, fish, salvage, dig, update(dt) { if (cur) cur.update(dt); }, get active() { return !!cur; }, close };
}

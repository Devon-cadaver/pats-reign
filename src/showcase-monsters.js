// Showcase: a button per monster species; tapping again cycles its colour variants. The monster swims slowly in a circle
// with its attack pose pulsing so the jaws, tentacles and claws show.
import { SPECIES, makeMonster } from './monsters.js';
import { buildShip } from './ship.js';

const ICON = { shark: '🦈', megalodon: '🦷', serpent: '🐉', eel: '⚡', octopus: '🐙', kraken: '🦑', crab: '🦀', angler: '🎣', jelly: '🪼', leviathan: '🐲', porpoise: '🐬', elder: '👁', jormungandr: '🌀' };
export function install(extraButtons) {
  extraButtons((btn, ctx) => {
    const sep = document.createElement('div'); sep.style.width = '100%'; document.getElementById('bar').appendChild(sep);
    const vi = {};
    for (const key of Object.keys(SPECIES)) btn('subj', ICON[key] || key, () => { vi[key] = (vi[key] ?? -1) + 1; show(key, vi[key]); });
    function show(key, v) {
      const RO = window.__roster || {}, m = makeMonster(key, v, RO.scale || 1);
      // roster: a ship beside a giant, for scale
      if (RO.ship != null) { const s = buildShip(RO.ship, { shields: 2, armor: 0, ballista: 1, fire: 0, ram: 0, sail: RO.ship }, undefined, 3); s.g.position.set(m.size * 0.07, 0, m.size * 0.25 + 12); s.g.rotation.y = Math.PI / 2 + 0.25; m.g.add(s.g); } const st = { t: 0, speed: 0.4, attack: 0, dive: 0, hurt: 0, rise: 1 }; let t = 0, ang = 0;
      const R = key === 'leviathan' ? 20 : key === 'porpoise' ? 0 : key === 'jormungandr' ? 34 : key === 'serpent' ? 16 : key === 'eel' ? 9 : 0;
      const sub = { g: m.g, body: m.g, tier: 0, len: 0, beam: 0, focusY: Math.min(6, m.top * 0.5), anim(dt) { t += dt; st.t = t; st.attack = Math.max(0, Math.sin(t * 0.8)) ** 3; ang += dt * (R ? 0.22 : 0.0);
        // roster mode (window.__roster): swim in a straight line so the body trails out behind for a side portrait
        if (R && window.__roster) { m.g.position.x = t * 3; m.g.position.z = 0; m.g.rotation.y = Math.PI / 2; }
        else if (R) { m.g.position.x = Math.cos(ang) * R * 0.5; m.g.position.z = Math.sin(ang) * R * 0.5; m.g.rotation.y = -ang; } else { m.g.rotation.y = 0.6; }
        m.g.position.y = ctx.ocean.heightAt(m.g.position.x, m.g.position.z); m.anim(dt, st); } };
      // the showcase rides subjects on tiltAt; keep the monster flat
      sub.body = { rotation: { x: 0, z: 0 } }; const fp = m.g.position.clone(); sub.follow = () => (R && window.__roster ? fp.set(m.g.position.x - (window.__roster.back ?? 0.3) * R, 0, 0) : m.g.position); sub.g.position.y = 0;
      const dist = Math.max(12, m.size * 3.2 + (R ? R * 0.6 : 0));
      ctx.setSubject(sub, dist, m.name, SPECIES[key].name + ' · variant ' + ((v % SPECIES[key].variants.length) + 1) + ' of ' + SPECIES[key].variants.length);
    }
    window.__showMonster = show;
  });
}

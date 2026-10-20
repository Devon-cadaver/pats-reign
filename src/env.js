// Sky, light and water colours for each time of day and weather, blended smoothly and pushed into the ocean shader,
// the sky dome, the scene fog and the two scene lights.
import * as THREE from 'three';

const P = (o) => ({ ...o, sunDir: new THREE.Vector3(...o.sunDir).normalize() });
export const LOOKS = {
  day: P({ sky: 0x3a8ad4, horizon: 0xb2d6ec, fog: 0xa6cade, sunDir: [0.45, 0.55, -0.7], sunCol: 0xfff0d0, sunK: 1, ambient: 0.56, deep: 0x05304c, mid: 0x1b7c96, shallow: 0x34c2b2, hemiSky: 0xdcefff, hemiGround: 0x2a4a5a, hemiK: 1.45, sunL: 1.25, near: 120, far: 330, foam: 0xf4fbff, moon: 0 }),
  dawn: P({ sky: 0x5a78b8, horizon: 0xf6c890, fog: 0xe0bfa0, sunDir: [-0.7, 0.18, -0.6], sunCol: 0xffc890, sunK: 0.95, ambient: 0.48, deep: 0x0a2c48, mid: 0x2a7090, shallow: 0x40b8a8, hemiSky: 0xffe0c8, hemiGround: 0x3a4050, hemiK: 1.25, sunL: 1.1, near: 110, far: 300, foam: 0xfff4ea, moon: 0 }),
  dusk: P({ sky: 0x2e3c78, horizon: 0xf09858, fog: 0xc88a70, sunDir: [0.75, 0.1, -0.6], sunCol: 0xff9a48, sunK: 0.95, ambient: 0.4, deep: 0x0a2240, mid: 0x355f86, shallow: 0x3a9a98, hemiSky: 0xffc0a0, hemiGround: 0x2a3048, hemiK: 1.1, sunL: 1.0, near: 100, far: 280, foam: 0xffe6d8, moon: 0 }),
  night: P({ sky: 0x0a1428, horizon: 0x1e3050, fog: 0x14223a, sunDir: [-0.35, 0.5, -0.8], sunCol: 0xb8ccff, sunK: 0.55, ambient: 0.32, deep: 0x041226, mid: 0x14405e, shallow: 0x1e6a70, hemiSky: 0x8aa0d8, hemiGround: 0x142036, hemiK: 1.05, sunL: 0.6, near: 70, far: 210, foam: 0xb8c8e8, moon: 1 }),
};
// weather overlays: blended over the time-of-day look by the weather strength k
export const WEATHER_LOOKS = {
  storm: { sky: 0x22282f, horizon: 0x4c555e, fog: 0x3e474f, sunK: 0.22, ambient: 0.36, deep: 0x081a24, mid: 0x24525e, hemiK: 0.85, sunL: 0.35, near: 40, far: 170, amp: 2.4 },
  rain: { sky: 0x48525c, horizon: 0x7a8690, fog: 0x6a7682, sunK: 0.4, ambient: 0.44, deep: 0x0a2632, mid: 0x2a6070, hemiK: 1.0, sunL: 0.6, near: 60, far: 210, amp: 1.5 },
  fog: { sky: 0x9aa6ae, horizon: 0xb0bac0, fog: 0xa8b2b8, sunK: 0.35, ambient: 0.62, deep: 0x1a3a48, mid: 0x4a7a86, hemiK: 1.2, sunL: 0.45, near: 12, far: 85, amp: 0.55 }, // eased (was 4-46): fog you can still sail by
  calm: { amp: 0.45 },
};

// each sea's own water, sky, fog and light (daytime values; dimmed with the time of day), blended by where the ship is
export const REGION_LOOKS = {
  frost: { sky: 0x9cc8e8, fog: 0xd0e2ee, deep: 0x0e3a58, mid: 0x3a8aa8, shallow: 0xa8e8f2, foam: 0xffffff, sunCol: 0xeaf6ff, hemiSky: 0xeaf6ff, hemiGround: 0x8aa0b0, ambient: 0.62, near: 90, far: 330, amp: 0.9 }, // a lighter haze (was 60-260)
  storm: { sky: 0x3e3e4a, fog: 0x544a4e, deep: 0x0e1a20, mid: 0x2e4650, shallow: 0x3e5656, foam: 0xd0d0d0, sunCol: 0xffa060, hemiSky: 0xd0b0a0, hemiGround: 0x2a2018, ambient: 0.5, hemiK: 1.1, near: 50, far: 230, amp: 1.5 },
  mist: { sky: 0x748a7e, fog: 0x7e9286, deep: 0x0c2218, mid: 0x2a5244, shallow: 0x46705a, foam: 0xd8e8dc, sunCol: 0xd8ead0, hemiSky: 0xb8d0c0, hemiGround: 0x203028, ambient: 0.5, near: 25, far: 155, amp: 0.75 }, // a little lighter (was 18-125)
  warm: { sky: 0x2a9ae8, fog: 0xb8e6f4, deep: 0x005a96, mid: 0x0ab0d0, shallow: 0x5af0e4, foam: 0xffffff, sunCol: 0xfff4d8, hemiSky: 0xe8faff, hemiGround: 0x3a7a6a, ambient: 0.62, near: 150, far: 380, amp: 0.75 },
};
const COLS = ['sky', 'horizon', 'fog', 'sunCol', 'deep', 'mid', 'shallow', 'hemiSky', 'hemiGround', 'foam'], NUMS = ['sunK', 'ambient', 'hemiK', 'sunL', 'near', 'far', 'moon'];
export function createEnv(scene, ocean, hemi, sun) {
  const cur = {}; for (const k of COLS) cur[k] = new THREE.Color(LOOKS.day[k]); for (const k of NUMS) cur[k] = LOOKS.day[k]; cur.sunDir = LOOKS.day.sunDir.clone(); cur.amp = 1;
  const tmp = {}; for (const k of COLS) tmp[k] = new THREE.Color(); tmp.sunDir = new THREE.Vector3(); const c2 = new THREE.Color();
  // tod: 0..1 day cycle position (0 dawn, 0.08-0.55 day, 0.62 dusk, 0.7-0.95 night); weather: { type, k }
  const acc = {}; for (const k of COLS) acc[k] = new THREE.Color();
  function target(tod, wx, rw) {
    const keys = [[0, 'dawn'], [0.1, 'day'], [0.55, 'day'], [0.64, 'dusk'], [0.72, 'night'], [0.94, 'night'], [1, 'dawn']];
    let i = 0; while (i < keys.length - 2 && tod > keys[i + 1][0]) i++; const [t0, a] = keys[i], [t1, b] = keys[i + 1], f = t1 > t0 ? Math.min(1, Math.max(0, (tod - t0) / (t1 - t0))) : 0;
    const A = LOOKS[a], B = LOOKS[b]; for (const k of COLS) tmp[k].setHex(A[k]).lerp(c2.setHex(B[k]), f); for (const k of NUMS) tmp[k] = A[k] + (B[k] - A[k]) * f; tmp.sunDir.copy(A.sunDir).lerp(B.sunDir, f).normalize(); tmp.amp = 1;
    if (rw && rw.home < 0.999) { const bright = Math.max(0.3, Math.min(1.1, tmp.ambient / 0.56)), wh = rw.home;
      for (const k of COLS) { acc[k].copy(tmp[k]).multiplyScalar(wh); for (const r in REGION_LOOKS) { const w = rw[r]; if (!w) continue; const R = REGION_LOOKS[r]; if (R[k] == null) c2.copy(tmp[k]); else c2.setHex(R[k]).multiplyScalar(k === 'foam' || k === 'sunCol' ? Math.max(0.5, bright) : bright); acc[k].add(c2.multiplyScalar(w)); } tmp[k].copy(acc[k]); }
      for (const k of ['ambient', 'hemiK', 'near', 'far']) { let v = tmp[k] * wh; for (const r in REGION_LOOKS) { const w = rw[r]; if (!w) continue; const R = REGION_LOOKS[r]; v += w * (R[k] == null ? tmp[k] : k === 'ambient' || k === 'hemiK' ? R[k] * Math.min(1, bright) : k === 'far' || k === 'near' ? Math.min(R[k], tmp[k] * (R[k] / 300 + 0.3)) : R[k]); } tmp[k] = v; }
      let amp = wh; for (const r in REGION_LOOKS) amp += (rw[r] || 0) * REGION_LOOKS[r].amp; tmp.amp = amp; }
    if (wx && wx.type && WEATHER_LOOKS[wx.type] && wx.k > 0) { const W = WEATHER_LOOKS[wx.type], k = wx.k, dark = tmp.moon;
      for (const kk of COLS) if (W[kk] != null) { c2.setHex(W[kk]); if (dark) c2.multiplyScalar(0.25 + 0.2 * (1 - dark)); tmp[kk].lerp(c2, k); }
      for (const kk of NUMS) if (W[kk] != null) tmp[kk] += ((dark && (kk === 'sunK' || kk === 'ambient' || kk === 'hemiK' || kk === 'sunL') ? W[kk] * 0.5 : W[kk]) - tmp[kk]) * k; if (W.amp != null) tmp.amp += (W.amp - 1) * k; }
    return tmp;
  }
  function apply(tod, wx, dt = 1, flash = 0, extraAmp = 0, rw = null) {
    const T = target(tod, wx, rw), f = Math.min(1, dt * 1.5);
    for (const k of COLS) cur[k].lerp(T[k], f); for (const k of NUMS) cur[k] += (T[k] - cur[k]) * f; cur.sunDir.lerp(T.sunDir, f).normalize(); cur.amp += (T.amp + extraAmp - cur.amp) * Math.min(1, dt * 0.6);
    const u = ocean.uniforms; u.uSky.value.copy(cur.sky); u.uHorizon.value.copy(cur.fog); u.uSunCol.value.copy(cur.sunCol); u.uDeep.value.copy(cur.deep); u.uMid.value.copy(cur.mid); u.uShallow.value.copy(cur.shallow); u.uFoamCol.value.copy(cur.foam);
    u.uSunDir.value.copy(cur.sunDir); u.uSunK.value = cur.sunK; u.uAmbient.value = cur.ambient + flash * 0.6; u.uAmp.value = cur.amp; u.uFlash.value = flash; u.uFoamK.value = Math.max(0, cur.amp - 1); ocean.skyU.uMoon.value = cur.moon;
    scene.fog.color.copy(cur.fog); scene.fog.near = cur.near; scene.fog.far = cur.far; if (scene.background && scene.background.isColor) scene.background.copy(cur.fog);
    hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGround); hemi.intensity = cur.hemiK + flash * 3; sun.color.copy(cur.sunCol); sun.intensity = cur.sunL; sun.position.copy(cur.sunDir).multiplyScalar(100);
    return cur;
  }
  return { apply, cur, snap(tod, wx, rw = null) { const T = target(tod, wx, rw); for (const k of COLS) cur[k].copy(T[k]); for (const k of NUMS) cur[k] = T[k]; cur.sunDir.copy(T.sunDir); cur.amp = T.amp; apply(tod, wx, 0, 0, 0, rw); } };
}

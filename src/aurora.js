// Valhalla's Tide: the northern lights over the Frost Sea. Curtains of green and violet light low in the northern sky (seen
// from the chase camera and the title), and the Bifröst: a rainbow pillar of light where the lights touch the sea. Sail
// into it for the gods' blessing. The light on the water itself is drawn by the ocean shader (uAur).
import * as THREE from 'three';

const CURTAIN_V = `uniform float uTime; varying vec2 vUv;
void main() { vUv = uv; vec3 p = position; float fold = sin(uv.x * 11.0 + uTime * 0.32) * 0.6 + sin(uv.x * 27.0 - uTime * 0.55) * 0.25;
  vec2 dir = normalize(p.xz); p.xz += dir * fold * 30.0 * (0.35 + uv.y); p.x += sin(uv.y * 3.0 + uTime * 0.4 + uv.x * 5.0) * 6.0 * uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const CURTAIN_F = `uniform float uTime, uK; varying vec2 vUv;
void main() { float x = vUv.x, y = vUv.y;
  float rays = 0.5 + 0.5 * sin(x * 150.0 + sin(x * 17.0 + uTime * 0.7) * 4.0 + uTime * 0.9);
  float flow = 0.5 + 0.5 * sin(x * 31.0 - uTime * 0.5 + sin(x * 7.0 + uTime * 0.3) * 2.0);
  float a = smoothstep(0.0, 0.1, y) * pow(1.0 - y, 1.5) * (0.3 + 0.7 * rays) * (0.35 + 0.65 * flow) * smoothstep(0.0, 0.1, x) * smoothstep(1.0, 0.9, x);
  vec3 c = mix(vec3(0.12, 1.0, 0.5), vec3(0.75, 0.25, 0.95), smoothstep(0.3, 0.95, y));
  gl_FragColor = vec4(c * a * uK * 1.3, 1.0); }`;
const PILLAR_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PILLAR_F = `uniform float uTime, uK; varying vec2 vUv;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() { float y = vUv.y; float stripes = 0.55 + 0.45 * sin(vUv.x * 6.2832 * 5.0 + y * 40.0 - uTime * 4.0);
  vec3 c = mix(hue(fract(y * 2.5 - uTime * 0.25)), vec3(0.85, 1.0, 0.95), 0.12);
  float a = pow(1.0 - y, 1.8) * smoothstep(0.0, 0.015, y) * stripes;
  gl_FragColor = vec4(c * a * uK * 0.7, 1.0); }`;

export function createAurora(scene, ocean) {
  const uni = { uTime: { value: 0 }, uK: { value: 0 } };
  const curtMat = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: CURTAIN_V, fragmentShader: CURTAIN_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const sky = new THREE.Group(); sky.visible = false; scene.add(sky);
  // three ribbons hung along arcs in the northern sky (north is -z)
  for (const [mid, span, R, y0, H] of [[-0.45, 0.95, 560, 8, 150], [0.3, 0.75, 640, 18, 190], [0.95, 0.85, 720, 4, 130], [-1.2, 0.6, 700, 10, 120]]) {
    const N = 90, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const u = i / N, a = mid + (u - 0.5) * span, r = R + Math.sin(u * 9 + mid * 3) * 25; const x = Math.sin(a) * r, z = -Math.cos(a) * r; pos.push(x, y0, z, x, y0 + H * (0.8 + 0.2 * Math.sin(u * 6 + mid)), z); uv.push(u, 0, u, 1); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, curtMat); m.frustumCulled = false; m.renderOrder = -2; sky.add(m); }
  // the Bifröst pillar, a glowing ring where it meets the water, and sparks drifting up it
  const pu = { uTime: uni.uTime, uK: { value: 0 } };
  const pillar = new THREE.Group(); pillar.visible = false; scene.add(pillar);
  const colGeo = new THREE.CylinderGeometry(3.2, 4.6, 200, 28, 1, true); colGeo.translate(0, 100, 0);
  const col = new THREE.Mesh(colGeo, new THREE.ShaderMaterial({ uniforms: pu, vertexShader: PILLAR_V, fragmentShader: PILLAR_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); col.frustumCulled = false; pillar.add(col);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x9affd0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const rings = [0, 1, 2].map((k) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), ringMat.clone()); r.rotation.x = -Math.PI / 2; r.userData.k = k; pillar.add(r); return r; });
  let time = 0, px = 0, pz = 0;
  return {
    sky, pillar,
    showPillar(x, z) { px = x; pz = z; pillar.visible = true; pu.uK.value = 0; },
    hidePillar() { pillar.visible = false; },
    get pillarAt() { return pillar.visible ? { x: px, z: pz } : null; },
    // k: how strong the lights are (0..1, already scaled for night); cam: camera position
    update(dt, k, cam) { time += dt; uni.uTime.value = time; uni.uK.value = k; sky.visible = k > 0.01; if (sky.visible) sky.position.set(cam.x, 0, cam.z);
      if (pillar.visible) { pu.uK.value = Math.min(1, pu.uK.value + dt * 0.5) * Math.max(0.35, k); const y = ocean.heightAt(px, pz); pillar.position.set(px, 0, pz); col.position.y = y - 1;
        for (const r of rings) { const f = (time * 0.45 + r.userData.k / 3) % 1; r.position.y = y + 0.15; r.scale.setScalar(4 + f * 9); r.material.opacity = 0.7 * (1 - f) * pu.uK.value; } } },
  };
}

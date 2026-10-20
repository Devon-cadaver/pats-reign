// Valhalla's Tide: the gates between the realms (v0.8.0). Hel's Gate stands in Midgard's Mist Sea: a ring of black standing
// stones cut with glowing violet runes around a whirl of purple light sinking into the sea, a pale beam rising from it.
// Helheim's gate home is the same ring in bone-pale stone with a golden whirl: the light of the living. Sealed (k low) it
// only smoulders; open, it spins bright and lights the water.
import * as THREE from 'three';
import { M, part, grp, BOX, RBX } from './geom.js';
import { mergeParts } from './perf.js';

const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// a log spiral of light turning into a dark eye at the centre
const FS = `uniform float uT, uK; uniform vec3 uA, uB; varying vec2 vUv;
void main() { vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard; float a = atan(p.y, p.x), lr = log(r + 0.03);
  float s = 0.5 + 0.5 * sin(a * 5.0 + lr * 7.0 + uT * 2.2), s2 = 0.5 + 0.5 * sin(a * 3.0 - lr * 4.0 - uT * 1.4);
  vec3 c = mix(uA, uB, s * s2); c = mix(c, vec3(0.02, 0.0, 0.04), smoothstep(0.32, 0.0, r) * 0.85);
  float alpha = smoothstep(1.0, 0.72, r) * (0.35 + 0.4 * s) * uK; gl_FragColor = vec4(c * (0.55 + 0.35 * uK), alpha * 0.8); }`;

export function makeGate(kind) {
  const home = kind === 'hel', g = new THREE.Group(), st = grp(g);
  const stone = M(home ? 0xc8c0b0 : 0x1a161e, 'flat'), rune = M(home ? 0xffe08a : 0xc46aff, 'glow');
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, p = grp(st, Math.cos(a) * 21, -1, Math.sin(a) * 21); p.rotation.y = -a;
    part(p, RBX(), stone, 3, 13 + (k % 2) * 4, 2.2, 0, 6, 0); part(p, BOX(), rune, 0.25, 7, 2.3, 1.55, 6.5, 0); part(p, BOX(), rune, 3.1, 0.25, 0.25, 0, 11, 1.15); }
  mergeParts(st);
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uK: { value: 1 }, uA: { value: new THREE.Color(home ? 0xffb84a : 0x3a1070) }, uB: { value: new THREE.Color(home ? 0xfff4d0 : 0xd88aff) } },
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(18, 48), mat); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.45; disc.renderOrder = 2; g.add(disc);
  const beamMat = new THREE.MeshBasicMaterial({ color: home ? 0xffe8a0 : 0xb06aff, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 140, 24, 1, true), beamMat); beam.position.y = 70; g.add(beam);
  const light = new THREE.PointLight(home ? 0xffd27a : 0xb06aff, 0, 70, 1.2); light.position.y = 6; g.add(light);
  function update(dt, t, k) { mat.uniforms.uT.value = t; mat.uniforms.uK.value = k; disc.rotation.z = t * 0.2; beam.visible = k > 0.3; beamMat.opacity = (0.04 + 0.08 * k) * (0.85 + 0.15 * Math.sin(t * 2)); light.intensity = k * 3; }
  return { g, update };
}

// The eight player tokens as painted toy figures.
// Vehicles and the buffalo face along -x (their direction of travel).
import * as THREE from 'three';
import { put, toy } from './buildings';
import type { TokenId } from './types';

const cyl = (r1: number, r2: number, h: number, seg = 16) => new THREE.CylinderGeometry(r1, r2, h, seg);
const ball = (r: number, seg = 16) => new THREE.SphereGeometry(r, seg, 12);
const lathe = (pts: [number, number][], seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function rod(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, color: string) {
  const o = put(g, cyl(r, r, a.distanceTo(b), 8), toy(color));
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
  return o;
}

function wheel(g: THREE.Object3D, r: number, x: number, y: number, z: number) {
  put(g, new THREE.TorusGeometry(r, r * 0.3, 10, 24), toy('#2E2E38'), x, y, z);
  put(g, cyl(r * 0.5, r * 0.5, r * 0.5, 12), toy('#E9EEF2'), x, y, z).rotation.x = Math.PI / 2;
}

function nonLa() {
  const g = new THREE.Group();
  const hat = new THREE.Group();
  put(hat, lathe([[0.001, 0.27], [0.03, 0.235], [0.09, 0.14], [0.16, 0.045], [0.21, 0.0], [0.2, -0.014], [0.001, 0.03]], 36), toy('#F6D98C', { double: true }));
  for (const [r, y] of [[0.075, 0.162], [0.125, 0.087], [0.175, 0.024]]) put(hat, new THREE.TorusGeometry(r, 0.005, 6, 36), toy('#D9B25F'), 0, y, 0).rotation.x = Math.PI / 2;
  const strap = put(hat, new THREE.TorusGeometry(0.1, 0.008, 6, 20, Math.PI), toy('#E8457A'), 0, 0, 0);
  strap.rotation.x = Math.PI;
  hat.rotation.z = 0.2;
  hat.position.y = 0.06;
  g.add(hat);
  return g;
}

function xichLo() {
  const g = new THREE.Group();
  wheel(g, 0.065, -0.12, 0.075, 0.09);
  wheel(g, 0.065, -0.12, 0.075, -0.09);
  wheel(g, 0.08, 0.16, 0.09, 0);
  put(g, new THREE.BoxGeometry(0.15, 0.04, 0.18), toy('#E5484D'), -0.12, 0.15, 0);
  put(g, new THREE.BoxGeometry(0.035, 0.12, 0.18), toy('#E5484D'), -0.055, 0.21, 0);
  for (const z of [-0.09, 0.09]) put(g, new THREE.BoxGeometry(0.11, 0.035, 0.022), toy('#3B82F6'), -0.11, 0.19, z);
  const hood = put(g, new THREE.CylinderGeometry(0.09, 0.09, 0.19, 18, 1, true, 0, Math.PI), toy('#FFD23F', { double: true }), -0.09, 0.22, 0);
  hood.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.5);
  rod(g, v(-0.06, 0.16, 0), v(0.16, 0.09, 0), 0.014, '#3B82F6');
  rod(g, v(0.11, 0.1, 0), v(0.12, 0.24, 0), 0.012, '#3B82F6');
  put(g, new THREE.BoxGeometry(0.07, 0.022, 0.05), toy('#3A2B23'), 0.12, 0.25, 0);
  return g;
}

function xeMay() {
  const g = new THREE.Group();
  wheel(g, 0.055, -0.13, 0.065, 0);
  wheel(g, 0.055, 0.13, 0.065, 0);
  const body = new THREE.Shape();
  body.moveTo(-0.07, 0.07);
  body.lineTo(0.18, 0.07);
  body.quadraticCurveTo(0.2, 0.16, 0.12, 0.17);
  body.lineTo(0.02, 0.17);
  body.quadraticCurveTo(-0.02, 0.1, -0.07, 0.1);
  body.closePath();
  const geo = new THREE.ExtrudeGeometry(body, { depth: 0.085, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.014, bevelSegments: 3 });
  geo.translate(0, 0, -0.0425);
  put(g, geo, toy('#4FD1B5'));
  const shield = put(g, new THREE.BoxGeometry(0.035, 0.16, 0.1), toy('#FFF4D9'), -0.12, 0.16, 0);
  shield.rotation.z = -0.25;
  put(g, cyl(0.01, 0.01, 0.17, 8), toy('#3A2B23'), -0.14, 0.25, 0).rotation.x = Math.PI / 2;
  put(g, ball(0.022), toy('#FFE27A'), -0.15, 0.215, 0);
  put(g, new THREE.BoxGeometry(0.11, 0.03, 0.08), toy('#6B4226'), 0.08, 0.195, 0);
  put(g, new THREE.BoxGeometry(0.06, 0.05, 0.07), toy('#E5484D'), 0.17, 0.2, 0);
  return g;
}

function pho() {
  const g = new THREE.Group();
  put(g, cyl(0.065, 0.075, 0.03, 20), toy('#3B82F6'), 0, 0.015, 0);
  const bowl = put(g, new THREE.SphereGeometry(0.17, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toy('#FFFDF7', { double: true }));
  bowl.scale.y = 0.72;
  bowl.position.y = 0.15;
  put(g, new THREE.TorusGeometry(0.17, 0.012, 8, 36), toy('#3B82F6'), 0, 0.15, 0).rotation.x = Math.PI / 2;
  put(g, new THREE.CircleGeometry(0.16, 32), toy('#E8A84C'), 0, 0.135, 0).rotation.x = -Math.PI / 2;
  put(g, new THREE.TorusGeometry(0.06, 0.012, 6, 20), toy('#FFF4D9'), -0.03, 0.14, 0.03).rotation.x = Math.PI / 2;
  put(g, new THREE.TorusGeometry(0.035, 0.012, 6, 16), toy('#FFF4D9'), 0.04, 0.142, -0.02).rotation.x = Math.PI / 2;
  for (const [x, z] of [[0.06, 0.05], [-0.07, -0.04]]) {
    const herb = put(g, ball(0.024, 10), toy('#4CB96B'), x, 0.145, z);
    herb.scale.set(1, 0.4, 1.4);
  }
  const beef = put(g, ball(0.035, 10), toy('#C96A5A'), 0.0, 0.145, -0.08);
  beef.scale.set(1.3, 0.3, 0.8);
  const chili = put(g, ball(0.014, 8), toy('#E5484D'), 0.08, 0.15, -0.05);
  chili.scale.set(1, 0.6, 1);
  rod(g, v(-0.17, 0.17, 0.05), v(0.21, 0.32, -0.04), 0.009, '#B5793F');
  rod(g, v(-0.17, 0.17, 0.085), v(0.21, 0.32, 0.0), 0.009, '#B5793F');
  return g;
}

function hoaSen() {
  const g = new THREE.Group();
  put(g, new THREE.CircleGeometry(0.2, 28, 0.4, Math.PI * 2 - 0.4), toy('#4CB96B', { double: true }), 0, 0.012, 0).rotation.x = -Math.PI / 2;
  const petal = ball(1, 14);
  const ring = (n: number, len: number, tilt: number, r: number, phase: number, color: string) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + phase;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
      pivot.rotation.y = -a + Math.PI / 2;
      const tiltG = new THREE.Group();
      tiltG.rotation.x = tilt;
      const p = put(tiltG, petal, toy(color), 0, len, 0);
      p.scale.set(0.05, len, 0.022);
      pivot.add(tiltG);
      g.add(pivot);
    }
  };
  ring(8, 0.08, 0.95, 0.03, 0, '#FF8FB8');
  ring(6, 0.095, 0.45, 0.015, Math.PI / 6, '#FFC2D8');
  put(g, cyl(0.035, 0.025, 0.055, 14), toy('#FFD23F'), 0, 0.125, 0);
  return g;
}

function trau() {
  const g = new THREE.Group();
  const hide = toy('#6F7785');
  const body = put(g, ball(1, 20), hide, 0.02, 0.16, 0);
  body.scale.set(0.16, 0.085, 0.09);
  const hump = put(g, ball(1, 14), hide, -0.05, 0.2, 0);
  hump.scale.set(0.07, 0.055, 0.065);
  const head = put(g, ball(1, 16), hide, -0.16, 0.18, 0);
  head.scale.set(0.06, 0.05, 0.05);
  put(g, ball(0.032, 12), toy('#F0B4B4'), -0.2, 0.16, 0);
  for (const s of [-1, 1]) {
    put(g, ball(0.012, 8), toy('#FFFDF7'), -0.19, 0.2, s * 0.03);
    const horn = put(g, new THREE.TorusGeometry(0.065, 0.013, 8, 18, Math.PI * 0.95), toy('#F6E9C8'), -0.15, 0.215, s * 0.055);
    horn.rotation.set(0, s * 0.35, 0);
    horn.rotateX(Math.PI / 2);
    horn.rotateZ(Math.PI * 0.55);
  }
  for (const [x, z] of [[-0.08, 0.05], [-0.08, -0.05], [0.12, 0.05], [0.12, -0.05]]) put(g, cyl(0.02, 0.017, 0.1, 8), toy('#585F6B'), x, 0.05, z);
  rod(g, v(0.17, 0.18, 0), v(0.21, 0.09, 0), 0.008, '#585F6B');
  return g;
}

function denLong() {
  const g = new THREE.Group();
  put(g, cyl(0.05, 0.055, 0.03, 14), toy('#FFD23F'), 0, 0.015, 0);
  put(g, lathe([[0.045, 0.0], [0.11, 0.045], [0.135, 0.11], [0.11, 0.175], [0.045, 0.22]]), toy('#E5484D', { double: true }), 0, 0.03, 0);
  for (let k = 0; k < 6; k++) {
    const rib = put(g, new THREE.TorusGeometry(0.11, 0.005, 6, 28, Math.PI), toy('#FFD23F'), 0, 0.14, 0);
    rib.scale.set(1.04, 1.22, 1);
    rib.rotation.set(0, (k / 6) * Math.PI, -Math.PI / 2);
  }
  put(g, cyl(0.05, 0.045, 0.03, 14), toy('#FFD23F'), 0, 0.265, 0);
  put(g, new THREE.TorusGeometry(0.03, 0.007, 6, 16, Math.PI), toy('#B5793F'), 0, 0.28, 0);
  return g;
}

function caPhe() {
  const g = new THREE.Group();
  put(g, cyl(0.14, 0.13, 0.016, 28), toy('#FFFDF7'), 0, 0.008, 0);
  // glass with a layer of condensed milk under the coffee
  put(g, cyl(0.07, 0.06, 0.035, 20), toy('#FFF4D9'), 0, 0.034, 0);
  put(g, cyl(0.082, 0.07, 0.075, 20), toy('#6B3F22'), 0, 0.089, 0);
  put(g, new THREE.TorusGeometry(0.082, 0.006, 6, 24), toy('#DDE6EE'), 0, 0.128, 0).rotation.x = Math.PI / 2;
  // phin filter
  put(g, cyl(0.105, 0.105, 0.012, 24), toy('#C9D2DA'), 0, 0.137, 0);
  put(g, cyl(0.07, 0.062, 0.085, 20), toy('#DDE6EE'), 0, 0.185, 0);
  put(g, cyl(0.075, 0.075, 0.013, 20), toy('#C9D2DA'), 0, 0.234, 0);
  put(g, cyl(0.016, 0.016, 0.022, 10), toy('#C9D2DA'), 0, 0.25, 0);
  return g;
}

const MAKERS: Record<TokenId, () => THREE.Group> = {
  'non-la': nonLa,
  'xich-lo': xichLo,
  'xe-may': xeMay,
  pho,
  'hoa-sen': hoaSen,
  trau,
  'den-long': denLong,
  'ca-phe': caPhe,
};

/** Tokens that have a front and should turn to face where they are going. */
export const DIRECTIONAL: Partial<Record<TokenId, boolean>> = { 'xich-lo': true, 'xe-may': true, trau: true };

export function sculpt(id: TokenId) {
  const g = (MAKERS[id] ?? nonLa)();
  g.scale.setScalar(1.9);
  return g;
}

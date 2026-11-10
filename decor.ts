// Scenery for the middle of the board: palms, bamboo, a basket boat on the pond, a farmer and a buffalo in the paddies.
import * as THREE from 'three';
import { put, toy } from './buildings';
import { sculpt } from './tokens3d';

const cyl = (r1: number, r2: number, h: number, seg = 10) => new THREE.CylinderGeometry(r1, r2, h, seg);
const ball = (r: number) => new THREE.SphereGeometry(r, 14, 10);

function palm(h: number, lean: number) {
  const g = new THREE.Group();
  let x = 0;
  for (let k = 0; k < 5; k++) {
    put(g, cyl(0.06 - k * 0.004, 0.07 - k * 0.004, h / 5 + 0.01), toy(k % 2 ? '#B98B5E' : '#C99A6B'), x, ((k + 0.5) * h) / 5, 0);
    x += lean * (k + 1) * 0.02;
  }
  const crown = new THREE.Group();
  crown.position.set(x, h, 0);
  for (let a = 0; a < 7; a++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (a / 7) * Math.PI * 2;
    const leaf = put(pivot, ball(1), toy(a % 2 ? '#3FB25F' : '#58C472'), 0.33, -0.07, 0);
    leaf.scale.set(0.4, 0.045, 0.13);
    leaf.rotation.z = -0.5;
    crown.add(pivot);
  }
  for (const [cx, cz] of [[0.07, 0.03], [-0.05, 0.06], [0, -0.07]]) put(crown, ball(0.055), toy('#8A5A36'), cx, -0.06, cz);
  g.add(crown);
  return g;
}

function bamboo() {
  const g = new THREE.Group();
  for (const [x, z, h] of [[0, 0, 1.5], [0.14, 0.06, 1.2], [-0.1, 0.12, 1.0]]) {
    put(g, cyl(0.035, 0.04, h, 8), toy('#7CCB5A'), x, h / 2, z);
    for (let y = 0.3; y < h; y += 0.3) put(g, cyl(0.043, 0.043, 0.025, 8), toy('#5DAE45'), x, y, z);
    const tuft = put(g, ball(0.17), toy('#58C472'), x + 0.04, h + 0.05, z);
    tuft.scale.set(1, 0.7, 1);
  }
  return g;
}

/** Bamboo pole for the banner. */
export function bannerPole(h: number) {
  const g = new THREE.Group();
  put(g, cyl(0.05, 0.06, h, 10), toy('#7CCB5A'), 0, h / 2, 0);
  for (let y = 0.4; y < h; y += 0.4) put(g, cyl(0.065, 0.065, 0.035, 10), toy('#5DAE45'), 0, y, 0);
  put(g, ball(0.08), toy('#FFD23F'), 0, h + 0.05, 0);
  return g;
}

function farmer(shirt: string) {
  const g = new THREE.Group();
  put(g, new THREE.CapsuleGeometry(0.075, 0.12, 4, 10), toy(shirt), 0, 0.14, 0);
  put(g, ball(0.065), toy('#F3C9A5'), 0, 0.3, 0);
  put(g, new THREE.ConeGeometry(0.15, 0.1, 20), toy('#F6D98C'), 0, 0.37, 0);
  return g;
}

/** Thuyền thúng: the round woven basket boat. */
function basketBoat() {
  const g = new THREE.Group();
  const hull = put(g, new THREE.SphereGeometry(0.26, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toy('#C9853F', { double: true }), 0, 0.14, 0);
  hull.scale.y = 0.55;
  put(g, new THREE.TorusGeometry(0.26, 0.02, 8, 28), toy('#E0A45C'), 0, 0.14, 0).rotation.x = Math.PI / 2;
  const f = farmer('#5B6CC9');
  f.position.set(0, 0.04, 0);
  f.scale.setScalar(0.85);
  g.add(f);
  const paddle = put(g, cyl(0.012, 0.012, 0.42, 6), toy('#8A5A36'), 0.16, 0.26, 0.08);
  paddle.rotation.z = -0.7;
  return g;
}

function haystack() {
  const g = new THREE.Group();
  const pts = [[0.001, 0.5], [0.12, 0.44], [0.22, 0.3], [0.27, 0.12], [0.25, 0], [0.001, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  put(g, new THREE.LatheGeometry(pts, 18), toy('#F2CB57'));
  put(g, cyl(0.015, 0.015, 0.2, 6), toy('#8A5A36'), 0, 0.58, 0);
  return g;
}

/** Everything is placed in world units; the centre of the board is the origin and +x, +z point toward the camera. */
export function buildDecor() {
  const g = new THREE.Group();
  const add = (o: THREE.Object3D, x: number, z: number, s = 1, ry = 0) => {
    o.position.set(x, 0.02, z);
    o.scale.multiplyScalar(s);
    o.rotation.y = ry;
    g.add(o);
  };
  // far corner, behind the banner
  add(palm(1.15, 1), -2.7, -2.7, 1);
  add(palm(0.95, -1), -1.9, -3.05, 1);
  add(bamboo(), -3.1, -1.3, 0.72);
  add(bamboo(), -0.6, -3.15, 0.6, 1);
  // pond on the left
  add(palm(1.1, -1), -3.2, 0.9, 0.95, 2);
  add(basketBoat(), -2.35, 2.3, 1, 0.6);
  const lotus1 = sculpt('hoa-sen');
  add(lotus1, -1.75, 2.75, 0.45);
  const lotus2 = sculpt('hoa-sen');
  add(lotus2, -3.0, 1.95, 0.36, 1);
  // paddies on the right
  add(farmer('#B5533A'), 1.85, -2.85, 1, 0.5);
  const buffalo = sculpt('trau');
  add(buffalo, 2.75, -1.75, 0.85, Math.PI * 0.75);
  add(haystack(), 3.1, -0.55, 1);
  add(palm(1.15, 1), 3.15, -3.15, 0.9, 4);
  return g;
}

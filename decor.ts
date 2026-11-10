// Scenery for the middle of the board: palms, bamboo, a basket boat on the pond, a farmer in the paddies.
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
  crown.name = 'crown';
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
  paddle.name = 'paddle';
  return g;
}

function haystack() {
  const g = new THREE.Group();
  const pts = [[0.001, 0.5], [0.12, 0.44], [0.22, 0.3], [0.27, 0.12], [0.25, 0], [0.001, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  put(g, new THREE.LatheGeometry(pts, 18), toy('#F2CB57'));
  put(g, cyl(0.015, 0.015, 0.2, 6), toy('#8A5A36'), 0, 0.58, 0);
  return g;
}

// Rice paddies in world units: [x, z, width, depth, colour of the young rice]
const PADDIES: [number, number, number, number, string][] = [
  [1.25, -3.25, 1.0, 1.05, '#8FD05A'],
  [2.35, -3.25, 1.1, 1.05, '#C9DB5A'],
  [1.25, -2.1, 0.85, 1.15, '#6FC25A'],
  [2.2, -2.1, 1.25, 1.15, '#A9D65A'],
];

/** Everything is placed in world units; the centre of the board is the origin and +x, +z point toward the camera. `tick` animates it. */
export function buildDecor() {
  const g = new THREE.Group();
  const add = (o: THREE.Object3D, x: number, z: number, s = 1, ry = 0) => {
    o.position.set(x, 0.02, z);
    o.scale.multiplyScalar(s);
    o.rotation.y = ry;
    g.add(o);
    return o;
  };
  // far corner
  add(palm(1.15, 1), -2.7, -2.7, 1);
  add(palm(0.95, -1), -1.9, -3.05, 1);
  add(bamboo(), -3.1, -1.3, 0.72);
  add(bamboo(), -0.6, -3.15, 0.6, 1);
  // pond on the left
  add(palm(1.1, -1), -3.2, 0.9, 0.95, 2);
  const boat = add(basketBoat(), -2.35, 2.3, 1, 0.6);
  add(sculpt('hoa-sen'), -1.75, 2.75, 0.45);
  add(sculpt('hoa-sen'), -3.0, 1.95, 0.36, 1);
  const ripples: THREE.Mesh[] = [];
  for (let k = 0; k < 3; k++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.33, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.022;
    g.add(r);
    ripples.push(r);
  }
  // paddies on the right
  const worker = add(farmer('#B5533A'), 1.85, -2.85, 1, 0.5);
  add(haystack(), 3.1, -0.55, 1);
  add(palm(1.15, 1), 3.15, -3.15, 0.9, 4);

  // Young rice: hundreds of little blades that ripple in the wind.
  const spots: [number, number, number][] = [];
  PADDIES.forEach(([px, pz, pw, pd], n) => {
    for (let x = px + 0.13; x < px + pw - 0.08; x += 0.115) {
      for (let z = pz + 0.13; z < pz + pd - 0.08; z += 0.115) {
        if (Math.hypot(x - 1.85, z + 2.85) < 0.2) continue; // leave room for the farmer
        spots.push([x + ((x * 37 + z * 91) % 1) * 0.03, z, n]);
      }
    }
  });
  const blade = new THREE.ConeGeometry(0.035, 0.2, 4);
  blade.translate(0, 0.1, 0);
  const rice = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length);
  const color = new THREE.Color();
  spots.forEach(([, , n], k) => rice.setColorAt(k, color.set(PADDIES[n][4]).offsetHSL(0, 0, ((k * 7) % 5) * 0.012 - 0.02)));
  rice.castShadow = true;
  g.add(rice);
  const crowns: THREE.Object3D[] = [];
  g.traverse((o) => o.name === 'crown' && crowns.push(o));
  const paddle = boat.getObjectByName('paddle')!;
  const dummy = new THREE.Object3D();

  const tick = (now: number) => {
    const t = now / 1000;
    // wind crossing the paddies as a travelling wave
    spots.forEach(([x, z], k) => {
      const wave = Math.sin(t * 2.2 - x * 2.6 - z * 1.4) * 0.5 + Math.sin(t * 3.7 + k) * 0.08;
      dummy.position.set(x, 0.02, z);
      dummy.rotation.set(wave * 0.3, 0, wave * 0.38);
      dummy.scale.set(1, 0.85 + ((k * 13) % 7) * 0.05, 1);
      dummy.updateMatrix();
      rice.setMatrixAt(k, dummy.matrix);
    });
    rice.instanceMatrix.needsUpdate = true;
    // the basket boat drifts in a slow loop, rocking as it is paddled
    const a = t * 0.35;
    boat.position.set(-2.3 + Math.cos(a) * 0.42, 0.02 + Math.sin(t * 2.4) * 0.012, 2.3 + Math.sin(a) * 0.3);
    boat.rotation.set(Math.sin(t * 1.9) * 0.07, -a + 1.2, Math.sin(t * 2.3) * 0.06);
    paddle.rotation.z = -0.7 + Math.sin(t * 2.6) * 0.35;
    ripples.forEach((r, k) => {
      const p = (t * 0.45 + k / 3) % 1;
      r.position.x = boat.position.x;
      r.position.z = boat.position.z;
      r.scale.setScalar(0.9 + p * 1.5);
      (r.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - p);
    });
    // the farmer bends to plant
    worker.rotation.x = 0.25 + Math.sin(t * 1.6) * 0.25;
    crowns.forEach((c, k) => (c.rotation.z = Math.sin(t * 1.1 + k * 1.7) * 0.07));
  };
  tick(0);
  return { group: g, tick };
}

// Cartoon Vietnamese buildings made from chunky toy shapes.
// Houses grow one floor per house; the fifth level becomes a hotel, or a landmark in the five big cities.
// Three house styles follow the regions: stilt houses in the mountains, yellow Hội An shophouses in the centre, pastel tube houses elsewhere.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Group as GroupId } from './board';

const mats = new Map<string, THREE.MeshStandardMaterial>();
/** Matte toy plastic in a given colour. */
export function toy(color: string, opts: { flat?: boolean; double?: boolean } = {}) {
  const key = `${color}:${opts.flat ? 1 : 0}:${opts.double ? 1 : 0}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, flatShading: !!opts.flat, side: opts.double ? THREE.DoubleSide : THREE.FrontSide });
    mats.set(key, m);
  }
  return m;
}

export function put(g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const soft = (w: number, h: number, d: number, r = 0.035) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2));
const cyl = (r1: number, r2: number, h: number, seg = 16) => new THREE.CylinderGeometry(r1, r2, h, seg);
const ball = (r: number) => new THREE.SphereGeometry(r, 14, 10);

function mixHex(a: string, b: string, t: number) {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

/** Gable roof: a triangular prism with its ridge along z (or along x when turned). */
function gable(w: number, h: number, d: number, m: THREE.Material) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const o = new THREE.Mesh(geo, m);
  o.castShadow = true;
  return o;
}

/** Four-sided roof with flared, upturned eaves, as on pagodas and communal houses. `half` is the half-width of the eaves. */
function flaredRoof(half: number, h: number, m: THREE.Material) {
  const r = half * Math.SQRT2;
  const pts = [
    [0.001, h],
    [r * 0.22, h * 0.62],
    [r * 0.52, h * 0.26],
    [r * 0.85, h * 0.04],
    [r, h * 0.12],
    [r * 0.98, 0],
    [0.001, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 4, Math.PI / 4);
  const o = new THREE.Mesh(geo, m);
  o.castShadow = true;
  return o;
}

const TILE = '#E5694B'; // terracotta roof tiles
const GLASS = '#BFE9FF';
const WHITE = '#FFFDF7';
const WOOD = '#C98A55';
const WOOD_DARK = '#8A5A36';
const THATCH = '#EBC15C';
const LEAF = '#4CB96B';

function pennant(g: THREE.Object3D, owner: string, x: number, y: number, z: number) {
  put(g, cyl(0.012, 0.012, 0.26, 6), toy(WHITE), x, y + 0.13, z);
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.16, -0.05);
  s.lineTo(0, -0.1);
  s.closePath();
  const f = put(g, new THREE.ShapeGeometry(s), toy(owner, { double: true }), x, y + 0.26, z);
  f.name = 'cloth';
}

export const FLOOR = 0.27;

/** Nhà ống: a narrow pastel town house with balconies, plants and a rooftop water tank. */
function tubeHouse(levels: number, wall: string, owner: string) {
  const g = new THREE.Group();
  const W = 0.5;
  const D = 0.5;
  const wallM = toy(wall);
  for (let k = 0; k < levels; k++) {
    const y = k * FLOOR;
    put(g, soft(W, FLOOR, D), wallM, 0, y + FLOOR / 2, 0);
    if (k > 0) put(g, box(W + 0.03, 0.03, D + 0.03), toy(WHITE), 0, y, 0);
    if (k === 0) {
      put(g, soft(0.15, 0.19, 0.03, 0.02), toy('#8B5A3C'), -0.11, 0.1, D / 2);
      put(g, soft(0.16, 0.12, 0.03, 0.02), toy(GLASS), 0.11, 0.13, D / 2);
      const awning = put(g, box(W + 0.06, 0.03, 0.16), toy(owner), 0, 0.235, D / 2 + 0.06);
      awning.rotation.x = 0.4;
      put(g, soft(0.03, 0.11, 0.16, 0.02), toy(GLASS), W / 2, 0.14, 0);
    } else {
      put(g, soft(0.15, 0.14, 0.03, 0.02), toy(GLASS), -0.11, y + 0.15, D / 2);
      put(g, soft(0.26, 0.075, 0.1, 0.02), toy(WHITE), 0.09, y + 0.065, D / 2 + 0.04);
      put(g, ball(0.05), toy(LEAF), 0.13, y + 0.135, D / 2 + 0.05);
      put(g, ball(0.025), toy(k % 2 ? '#FF7FA8' : '#FFD23F'), 0.16, y + 0.165, D / 2 + 0.07);
      put(g, soft(0.03, 0.13, 0.17, 0.02), toy(GLASS), W / 2, y + 0.15, 0);
    }
  }
  const top = levels * FLOOR;
  if (levels === 1) {
    const roof = gable(W + 0.12, 0.22, D + 0.1, toy(TILE));
    roof.position.y = top;
    g.add(roof);
    pennant(g, owner, 0, top + 0.2, 0);
  } else {
    put(g, box(W + 0.05, 0.045, D + 0.05), toy(WHITE), 0, top + 0.022, 0);
    // "tum": the little stair room on the roof
    put(g, soft(0.22, 0.16, 0.22, 0.02), wallM, -0.11, top + 0.12, -0.11);
    const cap = gable(0.3, 0.1, 0.28, toy(TILE));
    cap.position.set(-0.11, top + 0.2, -0.11);
    g.add(cap);
    // stainless water tank on its stand
    const tank = put(g, cyl(0.06, 0.06, 0.2, 14), toy('#DDE6EE'), 0.11, top + 0.15, 0.08);
    tank.rotation.z = Math.PI / 2;
    put(g, box(0.16, 0.05, 0.1), toy('#9AA5B1'), 0.11, top + 0.065, 0.08);
    pennant(g, owner, -0.11, top + 0.28, -0.11);
  }
  return g;
}

/** Hội An shophouse: yellow walls, dark shutters, tiled eaves on every floor and silk lanterns by the door. */
function hoiAnHouse(levels: number, owner: string) {
  const g = new THREE.Group();
  const W = 0.52;
  const D = 0.48;
  const wall = toy('#FFC738');
  const tile = toy('#B5533A');
  for (let k = 0; k < levels; k++) {
    const y = k * FLOOR;
    put(g, soft(W, FLOOR, D), wall, 0, y + FLOOR / 2, 0);
    if (k === 0) {
      put(g, soft(0.2, 0.19, 0.03, 0.02), toy('#7A4A2A'), 0, 0.1, D / 2);
      for (const [x, color] of [[-0.19, '#E5484D'], [0.19, '#FF8A3D']] as const) {
        put(g, cyl(0.004, 0.004, 0.06, 4), toy('#7A4A2A'), x, 0.23, D / 2 + 0.07);
        const l = put(g, ball(0.042), toy(color), x, 0.17, D / 2 + 0.07);
        l.scale.y = 1.2;
        put(g, cyl(0.015, 0.015, 0.02, 8), toy('#FFD23F'), x, 0.115, D / 2 + 0.07);
      }
    } else {
      for (const x of [-0.12, 0.12]) put(g, soft(0.11, 0.14, 0.03, 0.02), toy('#3E8C74'), x, y + 0.14, D / 2);
    }
    put(g, soft(0.03, 0.12, 0.15, 0.02), toy('#3E8C74'), W / 2, y + 0.14, 0);
    if (k < levels - 1) {
      const eave = put(g, box(W + 0.14, 0.035, D + 0.18), tile, 0, y + FLOOR, 0);
      eave.castShadow = true;
    }
  }
  const roof = gable(D + 0.2, 0.2, W + 0.14, tile);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = levels * FLOOR;
  g.add(roof);
  put(g, box(W + 0.16, 0.03, 0.05), toy('#F4E3C1'), 0, levels * FLOOR + 0.2, 0);
  pennant(g, owner, 0.2, levels * FLOOR + 0.18, 0);
  return g;
}

/** Nhà sàn: a wooden house on stilts under a big thatched roof, as in the northern mountains and the highlands. */
function stiltHouse(levels: number, owner: string) {
  const g = new THREE.Group();
  for (const x of [-0.19, 0.19]) for (const z of [-0.16, 0.16]) put(g, cyl(0.026, 0.026, 0.17, 8), toy(WOOD_DARK), x, 0.085, z);
  put(g, box(0.56, 0.035, 0.5), toy(WOOD_DARK), 0, 0.185, 0);
  const ladder = put(g, box(0.11, 0.24, 0.025), toy(WOOD_DARK), -0.13, 0.1, 0.31);
  ladder.rotation.x = 0.6;
  const H = 0.23;
  for (let k = 0; k < levels; k++) {
    const y = 0.2 + k * (H + 0.02);
    put(g, soft(0.48, H, 0.42), toy(k % 2 ? '#D69A63' : WOOD), 0, y + H / 2, 0);
    if (k === 0) put(g, soft(0.11, 0.16, 0.03, 0.02), toy(WOOD_DARK), -0.13, y + 0.08, 0.21);
    put(g, soft(0.13, 0.1, 0.03, 0.02), toy('#FFE9A8'), 0.1, y + 0.13, 0.21);
    put(g, soft(0.03, 0.1, 0.14, 0.02), toy('#FFE9A8'), 0.24, y + 0.13, 0);
    if (k > 0) put(g, box(0.54, 0.03, 0.48), toy(WOOD_DARK), 0, y - 0.01, 0);
  }
  const top = 0.2 + levels * (H + 0.02) - 0.02;
  const roof = flaredRoof(0.4, 0.3, toy(THATCH, { flat: true }));
  roof.position.y = top;
  g.add(roof);
  pennant(g, owner, 0, top + 0.26, 0);
  return g;
}

// ---------- hotels ----------

const windowTex = new Map<string, THREE.CanvasTexture>();
function windows(wall: string) {
  let t = windowTex.get(wall);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 192;
    const x = c.getContext('2d')!;
    x.fillStyle = wall;
    x.fillRect(0, 0, 96, 192);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 3; col++) {
        x.fillStyle = (row * 5 + col * 3) % 4 === 0 ? '#FFE27A' : '#BFE9FF';
        x.beginPath();
        x.roundRect(10 + col * 28, 10 + row * 31, 20, 21, 5);
        x.fill();
      }
    }
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    windowTex.set(wall, t);
  }
  return t;
}

/** Seaside resort hotel: a pastel tower under a red flared roof. */
function resortHotel(wall: string, owner: string) {
  const g = new THREE.Group();
  put(g, soft(0.66, 0.13, 0.6), toy(WHITE), 0, 0.065, 0);
  const awning = put(g, box(0.3, 0.03, 0.14), toy(owner), 0, 0.2, 0.34);
  awning.rotation.x = 0.35;
  put(g, soft(0.16, 0.12, 0.03, 0.02), toy('#8B5A3C'), 0, 0.07, 0.3);
  const tower = new THREE.MeshStandardMaterial({ map: windows(wall), roughness: 0.7 });
  put(g, box(0.5, 1.05, 0.46), tower, 0, 0.13 + 0.525, 0);
  put(g, box(0.56, 0.04, 0.52), toy(WHITE), 0, 1.2, 0);
  const roof = flaredRoof(0.36, 0.26, toy(TILE, { flat: true }));
  roof.position.y = 1.22;
  g.add(roof);
  put(g, ball(0.04), toy('#FFD23F'), 0, 1.5, 0);
  pennant(g, owner, 0, 1.5, 0);
  return g;
}

/** Many-tiered pagoda tower, like Thiên Mụ in Huế. */
function pagoda(owner: string) {
  const g = new THREE.Group();
  put(g, soft(0.62, 0.07, 0.62), toy('#D9CBB0'), 0, 0.035, 0);
  let y = 0.07;
  for (let t = 0; t < 5; t++) {
    const s = 0.44 - t * 0.055;
    put(g, soft(s, 0.17, s, 0.02), toy(t % 2 ? '#FFF1D6' : '#FFE2A8'), 0, y + 0.085, 0);
    put(g, soft(s * 0.3, 0.1, 0.03, 0.01), toy('#B5533A'), 0, y + 0.07, s / 2);
    const roof = flaredRoof(s * 0.78, 0.1, toy('#D9483B', { flat: true }));
    roof.position.y = y + 0.17;
    g.add(roof);
    y += 0.245;
  }
  put(g, cyl(0.012, 0.03, 0.16, 8), toy('#FFD23F'), 0, y + 0.06, 0);
  put(g, ball(0.03), toy('#FFD23F'), 0, y + 0.15, 0);
  pennant(g, owner, 0.24, 0.07, 0.24);
  return g;
}

/** Nhà rông: the soaring communal house of the Central Highlands (lower roof for a mountain lodge). */
function nhaRong(owner: string, roofH: number) {
  const g = new THREE.Group();
  for (const x of [-0.24, 0, 0.24]) for (const z of [-0.14, 0.14]) put(g, cyl(0.028, 0.028, 0.2, 8), toy(WOOD_DARK), x, 0.1, z);
  put(g, box(0.72, 0.04, 0.46), toy(WOOD_DARK), 0, 0.22, 0);
  put(g, soft(0.62, 0.22, 0.36), toy(WOOD), 0, 0.35, 0);
  put(g, soft(0.12, 0.16, 0.03, 0.02), toy(WOOD_DARK), 0, 0.32, 0.18);
  const ladder = put(g, box(0.12, 0.28, 0.025), toy(WOOD_DARK), 0, 0.12, 0.3);
  ladder.rotation.x = 0.6;
  // Blade-shaped roof: steep, with gently hollow sides
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0);
  s.quadraticCurveTo(-0.07, roofH * 0.3, 0, roofH);
  s.quadraticCurveTo(0.07, roofH * 0.3, 0.3, 0);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.74, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -0.37);
  const roof = new THREE.Mesh(geo, toy(THATCH));
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 0.46;
  roof.castShadow = true;
  g.add(roof);
  // woven pattern bands
  for (const [f, color] of [[0.14, '#D9483B'], [0.24, WHITE]] as const) put(g, box(0.76, 0.03, 0.6 * (1 - f) ** 1.7 + 0.03), toy(color), 0, 0.46 + roofH * f, 0);
  put(g, box(0.8, 0.03, 0.03), toy('#D9483B'), 0, 0.46 + roofH, 0);
  pennant(g, owner, 0.3, 0.46 + roofH - 0.05, 0);
  return g;
}

// ---------- landmarks ----------

function pad(color: string, r = 0.42) {
  const g = new THREE.Group();
  put(g, cyl(r, r, 0.04, 36), toy(color), 0, 0.02, 0);
  return g;
}

/** Sài Gòn: a lotus-bud glass tower with its helipad. */
function bitexco(owner: string) {
  const g = pad('#9ADB7A');
  const pts = [
    [0.001, 0],
    [0.22, 0],
    [0.24, 0.3],
    [0.26, 0.75],
    [0.25, 1.15],
    [0.21, 1.5],
    [0.15, 1.78],
    [0.08, 1.95],
    [0.001, 2.02],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#5BB8F5';
  x.fillRect(0, 0, 8, 128);
  x.fillStyle = '#D9F1FF';
  for (let k = 0; k < 128; k += 8) x.fillRect(0, k, 8, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.LatheGeometry(pts, 24);
  geo.scale(1, 1, 0.8);
  put(g, geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }), 0, 0.04, 0);
  // Helipad sticking out toward the viewer
  put(g, cyl(0.17, 0.17, 0.035, 24), toy(WHITE), 0.14, 1.36, 0.14);
  put(g, cyl(0.12, 0.12, 0.04, 24), toy('#E5484D'), 0.14, 1.365, 0.14);
  put(g, cyl(0.07, 0.07, 0.045, 16), toy(WHITE), 0.14, 1.37, 0.14);
  put(g, cyl(0.012, 0.03, 0.3, 8), toy('#FFD23F'), 0, 2.2, 0);
  pennant(g, owner, 0.3, 0.04, 0.26);
  return g;
}

/** Hà Nội: Hồ Gươm with Tháp Rùa on its islet and the red Thê Húc bridge. */
function hoGuom(owner: string) {
  const g = pad('#9ADB7A', 0.46);
  put(g, cyl(0.4, 0.4, 0.03, 36), toy('#55C6EC'), 0, 0.045, 0);
  put(g, cyl(0.13, 0.15, 0.06, 20), toy('#6DC36A'), 0.05, 0.08, -0.06);
  let y = 0.11;
  for (const [s, h] of [[0.19, 0.17], [0.15, 0.13], [0.11, 0.1]]) {
    put(g, soft(s, h, s * 0.85, 0.02), toy('#F3E3B5'), 0.05, y + h / 2, -0.06);
    put(g, soft(s * 0.3, h * 0.55, 0.02, 0.01), toy('#8A6A4A'), 0.05, y + h * 0.4, -0.06 + s * 0.43);
    put(g, box(s + 0.05, 0.025, s * 0.85 + 0.05), toy('#7A5A40'), 0.05, y + h + 0.012, -0.06);
    y += h + 0.025;
  }
  put(g, new THREE.ConeGeometry(0.035, 0.09, 8), toy('#FFD23F'), 0.05, y + 0.045, -0.06);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.38, 0.07, 0.2), new THREE.Vector3(-0.2, 0.26, 0.12), new THREE.Vector3(-0.05, 0.1, 0.02));
  put(g, new THREE.TubeGeometry(curve, 20, 0.024, 8, false), toy('#E5484D'));
  for (const t of [0.2, 0.5, 0.8]) {
    const p = curve.getPoint(t);
    put(g, cyl(0.012, 0.012, p.y - 0.05, 6), toy('#E5484D'), p.x, (p.y + 0.05) / 2, p.z);
  }
  // a weeping tree by the shore
  put(g, cyl(0.02, 0.025, 0.2, 6), toy('#8A5A36'), 0.3, 0.14, 0.22);
  put(g, ball(0.11), toy(LEAF), 0.3, 0.3, 0.22);
  pennant(g, owner, -0.34, 0.04, -0.2);
  return g;
}

/** Đà Nẵng: the golden Dragon Bridge over the Hàn river. */
function cauRong(owner: string) {
  const g = pad('#9ADB7A', 0.46);
  const river = put(g, box(0.9, 0.03, 0.3), toy('#55C6EC'), 0, 0.045, 0);
  river.rotation.y = -Math.PI / 4;
  put(g, soft(0.84, 0.045, 0.18, 0.02), toy('#A3ADBA'), 0, 0.19, 0).rotation.y = Math.PI / 4;
  const pts = [
    [-0.42, 0.2],
    [-0.28, 0.42],
    [-0.14, 0.22],
    [0.02, 0.48],
    [0.18, 0.22],
    [0.3, 0.4],
    [0.42, 0.36],
  ].map(([t, y]) => new THREE.Vector3(t * Math.SQRT1_2, y, -t * Math.SQRT1_2));
  const dragon = toy('#FFC233');
  put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.032, 10, false), dragon);
  const head = pts[pts.length - 1];
  put(g, ball(0.06), dragon, head.x + 0.02, head.y, head.z - 0.02);
  put(g, ball(0.018), toy(WHITE), head.x + 0.07, head.y + 0.03, head.z - 0.02);
  const flame = put(g, new THREE.ConeGeometry(0.035, 0.12, 8), toy('#FF6B35'), head.x + 0.09, head.y - 0.01, head.z - 0.09);
  flame.rotation.set(-Math.PI / 2, 0, -Math.PI / 4);
  for (const t of [-0.28, 0.02, 0.3]) put(g, cyl(0.03, 0.035, 0.14, 8), toy('#8E99A8'), t * Math.SQRT1_2, 0.1, -t * Math.SQRT1_2);
  pennant(g, owner, -0.3, 0.04, -0.3);
  return g;
}

/** Hải Phòng: the opera house, with a red flamboyant tree in bloom. */
function nhaHat(owner: string) {
  const g = pad('#9ADB7A', 0.46);
  const cream = toy('#FFE9B8');
  put(g, soft(0.56, 0.3, 0.4), cream, -0.04, 0.19, -0.04);
  put(g, box(0.6, 0.035, 0.44), toy('#F4D58A'), -0.04, 0.355, -0.04);
  for (let k = 0; k < 5; k++) put(g, cyl(0.02, 0.02, 0.22, 8), toy(WHITE), -0.2 + k * 0.08, 0.15, 0.2);
  put(g, box(0.42, 0.03, 0.08), cream, -0.04, 0.275, 0.2);
  const ped = gable(0.44, 0.1, 0.08, toy(TILE));
  ped.position.set(-0.04, 0.29, 0.2);
  g.add(ped);
  put(g, new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toy('#7BA7BC'), -0.04, 0.37, -0.06);
  put(g, cyl(0.012, 0.012, 0.1, 6), toy('#FFD23F'), -0.04, 0.52, -0.06);
  // hoa phượng đỏ
  put(g, cyl(0.022, 0.028, 0.22, 6), toy('#8A5A36'), 0.33, 0.15, 0.2);
  put(g, ball(0.12), toy('#FF5A3C'), 0.33, 0.33, 0.2);
  put(g, ball(0.08), toy('#FF7A4D'), 0.25, 0.39, 0.16);
  pennant(g, owner, -0.04, 0.5, -0.06);
  return g;
}

/** Cần Thơ: the cable-stayed bridge, with a market boat on the river below. */
function cauCanTho(owner: string) {
  const g = pad('#9ADB7A', 0.46);
  const river = put(g, box(0.9, 0.03, 0.34), toy('#55C6EC'), 0, 0.045, 0);
  river.rotation.y = -Math.PI / 4;
  const deck = put(g, soft(0.86, 0.04, 0.14, 0.02), toy('#DDE6EE'), 0, 0.24, 0);
  deck.rotation.y = Math.PI / 4;
  const lines: number[] = [];
  for (const t of [-0.2, 0.2]) {
    const x = t * Math.SQRT1_2;
    const z = -t * Math.SQRT1_2;
    put(g, cyl(0.025, 0.035, 0.74, 8), toy(WHITE), x, 0.41, z);
    put(g, new THREE.ConeGeometry(0.03, 0.08, 8), toy('#E5484D'), x, 0.82, z);
    for (const d of [-0.18, -0.12, -0.06, 0.06, 0.12, 0.18]) lines.push(x, 0.74, z, x + d * Math.SQRT1_2, 0.26, z - d * Math.SQRT1_2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#F59E0B' })));
  // floating-market boat
  const boat = put(g, soft(0.2, 0.05, 0.08, 0.02), toy('#B9793F'), 0.16, 0.08, 0.16);
  boat.rotation.y = -Math.PI / 4;
  put(g, ball(0.03), toy('#FF8A3D'), 0.16, 0.12, 0.16);
  put(g, ball(0.025), toy('#6DC36A'), 0.19, 0.115, 0.19);
  pennant(g, owner, -0.32, 0.04, 0.2);
  return g;
}

// ---------- one landmark for every other city ----------

const STONE = '#CDBFA6';
const SEA = '#55C6EC';
const SAND = '#F3DFA6';

function tree(g: THREE.Object3D, x: number, z: number, color = LEAF, s = 1) {
  put(g, cyl(0.02 * s, 0.026 * s, 0.16 * s, 6), toy('#8A5A36'), x, 0.04 + 0.08 * s, z);
  put(g, ball(0.1 * s), toy(color), x, 0.04 + 0.22 * s, z);
}
function pine(g: THREE.Object3D, x: number, z: number, s = 1) {
  put(g, cyl(0.018 * s, 0.022 * s, 0.1 * s, 6), toy('#8A5A36'), x, 0.04 + 0.05 * s, z);
  put(g, new THREE.ConeGeometry(0.09 * s, 0.2 * s, 8), toy('#2F8F55'), x, 0.04 + 0.18 * s, z);
  put(g, new THREE.ConeGeometry(0.065 * s, 0.16 * s, 8), toy('#3FA765'), x, 0.04 + 0.29 * s, z);
}
function miniPalm(g: THREE.Object3D, x: number, z: number, h: number) {
  const trunk = put(g, cyl(0.02, 0.028, h, 6), toy('#B98B5E'), x, 0.04 + h / 2, z);
  trunk.rotation.z = 0.08;
  for (let a = 0; a < 6; a++) {
    const pivot = new THREE.Group();
    pivot.position.set(x - 0.02, 0.04 + h, z);
    pivot.rotation.y = (a / 6) * Math.PI * 2;
    const leaf = put(pivot, ball(1), toy(a % 2 ? '#3FB25F' : '#58C472'), 0.1, -0.02, 0);
    leaf.scale.set(0.12, 0.018, 0.045);
    leaf.rotation.z = -0.5;
    g.add(pivot);
  }
}
function blob(g: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, flat = false) {
  const o = put(g, new THREE.SphereGeometry(1, flat ? 7 : 16, flat ? 5 : 12), toy(color, { flat }), x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}
function starShape(R: number) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? R * 0.42 : R;
    if (k === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}
/** A national flag on a pole: red with a gold star. */
function redFlag(g: THREE.Object3D, x: number, y: number, z: number, h: number, w = 0.26) {
  put(g, cyl(0.012, 0.012, h, 6), toy(WHITE), x, y + h / 2, z);
  const f = put(g, new THREE.PlaneGeometry(w, w * 0.66), toy('#E5484D', { double: true }), x + w / 2, y + h - w * 0.33, z);
  f.rotation.y = -0.3;
  const st = put(g, starShape(w * 0.17), toy('#FFD23F', { double: true }), x + w / 2, y + h - w * 0.33, z + 0.012);
  st.rotation.y = -0.3;
}
function sampan(g: THREE.Object3D, x: number, y: number, z: number, ry: number) {
  const b = new THREE.Group();
  const hull = put(b, soft(0.24, 0.045, 0.08, 0.02), toy('#8A5A36'), 0, 0, 0);
  hull.scale.z = 1;
  put(b, cyl(0.022, 0.022, 0.06, 8), toy('#5B6CC9'), 0.05, 0.05, 0);
  put(b, new THREE.ConeGeometry(0.05, 0.035, 12), toy('#F6D98C'), 0.05, 0.1, 0);
  b.position.set(x, y, z);
  b.rotation.y = ry;
  g.add(b);
}

/** Cao Bằng: Bản Giốc waterfall tumbling over three rock steps. */
function banGioc(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const rock = toy('#8E8577', { flat: true });
  const water = toy('#8FDDF7');
  const steps: [number, number, number][] = [[-0.16, 0.56, 0.74], [0.02, 0.36, 0.66], [0.18, 0.18, 0.56]];
  for (const [z, h, w] of steps) {
    put(g, soft(w, h, 0.2, 0.04), rock, 0, 0.04 + h / 2, z);
    for (const x of [-w * 0.26, w * 0.1, w * 0.32]) put(g, box(w * 0.2, h * 0.52, 0.03), water, x, 0.04 + h * 0.74, z + 0.1);
    put(g, box(w * 0.86, 0.025, 0.06), water, 0, 0.04 + h, z + 0.07);
  }
  put(g, cyl(0.3, 0.3, 0.02, 24), toy(SEA), 0.02, 0.05, 0.3).scale.set(1, 1, 0.45);
  for (const x of [-0.2, 0, 0.2]) blob(g, WHITE, x, 0.07, 0.3, 0.05, 0.03, 0.04);
  blob(g, LEAF, -0.26, 0.64, -0.18, 0.12, 0.08, 0.1);
  blob(g, '#3FA765', 0.22, 0.64, -0.18, 0.14, 0.09, 0.1);
  pennant(g, owner, -0.36, 0.04, 0.22);
  return g;
}

/** Hà Giang: the Lũng Cú flag tower on its hilltop, the northernmost point of the country. */
function lungCu(owner: string) {
  const g = pad('#7FC46A', 0.46);
  put(g, new THREE.ConeGeometry(0.42, 0.42, 7), toy('#5FA36A', { flat: true }), 0, 0.25, 0);
  put(g, new THREE.ConeGeometry(0.2, 0.2, 6), toy('#8E8577', { flat: true }), 0.26, 0.14, 0.14);
  put(g, cyl(0.1, 0.13, 0.4, 8), toy('#E9DFC7'), 0, 0.6, 0);
  put(g, cyl(0.15, 0.15, 0.035, 8), toy(STONE), 0, 0.81, 0);
  put(g, cyl(0.07, 0.08, 0.1, 8), toy('#E9DFC7'), 0, 0.87, 0);
  redFlag(g, 0, 0.92, 0, 0.5, 0.36);
  pennant(g, owner, -0.34, 0.04, 0.22);
  return g;
}

/** Điện Biên: the victory monument, bronze soldiers raising the flag on a stone plinth. */
function tuongDai(owner: string) {
  const g = pad('#7FC46A', 0.46);
  let y = 0.04;
  for (const [w, h] of [[0.72, 0.1], [0.56, 0.12], [0.4, 0.28]]) {
    put(g, soft(w, h, w * 0.8, 0.02), toy(STONE), 0, y + h / 2, 0);
    y += h;
  }
  const bronze = toy('#B9853A');
  for (const [x, z, s] of [[0, 0, 1], [-0.11, 0.05, 0.8], [0.11, 0.05, 0.8]]) {
    put(g, cyl(0.035 * s, 0.045 * s, 0.2 * s, 8), bronze, x, y + 0.1 * s, z);
    put(g, ball(0.04 * s), bronze, x, y + 0.24 * s, z);
  }
  redFlag(g, 0.03, y + 0.2, 0, 0.36, 0.26);
  tree(g, -0.34, -0.12, '#FFFFFF', 0.9); // hoa ban
  tree(g, 0.34, -0.14, '#F7E9F2', 0.8);
  pennant(g, owner, -0.34, 0.04, 0.24);
  return g;
}

/** Mộc Châu: terraced tea hills, a plum tree in bloom and a dairy cow. */
function doiChe(owner: string) {
  const g = pad('#7FC46A', 0.46);
  for (let k = 0; k < 5; k++) {
    const r = 0.36 - k * 0.065;
    put(g, cyl(r - 0.02, r, 0.075, 28), toy(k % 2 ? '#3F9B55' : '#63BF6C'), -0.06, 0.08 + k * 0.075, -0.06);
  }
  put(g, cyl(0.02, 0.026, 0.14, 6), toy('#6B4226'), -0.06, 0.5, -0.06);
  blob(g, '#FFE3EE', -0.06, 0.62, -0.06, 0.11, 0.09, 0.11);
  blob(g, '#FFFFFF', 0.0, 0.66, -0.02, 0.06, 0.05, 0.06);
  // cow
  blob(g, WHITE, 0.28, 0.13, 0.22, 0.09, 0.055, 0.055);
  blob(g, '#33261F', 0.3, 0.15, 0.24, 0.04, 0.03, 0.035);
  blob(g, WHITE, 0.19, 0.16, 0.24, 0.04, 0.035, 0.035);
  blob(g, '#F0B4B4', 0.16, 0.15, 0.25, 0.02, 0.018, 0.02);
  for (const [x, z] of [[0.23, 0.19], [0.23, 0.25], [0.33, 0.19], [0.33, 0.25]]) put(g, cyl(0.012, 0.012, 0.07, 6), toy(WHITE), x, 0.075, z);
  pennant(g, owner, -0.36, 0.04, 0.22);
  return g;
}

/** Sa Pa: Fansipan, the roof of Indochina, with its summit marker and a cable car. */
function fansipan(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const rock = toy('#7C8FA6', { flat: true });
  put(g, new THREE.ConeGeometry(0.4, 1.0, 6), rock, -0.04, 0.54, -0.06);
  put(g, new THREE.ConeGeometry(0.26, 0.56, 5), toy('#6A7D94', { flat: true }), 0.22, 0.32, 0.08);
  put(g, new THREE.ConeGeometry(0.145, 0.36, 6), toy(WHITE, { flat: true }), -0.04, 0.865, -0.06);
  put(g, new THREE.ConeGeometry(0.04, 0.09, 3), toy('#DDE6EE'), -0.04, 1.08, -0.06);
  const a = new THREE.Vector3(-0.4, 0.2, 0.26);
  const b = new THREE.Vector3(-0.1, 0.86, 0.02);
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#33261F' })));
  put(g, cyl(0.014, 0.014, 0.2, 6), toy('#8E99A8'), a.x, 0.12, a.z);
  const cabin = a.clone().lerp(b, 0.45);
  put(g, soft(0.09, 0.08, 0.07, 0.02), toy('#E5484D'), cabin.x, cabin.y - 0.06, cabin.z);
  pine(g, 0.3, 0.3, 0.8);
  pine(g, 0.1, 0.36, 0.7);
  pennant(g, owner, 0.38, 0.04, -0.14);
  return g;
}

/** Pleiku: Biển Hồ, the crater lake ringed with pines. */
function bienHo(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const rim = put(g, new THREE.TorusGeometry(0.31, 0.09, 10, 32), toy('#5FA36A'), 0, 0.07, 0);
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = 0.9;
  put(g, cyl(0.3, 0.3, 0.02, 32), toy('#3E9CD4'), 0, 0.1, 0);
  for (const [x, z, s] of [[-0.3, -0.18, 1], [-0.14, -0.33, 0.85], [0.1, -0.34, 1.05], [0.32, -0.14, 0.9], [-0.36, 0.08, 0.8]]) pine(g, x, z, s * 1.05);
  put(g, box(0.05, 0.02, 0.22), toy(WOOD), 0.12, 0.125, 0.22);
  for (const z of [0.14, 0.3]) put(g, cyl(0.01, 0.01, 0.08, 5), toy(WOOD_DARK), 0.12, 0.1, z);
  const hut = gable(0.12, 0.07, 0.1, toy(TILE));
  hut.position.set(0.12, 0.17, 0.12);
  g.add(hut);
  put(g, box(0.09, 0.05, 0.08), toy(WOOD), 0.12, 0.15, 0.12);
  pennant(g, owner, 0.36, 0.04, 0.2);
  return g;
}

/** Buôn Ma Thuột: a ceremonial elephant from Buôn Đôn. */
function voi(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const skin = toy('#93A0B2');
  blob(g, '#93A0B2', 0.04, 0.4, 0, 0.3, 0.22, 0.2);
  blob(g, '#93A0B2', -0.26, 0.46, 0, 0.16, 0.16, 0.15);
  for (const s of [-1, 1]) {
    const ear = put(g, cyl(0.13, 0.13, 0.025, 16), toy('#A9B5C5'), -0.2, 0.47, s * 0.15);
    ear.rotation.set(Math.PI / 2, 0, s * 0.35);
    put(g, new THREE.ConeGeometry(0.02, 0.12, 6), toy(WHITE), -0.36, 0.36, s * 0.07).rotation.z = Math.PI * 0.7;
    put(g, ball(0.016), toy('#33261F'), -0.37, 0.5, s * 0.08);
  }
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.38, 0.44, 0), new THREE.Vector3(-0.46, 0.3, 0), new THREE.Vector3(-0.44, 0.14, 0), new THREE.Vector3(-0.36, 0.1, 0)]);
  put(g, new THREE.TubeGeometry(trunk, 16, 0.04, 8, false), skin);
  for (const [x, z] of [[-0.14, 0.1], [-0.14, -0.1], [0.2, 0.1], [0.2, -0.1]]) put(g, cyl(0.055, 0.06, 0.24, 10), skin, x, 0.16, z);
  // festival blanket and howdah
  put(g, soft(0.26, 0.05, 0.36, 0.02), toy('#E5484D'), 0.04, 0.6, 0);
  put(g, soft(0.2, 0.03, 0.4, 0.01), toy('#FFD23F'), 0.04, 0.59, 0);
  put(g, soft(0.18, 0.1, 0.2, 0.02), toy(WOOD), 0.04, 0.68, 0);
  const tail = put(g, cyl(0.01, 0.01, 0.16, 5), skin, 0.34, 0.36, 0);
  tail.rotation.z = 0.4;
  pennant(g, owner, 0.04, 0.72, 0);
  return g;
}

/** Đà Lạt: the old railway station with its three steep gables. */
function gaDaLat(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const wall = toy('#FFD66B');
  put(g, soft(0.8, 0.2, 0.32, 0.02), wall, 0, 0.14, -0.02);
  const low = gable(0.36, 0.14, 0.82, toy('#C8463A'));
  low.rotation.y = Math.PI / 2;
  low.position.set(0, 0.24, -0.02);
  g.add(low);
  for (const [x, h] of [[-0.23, 0.36], [0, 0.48], [0.23, 0.36]]) {
    put(g, box(0.19, 0.2, 0.06), wall, x, 0.14, 0.15);
    const roof = gable(0.25, h, 0.34, toy('#C8463A'));
    roof.position.set(x, 0.24, 0);
    g.add(roof);
    const face = gable(0.18, h * 0.74, 0.02, wall);
    face.position.set(x, 0.24, 0.175);
    g.add(face);
    put(g, soft(0.07, 0.12, 0.02, 0.01), toy('#7BC4E8'), x, 0.16, 0.185);
  }
  put(g, cyl(0.045, 0.045, 0.02, 16), toy(WHITE), 0, 0.36, 0.19).rotation.x = Math.PI / 2;
  pine(g, -0.36, 0.2, 0.8);
  pine(g, 0.37, 0.18, 0.7);
  pennant(g, owner, 0, 0.7, 0);
  return g;
}

/** Quy Nhơn: Tháp Đôi, the twin Cham towers of red brick. */
function thapDoi(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const brick = toy('#C0603F', { flat: true });
  for (const [x, z, s] of [[-0.16, 0.02, 1], [0.17, -0.04, 0.86]]) {
    put(g, cyl(0.15 * s, 0.17 * s, 0.07, 4), toy('#A64E33', { flat: true }), x, 0.075, z).rotation.y = Math.PI / 4;
    put(g, cyl(0.12 * s, 0.14 * s, 0.5 * s, 4), brick, x, 0.11 + 0.25 * s, z).rotation.y = Math.PI / 4;
    let y = 0.11 + 0.5 * s;
    for (let k = 0; k < 4; k++) {
      const r = (0.125 - k * 0.026) * s;
      put(g, cyl(r * 0.82, r, 0.1 * s, 4), k % 2 ? toy('#A64E33', { flat: true }) : brick, x, y + 0.05 * s, z).rotation.y = Math.PI / 4;
      y += 0.1 * s;
    }
    put(g, soft(0.06 * s, 0.16 * s, 0.02, 0.01), toy('#4A2A1E'), x, 0.2, z + 0.1 * s);
  }
  miniPalm(g, 0.34, 0.2, 0.34);
  miniPalm(g, -0.36, 0.2, 0.26);
  pennant(g, owner, 0, 0.04, 0.32);
  return g;
}

/** Huế: Ngọ Môn, the great gate of the Imperial City. */
function ngoMon(owner: string) {
  const g = pad('#7FC46A', 0.46);
  put(g, soft(0.82, 0.26, 0.3, 0.02), toy(STONE), 0, 0.17, -0.04);
  for (const x of [-0.37, 0.37]) put(g, soft(0.16, 0.26, 0.22, 0.02), toy(STONE), x, 0.17, 0.16);
  for (const [x, w, h] of [[0, 0.11, 0.18], [-0.18, 0.08, 0.14], [0.18, 0.08, 0.14]]) put(g, soft(w, h, 0.02, 0.01), toy('#5A3B2E'), x, 0.04 + h / 2, 0.115);
  const yellow = toy('#F5B93B', { flat: true });
  put(g, box(0.6, 0.11, 0.2), toy('#C8463A'), 0, 0.355, -0.04);
  const r1 = flaredRoof(0.25, 0.12, yellow);
  r1.scale.set(1.5, 1, 0.75);
  r1.position.set(0, 0.41, -0.04);
  g.add(r1);
  put(g, box(0.28, 0.07, 0.14), toy('#C8463A'), 0, 0.55, -0.04);
  const r2 = flaredRoof(0.16, 0.11, yellow);
  r2.scale.set(1.3, 1, 0.8);
  r2.position.set(0, 0.585, -0.04);
  g.add(r2);
  for (const x of [-0.37, 0.37]) {
    put(g, box(0.12, 0.08, 0.16), toy('#C8463A'), x, 0.34, 0.16);
    const r = flaredRoof(0.11, 0.09, yellow);
    r.position.set(x, 0.38, 0.16);
    g.add(r);
  }
  redFlag(g, 0, 0.3, -0.26, 0.62, 0.24);
  pennant(g, owner, 0, 0.04, 0.34);
  return g;
}

/** Hội An: Chùa Cầu, the old covered bridge. */
function chuaCau(owner: string) {
  const g = pad('#7FC46A', 0.46);
  const canal = put(g, box(0.3, 0.02, 0.92), toy(SEA), 0, 0.05, 0);
  canal.scale.z = 0.95;
  for (const x of [-0.3, 0.3]) put(g, soft(0.2, 0.16, 0.26, 0.02), toy('#C9A08A'), x, 0.12, 0);
  const arch = put(g, new THREE.TorusGeometry(0.2, 0.05, 8, 20, Math.PI), toy('#C9A08A'), 0, 0.07, 0);
  arch.scale.set(1, 0.75, 2.6);
  put(g, soft(0.74, 0.04, 0.26, 0.01), toy('#B5533A'), 0, 0.23, 0);
  put(g, box(0.7, 0.12, 0.2), toy('#A84436'), 0, 0.31, 0);
  for (let k = 0; k < 5; k++) put(g, soft(0.07, 0.08, 0.02, 0.01), toy('#4A2A1E'), -0.26 + k * 0.13, 0.31, 0.105);
  const tile = toy('#5E7A6A');
  const roof = gable(0.34, 0.12, 0.8, tile);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(0, 0.37, 0);
  g.add(roof);
  put(g, box(0.26, 0.07, 0.16), toy('#A84436'), 0, 0.5, 0);
  const top = gable(0.26, 0.1, 0.34, tile);
  top.rotation.y = Math.PI / 2;
  top.position.set(0, 0.53, 0);
  g.add(top);
  for (const [x, c] of [[-0.3, '#E5484D'], [0.3, '#FFB03B']] as const) {
    const l = put(g, ball(0.035), toy(c), x, 0.3, 0.15);
    l.scale.y = 1.2;
  }
  pennant(g, owner, 0, 0.62, 0);
  return g;
}

/** Phan Thiết: the old water tower by the Cà Ty river, beside a red sand dune. */
function thapNuoc(owner: string) {
  const g = pad(SAND, 0.46);
  blob(g, '#E8834A', -0.2, 0.05, -0.14, 0.26, 0.16, 0.2);
  blob(g, '#F09A5E', 0.18, 0.05, -0.22, 0.2, 0.1, 0.16);
  put(g, cyl(0.2, 0.22, 0.08, 8), toy(STONE), 0.08, 0.08, 0.08);
  put(g, cyl(0.11, 0.14, 0.52, 8), toy('#F4E3B5'), 0.08, 0.38, 0.08);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put(g, box(0.02, 0.5, 0.02), toy('#D9B77A'), 0.08 + Math.cos(a) * 0.125, 0.38, 0.08 + Math.sin(a) * 0.125);
  }
  put(g, cyl(0.2, 0.2, 0.035, 8), toy('#F4E3B5'), 0.08, 0.66, 0.08);
  put(g, cyl(0.15, 0.15, 0.14, 8), toy('#FFF4D9'), 0.08, 0.75, 0.08);
  put(g, new THREE.ConeGeometry(0.24, 0.16, 8), toy(TILE, { flat: true }), 0.08, 0.9, 0.08);
  put(g, new THREE.ConeGeometry(0.1, 0.12, 8), toy('#C8463A', { flat: true }), 0.08, 1.02, 0.08);
  put(g, ball(0.025), toy('#FFD23F'), 0.08, 1.09, 0.08);
  miniPalm(g, -0.3, 0.22, 0.3);
  pennant(g, owner, 0.36, 0.04, 0.2);
  return g;
}

/** Nha Trang: Tháp Trầm Hương, the white lotus-bud tower on the beach front. */
function tramHuong(owner: string) {
  const g = pad(SAND, 0.46);
  put(g, cyl(0.46, 0.46, 0.03, 36), toy(SEA), 0, 0.03, 0);
  put(g, cyl(0.36, 0.38, 0.05, 28), toy(SAND), 0, 0.055, 0.04);
  put(g, cyl(0.22, 0.24, 0.07, 12), toy(STONE), 0, 0.11, 0);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const petal = blob(g, '#FFE9F1', Math.cos(a) * 0.17, 0.2, Math.sin(a) * 0.17, 0.07, 0.11, 0.035);
    petal.rotation.y = -a + Math.PI / 2;
    petal.rotation.x = 0;
  }
  const pts = [[0.001, 0], [0.14, 0], [0.15, 0.16], [0.12, 0.36], [0.09, 0.5], [0.04, 0.6], [0.001, 0.64]].map(([r, y]) => new THREE.Vector2(r, y));
  put(g, new THREE.LatheGeometry(pts, 8), toy(WHITE, { flat: true }), 0, 0.15, 0);
  for (const y of [0.33, 0.52]) put(g, cyl(0.16 - (y - 0.33) * 0.3, 0.16 - (y - 0.33) * 0.3, 0.025, 8), toy('#F7C9D6'), 0, y, 0);
  put(g, new THREE.ConeGeometry(0.02, 0.12, 6), toy('#FFD23F'), 0, 0.84, 0);
  miniPalm(g, -0.32, 0.14, 0.32);
  miniPalm(g, 0.33, 0.1, 0.26);
  pennant(g, owner, 0, 0.055, 0.36);
  return g;
}

/** Vũng Tàu: the white lighthouse on Núi Nhỏ. */
function haiDang(owner: string) {
  const g = pad(SEA, 0.46);
  const hill = put(g, new THREE.SphereGeometry(0.4, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), toy('#5FA36A', { flat: true }), 0, 0.04, 0);
  hill.scale.y = 0.75;
  put(g, cyl(0.15, 0.17, 0.06, 12), toy(STONE), 0, 0.36, 0);
  put(g, cyl(0.075, 0.11, 0.5, 14), toy(WHITE), 0, 0.64, 0);
  put(g, cyl(0.082, 0.09, 0.05, 14), toy('#E5484D'), 0, 0.6, 0);
  put(g, cyl(0.12, 0.12, 0.025, 14), toy('#8E99A8'), 0, 0.9, 0);
  put(g, cyl(0.065, 0.065, 0.1, 12), toy('#FFE27A'), 0, 0.96, 0);
  put(g, new THREE.ConeGeometry(0.09, 0.09, 12), toy('#E5484D'), 0, 1.055, 0);
  put(g, soft(0.14, 0.09, 0.12, 0.02), toy(WHITE), 0.17, 0.33, 0.1);
  const roof = gable(0.17, 0.06, 0.15, toy(TILE));
  roof.position.set(0.17, 0.375, 0.1);
  g.add(roof);
  tree(g, -0.22, 0.14, '#3FA765', 0.8);
  blob(g, WHITE, 0.3, 0.05, 0.3, 0.07, 0.02, 0.04);
  blob(g, WHITE, -0.34, 0.05, 0.2, 0.06, 0.02, 0.035);
  pennant(g, owner, -0.2, 0.3, -0.1);
  return g;
}

/** Ninh Bình: the limestone peaks of Tràng An, with a rowing boat on the river. */
function trangAn(owner: string) {
  const g = pad('#63BF6C', 0.46);
  const river = put(g, box(0.92, 0.02, 0.26), toy(SEA), 0, 0.05, 0.14);
  river.rotation.y = 0.35;
  for (const [x, z, r, h, c] of [[-0.2, -0.16, 0.17, 0.62, '#4F9A62'], [0.12, -0.24, 0.15, 0.82, '#5FAE6E'], [0.32, -0.04, 0.12, 0.46, '#4F9A62'], [-0.36, 0.02, 0.09, 0.3, '#5FAE6E']] as const) {
    blob(g, '#8E9A8C', x, 0.04 + h * 0.3, z, r, h * 0.45, r, true);
    blob(g, c, x, 0.04 + h * 0.52, z, r * 0.92, h * 0.5, r * 0.92, true);
  }
  sampan(g, 0.02, 0.085, 0.16, 0.35);
  // rice by the water
  for (const [x, z] of [[-0.28, 0.32], [-0.18, 0.36], [-0.08, 0.38]]) blob(g, '#D8EC72', x, 0.06, z, 0.05, 0.02, 0.04);
  pennant(g, owner, 0.34, 0.04, 0.26);
  return g;
}

/** Hạ Long: Hòn Trống Mái, the two kissing rocks, and a junk under red sails. */
function haLong(owner: string) {
  const g = pad(SEA, 0.46);
  for (const [x, lean, h] of [[-0.14, -0.22, 0.6], [0.08, 0.26, 0.52]]) {
    const rock = blob(g, '#8E9A8C', x - 0.06, 0.04 + h / 2, -0.14, 0.11, h / 2, 0.1, true);
    rock.rotation.z = lean;
    const top = blob(g, '#4F9A62', x - 0.06 - lean * 0.2, 0.04 + h * 0.86, -0.14, 0.09, 0.08, 0.08, true);
    top.rotation.z = lean;
  }
  blob(g, '#8E9A8C', 0.32, 0.14, -0.2, 0.09, 0.16, 0.08, true);
  blob(g, '#4F9A62', 0.32, 0.27, -0.2, 0.075, 0.06, 0.065, true);
  // junk
  const junk = new THREE.Group();
  put(junk, soft(0.34, 0.07, 0.11, 0.03), toy('#7A4A2A'), 0, 0, 0);
  put(junk, soft(0.1, 0.06, 0.1, 0.02), toy('#B9793F'), 0.1, 0.06, 0);
  for (const [x, h] of [[-0.09, 0.3], [0.03, 0.36], [0.13, 0.24]]) {
    put(junk, cyl(0.008, 0.008, h, 5), toy('#4A2A1E'), x, h / 2 + 0.03, 0);
    const sail = put(junk, new THREE.PlaneGeometry(0.13, h * 0.72, 1, 3), toy('#D9482F', { double: true }), x - 0.01, h * 0.58 + 0.03, 0.005);
    sail.rotation.y = 0.5;
  }
  junk.position.set(0.06, 0.09, 0.2);
  junk.rotation.y = -0.4;
  g.add(junk);
  pennant(g, owner, -0.36, 0.04, 0.2);
  return g;
}

/** Phú Quốc: a palm-fringed island beach with a thatched hut and a sunshade. */
function daoNgoc(owner: string) {
  const g = pad(SEA, 0.46);
  const island = put(g, cyl(0.34, 0.37, 0.06, 28), toy(SAND), -0.02, 0.07, -0.02);
  island.scale.z = 0.85;
  blob(g, '#63BF6C', -0.12, 0.1, -0.14, 0.18, 0.07, 0.13);
  // hut on stilts
  for (const x of [-0.06, 0.1]) for (const z of [-0.06, 0.06]) put(g, cyl(0.012, 0.012, 0.1, 5), toy(WOOD_DARK), x + 0.06, 0.15, z - 0.02);
  put(g, soft(0.22, 0.11, 0.18, 0.02), toy(WOOD), 0.08, 0.25, -0.02);
  const roof = flaredRoof(0.17, 0.16, toy(THATCH, { flat: true }));
  roof.position.set(0.08, 0.3, -0.02);
  g.add(roof);
  // sunshade and towel
  put(g, cyl(0.006, 0.006, 0.18, 5), toy(WHITE), -0.16, 0.19, 0.16);
  put(g, new THREE.ConeGeometry(0.1, 0.05, 8), toy('#E5484D', { flat: true }), -0.16, 0.29, 0.16);
  put(g, box(0.1, 0.012, 0.05), toy('#FFD23F'), -0.06, 0.106, 0.2);
  blob(g, '#FF8A3D', 0.2, 0.105, 0.18, 0.03, 0.01, 0.03);
  miniPalm(g, -0.24, -0.02, 0.44);
  miniPalm(g, 0.26, -0.14, 0.36);
  // little boat offshore
  put(g, soft(0.14, 0.035, 0.05, 0.015), toy('#3B82F6'), 0.28, 0.06, 0.3).rotation.y = 0.5;
  pennant(g, owner, 0.08, 0.44, -0.02);
  return g;
}

export const LANDMARKS: Record<number, { name: string; make: (owner: string) => THREE.Group }> = {
  1: { name: 'Thác Bản Giốc', make: banGioc },
  3: { name: 'Cột cờ Lũng Cú', make: lungCu },
  6: { name: 'Tượng đài Chiến thắng', make: tuongDai },
  8: { name: 'Đồi chè Mộc Châu', make: doiChe },
  9: { name: 'Đỉnh Fansipan', make: fansipan },
  11: { name: 'Biển Hồ', make: bienHo },
  13: { name: 'Voi Buôn Đôn', make: voi },
  14: { name: 'Ga Đà Lạt', make: gaDaLat },
  16: { name: 'Tháp Đôi', make: thapDoi },
  18: { name: 'Ngọ Môn', make: ngoMon },
  19: { name: 'Chùa Cầu', make: chuaCau },
  21: { name: 'Tháp nước Phan Thiết', make: thapNuoc },
  23: { name: 'Tháp Trầm Hương', make: tramHuong },
  24: { name: 'Hải đăng Vũng Tàu', make: haiDang },
  26: { name: 'Tràng An', make: trangAn },
  27: { name: 'Hòn Trống Mái', make: haLong },
  29: { name: 'Bãi biển đảo ngọc', make: daoNgoc },
  31: { name: 'Cầu Cần Thơ', make: cauCanTho },
  32: { name: 'Nhà hát lớn', make: nhaHat },
  34: { name: 'Cầu Rồng', make: cauRong },
  37: { name: 'Hồ Gươm', make: hoGuom },
  39: { name: 'Bitexco', make: bitexco },
};

type Style = 'stilt' | 'hoian' | 'tube';
const STYLE: Record<GroupId, Style> = {
  brown: 'stilt',
  lightblue: 'stilt',
  pink: 'stilt',
  orange: 'hoian',
  red: 'tube',
  yellow: 'tube',
  green: 'tube',
  darkblue: 'tube',
};

/** The building for a square at a given level (1 to 4 houses, 5 = hotel or landmark). */
export function buildingFor(sq: number, level: number, group: GroupId, groupColor: string, owner: string) {
  const style = STYLE[group];
  const wall = mixHex(groupColor, '#ffffff', 0.45);
  if (level >= 5) {
    if (LANDMARKS[sq]) return LANDMARKS[sq].make(owner);
    if (style === 'stilt') return nhaRong(owner, group === 'pink' ? 1.15 : 0.62);
    if (style === 'hoian') return pagoda(owner);
    return resortHotel(wall, owner);
  }
  if (style === 'stilt') return stiltHouse(level, owner);
  if (style === 'hoian') return hoiAnHouse(level, owner);
  return tubeHouse(level, wall, owner);
}

// ---------- props that live on special squares ----------

/** Owner's flag for a bought plot with nothing built on it yet. */
export function flag(owner: string) {
  const g = new THREE.Group();
  put(g, cyl(0.035, 0.045, 0.04, 10), toy(WHITE), 0, 0.02, 0);
  put(g, cyl(0.014, 0.014, 0.46, 6), toy(WHITE), 0, 0.25, 0);
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.26, -0.08);
  s.lineTo(0, -0.16);
  s.closePath();
  const f = put(g, new THREE.ShapeGeometry(s), toy(owner, { double: true }), 0, 0.47, 0);
  f.name = 'cloth';
  put(g, ball(0.024), toy('#FFD23F'), 0, 0.49, 0);
  return g;
}

/** A little passenger jet for the airports. */
export function planeProp() {
  const g = new THREE.Group();
  const body = put(g, new THREE.CapsuleGeometry(0.075, 0.34, 6, 14), toy(WHITE), 0, 0.17, 0);
  body.rotation.z = Math.PI / 2;
  put(g, soft(0.13, 0.03, 0.56, 0.012), toy('#DDE6EE'), 0.01, 0.16, 0);
  put(g, soft(0.08, 0.025, 0.24, 0.01), toy('#DDE6EE'), 0.22, 0.2, 0);
  const fin = put(g, soft(0.1, 0.14, 0.025, 0.01), toy('#E5484D'), 0.22, 0.28, 0);
  fin.rotation.z = -0.35;
  put(g, ball(0.02), toy('#FFD23F'), 0.215, 0.29, 0.015);
  put(g, soft(0.2, 0.035, 0.155, 0.012), toy('#5BB8F5'), -0.08, 0.195, 0);
  for (const z of [-0.14, 0.14]) put(g, cyl(0.028, 0.028, 0.09, 10), toy('#8E99A8'), -0.01, 0.12, z).rotation.z = Math.PI / 2;
  for (const [x, z] of [[-0.14, 0], [0.06, -0.07], [0.06, 0.07]]) put(g, cyl(0.022, 0.022, 0.08, 8), toy('#3A3F4A'), x, 0.05, z);
  g.rotation.y = 0.5;
  return g;
}

/** A big friendly lightning bolt for the power company. */
export function powerProp() {
  const g = new THREE.Group();
  put(g, cyl(0.2, 0.22, 0.06, 20), toy('#8E99A8'), 0, 0.03, 0);
  const s = new THREE.Shape();
  s.moveTo(0.05, 0.56);
  s.lineTo(-0.17, 0.22);
  s.lineTo(-0.03, 0.22);
  s.lineTo(-0.09, 0);
  s.lineTo(0.17, 0.33);
  s.lineTo(0.03, 0.33);
  s.lineTo(0.11, 0.56);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
  geo.translate(0, 0.08, -0.045);
  const bolt = put(g, geo, toy('#FFC400'));
  bolt.rotation.y = -Math.PI / 4;
  bolt.name = 'spin';
  return g;
}

/** A blue water tower for the water company. */
export function waterProp() {
  const g = new THREE.Group();
  for (const x of [-0.11, 0.11]) for (const z of [-0.11, 0.11]) put(g, cyl(0.02, 0.02, 0.3, 6), toy('#8E99A8'), x, 0.15, z);
  put(g, cyl(0.2, 0.18, 0.24, 20), toy('#3FB5D9'), 0, 0.42, 0);
  put(g, cyl(0.21, 0.21, 0.035, 20), toy(WHITE), 0, 0.46, 0);
  put(g, new THREE.ConeGeometry(0.22, 0.14, 20), toy('#2E8FB3'), 0, 0.61, 0);
  put(g, ball(0.03), toy(WHITE), 0, 0.69, 0);
  return g;
}

/** A red lì xì envelope for the Khí vận squares. */
export function lixiProp() {
  const g = new THREE.Group();
  const env = new THREE.Group();
  put(env, soft(0.28, 0.38, 0.05, 0.02), toy('#E5484D'), 0, 0, 0);
  put(env, cyl(0.06, 0.06, 0.06, 16), toy('#FFD23F'), 0, 0.04, 0).rotation.x = Math.PI / 2;
  put(env, box(0.28, 0.025, 0.055), toy('#FFD23F'), 0, 0.13, 0);
  env.rotation.set(-0.25, Math.PI / 4, 0, 'YXZ');
  env.position.y = 0.3;
  env.name = 'bob';
  g.add(env);
  return g;
}

/** A blue mystery box for the Cơ hội squares. */
export function mysteryProp() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#FFFDF7';
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#2F7FE0';
  x.beginPath();
  x.roundRect(8, 8, 112, 112, 18);
  x.fill();
  x.fillStyle = '#ffffff';
  x.font = '800 96px "Baloo 2", system-ui, sans-serif';
  x.textAlign = 'center';
  x.fillText('?', 64, 98);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const cube = put(g, box(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.3, 0);
  cube.name = 'bob';
  return g;
}

/** The jail cage. */
export function cageProp() {
  const g = new THREE.Group();
  const bar = toy('#5C6B80');
  put(g, soft(0.72, 0.05, 0.72, 0.02), bar, 0, 0.72, 0);
  for (let k = 0; k < 4; k++) {
    const t = -0.3 + k * 0.2;
    for (const [x, z] of [[t, 0.33], [t, -0.33], [0.33, t], [-0.33, t]]) put(g, cyl(0.02, 0.02, 0.7, 6), bar, x, 0.35, z);
  }
  return g;
}

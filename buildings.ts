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

export const LANDMARKS: Record<number, { name: string; make: (owner: string) => THREE.Group }> = {
  39: { name: 'Bitexco', make: bitexco },
  37: { name: 'Hồ Gươm', make: hoGuom },
  34: { name: 'Cầu Rồng', make: cauRong },
  32: { name: 'Nhà hát lớn', make: nhaHat },
  31: { name: 'Cầu Cần Thơ', make: cauCanTho },
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

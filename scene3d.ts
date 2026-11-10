// The 3D board: a little toy island seen as a diamond from the Go corner, with chunky squares,
// a paddy-field centre, cartoon buildings, painted tokens and tumbling dice.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOARD, GROUPS, OWNABLE } from './board';
import { LANDMARKS, buildingFor, cageProp, flag, lixiProp, mysteryProp, planeProp, powerProp, waterProp } from './buildings';
import { bannerPole, buildDecor } from './decor';
import { lotCenter, standSpot, tileCenter, tileRect, TILE_TOP, UNITS } from './layout';
import { paintBanner, paintBoard, paintCenter } from './texture';
import { DIRECTIONAL, sculpt } from './tokens3d';
import type { GameState, TokenId } from './types';

export interface SceneView {
  state: GameState;
  shown: Record<string, number>;
  highlight: number | null;
}

const HALF = UNITS / 2;
const w = (u: number) => u - HALF; // board units -> world x / z
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => {
  const c = 1.6;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const CAM_DIST = 60;
const ELEVATION = THREE.MathUtils.degToRad(37);
const TILE_BODY = '#FFFDF7';
const DICE_AT = new THREE.Vector3(1.85, 0, 1.85);
const SIDE = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2); // screen-right along the ground
const BACK = new THREE.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2); // away from the camera along the ground

const SPREAD: [number, number][] = [
  [0, 0],
  [-0.5, -0.4],
  [0.5, 0.4],
  [0.5, -0.4],
  [-0.5, 0.4],
  [0, 0.65],
];

// Die faces: +x, -x, +y, -y, +z, -z (opposites add to 7)
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

interface Token {
  group: THREE.Group;
  model: THREE.Object3D;
  directional: boolean;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t0: number;
  dur: number;
  arc: number;
  key: string;
  yaw: number;
}

interface Piece {
  key: string;
  group: THREE.Group;
}

interface Anim {
  t0: number;
  dur: number;
  step: (t: number) => void;
}

export class BoardScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private dir = new THREE.Vector3(Math.cos(ELEVATION) * Math.SQRT1_2, Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.SQRT1_2);
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();
  private home = new THREE.Vector3();
  private center = new THREE.Vector3();
  private pan = new THREE.Vector3();
  private halfW = 10;
  private zoomed = false;
  private width = 1;

  private boardCanvas = document.createElement('canvas');
  private boardTex: THREE.CanvasTexture;
  private tileBodies: THREE.Mesh[] = [];
  private pickables: THREE.Object3D[] = [];
  private tokens = new Map<string, Token>();
  private buildings = new Map<number, Piece>();
  private flags = new Map<number, Piece>();
  private cloths: THREE.Object3D[] = [];
  private bobbers: { o: THREE.Object3D; y: number; phase: number }[] = [];
  private spinners: THREE.Object3D[] = [];
  private dice: THREE.Mesh[] = [];
  private diceRollN: number | null = null;
  private highlightFrame: THREE.Group;
  private highlightSq: number | null = null;
  private turnRing: THREE.Mesh;
  private turnId: string | null = null;
  private anims = new Set<Anim>();
  private paintKey = '';
  private ownKey = '';
  private lastState: GameState | null = null;
  private raf = 0;
  private frame = 0;
  private disposed = false;
  private down: { x: number; y: number; moved: number } | null = null;
  private raycaster = new THREE.Raycaster();

  constructor(private canvas: HTMLCanvasElement, private onTile: (i: number) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Bright, even daylight: a soft sky fill plus a sun from the front-left.
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#CFE8B9', 1.75));
    const sun = new THREE.DirectionalLight('#FFF6E0', 1.85);
    sun.position.set(5, 14, 11);
    sun.castShadow = true;
    const big = Math.min(window.innerWidth, window.innerHeight) > 600;
    sun.shadow.mapSize.set(big ? 2048 : 1536, big ? 2048 : 1536);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    // The island: a sandy slab on a chunk of earth.
    const slab = new THREE.Mesh(new RoundedBoxGeometry(12.9, 0.5, 12.9, 3, 0.2), new THREE.MeshStandardMaterial({ color: '#EAD9A8', roughness: 0.9 }));
    slab.position.y = -0.25;
    slab.receiveShadow = true;
    this.scene.add(slab);
    const earth = new THREE.Mesh(new RoundedBoxGeometry(12.5, 0.55, 12.5, 3, 0.25), new THREE.MeshStandardMaterial({ color: '#C4905F', roughness: 0.95 }));
    earth.position.y = -0.7;
    this.scene.add(earth);

    // Centre: paddies, pond, road and the dice yard, painted once.
    const cc = document.createElement('canvas');
    cc.width = cc.height = 1536;
    const centerTex = new THREE.CanvasTexture(cc);
    centerTex.colorSpace = THREE.SRGBColorSpace;
    centerTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const center = new THREE.Mesh(new THREE.PlaneGeometry(9.1, 9.1), new THREE.MeshStandardMaterial({ map: centerTex, roughness: 0.9 }));
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.012;
    center.receiveShadow = true;
    this.scene.add(center);
    paintCenter(cc.getContext('2d')!);
    this.scene.add(buildDecor());

    // The 40 squares: raised blocks with a painted face on top.
    this.boardCanvas.width = this.boardCanvas.height = 2048;
    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTex.colorSpace = THREE.SRGBColorSpace;
    this.boardTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const faceMat = new THREE.MeshStandardMaterial({ map: this.boardTex, roughness: 0.85 });
    const GAP = 0.07;
    const MARGIN = GAP / 2 + 0.055;
    for (let i = 0; i < 40; i++) {
      const r = tileRect(i);
      const c = tileCenter(i);
      const body = new THREE.Mesh(new RoundedBoxGeometry(r.w - GAP, TILE_TOP, r.h - GAP, 3, 0.075), new THREE.MeshStandardMaterial({ color: TILE_BODY, roughness: 0.8 }));
      body.position.set(w(c.x), TILE_TOP / 2, w(c.y));
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.sq = i;
      this.scene.add(body);
      this.tileBodies.push(body);
      const geo = new THREE.PlaneGeometry(r.w - 2 * MARGIN, r.h - 2 * MARGIN);
      const x0 = (r.x + MARGIN) / UNITS;
      const x1 = (r.x + r.w - MARGIN) / UNITS;
      const vTop = 1 - (r.y + MARGIN) / UNITS;
      const vBot = 1 - (r.y + r.h - MARGIN) / UNITS;
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      uv.setXY(0, x0, vTop);
      uv.setXY(1, x1, vTop);
      uv.setXY(2, x0, vBot);
      uv.setXY(3, x1, vBot);
      const face = new THREE.Mesh(geo, faceMat);
      face.rotation.x = -Math.PI / 2;
      face.position.set(w(c.x), TILE_TOP + 0.003, w(c.y));
      face.receiveShadow = true;
      face.userData.sq = i;
      this.scene.add(face);
      this.pickables.push(body, face);
    }

    // Props on the special squares
    for (let i = 0; i < 40; i++) {
      const sq = BOARD[i];
      const make = sq.kind === 'airport' ? planeProp : sq.kind === 'utility' ? (sq.icon === 'power' ? powerProp : waterProp) : sq.kind === 'chance' ? mysteryProp : sq.kind === 'chest' ? lixiProp : null;
      if (!make) continue;
      const lot = lotCenter(i);
      const g = make();
      g.position.set(w(lot.x), TILE_TOP, w(lot.y));
      g.scale.setScalar(1.15);
      this.addPickable(g, i);
      g.traverse((o) => {
        if (o.name === 'bob') this.bobbers.push({ o, y: o.position.y, phase: i });
        if (o.name === 'spin') this.spinners.push(o);
      });
    }
    const cage = cageProp();
    cage.position.set(w(1.03), TILE_TOP, w(10.97));
    this.addPickable(cage, 10);

    // Banner logo strung between two bamboo poles
    const bc = document.createElement('canvas');
    bc.width = 1024;
    bc.height = 320;
    const bannerTex = new THREE.CanvasTexture(bc);
    bannerTex.colorSpace = THREE.SRGBColorSpace;
    const BW = 4.6;
    const BH = (BW * 320) / 1024;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, toneMapped: false }));
    const anchor = new THREE.Vector3(-0.6, 0, -0.6);
    this.placeCamera(new THREE.Vector3());
    banner.quaternion.copy(this.camera.quaternion);
    banner.position.copy(anchor).add(new THREE.Vector3(0, 0.55, 0)).addScaledVector(this.up, BH / 2);
    this.scene.add(banner);
    for (const s of [-1, 1]) {
      const pole = bannerPole(2.35);
      pole.position.copy(anchor).addScaledVector(SIDE, s * (BW / 2 + 0.02));
      pole.position.y = 0.012;
      this.scene.add(pole);
    }
    const paintStatic = () => {
      paintBanner(bc.getContext('2d')!);
      bannerTex.needsUpdate = true;
    };
    paintStatic();

    // Repaint once the web fonts are ready so every label uses the rounded display face.
    Promise.all(['800 24px "Baloo 2"', '700 24px "Baloo 2"'].map((f) => document.fonts?.load(f, 'Khởi hành ₫').catch(() => null))).then(() => {
      if (this.disposed) return;
      paintStatic();
      this.paintKey = '';
      if (this.lastState) this.paint(this.lastState);
    });

    // Highlight frame and turn ring
    const hlMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, toneMapped: false });
    this.highlightFrame = new THREE.Group();
    for (let k = 0; k < 4; k++) this.highlightFrame.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), hlMat));
    this.highlightFrame.visible = false;
    this.scene.add(this.highlightFrame);
    this.turnRing = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.41, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, toneMapped: false, side: THREE.DoubleSide }));
    this.turnRing.rotation.x = -Math.PI / 2;
    this.turnRing.visible = false;
    this.scene.add(this.turnRing);

    // Dice: white with a red one and four
    const faceMats = [1, 2, 3, 4, 5, 6].reduce<Record<number, THREE.Material>>((acc, v) => {
      acc[v] = new THREE.MeshStandardMaterial({ map: dieFace(v), roughness: 0.5 });
      return acc;
    }, {});
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.62, 0.62, 4, 0.11),
        FACE_VALUES.map((v) => faceMats[v]),
      );
      d.castShadow = true;
      d.userData.rest = DICE_AT.clone().addScaledVector(SIDE, s * 0.46).setY(0.012 + 0.31);
      d.position.copy(d.userData.rest);
      this.scene.add(d);
      this.dice.push(d);
    }

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    this.raf = requestAnimationFrame(this.loop);
  }

  private addPickable(g: THREE.Object3D, sq: number) {
    g.traverse((o) => (o.userData.sq = sq));
    this.scene.add(g);
    this.pickables.push(g);
  }

  // ---------- camera ----------

  private placeCamera(center: THREE.Vector3) {
    this.camera.position.copy(center).addScaledVector(this.dir, CAM_DIST);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();
    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
  }

  resize(width: number, height: number) {
    if (!width || !height) return;
    this.width = width;
    this.renderer.setSize(width, height, false);
    // Frame the whole island, plus room for the tallest buildings.
    this.placeCamera(new THREE.Vector3());
    const pts = [
      [-6.5, -0.95, -6.5],
      [6.5, -0.95, -6.5],
      [-6.5, -0.95, 6.5],
      [6.5, -0.95, 6.5],
      [-5.6, 2.0, -5.6],
      [-5.6, 2.1, 5.6],
      [5.6, 2.1, -5.6],
      [4.9, 2.75, 4.0],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      const x = p.dot(this.right);
      const y = p.dot(this.up);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    this.home.set(0, 0, 0).addScaledVector(this.right, (minX + maxX) / 2).addScaledVector(this.up, (minY + maxY) / 2);
    const aspect = width / height;
    let hw = ((maxX - minX) / 2) * 1.01;
    let hh = ((maxY - minY) / 2) * 1.02;
    if (hw / hh > aspect) hh = hw / aspect;
    else hw = hh * aspect;
    this.halfW = hw;
    Object.assign(this.camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    this.camera.updateProjectionMatrix();
    if (!this.zoomed) this.center.copy(this.home);
    this.placeCamera(this.center);
  }

  /** Close-up that follows the player whose turn it is; drag to look around. */
  setZoom(on: boolean) {
    this.zoomed = on;
    this.pan.set(0, 0, 0);
  }

  private zoomLevel() {
    return THREE.MathUtils.clamp((this.halfW * 2) / 9.5, 1.5, 2.6);
  }

  // ---------- state sync ----------

  update(view: SceneView) {
    const { state } = view;
    this.lastState = state;
    this.paint(state);
    this.syncTokens(view);
    this.syncBuildings(state);
    this.syncHighlight(view.highlight);
    const turnId = state.phase === 'playing' ? state.players[state.turn]?.id ?? null : null;
    if (turnId !== this.turnId) this.pan.set(0, 0, 0);
    this.turnId = turnId;
    this.syncDice(state);
  }

  private paint(state: GameState) {
    const key = JSON.stringify([state.pot, OWNABLE.map((i) => [state.props[i]?.owner, state.props[i]?.mortgaged]), state.players.map((p) => p.color)]);
    if (key === this.paintKey) return;
    this.paintKey = key;
    paintBoard(this.boardCanvas.getContext('2d')!, state);
    this.boardTex.needsUpdate = true;
  }

  private tokenSpot(view: SceneView, id: string, pos: number, inJail: boolean) {
    const { state, shown } = view;
    const here = state.players.filter((p) => !p.bankrupt && (shown[p.id] ?? p.pos) === pos && (p.inJail && (shown[p.id] ?? p.pos) === p.pos) === inJail);
    const k = Math.max(0, here.findIndex((p) => p.id === id));
    const [dx, dy] = here.length > 1 ? SPREAD[k % SPREAD.length] : [0, 0];
    let c = standSpot(pos);
    if (pos === 10) c = inJail ? { x: 1.03, y: 10.97 } : { x: 0.42, y: 11.55 };
    const s = pos === 10 ? 0.26 : pos % 10 === 0 ? 0.5 : 0.34;
    return new THREE.Vector3(w(c.x + dx * s), TILE_TOP, w(c.y + dy * s));
  }

  private syncTokens(view: SceneView) {
    const { state, shown } = view;
    const now = performance.now();
    const alive = new Set(state.players.filter((p) => !p.bankrupt).map((p) => p.id));
    for (const [id, t] of this.tokens) {
      if (!alive.has(id)) {
        this.scene.remove(t.group);
        this.tokens.delete(id);
      }
    }
    for (const p of state.players) {
      if (p.bankrupt) continue;
      const pos = shown[p.id] ?? p.pos;
      const inJail = p.inJail && pos === p.pos;
      let t = this.tokens.get(p.id);
      const target = this.tokenSpot(view, p.id, pos, inJail);
      const key = `${p.token}:${p.color}`;
      const yaw = travelYaw(pos);
      if (!t || t.key !== key) {
        if (t) this.scene.remove(t.group);
        t = this.makeToken(p.token, p.color, target);
        t.yaw = yaw;
        t.model.rotation.y = t.directional ? yaw : 0;
        this.tokens.set(p.id, t);
        continue;
      }
      t.yaw = yaw;
      if (!t.to.equals(target)) {
        const dist = t.group.position.distanceTo(target);
        t.from = t.group.position.clone();
        t.to = target;
        t.t0 = now;
        const walk = dist < 1.9;
        t.dur = reduceMotion() ? 1 : walk ? 105 : 520;
        t.arc = walk ? 0.34 : 1.3;
      }
    }
  }

  private makeToken(token: TokenId, color: string, at: THREE.Vector3): Token {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.1, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
    base.position.y = 0.045;
    base.castShadow = true;
    g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.024, 8, 36), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.1;
    g.add(rim);
    const model = sculpt(token);
    model.position.y = 0.1;
    g.add(model);
    g.position.copy(at);
    this.scene.add(g);
    return { group: g, model, directional: !!DIRECTIONAL[token], from: at.clone(), to: at.clone(), t0: 0, dur: 1, arc: 0, key: `${token}:${color}`, yaw: 0 };
  }

  private syncBuildings(state: GameState) {
    let changed = false;
    for (const i of OWNABLE) {
      const sq = BOARD[i];
      const ps = state.props[i];
      const owner = ps?.owner ? state.players.find((p) => p.id === ps.owner) : null;
      const level = sq.kind === 'street' && owner ? ps.houses : 0;
      const lot = lotCenter(i);

      const key = owner && level > 0 ? `${level}:${owner.color}` : '';
      const cur = this.buildings.get(i);
      if ((cur?.key ?? '') !== key) {
        changed = true;
        const prevLevel = cur ? Number(cur.key.split(':')[0]) : 0;
        if (cur) this.removePiece(cur);
        this.buildings.delete(i);
        if (key && sq.kind === 'street' && owner) {
          const g = buildingFor(i, level, sq.group, GROUPS[sq.group].color, owner.color);
          const scale = level >= 5 && LANDMARKS[i] && i !== 39 ? 1.22 : 1.12;
          g.scale.setScalar(scale);
          g.position.set(w(lot.x), TILE_TOP, w(lot.y));
          this.addPickable(g, i);
          this.buildings.set(i, { key, group: g });
          if (level > prevLevel && !reduceMotion()) {
            const startY = level < 5 && prevLevel > 0 ? prevLevel / level : 0.05;
            this.animate(level >= 5 ? 900 : 520, (t) => {
              g.scale.y = scale * (startY + (1 - startY) * easeOutBack(t));
            });
          }
        }
      }

      // Owner's flag on bought squares with nothing built (also on airports and utilities)
      const fkey = owner && level === 0 && !ps.mortgaged ? owner.color : '';
      const f = this.flags.get(i);
      if ((f?.key ?? '') !== fkey) {
        changed = true;
        if (f) this.removePiece(f);
        this.flags.delete(i);
        if (fkey) {
          const g = flag(fkey);
          const street = sq.kind === 'street';
          g.position.set(w(lot.x) + (street ? 0 : -0.26), TILE_TOP, w(lot.y) + (street ? 0 : -0.2));
          this.addPickable(g, i);
          this.flags.set(i, { key: fkey, group: g });
          if (!reduceMotion()) this.animate(420, (t) => g.scale.setScalar(Math.max(0.01, easeOutBack(t))));
        }
      }
    }

    // Tint each owned square's block in its owner's colour.
    const ownKey = OWNABLE.map((i) => `${state.props[i]?.owner ?? ''}${state.props[i]?.mortgaged ? 'm' : ''}`).join('|');
    if (ownKey !== this.ownKey) {
      this.ownKey = ownKey;
      for (const i of OWNABLE) {
        const ps = state.props[i];
        const owner = ps?.owner ? state.players.find((p) => p.id === ps.owner) : null;
        const mat = this.tileBodies[i].material as THREE.MeshStandardMaterial;
        mat.color.set(ps?.mortgaged ? '#CFCFCF' : owner ? owner.color : TILE_BODY);
      }
    }
    if (changed) {
      this.cloths = [];
      for (const p of [...this.buildings.values(), ...this.flags.values()]) p.group.traverse((o) => o.name === 'cloth' && this.cloths.push(o));
    }
  }

  private removePiece(p: Piece) {
    this.scene.remove(p.group);
    this.pickables = this.pickables.filter((o) => o !== p.group);
  }

  private syncHighlight(sq: number | null) {
    if (sq === this.highlightSq) return;
    this.highlightSq = sq;
    if (sq === null) {
      this.highlightFrame.visible = false;
      return;
    }
    const r = tileRect(sq);
    const [top, bottom, left, right] = this.highlightFrame.children as THREE.Mesh[];
    const t = 0.09;
    const x0 = w(r.x) + 0.05;
    const z0 = w(r.y) + 0.05;
    const ww = r.w - 0.1;
    const hh = r.h - 0.1;
    const y = TILE_TOP + 0.03;
    top.scale.set(ww, 1, t);
    top.position.set(x0 + ww / 2, y, z0 + t / 2);
    bottom.scale.set(ww, 1, t);
    bottom.position.set(x0 + ww / 2, y, z0 + hh - t / 2);
    left.scale.set(t, 1, hh);
    left.position.set(x0 + t / 2, y, z0 + hh / 2);
    right.scale.set(t, 1, hh);
    right.position.set(x0 + ww - t / 2, y, z0 + hh / 2);
    this.highlightFrame.visible = true;
  }

  private syncDice(state: GameState) {
    const [a, b] = state.dice;
    const finals = [a, b].map((v, k) => {
      const n = FACE_NORMALS[FACE_VALUES.indexOf(v)];
      const q = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 1, 0));
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (k ? -0.3 : 0.25) + ((state.rollN * 0.9) % 0.5));
      return yaw.multiply(q);
    });
    if (this.diceRollN === null || reduceMotion()) {
      this.diceRollN = state.rollN;
      this.dice.forEach((d, k) => d.quaternion.copy(finals[k]));
      return;
    }
    if (state.rollN === this.diceRollN) return;
    this.diceRollN = state.rollN;
    this.dice.forEach((d, k) => {
      const rest = d.userData.rest as THREE.Vector3;
      const from = rest.clone().addScaledVector(BACK, 2.6).addScaledVector(SIDE, k ? 1.1 : -1.1);
      const start = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const spin = new THREE.Quaternion();
      this.animate(950 + k * 80, (t) => {
        const e = easeOut(t);
        const bounce = Math.abs(Math.cos(t * Math.PI * 2.6)) * (1 - t) ** 1.7;
        d.position.lerpVectors(from, rest, e);
        d.position.y = rest.y + 2.2 * bounce;
        spin.setFromAxisAngle(axis, (1 - e) * Math.PI * 5);
        d.quaternion.copy(start).slerp(finals[k], e).premultiply(spin);
        if (t >= 1) d.quaternion.copy(finals[k]);
      });
    });
  }

  // ---------- animation loop ----------

  private animate(dur: number, step: (t: number) => void) {
    const a = { t0: performance.now(), dur, step };
    this.anims.add(a);
    step(0);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.frame++;

    let busy = this.anims.size > 0;
    for (const a of this.anims) {
      const t = Math.min(1, (now - a.t0) / a.dur);
      a.step(t);
      if (t >= 1) this.anims.delete(a);
    }
    for (const t of this.tokens.values()) {
      const k = Math.min(1, (now - t.t0) / t.dur);
      if (k < 1) busy = true;
      t.group.position.lerpVectors(t.from, t.to, easeOut(k));
      t.group.position.y = TILE_TOP + Math.sin(Math.PI * k) * t.arc;
      if (t.directional) {
        let d = t.yaw - t.model.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > 0.002) {
          t.model.rotation.y += d * 0.18;
          busy = true;
        }
      }
    }

    // Camera: whole island, or a close-up that follows the player on turn.
    const tok = this.turnId ? this.tokens.get(this.turnId) : null;
    const target = this.zoomed && tok ? tok.group.position.clone().add(this.pan) : this.home;
    const zoom = this.zoomed ? this.zoomLevel() : 1;
    if (this.center.distanceToSquared(target) > 1e-5 || Math.abs(this.camera.zoom - zoom) > 1e-3) {
      const k = reduceMotion() ? 1 : 0.14;
      this.center.lerp(target, k);
      this.camera.zoom += (zoom - this.camera.zoom) * k;
      this.camera.updateProjectionMatrix();
      this.placeCamera(this.center);
      busy = true;
    }

    // Idle scenes only need ~30 fps for the gentle motion.
    if (!busy && this.frame % 2) return;

    const pulse = (Math.sin(now / 300) + 1) / 2;
    if (this.highlightFrame.visible) ((this.highlightFrame.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.5 * pulse;
    this.turnRing.visible = !!tok;
    if (tok) {
      this.turnRing.position.set(tok.group.position.x, TILE_TOP + 0.012, tok.group.position.z);
      const phase = (now / 1300) % 1;
      const s = 1 + 0.5 * phase;
      this.turnRing.scale.set(s, s, s);
      (this.turnRing.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - phase);
    }
    for (const c of this.cloths) c.rotation.y = Math.sin(now / 380 + c.id) * 0.35;
    for (const b of this.bobbers) {
      b.o.position.y = b.y + Math.sin(now / 520 + b.phase) * 0.035;
    }
    for (const s of this.spinners) s.rotation.y = -Math.PI / 4 + Math.sin(now / 900) * 0.5;
    this.renderer.render(this.scene, this.camera);
  };

  // ---------- pointer: tap a square, drag to pan while zoomed ----------

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, moved: 0 };
  };

  private onMove = (e: PointerEvent) => {
    if (!this.down) return;
    const dx = e.clientX - this.down.x;
    const dy = e.clientY - this.down.y;
    this.down.x = e.clientX;
    this.down.y = e.clientY;
    this.down.moved += Math.abs(dx) + Math.abs(dy);
    if (!this.zoomed) return;
    const wpp = (this.halfW * 2) / this.camera.zoom / this.width;
    this.pan.addScaledVector(this.right, -dx * wpp).addScaledVector(this.up, dy * wpp);
    this.pan.clampLength(0, 9);
    this.center.addScaledVector(this.right, -dx * wpp).addScaledVector(this.up, dy * wpp);
    this.placeCamera(this.center);
  };

  private onCancel = () => {
    this.down = null;
  };

  private onUp = (e: PointerEvent) => {
    if (!this.down) return;
    const moved = this.down.moved;
    this.down = null;
    if (moved > 10) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
    if (hit && typeof hit.object.userData.sq === 'number') this.onTile(hit.object.userData.sq);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
    this.renderer.dispose();
  }
}

/** Direction of travel along each side, as a yaw for models whose front points along -x. */
function travelYaw(pos: number) {
  return [0, -Math.PI / 2, Math.PI, Math.PI / 2][Math.floor(pos / 10)];
}

function dieFace(v: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFDF7';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = v === 1 || v === 4 ? '#E5484D' : '#3A2B23';
  const r = v === 1 ? 18 : 12;
  for (const [x, y] of PIPS[v]) {
    g.beginPath();
    g.arc(x * 128, y * 128, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

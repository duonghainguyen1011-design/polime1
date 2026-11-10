// Paints the faces of the 40 squares, the paddy-field centre and the banner logo into canvases used as 3D textures.
import { BOARD, GO_SALARY, GROUPS } from './board';
import { vndShort } from './format';
import { faceAngle, LOT_OFFSET, tileCenter, tileRect, UNITS } from './layout';
import type { GameState } from './types';

const INK = '#3A2B23';
const DISPLAY = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';

export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

type Ctx = CanvasRenderingContext2D;

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function wrap(c: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width <= maxW || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Centred bold text, wrapped to at most two lines and shrunk to fit. Returns the y below the last line. */
function title(c: Ctx, text: string, cx: number, top: number, maxW: number, size: number, color = INK, weight = 800) {
  let fs = size;
  let lines: string[] = [];
  for (; fs > size * 0.62; fs -= 1) {
    c.font = `${weight} ${fs}px ${DISPLAY}`;
    lines = wrap(c, text, maxW);
    if (lines.length <= 2 && lines.every((l) => c.measureText(l).width <= maxW)) break;
  }
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillStyle = color;
  const lh = fs * 0.98;
  let y = top + fs * 0.82;
  for (const l of lines) {
    c.fillText(l, cx, y);
    y += lh;
  }
  return y - fs * 0.82 + fs * 0.1;
}

function text(c: Ctx, t: string, cx: number, baseline: number, size: number, color: string, weight = 700) {
  c.font = `${weight} ${size}px ${DISPLAY}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillStyle = color;
  c.fillText(t, cx, baseline);
}

function star(c: Ctx, cx: number, cy: number, R: number, color: string) {
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? R * 0.42 : R;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

/** Faces of all 40 squares in one atlas. Each face is drawn in its own upright frame. */
export function paintBoard(c: Ctx, state: GameState) {
  const size = c.canvas.width;
  const S = size / UNITS;
  c.fillStyle = '#FFFDF7';
  c.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const sq = BOARD[i];
    const r = tileRect(i);
    const ctr = tileCenter(i);
    const ps = state.props[i];
    const owner = ps?.owner ? state.players.find((p) => p.id === ps.owner) : null;
    const u = (v: number) => v * S;

    c.save();
    c.beginPath();
    c.rect(u(r.x), u(r.y), u(r.w), u(r.h));
    c.clip();
    c.translate(u(ctr.x), u(ctr.y));
    c.rotate(faceAngle(i));
    const fill = (color: string) => {
      c.fillStyle = color;
      c.fillRect(u(-1.2), u(-1.2), u(2.4), u(2.4));
    };
    // Shared layout for edge squares (local frame: 1 wide, 1.5 tall, "up" is away from the camera).
    const plot = (color: string, inner: string) => {
      rr(c, u(-0.39), u(-LOT_OFFSET - 0.31), u(0.78), u(0.62), u(0.1));
      c.fillStyle = color;
      c.fill();
      rr(c, u(-0.33), u(-LOT_OFFSET - 0.25), u(0.66), u(0.5), u(0.07));
      c.fillStyle = inner;
      c.fill();
    };
    const nameAndPrice = (name: string, price: string, priceColor: string) => {
      const bottom = title(c, name, 0, u(0.02), u(0.8), u(0.2));
      text(c, price, 0, Math.max(bottom + u(0.13), u(0.5)), u(0.16), priceColor);
    };

    switch (sq.kind) {
      case 'street': {
        const g = GROUPS[sq.group].color;
        fill(mix(g, '#ffffff', 0.84));
        plot(g, mix(g, '#ffffff', 0.3));
        nameAndPrice(sq.short, vndShort(sq.price), mix(g, '#000000', 0.42));
        break;
      }
      case 'airport':
        fill('#EAF6FF');
        plot('#8FCBFA', '#CFE9FF');
        // runway stripes
        c.fillStyle = '#ffffff';
        for (let k = -2; k <= 2; k++) c.fillRect(u(k * 0.13 - 0.04), u(-LOT_OFFSET - 0.015), u(0.08), u(0.03));
        nameAndPrice(sq.short, vndShort(sq.price), '#2F6FB0');
        break;
      case 'utility':
        if (sq.icon === 'power') {
          fill('#FFF8DC');
          plot('#FFD23F', '#FFEFA6');
          nameAndPrice(sq.short, vndShort(sq.price), '#9A6B00');
        } else {
          fill('#E6F8FB');
          plot('#5CCFE0', '#C2EEF4');
          nameAndPrice(sq.short, vndShort(sq.price), '#157A8A');
        }
        break;
      case 'chance':
        fill('#4D9BF0');
        c.beginPath();
        c.arc(0, u(-LOT_OFFSET), u(0.33), 0, Math.PI * 2);
        c.fillStyle = '#7BB8F7';
        c.fill();
        title(c, 'Cơ hội', 0, u(0.1), u(0.82), u(0.21), '#ffffff');
        text(c, '?', 0, u(0.62), u(0.22), '#CFE5FF', 800);
        break;
      case 'chest':
        fill('#F0596B');
        c.beginPath();
        c.arc(0, u(-LOT_OFFSET), u(0.33), 0, Math.PI * 2);
        c.fillStyle = '#F78A97';
        c.fill();
        title(c, 'Khí vận', 0, u(0.1), u(0.82), u(0.21), '#ffffff');
        star(c, 0, u(0.54), u(0.09), '#FFD23F');
        break;
      case 'tax': {
        fill('#EFE9FB');
        c.beginPath();
        c.arc(0, u(-LOT_OFFSET), u(0.27), 0, Math.PI * 2);
        c.fillStyle = '#E0A100';
        c.fill();
        c.beginPath();
        c.arc(0, u(-LOT_OFFSET), u(0.22), 0, Math.PI * 2);
        c.fillStyle = '#FFD23F';
        c.fill();
        text(c, '₫', 0, u(-LOT_OFFSET + 0.1), u(0.3), '#9A6B00', 800);
        const bottom = title(c, sq.short, 0, u(0.02), u(0.8), u(0.2));
        text(c, `−${vndShort(sq.amount)}`, 0, Math.max(bottom + u(0.13), u(0.5)), u(0.16), '#D6336C');
        break;
      }
      case 'go': {
        fill('#FFD23F');
        // Arrow pointing along the direction of play (toward the first square)
        c.save();
        c.translate(u(-0.2), u(-0.38));
        c.rotate((-3 * Math.PI) / 4);
        c.beginPath();
        c.moveTo(u(0.24), 0);
        c.lineTo(u(0.02), u(-0.2));
        c.lineTo(u(0.02), u(-0.08));
        c.lineTo(u(-0.22), u(-0.08));
        c.lineTo(u(-0.22), u(0.08));
        c.lineTo(u(0.02), u(0.08));
        c.lineTo(u(0.02), u(0.2));
        c.closePath();
        c.fillStyle = '#E5484D';
        c.strokeStyle = '#ffffff';
        c.lineWidth = u(0.04);
        c.lineJoin = 'round';
        c.stroke();
        c.fill();
        c.restore();
        title(c, 'Khởi hành', u(0.06), u(-0.14), u(1.3), u(0.28));
        text(c, `Nhận ${vndShort(GO_SALARY)}`, u(0.06), u(0.34), u(0.17), '#8A5A00');
        break;
      }
      case 'jail': {
        fill('#DCE8F5');
        // Cell floor in the corner nearest the board centre (drawn in the board's own frame)
        c.save();
        c.rotate(-faceAngle(i));
        c.fillStyle = '#FFB648';
        c.fillRect(u(-0.02), u(-0.75), u(0.77), u(0.77));
        c.strokeStyle = '#E8922A';
        c.lineWidth = u(0.05);
        for (let k = 0; k < 6; k++) {
          c.beginPath();
          c.moveTo(u(-0.02 + k * 0.15), u(-0.75));
          c.lineTo(u(-0.02 + k * 0.15), u(0.02));
          c.stroke();
        }
        c.restore();
        title(c, 'Nhà giam', u(-0.36), u(-0.02), u(0.9), u(0.2));
        text(c, 'Thăm tù', u(-0.36), u(0.36), u(0.13), '#5C7089');
        break;
      }
      case 'parking': {
        fill('#C9F0D6');
        rr(c, u(-0.2), u(-0.6), u(0.4), u(0.4), u(0.09));
        c.fillStyle = '#3B82F6';
        c.fill();
        text(c, 'P', 0, u(-0.28), u(0.36), '#ffffff', 800);
        title(c, 'Bãi đỗ xe', 0, u(-0.12), u(1.3), u(0.22));
        const pot = state.pot ? `Quỹ ${vndShort(state.pot)}` : 'Quỹ trống';
        c.font = `700 ${u(0.15)}px ${DISPLAY}`;
        const pw = c.measureText(pot).width + u(0.2);
        rr(c, -pw / 2, u(0.18), pw, u(0.25), u(0.125));
        c.fillStyle = state.pot ? '#FFD23F' : '#ffffff';
        c.fill();
        text(c, pot, 0, u(0.36), u(0.15), '#5A4300');
        break;
      }
      case 'gotojail': {
        fill('#FF9E8C');
        // Padlock
        c.strokeStyle = '#ffffff';
        c.lineWidth = u(0.07);
        c.beginPath();
        c.arc(0, u(-0.42), u(0.12), Math.PI, 0);
        c.stroke();
        rr(c, u(-0.19), u(-0.42), u(0.38), u(0.3), u(0.07));
        c.fillStyle = '#ffffff';
        c.fill();
        c.beginPath();
        c.arc(0, u(-0.27), u(0.05), 0, Math.PI * 2);
        c.fillStyle = '#E5484D';
        c.fill();
        title(c, 'Vào tù', 0, u(0.0), u(1.2), u(0.26), '#5A1410');
        break;
      }
    }

    if (owner && r.side !== 'corner') {
      c.fillStyle = owner.color;
      c.fillRect(u(-0.6), u(0.57), u(1.2), u(0.3));
    }
    if (ps?.mortgaged) {
      c.fillStyle = 'rgba(235,235,235,0.72)';
      c.fillRect(u(-1.2), u(-1.2), u(2.4), u(2.4));
      c.strokeStyle = 'rgba(58,43,35,0.22)';
      c.lineWidth = u(0.04);
      for (let k = -1.6; k < 1.6; k += 0.16) {
        c.beginPath();
        c.moveTo(u(k), u(1));
        c.lineTo(u(k + 1.2), u(-1));
        c.stroke();
      }
    }
    c.restore();
  }
}

function rand(seed: number) {
  let t = seed;
  return () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };
}

/** The 9 x 9 centre: grass, a road ring, rice paddies, a lotus pond and a yard for the dice. */
export function paintCenter(c: Ctx) {
  const size = c.canvas.width;
  const S = size / 9;
  const u = (v: number) => v * S;
  const rnd = rand(7);

  c.fillStyle = '#8FD46A';
  c.fillRect(0, 0, size, size);
  for (let k = 0; k < 90; k++) {
    c.beginPath();
    c.ellipse(u(rnd() * 9), u(rnd() * 9), u(0.25 + rnd() * 0.5), u(0.14 + rnd() * 0.2), 0, 0, Math.PI * 2);
    c.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(40,120,50,0.07)';
    c.fill();
  }

  // Road ring just inside the squares
  rr(c, u(0.55), u(0.55), u(7.9), u(7.9), u(0.9));
  c.lineWidth = u(0.66);
  c.strokeStyle = '#7F8A99';
  c.stroke();
  c.lineWidth = u(0.56);
  c.strokeStyle = '#A3ADBA';
  c.stroke();
  c.setLineDash([u(0.22), u(0.2)]);
  c.lineWidth = u(0.045);
  c.strokeStyle = '#ffffff';
  c.stroke();
  c.setLineDash([]);

  // Rice paddies (toward the right corner of the diamond)
  const paddies: [number, number, number, number, string][] = [
    [5.75, 1.25, 1.0, 1.05, '#B9E468'],
    [6.85, 1.25, 1.1, 1.05, '#D8EC72'],
    [5.75, 2.4, 0.85, 1.15, '#A6DC5C'],
    [6.7, 2.4, 1.25, 1.15, '#C6E66A'],
  ];
  for (const [x, y, w, h, color] of paddies) {
    rr(c, u(x), u(y), u(w), u(h), u(0.12));
    c.fillStyle = '#C9A66B';
    c.fill();
    rr(c, u(x + 0.05), u(y + 0.05), u(w - 0.1), u(h - 0.1), u(0.09));
    c.fillStyle = color;
    c.fill();
    c.fillStyle = 'rgba(60,140,60,0.5)';
    for (let yy = y + 0.2; yy < y + h - 0.12; yy += 0.17) {
      for (let xx = x + 0.2; xx < x + w - 0.12; xx += 0.17) c.fillRect(u(xx), u(yy), u(0.035), u(0.07));
    }
  }

  // Lotus pond (toward the left corner)
  c.beginPath();
  c.ellipse(u(2.2), u(6.8), u(1.32), u(1.05), 0.3, 0, Math.PI * 2);
  c.fillStyle = '#F1DDA4';
  c.fill();
  c.beginPath();
  c.ellipse(u(2.2), u(6.8), u(1.2), u(0.93), 0.3, 0, Math.PI * 2);
  c.fillStyle = '#5AC8EE';
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = u(0.03);
  for (const [x, y, r] of [[1.85, 6.55, 0.3], [2.65, 7.1, 0.24], [2.05, 7.25, 0.18]]) {
    c.beginPath();
    c.arc(u(x), u(y), u(r), 0.3, 2.2);
    c.stroke();
  }
  for (const [x, y, r] of [[1.5, 6.45, 0.14], [1.75, 7.2, 0.11], [2.85, 6.65, 0.13], [2.5, 6.2, 0.1], [3.0, 7.2, 0.09]]) {
    c.beginPath();
    c.moveTo(u(x), u(y));
    c.arc(u(x), u(y), u(r), 0.5, Math.PI * 2 + 0.1);
    c.closePath();
    c.fillStyle = '#3FAE5A';
    c.fill();
  }

  // Packed-earth yard where the dice land (toward the Go corner)
  c.beginPath();
  c.arc(u(6.35), u(6.35), u(1.42), 0, Math.PI * 2);
  c.fillStyle = '#DCC58B';
  c.fill();
  c.beginPath();
  c.arc(u(6.35), u(6.35), u(1.32), 0, Math.PI * 2);
  c.fillStyle = '#EDDCAA';
  c.fill();

  // Wild flowers
  for (let k = 0; k < 70; k++) {
    const x = 1.2 + rnd() * 6.6;
    const y = 1.2 + rnd() * 6.6;
    const inYard = Math.hypot(x - 6.35, y - 6.35) < 1.5;
    const inPond = Math.hypot(x - 2.2, y - 6.8) < 1.45;
    const inPaddy = x > 5.6 && x < 8.1 && y > 1.1 && y < 3.7;
    if (inYard || inPond || inPaddy) continue;
    c.beginPath();
    c.arc(u(x), u(y), u(0.035), 0, Math.PI * 2);
    c.fillStyle = ['#ffffff', '#FFE45C', '#FF9CC0'][k % 3];
    c.fill();
  }
}

/** Red cloth banner with gold lettering, strung between two bamboo poles. */
export function paintBanner(c: Ctx) {
  const w = c.canvas.width;
  const h = c.canvas.height;
  c.clearRect(0, 0, w, h);
  // cloth with a gentle sag
  c.beginPath();
  c.moveTo(0, h * 0.06);
  c.quadraticCurveTo(w / 2, h * 0.16, w, h * 0.06);
  c.lineTo(w, h * 0.86);
  c.quadraticCurveTo(w / 2, h * 0.98, 0, h * 0.86);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#F0484F');
  g.addColorStop(1, '#D62F3C');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = h * 0.035;
  c.strokeStyle = '#FFD23F';
  c.stroke();
  for (const x of [w * 0.085, w * 0.915]) star(c, x, h * 0.49, h * 0.15, '#FFD23F');
  c.font = `800 ${h * 0.62}px ${DISPLAY}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.lineJoin = 'round';
  c.lineWidth = h * 0.09;
  c.strokeStyle = '#8F1522';
  c.strokeText('Polime', w / 2, h * 0.73);
  c.fillStyle = '#FFE45C';
  c.fillText('Polime', w / 2, h * 0.73);
}

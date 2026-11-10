// Board geometry shared by the 3D board.
// Units: the board is 12 x 12 (corners 1.5, edge squares 1). Origin top-left, y grows toward the Go corner.

export type Side = 'bottom' | 'left' | 'top' | 'right' | 'corner';

/** Grid cell (1-based) for each of the 40 squares, Go at bottom-right, play runs clockwise. */
export function cellOf(i: number): { row: number; col: number; side: Side } {
  if (i === 0) return { row: 11, col: 11, side: 'corner' };
  if (i < 10) return { row: 11, col: 11 - i, side: 'bottom' };
  if (i === 10) return { row: 11, col: 1, side: 'corner' };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: 'left' };
  if (i === 20) return { row: 1, col: 1, side: 'corner' };
  if (i < 30) return { row: 1, col: 1 + (i - 20), side: 'top' };
  if (i === 30) return { row: 1, col: 11, side: 'corner' };
  return { row: 1 + (i - 30), col: 11, side: 'right' };
}

export const UNITS = 12;
export const TILE_TOP = 0.26; // height of the raised tile blocks
export const start = (c: number) => (c === 1 ? 0 : c === 11 ? 10.5 : 1.5 + (c - 2));
export const span = (c: number) => (c === 1 || c === 11 ? 1.5 : 1);

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  side: Side;
}

export function tileRect(i: number): Rect {
  const { row, col, side } = cellOf(i);
  return { x: start(col), y: start(row), w: span(col), h: span(row), side };
}

export const tileCenter = (i: number) => {
  const r = tileRect(i);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

// The camera looks at the board from the Go corner, so the board appears as a diamond.
// Each square's face is rotated so its text reads upright from there:
// bottom and top rows as painted, left and right columns turned a quarter, corners turned an eighth.
export function faceAngle(i: number) {
  const { side } = cellOf(i);
  if (side === 'corner') return -Math.PI / 4;
  return side === 'left' || side === 'right' ? -Math.PI / 2 : 0;
}

/** Distance from a square's centre to its building plot, along the face's "up" direction. */
export const LOT_OFFSET = 0.34;

/** Where a building stands (board units). Always on the half of the square farther from the camera, so it never hides the name. */
export function lotCenter(i: number) {
  const { side } = cellOf(i);
  const c = tileCenter(i);
  if (side === 'corner') return c;
  return side === 'left' || side === 'right' ? { x: c.x - LOT_OFFSET, y: c.y } : { x: c.x, y: c.y - LOT_OFFSET };
}

/** Where tokens stand on a square: the half nearer the camera. */
export function standSpot(i: number) {
  const { side } = cellOf(i);
  const c = tileCenter(i);
  if (side === 'corner') return c;
  return side === 'left' || side === 'right' ? { x: c.x + 0.3, y: c.y } : { x: c.x, y: c.y + 0.3 };
}

// Money is stored in base units. 1 unit = 10.000₫.
export const UNIT = 10000;

const group3 = (n: number) => {
  const s = Math.abs(Math.round(n)).toString();
  return (n < 0 ? '-' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** Full amount, e.g. 2.000.000₫ */
export const vnd = (base: number) => `${group3(base * UNIT)}₫`;

/** Compact amount for tiles, e.g. 600k, 2tr, 3,5tr */
export const vndShort = (base: number) => {
  const v = base * UNIT;
  if (Math.abs(v) >= 1_000_000) {
    const m = v / 1_000_000;
    const txt = Number.isInteger(m) ? String(m) : (Math.round(m * 10) / 10).toString().replace('.', ',');
    return `${txt}tr`;
  }
  return `${Math.round(v / 1000)}k`;
};

// Money is stored in base units. 1 unit = 10.000₫.
import { getLang, type Lang } from './i18n';

export const UNIT = 10000;

const group3 = (n: number, sep: string) => {
  const s = Math.abs(Math.round(n)).toString();
  return (n < 0 ? '-' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
};

/** Full amount: 2.000.000₫ in Vietnamese, 2,000,000₫ in English. */
export const vnd = (base: number, lang: Lang = getLang()) => `${group3(base * UNIT, lang === 'en' ? ',' : '.')}₫`;

/** Compact amount for tiles: 600k, 2tr, 3,5tr in Vietnamese; 600k, 2M, 3.5M in English. */
export const vndShort = (base: number, lang: Lang = getLang()) => {
  const v = base * UNIT;
  if (Math.abs(v) >= 1_000_000) {
    const m = Math.round((v / 1_000_000) * 10) / 10;
    return lang === 'en' ? `${m}M` : `${String(m).replace('.', ',')}tr`;
  }
  return `${Math.round(v / 1000)}k`;
};

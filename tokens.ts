import type { TokenId } from './types';

export const TOKENS: { id: TokenId; label: string }[] = [
  { id: 'non-la', label: 'Nón lá' },
  { id: 'xich-lo', label: 'Xích lô' },
  { id: 'xe-may', label: 'Xe máy' },
  { id: 'pho', label: 'Tô phở' },
  { id: 'hoa-sen', label: 'Hoa sen' },
  { id: 'trau', label: 'Con trâu' },
  { id: 'den-long', label: 'Đèn lồng' },
  { id: 'ca-phe', label: 'Cà phê phin' },
];

// Player discs: lacquer pigments, distinct from each other and readable under gold icons.
export const PLAYER_COLORS = ['#B23A2E', '#23735A', '#2C4C8C', '#B7791F', '#6E3B78', '#1C7C86'];

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

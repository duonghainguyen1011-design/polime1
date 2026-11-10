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

// Player colours: bright toy paints, easy to tell apart on the board.
export const PLAYER_COLORS = ['#E5484D', '#2FA866', '#3B82F6', '#F59E0B', '#A855F7', '#14B8C4'];

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

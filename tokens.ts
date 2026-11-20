import type { TokenId } from './types';

export const TOKENS: { id: TokenId; label: string; labelEn: string }[] = [
  { id: 'non-la', label: 'Nón lá', labelEn: 'Conical hat' },
  { id: 'xich-lo', label: 'Xích lô', labelEn: 'Cyclo' },
  { id: 'xe-may', label: 'Xe máy', labelEn: 'Scooter' },
  { id: 'pho', label: 'Tô phở', labelEn: 'Phở bowl' },
  { id: 'hoa-sen', label: 'Hoa sen', labelEn: 'Lotus' },
  { id: 'trau', label: 'Con trâu', labelEn: 'Water buffalo' },
  { id: 'den-long', label: 'Đèn lồng', labelEn: 'Lantern' },
  { id: 'ca-phe', label: 'Cà phê phin', labelEn: 'Phin coffee' },
];

// Player colours: bright toy paints, easy to tell apart on the board.
export const PLAYER_COLORS = ['#E5484D', '#2FA866', '#3B82F6', '#F59E0B', '#A855F7', '#14B8C4'];

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

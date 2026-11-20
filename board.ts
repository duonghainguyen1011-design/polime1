// Polime board: 40 squares, money in base units (1 unit = 10.000₫).

export type Group =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue';

export interface StreetSq {
  kind: 'street';
  name: string;
  short: string;
  tagline: string;
  group: Group;
  price: number;
  house: number;
  /** Rent by level: [empty land, 1 house, 2 houses, 3 houses, landmark]. Levels 3 and 4 need the whole colour group, so their figures already include the group bonus. */
  rent: number[];
}
export interface AirportSq {
  kind: 'airport';
  name: string;
  short: string;
  tagline: string;
  price: number;
}
export interface UtilitySq {
  kind: 'utility';
  name: string;
  short: string;
  tagline: string;
  price: number;
  icon: 'power' | 'water';
}
export interface TaxSq {
  kind: 'tax';
  name: string;
  short: string;
  amount: number;
}
export interface SimpleSq {
  kind: 'go' | 'jail' | 'parking' | 'gotojail' | 'chance' | 'chest';
  name: string;
  short: string;
}
export type Square = StreetSq | AirportSq | UtilitySq | TaxSq | SimpleSq;
export type Ownable = StreetSq | AirportSq | UtilitySq;

export const GO_SALARY = 200;
export const START_CASH = 1500;
export const JAIL_FINE = 50;
export const JAIL_POS = 10;
/** Levels 1 to 3 are houses, level 4 is the city's landmark. */
export const MAX_LEVEL = 4;
/** Levels 1 and 2 can be built on any city you own; higher levels need the whole colour group. */
export const FREE_LEVELS = 2;
/** Owning the whole colour group multiplies rent on empty land and on 1 or 2 houses. */
export const GROUP_BONUS_EMPTY = 2;
export const GROUP_BONUS_HOUSES = 1.5;
export const HOUSE_SUPPLY = 88; // enough for every city, since any city can take two houses
export const HOTEL_SUPPLY = 22;

export const GROUPS: Record<Group, { label: string; color: string; ink: string }> = {
  brown: { label: 'Đông Bắc', color: '#C98F62', ink: '#33200F' },
  lightblue: { label: 'Tây Bắc', color: '#7FD3F2', ink: '#10303B' },
  pink: { label: 'Tây Nguyên', color: '#FF9CC0', ink: '#431527' },
  orange: { label: 'Miền Trung', color: '#FFAB4A', ink: '#402105' },
  red: { label: 'Duyên hải', color: '#F2675C', ink: '#3D0F0B' },
  yellow: { label: 'Danh thắng', color: '#FFD23F', ink: '#3D2F00' },
  green: { label: 'Đô thị lớn', color: '#52C173', ink: '#0D3319' },
  darkblue: { label: 'Hai trung tâm', color: '#4F7FE6', ink: '#FFFFFF' },
};

const st = (
  name: string,
  short: string,
  tagline: string,
  group: Group,
  price: number,
  house: number,
  rent: number[],
): StreetSq => ({ kind: 'street', name, short, tagline, group, price, house, rent });

export const BOARD: Square[] = [
  { kind: 'go', name: 'Khởi hành', short: 'Khởi hành' },
  st('Cao Bằng', 'Cao Bằng', 'Thác Bản Giốc giữa biên cương', 'brown', 60, 50, [2, 10, 20, 70, 200]),
  { kind: 'chest', name: 'Khí vận', short: 'Khí vận' },
  st('Hà Giang', 'Hà Giang', 'Cao nguyên đá Đồng Văn', 'brown', 60, 50, [4, 15, 45, 145, 360]),
  { kind: 'tax', name: 'Thuế thu nhập', short: 'Thuế', amount: 200 },
  { kind: 'airport', name: 'Sân bay Nội Bài', short: 'Nội Bài', tagline: 'Cửa ngõ phía Bắc', price: 200 },
  st('Điện Biên', 'Điện Biên', 'Cánh đồng Mường Thanh', 'lightblue', 100, 50, [6, 20, 70, 215, 440]),
  { kind: 'chance', name: 'Cơ hội', short: 'Cơ hội' },
  st('Mộc Châu', 'Mộc Châu', 'Đồi chè và mùa hoa mận', 'lightblue', 100, 50, [6, 20, 70, 215, 440]),
  st('Sa Pa', 'Sa Pa', 'Thị trấn trong sương', 'lightblue', 120, 50, [8, 30, 75, 240, 480]),
  { kind: 'jail', name: 'Nhà giam', short: 'Nhà giam' },
  st('Pleiku', 'Pleiku', 'Biển Hồ trên miệng núi lửa cổ', 'pink', 140, 100, [10, 40, 110, 360, 600]),
  { kind: 'utility', name: 'Công ty Điện lực', short: 'Điện lực', tagline: 'Thắp sáng mọi miền', price: 150, icon: 'power' },
  st('Buôn Ma Thuột', 'Ban Mê', 'Thủ phủ cà phê', 'pink', 140, 100, [10, 40, 110, 360, 600]),
  st('Đà Lạt', 'Đà Lạt', 'Thành phố ngàn hoa', 'pink', 160, 100, [12, 45, 135, 400, 720]),
  { kind: 'airport', name: 'Sân bay Cát Bi', short: 'Cát Bi', tagline: 'Đường bay ra biển Đông Bắc', price: 200 },
  st('Quy Nhơn', 'Quy Nhơn', 'Biển xanh Kỳ Co, Eo Gió', 'orange', 180, 100, [14, 50, 150, 440, 760]),
  { kind: 'chest', name: 'Khí vận', short: 'Khí vận' },
  st('Huế', 'Huế', 'Cố đô bên dòng sông Hương', 'orange', 180, 100, [14, 50, 150, 440, 760]),
  st('Hội An', 'Hội An', 'Phố cổ đèn lồng', 'orange', 200, 100, [16, 60, 165, 480, 800]),
  { kind: 'parking', name: 'Bãi đỗ xe', short: 'Bãi đỗ xe' },
  st('Phan Thiết', 'Phan Thiết', 'Đồi cát bay Mũi Né', 'red', 220, 150, [18, 70, 190, 560, 840]),
  { kind: 'chance', name: 'Cơ hội', short: 'Cơ hội' },
  st('Nha Trang', 'Nha Trang', 'Vịnh biển xanh ngọc', 'red', 220, 150, [18, 70, 190, 560, 840]),
  st('Vũng Tàu', 'Vũng Tàu', 'Bãi biển gần Sài Gòn nhất', 'red', 240, 150, [20, 75, 225, 600, 880]),
  { kind: 'airport', name: 'Sân bay Cam Ranh', short: 'Cam Ranh', tagline: 'Đón gió biển miền Trung', price: 200 },
  st('Ninh Bình', 'Ninh Bình', 'Tràng An non nước', 'yellow', 260, 150, [22, 80, 250, 640, 920]),
  st('Hạ Long', 'Hạ Long', 'Kỳ quan vịnh đá vôi', 'yellow', 260, 150, [22, 80, 250, 640, 920]),
  { kind: 'utility', name: 'Công ty Cấp nước', short: 'Cấp nước', tagline: 'Nước sạch đến từng nhà', price: 150, icon: 'water' },
  st('Phú Quốc', 'Phú Quốc', 'Đảo ngọc phương Nam', 'yellow', 280, 150, [24, 90, 270, 680, 960]),
  { kind: 'gotojail', name: 'Vào tù', short: 'Vào tù' },
  st('Cần Thơ', 'Cần Thơ', 'Chợ nổi Cái Răng', 'green', 300, 200, [26, 100, 290, 720, 1020]),
  st('Hải Phòng', 'Hải Phòng', 'Thành phố hoa phượng đỏ', 'green', 300, 200, [26, 100, 290, 720, 1020]),
  { kind: 'chest', name: 'Khí vận', short: 'Khí vận' },
  st('Đà Nẵng', 'Đà Nẵng', 'Cầu Rồng bên sông Hàn', 'green', 320, 200, [28, 110, 340, 800, 1120]),
  { kind: 'airport', name: 'Sân bay Tân Sơn Nhất', short: 'Tân Sơn Nhất', tagline: 'Cửa ngõ phương Nam', price: 200 },
  { kind: 'chance', name: 'Cơ hội', short: 'Cơ hội' },
  st('Hà Nội', 'Hà Nội', 'Ngàn năm văn hiến', 'darkblue', 350, 200, [35, 130, 375, 880, 1200]),
  { kind: 'tax', name: 'Thuế xa xỉ', short: 'Thuế xa xỉ', amount: 100 },
  st('TP. Hồ Chí Minh', 'Sài Gòn', 'Hòn ngọc Viễn Đông', 'darkblue', 400, 200, [50, 150, 450, 1120, 1600]),
];

/** Each city's level 4 landmark. */
export const LANDMARK_NAME: Record<number, string> = {
  1: 'Thác Bản Giốc',
  3: 'Cột cờ Lũng Cú',
  6: 'Tượng đài Chiến thắng',
  8: 'Đồi chè Mộc Châu',
  9: 'Đỉnh Fansipan',
  11: 'Biển Hồ',
  13: 'Voi Buôn Đôn',
  14: 'Ga Đà Lạt',
  16: 'Tháp Đôi',
  18: 'Ngọ Môn',
  19: 'Chùa Cầu',
  21: 'Tháp nước Phan Thiết',
  23: 'Tháp Trầm Hương',
  24: 'Hải đăng Vũng Tàu',
  26: 'Tràng An',
  27: 'Hòn Trống Mái',
  29: 'Bãi biển đảo ngọc',
  31: 'Cầu Cần Thơ',
  32: 'Nhà hát lớn',
  34: 'Cầu Rồng',
  37: 'Hồ Gươm',
  39: 'Bitexco',
};

export const isOwnable = (sq: Square): sq is Ownable =>
  sq.kind === 'street' || sq.kind === 'airport' || sq.kind === 'utility';

export const OWNABLE: number[] = BOARD.map((s, i) => (isOwnable(s) ? i : -1)).filter((i) => i >= 0);
export const AIRPORTS: number[] = BOARD.map((s, i) => (s.kind === 'airport' ? i : -1)).filter((i) => i >= 0);
export const UTILITIES: number[] = BOARD.map((s, i) => (s.kind === 'utility' ? i : -1)).filter((i) => i >= 0);
export const GROUP_SQS: Record<Group, number[]> = Object.fromEntries(
  (Object.keys(GROUPS) as Group[]).map((g) => [
    g,
    BOARD.map((s, i) => (s.kind === 'street' && s.group === g ? i : -1)).filter((i) => i >= 0),
  ]),
) as Record<Group, number[]>;

export const ownable = (i: number): Ownable => {
  const s = BOARD[i];
  if (!isOwnable(s)) throw new Error('Ô này không thể sở hữu');
  return s;
};

export const mortgageValue = (i: number) => ownable(i).price / 2;
export const unmortgageCost = (i: number) => Math.round(ownable(i).price * 0.55);

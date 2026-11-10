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
  rent: number[]; // [base, 1 house, 2, 3, 4, hotel]
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
  st('Cao Bằng', 'Cao Bằng', 'Thác Bản Giốc giữa biên cương', 'brown', 60, 50, [2, 10, 30, 90, 160, 250]),
  { kind: 'chest', name: 'Khí vận', short: 'Khí vận' },
  st('Hà Giang', 'Hà Giang', 'Cao nguyên đá Đồng Văn', 'brown', 60, 50, [4, 20, 60, 180, 320, 450]),
  { kind: 'tax', name: 'Thuế thu nhập', short: 'Thuế', amount: 200 },
  { kind: 'airport', name: 'Sân bay Nội Bài', short: 'Nội Bài', tagline: 'Cửa ngõ phía Bắc', price: 200 },
  st('Điện Biên', 'Điện Biên', 'Cánh đồng Mường Thanh', 'lightblue', 100, 50, [6, 30, 90, 270, 400, 550]),
  { kind: 'chance', name: 'Cơ hội', short: 'Cơ hội' },
  st('Mộc Châu', 'Mộc Châu', 'Đồi chè và mùa hoa mận', 'lightblue', 100, 50, [6, 30, 90, 270, 400, 550]),
  st('Sa Pa', 'Sa Pa', 'Thị trấn trong sương', 'lightblue', 120, 50, [8, 40, 100, 300, 450, 600]),
  { kind: 'jail', name: 'Nhà giam', short: 'Nhà giam' },
  st('Pleiku', 'Pleiku', 'Biển Hồ trên miệng núi lửa cổ', 'pink', 140, 100, [10, 50, 150, 450, 625, 750]),
  { kind: 'utility', name: 'Công ty Điện lực', short: 'Điện lực', tagline: 'Thắp sáng mọi miền', price: 150, icon: 'power' },
  st('Buôn Ma Thuột', 'Ban Mê', 'Thủ phủ cà phê', 'pink', 140, 100, [10, 50, 150, 450, 625, 750]),
  st('Đà Lạt', 'Đà Lạt', 'Thành phố ngàn hoa', 'pink', 160, 100, [12, 60, 180, 500, 700, 900]),
  { kind: 'airport', name: 'Sân bay Cát Bi', short: 'Cát Bi', tagline: 'Đường bay ra biển Đông Bắc', price: 200 },
  st('Quy Nhơn', 'Quy Nhơn', 'Biển xanh Kỳ Co, Eo Gió', 'orange', 180, 100, [14, 70, 200, 550, 750, 950]),
  { kind: 'chest', name: 'Khí vận', short: 'Khí vận' },
  st('Huế', 'Huế', 'Cố đô bên dòng sông Hương', 'orange', 180, 100, [14, 70, 200, 550, 750, 950]),
  st('Hội An', 'Hội An', 'Phố cổ đèn lồng', 'orange', 200, 100, [16, 80, 220, 600, 800, 1000]),
  { kind: 'parking', name: 'Bãi đỗ xe', short: 'Bãi đỗ xe' },
  st('Phan Thiết', 'Phan Thiết', 'Đồi cát bay Mũi Né', 'red', 220, 150, [18, 90, 250, 700, 875, 1050]),
  { kind: 'chance', name: 'Cơ hội', short: 'Cơ hội' },
  st('Nha Trang', 'Nha Trang', 'Vịnh biển xanh ngọc', 'red', 220, 150, [18, 90, 250, 700, 875, 1050]),
  st('Vũng Tàu', 'Vũng Tàu', 'Bãi biển gần Sài Gòn nhất', 'red', 240, 150, [20, 100, 300, 750, 925, 1100]),
  { kind: 'airport', name: 'Sân bay Cam Ranh', short: 'Cam Ranh', tagline: 'Đón gió biển miền Trung', price: 200 },
  st('Ninh Bình', 'Ninh Bình', 'Tràng An non nước', 'yellow', 260, 150, [22, 110, 330, 800, 975, 1150]),
  st('Hạ Long', 'Hạ Long', 'Kỳ quan vịnh đá vôi', 'yellow', 260, 150, [22, 110, 330, 800, 975, 1150]),
  { kind: 'utility', name: 'Công ty Cấp nước', short: 'Cấp nước', tagline: 'Nước sạch đến từng nhà', price: 150, icon: 'water' },
  st('Phú Quốc', 'Phú Quốc', 'Đảo ngọc phương Nam', 'yellow', 280, 150, [24, 120, 360, 850, 1025, 1200]),
  { kind: 'gotojail', name: 'Vào tù', short: 'Vào tù' },
  st('Cần Thơ', 'Cần Thơ', 'Chợ nổi Cái Răng', 'green', 300, 200, [26, 130, 390, 900, 1100, 1275]),
  st('Hải Phòng', 'Hải Phòng', 'Thành phố hoa phượng đỏ', 'green', 300, 200, [26, 130, 390, 900, 1100, 1275]),
  { kind: 'chest', name: 'Khí vận', short: 'Khí vận' },
  st('Đà Nẵng', 'Đà Nẵng', 'Cầu Rồng bên sông Hàn', 'green', 320, 200, [28, 150, 450, 1000, 1200, 1400]),
  { kind: 'airport', name: 'Sân bay Tân Sơn Nhất', short: 'Tân Sơn Nhất', tagline: 'Cửa ngõ phương Nam', price: 200 },
  { kind: 'chance', name: 'Cơ hội', short: 'Cơ hội' },
  st('Hà Nội', 'Hà Nội', 'Ngàn năm văn hiến', 'darkblue', 350, 200, [35, 175, 500, 1100, 1300, 1500]),
  { kind: 'tax', name: 'Thuế xa xỉ', short: 'Thuế xa xỉ', amount: 100 },
  st('TP. Hồ Chí Minh', 'Sài Gòn', 'Hòn ngọc Viễn Đông', 'darkblue', 400, 200, [50, 200, 600, 1400, 1700, 2000]),
];

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

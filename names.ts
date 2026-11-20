// English names for the board, and helpers that pick the viewer's language.
import { BOARD, GROUPS, LANDMARK_NAME, type Group } from './board';
import { t } from './i18n';

/** English for each square: [name, short label, tagline]. Vietnamese city names stay as they are. */
const SQUARE_EN: Record<number, [string, string, string?]> = {
  0: ['Go', 'Go'],
  1: ['Cao Bằng', 'Cao Bằng', 'Bản Giốc falls on the northern border'],
  2: ['Fortune', 'Fortune'],
  3: ['Hà Giang', 'Hà Giang', 'The Đồng Văn stone plateau'],
  4: ['Income Tax', 'Tax'],
  5: ['Nội Bài Airport', 'Nội Bài', 'Gateway to the north'],
  6: ['Điện Biên', 'Điện Biên', 'The Mường Thanh valley'],
  7: ['Chance', 'Chance'],
  8: ['Mộc Châu', 'Mộc Châu', 'Tea hills and plum blossom'],
  9: ['Sa Pa', 'Sa Pa', 'The town in the mist'],
  10: ['Jail', 'Jail'],
  11: ['Pleiku', 'Pleiku', 'A lake in an old volcano'],
  12: ['Electric Company', 'Power', 'Lighting up every region'],
  13: ['Buôn Ma Thuột', 'Ban Mê', 'Capital of coffee'],
  14: ['Đà Lạt', 'Đà Lạt', 'City of a thousand flowers'],
  15: ['Cát Bi Airport', 'Cát Bi', 'Flights to the northeast coast'],
  16: ['Quy Nhơn', 'Quy Nhơn', 'The blue sea of Kỳ Co and Eo Gió'],
  17: ['Fortune', 'Fortune'],
  18: ['Huế', 'Huế', 'The old capital on the Perfume River'],
  19: ['Hội An', 'Hội An', 'The old town of lanterns'],
  20: ['Free Parking', 'Parking'],
  21: ['Phan Thiết', 'Phan Thiết', 'The drifting dunes of Mũi Né'],
  22: ['Chance', 'Chance'],
  23: ['Nha Trang', 'Nha Trang', 'A jade-green bay'],
  24: ['Vũng Tàu', 'Vũng Tàu', 'The closest beach to Saigon'],
  25: ['Cam Ranh Airport', 'Cam Ranh', 'Sea breeze of central Vietnam'],
  26: ['Ninh Bình', 'Ninh Bình', 'Rivers and peaks of Tràng An'],
  27: ['Hạ Long', 'Hạ Long', 'A wonder of limestone islands'],
  28: ['Water Works', 'Water', 'Clean water to every home'],
  29: ['Phú Quốc', 'Phú Quốc', 'The pearl island of the south'],
  30: ['Go to Jail', 'Go to Jail'],
  31: ['Cần Thơ', 'Cần Thơ', 'The Cái Răng floating market'],
  32: ['Hải Phòng', 'Hải Phòng', 'City of red flame trees'],
  33: ['Fortune', 'Fortune'],
  34: ['Đà Nẵng', 'Đà Nẵng', 'The Dragon Bridge over the Hàn River'],
  35: ['Tân Sơn Nhất Airport', 'Tân Sơn Nhất', 'Gateway to the south'],
  36: ['Chance', 'Chance'],
  37: ['Hà Nội', 'Hà Nội', 'A thousand years of culture'],
  38: ['Luxury Tax', 'Luxury Tax'],
  39: ['Hồ Chí Minh City', 'Sài Gòn', 'Pearl of the Far East'],
};

const GROUP_EN: Record<Group, string> = {
  brown: 'Northeast',
  lightblue: 'Northwest',
  pink: 'Central Highlands',
  orange: 'Central Coast',
  red: 'South Coast',
  yellow: 'Scenic Wonders',
  green: 'Big Cities',
  darkblue: 'Two Capitals',
};

const LANDMARK_EN: Record<number, string> = {
  1: 'Bản Giốc Waterfall',
  3: 'Lũng Cú Flag Tower',
  6: 'Victory Monument',
  8: 'Mộc Châu Tea Hills',
  9: 'Fansipan Peak',
  11: 'Biển Hồ Lake',
  13: 'Buôn Đôn Elephant',
  14: 'Đà Lạt Station',
  16: 'Twin Towers',
  18: 'Ngọ Môn Gate',
  19: 'Japanese Bridge',
  21: 'Phan Thiết Water Tower',
  23: 'Trầm Hương Tower',
  24: 'Vũng Tàu Lighthouse',
  26: 'Tràng An',
  27: 'Kissing Rocks',
  29: 'Pearl Island Beach',
  31: 'Cần Thơ Bridge',
  32: 'Opera House',
  34: 'Dragon Bridge',
  37: 'Hoàn Kiếm Lake',
  39: 'Bitexco Tower',
};

const sq = (i: number) => BOARD[i] as { name: string; short: string; tagline?: string };

/** Square names in the viewer's language. */
export const sqName = (i: number) => t(sq(i).name, SQUARE_EN[i]?.[0] ?? sq(i).name);
export const sqShort = (i: number) => t(sq(i).short, SQUARE_EN[i]?.[1] ?? sq(i).short);
export const sqTag = (i: number) => t(sq(i).tagline ?? '', SQUARE_EN[i]?.[2] ?? sq(i).tagline ?? '');
export const groupLabel = (g: Group) => t(GROUPS[g].label, GROUP_EN[g]);
export const landmarkName = (i: number) => t(LANDMARK_NAME[i] ?? 'Công trình', LANDMARK_EN[i] ?? 'Landmark');

/** Both languages at once, for game log lines that every player reads in their own language. */
export const nameEn = (i: number) => SQUARE_EN[i]?.[0] ?? sq(i).name;

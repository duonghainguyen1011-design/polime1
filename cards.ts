// Cơ hội (Chance) and Khí vận (Fortune) cards, in Vietnamese and English.
import { t } from './i18n';
import { vnd } from './format';
import { sqShort } from './names';

export type CardEffect =
  | { k: 'money'; amount: number } // + receive from bank, - pay into Free Parking pot
  | { k: 'advance'; to: number }
  | { k: 'nearestAirport' }
  | { k: 'nearestUtility' }
  | { k: 'back'; n: number }
  | { k: 'jail' }
  | { k: 'jailFree' }
  | { k: 'repairs'; house: number; hotel: number }
  | { k: 'payEach'; amount: number }
  | { k: 'collectEach'; amount: number };

export interface Card {
  title: string;
  text: string;
  titleEn: string;
  textEn: string;
  effect: CardEffect;
}

const V = (x: number) => vnd(x, 'vi');
const E = (x: number) => vnd(x, 'en');
const passGo = `Đi qua Khởi hành thì nhận ${V(200)}.`;
const passGoEn = `Collect ${E(200)} if you pass Go.`;
const card = (title: string, text: string, titleEn: string, textEn: string, effect: CardEffect): Card => ({ title, text, titleEn, textEn, effect });

export const CHANCE: Card[] = [
  card('Lên đường', `Về thẳng vạch Khởi hành và nhận ${V(200)}.`, 'Hit the road', `Go straight to Go and collect ${E(200)}.`, { k: 'advance', to: 0 }),
  card('Tắm biển cuối tuần', `Ra Vũng Tàu hóng gió. ${passGo}`, 'Weekend at the beach', `Head to Vũng Tàu for the sea breeze. ${passGoEn}`, { k: 'advance', to: 24 }),
  card('Lên phố núi', `Đi Pleiku ngắm Biển Hồ. ${passGo}`, 'Up to the highlands', `Go to Pleiku to see Biển Hồ lake. ${passGoEn}`, { k: 'advance', to: 11 }),
  card(
    'Sự cố điện nước',
    'Đến công ty Điện lực hoặc Cấp nước gần nhất. Nếu đã có chủ, tung xúc xắc và trả gấp 10 lần số điểm.',
    'Power cut',
    'Go to the nearest power or water company. If it has an owner, roll the dice and pay 10 times the total.',
    { k: 'nearestUtility' },
  ),
  card('Chuyến bay gấp', 'Ra sân bay gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.', 'Urgent flight', 'Go to the nearest airport. If it has an owner, pay double rent.', { k: 'nearestAirport' }),
  card('Hoãn chuyến, đổi vé', 'Ra sân bay gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.', 'Flight changed', 'Go to the nearest airport. If it has an owner, pay double rent.', { k: 'nearestAirport' }),
  card('Cổ tức về tài khoản', `Công ty chia cổ tức. Nhận ${V(50)}.`, 'Dividend paid', `Your shares pay a dividend. Collect ${E(50)}.`, { k: 'money', amount: 50 }),
  card('Thẻ ra tù', 'Giữ thẻ này để ra tù miễn phí khi cần. Có thể dùng sau.', 'Get out of jail', 'Keep this card to leave jail for free when you need to.', { k: 'jailFree' }),
  card('Quên ví ở quán', 'Quay lại 3 ô để lấy ví.', 'Left your wallet', 'Go back 3 squares to fetch it.', { k: 'back', n: 3 }),
  card('Vượt đèn đỏ', 'Bị giữ lại. Vào tù ngay, không đi qua Khởi hành.', 'Ran a red light', 'Go straight to jail. Do not pass Go.', { k: 'jail' }),
  card(
    'Bảo dưỡng mùa mưa',
    `Trả ${V(25)} cho mỗi nhà và ${V(100)} cho mỗi công trình biểu tượng bạn sở hữu.`,
    'Rainy season repairs',
    `Pay ${E(25)} for each house and ${E(100)} for each landmark you own.`,
    { k: 'repairs', house: 25, hotel: 100 },
  ),
  card('Chạy quá tốc độ', `Nộp phạt ${V(15)}.`, 'Speeding ticket', `Pay a ${E(15)} fine.`, { k: 'money', amount: -15 }),
  card('Chuyến bay sớm', `Ra sân bay Nội Bài. ${passGo}`, 'Early flight', `Go to Nội Bài Airport. ${passGoEn}`, { k: 'advance', to: 5 }),
  card('Hẹn ở Sài Gòn', 'Đi thẳng đến TP. Hồ Chí Minh.', 'Meeting in Saigon', 'Go straight to Hồ Chí Minh City.', { k: 'advance', to: 39 }),
  card('Làm trưởng nhóm', `Bạn được bầu làm trưởng nhóm. Đãi mỗi người chơi ${V(50)}.`, 'Team leader', `You were made team leader. Treat every player to ${E(50)}.`, { k: 'payEach', amount: 50 }),
  card('Khoản vay đáo hạn', `Khoản đầu tư sinh lời. Nhận ${V(150)}.`, 'Investment pays off', `Your investment matures. Collect ${E(150)}.`, { k: 'money', amount: 150 }),
];

export const CHEST: Card[] = [
  card('Lên đường', `Về thẳng vạch Khởi hành và nhận ${V(200)}.`, 'Hit the road', `Go straight to Go and collect ${E(200)}.`, { k: 'advance', to: 0 }),
  card('Ngân hàng nhầm lẫn', `Lỗi có lợi cho bạn. Nhận ${V(200)}.`, 'Bank error', `A bank error in your favour. Collect ${E(200)}.`, { k: 'money', amount: 200 }),
  card('Khám sức khỏe', `Trả ${V(50)} tiền khám.`, 'Check-up', `Pay ${E(50)} for a doctor's visit.`, { k: 'money', amount: -50 }),
  card('Bán cổ phiếu', `Chốt lời đúng lúc. Nhận ${V(50)}.`, 'Sold your shares', `Good timing. Collect ${E(50)}.`, { k: 'money', amount: 50 }),
  card('Thẻ ra tù', 'Giữ thẻ này để ra tù miễn phí khi cần. Có thể dùng sau.', 'Get out of jail', 'Keep this card to leave jail for free when you need to.', { k: 'jailFree' }),
  card('Bị triệu tập', 'Vào tù ngay, không đi qua Khởi hành.', 'Summoned', 'Go straight to jail. Do not pass Go.', { k: 'jail' }),
  card('Tết đến rồi', `Nhận lì xì ${V(100)}.`, 'Happy Tết', `Collect ${E(100)} in lucky money.`, { k: 'money', amount: 100 }),
  card('Hoàn thuế', `Nhận lại ${V(20)} tiền thuế thu nhập.`, 'Tax refund', `Collect a ${E(20)} income tax refund.`, { k: 'money', amount: 20 }),
  card('Sinh nhật vui vẻ', `Mỗi người chơi mừng sinh nhật bạn ${V(10)}.`, 'Happy birthday', `Every player gives you ${E(10)} for your birthday.`, { k: 'collectEach', amount: 10 }),
  card('Bảo hiểm đáo hạn', `Nhận ${V(100)} tiền bảo hiểm.`, 'Insurance pays out', `Collect ${E(100)} from your insurance.`, { k: 'money', amount: 100 }),
  card('Viện phí', `Trả ${V(100)} tiền viện phí.`, 'Hospital bill', `Pay ${E(100)} in hospital fees.`, { k: 'money', amount: -100 }),
  card('Học phí', `Đóng ${V(50)} học phí.`, 'School fees', `Pay ${E(50)} in school fees.`, { k: 'money', amount: -50 }),
  card('Phí tư vấn', `Nhận ${V(25)} phí tư vấn.`, 'Consulting fee', `Collect a ${E(25)} consulting fee.`, { k: 'money', amount: 25 }),
  card(
    'Sửa đường trước nhà',
    `Trả ${V(40)} cho mỗi nhà và ${V(115)} cho mỗi công trình biểu tượng bạn sở hữu.`,
    'Street repairs',
    `Pay ${E(40)} for each house and ${E(115)} for each landmark you own.`,
    { k: 'repairs', house: 40, hotel: 115 },
  ),
  card('Thi nấu phở', `Đoạt giải Nhì cuộc thi nấu phở. Nhận ${V(10)}.`, 'Phở contest', `You took second place in a phở contest. Collect ${E(10)}.`, { k: 'money', amount: 10 }),
  card('Nhận thừa kế', `Nhận ${V(100)} tiền thừa kế.`, 'Inheritance', `Collect a ${E(100)} inheritance.`, { k: 'money', amount: 100 }),
];

export const DECKS = { chance: CHANCE, chest: CHEST } as const;

export const cardTitle = (c: Card) => t(c.title, c.titleEn);
export const cardText = (c: Card) => t(c.text, c.textEn);
export const deckName = (deck: 'chance' | 'chest') => (deck === 'chance' ? t('Cơ hội', 'Chance') : t('Khí vận', 'Fortune'));

/** What the button on a drawn card says: the thing that will happen when the player taps it. */
export function cardAction(card: Card): string {
  const e = card.effect;
  switch (e.k) {
    case 'money':
      return e.amount > 0 ? t('Nhận tiền', 'Collect') : t('Trả tiền', 'Pay');
    case 'advance':
      return e.to === 0 ? t('Về Khởi hành', 'Go to Go') : t(`Đi tới ${sqShort(e.to)}`, `Go to ${sqShort(e.to)}`);
    case 'nearestAirport':
      return t('Ra sân bay', 'Go to the airport');
    case 'nearestUtility':
      return t('Đi tiếp', 'Go');
    case 'back':
      return t(`Lùi ${e.n} ô`, `Go back ${e.n}`);
    case 'jail':
      return t('Vào tù', 'Go to jail');
    case 'jailFree':
      return t('Giữ thẻ', 'Keep the card');
    case 'repairs':
      return t('Trả tiền sửa chữa', 'Pay for repairs');
    case 'payEach':
      return t('Đãi mọi người', 'Treat everyone');
    case 'collectEach':
      return t('Nhận tiền mừng', 'Collect gifts');
  }
}

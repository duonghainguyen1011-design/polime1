import { vnd } from './format';

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
  effect: CardEffect;
}

const passGo = `Đi qua Khởi hành thì nhận ${vnd(200)}.`;

export const CHANCE: Card[] = [
  { title: 'Lên đường', text: `Về thẳng vạch Khởi hành và nhận ${vnd(200)}.`, effect: { k: 'advance', to: 0 } },
  { title: 'Tắm biển cuối tuần', text: `Ra Vũng Tàu hóng gió. ${passGo}`, effect: { k: 'advance', to: 24 } },
  { title: 'Lên phố núi', text: `Đi Pleiku ngắm Biển Hồ. ${passGo}`, effect: { k: 'advance', to: 11 } },
  {
    title: 'Sự cố điện nước',
    text: 'Đến công ty Điện lực hoặc Cấp nước gần nhất. Nếu đã có chủ, tung xúc xắc và trả gấp 10 lần số điểm.',
    effect: { k: 'nearestUtility' },
  },
  {
    title: 'Chuyến bay gấp',
    text: 'Ra sân bay gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.',
    effect: { k: 'nearestAirport' },
  },
  {
    title: 'Hoãn chuyến, đổi vé',
    text: 'Ra sân bay gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.',
    effect: { k: 'nearestAirport' },
  },
  { title: 'Cổ tức về tài khoản', text: `Công ty chia cổ tức. Nhận ${vnd(50)}.`, effect: { k: 'money', amount: 50 } },
  { title: 'Thẻ ra tù', text: 'Giữ thẻ này để ra tù miễn phí khi cần. Có thể dùng sau.', effect: { k: 'jailFree' } },
  { title: 'Quên ví ở quán', text: 'Quay lại 3 ô để lấy ví.', effect: { k: 'back', n: 3 } },
  { title: 'Vượt đèn đỏ', text: 'Bị giữ lại. Vào tù ngay, không đi qua Khởi hành.', effect: { k: 'jail' } },
  {
    title: 'Bảo dưỡng mùa mưa',
    text: `Trả ${vnd(25)} cho mỗi nhà và ${vnd(100)} cho mỗi khách sạn bạn sở hữu.`,
    effect: { k: 'repairs', house: 25, hotel: 100 },
  },
  { title: 'Chạy quá tốc độ', text: `Nộp phạt ${vnd(15)}.`, effect: { k: 'money', amount: -15 } },
  { title: 'Chuyến bay sớm', text: `Ra sân bay Nội Bài. ${passGo}`, effect: { k: 'advance', to: 5 } },
  { title: 'Hẹn ở Sài Gòn', text: 'Đi thẳng đến TP. Hồ Chí Minh.', effect: { k: 'advance', to: 39 } },
  {
    title: 'Làm trưởng nhóm',
    text: `Bạn được bầu làm trưởng nhóm. Đãi mỗi người chơi ${vnd(50)}.`,
    effect: { k: 'payEach', amount: 50 },
  },
  { title: 'Khoản vay đáo hạn', text: `Khoản đầu tư sinh lời. Nhận ${vnd(150)}.`, effect: { k: 'money', amount: 150 } },
];

export const CHEST: Card[] = [
  { title: 'Lên đường', text: `Về thẳng vạch Khởi hành và nhận ${vnd(200)}.`, effect: { k: 'advance', to: 0 } },
  { title: 'Ngân hàng nhầm lẫn', text: `Lỗi có lợi cho bạn. Nhận ${vnd(200)}.`, effect: { k: 'money', amount: 200 } },
  { title: 'Khám sức khỏe', text: `Trả ${vnd(50)} tiền khám.`, effect: { k: 'money', amount: -50 } },
  { title: 'Bán cổ phiếu', text: `Chốt lời đúng lúc. Nhận ${vnd(50)}.`, effect: { k: 'money', amount: 50 } },
  { title: 'Thẻ ra tù', text: 'Giữ thẻ này để ra tù miễn phí khi cần. Có thể dùng sau.', effect: { k: 'jailFree' } },
  { title: 'Bị triệu tập', text: 'Vào tù ngay, không đi qua Khởi hành.', effect: { k: 'jail' } },
  { title: 'Tết đến rồi', text: `Nhận lì xì ${vnd(100)}.`, effect: { k: 'money', amount: 100 } },
  { title: 'Hoàn thuế', text: `Nhận lại ${vnd(20)} tiền thuế thu nhập.`, effect: { k: 'money', amount: 20 } },
  {
    title: 'Sinh nhật vui vẻ',
    text: `Mỗi người chơi mừng sinh nhật bạn ${vnd(10)}.`,
    effect: { k: 'collectEach', amount: 10 },
  },
  { title: 'Bảo hiểm đáo hạn', text: `Nhận ${vnd(100)} tiền bảo hiểm.`, effect: { k: 'money', amount: 100 } },
  { title: 'Viện phí', text: `Trả ${vnd(100)} tiền viện phí.`, effect: { k: 'money', amount: -100 } },
  { title: 'Học phí', text: `Đóng ${vnd(50)} học phí.`, effect: { k: 'money', amount: -50 } },
  { title: 'Phí tư vấn', text: `Nhận ${vnd(25)} phí tư vấn.`, effect: { k: 'money', amount: 25 } },
  {
    title: 'Sửa đường trước nhà',
    text: `Trả ${vnd(40)} cho mỗi nhà và ${vnd(115)} cho mỗi khách sạn bạn sở hữu.`,
    effect: { k: 'repairs', house: 40, hotel: 115 },
  },
  { title: 'Thi nấu phở', text: `Đoạt giải Nhì cuộc thi nấu phở. Nhận ${vnd(10)}.`, effect: { k: 'money', amount: 10 } },
  { title: 'Nhận thừa kế', text: `Nhận ${vnd(100)} tiền thừa kế.`, effect: { k: 'money', amount: 100 } },
];

export const DECKS = { chance: CHANCE, chest: CHEST } as const;

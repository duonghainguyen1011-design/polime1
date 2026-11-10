export type TokenId = 'non-la' | 'xich-lo' | 'xe-may' | 'pho' | 'hoa-sen' | 'trau' | 'den-long' | 'ca-phe';
export type Deck = 'chance' | 'chest';

export interface Player {
  id: string;
  name: string;
  token: TokenId;
  color: string;
  cash: number;
  pos: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: Deck[];
  bankrupt: boolean;
}

export interface PropState {
  owner: string | null;
  houses: number; // 0..4 houses, 5 = hotel
  mortgaged: boolean;
}

export interface Debt {
  debtor: string;
  creditor: string | null; // null = bank
  amount: number;
  toPot: boolean;
  reason: string;
}

export interface Auction {
  sq: number;
  high: number;
  bidder: string | null;
  order: string[];
  idx: number;
}

export interface TradeOffer {
  from: string;
  to: string;
  giveProps: number[];
  giveCash: number;
  getProps: number[];
  getCash: number;
}

export interface LogEntry {
  n: number;
  text: string;
}

export interface CardShow {
  deck: Deck;
  id: number;
  player: string;
  n: number;
}

export interface GameState {
  phase: 'lobby' | 'playing' | 'over';
  hostId: string;
  players: Player[];
  props: Record<string, PropState>;
  turn: number;
  step: 'roll' | 'buy' | 'end';
  doublesCount: number;
  rolledDoubles: boolean;
  dice: [number, number];
  rollN: number;
  pot: number;
  auction: Auction | null;
  trade: TradeOffer | null;
  debts: Debt[];
  decks: { chance: number[]; chest: number[] };
  card: CardShow | null;
  log: LogEntry[];
  n: number;
  winner: string | null;
  tradesThisTurn: number;
  tradeMemo: string[];
}

export type Action =
  | { t: 'join'; name: string; token: TokenId }
  | { t: 'leave' }
  | { t: 'start' }
  | { t: 'reset' }
  | { t: 'roll' }
  | { t: 'buy' }
  | { t: 'decline' }
  | { t: 'bid'; amount: number }
  | { t: 'pass' }
  | { t: 'payJail' }
  | { t: 'useCard' }
  | { t: 'build'; sq: number }
  | { t: 'sell'; sq: number }
  | { t: 'mortgage'; sq: number }
  | { t: 'unmortgage'; sq: number }
  | { t: 'payDebt' }
  | { t: 'bankrupt' }
  | { t: 'proposeTrade'; offer: Omit<TradeOffer, 'from'> }
  | { t: 'acceptTrade' }
  | { t: 'rejectTrade' }
  | { t: 'cancelTrade' }
  | { t: 'endTurn' };

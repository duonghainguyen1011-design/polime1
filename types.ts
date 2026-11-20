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
  houses: number; // 0 to 3 houses, 4 = the city's landmark
  mortgaged: boolean;
}

export interface Debt {
  debtor: string;
  creditor: string | null; // null = bank
  amount: number;
  toPot: boolean;
  reason: string;
  reasonEn?: string;
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
  /** Vietnamese */
  text: string;
  en?: string;
}

/** Chosen by the host in the lobby. 0 means no limit. */
export interface Settings {
  /** Length of the whole game; when it runs out, the richest player wins after the current turn. */
  gameMinutes: number;
  /** Time for each move; when it runs out, a bot plays for that player until someone else is up. */
  moveSeconds: number;
}

export interface CardShow {
  deck: Deck;
  id: number;
  player: string;
  n: number;
  /** True while the player is looking at the card and its effect has not happened yet. */
  pending?: boolean;
}

export interface GameState {
  phase: 'lobby' | 'playing' | 'over';
  hostId: string;
  players: Player[];
  props: Record<string, PropState>;
  turn: number;
  step: 'roll' | 'buy' | 'card' | 'end';
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
  settings: Settings;
  /** When the game clock runs out (ms since epoch), or null for no limit. */
  endsAt: number | null;
  /** When the last move was made (ms since epoch); the move clock counts from here. */
  movedAt: number;
  /** How the game ended. */
  endedBy?: 'bankrupt' | 'time';
}

export type Action =
  | { t: 'join'; name: string; token: TokenId }
  | { t: 'leave' }
  | { t: 'start' }
  | { t: 'settings'; gameMinutes: number; moveSeconds: number }
  | { t: 'reset' }
  | { t: 'roll' }
  | { t: 'buy' }
  | { t: 'decline' }
  | { t: 'skip' }
  | { t: 'resolveCard' }
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

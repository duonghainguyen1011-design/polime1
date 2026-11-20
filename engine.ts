import {
  AIRPORTS,
  BOARD,
  GO_SALARY,
  GROUP_SQS,
  HOTEL_SUPPLY,
  HOUSE_SUPPLY,
  JAIL_FINE,
  JAIL_POS,
  GROUP_BONUS_EMPTY,
  GROUP_BONUS_HOUSES,
  MAX_LEVEL,
  FREE_LEVELS,
  OWNABLE,
  START_CASH,
  UTILITIES,
  isOwnable,
  mortgageValue,
  ownable,
  unmortgageCost,
  type StreetSq,
} from './board';
import { DECKS } from './cards';
import { vnd } from './format';
import { t } from './i18n';
import { nameEn, sqName } from './names';

/** Money in each language's format, for log lines. */
const V = (x: number) => vnd(x, 'vi');
const E = (x: number) => vnd(x, 'en');
/** A reason for a payment, in both languages. */
type Why = [string, string];
const NONE: Why = ['', ''];
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, TOKENS } from './tokens';
import type { Action, Deck, GameState, Player, TokenId } from './types';

export class GameError extends Error {}
export type Rng = () => number;

const LOG_MAX = 60;

// ---------- creation ----------

export function newGame(hostId: string, hostName: string, token: TokenId): GameState {
  const s: GameState = {
    phase: 'lobby',
    hostId,
    players: [],
    props: {},
    turn: 0,
    step: 'roll',
    doublesCount: 0,
    rolledDoubles: false,
    dice: [1, 1],
    rollN: 0,
    pot: 0,
    auction: null,
    trade: null,
    debts: [],
    decks: { chance: [], chest: [] },
    card: null,
    log: [],
    n: 0,
    winner: null,
    tradesThisTurn: 0,
    tradeMemo: [],
    settings: { gameMinutes: 0, moveSeconds: 0 },
    endsAt: null,
    movedAt: 0,
  };
  addPlayer(s, hostId, hostName, token);
  return s;
}

function addPlayer(s: GameState, id: string, name: string, token: TokenId) {
  const used = new Set(s.players.map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
  s.players.push({
    id,
    name,
    token,
    color,
    cash: START_CASH,
    pos: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: [],
    bankrupt: false,
  });
}

// ---------- helpers ----------

export const P = (s: GameState, id: string): Player => {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new GameError(t('Không tìm thấy người chơi', 'Player not found'));
  return p;
};
export const current = (s: GameState) => s.players[s.turn];
export const alive = (s: GameState) => s.players.filter((p) => !p.bankrupt);

/** Log lines are kept in both languages so every player reads them in their own. */
function log(s: GameState, text: string, en: string) {
  s.n += 1;
  s.log.push({ n: s.n, text, en });
  if (s.log.length > LOG_MAX) s.log.splice(0, s.log.length - LOG_MAX);
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const die = (rng: Rng) => 1 + Math.floor(rng() * 6);

/** Who must act right now, or null when nobody can. */
export function actorOf(s: GameState): string | null {
  if (s.phase !== 'playing') return null;
  if (s.debts.length) return s.debts[0].debtor;
  if (s.auction) return s.auction.order[s.auction.idx];
  if (s.trade) return s.trade.to;
  return current(s).id;
}

export const ownsGroup = (s: GameState, owner: string | null, group: StreetSq['group']) =>
  !!owner && GROUP_SQS[group].every((i) => s.props[i].owner === owner);

export function buildingCounts(s: GameState) {
  let houses = 0;
  let hotels = 0;
  for (const i of OWNABLE) {
    const h = s.props[i]?.houses ?? 0;
    if (h >= MAX_LEVEL) hotels++;
    else houses += h;
  }
  return { housesLeft: HOUSE_SUPPLY - houses, hotelsLeft: HOTEL_SUPPLY - hotels };
}

export function rentFor(s: GameState, sq: number, diceTotal: number, opts: { airportMult?: number; utilMult?: number } = {}) {
  const d = ownable(sq);
  const ps = s.props[sq];
  const owner = ps.owner;
  if (d.kind === 'street') return streetRent(d, Math.min(ps.houses, MAX_LEVEL), ownsGroup(s, owner, d.group));
  if (d.kind === 'airport') {
    const n = AIRPORTS.filter((i) => s.props[i].owner === owner).length;
    return 25 * 2 ** (n - 1) * (opts.airportMult ?? 1);
  }
  const n = UTILITIES.filter((i) => s.props[i].owner === owner).length;
  return diceTotal * (opts.utilMult ?? (n === 2 ? 10 : 4));
}

const round5 = (v: number) => Math.round(v / 5) * 5;

/** Rent of a city at a level, with or without the whole colour group. Levels 3 and 4 always have the group. */
export function streetRent(d: StreetSq, level: number, group: boolean) {
  if (level === 0) return d.rent[0] * (group ? GROUP_BONUS_EMPTY : 1);
  if (level <= FREE_HOUSES) return group ? round5(d.rent[level] * GROUP_BONUS_HOUSES) : d.rent[level];
  return d.rent[level];
}

/** Bring games saved by older versions up to date: five levels folded into four, timer fields added. */
export function normalize(s: GameState) {
  for (const k of Object.keys(s.props)) if (s.props[k].houses > MAX_LEVEL) s.props[k].houses = MAX_LEVEL;
  if (!s.settings) s.settings = { gameMinutes: 0, moveSeconds: 0 };
  if (s.endsAt === undefined) s.endsAt = null;
  if (!s.movedAt) s.movedAt = 0;
  return s;
}

/** Choices the host can pick from. 0 means no limit. */
export const GAME_MINUTES = [0, 15, 20, 30, 45, 60, 90];
export const MOVE_SECONDS = [0, 30, 45, 60, 90, 120];

/** The clock used by the action being applied; set at the start of apply(). */
let NOW = 0;

/** The game clock ran out: the richest player still standing wins. */
function finishByTime(s: GameState) {
  const ranked = alive(s).sort((a, b) => netWorth(s, b.id) - netWorth(s, a.id));
  const w = ranked[0];
  s.phase = 'over';
  s.winner = w.id;
  s.endedBy = 'time';
  s.debts = [];
  s.auction = null;
  s.trade = null;
  if (s.card?.pending) s.card = { ...s.card, pending: false };
  log(s, `Hết giờ! ${w.name} giàu nhất và chiến thắng.`, `Time's up! ${w.name} is the richest and wins.`);
}

/** Does this square's owner have any building on their squares of the same colour group? */
export function groupHasHouses(s: GameState, sq: number) {
  const d = BOARD[sq];
  if (d.kind !== 'street') return false;
  const owner = s.props[sq].owner;
  return GROUP_SQS[d.group].some((i) => s.props[i].owner === owner && s.props[i].houses > 0);
}

/** House rule: up to this many houses can be built on any city you own; more needs the whole colour group. */
export const FREE_HOUSES = FREE_LEVELS;

export function canBuild(s: GameState, pid: string, sq: number): string | null {
  const d = BOARD[sq];
  if (d.kind !== 'street') return t('Chỉ xây được trên ô thành phố', 'You can only build on cities');
  const ps = s.props[sq];
  if (ps.owner !== pid) return t('Bạn không sở hữu ô này', 'You don\'t own this square');
  if (ps.mortgaged) return t('Ô này đang thế chấp', 'This square is mortgaged');
  if (ps.houses >= MAX_LEVEL) return t('Đã lên cấp cao nhất', 'Already at the top level');
  const mine = GROUP_SQS[d.group].filter((i) => s.props[i].owner === pid);
  if (ownsGroup(s, pid, d.group)) {
    if (mine.some((i) => s.props[i].mortgaged)) return t('Nhóm màu còn ô đang thế chấp', 'A city in this colour group is mortgaged');
    const min = Math.min(...mine.map((i) => s.props[i].houses));
    // Even building applies from the third house up; the first two are free on any city.
    if (ps.houses >= FREE_HOUSES && ps.houses > min) return t(`Từ cấp ${FREE_HOUSES + 1}, phải xây đều các ô trong nhóm`, `From level ${FREE_HOUSES + 1}, build evenly across the group`);
  } else if (ps.houses >= FREE_HOUSES) {
    const missing = GROUP_SQS[d.group].filter((i) => s.props[i].owner !== pid).map((i) => sqName(i));
    return t(`Muốn lên cấp ${FREE_HOUSES + 1} trở lên, bạn cần sở hữu cả nhóm màu. Còn thiếu: ${missing.join(', ')}`, `Level ${FREE_HOUSES + 1} and up needs the whole colour group. Still missing: ${missing.join(', ')}`);
  }
  const { housesLeft, hotelsLeft } = buildingCounts(s);
  if (ps.houses === MAX_LEVEL - 1 && hotelsLeft <= 0) return t('Ngân hàng đã hết công trình', 'The bank has no landmarks left');
  if (ps.houses < MAX_LEVEL - 1 && housesLeft <= 0) return t('Ngân hàng đã hết nhà', 'The bank has no houses left');
  if (P(s, pid).cash < d.house) return t('Không đủ tiền', 'Not enough money');
  return null;
}

export function canSell(s: GameState, pid: string, sq: number): string | null {
  const d = BOARD[sq];
  if (d.kind !== 'street') return t('Không có nhà để bán', 'No houses to sell');
  const ps = s.props[sq];
  if (ps.owner !== pid) return t('Bạn không sở hữu ô này', 'You don\'t own this square');
  if (ps.houses <= 0) return t('Không có nhà để bán', 'No houses to sell');
  const max = Math.max(...GROUP_SQS[d.group].filter((i) => s.props[i].owner === pid).map((i) => s.props[i].houses));
  if (ps.houses > FREE_HOUSES && ps.houses < max) return t('Phải bán đều các ô trong nhóm', 'Sell evenly across the group');
  if (ps.houses === MAX_LEVEL && buildingCounts(s).housesLeft < MAX_LEVEL - 1) return t('Ngân hàng không đủ nhà để đổi công trình', 'The bank is short of houses to break down the landmark');
  return null;
}

export function canMortgage(s: GameState, pid: string, sq: number): string | null {
  if (!isOwnable(BOARD[sq])) return t('Không thể thế chấp ô này', 'This square can\'t be mortgaged');
  const ps = s.props[sq];
  if (ps.owner !== pid) return t('Bạn không sở hữu ô này', 'You don\'t own this square');
  if (ps.mortgaged) return t('Đã thế chấp', 'Already mortgaged');
  if (groupHasHouses(s, sq)) return t('Bán hết nhà trong nhóm trước', 'Sell the houses in this group first');
  return null;
}

export function canUnmortgage(s: GameState, pid: string, sq: number): string | null {
  if (!isOwnable(BOARD[sq])) return t('Không thể chuộc ô này', 'This square can\'t be paid off');
  const ps = s.props[sq];
  if (ps.owner !== pid) return t('Bạn không sở hữu ô này', 'You don\'t own this square');
  if (!ps.mortgaged) return t('Ô này chưa thế chấp', 'This square isn\'t mortgaged');
  if (P(s, pid).cash < unmortgageCost(sq)) return t('Không đủ tiền', 'Not enough money');
  return null;
}

/** Can pid manage property right now? 'raise' = sell/mortgage, 'invest' = build/unmortgage. */
export function manageMode(s: GameState, pid: string): 'none' | 'raise' | 'full' {
  if (s.phase !== 'playing') return 'none';
  if (s.debts.length) return s.debts[0].debtor === pid ? 'raise' : 'none';
  if (s.auction || s.trade || s.step === 'card') return 'none';
  return current(s).id === pid ? 'full' : 'none';
}

export function netWorth(s: GameState, pid: string) {
  const p = P(s, pid);
  let w = p.cash;
  for (const i of OWNABLE) {
    const ps = s.props[i];
    if (ps.owner !== pid) continue;
    const d = ownable(i);
    w += ps.mortgaged ? d.price / 2 : d.price;
    if (d.kind === 'street') w += ps.houses * d.house;
  }
  return w;
}

// ---------- money ----------

function charge(s: GameState, debtorId: string, creditorId: string | null, amount: number, toPot: boolean, why: Why) {
  const [reason, reasonEn] = why;
  if (amount <= 0) return;
  const d = P(s, debtorId);
  if (d.cash >= amount) {
    d.cash -= amount;
    if (creditorId) P(s, creditorId).cash += amount;
    else if (toPot) s.pot += amount;
    const to = creditorId ? ` cho ${P(s, creditorId).name}` : toPot ? ' vào quỹ' : '';
    const toEn = creditorId ? ` to ${P(s, creditorId).name}` : toPot ? ' into the pot' : '';
    log(s, `${d.name} trả ${V(amount)}${reason ? ' ' + reason : ''}${to}.`, `${d.name} paid ${E(amount)}${reasonEn ? ' ' + reasonEn : ''}${toEn}.`);
  } else {
    s.debts.push({ debtor: debtorId, creditor: creditorId, amount, toPot, reason, reasonEn });
    log(s, `${d.name} không đủ tiền mặt để trả ${V(amount)}${reason ? ' ' + reason : ''}.`, `${d.name} is short of cash to pay ${E(amount)}${reasonEn ? ' ' + reasonEn : ''}.`);
  }
}

function receive(s: GameState, pid: string, amount: number, [why, whyEn]: Why) {
  P(s, pid).cash += amount;
  log(s, `${P(s, pid).name} nhận ${V(amount)}${why ? ' ' + why : ''}.`, `${P(s, pid).name} received ${E(amount)}${whyEn ? ' ' + whyEn : ''}.`);
}

// ---------- movement ----------

function sendToJail(s: GameState, p: Player) {
  p.pos = JAIL_POS;
  p.inJail = true;
  p.jailTurns = 0;
  s.rolledDoubles = false;
  s.doublesCount = 0;
  log(s, `${p.name} vào tù.`, `${p.name} went to jail.`);
}

function moveTo(s: GameState, p: Player, to: number, collectGo = true) {
  const passed = to < p.pos || (to === 0 && p.pos !== 0);
  p.pos = to;
  if (collectGo && passed) receive(s, p.id, GO_SALARY, ['khi qua Khởi hành', 'for passing Go']);
}

function moveBy(s: GameState, p: Player, n: number) {
  const to = (p.pos + n) % 40;
  const passed = p.pos + n >= 40;
  p.pos = to;
  if (passed) receive(s, p.id, GO_SALARY, ['khi qua Khởi hành', 'for passing Go']);
}

/** After landing, is the player still deciding (buy, skip or auction) or reading a card? */
const waiting = (s: GameState) => {
  const step = s.step as GameState['step'];
  return step === 'buy' || step === 'card';
};

const afterLandStep = (s: GameState, p: Player): GameState['step'] =>
  s.rolledDoubles && !p.inJail && !p.bankrupt ? 'roll' : 'end';

function land(s: GameState, p: Player, diceTotal: number, rng: Rng, opts: { airportMult?: number; utilMult?: number } = {}) {
  const sq = BOARD[p.pos];
  switch (sq.kind) {
    case 'street':
    case 'airport':
    case 'utility': {
      const ps = s.props[p.pos];
      if (!ps.owner) {
        s.step = 'buy';
        return;
      }
      if (ps.owner === p.id) return;
      const owner = P(s, ps.owner);
      if (ps.mortgaged) {
        log(s, `${sq.name} đang thế chấp, ${p.name} không phải trả tiền thuê.`, `${nameEn(p.pos)} is mortgaged, so ${p.name} pays no rent.`);
        return;
      }
      if (owner.inJail) {
        log(s, `${owner.name} đang ở tù nên không thu tiền thuê ${sq.name}.`, `${owner.name} is in jail and collects no rent for ${nameEn(p.pos)}.`);
        return;
      }
      let total = diceTotal;
      if (sq.kind === 'utility' && opts.utilMult) {
        const a = die(rng);
        const b = die(rng);
        total = a + b;
        s.dice = [a, b];
        s.rollN += 1;
        log(s, `${p.name} tung lại được ${a} + ${b}.`, `${p.name} rolled again: ${a} + ${b}.`);
      }
      const rent = rentFor(s, p.pos, total, opts);
      charge(s, p.id, owner.id, rent, false, [`tiền thuê ${sq.name}`, `in rent for ${nameEn(p.pos)}`]);
      return;
    }
    case 'tax':
      charge(s, p.id, null, sq.amount, true, [sq.name.toLowerCase(), `in ${nameEn(p.pos)}`]);
      return;
    case 'chance':
    case 'chest':
      drawCard(s, p, sq.kind);
      return;
    case 'gotojail':
      sendToJail(s, p);
      return;
    case 'parking':
      if (s.pot > 0) {
        const pot = s.pot;
        s.pot = 0;
        receive(s, p.id, pot, ['từ quỹ Bãi đỗ xe', 'from the Free Parking pot']);
      }
      return;
    default:
      return;
  }
}

/** Draw a card and wait: the player sees it before anything happens, then resolves it. */
function drawCard(s: GameState, p: Player, deck: Deck) {
  const id = s.decks[deck].shift()!;
  const card = DECKS[deck][id];
  s.card = { deck, id, player: p.id, n: s.n + 1, pending: true };
  log(s, `${p.name} rút thẻ ${deck === 'chance' ? 'Cơ hội' : 'Khí vận'}: ${card.title}.`, `${p.name} drew a ${deck === 'chance' ? 'Chance' : 'Fortune'} card: ${card.titleEn}.`);
  s.step = 'card';
}

function resolveCard(s: GameState, rng: Rng) {
  const c = s.card!;
  const p = P(s, c.player);
  s.card = { ...c, pending: false };
  s.step = 'end';
  applyCard(s, p, c.deck, c.id, rng);
  if (!waiting(s)) s.step = afterLandStep(s, p);
}

function applyCard(s: GameState, p: Player, deck: Deck, id: number, rng: Rng) {
  const pile = s.decks[deck];
  const card = DECKS[deck][id];
  const e = card.effect;
  if (e.k !== 'jailFree') pile.push(id);
  switch (e.k) {
    case 'money':
      if (e.amount > 0) receive(s, p.id, e.amount, NONE);
      else charge(s, p.id, null, -e.amount, true, NONE);
      return;
    case 'advance':
      moveTo(s, p, e.to);
      land(s, p, s.dice[0] + s.dice[1], rng);
      return;
    case 'nearestAirport': {
      const to = AIRPORTS.find((i) => i > p.pos) ?? AIRPORTS[0];
      moveTo(s, p, to);
      land(s, p, s.dice[0] + s.dice[1], rng, { airportMult: 2 });
      return;
    }
    case 'nearestUtility': {
      const to = UTILITIES.find((i) => i > p.pos) ?? UTILITIES[0];
      moveTo(s, p, to);
      land(s, p, s.dice[0] + s.dice[1], rng, { utilMult: 10 });
      return;
    }
    case 'back':
      p.pos = (p.pos - e.n + 40) % 40;
      land(s, p, s.dice[0] + s.dice[1], rng);
      return;
    case 'jail':
      sendToJail(s, p);
      return;
    case 'jailFree':
      p.jailCards.push(deck);
      return;
    case 'repairs': {
      let cost = 0;
      for (const i of OWNABLE) {
        const ps = s.props[i];
        if (ps.owner !== p.id) continue;
        cost += ps.houses >= MAX_LEVEL ? e.hotel : ps.houses * e.house;
      }
      if (cost > 0) charge(s, p.id, null, cost, true, ['tiền sửa chữa', 'for repairs']);
      else log(s, `${p.name} chưa có nhà nào, không phải trả.`, `${p.name} has no houses, so pays nothing.`);
      return;
    }
    case 'payEach':
      for (const o of alive(s)) if (o.id !== p.id) charge(s, p.id, o.id, e.amount, false, ['tiền đãi', 'as a treat']);
      return;
    case 'collectEach':
      for (const o of alive(s)) if (o.id !== p.id) charge(s, o.id, p.id, e.amount, false, ['tiền mừng', 'as a birthday gift']);
      return;
  }
}

// ---------- turn flow ----------

function nextTurn(s: GameState) {
  if (s.phase !== 'playing') return;
  if (s.endsAt && NOW >= s.endsAt) return finishByTime(s);
  let i = s.turn;
  do {
    i = (i + 1) % s.players.length;
  } while (s.players[i].bankrupt);
  s.turn = i;
  s.step = 'roll';
  s.doublesCount = 0;
  s.rolledDoubles = false;
  s.tradesThisTurn = 0;
}

export const tradeKey = (t: { from: string; to: string; giveProps: number[]; getProps: number[] }) =>
  `${t.from}>${t.to}:${[...t.giveProps].sort((a, b) => a - b).join(',')}|${[...t.getProps].sort((a, b) => a - b).join(',')}`;

export const MAX_TRADES_PER_TURN = 3;

function roll(s: GameState, p: Player, rng: Rng) {
  const a = die(rng);
  const b = die(rng);
  s.dice = [a, b];
  s.rollN += 1;
  const total = a + b;
  const dbl = a === b;
  log(s, `${p.name} tung ${a} + ${b}${dbl ? ' (đôi)' : ''}.`, `${p.name} rolled ${a} + ${b}${dbl ? ' (doubles)' : ''}.`);
  s.step = 'end';

  if (p.inJail) {
    s.rolledDoubles = false;
    if (dbl) {
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} tung được đôi và ra tù.`, `${p.name} rolled doubles and left jail.`);
    } else {
      p.jailTurns += 1;
      if (p.jailTurns < 3) {
        log(s, `${p.name} vẫn ở trong tù.`, `${p.name} stays in jail.`);
        return;
      }
      p.inJail = false;
      p.jailTurns = 0;
      charge(s, p.id, null, JAIL_FINE, true, ['tiền phạt ra tù', 'to get out of jail']);
    }
    moveBy(s, p, total);
    land(s, p, total, rng);
    if (!waiting(s)) s.step = afterLandStep(s, p);
    return;
  }

  if (dbl) {
    s.doublesCount += 1;
    if (s.doublesCount >= 3) {
      log(s, `${p.name} tung đôi ba lần liên tiếp.`, `${p.name} rolled doubles three times in a row.`);
      sendToJail(s, p);
      s.step = 'end';
      return;
    }
  }
  s.rolledDoubles = dbl;
  moveBy(s, p, total);
  land(s, p, total, rng);
  if (!waiting(s)) s.step = afterLandStep(s, p);
}

// ---------- auction ----------

function startAuction(s: GameState, sq: number) {
  const order: string[] = [];
  for (let k = 0; k < s.players.length; k++) {
    const p = s.players[(s.turn + k) % s.players.length];
    if (!p.bankrupt) order.push(p.id);
  }
  s.auction = { sq, high: 0, bidder: null, order, idx: 0 };
  log(s, `${BOARD[sq].name} được đem ra đấu giá.`, `${nameEn(sq)} goes up for auction.`);
}

function seekAuction(s: GameState, from: number) {
  const a = s.auction!;
  const others = a.order.filter((id) => id !== a.bidder);
  if (others.length === 0) return finishAuction(s);
  for (let k = 0; k < a.order.length; k++) {
    const i = (from + k) % a.order.length;
    if (a.order[i] !== a.bidder) {
      a.idx = i;
      return;
    }
  }
}

function finishAuction(s: GameState) {
  const a = s.auction!;
  s.auction = null;
  const sq = BOARD[a.sq];
  if (a.bidder) {
    const p = P(s, a.bidder);
    p.cash -= a.high;
    s.props[a.sq].owner = p.id;
    log(s, `${p.name} thắng đấu giá ${sq.name} với ${V(a.high)}.`, `${p.name} won the auction for ${nameEn(a.sq)} at ${E(a.high)}.`);
  } else {
    log(s, `Không ai mua ${sq.name}.`, `Nobody bought ${nameEn(a.sq)}.`);
  }
}

export const minBid = (s: GameState) => (s.auction && s.auction.bidder ? s.auction.high + 10 : 10);

// ---------- bankruptcy ----------

function bankrupt(s: GameState, pid: string) {
  const p = P(s, pid);
  const debt = s.debts.find((d) => d.debtor === pid);
  const creditor = debt?.creditor ? P(s, debt.creditor) : null;

  for (const i of OWNABLE) {
    const ps = s.props[i];
    const d = BOARD[i];
    if (ps.owner === pid && ps.houses > 0 && d.kind === 'street') {
      p.cash += (ps.houses * d.house) / 2;
      ps.houses = 0;
    }
  }

  if (creditor && !creditor.bankrupt) {
    creditor.cash += p.cash;
    for (const i of OWNABLE) if (s.props[i].owner === pid) s.props[i].owner = creditor.id;
    creditor.jailCards.push(...p.jailCards);
    log(s, `${p.name} phá sản. Toàn bộ tài sản thuộc về ${creditor.name}.`, `${p.name} went bankrupt. Everything goes to ${creditor.name}.`);
  } else {
    if (debt?.toPot) s.pot += p.cash;
    for (const i of OWNABLE) {
      if (s.props[i].owner === pid) s.props[i] = { owner: null, houses: 0, mortgaged: false };
    }
    for (const c of p.jailCards) s.decks[c].push(DECKS[c].findIndex((x) => x.effect.k === 'jailFree'));
    log(s, `${p.name} phá sản. Tài sản trở về ngân hàng.`, `${p.name} went bankrupt. Their property returns to the bank.`);
  }
  if (s.card?.pending && s.card.player === pid) {
    // An unread card goes back under its deck.
    s.decks[s.card.deck].push(s.card.id);
    s.card = { ...s.card, pending: false };
  }
  p.cash = 0;
  p.jailCards = [];
  p.bankrupt = true;
  p.inJail = false;

  s.debts = s.debts.filter((d) => d.debtor !== pid).map((d) => (d.creditor === pid ? { ...d, creditor: null } : d));
  if (s.trade && (s.trade.from === pid || s.trade.to === pid)) s.trade = null;
  if (s.auction) {
    const a = s.auction;
    const at = a.order.indexOf(pid);
    if (at >= 0) {
      a.order.splice(at, 1);
      if (a.bidder === pid) {
        a.bidder = null;
        a.high = 0;
      }
      if (a.order.length === 0) finishAuction(s);
      else seekAuction(s, at % a.order.length);
    }
  }

  const left = alive(s);
  if (left.length === 1) {
    s.phase = 'over';
    s.winner = left[0].id;
    s.endedBy = 'bankrupt';
    s.debts = [];
    s.auction = null;
    s.trade = null;
    log(s, `${left[0].name} chiến thắng!`, `${left[0].name} wins!`);
    return;
  }
  if (current(s).id === pid) nextTurn(s);
}

// ---------- apply ----------

function requireActor(s: GameState, pid: string) {
  if (s.phase !== 'playing') throw new GameError(t('Ván chơi chưa bắt đầu', 'The game hasn\'t started'));
  if (actorOf(s) !== pid) throw new GameError(t('Chưa đến lượt bạn', 'It\'s not your turn'));
}

function requireOwnTurnFree(s: GameState, pid: string) {
  requireActor(s, pid);
  if (s.debts.length || s.auction || s.trade) throw new GameError(t('Đang có việc cần xử lý', 'Something else needs sorting out first'));
  if (current(s).id !== pid) throw new GameError(t('Chưa đến lượt bạn', 'It\'s not your turn'));
}

/** Apply one player's action and return the new state. Every successful action restarts the move clock. */
export function apply(s0: GameState, pid: string, a: Action, rng: Rng = Math.random, now: number = Date.now()): GameState {
  NOW = now;
  const s = applyAction(s0, pid, a, rng);
  if (s !== s0) s.movedAt = now;
  return s;
}

function applyAction(s0: GameState, pid: string, a: Action, rng: Rng): GameState {
  const s: GameState = normalize(structuredClone(s0));

  switch (a.t) {
    // ----- lobby -----
    case 'join': {
      const name = a.name.trim().slice(0, 18);
      if (!name) throw new GameError(t('Hãy nhập tên', 'Enter your name'));
      const me = s.players.find((p) => p.id === pid);
      if (me) {
        if (s.phase !== 'lobby') return s0;
        if (s.players.some((p) => p.id !== pid && p.token === a.token)) throw new GameError(t('Quân cờ này đã có người chọn', 'Someone already picked this token'));
        me.name = name;
        me.token = a.token;
        return s;
      }
      if (s.phase !== 'lobby') throw new GameError(t('Ván chơi đã bắt đầu', 'The game has already started'));
      if (s.players.length >= MAX_PLAYERS) throw new GameError(t('Phòng đã đủ 6 người', 'The room is full (6 players)'));
      if (s.players.some((p) => p.token === a.token)) throw new GameError(t('Quân cờ này đã có người chọn', 'Someone already picked this token'));
      addPlayer(s, pid, name, a.token);
      return s;
    }
    case 'leave': {
      if (s.phase !== 'lobby') throw new GameError(t('Không thể rời khi đang chơi', 'You can\'t leave during a game'));
      s.players = s.players.filter((p) => p.id !== pid);
      if (s.hostId === pid && s.players.length) s.hostId = s.players[0].id;
      return s;
    }
    case 'settings': {
      if (s.phase !== 'lobby') throw new GameError(t('Ván chơi đã bắt đầu', 'The game has already started'));
      if (s.hostId !== pid) throw new GameError(t('Chỉ chủ phòng mới đổi được cài đặt', 'Only the host can change the settings'));
      if (!GAME_MINUTES.includes(a.gameMinutes) || !MOVE_SECONDS.includes(a.moveSeconds)) throw new GameError(t('Cài đặt không hợp lệ', 'Invalid settings'));
      s.settings = { gameMinutes: a.gameMinutes, moveSeconds: a.moveSeconds };
      return s;
    }
    case 'start': {
      if (s.phase !== 'lobby') throw new GameError(t('Ván chơi đã bắt đầu', 'The game has already started'));
      if (s.hostId !== pid) throw new GameError(t('Chỉ chủ phòng mới bắt đầu được', 'Only the host can start the game'));
      if (s.players.length < MIN_PLAYERS) throw new GameError(t('Cần ít nhất 2 người chơi', 'Needs at least 2 players'));
      s.players = shuffle(s.players, rng);
      s.props = Object.fromEntries(OWNABLE.map((i) => [String(i), { owner: null, houses: 0, mortgaged: false }]));
      s.decks = {
        chance: shuffle(DECKS.chance.map((_, i) => i), rng),
        chest: shuffle(DECKS.chest.map((_, i) => i), rng),
      };
      for (const p of s.players) {
        Object.assign(p, { cash: START_CASH, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false });
      }
      Object.assign(s, {
        phase: 'playing',
        turn: 0,
        step: 'roll',
        doublesCount: 0,
        rolledDoubles: false,
        pot: 0,
        auction: null,
        trade: null,
        debts: [],
        card: null,
        winner: null,
        log: [],
        tradesThisTurn: 0,
        tradeMemo: [],
        endsAt: s.settings.gameMinutes ? NOW + s.settings.gameMinutes * 60_000 : null,
        endedBy: undefined,
      });
      log(s, `Ván mới bắt đầu. Thứ tự: ${s.players.map((p) => p.name).join(', ')}.`, `A new game begins. Turn order: ${s.players.map((p) => p.name).join(', ')}.`);
      return s;
    }
    case 'reset': {
      if (s.phase !== 'over') throw new GameError(t('Ván chơi chưa kết thúc', 'The game isn\'t over yet'));
      if (s.hostId !== pid) throw new GameError(t('Chỉ chủ phòng mới làm được', 'Only the host can do this'));
      for (const p of s.players) Object.assign(p, { cash: START_CASH, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false });
      Object.assign(s, { phase: 'lobby', winner: null, card: null, auction: null, trade: null, debts: [], pot: 0, endsAt: null, endedBy: undefined });
      return s;
    }

    // ----- turn -----
    case 'roll': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'roll') throw new GameError(t('Bạn đã tung xúc xắc', 'You already rolled'));
      roll(s, current(s), rng);
      return s;
    }
    case 'buy': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'buy') throw new GameError(t('Không có gì để mua', 'Nothing to buy'));
      const p = current(s);
      const d = ownable(p.pos);
      if (p.cash < d.price) throw new GameError(t('Không đủ tiền', 'Not enough money'));
      p.cash -= d.price;
      s.props[p.pos].owner = p.id;
      log(s, `${p.name} mua ${d.name} với giá ${V(d.price)}.`, `${p.name} bought ${nameEn(p.pos)} for ${E(d.price)}.`);
      s.step = afterLandStep(s, p);
      return s;
    }
    case 'decline': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'buy') throw new GameError(t('Không có gì để đấu giá', 'Nothing to auction'));
      const p = current(s);
      s.step = afterLandStep(s, p);
      startAuction(s, p.pos);
      return s;
    }
    case 'skip': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'buy') throw new GameError(t('Không có gì để bỏ qua', 'Nothing to skip'));
      const p = current(s);
      log(s, `${p.name} bỏ qua ${BOARD[p.pos].name}.`, `${p.name} skipped ${nameEn(p.pos)}.`);
      s.step = afterLandStep(s, p);
      return s;
    }
    case 'resolveCard': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'card' || !s.card?.pending) throw new GameError(t('Không có thẻ nào đang chờ', 'No card is waiting'));
      resolveCard(s, rng);
      return s;
    }
    case 'bid': {
      requireActor(s, pid);
      const au = s.auction;
      if (!au) throw new GameError(t('Không có phiên đấu giá', 'No auction is running'));
      const amount = Math.floor(a.amount);
      if (amount < minBid(s)) throw new GameError(t(`Giá tối thiểu là ${vnd(minBid(s))}`, `The minimum bid is ${vnd(minBid(s))}`));
      if (amount > P(s, pid).cash) throw new GameError(t('Không đủ tiền', 'Not enough money'));
      au.high = amount;
      au.bidder = pid;
      log(s, `${P(s, pid).name} trả ${V(amount)}.`, `${P(s, pid).name} bid ${E(amount)}.`);
      seekAuction(s, (au.idx + 1) % au.order.length);
      return s;
    }
    case 'pass': {
      requireActor(s, pid);
      const au = s.auction;
      if (!au) throw new GameError(t('Không có phiên đấu giá', 'No auction is running'));
      const at = au.idx;
      au.order.splice(at, 1);
      if (au.order.length === 0) finishAuction(s);
      else seekAuction(s, at % au.order.length);
      return s;
    }
    case 'payJail': {
      requireOwnTurnFree(s, pid);
      const p = current(s);
      if (!p.inJail || s.step !== 'roll') throw new GameError(t('Bạn không ở trong tù', 'You\'re not in jail'));
      if (p.cash < JAIL_FINE) throw new GameError(t('Không đủ tiền', 'Not enough money'));
      p.cash -= JAIL_FINE;
      s.pot += JAIL_FINE;
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} nộp ${V(JAIL_FINE)} vào quỹ và ra tù.`, `${p.name} paid ${E(JAIL_FINE)} into the pot and left jail.`);
      return s;
    }
    case 'useCard': {
      requireOwnTurnFree(s, pid);
      const p = current(s);
      if (!p.inJail || s.step !== 'roll') throw new GameError(t('Bạn không ở trong tù', 'You\'re not in jail'));
      const deck = p.jailCards.shift();
      if (!deck) throw new GameError(t('Bạn không có thẻ ra tù', 'You don\'t have a Get Out of Jail card'));
      s.decks[deck].push(DECKS[deck].findIndex((c) => c.effect.k === 'jailFree'));
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} dùng thẻ ra tù.`, `${p.name} used a Get Out of Jail card.`);
      return s;
    }
    case 'endTurn': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'end') throw new GameError(s.step === 'roll' ? t('Bạn còn lượt tung', 'You still have a roll') : s.step === 'card' ? t('Hãy xem thẻ trước', 'Read your card first') : t('Hãy mua, đấu giá hoặc bỏ qua trước', 'Buy, auction or skip first'));
      nextTurn(s);
      return s;
    }

    // ----- property management -----
    case 'build': {
      if (manageMode(s, pid) !== 'full') throw new GameError(t('Chỉ xây được trong lượt của bạn', 'You can only build on your turn'));
      const err = canBuild(s, pid, a.sq);
      if (err) throw new GameError(err);
      const d = BOARD[a.sq] as StreetSq;
      P(s, pid).cash -= d.house;
      s.props[a.sq].houses += 1;
      log(s, `${P(s, pid).name} xây ${s.props[a.sq].houses >= MAX_LEVEL ? 'công trình biểu tượng' : 'nhà'} ở ${d.name}.`, `${P(s, pid).name} built ${s.props[a.sq].houses >= MAX_LEVEL ? 'the landmark' : 'a house'} in ${nameEn(a.sq)}.`);
      return s;
    }
    case 'sell': {
      if (manageMode(s, pid) === 'none') throw new GameError(t('Chưa thể bán lúc này', 'You can\'t sell right now'));
      const err = canSell(s, pid, a.sq);
      if (err) throw new GameError(err);
      const d = BOARD[a.sq] as StreetSq;
      P(s, pid).cash += d.house / 2;
      const wasHotel = s.props[a.sq].houses >= MAX_LEVEL;
      s.props[a.sq].houses -= 1;
      log(s, `${P(s, pid).name} bán ${wasHotel ? 'công trình biểu tượng' : 'một nhà'} ở ${d.name}.`, `${P(s, pid).name} sold ${wasHotel ? 'the landmark' : 'a house'} in ${nameEn(a.sq)}.`);
      return s;
    }
    case 'mortgage': {
      if (manageMode(s, pid) === 'none') throw new GameError(t('Chưa thể thế chấp lúc này', 'You can\'t mortgage right now'));
      const err = canMortgage(s, pid, a.sq);
      if (err) throw new GameError(err);
      s.props[a.sq].mortgaged = true;
      P(s, pid).cash += mortgageValue(a.sq);
      log(s, `${P(s, pid).name} thế chấp ${BOARD[a.sq].name}.`, `${P(s, pid).name} mortgaged ${nameEn(a.sq)}.`);
      return s;
    }
    case 'unmortgage': {
      if (manageMode(s, pid) !== 'full') throw new GameError(t('Chỉ chuộc được trong lượt của bạn', 'You can only pay off a mortgage on your turn'));
      const err = canUnmortgage(s, pid, a.sq);
      if (err) throw new GameError(err);
      P(s, pid).cash -= unmortgageCost(a.sq);
      s.props[a.sq].mortgaged = false;
      log(s, `${P(s, pid).name} chuộc lại ${BOARD[a.sq].name}.`, `${P(s, pid).name} paid off the mortgage on ${nameEn(a.sq)}.`);
      return s;
    }

    // ----- debts -----
    case 'payDebt': {
      requireActor(s, pid);
      const d = s.debts[0];
      if (!d || d.debtor !== pid) throw new GameError(t('Bạn không có khoản nợ nào', 'You have no debts'));
      const p = P(s, pid);
      if (p.cash < d.amount) throw new GameError(t('Chưa đủ tiền trả nợ', 'You don\'t have enough to pay yet'));
      s.debts.shift();
      p.cash -= d.amount;
      if (d.creditor) P(s, d.creditor).cash += d.amount;
      else if (d.toPot) s.pot += d.amount;
      const dest = d.creditor ? ` cho ${P(s, d.creditor).name}` : d.toPot ? ' vào quỹ' : '';
      const destEn = d.creditor ? ` to ${P(s, d.creditor).name}` : d.toPot ? ' into the pot' : '';
      const reasonEn = d.reasonEn ?? '';
      log(s, `${p.name} trả ${V(d.amount)}${d.reason ? ' ' + d.reason : ''}${dest}.`, `${p.name} paid ${E(d.amount)}${reasonEn ? ' ' + reasonEn : ''}${destEn}.`);
      return s;
    }
    case 'bankrupt': {
      requireActor(s, pid);
      if (!s.debts.length || s.debts[0].debtor !== pid) throw new GameError(t('Bạn chỉ có thể phá sản khi không trả được nợ', 'You can only go bankrupt when you can\'t pay a debt'));
      bankrupt(s, pid);
      return s;
    }

    // ----- trading -----
    case 'proposeTrade': {
      requireOwnTurnFree(s, pid);
      if (s.step === 'buy' || s.step === 'card') throw new GameError(s.step === 'card' ? t('Hãy xem thẻ trước', 'Read your card first') : t('Hãy mua, đấu giá hoặc bỏ qua trước', 'Buy, auction or skip first'));
      if (s.tradesThisTurn >= MAX_TRADES_PER_TURN) throw new GameError(t('Mỗi lượt chỉ được gửi 3 đề nghị', 'Only 3 offers per turn'));
      const o = a.offer;
      const to = P(s, o.to);
      if (to.id === pid || to.bankrupt) throw new GameError(t('Người chơi không hợp lệ', 'Invalid player'));
      const giveCash = Math.max(0, Math.floor(o.giveCash));
      const getCash = Math.max(0, Math.floor(o.getCash));
      if (!o.giveProps.length && !o.getProps.length && !giveCash && !getCash) throw new GameError(t('Đề nghị đang trống', 'The offer is empty'));
      validateTradeProps(s, pid, o.giveProps);
      validateTradeProps(s, o.to, o.getProps);
      if (giveCash > P(s, pid).cash) throw new GameError(t('Bạn không đủ tiền', 'You don\'t have enough money'));
      if (getCash > to.cash) throw new GameError(t(`${to.name} không đủ tiền`, `${to.name} doesn't have enough money`));
      s.trade = { from: pid, to: o.to, giveProps: o.giveProps, getProps: o.getProps, giveCash, getCash };
      s.tradesThisTurn += 1;
      log(s, `${P(s, pid).name} gửi đề nghị giao dịch cho ${to.name}.`, `${P(s, pid).name} offered a trade to ${to.name}.`);
      return s;
    }
    case 'acceptTrade': {
      requireActor(s, pid);
      const offer = s.trade;
      if (!offer || offer.to !== pid) throw new GameError(t('Không có đề nghị nào', 'No offer to answer'));
      const from = P(s, offer.from);
      const to = P(s, offer.to);
      validateTradeProps(s, from.id, offer.giveProps);
      validateTradeProps(s, to.id, offer.getProps);
      if (from.cash < offer.giveCash || to.cash < offer.getCash) throw new GameError(t('Một bên không còn đủ tiền', 'One side no longer has enough money'));
      for (const i of offer.giveProps) s.props[i].owner = to.id;
      for (const i of offer.getProps) s.props[i].owner = from.id;
      from.cash += offer.getCash - offer.giveCash;
      to.cash += offer.giveCash - offer.getCash;
      s.trade = null;
      log(s, `${to.name} đồng ý giao dịch với ${from.name}.`, `${to.name} accepted the trade with ${from.name}.`);
      return s;
    }
    case 'rejectTrade': {
      requireActor(s, pid);
      if (!s.trade || s.trade.to !== pid) throw new GameError(t('Không có đề nghị nào', 'No offer to answer'));
      log(s, `${P(s, pid).name} từ chối giao dịch.`, `${P(s, pid).name} turned down the trade.`);
      s.tradeMemo = [...s.tradeMemo.slice(-29), tradeKey(s.trade)];
      s.trade = null;
      return s;
    }
    case 'cancelTrade': {
      if (!s.trade || s.trade.from !== pid) throw new GameError(t('Không có đề nghị nào', 'No offer to answer'));
      log(s, `${P(s, pid).name} rút lại đề nghị giao dịch.`, `${P(s, pid).name} withdrew the trade offer.`);
      s.trade = null;
      return s;
    }
  }
}

function validateTradeProps(s: GameState, owner: string, sqs: number[]) {
  if (new Set(sqs).size !== sqs.length) throw new GameError(t('Tài sản bị lặp', 'A property is listed twice'));
  for (const i of sqs) {
    if (!isOwnable(BOARD[i])) throw new GameError(t('Ô không hợp lệ', 'Invalid square'));
    if (s.props[i].owner !== owner) throw new GameError(t(`${BOARD[i].name} không thuộc về người này`, `${nameEn(i)} doesn't belong to this player`));
    if (groupHasHouses(s, i)) throw new GameError(t(`Bán hết nhà trong nhóm của ${BOARD[i].name} trước`, `Sell the houses in ${nameEn(i)}'s group first`));
  }
}

export { TOKENS };

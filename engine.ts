import {
  AIRPORTS,
  BOARD,
  GO_SALARY,
  GROUP_SQS,
  HOTEL_SUPPLY,
  HOUSE_SUPPLY,
  JAIL_FINE,
  JAIL_POS,
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
  if (!p) throw new GameError('Không tìm thấy người chơi');
  return p;
};
export const current = (s: GameState) => s.players[s.turn];
export const alive = (s: GameState) => s.players.filter((p) => !p.bankrupt);

function log(s: GameState, text: string) {
  s.n += 1;
  s.log.push({ n: s.n, text });
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
    if (h === 5) hotels++;
    else houses += h;
  }
  return { housesLeft: HOUSE_SUPPLY - houses, hotelsLeft: HOTEL_SUPPLY - hotels };
}

export function rentFor(s: GameState, sq: number, diceTotal: number, opts: { airportMult?: number; utilMult?: number } = {}) {
  const d = ownable(sq);
  const ps = s.props[sq];
  const owner = ps.owner;
  if (d.kind === 'street') {
    if (ps.houses > 0) return d.rent[ps.houses];
    return d.rent[0] * (ownsGroup(s, owner, d.group) ? 2 : 1);
  }
  if (d.kind === 'airport') {
    const n = AIRPORTS.filter((i) => s.props[i].owner === owner).length;
    return 25 * 2 ** (n - 1) * (opts.airportMult ?? 1);
  }
  const n = UTILITIES.filter((i) => s.props[i].owner === owner).length;
  return diceTotal * (opts.utilMult ?? (n === 2 ? 10 : 4));
}

/** What the rent table shows for an unowned or owned square (no dice context). */
export function groupHasHouses(s: GameState, sq: number) {
  const d = BOARD[sq];
  if (d.kind !== 'street') return false;
  return GROUP_SQS[d.group].some((i) => s.props[i].houses > 0);
}

export function canBuild(s: GameState, pid: string, sq: number): string | null {
  const d = BOARD[sq];
  if (d.kind !== 'street') return 'Chỉ xây được trên ô thành phố';
  const ps = s.props[sq];
  if (ps.owner !== pid) return 'Bạn không sở hữu ô này';
  if (!ownsGroup(s, pid, d.group)) return 'Cần sở hữu cả nhóm màu để xây';
  if (GROUP_SQS[d.group].some((i) => s.props[i].mortgaged)) return 'Nhóm màu còn ô đang thế chấp';
  if (ps.houses >= 5) return 'Đã có khách sạn';
  const min = Math.min(...GROUP_SQS[d.group].map((i) => s.props[i].houses));
  if (ps.houses > min) return 'Phải xây đều các ô trong nhóm';
  const { housesLeft, hotelsLeft } = buildingCounts(s);
  if (ps.houses === 4 && hotelsLeft <= 0) return 'Ngân hàng đã hết khách sạn';
  if (ps.houses < 4 && housesLeft <= 0) return 'Ngân hàng đã hết nhà';
  if (P(s, pid).cash < d.house) return 'Không đủ tiền';
  return null;
}

export function canSell(s: GameState, pid: string, sq: number): string | null {
  const d = BOARD[sq];
  if (d.kind !== 'street') return 'Không có nhà để bán';
  const ps = s.props[sq];
  if (ps.owner !== pid) return 'Bạn không sở hữu ô này';
  if (ps.houses <= 0) return 'Không có nhà để bán';
  const max = Math.max(...GROUP_SQS[d.group].map((i) => s.props[i].houses));
  if (ps.houses < max) return 'Phải bán đều các ô trong nhóm';
  if (ps.houses === 5 && buildingCounts(s).housesLeft < 4) return 'Ngân hàng không đủ nhà để đổi khách sạn';
  return null;
}

export function canMortgage(s: GameState, pid: string, sq: number): string | null {
  if (!isOwnable(BOARD[sq])) return 'Không thể thế chấp ô này';
  const ps = s.props[sq];
  if (ps.owner !== pid) return 'Bạn không sở hữu ô này';
  if (ps.mortgaged) return 'Đã thế chấp';
  if (groupHasHouses(s, sq)) return 'Bán hết nhà trong nhóm trước';
  return null;
}

export function canUnmortgage(s: GameState, pid: string, sq: number): string | null {
  if (!isOwnable(BOARD[sq])) return 'Không thể chuộc ô này';
  const ps = s.props[sq];
  if (ps.owner !== pid) return 'Bạn không sở hữu ô này';
  if (!ps.mortgaged) return 'Ô này chưa thế chấp';
  if (P(s, pid).cash < unmortgageCost(sq)) return 'Không đủ tiền';
  return null;
}

/** Can pid manage property right now? 'raise' = sell/mortgage, 'invest' = build/unmortgage. */
export function manageMode(s: GameState, pid: string): 'none' | 'raise' | 'full' {
  if (s.phase !== 'playing') return 'none';
  if (s.debts.length) return s.debts[0].debtor === pid ? 'raise' : 'none';
  if (s.auction || s.trade) return 'none';
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

function charge(s: GameState, debtorId: string, creditorId: string | null, amount: number, toPot: boolean, reason: string) {
  if (amount <= 0) return;
  const d = P(s, debtorId);
  if (d.cash >= amount) {
    d.cash -= amount;
    if (creditorId) P(s, creditorId).cash += amount;
    else if (toPot) s.pot += amount;
    const to = creditorId ? ` cho ${P(s, creditorId).name}` : toPot ? ' vào quỹ' : '';
    log(s, `${d.name} trả ${vnd(amount)}${reason ? ' ' + reason : ''}${to}.`);
  } else {
    s.debts.push({ debtor: debtorId, creditor: creditorId, amount, toPot, reason });
    log(s, `${d.name} không đủ tiền mặt để trả ${vnd(amount)}${reason ? ' ' + reason : ''}.`);
  }
}

function receive(s: GameState, pid: string, amount: number, why: string) {
  P(s, pid).cash += amount;
  log(s, `${P(s, pid).name} nhận ${vnd(amount)}${why ? ' ' + why : ''}.`);
}

// ---------- movement ----------

function sendToJail(s: GameState, p: Player) {
  p.pos = JAIL_POS;
  p.inJail = true;
  p.jailTurns = 0;
  s.rolledDoubles = false;
  s.doublesCount = 0;
  log(s, `${p.name} vào tù.`);
}

function moveTo(s: GameState, p: Player, to: number, collectGo = true) {
  const passed = to < p.pos || (to === 0 && p.pos !== 0);
  p.pos = to;
  if (collectGo && passed) receive(s, p.id, GO_SALARY, 'khi qua Khởi hành');
}

function moveBy(s: GameState, p: Player, n: number) {
  const to = (p.pos + n) % 40;
  const passed = p.pos + n >= 40;
  p.pos = to;
  if (passed) receive(s, p.id, GO_SALARY, 'khi qua Khởi hành');
}

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
        log(s, `${sq.name} đang thế chấp, ${p.name} không phải trả tiền thuê.`);
        return;
      }
      if (owner.inJail) {
        log(s, `${owner.name} đang ở tù nên không thu tiền thuê ${sq.name}.`);
        return;
      }
      let total = diceTotal;
      if (sq.kind === 'utility' && opts.utilMult) {
        const a = die(rng);
        const b = die(rng);
        total = a + b;
        s.dice = [a, b];
        s.rollN += 1;
        log(s, `${p.name} tung lại được ${a} + ${b}.`);
      }
      const rent = rentFor(s, p.pos, total, opts);
      charge(s, p.id, owner.id, rent, false, `tiền thuê ${sq.name}`);
      return;
    }
    case 'tax':
      charge(s, p.id, null, sq.amount, true, sq.name.toLowerCase());
      return;
    case 'chance':
    case 'chest':
      drawCard(s, p, sq.kind, rng);
      return;
    case 'gotojail':
      sendToJail(s, p);
      return;
    case 'parking':
      if (s.pot > 0) {
        const pot = s.pot;
        s.pot = 0;
        receive(s, p.id, pot, 'từ quỹ Bãi đỗ xe');
      }
      return;
    default:
      return;
  }
}

function drawCard(s: GameState, p: Player, deck: Deck, rng: Rng) {
  const pile = s.decks[deck];
  const id = pile.shift()!;
  const card = DECKS[deck][id];
  s.card = { deck, id, player: p.id, n: s.n + 1 };
  log(s, `${p.name} rút thẻ ${deck === 'chance' ? 'Cơ hội' : 'Khí vận'}: ${card.title}.`);
  const e = card.effect;
  if (e.k !== 'jailFree') pile.push(id);
  switch (e.k) {
    case 'money':
      if (e.amount > 0) receive(s, p.id, e.amount, '');
      else charge(s, p.id, null, -e.amount, true, '');
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
        cost += ps.houses === 5 ? e.hotel : ps.houses * e.house;
      }
      if (cost > 0) charge(s, p.id, null, cost, true, 'tiền sửa chữa');
      else log(s, `${p.name} chưa có nhà nào, không phải trả.`);
      return;
    }
    case 'payEach':
      for (const o of alive(s)) if (o.id !== p.id) charge(s, p.id, o.id, e.amount, false, 'tiền đãi');
      return;
    case 'collectEach':
      for (const o of alive(s)) if (o.id !== p.id) charge(s, o.id, p.id, e.amount, false, 'tiền mừng');
      return;
  }
}

// ---------- turn flow ----------

function nextTurn(s: GameState) {
  if (s.phase !== 'playing') return;
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
  log(s, `${p.name} tung ${a} + ${b}${dbl ? ' (đôi)' : ''}.`);
  s.step = 'end';

  if (p.inJail) {
    s.rolledDoubles = false;
    if (dbl) {
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} tung được đôi và ra tù.`);
    } else {
      p.jailTurns += 1;
      if (p.jailTurns < 3) {
        log(s, `${p.name} vẫn ở trong tù.`);
        return;
      }
      p.inJail = false;
      p.jailTurns = 0;
      charge(s, p.id, null, JAIL_FINE, true, 'tiền phạt ra tù');
    }
    moveBy(s, p, total);
    land(s, p, total, rng);
    if ((s.step as GameState['step']) !== 'buy') s.step = afterLandStep(s, p);
    return;
  }

  if (dbl) {
    s.doublesCount += 1;
    if (s.doublesCount >= 3) {
      log(s, `${p.name} tung đôi ba lần liên tiếp.`);
      sendToJail(s, p);
      s.step = 'end';
      return;
    }
  }
  s.rolledDoubles = dbl;
  moveBy(s, p, total);
  land(s, p, total, rng);
  if ((s.step as GameState['step']) !== 'buy') s.step = afterLandStep(s, p);
}

// ---------- auction ----------

function startAuction(s: GameState, sq: number) {
  const order: string[] = [];
  for (let k = 0; k < s.players.length; k++) {
    const p = s.players[(s.turn + k) % s.players.length];
    if (!p.bankrupt) order.push(p.id);
  }
  s.auction = { sq, high: 0, bidder: null, order, idx: 0 };
  log(s, `${BOARD[sq].name} được đem ra đấu giá.`);
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
    log(s, `${p.name} thắng đấu giá ${sq.name} với ${vnd(a.high)}.`);
  } else {
    log(s, `Không ai mua ${sq.name}.`);
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
    log(s, `${p.name} phá sản. Toàn bộ tài sản thuộc về ${creditor.name}.`);
  } else {
    if (debt?.toPot) s.pot += p.cash;
    for (const i of OWNABLE) {
      if (s.props[i].owner === pid) s.props[i] = { owner: null, houses: 0, mortgaged: false };
    }
    for (const c of p.jailCards) s.decks[c].push(DECKS[c].findIndex((x) => x.effect.k === 'jailFree'));
    log(s, `${p.name} phá sản. Tài sản trở về ngân hàng.`);
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
    s.debts = [];
    s.auction = null;
    s.trade = null;
    log(s, `${left[0].name} chiến thắng!`);
    return;
  }
  if (current(s).id === pid) nextTurn(s);
}

// ---------- apply ----------

function requireActor(s: GameState, pid: string) {
  if (s.phase !== 'playing') throw new GameError('Ván chơi chưa bắt đầu');
  if (actorOf(s) !== pid) throw new GameError('Chưa đến lượt bạn');
}

function requireOwnTurnFree(s: GameState, pid: string) {
  requireActor(s, pid);
  if (s.debts.length || s.auction || s.trade) throw new GameError('Đang có việc cần xử lý');
  if (current(s).id !== pid) throw new GameError('Chưa đến lượt bạn');
}

export function apply(s0: GameState, pid: string, a: Action, rng: Rng = Math.random): GameState {
  const s: GameState = structuredClone(s0);

  switch (a.t) {
    // ----- lobby -----
    case 'join': {
      const name = a.name.trim().slice(0, 18);
      if (!name) throw new GameError('Hãy nhập tên');
      const me = s.players.find((p) => p.id === pid);
      if (me) {
        if (s.phase !== 'lobby') return s0;
        if (s.players.some((p) => p.id !== pid && p.token === a.token)) throw new GameError('Quân cờ này đã có người chọn');
        me.name = name;
        me.token = a.token;
        return s;
      }
      if (s.phase !== 'lobby') throw new GameError('Ván chơi đã bắt đầu');
      if (s.players.length >= MAX_PLAYERS) throw new GameError('Phòng đã đủ 6 người');
      if (s.players.some((p) => p.token === a.token)) throw new GameError('Quân cờ này đã có người chọn');
      addPlayer(s, pid, name, a.token);
      return s;
    }
    case 'leave': {
      if (s.phase !== 'lobby') throw new GameError('Không thể rời khi đang chơi');
      s.players = s.players.filter((p) => p.id !== pid);
      if (s.hostId === pid && s.players.length) s.hostId = s.players[0].id;
      return s;
    }
    case 'start': {
      if (s.phase !== 'lobby') throw new GameError('Ván chơi đã bắt đầu');
      if (s.hostId !== pid) throw new GameError('Chỉ chủ phòng mới bắt đầu được');
      if (s.players.length < MIN_PLAYERS) throw new GameError('Cần ít nhất 2 người chơi');
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
      });
      log(s, `Ván mới bắt đầu. Thứ tự: ${s.players.map((p) => p.name).join(', ')}.`);
      return s;
    }
    case 'reset': {
      if (s.phase !== 'over') throw new GameError('Ván chơi chưa kết thúc');
      if (s.hostId !== pid) throw new GameError('Chỉ chủ phòng mới làm được');
      for (const p of s.players) Object.assign(p, { cash: START_CASH, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false });
      Object.assign(s, { phase: 'lobby', winner: null, card: null, auction: null, trade: null, debts: [], pot: 0 });
      return s;
    }

    // ----- turn -----
    case 'roll': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'roll') throw new GameError('Bạn đã tung xúc xắc');
      roll(s, current(s), rng);
      return s;
    }
    case 'buy': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'buy') throw new GameError('Không có gì để mua');
      const p = current(s);
      const d = ownable(p.pos);
      if (p.cash < d.price) throw new GameError('Không đủ tiền');
      p.cash -= d.price;
      s.props[p.pos].owner = p.id;
      log(s, `${p.name} mua ${d.name} với giá ${vnd(d.price)}.`);
      s.step = afterLandStep(s, p);
      return s;
    }
    case 'decline': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'buy') throw new GameError('Không có gì để đấu giá');
      const p = current(s);
      s.step = afterLandStep(s, p);
      startAuction(s, p.pos);
      return s;
    }
    case 'bid': {
      requireActor(s, pid);
      const au = s.auction;
      if (!au) throw new GameError('Không có phiên đấu giá');
      const amount = Math.floor(a.amount);
      if (amount < minBid(s)) throw new GameError(`Giá tối thiểu là ${vnd(minBid(s))}`);
      if (amount > P(s, pid).cash) throw new GameError('Không đủ tiền');
      au.high = amount;
      au.bidder = pid;
      log(s, `${P(s, pid).name} trả ${vnd(amount)}.`);
      seekAuction(s, (au.idx + 1) % au.order.length);
      return s;
    }
    case 'pass': {
      requireActor(s, pid);
      const au = s.auction;
      if (!au) throw new GameError('Không có phiên đấu giá');
      const at = au.idx;
      au.order.splice(at, 1);
      if (au.order.length === 0) finishAuction(s);
      else seekAuction(s, at % au.order.length);
      return s;
    }
    case 'payJail': {
      requireOwnTurnFree(s, pid);
      const p = current(s);
      if (!p.inJail || s.step !== 'roll') throw new GameError('Bạn không ở trong tù');
      if (p.cash < JAIL_FINE) throw new GameError('Không đủ tiền');
      p.cash -= JAIL_FINE;
      s.pot += JAIL_FINE;
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} nộp ${vnd(JAIL_FINE)} vào quỹ và ra tù.`);
      return s;
    }
    case 'useCard': {
      requireOwnTurnFree(s, pid);
      const p = current(s);
      if (!p.inJail || s.step !== 'roll') throw new GameError('Bạn không ở trong tù');
      const deck = p.jailCards.shift();
      if (!deck) throw new GameError('Bạn không có thẻ ra tù');
      s.decks[deck].push(DECKS[deck].findIndex((c) => c.effect.k === 'jailFree'));
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} dùng thẻ ra tù.`);
      return s;
    }
    case 'endTurn': {
      requireOwnTurnFree(s, pid);
      if (s.step !== 'end') throw new GameError(s.step === 'roll' ? 'Bạn còn lượt tung' : 'Hãy mua hoặc đấu giá trước');
      nextTurn(s);
      return s;
    }

    // ----- property management -----
    case 'build': {
      if (manageMode(s, pid) !== 'full') throw new GameError('Chỉ xây được trong lượt của bạn');
      const err = canBuild(s, pid, a.sq);
      if (err) throw new GameError(err);
      const d = BOARD[a.sq] as StreetSq;
      P(s, pid).cash -= d.house;
      s.props[a.sq].houses += 1;
      log(s, `${P(s, pid).name} xây ${s.props[a.sq].houses === 5 ? 'khách sạn' : 'nhà'} ở ${d.name}.`);
      return s;
    }
    case 'sell': {
      if (manageMode(s, pid) === 'none') throw new GameError('Chưa thể bán lúc này');
      const err = canSell(s, pid, a.sq);
      if (err) throw new GameError(err);
      const d = BOARD[a.sq] as StreetSq;
      P(s, pid).cash += d.house / 2;
      const wasHotel = s.props[a.sq].houses === 5;
      s.props[a.sq].houses -= 1;
      log(s, `${P(s, pid).name} bán ${wasHotel ? 'khách sạn' : 'một nhà'} ở ${d.name}.`);
      return s;
    }
    case 'mortgage': {
      if (manageMode(s, pid) === 'none') throw new GameError('Chưa thể thế chấp lúc này');
      const err = canMortgage(s, pid, a.sq);
      if (err) throw new GameError(err);
      s.props[a.sq].mortgaged = true;
      P(s, pid).cash += mortgageValue(a.sq);
      log(s, `${P(s, pid).name} thế chấp ${BOARD[a.sq].name}.`);
      return s;
    }
    case 'unmortgage': {
      if (manageMode(s, pid) !== 'full') throw new GameError('Chỉ chuộc được trong lượt của bạn');
      const err = canUnmortgage(s, pid, a.sq);
      if (err) throw new GameError(err);
      P(s, pid).cash -= unmortgageCost(a.sq);
      s.props[a.sq].mortgaged = false;
      log(s, `${P(s, pid).name} chuộc lại ${BOARD[a.sq].name}.`);
      return s;
    }

    // ----- debts -----
    case 'payDebt': {
      requireActor(s, pid);
      const d = s.debts[0];
      if (!d || d.debtor !== pid) throw new GameError('Bạn không có khoản nợ nào');
      const p = P(s, pid);
      if (p.cash < d.amount) throw new GameError('Chưa đủ tiền trả nợ');
      s.debts.shift();
      p.cash -= d.amount;
      if (d.creditor) P(s, d.creditor).cash += d.amount;
      else if (d.toPot) s.pot += d.amount;
      const dest = d.creditor ? ` cho ${P(s, d.creditor).name}` : d.toPot ? ' vào quỹ' : '';
      log(s, `${p.name} trả ${vnd(d.amount)}${d.reason ? ' ' + d.reason : ''}${dest}.`);
      return s;
    }
    case 'bankrupt': {
      requireActor(s, pid);
      if (!s.debts.length || s.debts[0].debtor !== pid) throw new GameError('Bạn chỉ có thể phá sản khi không trả được nợ');
      bankrupt(s, pid);
      return s;
    }

    // ----- trading -----
    case 'proposeTrade': {
      requireOwnTurnFree(s, pid);
      if (s.step === 'buy') throw new GameError('Hãy mua hoặc đấu giá trước');
      if (s.tradesThisTurn >= MAX_TRADES_PER_TURN) throw new GameError('Mỗi lượt chỉ được gửi 3 đề nghị');
      const o = a.offer;
      const to = P(s, o.to);
      if (to.id === pid || to.bankrupt) throw new GameError('Người chơi không hợp lệ');
      const giveCash = Math.max(0, Math.floor(o.giveCash));
      const getCash = Math.max(0, Math.floor(o.getCash));
      if (!o.giveProps.length && !o.getProps.length && !giveCash && !getCash) throw new GameError('Đề nghị đang trống');
      validateTradeProps(s, pid, o.giveProps);
      validateTradeProps(s, o.to, o.getProps);
      if (giveCash > P(s, pid).cash) throw new GameError('Bạn không đủ tiền');
      if (getCash > to.cash) throw new GameError(`${to.name} không đủ tiền`);
      s.trade = { from: pid, to: o.to, giveProps: o.giveProps, getProps: o.getProps, giveCash, getCash };
      s.tradesThisTurn += 1;
      log(s, `${P(s, pid).name} gửi đề nghị giao dịch cho ${to.name}.`);
      return s;
    }
    case 'acceptTrade': {
      requireActor(s, pid);
      const t = s.trade;
      if (!t || t.to !== pid) throw new GameError('Không có đề nghị nào');
      const from = P(s, t.from);
      const to = P(s, t.to);
      validateTradeProps(s, from.id, t.giveProps);
      validateTradeProps(s, to.id, t.getProps);
      if (from.cash < t.giveCash || to.cash < t.getCash) throw new GameError('Một bên không còn đủ tiền');
      for (const i of t.giveProps) s.props[i].owner = to.id;
      for (const i of t.getProps) s.props[i].owner = from.id;
      from.cash += t.getCash - t.giveCash;
      to.cash += t.giveCash - t.getCash;
      s.trade = null;
      log(s, `${to.name} đồng ý giao dịch với ${from.name}.`);
      return s;
    }
    case 'rejectTrade': {
      requireActor(s, pid);
      if (!s.trade || s.trade.to !== pid) throw new GameError('Không có đề nghị nào');
      log(s, `${P(s, pid).name} từ chối giao dịch.`);
      s.tradeMemo = [...s.tradeMemo.slice(-29), tradeKey(s.trade)];
      s.trade = null;
      return s;
    }
    case 'cancelTrade': {
      if (!s.trade || s.trade.from !== pid) throw new GameError('Không có đề nghị nào');
      log(s, `${P(s, pid).name} rút lại đề nghị giao dịch.`);
      s.trade = null;
      return s;
    }
  }
}

function validateTradeProps(s: GameState, owner: string, sqs: number[]) {
  if (new Set(sqs).size !== sqs.length) throw new GameError('Tài sản bị lặp');
  for (const i of sqs) {
    if (!isOwnable(BOARD[i])) throw new GameError('Ô không hợp lệ');
    if (s.props[i].owner !== owner) throw new GameError(`${BOARD[i].name} không thuộc về người này`);
    if (groupHasHouses(s, i)) throw new GameError(`Bán hết nhà trong nhóm của ${BOARD[i].name} trước`);
  }
}

export { TOKENS };

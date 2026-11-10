import { BOARD, GROUP_SQS, JAIL_FINE, OWNABLE, ownable, unmortgageCost, type StreetSq } from './board';
import { MAX_TRADES_PER_TURN, P, actorOf, alive, canBuild, canMortgage, canSell, current, groupHasHouses, minBid, tradeKey } from './engine';
import type { Action, GameState, TradeOffer } from './types';

const RESERVE = 150;

/** A simple, steady strategy used when a player is disconnected (or in practice mode). */
export function botAction(s: GameState, pid: string): Action | null {
  if (actorOf(s) !== pid) return null;
  const me = P(s, pid);

  // 1. Debts first
  const debt = s.debts[0];
  if (debt && debt.debtor === pid) {
    if (me.cash >= debt.amount) return { t: 'payDebt' };
    const sell = OWNABLE.filter((i) => !canSell(s, pid, i)).sort((a, b) => price(b) - price(a))[0];
    if (sell !== undefined) return { t: 'sell', sq: sell };
    const mort = OWNABLE.filter((i) => !canMortgage(s, pid, i)).sort((a, b) => price(a) - price(b))[0];
    if (mort !== undefined) return { t: 'mortgage', sq: mort };
    return { t: 'bankrupt' };
  }

  // 2. Auctions
  if (s.auction) {
    const a = s.auction;
    const worth = ownable(a.sq).price;
    const step = Math.max(10, Math.round((worth * 0.1) / 10) * 10);
    const bid = a.bidder ? a.high + step : Math.max(minBid(s), Math.round((worth * 0.5) / 10) * 10);
    if (bid <= worth && me.cash - bid >= RESERVE) return { t: 'bid', amount: bid };
    return { t: 'pass' };
  }

  // 3. Trades offered to the bot: accept only if it clearly comes out ahead
  if (s.trade) return tradeScore(s, pid, s.trade) >= 0 ? { t: 'acceptTrade' } : { t: 'rejectTrade' };

  // 4. Own turn
  if (current(s).id !== pid) return null;
  if (s.step === 'roll' && s.tradesThisTurn === 0 && s.tradesThisTurn < MAX_TRADES_PER_TURN) {
    const offer = findTrade(s, pid);
    if (offer) return { t: 'proposeTrade', offer };
  }
  if (s.step === 'roll') {
    if (me.inJail && me.jailCards.length) return { t: 'useCard' };
    if (me.inJail && me.cash - JAIL_FINE > 600 && unownedCount(s) > 6) return { t: 'payJail' };
    return { t: 'roll' };
  }
  if (s.step === 'buy') {
    const d = ownable(me.pos);
    return me.cash - d.price >= RESERVE ? { t: 'buy' } : { t: 'decline' };
  }
  // step === 'end': invest a little, then pass the turn
  const build = OWNABLE.filter((i) => BOARD[i].kind === 'street' && !canBuild(s, pid, i))
    .filter((i) => me.cash - (BOARD[i] as StreetSq).house >= RESERVE * 2)
    .sort((a, b) => price(b) - price(a))[0];
  if (build !== undefined) return { t: 'build', sq: build };
  const unm = OWNABLE.filter((i) => s.props[i].owner === pid && s.props[i].mortgaged)
    .filter((i) => me.cash - unmortgageCost(i) >= 500)
    .sort((a, b) => groupWeight(s, pid, b) - groupWeight(s, pid, a))[0];
  if (unm !== undefined) return { t: 'unmortgage', sq: unm };
  return { t: 'endTurn' };
}

const price = (i: number) => ownable(i).price;
const unownedCount = (s: GameState) => OWNABLE.filter((i) => !s.props[i].owner).length;
function groupWeight(s: GameState, pid: string, i: number) {
  const d = BOARD[i];
  if (d.kind !== 'street') return 0;
  return GROUP_SQS[d.group].filter((j) => s.props[j].owner === pid).length;
}

// ---------- trade valuation ----------

const propValue = (s: GameState, i: number) => (s.props[i].mortgaged ? price(i) / 2 : price(i));

/** Total price of every colour group `who` completes thanks to the trade. */
function monopolyGain(s: GameState, who: string, gained: number[], lost: number[]) {
  let bonus = 0;
  for (const sqs of Object.values(GROUP_SQS)) {
    const before = sqs.every((i) => s.props[i].owner === who);
    const after = sqs.every((i) => (gained.includes(i) || s.props[i].owner === who) && !lost.includes(i));
    const groupPrice = sqs.reduce((n, i) => n + price(i), 0);
    if (after && !before) bonus += groupPrice;
    if (before && !after) bonus -= groupPrice;
  }
  return bonus;
}

/** Score of an offer from the point of view of `pid` as the receiving side. >= 0 means accept. */
export function tradeScore(s: GameState, pid: string, t: TradeOffer) {
  const other = t.from === pid ? t.to : t.from;
  const recvProps = t.from === pid ? t.getProps : t.giveProps;
  const giveProps = t.from === pid ? t.giveProps : t.getProps;
  const recvCash = t.from === pid ? t.getCash : t.giveCash;
  const giveCash = t.from === pid ? t.giveCash : t.getCash;
  const recv = recvProps.reduce((n, i) => n + propValue(s, i), 0) + recvCash + monopolyGain(s, pid, recvProps, giveProps);
  const give = giveProps.reduce((n, i) => n + propValue(s, i), 0) + giveCash + Math.max(0, monopolyGain(s, other, giveProps, recvProps));
  if (P(s, pid).cash + recvCash - giveCash < 0) return -1;
  return recv - give * 1.1;
}

/** Look for a deal that would complete one of the bot's colour groups. */
function findTrade(s: GameState, pid: string): Omit<TradeOffer, 'from'> | null {
  const me = P(s, pid);
  for (const sqs of Object.values(GROUP_SQS)) {
    const mine = sqs.filter((i) => s.props[i].owner === pid);
    const missing = sqs.filter((i) => s.props[i].owner !== pid);
    if (mine.length === 0 || missing.length !== 1) continue;
    const want = missing[0];
    const holder = s.props[want].owner;
    if (!holder || P(s, holder).bankrupt || groupHasHouses(s, want)) continue;
    // Something the holder would want back: a piece that completes one of *their* groups.
    const sweet = OWNABLE.filter(
      (i) =>
        s.props[i].owner === pid &&
        BOARD[i].kind === 'street' &&
        !groupHasHouses(s, i) &&
        !sqs.includes(i) &&
        GROUP_SQS[(BOARD[i] as StreetSq).group].every((j) => j === i || s.props[j].owner === holder),
    );
    const candidates: number[][] = [...sweet.map((i) => [i]), []];
    for (const give of candidates) {
      const base: TradeOffer = { from: pid, to: holder, giveProps: give, getProps: [want], giveCash: 0, getCash: 0 };
      if (s.tradeMemo.includes(tradeKey(base))) continue;
      const need = Math.max(0, -tradeScore(s, holder, base));
      const cash = Math.ceil(need / 10) * 10;
      if (me.cash - cash < RESERVE) continue;
      const offer = { ...base, giveCash: cash };
      if (tradeScore(s, holder, offer) < 0) continue;
      // The bot itself must not lose much on the deal.
      if (selfValue(s, pid, offer) < 0) continue;
      return { to: offer.to, giveProps: offer.giveProps, getProps: offer.getProps, giveCash: offer.giveCash, getCash: 0 };
    }
  }
  return null;
}

function selfValue(s: GameState, pid: string, t: TradeOffer) {
  const recv = t.getProps.reduce((n, i) => n + propValue(s, i), 0) + monopolyGain(s, pid, t.getProps, t.giveProps);
  const give = t.giveProps.reduce((n, i) => n + propValue(s, i), 0) + t.giveCash + Math.max(0, monopolyGain(s, t.to, t.giveProps, t.getProps));
  return recv - give * 0.85;
}

export const aliveOthers = (s: GameState, pid: string) => alive(s).filter((p) => p.id !== pid);

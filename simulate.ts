// Plays many bot-only games through the engine to catch rule bugs and stalls.
import { HOTEL_SUPPLY, HOUSE_SUPPLY, OWNABLE } from './board';
import { botAction } from './bot';
import { actorOf, apply, buildingCounts, newGame } from './engine';
import type { GameState, TokenId } from './types';

const tokens: TokenId[] = ['non-la', 'xich-lo', 'xe-may', 'pho', 'hoa-sen', 'trau'];

function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function check(s: GameState, where: string) {
  for (const p of s.players) {
    if (p.cash < 0) throw new Error(`${where}: negative cash for ${p.name}: ${p.cash}`);
    if (!Number.isInteger(p.cash)) throw new Error(`${where}: fractional cash ${p.cash}`);
    if (p.bankrupt && OWNABLE.some((i) => s.props[i].owner === p.id)) throw new Error(`${where}: bankrupt owns property`);
  }
  const { housesLeft, hotelsLeft } = buildingCounts(s);
  if (housesLeft < 0 || housesLeft > HOUSE_SUPPLY || hotelsLeft < 0 || hotelsLeft > HOTEL_SUPPLY) throw new Error(`${where}: supply ${housesLeft}/${hotelsLeft}`);
  if (s.decks.chance.length + s.players.reduce((n, p) => n + p.jailCards.filter((c) => c === 'chance').length, 0) !== 16)
    throw new Error(`${where}: chance deck size broken`);
  if (s.decks.chest.length + s.players.reduce((n, p) => n + p.jailCards.filter((c) => c === 'chest').length, 0) !== 16)
    throw new Error(`${where}: chest deck size broken`);
}

const GAMES = Number(process.argv[2] ?? 300);
let finished = 0;
let actionsTotal = 0;
const turnsToWin: number[] = [];
for (let g = 0; g < GAMES; g++) {
  const rng = seeded(g + 1);
  const n = 2 + (g % 5);
  let s = newGame('p0', 'Người 0', tokens[0]);
  for (let i = 1; i < n; i++) s = apply(s, `p${i}`, { t: 'join', name: `Người ${i}`, token: tokens[i] }, rng);
  s = apply(s, 'p0', { t: 'start' }, rng);
  let actions = 0;
  let turns = 0;
  while (s.phase === 'playing' && actions < 40000) {
    const actor = actorOf(s)!;
    const a = botAction(s, actor);
    if (!a) throw new Error(`game ${g}: no bot action for actor ${actor}`);
    if (a.t === 'endTurn') turns++;
    try {
      s = apply(s, actor, a, rng);
    } catch (e) {
      throw new Error(`game ${g} action ${JSON.stringify(a)} by ${actor}: ${(e as Error).message}\n${s.log.slice(-8).map((l) => l.text).join('\n')}`);
    }
    check(s, `game ${g} after ${a.t}`);
    actions++;
  }
  actionsTotal += actions;
  if (s.phase === 'over') {
    finished++;
    turnsToWin.push(turns);
  }
}
turnsToWin.sort((a, b) => a - b);
console.log(`games: ${GAMES}, finished: ${finished}, avg actions: ${Math.round(actionsTotal / GAMES)}, median turns to win: ${turnsToWin[Math.floor(turnsToWin.length / 2)]}`);

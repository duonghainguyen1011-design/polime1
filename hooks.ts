import { useEffect, useReducer, useRef, useState } from 'react';
import { botAction, timeoutAction } from './bot';
import { actorOf } from './engine';
import type { GameState } from './types';
import type { Conn } from './conn';

export function useConn(conn: Conn) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => conn.subscribe(bump), [conn]);
  return { state: conn.state, online: conn.online, error: conn.error };
}

const GRACE_MS = 8000;

// When this device first saw each move. The move timer counts from here, so a phone whose clock is a few seconds off still gives a fair countdown.
const seen = { movedAt: -1, at: 0 };
function seenAt(movedAt: number) {
  if (seen.movedAt !== movedAt) {
    seen.movedAt = movedAt;
    seen.at = Date.now();
  }
  return seen.at;
}

/** When the player who must act now runs out of time, or null without a move timer. */
export function moveDeadline(state: GameState | null) {
  if (!state || state.phase !== 'playing' || !state.settings?.moveSeconds) return null;
  return seenAt(state.movedAt ?? 0) + state.settings.moveSeconds * 1000;
}

/** The current time, ticking while `on` is true. */
export function useNow(on: boolean, every = 500) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(id);
  }, [on, every]);
  return now;
}

/**
 * Bots play for anyone who is not connected (all opponents in practice mode),
 * and for a connected player who runs over the move timer, until someone else has to act.
 * Exactly one connected player drives them: the first connected player in seat order.
 */
export function useBotDriver(conn: Conn, state: GameState | null, online: Set<string>) {
  const mountedAt = useRef(Date.now());
  const offlineSince = useRef(new Map<string, number>());
  const lastRollN = useRef<number | null>(null);
  const lastCardN = useRef<number | null>(null);
  const forced = useRef<string | null>(null);

  useEffect(() => {
    if (!state) return;
    const now = Date.now();
    for (const p of state.players) {
      if (online.has(p.id)) offlineSince.current.delete(p.id);
      else if (!offlineSince.current.has(p.id)) offlineSince.current.set(p.id, conn.local ? 0 : Math.max(now, mountedAt.current));
    }
  }, [state, online, conn.local]);

  useEffect(() => {
    if (!state || state.phase !== 'playing') return;
    const actor = actorOf(state);
    if (!actor) return;
    if (forced.current && forced.current !== actor) forced.current = null;
    const seated = state.players.filter((p) => online.has(p.id));
    const driver = (seated.find((p) => !p.bankrupt) ?? seated[0])?.id;
    if (driver !== conn.me) return;

    if (online.has(actor) && forced.current !== actor) {
      // A connected player: only step in once their move timer runs out.
      const deadline = moveDeadline(state);
      if (deadline === null) return;
      const movedAt = state.movedAt;
      const t = window.setTimeout(async () => {
        const s = conn.state;
        if (!s || s.movedAt !== movedAt || actorOf(s) !== actor) return;
        forced.current = actor;
        const a = timeoutAction(s, actor);
        if (a) await conn.dispatch(a, actor);
      }, Math.max(0, deadline - Date.now()));
      return () => window.clearTimeout(t);
    }

    const justRolled = lastRollN.current !== null && lastRollN.current !== state.rollN;
    const cardN = state.card?.n ?? 0;
    const justDrew = lastCardN.current !== null && lastCardN.current !== cardN;
    lastRollN.current = state.rollN;
    lastCardN.current = cardN;
    const since = offlineSince.current.get(actor) ?? Date.now();
    const grace = conn.local || forced.current === actor ? 0 : Math.max(0, GRACE_MS - (Date.now() - since));
    // A drawn card stays on screen long enough to read before the bot plays it.
    const pace = justDrew ? 4600 : justRolled ? 1700 : 900;

    const t = window.setTimeout(async () => {
      const s = conn.state;
      if (!s || actorOf(s) !== actor) return;
      const a = forced.current === actor && online.has(actor) ? timeoutAction(s, actor) : botAction(s, actor);
      if (a) await conn.dispatch(a, actor);
    }, grace + pace);
    return () => window.clearTimeout(t);
  }, [state, online, conn]);
}

const STEP_MS = 115;

/** Token positions as shown on screen: they walk square by square instead of teleporting. */
export function useDisplayPositions(state: GameState | null) {
  const shown = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, number>>({});
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    for (const p of state.players) {
      const from = shown.current[p.id];
      const to = p.pos;
      if (from === undefined) {
        shown.current[p.id] = to;
        continue;
      }
      if (from === to) continue;
      window.clearInterval(timers.current[p.id]);
      const dist = (to - from + 40) % 40;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (dist > 0 && dist <= 12 && !reduce && !(p.inJail && to === 10)) {
        setMoving(p.id);
        timers.current[p.id] = window.setInterval(() => {
          const cur = shown.current[p.id];
          if (cur === to) {
            window.clearInterval(timers.current[p.id]);
            setMoving((m) => (m === p.id ? null : m));
            return;
          }
          shown.current[p.id] = (cur + 1) % 40;
          bump();
        }, STEP_MS);
      } else {
        shown.current[p.id] = to;
      }
    }
    bump();
  }, [state]);

  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearInterval(t)), []);
  return { shown: shown.current, moving };
}

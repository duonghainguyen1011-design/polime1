import { useEffect, useReducer, useRef, useState } from 'react';
import { botAction } from '../game/bot';
import { actorOf } from '../game/engine';
import type { GameState } from '../game/types';
import type { Conn } from '../net/conn';

export function useConn(conn: Conn) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => conn.subscribe(bump), [conn]);
  return { state: conn.state, online: conn.online, error: conn.error };
}

const GRACE_MS = 8000;

/**
 * Bots play for anyone who is not connected (all opponents in practice mode).
 * Exactly one connected player drives them: the first connected player in seat order.
 */
export function useBotDriver(conn: Conn, state: GameState | null, online: Set<string>) {
  const mountedAt = useRef(Date.now());
  const offlineSince = useRef(new Map<string, number>());
  const lastRollN = useRef<number | null>(null);
  const lastCardN = useRef<number | null>(null);

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
    if (!actor || online.has(actor)) return;
    const seated = state.players.filter((p) => online.has(p.id));
    const driver = (seated.find((p) => !p.bankrupt) ?? seated[0])?.id;
    if (driver !== conn.me) return;

    const justRolled = lastRollN.current !== null && lastRollN.current !== state.rollN;
    const cardN = state.card?.n ?? 0;
    const justDrew = lastCardN.current !== null && lastCardN.current !== cardN;
    lastRollN.current = state.rollN;
    lastCardN.current = cardN;
    const since = offlineSince.current.get(actor) ?? Date.now();
    const grace = conn.local ? 0 : Math.max(0, GRACE_MS - (Date.now() - since));
    const pace = justDrew ? 2600 : justRolled ? 1700 : 900;

    const t = window.setTimeout(async () => {
      const s = conn.state;
      if (!s || actorOf(s) !== actor) return;
      const a = botAction(s, actor);
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

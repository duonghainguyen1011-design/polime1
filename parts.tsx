import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BOARD, GROUPS, OWNABLE } from './board';
import { vnd } from './format';
import type { GameState, Player } from './types';
import { TokenDisc } from './icons';

// ---------- Dice ----------

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ v, rolling }: { v: number; rolling: boolean }) {
  return (
    <span className={`die${rolling ? ' rolling' : ''}${v === 1 || v === 4 ? ' red' : ''}`} aria-label={`${v}`}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={PIPS[v].includes(k) ? 'pip' : 'pip off'} />
      ))}
    </span>
  );
}

export function Dice({ dice, rollN }: { dice: [number, number]; rollN: number }) {
  const [faces, setFaces] = useState<[number, number]>(dice);
  const [rolling, setRolling] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setFaces(dice);
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setFaces(dice);
      return;
    }
    setRolling(true);
    const spin = window.setInterval(() => setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 70);
    const stop = window.setTimeout(() => {
      window.clearInterval(spin);
      setFaces(dice);
      setRolling(false);
    }, 620);
    return () => {
      window.clearInterval(spin);
      window.clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollN]);
  return (
    <div className="dice" aria-live="polite" aria-label={`Xúc xắc ${dice[0]} và ${dice[1]}`}>
      <Die v={faces[0]} rolling={rolling} />
      <Die v={faces[1]} rolling={rolling} />
    </div>
  );
}

// ---------- Players ----------

export function propColor(i: number) {
  const sq = BOARD[i];
  if (sq.kind === 'street') return GROUPS[sq.group].color;
  if (sq.kind === 'airport') return 'var(--ink-soft)';
  return 'var(--gold-deep)';
}

export function Players({ state, me, online, local }: { state: GameState; me: string; online: Set<string>; local: boolean }) {
  const turnId = state.phase === 'playing' ? state.players[state.turn]?.id : null;
  return (
    <ul className="players">
      {state.players.map((p) => {
        const owned = OWNABLE.filter((i) => state.props[i]?.owner === p.id);
        const isBot = local ? p.id !== me : !online.has(p.id);
        return (
          <li key={p.id} className={`player${p.id === turnId ? ' turn' : ''}${p.bankrupt ? ' out' : ''}`}>
            <TokenDisc player={p} size="2.4rem" ring={p.id === turnId} />
            <div className="pl-main">
              <div className="pl-name">
                <span>{p.name}</span>
                {p.id === me && <span className="chip">Bạn</span>}
                {!p.bankrupt && isBot && <span className="chip chip-muted">{local ? 'Máy' : 'Máy chơi thay'}</span>}
                {p.inJail && <span className="chip chip-warn">Ở tù</span>}
                {p.jailCards.length > 0 && <span className="chip">Thẻ ra tù</span>}
                {p.bankrupt && <span className="chip chip-muted">Phá sản</span>}
              </div>
              {owned.length > 0 && (
                <div className="pl-props" aria-label={`${owned.length} tài sản`}>
                  {owned.map((i) => (
                    <span key={i} className={`pp${state.props[i].mortgaged ? ' m' : ''}`} style={{ background: propColor(i) }} title={BOARD[i].name} />
                  ))}
                </div>
              )}
            </div>
            <div className="pl-cash">{vnd(p.cash)}</div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Log ----------

export function Log({ state }: { state: GameState }) {
  const [all, setAll] = useState(false);
  const items = state.log.slice().reverse();
  const shown = all ? items : items.slice(0, 8);
  return (
    <div className="log">
      <ol>
        {shown.map((l) => (
          <li key={l.n}>{l.text}</li>
        ))}
      </ol>
      {items.length > 8 && (
        <button type="button" className="link" onClick={() => setAll(!all)}>
          {all ? 'Thu gọn' : `Xem thêm ${items.length - 8} dòng`}
        </button>
      )}
    </div>
  );
}

// ---------- Shells ----------

export function Sheet({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Who({ p }: { p: Player }) {
  return (
    <span className="who">
      <TokenDisc player={p} size="1.25em" />
      {p.name}
    </span>
  );
}

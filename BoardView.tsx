import type { ReactNode } from 'react';
import { BOARD, GO_SALARY, GROUPS, MAX_LEVEL } from './board';
import { vndShort } from './format';
import type { GameState } from './types';
import { ArrowIcon, BarsIcon, BoltIcon, CoinIcon, DropIcon, EnvelopeIcon, LockIcon, ParkIcon, PlaneIcon, TokenDisc } from './icons';
import { t } from './i18n';
import { sqName, sqShort } from './names';

type Side = 'bottom' | 'left' | 'top' | 'right' | 'corner';

/** Grid cell (1-based) for each of the 40 squares, Go at bottom-right, play runs clockwise. */
export function cellOf(i: number): { row: number; col: number; side: Side } {
  if (i === 0) return { row: 11, col: 11, side: 'corner' };
  if (i < 10) return { row: 11, col: 11 - i, side: 'bottom' };
  if (i === 10) return { row: 11, col: 1, side: 'corner' };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: 'left' };
  if (i === 20) return { row: 1, col: 1, side: 'corner' };
  if (i < 30) return { row: 1, col: 1 + (i - 20), side: 'top' };
  if (i === 30) return { row: 1, col: 11, side: 'corner' };
  return { row: 1 + (i - 30), col: 11, side: 'right' };
}

const UNITS = 12; // 1.5 + 9 + 1.5
const start = (c: number) => (c === 1 ? 0 : c === 11 ? 10.5 : 1.5 + (c - 2));
const span = (c: number) => (c === 1 || c === 11 ? 1.5 : 1);
const centerPct = (c: number) => ((start(c) + span(c) / 2) / UNITS) * 100;

const SPREAD: [number, number][] = [
  [0, 0],
  [-0.55, -0.45],
  [0.55, 0.45],
  [0.55, -0.45],
  [-0.55, 0.45],
  [0, 0.7],
];

const CORNER_IN: Record<number, [number, number]> = { 0: [-0.6, -0.6], 20: [0.6, 0.6], 30: [-0.6, 0.6] };

interface Props {
  state: GameState;
  shown: Record<string, number>;
  moving: string | null;
  me: string;
  highlight: number | null;
  onTile: (i: number) => void;
  center: ReactNode;
}

export function Board({ state, shown, moving, me, highlight, onTile, center }: Props) {
  const players = state.players.filter((p) => !p.bankrupt);
  const occupants: Record<number, string[]> = {};
  for (const p of players) (occupants[shown[p.id] ?? p.pos] ??= []).push(p.id);
  const color = (id: string | null) => state.players.find((p) => p.id === id)?.color;
  const turnId = state.phase === 'playing' ? state.players[state.turn]?.id : null;

  return (
    <div className="board-wrap">
    <div className="board-frame">
      <div className="board" role="group" aria-label={t('Bàn cờ Polime', 'Polime board')}>
        {BOARD.map((sq, i) => {
          const { row, col, side } = cellOf(i);
          const ps = state.props[i];
          const owner = ps?.owner ?? null;
          const cls = ['tile', `s-${side}`, `k-${sq.kind}`];
          if (ps?.mortgaged) cls.push('mortgaged');
          if (highlight === i) cls.push('lit');
          const style: Record<string, string | number> = { gridRow: row, gridColumn: col };
          if (sq.kind === 'street') style['--g'] = GROUPS[sq.group].color;
          if (owner) style['--own'] = color(owner) ?? 'transparent';
          return (
            <button key={i} type="button" className={cls.join(' ')} style={style} onClick={() => onTile(i)} aria-label={sqName(i)}>
              {owner && <span className="own-edge" />}
              <TileFace i={i} state={state} />
            </button>
          );
        })}
        <div className="board-center">{center}</div>
        <div className="token-layer" aria-hidden="true">
          {players.map((p) => {
            const pos = shown[p.id] ?? p.pos;
            const { row, col } = cellOf(pos);
            const here = occupants[pos] ?? [];
            const k = here.indexOf(p.id);
            let [dx, dy] = here.length > 1 ? SPREAD[k % SPREAD.length] : [0, 0];
            if (pos === 10) {
              if (p.inJail && shown[p.id] === p.pos) [dx, dy] = [0.55 + dx * 0.4, -0.55 + dy * 0.4];
              else [dx, dy] = [-0.6 + dx * 0.4, 0.6 + dy * 0.4];
            } else if (pos % 10 === 0) {
              // Other corners: lean toward the board centre so the corner label stays readable.
              const inward = CORNER_IN[pos];
              [dx, dy] = [inward[0] + dx * 0.5, inward[1] + dy * 0.5];
            }
            return (
              <span
                key={p.id}
                className={`token${p.id === turnId ? ' on-turn' : ''}${p.id === moving ? ' walking' : ''}${p.id === me ? ' mine' : ''}`}
                style={{
                  left: `calc(${centerPct(col)}% + ${dx} * var(--tok))`,
                  top: `calc(${centerPct(row)}% + ${dy} * var(--tok))`,
                }}
              >
                <TokenDisc player={p} size="100%" ring />
              </span>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}

function Houses({ n }: { n: number }) {
  if (!n) return null;
  if (n >= MAX_LEVEL) return <span className="hotel" title={t('Công trình biểu tượng', 'Landmark')} />;
  return (
    <span className="houses">
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className="house" />
      ))}
    </span>
  );
}

function TileFace({ i, state }: { i: number; state: GameState }) {
  const sq = BOARD[i];
  const ps = state.props[i];
  switch (sq.kind) {
    case 'street':
      return (
        <>
          <span className="band">
            <Houses n={ps?.houses ?? 0} />
          </span>
          <span className="t-body">
            <span className="t-name">{sqShort(i)}</span>
            <span className="t-price">{vndShort(sq.price)}</span>
          </span>
        </>
      );
    case 'airport':
    case 'utility':
      return (
        <span className="t-body">
          <span className="t-icon">{sq.kind === 'airport' ? <PlaneIcon /> : sq.icon === 'power' ? <BoltIcon /> : <DropIcon />}</span>
          <span className="t-name">{sqShort(i)}</span>
          <span className="t-price">{vndShort(sq.price)}</span>
        </span>
      );
    case 'chance':
      return (
        <span className="t-body">
          <span className="t-glyph">?</span>
          <span className="t-name">{t('Cơ hội', 'Chance')}</span>
        </span>
      );
    case 'chest':
      return (
        <span className="t-body">
          <span className="t-icon env">
            <EnvelopeIcon />
          </span>
          <span className="t-name">{t('Khí vận', 'Fortune')}</span>
        </span>
      );
    case 'tax':
      return (
        <span className="t-body">
          <span className="t-icon">
            <CoinIcon />
          </span>
          <span className="t-name">{sqShort(i)}</span>
          <span className="t-price">−{vndShort(sq.amount)}</span>
        </span>
      );
    case 'go':
      return (
        <span className="corner">
          <span className="c-icon">
            <ArrowIcon />
          </span>
          <span className="c-name">{t('Khởi hành', 'Go')}</span>
          <span className="c-sub">+{vndShort(GO_SALARY)}</span>
        </span>
      );
    case 'jail':
      return (
        <span className="corner jail">
          <span className="c-icon">
            <BarsIcon />
          </span>
          <span className="c-name">{t('Nhà giam', 'Jail')}</span>
        </span>
      );
    case 'parking':
      return (
        <span className="corner">
          <span className="c-icon">
            <ParkIcon />
          </span>
          <span className="c-name">{t('Bãi đỗ xe', 'Free Parking')}</span>
          <span className="c-sub pot">{state.pot ? t(`Quỹ ${vndShort(state.pot)}`, `Pot ${vndShort(state.pot)}`) : t('Quỹ trống', 'Pot empty')}</span>
        </span>
      );
    case 'gotojail':
      return (
        <span className="corner">
          <span className="c-icon">
            <LockIcon />
          </span>
          <span className="c-name">{t('Vào tù', 'Go to jail')}</span>
        </span>
      );
  }
}

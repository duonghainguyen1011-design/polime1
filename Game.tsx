import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BOARD, GROUPS, JAIL_FINE, OWNABLE, ownable } from './board';
import { vnd, vndShort } from './format';
import { MAX_TRADES_PER_TURN, actorOf, alive, current, minBid } from './engine';
import type { Action, GameState } from './types';
import type { Conn } from './conn';
import { Board } from './BoardView';

// The 3D board (three.js) loads separately so the home screen and lobby open fast.
const Board3D = lazy(() => import('./Board3D').then((m) => ({ default: m.Board3D })));

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
import { useBotDriver, useDisplayPositions } from './hooks';
import { TokenDisc } from './icons';
import { Dice, Log, Players, Who, propColor } from './parts';
import { CardReveal, GameOver, ManageSheet, PropertySheet, TradeSheet, TradeSummary } from './sheets';

type Overlay = { k: 'prop'; i: number } | { k: 'manage' } | { k: 'trade' } | null;

export function GameView({ conn, state, online, notify, onLeave }: { conn: Conn; state: GameState; online: Set<string>; notify: (m: string) => void; onLeave: () => void }) {
  const me = conn.me;
  const { shown, moving } = useDisplayPositions(state);
  useBotDriver(conn, state, online);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [use3d, setUse3d] = useState(webglAvailable);
  const lastCard = useRef<number | null>(state.card?.n ?? null);

  const run = useCallback(
    async (a: Action) => {
      const err = await conn.dispatch(a);
      if (err) notify(err);
      return err;
    },
    [conn, notify],
  );
  const dispatch = useCallback((a: Action) => void run(a), [run]);

  // Show a drawn card shortly after the token arrives.
  useEffect(() => {
    const n = state.card?.n ?? null;
    if (n === lastCard.current) return;
    lastCard.current = n;
    if (n === null) return;
    const t = window.setTimeout(() => setCardOpen(true), 650);
    return () => window.clearTimeout(t);
  }, [state.card?.n]);
  const closeCard = useCallback(() => setCardOpen(false), []);

  const meP = state.players.find((p) => p.id === me);
  const cur = current(state);
  const highlight = state.step === 'buy' && !state.auction ? cur.pos : state.auction ? state.auction.sq : null;

  const rematch = useCallback(async () => {
    const err = await conn.dispatch({ t: 'reset' });
    if (err) return notify(err);
    if (conn.local) {
      const e2 = await conn.dispatch({ t: 'start' });
      if (e2) notify(e2);
    }
  }, [conn, notify]);

  return (
    <div className={`game${dockFor(state, me) ? ' has-dock' : ''}`}>
      <section className="board-col">
        {use3d ? (
          <div className="stage">
            <Suspense fallback={<div className="stage-board stage-loading">Đang dựng bàn cờ</div>}>
              <Board3D state={state} shown={shown} highlight={highlight} onTile={(i) => setOverlay({ k: 'prop', i })} onFail={() => setUse3d(false)} />
            </Suspense>
            <div className="hud">
              <Center variant="hud" state={state} me={me} online={online} local={conn.local} dispatch={dispatch} openTrade={() => setOverlay({ k: 'trade' })} />
            </div>
          </div>
        ) : (
          <Board
            state={state}
            shown={shown}
            moving={moving}
            me={me}
            highlight={highlight}
            onTile={(i) => setOverlay({ k: 'prop', i })}
            center={<Center variant="board" state={state} me={me} online={online} local={conn.local} dispatch={dispatch} openTrade={() => setOverlay({ k: 'trade' })} />}
          />
        )}
      </section>

      <aside className="side">
        <section className="panel">
          <h2 className="panel-title">Người chơi</h2>
          <Players state={state} me={me} online={online} local={conn.local} />
        </section>
        {meP && !meP.bankrupt && (
          <section className="panel">
            <h2 className="panel-title">Tài sản của bạn</h2>
            <MyAssets state={state} me={me} onOpen={(i) => setOverlay({ k: 'prop', i })} />
          </section>
        )}
        <section className="panel">
          <h2 className="panel-title">Diễn biến</h2>
          <Log state={state} />
        </section>
      </aside>

      <Dock state={state} me={me} dispatch={dispatch} openManage={() => setOverlay({ k: 'manage' })} />

      {overlay?.k === 'prop' && <PropertySheet i={overlay.i} state={state} me={me} dispatch={dispatch} onClose={() => setOverlay(null)} />}
      {overlay?.k === 'manage' && (
        <ManageSheet state={state} me={me} dispatch={dispatch} onClose={() => setOverlay(null)} onOpen={(i) => setOverlay({ k: 'prop', i })} />
      )}
      {overlay?.k === 'trade' && <TradeSheet state={state} me={me} dispatch={run} onClose={() => setOverlay(null)} />}
      {cardOpen && state.card && <CardReveal state={state} onClose={closeCard} />}
      {state.phase === 'over' && <GameOver state={state} me={me} dispatch={() => void rematch()} onLeave={onLeave} />}
    </div>
  );
}

// ---------- Center of the board ----------

function Center({ variant, state, me, online, local, dispatch, openTrade }: { variant: 'board' | 'hud'; state: GameState; me: string; online: Set<string>; local: boolean; dispatch: (a: Action) => void; openTrade: () => void }) {
  const cur = current(state);
  const meP = state.players.find((p) => p.id === me);
  const actor = actorOf(state);
  const mine = actor === me && cur.id === me && !state.debts.length && !state.auction && !state.trade;
  const curIsBot = local ? cur.id !== me : !online.has(cur.id);

  let status: React.ReactNode;
  if (state.phase === 'over') status = 'Ván chơi kết thúc';
  else if (state.debts.length) {
    const d = state.debts[0];
    const p = state.players.find((x) => x.id === d.debtor)!;
    status = d.debtor === me ? 'Bạn cần xoay tiền trả nợ' : <><Who p={p} /> đang xoay tiền</>;
  } else if (state.auction) status = <>Đấu giá {BOARD[state.auction.sq].short}</>;
  else if (state.trade) status = <>Đang chờ <Who p={state.players.find((p) => p.id === state.trade!.to)!} /></>;
  else if (cur.id === me) status = cur.inJail ? 'Bạn đang ở tù' : state.step === 'roll' && state.doublesCount > 0 ? 'Đôi! Tung thêm lượt nữa' : 'Lượt của bạn';
  else status = <>Lượt của <Who p={cur} /></>;

  return (
    <div className={variant === 'hud' ? 'hud-inner' : 'center-inner'}>
      {variant === 'board' && (
        <div className="wordmark" aria-label="Polime">
          Polime
        </div>
      )}
      <div className="status">{status}</div>
      {variant === 'board' ? (
        <Dice dice={state.dice} rollN={state.rollN} />
      ) : (
        <span className="sr-only" aria-live="polite">
          Xúc xắc {state.dice[0]} và {state.dice[1]}
        </span>
      )}
      <div className="center-actions">
        {mine && state.step === 'roll' && !cur.inJail && (
          <button type="button" className="btn btn-primary big" onClick={() => dispatch({ t: 'roll' })}>
            Tung xúc xắc
          </button>
        )}
        {mine && state.step === 'roll' && cur.inJail && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ t: 'roll' })}>
              Tung tìm đôi
            </button>
            {cur.jailCards.length > 0 ? (
              <button type="button" className="btn btn-gold" onClick={() => dispatch({ t: 'useCard' })}>
                Dùng thẻ ra tù
              </button>
            ) : (
              <button type="button" className="btn btn-gold" disabled={cur.cash < JAIL_FINE} onClick={() => dispatch({ t: 'payJail' })}>
                Nộp {vndShort(JAIL_FINE)} ra tù
              </button>
            )}
          </>
        )}
        {mine && state.step === 'buy' && (
          <>
            <div className="offer">
              <span className="sw" style={{ background: propColor(cur.pos) }} />
              {BOARD[cur.pos].short}
            </div>
            <button type="button" className="btn btn-primary" disabled={cur.cash < ownable(cur.pos).price} onClick={() => dispatch({ t: 'buy' })}>
              Mua {vndShort(ownable(cur.pos).price)}
            </button>
            <button type="button" className="btn btn-gold" onClick={() => dispatch({ t: 'decline' })}>
              Đấu giá
            </button>
          </>
        )}
        {mine && state.step === 'end' && (
          <button type="button" className="btn btn-primary big" onClick={() => dispatch({ t: 'endTurn' })}>
            Kết thúc lượt
          </button>
        )}
        {!mine && state.phase === 'playing' && !state.auction && !state.debts.length && !state.trade && curIsBot && cur.id !== me && (
          <span className="waiting">{local ? 'Máy đang đi' : 'Mất kết nối, máy chơi thay'}</span>
        )}
      </div>
      {mine && state.step !== 'buy' && alive(state).length > 1 && meP && state.tradesThisTurn < MAX_TRADES_PER_TURN && (
        <button type="button" className="link on-dark" onClick={openTrade}>
          Đề nghị giao dịch
        </button>
      )}
    </div>
  );
}

// ---------- Dock: auctions, debts and trade replies ----------

function dockFor(state: GameState, me: string) {
  if (state.phase !== 'playing') return null;
  if (state.debts[0]?.debtor === me) return 'debt';
  if (state.auction) return 'auction';
  if (state.trade && (state.trade.to === me || state.trade.from === me)) return 'trade';
  return null;
}

function Dock({ state, me, dispatch, openManage }: { state: GameState; me: string; dispatch: (a: Action) => void; openManage: () => void }) {
  const kind = dockFor(state, me);
  const [confirmBust, setConfirmBust] = useState(false);
  useEffect(() => setConfirmBust(false), [kind, state.debts[0]?.amount]);
  if (!kind) return null;
  const meP = state.players.find((p) => p.id === me)!;

  if (kind === 'debt') {
    const d = state.debts[0];
    const to = d.creditor ? state.players.find((p) => p.id === d.creditor) : null;
    const short = d.amount - meP.cash;
    return (
      <div className="dock" role="region" aria-label="Khoản nợ">
        <div className="dock-inner">
          <p className="dock-title">
            Bạn nợ {to ? <Who p={to} /> : d.toPot ? 'quỹ Bãi đỗ xe' : 'ngân hàng'} <b>{vnd(d.amount)}</b>
          </p>
          <p className="dock-sub">{short > 0 ? `Còn thiếu ${vnd(short)}. Bán nhà hoặc thế chấp để đủ tiền.` : 'Bạn đã đủ tiền, hãy trả nợ.'}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={short > 0} onClick={() => dispatch({ t: 'payDebt' })}>
              Trả nợ
            </button>
            <button type="button" className="btn btn-quiet" onClick={openManage}>
              Bán hoặc thế chấp
            </button>
            <button
              type="button"
              className={`btn ${confirmBust ? 'btn-danger' : 'btn-quiet'}`}
              onClick={() => (confirmBust ? dispatch({ t: 'bankrupt' }) : setConfirmBust(true))}
            >
              {confirmBust ? 'Chạm lần nữa để phá sản' : 'Tuyên bố phá sản'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'auction') {
    const a = state.auction!;
    const sq = ownable(a.sq);
    const turn = state.players.find((p) => p.id === a.order[a.idx])!;
    const bidder = state.players.find((p) => p.id === a.bidder);
    const myTurn = turn.id === me;
    const inIt = a.order.includes(me);
    const base = minBid(state);
    const options = Array.from(new Set([base, (a.bidder ? a.high : 0) + 50, (a.bidder ? a.high : 0) + 100])).filter((v) => v >= base);
    return (
      <div className="dock" role="region" aria-label="Đấu giá">
        <div className="dock-inner">
          <div className="auction-head">
            <span className="sw tall" style={{ background: sq.kind === 'street' ? GROUPS[sq.group].color : propColor(a.sq) }} />
            <div>
              <p className="dock-title">Đấu giá {sq.name}</p>
              <p className="dock-sub">
                Giá niêm yết {vnd(sq.price)}. {bidder ? <>Giá cao nhất {vnd(a.high)} của <Who p={bidder} /></> : 'Chưa có ai trả giá.'}
              </p>
            </div>
          </div>
          {myTurn ? (
            <div className="btn-row">
              {options.map((v) => (
                <button key={v} type="button" className="btn btn-primary" disabled={v > meP.cash} onClick={() => dispatch({ t: 'bid', amount: v })}>
                  Trả {vndShort(v)}
                </button>
              ))}
              <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'pass' })}>
                Bỏ qua
              </button>
            </div>
          ) : (
            <p className="dock-sub">
              {inIt ? 'Chờ ' : 'Bạn đã bỏ qua. Chờ '}
              <Who p={turn} /> ra giá
            </p>
          )}
        </div>
      </div>
    );
  }

  const t = state.trade!;
  const other = state.players.find((p) => p.id === (t.to === me ? t.from : t.to))!;
  return (
    <div className="dock" role="region" aria-label="Giao dịch">
      <div className="dock-inner">
        <p className="dock-title">{t.to === me ? <><Who p={other} /> muốn giao dịch với bạn</> : <>Đang chờ <Who p={other} /> trả lời</>}</p>
        <TradeSummary state={state} />
        <div className="btn-row">
          {t.to === me ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ t: 'acceptTrade' })}>
                Đồng ý
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'rejectTrade' })}>
                Từ chối
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'cancelTrade' })}>
              Rút lại đề nghị
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- My properties ----------

function MyAssets({ state, me, onOpen }: { state: GameState; me: string; onOpen: (i: number) => void }) {
  const mine = useMemo(() => OWNABLE.filter((i) => state.props[i]?.owner === me), [state, me]);
  if (!mine.length) return <p className="hint">Bạn chưa có thành phố nào. Dừng ở ô còn trống để mua, hoặc thắng một phiên đấu giá.</p>;
  return (
    <div className="assets">
      {mine.map((i) => {
        const ps = state.props[i];
        return (
          <button key={i} type="button" className={`asset${ps.mortgaged ? ' m' : ''}`} onClick={() => onOpen(i)} style={{ ['--g' as string]: propColor(i) }}>
            <span className="asset-band" />
            <span className="asset-name">{BOARD[i].short}</span>
            <span className="asset-meta">{ps.mortgaged ? 'Thế chấp' : ps.houses === 5 ? 'Khách sạn' : ps.houses ? `${ps.houses} nhà` : vndShort(ownable(i).price)}</span>
          </button>
        );
      })}
    </div>
  );
}

export { TokenDisc };

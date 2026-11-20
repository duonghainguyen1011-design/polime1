import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { GROUPS, JAIL_FINE, MAX_LEVEL, OWNABLE, ownable } from './board';
import { vnd, vndShort } from './format';
import { MAX_TRADES_PER_TURN, actorOf, alive, current, minBid } from './engine';
import type { Action, GameState } from './types';
import type { Conn } from './conn';
import { Board } from './BoardView';
import { t } from './i18n';
import { sqName, sqShort } from './names';
import { deckName } from './cards';

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
import { moveDeadline, useBotDriver, useDisplayPositions, useNow } from './hooks';
import { TokenDisc } from './icons';
import { CashDelta, Dice, Log, Players, Who, propColor } from './parts';
import { FlashCard, GameOver, ManageSheet, PropertySheet, TradeSheet, TradeSummary } from './sheets';

type Overlay = { k: 'prop'; i: number } | { k: 'manage' } | { k: 'trade' } | null;

export function GameView({ conn, state, online, notify, onLeave }: { conn: Conn; state: GameState; online: Set<string>; notify: (m: string) => void; onLeave: () => void }) {
  const me = conn.me;
  const { shown, moving } = useDisplayPositions(state);
  useBotDriver(conn, state, online);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [use3d, setUse3d] = useState(webglAvailable);
  // The flip card for a drawn Cơ hội or Khí vận: shown once the token has arrived, hideable by onlookers.
  const pendingCard = state.card?.pending ? state.card.n : null;
  const [cardShown, setCardShown] = useState<number | null>(null);
  const [cardHidden, setCardHidden] = useState<number | null>(null);

  const run = useCallback(
    async (a: Action) => {
      const err = await conn.dispatch(a);
      if (err) notify(err);
      return err;
    },
    [conn, notify],
  );
  const dispatch = useCallback((a: Action) => void run(a), [run]);

  useEffect(() => {
    if (pendingCard === null) return;
    const id = window.setTimeout(() => setCardShown(pendingCard), 1400);
    return () => window.clearTimeout(id);
  }, [pendingCard]);
  const showCard = useCallback(() => {
    setCardShown(pendingCard);
    setCardHidden(null);
  }, [pendingCard]);

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
            <Suspense fallback={<div className="stage-board stage-loading">{t('Đang dựng bàn cờ', 'Setting up the board')}</div>}>
              <Board3D state={state} shown={shown} highlight={highlight} onTile={(i) => setOverlay({ k: 'prop', i })} onFail={() => setUse3d(false)} />
            </Suspense>
            {meP && !meP.bankrupt && (
              <div className="money-pop">
                <CashDelta cash={meP.cash} big />
              </div>
            )}
            <div className="hud">
              <Center variant="hud" state={state} me={me} online={online} local={conn.local} dispatch={dispatch} openTrade={() => setOverlay({ k: 'trade' })} showCard={showCard} />
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
            center={<Center variant="board" state={state} me={me} online={online} local={conn.local} dispatch={dispatch} openTrade={() => setOverlay({ k: 'trade' })} showCard={showCard} />}
          />
        )}
      </section>

      <aside className="side">
        <section className="panel">
          <h2 className="panel-title">{t('Người chơi', 'Players')}</h2>
          <Players state={state} me={me} online={online} local={conn.local} />
        </section>
        {meP && !meP.bankrupt && (
          <section className="panel">
            <h2 className="panel-title">{t('Tài sản của bạn', 'Your properties')}</h2>
            <MyAssets state={state} me={me} onOpen={(i) => setOverlay({ k: 'prop', i })} />
          </section>
        )}
        <section className="panel">
          <h2 className="panel-title">{t('Diễn biến', 'Game log')}</h2>
          <Log state={state} />
        </section>
      </aside>

      <Dock state={state} me={me} dispatch={dispatch} openManage={() => setOverlay({ k: 'manage' })} />

      {overlay?.k === 'prop' && <PropertySheet i={overlay.i} state={state} me={me} dispatch={dispatch} onClose={() => setOverlay(null)} />}
      {overlay?.k === 'manage' && (
        <ManageSheet state={state} me={me} dispatch={dispatch} onClose={() => setOverlay(null)} onOpen={(i) => setOverlay({ k: 'prop', i })} />
      )}
      {overlay?.k === 'trade' && <TradeSheet state={state} me={me} dispatch={run} onClose={() => setOverlay(null)} />}
      {pendingCard !== null && cardShown === pendingCard && cardHidden !== pendingCard && (
        <FlashCard key={pendingCard} state={state} me={me} onResolve={() => dispatch({ t: 'resolveCard' })} onHide={() => setCardHidden(pendingCard)} />
      )}
      {state.phase === 'over' && <GameOver state={state} me={me} dispatch={() => void rematch()} onLeave={onLeave} />}
    </div>
  );
}

// ---------- Center of the board ----------

function Center({ variant, state, me, online, local, dispatch, openTrade, showCard }: { variant: 'board' | 'hud'; state: GameState; me: string; online: Set<string>; local: boolean; dispatch: (a: Action) => void; openTrade: () => void; showCard: () => void }) {
  const cur = current(state);
  const meP = state.players.find((p) => p.id === me);
  const actor = actorOf(state);
  const mine = actor === me && cur.id === me && !state.debts.length && !state.auction && !state.trade;
  const curIsBot = local ? cur.id !== me : !online.has(cur.id);

  let status: React.ReactNode;
  if (state.phase === 'over') status = t('Ván chơi kết thúc', 'Game over');
  else if (state.debts.length) {
    const d = state.debts[0];
    const p = state.players.find((x) => x.id === d.debtor)!;
    status = d.debtor === me ? t('Bạn cần xoay tiền trả nợ', 'You need to raise cash for a debt') : <><Who p={p} /> {t('đang xoay tiền', 'is raising cash')}</>;
  } else if (state.auction) status = <>{t('Đấu giá', 'Auction:')} {sqShort(state.auction.sq)}</>;
  else if (state.trade) status = <>{t('Đang chờ', 'Waiting for')} <Who p={state.players.find((p) => p.id === state.trade!.to)!} /></>;
  else if (state.step === 'card' && state.card?.pending) {
    const kind = deckName(state.card.deck);
    status = cur.id === me ? t(`Bạn rút được thẻ ${kind}`, `You drew a ${kind} card`) : <><Who p={cur} /> {t(`đang xem thẻ ${kind}`, `is reading a ${kind} card`)}</>;
  } else if (cur.id === me) status = cur.inJail ? t('Bạn đang ở tù', 'You are in jail') : state.step === 'roll' && state.doublesCount > 0 ? t('Đôi! Tung thêm lượt nữa', 'Doubles! Roll again') : t('Lượt của bạn', 'Your turn');
  else status = <>{t('Lượt của', 'Turn:')} <Who p={cur} /></>;

  return (
    <div className={variant === 'hud' ? 'hud-inner' : 'center-inner'}>
      {variant === 'board' && (
        <div className="wordmark" aria-label="Polime">
          Polime
        </div>
      )}
      <Clocks state={state} me={me} online={online} local={local} />
      <div className="status">{status}</div>
      {variant === 'board' ? (
        <Dice dice={state.dice} rollN={state.rollN} />
      ) : (
        <span className="sr-only" aria-live="polite">
          {t(`Xúc xắc ${state.dice[0]} và ${state.dice[1]}`, `Dice ${state.dice[0]} and ${state.dice[1]}`)}
        </span>
      )}
      <div className="center-actions">
        {mine && state.step === 'roll' && !cur.inJail && (
          <button type="button" className="btn btn-primary big" onClick={() => dispatch({ t: 'roll' })}>
            {t('Tung xúc xắc', 'Roll the dice')}
          </button>
        )}
        {mine && state.step === 'roll' && cur.inJail && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ t: 'roll' })}>
              {t('Tung tìm đôi', 'Roll for doubles')}
            </button>
            {cur.jailCards.length > 0 ? (
              <button type="button" className="btn btn-gold" onClick={() => dispatch({ t: 'useCard' })}>
                {t('Dùng thẻ ra tù', 'Use jail card')}
              </button>
            ) : (
              <button type="button" className="btn btn-gold" disabled={cur.cash < JAIL_FINE} onClick={() => dispatch({ t: 'payJail' })}>
                {t(`Nộp ${vndShort(JAIL_FINE)} ra tù`, `Pay ${vndShort(JAIL_FINE)} to leave`)}
              </button>
            )}
          </>
        )}
        {mine && state.step === 'buy' && (
          <>
            <div className="offer">
              <span className="sw" style={{ background: propColor(cur.pos) }} />
              {sqShort(cur.pos)}
            </div>
            <button type="button" className="btn btn-primary" disabled={cur.cash < ownable(cur.pos).price} onClick={() => dispatch({ t: 'buy' })}>
              {t('Mua', 'Buy')} {vndShort(ownable(cur.pos).price)}
            </button>
            <button type="button" className="btn btn-gold" onClick={() => dispatch({ t: 'decline' })}>
              {t('Đấu giá', 'Auction')}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'skip' })}>
              {t('Bỏ qua', 'Skip')}
            </button>
          </>
        )}
        {state.step === 'card' && state.card?.pending && (mine || !curIsBot) && (
          <button type="button" className={`btn ${mine ? 'btn-gold big' : 'btn-quiet'}`} onClick={showCard}>
            {t('Xem thẻ', 'Show card')}
          </button>
        )}
        {mine && state.step === 'end' && (
          <button type="button" className="btn btn-primary big" onClick={() => dispatch({ t: 'endTurn' })}>
            {t('Kết thúc lượt', 'End turn')}
          </button>
        )}
        {!mine && state.phase === 'playing' && !state.auction && !state.debts.length && !state.trade && curIsBot && cur.id !== me && (
          <span className="waiting">{local ? t('Máy đang đi', 'Bot is playing') : t('Mất kết nối, máy chơi thay', 'Disconnected, a bot is playing')}</span>
        )}
      </div>
      {mine && state.step !== 'buy' && state.step !== 'card' && alive(state).length > 1 && meP && state.tradesThisTurn < MAX_TRADES_PER_TURN && (
        <button type="button" className="link on-dark" onClick={openTrade}>
          {t('Đề nghị giao dịch', 'Propose a trade')}
        </button>
      )}
    </div>
  );
}

// ---------- Game clock and move timer ----------

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4.5V8l2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Clocks({ state, me, online, local }: { state: GameState; me: string; online: Set<string>; local: boolean }) {
  const playing = state.phase === 'playing';
  const actor = actorOf(state);
  const human = !!actor && (local ? actor === me : online.has(actor));
  const gameOn = playing && !!state.endsAt;
  const moveOn = playing && !!state.settings?.moveSeconds && human;
  const now = useNow(gameOn || moveOn);
  if (!gameOn && !moveOn) return null;
  const gameLeft = (state.endsAt ?? 0) - now;
  const deadline = moveDeadline(state);
  const total = (state.settings?.moveSeconds ?? 0) * 1000;
  const moveLeft = deadline ? deadline - now : 0;
  const secs = Math.max(0, Math.ceil(moveLeft / 1000));
  const ap = state.players.find((p) => p.id === actor);
  return (
    <div className="clocks">
      {gameOn && (
        <span className={`clock${gameLeft <= 0 ? ' over' : gameLeft < 120_000 ? ' low' : ''}`} role="timer" aria-label={t('Thời gian còn lại của ván', 'Time left in the game')}>
          <ClockIcon />
          {gameLeft > 0 ? t(`Ván còn ${mmss(gameLeft)}`, `Game ${mmss(gameLeft)}`) : t('Hết giờ: ván kết thúc sau lượt này', "Time's up: last turn")}
        </span>
      )}
      {moveOn && ap && (
        <span className={`clock move${secs <= 10 ? ' low' : ''}`} role="timer" aria-label={t('Thời gian cho bước này', 'Time for this move')} style={{ ['--p' as string]: total ? Math.max(0, Math.min(1, moveLeft / total)) : 0 }}>
          {secs > 0 ? (actor === me ? t(`Bạn còn ${secs} giây`, `${secs}s left`) : t(`${ap.name}: ${secs} giây`, `${ap.name}: ${secs}s`)) : t('Hết giờ, máy đi thay', 'Out of time, bot moves')}
        </span>
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
      <div className="dock" role="region" aria-label={t('Khoản nợ', 'Debt')}>
        <div className="dock-inner">
          <p className="dock-title">
            {t('Bạn nợ', 'You owe')} {to ? <Who p={to} /> : d.toPot ? t('quỹ Bãi đỗ xe', 'the Free Parking pot') : t('ngân hàng', 'the bank')} <b>{vnd(d.amount)}</b>
          </p>
          <p className="dock-sub">{short > 0 ? t(`Còn thiếu ${vnd(short)}. Bán nhà hoặc thế chấp để đủ tiền.`, `You are ${vnd(short)} short. Sell buildings or mortgage to raise it.`) : t('Bạn đã đủ tiền, hãy trả nợ.', 'You have enough now, pay the debt.')}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={short > 0} onClick={() => dispatch({ t: 'payDebt' })}>
              {t('Trả nợ', 'Pay debt')}
            </button>
            <button type="button" className="btn btn-quiet" onClick={openManage}>
              {t('Bán hoặc thế chấp', 'Sell or mortgage')}
            </button>
            <button
              type="button"
              className={`btn ${confirmBust ? 'btn-danger' : 'btn-quiet'}`}
              onClick={() => (confirmBust ? dispatch({ t: 'bankrupt' }) : setConfirmBust(true))}
            >
              {confirmBust ? t('Chạm lần nữa để phá sản', 'Tap again to go bankrupt') : t('Tuyên bố phá sản', 'Declare bankruptcy')}
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
      <div className="dock" role="region" aria-label={t('Đấu giá', 'Auction')}>
        <div className="dock-inner">
          <div className="auction-head">
            <span className="sw tall" style={{ background: sq.kind === 'street' ? GROUPS[sq.group].color : propColor(a.sq) }} />
            <div>
              <p className="dock-title">{t('Đấu giá', 'Auction:')} {sqName(a.sq)}</p>
              <p className="dock-sub">
                {t('Giá niêm yết', 'List price')} {vnd(sq.price)}. {bidder ? <>{t('Giá cao nhất', 'Top bid')} {vnd(a.high)} {t('của', 'by')} <Who p={bidder} /></> : t('Chưa có ai trả giá.', 'No bids yet.')}
              </p>
            </div>
          </div>
          {myTurn ? (
            <div className="btn-row">
              {options.map((v) => (
                <button key={v} type="button" className="btn btn-primary" disabled={v > meP.cash} onClick={() => dispatch({ t: 'bid', amount: v })}>
                  {t('Trả', 'Bid')} {vndShort(v)}
                </button>
              ))}
              <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'pass' })}>
                {t('Bỏ qua', 'Pass')}
              </button>
            </div>
          ) : (
            <p className="dock-sub">
              {inIt ? t('Chờ ', 'Waiting for ') : t('Bạn đã bỏ qua. Chờ ', 'You passed. Waiting for ')}
              <Who p={turn} /> {t('ra giá', 'to bid')}
            </p>
          )}
        </div>
      </div>
    );
  }

  const offer = state.trade!;
  const other = state.players.find((p) => p.id === (offer.to === me ? offer.from : offer.to))!;
  return (
    <div className="dock" role="region" aria-label={t('Giao dịch', 'Trade')}>
      <div className="dock-inner">
        <p className="dock-title">{offer.to === me ? <><Who p={other} /> {t('muốn giao dịch với bạn', 'wants to trade with you')}</> : <>{t('Đang chờ', 'Waiting for')} <Who p={other} /> {t('trả lời', 'to answer')}</>}</p>
        <TradeSummary state={state} />
        <div className="btn-row">
          {offer.to === me ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ t: 'acceptTrade' })}>
                {t('Đồng ý', 'Accept')}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'rejectTrade' })}>
                {t('Từ chối', 'Decline')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={() => dispatch({ t: 'cancelTrade' })}>
              {t('Rút lại đề nghị', 'Withdraw offer')}
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
  if (!mine.length) return <p className="hint">{t('Bạn chưa có thành phố nào. Dừng ở ô còn trống để mua, hoặc thắng một phiên đấu giá.', 'You own no cities yet. Land on an unowned square to buy it, or win an auction.')}</p>;
  return (
    <div className="assets">
      {mine.map((i) => {
        const ps = state.props[i];
        return (
          <button key={i} type="button" className={`asset${ps.mortgaged ? ' m' : ''}`} onClick={() => onOpen(i)} style={{ ['--g' as string]: propColor(i) }}>
            <span className="asset-band" />
            <span className="asset-name">{sqShort(i)}</span>
            <span className="asset-meta">{ps.mortgaged ? t('Thế chấp', 'Mortgaged') : ps.houses >= MAX_LEVEL ? t('Công trình', 'Landmark') : ps.houses ? t(`${ps.houses} nhà`, ps.houses === 1 ? '1 house' : `${ps.houses} houses`) : vndShort(ownable(i).price)}</span>
          </button>
        );
      })}
    </div>
  );
}

export { TokenDisc };

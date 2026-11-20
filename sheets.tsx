import { useEffect, useMemo, useState } from 'react';
import { AIRPORTS, BOARD, FREE_LEVELS, GO_SALARY, JAIL_FINE, UTILITIES, GROUPS, GROUP_SQS, MAX_LEVEL, OWNABLE, isOwnable, mortgageValue, ownable, unmortgageCost } from './board';
import { DECKS, cardAction, cardText, cardTitle, deckName } from './cards';
import { t } from './i18n';
import { groupLabel, landmarkName, sqName, sqShort, sqTag } from './names';
import { vnd, vndShort } from './format';
import { alive, canBuild, canMortgage, canSell, canUnmortgage, groupHasHouses, manageMode, netWorth, ownsGroup, streetRent } from './engine';
import type { Action, GameState } from './types';
import { TokenDisc } from './icons';
import { Sheet, Who, propColor } from './parts';

type Dispatch = (a: Action) => void;

// ---------- Deed card ----------

export function Deed({ i, state }: { i: number; state: GameState }) {
  const sq = BOARD[i];
  if (!isOwnable(sq)) return null;
  const ps = state.props[i];
  const owner = state.players.find((p) => p.id === ps?.owner);
  const band = sq.kind === 'street' ? GROUPS[sq.group] : null;
  return (
    <article className={`deed${ps?.mortgaged ? ' is-mortgaged' : ''}`} style={{ ['--g' as string]: band?.color ?? 'var(--lacquer)', ['--gi' as string]: band?.ink ?? 'var(--gold-bright)' }}>
      <header className="deed-band">
        <span className="deed-group">{sq.kind === 'street' ? groupLabel(sq.group) : sq.kind === 'airport' ? t('Sân bay', 'Airport') : t('Công ty tiện ích', 'Utility')}</span>
        <h3 className="deed-name">{sqName(i)}</h3>
        <p className="deed-tag">{sqTag(i)}</p>
      </header>
      <dl className="deed-rows">
        {sq.kind === 'street' && (
          <>
            <RentTable i={i} state={state} />
            <hr />
            <Row k={t('Giá mỗi lần lên cấp', 'Cost per level')} v={vnd(sq.house)} />
          </>
        )}
        {sq.kind === 'airport' &&
          [1, 2, 3, 4].map((n) => <Row key={n} k={t(`Sở hữu ${n} sân bay`, n === 1 ? 'Own 1 airport' : `Own ${n} airports`)} v={vnd(25 * 2 ** (n - 1))} hot={!!owner && AIRPORTS.filter((a) => state.props[a].owner === owner.id).length === n} />)}
        {sq.kind === 'utility' && (
          <>
            <Row k={t('Sở hữu 1 công ty', 'Own 1 utility')} v={t('4 × số xúc xắc', '4 × dice roll')} />
            <Row k={t('Sở hữu cả 2 công ty', 'Own both utilities')} v={t('10 × số xúc xắc', '10 × dice roll')} />
          </>
        )}
        <hr />
        <Row k={t('Giá mua', 'Price')} v={vnd(sq.price)} />
        <Row k={t('Giá trị thế chấp', 'Mortgage value')} v={vnd(mortgageValue(i))} />
      </dl>
      <footer className="deed-foot">
        {owner ? (
          <>
            {t('Chủ sở hữu:', 'Owner:')} <Who p={owner} />
            {ps.mortgaged && <span className="chip chip-warn">{t('Đang thế chấp', 'Mortgaged')}</span>}
          </>
        ) : (
          t('Chưa có chủ', 'Unowned')
        )}
      </footer>
    </article>
  );
}

const levelName = (n: number) => [t('Đất trống', 'Empty land'), t('1 nhà', '1 house'), t('2 nhà', '2 houses'), t('3 nhà', '3 houses')][n];

/** What a visitor pays at each level: on its own, and when the owner holds the whole colour group. */
function RentTable({ i, state }: { i: number; state: GameState }) {
  const sq = BOARD[i];
  if (sq.kind !== 'street') return null;
  const ps = state.props[i];
  const level = ps?.owner ? Math.min(ps.houses, MAX_LEVEL) : -1;
  const group = !!ps?.owner && ownsGroup(state, ps.owner, sq.group);
  return (
    <div className="rent-table" role="table" aria-label={t('Tiền thuê theo cấp', 'Rent by level')}>
      <div className="rt-row rt-head" role="row">
        <span role="columnheader">{t('Khách trả', 'Visitor pays')}</span>
        <span role="columnheader">{t('Thường', 'Normal')}</span>
        <span role="columnheader">{t('Cả nhóm', 'Full group')}</span>
      </div>
      {Array.from({ length: MAX_LEVEL + 1 }, (_, n) => {
        const needsGroup = n > FREE_LEVELS;
        return (
          <div key={n} className={`rt-row${n === level ? ' hot' : ''}`} role="row">
            <span role="rowheader">
              {n === MAX_LEVEL ? (
                <>
                  {t('Cấp 4', 'Level 4')} <small>{landmarkName(i) ?? t('Công trình', 'Landmark')}</small>
                </>
              ) : (
                levelName(n)
              )}
            </span>
            <span className={n === level && !group ? 'now' : ''}>{needsGroup ? <small>{t('cần cả nhóm', 'needs group')}</small> : vndShort(streetRent(sq, n, false))}</span>
            <span className={`grp${n === level && (group || needsGroup) ? ' now' : ''}`}>{vndShort(streetRent(sq, n, true))}</span>
          </div>
        );
      })}
    </div>
  );
}

function Row({ k, v, hot, sub }: { k: string; v: string; hot?: boolean; sub?: boolean }) {
  return (
    <div className={`deed-row${hot ? ' hot' : ''}${sub ? ' sub' : ''}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

// ---------- Property actions ----------

function Actions({ i, state, me, dispatch }: { i: number; state: GameState; me: string; dispatch: Dispatch }) {
  const mode = manageMode(state, me);
  const ps = state.props[i];
  if (!ps || ps.owner !== me) return null;
  if (mode === 'none') {
    return (
      <div className="deed-actions">
        <p className="hint build-why">{t('Bạn chỉ xây nhà, bán hoặc thế chấp được trong lượt của mình.', 'You can only build, sell or mortgage on your own turn.')}</p>
      </div>
    );
  }
  const sq = ownable(i);
  const buttons: { label: string; err: string | null; act: Action; show: boolean; kind?: string }[] = [
    { label: `${ps.houses === MAX_LEVEL - 1 ? t('Xây công trình', 'Build landmark') : t('Xây nhà', 'Build house')} (−${vndShort(sq.kind === 'street' ? sq.house : 0)})`, err: canBuild(state, me, i), act: { t: 'build', sq: i }, show: sq.kind === 'street' && mode === 'full' && ps.houses < MAX_LEVEL },
    { label: `${ps.houses >= MAX_LEVEL ? t('Bán công trình', 'Sell landmark') : t('Bán nhà', 'Sell house')} (+${vndShort(sq.kind === 'street' ? sq.house / 2 : 0)})`, err: canSell(state, me, i), act: { t: 'sell', sq: i }, show: sq.kind === 'street' && ps.houses > 0 },
    { label: `${t('Thế chấp', 'Mortgage')} (+${vndShort(mortgageValue(i))})`, err: canMortgage(state, me, i), act: { t: 'mortgage', sq: i }, show: !ps.mortgaged },
    { label: `${t('Chuộc lại', 'Unmortgage')} (−${vndShort(unmortgageCost(i))})`, err: canUnmortgage(state, me, i), act: { t: 'unmortgage', sq: i }, show: ps.mortgaged && mode === 'full' },
  ];
  const visible = buttons.filter((b) => b.show);
  if (!visible.length) return null;
  const firstErr = visible.find((b) => b.err)?.err;
  return (
    <div className="deed-actions">
      <div className="btn-row">
        {visible.map((b) => (
          <button key={b.act.t} type="button" className="btn btn-quiet" disabled={!!b.err} onClick={() => dispatch(b.act)}>
            {b.label}
          </button>
        ))}
      </div>
      {firstErr && <p className="hint build-why">{firstErr}</p>}
    </div>
  );
}

export function PropertySheet({ i, state, me, dispatch, onClose }: { i: number; state: GameState; me: string; dispatch: Dispatch; onClose: () => void }) {
  const sq = BOARD[i];
  if (!isOwnable(sq)) {
    return (
      <Sheet title={sqName(i)} onClose={onClose}>
        <p className="lede">{squareHelp(i, state)}</p>
      </Sheet>
    );
  }
  return (
    <Sheet title={sqName(i)} onClose={onClose}>
      <Deed i={i} state={state} />
      <Actions i={i} state={state} me={me} dispatch={dispatch} />
    </Sheet>
  );
}

function squareHelp(i: number, state: GameState) {
  const sq = BOARD[i];
  switch (sq.kind) {
    case 'go':
      return t(`Mỗi lần đi qua hoặc dừng ở đây, bạn nhận ${vnd(GO_SALARY)}.`, `Every time you pass or land here you collect ${vnd(GO_SALARY)}.`);
    case 'jail':
      return t(
        `Người vào tù được tung tìm đôi trong 3 lượt, hoặc nộp ${vnd(JAIL_FINE)} vào quỹ, hoặc dùng thẻ ra tù. Người đang ở tù không thu được tiền thuê. Dừng ở đây khi không bị bắt thì chỉ là đi thăm.`,
        `A jailed player gets 3 turns to roll doubles, or pays ${vnd(JAIL_FINE)} into the pot, or uses a jail card. Players in jail collect no rent. Landing here without being sent is just visiting.`,
      );
    case 'parking':
      return t(`Tiền thuế, tiền phạt và các khoản trả theo thẻ đều dồn vào quỹ. Ai dừng ở đây nhận toàn bộ quỹ, hiện có ${vnd(state.pot)}.`, `Taxes, fines and card payments all go into the pot. Whoever lands here takes the whole pot, now ${vnd(state.pot)}.`);
    case 'gotojail':
      return t('Dừng ở đây thì vào tù ngay, không đi qua Khởi hành.', 'Land here and you go straight to jail without passing Go.');
    case 'chance':
      return t('Rút một thẻ Cơ hội. Có thẻ đưa bạn đi xa, có thẻ bắt nộp phạt.', 'Draw a Chance card. Some send you travelling, some make you pay a fine.');
    case 'chest':
      return t('Rút một thẻ Khí vận: lì xì, hoàn thuế, viện phí và nhiều bất ngờ khác.', 'Draw a Fortune card: lucky money, tax refunds, hospital bills and other surprises.');
    case 'tax':
      return t(`Nộp ${vnd(sq.amount)} vào quỹ Bãi đỗ xe.`, `Pay ${vnd(sq.amount)} into the Free Parking pot.`);
    default:
      return '';
  }
}

// ---------- Manage all my properties (used when raising money) ----------

export function ManageSheet({ state, me, dispatch, onClose, onOpen }: { state: GameState; me: string; dispatch: Dispatch; onClose: () => void; onOpen: (i: number) => void }) {
  const mine = OWNABLE.filter((i) => state.props[i].owner === me);
  const debt = state.debts[0]?.debtor === me ? state.debts[0] : null;
  const cash = state.players.find((p) => p.id === me)?.cash ?? 0;
  return (
    <Sheet title={t('Xoay tiền', 'Raise cash')} onClose={onClose}>
      <p className="lede">
        {t('Tiền mặt', 'Cash')} <b>{vnd(cash)}</b>
        {debt && (
          <>
            <br />
            {t('Cần trả', 'You owe')} <b>{vnd(debt.amount)}</b>
          </>
        )}
      </p>
      {mine.length === 0 && <p className="hint">{t('Bạn không còn tài sản nào để bán hay thế chấp.', 'You have nothing left to sell or mortgage.')}</p>}
      <ul className="manage">
        {mine.map((i) => {
          const ps = state.props[i];
          const sellErr = canSell(state, me, i);
          const mortErr = canMortgage(state, me, i);
          return (
            <li key={i}>
              <button type="button" className="manage-name" onClick={() => onOpen(i)}>
                <span className="sw" style={{ background: propColor(i) }} />
                <span>
                  {sqName(i)}
                  <small>{ps.mortgaged ? t('Đang thế chấp', 'Mortgaged') : ps.houses >= MAX_LEVEL ? t('Công trình', 'Landmark') : ps.houses ? levelName(ps.houses) : levelName(0)}</small>
                </span>
              </button>
              <div className="btn-row tight">
                {ps.houses > 0 && (
                  <button type="button" className="btn btn-quiet sm" disabled={!!sellErr} title={sellErr ?? ''} onClick={() => dispatch({ t: 'sell', sq: i })}>
                    {ps.houses >= MAX_LEVEL ? t('Bán công trình', 'Sell landmark') : t('Bán nhà', 'Sell house')}
                  </button>
                )}
                {!ps.mortgaged && (
                  <button type="button" className="btn btn-quiet sm" disabled={!!mortErr} title={mortErr ?? ''} onClick={() => dispatch({ t: 'mortgage', sq: i })}>
                    {t('Thế chấp', 'Mortgage')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

// ---------- Trade composer ----------

function Stepper({ value, max, onChange, id }: { value: number; max: number; onChange: (v: number) => void; id: string }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)));
  return (
    <div className="stepper" id={id}>
      <button type="button" onClick={() => set(value - 100)} disabled={value <= 0} aria-label={t('Bớt 1 triệu', 'Minus 1 million')}>−{vndShort(100)}</button>
      <button type="button" onClick={() => set(value - 10)} disabled={value <= 0} aria-label={t('Bớt 100 nghìn', 'Minus 100 thousand')}>−100k</button>
      <output>{vnd(value)}</output>
      <button type="button" onClick={() => set(value + 10)} disabled={value >= max} aria-label={t('Thêm 100 nghìn', 'Plus 100 thousand')}>+100k</button>
      <button type="button" onClick={() => set(value + 100)} disabled={value >= max} aria-label={t('Thêm 1 triệu', 'Plus 1 million')}>+{vndShort(100)}</button>
    </div>
  );
}

export function TradeSheet({ state, me, dispatch, onClose }: { state: GameState; me: string; dispatch: (a: Action) => Promise<string | null>; onClose: () => void }) {
  const others = alive(state).filter((p) => p.id !== me);
  const [to, setTo] = useState(others[0]?.id ?? '');
  const [give, setGive] = useState<number[]>([]);
  const [get, setGet] = useState<number[]>([]);
  const [giveCash, setGiveCash] = useState(0);
  const [getCash, setGetCash] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const meP = state.players.find((p) => p.id === me)!;
  const them = state.players.find((p) => p.id === to);

  useEffect(() => {
    setGet([]);
    setGetCash(0);
  }, [to]);

  const tradeable = (owner: string) => OWNABLE.filter((i) => state.props[i].owner === owner && !groupHasHouses(state, i));
  const toggle = (list: number[], set: (v: number[]) => void, i: number) => set(list.includes(i) ? list.filter((x) => x !== i) : [...list, i]);
  const empty = !give.length && !get.length && !giveCash && !getCash;

  const send = async () => {
    const e = await dispatch({ t: 'proposeTrade', offer: { to, giveProps: give, getProps: get, giveCash, getCash } });
    if (e) setErr(e);
    else onClose();
  };

  return (
    <Sheet title={t('Giao dịch', 'Trade')} onClose={onClose} wide>
      <div className="trade-to" role="radiogroup" aria-label={t('Giao dịch với', 'Trade with')}>
        {others.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === to} className={`pick${p.id === to ? ' on' : ''}`} onClick={() => setTo(p.id)}>
            <TokenDisc player={p} size="1.6rem" />
            {p.name}
          </button>
        ))}
      </div>
      <div className="trade-cols">
        <section>
          <h3>{t('Bạn đưa', 'You give')}</h3>
          <PropPicker ids={tradeable(me)} sel={give} onToggle={(i) => toggle(give, setGive, i)} state={state} empty={t('Bạn chưa có tài sản trao đổi được.', 'You have nothing you can trade yet.')} />
          <Stepper id="give-cash" value={giveCash} max={meP.cash} onChange={setGiveCash} />
        </section>
        <section>
          <h3>{t('Bạn nhận', 'You get')}{them ? t(` từ ${them.name}`, ` from ${them.name}`) : ''}</h3>
          <PropPicker ids={them ? tradeable(them.id) : []} sel={get} onToggle={(i) => toggle(get, setGet, i)} state={state} empty={t('Người này chưa có tài sản trao đổi được.', 'This player has nothing they can trade yet.')} />
          <Stepper id="get-cash" value={getCash} max={them?.cash ?? 0} onChange={setGetCash} />
        </section>
      </div>
      <p className="hint">{t('Thành phố có nhà (hoặc cùng nhóm màu với thành phố có nhà của bạn) phải bán hết nhà trước khi trao đổi. Ô đang thế chấp được chuyển nguyên trạng.', 'A city with buildings (or in a colour group that has buildings) must sell them all before it can be traded. Mortgaged squares change hands as they are.')}</p>
      {err && <p className="error">{err}</p>}
      <div className="btn-row end">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          {t('Huỷ', 'Cancel')}
        </button>
        <button type="button" className="btn btn-primary" disabled={empty || !to} onClick={send}>
          {t('Gửi đề nghị', 'Send offer')}
        </button>
      </div>
    </Sheet>
  );
}

function PropPicker({ ids, sel, onToggle, state, empty }: { ids: number[]; sel: number[]; onToggle: (i: number) => void; state: GameState; empty: string }) {
  if (!ids.length) return <p className="hint">{empty}</p>;
  return (
    <div className="prop-pick">
      {ids.map((i) => (
        <button key={i} type="button" className={`ppick${sel.includes(i) ? ' on' : ''}`} aria-pressed={sel.includes(i)} onClick={() => onToggle(i)}>
          <span className="sw" style={{ background: propColor(i) }} />
          {sqShort(i)}
          {state.props[i].mortgaged && <small>{t('thế chấp', 'mortgaged')}</small>}
        </button>
      ))}
    </div>
  );
}

export function TradeSummary({ state }: { state: GameState }) {
  const offer = state.trade!;
  const from = state.players.find((p) => p.id === offer.from)!;
  const to = state.players.find((p) => p.id === offer.to)!;
  const side = (props: number[], cash: number) => (
    <ul className="tsum">
      {props.map((i) => (
        <li key={i}>
          <span className="sw" style={{ background: propColor(i) }} />
          {sqName(i)}
        </li>
      ))}
      {cash > 0 && <li className="cash">{vnd(cash)}</li>}
      {!props.length && !cash && <li className="none">{t('Không có gì', 'Nothing')}</li>}
    </ul>
  );
  return (
    <div className="trade-sum">
      <div>
        <h4>
          <Who p={from} /> {t('đưa', 'gives')}
        </h4>
        {side(offer.giveProps, offer.giveCash)}
      </div>
      <div>
        <h4>
          <Who p={to} /> {t('đưa', 'gives')}
        </h4>
        {side(offer.getProps, offer.getCash)}
      </div>
    </div>
  );
}

// ---------- Flip card for Cơ hội and Khí vận ----------

/** What a card will do to this player, worked out before they tap: money in or out, or where they will go. */
function cardPreview(state: GameState, deck: 'chance' | 'chest', id: number): { big: string; small?: string; tone: 'up' | 'down' | 'go' } {
  const c = state.card!;
  const p = state.players.find((x) => x.id === c.player)!;
  const e = DECKS[deck][id].effect;
  const others = alive(state).filter((o) => o.id !== p.id).length;
  const goTo = (to: number) => ({ big: sqName(to), small: to < p.pos || to === 0 ? t(`Nhận ${vnd(GO_SALARY)} khi qua Khởi hành`, `Collect ${vnd(GO_SALARY)} passing Go`) : undefined, tone: 'go' as const });
  switch (e.k) {
    case 'money':
      return e.amount > 0 ? { big: `+${vnd(e.amount)}`, tone: 'up' } : { big: `−${vnd(-e.amount)}`, small: t('Tiền vào quỹ Bãi đỗ xe', 'Goes into the Free Parking pot'), tone: 'down' };
    case 'advance':
      return goTo(e.to);
    case 'nearestAirport':
      return { ...goTo(AIRPORTS.find((i) => i > p.pos) ?? AIRPORTS[0]), small: t('Có chủ thì trả gấp đôi tiền thuê', 'If owned, pay double rent') };
    case 'nearestUtility':
      return { ...goTo(UTILITIES.find((i) => i > p.pos) ?? UTILITIES[0]), small: t('Có chủ thì trả 10 lần số xúc xắc', 'If owned, pay 10 × the dice') };
    case 'back':
      return { big: sqName((p.pos - e.n + 40) % 40), small: t(`Lùi ${e.n} ô`, `Back ${e.n} squares`), tone: 'go' };
    case 'jail':
      return { big: t('Nhà giam', 'Jail'), small: t('Không qua Khởi hành', 'Do not pass Go'), tone: 'down' };
    case 'jailFree':
      return { big: t('Thẻ ra tù', 'Get out of jail card'), small: t('Dùng khi bị vào tù', 'Use it when you are jailed'), tone: 'up' };
    case 'repairs': {
      let cost = 0;
      for (const i of OWNABLE) {
        const ps = state.props[i];
        if (ps?.owner === p.id) cost += ps.houses >= MAX_LEVEL ? e.hotel : ps.houses * e.house;
      }
      return cost ? { big: `−${vnd(cost)}`, small: t('Theo số nhà và công trình bạn có', 'Based on your houses and landmarks'), tone: 'down' } : { big: t('Không mất gì', 'Costs nothing'), small: t('Bạn chưa có nhà nào', 'You have no buildings yet'), tone: 'up' };
    }
    case 'payEach':
      return { big: `−${vnd(e.amount * others)}`, small: t(`${vnd(e.amount)} cho mỗi người`, `${vnd(e.amount)} to each player`), tone: 'down' };
    case 'collectEach':
      return { big: `+${vnd(e.amount * others)}`, small: t(`${vnd(e.amount)} từ mỗi người`, `${vnd(e.amount)} from each player`), tone: 'up' };
  }
}

/** The drawn card appears face down, flips over, and waits until its player taps to carry it out. */
function FlashPreview({ big, small, tone }: { big: string; small?: string; tone: 'up' | 'down' | 'go' }) {
  return (
    <div className={`flash-preview ${tone}`}>
      <b>{big}</b>
      {small && <span>{small}</span>}
    </div>
  );
}

export function FlashCard({ state, me, onResolve, onHide }: { state: GameState; me: string; onResolve: () => void; onHide: () => void }) {
  const c = state.card!;
  const card = DECKS[c.deck][c.id];
  const who = state.players.find((p) => p.id === c.player);
  const mine = c.player === me;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [flipped, setFlipped] = useState(!!reduce);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(() => setFlipped(true), 650);
    return () => window.clearTimeout(id);
  }, [reduce]);
  const kind = deckName(c.deck);
  return (
    <div className="flash-scrim" onClick={mine ? undefined : onHide}>
      <div className={`flash ${c.deck}${flipped ? ' flipped' : ''}`} role="dialog" aria-modal="true" aria-label={t(`Thẻ ${kind}: ${cardTitle(card)}`, `${kind} card: ${cardTitle(card)}`)} onClick={(e) => e.stopPropagation()}>
        <div className="flash-inner">
          <div className={`flash-face flash-back ${c.deck}`} aria-hidden={flipped}>
            {c.deck === 'chest' ? (
              <span className="seal">
                <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true">
                  <path d="M12 2.6l2.75 5.95 6.5.7-4.85 4.4 1.35 6.4L12 16.8l-5.75 3.25 1.35-6.4L2.75 9.25l6.5-.7Z" fill="currentColor" />
                </svg>
              </span>
            ) : (
              <span className="qmark">?</span>
            )}
            <span className="flash-kind-big">{kind}</span>
          </div>
          <div className={`flash-face flash-front ${c.deck}`} aria-hidden={!flipped}>
            <span className="card-kind">{kind}</span>
            <h3>{cardTitle(card)}</h3>
            <p>{cardText(card)}</p>
            <FlashPreview {...cardPreview(state, c.deck, c.id)} />
            <div className="flash-act">
              {mine ? (
                <button
                  type="button"
                  className="btn btn-gold big"
                  disabled={!flipped || busy}
                  autoFocus
                  onClick={() => {
                    setBusy(true);
                    onResolve();
                  }}
                >
                  {cardAction(card)}
                </button>
              ) : (
                <span className="flash-wait">{who ? <>{t('Đang chờ', 'Waiting for')} <Who p={who} /></> : t('Đang chờ', 'Waiting')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {!mine && (
        <button type="button" className="link flash-hide" onClick={onHide}>
          {t('Ẩn thẻ', 'Hide card')}
        </button>
      )}
    </div>
  );
}

// ---------- Game over ----------

export function GameOver({ state, me, dispatch, onLeave }: { state: GameState; me: string; dispatch: Dispatch; onLeave: () => void }) {
  const winner = state.players.find((p) => p.id === state.winner);
  const ranking = useMemo(() => state.players.slice().sort((a, b) => netWorth(state, b.id) - netWorth(state, a.id)), [state]);
  return (
    <div className="scrim">
      <div className="sheet over" role="dialog" aria-modal="true">
        {winner && (
          <div className="victory">
            <TokenDisc player={winner} size="5.5rem" ring />
            <h2>{winner.id === me ? t('Bạn thắng rồi!', 'You win!') : t(`${winner.name} chiến thắng`, `${winner.name} wins`)}</h2>
            <p>
              {state.endedBy === 'time'
                ? t('Hết giờ chơi. Người giàu nhất trên bàn cờ giành chiến thắng.', 'Time ran out. The richest player on the board takes the win.')
                : t('Tỷ phú cuối cùng còn trụ lại trên bàn cờ.', 'The last tycoon left standing on the board.')}
            </p>
          </div>
        )}
        <p className="hint rank-note">{t('Xếp hạng theo tổng tài sản: tiền mặt, thành phố và nhà cửa.', 'Ranked by net worth: cash, cities and buildings.')}</p>
        <ol className="ranking">
          {ranking.map((p) => (
            <li key={p.id}>
              <Who p={p} />
              <span>{p.bankrupt ? t('Phá sản', 'Bankrupt') : vnd(netWorth(state, p.id))}</span>
            </li>
          ))}
        </ol>
        <div className="btn-row end">
          <button type="button" className="btn btn-quiet" onClick={onLeave}>
            {t('Về trang chủ', 'Back to home')}
          </button>
          {state.hostId === me && (
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ t: 'reset' })}>
              {t('Chơi ván mới', 'Play again')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { GROUP_SQS };

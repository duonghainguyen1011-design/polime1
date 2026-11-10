import { useEffect, useMemo, useState } from 'react';
import { AIRPORTS, BOARD, GROUPS, GROUP_SQS, OWNABLE, isOwnable, mortgageValue, ownable, unmortgageCost } from './board';
import { DECKS } from './cards';
import { vnd, vndShort } from './format';
import { alive, canBuild, canMortgage, canSell, canUnmortgage, groupHasHouses, manageMode, netWorth } from './engine';
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
        <span className="deed-group">{band ? band.label : sq.kind === 'airport' ? 'Sân bay' : 'Công ty tiện ích'}</span>
        <h3 className="deed-name">{sq.name}</h3>
        <p className="deed-tag">{sq.tagline}</p>
      </header>
      <dl className="deed-rows">
        {sq.kind === 'street' && (
          <>
            <Row k="Tiền thuê" v={vnd(sq.rent[0])} hot={ps?.houses === 0} />
            <Row k="Sở hữu cả nhóm" v={vnd(sq.rent[0] * 2)} sub />
            {[1, 2, 3, 4].map((n) => (
              <Row key={n} k={`Với ${n} nhà`} v={vnd(sq.rent[n])} hot={ps?.houses === n} />
            ))}
            <Row k="Với khách sạn" v={vnd(sq.rent[5])} hot={ps?.houses === 5} />
            <hr />
            <Row k="Giá mỗi nhà" v={vnd(sq.house)} />
          </>
        )}
        {sq.kind === 'airport' &&
          [1, 2, 3, 4].map((n) => <Row key={n} k={`Sở hữu ${n} sân bay`} v={vnd(25 * 2 ** (n - 1))} hot={!!owner && AIRPORTS.filter((a) => state.props[a].owner === owner.id).length === n} />)}
        {sq.kind === 'utility' && (
          <>
            <Row k="Sở hữu 1 công ty" v="4 × số xúc xắc" />
            <Row k="Sở hữu cả 2 công ty" v="10 × số xúc xắc" />
          </>
        )}
        <hr />
        <Row k="Giá mua" v={vnd(sq.price)} />
        <Row k="Giá trị thế chấp" v={vnd(mortgageValue(i))} />
      </dl>
      <footer className="deed-foot">
        {owner ? (
          <>
            Chủ sở hữu: <Who p={owner} />
            {ps.mortgaged && <span className="chip chip-warn">Đang thế chấp</span>}
          </>
        ) : (
          'Chưa có chủ'
        )}
      </footer>
    </article>
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
  if (!ps || ps.owner !== me || mode === 'none') return null;
  const sq = ownable(i);
  const buttons: { label: string; err: string | null; act: Action; show: boolean; kind?: string }[] = [
    { label: `Xây ${ps.houses === 4 ? 'khách sạn' : 'nhà'} (−${vndShort(sq.kind === 'street' ? sq.house : 0)})`, err: canBuild(state, me, i), act: { t: 'build', sq: i }, show: sq.kind === 'street' && mode === 'full' && ps.houses < 5 },
    { label: `Bán ${ps.houses === 5 ? 'khách sạn' : 'nhà'} (+${vndShort(sq.kind === 'street' ? sq.house / 2 : 0)})`, err: canSell(state, me, i), act: { t: 'sell', sq: i }, show: sq.kind === 'street' && ps.houses > 0 },
    { label: `Thế chấp (+${vndShort(mortgageValue(i))})`, err: canMortgage(state, me, i), act: { t: 'mortgage', sq: i }, show: !ps.mortgaged },
    { label: `Chuộc lại (−${vndShort(unmortgageCost(i))})`, err: canUnmortgage(state, me, i), act: { t: 'unmortgage', sq: i }, show: ps.mortgaged && mode === 'full' },
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
      {firstErr && visible.every((b) => b.err) && <p className="hint">{firstErr}</p>}
    </div>
  );
}

export function PropertySheet({ i, state, me, dispatch, onClose }: { i: number; state: GameState; me: string; dispatch: Dispatch; onClose: () => void }) {
  const sq = BOARD[i];
  if (!isOwnable(sq)) {
    return (
      <Sheet title={sq.name} onClose={onClose}>
        <p className="lede">{squareHelp(i, state)}</p>
      </Sheet>
    );
  }
  return (
    <Sheet title={sq.name} onClose={onClose}>
      <Deed i={i} state={state} />
      <Actions i={i} state={state} me={me} dispatch={dispatch} />
    </Sheet>
  );
}

function squareHelp(i: number, state: GameState) {
  const sq = BOARD[i];
  switch (sq.kind) {
    case 'go':
      return `Mỗi lần đi qua hoặc dừng ở đây, bạn nhận ${vnd(200)}.`;
    case 'jail':
      return `Người vào tù được tung tìm đôi trong 3 lượt, hoặc nộp ${vnd(50)} vào quỹ, hoặc dùng thẻ ra tù. Người đang ở tù không thu được tiền thuê. Dừng ở đây khi không bị bắt thì chỉ là đi thăm.`;
    case 'parking':
      return `Tiền thuế, tiền phạt và các khoản trả theo thẻ đều dồn vào quỹ. Ai dừng ở đây nhận toàn bộ quỹ, hiện có ${vnd(state.pot)}.`;
    case 'gotojail':
      return 'Dừng ở đây thì vào tù ngay, không đi qua Khởi hành.';
    case 'chance':
      return 'Rút một thẻ Cơ hội. Có thẻ đưa bạn đi xa, có thẻ bắt nộp phạt.';
    case 'chest':
      return 'Rút một thẻ Khí vận: lì xì, hoàn thuế, viện phí và nhiều bất ngờ khác.';
    case 'tax':
      return `Nộp ${vnd(sq.amount)} vào quỹ Bãi đỗ xe.`;
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
    <Sheet title="Xoay tiền" onClose={onClose}>
      <p className="lede">
        Tiền mặt <b>{vnd(cash)}</b>
        {debt && (
          <>
            <br />
            Cần trả <b>{vnd(debt.amount)}</b>
          </>
        )}
      </p>
      {mine.length === 0 && <p className="hint">Bạn không còn tài sản nào để bán hay thế chấp.</p>}
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
                  {BOARD[i].name}
                  <small>{ps.mortgaged ? 'Đang thế chấp' : ps.houses === 5 ? 'Khách sạn' : ps.houses ? `${ps.houses} nhà` : 'Đất trống'}</small>
                </span>
              </button>
              <div className="btn-row tight">
                {ps.houses > 0 && (
                  <button type="button" className="btn btn-quiet sm" disabled={!!sellErr} title={sellErr ?? ''} onClick={() => dispatch({ t: 'sell', sq: i })}>
                    Bán nhà
                  </button>
                )}
                {!ps.mortgaged && (
                  <button type="button" className="btn btn-quiet sm" disabled={!!mortErr} title={mortErr ?? ''} onClick={() => dispatch({ t: 'mortgage', sq: i })}>
                    Thế chấp
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
      <button type="button" onClick={() => set(value - 100)} disabled={value <= 0} aria-label="Bớt 1 triệu">−1tr</button>
      <button type="button" onClick={() => set(value - 10)} disabled={value <= 0} aria-label="Bớt 100 nghìn">−100k</button>
      <output>{vnd(value)}</output>
      <button type="button" onClick={() => set(value + 10)} disabled={value >= max} aria-label="Thêm 100 nghìn">+100k</button>
      <button type="button" onClick={() => set(value + 100)} disabled={value >= max} aria-label="Thêm 1 triệu">+1tr</button>
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
    <Sheet title="Giao dịch" onClose={onClose} wide>
      <div className="trade-to" role="radiogroup" aria-label="Giao dịch với">
        {others.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === to} className={`pick${p.id === to ? ' on' : ''}`} onClick={() => setTo(p.id)}>
            <TokenDisc player={p} size="1.6rem" />
            {p.name}
          </button>
        ))}
      </div>
      <div className="trade-cols">
        <section>
          <h3>Bạn đưa</h3>
          <PropPicker ids={tradeable(me)} sel={give} onToggle={(i) => toggle(give, setGive, i)} state={state} empty="Bạn chưa có tài sản trao đổi được." />
          <Stepper id="give-cash" value={giveCash} max={meP.cash} onChange={setGiveCash} />
        </section>
        <section>
          <h3>Bạn nhận{them ? ` từ ${them.name}` : ''}</h3>
          <PropPicker ids={them ? tradeable(them.id) : []} sel={get} onToggle={(i) => toggle(get, setGet, i)} state={state} empty="Người này chưa có tài sản trao đổi được." />
          <Stepper id="get-cash" value={getCash} max={them?.cash ?? 0} onChange={setGetCash} />
        </section>
      </div>
      <p className="hint">Ô có nhà trong nhóm màu phải bán hết nhà trước khi trao đổi. Ô đang thế chấp được chuyển nguyên trạng.</p>
      {err && <p className="error">{err}</p>}
      <div className="btn-row end">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          Huỷ
        </button>
        <button type="button" className="btn btn-primary" disabled={empty || !to} onClick={send}>
          Gửi đề nghị
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
          {BOARD[i].short}
          {state.props[i].mortgaged && <small>thế chấp</small>}
        </button>
      ))}
    </div>
  );
}

export function TradeSummary({ state }: { state: GameState }) {
  const t = state.trade!;
  const from = state.players.find((p) => p.id === t.from)!;
  const to = state.players.find((p) => p.id === t.to)!;
  const side = (props: number[], cash: number) => (
    <ul className="tsum">
      {props.map((i) => (
        <li key={i}>
          <span className="sw" style={{ background: propColor(i) }} />
          {BOARD[i].name}
        </li>
      ))}
      {cash > 0 && <li className="cash">{vnd(cash)}</li>}
      {!props.length && !cash && <li className="none">Không có gì</li>}
    </ul>
  );
  return (
    <div className="trade-sum">
      <div>
        <h4>
          <Who p={from} /> đưa
        </h4>
        {side(t.giveProps, t.giveCash)}
      </div>
      <div>
        <h4>
          <Who p={to} /> đưa
        </h4>
        {side(t.getProps, t.getCash)}
      </div>
    </div>
  );
}

// ---------- Card reveal ----------

export function CardReveal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const c = state.card!;
  const card = DECKS[c.deck][c.id];
  const who = state.players.find((p) => p.id === c.player);
  useEffect(() => {
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div className="scrim soft" onClick={onClose}>
      <div className={`card-reveal ${c.deck}`} role="dialog" aria-live="assertive">
        <div className="card-kind">{c.deck === 'chance' ? 'Cơ hội' : 'Khí vận'}</div>
        <h3>{card.title}</h3>
        <p>{card.text}</p>
        {who && (
          <div className="card-who">
            <Who p={who} />
          </div>
        )}
      </div>
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
            <h2>{winner.id === me ? 'Bạn thắng rồi!' : `${winner.name} chiến thắng`}</h2>
            <p>Tỷ phú cuối cùng còn trụ lại trên bàn cờ.</p>
          </div>
        )}
        <p className="hint rank-note">Xếp hạng theo tổng tài sản: tiền mặt, thành phố và nhà cửa.</p>
        <ol className="ranking">
          {ranking.map((p) => (
            <li key={p.id}>
              <Who p={p} />
              <span>{p.bankrupt ? 'Phá sản' : vnd(netWorth(state, p.id))}</span>
            </li>
          ))}
        </ol>
        <div className="btn-row end">
          <button type="button" className="btn btn-quiet" onClick={onLeave}>
            Về trang chủ
          </button>
          {state.hostId === me && (
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ t: 'reset' })}>
              Chơi ván mới
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { GROUP_SQS };

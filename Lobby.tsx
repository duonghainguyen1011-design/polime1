import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, TOKENS } from './tokens';
import type { GameState, TokenId } from './types';
import type { Conn } from './conn';
import { TokenDisc, TokenIcon } from './icons';

export function TokenPicker({ value, onChange, taken = [] }: { value: TokenId; onChange: (t: TokenId) => void; taken?: TokenId[] }) {
  return (
    <div className="token-picker" role="radiogroup" aria-label="Chọn quân cờ">
      {TOKENS.map((t) => {
        const off = taken.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={value === t.id}
            disabled={off}
            className={`tk${value === t.id ? ' on' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="tk-art">
              <TokenIcon id={t.id} size="70%" />
            </span>
            <span className="tk-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Lobby({ conn, state, notify, defaults, onProfile }: { conn: Conn; state: GameState; notify: (m: string) => void; defaults: { name: string; token: TokenId }; onProfile: (name: string, token: TokenId) => void }) {
  const me = conn.me;
  const seat = state.players.find((p) => p.id === me);
  const taken = state.players.filter((p) => p.id !== me).map((p) => p.token);
  const [name, setName] = useState(seat?.name ?? defaults.name);
  const [token, setToken] = useState<TokenId>(seat?.token ?? (taken.includes(defaults.token) ? TOKENS.find((t) => !taken.includes(t.id))!.id : defaults.token));
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?r=${conn.code}`;
  const isHost = state.hostId === me;

  const copy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Polime', text: `Vào phòng Polime ${conn.code}`, url: link });
        return;
      }
    } catch {
      /* share dismissed or unavailable */
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Không sao chép được. Hãy gửi mã phòng cho bạn bè.');
    }
  };

  const join = async () => {
    const err = await conn.dispatch({ t: 'join', name, token });
    if (err) notify(err);
    else onProfile(name.trim(), token);
  };

  return (
    <div className="lobby">
      <section className="room-card">
        <p className="eyebrow-quiet">Mã phòng</p>
        <div className="room-code">{conn.code}</div>
        <button type="button" className="btn btn-gold" onClick={copy}>
          {copied ? 'Đã sao chép liên kết' : 'Mời bạn bè'}
        </button>
        <p className="room-link">{link}</p>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Người chơi <span className="count">{state.players.length}/{MAX_PLAYERS}</span>
        </h2>
        <ul className="seats">
          {state.players.map((p) => (
            <li key={p.id}>
              <TokenDisc player={p} size="2.4rem" />
              <span className="seat-name">{p.name}</span>
              {p.id === state.hostId && <span className="chip">Chủ phòng</span>}
              {p.id === me && <span className="chip chip-muted">Bạn</span>}
              {!conn.online.has(p.id) && <span className="chip chip-muted">Chưa vào</span>}
            </li>
          ))}
          {Array.from({ length: MAX_PLAYERS - state.players.length }, (_, k) => (
            <li key={`e${k}`} className="empty">
              <span className="seat-empty" />
              <span className="seat-name">Ghế trống</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">{seat ? 'Quân cờ của bạn' : 'Vào phòng'}</h2>
        <label className="field" htmlFor="lobby-name">
          <span>Tên của bạn</span>
          <input id="lobby-name" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Hải" autoComplete="nickname" />
        </label>
        <TokenPicker value={token} onChange={setToken} taken={taken} />
        <div className="btn-row">
          {(!seat || seat.name !== name.trim() || seat.token !== token) && (
            <button type="button" className={`btn ${seat ? 'btn-quiet' : 'btn-primary'}`} disabled={!name.trim() || (!seat && state.players.length >= MAX_PLAYERS)} onClick={join}>
              {seat ? 'Lưu thay đổi' : 'Vào phòng'}
            </button>
          )}
          {seat && (
            <button type="button" className="btn btn-quiet" onClick={() => conn.dispatch({ t: 'leave' }).then((e) => e && notify(e))}>
              Rời phòng
            </button>
          )}
        </div>
      </section>

      <div className="lobby-foot">
        {isHost ? (
          <button type="button" className="btn btn-primary big" disabled={state.players.length < MIN_PLAYERS} onClick={() => conn.dispatch({ t: 'start' }).then((e) => e && notify(e))}>
            {state.players.length < MIN_PLAYERS ? 'Cần ít nhất 2 người' : 'Bắt đầu ván'}
          </button>
        ) : (
          <p className="waiting dark">{seat ? 'Đang chờ chủ phòng bắt đầu ván' : 'Chọn tên và quân cờ để vào phòng'}</p>
        )}
      </div>
    </div>
  );
}

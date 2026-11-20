import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, TOKENS } from './tokens';
import type { GameState, Settings, TokenId } from './types';
import type { Conn } from './conn';
import { TokenDisc, TokenIcon } from './icons';
import { GAME_MINUTES, MOVE_SECONDS } from './engine';
import { getLang, t } from './i18n';

export function TokenPicker({ value, onChange, taken = [] }: { value: TokenId; onChange: (t: TokenId) => void; taken?: TokenId[] }) {
  const en = getLang() === 'en';
  return (
    <div className="token-picker" role="radiogroup" aria-label={t('Chọn quân cờ', 'Pick a token')}>
      {TOKENS.map((tk) => {
        const off = taken.includes(tk.id);
        return (
          <button
            key={tk.id}
            type="button"
            role="radio"
            aria-checked={value === tk.id}
            disabled={off}
            className={`tk${value === tk.id ? ' on' : ''}`}
            onClick={() => onChange(tk.id)}
          >
            <span className="tk-art">
              <TokenIcon id={tk.id} size="70%" />
            </span>
            <span className="tk-label">{en ? tk.labelEn : tk.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const gameLengthText = (m: number) => (m ? t(`${m} phút`, `${m} min`) : t('Không giới hạn', 'No limit'));
export const moveTimeText = (sec: number) => (sec ? t(`${sec} giây`, `${sec} s`) : t('Không giới hạn', 'No limit'));

/** Game clock and move timer. Editable for the host (or practice), read only for everyone else. */
export function TimerSettings({ value, onChange, idPrefix, readOnly = false }: { value: Settings; onChange?: (s: Settings) => void; idPrefix: string; readOnly?: boolean }) {
  const rows = [
    {
      key: 'gameMinutes' as const,
      label: t('Thời gian cả ván', 'Game clock'),
      unit: t('phút', 'min'),
      options: GAME_MINUTES,
      hint: value.gameMinutes
        ? t(`Sau ${value.gameMinutes} phút, ván kết thúc khi xong lượt đang chơi. Người giàu nhất (tiền mặt cộng giá trị tài sản) thắng.`, `After ${value.gameMinutes} minutes the game ends once the current turn is done. The richest player (cash plus property value) wins.`)
        : t('Chơi đến khi chỉ còn một người trụ lại.', 'Play until only one player is left standing.'),
    },
    {
      key: 'moveSeconds' as const,
      label: t('Thời gian mỗi lượt', 'Move timer'),
      unit: t('giây', 'sec'),
      options: MOVE_SECONDS,
      hint: value.moveSeconds
        ? t(`Mỗi bước có ${value.moveSeconds} giây. Quá giờ thì máy đi thay đến hết lượt: tung xúc xắc, bỏ qua ô trống, kết thúc lượt. Máy không mua, không xây, không giao dịch bằng tiền của bạn.`, `Each step has ${value.moveSeconds} seconds. Run over and a bot finishes your turn: it rolls, skips any purchase and ends the turn. It never buys, builds or trades with your money.`)
        : t('Mọi người suy nghĩ thoải mái, không bị bấm giờ.', 'Take as long as you like, nobody is timed.'),
    },
  ];
  return (
    <div className="timers">
      {rows.map((r) => {
        const id = `${idPrefix}-${r.key}`;
        const cur = value[r.key];
        return (
          <div key={r.key} className="timer-row">
            <div className="timer-head">
              <span id={id}>{r.label}</span>
              <span className="timer-val">{r.key === 'gameMinutes' ? gameLengthText(cur) : moveTimeText(cur)}</span>
            </div>
            {!readOnly && (
              <div className="seg seg-wide" role="radiogroup" aria-labelledby={id}>
                {r.options.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={cur === n}
                    aria-label={n ? `${n} ${r.unit}` : t('Tắt', 'Off')}
                    className={cur === n ? 'on' : ''}
                    onClick={() => onChange?.({ ...value, [r.key]: n })}
                  >
                    {n || t('Tắt', 'Off')}
                  </button>
                ))}
              </div>
            )}
            <p className="hint">{r.hint}</p>
          </div>
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
  const [token, setToken] = useState<TokenId>(seat?.token ?? (taken.includes(defaults.token) ? TOKENS.find((tk) => !taken.includes(tk.id))!.id : defaults.token));
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?r=${conn.code}`;
  const isHost = state.hostId === me;

  const copy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Polime', text: t(`Vào phòng Polime ${conn.code}`, `Join my Polime room ${conn.code}`), url: link });
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
      notify(t('Không sao chép được. Hãy gửi mã phòng cho bạn bè.', "Couldn't copy. Send your friends the room code instead."));
    }
  };

  const join = async () => {
    const err = await conn.dispatch({ t: 'join', name, token });
    if (err) notify(err);
    else onProfile(name.trim(), token);
  };

  const changeSettings = (next: Settings) => {
    conn.dispatch({ t: 'settings', ...next }).then((e) => e && notify(e));
  };

  return (
    <div className="lobby">
      <section className="room-card">
        <p className="eyebrow-quiet">{t('Mã phòng', 'Room code')}</p>
        <div className="room-code">{conn.code}</div>
        <button type="button" className="btn btn-gold" onClick={copy}>
          {copied ? t('Đã sao chép liên kết', 'Link copied') : t('Mời bạn bè', 'Invite friends')}
        </button>
        <p className="room-link">{link}</p>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          {t('Người chơi', 'Players')} <span className="count">{state.players.length}/{MAX_PLAYERS}</span>
        </h2>
        <ul className="seats">
          {state.players.map((p) => (
            <li key={p.id}>
              <TokenDisc player={p} size="2.4rem" />
              <span className="seat-name">{p.name}</span>
              {p.id === state.hostId && <span className="chip">{t('Chủ phòng', 'Host')}</span>}
              {p.id === me && <span className="chip chip-muted">{t('Bạn', 'You')}</span>}
              {!conn.online.has(p.id) && <span className="chip chip-muted">{t('Chưa vào', 'Away')}</span>}
            </li>
          ))}
          {Array.from({ length: MAX_PLAYERS - state.players.length }, (_, k) => (
            <li key={`e${k}`} className="empty">
              <span className="seat-empty" />
              <span className="seat-name">{t('Ghế trống', 'Empty seat')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          {t('Thời gian', 'Timers')}
          {!isHost && <span className="count">{t('Chủ phòng chọn', 'Set by the host')}</span>}
        </h2>
        <TimerSettings value={state.settings} onChange={changeSettings} idPrefix="lobby" readOnly={!isHost} />
      </section>

      <section className="panel">
        <h2 className="panel-title">{seat ? t('Quân cờ của bạn', 'Your token') : t('Vào phòng', 'Join the room')}</h2>
        <label className="field" htmlFor="lobby-name">
          <span>{t('Tên của bạn', 'Your name')}</span>
          <input id="lobby-name" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder={t('Ví dụ: Hải', 'For example: Hải')} autoComplete="nickname" />
        </label>
        <TokenPicker value={token} onChange={setToken} taken={taken} />
        <div className="btn-row">
          {(!seat || seat.name !== name.trim() || seat.token !== token) && (
            <button type="button" className={`btn ${seat ? 'btn-quiet' : 'btn-primary'}`} disabled={!name.trim() || (!seat && state.players.length >= MAX_PLAYERS)} onClick={join}>
              {seat ? t('Lưu thay đổi', 'Save changes') : t('Vào phòng', 'Join')}
            </button>
          )}
          {seat && (
            <button type="button" className="btn btn-quiet" onClick={() => conn.dispatch({ t: 'leave' }).then((e) => e && notify(e))}>
              {t('Rời phòng', 'Leave room')}
            </button>
          )}
        </div>
      </section>

      <div className="lobby-foot">
        {isHost ? (
          <button type="button" className="btn btn-primary big" disabled={state.players.length < MIN_PLAYERS} onClick={() => conn.dispatch({ t: 'start' }).then((e) => e && notify(e))}>
            {state.players.length < MIN_PLAYERS ? t('Cần ít nhất 2 người', 'Need at least 2 players') : t('Bắt đầu ván', 'Start the game')}
          </button>
        ) : (
          <p className="waiting dark">{seat ? t('Đang chờ chủ phòng bắt đầu ván', 'Waiting for the host to start') : t('Chọn tên và quân cờ để vào phòng', 'Pick a name and a token to join')}</p>
        )}
      </div>
    </div>
  );
}

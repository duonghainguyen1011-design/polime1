import { useState } from 'react';
import { TOKENS } from './tokens';
import type { Settings, TokenId } from './types';
import { onlineEnabled } from './conn';
import { TokenIcon } from './icons';
import { TimerSettings, TokenPicker } from './Lobby';
import { t } from './i18n';
import { vnd } from './format';
import { GO_SALARY, START_CASH } from './board';

interface Props {
  defaults: { name: string; token: TokenId };
  canResume: boolean;
  busy: boolean;
  onCreate: (name: string, token: TokenId) => void;
  onJoin: (code: string) => void;
  onPractice: (name: string, token: TokenId, bots: number, settings: Settings) => void;
  onResume: () => void;
}

export function Home({ defaults, canResume, busy, onCreate, onJoin, onPractice, onResume }: Props) {
  const [name, setName] = useState(defaults.name);
  const [token, setToken] = useState<TokenId>(defaults.token);
  const [code, setCode] = useState('');
  const [bots, setBots] = useState(3);
  const [settings, setSettings] = useState<Settings>({ gameMinutes: 0, moveSeconds: 0 });
  const ready = name.trim().length > 0;

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-board" aria-hidden="true">
          {TOKENS.map((tk, k) => (
            <span key={tk.id} className="hero-token" style={{ ['--k' as string]: k }}>
              <TokenIcon id={tk.id} size="62%" />
            </span>
          ))}
        </div>
        <h1 className="hero-mark">Polime</h1>
        <p className="hero-line">{t('Mua thành phố, xây công trình, đi khắp Việt Nam cùng bạn bè.', 'Buy cities, build landmarks and travel across Vietnam with your friends.')}</p>
      </header>

      <section className="panel">
        <h2 className="panel-title">{t('Bạn là ai?', 'Who are you?')}</h2>
        <label className="field" htmlFor="home-name">
          <span>{t('Tên hiển thị', 'Display name')}</span>
          <input id="home-name" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder={t('Ví dụ: Hải', 'For example: Hải')} autoComplete="nickname" />
        </label>
        <TokenPicker value={token} onChange={setToken} />
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('Chơi online', 'Play online')}</h2>
        {!onlineEnabled && <p className="hint">{t('Bản này chưa kết nối máy chủ nên chỉ chơi thử được với máy.', 'This copy is not connected to a server, so you can only practise against bots.')}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={!onlineEnabled || !ready || busy} onClick={() => onCreate(name.trim(), token)}>
            {t('Tạo phòng mới', 'Create a room')}
          </button>
        </div>
        <p className="hint">{t('Bạn chỉnh thời gian ván và thời gian mỗi lượt trong phòng chờ.', 'You set the game clock and the move timer in the lobby.')}</p>
        <form
          className="join-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) onJoin(code.trim().toUpperCase());
          }}
        >
          <label className="field grow" htmlFor="home-code">
            <span>{t('Có mã phòng?', 'Have a room code?')}</span>
            <input id="home-code" value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('VD: K7QMA', 'e.g. K7QMA')} autoCapitalize="characters" autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-gold" disabled={!onlineEnabled || code.trim().length < 5 || busy}>
            {t('Vào phòng', 'Join')}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('Chơi thử với máy', 'Practise against bots')}</h2>
        <div className="bots-row">
          <span id="bots-label">{t('Số đối thủ', 'Opponents')}</span>
          <div className="seg" role="radiogroup" aria-labelledby="bots-label">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={bots === n} className={bots === n ? 'on' : ''} onClick={() => setBots(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <TimerSettings value={settings} onChange={setSettings} idPrefix="home" />
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => onPractice(name.trim(), token, bots, settings)}>
            {t('Bắt đầu chơi thử', 'Start practice game')}
          </button>
          {canResume && (
            <button type="button" className="btn btn-quiet" onClick={onResume}>
              {t('Tiếp tục ván đang chơi', 'Continue your game')}
            </button>
          )}
        </div>
      </section>

      <footer className="home-foot">
        <details>
          <summary>{t('Luật chơi tóm tắt', 'Quick rules')}</summary>
          <ul>
            <li>{t(`Mỗi người bắt đầu với ${vnd(START_CASH)}. Đi qua Khởi hành nhận ${vnd(GO_SALARY)}.`, `Everyone starts with ${vnd(START_CASH)}. Passing Go pays ${vnd(GO_SALARY)}.`)}</li>
            <li>{t('Dừng ở thành phố còn trống thì được mua, đem ra đấu giá, hoặc bỏ qua.', 'Land on an unowned city to buy it, put it up for auction, or skip it.')}</li>
            <li>{t('Mỗi thành phố có 4 cấp: 1 nhà, 2 nhà, 3 nhà, rồi công trình biểu tượng.', 'Every city has 4 levels: 1 house, 2 houses, 3 houses, then its landmark.')}</li>
            <li>{t('Cấp 1 và 2 xây được trên bất kỳ thành phố nào của bạn. Cấp 3 và công trình cần sở hữu cả nhóm màu.', 'Levels 1 and 2 can go on any city you own. Level 3 and the landmark need the whole colour group.')}</li>
            <li>{t('Sở hữu cả nhóm màu thì tiền thuê cao hơn: gấp đôi khi đất trống, gấp rưỡi khi có 1 hoặc 2 nhà.', 'Owning the whole colour group raises rent: double on empty land, one and a half times with 1 or 2 houses.')}</li>
            <li>{t('Dừng ở Cơ hội hoặc Khí vận thì lật thẻ xem trước, rồi mới thực hiện.', 'On Chance or Fortune the card flips over first so you see what happens before it does.')}</li>
            <li>{t('Thuế, tiền phạt và khoản trả theo thẻ dồn vào quỹ Bãi đỗ xe. Ai dừng ở đó nhận hết quỹ.', 'Taxes, fines and card payments go into the Free Parking pot. Whoever lands there takes it all.')}</li>
            <li>{t('Người đang ở tù không thu được tiền thuê.', 'Players in jail collect no rent.')}</li>
            <li>{t('Trong lượt của mình, bạn có thể đề nghị giao dịch thành phố và tiền mặt với người khác.', 'On your turn you can offer trades of cities and cash to other players.')}</li>
            <li>{t('Chủ phòng có thể đặt giờ cho cả ván (hết giờ thì người giàu nhất thắng) và giờ cho mỗi lượt (quá giờ thì máy tung xúc xắc, bỏ qua ô trống và kết thúc lượt giúp bạn).', 'The host can set a game clock (when it runs out the richest player wins) and a move timer (run over and a bot rolls, skips any purchase and ends your turn).')}</li>
            <li>{t('Không trả nổi nợ thì phá sản. Người cuối cùng trụ lại là người thắng.', "Can't pay a debt and you're bankrupt. The last player standing wins.")}</li>
          </ul>
        </details>
      </footer>
    </div>
  );
}

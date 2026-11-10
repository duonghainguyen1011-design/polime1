import { useState } from 'react';
import { TOKENS } from './tokens';
import type { TokenId } from './types';
import { onlineEnabled } from './conn';
import { TokenIcon } from './icons';
import { TokenPicker } from './Lobby';

interface Props {
  defaults: { name: string; token: TokenId };
  canResume: boolean;
  busy: boolean;
  onCreate: (name: string, token: TokenId) => void;
  onJoin: (code: string) => void;
  onPractice: (name: string, token: TokenId, bots: number) => void;
  onResume: () => void;
}

export function Home({ defaults, canResume, busy, onCreate, onJoin, onPractice, onResume }: Props) {
  const [name, setName] = useState(defaults.name);
  const [token, setToken] = useState<TokenId>(defaults.token);
  const [code, setCode] = useState('');
  const [bots, setBots] = useState(3);
  const ready = name.trim().length > 0;

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-board" aria-hidden="true">
          {TOKENS.map((t, k) => (
            <span key={t.id} className="hero-token" style={{ ['--k' as string]: k }}>
              <TokenIcon id={t.id} size="62%" />
            </span>
          ))}
        </div>
        <h1 className="hero-mark">Polime</h1>
        <p className="hero-line">Mua thành phố, xây khách sạn, đi khắp Việt Nam cùng bạn bè.</p>
      </header>

      <section className="panel">
        <h2 className="panel-title">Bạn là ai?</h2>
        <label className="field" htmlFor="home-name">
          <span>Tên hiển thị</span>
          <input id="home-name" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Hải" autoComplete="nickname" />
        </label>
        <TokenPicker value={token} onChange={setToken} />
      </section>

      <section className="panel">
        <h2 className="panel-title">Chơi online</h2>
        {!onlineEnabled && <p className="hint">Bản này chưa kết nối máy chủ nên chỉ chơi thử được với máy.</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={!onlineEnabled || !ready || busy} onClick={() => onCreate(name.trim(), token)}>
            Tạo phòng mới
          </button>
        </div>
        <form
          className="join-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) onJoin(code.trim().toUpperCase());
          }}
        >
          <label className="field grow" htmlFor="home-code">
            <span>Có mã phòng?</span>
            <input id="home-code" value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VD: K7QMA" autoCapitalize="characters" autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-gold" disabled={!onlineEnabled || code.trim().length < 5 || busy}>
            Vào phòng
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">Chơi thử với máy</h2>
        <div className="bots-row">
          <span id="bots-label">Số đối thủ</span>
          <div className="seg" role="radiogroup" aria-labelledby="bots-label">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={bots === n} className={bots === n ? 'on' : ''} onClick={() => setBots(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => onPractice(name.trim(), token, bots)}>
            Bắt đầu chơi thử
          </button>
          {canResume && (
            <button type="button" className="btn btn-quiet" onClick={onResume}>
              Tiếp tục ván đang chơi
            </button>
          )}
        </div>
      </section>

      <footer className="home-foot">
        <details>
          <summary>Luật chơi tóm tắt</summary>
          <ul>
            <li>Mỗi người bắt đầu với 15.000.000₫. Đi qua Khởi hành nhận 2.000.000₫.</li>
            <li>Dừng ở thành phố còn trống thì được mua. Không mua thì thành phố được đem ra đấu giá.</li>
            <li>Thành phố nào của bạn cũng xây được tối đa 2 nhà. Muốn xây nhà thứ 3, thứ 4 và khách sạn thì phải sở hữu cả nhóm màu.</li>
            <li>Sở hữu cả nhóm màu mà chưa xây gì thì tiền thuê gấp đôi.</li>
            <li>Thuế, tiền phạt và khoản trả theo thẻ dồn vào quỹ Bãi đỗ xe. Ai dừng ở đó nhận hết quỹ.</li>
            <li>Người đang ở tù không thu được tiền thuê.</li>
            <li>Trong lượt của mình, bạn có thể đề nghị giao dịch thành phố và tiền mặt với người khác.</li>
            <li>Không trả nổi nợ thì phá sản. Người cuối cùng trụ lại là người thắng.</li>
          </ul>
        </details>
      </footer>
    </div>
  );
}

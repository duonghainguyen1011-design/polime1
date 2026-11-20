import { useCallback, useEffect, useState } from 'react';
import { TOKENS } from './tokens';
import type { TokenId } from './types';
import { clearPractice, createPractice, createRoom, openRoom, resumePractice, type Conn } from './conn';
import { GameView } from './Game';
import { Home } from './Home';
import { useConn } from './hooks';
import { Lobby } from './Lobby';
import { setLang, t, useLang } from './i18n';
import type { Settings } from './types';

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
};

function playerId() {
  let id = store.get('polime:pid');
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 16);
    store.set('polime:pid', id);
  }
  return id;
}

const ME = playerId();
const roomFromUrl = () => new URLSearchParams(location.search).get('r')?.toUpperCase() ?? null;

function setUrlRoom(code: string | null) {
  try {
    const url = new URL(location.href);
    if (code) url.searchParams.set('r', code);
    else url.searchParams.delete('r');
    history.replaceState(null, '', url);
  } catch {
    /* sandboxed frames may refuse history changes */
  }
}

export default function App() {
  useLang();
  const [conn, setConn] = useState<Conn | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [profile, setProfile] = useState(() => ({
    name: store.get('polime:name') ?? '',
    token: (TOKENS.find((t) => t.id === store.get('polime:token'))?.id ?? 'non-la') as TokenId,
  }));

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const saveProfile = useCallback((name: string, token: TokenId) => {
    setProfile({ name, token });
    store.set('polime:name', name);
    store.set('polime:token', token);
  }, []);

  // Open a room from the link on first load.
  useEffect(() => {
    const code = roomFromUrl();
    if (code) {
      try {
        setConn(openRoom(code, ME));
      } catch (e) {
        notify((e as Error).message);
      }
    }
  }, [notify]);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => conn?.close();
  }, [conn]);

  const leave = useCallback(() => {
    if (conn?.local && conn.state?.phase === 'over') clearPractice();
    setConn(null);
    setUrlRoom(null);
  }, [conn]);

  if (!conn) {
    return (
      <Shell onHome={null}>
        <Home
          defaults={profile}
          busy={busy}
          canResume={!!resumePractice(ME)}
          onCreate={async (name, token) => {
            saveProfile(name, token);
            setBusy(true);
            try {
              const code = await createRoom(ME, name, token);
              setUrlRoom(code);
              setConn(openRoom(code, ME));
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          onJoin={(code) => {
            setUrlRoom(code);
            setConn(openRoom(code, ME));
          }}
          onPractice={(name, token, bots, settings: Settings) => {
            saveProfile(name, token);
            setConn(createPractice(ME, name, token, bots, settings));
          }}
          onResume={() => {
            const c = resumePractice(ME);
            if (c) setConn(c);
          }}
        />
        <Toast toast={toast} />
      </Shell>
    );
  }

  return (
    <Shell onHome={leave} code={conn.local ? t('Chơi thử', 'Practice') : conn.code}>
      <Room conn={conn} notify={notify} profile={profile} saveProfile={saveProfile} onLeave={leave} />
      <Toast toast={toast} />
    </Shell>
  );
}

function Room({ conn, notify, profile, saveProfile, onLeave }: { conn: Conn; notify: (m: string) => void; profile: { name: string; token: TokenId }; saveProfile: (n: string, t: TokenId) => void; onLeave: () => void }) {
  const { state, online, error } = useConn(conn);
  if (error && !state) {
    return (
      <div className="notice">
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={onLeave}>
          {t('Về trang chủ', 'Back to home')}
        </button>
      </div>
    );
  }
  if (!state) return <div className="notice">{t(`Đang mở phòng ${conn.code}`, `Opening room ${conn.code}`)}</div>;
  if (state.phase === 'lobby') return <Lobby conn={conn} state={state} notify={notify} defaults={profile} onProfile={saveProfile} />;
  return <GameView conn={conn} state={state} online={online} notify={notify} onLeave={onLeave} />;
}

function Shell({ children, onHome, code }: { children: React.ReactNode; onHome: (() => void) | null; code?: string }) {
  return (
    <div className="app">
      <header className={`topbar${onHome ? '' : ' bare'}`}>
        {onHome && (
          <div className="topbar-left">
            <button type="button" className="topbar-mark" onClick={onHome} aria-label={t('Về trang chủ', 'Back to home')}>
              Polime
            </button>
            {code && <span className="topbar-code">{code}</span>}
          </div>
        )}
        <LangSwitch />
      </header>
      <main>{children}</main>
    </div>
  );
}

function LangSwitch() {
  const lang = useLang();
  return (
    <div className="lang" role="radiogroup" aria-label={t('Ngôn ngữ', 'Language')}>
      {(['vi', 'en'] as const).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Toast({ toast }: { toast: { id: number; text: string } | null }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      {toast.text}
    </div>
  );
}

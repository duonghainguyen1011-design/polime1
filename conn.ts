import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { GameError, apply, newGame } from '../game/engine';
import type { Action, GameState, TokenId } from '../game/types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const onlineEnabled = !!supabase;

type Listener = () => void;

/** A live view of one game, either local (practice) or a shared online room. */
export interface Conn {
  code: string;
  me: string;
  local: boolean;
  state: GameState | null;
  online: Set<string>;
  error: string | null;
  subscribe(cb: Listener): () => void;
  dispatch(a: Action, as?: string): Promise<string | null>;
  close(): void;
}

const errText = (e: unknown) => (e instanceof GameError ? e.message : e instanceof Error ? e.message : String(e));

// ---------------- Practice mode ----------------

const BOTS: { name: string; token: TokenId }[] = [
  { name: 'Anh Hai', token: 'trau' },
  { name: 'Chị Ba', token: 'hoa-sen' },
  { name: 'Út Tư', token: 'xe-may' },
  { name: 'Cô Năm', token: 'den-long' },
  { name: 'Chú Sáu', token: 'ca-phe' },
];
const PRACTICE_KEY = 'polime:practice';

export function createPractice(me: string, name: string, token: TokenId, opponents: number): Conn {
  let s = newGame(me, name, token);
  const bots = BOTS.filter((b) => b.token !== token).slice(0, opponents);
  bots.forEach((b, i) => (s = apply(s, `bot-${i}`, { t: 'join', name: b.name, token: b.token })));
  s = apply(s, me, { t: 'start' });
  return localConn(me, s);
}

export function resumePractice(me: string): Conn | null {
  try {
    const raw = localStorage.getItem(PRACTICE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.phase !== 'playing' || !s.players.some((p) => p.id === me)) return null;
    return localConn(me, s);
  } catch {
    return null;
  }
}

export function clearPractice() {
  try {
    localStorage.removeItem(PRACTICE_KEY);
  } catch {
    /* storage unavailable */
  }
}

function localConn(me: string, initial: GameState): Conn {
  const listeners = new Set<Listener>();
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(initial));
  } catch {
    /* storage unavailable */
  }
  const conn: Conn = {
    code: 'Chơi thử',
    me,
    local: true,
    state: initial,
    online: new Set([me]),
    error: null,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async dispatch(a, as = me) {
      try {
        conn.state = apply(conn.state!, as, a);
      } catch (e) {
        return errText(e);
      }
      try {
        localStorage.setItem(PRACTICE_KEY, JSON.stringify(conn.state));
      } catch {
        /* storage unavailable */
      }
      listeners.forEach((l) => l());
      return null;
    },
    close() {
      listeners.clear();
    },
  };
  return conn;
}

// ---------------- Online rooms ----------------

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export async function createRoom(me: string, name: string, token: TokenId): Promise<string> {
  if (!supabase) throw new Error('Chế độ online chưa được bật');
  const state = newGame(me, name, token);
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const { error } = await supabase.from('rooms').insert({ code, state, version: 0 });
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error('Không tạo được phòng, thử lại nhé');
}

export function openRoom(code: string, me: string): Conn {
  if (!supabase) throw new Error('Chế độ online chưa được bật');
  const db = supabase;
  const listeners = new Set<Listener>();
  let version = -1;
  let channel: RealtimeChannel | null = null;
  let closed = false;
  const emit = () => listeners.forEach((l) => l());

  const conn: Conn = {
    code,
    me,
    local: false,
    state: null,
    online: new Set(),
    error: null,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async dispatch(a, as = me) {
      for (let attempt = 0; attempt < 6; attempt++) {
        if (!conn.state) await refetch();
        const cur = conn.state;
        const v = version;
        if (!cur) return 'Không tìm thấy phòng';
        let next: GameState;
        try {
          next = apply(cur, as, a);
        } catch (e) {
          return errText(e);
        }
        const { data, error } = await db
          .from('rooms')
          .update({ state: next, version: v + 1, updated_at: new Date().toISOString() })
          .eq('code', code)
          .eq('version', v)
          .select('version');
        if (error) return `Lỗi kết nối: ${error.message}`;
        if (data && data.length) {
          if (version === v) {
            version = v + 1;
            conn.state = next;
            emit();
          }
          return null;
        }
        await refetch(); // someone else moved first; replay on the newest state
      }
      return 'Máy chủ đang bận, hãy thử lại';
    },
    close() {
      closed = true;
      listeners.clear();
      if (channel) db.removeChannel(channel);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };

  async function refetch() {
    const { data, error } = await db.from('rooms').select('state,version').eq('code', code).maybeSingle();
    if (closed) return;
    if (error) {
      conn.error = `Lỗi kết nối: ${error.message}`;
    } else if (!data) {
      conn.error = 'Không tìm thấy phòng này. Kiểm tra lại mã phòng.';
    } else {
      conn.error = null;
      if (data.version > version) {
        version = data.version;
        conn.state = data.state as GameState;
      }
    }
    emit();
  }

  channel = db
    .channel(`room:${code}`, { config: { presence: { key: me } } })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, (payload) => {
      const row = payload.new as { state?: GameState; version?: number };
      if (row?.state && typeof row.version === 'number') {
        if (row.version > version) {
          version = row.version;
          conn.state = row.state;
          emit();
        }
      } else {
        void refetch();
      }
    })
    .on('presence', { event: 'sync' }, () => {
      conn.online = new Set(Object.keys(channel!.presenceState()));
      emit();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel!.track({ at: Date.now() });
        void refetch();
      }
    });

  const poll = window.setInterval(() => void refetch(), 10000);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void refetch();
  };
  document.addEventListener('visibilitychange', onVisible);
  void refetch();
  return conn;
}

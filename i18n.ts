// Two languages, chosen by each viewer on their own device. Text sits next to its translation: t('Tiếng Việt', 'English').
import { useEffect, useReducer } from 'react';

export type Lang = 'vi' | 'en';
const KEY = 'polime:lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* storage unavailable */
  }
  // Vietnamese unless the viewer picked English before.
  return 'vi';
}

let lang: Lang = typeof window === 'undefined' ? 'vi' : initial();
if (typeof document !== 'undefined') document.documentElement.lang = lang;
const listeners = new Set<() => void>();

export const getLang = () => lang;
export const t = (vi: string, en: string) => (lang === 'en' ? en : vi);

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

/** Re-render a component when the language changes. */
export function useLang() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);
  return lang;
}

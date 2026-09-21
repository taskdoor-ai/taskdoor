import { AUTO_TRANSLATE_KEY } from './contentReading';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, normalizeLocale, translate, type Locale } from './core';
import type { MessageKey } from './messages';
function readLocale(): Locale {
  try { return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY)); }
  catch { return DEFAULT_LOCALE; }
}
function readAutoTranslate() {
  try { return window.localStorage.getItem(AUTO_TRANSLATE_KEY) !== 'false'; } catch { return true; }
}
const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  autoTranslate: true,
  setAutoTranslate: (_enabled: boolean) => {},
  originalTasks: new Set<string>(),
  toggleTaskOriginal: (_id: string) => {},
  setLocale: (_locale: Locale) => {},
  t: (key: MessageKey, values?: Record<string, string | number>) => translate(DEFAULT_LOCALE, key, values),
});
export function I18nProvider({ children }: { children: ReactNode }) {
  const [autoTranslate, updateAutoTranslate] = useState(readAutoTranslate);
  const [originalTasks, setOriginalTasks] = useState<Set<string>>(() => new Set());
  const [locale, updateLocale] = useState<Locale>(readLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    if (window.location.pathname === '/') document.title = translate(locale, 'app.title');
  }, [locale]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === AUTO_TRANSLATE_KEY || event.key === null) updateAutoTranslate(readAutoTranslate());
      if (event.key === LOCALE_STORAGE_KEY || event.key === null) updateLocale(readLocale());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const value = useMemo(() => ({
    locale, autoTranslate, originalTasks,
    setAutoTranslate: (enabled: boolean) => {
      updateAutoTranslate(enabled);
      try { window.localStorage.setItem(AUTO_TRANSLATE_KEY, String(enabled)); } catch { /* Session preference remains usable. */ }
    },
    toggleTaskOriginal: (id: string) => setOriginalTasks(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    setLocale: (next: Locale) => {
      const normalized = normalizeLocale(next);
      updateLocale(normalized);
      try { window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized); } catch { /* Session still works when storage is unavailable. */ }
    },
    t: (key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values),
  }), [locale, autoTranslate, originalTasks]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);

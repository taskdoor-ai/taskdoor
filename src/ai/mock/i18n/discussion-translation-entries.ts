import type { Locale } from '@/shared/i18n/core';

const STORAGE_KEY = 'taskdoor.discussion-translation-entries.v1';
type Entry = { source: string; locale: Locale; text: string };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** Exact source and language entries survive reloads; edited content gets a new entry. */
export function createDiscussionTranslationEntries(storage?: Storage) {
  const entries = new Map<string, Entry>();
  let loaded = false;
  const getStorage = () => storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
  return {
    read(taskId: string, source: string, locale: Locale, lookup: () => string) {
      if (!loaded) {
        loaded = true;
        try {
          const saved: unknown = JSON.parse(getStorage()?.getItem(STORAGE_KEY) ?? '[]');
          if (Array.isArray(saved)) for (const item of saved) {
            if (Array.isArray(item) && typeof item[0] === 'string' && item[1] &&
              typeof item[1].source === 'string' && typeof item[1].text === 'string' &&
              (item[1].locale === 'en' || item[1].locale === 'zh-CN')) entries.set(item[0], item[1]);
          }
        } catch { /* Use session entries when browser storage is unavailable. */ }
      }
      const key = JSON.stringify([taskId, source, locale]);
      const existing = entries.get(key);
      if (existing?.source === source && existing.locale === locale) return existing.text;
      const text = lookup();
      // No translation available: retain the source without storing it as a translation.
      if (text !== source) {
        entries.set(key, { source, locale, text });
        try { getStorage()?.setItem(STORAGE_KEY, JSON.stringify([...entries])); } catch { /* Session entries still work. */ }
      }
      return text;
    },
  };
}

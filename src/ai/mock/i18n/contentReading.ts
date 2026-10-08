import type { Locale } from './core';

export const AUTO_TRANSLATE_KEY = 'taskdoor.content-auto-translate.v1';
export function contentReading(source: string, candidate: string, locale: Locale, enabled: boolean, original: boolean) {
  const translated = candidate !== source;
  // Detection only controls the unavailable hint; it never rewrites content.
  const needsTranslation = locale === 'en' ? /[\u3400-\u9fff]/u.test(source) : /[A-Za-z]{3,}/.test(source) && !/[\u3400-\u9fff]/u.test(source);
  return {
    text: enabled && !original && translated ? candidate : source,
    state: !enabled ? 'off' : translated ? (original ? 'original' : 'translated') : needsTranslation ? 'unavailable' : 'same',
  } as const;
}

import type { Locale } from '@/shared/i18n/core';

export const AUTO_TRANSLATE_KEY = 'taskdoor.content-auto-translate.v1';
export function contentReading(source: string, candidate: string, locale: Locale, enabled: boolean, original: boolean) {
  const translated = candidate !== source;
  // Link destinations are hidden. Strip fragment targets only for language detection.
  const visibleText = source.replace(/\]\(<#[^>\r\n]+>\)/g, ']');
  const needsTranslation = locale === 'en' ? /[\u3400-\u9fff]/u.test(visibleText) : /[A-Za-z]{3,}/.test(visibleText) && !/[\u3400-\u9fff]/u.test(visibleText);
  return {
    text: enabled && !original && translated ? candidate : source,
    state: !enabled ? 'off' : translated ? (original ? 'original' : 'translated') : needsTranslation ? 'unavailable' : 'same',
  } as const;
}

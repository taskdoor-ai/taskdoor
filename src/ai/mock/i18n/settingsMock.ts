import catalog from './mock/settings.json';
import type { Locale } from './core';

/** Translate only recognized fixture values; edited descriptions remain verbatim. */
export function settingsMockText(locale: Locale, id: string, value: string) {
  const copies = (catalog as Record<string, { zh: string; en: string }[]>)[id];
  return locale === 'en' ? copies?.find(copy => copy.zh === value)?.en ?? value : value;
}

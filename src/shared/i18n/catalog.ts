import { useI18n } from '@/shared/i18n/I18nProvider';

/** A feature's own copy: each key holds its English and Chinese text. */
export type CopyCatalog = Record<string, { en: string; zh: string }>;

/** Reads a catalog in the current language, filling `{name}` placeholders. */
export function useCatalog<C extends CopyCatalog>(catalog: C) {
  const { locale } = useI18n();
  return (key: keyof C & string, values: Record<string, string | number> = {}) =>
    catalog[key][locale === 'en' ? 'en' : 'zh'].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}

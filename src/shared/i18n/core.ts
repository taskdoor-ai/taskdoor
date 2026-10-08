import { en, zh, type MessageKey } from './messages';
export type Locale = 'en' | 'zh-CN';
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'agentdoor.locale';
export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  return /^zh(?:-|$)/i.test(value) ? 'zh-CN' : DEFAULT_LOCALE;
}
export function translate(locale: Locale, key: MessageKey, values: Record<string, string | number> = {}): string {
  const template = (locale === 'zh-CN' ? zh[key] : en[key]) ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}
/** Calendar dates have no timezone. Instants require the caller's explicit timezone. */
export function formatCalendarDate(locale: Locale, value: string, options: Intl.DateTimeFormatOptions = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Expected YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError('Invalid calendar date');
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', ...options, timeZone: 'UTC' }).format(date);
}
export function formatInstant(locale: Locale, value: Date | number, timeZone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...options, timeZone }).format(value);
}
export function formatTaskCount(locale: Locale, count: number) {
  const form = new Intl.PluralRules(locale).select(count) === 'one' ? 'one' : 'other';
  return translate(locale, `tasks.count.${form}`, { count: formatNumber(locale, count) });
}

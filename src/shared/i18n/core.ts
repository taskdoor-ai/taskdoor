import { en, zh, type MessageKey } from '@/shared/i18n/messages';
import { formatDisplayDate, formatDisplayDateTime } from '@/shared/lib/date-time';
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
  return formatDisplayDate(value, { locale, year: options.year ? 'always' : 'auto' })!;
}
export function formatInstant(locale: Locale, value: Date | number, timeZone: string, options: Intl.DateTimeFormatOptions = {}) {
  const format = options.timeStyle || options.hour || options.minute ? formatDisplayDateTime : formatDisplayDate;
  const label = format(value, { locale, timeZone, year: options.year ? 'always' : 'auto' });
  if (!label) throw new RangeError('Invalid instant');
  return label;
}
export function formatTaskCount(locale: Locale, count: number) {
  const form = new Intl.PluralRules(locale).select(count) === 'one' ? 'one' : 'other';
  return translate(locale, `tasks.count.${form}`, { count: formatNumber(locale, count) });
}

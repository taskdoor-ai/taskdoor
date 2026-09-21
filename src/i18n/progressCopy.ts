import { useMockText } from './MockDataProvider';
import { mockPersonName } from './mockContent';
import catalog from './mock/progressCopy.json';
import { useI18n } from './I18nProvider';
import type { Locale } from './core';

const entries = Object.values(catalog);
const exact = new Map(entries.map(entry => [entry.zh, entry.en]));
const patterns = entries.filter(entry => /\{\d+\}/.test(entry.zh)).map(entry => ({
  ...entry,
  keys: [...entry.zh.matchAll(/\{(\d+)\}/g)].map(match => match[1]),
  regex: new RegExp('^' + entry.zh.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]*?)') + '$'),
}));
/** Display-only system copy. Unrecognized record text is preserved. */
export function progressText(locale: Locale, value: string, depth = 0, localize: (value: string) => string = value => value): string {
  if (locale !== 'en' || depth > 5) return value;
  const record = localize(value);
  if (record !== value) return record;
  const person = mockPersonName(locale, value, value);
  if (person !== value) return person;
  const quantity = value.match(/^(.+?) ([+−\-\d.,]+) 人天$/);
  if (quantity && (exact.has(quantity[1]) || !/[\u4e00-\u9fff]/.test(quantity[1]))) return `${progressText(locale, quantity[1], depth + 1, localize)} ${quantity[2]} ${Number(quantity[2]) === 1 ? 'person-day' : 'person-days'}`;
  const timing = value.match(/^(预计)?(延期|提前) (\d+) 天$/);
  if (timing) return `${timing[1] ? 'Expected ' : ''}${timing[3]} ${timing[3] === '1' ? 'day' : 'days'} ${timing[2] === '延期' ? 'late' : 'early'}`;
  const delta = value.match(/^([+−])(\d+) 天$/);
  if (delta) return `${delta[1]}${delta[2]} ${delta[2] === '1' ? 'day' : 'days'}`;
  const literal = exact.get(value);
  if (literal) return literal;
  for (const entry of patterns) {
    const match = value.match(entry.regex);
    if (!match) continue;
    const args = Object.fromEntries(entry.keys.map((key, index) => [key, progressText(locale, match[index + 1], depth + 1, localize)]));
    return entry.en.replace(/\{(\d+)\}/g, (_, key: string) => args[key] ?? '');
  }
  const amount = value.match(/^([+−\-\d.,]+) 人天$/);
  return amount ? `${amount[1]} person-days` : value;
}
export function useProgressCopy() {
  const { locale } = useI18n();
  const mock = useMockText();
  return (value: string) => progressText(locale, value, 0, mock.text);
}

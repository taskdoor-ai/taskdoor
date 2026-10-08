import { useI18n } from './I18nProvider';
import messages from './globalUiMessages.json';
const englishBySource = new Map(Object.values(messages).map(copy => [copy.zh, copy.en]));
import type { Locale } from './core';

/** Explicit system copy only. Never pass arbitrary user-authored content here. */
export function globalUiText(locale: Locale, source: string, values: Record<string, string | number> = {}) {
  const emptyCriterion = source.match(/^第 (\d+) 条完成标准不能为空，请补全或删除这一条。$/);
  if (locale === 'en' && emptyCriterion) return globalUiText(locale, '第 {0} 条完成标准不能为空，请补全或删除这一条。', {0: emptyCriterion[1]});
  const text = locale === 'en' ? englishBySource.get(source) ?? source : source;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
export function useGlobalUi() {
  const { locale } = useI18n();
  return (source: string, values?: Record<string, string | number>) => globalUiText(locale, source, values);
}

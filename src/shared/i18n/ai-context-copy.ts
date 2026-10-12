import { mockPersonName, mockRecordText } from '@/ai/mock/i18n/mockContent';
import { globalUiText } from '@/shared/i18n/global-ui';
import type { Locale } from '@/shared/i18n/core';
import { formatLegacyDateLabel } from '@/shared/lib/date-time';

export function taskContextValue(locale: Locale, taskId: string, label: string, value: string, localize = (text: string) => mockRecordText(locale, taskId, text)) {
  if (label === '负责人' || label === '参与人') return value.split(/[、\n]/)
    .map(person => person.replace(/\s*·\s*(?:已接受|待接受，尚未生效|接受状态未提供)\s*$/, '').trim()).filter(Boolean)
    .map(person => mockPersonName(locale, person, person)).join(locale === 'en' ? ', ' : '、');
  if (label === '截止时间' || label === '截止日期') {
    const date = formatLegacyDateLabel(value, locale);
    if (date !== value) return date;
  }
  return value.split('\n').map(part => globalUiText(locale, localize(part))).join('\n');
}

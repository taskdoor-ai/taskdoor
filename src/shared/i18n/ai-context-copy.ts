import { mockPersonName, mockRecordText } from './mockContent';
import { globalUiText } from './globalUi';
import type { Locale } from './core';

export function taskContextValue(locale: Locale, taskId: string, label: string, value: string, localize = (text: string) => mockRecordText(locale, taskId, text)) {
  if (label === '负责人' || label === '参与人') return value.split(/[、\n]/)
    .map(person => person.replace(/\s*·\s*(?:已接受|待接受，尚未生效|接受状态未提供)\s*$/, '').trim()).filter(Boolean)
    .map(person => mockPersonName(locale, person, person)).join(locale === 'en' ? ', ' : '、');
  if (label === '截止时间' && locale === 'en' && /^\d{1,2}\s*月\s*\d{1,2}\s*日$/.test(value)) {
    return value.replace(/(\d+)\s*月\s*(\d+)\s*日/, (_, month, day) => new Intl.DateTimeFormat('en', {month:'short', day:'numeric', timeZone:'UTC'}).format(new Date(Date.UTC(2000, Number(month)-1, Number(day)))));
  }
  return value.split('\n').map(part => globalUiText(locale, localize(part))).join('\n');
}

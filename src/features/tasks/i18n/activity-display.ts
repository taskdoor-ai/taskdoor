import type { Locale } from '@/shared/i18n/core';
import { filterStatusLabel } from '@/features/tasks/i18n/filter-display';
import { moduleText } from '@/shared/i18n/module-messages';

/** Only system-generated event copy is interpreted; discussion bodies stay user content. */
export function activityMessage(locale: Locale, type: string, value: string) {
  if (locale !== 'en' || type === 'member-post' || type === 'member-reply') return value;
  const status = value.match(/^将任务状态更新为“(.+)”。$/);
  if (type === 'status-change' && status) return `Changed the task status to “${filterStatusLabel(locale, status[1])}”.`;
  return moduleText(locale, value);
}
export function activityChangeValue(locale: Locale, label: string, value: string | null) {
  if (value === null) return '';
  return label === '状态' ? filterStatusLabel(locale, value) : value;
}

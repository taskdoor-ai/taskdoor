import type { Locale } from '@/shared/i18n/core';
import { filterStatusLabel } from '@/features/tasks/i18n/filter-display';
import { moduleText } from '@/shared/i18n/module-messages';
import { formatLegacyDateLabel, formatSystemDateText } from '@/shared/lib/date-time';

/** Only system-generated event copy is interpreted; discussion bodies stay user content. */
export function activityMessage(locale: Locale, type: string, value: string) {
  if (locale !== 'en' || type === 'member-post' || type === 'member-reply') return value;
  const status = value.match(/^将任务状态更新为“(.+)”。$/);
  if (type === 'status-change' && status) return `Changed the task status to “${filterStatusLabel(locale, status[1])}”.`;
  return moduleText(locale, value);
}
export function activityChangeValue(locale: Locale, label: string, value: string | null) {
  if (value === null) return '';
  if (label === '状态') return filterStatusLabel(locale, value);
  if (['截止时间', '截止日期', '开始日期', '计划开始', '计划结束'].includes(label)) return formatLegacyDateLabel(value, locale);
  // Confirmation changes contain the confirming person and an ISO instant.
  return /^.+ · \d{4}-\d{2}-\d{2}T/.test(value) ? formatSystemDateText(value, locale) : value;
}

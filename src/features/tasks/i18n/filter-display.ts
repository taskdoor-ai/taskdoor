import { translate, type Locale } from './core';
import { statusMessageKey } from './taskStatus';
import { taskDateFilterLabel, type TaskListDateFilter } from '../components/taskListFilters';
export function filterStatusLabel(locale: Locale, status: string) {
  const key = statusMessageKey[status as keyof typeof statusMessageKey];
  return key ? translate(locale, key) : status;
}
export function filterDateLabel(locale: Locale, value: TaskListDateFilter) {
  if (locale !== 'en') return taskDateFilterLabel(value);
  const names = { today: 'Today', 'this-week': 'This week', 'next-7-days': 'Next 7 days', 'past-7-days': 'Past 7 days', overdue: 'Overdue', unknown: 'Date unknown', custom: 'Custom dates' };
  if (value.preset !== 'custom') return names[value.preset];
  if (value.from && value.to) return `${value.from} to ${value.to}`;
  return value.from ? `From ${value.from}` : `Through ${value.to}`;
}

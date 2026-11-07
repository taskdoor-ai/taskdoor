import { notificationExamples, notificationReadTestExamples, type WorkspaceNotification } from '@/ai/mock/data/notificationExamples';
import { mockTaskField, mockPersonName } from '@/ai/mock/i18n/mockContent';
import type { Locale } from '@/shared/i18n/core';

export { mockTeamName as notificationTeamName } from '@/ai/mock/i18n/mockContent';

export function notificationCopy(locale: Locale, item: WorkspaceNotification): WorkspaceNotification {
  const original = [...notificationExamples, ...notificationReadTestExamples].find(value => value.id === item.id);
  if (locale !== 'en' || !original || item.content !== original.content) return item;
  const people = item.people?.map(person => ({ ...person, name: mockPersonName(locale, person.id, person.name) }));
  const task = item.task ? { ...item.task, title: mockTaskField(locale, item.task.id, 'title', item.task.title) } : undefined;
  const person = people?.[0]?.name ?? '';
  const content = item.kind === 'mention' ? ` @${person} mentioned you in the discussion.`
    : item.kind === 'member-joined' ? ` @${person} joined the team.`
    : ` @${person} invited you to collaborate on a task.`;
  return { ...item, people, task, content };
}

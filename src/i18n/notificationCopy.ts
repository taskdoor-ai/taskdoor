import { notificationExamples, type WorkspaceNotification } from '../data/notificationExamples';
import { mockTaskField, mockPersonName } from './mockContent';
import type { Locale } from './core';

export function notificationCopy(locale: Locale, item: WorkspaceNotification): WorkspaceNotification {
  const original = notificationExamples.find(value => value.id === item.id);
  if (locale !== 'en' || !original || item.content !== original.content) return item;
  const people = item.people?.map(person => ({ ...person, name: mockPersonName(locale, person.id, person.name) }));
  const task = item.task ? { ...item.task, title: mockTaskField(locale, item.task.id, 'title', item.task.title) } : undefined;
  const person = people?.[0]?.name ?? '';
  const content = item.id === 'live-discussion-mention' ? ` @${person} mentioned you in the discussion on ${task?.title}.`
    : item.id === 'content-member-joined' ? ` @${person} joined Creator Commerce.`
    : ` @${person} invited you to collaborate on ${task?.title}.`;
  return { ...item, people, task, content };
}

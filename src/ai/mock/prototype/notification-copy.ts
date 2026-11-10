import { notificationExamples, notificationReadTestExamples, type WorkspaceNotification } from '@/ai/mock/data/notificationExamples';
import { mockTaskField, mockPersonName } from '@/ai/mock/i18n/mockContent';
import type { Locale } from '@/shared/i18n/core';

export { mockTeamName as notificationTeamName } from '@/ai/mock/i18n/mockContent';

export function notificationCopy(locale: Locale, item: WorkspaceNotification): WorkspaceNotification {
  const original = [...notificationExamples, ...notificationReadTestExamples].find(value => value.id === item.id);
  if (locale !== 'en' || !original || item.content !== original.content || item.contentAfterTask !== original.contentAfterTask || item.contentAfterFile !== original.contentAfterFile) return item;
  const people = item.people?.map(person => ({ ...person, name: mockPersonName(locale, person.id, person.name) }));
  const task = item.task ? { ...item.task, title: mockTaskField(locale, item.task.id, 'title', item.task.title) } : undefined;
  const person = people?.[0]?.name ?? '';
  const fileAction = item.kind === 'file-added' ? 'added the file' : item.kind === 'file-version-added' ? 'updated the file' : item.kind === 'file-deleted' ? 'deleted the file' : undefined;
  const likers = Number(item.content.match(/等 (\d+) 个人/)?.[1] ?? 1);
  const content = item.kind === 'like' ? (likers > 1 ? ` @${person} and ${likers - 1} ${likers > 2 ? 'others' : 'other'} liked your comment.` : ` @${person} liked your comment.`)
    : fileAction ? ` @${person} ${fileAction}` : item.kind === 'mention' ? ` @${person} mentioned you in the discussion on`
    : item.kind === 'member-joined' ? ` @${person} joined the team.`
    : ` @${person} invited you to collaborate on`;
  const contentAfterTask = item.kind === 'mention' || item.kind === 'invitation' ? '.' : item.contentAfterTask;
  const contentAfterFile = fileAction ? '.' : item.contentAfterFile;
  return { ...item, people, task, content, contentAfterTask, contentAfterFile };
}

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createDiscussionTranslationEntries } from '@/ai/mock/i18n/discussion-translation-entries';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { mockRecordText, type MockTaskCopy } from '@/ai/mock/i18n/mockContent';
const discussionEntries = createDiscussionTranslationEntries();
const AdditionalMockContext = createContext<Readonly<Record<string, MockTaskCopy>>>({});
export const CurrentTaskContext = createContext('');
export function MockDataProvider({ tasks, children }: { tasks: Readonly<Record<string, MockTaskCopy>>; children: ReactNode }) {
  return <AdditionalMockContext.Provider value={tasks}>{children}</AdditionalMockContext.Provider>;
}
export function MockTaskProvider({ taskId, children }: { taskId: string; children: ReactNode }) {
  return <CurrentTaskContext.Provider value={taskId}>{children}</CurrentTaskContext.Provider>;
}
export function useMockText() {
  const { locale, autoTranslate } = useI18n();
  const additional = useContext(AdditionalMockContext);
  const currentId = useContext(CurrentTaskContext);
  return useMemo(() => ({
    field: (_id: string, _field: 'title' | 'goal', value: string) => value,
    discussionTranslation: (value: string, id = currentId) => autoTranslate ? discussionEntries.read(id, value, locale, () => mockRecordText(locale, id, value, additional)) : value,
    text: (value: string, _id = currentId) => value,
  }), [locale, additional, currentId, autoTranslate]);
}

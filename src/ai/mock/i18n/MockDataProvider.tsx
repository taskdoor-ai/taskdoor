import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useI18n } from './I18nProvider';
import { mockTaskField, mockRecordText, type MockTaskCopy } from './mockContent';
const AdditionalMockContext = createContext<Readonly<Record<string, MockTaskCopy>>>({});
export const CurrentTaskContext = createContext('');
export function MockDataProvider({ tasks, children }: { tasks: Readonly<Record<string, MockTaskCopy>>; children: ReactNode }) {
  return <AdditionalMockContext.Provider value={tasks}>{children}</AdditionalMockContext.Provider>;
}
export function MockTaskProvider({ taskId, children }: { taskId: string; children: ReactNode }) {
  return <CurrentTaskContext.Provider value={taskId}>{children}</CurrentTaskContext.Provider>;
}
export function useMockText() {
  const { locale, autoTranslate, originalTasks } = useI18n();
  const additional = useContext(AdditionalMockContext);
  const currentId = useContext(CurrentTaskContext);
  return useMemo(() => ({
    field: (id: string, field: 'title' | 'goal', value: string) => !autoTranslate || originalTasks.has(id) ? value : mockTaskField(locale, id, field, value, additional),
    originalRecord: (value: string, id = currentId) => mockRecordText(locale, id, value, additional),
    text: (value: string, id = currentId) => !autoTranslate || originalTasks.has(id) ? value : mockRecordText(locale, id, value, additional),
  }), [locale, additional, currentId, autoTranslate, originalTasks]);
}

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { TaskNode } from '@/shared/model/task-model';
import { useI18n } from '../i18n/I18nProvider';
import { useMockText } from '../i18n/MockDataProvider';
import '../styles/task-branch-disclosure.css';

/** Read-only branch scope shared by deletion previews and recycled records. */
export function TaskBranchDisclosure({ tasks, rootId, deleting = false }: {
  tasks: TaskNode[];
  rootId: string;
  deleting?: boolean;
}) {
  const { locale } = useI18n();
  const mock = useMockText();
  const descendants = tasks.filter(task => task.id !== rootId);
  if (!descendants.length) return null;
  const children = new Map<string, TaskNode[]>();
  for (const task of descendants) {
    const parent = task.parentTaskId || rootId;
    children.set(parent, [...(children.get(parent) ?? []), task]);
  }
  const renderChildren = (parent: string, ancestors: Set<string>): ReactNode => {
    const items = (children.get(parent) ?? []).filter(task => !ancestors.has(task.id));
    if (!items.length) return null;
    return <ul>{items.map(task => <li key={task.id}>
      <span>{mock.field(task.id, 'title', task.name)}</span>
      {renderChildren(task.id, new Set([...ancestors, task.id]))}
    </li>)}</ul>;
  };
  const label = locale === 'zh-CN'
    ? `${deleting ? '同时删除' : '含'} ${descendants.length} 个子任务`
    : `${deleting ? 'Also deletes' : 'Includes'} ${descendants.length} subtasks`;
  return <details className="task-branch-disclosure">
    <summary><ChevronRight size={14} aria-hidden="true" />{label}</summary>
    <div className="task-branch-disclosure-list" tabIndex={0} role="region" aria-label={locale === 'zh-CN' ? '子任务范围' : 'Included subtasks'}>
      {renderChildren(rootId, new Set([rootId]))}
    </div>
  </details>;
}

import type { TaskNode } from '../data/workspaceNodes';
import copies from './mock/createdTasks.json';
import savedCopies from './mock/savedCreationTasks.json';
import type { MockTaskCopy } from './mockContent';

/** Recognize the saved demo by its original definition, independently of progress eligibility. */
export function buildCreatedMockCatalog(seeds: readonly TaskNode[]): Record<string, MockTaskCopy> {
  const result: Record<string, MockTaskCopy> = {};
  for (const task of seeds) {
    // Saved planner fixtures remain recognizable after deleting or moving children.
    // Match both original fields, never a title alone or a manually created task.
    if (task.createdFrom === 'task-planner') {
      const copy = [...savedCopies, ...copies].find(copy => copy.title.zh === task.name && copy.goal.zh === task.goal);
      if (copy) result[task.id] = copy;
    }
    if (task.createdFrom === 'task-editor' && task.name === '未命名任务' && !task.goal) {
      result[task.id] = { title: { zh: task.name, en: 'Untitled task' }, goal: { zh: '', en: '' } };
    }
  }
  const rootCopy = copies[copies.length - 1];
  for (const root of seeds) {
    if (root.teamId !== 'creator-commerce' || root.name !== rootCopy.title.zh || root.goal !== rootCopy.goal.zh) continue;
    const children = seeds.filter(task => task.parentTaskId === root.id && task.teamId === root.teamId);
    const matchingChildren = children.flatMap(task => {
      const copy = copies.slice(0, -1).find(copy => copy.title.zh === task.name && copy.goal.zh === task.goal);
      return copy ? [{ task, copy }] : [];
    });
    // Require the recognizable project structure, not a coincidentally matching user title.
    if (!matchingChildren.length) continue;
    result[root.id] = rootCopy;
    for (const { task, copy } of matchingChildren) result[task.id] = copy;
  }
  return result;
}

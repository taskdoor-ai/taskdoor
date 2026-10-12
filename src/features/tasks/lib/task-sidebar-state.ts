export const TASK_SIDEBAR_MIN_WIDTH = 260;
export const TASK_SIDEBAR_MAX_WIDTH = 520;
export const TASK_SIDEBAR_COLLAPSE_DRAG_DISTANCE = 80;
export const TASK_SIDEBAR_COLLAPSE_THRESHOLD = TASK_SIDEBAR_MIN_WIDTH - TASK_SIDEBAR_COLLAPSE_DRAG_DISTANCE;
export const TASK_SIDEBAR_WIDTH_KEY = 'taskdoor-task-list-width';
export const TASK_SIDEBAR_COLLAPSED_KEY = 'taskdoor-task-list-collapsed';

export type TaskSidebarPreference = { collapsed: boolean; expandedWidth: number };

export function readTaskSidebarPreference(savedWidth: string | null, savedCollapsed: string | null): TaskSidebarPreference {
  const width = Number(savedWidth);
  return {
    collapsed: savedCollapsed === 'true',
    expandedWidth: Number.isFinite(width) && width >= TASK_SIDEBAR_MIN_WIDTH && width <= TASK_SIDEBAR_MAX_WIDTH ? width : 350,
  };
}

export function getTaskSidebarMaxWidth(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return TASK_SIDEBAR_MAX_WIDTH;
  return Math.max(TASK_SIDEBAR_MIN_WIDTH, Math.min(TASK_SIDEBAR_MAX_WIDTH, Math.floor(availableWidth * .45)));
}

export function getTaskSidebarPreviewWidth(candidate: number, maxWidth = TASK_SIDEBAR_MAX_WIDTH): number {
  return Math.round(Math.max(TASK_SIDEBAR_MIN_WIDTH, Math.min(maxWidth, candidate)));
}

export function resolveTaskSidebarResize(previous: TaskSidebarPreference, candidate: number, maxWidth = TASK_SIDEBAR_MAX_WIDTH): TaskSidebarPreference {
  if (!Number.isFinite(candidate)) return previous;
  if (candidate <= TASK_SIDEBAR_COLLAPSE_THRESHOLD) return { ...previous, collapsed: true };
  return { collapsed: false, expandedWidth: getTaskSidebarPreviewWidth(candidate, maxWidth) };
}

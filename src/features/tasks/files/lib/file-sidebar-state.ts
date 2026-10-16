export const FILE_SIDEBAR_MIN_WIDTH = 180;
export const FILE_SIDEBAR_MAX_WIDTH = 420;
export const FILE_SIDEBAR_WIDTH_KEY = 'taskdoor-file-tree-width';
export const FILE_SIDEBAR_COLLAPSED_KEY = 'taskdoor-file-tree-collapsed';
const COLLAPSE_DRAG_DISTANCE = 80;

export type FileSidebarPreference = { collapsed: boolean; expandedWidth: number };

export function readFileSidebarPreference(savedWidth: string | null, savedCollapsed: string | null): FileSidebarPreference {
  const width = Number(savedWidth);
  return {
    collapsed: savedCollapsed === 'true',
    expandedWidth: Number.isFinite(width) && width >= FILE_SIDEBAR_MIN_WIDTH && width <= FILE_SIDEBAR_MAX_WIDTH ? width : 200,
  };
}

export function getFileSidebarMaxWidth(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return FILE_SIDEBAR_MAX_WIDTH;
  return Math.max(FILE_SIDEBAR_MIN_WIDTH, Math.min(FILE_SIDEBAR_MAX_WIDTH, Math.floor(availableWidth - 320)));
}

export function getFileSidebarPreviewWidth(candidate: number, maxWidth = FILE_SIDEBAR_MAX_WIDTH): number {
  return Math.round(Math.max(FILE_SIDEBAR_MIN_WIDTH, Math.min(maxWidth, candidate)));
}

export function resolveFileSidebarResize(previous: FileSidebarPreference, candidate: number, maxWidth = FILE_SIDEBAR_MAX_WIDTH): FileSidebarPreference {
  if (!Number.isFinite(candidate)) return previous;
  if (candidate <= FILE_SIDEBAR_MIN_WIDTH - COLLAPSE_DRAG_DISTANCE) return { ...previous, collapsed: true };
  return { collapsed: false, expandedWidth: getFileSidebarPreviewWidth(candidate, maxWidth) };
}

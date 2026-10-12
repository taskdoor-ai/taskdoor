import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getTaskSidebarMaxWidth, getTaskSidebarPreviewWidth, readTaskSidebarPreference, resolveTaskSidebarResize, TASK_SIDEBAR_COLLAPSED_KEY, TASK_SIDEBAR_MIN_WIDTH, TASK_SIDEBAR_WIDTH_KEY, type TaskSidebarPreference } from '@/features/tasks/lib/task-sidebar-state';

function loadPreference() {
  try { return readTaskSidebarPreference(localStorage.getItem(TASK_SIDEBAR_WIDTH_KEY), localStorage.getItem(TASK_SIDEBAR_COLLAPSED_KEY)); }
  catch { return readTaskSidebarPreference(null, null); }
}

export function useTaskSidebar() {
  const [preference, setPreference] = useState(loadPreference);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [desktop, setDesktop] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 901px)').matches);
  const workspaceRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const focusAfterCollapse = useRef(false);
  const focusAfterExpand = useRef(false);
  const sidebarId = useId();
  const maxWidth = getTaskSidebarMaxWidth(availableWidth);
  const renderedWidth = getTaskSidebarPreviewWidth(preference.expandedWidth, maxWidth);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const update = () => setDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;
    const update = () => { if (element.clientWidth) setAvailableWidth(element.clientWidth); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TASK_SIDEBAR_WIDTH_KEY, String(preference.expandedWidth));
      localStorage.setItem(TASK_SIDEBAR_COLLAPSED_KEY, String(preference.collapsed));
    } catch { /* Keep the current session usable when storage is unavailable. */ }
  }, [preference]);

  const restorePreview = useCallback(() => {
    workspaceRef.current?.style.setProperty('--task-sidebar-width', `${renderedWidth}px`);
    workspaceRef.current?.style.setProperty('--task-sidebar-content-width', `${renderedWidth}px`);
  }, [renderedWidth]);

  // A drag edits these properties directly; restore them even when React's saved
  // width is unchanged, so expanding cannot reuse a transient collapsed width.
  useLayoutEffect(restorePreview, [preference, restorePreview]);

  const focusToggleBeforeHiding = useCallback(() => {
    focusAfterCollapse.current = Boolean(sidebarRef.current?.contains(document.activeElement));
  }, []);

  useLayoutEffect(() => {
    if (preference.collapsed && focusAfterCollapse.current) {
      toggleRef.current?.focus({ preventScroll: true });
      focusAfterCollapse.current = false;
    } else if (!preference.collapsed && focusAfterExpand.current) {
      sidebarRef.current?.querySelector<HTMLElement>('[role="separator"]')?.focus({ preventScroll: true });
      focusAfterExpand.current = false;
    }
  }, [preference.collapsed]);

  const applyPreference = useCallback((next: TaskSidebarPreference) => {
    if (next.collapsed) focusToggleBeforeHiding();
    setPreference(next);
  }, [focusToggleBeforeHiding]);

  const commitResize = useCallback((width: number) => applyPreference(resolveTaskSidebarResize(preference, width, maxWidth)), [applyPreference, preference, maxWidth]);
  const changeWidth = useCallback((width: number) => commitResize(Math.max(TASK_SIDEBAR_MIN_WIDTH, width)), [commitResize]);
  const previewResize = useCallback((width: number) => {
    const root = workspaceRef.current;
    if (!root) return;
    // The pointer keeps travelling beyond the minimum, while the visible panel
    // stays readable. Only the final raw drag distance can trigger collapse.
    const accepted = getTaskSidebarPreviewWidth(width, getTaskSidebarMaxWidth(root.clientWidth));
    root.style.setProperty('--task-sidebar-width', `${accepted}px`);
    root.style.setProperty('--task-sidebar-content-width', `${accepted}px`);
  }, []);
  const setResizing = useCallback((resizing: boolean) => {
    if (workspaceRef.current) workspaceRef.current.dataset.sidebarResizing = String(resizing);
  }, []);
  const toggle = useCallback(() => {
    if (preference.collapsed) focusAfterExpand.current = document.activeElement === toggleRef.current;
    else focusToggleBeforeHiding();
    setPreference(current => ({ ...current, collapsed: !current.collapsed }));
  }, [focusToggleBeforeHiding, preference.collapsed]);
  const controls = useMemo(() => ({ collapsed: preference.collapsed, sidebarId, toggle, toggleRef }), [preference.collapsed, sidebarId, toggle]);

  return {
    collapsed: preference.collapsed, desktop, width: renderedWidth, maxWidth,
    workspaceRef, sidebarRef, sidebarId, controls,
    changeWidth, previewResize, commitResize, cancelResize: restorePreview, setResizing,
    style: { '--task-sidebar-width': `${renderedWidth}px`, '--task-sidebar-content-width': `${renderedWidth}px` } as CSSProperties,
  };
}

import { type CSSProperties, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { FILE_SIDEBAR_COLLAPSED_KEY, FILE_SIDEBAR_MIN_WIDTH, FILE_SIDEBAR_WIDTH_KEY, getFileSidebarMaxWidth, getFileSidebarPreviewWidth, readFileSidebarPreference, resolveFileSidebarResize, type FileSidebarPreference } from '@/features/tasks/files/lib/file-sidebar-state';

function loadPreference() {
  try { return readFileSidebarPreference(localStorage.getItem(FILE_SIDEBAR_WIDTH_KEY), localStorage.getItem(FILE_SIDEBAR_COLLAPSED_KEY)); }
  catch { return readFileSidebarPreference(null, null); }
}

export function useFileSidebar() {
  const [preference, setPreference] = useState(loadPreference);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [wideViewport, setWideViewport] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 761px)').matches);
  const rootRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();
  const focusAfterToggle = useRef(false);
  const desktop = wideViewport && (availableWidth === 0 || availableWidth > 740);
  const collapsed = desktop && preference.collapsed;
  const maxWidth = getFileSidebarMaxWidth(availableWidth);
  const width = getFileSidebarPreviewWidth(preference.expandedWidth, maxWidth);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 761px)');
    const update = () => setWideViewport(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => { if (root.clientWidth) setAvailableWidth(root.clientWidth); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FILE_SIDEBAR_WIDTH_KEY, String(preference.expandedWidth));
      localStorage.setItem(FILE_SIDEBAR_COLLAPSED_KEY, String(preference.collapsed));
    } catch { /* Keep this session usable when device preferences cannot be saved. */ }
  }, [preference]);

  const restorePreview = useCallback(() => {
    rootRef.current?.style.setProperty('--task-sidebar-width', `${width}px`);
    rootRef.current?.style.setProperty('--file-sidebar-content-width', `${width}px`);
  }, [width]);
  useLayoutEffect(restorePreview, [preference, restorePreview]);
  useLayoutEffect(() => {
    if (focusAfterToggle.current) {
      toggleRef.current?.focus({ preventScroll: true });
      focusAfterToggle.current = false;
    }
  }, [collapsed]);

  const applyPreference = useCallback((next: FileSidebarPreference) => {
    focusAfterToggle.current = document.activeElement === toggleRef.current || Boolean(next.collapsed && sidebarRef.current?.contains(document.activeElement));
    setPreference(next);
  }, []);
  const commitResize = useCallback((candidate: number) => applyPreference(resolveFileSidebarResize(preference, candidate, maxWidth)), [applyPreference, maxWidth, preference]);
  const changeWidth = useCallback((candidate: number) => commitResize(Math.max(FILE_SIDEBAR_MIN_WIDTH, candidate)), [commitResize]);
  const previewResize = useCallback((candidate: number) => {
    const root = rootRef.current;
    if (!root) return;
    const accepted = getFileSidebarPreviewWidth(candidate, getFileSidebarMaxWidth(root.clientWidth));
    root.style.setProperty('--task-sidebar-width', `${accepted}px`);
    root.style.setProperty('--file-sidebar-content-width', `${accepted}px`);
  }, []);
  const setResizing = useCallback((resizing: boolean) => {
    if (rootRef.current) rootRef.current.dataset.sidebarResizing = String(resizing);
  }, []);
  const toggle = useCallback(() => applyPreference({ ...preference, collapsed: !preference.collapsed }), [applyPreference, preference]);

  return { collapsed, desktop, width, maxWidth, rootRef, sidebarRef, sidebarId, toggleRef, toggle, changeWidth, previewResize, commitResize, cancelResize: restorePreview, setResizing,
    style: { '--task-sidebar-width': `${width}px`, '--file-sidebar-content-width': `${width}px` } as CSSProperties };
}

import { CalendarDays, ChevronUp } from "lucide-react";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { TaskIcon } from "./TaskIcon";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";

type TaskDetailStickySummaryProps = {
  titleRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  taskId: string;
  title: string;
  ownerId: string;
  ownerPending: boolean;
  status: TaskStatus;
  due: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
};

export function TaskDetailStickySummary({ titleRef, headerRef, collapsed, onCollapsedChange, taskId, title, ownerId, ownerPending, status, due, iconName, iconTone }: TaskDetailStickySummaryProps) {
  const summaryRef = useRef<HTMLElement>(null);
  const previousCollapsed = useRef(false);
  const collapsePosition = useRef({ scrollTop: 0, headerHeight: 0 });
  const focusDetailsOnExpand = useRef(false);

  useLayoutEffect(() => {
    const titleElement = titleRef.current;
    const header = headerRef.current;
    const scrollRoot = titleElement?.closest<HTMLElement>(".task-workspace-detail");
    const summary = summaryRef.current;
    if (!titleElement || !header || !scrollRoot || !summary) return;

    if (collapsed && !previousCollapsed.current) {
      const { scrollTop, headerHeight } = collapsePosition.current;
      // Remove the full card's space and leave room for the compact summary above the content.
      scrollRoot.scrollTop = Math.max(0, scrollTop - headerHeight);
    } else if (!collapsed && previousCollapsed.current) {
      scrollRoot.scrollTop = 0;
      if (focusDetailsOnExpand.current) titleElement.closest<HTMLElement>(".task-detail-heading-main")?.focus({ preventScroll: true });
      focusDetailsOnExpand.current = false;
    }
    previousCollapsed.current = collapsed;
  }, [collapsed, headerRef, titleRef]);

  useEffect(() => {
    const titleElement = titleRef.current;
    const header = headerRef.current;
    const scrollRoot = titleElement?.closest<HTMLElement>(".task-workspace-detail");
    if (!titleElement || !header || !scrollRoot) return;
    let lastScrollTop = scrollRoot.scrollTop;
    let touchY: number | undefined;
    const handleScroll = () => {
      const scrollTop = scrollRoot.scrollTop;
      if (!collapsed && header.getBoundingClientRect().bottom <= scrollRoot.getBoundingClientRect().top) {
        collapsePosition.current = { scrollTop, headerHeight: header.offsetHeight };
        if (document.activeElement instanceof HTMLElement && header.contains(document.activeElement)) document.activeElement.blur();
        onCollapsedChange(true);
      } else if (collapsed && scrollTop <= 0 && lastScrollTop > 0) {
        onCollapsedChange(false);
      }
      lastScrollTop = scrollTop;
    };
    // A collapsed, short page may already be at scrollTop 0. An upward gesture still expands it.
    const handleWheel = (event: WheelEvent) => {
      if (collapsed && scrollRoot.scrollTop <= 0 && event.deltaY < 0) onCollapsedChange(false);
    };
    const handleTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY; };
    const handleTouchMove = (event: TouchEvent) => {
      const nextY = event.touches[0]?.clientY;
      if (collapsed && scrollRoot.scrollTop <= 0 && touchY !== undefined && nextY !== undefined && nextY > touchY + 8) onCollapsedChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable='true'], [role='tab']")) return;
      if (collapsed && scrollRoot.scrollTop <= 0 && ["Home", "PageUp", "ArrowUp"].includes(event.key)) onCollapsedChange(false);
    };
    scrollRoot.addEventListener("scroll", handleScroll, { passive: true });
    scrollRoot.addEventListener("wheel", handleWheel, { passive: true });
    scrollRoot.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollRoot.addEventListener("touchmove", handleTouchMove, { passive: true });
    scrollRoot.addEventListener("keydown", handleKeyDown);
    return () => {
      scrollRoot.removeEventListener("scroll", handleScroll);
      scrollRoot.removeEventListener("wheel", handleWheel);
      scrollRoot.removeEventListener("touchstart", handleTouchStart);
      scrollRoot.removeEventListener("touchmove", handleTouchMove);
      scrollRoot.removeEventListener("keydown", handleKeyDown);
    };
  }, [collapsed, headerRef, onCollapsedChange, taskId, titleRef]);

  useEffect(() => {
    const scrollRoot = titleRef.current?.closest<HTMLElement>(".task-workspace-detail");
    const summary = summaryRef.current;
    if (!scrollRoot || !summary) return;
    // Keep keyboard navigation and source links clear of the summary at any pane width.
    const previousScrollPadding = scrollRoot.style.scrollPaddingTop;
    const resizeObserver = new ResizeObserver(() => {
      scrollRoot.style.scrollPaddingTop = summary.offsetHeight ? `${summary.offsetHeight + 16}px` : previousScrollPadding;
    });
    resizeObserver.observe(summary);
    return () => {
      resizeObserver.disconnect();
      scrollRoot.style.scrollPaddingTop = previousScrollPadding;
    };
  }, [taskId, titleRef]);

  const showFullDetails = () => {
    focusDetailsOnExpand.current = true;
    onCollapsedChange(false);
  };

  return <div className="task-detail-sticky-slot" data-collapsed={collapsed}>
    <aside aria-label="任务基础信息" className="task-detail-sticky-summary" hidden={!collapsed} ref={summaryRef}>
      <button aria-label={`查看完整任务信息：${title || "未命名任务"}`} className="task-detail-sticky-title" onClick={showFullDetails} title="返回完整任务信息" type="button">
        <TaskIcon iconName={iconName} tone={iconTone} />
        <strong>{title || "未命名任务"}</strong>
        <ChevronUp aria-hidden="true" size={16} />
      </button>
      <div className="task-detail-sticky-meta">
        <span aria-label="负责人" className="task-detail-sticky-owner">
          {ownerId ? <><PersonAvatar name={ownerId} personId={ownerId} showProfilePreview={false} size="xs" /><PersonName name={ownerId} personId={ownerId} showProfilePreview={false} />{ownerPending && <small>待接受</small>}</> : <span>未分配</span>}
        </span>
        <span aria-label={`截止时间：${due || "未设置"}`} className="task-detail-sticky-due"><CalendarDays aria-hidden="true" size={14} /><span>{due || "未设置"}</span></span>
      </div>
      <TaskStatusBadge size="sm" value={status} />
    </aside>
  </div>;
}

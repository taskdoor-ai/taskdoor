import { CalendarDays } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { TaskStatusBadge, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { formatLegacyDateLabel } from "@/shared/lib/date-time";

type Props = {
  scrollRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  taskId: string;
  activeTab: string;
  title: string;
  ownerId: string;
  ownerName: string;
  status: TaskStatus;
  progressRatio: number | null;
  due: string;
};

export function TaskDetailStickySummary({ scrollRef, headerRef, taskId, activeTab, title, ownerId, ownerName, status, progressRatio, due }: Props) {
  const { locale } = useI18n();
  const d = useDetailCopy();
  const summaryRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const displayedDue = due ? formatLegacyDateLabel(due, locale) : d("noDueDate");

  useEffect(() => {
    const root = scrollRef.current;
    const header = headerRef.current;
    const summary = summaryRef.current;
    if (!root || !header || !summary) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const summaryHeight = summary.offsetHeight;
      root.style.setProperty("--task-detail-summary-height", `${summaryHeight}px`);
      root.style.setProperty("--task-detail-viewport-height", `${root.clientHeight}px`);
      // Keep the full header in the document so scrolling never removes or jumps its space.
      setCollapsed(root.scrollTop > 0 && header.getBoundingClientRect().bottom <= root.getBoundingClientRect().top + summaryHeight);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    resize.observe(header);
    resize.observe(summary);
    root.addEventListener("scroll", schedule, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      root.removeEventListener("scroll", schedule);
    };
  }, [activeTab, headerRef, scrollRef, taskId]);

  return <div className="task-detail-sticky-slot" data-collapsed={collapsed}>
    <aside aria-label={d("information")} aria-hidden={!collapsed} inert={!collapsed} className="task-detail-sticky-summary" ref={summaryRef}>
      <strong className="task-detail-sticky-title" title={title}>{title}</strong>
      <TaskStatusBadge progressRatio={progressRatio} size="sm" value={status} />
      <div className="task-detail-sticky-meta">
        <span aria-label={`${d("owner")}: ${ownerName}`} className="task-detail-sticky-owner" title={ownerName}>
          {ownerId && <PersonAvatar name={ownerName} personId={ownerId} showProfilePreview={false} size="xs" />}<span>{ownerName}</span>
        </span>
        <span aria-label={`${d("dueDate")}: ${displayedDue}`} className="task-detail-sticky-due"><CalendarDays aria-hidden="true" size={14} /><span>{displayedDue}</span></span>
      </div>
    </aside>
  </div>;
}

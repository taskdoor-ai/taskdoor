import { TaskStatusIcon, taskStatusDefinition, type TaskStatus } from "@/shared/ui/TaskStatusBadge";
import { ChevronRight } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { useDetailCopy } from "@/shared/i18n/detail-messages";

type Props = {
  pathItems?: Array<{ id: string; label: string }>;
  onPathSelect?: (taskId: string) => void;
  scrollRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  taskId: string;
  activeTab: string;
  title: string;
  status: TaskStatus;
  progressRatio: number | null;
};

export function TaskDetailStickySummary({ scrollRef, headerRef, taskId, activeTab, title, status, progressRatio, pathItems = [], onPathSelect }: Props) {
  const d = useDetailCopy();
  const summaryRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const root = scrollRef.current;
    const header = headerRef.current;
    const summary = summaryRef.current;
    const titleRow = header?.querySelector<HTMLElement>(".task-detail-title-row");
    if (!root || !header || !summary) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const summaryHeight = summary.offsetHeight;
      root.style.setProperty("--task-detail-summary-height", `${summaryHeight}px`);
      root.style.setProperty("--task-detail-viewport-height", `${root.clientHeight}px`);
      // Keep the full header in the document so scrolling never removes or jumps its space.
      setCollapsed(root.scrollTop > 0 && (titleRow ?? header).getBoundingClientRect().top <= root.getBoundingClientRect().top + 18);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    resize.observe(header);
    if (titleRow) resize.observe(titleRow);
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
      {pathItems.some(item => item.id !== taskId) && <nav aria-label={d("path")} className="task-detail-path task-detail-sticky-path">{pathItems.map((item, index) => <span key={item.id}>{index > 0 && <ChevronRight aria-hidden="true" size={12} />}{item.id !== taskId && onPathSelect ? <button onClick={() => onPathSelect(item.id)} title={item.label} type="button">{item.label}</button> : <em aria-current={item.id === taskId ? "page" : undefined} title={item.label}>{item.label}</em>}</span>)}</nav>}
      <div className="task-detail-sticky-name-row"><span className="task-detail-sticky-progress" data-tone={taskStatusDefinition[status].tone}><TaskStatusIcon status={status} progressRatio={progressRatio} size={28} /></span><strong className="task-detail-sticky-title" title={title}>{title}</strong></div>

    </aside>
  </div>;
}

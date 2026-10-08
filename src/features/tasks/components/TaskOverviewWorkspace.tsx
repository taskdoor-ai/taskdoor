import { Activity, ArrowRight, Bot, LayoutDashboard, Maximize2, Minus, Plus, Workflow } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { canvasZoomMax, canvasZoomMin, getCanvasPanPosition, getFitCanvasZoom, stepCanvasZoom } from "../lib/taskCanvasViewport";
import { taskBoardStatusOrder, taskBoardStatusTone } from "../lib/taskBoard";
import { filterOverviewTasks, getCanvasTaskPresentation, getCyclicTaskIds, getDependencyLevelByTaskId, getIncompleteDependencyIds, getMostRecentlyUpdatedTask, getOverviewInsightCandidateIds, getVisibleDependencyEdges, isCanvasRelationshipActive } from "../lib/taskOverview";
import type { TaskOverviewRole } from "../lib/taskWorkspaceProjection";
import { useResponsiveControlSize } from "../lib/useResponsiveControlSize";
import { PersonAvatar } from "./PersonAvatar";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { taskStatusOptions } from "./TaskStatusBadge";
import { Button } from "./ui/button";
import { ListFilterSelect } from "./ui/list-filter-select";
import { SelectItem } from "./ui/select";

type OverviewView = "board" | "canvas";

type TaskOverviewWorkspaceProps = {
  activityCount: number;
  childTasks: TaskRelationSummary[];
  currentTaskId: string | null;
  fileCount: number;
  initialFocusedTaskId?: string | null;
  insight?: { evidence: string; message: string; type: "协作重点" | "状态一致性" | "证据缺口" | "验收风险" };
  onOpenActivity: () => void;
  onOpenInsightEvidence: () => void;
  onOpenTask?: (taskId: string) => void;
  recentActivities?: Array<{ author: string; message: string; time: string; type: string }>;
  role: TaskOverviewRole;
  taskCountLabel?: "子任务" | "相关任务";
};

type OverviewInsightItem = {
  actions: Array<{ label: string; onClick: () => void; primary?: boolean }>;
  message: string;
  tone: "risk" | "route" | "success" | "unknown" | "warning";
  type: string;
};

function TaskOverviewInsightsPanel({ actionSize, items }: { actionSize: "touch" | "xs"; items: OverviewInsightItem[] }) {
  return <section aria-labelledby="task-overview-insights-heading" className="task-overview-insights-panel" id="task-overview-insights" tabIndex={-1}>
    <header><div><h2 id="task-overview-insights-heading"><Bot aria-hidden="true" size={17} />AI 洞察</h2><p>只基于当前任务、依赖与活动给出建议。</p></div><span>不自动改动任务</span></header>
    <div className="task-overview-insight-cards">
      {items.map((item, index) => <article data-tone={item.tone} key={`${item.type}:${item.message}:${index}`}>
        <div className="task-overview-insight-type">{item.type}</div>
        <h3>{item.message}</h3>
        <div className="task-overview-insight-actions">{item.actions.map((action) => <Button key={action.label} onClick={action.onClick} size={actionSize} variant="outline" type="button">{action.label}{action.primary && <ArrowRight data-icon="inline-end" />}</Button>)}</div>
      </article>)}
    </div>
  </section>;
}

const canvasNodeWidth = 248;
const canvasNodeHeight = 116;
const canvasColumnGap = 56;
const canvasRowGap = 28;
const canvasFlowDotOffsets = [0, 0.5] as const;
const canvasFlowDuration = 2.2;

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (latest) => Math.round(latest).toLocaleString("zh-CN"));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.52, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [count, reduceMotion, value]);

  return <motion.span aria-label={String(value)}>{displayValue}</motion.span>;
}

const dueRank = (value: string) => {
  if (!value || value.includes("未设置")) return Number.POSITIVE_INFINITY;
  if (value.includes("今天")) return 0;
  const match = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : Number.POSITIVE_INFINITY;
};

function getCanvasLayout(tasks: TaskRelationSummary[]) {
  const levelByTaskId = getDependencyLevelByTaskId(tasks);
  const grouped = new Map<number, TaskRelationSummary[]>();
  tasks.forEach((task) => {
    const level = levelByTaskId.get(task.id) ?? 0;
    grouped.set(level, [...(grouped.get(level) ?? []), task]);
  });

  const maxLevel = Math.max(0, ...grouped.keys());
  const maxRows = Math.max(1, ...[...grouped.values()].map((items) => items.length));
  const width = Math.max(980, 80 + (maxLevel + 1) * (canvasNodeWidth + canvasColumnGap));
  const height = Math.max(390, 72 + maxRows * (canvasNodeHeight + canvasRowGap));
  const positions = new Map<string, { x: number; y: number }>();
  grouped.forEach((items, level) => items.forEach((task, index) => {
    const columnHeight = items.length * (canvasNodeHeight + canvasRowGap);
    positions.set(task.id, { x: 48 + level * (canvasNodeWidth + canvasColumnGap), y: 44 + (height - 44 - columnHeight) / 2 + index * (canvasNodeHeight + canvasRowGap) });
  }));
  return { height, positions, width };
}

function DependencyNote({ task, tasks }: { task: TaskRelationSummary; tasks: TaskRelationSummary[] }) {
  const waitingForIds = getIncompleteDependencyIds(task, tasks);
  const waitingFor = waitingForIds.map((id) => tasks.find((item) => item.id === id)).filter((item): item is TaskRelationSummary => item !== undefined);
  if (!waitingFor.length) return null;
  return <small className="task-overview-dependency-note">等待：{waitingFor.map((item) => item.title).join("、")}</small>;
}

function OverviewTaskCard({ disabled = false, id, onOpen, selected = false, task, tasks, variant }: {
  disabled?: boolean;
  id?: string;
  onOpen: () => void;
  selected?: boolean;
  task: TaskRelationSummary;
  tasks: TaskRelationSummary[];
  variant: "board" | "canvas";
}) {
  const upstream = (task.dependsOnTaskIds ?? []).map((id) => tasks.find((item) => item.id === id)?.title).filter(Boolean);
  const downstream = tasks.filter((item) => item.dependsOnTaskIds?.includes(task.id)).map((item) => item.title);
  return <button
    aria-pressed={variant === "canvas" ? selected : undefined}
    className={`task-overview-task-card ${variant} tone-${taskBoardStatusTone[task.status]} ${selected ? "is-selected" : ""}`}
    disabled={disabled}
    id={id}
    onClick={onOpen}
    type="button"
  >
    <span className="task-overview-task-card-title">
      <strong>{task.title}</strong>
    </span>
    <span className="task-overview-task-card-meta">
      <span className={`task-overview-status-dot tone-${taskBoardStatusTone[task.status]}`} aria-hidden="true" /><small>{task.status}</small>
      <small>{task.dueAt}</small>
      <span className="task-overview-card-owner" title={`负责人：${task.owner}`}><PersonAvatar name={task.owner} personId={task.owner} profilePreviewFocusable={false} size="xs" /><span className="sr-only">负责人：{task.owner}</span></span>
    </span>
    <DependencyNote task={task} tasks={tasks} />
    {variant === "canvas" && <span className="sr-only">{upstream.length ? `前置任务：${upstream.join("、")}。` : "无前置任务。"}{downstream.length ? `后续任务：${downstream.join("、")}。` : "无后续任务。"}</span>}
  </button>;
}

export function TaskOverviewWorkspace({
  activityCount,
  childTasks,
  currentTaskId,
  fileCount,
  initialFocusedTaskId = null,
  insight,
  onOpenActivity,
  onOpenInsightEvidence,
  onOpenTask,
  recentActivities = [],
  role,
  taskCountLabel = "子任务",
}: TaskOverviewWorkspaceProps) {
  const [view, setView] = useState<OverviewView>(role === "subtask" ? "canvas" : "board");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(initialFocusedTaskId);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFitMode, setCanvasFitMode] = useState(true);
  const [canvasPanning, setCanvasPanning] = useState(false);
  const reduceMotion = useReducedMotion();
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const canvasPanRef = useRef<{ pointerId: number; scrollLeft: number; scrollTop: number; startX: number; startY: number } | null>(null);
  const canvasPanMovedRef = useRef(false);
  const controlSize = useResponsiveControlSize();
  const markerPrefix = useId().replaceAll(":", "");
  const overviewTasks = childTasks;
  const insightCandidateIds = useMemo(() => new Set(getOverviewInsightCandidateIds(overviewTasks, role, currentTaskId)), [currentTaskId, overviewTasks, role]);
  const insightCandidateTasks = overviewTasks.filter((task) => insightCandidateIds.has(task.id));

  const owners = useMemo(() => [...new Set(overviewTasks.map((task) => task.owner))], [overviewTasks]);
  const filteredTasks = useMemo(() => filterOverviewTasks(overviewTasks, { owner: ownerFilter, status: statusFilter }), [overviewTasks, ownerFilter, statusFilter]);
  const visibleIds = useMemo(() => new Set(filteredTasks.map((task) => task.id)), [filteredTasks]);
  const canvasPresentation = useMemo(() => getCanvasTaskPresentation(filteredTasks, focusedTaskId), [filteredTasks, focusedTaskId]);
  const canvasTaskIds = useMemo(() => new Set(canvasPresentation.tasks.map((task) => task.id)), [canvasPresentation.tasks]);
  const dependencyEdges = useMemo(() => getVisibleDependencyEdges(filteredTasks, canvasTaskIds), [canvasTaskIds, filteredTasks]);
  const canvasLayout = useMemo(() => getCanvasLayout(canvasPresentation.tasks), [canvasPresentation.tasks]);

  const fitCanvasToViewport = useCallback(() => {
    const viewport = canvasScrollRef.current;
    if (!viewport) return;
    setCanvasZoom(getFitCanvasZoom({
      contentHeight: canvasLayout.height,
      contentWidth: canvasLayout.width,
      viewportHeight: viewport.clientHeight,
      viewportWidth: viewport.clientWidth,
    }));
  }, [canvasLayout.height, canvasLayout.width]);

  useEffect(() => {
    if (focusedTaskId && !visibleIds.has(focusedTaskId)) setFocusedTaskId(null);
  }, [focusedTaskId, visibleIds]);

  useEffect(() => {
    if (view !== "canvas" || !canvasFitMode) return;
    const viewport = canvasScrollRef.current;
    if (!viewport) return;
    const frame = window.requestAnimationFrame(fitCanvasToViewport);
    const observer = new ResizeObserver(fitCanvasToViewport);
    observer.observe(viewport);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [canvasFitMode, fitCanvasToViewport, view]);

  useEffect(() => {
    if (view !== "canvas" || !focusedTaskId) return;
    window.requestAnimationFrame(() => {
      const node = document.getElementById(`task-overview-canvas-task-${focusedTaskId}`);
      const canvasNode = node?.closest<HTMLElement>(".task-overview-canvas-node");
      const scrollArea = node?.closest<HTMLElement>(".task-overview-canvas-scroll");
      if (!canvasNode || !scrollArea) return;
      scrollArea.scrollTo({
        behavior: "auto",
        left: Math.max(0, canvasNode.offsetLeft * canvasZoom - (scrollArea.clientWidth - canvasNode.offsetWidth * canvasZoom) / 2),
        top: Math.max(0, canvasNode.offsetTop * canvasZoom - (scrollArea.clientHeight - canvasNode.offsetHeight * canvasZoom) / 2),
      });
    });
  }, [canvasZoom, focusedTaskId, view]);

  const beginCanvasPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest(".task-overview-canvas-node"))) return;
    const viewport = event.currentTarget;
    canvasPanRef.current = {
      pointerId: event.pointerId,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      startX: event.clientX,
      startY: event.clientY,
    };
    canvasPanMovedRef.current = false;
    viewport.setPointerCapture(event.pointerId);
  }, []);

  const moveCanvasPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = canvasPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const distanceX = event.clientX - pan.startX;
    const distanceY = event.clientY - pan.startY;
    if (Math.abs(distanceX) > 3 || Math.abs(distanceY) > 3) {
      canvasPanMovedRef.current = true;
      setCanvasPanning(true);
      setCanvasFitMode(false);
    }
    const position = getCanvasPanPosition({
      currentX: event.clientX,
      currentY: event.clientY,
      originLeft: pan.scrollLeft,
      originTop: pan.scrollTop,
      startX: pan.startX,
      startY: pan.startY,
    });
    event.currentTarget.scrollLeft = position.left;
    event.currentTarget.scrollTop = position.top;
    if (canvasPanMovedRef.current) event.preventDefault();
  }, []);

  const endCanvasPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = canvasPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    canvasPanRef.current = null;
    setCanvasPanning(false);
  }, []);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (canvasPanMovedRef.current) {
      canvasPanMovedRef.current = false;
      return;
    }
    setFocusedTaskId(null);
  }, []);

  const statusCounts = useMemo(() => taskBoardStatusOrder.map((status) => ({ status, value: overviewTasks.filter((task) => task.status === status).length })).filter((item) => item.value > 0), [overviewTasks]);
  const completedCount = overviewTasks.filter((task) => task.status === "已完成").length;
  const earliestTask = [...overviewTasks].filter((task) => task.status !== "已完成" && task.status !== "已取消" && Number.isFinite(dueRank(task.dueAt))).sort((a, b) => dueRank(a.dueAt) - dueRank(b.dueAt))[0];
  const recentTask = getMostRecentlyUpdatedTask(overviewTasks);
  const fullDependencyEdges = getVisibleDependencyEdges(overviewTasks, new Set(overviewTasks.map((task) => task.id)));
  const completedWithDownstream = insightCandidateTasks.find((task) => task.status === "已完成" && fullDependencyEdges.some((edge) => edge.from === task.id));
  const firstDependencyRisk = insightCandidateTasks.find((task) => task.status !== "已取消" && getIncompleteDependencyIds(task, overviewTasks).length > 0);
  const missingDueTask = insightCandidateTasks.find((task) => task.status !== "已完成" && task.status !== "已取消" && task.dueAt.includes("未设置"));
  const cyclicTaskIds = getCyclicTaskIds(overviewTasks);
  const firstCyclicTask = insightCandidateTasks.find((task) => cyclicTaskIds.has(task.id));

  const focusDependencyTask = (taskId: string) => {
    setOwnerFilter("all");
    setStatusFilter("all");
    setView("canvas");
    setFocusedTaskId(taskId);
  };

  const hasInsights = Boolean(firstDependencyRisk || missingDueTask || firstCyclicTask || insight || completedWithDownstream);
  const insightTone: OverviewInsightItem["tone"] = insight?.type === "协作重点" ? "route" : insight?.type === "证据缺口" ? "unknown" : insight?.type === "状态一致性" ? "warning" : "risk";
  const actionSize = controlSize === "touch" ? "touch" : "xs";
  const overviewInsightItems: OverviewInsightItem[] = [];
  if (firstDependencyRisk) overviewInsightItems.push({ actions: [{ label: "查看依赖关系", onClick: () => focusDependencyTask(firstDependencyRisk.id), primary: true }, { label: "查看任务", onClick: () => { onOpenTask?.(firstDependencyRisk.id); } }], message: `${firstDependencyRisk.title}尚不能完整接续`, tone: "warning", type: "前置依赖" });
  if (missingDueTask) overviewInsightItems.push({ actions: [{ label: "查看任务", onClick: () => { onOpenTask?.(missingDueTask.id); }, primary: true }], message: `${missingDueTask.title}尚未设置到期时间`, tone: "unknown", type: "推进节奏" });
  if (firstCyclicTask) overviewInsightItems.push({ actions: [{ label: "查看任务", onClick: () => { onOpenTask?.(firstCyclicTask.id); }, primary: true }], message: "任务依赖关系存在循环", tone: "warning", type: "状态一致性" });
  if (insight) overviewInsightItems.push({ actions: [{ label: "查看依据", onClick: onOpenInsightEvidence, primary: true }, { label: "查看活动", onClick: onOpenActivity }], message: insight.message, tone: insightTone, type: insight.type });
  if (completedWithDownstream) overviewInsightItems.push({ actions: [{ label: "查看子任务", onClick: () => { onOpenTask?.(completedWithDownstream.id); }, primary: true }], message: `${completedWithDownstream.title}的结果可供下游使用`, tone: "success", type: "结果回传" });
  const standaloneTask = role === "standalone" ? overviewTasks.find((task) => task.id === currentTaskId) ?? overviewTasks[0] : undefined;

  if (role === "standalone" && standaloneTask) {
    const visibleActivities = recentActivities.filter((activity) => activity.type !== "ai-insight").slice(0, 3);
    return <div className="task-overview-dashboard task-standalone-dashboard">
      <div className="task-overview-collaboration-grid task-standalone-content-grid">
          <section aria-labelledby="task-standalone-activity-heading" className="task-overview-analysis task-standalone-activity-dashboard">
            <header className="task-overview-analysis-header"><div><h2 id="task-standalone-activity-heading">执行动态</h2><p>查看当前任务最近发生的关键变化。</p></div><Button onClick={onOpenActivity} size={actionSize} variant="ghost" type="button">查看全部活动<ArrowRight data-icon="inline-end" /></Button></header>
            <div className="task-standalone-activity-totals"><span><strong><AnimatedNumber value={activityCount} /></strong><small>条任务动态</small></span><span><strong><AnimatedNumber value={fileCount} /></strong><small>个相关文件</small></span><span><strong>{standaloneTask.updatedAt ?? "暂无"}</strong><small>最近更新</small></span></div>
            {visibleActivities.length ? <ol>{visibleActivities.map((activity) => <li key={`${activity.type}:${activity.time}:${activity.message}`}><i aria-hidden="true" /><span><strong>{activity.message}</strong><small>{activity.author} · {activity.time}</small></span></li>)}</ol> : <div className="task-standalone-activity-empty">还没有可展示的任务动态。</div>}
          </section>

        <TaskOverviewInsightsPanel actionSize={actionSize} items={[{ actions: [{ label: "查看依据", onClick: onOpenInsightEvidence, primary: true }, { label: "查看活动", onClick: onOpenActivity }], message: insight?.message ?? "当前没有需要特别关注的任务风险。", tone: insight ? insightTone : "unknown", type: insight?.type ?? "任务观察" }]} />
      </div>
    </div>;
  }

  return <div className="task-overview-dashboard">
    {role !== "subtask" && <section aria-label="任务概览" className="task-overview-brief">
      <div className="task-overview-brief-facts">
        <article className="task-overview-distribution">
          <div className="task-overview-distribution-heading"><small>任务分布</small><span>共 <AnimatedNumber value={overviewTasks.length} /> 项</span></div>
          <div className="task-overview-distribution-value"><strong><AnimatedNumber value={completedCount} /></strong><span>项已完成</span></div>
          <span className="task-overview-progress-track" aria-label={`已完成 ${completedCount} 项，共 ${overviewTasks.length} 项`}>
            {statusCounts.map((item, index) => <motion.i
              animate={{ width: `${overviewTasks.length ? item.value / overviewTasks.length * 100 : 0}%` }}
              className={`tone-${taskBoardStatusTone[item.status]}`}
              initial={reduceMotion ? false : { width: 0 }}
              key={item.status}
              transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />)}
          </span>
          <ul className="task-overview-distribution-legend">
            {statusCounts.map((item) => <li key={item.status}><i className={`tone-${taskBoardStatusTone[item.status]}`} /><span>{item.status}</span><strong><AnimatedNumber value={item.value} /></strong></li>)}
          </ul>
        </article>
        <article><small>最早到期任务</small><strong>{earliestTask?.title ?? "暂无到期任务"}</strong><span>{earliestTask ? `${earliestTask.dueAt} · 负责人 ${earliestTask.owner}` : "到期时间均为空"}</span></article>
        <article><small>最近更新</small><strong>{recentTask?.title ?? `暂无${taskCountLabel}`}</strong><span>{recentTask ? `${recentTask.updatedAt ?? "暂无更新时间"} · ${recentTask.status}` : "—"}</span></article>
      </div>
    </section>}

    <div className={`task-overview-collaboration-grid ${hasInsights ? "" : "without-insights"}`}>
      <section aria-labelledby="task-overview-analysis-heading" className="task-overview-analysis">
        <header className="task-overview-analysis-header">
          <div><h2 id="task-overview-analysis-heading">任务推进分析</h2><p>按正式任务状态查看，也可切换到画布查看真实依赖。</p></div>
          <div aria-label="任务推进视图" className="task-overview-view-switch" role="group">
            <Button aria-pressed={view === "board"} onClick={() => setView("board")} size={controlSize} variant="ghost" type="button"><LayoutDashboard size={14} />看板</Button>
            <Button aria-pressed={view === "canvas"} onClick={() => setView("canvas")} size={controlSize} variant="ghost" type="button"><Workflow size={14} />画布</Button>
          </div>
        </header>
        <div className="task-overview-analysis-toolbar">
          <span>{filteredTasks.length} / {overviewTasks.length} 个{taskCountLabel}</span>
          <div>
            <ListFilterSelect ariaLabel="按负责人筛选任务" label={ownerFilter === "all" ? "负责人" : ownerFilter} onChange={setOwnerFilter} size={controlSize} value={ownerFilter}>
              <SelectItem value="all">不限负责人</SelectItem>{owners.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}
            </ListFilterSelect>
            <ListFilterSelect ariaLabel="按状态筛选任务" label={statusFilter === "all" ? "状态" : statusFilter} onChange={setStatusFilter} size={controlSize} value={statusFilter}>
              <SelectItem value="all">不限状态</SelectItem>{taskStatusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </ListFilterSelect>
          </div>
        </div>

        {filteredTasks.length === 0 ? <div className="task-overview-empty">当前筛选条件下没有任务。</div> : view === "board" ? <div className="task-overview-board">
          {taskBoardStatusOrder.filter((status) => filteredTasks.some((task) => task.status === status)).map((status) => {
            const tasks = filteredTasks.filter((task) => task.status === status);
            return <section className="task-overview-board-column" data-status={taskBoardStatusTone[status]} key={status}>
              <header><span><i aria-hidden="true" />{status}</span><small>{tasks.length}</small></header>
              <div>{tasks.map((task) => <OverviewTaskCard key={task.id} onOpen={() => onOpenTask?.(task.id)} task={task} tasks={overviewTasks} variant="board" />)}</div>
            </section>;
          })}
        </div> : <div className="task-overview-canvas" onClick={() => setFocusedTaskId(null)}>
          <div className="task-overview-canvas-topbar" onClick={() => setFocusedTaskId(null)}>
            <p>点击任务聚焦完整前后链路；拖动画布查看，点击空白处取消选中。</p>
            <div aria-label="画布缩放" className="task-overview-canvas-zoom" onClick={(event) => event.stopPropagation()} role="group">
              <Button aria-label="缩小画布" disabled={canvasZoom <= canvasZoomMin} onClick={() => { setCanvasFitMode(false); setCanvasZoom((zoom) => stepCanvasZoom(zoom, -1)); }} size={actionSize} variant="ghost" type="button"><Minus aria-hidden="true" size={14} /></Button>
              <button aria-label="恢复 100% 缩放" className="task-overview-canvas-zoom-value" onClick={() => { setCanvasFitMode(false); setCanvasZoom(1); }} type="button">{Math.round(canvasZoom * 100)}%</button>
              <Button aria-label="放大画布" disabled={canvasZoom >= canvasZoomMax} onClick={() => { setCanvasFitMode(false); setCanvasZoom((zoom) => stepCanvasZoom(zoom, 1)); }} size={actionSize} variant="ghost" type="button"><Plus aria-hidden="true" size={14} /></Button>
              <Button aria-pressed={canvasFitMode} onClick={() => { setCanvasFitMode(true); window.requestAnimationFrame(fitCanvasToViewport); }} size={actionSize} variant="ghost" type="button"><Maximize2 aria-hidden="true" size={14} />适合视野</Button>
            </div>
          </div>
          <div
            className={`task-overview-canvas-scroll ${canvasPanning ? "is-panning" : ""}`}
            onClick={handleCanvasClick}
            onPointerCancel={endCanvasPan}
            onPointerDown={beginCanvasPan}
            onPointerMove={moveCanvasPan}
            onPointerUp={endCanvasPan}
            ref={canvasScrollRef}
          >
            <div className="task-overview-canvas-stage" style={{ height: canvasLayout.height * canvasZoom, width: canvasLayout.width * canvasZoom }}>
            <div className="task-overview-canvas-layer" style={{ "--task-overview-node-height": `${canvasNodeHeight}px`, "--task-overview-node-width": `${canvasNodeWidth}px`, height: canvasLayout.height, transform: `scale(${canvasZoom})`, width: canvasLayout.width } as CSSProperties}>
              <svg aria-hidden="true" height={canvasLayout.height} width={canvasLayout.width}>
                <defs>
                  <marker className="task-overview-edge-marker ready" id={`${markerPrefix}-ready`} markerHeight="10" markerUnits="userSpaceOnUse" markerWidth="10" orient="auto" refX="8.5" refY="5" viewBox="0 0 10 10"><path d="M1 1.5 8.5 5 1 8.5Z" /></marker>
                  <marker className="task-overview-edge-marker waiting" id={`${markerPrefix}-waiting`} markerHeight="10" markerUnits="userSpaceOnUse" markerWidth="10" orient="auto" refX="8.5" refY="5" viewBox="0 0 10 10"><path d="M1 1.5 8.5 5 1 8.5Z" /></marker>
                </defs>
                {dependencyEdges.map((edge, edgeIndex) => {
                  const from = canvasLayout.positions.get(edge.from);
                  const to = canvasLayout.positions.get(edge.to);
                  const sourceTask = filteredTasks.find((task) => task.id === edge.from);
                  if (!from || !to) return null;
                  const waiting = sourceTask?.status !== "已完成";
                  const relationshipActive = isCanvasRelationshipActive(edge, canvasPresentation.emphasizedTaskIds, focusedTaskId);
                  const startX = from.x + canvasNodeWidth;
                  const startY = from.y + canvasNodeHeight / 2;
                  const endX = to.x - 10;
                  const endY = to.y + canvasNodeHeight / 2;
                  const bend = Math.max(42, (endX - startX) / 2);
                  const path = `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`;
                  return <g className={`task-overview-edge ${waiting ? "waiting" : "ready"} ${relationshipActive ? "" : "is-muted"}`} key={`${edge.from}:${edge.to}`}>
                    <path className="task-overview-edge-track" d={path} fill="none" markerEnd={`url(#${markerPrefix}-${waiting ? "waiting" : "ready"})`} />
                    {relationshipActive && canvasFlowDotOffsets.map((offset, dotIndex) => <circle className="task-overview-edge-pulse" key={dotIndex} opacity={1 - dotIndex * 0.1} r="2.7">
                      <animateMotion begin={`${-(offset * canvasFlowDuration) - edgeIndex * 0.12}s`} dur={`${canvasFlowDuration}s`} path={path} repeatCount="indefinite" />
                    </circle>)}
                  </g>;
                })}
              </svg>
              {canvasPresentation.tasks.map((task) => {
                const position = canvasLayout.positions.get(task.id) ?? { x: 0, y: 0 };
                const muted = focusedTaskId !== null && !canvasPresentation.emphasizedTaskIds.has(task.id);
                return <div className={`task-overview-canvas-node ${muted ? "is-muted" : ""}`} key={task.id} style={{ left: position.x, top: position.y }} onClick={(event) => event.stopPropagation()}>
                  <OverviewTaskCard id={`task-overview-canvas-task-${task.id}`} onOpen={() => setFocusedTaskId(task.id)} selected={focusedTaskId === task.id} task={task} tasks={overviewTasks} variant="canvas" />
                </div>;
              })}
            </div>
            </div>
          </div>
          <footer><span><i className="ready" />前置已完成</span><span><i className="waiting" />前置未完成</span><span>点击仅聚焦关系，不改变画布中的{taskCountLabel}</span></footer>
        </div>}
      </section>

      {hasInsights && <TaskOverviewInsightsPanel actionSize={actionSize} items={overviewInsightItems} />}
    </div>

    <section aria-label="近 7 日协作节奏" className="task-overview-rhythm">
      <div><Activity aria-hidden="true" size={16} /><span><small>近 7 日协作节奏</small><strong><AnimatedNumber value={activityCount + fileCount} /> 条可见更新</strong></span></div>
      <div aria-hidden="true">{[2, 3, 2, 4, 3, 5, 4].map((value, index) => <motion.i animate={{ height: `${12 + value * 5}px` }} initial={reduceMotion ? false : { height: 4 }} key={index} transition={{ delay: reduceMotion ? 0 : 0.12 + index * 0.045, duration: 0.38, ease: [0.22, 1, 0.36, 1] }} />)}</div>
      <p>活动 <AnimatedNumber value={activityCount} /> · 文件 <AnimatedNumber value={fileCount} /></p>
    </section>
  </div>;
}

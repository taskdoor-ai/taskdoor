import { useMemo } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ClipboardCheck, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { TaskIcon } from "./TaskIcon";
import {
  buildPersonalWorkbenchItems, buildPersonalWorkbenchPriorities,
  type PersonalWorkbenchModel,
  type PersonalWorkbenchPriority,
} from "../lib/personalWorkbench";
import "../styles/personal-workbench.css";

type PersonalWorkbenchProps = {
  analysisError?: string;
  analyzing?: boolean;
  currentUserName: string;
  hidden?: boolean;
  model: PersonalWorkbenchModel;
  onConnectAi: (trigger: HTMLElement) => void;
  onOpenTask: (taskId: string) => void;
  onOpenTaskList: () => void;
  onReanalyze: () => void;
};

function displayDate(value: string, withTime = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "时间待核对";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "long", day: "numeric",
    ...(withTime && value.includes("T") ? { hour: "2-digit", minute: "2-digit", hour12: false } as const : {}),
    ...(!withTime ? { weekday: "long" } as const : {}),
  }).format(date);
}

export function PersonalWorkbench({ analysisError = "", analyzing = false, currentUserName, hidden = false, model, onConnectAi, onOpenTask, onOpenTaskList, onReanalyze }: PersonalWorkbenchProps) {
  const work = useMemo(() => buildPersonalWorkbenchItems(model), [model]);
  const priorities = useMemo(() => buildPersonalWorkbenchPriorities(work.items), [work]);

  const priorityRow = ({ item }: PersonalWorkbenchPriority) => {
    return <li aria-label={"推荐关注任务：" + item.title} className="personal-workbench-priority-row" data-tone={item.iconTone ?? "neutral"} key={item.taskId}>
      <button aria-label={"打开推荐任务：" + item.title} className="personal-workbench-priority-surface" onClick={() => onOpenTask(item.taskId)} type="button">
        <span className="personal-workbench-row-grid">
          <span className="personal-workbench-task-column">
            <TaskIcon iconName={item.iconName} tone={item.iconTone} />
            <span className="personal-workbench-task-title">{item.title}</span>
          </span>
          <span className="personal-workbench-insight-column">
            <span aria-label="优先原因" className="personal-workbench-priority-reason" role="group">{item.priorityReason}</span>
          </span>
        </span>
      </button>
    </li>;
  };

  return <article aria-busy={analyzing} aria-labelledby="personal-workbench-heading" className="personal-workbench" hidden={hidden}>
    <div className="personal-workbench-inner">
      <header className="personal-workbench-header">
        <div className="personal-workbench-heading-main">
          <h1 aria-label={`${currentUserName}的今日建议`} id="personal-workbench-heading" tabIndex={-1}>{currentUserName}，这是今天建议你优先推进的工作</h1>
        </div>
        <div className="personal-workbench-header-end">
          <button className="personal-workbench-back" onClick={onOpenTaskList} type="button"><ArrowLeft aria-hidden="true" size={15} />任务列表</button>
          <Button aria-haspopup="dialog" aria-label="连接 AI" className="personal-workbench-connect-ai" onClick={(event) => onConnectAi(event.currentTarget)} size="sm" type="button" variant="ai"><Sparkles aria-hidden="true" size={14} />连接 AI</Button>
        </div>
      </header>

      <div className="personal-workbench-analysis-meta">
        <details className="personal-workbench-analysis-rules">
          <summary><span>AI 分析规则</span><ChevronDown aria-hidden="true" size={14} /></summary>
          <div className="personal-workbench-analysis-rules-body">
            <p><strong>排序</strong><span>当前顺序综合任务状态、期限、依赖、完成标准，以及你有权查看的讨论、动态和文件；先处理阻塞、临期或需要核对的事项，同档沿用原顺序。</span></p>
            <p><strong>范围</strong><span>仅包含你正式负责且仍需处理的任务，以及已结束但记录尚未收口的核对事项；待接受提议不计入，左侧筛选不影响，同一任务只出现一次，建议不会自动修改任务。</span></p>
          </div>
        </details>
        <div className="personal-workbench-analysis-status">
          <Button aria-label={analyzing ? "正在重新分析今日建议" : "重新分析今日建议"} disabled={analyzing} onClick={onReanalyze} size="sm" type="button" variant="outline">
            {analyzing ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <RefreshCw aria-hidden="true" />}
            {analyzing ? "分析中" : "重新分析"}
          </Button>
          <time className="personal-workbench-updated-at" dateTime={Number.isFinite(new Date(model.asOf).getTime()) ? model.asOf : undefined}>更新于 {displayDate(model.asOf, true)}</time>
        </div>
        {analysisError && <p className="personal-workbench-analysis-error" role="alert">{analysisError}</p>}
      </div>

      <section aria-label="推荐关注任务" className="personal-workbench-priority-section">
        {priorities.length > 0 ? <>
          <ul aria-label="推荐关注任务列表" className="personal-workbench-action-list">{priorities.map(priorityRow)}</ul>
          <footer aria-live="polite" className="personal-workbench-list-footer">
            <span>共 {priorities.length} 项任务</span>
          </footer>
        </> : <div className="personal-workbench-empty">
          <ClipboardCheck aria-hidden="true" size={28} strokeWidth={1.4} />
          <strong>{model.counts.owned ? "当前没有需要你处理的行动" : "还没有由你负责的任务"}</strong>
          <p>{model.counts.owned ? "可进入任务列表回看已经结束的任务。" : "正式负责人确定后，相关行动会汇总在这里。"}</p>
          <button className="personal-workbench-open" onClick={onOpenTaskList} type="button">查看任务列表<ArrowRight aria-hidden="true" size={14} /></button>
        </div>}
      </section>

      {model.awaitingAcceptance.length > 0 && <details className="personal-workbench-invitations">
        <summary><span>{model.awaitingAcceptance.length} 个负责人提议待你回应<small>尚未计入你的正式责任</small></span><ChevronDown aria-hidden="true" size={15} /></summary>
        <ul>{model.awaitingAcceptance.map(item => <li key={item.taskId}><button className="personal-workbench-invitation-title" onClick={() => onOpenTask(item.taskId)} type="button">{item.title}</button><p>{item.text}</p></li>)}</ul>
      </details>}

    </div>
  </article>;
}

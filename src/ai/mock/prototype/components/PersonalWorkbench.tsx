import { useI18n } from "../i18n/I18nProvider";
import { useMockText } from "../i18n/MockDataProvider";
import { workbenchPriorityReason } from "../i18n/workbenchCopy";
import { useGlobalUi } from "../i18n/globalUi";
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

function displayDate(value: string, locale: string, withTime = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "时间待核对";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Shanghai", month: "long", day: "numeric",
    ...(withTime && value.includes("T") ? { hour: "2-digit", minute: "2-digit", hour12: false } as const : {}),
    ...(!withTime ? { weekday: "long" } as const : {}),
  }).format(date);
}

export function PersonalWorkbench({ analysisError = "", analyzing = false, currentUserName, hidden = false, model, onConnectAi, onOpenTask, onOpenTaskList, onReanalyze }: PersonalWorkbenchProps) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const mock = useMockText();
  const work = useMemo(() => buildPersonalWorkbenchItems(model), [model]);
  const priorities = useMemo(() => buildPersonalWorkbenchPriorities(work.items, item => workbenchPriorityReason(locale, item, text => mock.text(text, item.taskId))), [work, locale, mock]);

  const priorityRow = ({ item }: PersonalWorkbenchPriority) => {
    const title = mock.field(item.taskId, "title", item.title);
    return <li aria-label={ui("推荐关注任务：{0}", {0: title})} className="personal-workbench-priority-row" data-tone={item.iconTone ?? "neutral"} key={item.taskId}>
      <button aria-label={ui("打开推荐任务：{0}", {0: title})} className="personal-workbench-priority-surface" onClick={() => onOpenTask(item.taskId)} type="button">
        <span className="personal-workbench-row-grid">
          <span className="personal-workbench-task-column">
            <TaskIcon iconName={item.iconName} tone={item.iconTone} />
            <span className="personal-workbench-task-title">{title}</span>
          </span>
          <span className="personal-workbench-insight-column">
            <span aria-label={ui("优先原因")} className="personal-workbench-priority-reason" role="group">{item.priorityReason}</span>
          </span>
        </span>
      </button>
    </li>;
  };

  return <article aria-busy={analyzing} aria-labelledby="personal-workbench-heading" className="personal-workbench" hidden={hidden}>
    <div className="personal-workbench-inner">
      <header className="personal-workbench-header">
        <div className="personal-workbench-heading-main">
          <h1 aria-label={ui("{0}的今日建议", {0: currentUserName})} id="personal-workbench-heading" tabIndex={-1}>{currentUserName}{ui("，这是今天建议你优先推进的工作")}</h1>
        </div>
        <div className="personal-workbench-header-end">
          <button className="personal-workbench-back" onClick={onOpenTaskList} type="button"><ArrowLeft aria-hidden="true" size={15} />{ui("任务列表")}</button>
          <Button aria-haspopup="dialog" aria-label={ui("连接 AI")} className="personal-workbench-connect-ai" onClick={(event) => onConnectAi(event.currentTarget)} size="sm" type="button" variant="ai"><Sparkles aria-hidden="true" size={14} />{ui("连接 AI")}</Button>
        </div>
      </header>

      <div className="personal-workbench-analysis-meta">
        <details className="personal-workbench-analysis-rules">
          <summary><span>{ui("AI 分析规则")}</span><ChevronDown aria-hidden="true" size={14} /></summary>
          <div className="personal-workbench-analysis-rules-body">
            <p><strong>{ui("排序")}</strong><span>{ui("当前顺序综合任务状态、期限、依赖、完成标准，以及你有权查看的讨论、动态和文件；先处理阻塞、临期或需要核对的事项，同档沿用原顺序。")}</span></p>
            <p><strong>{ui("范围")}</strong><span>{ui("仅包含你负责且仍需处理的任务，以及已结束但记录尚未收口的核对事项；左侧筛选不影响，同一任务只出现一次，建议不会自动修改任务。")}</span></p>
          </div>
        </details>
        <div className="personal-workbench-analysis-status">
          <Button aria-label={analyzing ? ui("正在重新分析今日建议") : ui("重新分析今日建议")} disabled={analyzing} onClick={onReanalyze} size="sm" type="button" variant="outline">
            {analyzing ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <RefreshCw aria-hidden="true" />}
            {analyzing ? ui("分析中") : ui("重新分析")}
          </Button>
          <time className="personal-workbench-updated-at" dateTime={Number.isFinite(new Date(model.asOf).getTime()) ? model.asOf : undefined}>{ui("更新于")} {ui(displayDate(model.asOf, locale, true))}</time>
        </div>
        {analysisError && <p className="personal-workbench-analysis-error" role="alert">{ui(analysisError)}</p>}
      </div>

      <section aria-label={ui("推荐关注任务")} className="personal-workbench-priority-section">
        {priorities.length > 0 ? <>
          <ul aria-label={ui("推荐关注任务列表")} className="personal-workbench-action-list">{priorities.map(priorityRow)}</ul>
          <footer aria-live="polite" className="personal-workbench-list-footer">
            <span>{priorities.length === 1 ? ui("共 1 项任务") : ui("共 {0} 项任务", {0: priorities.length})}</span>
          </footer>
        </> : <div className="personal-workbench-empty">
          <ClipboardCheck aria-hidden="true" size={28} strokeWidth={1.4} />
          <strong>{model.counts.owned ? ui("当前没有需要你处理的行动") : ui("还没有由你负责的任务")}</strong>
          <p>{model.counts.owned ? ui("可进入任务列表回看已经结束的任务。") : ui("正式负责人确定后，相关行动会汇总在这里。")}</p>
          <button className="personal-workbench-open" onClick={onOpenTaskList} type="button">{ui("查看任务列表")}<ArrowRight aria-hidden="true" size={14} /></button>
        </div>}
      </section>

    </div>
  </article>;
}

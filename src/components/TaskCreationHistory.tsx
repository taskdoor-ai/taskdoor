import { useCreationI18n } from "../i18n/creationMessages";
import { useGlobalUi } from "../i18n/globalUi";
import { ChevronDown } from "lucide-react";
import type { CreationProcess } from "../lib/taskCreationProgress";
import { TaskCreationProcessView } from "./TaskCreationProcess";

function userTurn(process: CreationProcess) {
  const answers = [
    process.answers.goal && { label: "目标", value: process.answers.goal },
    process.answers.deliverable && { label: "交付内容", value: process.answers.deliverable },
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  if (answers.length) return { answers };
  return { text: process.request };
}

function fallbackReply(process: CreationProcess) {
  if ((process.applicationStatus === "applied" || process.applicationStatus === "not_applied" || process.applicationStatus === "expired") && process.outcome) return process.outcome;
  if (process.responseSummary) return process.responseSummary;
  if (process.outcome) return process.outcome;
  if (process.status === "running") return "正在根据这轮输入整理候选方案。";
  if (process.status === "stopped") return "这轮处理已停止，之前的草稿仍然保留。";
  return "这轮处理未完成，输入和之前的草稿仍然保留。";
}

export function TaskCreationHistory({ processes, hideLatestPendingChanges = false, onStopLatest }: {
  processes: CreationProcess[];
  hideLatestPendingChanges?: boolean;
  onStopLatest?: () => void;
}) {
  const ui = useGlobalUi();
  const { localize } = useCreationI18n();
  const latest = processes.at(-1);
  const latestStep = latest?.steps[latest.activeStep];
  const liveStatus = latest?.status === "running"
    ? ui("AI 正在处理：{0}，{1}/{2}", {0: localize(latestStep?.label ?? "整理需求"), 1: latest.activeStep + 1, 2: latest.steps.length || 1})
    : latest?.status === "stopped" ? "AI 处理已停止"
      : latest?.status === "failed" ? "AI 回复未完成"
        : latest ? "AI 思考完成，回复已生成" : "";
  return <section aria-label={ui("本次创建对话")} className="task-creation-history">
    <span aria-atomic="true" className="sr-only" role="status">{ui(liveStatus)}</span>
    <ol>
      {processes.map((process, index) => {
        const user = userTurn(process);
        const running = process.status === "running";
        return <li className="task-creation-history-round" key={process.id}>
          <div aria-label={ui("你的输入")} className="task-creation-history-user" role="group">
            {user.answers ? <dl>{user.answers.map(answer => <div key={answer.label}><dt>{ui(answer.label)}</dt><dd>{answer.value}</dd></div>)}</dl> : <p>{user.text}</p>}
          </div>
          {process.steps.length > 0 && <TaskCreationProcessView onCancel={running && index === processes.length - 1 ? onStopLatest : undefined} process={process} />}
          {!running && <div aria-label={ui("AI 回复")} className="task-creation-history-ai" role="group">
            <p>{ui(localize(fallbackReply(process)))}</p>
            {process.changes?.length && !(hideLatestPendingChanges && index === processes.length - 1 && (process.applicationStatus === "pending" || process.applicationStatus === "expired")) ? <details className="task-creation-history-changes">
              <summary>{ui("查看本轮差异")}<span>{process.changes.length}{ui("处")}</span><ChevronDown aria-hidden="true" size={13} /></summary>
              <ul>{process.changes.map((change, changeIndex) => <li key={`${process.id}:${change.taskId}:${change.label}:${changeIndex}`}>
                <strong>{change.taskTitle} · {ui(localize(change.label))}</strong>
                <div><span><small>{ui("修改前")}</small>{change.before || ui("未设置")}</span><span><small>{ui("修改后")}</small>{change.after || ui("未设置")}</span></div>
              </li>)}</ul>
            </details> : null}
          </div>}
        </li>;
      })}
    </ol>
  </section>;
}

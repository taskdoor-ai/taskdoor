import type { CreationPlanningResult } from "./taskCreationPlanning";
import type { TaskAiAdjustmentApplicationStatus, TaskAiAdjustmentChange, TaskAiAdjustmentProgress } from "./taskAiAdjustmentTypes";

export type CreationFeedbackStep = { label: string; detail: string; basis: string };

/** A snapshot of this draft's local demonstration, never a model reasoning trace. */
export type CreationProcess = {
  id: number | string;
  kind?: "adjustment" | "relationship";
  title: string;
  request: string;
  answers: { goal?: string; deliverable?: string };
  steps: CreationFeedbackStep[];
  activeStep: number;
  status: "running" | "completed" | "stopped" | "failed";
  startedAt?: number;
  completedAt?: number;
  outcome?: string;
  responseSummary?: string;
  changes?: TaskAiAdjustmentChange[];
  applicationStatus?: TaskAiAdjustmentApplicationStatus;
};

export function createCreationRelationshipProcess(
  id: CreationProcess["id"],
  decision: "attach" | "independent",
  candidateTitle: string,
  responseSummary: string,
): CreationProcess {
  return {
    id,
    kind: "relationship",
    title: "确认任务关系",
    request: decision === "attach" ? `作为「${candidateTitle}」的子任务继续` : "仍然独立规划",
    answers: {},
    steps: [{
      label: "整理关系选择",
      detail: decision === "attach" ? `按你的选择，将当前需求作为「${candidateTitle}」的子任务继续整理。` : "按你的选择，将当前需求作为独立任务继续整理。",
      basis: decision === "attach" ? `你的选择：作为「${candidateTitle}」的子任务继续` : "你的选择：仍然独立规划",
    }],
    activeStep: 0,
    status: "completed",
    responseSummary,
  };
}

/** Resolve the latest relationship prompt without rewriting its preserved reply. */
export function markLatestCreationDecisionResolved(processes: CreationProcess[]): CreationProcess[] {
  const latest = processes.at(-1);
  if (latest?.outcome !== "任务关系待确认") return processes;
  return processes.map((process, index) => index === processes.length - 1
    ? { ...process, outcome: "候选方案已生成" }
    : process);
}

/** Retain each request snapshot, updating its own round without reordering newer work. */
export function recordCreationAdjustmentProgress(processes: CreationProcess[], progress: TaskAiAdjustmentProgress, now = Date.now()): CreationProcess[] {
  const id = `adjustment:${progress.id}`;
  const index = processes.findIndex(process => process.id === id);
  if (index < 0 && progress.status !== "running") return processes;
  if (index >= 0 && processes[index].status !== "running" && progress.status === "running") return processes;
  const previous = processes[index];
  const process: CreationProcess = {
    id, kind: "adjustment", title: "补充需求", request: progress.instruction, answers: {},
    steps: progress.steps.map(step => ({ ...step })), activeStep: progress.activeStep,
    status: progress.status, outcome: progress.outcome, responseSummary: progress.responseSummary,
    startedAt: previous?.startedAt ?? (index < 0 ? now : undefined),
    completedAt: previous?.completedAt ?? (progress.status === "completed" ? now : undefined),
    changes: progress.changes?.map(change => ({ ...change })), applicationStatus: progress.applicationStatus,
  };
  return index < 0 ? [...processes, process] : processes.map((saved, position) => position === index ? process : saved);
}

export function getCreationProcessStepState(process: CreationProcess, index: number) {
  if (index > process.activeStep) return "pending";
  if (process.status === "completed" || index < process.activeStep) return "completed";
  return process.status;
}

/** Creation-only presentation timing; the shared Mock player keeps its own default. */
export const CREATION_MOCK_STEP_MS = 3000;

/** Keep the saved input/plan intact while its next candidate is being prepared. */
export function getCreationDisplayStage(
  planning: CreationPlanningResult | null,
  { busy, editingBrief }: { busy: boolean; editingBrief: boolean },
): "describe" | "planning" | "clarify" | "decision" | "review" {
  if (busy) return "planning";
  if (editingBrief || !planning || planning.stage === "unavailable") return "describe";
  return planning.stage;
}

/** Snapshot the user-facing reply for this round; do not reconstruct it from a later draft. */
export function getCreationResponseSummary(result: CreationPlanningResult): string {
  if (result.stage === "clarify") {
    return `还需要补充：${result.questions.map(question => question.title).join("；")}补充后会继续整理任务方案。`;
  }
  return result.stage === "unavailable" ? result.message : result.summary;
}

/** Short labels for the explicit Mock preview; not a stored report or tool trace. */
export function getCreationFeedback(result: CreationPlanningResult): CreationFeedbackStep[] {
  if (result.stage === "unavailable") return [{
    label: "检查支持范围", detail: "确认当前需求与已有信息是否足以形成任务方案。",
    basis: "当前输入与支持范围；未支持的内容保留原文。",
  }];
  if (result.stage === "clarify") return [{
    label: "核对必要信息", detail: "先核对目标和交付内容，明确必要信息后再继续规划。",
    basis: "当前输入中尚未明确的目标或交付内容。",
  }];
  if (result.stage === "decision") return [
    { label: "理解输入", detail: "理清当前需求希望达成的目标与交付内容。", basis: "当前输入；未检索历史任务。" },
    { label: "核对任务关系", detail: "整理已有任务的候选关系，交由你确认。", basis: "已有任务关系与当前候选，不代表已查重或关联。" },
  ];
  return [
    {
      label: "分析任务", detail: "梳理需求中的目标、交付边界与待确认约束。",
      basis: "当前输入与已有资料；未检索历史任务。",
    },
    {
      label: "目标与计划", detail: result.form.subtasks.length
        ? "按可独立验收的交付拆分，整理目标、完成标准、执行建议与预估人类投入。"
        : "保留一项交付，不额外拆分；整理完成标准、执行建议与预估人类投入。",
      basis: "按约定 AI／工具方式预估；不含等待，未知投入仍待确认。",
    },
    {
      label: "成员推荐", detail: "对照成员职责，整理负责人和参与人的候选建议。",
      basis: "成员资料；人选未接受，实际忙闲待确认。",
    },
    {
      label: "动态规划", detail: "整理候选前置依赖与期限依据，标出需要你核对的安排。",
      basis: "候选交付关系与日期；缺少期限依据的保留待确认。",
    },
  ];
}

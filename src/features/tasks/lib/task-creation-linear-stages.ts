import type { CreationForm } from "./taskCreationForm";

export type LinearCreationStage = {
  id: "goal" | "people" | "split" | "plan" | `subtask:${string}`;
  label: string;
};

export function getLinearCreationStages(form: CreationForm, revealCount = Number.POSITIVE_INFINITY): LinearCreationStage[] {
  const stages: LinearCreationStage[] = [
    { id: "goal", label: "目标与验收标准" },
    { id: "people", label: "寻找参与者" },
    { id: "split", label: "是否拆分" },
  ];
  if (form.subtasks.length) {
    stages.push({ id: "plan", label: "子任务规划" });
    stages.push(...form.subtasks.map(task => ({ id: `subtask:${task.clientId}` as const, label: task.title || "未命名子任务" })));
  }
  return stages.slice(0, Math.max(0, revealCount));
}

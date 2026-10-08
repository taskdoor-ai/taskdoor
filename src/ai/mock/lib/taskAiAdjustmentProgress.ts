import type { TaskAiAdjustmentProgress, TaskAiAdjustmentProposal } from "./taskAiAdjustmentTypes";

/** Explain only the submitted instruction and the actual candidate's observable differences. */
export function getTaskAiAdjustmentSteps(instruction: string, proposal?: TaskAiAdjustmentProposal): TaskAiAdjustmentProgress["steps"] {
  const targets = proposal ? [...new Set(proposal.changes.map(change => change.taskTitle))] : [];
  const changes = proposal?.changes ?? [];
  return [
    {
      label: "理解调整要求",
      detail: targets.length ? `本次调整：${targets.map(title => `「${title}」`).join("、")}` : "核对本次要求与当前任务内容",
      basis: `本次要求：${instruction.trim()}${targets.length ? `\n候选涉及：${targets.join("、")}` : ""}`,
    },
    {
      label: "整理修改预览",
      detail: proposal ? changes.length ? `${changes.length} 处字段变化，确认后才应用` : "当前内容无需变更" : "等待形成修改候选",
      basis: proposal ? changes.length ? changes.map(change => `「${change.taskTitle}」${change.label}：${change.before || "未设置"} → ${change.after || "未设置"}`).join("\n") : proposal.summary : "尚未生成修改候选。",
    },
  ];
}

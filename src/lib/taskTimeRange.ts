import type { TaskNode } from "../data/workspaceNodes.ts";

const normalizeTaskTime = (value?: string) => {
  const normalized = value?.trim();
  if (!normalized || normalized === "—" || normalized.includes("未设置") || normalized.includes("待排期")) return undefined;
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${Number(iso[2])} 月 ${Number(iso[3])} 日` : normalized;
};

export function getTaskTimeRangeLabel(task: Pick<TaskNode, "dueAt" | "plannedEndOn" | "plannedStartOn">): string | null {
  const start = normalizeTaskTime(task.plannedStartOn);
  const end = normalizeTaskTime(task.plannedEndOn);
  if (start && end) return `${start} – ${end}`;
  if (start) return `开始 ${start}`;
  if (end) return `截止 ${end}`;
  const due = normalizeTaskTime(task.dueAt);
  return due ? `截止 ${due}` : null;
}

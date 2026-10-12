import type { TaskNode } from "@/shared/model/task-model.ts";
import { formatLegacyDateLabel } from "@/shared/lib/date-time";

const normalizeTaskTime = (value?: string, locale = "zh-CN") => {
  const normalized = value?.trim();
  if (!normalized || normalized === "—" || normalized.includes("未设置") || normalized.includes("待排期")) return undefined;
  return formatLegacyDateLabel(normalized, locale);
};

export function getTaskTimeRangeLabel(task: Pick<TaskNode, "dueAt" | "plannedEndOn" | "plannedStartOn">, locale = "zh-CN"): string | null {
  const start = normalizeTaskTime(task.plannedStartOn, locale);
  const end = normalizeTaskTime(task.plannedEndOn, locale);
  const english = locale.startsWith("en");
  if (start && end) return `${start} – ${end}`;
  if (start) return `${english ? "Starts" : "开始"} ${start}`;
  if (end) return `${english ? "Due" : "截止"} ${end}`;
  const due = normalizeTaskTime(task.dueAt, locale);
  return due ? `${english ? "Due" : "截止"} ${due}` : null;
}

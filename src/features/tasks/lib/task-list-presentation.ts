import type { TaskNode } from "@/shared/model/task-model";
import { formatDisplayDate, formatLegacyDateLabel, formatRelativeDateTime } from "@/shared/lib/date-time";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import { LEGACY_TEAM_TIME_ZONE } from "@/shared/lib/team-time-zone";

// Old demo labels have no absolute timestamp. Anchor them once per session, not on each render.
const legacyReference = new Date();
const units: Record<string, number> = { 秒: 1000, 分钟: 60000, 小时: 3600000, 天: 86400000, 周: 604800000 };
export function taskUpdatedTime(value: string, reference = legacyReference): number | null {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text)) {
    const day = new Date(`${text.slice(0, 10)}T00:00:00`);
    if (day.getFullYear() !== Number(text.slice(0, 4)) || day.getMonth() + 1 !== Number(text.slice(5, 7)) || day.getDate() !== Number(text.slice(8, 10))) return null;
    const time = text.length === 10 ? day.getTime() : Date.parse(text);
    return Number.isFinite(time) ? time : null;
  }
  if (text === "刚刚") return reference.getTime();
  const relative = text.match(/^(\d+)\s*(秒|分钟|小时|天|周)前$/);
  if (relative) return reference.getTime() - Number(relative[1]) * units[relative[2]];
  const day = text.match(/^(今天|昨天|前天)(?:\s*(\d{1,2}):(\d{2}))?$/);
  if (day) {
    if (Number(day[2] ?? 0) > 23 || Number(day[3] ?? 0) > 59) return null;
    const date = new Date(reference);
    date.setDate(date.getDate() - ({ 今天: 0, 昨天: 1, 前天: 2 }[day[1]] ?? 0));
    date.setHours(Number(day[2] ?? 0), Number(day[3] ?? 0), 0, 0);
    return date.getTime();
  }
  return null;
}
export function compareTaskUpdates(a: TaskNode, b: TaskNode, byCreation = false): number {
  const left = taskUpdatedTime(byCreation ? a.createdAt ?? "" : a.updatedAt), right = taskUpdatedTime(byCreation ? b.createdAt ?? "" : b.updatedAt);
  if (left === null && right !== null) return 1;
  if (left !== null && right === null) return -1;
  return (left !== null && right !== null ? right - left : 0)
    || a.name.localeCompare(b.name, "zh-CN") || a.id.localeCompare(b.id);
}
export function taskUpdatedLabel(value: string, now = new Date(), reference = legacyReference, locale = "zh-CN"): { label: string; title: string; dateTime?: string } {
  const text = value.trim();
  const timestamp = taskUpdatedTime(text, reference);
  const english = locale.startsWith("en");
  if (timestamp === null) return { label: english ? "Time unknown" : "时间未知", title: english ? "No recognizable update time recorded" : "未记录可识别的更新时间" };
  const absolute = /^\d{4}-\d{2}-\d{2}/.test(text);
  const dateOnly = /^(?:\d{4}-\d{2}-\d{2}|今天|昨天|前天)$/.test(text);
  if (!absolute) return { label: formatLegacyDateLabel(text, locale), title: english ? `Historical demo time: ${formatLegacyDateLabel(text, locale)} (no absolute timestamp recorded)` : `历史演示时间：${formatLegacyDateLabel(text, locale)}（未记录绝对时间）` };
  const time = dateOnly ? null : formatRelativeDateTime(text, locale, now.getTime());
  const label = dateOnly ? formatDisplayDate(text, { now: now.getTime() }) : time?.label;
  const title = dateOnly ? `${formatDisplayDate(text, { year: "always", now: now.getTime() })}${english ? " (time not recorded)" : "（未记录时分）"}` : time?.full;
  return {
    label: label ?? (english ? "Time unknown" : "时间未知"),
    title: title ?? (english ? "Time not recorded" : "未记录"),
    dateTime: dateOnly ? text : new Date(timestamp).toISOString(),
  };
}
export function taskDueLabel(task: TaskNode, now = new Date(), timeZone = LEGACY_TEAM_TIME_ZONE): { label: string; overdue: boolean } | null {
  if (task.status === "已完成" || task.status === "已取消") return null;
  const value = task.plannedEndOn;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const savedDay = taskCalendarDate(value, timeZone);
    const todayDay = taskCalendarDate(now.toISOString(), timeZone);
    if (savedDay && todayDay) {
      const day = Date.parse(`${savedDay}T00:00:00Z`);
      const today = Date.parse(`${todayDay}T00:00:00Z`);
      const diff = (day - today) / 86400000;
      return { label: diff < 0 ? `逾期 ${-diff} 天` : diff === 0 ? "今天截止" : diff === 1 ? "明天截止" : `${formatDisplayDate(value, { now: now.getTime() }) ?? "—"}截止`, overdue: diff < 0 };
    }
  }
  // A legacy month/day label is display-only; do not guess a year to declare it overdue.
  return task.dueAt && !["—", "未设置", "待定"].includes(task.dueAt) ? { label: `${formatLegacyDateLabel(task.dueAt)}截止`, overdue: false } : null;
}

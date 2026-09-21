import type { TaskNode } from "../data/workspaceNodes";

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
export function taskUpdatedLabel(value: string, now = new Date(), reference = legacyReference): { label: string; title: string; dateTime?: string } {
  const text = value.trim();
  const timestamp = taskUpdatedTime(text, reference);
  if (timestamp === null) return { label: "时间未知", title: "未记录可识别的更新时间" };
  const date = new Date(timestamp);
  const absolute = /^\d{4}-\d{2}-\d{2}/.test(text);
  const dateOnly = /^(?:\d{4}-\d{2}-\d{2}|今天|昨天|前天)$/.test(text);
  const pad = (part: number) => String(part).padStart(2, "0");
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const fullDate = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  const shortDate = `${date.getFullYear() === now.getFullYear() ? "" : `${date.getFullYear()}/`}${date.getMonth() + 1}/${date.getDate()}`;
  // Compare calendar days, not elapsed hours: yesterday can be only minutes ago.
  const calendarDay = (day: Date) => Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const daysAgo = (calendarDay(now) - calendarDay(date)) / 86400000;
  const label = dateOnly ? shortDate : daysAgo === 0 ? clock : daysAgo === 1 ? `昨天 ${clock}` : shortDate;
  const title = dateOnly ? `${fullDate}（未记录时分）` : `${fullDate} ${clock}:${pad(date.getSeconds())}`;
  return {
    label,
    title: absolute ? title : `${title}；历史演示时间：${text}（未记录绝对时间，按本次会话参考日期换算）`,
    ...(absolute ? { dateTime: dateOnly ? text : date.toISOString() } : {}),
  };
}
export function taskDueLabel(task: TaskNode, now = new Date()): { label: string; overdue: boolean } | null {
  if (task.status === "已完成" || task.status === "已取消") return null;
  const value = task.plannedEndOn;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10))) {
      const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = (day - today) / 86400000;
      return { label: diff < 0 ? `逾期 ${-diff} 天` : diff === 0 ? "今天截止" : diff === 1 ? "明天截止" : `${date.getMonth() + 1}月${date.getDate()}日截止`, overdue: diff < 0 };
    }
  }
  // A legacy month/day label is display-only; do not guess a year to declare it overdue.
  return task.dueAt && !["—", "未设置", "待定"].includes(task.dueAt) ? { label: `${task.dueAt.replace(/\s/g, "")}截止`, overdue: false } : null;
}

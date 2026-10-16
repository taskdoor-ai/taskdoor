import { formatDisplayDate } from "@/shared/lib/date-time";
import { isValidTimeZone, LEGACY_TEAM_TIME_ZONE } from "@/shared/lib/team-time-zone";

const validCalendarDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** Saved dates keep their day; precise instants use the task's team's calendar. */
export function taskCalendarDate(value?: string | null, timeZone = LEGACY_TEAM_TIME_ZONE): string | null {
  if (!value) return null;
  if (validCalendarDate(value)) return value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !validCalendarDate(value.slice(0, 10))) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(time));
    const part = (type: string) => parts.find(item => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch { return null; }
}
export function taskCreationDay(now = new Date(), timeZone = LEGACY_TEAM_TIME_ZONE): string {
  const day = taskCalendarDate(now.toISOString(), timeZone);
  if (!day) throw new Error("团队时区无效，无法确定创建日期。输入已保留。");
  return day;
}

export function taskScheduleError(end?: string | null, createdAt?: string | null, start?: string | null, timeZone = LEGACY_TEAM_TIME_ZONE, locale = "zh-CN"): string | null {
  if (!isValidTimeZone(timeZone)) return "团队时区无效，日期未保存。输入已保留。";
  if (!end) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !taskCalendarDate(end)) return '截止日期无效，请选择有效日期。';
  const created = taskCalendarDate(createdAt, timeZone);
  if (created && end < created) return `截止时间不能早于创建日期（${formatDisplayDate(created, { locale, year: "always" }) ?? "—"}）。`;
  const plannedStart = taskCalendarDate(start, timeZone);
  if (plannedStart && end < plannedStart) return '截止时间不能早于计划开始日期。';
  return null;
}

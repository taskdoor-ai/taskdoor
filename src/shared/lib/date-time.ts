export type DisplayDateOptions = { year?: "auto" | "always" | "never"; now?: number; timeZone?: string };
type DateValue = string | number | Date;
const calendarPattern = /^\d{4}-\d{2}-\d{2}$/;

function calendarDate(value: string) {
  if (!calendarPattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
function instant(value: DateValue) {
  if (typeof value === "string" && (!/^\d{4}-\d{2}-\d{2}[T ]/.test(value) || !calendarDate(value.slice(0, 10)))) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function yearAt(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", ...(timeZone ? { timeZone } : {}) }).format(date);
}
function yearOption(date: Date, options: DisplayDateOptions, calendar = false): Intl.DateTimeFormatOptions {
  const differentYear = yearAt(date, calendar ? "UTC" : options.timeZone) !== yearAt(new Date(options.now ?? Date.now()), options.timeZone);
  return options.year === "always" || (options.year !== "never" && differentYear) ? { year: "numeric" } : {};
}

/** Calendar dates keep their saved day; instants use the viewer's timezone. */
export function formatDisplayDate(value: DateValue, options: DisplayDateOptions = {}): string | null {
  const calendar = typeof value === "string" && calendarPattern.test(value);
  const date = calendar ? calendarDate(value as string) : instant(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { ...yearOption(date, options, calendar), month: "short", day: "numeric", ...(calendar ? { timeZone: "UTC" } : options.timeZone ? { timeZone: options.timeZone } : {}) }).format(date);
}
export function formatDisplayDateTime(value: DateValue, options: DisplayDateOptions = {}): string | null {
  const date = instant(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { ...yearOption(date, options), month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, ...(options.timeZone ? { timeZone: options.timeZone } : {}) }).format(date);
}
export function formatDisplayTime(value: DateValue, options: DisplayDateOptions = {}): string | null {
  const clock = typeof value === "string" ? value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/) : null;
  if (clock && (Number(clock[1]) > 23 || Number(clock[2]) > 59)) return null;
  const date = clock ? new Date(Date.UTC(2000, 0, 1, Number(clock[1]), Number(clock[2]))) : instant(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, ...(clock ? { timeZone: "UTC" } : options.timeZone ? { timeZone: options.timeZone } : {}) }).format(date);
}
export function formatDisplayMonth(value: DateValue, options: DisplayDateOptions = {}): string | null {
  const calendar = typeof value === "string" && calendarPattern.test(value);
  const date = calendar ? calendarDate(value as string) : instant(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", ...(calendar ? { timeZone: "UTC" } : options.timeZone ? { timeZone: options.timeZone } : {}) }).format(date);
}

export function formatRelativeDateTime(value: DateValue, locale: string, now = Date.now()): { label: string; full: string } | null {
  const date = instant(value);
  if (!date) return null;
  const full = formatDisplayDateTime(date, { year: "always", now })!;
  const delta = now - date.getTime();
  if (delta < 0) return { label: formatDisplayDateTime(date, { now })!, full };
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return { label: locale.startsWith("en") ? "Just now" : "刚刚", full };
  if (delta < 86_400_000) {
    const hours = Math.floor(minutes / 60);
    return { label: new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-(hours || minutes), hours ? "hour" : "minute"), full };
  }
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate()) return { label: `${locale.startsWith("en") ? "Yesterday" : "昨天"} ${formatDisplayTime(date)}`, full };
  return { label: formatDisplayDateTime(date, { now })!, full };
}

/** Display compatibility only: incomplete legacy labels never acquire a guessed year or timestamp. */
export function formatLegacyDateLabel(value: string, locale = "zh-CN", options: DisplayDateOptions = {}): string {
  const text = value.trim();
  if (calendarPattern.test(text)) return formatDisplayDate(text, options) ?? value;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return formatDisplayDateTime(text, options) ?? value;
  const range = text.split(/\s*(?:—|–|至|~|～|→)\s*/);
  if (range.length === 2 && range.every(Boolean)) return range.map(part => formatLegacyDateLabel(part, locale, options)).join(" — ");
  const day = text.match(/^(今天|昨天|前天|Today|Yesterday)(?:\s+(\d{1,2}:\d{2}))?$/i);
  if (day) {
    const english = locale.startsWith("en");
    const labels: Record<string, string> = english ? { 今天: "Today", 昨天: "Yesterday", 前天: "2 days ago", today: "Today", yesterday: "Yesterday" } : { 今天: "今天", 昨天: "昨天", 前天: "前天", today: "今天", yesterday: "昨天" };
    const clock = day[2] ? formatDisplayTime(day[2]) : null;
    if (day[2] && !clock) return value;
    return `${labels[day[1].toLowerCase()]}${clock ? ` ${clock}` : ""}`;
  }
  if (/^(刚刚|Just now)$/i.test(text)) return locale.startsWith("en") ? "Just now" : "刚刚";
  const relative = text.match(/^(\d+)\s*(秒|分钟|小时|天|周)前$/);
  if (relative) {
    const units: Record<string, Intl.RelativeTimeFormatUnit> = { 秒: "second", 分钟: "minute", 小时: "hour", 天: "day", 周: "week" };
    return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-Number(relative[1]), units[relative[2]]);
  }
  const dated = text.match(/^(?:(\d{4})\s*(?:年|[-/])\s*)?(\d{1,2})\s*(?:月|[-/])\s*(\d{1,2})\s*(?:日)?(?:[ T]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
  if (dated) {
    const [, year, month, dayOfMonth, hour, minute] = dated;
    const calendar = `${year ?? "2000"}-${month.padStart(2, "0")}-${dayOfMonth.padStart(2, "0")}`;
    const date = calendarDate(calendar);
    if (!date) return value;
    const clock = hour === undefined ? null : formatDisplayTime(`${hour}:${minute}`);
    if (hour !== undefined && !clock) return value;
    const label = formatDisplayDate(calendar, { ...options, ...(!year ? { year: "never" as const } : {}) })!;
    return `${label}${clock ? `, ${clock}` : ""}`;
  }
  return formatDisplayTime(text, options) ?? value;
}

/** Only use for generated UI copy, never rewrite a person's free-form content. */
export function formatSystemDateText(value: string, locale = "zh-CN", options: DisplayDateOptions = {}): string {
  return value.replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})| \d{1,2}:\d{2}(?::\d{2})?)?\b|(?:\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日(?:\s+\d{1,2}:\d{2})?|(?:今天|昨天|前天)\s+\d{1,2}:\d{2}/g, token => formatLegacyDateLabel(token, locale, options));
}

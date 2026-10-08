/** Dates in the task workspace use the same Shanghai calendar day as creation. */
export function taskCalendarDate(value?: string | null): string | null {
  if (!value) return null;
  if (value.includes('T')) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time)) : null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value ? value : null;
}
export const taskCreationDay = () => taskCalendarDate(new Date().toISOString())!;

export function taskScheduleError(end?: string | null, createdAt?: string | null, start?: string | null): string | null {
  if (!end) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !taskCalendarDate(end)) return '截止日期无效，请选择有效日期。';
  const created = taskCalendarDate(createdAt);
  if (created && end < created) return `截止时间不能早于创建日期（${created}）。`;
  const plannedStart = taskCalendarDate(start);
  if (plannedStart && end < plannedStart) return '截止时间不能早于计划开始日期。';
  return null;
}

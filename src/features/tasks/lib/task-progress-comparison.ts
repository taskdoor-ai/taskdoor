import {getTaskEffortInitialBaseline, type TaskWithEffortBaseline} from "./taskEffortBaseline";

export type ProgressWorkloadSnapshot = {
  at: string;
  scopeMinutes: number;
  completedMinutes: number;
  scopeVersion: string;
  note?: string;
};
/** Independent AI evidence; status changes and rollups must not overwrite it. */
export type ProgressAiAssessment = {
  observedAt: string;
  completedMinutes: number;
  scopeMinutes: number;
  scopeVersion: string;
  basis?: string;
};
export type ProgressForecastPoint = { at: string; completedMinutes: number; note: string };
export type ProgressScopeForecastPoint = { at: string; scopeMinutes: number; note: string };
export type ProgressForecastTrend = {
  asOf: string;
  scopeVersion: string;
  startMinutes: number;
  points: ProgressForecastPoint[];
  /** Predicted scope changes, never historical additions. Omitted means no change expected. */
  scopePoints?: ProgressScopeForecastPoint[];
};
/** Fixed demo records; amounts and versions are retained at the time of each observation. */
export type TaskProgressComparisonSeries = {
  source: "example";
  scenario: string;
  asOf: string;
  explanation: string;
  workload: ProgressWorkloadSnapshot[];
  /** Independent creation estimate; it says nothing about completed work. */
  creation?: {at: string; scopeMinutes: number};
  aiAssessment?: ProgressAiAssessment;
  forecastTrend?: ProgressForecastTrend;
  expected: { scopeVersion: string; points: { at: string; completedMinutes: number }[] };
  timing: {
    startOn: string;
    dueOn: string | null;
    forecastOn: string | null;
    completedOn?: string;
    scopeVersion: string;
    basis: string;
  };
};

const DAY = 86400000;
const dateValue = (value: unknown): number | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
};
const validMinutes = (n: number) => Number.isSafeInteger(n) && n >= 0;
const creationDay = (at?: string) => {
  if (typeof at !== "string" || !at || dateValue(at.slice(0,10)) === null) return null;
  if (dateValue(at) !== null) return at;
  return at.includes("T") && Number.isFinite(Date.parse(at))
    ? new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(at)) : null;
};
const numberAt = (points: {at: string; completedMinutes: number}[], at: string) => {
  const time = dateValue(at)!;
  const next = points.findIndex(p => dateValue(p.at)! >= time);
  if (next < 0 || time < dateValue(points[0].at)!) return null;
  if (next === 0) return points[0].completedMinutes;
  const left = points[next - 1], right = points[next];
  return left.completedMinutes + (right.completedMinutes - left.completedMinutes) * (time - dateValue(left.at)!) / (dateValue(right.at)! - dateValue(left.at)!);
};

export function getTaskProgressComparison(series?: TaskProgressComparisonSeries) {
  if (!series || series.source !== "example" || dateValue(series.asOf) === null || !Array.isArray(series.workload) || !series.workload.length) return null;
  const history = series.workload;
  if (history.some((p, i) => dateValue(p.at) === null || !validMinutes(p.scopeMinutes) || !validMinutes(p.completedMinutes)
    || p.completedMinutes > p.scopeMinutes || !p.scopeVersion
    || (i > 0 && (p.at <= history[i-1].at || (p.scopeMinutes !== history[i-1].scopeMinutes && p.scopeVersion === history[i-1].scopeVersion))))) return null;
  const latest = history.at(-1)!;
  if (latest.at !== series.asOf || latest.scopeMinutes <= 0) return null;
  const createdOn = creationDay(series.creation?.at);
  const creation = createdOn && createdOn <= history[0].at && series.creation && validMinutes(series.creation.scopeMinutes) && series.creation.scopeMinutes > 0
    ? {...series.creation,day:createdOn} : null;
  const points = series.expected?.points;
  const expectedValid = series.expected?.scopeVersion === latest.scopeVersion && Array.isArray(points) && points.length > 0
    && points.every((p, i) => dateValue(p.at) !== null && validMinutes(p.completedMinutes) && p.completedMinutes <= latest.scopeMinutes
      && (i === 0 || (p.at > points[i-1].at && p.completedMinutes >= points[i-1].completedMinutes)));
  const expectedMinutes = expectedValid ? numberAt(points, series.asOf) : null;
  const actualRatio = latest.completedMinutes / latest.scopeMinutes;
  const expectedRatio = expectedMinutes === null ? null : expectedMinutes / latest.scopeMinutes;
  const deltaMinutes = expectedMinutes === null ? null : latest.completedMinutes - expectedMinutes;
  const deltaPoints = expectedRatio === null ? null : Number(((actualRatio - expectedRatio) * 100).toFixed(1));
  const timing = series.timing;
  const startOn = dateValue(timing?.startOn) !== null ? timing.startOn : null;
  const dueOn = dateValue(timing?.dueOn) !== null ? timing.dueOn : null;
  const completedOn = latest.completedMinutes === latest.scopeMinutes && dateValue(timing?.completedOn) !== null
    && timing.completedOn! <= series.asOf && startOn && timing.completedOn! >= startOn ? timing.completedOn! : null;
  const forecastOn = !completedOn && actualRatio < 1 && timing?.scopeVersion === latest.scopeVersion
    && Boolean(timing.basis?.trim()) && dateValue(timing.forecastOn) !== null && timing.forecastOn! > series.asOf ? timing.forecastOn : null;
  const trend = series.forecastTrend;
  const trendMatches = trend?.asOf === series.asOf && trend.scopeVersion === latest.scopeVersion && trend.startMinutes === latest.completedMinutes;
  const scopeForecastValid = trend?.scopePoints === undefined || Boolean(forecastOn && trendMatches && Array.isArray(trend.scopePoints)
    && trend.scopePoints.every((point,i)=>dateValue(point.at)!==null && point.at>(i ? trend.scopePoints![i-1].at : series.asOf)
      && point.at<=forecastOn && validMinutes(point.scopeMinutes) && point.scopeMinutes>0
      && point.scopeMinutes>=latest.completedMinutes && Boolean(point.note?.trim())));
  const forecastScopePoints = scopeForecastValid ? trend?.scopePoints ?? [] : [];
  const scopeAt = (at:string) => forecastScopePoints.filter(point=>point.at<=at).at(-1)?.scopeMinutes ?? latest.scopeMinutes;
  const forecastPoints = forecastOn && trendMatches && scopeForecastValid && Array.isArray(trend.points) && trend.points.length > 0
    && trend.points.every((point, i) => dateValue(point.at) !== null && point.at > (i ? trend.points[i-1].at : series.asOf)
      && point.at <= forecastOn && validMinutes(point.completedMinutes) && point.completedMinutes <= scopeAt(point.at)
      && point.completedMinutes >= (i ? trend.points[i-1].completedMinutes : latest.completedMinutes) && Boolean(point.note?.trim()))
    && forecastScopePoints.every(point=>point.scopeMinutes >= (trend.points.filter(p=>p.at<=point.at).at(-1)?.completedMinutes ?? latest.completedMinutes))
    && trend.points.at(-1)!.at === forecastOn && trend.points.at(-1)!.completedMinutes === scopeAt(forecastOn)
    ? trend.points : [];
  const finishOn = completedOn ?? forecastOn;
  const deltaDays = dueOn && finishOn ? (dateValue(finishOn)! - dateValue(dueOn)!) / DAY : null;
  return {
    latest, creation, actualRatio, expectedRatio, expectedMinutes, deltaMinutes, deltaPoints,
    relation: deltaMinutes === null ? "unknown" as const : deltaMinutes > 0 ? "ahead" as const : deltaMinutes < 0 ? "behind" as const : "on-track" as const,
    netAddedMinutes: latest.scopeMinutes - history[0].scopeMinutes,
    history: history.map((point, i) => ({...point, addedMinutes: i === 0 ? 0 : point.scopeMinutes - history[i-1].scopeMinutes})),
    startOn, dueOn, forecastOn, completedOn, finishOn, deltaDays, forecastPoints, forecastScopePoints, scopeForecastValid,
    remainingDays: dueOn ? (dateValue(dueOn)! - dateValue(series.asOf)!) / DAY : null,
  };
}

export type TaskProgressComparisonModel = NonNullable<ReturnType<typeof getTaskProgressComparison>>;

/** History and authored forecast milestones remain separate; a finish date alone never generates a trend. */
export function getTaskProgressChart(model: TaskProgressComparisonModel, task?: TaskWithEffortBaseline, {projectScope=true, width:requestedWidth=320}: {projectScope?:boolean; width?:number}={}) {
  const differenceSpace = model.deltaDays !== null ? 24 : 0;
  const width = Number.isFinite(requestedWidth) && requestedWidth > 53 ? requestedWidth : 320;
  const height = 180 + differenceSpace, startX = 37, endX = width - 16, topY = 12 + differenceSpace, bottomY = 150 + differenceSpace;
  const asOf = model.latest.at;
  const saved = task ? getTaskEffortInitialBaseline(task) : undefined;
  const actualCreatedOn = creationDay(task?.createdAt);
  const createdOn = task ? actualCreatedOn : model.creation?.day ?? null;
  const fixtureCreation = !task || actualCreatedOn && actualCreatedOn === model.creation?.day ? model.creation : null;
  const initial = saved && (task?.effortBaseline || !fixtureCreation && saved.minutes === model.history[0].scopeMinutes)
    ? {at:saved.at,day:creationDay(saved.at),scopeMinutes:saved.minutes} : fixtureCreation;
  const baseline = initial?.day && initial.day <= model.history[0].at && (!createdOn || initial.day >= createdOn) ? initial : null;
  // Scope-only creation evidence must never manufacture a completed-work observation.
  const scopeHistory = model.history.map(point=>({...point,completedMinutes:point.completedMinutes as number | null,isCreation:false,observedAt:point.at}));
  if (baseline) {
    if (baseline.day === scopeHistory[0].at && baseline.scopeMinutes === scopeHistory[0].scopeMinutes) {
      scopeHistory[0]={...scopeHistory[0],isCreation:true,observedAt:baseline.at};
    } else {
      scopeHistory.unshift({at:baseline.day!,scopeMinutes:baseline.scopeMinutes,completedMinutes:null,scopeVersion:"creation",addedMinutes:0,isCreation:true,observedAt:baseline.at});
      scopeHistory[1]={...scopeHistory[1],addedMinutes:scopeHistory[1].scopeMinutes-baseline.scopeMinutes};
    }
  }
  const dates = [model.startOn,createdOn,scopeHistory[0].at, asOf, model.dueOn, model.finishOn].filter((d): d is string => Boolean(d)).sort();
  const start = dates[0], end = dates.at(-1)!;
  const span = dateValue(end)! - dateValue(start)!;
  const x = (at: string) => span === 0 ? (startX + endX) / 2 : startX + (dateValue(at)! - dateValue(start)!) / span * (endX - startX);
  const scopeForecastEnd = [model.dueOn,model.forecastOn].filter((at):at is string=>Boolean(at && at>asOf)).sort().at(-1);
  const scopeForecastEnabled = projectScope && !model.completedOn && model.scopeForecastValid && Boolean(scopeForecastEnd)
    && (!model.forecastScopePoints.length || Boolean(model.forecastOn));
  const futureScope = scopeForecastEnabled ? model.forecastScopePoints : [];
  const scopeAt = (at:string) => futureScope.filter(point=>point.at<=at).at(-1)?.scopeMinutes ?? model.latest.scopeMinutes;
  const largestDays = Math.max(...scopeHistory.map(p => p.scopeMinutes),...futureScope.map(p=>p.scopeMinutes)) / 480;
  const power = 10 ** Math.floor(Math.log10(largestDays));
  const maxDays = Math.ceil(largestDays / power) * power;
  const y = (minutes: number) => bottomY - minutes / (maxDays * 480) * (bottomY - topY);
  const round = (n: number) => Number(n.toFixed(3));
  const path = (points: {at:string;minutes:number}[]) => points.map((p, i) => i === 0
    ? `M ${round(x(p.at))} ${round(y(p.minutes))}` : `H ${round(x(p.at))} V ${round(y(p.minutes))}`).join(" ");
  const rows = model.history.map(p => ({...p, x:x(p.at), scopeY:y(p.scopeMinutes), completedY:y(p.completedMinutes)}));
  const scopeRows = scopeHistory.map(p=>({...p,x:x(p.at),scopeY:y(p.scopeMinutes)}));
  // When the two amounts coincide, preserve both colours at the same coordinates.
  const scopeOverlapPath = rows.slice(1).flatMap((row, i) => {
    const previous=rows[i];
    return previous.scopeMinutes === previous.completedMinutes
      ? [`M ${round(previous.x)} ${round(previous.scopeY)} H ${round(row.x)}${row.scopeMinutes === row.completedMinutes ? ` V ${round(row.scopeY)}` : ""}`] : [];
  }).join(" ");
  const forecastRows = model.forecastOn && model.forecastPoints.at(-1)?.at === model.forecastOn
    ? model.forecastPoints.map(p => ({...p, scopeMinutes:scopeAt(p.at), x:x(p.at), y:y(p.completedMinutes)})) : [];
  const forecastPath = forecastRows.length ? `M ${round(x(asOf))} ${round(y(model.latest.completedMinutes))} `
    + forecastRows.map(p => `H ${round(p.x)} V ${round(p.y)}`).join(" ") : "";
  const scopeForecastDates = scopeForecastEnabled ? [...new Set([asOf,...futureScope.map(p=>p.at),
    ...[model.dueOn,model.forecastOn].filter((at):at is string=>Boolean(at && at>asOf)),scopeForecastEnd!])].sort() : [];
  const scopeForecastRows = scopeForecastDates.map(at=>({at,scopeMinutes:scopeAt(at),x:x(at),scopeY:y(scopeAt(at)),
    note:futureScope.filter(point=>point.at<=at).at(-1)?.note ?? "暂无预计新增工作，按当前总量延续"}));
  const scopeForecastPath = path(scopeForecastRows.map(p=>({at:p.at,minutes:p.scopeMinutes})));
  const finishScopeMinutes = model.forecastOn ? scopeAt(model.forecastOn) : model.latest.scopeMinutes;
  return {width, height, startX, endX, topY, bottomY, maxDays, start, end, rows, scopeRows, createdOn, createdX:createdOn ? x(createdOn) : null,
    asOfX:x(asOf), dueX:model.dueOn && model.dueOn >= start && model.dueOn <= end ? x(model.dueOn) : null,
    finishX:model.finishOn ? x(model.finishOn) : null,
    forecastX:model.forecastOn ? x(model.forecastOn) : null, finishY:y(finishScopeMinutes), finishScopeMinutes,
    scopePath:path(scopeHistory.map(p=>({at:p.at,minutes:p.scopeMinutes}))), scopeOverlapPath,
    completedPath:path(model.history.map(p=>({at:p.at,minutes:p.completedMinutes}))), forecastRows, forecastPath, scopeForecastRows, scopeForecastPath};
}

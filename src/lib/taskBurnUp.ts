/** EWD 快照；工时只汇总当前范围中的叶子，不包含父任务重复值。 */
export type TaskBurnUpPoint = {
  /** ISO 日期，或含 Z / 时区偏移的 ISO 时间戳。 */
  at: string;
  /** 覆盖不完整时仅表示已估子集；null 表示数值未知，不是零。 */
  scopeHours: number | null;
  completedHours: number | null;
  /** 当前范围中已确认 EWD 估算的叶子数，不能当作工时覆盖率。 */
  estimatedLeafCount: number;
  totalLeafCount: number;
  note?: string;
};

export type TaskBurnUpSeries = {
  source: "recorded" | "example";
  points: TaskBurnUpPoint[];
};

export type TaskBurnUpPlotPoint = TaskBurnUpPoint & {
  timestamp: number;
  x: number;
  scopeY: number | null;
  completedY: number | null;
};

export type TaskBurnUpModel = {
  state: "empty" | "single" | "partial" | "ready" | "invalid";
  source: TaskBurnUpSeries["source"] | null;
  points: TaskBurnUpPlotPoint[];
  scopePath: string;
  completedPath: string;
  width: number;
  height: number;
  maxHours: number;
  startAt: string | null;
  endAt: string | null;
  latest: TaskBurnUpPoint | null;
  coverage: { estimatedLeafCount: number; totalLeafCount: number; isComplete: boolean } | null;
  progressRatio: number | null;
  issue: string | null;
};

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 56;

const isFiniteNonNegative = (value: unknown): value is number => typeof value === "number"
  && Number.isFinite(value) && value >= 0;
const isHourValue = (value: unknown): value is number | null => value === null || isFiniteNonNegative(value);
const isLeafCount = (value: unknown): value is number => isFiniteNonNegative(value) && Number.isSafeInteger(value);
const isDimension = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

/** 日期按 UTC 零点理解；时间戳必须带时区，拒绝 Date.parse 自动滚入下月的非法日期。 */
function parseTimestamp(at: unknown): number | null {
  if (typeof at !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/.exec(at);
  if (!match) return null;
  const dateTimestamp = Date.parse(`${match[1]}T00:00:00.000Z`);
  if (!Number.isFinite(dateTimestamp) || new Date(dateTimestamp).toISOString().slice(0, 10) !== match[1]) return null;
  if (match[2] !== undefined && (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59)) return null;
  const timestamp = Date.parse(at);
  return Number.isFinite(timestamp) ? timestamp : null;
}

const coordinate = (value: number) => Number(value.toFixed(3)).toString();

/** 未知值只打断自己的线；孤立点交给 UI 画圆点，不输出伪造的水平历史。 */
function stepPath(points: TaskBurnUpPlotPoint[], key: "scopeY" | "completedY"): string {
  const paths: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length > 1) paths.push(run.join(" "));
    run = [];
  };
  for (const point of points) {
    const y = point[key];
    if (y === null) {
      flush();
      continue;
    }
    run.push(run.length === 0
      ? `M ${coordinate(point.x)} ${coordinate(y)}`
      : `H ${coordinate(point.x)} V ${coordinate(y)}`);
  }
  flush();
  return paths.join(" ");
}

/**
 * 只投影传入的历史快照，不从 Task 状态、今天的估算或任务数反推历史。
 * 先校验全部记录，再按时间排序；同一真实时刻由输入中最后一条记录替代。
 * 数值缺失不是 0；非法记录使整条序列失效，不能过滤后冒充完整历史。
 * state 的优先级为 invalid > empty > single > partial > ready；单点仍需结合 coverage 判断缺估。
 */
export function getTaskBurnUpModel(
  series?: TaskBurnUpSeries,
  options: { width?: number; height?: number; includeDates?: string[] } = {},
): TaskBurnUpModel {
  const requestedWidth = options.width ?? DEFAULT_WIDTH;
  const requestedHeight = options.height ?? DEFAULT_HEIGHT;
  const width = isDimension(requestedWidth) ? requestedWidth : DEFAULT_WIDTH;
  const height = isDimension(requestedHeight) ? requestedHeight : DEFAULT_HEIGHT;
  const source = series?.source === "recorded" || series?.source === "example" ? series.source : null;
  const empty: TaskBurnUpModel = {
    state: "empty",
    source,
    points: [],
    scopePath: "",
    completedPath: "",
    width,
    height,
    maxHours: 1,
    startAt: null,
    endAt: null,
    latest: null,
    coverage: null,
    progressRatio: null,
    issue: null,
  };
  const invalid = (issue: string): TaskBurnUpModel => ({ ...empty, state: "invalid", issue });
  if (!isDimension(requestedWidth) || !isDimension(requestedHeight)) return invalid("趋势画布尺寸无效");
  if (series === undefined) return empty;
  if (!source || !series || !Array.isArray(series.points)) return invalid("趋势来源或历史记录格式无效");
  if (series.points.length === 0) return empty;

  const byTimestamp = new Map<number, TaskBurnUpPoint>();
  for (const [index, point] of series.points.entries()) {
    if (!point || typeof point !== "object") return invalid(`第 ${index + 1} 条趋势记录格式无效`);
    const timestamp = parseTimestamp(point.at);
    if (timestamp === null) return invalid(`第 ${index + 1} 条趋势记录日期无效`);
    if (!isHourValue(point.scopeHours) || !isHourValue(point.completedHours)) return invalid(`第 ${index + 1} 条趋势记录工时无效`);
    if (point.scopeHours !== null && point.completedHours !== null && point.completedHours > point.scopeHours) {
      return invalid(`第 ${index + 1} 条趋势记录已验收工时超过范围`);
    }
    if (!isLeafCount(point.estimatedLeafCount) || !isLeafCount(point.totalLeafCount) || point.estimatedLeafCount > point.totalLeafCount) {
      return invalid(`第 ${index + 1} 条趋势记录估算覆盖无效`);
    }
    if (point.totalLeafCount === 0 && ((point.scopeHours ?? 0) > 0 || (point.completedHours ?? 0) > 0)) {
      return invalid(`第 ${index + 1} 条趋势记录空范围仍有工时`);
    }
    if (point.note !== undefined && typeof point.note !== "string") return invalid(`第 ${index + 1} 条趋势记录说明无效`);
    byTimestamp.set(timestamp, {
      at: point.at,
      scopeHours: point.scopeHours,
      completedHours: point.completedHours,
      estimatedLeafCount: point.estimatedLeafCount,
      totalLeafCount: point.totalLeafCount,
      ...(point.note === undefined ? {} : { note: point.note }),
    });
  }

  const snapshots = [...byTimestamp.entries()].sort(([left], [right]) => left - right);
  const [startTimestamp, first] = snapshots[0];
  const [endTimestamp, last] = snapshots[snapshots.length - 1];
  // Reference dates extend the plot domain, never the saved workload history.
  const referenceTimes = (options.includeDates ?? []).map(parseTimestamp).filter((at): at is number => at !== null);
  const plotStart = Math.min(startTimestamp, ...referenceTimes);
  const plotEnd = Math.max(endTimestamp, ...referenceTimes);
  const largestValue = snapshots.reduce((largest, [, point]) => Math.max(largest, point.scopeHours ?? 0, point.completedHours ?? 0), 0);
  const maxHours = largestValue > 0 ? largestValue : 1;
  const paddingX = Math.min(4, width / 2);
  const paddingY = Math.min(4, height / 2);
  const toY = (value: number | null) => value === null ? null : paddingY + (1 - value / maxHours) * (height - 2 * paddingY);
  const points: TaskBurnUpPlotPoint[] = snapshots.map(([timestamp, point]) => ({
    ...point,
    timestamp,
    x: plotStart === plotEnd
      ? width / 2
      : paddingX + (timestamp - plotStart) / (plotEnd - plotStart) * (width - 2 * paddingX),
    scopeY: toY(point.scopeHours),
    completedY: toY(point.completedHours),
  }));
  const latest = { ...last };
  const coverage = {
    estimatedLeafCount: latest.estimatedLeafCount,
    totalLeafCount: latest.totalLeafCount,
    isComplete: latest.estimatedLeafCount === latest.totalLeafCount,
  };
  const partial = points.some((point) => point.scopeHours === null || point.completedHours === null
    || point.estimatedLeafCount !== point.totalLeafCount);
  return {
    ...empty,
    state: points.length === 1 ? "single" : partial ? "partial" : "ready",
    points,
    scopePath: stepPath(points, "scopeY"),
    completedPath: stepPath(points, "completedY"),
    maxHours,
    startAt: first.at,
    endAt: last.at,
    latest,
    coverage,
    progressRatio: coverage.isComplete && latest.scopeHours !== null && latest.scopeHours > 0 && latest.completedHours !== null
      ? latest.completedHours / latest.scopeHours
      : null,
  };
}

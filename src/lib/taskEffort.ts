import { z } from "zod";

const minuteSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();

/** Product display convention only; it does not describe a person's daily availability. */
export const MINUTES_PER_PERSON_DAY = 480;

export function formatPersonDays(days: number | null): string {
  if (days === null) return "待估算";
  if (!Number.isFinite(days) || days < 0) throw new Error("人天必须是有效的非负数。");
  const amount = days > 0 && days < .01 ? "<0.01" : days.toLocaleString("zh-CN", { maximumFractionDigits: 2, useGrouping: false });
  return `${amount} 人天`;
}

export function formatEffortPersonDays(minutes: number | null): string {
  if (!minuteSchema.safeParse(minutes).success) throw new Error("工时必须是非负整数分钟，或留空表示未知。");
  return formatPersonDays(minutes === null ? null : minutes / MINUTES_PER_PERSON_DAY);
}

/** Expected total human input under the stated AI/tool method; excludes waiting and unattended runs. */
export const effortEstimateSchema = z.object({
  minutes: minuteSchema,
  workMethod: z.string(),
  basis: z.enum(["manual", "mock", "model", "unknown"]),
  reason: z.string(),
  confirmed: z.boolean(),
  scopeKey: z.string(),
  version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export type TaskEffortEstimate = z.infer<typeof effortEstimateSchema>;
export type TaskEffortScope = { goal?: string; completionCriteria?: string[]; executionTips?: string[] };
export type TaskEffortTask = TaskEffortScope & { effortEstimate?: TaskEffortEstimate };
export type TaskEffortState = "unknown" | "proposed" | "confirmed" | "stale";
export type TaskEffortSummary = {
  taskCount: number;
  estimatedCount: number;
  confirmedCount: number;
  unknownCount: number;
  staleCount: number;
  knownMinutes: number;
  confirmedMinutes: number;
  totalMinutes: number | null;
};

const normalizeText = (value = "") => value.trim().replace(/\s+/gu, " ");
const normalizeItems = (values: string[] = []) => values.map(normalizeText).filter(Boolean);

/** A content signature, not a security token. Names, people, tags and dates are deliberately excluded. */
export function getEffortScopeKey(scope: TaskEffortScope, workMethod: string): string {
  return JSON.stringify({
    goal: normalizeText(scope.goal),
    completionCriteria: normalizeItems(scope.completionCriteria),
    executionTips: normalizeItems(scope.executionTips),
    workMethod: normalizeText(workMethod),
  });
}

export function getTaskEffortState(task: TaskEffortTask): TaskEffortState {
  const parsed = effortEstimateSchema.safeParse(task.effortEstimate);
  if (!parsed.success) return "unknown";
  const estimate = parsed.data;
  if (estimate.minutes === null || estimate.basis === "unknown"
    || !estimate.workMethod.trim() || !estimate.reason.trim() || !estimate.scopeKey.trim()) return "unknown";
  if (estimate.scopeKey !== getEffortScopeKey(task, estimate.workMethod)) return "stale";
  return estimate.confirmed ? "confirmed" : "proposed";
}

/** The caller supplies only the relevant leaves. This helper does not infer a tree or count parents twice. */
export function summarizeTaskEffort(tasks: readonly TaskEffortTask[]): TaskEffortSummary {
  const summary: TaskEffortSummary = {
    taskCount: tasks.length, estimatedCount: 0, confirmedCount: 0, unknownCount: 0, staleCount: 0,
    knownMinutes: 0, confirmedMinutes: 0, totalMinutes: null,
  };
  for (const task of tasks) {
    const state = getTaskEffortState(task);
    if (state === "unknown") { summary.unknownCount += 1; continue; }
    if (state === "stale") { summary.staleCount += 1; continue; }
    const minutes = task.effortEstimate!.minutes!;
    if (!Number.isSafeInteger(summary.knownMinutes + minutes)) throw new Error("工时合计超出可安全计算的分钟范围，请核对估算。");
    summary.estimatedCount += 1;
    summary.knownMinutes += minutes;
    if (state === "confirmed") {
      summary.confirmedCount += 1;
      summary.confirmedMinutes += minutes;
    }
  }
  if (tasks.length > 0 && summary.estimatedCount === tasks.length) summary.totalMinutes = summary.knownMinutes;
  return summary;
}

export function formatEffortMinutes(minutes: number | null): string {
  if (!minuteSchema.safeParse(minutes).success) throw new Error("工时必须是非负整数分钟，或留空表示未知。");
  if (minutes === null) return "待估算";
  if (minutes % 3 === 0) {
    const hundredths = BigInt(minutes) * 100n / 60n;
    const fraction = String(hundredths % 100n).padStart(2, "0").replace(/0+$/u, "");
    return `${hundredths / 100n}${fraction ? `.${fraction}` : ""} h`;
  }
  const hours = BigInt(minutes) / 60n;
  return `${hours ? `${hours} h ` : ""}${minutes % 60} min`;
}

/** Decimal arithmetic avoids silently rounding fractional minutes or binary floating-point noise. */
export function parseEffortHours(input: string): number | null {
  return parseEffortAmount(input, 60, "小时");
}

export function parseEffortPersonDays(input: string): number | null {
  return parseEffortAmount(input, MINUTES_PER_PERSON_DAY, "人天");
}

function parseEffortAmount(input: string, minutesPerUnit: number, unit: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (value.length > 128 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value)) throw new Error(`请填写非负${unit}数，或留空表示工时未知。`);
  const [whole, fraction = ""] = value.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(`${whole || "0"}${fraction}`) * BigInt(minutesPerUnit);
  if (numerator % denominator !== 0n) throw new Error(`工时须能精确换算为整数分钟，请调整${unit}数，不会自动四舍五入。`);
  const minutes = numerator / denominator;
  if (minutes > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("工时超出可安全保存的分钟范围。");
  return Number(minutes);
}

export function createManualEffortEstimate(
  scope: TaskEffortScope,
  input: { minutes: number | null; workMethod: string; reason: string },
  previous?: TaskEffortEstimate,
): TaskEffortEstimate {
  if (!minuteSchema.safeParse(input.minutes).success) throw new Error("工时必须是非负整数分钟，或留空表示未知。");
  const workMethod = normalizeText(input.workMethod);
  const reason = normalizeText(input.reason);
  if (input.minutes !== null && !workMethod) throw new Error("请补充约定的 AI／工具工作方式，再确认人类投入工时。");
  if (input.minutes !== null && !reason) throw new Error("请补充工时估算依据，再确认人类投入工时。");
  const previousVersion = previous?.version ?? 0;
  if (!Number.isSafeInteger(previousVersion) || previousVersion < 0 || previousVersion >= Number.MAX_SAFE_INTEGER) throw new Error("估算版本无效或已超出可保存范围，请核对原记录。");
  return {
    minutes: input.minutes, workMethod, reason,
    basis: input.minutes === null ? "unknown" : "manual",
    confirmed: input.minutes !== null,
    scopeKey: getEffortScopeKey(scope, workMethod),
    version: previousVersion + 1,
  };
}

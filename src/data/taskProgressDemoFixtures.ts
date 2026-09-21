import records from "./taskProgressDemoRecords.json";
import type { TaskNode, WorkspaceNode } from "./workspaceNodes";
import type { TaskProgressComparisonSeries } from "../lib/taskProgressComparison";

type FixtureFields = Pick<TaskNode, "plannedStartOn" | "plannedEndOn" | "dueAt" | "status" | "completedAt" | "updatedAt">;
type FixtureRevision = { before: Partial<FixtureFields>; after: Partial<FixtureFields>; group: string };

// A fixed business snapshot, not today's clock and not a production AI result.
export const progressDemoObservedAt = "2026-09-14T17:30:00+08:00";
const weeklyDates = { plannedStartOn: "2026-09-11", plannedEndOn: "2026-09-15", dueAt: "9 月 15 日", updatedAt: progressDemoObservedAt };
export const progressDemoRevisions: Record<string, FixtureRevision> = {
  "weekly-retro-notes": {
    group: "weekly-retro",
    before: { plannedStartOn: "2026-08-29", plannedEndOn: "2026-09-01", dueAt: "9 月 1 日", status: "进行中" },
    after: { ...weeklyDates, status: "进行中" },
  },
  "weekly-retro-decisions": {
    group: "weekly-retro",
    before: { plannedStartOn: "2026-08-29", plannedEndOn: "2026-08-31", dueAt: "8 月 31 日", status: "已完成" },
    after: { ...weeklyDates, plannedEndOn: "2026-09-14", dueAt: "9 月 14 日", status: "已完成", completedAt: "2026-09-14T12:00:00+08:00", updatedAt: "2026-09-14T12:00:00+08:00" },
  },
  "weekly-retro-open-issues": {
    group: "weekly-retro",
    before: { plannedStartOn: "2026-08-29", plannedEndOn: "2026-09-01", dueAt: "9 月 1 日", status: "进行中" },
    after: { ...weeklyDates, status: "进行中" },
  },
  "weekly-retro-actions": {
    group: "weekly-retro",
    before: { plannedStartOn: "2026-08-31", plannedEndOn: "2026-09-01", dueAt: "9 月 1 日", status: "待开始" },
    // Drafts already exist while the user's status remains waiting.
    after: { ...weeklyDates, plannedStartOn: "2026-09-14", status: "待开始" },
  },
  ...Object.fromEntries([
    ["unassigned-creator-sample-tracking", "2026-09-03", "2026-09-05", "9 月 5 日", "2026-09-16", "2026-09-18", "9 月 18 日"],
    ["unassigned-short-video-covers", "2026-09-04", "2026-09-07", "9 月 7 日", "2026-09-15", "2026-09-17", "9 月 17 日"],
    ["unassigned-live-backup-plan", "2026-09-03", "2026-09-06", "9 月 6 日", "2026-09-15", "2026-09-16", "9 月 16 日"],
    ["unassigned-gift-stock-check", "2026-09-05", "2026-09-08", "9 月 8 日", "2026-09-16", "2026-09-17", "9 月 17 日"],
  ].map(([id, start, end, dueAt, nextStart, nextEnd, nextDue]) => [id, {
    group: id,
    before: { plannedStartOn: start, plannedEndOn: end, dueAt, status: "待开始" as const },
    after: { plannedStartOn: nextStart, plannedEndOn: nextEnd, dueAt: nextDue, status: "待开始" as const },
  }])),
};

export function applyProgressDemoFixture<T extends { id: string }>(task: T): T {
  return { ...task, ...progressDemoRevisions[task.id]?.after,
    ...(!(task as Partial<TaskNode>).createdAt && getProgressDemoCreatedAt(task.id) ? {createdAt:getProgressDemoCreatedAt(task.id)} : {}),
  };
}

const scopeVersion = "weekly-retro-scope-v1";
// Explicit mock creation events; independent from the editable schedule.
const weeklyCreatedAt: Record<string,string> = {
  "weekly-retro-notes":"2026-08-29T10:00:00+08:00",
  "weekly-retro-decisions":"2026-08-29T10:10:00+08:00",
  "weekly-retro-open-issues":"2026-08-29T10:15:00+08:00",
  "weekly-retro-actions":"2026-08-31T09:00:00+08:00",
};
export function getProgressDemoCreatedAt(taskId:string): string | undefined {
  return Object.hasOwn(weeklyCreatedAt,taskId) ? weeklyCreatedAt[taskId] : undefined;
}
const weeklySeries = (id: string, scopeMinutes: number, observations: [string, number, string][], basis: string, timingBasis: string, aiMinutes?: number): TaskProgressComparisonSeries => {
  const dates = progressDemoRevisions[id].after;
  const last = observations.at(-1)!;
  return {
    source: "example", scenario: "复盘纪要成员核对", asOf: last[0], explanation: basis,
    creation:{at:weeklyCreatedAt[id],scopeMinutes},
    workload: observations.map(([at, completedMinutes, note]) => ({ at, scopeMinutes, completedMinutes, scopeVersion, note })),
    aiAssessment: { observedAt: aiMinutes === undefined ? progressDemoObservedAt : "2026-09-14T11:30:00+08:00", scopeMinutes, completedMinutes: aiMinutes ?? last[1], scopeVersion, basis },
    expected: { scopeVersion, points: [] },
    ...(!dates.completedAt ? {forecastTrend:{asOf:last[0],scopeVersion,startMinutes:last[1],points:[{at:"2026-09-15",completedMinutes:scopeMinutes,note:`演示交付节点：${timingBasis}`} ]}} : {}),
    timing: { startOn: dates.plannedStartOn!, dueOn: dates.plannedEndOn!, forecastOn: dates.completedAt ? null : "2026-09-15", ...(dates.completedAt ? { completedOn: "2026-09-14" } : {}), scopeVersion, basis: timingBasis },
  };
};
const weeklyExamples: Record<string, TaskProgressComparisonSeries> = {
  "weekly-retro-notes": weeklySeries("weekly-retro-notes", 420, [
    ["2026-09-11", 90, "周五复盘后已整理决定初稿与问题摘要；行动项尚未整理。"],
    ["2026-09-14", 315, "决定部分确认 120 分钟；问题部分预测 135 分钟；行动项预测 60 分钟，按工作量汇总为 75%。"],
  ], "决定清单已核对；问题 Q07 的确认人仍有分歧；6 条行动已有草稿，3 条责任与期限已确认。", "剩余问题核对约 45 分钟、行动确认与修订约 60 分钟。林洁和周岚在 9/15 上午完成核对后合并共享。"),
  "weekly-retro-decisions": weeklySeries("weekly-retro-decisions", 120, [
    ["2026-09-11", 60, "决定初稿已归类，原始依据尚未逐条关联。"],
    ["2026-09-14", 120, "12:00 陈默核对决定及原始依据后确认完成。"],
  ], "11:30 决定清单与依据链接已补齐，剩最后一次交叉核对；当时 AI 预测 95%。", "陈默于 9/14 12:00 确认完成；保留确认前 11:30 的 AI 预测。", 114),
  "weekly-retro-open-issues": weeklySeries("weekly-retro-open-issues", 180, [
    ["2026-09-11", 30, "从会议记录提取问题摘要，责任边界待核对。"],
    ["2026-09-14", 135, "4 项问题已整理影响范围；Q07 确认人仍不一致，需林洁与周岚核对。"],
  ], "问题清单和影响范围已整理，Q07 的两份记录使用了不同确认人，剩余责任边界与下一次核对时间待确认。", "剩余核对与修订约 45 分钟；林洁与周岚已约 9/15 10:00 核对 Q07，预计当天完成。"),
  "weekly-retro-actions": weeklySeries("weekly-retro-actions", 120, [
    ["2026-09-14", 60, "6 条行动项已有草稿，3 条已确认责任和期限；A03 的交付日期仍需统一。"],
  ], "行动项草稿已成形；3 条责任和期限已确认，另 3 条仍待回复，A03 的两份记录日期不一致。", "剩余确认与修订约 60 分钟；相关成员将在 9/15 上午回复，周岚随后合并纪要。"),
};

export function getWeeklyRetroProgressDemo(taskId: string) {
  const series = Object.hasOwn(weeklyExamples, taskId) ? weeklyExamples[taskId] : undefined;
  return series ? structuredClone(series) : undefined;
}

/** Author missing mock creation metadata from the earliest date in its fixed seed narrative.
 * This runs only when assembling built-ins, never against an edited live schedule.
 */
export function withProgressDemoCreation(task: TaskNode, nodes: readonly WorkspaceNode[]): TaskNode {
  if (task.createdAt) return task;
  const fixedRecords = records as Record<string, { observedAt: string; history?: {at:string}[]; creation?: {at:string} }>;
  if (fixedRecords[task.id]?.creation) return {...task, createdAt:fixedRecords[task.id].creation!.at};
  const narrative = [task];
  const visited = new Set<string>();
  const dates: string[] = [];
  for (const current of narrative) {
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    const record = fixedRecords[current.id];
    for (const value of [current.createdAt, current.plannedStartOn, current.plannedEndOn, current.dueAt, current.completedAt,
      progressDemoRevisions[current.id]?.before.plannedStartOn,
      record?.creation?.at, record?.observedAt, ...(record?.history?.map(point => point.at) ?? [])]) {
      if (!value) continue;
      const label = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
      const day = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0,10)
        : label ? `2026-${label[1].padStart(2,"0")}-${label[2].padStart(2,"0")}` : null;
      if (day) dates.push(day);
    }
    // A parent existed by its children's first authored event, even if its plan starts later.
    narrative.push(...nodes.filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === current.id));
  }
  dates.sort();
  return dates.length ? {...task, createdAt:`${dates[0]}T00:00:00+08:00`} : task;
}

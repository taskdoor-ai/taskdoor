import { allTeamWorkspaceNodes } from "./teamWorkspaceScenarios";
import type { WorkspaceNode } from "./workspaceNodes";
import { progressDate } from "../lib/taskProgressDisplay";
import { getWeeklyRetroProgressDemo } from "./taskProgressDemoFixtures";
import records from "./taskProgressDemoRecords.json";
import { rollupProgressHistory, rollupProgressForecast } from "./taskProgressHistory";
import type { TaskProgressComparisonSeries, ProgressForecastPoint, ProgressScopeForecastPoint, ProgressWorkloadSnapshot } from "../lib/taskProgressComparison";

// Capture fixture dates once. Live deadline edits never rebase an old AI prediction.
const fixtureDate = (value?: string) => {
  if (!value) return null;
  const iso = progressDate(value);
  if (iso) return iso;
  const match = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
  if (match) return progressDate(`2026-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`);
  return value.includes("今天") ? "2026-09-14" : null;
};
type DemoRecord = { scopeMinutes:number; completedMinutes:number; observedAt:string; kind:string; basis:string; forecastOn?:string; timingBasis?:string; forecastPoints?:ProgressForecastPoint[]; forecastScopePoints?:ProgressScopeForecastPoint[]; history?:ProgressWorkloadSnapshot[]; creation?:TaskProgressComparisonSeries["creation"] };

const demoRecords: Readonly<Record<string, DemoRecord>> = records;

/** Build immutable examples from this task tree; every parent uses its actual children. */
export function buildTaskProgressDemoExamples(nodes: readonly WorkspaceNode[], fixedRecords: Readonly<Record<string, DemoRecord>> = demoRecords) {
const initialDates = new Map(nodes.filter(task=>task.kind === "task").map(task=>[task.id,{
  startOn:fixtureDate(task.plannedStartOn) ?? "",
  dueOn:fixtureDate(task.plannedEndOn ?? task.dueAt),
}]));

const taskNodes = nodes.filter(task => task.kind === "task");
const examples = new Map<string, TaskProgressComparisonSeries>();

function buildExample(taskId:string, visiting=new Set<string>()): TaskProgressComparisonSeries | undefined {
  if (examples.has(taskId)) return examples.get(taskId);
  if (visiting.has(taskId)) return undefined;
  visiting.add(taskId);
  const task=taskNodes.find(node=>node.id===taskId);
  const children=taskNodes.filter(task=>task.parentTaskId === taskId);
  let series = children.length ? undefined : getWeeklyRetroProgressDemo(taskId);
  const dates=initialDates.get(taskId);
  const record=Object.hasOwn(fixedRecords,taskId) ? fixedRecords[taskId] : undefined;
  if (!children.length && !series && record && dates) {
    const asOf=progressDate(record.observedAt)!;
    const scopeVersion=`demo-${taskId}-v1`;
    const history=record.history ?? [];
    series={source:"example",scenario:"任务交付核对",asOf,explanation:record.basis,
      creation:record.creation ?? (task?.createdAt ? {at:task.createdAt,scopeMinutes:history[0]?.scopeMinutes ?? record.scopeMinutes} : undefined),
      workload:[...history,{at:asOf,scopeMinutes:record.scopeMinutes,completedMinutes:record.completedMinutes,scopeVersion,note:record.basis}],
      ...(record.kind === "prediction" ? {aiAssessment:{observedAt:record.observedAt,scopeMinutes:record.scopeMinutes,completedMinutes:record.completedMinutes,scopeVersion,basis:record.basis}}
        : {}),
      expected:{scopeVersion,points:[]},
      ...(record.forecastPoints ? {forecastTrend:{asOf,scopeVersion,startMinutes:record.completedMinutes,points:record.forecastPoints,scopePoints:record.forecastScopePoints}} : {}),
      timing:{...dates,forecastOn:record.forecastOn ?? null,scopeVersion,basis:record.timingBasis ?? "当前仅有完成度核对，未记录剩余工作的完成时间。"},
    };
  }
  if (!series && children.length && dates) {
    const childSeries=children.map(task=>buildExample(task.id,new Set(visiting)));
    if (childSeries.every((child):child is TaskProgressComparisonSeries=>Boolean(child))) {
      const asOf=childSeries.map(child=>child.asOf).sort().at(-1)!;
      const remaining=childSeries.filter((child,index)=>children[index].status !== "已完成");
      const forecastOn=remaining.length && remaining.every(child=>child.timing.forecastOn)
        ? remaining.map(child=>child.timing.forecastOn!).sort().at(-1)! : null;
      const workload=rollupProgressHistory(childSeries,`demo-${taskId}-rollup`);
      const scopeVersion=workload.at(-1)!.scopeVersion;
      const basis="按各子任务同一观测日的工作量汇总，包含 AI 预测与用户确认；不新增一条独立 AI 评估。";
      const childCreations=childSeries.map(child=>child.creation);
      const creation=task?.createdAt && childCreations.every((item):item is NonNullable<typeof item>=>Boolean(item))
        ? {at:task.createdAt,scopeMinutes:childCreations.reduce((sum,item)=>sum+item.scopeMinutes,0)} : undefined;
      series={source:"example",scenario:"子任务汇总",asOf,explanation:basis,
        creation,workload,expected:{scopeVersion,points:[]},
        forecastTrend:rollupProgressForecast(childSeries,workload.at(-1)!),
        timing:{...dates,forecastOn,scopeVersion,basis:forecastOn ? "所有未完成子任务均有时间预测，取最晚完成日作为当前汇总预测。" : "部分子任务未记录完工预测，暂不推算父任务完成日。"}};
    }
  }
  if (series) examples.set(taskId,series);
  return series;
}
// Build immutable fixture projections once. Live edits never rebase an old AI result.
taskNodes.forEach(task=>buildExample(task.id));
return examples;
}

const examples = buildTaskProgressDemoExamples(allTeamWorkspaceNodes);

/** Fixed Demo evidence is separate from the PRD's exhaustive state examples. */
export function getTaskProgressDemoExample(taskId:string, saved?:TaskProgressComparisonSeries) {
  const fixture=examples.get(taskId);
  // Existing local predictions may predate creation metadata. Preserve their observations.
  const series=saved ? {...saved,creation:saved.creation ?? fixture?.creation} : fixture;
  return series ? structuredClone(series) : undefined;
}

export function getTaskProgressDemoEvidence(taskId:string) {
  const record=Object.hasOwn(demoRecords,taskId) ? demoRecords[taskId] : undefined;
  return record ? {...record} : undefined;
}

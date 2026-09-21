import type { TaskNode, WorkspaceNode } from "./workspaceNodes";
import type { TaskDetailMock } from "./taskDetailMocks";
import { getEffortScopeKey, type TaskEffortEstimate } from "../lib/taskEffort";
import type { TaskProgressComparisonSeries } from "../lib/taskProgressComparison";
import { rollupProgressHistory, rollupProgressForecast } from "./taskProgressHistory";
import { getTaskDefinitionGoal } from "../lib/taskGoal";

const title = "新品防晒衣抖音达人带货项目";
const goal = "统筹新品防晒衣抖音达人带货项目，以 9 月 15 日上线和 GMV 50 万为目标，协调达人、内容、直播、商品、投流、数据和合规交付。";
const asOf = "2026-09-14";
const dueOn = "2026-09-15";
const observedAt = `${asOf}T17:30:00+08:00`;

// Authored execution snapshots for the existing creation Demo, not a status-to-progress rule.
const deliveries = [
  { name: "筛选达人并确认商务合作", minutes: 360, ratio: .75, forecastOn: dueOn, basis: "12 位候选达人已完成筛选，9 位确认佣金与档期；另 3 位待回复，9/15 上午收口合作清单。" },
  { name: "完成卖点、脚本与直播素材", minutes: 480, ratio: .65, forecastOn: dueOn, basis: "卖点清单和 4 条脚本初稿已齐，2 条素材通过内部核对；剩余素材补拍及敏感表达修改约在 9/15 上午完成。" },
  { name: "完成直播彩排与上线执行", minutes: 600, ratio: .30, forecastOn: dueOn, basis: "直播流程与场控分工已出稿，完成设备联调；尚待正式彩排和 9/15 上线执行，不能把准备完成视为直播已完成。" },
  { name: "确认价格机制、库存与履约", minutes: 240, ratio: .80, forecastOn: dueOn, basis: "价格、赠品和可售库存已核对，仓库待签回履约时效与缺货替代方案，预计 9/15 上午确认。" },
  { name: "制定投流计划并控制 ROI", minutes: 360, ratio: .45, forecastOn: dueOn, basis: "预算分配与人群包已准备，待终版素材入库后完成广告审核和首轮投放检查，预计 9/15 完成。" },
  { name: "搭建数据看板并完成复盘", minutes: 240, ratio: .20, forecastOn: "2026-09-16", basis: "GMV 口径与归因字段已对齐，看板框架已建；上线后的成交与退款数据尚未产生，复盘预计 9/16 收口。" },
  { name: "完成素材宣称与合同合规审核", minutes: 240, ratio: .70, forecastOn: dueOn, basis: "合同模板与已到素材完成首轮审核；仍有 2 处防晒宣称需补证明，预计 9/15 上午完成复核。" },
] as const;

// Authored Demo history: absolute workload observations, not interpolation from today's percentage.
// 9/12 adds two material formats, a backup rehearsal, and refund attribution checks (+240 min).
const deliveryHistory = [
  { scope: 360, completed: [0, 90, 180], notes: ["整理 12 位候选达人的筛选口径。", "3 位达人通过筛选并确认合作意向。", "6 位达人已确认合作条款。"] },
  { scope: 360, completed: [0, 72, 192], notes: ["确认首批脚本与素材清单。", "卖点初稿与部分脚本完成。", "新增两种渠道素材适配，工作量增加 120 分钟；继续补拍。"] },
  { scope: 540, completed: [0, 54, 120], notes: ["确认直播流程与设备联调范围。", "场控分工和设备清单完成。", "新增备用链路彩排，工作量增加 60 分钟。"] },
  { scope: 240, completed: [0, 72, 144], notes: ["确认价格、库存与履约核对范围。", "价格机制初稿已核对。", "库存已复核，履约条款待签回。"] },
  { scope: 360, completed: [0, 36, 108], notes: ["确认投流预算与审核范围。", "预算拆分初稿完成。", "人群包和投放策略完成首轮核对。"] },
  { scope: 180, completed: [0, 0, 24], notes: ["确认成交数据看板的初始范围。", "数据口径待跨团队确认，尚无完成量依据。", "新增退款归因核对，工作量增加 60 分钟；开始搭建字段。"] },
  { scope: 240, completed: [0, 48, 120], notes: ["确认合同和宣称审核范围。", "合同模板已完成首轮检查。", "已到素材完成首轮审核，宣称证明待补。"] },
] as const;
const historyDates = ["2026-09-10", "2026-09-11", "2026-09-12"] as const;

export type CreatedProjectProgressDemo = {
  comparisons: Record<string, TaskProgressComparisonSeries>;
  estimates: Record<string, TaskEffortEstimate>;
};

/** Recognize the whole saved Demo family; unrelated or incomplete user tasks stay unknown. */
export function getCreatedProjectProgressDemo(seeds: readonly WorkspaceNode[], currentNodes: readonly WorkspaceNode[] = seeds): CreatedProjectProgressDemo {
  const result: CreatedProjectProgressDemo = { comparisons: {}, estimates: {} };
  const tasks = seeds.filter((node): node is TaskNode => node.kind === "task");
  const currentTasks = currentNodes.filter((node): node is TaskNode => node.kind === "task");
  for (const root of tasks) {
    const savedDeadline = root.plannedEndOn ?? (root.dueAt === "9 月 15 日" ? dueOn : undefined);
    if (root.name !== title || root.goal !== goal || root.teamId !== "creator-commerce"
      || savedDeadline !== dueOn
      || root.plannedStartOn && root.plannedStartOn > asOf) continue;
    const children = tasks.filter(task => task.parentTaskId === root.id && task.teamId === root.teamId);
    if (children.length !== deliveries.length
      || deliveries.some(record => children.filter(child => child.name === record.name).length !== 1)
      || children.some(child => tasks.some(task => task.parentTaskId === child.id))) continue;
    const childSeries: TaskProgressComparisonSeries[] = [];
    for (const [index, record] of deliveries.entries()) {
      const child = children.find(task => task.name === record.name)!;
      const currentChild = currentTasks.find(task => task.id === child.id);
      const existing = child.effortEstimate;
      const scopeMinutes = typeof existing?.minutes === "number" && existing.minutes > 0 ? existing.minutes : record.minutes;
      const completedMinutes = Math.round(scopeMinutes * record.ratio);
      const prefix = `demo-sun-protection-${child.id}`;
      const history = deliveryHistory[index];
      const scopeVersion = `${prefix}-v${history.scope === record.minutes ? 1 : 2}`;
      const basis = `防晒衣项目演示快照：${record.basis}`;
      const workload = historyDates.map((at, i) => ({ at,
        scopeMinutes: Math.round(scopeMinutes * (i < 2 ? history.scope : record.minutes) / record.minutes),
        completedMinutes: Math.round(scopeMinutes * history.completed[i] / record.minutes),
        scopeVersion: i < 2 ? `${prefix}-v1` : scopeVersion,
        note: `防晒衣项目历史样例：${history.notes[i]}`,
      })).filter(point => !child.plannedStartOn || point.at >= child.plannedStartOn);
      const series: TaskProgressComparisonSeries = {
        source: "example", scenario: "防晒衣项目交付核对", asOf, explanation: basis,
        workload: [...workload, { at: asOf, scopeMinutes, completedMinutes, scopeVersion, note: basis }],
        expected: { scopeVersion, points: [] },
        forecastTrend: {asOf,scopeVersion,startMinutes:completedMinutes,points:[
          ...(index === 5 ? [{at:"2026-09-15",completedMinutes:Math.round(scopeMinutes*.6),note:"演示交付节点：上线成交数据接入，看板完成首轮核对；退款归因与复盘待次日收口。"}] : []),
          {at:record.forecastOn,completedMinutes:scopeMinutes,note:`演示交付节点：${record.basis}`},
        ]},
        aiAssessment: { observedAt, scopeMinutes, completedMinutes, scopeVersion, basis },
        timing: { startOn: child.plannedStartOn ?? "", dueOn, forecastOn: record.forecastOn, scopeVersion, basis },
      };
      result.comparisons[child.id] = series;
      childSeries.push(series);
      // The saved seed owns history; the optional Demo estimate belongs to the live
      // definition. Do not sign it against obsolete criteria from the creation draft.
      const currentEstimate = currentChild?.effortEstimate;
      const canSupplyEstimate = !currentEstimate || currentEstimate.version === 1
        && (currentEstimate.basis === "unknown" || currentEstimate.basis === "mock" && currentEstimate.minutes === null);
      if (currentChild && currentChild.parentTaskId === root.id && currentChild.teamId === root.teamId
        && currentChild.name === child.name && canSupplyEstimate) {
        const workMethod = "AI 辅助整理交付材料，由成员核对业务结论与剩余事项";
        result.estimates[child.id] = {
          minutes: scopeMinutes, workMethod, basis: "mock", confirmed: false, version: 1,
          scopeKey: getEffortScopeKey({ ...currentChild, goal: getTaskDefinitionGoal(currentTasks, currentChild) }, workMethod),
          reason: "防晒衣项目固定演示投入，按本项交付与核对工作估算；不含等待时长。",
        };
      }
    }
    const workload = rollupProgressHistory(childSeries, `demo-sun-protection-${root.id}`);
    const scopeVersion = workload.at(-1)!.scopeVersion;
    const basis = "防晒衣项目演示快照：按 7 项子任务的交付核对记录汇总。上线准备仍有待收口项，数据复盘需等 9/15 上线后的成交数据，项目预计 9/16 完成。任务状态保留用户设置。";
    result.comparisons[root.id] = {
      source: "example", scenario: "防晒衣项目子任务汇总", asOf, explanation: basis,
      workload,
      forecastTrend:rollupProgressForecast(childSeries,workload.at(-1)!),
      expected: { scopeVersion, points: [] },
      timing: { startOn: root.plannedStartOn ?? "", dueOn, forecastOn: "2026-09-16", scopeVersion, basis },
    };
  }
  return result;
}

/** Add the authored observation without changing saved task definitions, statuses, or history. */
export function withCreatedProjectProgressDetail(detail: TaskDetailMock, taskId: string, demo: CreatedProjectProgressDemo): TaskDetailMock {
  const series = demo.comparisons[taskId];
  if (!series) return detail;
  const id = `${taskId}-sun-protection-progress-v1`;
  if (detail.activities.some(activity => activity.id === id)) return detail;
  return { ...detail, activities: [...detail.activities, {
    id, author: "TaskDoor AI", type: "ai-insight", time: "2026-09-14 17:30", createdAt: observedAt,
    message: series.explanation,
  }] };
}

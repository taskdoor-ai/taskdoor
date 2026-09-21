import type { TaskProgressComparisonSeries } from "../lib/taskProgressComparison";

type ScenarioSeed = { id: string; label: string; actual: number[]; expected: number[]; explanation: string; notes?: Record<number, string> };

const seeds: ScenarioSeed[] = [
  { id: "behind", label: "落后", actual: [0, 6, 13, 21, 29, 35, 42], expected: [0, 10, 22, 34, 46, 56, 65, 74, 82, 90, 96, 100], explanation: "AI 预测完成 42%；资料确认推迟，尚有内容待制作与核对。", notes: {3: "资料确认推迟", 6: "已补齐资料，继续制作"} },
  { id: "ahead", label: "领先", actual: [0, 12, 25, 40, 55, 64, 72], expected: [0, 8, 16, 25, 35, 45, 55, 66, 77, 87, 94, 100], explanation: "AI 预测完成 72%；复用已有材料，主要内容已完成。", notes: {2: "采用已有素材", 6: "主要内容已完成"} },
  { id: "catching-up", label: "追赶", actual: [0, 4, 9, 15, 22, 42, 58], expected: [0, 9, 18, 29, 40, 51, 62, 72, 81, 89, 95, 100], explanation: "近期补充了交付结果，AI 预测完成 58%；后续仍需核对。", notes: {4: "前置交付到位", 5: "第一批结果提交", 6: "已提交新增交付结果，尚待最终核对"} },
  { id: "on-track", label: "持平", actual: [0, 8, 19, 30, 38, 52, 60], expected: [0, 10, 20, 30, 40, 50, 60, 69, 78, 87, 94, 100], explanation: "AI 预测完成 60%；交付初稿已整理，部分资料与最终确认尚未完成。" },
  { id: "stalled", label: "停滞", actual: [0, 15, 30, 35, 35, 35, 35], expected: [0, 12, 24, 36, 48, 60, 70, 78, 85, 91, 96, 100], explanation: "最近三次 AI 预测均为 35%；尚未收到新的确认依据。", notes: {3: "进入等待确认", 6: "仍未收到确认"} },
  { id: "rework", label: "返工", actual: [0, 14, 32, 52, 66, 39, 48], expected: [0, 10, 21, 32, 43, 54, 65, 75, 84, 91, 97, 100], explanation: "核对发现遗漏，完成量回退后再补正恢复；范围变化与返工分别保留记录。", notes: {5: "核对发现遗漏，部分结果需返工", 6: "完成首轮补正"} },
  { id: "finished", label: "提前完成", actual: [0, 20, 42, 62, 80, 94, 100], expected: [0, 15, 30, 45, 60, 74, 85, 91, 96, 98, 99, 100], explanation: "AI 预测已覆盖全部完成标准；仍需用户确认完成，不自动改变任务状态。", notes: {6: "内容完成"} },
  { id: "not-started", label: "尚未推进", actual: [0, 0, 0, 0, 0, 0, 0], expected: [0, 0, 0, 5, 10, 15, 20, 35, 50, 70, 85, 100], explanation: "示例依据明确显示尚未推进，AI 预测为 0%；没有记录时显示未知。", notes: {6: "已明确确认尚未推进"} },
];

// Scenario units are expanded into fixed minute snapshots once, never from a task's live estimate.
const dateAt = (index: number) => `2026-09-${String(index + 7).padStart(2, "0")}`;
const forecastDates: Record<string, string | null> = {
  behind: "2026-09-21", ahead: "2026-09-16", "catching-up": "2026-09-18",
  "on-track": "2026-09-18", stalled: null, rework: "2026-09-20", finished: null, "not-started": null,
};
// Authored delivery checkpoints, separate from the obsolete scheduling baseline above.
const forecastDeliveries: Record<string, [string, number, string][]> = {
  behind: [["2026-09-15",58,"完成第一批内容修订"],["2026-09-17",78,"补齐资料并完成交叉核对"],["2026-09-18",78,"等待确认反馈，完成量持平"],["2026-09-21",100,"根据反馈修订并收口交付"]],
  ahead: [["2026-09-14",86,"复用素材完成主要内容核对"],["2026-09-15",94,"补齐授权与引用"],["2026-09-16",100,"最终交叉核对完成"]],
  "catching-up": [["2026-09-15",76,"新增交付完成第一轮核对"],["2026-09-16",88,"补正主要差异"],["2026-09-18",100,"剩余内容与结果确认收口"]],
  "on-track": [["2026-09-15",78,"完成资料核对与首轮修订"],["2026-09-16",90,"交付终稿等待确认"],["2026-09-17",90,"等待反馈，完成量持平"],["2026-09-18",100,"根据反馈完成最终核对"]],
  rework: [["2026-09-15",68,"补正遗漏内容"],["2026-09-17",88,"完成返工交叉验证"],["2026-09-20",120,"完成补充范围与最终交付核对"]],
};
function createExample(seed: ScenarioSeed, totalMinutes: number): TaskProgressComparisonSeries & {id: string} {
  const scopeUnits = seed.id === "finished" || seed.id === "on-track" || seed.id === "not-started"
    ? [100, 100, 100, 100, 100, 100, 100] : [80, 80, 90, 90, 90, 100, 100];
  const toMinutes = (units: number) => Math.round(totalMinutes * units / 100);
  const versionAt = (units: number) => `scope-${units}`;
  return {
    id: seed.id, source: "example", scenario: seed.label, asOf: "2026-09-13", explanation: seed.explanation,
    creation:{at:"2026-09-07T09:00:00+08:00",scopeMinutes:toMinutes(scopeUnits[0])},
    workload: seed.actual.map((value, i) => ({
      at: dateAt(i), scopeMinutes: toMinutes(scopeUnits[i]), completedMinutes: toMinutes(value), scopeVersion: versionAt(scopeUnits[i]),
      ...((seed.notes?.[i] || (i > 0 && scopeUnits[i] !== scopeUnits[i-1])) ? {note: [i > 0 && scopeUnits[i] !== scopeUnits[i-1] ? "补充交付范围" : null, seed.notes?.[i]].filter(Boolean).join("；")} : {}),
    })),
    aiAssessment: {
      observedAt:"2026-09-13T09:30:00+08:00", completedMinutes:toMinutes(seed.actual.at(-1)!),
      scopeMinutes:totalMinutes, scopeVersion:"scope-100",
      basis:seed.id === "on-track" ? "示例：交付初稿已整理，部分资料核对和最终确认尚未完成。"
        : `示例：${seed.notes?.[6] ?? "依据当前交付内容核对完成标准"}。`,
    },
    expected: {scopeVersion: "scope-100", points: seed.expected.map((value, i) => ({at:dateAt(i), completedMinutes:toMinutes(value)}))},
    ...(forecastDeliveries[seed.id] ? {forecastTrend:{asOf:"2026-09-13",scopeVersion:"scope-100",startMinutes:toMinutes(seed.actual.at(-1)!),
      ...(seed.id==="rework" ? {scopePoints:[{at:"2026-09-15",scopeMinutes:toMinutes(120),note:"演示范围预测：客户预计补充一组交叉验证，新增 20% 工作量；尚未计入当前范围。"}]} : {}),
      points:forecastDeliveries[seed.id].map(([at,amount,note])=>({at,completedMinutes:toMinutes(amount),note:`演示预测节点：${note}。`}))}} : {}),
    timing: {
      startOn: "2026-09-07", dueOn: "2026-09-18", forecastOn: forecastDates[seed.id], scopeVersion: "scope-100",
      ...(seed.id === "finished" ? {completedOn: "2026-09-13"} : {}),
      basis: seed.id === "stalled" ? "等待确认，尚无恢复时间，暂无法预测完成日。" : seed.id === "not-started" ? "尚未明确开始安排，暂无法预测完成日。"
        : seed.id === "catching-up" ? "结合近期交付与剩余核对工作预测完成日期。"
        : seed.id === "behind" ? "新增交付范围与前置确认推迟，预计晚于截止完成。" : seed.id === "ahead" ? "复用已有素材，后续仅余核对，预计提前完成。" : seed.id === "rework" ? "返工增加补正与复核，预计需要延后完成。" : seed.id === "finished" ? "AI 预测已覆盖当前范围，是否完成以用户设置的状态为准。" : "结合交付初稿、剩余资料核对与确认工作预测完成日期。",
    },
  };
}

export const taskProgressComparisonExamples: ReadonlyArray<TaskProgressComparisonSeries & { id: string }> = seeds.map(seed => createExample(seed, 2400));

const taskScenarios: Record<string, string> = {
  "fragrance-creator-wrapup": "behind",
  "fragrance-creator-business": "finished",
  "fragrance-content": "ahead",
  "fragrance-live": "stalled",
  "fragrance-product": "finished",
  "fragrance-growth": "catching-up",
  "fragrance-data": "finished",
  "fragrance-compliance": "not-started",
  "fragrance-final-decision": "rework",
  "weekly-retro-notes": "on-track",
  "weekly-retro-decisions": "finished",
  "weekly-retro-open-issues": "catching-up",
  "weekly-retro-actions": "not-started",
  "platform-mobile-release": "catching-up",
  "factory-pilot-ramp": "behind",
  "service-incident-recovery": "rework",
  "ccx-creator-pool-governance": "stalled",
  "ccx-creator-monthly-committee": "not-started",
  "ccx-serum-launch": "catching-up",
  "ccx-double11-presale": "not-started",
  "ccx-double11-assortment-gate": "not-started",
  "product-launch-planning": "on-track",
  "unassigned-creator-sample-tracking": "catching-up",
  "unassigned-short-video-covers": "ahead",
  "unassigned-live-backup-plan": "behind",
  "unassigned-gift-stock-check": "on-track",
  "unassigned-attribution-dictionary": "rework",
};

// Captured demo scope baselines. Live edits must never rescale these historical observations.
const scopeMinutesByTask: Record<string, number> = {
  "fragrance-creator-wrapup": 2580, "fragrance-creator-business": 360, "fragrance-content": 480,
  "fragrance-live": 480, "fragrance-product": 300, "fragrance-growth": 360, "fragrance-data": 240,
  "fragrance-compliance": 180, "fragrance-final-decision": 180, "weekly-retro-notes": 420,
  "weekly-retro-decisions": 120, "weekly-retro-open-issues": 180, "weekly-retro-actions": 120,
  "platform-mobile-release": 3120, "factory-pilot-ramp": 4980, "service-incident-recovery": 3480,
  "ccx-creator-pool-governance": 3240, "ccx-creator-monthly-committee": 240, "ccx-serum-launch": 4800,
  "ccx-double11-presale": 4200, "ccx-double11-assortment-gate": 300, "product-launch-planning": 1560,
  "unassigned-creator-sample-tracking": 180, "unassigned-short-video-covers": 240,
  "unassigned-live-backup-plan": 240, "unassigned-gift-stock-check": 120, "unassigned-attribution-dictionary": 180,
};
const examplesByTask = Object.fromEntries(Object.entries(taskScenarios).map(([taskId, scenarioId]) => [taskId, createExample(seeds.find(seed => seed.id === scenarioId)!, scopeMinutesByTask[taskId])]));

export function getTaskProgressComparisonExample(taskId: string) {
  if (!Object.prototype.hasOwnProperty.call(examplesByTask, taskId)) return undefined;
  return structuredClone(examplesByTask[taskId]);
}

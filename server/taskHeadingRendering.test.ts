import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createWorkspaceTaskDetail, taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import type { TaskBurnUpSeries } from "../src/lib/taskBurnUp.ts";

async function renderTrend(series?: TaskBurnUpSeries) {
  assert.ok(existsSync(new URL("../src/components/TaskBurnUpSparkline.tsx", import.meta.url)), "头部应提供可读数的小型燃起趋势");
  const { TaskBurnUpSparkline } = await import("../src/components/TaskBurnUpSparkline.tsx");
  return renderToStaticMarkup(createElement(TaskBurnUpSparkline, { series }));
}

const series: TaskBurnUpSeries = {
  source: "recorded",
  points: [
    { at: "2026-08-25", scopeHours: 20, completedHours: 0, estimatedLeafCount: 2, totalLeafCount: 2 },
    { at: "2026-08-31", scopeHours: 20, completedHours: 2, estimatedLeafCount: 2, totalLeafCount: 2 },
  ],
};

test("小型燃起图显示范围与已验收 EWD 双线，并提供可展开的数据表", async () => {
  const html = await renderTrend(series);
  assert.match(html, /完成进度/);
  assert.match(html, /燃起图/);
  assert.match(html, /已验收/);
  assert.match(html, /范围/);
  assert.doesNotMatch(html, /EWD · h/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="10"/);
  assert.match(html, /task-completion-progress-value">10%/);
  assert.match(html, /task-burnup-scope/);
  assert.match(html, /task-burnup-completed/);
  assert.match(html, /<details/);
  assert.match(html, /<table/);
  assert.match(html, /2026-08-25/);
  assert.match(html, /2026-08-31/);
  assert.doesNotMatch(html, /50%|预测|任务完成率/);
});

test("燃起图以新增工作量和完成工作量解释双线，工作量单位和验收口径留在数据详情", async () => {
  const html = await renderTrend(series);
  const visibleChart = html.slice(html.indexOf('class="task-burnup-visual"'), html.indexOf('<details class="task-burnup-details"'));
  assert.match(visibleChart, /task-burnup-heading"><span>燃起图<\/span><\/div>/);
  assert.match(visibleChart, /task-burnup-legend-scope[^>]*>新增工作量/);
  assert.match(visibleChart, /task-burnup-legend-completed[^>]*>完成工作量/);
  assert.match(visibleChart, /虚线为新增工作量，实线为完成工作量/);
  assert.doesNotMatch(visibleChart, /当前总工作量|已完成工作量|新增任务|完成任务/);
  assert.doesNotMatch(visibleChart, /EWD|工时|小时|\bh\b/);
  const details = html.slice(html.indexOf('<details class="task-burnup-details"'));
  assert.match(details, /按 EWD 加权/);
  assert.match(details, /完成工作量以验收为准/);
  assert.match(details, /不代表实际耗时/);
  assert.match(details, /单位：人天/);
  assert.match(details, /<th scope="col">新增工作量<\/th><th scope="col">完成工作量<\/th>/);
  assert.match(details, /<td>2\.5<\/td><td>0\.25<\/td>/, "仍使用现有人天读数，不改成任务个数");
});

test("燃起图两项图例固定同一行，文字和线型标记不被压缩换行", () => {
  const css = readFileSync(new URL("../src/styles/task-heading.css", import.meta.url), "utf8");
  const legend = css.match(/\.task-burnup-legend\s*\{([^}]+)\}/)?.[1] ?? "";
  const label = css.match(/\.task-burnup-legend\s*>\s*span\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(legend, /flex-wrap:\s*nowrap/);
  assert.match(label, /white-space:\s*nowrap/);
  assert.match(label, /flex:\s*0 0 auto/);
});

test("趋势保留来源元数据，界面不展示演示标记", async () => {
  const html = await renderTrend({ ...series, source: "example" });
  assert.match(html, /data-source="example"/);
  assert.doesNotMatch(html, /示例|不代表当前任务的实际进度/);
});

test("接近完成和刚开始的工作量不能因显示精度变成100%或0%", async () => {
  const almost = await renderTrend({ ...series, points: [{ ...series.points[1], scopeHours: 2001, completedHours: 2000 }] });
  assert.match(almost, /task-completion-progress-value">&gt;99\.9%<\/strong>/);
  assert.doesNotMatch(almost, /task-completion-progress-value">100%/);
  const started = await renderTrend({ ...series, points: [{ ...series.points[1], scopeHours: 2001, completedHours: 1 }] });
  assert.match(started, /task-completion-progress-value">&lt;0\.1%<\/strong>/);
});

test("空数据不绘制装饰曲线，单点保留读数并提示历史不足", async () => {
  const empty = await renderTrend();
  assert.match(empty, /完成进度/);
  assert.match(empty, /暂不可计算/);
  assert.match(empty, /燃起图/);
  assert.match(empty, /暂无趋势/);
  assert.doesNotMatch(empty, /EWD · h|task-burnup-legend/);
  const emptyChart = empty.slice(empty.indexOf('class="task-burnup-visual"'));
  assert.doesNotMatch(emptyChart, /<svg|<path|0%/);
  const single = await renderTrend({ ...series, points: [series.points[1]] });
  assert.match(single, /历史不足/);
  assert.match(single, /已验收/);
  const singleChart = single.slice(single.indexOf('class="task-burnup-visual"'));
  assert.match(singleChart, /<circle/);
  assert.doesNotMatch(singleChart, /<path/);
});

test("单点仍披露缺估，历史缺估与最新缺估分别说明", async () => {
  const point = { ...series.points[0], estimatedLeafCount: 1 };
  const single = await renderTrend({ ...series, points: [point] });
  assert.match(single, /历史不足/);
  assert.match(single, /估算不完整/);
  assert.match(single, /已估算 1\/2 项/);
  const recovered = await renderTrend({ ...series, points: [point, series.points[1]] });
  assert.match(recovered, /历史含未估算记录/);
  assert.doesNotMatch(recovered, /估算不完整/);
});

test("时间戳读数统一为上海时区，并区分同一天的不同时刻", async () => {
  const html = await renderTrend({ ...series, points: [
    { ...series.points[0], at: "2026-08-25T20:00:00Z" },
    { ...series.points[1], at: "2026-08-26T08:00:00Z" },
  ] });
  assert.match(html, /2026\/08\/26 04:00:00/);
  assert.match(html, /2026\/08\/26 16:00:00/);
  assert.match(html, /北京时间/);
});

test("缺失估算和无效数据明确呈现，未知值不当成零", async () => {
  const partial = await renderTrend({ ...series, points: [series.points[0], { ...series.points[1], scopeHours: null, estimatedLeafCount: 1 }] });
  assert.match(partial, /估算不完整/);
  assert.match(partial, /未知/);
  assert.doesNotMatch(partial, /\d+%/);
  const invalid = await renderTrend({ ...series, points: [{ ...series.points[0], scopeHours: -1 }] });
  assert.match(invalid, /数据待核对/);
  assert.doesNotMatch(invalid, /<svg|<path/);
});

test("极限完成度的可访问数值和条宽不被展示精度取整成零或一百", async () => {
  const nearDone = await renderTrend({ source: "recorded", points: [{ ...series.points[1], completedHours: 9995, scopeHours: 10000 }] });
  assert.match(nearDone, /&gt;99\.9%/);
  assert.match(nearDone, /aria-valuenow="99\.95"/);
  assert.match(nearDone, /style="width:99\.95%"/);
  assert.doesNotMatch(nearDone, /aria-valuenow="100"|style="width:100%"/);
});

test("完成标准全部直接可读，详情头部不再展示执行建议", async () => {
  assert.ok(existsSync(new URL("../src/components/TaskCompletionCriteria.tsx", import.meta.url)), "头部应提供独立的完成标准摘要");
  const { TaskCompletionCriteria } = await import("../src/components/TaskCompletionCriteria.tsx");
  const html = renderToStaticMarkup(createElement(TaskCompletionCriteria, { criteria: ["确认交付范围", "提供验证证据", "由负责人复核结果"], source: "recorded" }));
  assert.match(html, /完成标准/);
  assert.match(html, /确认交付范围/);
  assert.match(html, /由负责人复核结果/);
  assert.doesNotMatch(html, /<details|执行建议|先核对输入资料|checkbox|已验收|示例/);
  const empty = renderToStaticMarkup(createElement(TaskCompletionCriteria, { criteria: [] }));
  assert.match(empty, /尚未设置/);
  assert.doesNotMatch(empty, /执行建议|先核对输入资料/);
});

test("头部只读取当前完成标准，缺失或显式清空不回填示例，并保留编辑完成后记活动", () => {
  const detail = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
  assert.match(detail, /<TaskCompletionCriteria/);
  assert.match(detail, /task\.completionCriteria\s*\?\?\s*\[\]/);
  assert.match(detail, /<TaskCompletionCriteria[^>]*source="recorded"/);
  assert.doesNotMatch(detail, /<TaskCompletionCriteria[^>]*executionTips=/, "详情头部不再接收执行建议");
  assert.doesNotMatch(detail, /getTaskHeadingExample|headingExample|task-heading-example/);
  assert.match(detail, /onBlur=\{\(\) => [^\n]*onTaskTitleChange/);
  assert.match(detail, /onBlur=\{\(\) => [^\n]*onTaskGoalChange/);
  assert.doesNotMatch(detail, /onChange=\{[^\n]*onTaskTitleChange/);
  assert.ok(detail.indexOf("<TaskCompletionCriteria") < detail.indexOf('className="task-detail-properties"'));
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /completionCriteria:\s*selectedTreeTask\.completionCriteria\s*,/, "完成标准直接来自当前任务，缺失也不从详情 Mock 回填");
  assert.doesNotMatch(app, /completionCriteria:\s*selectedTreeTask\.completionCriteria\s*\?\?/);
  assert.ok(/executionTips: selectedTreeTask\.executionTips \?\? selectedTaskDetailBase\.executionTips/.test(app), "最新执行建议须传给任务详情");
});

test("详情消费当前任务评估，子任务只影响范围汇总而不控制展示", () => {
  const detail = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
  assert.match(detail, /const burnUp = task\.burnUp;/);
  assert.doesNotMatch(detail, /getTaskHeadingExample|getTaskProgressEvents|headingExample|progressEvents/);
  assert.doesNotMatch(detail, /childTasks\.length > 0 && burnUp|hasProgressSummary/);
  assert.match(detail, /trend=\{<TaskWorkloadSummary[^>]*effortTasks=\{effortTasks\}[^>]*series=\{burnUp\}/);
  assert.doesNotMatch(detail, /events=\{progressEvents\}/);
});

test("原有Mock主任务的燃起图接入详情数据，保留双线和百分比并移除示例标注", async () => {
  const burnUp = taskDetailMocks["fragrance-creator-wrapup"].burnUp;
  assert.ok(burnUp, "不能只保留演示账本却断开详情接线");
  assert.equal(burnUp.source, "example");
  assert.equal(burnUp.points.at(-1)?.scopeHours, 43);
  assert.equal(burnUp.points.at(-1)?.completedHours, 15);
  const html = await renderTrend(burnUp);
  assert.match(html, /data-source="example"/);
  assert.match(html, /34\.9%/);
  assert.match(html, /task-burnup-scope/);
  assert.match(html, /task-burnup-completed/);
  assert.doesNotMatch(html, /示例数据，不代表当前任务的实际进度/);
  assert.equal(taskDetailMocks["fragrance-content"].burnUp, undefined, "叶子不借用父任务的曲线");
});

test("非规划器创建的任务也保留真实标准和明确清空，不被示例回填", () => {
  const seed = workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes");
  assert.ok(seed);
  for (const completionCriteria of [["已有任务自己的明确完成标准"], []]) {
    const detail = createWorkspaceTaskDetail({ ...seed, completionCriteria, executionTips: ["保留本任务的执行建议"] });
    assert.deepEqual(detail.completionCriteria, completionCriteria);
    assert.deepEqual(detail.executionTips, ["保留本任务的执行建议"]);
  }
});

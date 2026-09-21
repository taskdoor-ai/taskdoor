import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getEffortScopeKey, type TaskEffortEstimate, type TaskEffortTask } from "../src/lib/taskEffort.ts";
import { getTaskProgressComparisonExample } from "../src/data/taskProgressComparisonExamples.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const scope = { goal: "形成结论", completionCriteria: ["核对结论"], executionTips: ["先检查原始资料"] };
const workMethod = "工具辅助整理，人工核验";

function task(estimate: Partial<TaskEffortEstimate> = {}): TaskEffortTask {
  return {
    ...scope,
    effortEstimate: {
      minutes: 90, workMethod, reason: "准备与核验预计共 90 分钟", basis: "model",
      confirmed: false, version: 1, scopeKey: getEffortScopeKey(scope, workMethod), ...estimate,
    },
  };
}

async function render(tasks: TaskEffortTask[]) {
  assert.ok(existsSync(new URL("../src/components/TaskEffortCost.tsx", import.meta.url)), "应提供独立的只读预计投入组件");
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const html = renderToStaticMarkup(createElement(TaskEffortCost, { tasks }));
  return { html, text: html.replace(/<[^>]+>/gu, "") };
}

test("只读成本汇总有效的系统候选和已确认结果，不显示编辑或确认入口", async () => {
  const { html, text } = await render([task(), task({ minutes: 30, confirmed: true })]);
  assert.equal(text, "预计投入约 0.25 人天");
  assert.match(html, /class="task-effort-cost"/u);
  assert.match(html, /class="task-effort-field-label"/u);
  assert.match(html, /class="task-effort-cost-value"/u);
  assert.match(html, /aria-label="预计人类工时说明"/u);
  assert.doesNotMatch(html, /<(?:input|textarea|select|details|summary)\b|确认|Mock|示例|EWD|工具方式/u);
  assert.doesNotMatch(text, /综合考虑|历史任务|实际耗时/u, "解释收进提示，不常驻正文");
});

test("已确认手工估算纳入已估部分，Mock缺口仍不冒充总成本", async () => {
  const { text } = await render([task({ basis: "manual", confirmed: true, minutes: 666660 }), task({ basis: "mock" })]);
  assert.equal(text, "预计投入已估部分约 1388.88 人天");
  assert.doesNotMatch(text, /11111|0 人天/u);
});

test("未知和排除记录仍保留在覆盖范围，不能把有效部分冒充总成本", async () => {
  const tasks = [task(), task({ basis: "manual" }), task({ basis: "mock" }), {}, { ...task(), goal: "范围发生变化" }];
  const before = structuredClone(tasks);
  const { text } = await render(tasks);
  assert.equal(text, "预计投入已估部分约 0.19 人天");
  assert.deepEqual(tasks, before, "呈现不能清空或改写原始估算");
});

test("模型来源但记录无效或缺少依据时不显示数值", async () => {
  for (const value of [task({ minutes: null }), task({ reason: "" }), task({ workMethod: "" }), task({ minutes: -1 }), task({ basis: "unknown" })]) {
    const { text } = await render([value]);
    assert.equal(text, "预计投入暂无法估算");
  }
});

test("只有过期系统估算时提示重新估算，不把旧值当当前成本", async () => {
  const { text } = await render([{ ...task(), goal: "范围发生变化" }]);
  assert.equal(text, "预计投入需重新估算");
  assert.doesNotMatch(text, /1\.5|旧估/u);
});

test("有效零投入与缺失估算分开呈现", async () => {
  assert.equal((await render([task({ minutes: 0 })])).text, "预计投入约 0 人天");
  assert.equal((await render([task({ minutes: 0 }), {}])).text, "预计投入已估部分约 0 人天");
  for (const tasks of [[], [{}]]) assert.equal((await render(tasks)).text, "预计投入暂无法估算");
});

test("人天显示舍入且微量投入不显示为零", async () => {
  assert.equal((await render([task({ minutes: 1 })])).text, "预计投入约 &lt;0.01 人天");
  assert.equal((await render([task({ minutes: 70 })])).text, "预计投入约 0.15 人天");
});

test("合计超出安全整数范围时不渲染不可靠数值或中断详情", async () => {
  const { text } = await render([task({ minutes: Number.MAX_SAFE_INTEGER }), task({ minutes: 1 })]);
  assert.equal(text, "预计投入暂无法估算");
});

test("创建工时分布用简洁数值展示条形图、预计工时与占比", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const tasks = [{ ...task({ minutes: 120 }), id: "a", title: "资料整理" }, { ...task({ minutes: 1080 }), id: "b", title: "方案验证" }];
  const before = structuredClone(tasks);
  const html = renderToStaticMarkup(createElement(TaskEffortCost, { tasks, mode: "creation", showDistribution: true }));
  assert.match(html, /约 2.5 人天/);
  assert.match(html, /子任务工时分布/);
  assert.match(html, /aria-label="预计投入 0.25 人天，工时占比 10%"/);
  assert.match(html, /aria-label="预计投入 2.25 人天，工时占比 90%"/);
  assert.match(html, />0.25 人天<\/span> · <span class="task-effort-distribution-share">10%<\/span>/);
  assert.match(html, />2.25 人天<\/span> · <span class="task-effort-distribution-share">90%<\/span>/);
  assert.doesNotMatch(html, />预计 [^<]*人天|>占总投入 /);
  assert.equal([...html.matchAll(/role="meter"/gu)].length, 2);
  assert.match(html, /aria-label="资料整理工时占比"[^>]*aria-valuenow="10"/);
  assert.match(html, /aria-label="方案验证工时占比"[^>]*aria-valuenow="90"/);
  assert.match(html, /style="width:10%"/);
  assert.match(html, /style="width:90%"/);
  assert.doesNotMatch(html, /role="progressbar"|已完成/);
  assert.deepEqual([...html.matchAll(/class="task-effort-distribution-name">([^<]+)</gu)].map(match => match[1]), ["方案验证", "资料整理"], "成本最高的显示在前");
  assert.deepEqual(tasks, before, "排序只影响工时分布，不修改实际任务顺序或估算");
  const disclosure = html.match(/<button(?=[^>]*aria-label="收起子任务工时分布")[^>]*aria-controls="([^"]+)"[^>]*aria-expanded="true"/u);
  assert.ok(disclosure, "默认展开且提供键盘可操作的收起按钮");
  assert.ok(html.includes(`<ol id="${disclosure[1]}">`), "收起按钮关联同一份工时分布");
  assert.doesNotMatch(html, /投入明细|实际投入|剩余投入|完成率|综合考虑/);
  const partial = renderToStaticMarkup(createElement(TaskEffortCost, { tasks: [tasks[0], { id: "unknown", title: "待评估任务" }], showDistribution: true }));
  assert.match(partial, /已估部分约 0.25 人天/);
  assert.match(partial, /1\/2 项已估/);
  assert.match(partial, /待评估任务/);
  assert.doesNotMatch(partial, /\d+%|task-effort-distribution-track/);
  const unavailable = renderToStaticMarkup(createElement(TaskEffortCost, { tasks: [{ id: "one" }, { id: "two" }], showDistribution: true }));
  assert.match(unavailable, /暂无法估算/);
  assert.doesNotMatch(unavailable, /子任务工时分布|task-effort-distribution-track/);
});

test("详情没有验收记录时保留灰色空进度条，但不补完成百分比", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const tasks = [{ ...task({ minutes: 120 }), id: "a", title: "资料整理" }, { ...task({ minutes: 360 }), id: "b", title: "方案验证" }];
  const html = renderToStaticMarkup(createElement(TaskEffortCost, {
    tasks,
    completedMinutesByTaskId: {},
    presentation: "summary",
    showDistribution: true,
  }));

  assert.match(html, /子任务进度/);
  assert.doesNotMatch(html, /预计共 1 人天/);
  assert.doesNotMatch(html, /投入与依据|预计 0.75 人天|占总投入 75%/);
  assert.match(html, /待评估/);
  assert.equal([...html.matchAll(/class="task-progress-actual-track"/gu)].length, 2);
  assert.match(html, /aria-label="资料整理完成进度：待评估 —[^"]*" class="task-progress-actual-track" role="img"><\/div>/u);
  assert.doesNotMatch(html, /aria-valuenow|style="width:/u);
  assert.doesNotMatch(html, /暂无验收记录|role="progressbar"|已完成 0%/u);
});

test("详情的条宽只按自身完成度计算，不能再乘投入占比", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const tasks = [{ ...task({ minutes: 600 }), id: "a", title: "制作素材" }, { ...task({ minutes: 1800 }), id: "b", title: "活动执行" }];
  const html = renderToStaticMarkup(createElement(TaskEffortCost, {
    tasks, completedMinutesByTaskId: { a: 360, b: 0 }, onOpenTask: () => {}, presentation: "summary", showDistribution: true,
  }));
  assert.doesNotMatch(html, /预计共 5 人天/);
  assert.doesNotMatch(html, /投入与依据|占总投入 25%/);
  assert.match(html, /task-completion-progress-value">60%/);
  assert.match(html, /task-completion-progress-value">0%/);
  assert.match(html, /aria-label="制作素材完成进度"[^>]*aria-valuenow="60"/);
  assert.match(html, /style="width:60%"/);
  assert.doesNotMatch(html, /style="width:(25|15)%"|<i\b/);
  assert.match(html, /<button[^>]*class="task-effort-distribution-name"[^>]*>制作素材<\/button>/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<ol hidden=""/);
});

test("未知、非法、过期和零分母不伪装成完成度", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  for (const completed of [null, NaN, Infinity, -1, 121]) {
    const html = renderToStaticMarkup(createElement(TaskEffortCost, {
      tasks: [{ ...task({ minutes: 120 }), id: "a", title: "资料整理" }],
      completedMinutesByTaskId: { a: completed }, presentation: "summary", showDistribution: true,
    }));
    assert.match(html, /资料整理/);
    assert.match(html, /class="task-progress-actual-track" role="img"><\/div>/u);
    assert.doesNotMatch(html, /role="progressbar"|已完成 (0|100)%|NaN|Infinity/);
  }
  for (const effortTask of [task({ minutes: 0 }), { ...task(), goal: "范围已改变" }, {}]) {
    const html = renderToStaticMarkup(createElement(TaskEffortCost, {
      tasks: [{ ...effortTask, id: "a", title: "待核对任务" }],
      completedMinutesByTaskId: { a: 0 }, presentation: "summary", showDistribution: true,
    }));
    assert.match(html, /待核对任务/);
    assert.match(html, /class="task-progress-actual-track" role="img"><\/div>/u);
    assert.doesNotMatch(html, /role="progressbar"|已完成 0%|占总投入/);
  }
});

test("子任务各自显示实际与同一时点预期，预期不覆盖原完成记录", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const comparison = getTaskProgressComparisonExample("weekly-retro-decisions")!;
  const props = {
    tasks: [{...task({minutes:120}),id:"a",title:"核对结论"}],
    completedMinutesByTaskId: {a:60},
    progressComparisonsByTaskId: {a:comparison},
    comparisonAsOf: "2026-09-13",
    presentation: "summary" as const, showDistribution:true,
  };
  const html = renderToStaticMarkup(createElement(TaskEffortCost,props));
  assert.match(html,/task-completion-progress-value">50%/); // The separate child's demo actual is 100%; retain caller's record.
  assert.match(html,/aria-label="核对结论完成进度"[^>]*aria-valuenow="50"/);
  assert.match(html,/class="task-progress-expected-label"[^>]*>计划应完成 85%/);
  assert.match(html,/class="task-progress-pace-marker"[^>]*style="left:85%"/);
  assert.doesNotMatch(html,/计划进度待更新/);
  const unknown = renderToStaticMarkup(createElement(TaskEffortCost,{...props,completedMinutesByTaskId:{}}));
  assert.match(unknown,/待评估/);
  assert.match(unknown,/计划应完成 85%/);
  assert.doesNotMatch(unknown,/role="progressbar"|task-progress-race-gap/);
  const zero = structuredClone(comparison); zero.expected.points.forEach(point=>point.completedMinutes=0);
  assert.match(renderToStaticMarkup(createElement(TaskEffortCost,{...props,progressComparisonsByTaskId:{a:zero}})),/计划应完成 0%/);
  for (const update of [
    {progressComparisonsByTaskId:{}},
    {comparisonAsOf:"2026-09-14"},
    {tasks:[{...task({minutes:240}),id:"a",title:"核对结论"}]},
    {progressComparisonsByTaskId:{a:{...comparison,expected:{...comparison.expected,scopeVersion:"old"}}}},
    {tasks:[{...props.tasks[0],goal:"范围改变"}]},
  ]) {
    const changed = renderToStaticMarkup(createElement(TaskEffortCost,{...props,...update}));
    assert.match(changed,/计划进度待更新/);
    assert.doesNotMatch(changed,/task-progress-pace-marker|task-progress-expected-label/);
  }
});

test("相同成本保留原序，零投入先于未知与过期记录且缺估不产生色阶占比", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const tasks = [
    { id: "missing-a", title: "尚未估算甲" },
    { ...task({ minutes: 60 }), id: "low", title: "一小时甲" },
    { ...task({ minutes: 600 }), id: "stale", title: "需重估任务", goal: "范围已经改变" },
    { ...task({ minutes: 180 }), id: "high", title: "三小时任务" },
    { ...task({ minutes: 60 }), id: "tied", title: "一小时乙" },
    { ...task({ minutes: 0 }), id: "zero", title: "零投入任务" },
    { id: "missing-b", title: "尚未估算乙" },
  ];
  const before = structuredClone(tasks);
  const html = renderToStaticMarkup(createElement(TaskEffortCost, { tasks, showDistribution: true }));
  assert.deepEqual([...html.matchAll(/class="task-effort-distribution-name">([^<]+)</gu)].map(match => match[1]), ["三小时任务", "一小时甲", "一小时乙", "零投入任务", "尚未估算甲", "需重估任务", "尚未估算乙"]);
  assert.match(html, /4\/7 项已估/);
  assert.match(html, /需重估/);
  assert.doesNotMatch(html, /\d+%|data-share-tone|task-effort-distribution-track/);
  assert.deepEqual(tasks, before);

  const zero = renderToStaticMarkup(createElement(TaskEffortCost, { tasks: [task({ minutes: 0 }), task({ minutes: 0 })], showDistribution: true }));
  assert.match(zero, /约 0 人天/);
  assert.doesNotMatch(zero, /\d+%|data-share-tone|task-effort-distribution-track/);
});

test("创建候选保持工时读数，移除演示估算标记", async () => {
  const { TaskEffortCost } = await import("../src/components/TaskEffortCost.tsx");
  const html = renderToStaticMarkup(createElement(TaskEffortCost, { tasks: [task({ basis: "mock" })], mode: "creation" }));
  assert.match(html, /约 0.19 人天/);
  assert.doesNotMatch(html, /演示估算|模型已完成估算/);
  assert.doesNotMatch(html, /综合考虑|投入明细|<input|确认估算/);
});

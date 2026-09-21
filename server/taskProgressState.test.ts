import assert from "node:assert/strict";
import test from "node:test";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { getTaskProgressComparisonExample } from "../src/data/taskProgressComparisonExamples.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { updateWorkspaceTaskStatus } from "../src/lib/workspaceTaskUpdates.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskWorkloadSummary } from "../src/components/TaskWorkloadSummary.tsx";
import { getEffortScopeKey } from "../src/lib/taskEffort.ts";
(globalThis as typeof globalThis & {React:typeof React}).React=React;

const series = getTaskProgressComparisonExample("unassigned-short-video-covers")!;
test("用户完成声明优先于 AI 预测，计划预期保留且不改写历史", () => {
  const original = structuredClone(series);
  const result = getTaskProgressDisplay({series, task:{status:"已完成", completedAt:"2026-09-13T10:00:00+08:00"}});
  assert.equal(result.ratio, 1);
  assert.equal(result.sourceLabel, "用户确认");
  assert.equal(result.expectedRatio, .55);
  assert.equal(result.forecastOn, null);
  assert.equal(result.completedOn, "2026-09-13");
  assert.deepEqual(series, original);
});
test("本地状态确认时间不会被重复设置改写，重开恢复独立 AI 预测并保留重开时间", () => {
  const updated=updateWorkspaceTaskStatus(workspaceNodes,"fragrance-growth","已完成");
  const task=updated.find(item=>item.id === "fragrance-growth") as TaskNode;
  assert.ok(task.completedAt);
  assert.equal(updateWorkspaceTaskStatus(updated,task.id,"已完成").find(item=>item.id === task.id),task);
  const cancelled=updateWorkspaceTaskStatus(updated,task.id,"已取消").find(item=>item.id === task.id) as TaskNode;
  assert.equal(getTaskProgressDisplay({series,task:cancelled}).ratio,1,"取消保留此前已确认的完成量");
  const reopened=updateWorkspaceTaskStatus(updated,task.id,"进行中").find(item=>item.id === task.id) as TaskNode;
  assert.equal(reopened.completedAt,undefined);
  assert.ok(reopened.progressReopenedAt);
  assert.equal(getTaskProgressDisplay({series,task:reopened}).ratio,173/240);
});
test("完成声明按团队日期加入历史，并在同一日期比较计划", () => {
  const original=structuredClone(series);
  const result=getTaskProgressDisplay({series,task:{status:"已完成",completedAt:"2026-09-13T18:00:00Z"}});
  assert.equal(result.completedOn,"2026-09-14");
  assert.equal(result.historySeries?.workload.length,8);
  assert.deepEqual(result.historySeries?.workload.slice(0,-1),original.workload);
  assert.equal(result.expectedRatio,158/240);
  assert.equal(result.historySeries?.workload.at(-1)?.completedMinutes,240);
});
test("主子任务共用进度组件，父级按用户确认与叶子评估汇总", () => {
  const scope={goal:"交付",completionCriteria:["结果齐备"],executionTips:[]};
  const workMethod="人工核对";
  const tasks=[{id:"a",name:"资料整理",status:"已完成" as const,minutes:120},{id:"b",name:"交付核对",status:"进行中" as const,minutes:120}]
    .map(({minutes,...task})=>({...task,...scope,effortEstimate:{minutes,workMethod,basis:"model" as const,reason:"工作范围",confirmed:false,scopeKey:getEffortScopeKey(scope,workMethod),version:1}}));
  const child={...structuredClone(series),workload:[{at:series.asOf,scopeMinutes:120,completedMinutes:60,scopeVersion:"child"}],expected:{scopeVersion:"child",points:[{at:series.asOf,completedMinutes:90}]},timing:{...series.timing,scopeVersion:"child"}};
  const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{comparison:series,progressTask:{status:"进行中"},effortTasks:tasks,progressComparisonsByTaskId:{a:child,b:child}}));
  assert.equal((html.match(/aria-label="任务完成时间"/g) ?? []).length,2);
  assert.equal((html.match(/data-size="compact"/g) ?? []).length,2);
  assert.match(html,/75%<\/strong><span class="task-ai-prediction-label">AI 预测/);
  assert.doesNotMatch(html,/计算明细|工作量历史|<table/);
  assert.doesNotMatch(html,/class="task-progress-observation"/);
  assert.match(html,/100%<\/strong><span>用户确认/);
  assert.match(html,/50%<\/strong><span\b[^>]*>AI 预测/);
  assert.doesNotMatch(html,/投入与依据|task-effort-child-details/);
  assert.doesNotMatch(html,/<input|<select|实际完成进度/);
});
test("待开始不抹掉已有工作，阻塞与取消保留评估但取消停止预测", () => {
  assert.equal(getTaskProgressDisplay({task:{status:"待开始"}}).ratio,null);
  const waiting=getTaskProgressDisplay({series,task:{status:"待开始"}});
  assert.ok(waiting.ratio! > 0);
  assert.equal(waiting.sourceLabel,"AI 预测");
  assert.equal(getTaskProgressDisplay({series,task:{status:"已阻塞"}}).ratio,173/240);
  const cancelled=getTaskProgressDisplay({series,task:{status:"已取消"}});
  assert.equal(cancelled.ratio,173/240);
  assert.equal(cancelled.forecastOn,null);
  assert.equal(cancelled.timeStatus,"已取消");
});

test("活跃状态切换不改变产出评估、总量、完成量、历史与预测日期", () => {
  for (const id of ["weekly-retro-actions", "weekly-retro-notes"]) {
    const evidence = getTaskProgressDemoExample(id)!;
    const original = structuredClone(evidence);
    let nodes = workspaceNodes;
    const initialTask = nodes.find(node => node.id === id) as TaskNode;
    const baseline = getTaskProgressDisplay({ series: evidence, task: initialTask });
    for (const status of ["进行中", "待开始", "已阻塞", "待开始"] as const) {
      nodes = updateWorkspaceTaskStatus(nodes, id, status);
      const task = nodes.find(node => node.id === id) as TaskNode;
      assert.equal(task.status, status);
      const display = getTaskProgressDisplay({ series: evidence, task });
      assert.deepEqual(display, baseline, `${id} / ${status}`);
      assert.deepEqual(evidence, original);
      assert.ok(display.currentMinutes! > 0);
      assert.equal(display.sourceLabel, "AI 预测");
    }
  }
});
test("重开、缺证据与改计划不生成虚假进度或预测", () => {
  assert.equal(getTaskProgressDisplay({task:{status:"进行中"}}).ratio,null);
  const reopened=getTaskProgressDisplay({series,task:{status:"进行中",progressReopenedAt:"2026-09-14T10:00:00Z"}});
  assert.equal(reopened.ratio,173/240);
  assert.equal(reopened.forecastOn,series.timing.forecastOn);
  const changed=getTaskProgressDisplay({series,task:{status:"进行中",plannedEndOn:"2026-09-20"}});
  assert.equal(changed.ratio,173/240);
  assert.equal(changed.dueOn,"2026-09-20");
  assert.equal(changed.expectedRatio,null);
  assert.equal(changed.forecastOn,series.timing.forecastOn);
});

test("用户确认后保留独立 AI 预测，汇总和确认不能覆盖预测原值", () => {
  const retained = {...structuredClone(series), aiAssessment:{observedAt:"2026-09-13T09:30:00+08:00",completedMinutes:144,scopeMinutes:240,scopeVersion:"scope-100",basis:"初稿已覆盖，复核材料尚未齐备"}};
  const original=structuredClone(retained);
  const task={status:"已完成" as const,completedAt:"2026-09-13T12:00:00+08:00"};
  const model=getTaskProgressDisplay({series:retained,task,completedMinutes:216,sourceLabel:"子任务汇总"});
  assert.equal(model.ratio,1);
  assert.equal(model.aiAssessment?.ratio,.6);
  assert.equal(model.assessmentTiming,"before");
  assert.equal(model.historySeries?.aiAssessment?.completedMinutes,144);
  assert.deepEqual(retained,original);
  const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{comparison:retained,progressTask:task}));
  assert.match(html,/100%<\/strong><span>用户确认/);
  assert.doesNotMatch(html,/计算明细|确认前 AI 预测|初稿已覆盖，复核材料尚未齐备/);
  assert.equal(model.aiAssessment?.observedAt,"2026-09-13T09:30:00+08:00");
  assert.equal(model.aiAssessment?.basis,"初稿已覆盖，复核材料尚未齐备");
  assert.doesNotMatch(html,/AI 认为用户确认有误/);
});

test("AI 预测先后按各自时间判断，缺记录或同日精度不足不伪造确认前值", () => {
  const task={status:"已完成" as const,completedAt:"2026-09-13T12:00:00+08:00"};
  const sample={...structuredClone(series),aiAssessment:{observedAt:"2026-09-13T13:00:00+08:00",completedMinutes:144,scopeMinutes:240,scopeVersion:"scope-100",basis:"新版本复核"}};
  assert.equal(getTaskProgressDisplay({series:sample,task}).assessmentTiming,"after");
  sample.aiAssessment.observedAt="2026-09-13";
  assert.equal(getTaskProgressDisplay({series:sample,task}).assessmentTiming,"unknown");
  assert.equal(getTaskProgressDisplay({series:sample,task:{status:"已完成"}}).assessmentTiming,"unknown");
  delete (sample as Partial<typeof sample>).aiAssessment;
  assert.equal(getTaskProgressDisplay({series:sample,task}).aiAssessment,null);
});

test("Demo 的完成日期只取用户确认记录，不借用 AI 示例日期", () => {
  const completedExample=getTaskProgressComparisonExample("weekly-retro-decisions")!;
  const result=getTaskProgressDisplay({series:completedExample,task:{status:"已完成"}});
  assert.equal(result.ratio,1);
  assert.equal(result.completedOn,null);
  assert.equal(result.deltaDays,null);
  assert.equal(result.timeStatus,"完成日期待确认");
});

test("Demo 使用任务自己的截止日期，修改截止保留原时间预测并重算日期差", () => {
  const series=getTaskProgressDemoExample("weekly-retro-open-issues")!;
  const task=workspaceNodes.find(item=>item.id === "weekly-retro-open-issues") as TaskNode;
  const display=getTaskProgressDisplay({series,task});
  assert.equal(display.dueOn,task.plannedEndOn);
  assert.equal(display.expectedRatio,null);
  assert.equal(display.forecastOn,"2026-09-15");
  const updated=getTaskProgressDisplay({series,task:{...task,plannedEndOn:"2026-09-20"}});
  assert.equal(updated.ratio,display.ratio);
  assert.equal(updated.forecastOn,"2026-09-15");
  assert.equal(updated.timeStatus,"预计提前 5 天");
  assert.equal(getTaskProgressDemoExample(task.id)?.timing.dueOn,task.plannedEndOn);
});

test("Demo 无预测与已有历史的任务都响应用户完成确认，历史不被示例替换", () => {
  const task={status:"已完成" as const,completedAt:"2026-09-14T12:00:00+08:00",plannedEndOn:"2026-09-18"};
  const empty=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{progressTask:task}));
  assert.match(empty,/100%<\/strong><span>用户确认/);
  assert.doesNotMatch(empty,/计算明细|未保存 AI 预测记录|查看数据/);
  assert.match(empty,/燃起图/);
  const recorded={source:"recorded" as const,points:[{at:"2026-09-13",scopeHours:10,completedHours:1,estimatedLeafCount:1,totalLeafCount:1}]};
  const html=renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{progressTask:task,comparison:series,series:recorded}));
  assert.match(html,/100%<\/strong><span>用户确认/);
  assert.match(html,/data-source="recorded"/);
  assert.doesNotMatch(html,/计算明细|未保存 AI 预测记录|查看数据|<table/);
  assert.doesNotMatch(html,/确认前 AI 预测/);
  assert.equal(recorded.points[0].completedHours,1);
});

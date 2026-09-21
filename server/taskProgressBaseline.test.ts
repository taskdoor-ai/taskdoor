import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { unassignedTaskFixtures } from "../src/data/unassignedTaskFixtures.ts";
import { getTaskProgressAssessment } from "../src/lib/taskProgressAssessment.ts";
import { TaskWorkloadSummary } from "../src/components/TaskWorkloadSummary.tsx";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import { getEffortScopeKey } from "../src/lib/taskEffort.ts";
import { getTaskEffortBaselineSeries } from "../src/lib/taskEffortBaseline.ts";
import { getTaskBurnUpModel } from "../src/lib/taskBurnUp.ts";
import { recalculateTaskProgressPrediction } from "../src/lib/taskProgressPrediction.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const task = unassignedTaskFixtures.find(task => task.id === "unassigned-attribution-dictionary")!;

test("有创建估算且没有截止或完成量，仍显示 0.38 人天总量，未知不变成零", () => {
  const before = structuredClone(task);
  const assessment = getTaskProgressAssessment(undefined,[task]);
  assert.equal(assessment.scopeHours,3);
  assert.equal(assessment.completedHours,null);
  assert.equal(assessment.progressRatio,null);
  assert.equal(assessment.hasTrend,true);
  assert.equal(assessment.burnUp.points[0].at,task.createdAt);
  assert.ok(assessment.burnUp.scopePath);
  assert.equal(assessment.burnUp.completedPath,"");
  const html = renderToStaticMarkup(React.createElement(TaskWorkloadSummary,{effortTasks:[task],progressTask:task}));
  assert.match(html,/总工作量 <strong>0.38<\/strong>/);
  assert.match(html,/task-burnup-scope/);
  assert.doesNotMatch(html,/暂无趋势|尚无 EWD 历史记录|task-burnup-empty|aria-valuenow="0"|task-progress-forecast-trend/);
  assert.deepEqual(task,before);
  assert.throws(()=>recalculateTaskProgressPrediction({nodes:[task],taskId:task.id,getSeries:()=>undefined}),/已有总工作量估算，尚缺完成量预测依据/);
});

test("创建即保存初始总量，后续估算变化不能改写创建时的记录", () => {
  const draft = {title:task.name,goal:task.goal!,completionCriteria:task.completionCriteria!,executionTips:task.executionTips!,
    ownerId:"",participantIds:[],labels:[],startDate:"",endDate:"",effortEstimate:task.effortEstimate};
  const created = createWorkspaceTasksFromDraft([],{mainTask:draft,subtasks:[]},{idForIndex:()=>"baseline-task"}).createdNodes[0];
  assert.equal(created.effortBaseline?.minutes,180);
  assert.equal(created.effortBaseline?.at,created.createdAt);
  const restored = JSON.parse(JSON.stringify(created));
  const changed = {...restored,effortEstimate:{...restored.effortEstimate,minutes:240,version:2}};
  const model = getTaskBurnUpModel(getTaskEffortBaselineSeries([changed],new Date(Date.parse(created.createdAt!) + 60000).toISOString()));
  assert.equal(model.points[0].scopeHours,3);
  assert.equal(model.latest?.scopeHours,4);
  assert.equal(model.latest?.completedHours,null);
  assert.equal(created.effortBaseline?.minutes,180);
});

test("父任务只汇总叶子初始总量，缺估不冒充完整总量或完成量", () => {
  const leaf = {...task,id:"leaf-b",effortEstimate:{...task.effortEstimate!,minutes:300}};
  assert.equal(getTaskProgressAssessment(undefined,[task,leaf]).scopeHours,8);
  const partial = getTaskProgressAssessment(undefined,[task,{id:"unknown"}]);
  assert.equal(partial.progressRatio,null);
  assert.equal(partial.scopeHours,null);
  const stale = {...task,goal:"改变后的范围"};
  assert.equal(getTaskProgressAssessment(undefined,[stale]).state,"stale");
  const noDate = {...task,createdAt:undefined,effortEstimate:{...task.effortEstimate!,version:2,
    scopeKey:getEffortScopeKey(task,task.effortEstimate!.workMethod)}};
  assert.equal(getTaskProgressAssessment(undefined,[noDate]).burnUp.points.length,1);
});

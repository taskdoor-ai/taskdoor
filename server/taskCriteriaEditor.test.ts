import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
test("完成标准默认完整可读，编辑表单按需打开", async () => {
  assert.ok(existsSync(new URL("../src/components/TaskCriteriaEditor.tsx", import.meta.url)), "应有共享完成标准编辑器");
  const { TaskCriteriaEditor } = await import("../src/components/TaskCriteriaEditor.tsx");
  const html = renderToStaticMarkup(createElement(TaskCriteriaEditor, { criteria: ["首条标准", "第二条标准", "第三条标准"], label: "测试子任务", onSave: () => undefined }));
  assert.match(html, /<li>首条标准<\/li><li>第二条标准<\/li><li>第三条标准<\/li>/);
  assert.match(html, /共 3 条/);
  assert.match(html, /aria-label="编辑测试子任务的完成标准"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /首条标准；第二条标准/);
  assert.doesNotMatch(html, /<textarea|<details|type="checkbox"|展开查看|ad-accordion/);
});

test("空标准提供明确编辑入口，只读时不伪造可保存能力", async () => {
  assert.ok(existsSync(new URL("../src/components/TaskCriteriaEditor.tsx", import.meta.url)));
  const { TaskCriteriaEditor } = await import("../src/components/TaskCriteriaEditor.tsx");
  const empty = renderToStaticMarkup(createElement(TaskCriteriaEditor, { criteria: [], label: "新任务", onSave: () => undefined }));
  assert.match(empty, /尚未填写完成标准/);
  assert.match(empty, /aria-label="编辑新任务的完成标准"/);
  const readonly = renderToStaticMarkup(createElement(TaskCriteriaEditor, { criteria: ["A", "B"], label: "只读任务" }));
  assert.match(readonly, /<li>A<\/li><li>B<\/li>/);
  assert.doesNotMatch(readonly, /<button|<textarea|展开查看|展开编辑/);
});

test("详情头部完成标准直接逐行编辑，并与创建页共用添加一行交互", async () => {
  const { TaskCompletionCriteria } = await import("../src/components/TaskCompletionCriteria.tsx");
  const empty = renderToStaticMarkup(createElement(TaskCompletionCriteria, { criteria: [], label: "收尾任务", onSave: () => undefined }));
  assert.equal((empty.match(/<textarea\b/g) ?? []).length, 1);
  assert.match(empty, /aria-label="收尾任务完成标准 1"/);
  assert.match(empty, />添加完成标准<\/button>/);
  assert.doesNotMatch(empty, /尚未设置完成标准|新增收尾任务的完成标准|>编辑<|>保存<|>取消<|checkbox/);
  const existing = renderToStaticMarkup(createElement(TaskCompletionCriteria, { criteria: ["核对交付内容", "保留验证证据", "完成结果复核"], onSave: () => undefined }));
  assert.equal((existing.match(/<textarea\b/g) ?? []).length, 3);
  for (const value of ["核对交付内容", "保留验证证据", "完成结果复核"]) assert.match(existing, new RegExp(value));
  assert.match(existing, /aria-label="添加当前任务完成标准"/);
  assert.match(existing, /aria-label="删除当前任务完成标准 3"/);
  assert.doesNotMatch(existing, /编辑当前任务的完成标准|>编辑<|>保存<|>取消<|执行建议|先核对输入|checkbox|已验收/);
  const readonly = renderToStaticMarkup(createElement(TaskCompletionCriteria, { criteria: [] }));
  assert.doesNotMatch(readonly, /<button|新增完成标准/);
});

test("创建子任务即时同步，列表不展开标准，进入详情后仍可编辑", () => {
  assert.ok(read("components/TaskCreationPlanEditor.tsx").includes("<TaskCreationSubtaskEditor"));
  assert.ok(read("components/TaskCreationPlanEditor.tsx").includes("syncCreationSubtaskEdit"));
  assert.ok(!read("components/TaskSubtaskList.tsx").includes("TaskCriteriaEditor"));
  assert.ok(read("components/TaskDetail.tsx").includes("<TaskCompletionCriteria"));
  assert.ok(read("components/TaskDetail.tsx").includes("onTaskCriteriaSave"));
  const app = read("App.tsx");
  assert.ok(app.includes("applySavedTaskCriteria"));
  assert.ok(app.includes("onTaskCriteriaSave={saveTaskCriteria}"));
});

test("创建最终确认不能忽略未能同步的输入", () => {
  const page = read("components/TaskCreationPage.tsx");
  assert.ok(page.includes("hasUnsavedSubtasks"));
  assert.ok(page.includes("onSubtaskDirtyChange"));
  assert.ok(page.includes("子任务有未能同步的修改，请展开核对"));
  assert.match(page, /const openScenario = [\s\S]*?if \(hasUnsavedSubtasks\)/);
});

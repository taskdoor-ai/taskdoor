import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const tasks = [{ id: "a", title: "脚本终审", owner: "陈默", status: "进行中" as const, dueAt: "", goal: "" }, { id: "b", title: "合规审核", owner: "林洁", status: "已完成" as const, dueAt: "", goal: "" }];

test("详情展示前置名称、状态、编辑入口，失效引用不冒充无依赖", async () => {
  const { TaskDependenciesField } = await import("../src/components/TaskDependenciesField.tsx");
  const html = renderToStaticMarkup(createElement(TaskDependenciesField, { taskId: "current", dependencyIds: ["a", "b", "missing"], tasks, onOpenTask: () => {}, onSave: () => {} }));
  assert.match(html, /前置依赖/);
  assert.match(html, /打开前置任务：脚本终审/);
  assert.match(html, /进行中/);
  assert.match(html, /已完成/);
  assert.match(html, /任务不可用 · 待核对/);
  assert.match(html, /编辑前置依赖/);
  assert.doesNotMatch(html, /task-dependencies-note|建议核对/);
  assert.doesNotMatch(html, /不能开始|才能开始|无前置依赖/);
});

test("没有依赖时提供轻量添加入口，无编辑权限不展示空区块", async () => {
  const { TaskDependenciesField } = await import("../src/components/TaskDependenciesField.tsx");
  const props = { taskId: "current", dependencyIds: [], tasks };
  assert.equal(renderToStaticMarkup(createElement(TaskDependenciesField, props)), "");
  const editable = renderToStaticMarkup(createElement(TaskDependenciesField, { ...props, onSave: () => {} }));
  assert.match(editable, /task-detail-field-label">前置依赖/);
  assert.match(editable, /添加前置依赖/);
  assert.doesNotMatch(editable, /task-dependencies-chips/);

  const css = readFileSync(new URL("../src/styles/task-dependencies.css", import.meta.url), "utf8");
  const addButtonRule = css.match(/(?:^|\n)\.task-dependencies-edit\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(addButtonRule, /color:\s*var\(--ad-ink-tertiary\)/);
  assert.doesNotMatch(addButtonRule, /color:\s*var\(--ad-route\)/);
});

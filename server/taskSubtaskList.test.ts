import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskSubtaskList } from "../src/components/TaskSubtaskList.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const tasks = [
  { completionCriteria: ["脚本评审通过"], dependsOnTaskIds: ["live"], dueAt: "8 月 31 日", goal: "确认脚本", id: "script", owner: "陈默", status: "进行中" as const, title: "脚本终审" },
  { dueAt: "未设置", goal: "准备直播", id: "live", owner: "林洁", status: "待开始" as const, title: "直播准备" },
];

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}

test("子任务列表保留图标、名称与负责人，只补充前置未完成提醒", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { onOpenTask: () => undefined, tasks }));
  assert.match(html, /task-icon/);
  assert.match(html, /脚本终审/);
  assert.match(html, /直播准备/);
  assert.match(html, /陈默/);
  assert.match(html, /林洁/);
  assert.match(html, /data-task-id="script"/);
  assert.doesNotMatch(html, /进行中|待开始|8 月 31 日|未设置|脚本评审通过|完成标准|更多选项/);
  assert.match(html, /前置依赖：1 项未完成/);
  assert.equal((html.match(/<button\b/g) ?? []).length, 2, "每项只有名称这个打开入口");
});

test("子任务前置完成后提醒消失，不可见前置保留待核对", () => {
  const completed = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks, dependencyTasks: [{ ...tasks[1], status: "已完成" }] }));
  assert.doesNotMatch(completed, /项未完成/);
  const missing = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], dependsOnTaskIds: ["missing"] }] }));
  assert.match(missing, /前置依赖：1 项待核对/);
});

test("负责人提议保留待接受口径，不冒充正式负责人", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], owner: "", proposedOwnerId: "林洁" }] }));
  assert.match(html, /林洁/);
  assert.match(html, /待接受/);
  assert.doesNotMatch(html, /陈默|待定/);
});

test("已有正式负责人时变更提议不能遮住当前负责人", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], proposedOwnerId: "林洁" }] }));
  assert.match(html, /陈默/);
  assert.doesNotMatch(html, /林洁|待接受/);
});

test("无负责人显示待定，无直接子任务时展示空状态", () => {
  const unassigned = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ ...tasks[0], owner: "" }] }));
  assert.match(unassigned, /待定/);
  const empty = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [] }));
  assert.match(empty, /当前任务还没有子任务/);
  assert.doesNotMatch(empty, /task-subtask-list-items/);
});

test("缺少打开回调时名称不可交互", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks }));
  assert.equal((html.match(/disabled=""/g) ?? []).length, tasks.length);
});

test("点击名称会传出对应的直接子任务 ID", () => {
  const openedTaskIds: string[] = [];
  const list = TaskSubtaskList({ onOpenTask: (taskId) => openedTaskIds.push(taskId), tasks });
  const buttons = elements(list, node => node.type === "button");
  assert.equal(buttons.length, 2);
  buttons[1].props.onClick();
  assert.deepEqual(openedTaskIds, ["live"]);
});

import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskSubtaskList } from "../src/components/TaskSubtaskList.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const tasks = [
  { dueAt: "8 月 31 日", goal: "确认脚本", id: "script", owner: "陈默", status: "进行中" as const, title: "脚本终审" },
  { dueAt: "未设置", goal: "准备直播", id: "live", owner: "林洁", status: "待开始" as const, title: "直播准备" },
];

test("子任务列表展示传入的直接子任务及核心元信息", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { onOpenTask: () => undefined, tasks }));
  assert.match(html, /脚本终审/);
  assert.match(html, /直播准备/);
  assert.match(html, /陈默/);
  assert.match(html, /8 月 31 日/);
  assert.match(html, /data-task-id="script"/);
});

test("无直接子任务时展示空状态", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [] }));
  assert.match(html, /当前任务还没有子任务/);
  assert.doesNotMatch(html, /task-subtask-list-items/);
});

test("缺少打开回调时列表项不可交互", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks }));
  assert.match(html, /disabled=""/);
});

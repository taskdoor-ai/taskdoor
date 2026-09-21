import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskSubtaskList } from "../src/components/TaskSubtaskList.tsx";
(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("新子任务列表只展示名称与正式负责人，不展开完成标准", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [{ id: "new", title: "交付脚本", goal: "主任务目标", completionCriteria: ["脚本评审通过"], owner: "林洁", dueAt: "未设置", status: "待开始" }] }));
  assert.ok(html.includes("交付脚本"));
  assert.ok(html.includes("林洁"));
  assert.ok(!html.includes("待接受"));
  assert.ok(!html.includes("脚本评审通过"));
  assert.ok(!html.includes("完成标准"));
  assert.ok(!html.includes('aria-label="查看的人员信息"'));
});

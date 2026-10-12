import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
let labels: typeof import("../src/features/tasks/components/TaskDetailTabLabel.tsx") | undefined;
try { labels = await import("../src/features/tasks/components/TaskDetailTabLabel.tsx"); }
catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ERR_MODULE_NOT_FOUND")) throw error; }

test("已知空讨论显示 0，未知数量不伪装成空内容", () => {
  assert.ok(labels, "任务 Tab 需要内容数量展示");
  const empty = renderToStaticMarkup(createElement(labels.TaskDetailTabLabel, { label: "讨论", count: 0 }));
  const unknown = renderToStaticMarkup(createElement(labels.TaskDetailTabLabel, { label: "讨论", count: null }));
  assert.match(empty, />0<\/span>/);
  assert.doesNotMatch(unknown, /task-detail-tab-count/);
  assert.equal(labels.describeTaskDetailTab("讨论", null, "zh-CN"), "讨论");
});

test("累计数量超过99显示99+，提示保留真实数量", () => {
  assert.ok(labels, "任务 Tab 需要显示累计数量");
  for (const count of [99, 100, 123]) {
    const html = renderToStaticMarkup(createElement(labels.TaskDetailTabLabel, { label: "文件", count }));
    assert.match(html, count === 99 ? />99<\/span>/ : />99\+<\/span>/);
    assert.equal(labels.describeTaskDetailTab("文件", count, "zh-CN"), `文件，${count}`);
  }
  const html = renderToStaticMarkup(createElement(labels.TaskDetailTabLabel, { label: "文件", count: 123 }));
  assert.doesNotMatch(html, /tabindex=/i, "数量不产生额外键盘停靠点");
});

test("Tab仅展示数量，英文名称使用同一规则", () => {
  assert.ok(labels, "任务 Tab 需要累计数量展示");
  const html = renderToStaticMarkup(createElement(labels.TaskDetailTabLabel, { label: "Discussion", count: 5 }));
  assert.doesNotMatch(html, /task-detail-tab-unread|new discussion/i);
  assert.equal(labels.describeTaskDetailTab("Discussion", 5, "en"), "Discussion, 5");
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskActivityLog } from "../src/components/TaskActivityLog.tsx";
import { TaskDiscussion } from "../src/components/TaskDiscussion.tsx";
import type { TaskActivityMock, TaskFileNode } from "../src/data/taskDetailMocks.ts";

const base: TaskActivityMock = { id: "status", type: "status-change", author: "周岚", message: "更新任务状态", time: "2026-08-31 10:30:00", createdAt: "2026-08-31T02:30:00Z", changes: [{ label: "状态", before: "进行中", after: "已阻塞" }] };
const readStyle = () => readFileSync(new URL("../src/styles/task-records.css", import.meta.url), "utf8");

test("任务活动固定渲染任务信息、讨论与文件三类胶囊和筛选", () => {
  const html = renderToStaticMarkup(createElement(TaskActivityLog, {
    activities: [
      base,
      { ...base, id: "schedule", type: "schedule-change", message: "修改任务时间" },
      { ...base, id: "discussion", type: "member-post", message: "请核对本轮交付范围", changes: undefined },
      { ...base, id: "insight", type: "ai-insight", message: "不应进入任务活动的 AI 建议" },
    ],
    commits: [{ id: "commit", author: "周岚", message: "更新交付文件", time: "刚刚", files: [] }],
    files: [],
    onOpenDiscussion: () => undefined,
    onOpenFile: () => undefined,
  }));
  assert.match(html, /<h2>任务活动<\/h2>/);
  assert.match(html, /<button(?=[^>]*aria-label="活动类型")(?=[^>]*data-slot="select-trigger")[^>]*>/);
  assert.match(html, /data-slot="select-value"[^>]*>全部活动<\/span>/);
  assert.match(html, /workspace-filter-control/);
  assert.doesNotMatch(html, /<select[^>]*aria-label="活动类型"/);
  const source = readFileSync(new URL("../src/components/TaskActivityLog.tsx", import.meta.url), "utf8");
  assert.match(source, /<ListFilterSelect\b/);
  for (const [value, label] of [["all", "全部活动"], ["task", "任务信息"], ["discussion", "讨论"], ["file", "文件"]]) {
    assert.ok(source.includes(`<SelectItem value="${value}">${label}</SelectItem>`));
  }
  assert.match(html, /task-change-kind task-change-kind--task[^>]*>任务信息<\/span>/);
  assert.match(html, /task-change-kind task-change-kind--discussion[^>]*>讨论<\/span>/);
  assert.match(html, /task-change-kind task-change-kind--file[^>]*>文件<\/span>/);
  assert.match(html, /task-change-action[^>]*>更新任务状态<\/span>/);
  assert.match(html, /task-change-action[^>]*>发布了讨论<\/span>/);
  assert.match(html, />查看讨论<\/button>/);
  assert.doesNotMatch(html, /不应进入任务活动的 AI 建议/);

  const css = readStyle();
  assert.match(css, /\.task-change-kind\s*\{[^}]*border-radius:\s*var\(--ad-radius-pill\)/s);
  assert.match(css, /\.task-change-kind--task[^}]*var\(--ad-tag-blue-bg\)/s);
  assert.match(css, /\.task-change-kind--discussion[^}]*var\(--ad-tag-teal-bg\)/s);
  assert.match(css, /\.task-change-kind--file[^}]*var\(--ad-tag-purple-bg\)/s);
  assert.match(css, /\.task-change-discussion-link:focus-visible[^}]*outline:/s);
});

test("只读任务变更被定位时不绘制可选中的整条蓝框", () => {
  const css = readStyle();
  assert.match(css, /\.task-change-event:focus\s*\{[^}]*outline:\s*none/s);
  assert.doesNotMatch(css, /\.task-change-event:focus[^}]*outline:\s*2px\s+solid\s+var\(--ad-focus\)/s);
});

test("活动同时渲染任务信息前后值与讨论摘要，不混入 AI 正文", () => {
  const html = renderToStaticMarkup(createElement(TaskActivityLog, {
    activities: [base, { ...base, id: "comment", type: "member-post", message: "只属于人的讨论内容", changes: undefined }, { ...base, id: "ai", type: "ai-insight", message: "不属于任务变更的AI判断" }],
    commits: [], files: [], onOpenDiscussion: () => undefined, onOpenFile: () => undefined,
  }));
  assert.doesNotMatch(html, /条记录/);
  assert.match(html, /变更前：/);
  assert.match(html, /进行中/);
  assert.match(html, /变更后：/);
  assert.match(html, /已阻塞/);
  assert.match(html, /2026-08-31T02:30:00Z/);
  assert.match(html, /只属于人的讨论内容/);
  assert.match(html, /查看讨论/);
  assert.doesNotMatch(html, /不属于任务变更的AI判断|contenteditable|发送讨论|发送回复/);
});

test("旧记录保留事件内容，但不展示无精确时间的旧时间与分区说明", () => {
  const html = renderToStaticMarkup(createElement(TaskActivityLog, {
    activities: [{ id: "legacy", type: "schedule-change", author: "陈默", message: "调整了计划截止时间", time: "今天 09:42" }, base],
    commits: [], files: [], onOpenDiscussion: () => undefined, onOpenFile: () => undefined,
  }));
  assert.ok(html.indexOf('id="task-activity-status"') < html.indexOf('id="task-activity-legacy"'));
  assert.match(html, /调整了计划截止时间/);
  assert.doesNotMatch(html, /历史记录|原时间：|未保存精确发生时间|今天 09:42/);
  const legacyMarkup = html.slice(html.indexOf('id="task-activity-legacy"'));
  assert.doesNotMatch(legacyMarkup, /task-change-values/);
});

test("没有三类活动时展示真实空态，不用 AI 建议补齐", () => {
  const html = renderToStaticMarkup(createElement(TaskActivityLog, { activities: [{ ...base, type: "ai-insight" }], commits: [], files: [], onOpenDiscussion: () => undefined, onOpenFile: () => undefined }));
  assert.match(html, /还没有任务活动/);
  assert.doesNotMatch(html, /条记录/);
  assert.doesNotMatch(html, /task-change-event/);
});

test("提交保留稳定事件ID，缺失的来源文件明确不可点击", () => {
  const html = renderToStaticMarkup(createElement(TaskActivityLog, {
    activities: [], files: [], onOpenDiscussion: () => undefined, onOpenFile: () => undefined,
    commits: [{ id: "commit-original", author: "陈默", time: "昨天", message: "更新任务的交付文件", files: ["原始交付.md"] }],
  }));
  assert.match(html, /id="task-commit-commit-original"/);
  assert.match(html, /提交了文件/);
  assert.match(html, /文件不可用：原始交付.md/);
  assert.match(html, /disabled=""/);
});

test("旧 AI 记录下的真人回复保留原文和附件入口", () => {
  const source: TaskActivityMock = { id: "ai-source", author: "任务助理", type: "ai-insight", time: "昨天", message: "请核对交付规范", file: "交付规范.md" };
  const reply: TaskActivityMock = { id: "human-reply", author: "周岚", type: "member-reply", time: "6 分钟前", message: "已核对规范", replyToActivityId: source.id };
  const file: TaskFileNode = { id: "spec-file", kind: "file", parentId: null, name: "交付规范.md", updatedAt: "昨天" };
  const html = renderToStaticMarkup(createElement(TaskDiscussion, { activities: [source, reply], files: [file], currentUser: "周岚", people: [], onOpenFile: () => undefined, onPost: () => undefined }));
  assert.match(html, /id="task-activity-human-reply"/);
  assert.match(html, /请核对交付规范/);
  assert.match(html, /已核对规范/);
  assert.match(html, /查看文件：交付规范.md/);
  assert.doesNotMatch(html, /文件不可用：交付规范.md/);
});

test("讨论和回复对旧相对时间明确标注原时间，真实时间仍保留 dateTime", () => {
  const root: TaskActivityMock = { id: "human", author: "周岚", type: "member-post", time: "6 分钟前", message: "旧讨论" };
  const reply: TaskActivityMock = { ...root, id: "reply", type: "member-reply", time: "刚刚", message: "旧回复", replyToActivityId: root.id };
  const current: TaskActivityMock = { ...base, id: "current", type: "member-post", message: "今日讨论" };
  const html = renderToStaticMarkup(createElement(TaskDiscussion, { activities: [root, reply, current], files: [], currentUser: "周岚", people: [], onOpenFile: () => undefined, onPost: () => undefined }));
  assert.match(html, /原时间：6 分钟前/);
  assert.match(html, /原时间：刚刚/);
  assert.match(html, /dateTime="2026-08-31T02:30:00Z"/i);
  assert.doesNotMatch(html, /原时间：2026-08-31 10:30:00/);
});

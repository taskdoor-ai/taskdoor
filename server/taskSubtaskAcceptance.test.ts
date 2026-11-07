import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SubtaskSuggestion } from "../src/features/tasks/lib/task-subtask-suggestions.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskSubtaskSuggestions } = await import("../src/features/tasks/components/TaskSubtaskSuggestions.tsx");
const { TaskDiscussionMessage } = await import("../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx");
const { TaskDiscussionTaskLinks } = await import("../src/features/tasks/discussion/components/TaskDiscussionTaskLinks.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

type Element = ReactElement<Record<string, unknown>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const result: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, unknown>>(child)) return;
    if (match(child)) result.push(child);
    result.push(...elements(child.props.children as ReactNode, match));
  });
  return result;
}
function capture(render: () => ReactNode) {
  let tree: ReactNode;
  function Capture() { tree = render(); return tree; }
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return { tree: tree!, html };
}
const first: SubtaskSuggestion = {
  id: "prepared", title: "完成本轮页面修订", goal: "让参与者能清晰核对讨论中的修订结果。",
  completionCriteria: ["缩略图、预览和文件列表按本轮讨论确认"], ownerId: "fio", endDate: "",
  source: { taskId: "parent", messageId: "message", author: "fio", body: "我来统一跟进本轮修订", itemKey: "revisions" }, contextKey: "context",
};
const second = { ...first, id: "other", title: "补充修订说明" };
const members = [{ id: "fio", name: "Fio", email: "fio@example.com", role: "" }];
const props = {
  suggestions: [first], members, onDismissSelected: () => true,
  onConfirm: async () => undefined,
};

test("页签建议只显示名称负责人及添加/忽略，点击添加只保存当前项且防连续提交", async () => {
  const created: string[][] = [];
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const { tree, html } = capture(() => TaskSubtaskSuggestions({ ...props, suggestions: [first, second], onConfirm: async ids => { created.push(ids); await pending; } }));
  const buttons = elements(tree, item => item.type === "button");
  const create = buttons.find(item => item.props["aria-label"] === `添加子任务：${first.title}`)!;
  assert.ok(create);
  assert.equal(buttons.length, 4);
  assert.match(html, /Fio/);
  assert.match(html, /person-avatar/);
  assert.match(html, /AI 建议的子任务/);
  assert.match(html, /完成本轮页面修订/);
  assert.doesNotMatch(html, /接受建议|调整|全选|已选|待确认|<textarea|<input|<summary/);
  assert.doesNotMatch(html, /让参与者能清晰核对|缩略图、预览和文件列表按本轮讨论确认/);
  assert.doesNotMatch(html, /task-status-control|task-status-badge/);
  assert.equal(elements(tree, item => item.type === "h3").length, 1);
  (create.props.onClick as () => void)();
  (create.props.onClick as () => void)();
  assert.deepEqual(created, [[first.id]]);
  finish();
  await pending;
});

test("每项忽略只处理本项，不出现勾选批量或任务表单", () => {
  const removed: string[][] = [];
  const { tree, html } = capture(() => TaskSubtaskSuggestions({ ...props, suggestions: [first, second], onDismissSelected: ids => { removed.push(ids); return true; } }));
  assert.match(html, /补充修订说明/);
  assert.doesNotMatch(html, /全选|已选|接受|<input|<textarea/);
  const remove = elements(tree, item => item.type === "button" && item.props["aria-label"] === `忽略：${second.title}`)[0];
  (remove.props.onClick as () => void)();
  assert.deepEqual(removed, [[second.id]]);
});

test("只读建议只有名称负责人且无创建或忽略动作", () => {
  const { tree, html } = capture(() => TaskSubtaskSuggestions({ ...props, disabled: true }));
  assert.match(html, /完成本轮页面修订/);
  assert.match(html, /仅可查看/);
  assert.equal(elements(tree, item => item.type === "button").length, 0);
});

const discussionProps = {
  message: { id: "source", author: "Fio", type: "member-post" as const, message: "这轮统一跟进", time: "今天" },
  currentUser: "current", files: [], now: Date.now(), onReply: () => undefined, onLocate: () => undefined, onOpenFile: () => undefined,
};
const savedTask = { id: "saved", title: first.title, ownerId: "fio", status: "进行中" as const };

test("建议和已创建子任务使用独立收起入口及各自内容，子任务入口仅图标加数量", () => {
  const marker = createElement("span", { "data-suggestion-marker": true }, "名称和负责人");
  const { tree, html } = capture(() => TaskDiscussionMessage({
    ...discussionProps, followups: { tasks: [savedTask], suggestionCount: 1 }, renderSuggestions: () => marker,
  }));
  const ai = elements(tree, item => item.props.className === "task-discussion-ai-suggestions-trigger")[0];
  const tasks = elements(tree, item => item.props.className === "task-discussion-subtasks-trigger")[0];
  assert.equal(ai.props["aria-expanded"], false);
  assert.equal(ai.props["data-has-suggestions"], true);
  assert.equal(tasks.props["aria-expanded"], false);
  assert.notEqual(ai.props["aria-controls"], tasks.props["aria-controls"]);
  const footer = elements(tree, item => item.type === "footer")[0];
  assert.equal(elements(footer.props.children as ReactNode, item => item.props.className === "task-discussion-followup-entries").length, 1);
  assert.match(renderToStaticMarkup(ai), /从讨论创建任务/);
  assert.doesNotMatch(renderToStaticMarkup(ai), /项待处理建议|task-discussion-ai-suggestions-count/);
  const taskButton = renderToStaticMarkup(tasks);
  assert.match(taskButton, /子任务：1/);
  assert.match(taskButton, /lucide-list-tree/);
  assert.match(taskButton, />1<\/span>/);
  assert.doesNotMatch(taskButton, /关联|建议创建任务|Linked/);
  const aiPanel = elements(tree, item => item.props.id === ai.props["aria-controls"])[0];
  const tasksPanel = elements(tree, item => item.props.id === tasks.props["aria-controls"])[0];
  assert.equal(aiPanel.props.hidden, true);
  assert.equal(tasksPanel.props.hidden, true);
  assert.equal(elements(aiPanel.props.children as ReactNode, item => item.props["data-suggestion-marker"] === true).length, 1);
  assert.equal(elements(tasksPanel.props.children as ReactNode, item => item.props["data-suggestion-marker"] === true).length, 0);
  assert.equal(elements(aiPanel.props.children as ReactNode, item => item.type === TaskDiscussionTaskLinks).length, 0);
  assert.equal(elements(tasksPanel.props.children as ReactNode, item => item.type === TaskDiscussionTaskLinks).length, 1);
  assert.doesNotMatch(html, /接受建议|调整|项子任务建议/);
});

test("只有已建子任务不显示AI建议，只有建议不显示空子任务入口", () => {
  const linked = capture(() => TaskDiscussionMessage({ ...discussionProps, followups: { tasks: [savedTask], suggestionCount: 0 } }));
  assert.equal(elements(linked.tree, item => item.props.className === "task-discussion-ai-suggestions-trigger").length, 0);
  assert.equal(elements(linked.tree, item => item.props.className === "task-discussion-subtasks-trigger").length, 1);
  assert.match(linked.html, /完成本轮页面修订|进行中/);
  const pending = capture(() => TaskDiscussionMessage({ ...discussionProps, followups: { tasks: [], suggestionCount: 2 } }));
  assert.equal(elements(pending.tree, item => item.props.className === "task-discussion-subtasks-trigger").length, 0);
  assert.match(pending.html, /从讨论创建任务/);
  assert.doesNotMatch(pending.html, /项待处理建议|task-discussion-ai-suggestions-count/);
});

test("过期内容只保留AI建议已更新标识，无候选和子任务时隐藏整个入口区", () => {
  const stale = capture(() => TaskDiscussionMessage({
    ...discussionProps, followups: { tasks: [], suggestionCount: 0, hasOutdated: true },
    renderSuggestions: () => createElement("p", null, "讨论已更新，建议待重新整理。"),
  }));
  assert.equal(elements(stale.tree, item => item.props.className === "task-discussion-ai-suggestions-trigger").length, 1);
  assert.equal(elements(stale.tree, item => item.props.className === "task-discussion-ai-suggestions-trigger")[0].props["data-has-suggestions"], undefined);
  assert.equal(elements(stale.tree, item => item.props.className === "task-discussion-subtasks-trigger").length, 0);
  assert.match(stale.html, /已更新/);
  assert.doesNotMatch(stale.html, /项待处理建议|创建任务：/);
  const empty = capture(() => TaskDiscussionMessage(discussionProps));
  assert.equal(elements(empty.tree, item => item.props.className === "task-discussion-followups")[0].props.hidden, true);
});

test("已建关联默认单行收起，重新接收当前任务状态和负责人，卡片只读且可打开", () => {
  const opened: string[] = [];
  const task = { id: "saved", title: first.title, ownerId: "fio", status: "进行中" as const, goal: first.goal };
  const initial = capture(() => TaskDiscussionTaskLinks({ tasks: [task], people: members, onOpenTask: id => { opened.push(id); } }));
  assert.match(initial.html, /Fio/);
  assert.match(initial.html, /进行中/);
  assert.equal(elements(initial.tree, item => item.type === "details" && Boolean(item.props.open)).length, 0);
  const summary = elements(initial.tree, item => item.type === "summary")[0];
  assert.equal(elements(summary.props.children as ReactNode, item => item.type === "button").length, 0);
  const open = elements(initial.tree, item => item.type === "button")[0];
  (open.props.onClick as () => void)();
  assert.deepEqual(opened, [task.id]);
  const changed = capture(() => TaskDiscussionTaskLinks({ tasks: [{ ...task, status: "已完成", ownerId: "lan" }], people: [{ id: "lan", name: "周岚", email: "lan@example.com", role: "" }] }));
  assert.match(changed.html, /已完成/);
  assert.match(changed.html, /周岚/);
  assert.doesNotMatch(changed.html, /Fio|进行中|<input|<textarea/);
});

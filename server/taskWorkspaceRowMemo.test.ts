import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`export async function load(url, context, nextLoad) { if(url.endsWith('.css')) return {format:'module',source:'',shortCircuit:true}; return nextLoad(url,context); }`)}`, import.meta.url);
const listModule = import("../src/features/tasks/components/TaskWorkspaceList.tsx");

async function row() {
  const { TaskWorkspaceList } = await listModule;
  const task = { id: "row-task", kind: "task", name: "待核对任务", parentId: "root", updatedAt: "今天 09:20", ownerId: "me", status: "进行中", completionCriteria: ["核对"] } as const;
  const props: any = { projection: { allTasks: [task], visibleTasks: [task], tagFacets: [], allTagsCount: 1, statuses: ["进行中"], statusCounts: { all: 1, byStatus: { "进行中": 1 } } }, currentUserId: "me", filters: { owner: "me", status: "all", tag: "all" }, members: [{ id: "me", name: "当前成员", email: "me@example.com" }], query: "", selectedTaskId: task.id, showingWorkbench: false, scopeCounts: { all: 1, owned: 1, participating: 0 }, onCreateTask() {}, onFiltersChange() {}, onManageTags() {}, onDeleteTask() {}, onTaskSelect() {}, onTaskStatusChange() {}, onQueryChange() {}, onShowWorkbench() {} };
  let tree: ReactNode;
  function Probe() { tree = TaskWorkspaceList(props); return null; }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Probe) }));
  let found: any;
  const visit = (value: ReactNode) => Children.forEach(value, child => {
    if (!isValidElement(child)) return;
    const props = child.props as { task?: { id: string }; children?: ReactNode };
    if (props.task?.id === task.id && typeof child.type === "object" && "compare" in child.type) found = child;
    else visit(props.children);
  });
  visit(tree!);
  assert.ok(found, "列表行应有独立缓存边界，不因整个工作区快照更新而全部重绘");
  return found;
}

test("相同完整任务与进度快照的克隆可复用行，实际字段变化必须更新", async () => {
  const item = await row();
  const same = { ...item.props, task: structuredClone(item.props.task), owner: structuredClone(item.props.owner) };
  assert.equal(item.type.compare(item.props, same), true);
  for (const patch of [{ name: "新名称" }, { goal: "新目标" }, { completionCriteria: ["新标准"] }, { ownerId: "other" }, { status: "已完成" }, { participantIds: ["other"] }, { updatedAt: "刚刚" }]) assert.equal(item.type.compare(item.props, { ...same, task: { ...same.task, ...patch } }), false);
  const history = { ...same, series: { asOf: "2026-10-22", workload: [{ completedMinutes: 30 }] } };
  assert.equal(item.type.compare(history, { ...history, series: structuredClone(history.series) }), true);
  assert.equal(item.type.compare(history, { ...history, series: { ...history.series, workload: [{ completedMinutes: 60 }] } }), false);
});

test("选中、置顶、排序、分钟时钟、人员和事件代理变化不能被缓存吞掉", async () => {
  const item = await row();
  for (const patch of [{ selected: !item.props.selected }, { isPinned: !item.props.isPinned }, { showOwner: !item.props.showOwner }, { sort: "created" }, { now: new Date(item.props.now.getTime() + 60_000) }, { currentUserId: "other" }, { owner: { ...item.props.owner, email: "new@example.com" } }, { actions: { ...item.props.actions, onTaskSelect() {} } }]) assert.equal(item.type.compare(item.props, { ...item.props, ...patch }), false);
});

test("行仍显示名称、状态、选中描述、人员、置顶与更多操作", async () => {
  const item = await row();
  const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(item.type, item.props) }));
  assert.match(html, /aria-label="打开任务：待核对任务"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /状态：进行中/);
  assert.match(html, /负责人：当前成员/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /待核对任务的更多操作/);
  const pinned = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(item.type, { ...item.props, isPinned: true, selected: false, task: { ...item.props.task, name: "更新后任务" } }) }));
  assert.match(pinned, /aria-label="取消置顶: 更新后任务"/);
  assert.doesNotMatch(pinned, /aria-current="page"/);
});

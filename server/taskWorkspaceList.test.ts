import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import type { TaskListProjection } from "../src/lib/taskListProjection.ts";
import { clearedTaskListConditions, type TaskListFilters } from "../src/components/taskListFilters.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);

const task = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({
  id, kind: "task", name: `任务 ${id}`, parentId: "root", updatedAt: "今天 09:20", ownerId: "me", status: "进行中", ...patch,
});
const tags = [{ id: "a", name: "制作", icon: "tag" as const, color: "blue" as const }];
const tasks = [task("first", { goal: "不应挤进左侧的长目标", plannedEndOn: "2026-09-10", labels: ["制作"] }), task("second", { plannedStartOn: "2026-09-01" })];
const projection: TaskListProjection = { allTasks: tasks, visibleTasks: tasks, tagFacets: [{ tag: tags[0], count: 1 }], allTagsCount: 2, statuses: ["进行中"] };
const baseProps = {
  currentUserId: "me",
  filters: { owner: "me", status: "all", tag: "all" } as TaskListFilters,
  members: [{ id: "me", name: "当前成员", email: "me@example.com" }],
  onCreateTask: () => undefined,
  onFiltersChange: () => undefined,
  onManageTags: () => undefined,
  onDeleteTask: () => undefined,
  onTaskSelect: () => undefined,
  onQueryChange: () => undefined,
  onShowWorkbench: () => undefined,
  showingWorkbench: false,
  query: "",
  selectedTaskId: "first" as string | null,
  projection,
  scopeCounts: { all: 4, owned: 2, participating: 1 },
};

async function renderList(patch: Partial<typeof baseProps> = {}) {
  assert.ok(existsSync(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url)), "应提供两栏工作区的紧凑任务列表");
  const { TaskWorkspaceList } = await import(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url).href);
  return renderToStaticMarkup(createElement(TaskWorkspaceList, { ...baseProps, ...patch }));
}

test("明确筛选本人负责时省略重复负责人，其余条件显示负责人", async () => {
  const html = await renderList({ filters: { ...baseProps.filters, ownerIsMe: true } });
  assert.match(html, />任务<\/h1>/);
  assert.match(html, /aria-label="新建任务"/);
  assert.doesNotMatch(html, /aria-label="展开搜索任务"/);
  assert.match(html, /aria-label="搜索任务列表"/);
  assert.doesNotMatch(html, />推荐<\/button>/);
  assert.doesNotMatch(html, /9月10日截止/);
  assert.match(html, /进行中/);
  assert.doesNotMatch(html, /负责人：当前成员/);
  assert.match(html, /aria-label="状态：进行中"/);
  assert.doesNotMatch(html, /<time\b/);
  assert.doesNotMatch(html, /任务标签|task-list-row-secondary|task-status-badge/);
  assert.match(html, /任务 first的更多操作/);
  assert.equal((html.match(/data-task-id="first"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /task-workspace-tag-group|不应挤进左侧的长目标/);
  assert.match(html.match(/<button[^>]*data-task-id="first"[^>]*>/)?.[0] ?? "", /aria-current="page"/);
  for (const condition of [{}, { participantIsMe: true }, { ownerIsMe: true, ownerIds: ["other"] }, { ownerIsMe: true, includeUnassigned: true }]) {
    const teamHtml = await renderList({ filters: { ...baseProps.filters, ...condition } });
    assert.match(teamHtml, /负责人：当前成员/);
    assert.match(teamHtml, /class="person-avatar /);
    assert.match(teamHtml, /data-person-preview-trigger="avatar"/);
    assert.doesNotMatch(teamHtml.match(/<button[^>]*data-task-id="first"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "", /person-avatar/, "人员卡片入口独立于打开任务按钮");
    assert.doesNotMatch(teamHtml, /<time\b/);
  }
});
test("更新时间和创建时间继续用于描述与排序，不在任务行渲染可见时间", async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(18, 10, 0, 0);
  const item = task("timed", { updatedAt: yesterday.toISOString(), createdAt: "今天 08:05" });
  const patch = { projection: { ...projection, allTasks: [item], visibleTasks: [item] } };
  const updated = await renderList(patch);
  assert.doesNotMatch(updated, /<time\b/);
  assert.match(updated, /最后更新：昨天 18:10/);
  const created = await renderList({ ...patch, filters: { ...baseProps.filters, sort: "created" } });
  assert.doesNotMatch(created, /<time\b/);
  assert.match(created, /创建时间：08:05/);
});
test("任务标签不占据任务行，但仍可作为筛选条件", async () => {
  const item = task("multi", { labels: ["制作", "发布", "制作", "审核", "沟通"] });
  const html = await renderList({ filters: { ...baseProps.filters, tags: ["制作"] }, projection: { ...projection, allTasks: [item], visibleTasks: [item] } });
  const row = html.match(/<li class="task-workspace-row-entry"[\s\S]*?<\/li>/)?.[0] ?? "";
  assert.doesNotMatch(row, /制作|发布|审核|沟通|ad-tag-badge/);
  assert.match(html, /筛选任务：已选 1 项条件/);
  assert.doesNotMatch(html, /已选筛选条件|清除标签筛选：制作/);
  assert.equal((html.match(/data-task-id="multi"/g) ?? []).length, 1);
});
test("未分配任务明确显示空缺，不把拟负责人当成正式负责人", async () => {
  const item = task("unassigned", { ownerId: "", proposedOwnerId: "me", createdBy: "me", updatedAt: "导入时" });
  const html = await renderList({ filters: { ...baseProps.filters, view: "all" }, projection: { ...projection, allTasks: [item], visibleTasks: [item] } });
  assert.match(html, /负责人：未分配/);
  assert.doesNotMatch(html, /负责人：当前成员/);
  assert.match(html, /最后更新：时间未知/);
  assert.doesNotMatch(html, /<time\b|>—<\/time>/);
});
test("推荐页不错误高亮某个任务，空筛选保留恢复入口", async () => {
  const html = await renderList({ showingWorkbench: true });
  assert.doesNotMatch(html.match(/<button[^>]*data-task-id="first"[^>]*>/)?.[0] ?? "", /aria-current/);
  const empty = await renderList({ query: "不匹配", projection: { ...projection, visibleTasks: [] } });
  assert.match(empty, /没有匹配的任务/);
  assert.match(empty, />查看全部任务<\/button>/);
});

test("置顶任务进入顶部独立分组且不重复，行级图钉可取消或新增置顶", () => {
  const source = readFileSync(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url), "utf8");
  assert.match(source, /partitionPinnedTasks\(projection\.visibleTasks, pinnedTaskIds\)/);
  assert.match(source, /className="task-workspace-pinned"/);
  assert.match(source, />置顶<\/h2>/);
  assert.match(source, /pinnedTasks\.map\(renderTaskRow\)/);
  assert.match(source, /unpinnedTasks\.map\(renderTaskRow\)/);
  assert.match(source, /aria-pressed=\{isPinned\}/);
  assert.match(source, /isPinned \? "取消置顶" : "置顶"/);
});

test("桌面任务图钉仅在行悬浮时显示，已置顶与键盘聚焦都不常驻", () => {
  const source = readFileSync(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles/task-workspace-list.css", import.meta.url), "utf8");
  assert.match(styles, /\.task-workspace-row-entry:hover\s+\.task-workspace-row-pin[^}]*opacity:\s*1/s);
  assert.doesNotMatch(styles, /\.task-workspace-row-entry:focus-within\s+\.task-workspace-row-pin[^}]*opacity:\s*1/s);
  assert.match(styles, /\.task-workspace-row-pin\[data-pinned\][^}]*color:\s*var\(--ad-route-ink\)/s);
  assert.doesNotMatch(styles, /\.task-workspace-row-pin\[data-pinned\][^}]*(?:opacity|pointer-events):/s);
  assert.doesNotMatch(styles, /\.task-workspace-row-pin:focus-visible[^}]*(?:opacity|pointer-events):/s);
  assert.match(source, /className="task-workspace-row-pin"[^\n]*tabIndex=\{-1\}/);
});

test("任务范围并入外部快捷筛选栏，搜索框只承载关键词", async () => {
  const html = await renderList();
  const styles = readFileSync(new URL("../src/styles/task-workspace-list.css", import.meta.url), "utf8");
  const searchStart = html.indexOf('class="task-search-field"');
  const toolbarStart = html.indexOf('class="task-list-results-toolbar"');
  const scopeStart = html.indexOf('aria-label="任务范围：全部任务"');
  const statusStart = html.indexOf('aria-label="筛选状态：全部状态"');
  const sortStart = html.indexOf('aria-label="任务排序：最近更新"');
  assert.ok(searchStart >= 0 && toolbarStart > searchStart);
  assert.ok(scopeStart > toolbarStart && statusStart > scopeStart && sortStart > statusStart);
  const search = html.slice(searchStart, toolbarStart);
  assert.match(search, /aria-label="搜索任务列表"/);
  assert.doesNotMatch(search, /aria-label="清除搜索"/);
  assert.match(search, /placeholder="输入"/);
  assert.match(styles, /\.task-search-field \[data-slot="input"\][^}]*font-size:\s*12px[^}]*font-weight:\s*400[^}]*color:\s*var\(--ad-ink-secondary\)/s);
  assert.match(styles, /\.task-search-field \[data-slot="input"\]::placeholder[^}]*color:\s*var\(--ad-ink-tertiary\)[^}]*opacity:\s*1/s);
  assert.doesNotMatch(search, /task-scope-switch|我负责的|我参与的|任务范围/);
  const selected = await renderList({ filters: { ...baseProps.filters, scope: "owned" }, query: "发布" });
  assert.match(selected, /aria-label="任务范围：我负责的"/);
  assert.match(selected, /value="发布"/);
  assert.match(selected, /aria-label="清除搜索"/);
});

test("多条件筛选统一入口，保留状态与排序快捷操作", async () => {
  const html = await renderList();
  assert.doesNotMatch(html, /task-list-views|task-list-view-count/);
  assert.match(html, /aria-label="筛选任务"/);
  assert.match(html, /aria-label="筛选状态：全部状态"/);
  assert.doesNotMatch(html, /task-list-status-filters/);
  assert.match(html, /aria-label="任务排序：最近更新"/);
  const selected = await renderList({ filters: { ...baseProps.filters, statuses: ["已阻塞", "进行中"], tags: ["制作"] } });
  assert.match(selected, /aria-label="筛选状态：已阻塞、进行中"/);
  assert.match(selected, />2 个状态</);
  assert.match(selected, /aria-label="筛选任务：已选 3 项条件"/);
  assert.match(selected, /class="task-filter-count">3<\/span>/);
  assert.doesNotMatch(selected, /已选筛选条件|清除标签筛选|清除状态筛选/);
  const incomplete = await renderList({ filters: { ...baseProps.filters, completion: "open" } });
  assert.match(incomplete, /aria-label="筛选状态：待开始、进行中、已阻塞"/);
  assert.doesNotMatch(incomplete, /筛选状态：未完成/, "旧未完成范围用对应的具体状态表示");
});

test("清除全部筛选置于已选条件栏右侧，不占用顶部或独立底栏", () => {
  const source = readFileSync(new URL("../src/components/TaskListFilterPanel.tsx", import.meta.url), "utf8");
  const selectionStart = source.indexOf('className="task-filter-selection"');
  const selectionEnd = source.indexOf("\n      </div>}", selectionStart);
  assert.ok(selectionStart >= 0 && selectionEnd > selectionStart);
  const selection = source.slice(selectionStart, selectionEnd);
  assert.match(selection, /task-filter-reset-all/);
  assert.match(selection, />清除全部<\/button>/);
  assert.doesNotMatch(source, /!selectedCategory && renderResetAllButton\(\)/);
  assert.doesNotMatch(source, /task-filter-detail-heading[^\n]*renderResetAllButton\(\)/);
  assert.doesNotMatch(source, /task-filter-menu-footer/);
});

test("收起筛选器后仅统计可见条件，旧人员条件不占用数量或列表空间", async () => {
  const html = await renderList({ filters: { ...baseProps.filters, ownerIds: ["me"], participantIds: ["former"], includeUnknownCreator: true, deadline: { preset: "today" } } });
  assert.match(html, /筛选任务：已选 1 项条件/);
  assert.match(html, /class="task-filter-count">1<\/span>/);
  assert.doesNotMatch(html, /标题与目标/);
  assert.doesNotMatch(html, /已选筛选条件|task-filter-condition-chip|清除全部筛选/);
});

test("普通列表默认展示团队全部，旧个人范围不再隐藏任务", async () => {
  const { TaskWorkspace } = await import("../src/components/TaskWorkspace.tsx");
  const nodes = [
    task("owned", { name: "发布 A", participantIds: ["me"], labels: ["制作"] }),
    task("done", { name: "发布 B", status: "已完成", labels: ["制作"] }),
    task("participating", { name: "发布 C", ownerId: "other", participantIds: ["me"], labels: ["制作"] }),
    task("other", { name: "其他任务", ownerId: "other" }),
  ];
  const render = (filters: TaskListFilters, query = "") => renderToStaticMarkup(createElement(TaskWorkspace, { ...baseProps, query, filters, nodes, tagDefinitions: tags, hidden: false, workbench: null }));
  for (const view of [undefined, "owned", "participating"] as const) {
    const html = render({ ...baseProps.filters, view });
    assert.equal((html.match(/data-task-id=/g) ?? []).length, 4);
    assert.match(html, /aria-label="任务范围：全部任务"/);
    assert.doesNotMatch(html, /task-list-view-count/);
    assert.match(html, /负责人：other/);
  }
  const filtered = render({ ...baseProps.filters, view: "owned", statuses: ["进行中"], tags: ["制作"] }, "发布");
  assert.equal((filtered.match(/data-task-id=/g) ?? []).length, 2);
  assert.match(filtered, /筛选任务：已选 2 项条件/);
});

test("工作区保留明确的参与人我与状态条件，清除后恢复全部", async () => {
  const { TaskWorkspace } = await import("../src/components/TaskWorkspace.tsx");
  const nodes = [task("owned"), task("participating", { ownerId: "other", participantIds: ["me"] }), task("done", { ownerId: "other", participantIds: ["me"], status: "已完成" }), task("unassigned", { ownerId: "", createdBy: "me" })];
  const render = (filters: TaskListFilters) => renderToStaticMarkup(createElement(TaskWorkspace, { ...baseProps, filters, nodes, tagDefinitions: tags, hidden: false, workbench: null }));
  const selected: TaskListFilters = { ...baseProps.filters, view: "owned", participantIsMe: true, completion: "open" };
  const html = render(selected);
  assert.deepEqual([...html.matchAll(/data-task-id="([^"]+)"/g)].map(match => match[1]), ["participating"]);
  assert.match(html, /任务范围：我参与的/);
  assert.match(html, /筛选任务：已选 3 项条件/);
  assert.match(html, /筛选状态：待开始、进行中、已阻塞/);
  const all = render({ ...selected, ...clearedTaskListConditions });
  assert.equal((all.match(/data-task-id=/g) ?? []).length, 4);
  assert.match(all, /负责人：未分配/);
});


test("任务范围快捷切换结果，不重复计入高级筛选，状态仍可组合", async () => {
  const { TaskWorkspace } = await import("../src/components/TaskWorkspace.tsx");
  const nodes = [task("owned"), task("participating", { ownerId: "other", participantIds: ["me"] }), task("done", { ownerId: "other", participantIds: ["me"], status: "已完成" })];
  const render = (scope: TaskListFilters["scope"], statuses: string[] = []) => renderToStaticMarkup(createElement(TaskWorkspace, { ...baseProps, filters: { ...baseProps.filters, scope, statuses }, nodes, tagDefinitions: tags, hidden: false, workbench: null }));
  const all = render("all");
  assert.equal((all.match(/data-task-id=/g) ?? []).length, 3);
  assert.doesNotMatch(all, /筛选任务：已选|task-filter-count/);
  assert.match(all, /aria-label="任务范围：全部任务"/);
  const owned = render("owned");
  assert.deepEqual([...owned.matchAll(/data-task-id="([^"]+)"/g)].map(match => match[1]), ["owned"]);
  assert.match(owned, /aria-label="任务范围：我负责的"[^>]*data-filtered="true"/);
  assert.doesNotMatch(owned, /筛选任务：已选|task-filter-count/);
  const participating = render("participating", ["进行中"]);
  assert.deepEqual([...participating.matchAll(/data-task-id="([^"]+)"/g)].map(match => match[1]), ["participating"]);
  assert.match(participating, /aria-label="任务范围：我参与的"[^>]*data-filtered="true"/);
  assert.match(participating, /筛选任务：已选 1 项条件/);
});

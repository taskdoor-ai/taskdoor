import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import type { TaskListProjection } from "../src/lib/taskListProjection.ts";
import type { TaskListFilters } from "../src/components/taskListFilters.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const task = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({
  id, kind: "task", name: `任务 ${id}`, parentId: "root", updatedAt: "今天", ownerId: "me", status: "进行中", ...patch,
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
};

async function renderList(patch: Partial<typeof baseProps> = {}) {
  assert.ok(existsSync(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url)), "应提供两栏工作区的紧凑任务列表");
  const { TaskWorkspaceList } = await import(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url).href);
  return renderToStaticMarkup(createElement(TaskWorkspaceList, { ...baseProps, ...patch }));
}

function sourceFile(path: string) {
  const url = new URL(path, import.meta.url);
  assert.ok(existsSync(url), `缺少 ${path}`);
  return readFileSync(url, "utf8");
}

test("个人任务导航只保留推荐与新建入口，并保留可见焦点标题和当前任务", async () => {
  const html = await renderList();
  assert.match(html, /<section aria-label="个人任务导航" class="task-workspace-list"/);
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  const heading = header.match(/<h1[^>]*id="task-workspace-list-heading"[^>]*tabindex="-1"[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? "";
  assert.match(heading, />推荐<\/button>/);
  assert.doesNotMatch(heading, /hidden|sr-only/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(header, /aria-label="新建任务"/);
  assert.match(html, /aria-label="新建任务"/);
  assert.doesNotMatch(html, /看板视图|查看任务看板/);
  assert.match(html, /aria-label="搜索任务列表"/);
  assert.doesNotMatch(html, /我负责的任务|aria-label="按负责人筛选"|aria-label="按标签筛选"/);
  const firstRow = html.match(/<button\b[^>]*data-task-id="first"[^>]*>/)?.[0];
  assert.ok(firstRow);
  assert.match(firstRow, /aria-current="page"/);
  assert.doesNotMatch(html.match(/<button\b[^>]*data-task-id="second"[^>]*>/)?.[0] ?? "", /aria-current/);
  assert.doesNotMatch(html, /不应挤进左侧的长目标|Dashboard|首页|连接 AI/);
});

test("筛选任务收在搜索旁，默认不显示全部标签或重复总量行", async () => {
  const html = await renderList();
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.doesNotMatch(header, /筛选任务|查看任务看板|按标签筛选|当前结果/);
  const options = html.match(/<button\b[^>]*aria-label="筛选任务"[^>]*>/)?.[0] ?? "";
  assert.match(options, /aria-haspopup="dialog"/);
  assert.doesNotMatch(options, /aria-expanded="true"|data-popup-open/);
  assert.doesNotMatch(html, /role="menu"|role="dialog"|全部标签|当前结果 \d+ 项任务|task-workspace-list-summary/);
  assert.ok(html.indexOf('aria-label="搜索任务列表"') < html.indexOf('aria-label="筛选任务"'));
  assert.ok(html.indexOf('aria-label="筛选任务"') < html.indexOf('aria-label="新建任务"'));
  assert.ok(html.indexOf('aria-label="新建任务"') < html.indexOf(header), "新建在筛选右侧的工具行，先于我的工作入口");
  assert.ok(html.indexOf('aria-label="搜索任务列表"') < html.indexOf(header), "搜索和筛选先于我的工作入口");
  assert.doesNotMatch(html, /<footer\b|task-workspace-board-switch|task-workspace-list-footer/);
});

test("搜索或状态生效时才出现结果数，状态可以单独清除", async () => {
  const blocked = task("blocked", { status: "已阻塞", labels: ["制作"] });
  const html = await renderList({
    filters: { ...baseProps.filters, status: "已阻塞" },
    projection: { ...baseProps.projection, allTasks: [...tasks, blocked], visibleTasks: [blocked], statuses: ["进行中", "已阻塞"] },
  });
  assert.match(html, /aria-label="清除状态筛选：已阻塞"/);
  assert.match(html, /当前结果 1 项任务/);
  assert.match(html.match(/<button\b[^>]*aria-label="筛选任务"[^>]*>/)?.[0] ?? "", /data-filter-active="true"/);
  assert.doesNotMatch(html, /全部标签|按负责人筛选/);
  const searched = await renderList({ query: "任务" });
  assert.match(searched, /搜索结果/);
  assert.match(searched, /当前结果 2 项任务/);
  assert.doesNotMatch(searched, /清除状态筛选/);
});

test("多选状态和标签分别呈现可清除条件，未打标签不与普通标签混淆", async () => {
  const html = await renderList({
    filters: { owner: "me", status: "已完成", tag: "旧标签", statuses: ["进行中", "已阻塞"], tags: ["制作"], includeUntagged: true },
  });
  for (const label of ["清除状态筛选：进行中", "清除状态筛选：已阻塞", "清除标签筛选：制作", "清除标签筛选：未打标签"]) {
    assert.ok(html.includes(`aria-label="${label}"`));
  }
  assert.equal((html.match(/class="task-workspace-filter-chip"/g) ?? []).length, 4);
  assert.doesNotMatch(html, /清除状态筛选：已完成|清除标签筛选：旧标签/);
  assert.match(html, /当前结果 2 项任务/);
  assert.match(html, />清除筛选<\/button>/);
});

test("标签折叠分组提供名称与计数，多标签任务仍只有一个入口", async () => {
  const groupedTasks = [task("multi", { labels: ["制作", "发布"] }), task("release", { labels: ["发布"] }), task("untagged")];
  const html = await renderList({
    projection: { ...baseProps.projection, allTasks: groupedTasks, visibleTasks: groupedTasks, tagFacets: [...baseProps.projection.tagFacets, { tag: { id: "b", name: "发布", icon: "tag", color: "blue" }, count: 2 }] },
  });
  for (const label of ["制作", "发布", "未打标签"]) {
    assert.ok(html.includes(`title="${label}"`), `${label} 应有可读分组名`);
    assert.ok(html.includes(`aria-label="${label}中的任务"`));
  }
  for (const node of groupedTasks) assert.equal((html.match(new RegExp(`data-task-id="${node.id}"`, "g")) ?? []).length, 1);
  const controls = [...html.matchAll(/<button\b[^>]*aria-controls="([^"]+)"[^>]*aria-expanded="(?:true|false)"[^>]*>/g)];
  assert.equal(controls.length, 3);
  for (const control of controls) assert.ok(html.includes(`id="${control[1]}"`), "折叠控件应指向对应任务列表");
  assert.equal((html.match(/aria-label="1 项任务"/g) ?? []).length, 3, "分组计数按唯一任务计，不累加第二个标签");
  assert.doesNotMatch(html, /新建分组|按标签筛选/);
});

test("本人创建的未分配任务进入独立待确认负责人分组，不混入标签组", async () => {
  const unassigned = task("unassigned", { createdBy: "me", ownerId: "", labels: ["制作"] });
  const html = await renderList({
    projection: { ...baseProps.projection, allTasks: [tasks[0], unassigned], visibleTasks: [tasks[0], unassigned], allTagsCount: 2 },
  });

  assert.match(html, /title="待确认负责人"/);
  assert.match(html, /aria-label="待确认负责人中的任务"/);
  const pendingGroup = html.match(/<ul aria-label="待确认负责人中的任务"[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? "";
  const taggedGroup = html.match(/<ul aria-label="制作中的任务"[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? "";
  assert.match(pendingGroup, /data-task-id="unassigned"/);
  assert.doesNotMatch(taggedGroup, /data-task-id="unassigned"/);
  assert.equal((html.match(/data-task-id="unassigned"/g) ?? []).length, 1);
});

test("搜索时初始展开所有匹配分组，任务结果不会藏在折叠区", async () => {
  const html = await renderList({ query: "任务" });
  const controls = [...html.matchAll(/<button\b[^>]*aria-controls="([^"]+)"[^>]*aria-expanded="true"[^>]*>/g)];
  assert.equal(controls.length, 2);
  for (const control of controls) {
    const list = html.match(new RegExp(`<ul\\b[^>]*id="${control[1]}"[^>]*>`))?.[0];
    assert.ok(list);
    assert.doesNotMatch(list, /\bhidden(?:=|\s|>)/);
  }
});

test("左侧完整呈现全部筛选结果，不分页也不裁掉超过十条的任务", async () => {
  const manyTasks = Array.from({ length: 14 }, (_, index) => task(`item-${index}`));
  const html = await renderList({ projection: { ...baseProps.projection, allTasks: manyTasks, visibleTasks: manyTasks, allTagsCount: manyTasks.length } });
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 14);
  assert.doesNotMatch(html, /下一页|上一页|分页/);
});

test("任务行只是名称入口，不重复图标、状态、日期或其他详情信息", async () => {
  const html = await renderList();
  const rows = [...html.matchAll(/<button\b[^>]*data-task-id="[^"]+"[^>]*>[\s\S]*?<\/button>/g)].map((match) => match[0]);
  assert.equal(rows.length, 2);
  for (const [index, row] of rows.entries()) {
    assert.match(row, new RegExp(`aria-label="打开任务：${tasks[index].name}"`));
    assert.match(row, new RegExp(`title="${tasks[index].name}"`));
    assert.doesNotMatch(row, /<svg|<img|task-icon|task-status-badge|task-workspace-row-meta|task-workspace-row-due|进行中|截止|9 月|2026-/);
  }
  assert.doesNotMatch(html, /未设置|待排期|暂无任务说明/);
});

test("任务行悬浮菜单提供独立删除入口，不抢占打开任务的点击区域", async () => {
  const html = await renderList();
  for (const item of tasks) assert.match(html, new RegExp(`aria-label="${item.name}的更多操作"`));
  const source = sourceFile("../src/components/TaskWorkspaceList.tsx");
  assert.match(source, /<DropdownMenuTrigger[^>]*className="task-workspace-row-menu-trigger"/);
  assert.match(source, /<DropdownMenuItem[^>]*variant="destructive"[^>]*onClick=\{\(\) => onDeleteTask\(task/);
  assert.match(source, />删除任务</);
  const styles = sourceFile("../src/styles/task-workspace-list.css");
  assert.match(styles, /\.task-workspace-row-entry:hover\s+\.task-workspace-row-menu-trigger[^}]*opacity:\s*1/s);
  assert.doesNotMatch(styles, /\.task-workspace-row-entry:focus-within\s+\.task-workspace-row-menu-trigger/);
  assert.doesNotMatch(styles, /\.task-workspace-row-menu-trigger\[aria-expanded="true"\][^{]*\{[^}]*opacity:\s*1/s);
  assert.match(styles, /\.task-workspace-row-menu-trigger:focus-visible\s*\{[^}]*opacity:\s*1/s);
  assert.match(styles, /@media \(hover: none\)[\s\S]*\.task-workspace-row-menu-trigger[^}]*opacity:\s*1/s);
});

test("空筛选结果提供清除操作，真正空个人范围提供新建操作", async () => {
  const filtered = await renderList({ query: "找不到", projection: { ...baseProps.projection, visibleTasks: [] } });
  assert.match(filtered, /没有匹配的任务/);
  assert.match(filtered, /清除搜索和筛选/);
  const empty = await renderList({ projection: { allTasks: [], visibleTasks: [], allTagsCount: 0, tagFacets: [], statuses: [] } });
  assert.match(empty, /还没有由你负责的任务/);
  assert.doesNotMatch(empty, /清除搜索和筛选/);
  const source = sourceFile("../src/components/TaskWorkspaceList.tsx");
  assert.match(source, /onQueryChange\(""\)/);
  assert.doesNotMatch(source, /owner:\s*"all"|<PersonPicker\b/);
});

test("个人任务索引不再提供看板入口或底部占位", async () => {
  for (const showingWorkbench of [false, true]) {
    const html = await renderList({ showingWorkbench });
    assert.ok(!/看板视图|查看任务看板|<footer\b|task-workspace-board-switch|task-workspace-list-footer/.test(html), "不应渲染看板入口或底部占位");
    assert.equal((html.match(/data-task-id=/g) ?? []).length, tasks.length);
  }
});

test("推荐不受列表筛选影响，激活时不把旧任务误标为当前详情", async () => {
  const html = await renderList({ showingWorkbench: true, query: "不存在", projection: { ...baseProps.projection, visibleTasks: [] } });
  const entry = html.match(/<button\b[^>]*class="task-workspace-my-work"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.match(entry, /aria-current="page"/);
  assert.match(entry, />推荐<\/button>/);
  assert.match(html, /没有匹配的任务/);
  const selected = await renderList({ showingWorkbench: true });
  assert.doesNotMatch(selected.match(/<button\b[^>]*data-task-id="first"[^>]*>/)?.[0] ?? "", /aria-current/);
});

test("筛选变化才重置列表滚动，切换任务或新数组引用不清空上下文", () => {
  const source = sourceFile("../src/components/TaskWorkspaceList.tsx");
  const scrollEffect = source.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\)/);
  assert.ok(scrollEffect, "列表滚动应有明确的筛选变化依赖");
  assert.match(scrollEffect[1], /scrollTop\s*=\s*0/);
  for (const dependency of ["query", "filterKey"]) assert.ok(scrollEffect[2].includes(dependency));
  assert.doesNotMatch(scrollEffect[2], /selectedTaskId|projection|visibleTasks/);
  assert.match(source, /onClick=\{\(\) => onTaskSelect\(task\)\}/);
});

test("列表使用独立滚动、可见焦点和移动端 44px 触摸目标", () => {
  const styles = sourceFile("../src/styles/task-workspace-list.css");
  assert.match(styles, /\.task-workspace-list\s*\{[^}]*min-height:\s*0/s);
  assert.match(styles, /\.task-workspace-list\s*\{[^}]*height:\s*100%/s);
  assert.match(styles, /\.task-workspace-list-scroll\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(styles, /\.task-workspace-row:focus-visible[^{}]*\{[^}]*outline:\s*2px solid var\(--ad-focus\)/s);
  assert.match(styles, /\.task-workspace-row\[aria-current="page"\]\s*\{[^}]*background:\s*var\(--ad-route-soft\)/s);
  assert.match(styles, /\.task-workspace-row-title\s*\{[^}]*text-overflow:\s*ellipsis/s);
  assert.doesNotMatch(styles.match(/\.task-workspace-row\s*\{[^}]*\}/s)?.[0] ?? "", /border-bottom/);
  const mobile = styles.slice(styles.indexOf("@media (max-width: 900px)"));
  assert.match(mobile, /\.task-workspace-list button[^}]*min-height:\s*var\(--ad-control-touch-min\)/s, "移动端导航和分组按钮应有完整触摸区域");
  assert.match(mobile, /min-height:\s*var\(--ad-control-touch-min\)/);
  assert.match(mobile, /min-width:\s*var\(--ad-control-touch-min\)/);
  const source = sourceFile("../src/components/TaskWorkspaceList.tsx");
  assert.match(source, /useResponsiveControlSize\("\(max-width: 900px\)"\)/);
});

test("个人入口与分组使用克制的共同尺度，不恢复独立范围标题或中间分隔", () => {
  const styles = sourceFile("../src/styles/task-workspace-list.css");
  assert.match(styles, /\.task-workspace-list\s*\{[^}]*background:\s*var\(--ad-sidebar\)/s);
  assert.doesNotMatch(styles, /task-workspace-personal-entry|task-workspace-scope-trigger|\.task-workspace-list-filter-row::before/);
  assert.match(styles, /\.task-workspace-my-work\s*\{[^}]*font-size:\s*var\(--ad-text-body-sm\)/s);
  assert.doesNotMatch(styles, /task-workspace-list-footer|task-workspace-board-switch/);
  const header = styles.match(/\.task-workspace-list-header\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.doesNotMatch(header, /border-bottom/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  const source = sourceFile("../src/components/TaskWorkspaceList.tsx");
  assert.match(source, /<Input\b[^>]*className="task-workspace-search"/);
});

test("任务名称使用正文尺度，选中态不叠加阴影、竖线和位移动效", () => {
  const styles = sourceFile("../src/styles/task-workspace-list.css");
  const selectedRow = styles.match(/\.task-workspace-row\[aria-current="page"\]\s*\{[^}]*\}/s)?.[0] ?? "";
  assert.match(selectedRow, /box-shadow:\s*none/);
  assert.doesNotMatch(selectedRow, /inset|border-left/);
  assert.match(styles, /\.task-workspace-row-title\s*\{[^}]*font-size:\s*var\(--ad-text-body-sm\)/s);
  assert.match(styles, /\.task-workspace-row-entry:hover\s+\.task-workspace-row:not\(\[aria-current="page"\]\)\s*\{/);
  assert.doesNotMatch(styles, /\.task-workspace-row-entry:hover\s+\.task-workspace-row\s*\{/);
  assert.doesNotMatch(styles, /translateX\(/);
});

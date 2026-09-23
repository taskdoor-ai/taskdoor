import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import React, { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import type { TaskListFilters } from "../src/components/taskListFilters.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);

const first: TaskNode = { id: "first", kind: "task", parentId: "root", name: "确认发布安排", ownerId: "me", status: "进行中", updatedAt: "今天", labels: ["发布"] };
const second: TaskNode = { ...first, id: "second", name: "整理调研记录", labels: [] };
const props = {
  currentUserId: "me",
  filters: { owner: "me", status: "all", tag: "all" } as TaskListFilters,
  hidden: false,
  members: [{ id: "me", name: "当前成员", email: "me@example.com" }],
  nodes: [first, second],
  onCreateTask: () => {}, onFiltersChange: () => {}, onManageTags: () => {}, onQueryChange: () => {}, onTaskSelect: () => {},
  onShowWorkbench: () => {},
  query: "",
  selectedTaskId: null as string | null,
  showingWorkbench: false,
  showingCreation: false,
  creation: null as ReactNode,
  tagDefinitions: [{ id: "tag-release", name: "发布", icon: "tag", color: "blue" }],
  children: null as ReactNode,
  workbench: createElement("h1", {}, "本人工作摘要") as ReactNode,
};

async function renderWorkspace(patch: Partial<typeof props> = {}) {
  const { TaskWorkspace } = await import(new URL("../src/components/TaskWorkspace.tsx", import.meta.url).href);
  return renderToStaticMarkup(createElement(TaskWorkspace, { ...props, ...patch }));
}

test("未选任务时左侧列表完整可用，右侧只提示选择，不添加 Dashboard", async () => {
  const html = await renderWorkspace();
  assert.match(html, /class="task-workspace" data-mobile-pane="list"/);
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 2);
  assert.match(html, /选择任务，查看详情/);
  assert.doesNotMatch(html, /aria-current="page"|Dashboard|注意力地图|暂无分析/);
});

test("选中后同时输出任务索引与详情，移动端标记显示详情", async () => {
  const html = await renderWorkspace({ selectedTaskId: "first", children: createElement("h1", {}, "已选任务详情") });
  assert.match(html, /data-mobile-pane="detail"/);
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 2);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /已选任务详情/);
  assert.doesNotMatch(html, /选择任务，查看详情|当前任务不在/);
});

test("推荐作为列表上方入口打开右侧摘要，不卸载列表或原详情草稿", async () => {
  const html = await renderWorkspace({ showingWorkbench: true, selectedTaskId: "first", children: createElement("textarea", { defaultValue: "未发送的讨论草稿" }) });
  assert.match(html, /data-mobile-pane="detail"/);
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 2);
  assert.match(html, /<button[^>]*aria-current="page"[^>]*class="task-workspace-my-work"[^>]*>[\s\S]*?推荐[\s\S]*?<\/button>/);
  const workbench = html.match(/<section aria-label="今日建议面板"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(workbench, /hidden/);
  assert.match(html, /本人工作摘要/);
  assert.match(html, /class="task-workspace-detail" hidden=""/);
  assert.match(html, /未发送的讨论草稿/);
  assert.doesNotMatch(html.match(/<button\b[^>]*data-task-id="first"[^>]*>/)?.[0] ?? "", /aria-current/);
});

test("进入原任务详情后我的工作仍挂载并隐藏，保留其展开与阅读状态", async () => {
  const html = await renderWorkspace({ selectedTaskId: "first", children: createElement("h1", {}, "确认发布安排详情") });
  assert.match(html, /class="task-workspace-workbench" hidden=""/);
  assert.match(html, /本人工作摘要/);
  assert.match(html, /确认发布安排详情/);
  assert.doesNotMatch(html.match(/<button\b[^>]*class="task-workspace-my-work"[^>]*>/)?.[0] ?? "", /aria-current/);
});

test("从通知或父子关系打开本人筛选外任务时保留搜索、解释上下文", async () => {
  const html = await renderWorkspace({ query: "发布", selectedTaskId: "second", children: createElement("h1", {}, "整理调研记录详情") });
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 1);
  assert.match(html, /整理调研记录详情/);
  assert.match(html, /role="status">This task is outside the search or filter results\. Your filters are preserved\./);
  assert.doesNotMatch(html, /aria-current="page"/);
});

test("移除看板后列表继续使用本人的搜索及状态范围", async () => {
  const html = await renderWorkspace({
    query: "发布", filters: { owner: "other", status: "进行中", tag: "不存在的旧标签" },
    nodes: [first, second, { ...first, id: "others", ownerId: "other", name: "别人确认发布安排" }, { ...first, id: "done", status: "已完成", name: "已完成的发布安排" }],
  });
  assert.match(html, /data-mobile-pane="list"/);
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 1);
  assert.match(html, /data-task-id="first"/);
  assert.match(html, /选择任务，查看详情/);
  assert.doesNotMatch(html, /整理调研记录|别人确认发布安排|已完成的发布安排/);
  assert.doesNotMatch(html, /看板|task-workspace-board|workspace-task-board/);
});

test("个人索引同时应用状态及标签多选，第二标签匹配不复制任务或丢失无标签任务", async () => {
  const multi: TaskNode = { ...first, id: "multi", name: "发布多标签事项", status: "已阻塞", labels: ["制作", "发布"] };
  const untagged: TaskNode = { ...second, id: "untagged", name: "发布无标签事项" };
  const otherTag: TaskNode = { ...first, id: "other-tag", name: "发布制作事项", labels: ["制作"] };
  const nodes = [first, second, multi, untagged, otherTag,
    { ...first, id: "done", name: "发布已完成事项", status: "已完成" as const },
    { ...first, id: "other-owner", name: "发布他人事项", ownerId: "other" },
  ];
  const filters: TaskListFilters = { owner: "other", status: "已完成", tag: "旧标签", statuses: ["进行中", "已阻塞"], tags: ["发布", "复盘"], includeUntagged: true };
  const tagDefinitions = [...props.tagDefinitions, { id: "tag-making", name: "制作", icon: "tag", color: "blue" }, { id: "tag-review", name: "复盘", icon: "flag", color: "green" }];
  const snapshot = JSON.stringify({ nodes, filters, tagDefinitions });
  const html = await renderWorkspace({ nodes, filters, tagDefinitions, query: "发布", selectedTaskId: otherTag.id, children: createElement("textarea", { defaultValue: "筛选前未发送的讨论草稿" }) });
  const listedIds = [...html.matchAll(/data-task-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...listedIds].sort(), ["first", "multi", "untagged"]);
  const releaseGroup = html.match(/<ul aria-label="发布中的任务"[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? "";
  assert.match(releaseGroup, /data-task-id="first"/);
  assert.match(releaseGroup, /data-task-id="multi"/, "第二个标签命中时在对应筛选组呈现");
  assert.doesNotMatch(html, /aria-label="制作中的任务"/);
  assert.match(html, /aria-label="未打标签中的任务"/);
  assert.match(html, /筛选前未发送的讨论草稿/);
  assert.match(html, /This task is outside the search or filter results\. Your filters are preserved\./);
  assert.equal(JSON.stringify({ nodes, filters, tagDefinitions }), snapshot);
});

test("仅筛未打标签仍能打开原详情，空筛选不影响我的工作或移除隐藏草稿", async () => {
  const filters: TaskListFilters = { ...props.filters, statuses: [], tags: [], includeUntagged: true };
  const detail = createElement("textarea", { defaultValue: "保留的原详情草稿" });
  const untaggedOnly = await renderWorkspace({ filters, selectedTaskId: first.id, children: detail });
  assert.deepEqual([...untaggedOnly.matchAll(/data-task-id="([^"]+)"/g)].map((match) => match[1]), ["second"]);
  assert.match(untaggedOnly, /aria-label="未打标签中的任务"/);
  assert.match(untaggedOnly, /保留的原详情草稿/);
  assert.match(untaggedOnly, /This task is outside the search or filter results\. Your filters are preserved\./);

  const home = await renderWorkspace({ filters: { ...filters, tags: ["不存在"], includeUntagged: false }, showingWorkbench: true, selectedTaskId: first.id, children: detail });
  assert.doesNotMatch(home, /data-task-id=/);
  assert.match(home, /没有匹配的任务/);
  assert.match(home, /class="task-workspace-workbench"><h1>本人工作摘要<\/h1>/);
  assert.match(home, /class="task-workspace-detail" hidden=""/);
  assert.match(home, /保留的原详情草稿/);
});

test("个人列表固定稳定ownerId范围，遗留全部人员或他人筛选不能扩大或缩小个人列表", async () => {
  const nodes = [first, second, { ...first, id: "other", ownerId: "other", name: "别人的任务", participantIds: ["me"] }, { ...first, id: "unassigned", ownerId: "", name: "待接受人选任务" }];
  for (const owner of ["all", "other", "me"]) {
    const filters = { owner, status: "all", tag: "不存在的旧标签" };
    const snapshot = JSON.stringify({ nodes, filters });
    const html = await renderWorkspace({ nodes, filters });
    assert.equal((html.match(/data-task-id=/g) ?? []).length, 2);
    assert.match(html, /data-task-id="first"/);
    assert.match(html, /data-task-id="second"/);
    assert.doesNotMatch(html, /别人的任务|待接受人选任务/);
    assert.equal(JSON.stringify({ nodes, filters }), snapshot);
  }
});

test("当前用户变化后只展示该用户本人任务，不通过成员显示名推断负责人", async () => {
  const html = await renderWorkspace({
    currentUserId: "other",
    members: [...props.members, { id: "other", name: "当前成员", email: "other@example.com" }],
    nodes: [first, { ...second, id: "other", ownerId: "other", name: "另一个人的本人任务" }],
  });
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 1);
  assert.match(html, /data-task-id="other"/);
  assert.doesNotMatch(html, /确认发布安排/);
});

test("通知或前置仍可打开别人原详情，不展示个人列表范围提示", async () => {
  const html = await renderWorkspace({
    nodes: [first, { ...second, id: "outside", ownerId: "other", name: "他人的前置交付" }],
    selectedTaskId: "outside", children: createElement("h1", {}, "他人的前置交付原详情"),
  });
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 1);
  assert.match(html, /他人的前置交付原详情/);
  assert.doesNotMatch(html, /当前任务不在我的任务列表中|task-workspace-filter-note/);
  assert.doesNotMatch(html, /Your filters are preserved|data-task-id="outside"|aria-current="page"/);
});

test("没有本人任务时使用个人空态，不把其他成员任务当作被筛选隐藏", async () => {
  const html = await renderWorkspace({ nodes: [{ ...first, ownerId: "other" }] });
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 0);
  assert.match(html, /还没有由你负责的任务/);
  assert.doesNotMatch(html, /没有匹配的任务|确认发布安排/);
});

test("缺少当前用户ID时不能把未指定Owner的任务纳入个人列表", async () => {
  const html = await renderWorkspace({ currentUserId: "", nodes: [{ ...first, ownerId: "", name: "尚未指定负责人" }] });
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 0);
  assert.doesNotMatch(html, /尚未指定负责人/);
});

test("本人创建的未分配任务可从个人索引找回，其他人的未分配任务不可见", async () => {
  const html = await renderWorkspace({
    nodes: [
      first,
      { ...second, id: "mine-unassigned", name: "我创建的待分配任务", ownerId: "", createdBy: "me" },
      { ...second, id: "other-unassigned", name: "他人创建的待分配任务", ownerId: "", createdBy: "other" },
    ],
  });
  assert.match(html, /data-task-id="mine-unassigned"/);
  assert.match(html, /待确认负责人/);
  assert.doesNotMatch(html, /data-task-id="other-unassigned"|他人创建的待分配任务/);
});

test("创建替换右侧面板，列表、原详情和创建草稿保持挂载；标签页才隐藏工作区", async () => {
  const state = {
    selectedTaskId: "first",
    children: createElement("textarea", { defaultValue: "未发送的讨论草稿" }),
    creation: createElement("textarea", { defaultValue: "未发起的任务需求" }),
  };
  const creating = await renderWorkspace({ ...state, showingCreation: true });
  assert.equal((creating.match(/data-task-id=/g) ?? []).length, 2);
  assert.match(creating, /data-mobile-pane="detail"/);
  assert.match(creating, /class="task-workspace-detail" hidden=""/);
  assert.doesNotMatch(creating.match(/<section aria-label="新建任务面板"[^>]*>/)?.[0] ?? "", /hidden/);
  assert.doesNotMatch(creating.match(/<button\b[^>]*data-task-id="first"[^>]*>/)?.[0] ?? "", /aria-current/);
  assert.match(creating, /未发送的讨论草稿/);
  const detail = await renderWorkspace(state);
  assert.match(detail, /class="task-workspace-creation" hidden=""/);
  assert.match(detail, /未发起的任务需求/);
  const html = await renderWorkspace({ ...state, hidden: true });
  assert.match(html, /class="task-workspace"[^>]*hidden=""/);
  assert.equal((html.match(/data-task-id=/g) ?? []).length, 2);
});

test("两栏独立滚动，窄屏只显示一个面板且详情按容器宽度重排", () => {
  const css = readFileSync(new URL("../src/styles/task-workspace.css", import.meta.url), "utf8");
  assert.match(css, /grid-template-columns: 320px minmax\(0, 1fr\)/);
  assert.match(css, /\.task-workspace\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.task-workspace-detail \{[^}]*overflow: auto;[^}]*container: task-detail-pane \/ inline-size;/s);
  assert.match(css, /@container task-detail-pane \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*data-mobile-pane="detail"[\s\S]*data-mobile-pane="list"[^{]*\{ display: none; \}/);
});

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { getTaskStatusFilters, getTaskTagFilters, taskMatchesListFilters, type TaskListFilters } from "../src/components/taskListFilters.ts";
import type { TagDefinition } from "../src/data/sharedTypes.ts";
import type { TaskNode, WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { buildPersonalTaskTagGroups, isTaskInPersonalIndex } from "../src/lib/taskListProjection.ts";

const tags: TagDefinition[] = [
  { id: "a", name: "制作", icon: "tag", color: "blue" },
  { id: "b", name: "发布", icon: "flag", color: "green" },
  { id: "c", name: "待沟通", icon: "users", color: "gray" },
];
const allFilters: TaskListFilters = { owner: "all", status: "all", tag: "all" };
const task = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({
  id, kind: "task", name: id, parentId: "root", updatedAt: "今天", ownerId: "me", status: "进行中", ...patch,
});

test("个人索引保留本人创建的未分配任务，但不把它算给其他成员", () => {
  assert.equal(isTaskInPersonalIndex(task("owned"), "me"), true);
  assert.equal(isTaskInPersonalIndex(task("mine-unassigned", { ownerId: "", createdBy: "me" }), "me"), true);
  assert.equal(isTaskInPersonalIndex(task("other-unassigned", { ownerId: "", createdBy: "other" }), "me"), false);
  assert.equal(isTaskInPersonalIndex(task("other-owned", { ownerId: "other", createdBy: "me" }), "me"), false);
  assert.equal(isTaskInPersonalIndex(task("missing-user", { ownerId: "", createdBy: "me" }), ""), false);
});

async function project(nodes: WorkspaceNode[], query = "", filters = allFilters, definitions = tags) {
  assert.ok(existsSync(new URL("../src/lib/taskListProjection.ts", import.meta.url)), "应提供任务列表与标签数量的共享纯投影");
  const { buildTaskListProjection } = await import("../src/lib/taskListProjection.ts");
  return buildTaskListProjection(nodes, query, filters, definitions);
}

test("全部任务按 ID 去重且排除目录和文件，结果按任务名称排列", async () => {
  const first = task("z", { name: "Zulu", labels: ["制作"] });
  const result = await project([
    { id: "root", kind: "folder", name: "根目录", parentId: null, updatedAt: "今天" },
    first,
    { ...first, name: "重复记录", labels: ["发布"] },
    { id: "file", kind: "file", name: "附件", parentId: "root", updatedAt: "今天", fileType: "pdf" },
    task("a", { name: "Alpha" }),
  ]);
  assert.deepEqual(result.allTasks.map(({ id }) => id), ["z", "a"]);
  assert.deepEqual(result.visibleTasks.map(({ name }) => name), ["Alpha", "Zulu"]);
  assert.equal(result.allTagsCount, 2);
  assert.deepEqual(result.tagFacets.map(({ count }) => count), [1, 0, 0]);
});

test("标签数量在当前标签筛选之前计算，多标签任务在每个匹配入口只计一次", async () => {
  const nodes = [task("both", { labels: ["制作", "制作", "发布"] }), task("release", { labels: ["发布"] }), task("none")];
  const result = await project(nodes, "", { ...allFilters, tag: "制作" });
  assert.deepEqual(result.visibleTasks.map(({ id }) => id), ["both"]);
  assert.equal(result.allTagsCount, 3);
  assert.deepEqual(result.tagFacets.map(({ tag, count }) => [tag.name, count]), [["制作", 1], ["发布", 2], ["待沟通", 0]]);
  const otherTag = await project(nodes, "", { ...allFilters, tag: "发布" });
  assert.deepEqual(otherTag.visibleTasks.map(({ id }) => id), ["both", "release"]);
  assert.deepEqual(otherTag.tagFacets, result.tagFacets);
});

test("搜索、负责人和状态同时约束结果与标签计数", async () => {
  const result = await project([
    task("match", { name: "Launch brief", labels: ["制作"] }),
    task("other-owner", { name: "Launch contacts", ownerId: "other", labels: ["发布"] }),
    task("other-status", { name: "Launch review", status: "已完成", labels: ["制作"] }),
    task("other-name", { name: "Weekly notes", labels: ["制作"] }),
  ], "  LAUNCH  ", { owner: "me", status: "进行中", tag: "all" });
  assert.deepEqual(result.visibleTasks.map(({ id }) => id), ["match"]);
  assert.equal(result.allTagsCount, 1);
  assert.deepEqual(result.tagFacets.map(({ count }) => count), [1, 0, 0]);
});

test("任务范围胶囊数量沿用其他筛选，并忽略当前任务范围", async () => {
  const projectionModule = await import("../src/lib/taskListProjection.ts");
  assert.equal(typeof projectionModule.buildTaskScopeCounts, "function");
  const nodes = [
    task("owned", { name: "Launch owned", labels: ["制作"] }),
    task("participating", { name: "Launch participating", ownerId: "other", participantIds: ["me"], labels: ["制作"] }),
    task("both", { name: "Launch both", participantIds: ["me"], labels: ["制作"] }),
    task("wrong-tag", { name: "Launch wrong tag", participantIds: ["me"], labels: ["发布"] }),
    task("wrong-status", { name: "Launch done", participantIds: ["me"], labels: ["制作"], status: "已完成" }),
  ];
  const filters: TaskListFilters = { ...allFilters, scope: "owned", statuses: ["进行中"], tags: ["制作"] };
  assert.deepEqual(projectionModule.buildTaskScopeCounts(nodes, "Launch", filters, tags, "me"), { all: 3, owned: 2, participating: 2 });
  assert.deepEqual(projectionModule.buildTaskScopeCounts(nodes, "Launch", filters, tags, ""), { all: 3, owned: 0, participating: 0 });
});

test("无标签和未知标签任务仍能从全部标签找到，不建立虚拟领域标签", async () => {
  const result = await project([task("absent"), task("empty", { labels: [] }), task("unknown", { labels: ["旧标签"] })]);
  assert.equal(result.allTagsCount, 3);
  assert.equal(result.visibleTasks.length, 3);
  assert.deepEqual(result.tagFacets.map(({ tag }) => tag), tags);
  assert.deepEqual(result.tagFacets.map(({ count }) => count), [0, 0, 0]);
});

test("父子任务按各自标签独立匹配，不吞并子任务或自动继承父标签", async () => {
  const nodes = [
    task("parent", { labels: ["制作"] }),
    task("child", { parentTaskId: "parent", labels: ["发布"] }),
    task("child-none", { parentTaskId: "parent" }),
  ];
  const parentTag = await project(nodes, "", { ...allFilters, tag: "制作" });
  assert.deepEqual(parentTag.visibleTasks.map(({ id }) => id), ["parent"]);
  const childTag = await project(nodes, "", { ...allFilters, tag: "发布" });
  assert.deepEqual(childTag.visibleTasks.map(({ id }) => id), ["child"]);
  assert.equal(childTag.visibleTasks[0].parentTaskId, "parent");
  assert.equal(childTag.allTagsCount, 3);
});

test("状态选项保留所有实际状态并复用看板顺序，不随当前筛选丢失", async () => {
  const result = await project([
    task("done", { status: "已完成" }), task("waiting", { status: "待开始" }), task("doing"), task("blocked", { status: "已阻塞" }),
  ], "not-found", { ...allFilters, status: "进行中" });
  assert.deepEqual(result.statuses, ["待开始", "进行中", "已阻塞", "已完成"]);
  assert.equal(result.visibleTasks.length, 0);
  assert.equal(result.allTagsCount, 0);
});

test("投影不修改传入的任务、标签或筛选，空输入保留可用标签入口", async () => {
  const nodes = [task("b", { labels: ["制作"] }), task("a", { labels: ["发布"] })];
  const snapshot = JSON.stringify({ nodes, tags, allFilters });
  await project(nodes);
  assert.equal(JSON.stringify({ nodes, tags, allFilters }), snapshot);
  const empty = await project([]);
  assert.deepEqual(empty.allTasks, []);
  assert.deepEqual(empty.visibleTasks, []);
  assert.deepEqual(empty.statuses, []);
  assert.equal(empty.allTagsCount, 0);
  assert.equal(empty.tagFacets.length, tags.length);
  assert.ok(empty.tagFacets.every(({ count }) => count === 0));
});

test("个人标签分组使用首个非空标签且每个任务仅一个入口，组内保留当前可见顺序", () => {
  const both = task("both", { labels: ["", "  ", "发布", "制作", "发布"] });
  const first = task("first", { labels: ["制作"] });
  const last = task("last", { labels: ["发布"] });
  const result = buildPersonalTaskTagGroups([both, first, last, { ...both, labels: ["制作"] }], tags);
  assert.deepEqual(result.map(({ key, label, tasks }) => ({ key, label, ids: tasks.map(({ id }) => id) })), [
    { key: "tag:a", label: "制作", ids: ["first"] },
    { key: "tag:b", label: "发布", ids: ["both", "last"] },
  ]);
  assert.strictEqual(result[1].tasks[0], both);
  assert.deepEqual(both.labels, ["", "  ", "发布", "制作", "发布"]);
});

test("未知首标签不被后续已知标签替代，未知组稳定排序且未打标签始终最后", () => {
  const result = buildPersonalTaskTagGroups([
    task("z", { labels: ["Zulu", "制作"] }),
    task("none"),
    task("known", { labels: ["发布"] }),
    task("a", { labels: ["Alpha"] }),
    task("empty", { labels: ["", " "] }),
  ], tags);
  assert.deepEqual(result.map(({ key, label, tasks }) => ({ key, label, ids: tasks.map(({ id }) => id) })), [
    { key: "tag:b", label: "发布", ids: ["known"] },
    { key: "label:Alpha", label: "Alpha", ids: ["a"] },
    { key: "label:Zulu", label: "Zulu", ids: ["z"] },
    { key: "untagged", label: "未打标签", ids: ["none", "empty"] },
  ]);
  assert.deepEqual(buildPersonalTaskTagGroups([], tags), []);
});

test("已知组沿用标签ID，重命名不会更换key，未知标签与未打标签也不冲突", () => {
  const before = buildPersonalTaskTagGroups([task("mine", { labels: ["制作"] })], tags);
  const after = buildPersonalTaskTagGroups([task("mine", { labels: ["内容制作"] })], tags.map((tag) => tag.id === "a" ? { ...tag, name: "内容制作" } : tag));
  assert.equal(before[0].key, "tag:a");
  assert.equal(after[0].key, before[0].key);
  assert.equal(after[0].label, "内容制作");
  const distinct = buildPersonalTaskTagGroups([
    task("known", { labels: ["制作"] }),
    task("id-like", { labels: ["tag:a"] }),
    task("key-like", { labels: ["untagged"] }),
    task("label-like", { labels: ["未打标签"] }),
    task("none"),
  ], tags);
  assert.equal(new Set(distinct.map(({ key }) => key)).size, 5);
  assert.equal(distinct.at(-1)?.key, "untagged");
});

test("分组不继承父任务标签或吞并子任务，不写入新标签或主标签字段", () => {
  const nodes = [
    task("parent", { labels: ["制作"] }),
    task("child", { parentTaskId: "parent", labels: ["发布"] }),
    task("child-none", { parentTaskId: "parent" }),
  ];
  const snapshot = JSON.stringify({ nodes, tags });
  const result = buildPersonalTaskTagGroups(nodes, tags);
  assert.deepEqual(result.map(({ label, tasks }) => [label, tasks.map(({ id }) => id)]), [
    ["制作", ["parent"]], ["发布", ["child"]], ["未打标签", ["child-none"]],
  ]);
  assert.equal(JSON.stringify({ nodes, tags }), snapshot);
  assert.ok(result.flatMap(({ tasks }) => tasks).every((task) => !Object.hasOwn(task, "primaryTag")));
});

test("个人分组只展示传入的筛选结果，不改变通用标签筛选与重叠计数", async () => {
  const nodes = [
    task("both", { name: "Launch plan", labels: ["制作", "发布"] }),
    task("other", { name: "Launch brief", ownerId: "other", labels: ["制作"] }),
    task("excluded", { name: "Weekly notes", labels: ["发布"] }),
  ];
  const projection = await project(nodes, "Launch", { owner: "me", status: "all", tag: "发布" });
  const result = buildPersonalTaskTagGroups(projection.visibleTasks, tags);
  assert.deepEqual(result.map(({ label, tasks }) => [label, tasks.map(({ id }) => id)]), [["制作", ["both"]]]);
  assert.deepEqual(projection.tagFacets.map(({ count }) => count), [1, 1, 0]);
  assert.deepEqual(projection.visibleTasks.map(({ id }) => id), ["both"]);
  assert.deepEqual(projection.allTasks.map(({ id }) => id), ["both", "other", "excluded"]);
});

test("多选读取兼容旧单选条件，显式数组覆盖旧字段且不修改传入数组", () => {
  const legacy = { owner: "me", status: "进行中", tag: "制作" };
  assert.deepEqual(getTaskStatusFilters(legacy), ["进行中"]);
  assert.deepEqual(getTaskTagFilters(legacy), ["制作"]);
  assert.deepEqual(getTaskStatusFilters(allFilters), []);
  assert.deepEqual(getTaskTagFilters(allFilters), []);

  const filters: TaskListFilters = {
    ...legacy,
    statuses: ["待审核", "待审核", "  "],
    tags: ["发布", "发布", ""],
  };
  const before = JSON.stringify(filters);
  assert.deepEqual(getTaskStatusFilters(filters), ["待审核"]);
  assert.deepEqual(getTaskTagFilters(filters), ["发布"]);
  getTaskStatusFilters(filters).push("已完成");
  getTaskTagFilters(filters).push("制作");
  assert.equal(JSON.stringify(filters), before);
  assert.deepEqual(getTaskStatusFilters({ ...legacy, statuses: [] }), []);
  assert.deepEqual(getTaskTagFilters({ ...legacy, tags: [] }), []);
});

test("多状态和多标签在维度内取并集，与搜索和负责人取交集，非首标签也能匹配", async () => {
  const both = task("both", { name: "Launch shared", labels: ["待沟通", "制作", "发布"] });
  const nodes = [
    task("production", { name: "Launch production", labels: ["制作"] }),
    task("release", { name: "Launch release", status: "待审核", labels: ["发布"] }),
    both,
    { ...both, name: "重复记录" },
    task("done", { name: "Launch done", status: "已完成", labels: ["制作"] }),
    task("foreign", { name: "Launch foreign", ownerId: "other", labels: ["制作"] }),
    task("weekly", { name: "Weekly notes", labels: ["制作"] }),
    task("communication", { name: "Launch discussion", labels: ["待沟通"] }),
    task("none", { name: "Launch notes" }),
  ];
  const filters: TaskListFilters = {
    owner: "me", status: "已完成", tag: "待沟通", statuses: ["进行中", "待审核"], tags: ["制作", "发布"],
  };
  const result = await project(nodes, "  LAUNCH  ", filters);
  assert.deepEqual(result.visibleTasks.map(({ id }) => id), ["production", "release", "both"]);
  assert.equal(result.allTasks.length, 8);
  assert.equal(result.allTagsCount, 5);
  assert.equal(result.untaggedCount, 1);
  assert.deepEqual(result.tagFacets.map(({ count }) => count), [2, 2, 2]);
  const changedTags = await project(nodes, "LAUNCH", { ...filters, tags: ["待沟通"], includeUntagged: true });
  assert.deepEqual(changedTags.visibleTasks.map(({ id }) => id), ["communication", "none", "both"]);
  assert.deepEqual(changedTags.tagFacets, result.tagFacets);
  assert.equal(changedTags.allTagsCount, result.allTagsCount);
  assert.equal(changedTags.untaggedCount, result.untaggedCount);
});

test("显式空多选数组表示不限，不回退旧单选条件或排除未打标签任务", async () => {
  const result = await project([
    task("doing", { labels: ["发布"] }),
    task("done", { status: "已完成", labels: ["制作"] }),
    task("none"),
  ], "", { owner: "me", status: "已完成", tag: "制作", statuses: [], tags: [] });
  assert.deepEqual(result.visibleTasks.map(({ id }) => id), ["doing", "done", "none"]);
  assert.equal(result.untaggedCount, 1);
});

test("未打标签包括缺失、空数组和纯空白标签，能与所选标签取并集", async () => {
  const nodes = [
    task("absent"),
    task("empty", { labels: [] }),
    task("whitespace", { labels: ["", " ", "\t"] }),
    task("production", { labels: ["制作"] }),
    task("both", { labels: ["制作", "发布"] }),
    task("unknown", { labels: ["旧标签"] }),
    task("named-untagged", { labels: ["未打标签"] }),
  ];
  const onlyUntagged = await project(nodes, "", { ...allFilters, tags: [], includeUntagged: true });
  assert.deepEqual(onlyUntagged.visibleTasks.map(({ id }) => id), ["absent", "empty", "whitespace"]);
  assert.equal(onlyUntagged.allTagsCount, 7);
  assert.equal(onlyUntagged.untaggedCount, 3);
  const union = await project(nodes, "", { ...allFilters, tags: ["发布"], includeUntagged: true });
  assert.deepEqual(union.visibleTasks.map(({ id }) => id), ["absent", "both", "empty", "whitespace"]);
  assert.deepEqual(union.tagFacets, onlyUntagged.tagFacets);
  const named = await project(nodes, "", { ...allFilters, tags: ["未打标签"] });
  assert.deepEqual(named.visibleTasks.map(({ id }) => id), ["named-untagged"]);
  const unknown = await project(nodes, "", { ...allFilters, tags: ["旧标签"] });
  assert.deepEqual(unknown.visibleTasks.map(({ id }) => id), ["unknown"]);
});

test("新标签数组里的 all 是实际标签名称，旧 tag=all 仍表示不限", () => {
  const tagged = task("tagged", { labels: ["all"] });
  const untagged = task("none");
  assert.equal(taskMatchesListFilters(tagged, "", { ...allFilters, tags: ["all"] }), true);
  assert.equal(taskMatchesListFilters(untagged, "", { ...allFilters, tags: ["all"] }), false);
  assert.equal(taskMatchesListFilters(untagged, "", allFilters), true);
});

test("标签条件生效时按非首位命中标签归组，清空后恢复原展示组且不修改任务", async () => {
  const both = task("both", { labels: ["制作", "发布"] });
  const unknownFirst = task("unknown", { labels: ["旧标签", "发布"] });
  const nodes = [both, unknownFirst, task("none")];
  const filters: TaskListFilters = { ...allFilters, tags: ["发布"], includeUntagged: true };
  const snapshot = JSON.stringify({ nodes, tags, filters });
  const projection = await project(nodes, "", filters);
  const result = buildPersonalTaskTagGroups(projection.visibleTasks, tags, getTaskTagFilters(filters));
  assert.deepEqual(result.map(({ key, label, tasks }) => ({ key, label, ids: tasks.map(({ id }) => id) })), [
    { key: "tag:b", label: "发布", ids: ["both", "unknown"] },
    { key: "untagged", label: "未打标签", ids: ["none"] },
  ]);
  const restored = buildPersonalTaskTagGroups(projection.visibleTasks, tags, []);
  assert.deepEqual(restored.map(({ label, tasks }) => [label, tasks.map(({ id }) => id)]), [
    ["制作", ["both"]], ["旧标签", ["unknown"]], ["未打标签", ["none"]],
  ]);
  assert.equal(JSON.stringify({ nodes, tags, filters }), snapshot);
});

test("多标签命中按任务原标签顺序归一组，不受勾选顺序影响，不重复任务", () => {
  const releaseFirst = task("release-first", { labels: ["待沟通", "发布", "制作", "发布"] });
  const productionFirst = task("production-first", { labels: ["制作", "发布"] });
  const nodes = [releaseFirst, productionFirst, releaseFirst];
  const firstOrder = ["制作", "发布"];
  const result = buildPersonalTaskTagGroups(nodes, tags, firstOrder);
  assert.deepEqual(result.map(({ label, tasks }) => [label, tasks.map(({ id }) => id)]), [
    ["制作", ["production-first"]], ["发布", ["release-first"]],
  ]);
  assert.deepEqual(buildPersonalTaskTagGroups(nodes, tags, ["发布", "制作"]), result);
  assert.deepEqual(firstOrder, ["制作", "发布"]);
  assert.deepEqual(releaseFirst.labels, ["待沟通", "发布", "制作", "发布"]);
});

test("未知标签可以作为临时命中组，父子标签不继承，未命中输入也不伪装未打标签", () => {
  const result = buildPersonalTaskTagGroups([
    task("parent", { labels: ["制作", "旧标签"] }),
    task("child", { parentTaskId: "parent" }),
    task("unmatched", { labels: ["发布"] }),
  ], tags, ["旧标签"]);
  assert.deepEqual(result.map(({ label, tasks }) => [label, tasks.map(({ id }) => id)]), [
    ["发布", ["unmatched"]], ["旧标签", ["parent"]], ["未打标签", ["child"]],
  ]);
});

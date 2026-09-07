import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeWorkspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { updateWorkspaceTaskStatus } from "../src/lib/workspaceTaskUpdates.ts";

const task = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({ id, kind: "task", name: id, ownerId: "周岚", parentId: "root", updatedAt: "今天", status: "待开始", teamId: "team-a", ...patch });
const fixtures = () => [task("parent"), task("current", { parentTaskId: "parent", dependsOnTaskIds: ["a"] }), task("a"), task("b"), task("descendant", { parentTaskId: "current" }), task("downstream", { dependsOnTaskIds: ["current"] }), task("private", { teamId: "team-b" })];
const visible = ["parent", "current", "a", "b", "descendant", "downstream"];

test("前置依赖修改只更新当前任务、保留状态并记录变更，刷新后保留", async () => {
  const { applyTaskDependencies } = await import("../src/lib/taskDependencies.ts");
  const nodes = fixtures();
  const next = applyTaskDependencies(nodes, "current", ["a"], ["b"], "周岚", visible);
  const current = next.nodes.find(node => node.id === "current") as TaskNode;
  assert.deepEqual(current.dependsOnTaskIds, ["b"]);
  assert.equal(current.status, "待开始");
  for (const node of nodes.filter(node => node.id !== "current")) assert.equal(next.nodes.find(item => item.id === node.id), node);
  assert.deepEqual(next.activity?.changes, [{ label: "前置依赖", before: "a", after: "b" }]);
  assert.equal(next.activity?.type, "task-definition-change");
  assert.deepEqual((normalizeWorkspaceNodes(JSON.parse(JSON.stringify(next.nodes))).find(node => node.id === "current") as TaskNode).dependsOnTaskIds, ["b"]);
  assert.deepEqual(nodes[1].dependsOnTaskIds, ["a"]);
});

test("允许移除全部前置；集合未变不重复记活动", async () => {
  const { applyTaskDependencies } = await import("../src/lib/taskDependencies.ts");
  const nodes = fixtures();
  const unchanged = applyTaskDependencies(nodes, "current", ["a"], ["a", "a"], "周岚", visible);
  assert.equal(unchanged.nodes, nodes);
  assert.equal(unchanged.activity, null);
  const cleared = applyTaskDependencies(nodes, "current", ["a"], [], "周岚", visible);
  assert.deepEqual((cleared.nodes[1] as TaskNode).dependsOnTaskIds, []);
  assert.deepEqual((normalizeWorkspaceNodes(cleared.nodes).find(node => node.id === "current") as TaskNode).dependsOnTaskIds, []);
});

test("自依赖、父子归属、循环、不可见任务不得新增为前置", async () => {
  const { applyTaskDependencies } = await import("../src/lib/taskDependencies.ts");
  for (const [id, error] of [["current", /自身/], ["parent", /归属/], ["descendant", /归属/], ["downstream", /循环/], ["private", /不可用/], ["missing", /不可用/]] as const) {
    assert.throws(() => applyTaskDependencies(fixtures(), "current", ["a"], [id], "周岚", visible), error);
  }
});

test("并发依赖修改与权限变化停止覆盖；旧失效引用保留到用户明确移除", async () => {
  const { applyTaskDependencies } = await import("../src/lib/taskDependencies.ts");
  assert.throws(() => applyTaskDependencies(fixtures(), "current", [], ["b"], "周岚", visible), /已被其他操作更新/);
  assert.throws(() => applyTaskDependencies(fixtures(), "current", ["a"], ["b"], "周岚", ["a", "b"]), /当前任务.*不可用/);
  const nodes = fixtures();
  nodes[1] = { ...nodes[1], dependsOnTaskIds: ["missing"] };
  assert.deepEqual((applyTaskDependencies(nodes, "current", ["missing"], ["missing", "b"], "周岚", visible).nodes[1] as TaskNode).dependsOnTaskIds, ["missing", "b"]);
  assert.deepEqual((applyTaskDependencies(nodes, "current", ["missing"], [], "周岚", visible).nodes[1] as TaskNode).dependsOnTaskIds, []);
  assert.deepEqual((normalizeWorkspaceNodes(nodes).find(node => node.id === "current") as TaskNode).dependsOnTaskIds, ["missing"], "刷新后仍能提示失效引用，不能变成无依赖");
});

test("前置未完成不禁止开始或完成当前任务", () => {
  for (const status of ["进行中", "已完成"] as const) {
    assert.equal((updateWorkspaceTaskStatus(fixtures(), "current", status)[1] as TaskNode).status, status);
  }
});

test("详情接入依赖编辑且复用事务保存，创建选择器不再宣称强制执行", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const detail = read("components/TaskDetail.tsx");
  assert.match(detail, /<TaskDependenciesField/);
  assert.ok(detail.indexOf("<TaskCompletionCriteria") < detail.indexOf("<TaskDependenciesField"));
  const app = read("App.tsx");
  assert.match(app, /onTaskDependenciesSave=\{saveTaskDependencies\}/);
  assert.match(app, /persistTaskDefinition\(applyTaskDependencies/);
  assert.match(app.slice(app.indexOf("const persistTaskDefinition"), app.indexOf("const saveSubtaskCriteria")), /commitTaskAiStorage/);
  assert.doesNotMatch(read("components/TaskDependencyPicker.tsx"), /所选任务完成后，当前任务才能开始/);
});

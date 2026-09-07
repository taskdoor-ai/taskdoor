import assert from "node:assert/strict";
import test from "node:test";
import { workspaceRootId, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import type { TaskPlanDraft } from "../src/lib/taskAssistantProtocol.ts";
import { createWorkspaceTasksFromDraft, WorkspaceTaskCreationError } from "../src/lib/workspaceTaskCreation.ts";

const task = (title: string, overrides = {}) => ({
  endDate: "2026-09-03",
  goal: `${title}目标`,
  labels: ["增长"],
  ownerId: "周岚",
  participantIds: ["林墨"],
  startDate: "2026-09-01",
  title,
  ...overrides,
});

test("复杂草案创建主任务和全部子任务，并把合法依赖索引转换为真实 ID", () => {
  const nodes: WorkspaceNode[] = [{ id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" }];
  const draft: TaskPlanDraft = {
    mainTask: task("整合发布", { iconName: "target", iconTone: "purple" }),
    subtasks: Array.from({ length: 7 }, (_, index) => task(`步骤 ${index + 1}`)),
    dependencies: [
      { subtaskIndex: 2, dependsOnSubtaskIndexes: [0, 1, 1, 2, -1, 99] },
      { subtaskIndex: 2, dependsOnSubtaskIndexes: [0] },
      { subtaskIndex: 99, dependsOnSubtaskIndexes: [0] },
    ],
  };
  const result = createWorkspaceTasksFromDraft(nodes, draft, { idForIndex: (index) => `new-${index}` });

  assert.equal(result.createdNodes.length, 8);
  assert.equal(result.createdNodes[0].parentId, workspaceRootId);
  assert.equal(result.createdNodes[0].iconName, "target");
  assert.equal(result.createdNodes[0].iconTone, "purple");
  for (const child of result.createdNodes.slice(1)) {
    assert.equal(child.parentTaskId, "new-0");
    assert.equal(child.parentId, workspaceRootId);
  }
  assert.deepEqual(result.createdNodes[3].dependsOnTaskIds, ["new-1", "new-2"]);
});

test("固定父任务创建保留方案中的下级任务和依赖", () => {
  const nodes: WorkspaceNode[] = [
    { id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" },
    { id: "folder", kind: "folder", name: "项目", parentId: workspaceRootId, updatedAt: "今天" },
    { id: "parent", kind: "task", name: "父任务", parentId: "folder", ownerId: "父负责人", status: "进行中", updatedAt: "今天" },
  ];
  const draft: TaskPlanDraft = { mainTask: task("用户编辑后的子任务", {
    ownerId: "新负责人",
    labels: ["用户标签"],
    startDate: "2026-09-02",
    endDate: "2026-09-18",
  }), subtasks: [task("准备资料"), task("完成核对")], dependencies: [{ subtaskIndex: 1, dependsOnSubtaskIndexes: [0] }] };
  const result = createWorkspaceTasksFromDraft(nodes, draft, { idForIndex: index => `child-${index}`, parentTaskId: "parent" });

  assert.equal(result.createdNodes.length, 3);
  assert.equal(result.createdNodes[0].parentTaskId, "parent");
  assert.equal(result.createdNodes[0].parentId, "folder");
  assert.equal(result.createdNodes[0].ownerId, "新负责人");
  assert.deepEqual(result.createdNodes[0].labels, ["用户标签"]);
  assert.equal(result.createdNodes[0].plannedStartOn, "2026-09-02");
  assert.equal(result.createdNodes[0].plannedEndOn, "2026-09-18");
  assert.deepEqual(result.createdNodes.slice(1).map(({ parentTaskId }) => parentTaskId), ["child-0", "child-0"]);
  assert.deepEqual(result.createdNodes[2].dependsOnTaskIds, ["child-1"]);
});

test("父任务不存在时返回可识别错误且不生成错误节点", () => {
  assert.throws(
    () => createWorkspaceTasksFromDraft([], { mainTask: task("子任务"), subtasks: [] }, { parentTaskId: "missing" }),
    (error) => error instanceof WorkspaceTaskCreationError && error.code === "PARENT_TASK_NOT_FOUND" && error.parentTaskId === "missing",
  );
});

test("生成 ID 与已有节点或同批节点冲突时会安全去重", () => {
  const nodes: WorkspaceNode[] = [{ id: "same", kind: "folder", name: "已有", parentId: null, updatedAt: "今天" }];
  const result = createWorkspaceTasksFromDraft(nodes, { mainTask: task("主"), subtasks: [task("子")] }, { idForIndex: () => "same" });
  assert.deepEqual(result.createdNodes.map(({ id }) => id), ["same-2", "same-3"]);
});

test("单任务草案会追加一个可持久化的真实任务节点", () => {
  const nodes: WorkspaceNode[] = [{ id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" }];
  const draft: TaskPlanDraft = { mainTask: task("发布新品"), subtasks: [] };
  const result = createWorkspaceTasksFromDraft(nodes, draft, { idForIndex: () => "created-main" });

  assert.equal(result.mainTaskId, "created-main");
  assert.equal(result.createdNodes.length, 1);
  assert.equal(result.nodes.length, 2);
  assert.deepEqual(result.createdNodes[0], {
    id: "created-main",
    kind: "task",
    name: "发布新品",
    parentId: workspaceRootId,
    updatedAt: "刚刚",
    ownerId: "周岚",
    participantIds: ["林墨"],
    status: "待开始",
    goal: "发布新品目标",
    dueAt: "9 月 3 日",
    plannedStartOn: "2026-09-01",
    plannedEndOn: "2026-09-03",
    labels: ["增长"],
  });
});

test("代表性草案分别持久化 single 1、complex 1+7、parent 1+7 个真实节点", () => {
  const root: WorkspaceNode[] = [{ id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" }];
  const single = createWorkspaceTasksFromDraft(root, { mainTask: task("单任务"), subtasks: [] }, { idForIndex: (index) => `single-${index}` });
  assert.equal(single.createdNodes.length, 1);

  const complexDraft: TaskPlanDraft = {
    mainTask: task("复杂项目"),
    subtasks: Array.from({ length: 7 }, (_, index) => task(`复杂子任务 ${index + 1}`)),
  };
  const complex = createWorkspaceTasksFromDraft(root, complexDraft, { idForIndex: (index) => `complex-${index}` });
  assert.equal(complex.createdNodes.length, 8);
  assert.equal(complex.createdNodes.filter(({ parentTaskId }) => parentTaskId === complex.mainTaskId).length, 7);

  const parentNodes: WorkspaceNode[] = [
    ...root,
    { id: "parent", kind: "task", name: "父任务", parentId: workspaceRootId, ownerId: "周岚", status: "进行中", updatedAt: "今天" },
  ];
  const parent = createWorkspaceTasksFromDraft(parentNodes, complexDraft, { idForIndex: index => `real-child-${index}`, parentTaskId: "parent" });
  assert.equal(parent.createdNodes.length, 8);
  assert.deepEqual(parent.createdNodes.map(({ parentTaskId }) => parentTaskId), ["parent", ...Array(7).fill("real-child-0")]);
});

test("新建任务继承当前团队，子任务以已保存父任务团队为准", () => {
  const root: WorkspaceNode[] = [{ id: workspaceRootId, kind: "folder", name: "任务", parentId: null, teamId: "__all__", updatedAt: "刚刚" }];
  const independent = createWorkspaceTasksFromDraft(root, {
    mainTask: task("移动端发布"),
    subtasks: [task("安全闸门")],
  }, { idForIndex: (index) => `platform-created-${index}`, teamId: "platform" });

  assert.deepEqual(independent.createdNodes.map(({ teamId }) => teamId), ["platform", "platform"]);

  const parent: WorkspaceNode = {
    id: "factory-parent", kind: "task", name: "试产爬坡", parentId: workspaceRootId,
    ownerId: "周岚", status: "进行中", teamId: "supply-operations", updatedAt: "今天",
  };
  const child = createWorkspaceTasksFromDraft([...root, parent], {
    mainTask: task("复核标签返工"), subtasks: [],
  }, { idForIndex: () => "factory-child", parentTaskId: parent.id, teamId: "platform" });

  assert.equal(child.createdNodes[0].teamId, "supply-operations");
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeWorkspaceNodes, workspaceNodes } from "../src/ai/mock/data/workspaceNodes.ts";
import { taskPlanDraftSchema } from "../src/features/tasks/lib/task-assistant-protocol.ts";
import { createWorkspaceTasksFromDraft } from "../src/features/tasks/lib/workspace-task-creation.ts";

test("任务创建后负责人和参与人直接生效，不生成待接受流程", () => {
  const draft = taskPlanDraftSchema.parse({
    mainTask: {
      title: "发布复盘",
      goal: "形成复盘结论",
      completionCriteria: ["结论已记录"],
      executionTips: [],
      ownerId: "owner",
      participantIds: ["participant"],
      labels: [],
      startDate: "",
      endDate: "",
    },
    subtasks: [],
  });

  const created = createWorkspaceTasksFromDraft([], draft, {
    currentUserId: "creator",
    idForIndex: () => "created-task",
    participantsReviewed: true,
  }).createdNodes[0];

  assert.equal(created.ownerId, "owner");
  assert.equal(created.proposedOwnerId, undefined);
  assert.deepEqual(created.participantIds, ["participant"]);
});

test("读取旧的负责人提议时直接转为正式负责人", () => {
  const restored = normalizeWorkspaceNodes([{
    id: "legacy-task",
    kind: "task",
    name: "历史任务",
    ownerId: "old-owner",
    proposedOwnerId: "new-owner",
    parentId: "workspace-root",
    status: "进行中",
    updatedAt: "2026-09-19T10:00:00+08:00",
  }]).find(node => node.id === "legacy-task");

  assert.equal(restored?.kind, "task");
  if (restored?.kind !== "task") return;
  assert.equal(restored.ownerId, "new-owner");
  assert.equal(restored.proposedOwnerId, undefined);
});

test("内置任务移除负责人后持久化往返仍存在且保持未分配", () => {
  const fixture = workspaceNodes.find(node => node.kind === "task" && node.id === "product-launch-promo-key-visual");
  assert.ok(fixture?.kind === "task");
  assert.equal(fixture.createdFrom, undefined, "覆盖被旧校验排除的内置任务来源");
  const saved = workspaceNodes.map(node => node.id === fixture.id ? { ...node, ownerId: "" } : node);
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(saved)));
  const task = restored.find(node => node.id === fixture.id);
  assert.equal(task?.kind, "task");
  if (task?.kind !== "task") return;
  assert.equal(task.ownerId, "");
  assert.equal(task.parentTaskId, fixture.parentTaskId);
  assert.deepEqual(task.participantIds, fixture.participantIds);
  assert.deepEqual(task.completionCriteria, fixture.completionCriteria);
  assert.equal(restored.filter(node => node.kind === "task").length, saved.filter(node => node.kind === "task").length);
});

test("显式清空负责人不会被节点历史提议重新指定，也不会复活已删除任务", () => {
  const task = { id: "cleared", kind: "task", name: "已清空负责人", ownerId: "", proposedOwnerId: "old-proposal", parentId: "workspace-root", status: "进行中", updatedAt: "今天" };
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify([task])));
  const cleared = restored.find(node => node.id === task.id);
  assert.equal(cleared?.kind, "task");
  if (cleared?.kind !== "task") return;
  assert.equal(cleared.ownerId, "");
  assert.equal(cleared.proposedOwnerId, undefined);
  assert.deepEqual(normalizeWorkspaceNodes([]).filter(node => node.kind === "task"), [], "缺失记录不自动回填内置任务");
});

test("允许空负责人不放宽负责人字段类型或任务其他必要字段", () => {
  const valid = { id: "saved", kind: "task", name: "任务", ownerId: "", parentId: "workspace-root", status: "进行中", updatedAt: "今天" };
  for (const ownerId of [undefined, null, 123, {}]) {
    assert.equal(normalizeWorkspaceNodes([{ ...valid, ownerId }]).some(node => node.id === valid.id), false);
  }
  assert.equal(normalizeWorkspaceNodes([{ ...valid, name: "" }]).some(node => node.id === valid.id), false);
  assert.equal(normalizeWorkspaceNodes([{ ...valid, updatedAt: "" }]).some(node => node.id === valid.id), false);
});

test("启动迁移不会用独立旧提议存储覆盖显式清空", () => {
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  assert.match(app, /const ownerId = node\.ownerId === "" \? "" : storedOwnerAssignments\[node\.id\] \|\| node\.proposedOwnerId \|\| node\.ownerId;/);
});

test("当前任务界面与 AI 上下文不再展示负责人或参与人的待接受状态", () => {
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../src/features/tasks/components/TaskDetail.tsx", import.meta.url), "utf8");
  const workbench = readFileSync(new URL("../src/ai/mock/prototype/components/PersonalWorkbench.tsx", import.meta.url), "utf8");
  const taskContext = readFileSync(new URL("../src/features/tasks/lib/task-ai-connection.ts", import.meta.url), "utf8");
  const discussionContext = readFileSync(new URL("../src/features/tasks/discussion/lib/task-discussion-ai.ts", import.meta.url), "utf8");

  assert.doesNotMatch(app, /onOwnerProposalChange=|发起负责人变更邀请|新增参与人（待接受）/);
  assert.doesNotMatch(detail, /initialProposedOwnerId|onOwnerProposalChange|pendingOwnerId|ownerInvitationStatus/);
  assert.doesNotMatch(workbench, /负责人提议待你回应|待接受提议不计入/);
  assert.doesNotMatch(taskContext + discussionContext, /待接受|已接受|接受状态/);
});

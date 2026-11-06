import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transformSync } from "esbuild";
import { addWorkspaceSubtask, canCreateWorkspaceSubtask, type NewSubtaskDraft } from "../src/features/tasks/lib/workspace-subtask-editing.ts";
import { appendTaskActivity, parseTaskActivityStore } from "../src/features/tasks/lib/task-activity.ts";
import { mergeCollaborationMessages, type CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import { workspaceRootId, type TaskNode } from "../src/shared/model/task-model.ts";

const sourceDiscussion = { taskId: "parent", messageId: "discussion", body: "核对\n发布材料", author: "teammate" };
const original: CollaborationMessage = { id: "discussion", type: "member-post", author: "teammate", message: sourceDiscussion.body, time: "今天" };
const draft = { title: "核对发布材料", completionCriteria: [], sourceDiscussion } as NewSubtaskDraft;

function creation(latestMessages: CollaborationMessage[], access: { ownerId?: string; participantIds?: string[]; active?: boolean; existingChild?: boolean } = {}) {
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const start = app.indexOf("  const createInlineSubtask =");
  const end = app.indexOf("\n  };", start);
  assert.ok(start >= 0 && end > start);
  const compiled = transformSync(app.slice(start, end + 5), { loader: "ts", target: "es2022" }).code;
  const parent: TaskNode = { id: "parent", kind: "task", parentId: workspaceRootId, teamId: "team", name: "父任务", ownerId: access.ownerId ?? "self", participantIds: access.participantIds ?? [], status: "进行中", updatedAt: "今天" };
  const nodes = access.existingChild ? [parent, { ...parent, id: "existing-child", parentTaskId: parent.id }] : [parent];
  const storage = new Map<string, string>();
  const reads: unknown[][] = [];
  const writes: Array<Array<[string, string]>> = [];
  const bindings = {
    taskStorageRecoveryError: "", personalTagLoadError: "", validTeamTimeZone: true, selectedTaskId: "parent", locale: "zh",
    localStorage: { getItem: (key: string) => storage.get(key) ?? null }, workspaceNodesStorageKey: "workspace",
    workspaceNodesRef: { current: nodes }, activeTeamId: "team", currentUserId: "self", currentUserName: "我",
    loadPersonalCenterState: () => ({ teams: [{ id: "team" }] }), activeMembership: () => access.active ?? true, canCreateWorkspaceSubtask,
    selectedLegacyTask: undefined, selectedParticipants: [], activeTeamTimeZone: "Asia/Shanghai",
    selectedTaskDetail: { activities: [original], files: [] },
    loadCollaboration: (...args: unknown[]) => { reads.push(args); return { messages: latestMessages }; }, mergeCollaborationMessages,
    addWorkspaceSubtask, parseTaskActivityStore, appendTaskActivity, taskActivityStorageKey: "activities", taskDetailSeedsStorageKey: "seeds",
    taskDetailSeedNodesRef: { current: [] },
    commitTaskAiStorage: (_storage: unknown, batch: Array<[string, string]>) => { writes.push(batch); },
    recoverTaskAiStorage: () => undefined,
    setWorkspaceNodes: () => undefined, setTaskActivityStore: () => undefined, setTaskDetailSeedNodes: () => undefined,
    normalizeWorkspaceNodes: (nodes: unknown) => nodes, setTaskStorageRecoveryError: () => undefined,
  };
  const create = new Function(...Object.keys(bindings), `${compiled}; return createInlineSubtask;`)(...Object.values(bindings)) as (input: NewSubtaskDraft) => void;
  return { create, writes, reads };
}

test("讨论手工创建保存前重读来源，保存真实直属任务和原文关联", () => {
  const state = creation([original]);
  state.create(draft);
  assert.equal(state.reads.length, 1);
  assert.equal(state.reads[0][1], JSON.stringify(["team", "parent"]));
  assert.equal(state.writes.length, 1);
  const nodes = JSON.parse(new Map(state.writes[0]).get("workspace")!) as TaskNode[];
  const created = nodes.find(node => node.id !== "parent")!;
  assert.equal(created.parentTaskId, "parent");
  assert.deepEqual(created.sourceDiscussion, sourceDiscussion);
});

test("参与者在空列表及已有列表都能实际保存一个直属子任务", () => {
  for (const existingChild of [false, true]) {
    const state = creation([], { ownerId: "other-owner", participantIds: ["self"], existingChild });
    state.create({ title: "参与者新增的子任务", completionCriteria: [] });
    assert.equal(state.writes.length, 1);
    const nodes = JSON.parse(new Map(state.writes[0]).get("workspace")!) as TaskNode[];
    assert.equal(nodes.filter(node => node.name === "参与者新增的子任务" && node.parentTaskId === "parent").length, 1);
  }
});

test("提交时已失去任务关系或团队资格，拒绝保存且不改草稿", () => {
  for (const access of [{ ownerId: "other", participantIds: [] }, { participantIds: ["self"], active: false }]) {
    const state = creation([], access);
    const input = { title: "已填写的子任务", goal: "已填写的目标", completionCriteria: [] };
    const before = structuredClone(input);
    assert.throws(() => state.create(input), /权限/);
    assert.deepEqual(state.writes, []); assert.deepEqual(input, before);
  }
});

test("来源不属于当前任务时不创建、不写入", () => {
  const state = creation([original]);
  assert.throws(() => state.create({ ...draft, sourceDiscussion: { ...sourceDiscussion, taskId: "other" } }), /来源|讨论/);
  assert.deepEqual(state.writes, []);
});

test("来源已删除、改文、换作者或不再是讨论时不创建，原草稿保持", () => {
  for (const latest of [
    { ...original, deletedAt: "2026-10-26T00:00:00Z" },
    { ...original, message: "最新修改的原文", updatedAt: "2026-10-26T00:00:00Z" },
    { ...original, author: "another-person" },
    { ...original, type: "task-definition-change" as const },
  ]) {
    const state = creation([latest]);
    const input = structuredClone(draft);
    assert.throws(() => state.create(input), /讨论|来源/);
    assert.deepEqual(input, draft);
    assert.deepEqual(state.writes, []);
  }
  const state = creation([]);
  assert.throws(() => state.create({ ...draft, sourceDiscussion: { ...sourceDiscussion, messageId: "missing" } }), /讨论|来源/);
  assert.deepEqual(state.writes, []);
});

test("普通概览创建不要求讨论来源，也不读取讨论快照", () => {
  const state = creation([]);
  state.create({ title: "普通子任务", completionCriteria: [] });
  assert.deepEqual(state.reads, []);
  assert.equal(state.writes.length, 1);
});

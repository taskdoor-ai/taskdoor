import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode } from "../src/shared/model/task-model.ts";
import { createCollaborationSnapshot, deleteCollaborationMessage, loadCollaboration, postCollaborationMessage, saveCollaboration, type CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import { publishTaskDiscussion } from "../src/features/tasks/lib/task-mention-publishing.ts";

const scopeKey = JSON.stringify(["team-a", "task-a"]);
const now = "2026-10-14T04:00:00.000Z";
const task: TaskNode = { id: "task-a", kind: "task", name: "准备发布", parentId: "root", teamId: "team-a", ownerId: "owner", participantIds: ["author", "existing"], status: "进行中", updatedAt: now };
const members = [{ id: "owner", name: "负责人" }, { id: "author", name: "发言人" }, { id: "existing", name: "已有参与者" }, { id: "new", name: "新参与者" }];
const message = (patch: Partial<CollaborationMessage> = {}): CollaborationMessage => ({ id: "message-a", author: "author", type: "member-post", message: "请一起确认", time: "今天", createdAt: now, mentionedPrincipalIds: ["new"], ...patch });
function fixture() {
  const records = new Map<string, string>([["agentdoor-workspace-nodes", JSON.stringify([task])]]);
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); }, removeItem: (key: string) => { records.delete(key); } };
  const current = createCollaborationSnapshot([]);
  const input = { storage, scopeKey, teamId: "team-a", taskId: task.id, actorId: "author", actorName: "发言人", members, nodes: [task], seeds: [task], seedParticipants: task.participantIds!, legacySnapshots: {} as Record<string, { id: string; participants: string[]; title: string }>, latestLegacySnapshot: null as { id: string; participants: string[]; title: string } | null };
  const publish = (post = message(), snapshot = current) => publishTaskDiscussion({ ...input, current: snapshot, next: postCollaborationMessage(snapshot, { message: post, visiblePeople: members }), message: post });
  return { records, storage, current, input, publish };
}

test("@ 团队内非任务成员后，消息、参与者和加入活动一起持久化，刷新不丢", () => {
  const { storage, current, publish } = fixture();
  assert.equal(current.messages.length, 0, "草稿未发布不改变保存值");
  const saved = publish();
  assert.deepEqual(saved.nodes[0].participantIds, ["author", "existing", "new"]);
  assert.deepEqual(JSON.parse(storage.getItem("agentdoor-workspace-nodes")!)[0].participantIds, ["author", "existing", "new"]);
  assert.equal(loadCollaboration(storage, scopeKey, []).messages.length, 1);
  assert.equal(saved.activities[task.id].filter(item => item.type === "participants-change").length, 1);
  assert.equal(saved.snapshot.notifications.filter(item => item.recipientId === "new").length, 1);
  assert.deepEqual(current.messages, [], "原快照不被修改");
});

test("负责人、已有参与者和重复 @ 不重加；同一消息重试不重复活动、通知或消息", () => {
  const { publish, input } = fixture();
  const post = message({ mentionedPrincipalIds: ["owner", "existing", "new", "new"] });
  const first = publish(post);
  const repeated = publishTaskDiscussion({ ...input, nodes: first.nodes, current: first.snapshot, next: first.snapshot, message: post });
  assert.deepEqual(repeated.nodes[0].participantIds, ["author", "existing", "new"]);
  assert.equal(repeated.nodes[0].ownerId, "owner");
  assert.equal(repeated.snapshot.messages.length, 1);
  assert.equal(repeated.activities[task.id].length, 1);
  assert.equal(repeated.snapshot.notifications.filter(item => item.recipientId === "new").length, 1);
});

test("保存参与者失败时连同消息和活动回滚，保留输入后可重试", () => {
  const { records, storage, publish } = fixture();
  const before = new Map(records);
  const write = storage.setItem;
  storage.setItem = (key, value) => { if (key === "agentdoor-task-activity") throw new Error("quota"); write(key, value); };
  assert.throws(() => publish(), /保存|回滚/);
  assert.deepEqual(records, before);
  assert.equal(loadCollaboration(storage, scopeKey, []).messages.length, 0);
  storage.setItem = write;
  assert.deepEqual(publish().nodes[0].participantIds, ["author", "existing", "new"]);
});

test("离开、待加入、跨团队及不存在的候选不能通过残留草稿加入", () => {
  for (const invalid of ["left", "invited", "other-team", "missing"]) {
    const { records, publish } = fixture();
    const before = new Map(records);
    assert.throws(() => publish(message({ mentionedPrincipalIds: [invalid] })), /团队|成员|提及/);
    assert.deepEqual(records, before);
  }
});

test("当前发言人须仍是有效团队成员且有当前任务讨论资格", () => {
  for (const actorId of ["new", "left"]) {
    const { input, current, records } = fixture();
    const post = message({ author: actorId });
    const next = postCollaborationMessage(current, { message: post, visiblePeople: members });
    const before = new Map(records);
    assert.throws(() => publishTaskDiscussion({ ...input, actorId, current, next, message: post }), /资格|权限|成员/);
    assert.deepEqual(records, before);
  }
});

test("回复与文件讨论同样加人，删除消息不移除已加入的参与者", () => {
  const { input, current, storage } = fixture();
  const file = { id: "file-a", kind: "file" as const, name: "方案.md", parentId: null, updatedAt: now, version: 1 };
  const initial = createCollaborationSnapshot([file]);
  const thread = { id: "thread-a", fileId: file.id, version: 1, quote: "方案", documentText: "方案", createdBy: "author", createdAt: now };
  const root = message({ fileThreadId: thread.id });
  const saved = publishTaskDiscussion({ ...input, current: initial, next: postCollaborationMessage(initial, { message: root, thread, visiblePeople: members }), message: root });
  assert.deepEqual(saved.nodes[0].participantIds, ["author", "existing", "new"]);
  const reply = message({ id: "reply-a", type: "member-reply", replyToActivityId: root.id });
  const replied = publishTaskDiscussion({ ...input, nodes: saved.nodes, current: saved.snapshot, next: postCollaborationMessage(saved.snapshot, { message: reply, visiblePeople: members }), message: reply });
  assert.equal(replied.snapshot.messages[1].fileThreadId, thread.id);
  assert.equal(replied.activities[task.id].length, 1);
  saveCollaboration(storage, scopeKey, replied.snapshot.revision, deleteCollaborationMessage(replied.snapshot, replied.snapshot.messages[0], "author"));
  assert.ok(loadCollaboration(storage, scopeKey, []).messages[0].deletedAt);
  assert.deepEqual(JSON.parse(storage.getItem("agentdoor-workspace-nodes")!)[0].participantIds, ["author", "existing", "new"]);
  assert.equal(current.messages.length, 0);
});

test("任务被删除、改到其他团队或被其他页面修改时拒绝旧页面发布", () => {
  for (const latest of [[], [{ ...task, teamId: "team-b" }], [{ ...task, participantIds: ["existing"] }]]) {
    const { records, storage, publish } = fixture();
    storage.setItem("agentdoor-workspace-nodes", JSON.stringify(latest));
    const before = new Map(records);
    assert.throws(() => publish(), /变化|更新|不存在/);
    assert.deepEqual(records, before);
  }
});

test("旧创建任务的参与者快照和列表人员同时更新，普通 @姓名 不加人", () => {
  const { input, current } = fixture();
  const legacy = { id: task.id, participants: ["author", "existing"], title: "旧任务" };
  input.legacySnapshots = { [task.id]: legacy };
  input.latestLegacySnapshot = legacy;
  input.storage.setItem("agentdoor-created-tasks", JSON.stringify(input.legacySnapshots));
  input.storage.setItem("agentdoor-created-task", JSON.stringify(legacy));
  const post = message();
  const saved = publishTaskDiscussion({ ...input, current, next: postCollaborationMessage(current, { message: post, visiblePeople: members }), message: post });
  assert.deepEqual(saved.legacySnapshots[task.id].participants, ["author", "existing", "new"]);
  assert.deepEqual(saved.latestLegacySnapshot?.participants, ["author", "existing", "new"]);
  assert.equal(saved.legacySnapshots[task.id].title, "旧任务");
  assert.deepEqual(JSON.parse(input.storage.getItem("agentdoor-created-tasks")!)[task.id].participants, saved.nodes[0].participantIds);
  const plain = fixture();
  assert.deepEqual(plain.publish(message({ message: "@新参与者 请确认", mentionedPrincipalIds: [] })).nodes[0].participantIds, task.participantIds);
});

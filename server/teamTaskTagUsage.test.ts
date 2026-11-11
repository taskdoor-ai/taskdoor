import assert from "node:assert/strict";
import test from "node:test";
import { changeTeamTaskTagUsage, countTeamTaskTagUsage } from "../src/features/tasks/lib/team-task-tag-usage.ts";
import type { RecycledTask } from "../src/features/tasks/lib/task-recycle-bin.ts";
import type { TaskNode } from "../src/shared/model/task-model.ts";

const task = (id: string, teamId: string, labels: string[]): TaskNode => ({
  id, teamId, labels, kind: "task", name: id, parentId: "root", ownerId: "member", status: "进行中", updatedAt: "2026-11-11T00:00:00Z",
});
const recycled = (node: TaskNode): RecycledTask => ({
  id: `recycled:${node.id}`, teamId: node.teamId!, deletedBy: "member", deletedByName: "成员", deletedAt: 1, expiresAt: 100,
  tasks: [node], fileEdits: {}, snapshot: { activities: {}, detailSeeds: [], ownerProposals: {}, participantInvitations: {}, periodOverrides: {}, legacySnapshots: {}, latestLegacySnapshot: null },
});

test("使用数量包含同团队可恢复任务，规范化名称且按任务去重", () => {
  const live = [task("live", "a", ["API", "ａｐｉ"]), task("other", "b", ["API"])];
  const bin = [recycled(task("trash", "a", ["api"])), { ...recycled(task("expired", "a", ["api"])), expiresAt: 1 }];
  assert.equal(countTeamTaskTagUsage(live, bin, "a", 2).get("api"), 2);
});

test("删除清除同团队任务及回收站的标签引用，其他标签和团队保持原值", () => {
  const live = [task("live", "a", ["API", "上线"]), task("other", "b", ["API"])];
  const bin = [recycled(task("trash", "a", ["ａｐｉ", "上线"])), recycled(task("other-trash", "b", ["API"]))];
  const result = changeTeamTaskTagUsage(live, bin, "a", new Map([["API", null]]));
  assert.deepEqual((result.nodes?.[0] as TaskNode).labels, ["上线"]);
  assert.deepEqual((result.nodes?.[0] as TaskNode).automaticTags?.removed, ["API"]);
  assert.equal(result.nodes?.[1], live[1]);
  assert.deepEqual(result.recycleEntries?.[0].tasks[0].labels, ["上线"]);
  assert.equal(result.recycleEntries?.[1], bin[1]);
});

test("改名同时更新可恢复任务的引用，以便后续删除清除同一分类", () => {
  const bin = [recycled(task("trash", "a", ["旧名称"]))];
  const renamed = changeTeamTaskTagUsage([], bin, "a", new Map([["旧名称", "新名称"]]));
  assert.deepEqual(renamed.recycleEntries?.[0].tasks[0].labels, ["新名称"]);
  const deleted = changeTeamTaskTagUsage([], renamed.recycleEntries!, "a", new Map([["新名称", null]]));
  assert.deepEqual(deleted.recycleEntries?.[0].tasks[0].labels, []);
});

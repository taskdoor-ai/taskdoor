import assert from "node:assert/strict";
import test from "node:test";
import { unassignedTaskFixtures } from "../src/data/unassignedTaskFixtures.ts";
import { allTeamWorkspaceNodes, getTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { isTaskInPersonalIndex } from "../src/lib/taskListProjection.ts";
import { commitWorkspaceScenarioReset, creatorCommerceScenarioVersion, resolveWorkspaceScenarioReset } from "../src/lib/workspaceScenarioReset.ts";

test("五个待分配任务可以从周岚的个人列表进入，且只属于达人带货团队", () => {
  assert.equal(unassignedTaskFixtures.length, 5);
  for (const task of unassignedTaskFixtures) {
    assert.equal(task.ownerId, "");
    assert.equal(task.status, "待开始");
    assert.equal(isTaskInPersonalIndex(task, "周岚"), true);
    assert.equal(isTaskInPersonalIndex(task, "陈默"), false);
    assert.ok(getTeamWorkspaceNodes("creator-commerce").some((node) => node.id === task.id));
    assert.ok(!getTeamWorkspaceNodes("platform").some((node) => node.id === task.id));
  }
});

test("v16 增量更新保留任务编辑和删除，重复载入不复活已删除示例", () => {
  const existing = allTeamWorkspaceNodes.find((node) => node.kind === "task" && node.ownerId)!;
  const edited = { ...existing, name: "用户修改后的任务标题" };
  const assigned = { ...unassignedTaskFixtures[0], ownerId: "陈默" };
  const tags = [{ id: "custom", name: "自定义", icon: "tag" as const, color: "pink" as const }];
  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v16-planner-dedupe",
    storedWorkspaceNodes: [allTeamWorkspaceNodes.find((node) => node.id === "workspace-root")!, edited, assigned],
    storedTags: tags,
  });
  assert.equal(upgraded.didReset, false);
  assert.equal(upgraded.didMigrate, true);
  assert.equal(upgraded.workspaceNodes.length, 7);
  assert.equal(upgraded.workspaceNodes.find((node) => node.id === edited.id)?.name, edited.name);
  assert.deepEqual(upgraded.workspaceNodes.find((node) => node.id === assigned.id), assigned);
  assert.deepEqual(upgraded.tags, tags);

  const afterDeletion = upgraded.workspaceNodes.filter((node) => node.id !== unassignedTaskFixtures[1].id);
  const reloaded = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes: afterDeletion,
    storedTags: upgraded.tags,
  });
  assert.equal(reloaded.didReset, false);
  assert.deepEqual(reloaded.workspaceNodes, afterDeletion);
});

test("追加 mock 提交版本但不清理已有历史资料", () => {
  const writes: string[] = [];
  const removals: string[] = [];
  const state = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v16-planner-dedupe", storedWorkspaceNodes: [], storedTags: [],
  });
  const committed = commitWorkspaceScenarioReset({
    setItem: (key) => { writes.push(key); },
    removeItem: (key) => { removals.push(key); },
  }, state, { legacyKeys: ["created-tasks"], tagsKey: "tags", versionKey: "version", workspaceNodesKey: "nodes" });
  assert.equal(committed, true);
  assert.deepEqual(writes, ["nodes", "tags", "version"]);
  assert.deepEqual(removals, []);
});

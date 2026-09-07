import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { normalizeWorkspaceNodes, workspaceRootId, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";

const task = (id: string, teamId: string, extra: Partial<TaskNode> = {}): TaskNode => ({
  id,
  kind: "task",
  name: id,
  ownerId: "owner",
  parentId: workspaceRootId,
  status: "待开始",
  teamId,
  updatedAt: "今天",
  ...extra,
});

const hasDependencyCycle = (tasks: TaskNode[]) => {
  const byId = new Map(tasks.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const cyclic = (byId.get(id)?.dependsOnTaskIds ?? []).some(visit);
    visiting.delete(id);
    visited.add(id);
    return cyclic;
  };
  return tasks.some((item) => visit(item.id));
};

test("本地数据归一会切断跨团队父子、目录、文件与依赖关系，并移除依赖环", () => {
  const raw: WorkspaceNode[] = [
    { id: workspaceRootId, kind: "folder", name: "任务", parentId: null, teamId: "__all__", updatedAt: "今天" },
    { id: "creator-folder", kind: "folder", name: "达人目录", parentId: "platform-folder", teamId: "creator-commerce", updatedAt: "今天" },
    { id: "platform-folder", kind: "folder", name: "平台目录", parentId: workspaceRootId, teamId: "platform", updatedAt: "今天" },
    { id: "creator-file", kind: "file", name: "达人材料.md", parentId: "platform-folder", teamId: "creator-commerce", updatedAt: "今天", fileType: "md" },
    { id: "creator-parent", kind: "task", name: "达人任务", ownerId: "owner", parentId: "creator-folder", status: "进行中", teamId: "creator-commerce", updatedAt: "今天" },
    task("platform-a", "platform", { parentId: "creator-folder", parentTaskId: "creator-parent", dependsOnTaskIds: ["creator-parent", "platform-b", "platform-b", "missing", "platform-a"] }),
    task("platform-b", "platform", { parentId: "platform-folder", dependsOnTaskIds: ["platform-a"] }),
    task("platform-child", "platform", { parentId: "platform-folder", parentTaskId: "platform-a" }),
  ];

  const normalized = normalizeWorkspaceNodes(raw);
  const byId = new Map(normalized.map((node) => [node.id, node]));
  assert.equal(byId.get("creator-folder")?.parentId, workspaceRootId);
  assert.equal(byId.get("creator-file")?.parentId, workspaceRootId);
  const platformA = byId.get("platform-a") as TaskNode;
  assert.equal(platformA.parentId, workspaceRootId);
  assert.equal(platformA.parentTaskId, undefined);
  assert.deepEqual(platformA.dependsOnTaskIds, ["platform-b", "missing"], "切断已知跨团队关联，保留失效引用供用户核对");
  const platformTasks = normalized.filter((node): node is TaskNode => node.kind === "task" && node.teamId === "platform");
  assert.equal(hasDependencyCycle(platformTasks), false);
  assert.equal((byId.get("platform-child") as TaskNode).parentTaskId, "platform-a");

  const projection = getTeamWorkspaceNodes("platform", normalized);
  const projectedIds = new Set(projection.map((node) => node.id));
  for (const node of projection) {
    if (node.kind !== "task") continue;
    assert.ok(!node.parentTaskId || projectedIds.has(node.parentTaskId));
    assert.ok(node.dependsOnTaskIds?.every((id) => projectedIds.has(id) || id === "missing") ?? true);
  }
});

test("App 的所有跨团队入口都会结束旧创建会话，避免旧草案按新 teamId 保存", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /const resetCreationSessionForTeamChange = \(\) => \{[\s\S]*setCreationSessionOpen\(false\);[\s\S]*creationSessionCompleted\.current = false;[\s\S]*setConversationRevision/s);
  assert.match(source, /const changeActiveTeam = [\s\S]*?resetCreationSessionForTeamChange\(\);[\s\S]*?setActiveTeamId\(teamId\)/s);
  assert.match(source, /if \(taskTeamId !== activeTeamId[\s\S]*?resetCreationSessionForTeamChange\(\);[\s\S]*?setActiveTeamId\(taskTeamId\)/s);
  assert.match(source, /if \(personalCenterState\.teams\.some[\s\S]*?return;[\s\S]*?resetCreationSessionForTeamChange\(\);[\s\S]*?const fallbackTeamId = personalCenterState\.teams\[0\][\s\S]*?setActiveTeamId\(fallbackTeamId\)/s);
});

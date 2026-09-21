import assert from "node:assert/strict";
import test from "node:test";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { taskStatusOptions } from "../src/components/TaskStatusBadge.tsx";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { migrateTaskStatusDemoFixtures } from "../src/lib/taskStatusDemoMigration.ts";

test("所有内置 Mock 任务只使用产品支持的五种状态", () => {
  const unsupported = allTeamWorkspaceNodes.filter(node => node.kind === "task" && !taskStatusOptions.includes(node.status));
  assert.deepEqual(unsupported.map(node => node.id), []);
});

const fixture = () => structuredClone(allTeamWorkspaceNodes.find(node => node.id === "fragrance-final-decision") as TaskNode);

test("旧 Mock 状态迁移只更新状态，保留自定义截止、内容和时间戳", () => {
  const old = { ...fixture(), status: "待审核" as const, goal: "修改后的目标", dueAt: "9 月 20 日", plannedEndOn: "2026-09-20" };
  const result = migrateTaskStatusDemoFixtures([old]);
  assert.deepEqual(result[0], { ...old, status: "进行中" });
  assert.equal(old.status, "待审核");
  assert.equal(migrateTaskStatusDemoFixtures(result), result);
});

test("有效人工状态、普通任务和其他团队同 ID 记录不被迁移", () => {
  const tasks: TaskNode[] = [
    ...taskStatusOptions.map(status => ({ ...fixture(), status, completedAt: status === "已完成" ? "2026-09-15T10:00:00+08:00" : undefined })),
    { ...fixture(), id: "user-created-task", status: "待审核" },
    { ...fixture(), teamId: "another-team", status: "待审核" },
  ];
  assert.equal(migrateTaskStatusDemoFixtures(tasks), tasks);
});

test("早期没有 teamId 的达人团队 Mock 同样兼容", () => {
  const old = { ...fixture(), teamId: undefined, status: "待审核" as const };
  assert.deepEqual(migrateTaskStatusDemoFixtures([old]), [{ ...old, status: "进行中" }]);
});

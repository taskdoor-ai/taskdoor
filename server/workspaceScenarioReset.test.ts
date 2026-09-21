import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";
import type { TagDefinition } from "../src/data/tagGroups.ts";
import { allTeamWorkspaceNodes, multiTeamTags, teamWorkspaceExpansionNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { getEffortScopeKey, getTaskEffortState } from "../src/lib/taskEffort.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import {
  commitWorkspaceScenarioReset,
  creatorCommerceScenarioVersion,
  resolveWorkspaceScenarioReset,
} from "../src/lib/workspaceScenarioReset.ts";

const legacyWorkspace = [
  { id: "workspace-root", kind: "folder", name: "任务", parentId: null, updatedAt: "今天" },
  { id: "coupon-fix", kind: "task", name: "退款与灰度", parentId: "workspace-root", ownerId: "旧成员", status: "进行中", updatedAt: "今天" },
];
const legacyTags = [{ id: "refund", name: "退款", icon: "wrench", color: "red" }];

const v9StatusLabelsByTaskId: Record<string, string[]> = {
  "ccx-serum-creator-calendar": ["达人商务", "已阻塞"],
  "ccx-extreme-claim-incident": ["合规审核", "高优先级", "已阻塞"],
  "platform-security-gate": ["安全门禁", "已阻塞"],
  "platform-scim-launch-gate": ["发布门禁", "安全门禁", "待审核"],
  "platform-audit-release-gate": ["发布门禁", "安全门禁", "待审核"],
  "platform-biweekly-defect-triage": ["客户影响", "待审核"],
  "platform-monthly-privileged-review": ["安全门禁", "待审核"],
  "platform-incident-apns-certificate": ["事件响应", "已阻塞", "安全门禁"],
  "factory-capacity-trial": ["产能", "已阻塞"],
  "supply-battery-ppap-signoff": ["PPAP", "质量门禁", "待审核"],
  "supply-battery-release-gate": ["质量门禁", "试产放行", "待审核"],
  "supply-chengdu-ramp-gate": ["试产放行", "产能", "待审核"],
  "supply-winter-demand-scenarios": ["物料齐套", "待审核"],
  "supply-winter-buffer-policy": ["物料齐套", "待审核"],
  "supply-monthly-cycle-count": ["物料齐套", "追溯", "待审核"],
  "supply-incident-lockbody-rust": ["重大事件", "供应商质量", "已阻塞"],
  "supply-monthly-sop-floor-audit": ["SOP", "人员培训", "待审核"],
  "service-root-cause": ["根因分析", "待审核"],
  "service-compensation-review": ["SLA", "已阻塞"],
  "csx-retail-outcome-evidence": ["客户影响", "待审核"],
  "csx-retail-security-questionnaire": ["客户影响", "待审核"],
  "csx-migration-field-map": ["数据修复", "待审核"],
  "csx-migration-rollback-validation": ["可回滚", "服务恢复", "已阻塞"],
  "csx-migration-pilot-observation": ["待审核", "客户影响"],
  "csx-health-score-calibration": ["数据修复", "待审核"],
  "csx-quarterly-access-review": ["客户影响", "待审核"],
};

const v9PlannedStartByTaskId: Record<string, string> = {
  "ccx-serum-budget-gate": "2026-09-02",
  "platform-audit-export": "2026-09-03",
  "platform-audit-evidence-track": "2026-09-03",
  "platform-audit-event-dictionary": "2026-09-03",
  "platform-webhook-reliability": "2026-09-07",
  "platform-webhook-runtime-track": "2026-09-07",
  "platform-webhook-tenant-isolation": "2026-09-07",
  "platform-status-page-localization-gap": "2026-09-08",
  "factory-capacity-trial": "2026-09-08",
  "supply-battery-process-audit": "2026-09-02",
  "supply-chengdu-line-transfer": "2026-09-10",
  "supply-chengdu-engineering-track": "2026-09-10",
  "supply-chengdu-tooling-acceptance": "2026-09-10",
  "supply-winter-peak-readiness": "2026-09-05",
  "supply-winter-plan-track": "2026-09-05",
  "supply-winter-demand-scenarios": "2026-09-05",
  "supply-winter-long-lead-gap": "2026-09-10",
  "supply-monthly-sop-floor-audit": "2026-09-03",
  "service-enterprise-sla-review": "2026-09-05",
  "csx-retail-outcome-evidence": "2026-09-02",
  "csx-migration-rollback-validation": "2026-09-02",
  "csx-health-score-calibration": "2026-09-03",
};

const v9StatusTags: TagDefinition[] = [
  { id: "team-blocked", name: "已阻塞", icon: "flag", color: "amber" },
  { id: "team-review", name: "待审核", icon: "layers", color: "purple" },
];

test("旧版本本地数据会一次性替换为跨行业团队 fixture", () => {
  const result = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v1",
    storedWorkspaceNodes: legacyWorkspace,
    storedTags: legacyTags,
  });

  assert.equal(result.didReset, true);
  assert.deepEqual(result.workspaceNodes, allTeamWorkspaceNodes);
  assert.deepEqual(result.tags, multiTeamTags);
  assert.equal(result.version, creatorCommerceScenarioVersion);
});

test("v3 对话创建演示残留会在升级时从任务目录移除", () => {
  const repeatedPreviewTask = {
    id: "task-preview-generated",
    kind: "task" as const,
    name: "搭建数据看板并完成复盘",
    parentId: "workspace-root",
    ownerId: "韩序",
    status: "待开始" as const,
    updatedAt: "刚刚",
  };
  const result = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v3",
    storedWorkspaceNodes: [...workspaceNodes, repeatedPreviewTask],
    storedTags: creatorCommerceTags,
  });

  assert.equal(result.didReset, true);
  assert.deepEqual(result.workspaceNodes, allTeamWorkspaceNodes);
  assert.equal(result.workspaceNodes.some((node) => node.id === repeatedPreviewTask.id), false);
});

test("v2 空任务目录会在升级时补回完整基准任务和依赖关系", () => {
  const result = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v2",
    storedWorkspaceNodes: [
      { id: "workspace-root", kind: "folder", name: "任务", parentId: null, updatedAt: "今天" },
    ],
    storedTags: creatorCommerceTags,
  });

  const tasks = result.workspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const dataTask = tasks.find((task) => task.id === "fragrance-data");
  const finalTask = tasks.find((task) => task.id === "fragrance-final-decision");

  assert.equal(result.didReset, true);
  assert.equal(tasks.length, allTeamWorkspaceNodes.filter((node) => node.kind === "task").length);
  assert.equal(dataTask?.dependsOnTaskIds, undefined);
  assert.deepEqual(finalTask?.dependsOnTaskIds, ["fragrance-data", "fragrance-compliance"]);
});

test("v2 升级会刷新基准目录数据并保留用户自己的任务", () => {
  const customTask = {
    id: "user-created-task",
    kind: "task" as const,
    name: "用户自己的任务",
    parentId: "workspace-root",
    ownerId: "陈默",
    status: "待开始" as const,
    updatedAt: "刚刚",
  };
  const staleFixtureTask = {
    ...workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "fragrance-data")!,
    dependsOnTaskIds: [],
    goal: "",
  };

  const result = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v2",
    storedWorkspaceNodes: [workspaceNodes[0], staleFixtureTask, customTask],
    storedTags: creatorCommerceTags,
  });

  const refreshedDataTask = result.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "fragrance-data");
  assert.equal(result.didReset, true);
  assert.ok(result.workspaceNodes.some((node) => node.id === customTask.id));
  assert.equal(refreshedDataTask?.goal, "更新 GMV 指标看板、统一渠道归因口径并准备项目复盘。");
  assert.equal(refreshedDataTask?.dependsOnTaskIds, undefined);
});

test("没有版本标记的新会话会装载全部跨行业团队 fixture", () => {
  const result = resolveWorkspaceScenarioReset({
    storedVersion: null,
    storedWorkspaceNodes: undefined,
    storedTags: undefined,
  });

  assert.equal(result.didReset, true);
  assert.equal(result.workspaceNodes.filter((node) => node.kind === "task").length, allTeamWorkspaceNodes.filter((node) => node.kind === "task").length);
  assert.equal(result.tags.length, multiTeamTags.length);
  assert.deepEqual(new Set(result.workspaceNodes.filter((node) => node.kind === "task").map((node) => node.teamId)), new Set([
    "creator-commerce",
    "platform",
    "supply-operations",
    "customer-success",
  ]));
});

test("当前版本保留用户后续创建的任务和标签，不重复重置", () => {
  const customTask = {
    id: "user-created-task",
    kind: "task" as const,
    name: "用户后续创建的任务",
    parentId: "workspace-root",
    ownerId: "陈默",
    status: "待开始" as const,
    updatedAt: "刚刚",
  };
  const customTag = { id: "user-tag", name: "用户标签", icon: "tag" as const, color: "pink" as const };
  const storedWorkspaceNodes = [...workspaceNodes, customTask];
  const storedTags = [...creatorCommerceTags, customTag];

  const result = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes,
    storedTags,
  });

  assert.equal(result.didReset, false);
  assert.ok(result.workspaceNodes.some((node) => node.id === customTask.id));
  assert.ok(result.tags.some((tag) => tag.id === customTag.id));
});

test("v15 升级清理重复确认产生的整批任务，只保留较早的一批", () => {
  const plannerTask = (id: string, name: string, createdAt: string, extra: Partial<TaskNode> = {}): TaskNode => ({
    id,
    kind: "task",
    teamId: "creator-commerce",
    name,
    parentId: "workspace-root",
    ownerId: "",
    proposedOwnerId: "韩序",
    participantIds: ["周岚"],
    status: "待开始",
    goal: "交付可核对的带货执行结果。",
    completionCriteria: ["结果经过负责人核对。"],
    labels: ["内容制作"],
    updatedAt: "刚刚",
    createdFrom: "task-planner",
    createdBy: "周岚",
    createdAt,
    ...extra,
  });
  const firstMain = plannerTask("planner-main-a", "新品带货项目", "2026-09-02T08:00:00.000Z");
  const firstChild = plannerTask("planner-child-a", "搭建数据看板并完成复盘", "2026-09-02T08:00:00.000Z", {
    parentTaskId: firstMain.id,
    effortEstimate: { basis: "model", confirmed: false, minutes: 240, reason: "按当前范围估算", scopeKey: "same-scope", version: 1, workMethod: "AI 汇总，人工核对" },
  });
  const secondMain = plannerTask("planner-main-b", "新品带货项目", "2026-09-02T08:05:00.000Z");
  const secondChild = plannerTask("planner-child-b", "搭建数据看板并完成复盘", "2026-09-02T08:05:00.000Z", {
    parentTaskId: secondMain.id,
    effortEstimate: { basis: "model", confirmed: false, minutes: 240, reason: "按当前范围估算", scopeKey: "same-scope", version: 1, workMethod: "AI 汇总，人工核对" },
  });
  const sameTitleButDifferentScope = plannerTask("planner-distinct", "搭建数据看板并完成复盘", "2026-09-02T08:10:00.000Z", {
    goal: "交付另一场活动的数据复盘。",
  });

  const result = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v15-mock-effort-coverage",
    storedWorkspaceNodes: [...allTeamWorkspaceNodes, firstMain, firstChild, secondMain, secondChild, sameTitleButDifferentScope],
    storedTags: multiTeamTags,
  });

  assert.equal(result.didReset, true);
  assert.ok(result.workspaceNodes.some((node) => node.id === firstMain.id));
  assert.ok(result.workspaceNodes.some((node) => node.id === firstChild.id));
  assert.ok(result.workspaceNodes.some((node) => node.id === sameTitleButDifferentScope.id));
  assert.ok(!result.workspaceNodes.some((node) => node.id === secondMain.id));
  assert.ok(!result.workspaceNodes.some((node) => node.id === secondChild.id));
});

test("v5 升级只补入发布会任务组并保留用户任务，v7 后尊重删除", () => {
  const launchIds = new Set(["product-launch-planning", "product-launch-venue", "product-launch-run-of-show", "product-launch-promo-assets"]);
  const customTask = {
    id: "user-v5-task",
    kind: "task" as const,
    name: "v5 用户任务",
    parentId: "workspace-root",
    ownerId: "周岚",
    status: "待开始" as const,
    updatedAt: "刚刚",
  };
  const v5Nodes = [...workspaceNodes.filter((node) => !launchIds.has(node.id)), customTask];
  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v5",
    storedWorkspaceNodes: v5Nodes,
    storedTags: creatorCommerceTags,
  });

  assert.equal(upgraded.didReset, true);
  assert.equal(upgraded.version, creatorCommerceScenarioVersion);
  assert.ok(upgraded.workspaceNodes.some((node) => node.id === customTask.id));
  assert.deepEqual(upgraded.workspaceNodes.filter((node) => launchIds.has(node.id)).map(({ id }) => id), [...launchIds]);

  const repeated = resolveWorkspaceScenarioReset({
    storedVersion: upgraded.version,
    storedWorkspaceNodes: upgraded.workspaceNodes,
    storedTags: upgraded.tags,
  });
  assert.equal(repeated.didReset, false);
  assert.equal(repeated.workspaceNodes.filter((node) => launchIds.has(node.id)).length, 4);

  const afterDelete = resolveWorkspaceScenarioReset({
    storedVersion: upgraded.version,
    storedWorkspaceNodes: upgraded.workspaceNodes.filter((node) => node.id !== "product-launch-venue"),
    storedTags: upgraded.tags,
  });
  assert.equal(afterDelete.didReset, false);
  assert.ok(!afterDelete.workspaceNodes.some((node) => node.id === "product-launch-venue"));
});

test("v6 升级只更新依赖就绪 Mock 并保留其他任务", () => {
  const customTask = {
    id: "user-v6-task",
    kind: "task" as const,
    name: "v6 用户任务",
    parentId: "workspace-root",
    ownerId: "周岚",
    status: "进行中" as const,
    updatedAt: "刚刚",
  };
  const v6Nodes = workspaceNodes.map((node) => node.id === "fragrance-data" && node.kind === "task"
    ? { ...node, status: "待开始" as const }
    : node);
  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v6-product-launch",
    storedWorkspaceNodes: [...v6Nodes, customTask],
    storedTags: creatorCommerceTags,
  });

  const dataTask = upgraded.workspaceNodes.find((node) => node.id === "fragrance-data");
  assert.equal(upgraded.didReset, true);
  assert.equal(dataTask?.kind === "task" ? dataTask.status : null, "已完成");
  assert.ok(upgraded.workspaceNodes.some((node) => node.id === customTask.id));
});

test("v7 升级保留达人团队编辑与删除，只补齐新团队并且重复执行幂等", () => {
  const editedName = "用户已改名的 GMV 复盘";
  const deletedCreatorTaskId = "fragrance-content";
  const customTask = {
    id: "user-v7-custom-task",
    kind: "task" as const,
    teamId: "creator-commerce",
    name: "用户在 v7 新建的复盘任务",
    parentId: "workspace-root",
    ownerId: "韩序",
    status: "进行中" as const,
    updatedAt: "刚刚",
  };
  const customTag = { id: "user-v7-tag", name: "用户保留标签", icon: "tag" as const, color: "pink" as const };
  const v7Nodes = workspaceNodes
    .filter((node) => node.id !== deletedCreatorTaskId)
    .map((node) => node.id === "fragrance-data" ? { ...node, name: editedName } : node)
    .concat(customTask);

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "creator-commerce-v7-dependency-readiness",
    storedWorkspaceNodes: v7Nodes,
    storedTags: [...creatorCommerceTags, customTag],
  });

  assert.equal(upgraded.didReset, true);
  assert.equal(upgraded.version, creatorCommerceScenarioVersion);
  assert.equal(upgraded.workspaceNodes.find((node) => node.id === "fragrance-data")?.name, editedName);
  assert.ok(!upgraded.workspaceNodes.some((node) => node.id === deletedCreatorTaskId));
  assert.ok(upgraded.workspaceNodes.some((node) => node.id === customTask.id));
  assert.ok(upgraded.tags.some((tag) => tag.id === customTag.id));
  for (const fixtureId of ["platform-mobile-release", "factory-pilot-ramp", "service-incident-recovery"]) {
    assert.equal(upgraded.workspaceNodes.filter((node) => node.id === fixtureId).length, 1);
  }

  const repeated = resolveWorkspaceScenarioReset({
    storedVersion: upgraded.version,
    storedWorkspaceNodes: upgraded.workspaceNodes.filter((node) => node.id !== "platform-security-gate"),
    storedTags: upgraded.tags,
  });
  assert.equal(repeated.didReset, false);
  assert.ok(!repeated.workspaceNodes.some((node) => node.id === "platform-security-gate"));
  assert.equal(new Set(repeated.workspaceNodes.map((node) => node.id)).size, repeated.workspaceNodes.length);
});

test("v8 升级只补高密度任务池，保留旧任务编辑、删除与用户节点", () => {
  const expansionIds = new Set(teamWorkspaceExpansionNodes.map((node) => node.id));
  const deletedOldFixtureId = "platform-security-gate";
  const editedOldFixtureId = "service-data-repair";
  const editedName = "用户已改名的数据修复任务";
  const customTask = {
    id: "user-v8-custom-task",
    kind: "task" as const,
    teamId: "platform",
    name: "用户在 v8 新建的专项任务",
    parentId: "platform-workspace",
    ownerId: "程砚",
    status: "进行中" as const,
    updatedAt: "刚刚",
  };
  const v8Nodes = allTeamWorkspaceNodes
    .filter((node) => !expansionIds.has(node.id) && node.id !== deletedOldFixtureId)
    .map((node) => node.id === editedOldFixtureId ? { ...node, name: editedName } : node)
    .concat(customTask);

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v8-complex-evidence",
    storedWorkspaceNodes: v8Nodes,
    storedTags: multiTeamTags,
  });

  assert.equal(upgraded.didReset, true);
  assert.equal(upgraded.version, creatorCommerceScenarioVersion);
  assert.equal(upgraded.workspaceNodes.find((node) => node.id === editedOldFixtureId)?.name, editedName);
  assert.ok(!upgraded.workspaceNodes.some((node) => node.id === deletedOldFixtureId));
  assert.ok(upgraded.workspaceNodes.some((node) => node.id === customTask.id));
  assert.ok(teamWorkspaceExpansionNodes.every((fixture) => upgraded.workspaceNodes.filter((node) => node.id === fixture.id).length === 1));

  const deletedNewFixtureId = teamWorkspaceExpansionNodes[0]!.id;
  const repeated = resolveWorkspaceScenarioReset({
    storedVersion: upgraded.version,
    storedWorkspaceNodes: upgraded.workspaceNodes.filter((node) => node.id !== deletedNewFixtureId),
    storedTags: upgraded.tags,
  });
  assert.equal(repeated.didReset, false);
  assert.ok(!repeated.workspaceNodes.some((node) => node.id === deletedNewFixtureId));
});

test("v9 升级只移除旧默认单项硬依赖，并保留任务与标签编辑", () => {
  const editedName = "用户已改名的 GMV 归因复盘";
  const deletedTaskId = "fragrance-content";
  const deletedTagId = multiTeamTags[0]!.id;
  const customTask = {
    id: "user-v9-custom-task",
    kind: "task" as const,
    teamId: "creator-commerce",
    name: "用户在 v9 新建的复盘任务",
    parentId: "workspace-root",
    ownerId: "韩序",
    status: "进行中" as const,
    updatedAt: "刚刚",
  };
  const customTag = { id: "user-v9-tag", name: "用户在 v9 新建的标签", icon: "tag" as const, color: "pink" as const };
  const v9Nodes = allTeamWorkspaceNodes
    .filter((node) => node.id !== deletedTaskId)
    .map((node) => node.id === "fragrance-data" && node.kind === "task"
      ? { ...node, name: editedName, dependsOnTaskIds: ["fragrance-growth"] }
      : node)
    .concat(customTask);

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v9-dense-workspace",
    storedWorkspaceNodes: v9Nodes,
    storedTags: multiTeamTags.filter((tag) => tag.id !== deletedTagId).concat(customTag),
  });

  const dataTask = upgraded.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "fragrance-data");
  assert.equal(upgraded.didReset, true);
  assert.equal(upgraded.version, creatorCommerceScenarioVersion);
  assert.equal(dataTask?.name, editedName);
  assert.equal(dataTask?.dependsOnTaskIds, undefined);
  assert.ok(!upgraded.workspaceNodes.some((node) => node.id === deletedTaskId));
  assert.ok(upgraded.workspaceNodes.some((node) => node.id === customTask.id));
  assert.ok(!upgraded.tags.some((tag) => tag.id === deletedTagId));
  assert.ok(upgraded.tags.some((tag) => tag.id === customTag.id));

  const repeated = resolveWorkspaceScenarioReset({
    storedVersion: upgraded.version,
    storedWorkspaceNodes: upgraded.workspaceNodes,
    storedTags: upgraded.tags,
  });
  assert.equal(repeated.didReset, false);
  assert.equal(repeated.workspaceNodes.find((node) => node.id === "fragrance-data")?.name, editedName);
});

test("v9 默认 fixture 升级会清理状态标签并修正已经开始任务的计划开始日", () => {
  const currentTasks = new Map(allTeamWorkspaceNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .map((task) => [task.id, task]));
  const v9Nodes = allTeamWorkspaceNodes.map((node) => node.kind !== "task" ? node : {
    ...node,
    ...(v9StatusLabelsByTaskId[node.id] ? { labels: [...v9StatusLabelsByTaskId[node.id]!] } : {}),
    ...(v9PlannedStartByTaskId[node.id] ? { plannedStartOn: v9PlannedStartByTaskId[node.id] } : {}),
  });

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v9-dense-workspace",
    storedWorkspaceNodes: v9Nodes,
    storedTags: [...multiTeamTags, ...v9StatusTags],
  });
  const upgradedTasks = new Map(upgraded.workspaceNodes
    .filter((node): node is TaskNode => node.kind === "task")
    .map((task) => [task.id, task]));

  for (const taskId of Object.keys(v9StatusLabelsByTaskId)) {
    assert.deepEqual(upgradedTasks.get(taskId)?.labels, currentTasks.get(taskId)?.labels, `${taskId} 应清除旧状态标签`);
  }
  for (const taskId of Object.keys(v9PlannedStartByTaskId)) {
    assert.equal(upgradedTasks.get(taskId)?.plannedStartOn, "2026-09-01", `${taskId} 应前移至分析日`);
  }
  assert.ok(upgraded.tags.every((tag) => tag.id !== "team-blocked" && tag.id !== "team-review"));
});

test("v9 定向迁移逐字段保留用户改写的标签、日期、标签定义与任务删除", () => {
  const deletedTaskId = "platform-audit-event-dictionary";
  const customLabels = ["产能", "用户保留标签", "已阻塞"];
  const customStartOn = "2026-08-30";
  const customBlockedTag: TagDefinition = { id: "team-blocked", name: "已阻塞", icon: "flag", color: "pink" };
  const storedWorkspaceNodes = allTeamWorkspaceNodes
    .filter((node) => node.id !== deletedTaskId)
    .map((node) => {
      if (node.kind !== "task") return node;
      if (node.id === "factory-capacity-trial") return {
        ...node,
        labels: customLabels,
        plannedStartOn: v9PlannedStartByTaskId[node.id],
      };
      if (node.id === "csx-retail-outcome-evidence") return {
        ...node,
        labels: v9StatusLabelsByTaskId[node.id],
        plannedStartOn: customStartOn,
      };
      return node;
    });

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v9-dense-workspace",
    storedWorkspaceNodes,
    storedTags: [...multiTeamTags, customBlockedTag],
  });
  const capacityTrial = upgraded.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "factory-capacity-trial");
  const outcomeEvidence = upgraded.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "csx-retail-outcome-evidence");

  assert.deepEqual(capacityTrial?.labels, customLabels);
  assert.equal(capacityTrial?.plannedStartOn, "2026-09-01", "未改写的旧日期仍应独立迁移");
  assert.deepEqual(outcomeEvidence?.labels, ["客户影响"], "未改写的旧标签仍应独立迁移");
  assert.equal(outcomeEvidence?.plannedStartOn, customStartOn);
  assert.ok(!upgraded.workspaceNodes.some((node) => node.id === deletedTaskId));
  assert.deepEqual(upgraded.tags.find((tag) => tag.id === customBlockedTag.id), customBlockedTag);
  assert.ok(!upgraded.tags.some((tag) => tag.id === "team-review"));
});

test("v9 升级保留用户改写过的依赖组合", () => {
  const customDependency = {
    id: "user-v9-data-prerequisite",
    kind: "task" as const,
    teamId: "creator-commerce",
    name: "用户自定义的数据前置",
    parentId: "workspace-root",
    ownerId: "韩序",
    status: "已完成" as const,
    updatedAt: "刚刚",
  };
  const storedWorkspaceNodes = allTeamWorkspaceNodes
    .map((node) => node.id === "fragrance-data" && node.kind === "task"
      ? { ...node, dependsOnTaskIds: ["fragrance-growth", customDependency.id] }
      : node)
    .concat(customDependency);

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v9-dense-workspace",
    storedWorkspaceNodes,
    storedTags: multiTeamTags,
  });
  const dataTask = upgraded.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "fragrance-data");

  assert.equal(upgraded.didReset, true);
  assert.deepEqual(dataTask?.dependsOnTaskIds, ["fragrance-growth", customDependency.id]);
});

test("v10 升级补齐复盘 Mock 的标准与子任务，同时保留用户任务和显式清空", () => {
  const weeklyChildIds = new Set(["weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions"]);
  const customTask = {
    id: "user-v10-task",
    kind: "task" as const,
    name: "用户在 v10 新建的任务",
    parentId: "workspace-root",
    ownerId: "周岚",
    status: "待开始" as const,
    updatedAt: "刚刚",
  };
  const v10Nodes = allTeamWorkspaceNodes
    .filter((node) => !weeklyChildIds.has(node.id))
    .map((node) => node.kind === "task" && node.id === "weekly-retro-notes"
      ? { ...node, completionCriteria: [] as string[], executionTips: undefined, plannedStartOn: undefined, plannedEndOn: undefined }
      : node);
  const result = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v10-dependency-semantics",
    storedWorkspaceNodes: [...v10Nodes, customTask],
    storedTags: multiTeamTags,
  });
  const root = result.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes")!;
  const children = result.workspaceNodes.filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === root.id);

  assert.equal(result.didReset, true);
  assert.deepEqual(root.completionCriteria, [], "显式清空的标准不能被迁移回填");
  assert.ok(root.executionTips?.length);
  assert.equal(children.length, 3);
  assert.ok(children.every((child) => child.effortEstimate?.basis === "mock"));
  assert.ok(result.workspaceNodes.some((node) => node.id === customTask.id));

  const withoutCriteria = v10Nodes.map((node) => {
    if (node.kind !== "task" || node.id !== "weekly-retro-notes") return node;
    const { completionCriteria: _missing, ...rest } = node;
    return rest;
  });
  const populated = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v10-dependency-semantics",
    storedWorkspaceNodes: withoutCriteria,
    storedTags: multiTeamTags,
  });
  const populatedRoot = populated.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes")!;
  assert.ok(populatedRoot.completionCriteria && populatedRoot.completionCriteria.length >= 2, "旧版缺失字段应补齐业务标准");
});

test("v11 早期快照也会补齐复盘子任务，并保留用户改过的根任务字段", () => {
  const weeklyChildIds = new Set(["weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions"]);
  const decisionFixture = allTeamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-decisions")!;
  const storedWorkspaceNodes = [...allTeamWorkspaceNodes
    .filter((node) => !weeklyChildIds.has(node.id))
    .map((node) => node.kind === "task" && node.id === "weekly-retro-notes"
      ? { ...node, name: "用户改过的复盘名称", status: "已阻塞" as const, completionCriteria: [] as string[] }
      : node), {
        ...decisionFixture,
        effortEstimate: decisionFixture.effortEstimate ? { ...decisionFixture.effortEstimate, scopeKey: "user-v11-scope" } : undefined,
      }];
  const result = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v11-weekly-retro-insight",
    storedWorkspaceNodes,
    storedTags: multiTeamTags,
  });
  const root = result.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes")!;
  const children = result.workspaceNodes.filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === root.id);

  assert.equal(result.didReset, true);
  assert.equal(root.name, "用户改过的复盘名称");
  assert.equal(root.status, "已阻塞");
  assert.deepEqual(root.completionCriteria, []);
  assert.equal(children.length, 3);
  assert.ok(children.every((child) => child.effortEstimate?.basis === "mock"));
  assert.equal(children.find((child) => child.id === decisionFixture.id)?.effortEstimate?.scopeKey, "user-v11-scope");
});

test("v12 与 v13 早期复盘估算只修正未编辑的 scopeKey，保留用户改过的工时", () => {
  const earlyNodes = allTeamWorkspaceNodes.map((node) => {
    if (node.kind !== "task" || !node.id.startsWith("weekly-retro-") || node.id === "weekly-retro-notes" || !node.effortEstimate) return node;
    return {
      ...node,
      effortEstimate: {
        ...node.effortEstimate,
        ...(node.id === "weekly-retro-actions" ? { minutes: 999 } : {}),
        scopeKey: "early-v12-child-goal-scope",
      },
    };
  });
  const currentById = new Map(allTeamWorkspaceNodes.map((node) => [node.id, node]));
  for (const storedVersion of ["multi-team-v12-weekly-retro-insight", "multi-team-v13-weekly-retro-insight"]) {
    const result = resolveWorkspaceScenarioReset({ storedVersion, storedWorkspaceNodes: earlyNodes, storedTags: multiTeamTags });
    const migratedById = new Map(result.workspaceNodes.map((node) => [node.id, node]));

    assert.equal(result.didReset, true);
    for (const id of ["weekly-retro-decisions", "weekly-retro-open-issues"]) {
      const current = currentById.get(id);
      const migrated = migratedById.get(id);
      assert.equal(migrated?.kind === "task" ? migrated.effortEstimate?.scopeKey : null,
        current?.kind === "task" ? current.effortEstimate?.scopeKey : null);
    }
    const edited = migratedById.get("weekly-retro-actions");
    assert.equal(edited?.kind === "task" ? edited.effortEstimate?.minutes : null, 999);
    assert.equal(edited?.kind === "task" ? edited.effortEstimate?.scopeKey : null, "early-v12-child-goal-scope");
  }
});

test("v12 与 v13 的定向修复不补回已删除叶子，也不回填根任务缺失字段", () => {
  const storedNodes = allTeamWorkspaceNodes
    .filter((node) => node.id !== "weekly-retro-actions")
    .map((node) => {
      if (node.kind !== "task" || node.id !== "weekly-retro-notes") return node;
      const { completionCriteria: _criteria, executionTips: _tips, plannedStartOn: _start, plannedEndOn: _end, ...root } = node;
      return root;
    });

  for (const storedVersion of ["multi-team-v12-weekly-retro-insight", "multi-team-v13-weekly-retro-insight"]) {
    const result = resolveWorkspaceScenarioReset({ storedVersion, storedWorkspaceNodes: storedNodes, storedTags: multiTeamTags });
    const root = result.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes")!;
    assert.equal(result.workspaceNodes.some((node) => node.id === "weekly-retro-actions"), false);
    assert.equal(root.completionCriteria, undefined);
    assert.equal(root.executionTips, undefined);
    assert.equal(root.plannedStartOn, undefined);
    assert.equal(root.plannedEndOn, undefined);
  }
});

test("v14 安全补齐 Mock 叶子并修复继承范围，不覆盖用户估算或复活删除项", () => {
  const newlyEstimatedIds = new Set([
    "fragrance-creator-business", "fragrance-content", "fragrance-live", "fragrance-product",
    "fragrance-growth", "fragrance-data", "fragrance-compliance", "fragrance-final-decision",
    "product-launch-venue", "product-launch-run-of-show", "product-launch-promo-assets",
  ]);
  const deletedId = "product-launch-promo-assets";
  const editedEstimateId = "platform-scim-idempotency";
  const repairEstimateId = "platform-security-gate";
  const customTask = {
    id: "user-v14-effort-task",
    kind: "task" as const,
    teamId: "platform",
    name: "用户自己的待开始任务",
    parentId: "platform-workspace",
    ownerId: "周岚",
    status: "待开始" as const,
    goal: "保留用户范围",
    updatedAt: "刚刚",
  };
  const explicitUnknown = {
    minutes: null,
    workMethod: "",
    reason: "",
    basis: "unknown" as const,
    confirmed: false,
    scopeKey: "",
    version: 4,
  };
  const v14Nodes = allTeamWorkspaceNodes
    .filter((node) => node.id !== deletedId)
    .map((node) => {
      if (node.kind !== "task") return node;
      if (node.id === "product-launch-planning") {
        const { completionCriteria: _criteria, executionTips: _tips, ...legacy } = node;
        return { ...legacy, goal: "用户改过的发布会总体目标" };
      }
      if (node.id === "fragrance-creator-wrapup") {
        const { completionCriteria: _criteria, executionTips: _tips, ...legacy } = node;
        return legacy;
      }
      if (node.id === "fragrance-compliance") {
        const { completionCriteria: _criteria, executionTips: _tips, ...legacy } = node;
        return { ...legacy, effortEstimate: explicitUnknown };
      }
      if (newlyEstimatedIds.has(node.id)) {
        const { completionCriteria: _criteria, effortEstimate: _effort, executionTips: _tips, ...legacy } = node;
        return legacy;
      }
      if (!node.effortEstimate || node.effortEstimate.basis !== "mock") return node;
      return {
        ...node,
        effortEstimate: {
          ...node.effortEstimate,
          ...(node.id === editedEstimateId ? { minutes: node.effortEstimate.minutes! + 60 } : {}),
          scopeKey: getEffortScopeKey(node, node.effortEstimate.workMethod),
        },
      };
    })
    .concat(customTask);

  const result = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v14-weekly-retro-insight",
    storedWorkspaceNodes: v14Nodes,
    storedTags: multiTeamTags,
  });
  const migrated = result.workspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const migratedById = new Map(migrated.map((task) => [task.id, task]));

  assert.equal(result.didReset, true);
  assert.equal(result.version, creatorCommerceScenarioVersion);
  assert.ok(migratedById.has(customTask.id));
  assert.equal(migratedById.has(deletedId), false);
  assert.equal(migratedById.get("fragrance-creator-business")?.effortEstimate?.basis, "mock");
  assert.ok(migratedById.get("fragrance-creator-business")?.completionCriteria?.length);
  assert.ok(migratedById.get("fragrance-creator-wrapup")?.completionCriteria?.length, "未编辑的父任务补齐完成标准但不写直接工时");
  assert.equal(getTaskEffortState(getWorkspaceEffortLeaves(result.workspaceNodes, "fragrance-creator-business")[0]!), "proposed");
  assert.deepEqual(migratedById.get("fragrance-compliance")?.effortEstimate, explicitUnknown, "显式清空不能被 Mock 回填覆盖");
  assert.equal(migratedById.get("product-launch-run-of-show")?.effortEstimate, undefined, "父目标改写后不注入已过期的 fixture 估算");
  assert.equal(migratedById.get(editedEstimateId)?.effortEstimate?.minutes,
    allTeamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === editedEstimateId)!.effortEstimate!.minutes! + 60,
    "用户改过的工时不能被迁移覆盖");
  assert.equal(getTaskEffortState(getWorkspaceEffortLeaves(result.workspaceNodes, repairEstimateId)[0]!), "proposed", "未编辑 Mock 的旧 scopeKey 应安全修复");
  assert.equal(migratedById.get("product-launch-planning")?.effortEstimate, undefined, "父任务仍只汇总叶子");
  assert.equal(migratedById.get("product-launch-planning")?.completionCriteria, undefined, "父目标改写后不回填旧 fixture 标准");
});

test("v7 到 v9 跨版本升级会在旧迁移后统一补齐复盘标准与三个叶子", () => {
  const weeklyChildIds = new Set(["weekly-retro-decisions", "weekly-retro-open-issues", "weekly-retro-actions"]);
  const legacyNodes = allTeamWorkspaceNodes
    .filter((node) => !weeklyChildIds.has(node.id))
    .map((node) => {
      if (node.kind !== "task" || node.id !== "weekly-retro-notes") return node;
      const { completionCriteria: _criteria, executionTips: _tips, plannedStartOn: _start, plannedEndOn: _end, ...rest } = node;
      return rest;
    });

  for (const storedVersion of [
    "creator-commerce-v7-dependency-readiness",
    "multi-team-v8-complex-evidence",
    "multi-team-v9-dense-workspace",
  ]) {
    const result = resolveWorkspaceScenarioReset({ storedVersion, storedWorkspaceNodes: legacyNodes, storedTags: multiTeamTags });
    const root = result.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "weekly-retro-notes")!;
    const children = result.workspaceNodes.filter((node) => node.kind === "task" && node.parentTaskId === root.id);
    assert.ok(root.completionCriteria?.length, storedVersion);
    assert.equal(children.length, 3, storedVersion);
  }
});

test("fixture 包含达人带货项目、独立发布会项目和代表性独立任务", () => {
  const folders = workspaceNodes.filter((node) => node.kind === "folder");
  const tasks = workspaceNodes.filter((node) => node.kind === "task");
  const mainTask = tasks.find((task) => task.id === "fragrance-creator-wrapup");
  const children = tasks.filter((task) => task.parentTaskId === mainTask?.id);

  assert.deepEqual(folders.map(({ id, parentId }) => ({ id, parentId })), [
    { id: "workspace-root", parentId: null },
    { id: "fragrance-campaign", parentId: "workspace-root" },
  ]);
  assert.equal(tasks.length, 21);
  assert.equal(mainTask?.ownerId, "周岚");
  assert.equal(mainTask?.name, "香氛礼盒达人带货收尾");
  assert.equal(mainTask?.parentId, "fragrance-campaign");
  assert.deepEqual(Object.fromEntries(children.map((task) => [task.name, task.ownerId])), {
    "确认第二批达人名单与合作档期": "陈默",
    "终审短视频脚本与直播卖点": "林洁",
    "完成直播间彩排与场控清单": "高远",
    "锁定礼盒价格、赠品与库存": "梁川",
    "调整第二轮投流预算与人群包": "许宁",
    "更新 GMV 看板与渠道归因": "韩序",
    "审核素材宣称与达人合同": "苏禾",
    "确认追加投放目标与最终决策": "周岚",
  });
  assert.equal(children.length, 8);
  assert.equal(tasks.find((task) => task.id === "fragrance-data")?.dependsOnTaskIds, undefined);
  assert.ok(tasks.some((task) => task.id === "weekly-retro-notes" && !task.parentTaskId && !task.dependsOnTaskIds));
  const launchParent = tasks.find((task) => task.id === "product-launch-planning");
  const launchChildren = tasks.filter((task) => task.parentTaskId === launchParent?.id);
  assert.equal(launchParent?.status, "进行中");
  assert.equal(launchParent?.ownerId, "周岚");
  assert.equal(launchParent?.dueAt, "9 月 20 日");
  assert.equal(launchParent?.plannedStartOn, "2026-08-30");
  assert.equal(launchParent?.plannedEndOn, "2026-09-20");
  assert.deepEqual(launchParent?.labels, ["高优先级", "内容制作"]);
  assert.deepEqual(launchChildren.map(({ name }) => name), ["场地确认", "发布会流程设计", "宣传物料制作"]);
  const runOfShowChildren = tasks.filter((task) => task.parentTaskId === "product-launch-run-of-show");
  assert.deepEqual(runOfShowChildren.map(({ name }) => name), [
    "确认发布会议程与时长",
    "完善主持人串词与转场",
    "核对嘉宾衔接与导播 cue",
    "完成发布会流程联排",
  ]);
  assert.ok(runOfShowChildren.every((task) => task.goal && task.completionCriteria?.length));
  assert.deepEqual(Object.fromEntries(runOfShowChildren.map((task) => [task.id, task.status])), {
    "product-launch-agenda-timing": "已完成",
    "product-launch-host-script": "进行中",
    "product-launch-guest-cue": "进行中",
    "product-launch-flow-rehearsal": "待开始",
  });
  assert.equal(runOfShowChildren.find((task) => task.id === "product-launch-agenda-timing")?.completedAt, "2026-09-04T17:30:00.000Z");
  assert.equal(tasks.find((task) => task.id === "product-launch-run-of-show")?.effortEstimate, undefined);
  assert.ok(children.every((task) => task.parentId === "fragrance-campaign"));
  assert.ok(workspaceNodes.every((node) => !/(零售|灰度|退款|POS)/i.test(`${node.name} ${node.kind === "task" ? node.labels?.join(" ") ?? "" : ""}`)));
});


test("fresh fixture 和无版本初始化都包含发布会流程设计的嵌套子任务", () => {
  const nestedIds = [
    "product-launch-agenda-timing",
    "product-launch-host-script",
    "product-launch-guest-cue",
    "product-launch-flow-rehearsal",
  ];
  const fresh = resolveWorkspaceScenarioReset({ storedVersion: null, storedWorkspaceNodes: null, storedTags: null });

  assert.ok(nestedIds.every((id) => allTeamWorkspaceNodes.some((node) => node.id === id)));
  assert.ok(nestedIds.every((id) => fresh.workspaceNodes.some((node) => node.id === id)));
});

test("v16 到 v20 的旧存储都会补齐发布会流程设计嵌套子任务", () => {
  const nestedIds = [
    "product-launch-agenda-timing",
    "product-launch-host-script",
    "product-launch-guest-cue",
    "product-launch-flow-rehearsal",
  ];
  const legacyNodes = allTeamWorkspaceNodes.filter((node) => !nestedIds.includes(node.id));

  for (const storedVersion of [
    "multi-team-v16-planner-dedupe",
    "multi-team-v17-unassigned-tasks",
    "multi-team-v18-unassigned-effort",
    "multi-team-v19-deletion-family",
    "multi-team-v20-product-launch-nested-subtasks",
  ]) {
    const result = resolveWorkspaceScenarioReset({ storedVersion, storedWorkspaceNodes: legacyNodes, storedTags: multiTeamTags });
    const children = result.workspaceNodes.filter((node) => node.kind === "task" && node.parentTaskId === "product-launch-run-of-show");

    assert.equal(result.version, creatorCommerceScenarioVersion, storedVersion);
    assert.equal(result.didMigrate, true, storedVersion);
    assert.deepEqual(children.map((task) => task.id), nestedIds, storedVersion);
  }
});

test("v20 纠偏不补回用户已部分删除的发布会流程设计嵌套子任务", () => {
  const nestedIds = [
    "product-launch-agenda-timing",
    "product-launch-host-script",
    "product-launch-guest-cue",
    "product-launch-flow-rehearsal",
  ];
  const keptNestedTask = allTeamWorkspaceNodes.find((node) => node.id === "product-launch-agenda-timing")!;
  const partialNodes = [
    ...allTeamWorkspaceNodes.filter((node) => !nestedIds.includes(node.id)),
    keptNestedTask,
  ];

  const result = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v20-product-launch-nested-subtasks",
    storedWorkspaceNodes: partialNodes,
    storedTags: multiTeamTags,
  });

  assert.equal(result.version, creatorCommerceScenarioVersion);
  assert.equal(result.didMigrate, true);
  assert.deepEqual(result.workspaceNodes.filter((node) => nestedIds.includes(node.id)).map((node) => node.id), ["product-launch-agenda-timing"]);
});

test("v19 升级只给发布会流程设计补一次嵌套子任务", () => {
  const nestedIds = [
    "product-launch-agenda-timing",
    "product-launch-host-script",
    "product-launch-guest-cue",
    "product-launch-flow-rehearsal",
  ];
  const deletedExistingFixtureId = "product-launch-promo-assets";
  const staleParentEffort = (allTeamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "product-launch-venue")?.effortEstimate)!;
  const legacyNodes = allTeamWorkspaceNodes
    .filter((node) => !nestedIds.includes(node.id) && node.id !== deletedExistingFixtureId)
    .map((node) => node.kind === "task" && node.id === "product-launch-run-of-show"
      ? { ...node, goal: "用户改过的流程目标", status: "已阻塞" as const, effortEstimate: { ...staleParentEffort } }
      : node);
  const customNode = { id: "user-kept-v19-task", kind: "task" as const, name: "用户自己的任务", parentId: "workspace-root", teamId: "creator-commerce", ownerId: "周岚", status: "待开始" as const, updatedAt: "刚刚" };
  const result = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v19-deletion-family",
    storedWorkspaceNodes: [...legacyNodes, customNode],
    storedTags: multiTeamTags,
  });
  const tasks = result.workspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const byId = new Map(tasks.map((task) => [task.id, task]));

  assert.equal(result.version, creatorCommerceScenarioVersion);
  assert.equal(result.didMigrate, true);
  assert.deepEqual(nestedIds.map((id) => byId.get(id)?.parentTaskId), [
    "product-launch-run-of-show",
    "product-launch-run-of-show",
    "product-launch-run-of-show",
    "product-launch-run-of-show",
  ]);
  assert.ok(nestedIds.every((id) => byId.get(id)?.completionCriteria?.length));
  assert.equal(byId.get("product-launch-run-of-show")?.goal, "用户改过的流程目标");
  assert.equal(byId.get("product-launch-run-of-show")?.status, "已阻塞");
  assert.equal(byId.get("product-launch-run-of-show")?.effortEstimate, undefined);
  assert.equal(byId.has(deletedExistingFixtureId), false);
  assert.ok(byId.has(customNode.id));

  const rerun = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes: result.workspaceNodes.filter((node) => node.id !== "product-launch-host-script"),
    storedTags: result.tags,
  });
  assert.equal(rerun.workspaceNodes.some((node) => node.id === "product-launch-host-script"), false, "当前版本中用户删除的新增子任务不能复活");
  assert.equal(rerun.workspaceNodes.filter((node) => nestedIds.includes(node.id)).length, 3);
});

test("发布会 Mock 为三个一级子任务提供 1、4、3 个直接下级", () => {
  const tasks = allTeamWorkspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const directCount = (parentTaskId: string) => tasks.filter((task) => task.parentTaskId === parentTaskId).length;

  assert.equal(directCount("product-launch-venue"), 1);
  assert.equal(directCount("product-launch-run-of-show"), 4);
  assert.equal(directCount("product-launch-promo-assets"), 3);
  assert.equal(tasks.find((task) => task.id === "product-launch-venue")?.effortEstimate, undefined);
  assert.equal(tasks.find((task) => task.id === "product-launch-promo-assets")?.effortEstimate, undefined);
});

test("v21 只补一次下级数量示例并保留用户确认的父任务估算", () => {
  const detailIds = [
    "product-launch-venue-contract",
    "product-launch-promo-key-visual",
    "product-launch-promo-invitation",
    "product-launch-promo-channel-assets",
  ];
  const fixtureEstimate = allTeamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === detailIds[0])?.effortEstimate;
  assert.ok(fixtureEstimate);
  const legacyNodes = allTeamWorkspaceNodes
    .filter((node) => !detailIds.includes(node.id))
    .map((node) => node.kind === "task" && node.id === "product-launch-venue"
      ? { ...node, effortEstimate: { ...fixtureEstimate, basis: "manual" as const, confirmed: true } }
      : node.kind === "task" && node.id === "product-launch-promo-assets"
        ? { ...node, effortEstimate: { ...fixtureEstimate } }
        : node);

  const upgraded = resolveWorkspaceScenarioReset({
    storedVersion: "multi-team-v21-product-launch-nested-subtasks-repair",
    storedWorkspaceNodes: legacyNodes,
    storedTags: multiTeamTags,
  });
  const tasks = upgraded.workspaceNodes.filter((node): node is TaskNode => node.kind === "task");

  assert.equal(upgraded.version, "multi-team-v22-subtask-child-count-fixtures");
  assert.ok(detailIds.every((id) => tasks.filter((task) => task.id === id).length === 1));
  assert.equal(tasks.find((task) => task.id === "product-launch-venue")?.effortEstimate?.basis, "manual");
  assert.equal(tasks.find((task) => task.id === "product-launch-promo-assets")?.effortEstimate, undefined);

  const rerun = resolveWorkspaceScenarioReset({
    storedVersion: upgraded.version,
    storedWorkspaceNodes: upgraded.workspaceNodes.filter((node) => node.id !== detailIds[0]),
    storedTags: upgraded.tags,
  });
  assert.equal(rerun.workspaceNodes.some((node) => node.id === detailIds[0]), false, "当前版本中用户删除的新示例不能复活");
});

test("fixture 中每个任务引用的标签都存在于达人带货标签目录", () => {
  const tagNames = new Set(creatorCommerceTags.map((tag) => tag.name));
  const tasks = workspaceNodes.filter((node) => node.kind === "task");

  assert.ok(tasks.every((task) => task.labels?.every((label) => tagNames.has(label))));
});

test("当前版本不会回填用户已删除的 fixture 任务或标签，并保留新增项", () => {
  const deletedTaskId = "fragrance-content";
  const deletedTagId = "creator-commerce-content";
  const customTask = {
    id: "user-created-after-delete",
    kind: "task" as const,
    name: "用户删除基准后新增的任务",
    parentId: "workspace-root",
    ownerId: "高远",
    status: "待开始" as const,
    updatedAt: "刚刚",
  };
  const customTag = { id: "user-tag-after-delete", name: "自定义直播标签", icon: "tag" as const, color: "pink" as const };
  const storedWorkspaceNodes = workspaceNodes.filter((node) => node.id !== deletedTaskId).concat(customTask);
  const storedTags = creatorCommerceTags.filter((tag) => tag.id !== deletedTagId).concat(customTag);

  const result = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes,
    storedTags,
  });

  assert.equal(result.didReset, false);
  assert.equal(result.version, creatorCommerceScenarioVersion);
  assert.ok(!result.workspaceNodes.some((node) => node.id === deletedTaskId));
  assert.ok(!result.tags.some((tag) => tag.id === deletedTagId));
  assert.ok(result.workspaceNodes.some((node) => node.id === customTask.id));
  assert.ok(result.tags.some((tag) => tag.id === customTag.id));
});

test("迁移 payload 写入失败时不会提前提交版本号", () => {
  const values = new Map<string, string>();
  const calls: string[] = [];
  const storage = {
    removeItem(key: string) {
      calls.push(`remove:${key}`);
      values.delete(key);
    },
    setItem(key: string, value: string) {
      calls.push(`set:${key}`);
      if (key === "tags") throw new DOMException("Quota exceeded", "QuotaExceededError");
      values.set(key, value);
    },
  };
  const state = resolveWorkspaceScenarioReset({
    storedVersion: null,
    storedWorkspaceNodes: legacyWorkspace,
    storedTags: legacyTags,
  });

  const committed = commitWorkspaceScenarioReset(storage, state, {
    legacyKeys: ["legacy-task"],
    tagsKey: "tags",
    versionKey: "version",
    workspaceNodesKey: "workspace",
  });

  assert.equal(committed, false);
  assert.equal(values.has("version"), false);
  assert.ok(!calls.some((call) => call === "set:version"));
  assert.ok(!calls.some((call) => call.startsWith("remove:")));
});

test("迁移成功时先写两个 payload，最后提交版本并清理旧 key", () => {
  const calls: string[] = [];
  const storage = {
    removeItem(key: string) { calls.push(`remove:${key}`); },
    setItem(key: string) { calls.push(`set:${key}`); },
  };
  const state = resolveWorkspaceScenarioReset({
    storedVersion: null,
    storedWorkspaceNodes: legacyWorkspace,
    storedTags: legacyTags,
  });

  assert.equal(commitWorkspaceScenarioReset(storage, state, {
    legacyKeys: ["legacy-task"],
    tagsKey: "tags",
    versionKey: "version",
    workspaceNodesKey: "workspace",
  }), true);
  assert.deepEqual(calls, ["set:workspace", "set:tags", "set:version", "remove:legacy-task"]);
});

test("当前版本保留合法用户文件，修复无效父目录并过滤重复或畸形文件", () => {
  const root = { id: "workspace-root", kind: "folder", name: "任务", parentId: null, updatedAt: "今天" };
  const folder = { id: "user-files", kind: "folder", name: "用户文件", parentId: "workspace-root", updatedAt: "刚刚" };
  const task = { id: "file-parent-task", kind: "task", name: "不能作为文件目录的任务", parentId: "user-files", ownerId: "林洁", status: "进行中", updatedAt: "刚刚" };
  const validFile = { id: "valid-file", kind: "file", name: "达人名单.xlsx", parentId: "user-files", fileType: "XLSX", size: "24 KB", updatedAt: "刚刚" };
  const orphanFile = { ...validFile, id: "orphan-file", name: "孤立文件.pdf", parentId: "missing-folder", fileType: "PDF" };
  const taskParentFile = { ...validFile, id: "task-parent-file", name: "错误父级文件.md", parentId: task.id, fileType: "MD", size: undefined };
  const malformedFile = { ...validFile, id: "malformed-file", fileType: "", size: 24 };

  const result = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes: [root, folder, task, validFile, orphanFile, taskParentFile, { ...validFile, name: "重复文件.xlsx" }, malformedFile],
    storedTags: creatorCommerceTags,
  });

  assert.equal(result.didReset, false);
  const fileById = new Map(result.workspaceNodes.filter((node) => node.kind === "file").map((file) => [file.id, file]));
  assert.equal(fileById.size, 3);
  assert.equal(fileById.get(validFile.id)?.parentId, folder.id);
  assert.equal(fileById.get(validFile.id)?.size, "24 KB");
  assert.equal(fileById.get(orphanFile.id)?.parentId, "workspace-root");
  assert.equal(fileById.get(taskParentFile.id)?.parentId, "workspace-root");
  assert.equal(fileById.get(taskParentFile.id)?.size, undefined);
  assert.ok(!fileById.has(malformedFile.id));
});

test("当前版本收到非数组数据时返回深克隆 fixture，调用方修改不会污染导出基准", () => {
  const result = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes: { malformed: true },
    storedTags: creatorCommerceTags,
  });
  const resultRoot = result.workspaceNodes.find((node) => node.id === "workspace-root");
  const resultMainTask = result.workspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "fragrance-creator-wrapup");
  const fixtureRoot = allTeamWorkspaceNodes.find((node) => node.id === "workspace-root");
  const fixtureMainTask = allTeamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "fragrance-creator-wrapup");

  assert.notEqual(result.workspaceNodes, allTeamWorkspaceNodes);
  assert.equal(result.workspaceNodes.length, allTeamWorkspaceNodes.length);
  assert.notEqual(resultRoot, fixtureRoot);
  assert.notEqual(resultMainTask, fixtureMainTask);
  assert.notEqual(resultMainTask?.labels, fixtureMainTask?.labels);
  assert.notEqual(resultMainTask?.participantIds, fixtureMainTask?.participantIds);
  if (!resultRoot || resultRoot.kind !== "folder" || !resultMainTask || resultMainTask.kind !== "task") {
    assert.fail("深克隆 fixture 缺少根目录或主任务");
  }
  resultRoot.name = "被调用方修改的根目录";
  resultMainTask.name = "被调用方修改的主任务";
  resultMainTask.labels?.push("调用方标签");
  resultMainTask.participantIds?.push("调用方成员");

  assert.equal(fixtureRoot?.name, "任务");
  assert.equal(fixtureMainTask?.name, "香氛礼盒达人带货收尾");
  assert.ok(!fixtureMainTask?.labels?.includes("调用方标签"));
  assert.ok(!fixtureMainTask?.participantIds?.includes("调用方成员"));
});

test("当前版本保留合法目录与父子任务，并安全清理畸形目录父级和任务关系图", () => {
  const validTask = {
    id: "valid-custom-task",
    kind: "task" as const,
    name: "合法自定义任务",
    parentId: "custom-folder",
    ownerId: "林洁",
    status: "进行中" as const,
    updatedAt: "刚刚",
  };
  const orphanTask = { ...validTask, id: "orphan-task", name: "失去目录的任务", parentId: "bad-parent" };
  const validParentTask = { ...validTask, id: "valid-parent-task", name: "合法父任务" };
  const validChildTask = { ...validTask, id: "valid-child-task", name: "合法子任务", parentTaskId: validParentTask.id };
  const selfParentTask = { ...validTask, id: "self-parent-task", name: "自引用任务", parentTaskId: "self-parent-task" };
  const missingParentTask = { ...validTask, id: "missing-parent-task", name: "父任务不存在", parentTaskId: "deleted-parent-task" };
  const folderParentTask = { ...validTask, id: "folder-parent-task", name: "错误引用目录", parentTaskId: "custom-folder" };
  const cycleATask = { ...validTask, id: "cycle-a-task", name: "循环任务 A", parentTaskId: "cycle-b-task" };
  const cycleBTask = { ...validTask, id: "cycle-b-task", name: "循环任务 B", parentTaskId: "cycle-a-task" };
  const longCycleATask = { ...validTask, id: "long-cycle-a-task", name: "长循环任务 A", parentTaskId: "long-cycle-b-task" };
  const longCycleBTask = { ...validTask, id: "long-cycle-b-task", name: "长循环任务 B", parentTaskId: "long-cycle-c-task" };
  const longCycleCTask = { ...validTask, id: "long-cycle-c-task", name: "长循环任务 C", parentTaskId: "long-cycle-a-task" };
  const malformedNodes = [
    1,
    null,
    { foo: "bar" },
    { id: "workspace-root", kind: "folder", name: "任务", parentId: null, updatedAt: "今天" },
    { id: "workspace-root", kind: "folder", name: "重复根", parentId: null, updatedAt: "今天" },
    { id: "fragrance-campaign", kind: "folder", name: "香氛礼盒达人带货", parentId: "workspace-root", updatedAt: "今天" },
    { id: "custom-folder", kind: "folder", name: "用户自定义目录", parentId: "fragrance-campaign", updatedAt: "刚刚" },
    { id: "orphan-folder", kind: "folder", name: "失去父级的目录", parentId: "bad-parent", updatedAt: "刚刚" },
    { id: "orphan-child-folder", kind: "folder", name: "孤儿目录的子目录", parentId: "orphan-folder", updatedAt: "刚刚" },
    { id: "orphan-grandchild-folder", kind: "folder", name: "孤儿目录的孙目录", parentId: "orphan-child-folder", updatedAt: "刚刚" },
    { id: "cycle-folder-a", kind: "folder", name: "循环目录 A", parentId: "cycle-folder-b", updatedAt: "刚刚" },
    { id: "cycle-folder-b", kind: "folder", name: "循环目录 B", parentId: "cycle-folder-a", updatedAt: "刚刚" },
    { id: "cycle-folder-child", kind: "folder", name: "循环目录的非循环后代", parentId: "cycle-folder-a", updatedAt: "刚刚" },
    { id: "malformed-folder", kind: "folder", name: "", parentId: "workspace-root", updatedAt: "刚刚" },
    validTask,
    orphanTask,
    { ...validTask, name: "重复任务应被丢弃" },
    validParentTask,
    validChildTask,
    selfParentTask,
    missingParentTask,
    folderParentTask,
    cycleATask,
    cycleBTask,
    longCycleATask,
    longCycleBTask,
    longCycleCTask,
    { id: "malformed-task", kind: "task", name: "缺少负责人的任务", parentId: "workspace-root", status: "进行中", updatedAt: "刚刚" },
  ];

  const result = resolveWorkspaceScenarioReset({
    storedVersion: creatorCommerceScenarioVersion,
    storedWorkspaceNodes: malformedNodes,
    storedTags: creatorCommerceTags,
  });

  assert.equal(result.didReset, false);
  assert.equal(result.workspaceNodes.length, 21);
  assert.equal(result.workspaceNodes.filter((node) => node.id === "workspace-root").length, 1);
  assert.equal(result.workspaceNodes.find((node) => node.id === "fragrance-campaign")?.parentId, "workspace-root");
  assert.equal(result.workspaceNodes.find((node) => node.id === "custom-folder")?.parentId, "fragrance-campaign");
  assert.equal(result.workspaceNodes.find((node) => node.id === "orphan-folder")?.parentId, "workspace-root");
  assert.equal(result.workspaceNodes.find((node) => node.id === "orphan-child-folder")?.parentId, "orphan-folder");
  assert.equal(result.workspaceNodes.find((node) => node.id === "orphan-grandchild-folder")?.parentId, "orphan-child-folder");
  assert.equal(result.workspaceNodes.find((node) => node.id === "cycle-folder-a")?.parentId, "workspace-root");
  assert.equal(result.workspaceNodes.find((node) => node.id === "cycle-folder-b")?.parentId, "workspace-root");
  assert.equal(result.workspaceNodes.find((node) => node.id === "cycle-folder-child")?.parentId, "cycle-folder-a");
  const normalizedTask = result.workspaceNodes.find((node) => node.id === validTask.id);
  assert.equal(normalizedTask?.kind, "task");
  assert.equal(normalizedTask?.parentId, "custom-folder");
  assert.equal(result.workspaceNodes.find((node) => node.id === orphanTask.id)?.parentId, "workspace-root");
  assert.ok(!result.workspaceNodes.some((node) => node.id === "malformed-task"));
  const normalizedTaskById = new Map(result.workspaceNodes
    .filter((node) => node.kind === "task")
    .map((task) => [task.id, task]));
  assert.equal(normalizedTaskById.get(validChildTask.id)?.parentTaskId, validParentTask.id);
  for (const taskId of [
    selfParentTask.id,
    missingParentTask.id,
    folderParentTask.id,
    cycleATask.id,
    cycleBTask.id,
    longCycleATask.id,
    longCycleBTask.id,
    longCycleCTask.id,
  ]) {
    assert.equal(normalizedTaskById.get(taskId)?.parentTaskId, undefined, `${taskId} 的非法 parentTaskId 应被清除`);
  }
});

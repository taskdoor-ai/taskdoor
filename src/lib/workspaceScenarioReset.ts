import { normalizeTags, type TagDefinition } from "../data/tagGroups.ts";
import { normalizeWorkspaceNodes, workspaceNodes, type TaskNode, type WorkspaceNode } from "../data/workspaceNodes.ts";
import { allTeamWorkspaceNodes, multiTeamTags, teamWorkspaceExpansionNodes } from "../data/teamWorkspaceScenarios.ts";
import { getEffortScopeKey } from "./taskEffort.ts";
import { unassignedTaskFixtures } from "../data/unassignedTaskFixtures.ts";

/** Kept under the historical export name because existing storage callers import it. */
export const creatorCommerceScenarioVersion = "multi-team-v18-unassigned-effort";

type WorkspaceScenarioResetInput = {
  storedVersion: string | null;
  storedWorkspaceNodes: unknown;
  storedTags: unknown;
};

type WorkspaceScenarioResetResult = {
  didReset: boolean;
  didMigrate?: boolean;
  version: typeof creatorCommerceScenarioVersion;
  workspaceNodes: WorkspaceNode[];
  tags: TagDefinition[];
};

type StorageWriter = Pick<Storage, "removeItem" | "setItem">;

type WorkspaceScenarioStorageKeys = {
  legacyKeys: string[];
  tagsKey: string;
  versionKey: string;
  workspaceNodesKey: string;
};

const cloneNodes = (nodes: readonly WorkspaceNode[]) => nodes.map((node) => node.kind === "task"
  ? {
      ...node,
      ...(node.completionCriteria ? { completionCriteria: [...node.completionCriteria] } : {}),
      ...(node.dependsOnTaskIds ? { dependsOnTaskIds: [...node.dependsOnTaskIds] } : {}),
      ...(node.effortEstimate ? { effortEstimate: { ...node.effortEstimate } } : {}),
      ...(node.executionTips ? { executionTips: [...node.executionTips] } : {}),
      ...(node.labels ? { labels: [...node.labels] } : {}),
      ...(node.participantIds ? { participantIds: [...node.participantIds] } : {}),
    }
  : { ...node });

const cloneWorkspaceNodes = () => cloneNodes(allTeamWorkspaceNodes);

const mergeUnassignedTaskFixtures = (nodes: WorkspaceNode[]) => {
  const ids = new Set(nodes.map((node) => node.id));
  return [...nodes, ...cloneNodes(unassignedTaskFixtures.filter((node) => !ids.has(node.id)))];
};

/** v18 只给原有五个示例补缺失估算；人员变更不影响范围，用户清空或改过范围则保留。 */
const migrateUnassignedTaskEffort = (stored: unknown): WorkspaceNode[] => {
  const nodes = normalizeWorkspaceNodes(stored);
  const rawHasEstimate = new Set(Array.isArray(stored) ? stored.flatMap((value) =>
    value && typeof value === "object" && Object.hasOwn(value, "effortEstimate") && typeof value.id === "string" ? [value.id] : []) : []);
  const parentIds = new Set(nodes.flatMap((node) => node.kind === "task" && node.parentTaskId ? [node.parentTaskId] : []));
  const fixtures = new Map(unassignedTaskFixtures.map((task) => [task.id, task]));
  return nodes.map((node) => {
    if (node.kind !== "task" || rawHasEstimate.has(node.id) || node.parentTaskId || parentIds.has(node.id)) return node;
    const fixture = fixtures.get(node.id);
    const estimate = fixture?.effortEstimate;
    if (!fixture || !estimate || node.teamId !== fixture.teamId || node.createdFrom !== fixture.createdFrom
      || node.createdBy !== fixture.createdBy || node.createdAt !== fixture.createdAt
      || getEffortScopeKey(node, estimate.workMethod) !== estimate.scopeKey) return node;
    return { ...node, effortEstimate: { ...estimate } };
  });
};

const productLaunchFixtureIds = new Set([
  "product-launch-planning",
  "product-launch-venue",
  "product-launch-run-of-show",
  "product-launch-promo-assets",
]);

const cloneNode = (node: WorkspaceNode): WorkspaceNode => node.kind === "task"
  ? {
      ...node,
      ...(node.completionCriteria ? { completionCriteria: [...node.completionCriteria] } : {}),
      ...(node.dependsOnTaskIds ? { dependsOnTaskIds: [...node.dependsOnTaskIds] } : {}),
      ...(node.effortEstimate ? { effortEstimate: { ...node.effortEstimate } } : {}),
      ...(node.executionTips ? { executionTips: [...node.executionTips] } : {}),
      ...(node.labels ? { labels: [...node.labels] } : {}),
      ...(node.participantIds ? { participantIds: [...node.participantIds] } : {}),
    }
  : { ...node };

const weeklyRetroFixtureIds = new Set([
  "weekly-retro-notes",
  "weekly-retro-decisions",
  "weekly-retro-open-issues",
  "weekly-retro-actions",
]);

const newlyEstimatedFixtureIds = new Set([
  "fragrance-creator-business",
  "fragrance-content",
  "fragrance-live",
  "fragrance-product",
  "fragrance-growth",
  "fragrance-data",
  "fragrance-compliance",
  "fragrance-final-decision",
  "product-launch-venue",
  "product-launch-run-of-show",
  "product-launch-promo-assets",
]);
const newlyDefinedFixtureIds = new Set([
  ...newlyEstimatedFixtureIds,
  "fragrance-creator-wrapup",
  "product-launch-planning",
]);

const matchesFixtureEffortExceptScope = (
  stored: Extract<WorkspaceNode, { kind: "task" }>["effortEstimate"],
  fixture: Extract<WorkspaceNode, { kind: "task" }>["effortEstimate"],
) => Boolean(stored && fixture
  && stored.basis === fixture.basis
  && stored.confirmed === fixture.confirmed
  && stored.minutes === fixture.minutes
  && stored.reason === fixture.reason
  && stored.version === fixture.version
  && stored.workMethod === fixture.workMethod);

/** Add or repair the weekly-retro fixture while preserving user-created work and explicit clears. */
const migrateWeeklyRetroInsight = (storedWorkspaceNodes: unknown, {
  repairFixtureScopeKey = false,
  supplementFixture = true,
}: { repairFixtureScopeKey?: boolean; supplementFixture?: boolean } = {}) => {
  const normalized = normalizeWorkspaceNodes(storedWorkspaceNodes);
  const fixtureNodes = workspaceNodes.filter((node) => weeklyRetroFixtureIds.has(node.id)).map(cloneNode);
  const fixtureById = new Map(fixtureNodes.map((node) => [node.id, node]));
  const rootFixture = fixtureNodes.find((node) => node.id === "weekly-retro-notes");
  const upgraded = normalized.map((node): WorkspaceNode => {
    if (node.kind !== "task") return node;
    if (supplementFixture && node.id === "weekly-retro-notes" && rootFixture?.kind === "task") return {
        ...rootFixture,
        ...node,
        completionCriteria: node.completionCriteria ?? rootFixture.completionCriteria,
        executionTips: node.executionTips ?? rootFixture.executionTips,
        plannedStartOn: node.plannedStartOn ?? rootFixture.plannedStartOn,
        plannedEndOn: node.plannedEndOn ?? rootFixture.plannedEndOn,
      };
    const fixture = fixtureById.get(node.id);
    if (!repairFixtureScopeKey
      || fixture?.kind !== "task"
      || node.effortEstimate?.scopeKey === fixture.effortEstimate?.scopeKey
      || !matchesFixtureEffortExceptScope(node.effortEstimate, fixture.effortEstimate)) return node;
    return { ...node, effortEstimate: fixture.effortEstimate ? { ...fixture.effortEstimate } : undefined };
  });
  const ids = new Set(upgraded.map((node) => node.id));
  return supplementFixture ? [...upgraded, ...fixtureNodes.filter((node) => !ids.has(node.id))] : upgraded;
};

/**
 * v15 only repairs unchanged synthetic estimates and fills the eleven legacy leaves.
 * It never appends a node, replaces an explicit estimate/clear, or estimates a user-edited scope.
 */
const migrateMockEffortCoverage = (storedWorkspaceNodes: unknown, originalStoredWorkspaceNodes: unknown) => {
  const normalized = normalizeWorkspaceNodes(storedWorkspaceNodes);
  const fixtureTasks = allTeamWorkspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const fixtureById = new Map(fixtureTasks.map((task) => [task.id, task]));
  const rawHasOwnEffort = new Set<string>();
  if (Array.isArray(originalStoredWorkspaceNodes)) {
    for (const value of originalStoredWorkspaceNodes) {
      if (typeof value !== "object" || value === null || typeof (value as { id?: unknown }).id !== "string") continue;
      if (Object.prototype.hasOwnProperty.call(value, "effortEstimate")) rawHasOwnEffort.add((value as { id: string }).id);
    }
  }

  const enriched = normalized.map((node): WorkspaceNode => {
    if (node.kind !== "task" || !newlyDefinedFixtureIds.has(node.id)) return node;
    const fixture = fixtureById.get(node.id);
    if (!fixture || node.goal !== fixture.goal) return node;
    return {
      ...node,
      completionCriteria: node.completionCriteria ?? (fixture.completionCriteria ? [...fixture.completionCriteria] : undefined),
      executionTips: node.executionTips ?? (fixture.executionTips ? [...fixture.executionTips] : undefined),
    };
  });
  const taskById = new Map(enriched.filter((node): node is TaskNode => node.kind === "task").map((task) => [task.id, task]));
  const inheritedGoal = (task: TaskNode) => {
    const seen = new Set<string>();
    let current = task;
    while (current.parentTaskId && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = taskById.get(current.parentTaskId);
      if (!parent) break;
      current = parent;
    }
    return current.goal ?? "";
  };

  return enriched.map((node): WorkspaceNode => {
    if (node.kind !== "task") return node;
    const fixture = fixtureById.get(node.id);
    const fixtureEffort = fixture?.effortEstimate;
    if (!fixture || fixtureEffort?.basis !== "mock") return node;
    const currentScopeKey = getEffortScopeKey({
      goal: inheritedGoal(node),
      completionCriteria: node.completionCriteria,
      executionTips: node.executionTips,
    }, fixtureEffort.workMethod);
    const scopeMatchesFixture = currentScopeKey === fixtureEffort.scopeKey;

    if (node.effortEstimate) {
      const legacyOwnScopeKey = getEffortScopeKey({
        goal: node.goal,
        completionCriteria: node.completionCriteria,
        executionTips: node.executionTips,
      }, node.effortEstimate.workMethod);
      if (node.effortEstimate.scopeKey === fixtureEffort.scopeKey
        || !scopeMatchesFixture
        || node.effortEstimate.scopeKey !== legacyOwnScopeKey
        || !matchesFixtureEffortExceptScope(node.effortEstimate, fixtureEffort)) return node;
      return { ...node, effortEstimate: { ...fixtureEffort } };
    }
    if (!newlyEstimatedFixtureIds.has(node.id) || rawHasOwnEffort.has(node.id) || !scopeMatchesFixture) return node;
    return { ...node, effortEstimate: { ...fixtureEffort } };
  });
};

/**
 * v16 removes only exact semantic duplicates created by the task planner.
 * Generated IDs, timestamps and links to an equivalent duplicate tree are ignored;
 * any change to scope, people, schedule, labels or EWD keeps the task distinct.
 */
const dedupePlannerCreatedTasks = (storedWorkspaceNodes: unknown): WorkspaceNode[] => {
  const normalized = normalizeWorkspaceNodes(storedWorkspaceNodes);
  const tasks = normalized.filter((node): node is TaskNode => node.kind === "task");
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const pathCache = new Map<string, string>();
  const semanticPayload = (task: TaskNode) => JSON.stringify({
    completionCriteria: task.completionCriteria ?? [],
    createdBy: task.createdBy ?? "",
    createdFrom: task.createdFrom ?? "",
    dueAt: task.dueAt ?? "",
    effortEstimate: task.effortEstimate ?? null,
    executionTips: task.executionTips ?? [],
    goal: task.goal ?? "",
    iconName: task.iconName ?? "",
    iconTone: task.iconTone ?? "",
    labels: task.labels ?? [],
    name: task.name,
    ownerId: task.ownerId,
    parentId: task.parentId,
    participantIds: task.participantIds ?? [],
    plannedEndOn: task.plannedEndOn ?? "",
    plannedStartOn: task.plannedStartOn ?? "",
    proposedOwnerId: task.proposedOwnerId ?? "",
    status: task.status,
    teamId: task.teamId ?? "",
  });
  const semanticPath = (task: TaskNode, visiting = new Set<string>()): string => {
    const cached = pathCache.get(task.id);
    if (cached) return cached;
    if (visiting.has(task.id)) return `cycle:${task.id}`;
    const nextVisiting = new Set(visiting).add(task.id);
    const parent = task.parentTaskId ? taskById.get(task.parentTaskId) : undefined;
    const parentPath = parent?.createdFrom === "task-planner"
      ? semanticPath(parent, nextVisiting)
      : `parent:${task.parentTaskId ?? task.parentId ?? "root"}`;
    const path = `${parentPath}/${semanticPayload(task)}`;
    pathCache.set(task.id, path);
    return path;
  };
  const keyFor = (task: TaskNode) => JSON.stringify({
    dependencies: (task.dependsOnTaskIds ?? []).map((id) => {
      const dependency = taskById.get(id);
      return dependency?.createdFrom === "task-planner" ? semanticPath(dependency) : `task:${id}`;
    }).sort(),
    path: semanticPath(task),
  });
  const plannerTasks = tasks.filter((task) => task.createdFrom === "task-planner");
  const ordered = [...plannerTasks].sort((left, right) => {
    const leftAt = Date.parse(left.createdAt ?? "");
    const rightAt = Date.parse(right.createdAt ?? "");
    if (Number.isFinite(leftAt) && Number.isFinite(rightAt) && leftAt !== rightAt) return leftAt - rightAt;
    return normalized.findIndex((node) => node.id === left.id) - normalized.findIndex((node) => node.id === right.id);
  });
  const canonicalByKey = new Map<string, string>();
  const duplicateToCanonical = new Map<string, string>();
  for (const task of ordered) {
    const key = keyFor(task);
    const canonical = canonicalByKey.get(key);
    if (canonical) duplicateToCanonical.set(task.id, canonical);
    else canonicalByKey.set(key, task.id);
  }
  if (duplicateToCanonical.size === 0) return normalized;
  const canonicalId = (id: string) => duplicateToCanonical.get(id) ?? id;
  return normalized
    .filter((node) => !duplicateToCanonical.has(node.id))
    .map((node): WorkspaceNode => {
      if (node.kind !== "task") return node;
      const parentTaskId = node.parentTaskId ? canonicalId(node.parentTaskId) : undefined;
      const dependsOnTaskIds = node.dependsOnTaskIds
        ? [...new Set(node.dependsOnTaskIds.map(canonicalId).filter((id) => id !== node.id))]
        : undefined;
      return {
        ...node,
        ...(parentTaskId ? { parentTaskId } : {}),
        ...(dependsOnTaskIds?.length ? { dependsOnTaskIds } : { dependsOnTaskIds: undefined }),
      };
    });
};

const upgradeV5WorkspaceNodes = (storedWorkspaceNodes: unknown) => {
  const normalized = normalizeWorkspaceNodes(storedWorkspaceNodes);
  const storedIds = new Set(normalized.map(({ id }) => id));
  const missingProductLaunchNodes = workspaceNodes
    .filter(({ id }) => productLaunchFixtureIds.has(id) && !storedIds.has(id))
    .map(cloneNode);
  return [...normalized, ...missingProductLaunchNodes];
};

const upgradeV6WorkspaceNodes = (storedWorkspaceNodes: unknown) => normalizeWorkspaceNodes(storedWorkspaceNodes)
  .map((node) => node.kind === "task" && node.id === "fragrance-data"
    ? { ...node, status: "已完成" as const }
    : node);

const upgradeV2WorkspaceNodes = (storedWorkspaceNodes: unknown) => {
  const fixtureIds = new Set(workspaceNodes.map((node) => node.id));
  const customNodes = normalizeWorkspaceNodes(storedWorkspaceNodes)
    .filter((node) => !fixtureIds.has(node.id));
  return [...cloneWorkspaceNodes(), ...customNodes];
};

const upgradeV2Tags = (storedTags: unknown) => {
  const normalizedTags = normalizeTags(storedTags);
  const fixtureIds = new Set(multiTeamTags.map((tag) => tag.id));
  const fixtureNames = new Set(multiTeamTags.map((tag) => tag.name));
  return [
    ...multiTeamTags.map((tag) => ({ ...tag })),
    ...normalizedTags.filter((tag) => !fixtureIds.has(tag.id) && !fixtureNames.has(tag.name)),
  ];
};

const mergeNewTeamFixtures = (storedWorkspaceNodes: unknown) => {
  const normalized = normalizeWorkspaceNodes(storedWorkspaceNodes);
  const ids = new Set(normalized.map((node) => node.id));
  return [
    ...normalized,
    ...cloneNodes(allTeamWorkspaceNodes.filter((node) => node.id !== "workspace-root" && node.teamId !== "creator-commerce" && !ids.has(node.id))),
  ];
};

/** v8 → v9 只补本轮新增任务，保留旧 fixture 的编辑、删除和全部用户节点。 */
const mergeWorkspaceExpansion = (storedWorkspaceNodes: unknown) => {
  const normalized = normalizeWorkspaceNodes(storedWorkspaceNodes);
  const ids = new Set(normalized.map((node) => node.id));
  return [
    ...normalized,
    ...cloneNodes(teamWorkspaceExpansionNodes.filter((node) => !ids.has(node.id))),
  ];
};

const v9LegacyLabelsByTaskId: Record<string, string[]> = {
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

const v9LegacyPlannedStartByTaskId: Record<string, string> = {
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

const v9LegacyStatusTags: TagDefinition[] = [
  { id: "team-blocked", name: "已阻塞", icon: "flag", color: "amber" },
  { id: "team-review", name: "待审核", icon: "layers", color: "purple" },
];

const sameStrings = (left: readonly string[] | undefined, right: readonly string[]) =>
  left?.length === right.length && left.every((value, index) => value === right[index]);

/**
 * v9 → v10 只迁移仍与历史 fixture 精确一致的字段：
 * - 移除被误当作业务标签的状态词；
 * - 将已经进入执行流程却晚于分析日的计划开始日最小前移；
 * - 移除已完成数据复盘的旧默认单项硬依赖。
 * 任何用户改写过的标签、日期或依赖组合均保持原样，缺失任务不会被补回。
 */
const migrateV9FixtureData = (storedWorkspaceNodes: unknown) => normalizeWorkspaceNodes(storedWorkspaceNodes)
  .map((node) => {
    if (node.kind !== "task") return node;
    let task = node;
    const legacyLabels = v9LegacyLabelsByTaskId[node.id];
    if (legacyLabels && sameStrings(node.labels, legacyLabels)) {
      task = { ...task, labels: legacyLabels.filter((label) => label !== "待审核" && label !== "已阻塞") };
    }
    const legacyPlannedStartOn = v9LegacyPlannedStartByTaskId[node.id];
    if (legacyPlannedStartOn && node.plannedStartOn === legacyPlannedStartOn) {
      task = { ...task, plannedStartOn: "2026-09-01" };
    }
    if (node.id !== "fragrance-data"
      || node.dependsOnTaskIds?.length !== 1
      || node.dependsOnTaskIds[0] !== "fragrance-growth") return task;
    const { dependsOnTaskIds: _legacyDependency, ...taskWithoutLegacyDependency } = task;
    return taskWithoutLegacyDependency;
  });

const migrateV9StatusTags = (storedTags: unknown) => normalizeTags(storedTags)
  .filter((tag) => !v9LegacyStatusTags.some((legacy) =>
    tag.id === legacy.id
    && tag.name === legacy.name
    && tag.icon === legacy.icon
    && tag.color === legacy.color));

const mergeMultiTeamTags = (storedTags: unknown) => {
  const normalized = normalizeTags(storedTags);
  const ids = new Set(normalized.map((tag) => tag.id));
  const names = new Set(normalized.map((tag) => tag.name));
  return [
    ...normalized,
    ...multiTeamTags.filter((tag) => !ids.has(tag.id) && !names.has(tag.name)).map((tag) => ({ ...tag })),
  ];
};

/**
 * 旧演示数据只在版本切换时被替换一次；版本已匹配时只做容错归一，
 * 从而保留用户后续新建、修改或删除的任务和标签。
 */
export function resolveWorkspaceScenarioReset(input: WorkspaceScenarioResetInput): WorkspaceScenarioResetResult {
  if (input.storedVersion === "multi-team-v17-unassigned-tasks") {
    return {
      didReset: false,
      didMigrate: true,
      version: creatorCommerceScenarioVersion,
      workspaceNodes: Array.isArray(input.storedWorkspaceNodes) ? migrateUnassignedTaskEffort(input.storedWorkspaceNodes) : cloneWorkspaceNodes(),
      tags: normalizeTags(input.storedTags),
    };
  }
  // 只追加这批新示例；已有编辑、删除记录和旧创建流程的资料均保留。
  if (input.storedVersion === "multi-team-v16-planner-dedupe") {
    return {
      didReset: false,
      didMigrate: true,
      version: creatorCommerceScenarioVersion,
      workspaceNodes: mergeUnassignedTaskFixtures(Array.isArray(input.storedWorkspaceNodes)
        ? normalizeWorkspaceNodes(input.storedWorkspaceNodes)
        : cloneWorkspaceNodes()),
      tags: normalizeTags(input.storedTags),
    };
  }
  if (input.storedVersion !== creatorCommerceScenarioVersion) {
    const isV2Upgrade = input.storedVersion === "creator-commerce-v2";
    const isV5ProductLaunchUpgrade = input.storedVersion === "creator-commerce-v5";
    const isV6DependencyReadinessUpgrade = input.storedVersion === "creator-commerce-v6-product-launch";
    const shouldDiscardPreviewCreations = input.storedVersion === "creator-commerce-v3";
    const shouldRefreshFixture = input.storedVersion === "creator-commerce-v4";
    const isV7MultiTeamUpgrade = input.storedVersion === "creator-commerce-v7-dependency-readiness";
    const isV8DenseWorkspaceUpgrade = input.storedVersion === "multi-team-v8-complex-evidence";
    const isV9DependencySemanticsUpgrade = input.storedVersion === "multi-team-v9-dense-workspace";
    const isWeeklyRetroScopeRepair = input.storedVersion === "multi-team-v12-weekly-retro-insight"
      || input.storedVersion === "multi-team-v13-weekly-retro-insight";
    const isV14MockEffortUpgrade = input.storedVersion === "multi-team-v14-weekly-retro-insight";
    const isV15PlannerDedupeUpgrade = input.storedVersion === "multi-team-v15-mock-effort-coverage";
    const isWeeklyRetroInsightUpgrade = input.storedVersion === "multi-team-v10-dependency-semantics"
      || input.storedVersion === "multi-team-v11-weekly-retro-insight"
      || isWeeklyRetroScopeRepair;
    const legacyNodes = isV6DependencyReadinessUpgrade
      ? upgradeV6WorkspaceNodes(input.storedWorkspaceNodes)
      : isV5ProductLaunchUpgrade
        ? upgradeV5WorkspaceNodes(input.storedWorkspaceNodes)
        : isV2Upgrade || shouldRefreshFixture
          ? upgradeV2WorkspaceNodes(input.storedWorkspaceNodes)
          : null;
    const preWeeklyNodes = isV15PlannerDedupeUpgrade
      ? dedupePlannerCreatedTasks(input.storedWorkspaceNodes)
      : isV14MockEffortUpgrade || isWeeklyRetroInsightUpgrade
        ? input.storedWorkspaceNodes
      : isV9DependencySemanticsUpgrade
        ? migrateV9FixtureData(input.storedWorkspaceNodes)
        : isV8DenseWorkspaceUpgrade
          ? migrateV9FixtureData(mergeWorkspaceExpansion(input.storedWorkspaceNodes))
          : isV7MultiTeamUpgrade
            ? migrateV9FixtureData(mergeWorkspaceExpansion(mergeNewTeamFixtures(input.storedWorkspaceNodes)))
            : legacyNodes
              ? migrateV9FixtureData(mergeWorkspaceExpansion(mergeNewTeamFixtures(legacyNodes)))
              : cloneWorkspaceNodes();
    const weeklyNodes = migrateWeeklyRetroInsight(preWeeklyNodes, {
      repairFixtureScopeKey: isWeeklyRetroScopeRepair,
      supplementFixture: !isV15PlannerDedupeUpgrade && !isWeeklyRetroScopeRepair && !isV14MockEffortUpgrade,
    });
    return {
      didReset: true,
      version: creatorCommerceScenarioVersion,
      workspaceNodes: mergeUnassignedTaskFixtures(migrateMockEffortCoverage(weeklyNodes, input.storedWorkspaceNodes)),
      tags: isV15PlannerDedupeUpgrade || isV14MockEffortUpgrade || isWeeklyRetroInsightUpgrade
        ? normalizeTags(input.storedTags)
        : isV9DependencySemanticsUpgrade
        ? migrateV9StatusTags(input.storedTags)
        : isV8DenseWorkspaceUpgrade || isV7MultiTeamUpgrade || isV6DependencyReadinessUpgrade || isV5ProductLaunchUpgrade
          ? migrateV9StatusTags(mergeMultiTeamTags(input.storedTags))
          : isV2Upgrade || shouldDiscardPreviewCreations || shouldRefreshFixture
            ? migrateV9StatusTags(upgradeV2Tags(input.storedTags))
            : multiTeamTags.map((tag) => ({ ...tag })),
    };
  }

  return {
    didReset: false,
    version: creatorCommerceScenarioVersion,
    workspaceNodes: Array.isArray(input.storedWorkspaceNodes)
      ? normalizeWorkspaceNodes(input.storedWorkspaceNodes)
      : cloneWorkspaceNodes(),
    tags: normalizeTags(input.storedTags),
  };
}

/**
 * 原子性以版本标记为提交点：两个 payload 都成功写入后才写版本。
 * 因此配额或权限错误不会让半成品被误认作已迁移；重复调用也安全。
 */
export function commitWorkspaceScenarioReset(
  storage: StorageWriter,
  state: WorkspaceScenarioResetResult,
  keys: WorkspaceScenarioStorageKeys,
): boolean {
  if (!state.didReset && !state.didMigrate) return false;
  try {
    storage.setItem(keys.workspaceNodesKey, JSON.stringify(state.workspaceNodes));
    storage.setItem(keys.tagsKey, JSON.stringify(state.tags));
    storage.setItem(keys.versionKey, state.version);
  } catch {
    return false;
  }
  if (state.didReset) keys.legacyKeys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // 已提交的新版本可正常运行，遗留 key 清理失败不回滚有效 payload。
    }
  });
  return true;
}

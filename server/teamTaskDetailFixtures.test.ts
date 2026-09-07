import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import {
  TEAM_DETAIL_FIXTURE_PROVENANCE,
  TEAM_DETAIL_SCOPE_TASK_IDS,
  TEAM_DETAIL_TASK_IDS,
  getTeamTaskDiagnosisSnapshot,
  getTeamTaskDetailFixture,
  validateTeamTaskDetailFixture,
  type TeamEvidenceActivityMock,
  type TeamEvidenceFileNode,
  type TeamTaskDetailFixture,
} from "../src/data/teamTaskDetailFixtures.ts";
import { getTaskDiscussionThreads, getTaskChangeItems } from "../src/lib/taskActivity.ts";
import { getTaskFileContent } from "../src/lib/taskFileEditing.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";

const expectedDomains = Object.keys(TEAM_DETAIL_TASK_IDS) as Array<keyof typeof TEAM_DETAIL_TASK_IDS>;

function taskFixture(id: string, index = 0): TaskNode {
  const main = id === "platform-mobile-release" || id === "factory-pilot-ramp" || id === "service-incident-recovery";
  const teamId = id.startsWith("platform-") ? "platform" : id.startsWith("factory-") ? "supply-operations" : id.startsWith("service-") ? "customer-success" : "creator-commerce";
  return {
    id,
    kind: "task",
    name: main ? `${id} 跨职能主任务` : `${id} 可验收子任务`,
    parentId: "workspace-root",
    teamId,
    ...(main ? {} : { parentTaskId: id.startsWith("platform-") ? "platform-mobile-release" : id.startsWith("factory-") ? "factory-pilot-ramp" : "service-incident-recovery" }),
    ownerId: [`负责人甲-${id.slice(0, 3)}`, `负责人乙-${id.slice(0, 3)}`, `负责人丙-${id.slice(0, 3)}`][index % 3],
    participantIds: [`参与者甲-${id.slice(0, 3)}`, `参与者乙-${id.slice(0, 3)}`],
    status: ["进行中", "待审核", "已阻塞", "待开始", "已完成"][index % 5] as TaskNode["status"],
    goal: `在不丢失来源和权限边界的前提下完成 ${id} 的业务交付。`,
    dueAt: `9 月 ${2 + index} 日 14:00`,
    labels: [index % 2 ? "跨团队" : "高优先级"],
    completionCriteria: ["交付结果可定位到来源文件", "未完成事项具有负责人和下一步"],
    executionTips: ["先核对门禁，再更新结果状态"],
    updatedAt: "2026-09-01T11:20:00+08:00",
  };
}

function everyFixture(): TeamTaskDetailFixture[] {
  return expectedDomains.flatMap((domain) => TEAM_DETAIL_TASK_IDS[domain]).map((id, index) => {
    const detail = getTeamTaskDetailFixture(taskFixture(id, index));
    assert.ok(detail, `约定任务必须生成详情：${id}`);
    return detail;
  });
}

test("三类团队的全部约定任务都有高密度合成详情且结构校验通过", () => {
  const fixtures = everyFixture();
  assert.equal(fixtures.length, 22);
  assert.deepEqual(new Set(fixtures.map((detail) => detail.datasetMeta.domain)), new Set(expectedDomains));
  for (const detail of fixtures) {
    const result = validateTeamTaskDetailFixture(detail);
    assert.deepEqual(result.errors, [], `${detail.datasetMeta.generatedForTaskId}: ${result.errors.join("；")}`);
    assert.deepEqual(result.stats, {
      files: 9,
      folders: 5,
      activities: 11,
      commits: 4,
      humanDiscussionEntries: 5,
      structuredChanges: 5,
    });
    assert.equal(detail.datasetMeta.provenance, TEAM_DETAIL_FIXTURE_PROVENANCE);
    assert.match(detail.datasetMeta.disclaimer, /合成演示数据/);
  }
});

test("三棵主任务协作树可生成详情，团队内独立任务不会借用主项目证据", () => {
  const scenarios = teamWorkspaceScenarios.filter((scenario) => scenario.id !== "creator-commerce");
  for (const scenario of scenarios) {
    const tasks = scenario.nodes.filter((node): node is TaskNode => node.kind === "task");
    assert.ok(tasks.length >= 10, scenario.id);
    for (const task of tasks) {
      const detail = getTeamTaskDetailFixture(task);
      const domain = task.id.startsWith("platform-") ? "platform-engineering" : task.id.startsWith("factory-") ? "manufacturing-supply" : "customer-service";
      const inScope = TEAM_DETAIL_SCOPE_TASK_IDS[domain].includes(task.id as never);
      if (!inScope) {
        assert.equal(detail, undefined, `${task.id} 是独立任务，不得借用 ${scenario.mainTaskId} 的证据`);
        continue;
      }
      assert.ok(detail, `${scenario.id}/${task.id}`);
      assert.deepEqual(validateTeamTaskDetailFixture(detail).errors, [], task.id);
      assert.equal(detail.title, task.name);
      assert.equal(detail.owner, task.ownerId);
      assert.equal(detail.status, task.status);
      assert.equal(detail.datasetMeta.generatedForTaskId, task.id);
      if (task.id === scenario.mainTaskId) assert.ok(detail.burnUp?.points.length, `${task.id} 应读取自己的示例事件账本`);
      else if (!TEAM_DETAIL_TASK_IDS[detail.datasetMeta.domain].includes(task.id as never) || task.parentTaskId) assert.equal(detail.burnUp, undefined, `${task.id} 不应借用父曲线`);
    }
  }
});

test("行业证据与任务基准版本、批次和影响数字一致", () => {
  const scenarioTasks = teamWorkspaceScenarios.flatMap((scenario) => scenario.nodes).filter((node): node is TaskNode => node.kind === "task");
  const byId = new Map(scenarioTasks.map((task) => [task.id, task]));
  const platform = JSON.stringify(getTeamTaskDetailFixture(byId.get("platform-mobile-release")!));
  const factory = JSON.stringify(getTeamTaskDetailFixture(byId.get("factory-pilot-ramp")!));
  const service = JSON.stringify(getTeamTaskDetailFixture(byId.get("service-incident-recovery")!));
  assert.match(platform, /3\.8\.0/);
  assert.doesNotMatch(platform, /8\.4|8\.1\/8\.2\/8\.3|保持 10%|扩大到 30%/);
  assert.match(factory, /500 台|PVT-A03/);
  assert.doesNotMatch(factory, /电驱执行器|630 张/);
  assert.match(service, /18 家|1,842 条|企业同步/);
  assert.doesNotMatch(service, /支付回调|347 个租户|28,226 条/);
});

test("平台、制造与客户服务的证据内容不复用空模板，分别保留行业事实和限制", () => {
  const platform = getTeamTaskDetailFixture(taskFixture("platform-android-staged"))!;
  const factory = getTeamTaskDetailFixture(taskFixture("factory-line-validation"))!;
  const service = getTeamTaskDetailFixture(taskFixture("service-data-repair"))!;
  assert.match(platform.summary, /5% 灰度|ANR/);
  assert.match(factory.summary, /420 件|扭矩/);
  assert.match(service.summary, /1,842 条|状态冲突/);
  assert.equal(new Set([platform.summary, factory.summary, service.summary]).size, 3);

  const allNames = [platform, factory, service].map((detail) => detail.files.filter((file) => file.kind === "file").map((file) => file.name).join("|"));
  assert.equal(new Set(allNames).size, 3);
  assert.match(allNames[0], /灰度|崩溃|鉴权/);
  assert.match(allNames[1], /试产|扭矩|图纸/);
  assert.match(allNames[2], /企业客户|同步|SLA/);
});

test("三类团队各有一个可追溯的子任务决策冲突，未命中的任务不硬塞冲突", () => {
  const representativeIds = ["platform-android-staged", "factory-capacity-trial", "service-compensation-review"];
  const fixtures = representativeIds.map((id, index) => {
    const task = taskFixture(id, index);
    const detail = getTeamTaskDetailFixture(task)!;
    assert.deepEqual(detail.diagnosis, getTeamTaskDiagnosisSnapshot(task));
    return detail;
  });

  assert.equal(new Set(fixtures.map((detail) => detail.datasetMeta.domain)).size, 3);
  for (const detail of fixtures) {
    assert.equal(detail.diagnosis?.decisionConflicts.length, 1, detail.datasetMeta.generatedForTaskId);
    const conflict = detail.diagnosis!.decisionConflicts[0];
    assert.equal(conflict.evidence.length, 2);
    for (const evidence of conflict.evidence) {
      const source = evidence.kind === "file"
        ? detail.files.find((file) => file.id === evidence.id)?.content
        : detail.activities.find((activity) => activity.id === evidence.id)?.message;
      assert.ok(source?.includes(evidence.fact), `${detail.datasetMeta.generatedForTaskId}/${evidence.id} 必须包含诊断所引用的原始事实`);
    }
  }

  const allTasks = teamWorkspaceScenarios.flatMap((scenario) => scenario.nodes).filter((node): node is TaskNode => node.kind === "task");
  const explicitConflicts = allTasks.filter((task) => getTeamTaskDiagnosisSnapshot(task)?.decisionConflicts.length);
  assert.deepEqual(explicitConflicts.map((task) => task.id), [
    "ccx-creator-consent-audit", "ccx-creator-ratecard-renewal", "ccx-creator-monthly-committee",
    ...representativeIds,
  ]);
});

test("文件包含可读文档、PDF 和多工作表内容，并保留版本、权限与任务关联", () => {
  for (const detail of everyFixture()) {
    const files = detail.files.filter((node): node is TeamEvidenceFileNode => node.kind === "file");
    const current = files.find((file) => file.supersedesFileId);
    assert.ok(current);
    const previous = files.find((file) => file.id === current.supersedesFileId);
    assert.ok(previous);
    assert.equal(previous.lineageId, current.lineageId);
    assert.ok((previous.version ?? 0) < (current.version ?? 0));
    assert.equal(previous.lifecycle, "superseded");
    assert.equal(current.provenance, TEAM_DETAIL_FIXTURE_PROVENANCE);

    const restricted = files.filter((file) => file.access.visibility === "restricted");
    assert.ok(restricted.length >= 3);
    assert.ok(restricted.every((file) => file.access.allowedRoles.length >= 2));
    assert.ok(restricted.every((file) => file.access.containsSensitiveData));
    assert.ok(files.every((file) => file.linkedTaskIds.includes(detail.datasetMeta.generatedForTaskId)));

    const pdf = files.find((file) => file.previewData?.kind === "pdf")!;
    const table = files.find((file) => file.previewData?.kind === "table")!;
    const document = files.find((file) => file.previewData && "text" in file.previewData)!;
    assert.equal(getTaskFileContent(pdf)?.kind, "pdf");
    const tableContent = getTaskFileContent(table);
    assert.equal(tableContent?.kind, "table");
    assert.ok(tableContent?.kind === "table" && tableContent.sheets.length >= 2);
    assert.equal(getTaskFileContent(document)?.kind, "text");
  }
});

test("讨论线程保留多层回复，AI 洞察不混入人类讨论，结构化变更进入活动时间线", () => {
  const detail = getTeamTaskDetailFixture(taskFixture("factory-pilot-ramp"))!;
  const threads = getTaskDiscussionThreads(detail.activities);
  assert.equal(threads.length, 2);
  assert.deepEqual(threads.map((thread) => thread.replies.length).sort(), [1, 2]);
  assert.ok(threads.every((thread) => thread.activity.type === "member-post"));
  assert.ok(threads.flatMap((thread) => thread.replies).every((reply) => reply.type === "member-reply"));
  assert.ok(!threads.some((thread) => thread.activity.type === "ai-insight"));

  const insight = detail.activities.find((activity): activity is TeamEvidenceActivityMock => activity.type === "ai-insight")!;
  assert.equal(insight.basis, "cross-evidence-check");
  assert.ok(insight.evidenceFileIds.length >= 3);
  const changes = getTaskChangeItems(detail.activities, detail.commits, new Date("2026-09-01T12:00:00+08:00"));
  assert.equal(changes.length, 9);
  assert.ok(changes.every((item) => item.kind === "commit" || Boolean(item.activity.changes?.length)));
});

test("校验器能定位损坏的目录、文件引用、版本谱系和回复根", () => {
  const detail = structuredClone(getTeamTaskDetailFixture(taskFixture("service-incident-recovery"))!);
  const file = detail.files.find((node): node is TeamEvidenceFileNode => node.kind === "file" && Boolean((node as TeamEvidenceFileNode).supersedesFileId))!;
  file.parentId = "missing-folder";
  file.supersedesFileId = "missing-version";
  file.sourceActivityIds.push("missing-activity");
  const discussion = detail.activities.find((activity) => activity.type === "member-reply") as TeamEvidenceActivityMock;
  discussion.replyToActivityId = "missing-root";
  discussion.evidenceFileIds.push("missing-file");
  detail.commits[0].files.push("不存在的附件.txt");

  const errors = validateTeamTaskDetailFixture(detail).errors.join("\n");
  assert.match(errors, /文件父级不存在/);
  assert.match(errors, /上一版本/);
  assert.match(errors, /文件来源活动不存在/);
  assert.match(errors, /回复缺少有效父活动/);
  assert.match(errors, /活动证据引用不存在/);
  assert.match(errors, /提交引用不存在的文件/);
});

test("校验器能定位文件、活动、回复和提交的时间线倒置", () => {
  const detail = structuredClone(getTeamTaskDetailFixture(taskFixture("service-incident-recovery"))!);
  const sourcedFile = detail.files.find((node): node is TeamEvidenceFileNode =>
    node.kind === "file" && "sourceActivityIds" in node && Array.isArray(node.sourceActivityIds) && node.sourceActivityIds.length > 0
  )!;
  sourcedFile.updatedAt = "2026-09-01T08:00:00+08:00";
  sourcedFile.createdAt = "2026-09-01T08:30:00+08:00";
  const parentFolder = detail.files.find((node): node is TeamEvidenceFileNode => node.id === sourcedFile.parentId)!;
  parentFolder.createdAt = "2026-09-01T08:45:00+08:00";
  const reply = detail.activities.find((activity) => activity.type === "member-reply") as TeamEvidenceActivityMock;
  reply.createdAt = "2026-09-01T09:00:00+08:00";
  detail.activities.find((activity) => activity.id === reply.replyToActivityId)!.createdAt = "2026-09-01T09:01:00+08:00";
  detail.activities[detail.activities.length - 1].createdAt = "2026-09-01T12:01:00+08:00";
  detail.commits[detail.commits.length - 1].createdAt = "2026-09-01T12:01:00+08:00";

  const errors = validateTeamTaskDetailFixture(detail).errors.join("\n");
  assert.match(errors, /文件或目录创建时间晚于更新时间/);
  assert.match(errors, /父目录创建时间晚于子节点/);
  assert.match(errors, /文件来源活动晚于文件更新时间/);
  assert.match(errors, /回复时间不晚于父活动/);
  assert.match(errors, /活动时间晚于数据快照/);
  assert.match(errors, /提交时间晚于数据快照/);
});

test("未知团队任务不伪造详情，也不把未接入数据冒充为空数据", () => {
  assert.equal(getTeamTaskDetailFixture(taskFixture("creator-commerce-unrelated")), undefined);
  assert.equal(getTeamTaskDetailFixture(taskFixture("unknown-task")), undefined);
  assert.equal(getTeamTaskDetailFixture({ ...taskFixture("platform-api-contract"), teamId: "customer-success" }), undefined, "任务 ID 冲突时不得借用另一团队证据");
});

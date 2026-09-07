import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { getTeamTaskDiagnosisSnapshot } from "../src/data/teamTaskDetailFixtures.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import { creatorCommerceMainTaskId, workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { getTaskDiagnosisDescendants, getTaskDiagnosisReport } from "../src/lib/taskDiagnosis.ts";

test("未完成的前置任务形成参考提醒，不直接判定当前任务不能推进", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "进行中", dueAt: "9 月 5 日" },
    dependencyTaskIds: ["legal"],
    dependencyTasks: [{ id: "legal", title: "完成法务审核", status: "进行中", dueAt: "9 月 7 日" }],
  });

  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].type, "execution-blocker");
  assert.equal(report.findings[0].severity, "review");
  assert.match(report.findings[0].conclusion, /完成法务审核.*进行中/);
  assert.deepEqual(report.findings[0].evidence, [
    { kind: "task", id: "release", source: "发布移动端版本", fact: "「发布移动端版本」依赖「完成法务审核」，当前截止 9 月 5 日。" },
    { kind: "task", id: "legal", source: "完成法务审核", fact: "「完成法务审核」当前为进行中，截止 9 月 7 日。" },
  ]);
  assert.match(report.findings[0].impact, /排期/);
  assert.doesNotMatch(JSON.stringify(report.findings), /当前任务不能继续|排期无法成立|不能据此继续/);
  assert.ok(report.findings[0].recommendation.length > 0);
});

test("前置截止晚于后续任务时明确指出排期顺序冲突", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "待开始", dueAt: "9 月 5 日" },
    dependencyTaskIds: ["legal"],
    dependencyTasks: [{ id: "legal", title: "完成法务审核", status: "进行中", dueAt: "9 月 7 日" }],
  });

  assert.equal(report.findings[0].title, "前置「完成法务审核」交付晚于当前任务截止，建议核对排期");
  assert.match(report.findings[0].conclusion, /9 月 7 日.*9 月 5 日/);
  assert.match(report.findings[0].recommendation, /确认.*时间顺序/);
});

test("多项未完成前置全部进入依据而不是只保留第一项", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "待开始" },
    dependencyTaskIds: ["legal", "security"],
    dependencyTasks: [
      { id: "legal", title: "完成法务审核", status: "进行中" },
      { id: "security", title: "完成安全审核", status: "待审核" },
    ],
  });

  assert.deepEqual(report.findings[0].evidence.map((item) => item.id), ["release", "legal", "security"]);
  assert.equal(report.findings[0].evidence[0].fact, "「发布移动端版本」依赖「完成法务审核」、「完成安全审核」。");
});

test("父任务诊断检查直接子任务之间的真实依赖", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "campaign", title: "发布活动", status: "进行中" },
    childTasks: [
      { id: "copy", title: "完成文案终审", status: "进行中", dueAt: "9 月 4 日" },
      { id: "launch", title: "上线活动页", status: "待开始", dueAt: "9 月 5 日", dependsOnTaskIds: ["copy"] },
    ],
  });

  assert.deepEqual(report.findings.map((finding) => finding.id), ["execution-blocker:launch"]);
  assert.match(report.findings[0].conclusion, /上线活动页.*完成文案终审/);
  assert.deepEqual(report.findings[0].evidence.map((item) => item.id), ["launch", "copy"]);
});

test("不可见依赖只形成覆盖缺口，不补造成阻塞事实", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "进行中" },
    dependencyTaskIds: ["restricted-source"],
    dependencyTasks: [],
  });

  assert.deepEqual(report.findings, []);
  assert.equal(report.coverage.missingDependencyCount, 1);
  assert.match(report.coverage.note, /未完成核对|不可见/);
});

test("主任务完成但仍有未完成子任务时形成决策冲突", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "campaign", title: "发布活动", status: "已完成" },
    childTasks: [
      { id: "copy", title: "完成文案终审", status: "进行中" },
      { id: "launch", title: "上线活动页", status: "已完成" },
    ],
  });

  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].type, "decision-conflict");
  assert.equal(report.findings[0].severity, "review");
  assert.match(report.findings[0].conclusion, /主任务.*已完成.*完成文案终审.*进行中/);
  assert.deepEqual(report.findings[0].evidence.map((item) => item.id), ["campaign", "copy"]);
});

test("任务已完成但前置仍未完成时转为决策冲突而不是静默消失", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "已完成" },
    dependencyTaskIds: ["legal"],
    dependencyTasks: [{ id: "legal", title: "完成法务审核", status: "进行中" }],
  });

  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].type, "decision-conflict");
  assert.match(report.findings[0].title, /已完成.*前置.*未完成/);
  assert.deepEqual(report.findings[0].evidence.map((item) => item.id), ["release", "legal"]);
});

test("只接收同时给出冲突两侧依据的结构化决策冲突", () => {
  const validConflict = {
    id: "budget-version",
    title: "追加预算存在两个执行版本",
    conclusion: "预算口径文件与执行文件不一致。",
    impact: "执行成员可能采用不同预算口径。",
    recommendation: "先核对两份文件，再继续执行。",
    evidence: [
      { kind: "file" as const, id: "decision-v1", source: "预算决定.md", fact: "合规审核完成前不追加预算。" },
      { kind: "file" as const, id: "execution", source: "执行配置.xlsx", fact: "合规审核前启动追加预算。" },
    ],
  };
  const report = getTaskDiagnosisReport({
    task: { id: "decision", title: "确认追加投放", status: "待审核" },
    decisionConflicts: [validConflict, { ...validConflict, id: "unsupported", evidence: validConflict.evidence.slice(0, 1) }],
  });

  assert.deepEqual(report.findings.map((finding) => finding.id), ["decision-conflict:decision:budget-version"]);
  assert.deepEqual(report.findings[0].evidence, validConflict.evidence);
});

test("追加投放演示任务的决策冲突两侧依据都能定位到原始记录", () => {
  const detail = taskDetailMocks["fragrance-final-decision"];
  const conflict = detail.diagnosis?.decisionConflicts[0];

  assert.ok(conflict);
  assert.equal(conflict.evidence.length, 2);
  for (const evidence of conflict.evidence) {
    if (evidence.kind === "file") assert.ok(detail.files.some((file) => file.id === evidence.id));
    if (evidence.kind === "activity") assert.ok(detail.activities.some((activity) => activity.id === evidence.id));
  }
  const report = getTaskDiagnosisReport({
    task: { id: "fragrance-final-decision", title: detail.title, status: detail.status, dueAt: detail.due },
    decisionConflicts: detail.diagnosis?.decisionConflicts,
  });
  assert.match(report.findings[0].conclusion, /预算口径文件限定 8 万元，执行文件却写 12 万元/);
});

test("诊断只透传明确的数据截止时间，不自行生成当前时间", () => {
  const withTime = getTaskDiagnosisReport({
    task: { id: "task", title: "核对任务", status: "进行中" },
    checkedAt: "2026-09-01T10:30:00+08:00",
  });
  const withoutTime = getTaskDiagnosisReport({ task: { id: "task", title: "核对任务", status: "进行中" } });

  assert.equal(withTime.checkedAt, "2026-09-01T10:30:00+08:00");
  assert.equal(withoutTime.checkedAt, undefined);
});

test("主任务递归检查全部后代并把问题归到实际受影响的任务", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "campaign", title: "发布活动", status: "进行中" },
    descendantTasks: [
      { id: "content", parentTaskId: "campaign", title: "内容准备", status: "进行中" },
      { id: "script", parentTaskId: "content", title: "锁定直播脚本", status: "进行中" },
      { id: "rehearsal", parentTaskId: "content", title: "完成直播彩排", status: "待开始", dependsOnTaskIds: ["script"] },
    ],
  });

  assert.equal(report.coverage.checkedTaskCount, 4);
  assert.deepEqual(report.findings.map((finding) => finding.subject), [{
    id: "rehearsal",
    path: ["内容准备", "完成直播彩排"],
    title: "完成直播彩排",
  }]);
  assert.equal(report.findings[0].id, "execution-blocker:rehearsal");
});

test("子任务的结构化决策冲突在自身和主任务诊断中使用同一条发现", () => {
  const childConflict = {
    id: "budget-version",
    title: "预算文件与执行配置不一致",
    conclusion: "预算文件要求维持原预算，执行配置却已增加预算。",
    impact: "执行成员可能采用不同预算口径。",
    recommendation: "先确认新方案是否生效，再继续执行。",
    evidence: [
      { kind: "file" as const, id: "decision-v1", source: "上轮投放决定.md", fact: "合规审核完成前维持现有预算。" },
      { kind: "file" as const, id: "execution", source: "执行配置.xlsx", fact: "当前执行配置已增加预算。" },
    ],
  };
  const child = getTaskDiagnosisReport({
    task: { id: "decision", title: "确认追加投放", status: "待审核" },
    decisionConflicts: [childConflict],
  });
  const parent = getTaskDiagnosisReport({
    task: { id: "campaign", title: "项目收尾", status: "进行中" },
    descendantTasks: [{
      id: "decision",
      parentTaskId: "campaign",
      title: "确认追加投放",
      status: "待审核",
      decisionConflicts: [childConflict],
    }],
  });

  assert.equal(child.findings[0].id, parent.findings[0].id);
  assert.equal(parent.findings[0].id, "decision-conflict:decision:budget-version");
  assert.equal(parent.findings[0].subject.id, "decision");
});

test("已完成的中间任务存在未结束后代时在父级聚合中形成一次冲突", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "campaign", title: "项目收尾", status: "进行中" },
    descendantTasks: [
      { id: "content", parentTaskId: "campaign", title: "内容准备", status: "已完成" },
      { id: "script", parentTaskId: "content", title: "锁定直播脚本", status: "进行中" },
    ],
  });

  assert.deepEqual(report.findings.map((finding) => finding.id), ["decision-conflict:completion:content"]);
  assert.equal(report.findings[0].subject.id, "content");
  assert.match(report.findings[0].title, /已完成.*未结束/);
});

test("递归范围只返回当前任务的全部后代并保持任务树顺序", () => {
  const tasks = [
    { id: "root" },
    { id: "child-a", parentTaskId: "root" },
    { id: "grandchild", parentTaskId: "child-a" },
    { id: "child-b", parentTaskId: "root" },
    { id: "other", parentTaskId: "another-root" },
  ];

  assert.deepEqual(getTaskDiagnosisDescendants(tasks, "root").map((task) => task.id), ["child-a", "child-b", "grandchild"]);
});

test("内容电商主任务 Mock 汇总子任务自己的决策冲突且保留同一发现标识", () => {
  const tasks = workspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const mainTask = tasks.find((task) => task.id === creatorCommerceMainTaskId)!;
  const descendants = getTaskDiagnosisDescendants(tasks, mainTask.id);
  const toDiagnosisTask = (task: TaskNode) => ({
    id: task.id,
    parentTaskId: task.parentTaskId,
    title: task.name,
    status: task.status,
    dueAt: task.dueAt,
    dependsOnTaskIds: task.dependsOnTaskIds,
    decisionConflicts: taskDetailMocks[task.id as keyof typeof taskDetailMocks]?.diagnosis?.decisionConflicts,
  });
  const parent = getTaskDiagnosisReport({
    task: toDiagnosisTask(mainTask),
    checkedAt: taskDetailMocks[creatorCommerceMainTaskId].diagnosis?.checkedAt,
    descendantTasks: descendants.map(toDiagnosisTask),
    dependencyTasks: tasks.map(toDiagnosisTask),
  });
  const childTask = tasks.find((task) => task.id === "fragrance-final-decision")!;
  const child = getTaskDiagnosisReport({
    task: toDiagnosisTask(childTask),
    decisionConflicts: taskDetailMocks["fragrance-final-decision"].diagnosis?.decisionConflicts,
    dependencyTaskIds: childTask.dependsOnTaskIds,
    dependencyTasks: tasks.map(toDiagnosisTask),
  });
  const id = "decision-conflict:fragrance-final-decision:additional-budget-version";

  assert.equal(parent.checkedAt, "2026-09-01T10:30:00+08:00");
  assert.ok(parent.findings.some((finding) => finding.id === id));
  assert.ok(child.findings.some((finding) => finding.id === id));
});

test("每套 Mock 的大部分任务可形成诊断，子任务的显式冲突同步出现在所有祖先中", () => {
  for (const scenario of teamWorkspaceScenarios) {
    const tasks = scenario.nodes.filter((node): node is TaskNode => node.kind === "task");
    const diagnosisTasks = tasks.map((task) => ({
      id: task.id,
      parentTaskId: task.parentTaskId,
      title: task.name,
      status: task.status,
      dueAt: task.dueAt,
      dependsOnTaskIds: task.dependsOnTaskIds,
      decisionConflicts: taskDetailMocks[task.id as keyof typeof taskDetailMocks]?.diagnosis?.decisionConflicts
        ?? getTeamTaskDiagnosisSnapshot(task)?.decisionConflicts,
    }));
    const byId = new Map(diagnosisTasks.map((task) => [task.id, task]));
    const reports = new Map(diagnosisTasks.map((task) => [task.id, getTaskDiagnosisReport({
      task,
      descendantTasks: getTaskDiagnosisDescendants(diagnosisTasks, task.id),
      dependencyTaskIds: task.dependsOnTaskIds,
      dependencyTasks: diagnosisTasks,
    })]));
    const diagnosedCount = [...reports.values()].filter((report) => report.findings.length > 0).length;
    assert.ok(diagnosedCount / tasks.length >= 0.5, `${scenario.id} 诊断覆盖 ${diagnosedCount}/${tasks.length}，未达到大部分`);

    for (const task of diagnosisTasks.filter((item) => item.decisionConflicts?.length)) {
      const findingIds = task.decisionConflicts!.map((conflict) => `decision-conflict:${task.id}:${conflict.id}`);
      let current = task;
      while (current.parentTaskId) {
        const parent = byId.get(current.parentTaskId);
        if (!parent) break;
        for (const findingId of findingIds) {
          assert.ok(reports.get(parent.id)?.findings.some((finding) => finding.id === findingId), `${findingId} 未聚合到祖先 ${parent.id}`);
        }
        current = parent;
      }
    }
  }
});

test("达人池保留原讨论，新增冲突只来自文件，旧讨论快照仍为空", () => {
  const tasks = teamWorkspaceScenarios.flatMap((scenario) => scenario.nodes)
    .filter((node): node is TaskNode => node.kind === "task" && node.teamId === "creator-commerce");
  const examples = [
    ["ccx-creator-consent-audit", /授权/],
    ["ccx-creator-ratecard-renewal", /佣金/],
    ["ccx-creator-monthly-committee", /续约/],
  ] as const;
  for (const [id, title] of examples) {
    const task = tasks.find((item) => item.id === id)!;
    assert.ok(task);
    const detail = createWorkspaceTaskDetail(task);
    const snapshot = getTeamTaskDiagnosisSnapshot(task);
    assert.deepEqual(snapshot?.decisionConflicts, [], `${id} 的讨论不等于已生效决定`);
    assert.equal(detail.diagnosis?.decisionConflicts.length, 1, "新增资料形成一个文件冲突");
    assert.ok(detail.diagnosis!.decisionConflicts[0].evidence.every((item) => item.kind === "file" && detail.files.some((file) => file.id === item.id)));
    assert.ok(detail.activities.some((activity) => title.test(activity.message)), "保留成员讨论内容");
    const report = getTaskDiagnosisReport({
      task: { id, title: task.name, status: task.status, context: {
        goal: detail.goal, completionCriteria: task.completionCriteria ?? [], activities: detail.activities, commits: detail.commits,
        files: detail.files.filter((file) => !file.id.includes("-diagnosis-")),
      } },
      decisionConflicts: detail.diagnosis?.decisionConflicts,
    });
    assert.equal(report.findings.length, 0);
    assert.equal(getTeamTaskDiagnosisSnapshot({ ...task, teamId: "customer-success" }), undefined);
    assert.equal(getTeamTaskDiagnosisSnapshot({ ...task, createdFrom: "task-editor" }), undefined);
  }

  const diagnosisTasks = tasks.map((task) => ({
    ...task, title: task.name, decisionConflicts: getTeamTaskDiagnosisSnapshot(task)?.decisionConflicts,
  }));
  const root = diagnosisTasks.find((task) => task.id === "ccx-creator-pool-governance")!;
  const report = getTaskDiagnosisReport({
    task: root,
    descendantTasks: getTaskDiagnosisDescendants(diagnosisTasks, root.id),
    dependencyTasks: diagnosisTasks,
  });
  assert.equal(report.findings.filter((finding) => finding.type === "decision-conflict").length, 0);
  assert.equal(report.findings.filter((finding) => finding.type === "execution-blocker").length, 5);
});

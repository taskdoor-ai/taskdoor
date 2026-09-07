import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers, creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";
import { taskCreationScenarios, type TaskCreationScenarioId } from "../src/data/taskCreationScenarios.ts";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { planTaskCreation } from "../src/lib/taskCreationPlanning.ts";
import { createCreationRelationshipProcess, getCreationDisplayStage, getCreationFeedback, getCreationProcessStepState, getCreationResponseSummary, markLatestCreationDecisionResolved, recordCreationAdjustmentProgress, type CreationProcess } from "../src/lib/taskCreationProgress.ts";
import type { TaskAiAdjustmentProgress } from "../src/lib/taskAiAdjustmentTypes.ts";
import * as creationProgress from "../src/lib/taskCreationProgress.ts";
import type { ScenarioContext } from "../src/lib/taskCreationScenario.ts";

const context: ScenarioContext = {
  currentDate: "2026-08-31", currentUserId: "周岚", members: creatorCommerceMembers,
  tags: creatorCommerceTags.map(tag => tag.name), existingTasks: workspaceNodes.filter(node => node.kind === "task"),
};
const promptFor = (id: TaskCreationScenarioId) => taskCreationScenarios.find(scenario => scenario.id === id)!.prompt;
const resultFor = (id: TaskCreationScenarioId, currentContext = context) => planTaskCreation(promptFor(id), currentContext);

const adjustmentProgress = (id: string): TaskAiAdjustmentProgress => ({
  id, taskId: "draft-main", instruction: "增加完成标准：已核对交付", activeStep: 0, status: "running",
  steps: [
    { label: "理解补充需求", detail: "核对补充要求", basis: "当前输入及草稿" },
    { label: "整理调整方案", detail: "准备修改预览", basis: "本次字段变化" },
  ],
});

test("补充需求进度在生成快照后独立更新，不修改之前的过程或输入事件", () => {
  const initial: CreationProcess = { id: 1, title: "初次生成", request: "最初需求", answers: {}, steps: [], activeStep: 0, status: "completed" };
  const original = [initial];
  const event = adjustmentProgress("1");
  const running = recordCreationAdjustmentProgress(original, event, 1000);
  assert.equal(running.length, 2);
  assert.equal(running[0], initial);
  assert.equal(running[1].id, "adjustment:1");
  assert.equal(running[1].kind, "adjustment");
  assert.equal(running[1].request, event.instruction);
  const completed = recordCreationAdjustmentProgress(running, { ...event, activeStep: 1, status: "completed", outcome: "调整方案待确认" }, 13000);
  assert.equal(completed.length, 2);
  assert.equal(completed[1].status, "completed");
  assert.equal(completed[1].startedAt, 1000);
  assert.equal(completed[1].completedAt, 13000);
  const applied = recordCreationAdjustmentProgress(completed, { ...event, status: "completed", applicationStatus: "applied" }, 30000);
  assert.equal(applied[1].completedAt, 13000, "确认应用的等待时间不计入思考耗时");
  assert.equal(running[1].status, "running");
  event.steps[0].basis = "后续变化";
  assert.equal(completed[1].steps[0].basis, "当前输入及草稿");
  assert.deepEqual(original, [initial]);
});

test("关系确认作为独立对话轮次保留用户选择与后续回复", () => {
  const attached = createCreationRelationshipProcess("relationship:1", "attach", "九月达人项目", "已作为子任务整理候选方案。");
  assert.equal(attached.kind, "relationship");
  assert.equal(attached.request, "作为「九月达人项目」的子任务继续");
  assert.equal(attached.responseSummary, "已作为子任务整理候选方案。");
  assert.equal(attached.status, "completed");
  assert.deepEqual(attached.steps, [{
    label: "整理关系选择",
    detail: "按你的选择，将当前需求作为「九月达人项目」的子任务继续整理。",
    basis: "你的选择：作为「九月达人项目」的子任务继续",
  }]);
  const independent = createCreationRelationshipProcess("relationship:2", "independent", "九月达人项目", "已按独立任务整理候选方案。");
  assert.equal(independent.request, "仍然独立规划");
  assert.equal(independent.steps[0].detail, "按你的选择，将当前需求作为独立任务继续整理。");
});

test("关系确认后只更新最新关系判断的主页面状态，保留当时 AI 提问回复", () => {
  const previous: CreationProcess = {
    id: 1, title: "初次生成", request: "最初需求", answers: {}, steps: [], activeStep: 0,
    status: "completed", outcome: "候选方案已生成",
  };
  const decision: CreationProcess = {
    ...previous, id: 2, outcome: "任务关系待确认", responseSummary: "发现可能属于已有任务，请确认关系。",
  };
  const resolved = markLatestCreationDecisionResolved([previous, decision]);
  assert.equal(resolved[0], previous);
  assert.equal(resolved[1].outcome, "候选方案已生成");
  assert.equal(resolved[1].responseSummary, decision.responseSummary);
  assert.equal(decision.outcome, "任务关系待确认");
  const unchanged = [previous];
  assert.equal(markLatestCreationDecisionResolved(unchanged), unchanged);
});

test("补充需求历史保留 AI 回复、字段差异和是否应用，后续状态只更新原轮次", () => {
  const event: TaskAiAdjustmentProgress = {
    ...adjustmentProgress("history"), activeStep: 1, status: "completed",
    outcome: "修改候选已生成，确认后才应用。",
    responseSummary: "建议把任务名称调整为新的发布计划。",
    changes: [{ taskId: "draft-main", taskTitle: "发布计划", label: "任务名称", before: "发布计划", after: "新的发布计划" }],
    applicationStatus: "pending",
  };
  const running = recordCreationAdjustmentProgress([], { ...event, activeStep: 0, status: "running", outcome: undefined, applicationStatus: undefined });
  const pending = recordCreationAdjustmentProgress(running, event);
  assert.equal(pending[0].responseSummary, event.responseSummary);
  assert.deepEqual(pending[0].changes, event.changes);
  assert.equal(pending[0].applicationStatus, "pending");

  event.changes![0].after = "被外部修改";
  const applied = recordCreationAdjustmentProgress(pending, {
    ...event,
    changes: pending[0].changes,
    applicationStatus: "applied",
    outcome: "调整已应用到草稿，可以继续提出要求。",
  });
  assert.equal(applied.length, 1);
  assert.equal(applied[0].applicationStatus, "applied");
  assert.equal(applied[0].changes?.[0].after, "新的发布计划");
  assert.equal(pending[0].applicationStatus, "pending", "旧历史快照不能被后续状态原地修改");
});

test("旧轮更新不替换最新补充需求，停止后到达的旧running事件不能重启过程", () => {
  const first = adjustmentProgress("first");
  const second = adjustmentProgress("second");
  let processes = recordCreationAdjustmentProgress([], first);
  processes = recordCreationAdjustmentProgress(processes, { ...first, activeStep: 1, status: "completed" });
  processes = recordCreationAdjustmentProgress(processes, second);
  processes = recordCreationAdjustmentProgress(processes, { ...first, activeStep: 1, status: "completed", outcome: "已应用" });
  assert.equal(processes.at(-1)?.id, "adjustment:second");
  assert.equal(processes[0].outcome, "已应用");
  processes = recordCreationAdjustmentProgress(processes, { ...second, status: "stopped" });
  assert.equal(recordCreationAdjustmentProgress(processes, second), processes);
  assert.equal(processes.at(-1)?.status, "stopped");
});

test("未知轮次的结束回调不能凭空插入过程", () => {
  const processes: CreationProcess[] = [];
  for (const status of ["completed", "stopped", "failed"] as const) {
    assert.equal(recordCreationAdjustmentProgress(processes, { ...adjustmentProgress("old"), status }), processes);
  }
});

test("过程中止或失败只保留实际到达的步骤，不将后续步骤标成完成", () => {
  const process: CreationProcess = { id: 1, title: "初次生成", request: promptFor("complex-plan"), answers: {}, steps: getCreationFeedback(resultFor("complex-plan")), activeStep: 1, status: "running" };
  for (const status of ["running", "stopped", "failed"] as const) {
    const snapshot = { ...process, status };
    assert.deepEqual(snapshot.steps.map((_, index) => getCreationProcessStepState(snapshot, index)), ["completed", status, "pending", "pending"]);
  }
  const completed = { ...process, activeStep: 3, status: "completed" as const };
  assert.deepEqual(completed.steps.map((_, index) => getCreationProcessStepState(completed, index)), ["completed", "completed", "completed", "completed"]);
});

test("正常review有四个清晰阶段，每步附动作与一行依据", () => {
  for (const id of ["single-task", "complex-plan"] as const) {
    const result = resultFor(id);
    const before = structuredClone(result);
    assert.equal(result.stage, "review");
    const feedback = getCreationFeedback(result);
    assert.deepEqual(feedback.map(step => step.label), ["分析任务", "目标与计划", "成员推荐", "动态规划"]);
    assert.ok(feedback.every(step => step.label.length <= 12 && step.detail.length > 0 && step.detail.length < 55));
    assert.ok(feedback.every(step => typeof step.basis === "string" && step.basis.trim().length > 0 && step.basis.length < 55 && !/[\r\n]/.test(step.basis)));
    assert.match(feedback[0].basis, /当前输入/);
    assert.match(feedback[0].basis, /未检索历史/);
    assert.doesNotMatch(JSON.stringify(feedback), /已完成查重|最优|已指派|已优化|已重排|已核对日历|读取完成记录|读取讨论/);
    assert.deepEqual(result, before, "展示阶段不能修改候选或写入任务");
  }
});

test("创建演示每步三秒，与共享播放器默认节奏分开", () => {
  assert.equal(creationProgress.CREATION_MOCK_STEP_MS, 3000);
  assert.equal(getCreationFeedback(resultFor("complex-plan")).length * creationProgress.CREATION_MOCK_STEP_MS, 12_000);
});

test("计划按交付边界处理简单与复杂任务，工时未知仍待确认", () => {
  assert.match(getCreationFeedback(resultFor("single-task"))[1].detail, /不额外拆分/);
  assert.match(getCreationFeedback(resultFor("complex-plan"))[1].detail, /独立验收.*交付.*拆分/);
  for (const id of ["single-task", "complex-plan"] as const) {
    const feedback = getCreationFeedback(resultFor(id));
    assert.match(feedback[1].detail, /预估人类投入/);
    assert.match(feedback[1].basis, /未知.*待确认/);
    assert.match(feedback[2].detail, /成员职责/);
    assert.match(feedback[2].detail, /候选|人选建议/);
    assert.match(feedback[2].basis, /实际忙闲待确认/);
    assert.match(feedback[3].detail, /候选.*依赖.*期限依据/);
    assert.doesNotMatch(JSON.stringify(feedback), /容量充足|自动分配|已优化|已重排/);
  }
  const unknownEffort = resultFor("single-task");
  assert.equal(unknownEffort.stage, "review");
  if (unknownEffort.stage !== "review") return;
  delete unknownEffort.form.mainTask.effortEstimate;
  assert.match(getCreationFeedback(unknownEffort)[1].basis, /未知.*待确认/);
});

test("开始整理后立即进入方案详情加载态，不停留在需求或补问表单", () => {
  for (const planning of [null, resultFor("single-task"), resultFor("clarify-requirement"), resultFor("existing-parent"), planTaskCreation("未知需求", context)]) {
    for (const editingBrief of [false, true]) {
      assert.equal(getCreationDisplayStage(planning, { busy: true, editingBrief }), "planning");
    }
  }
});

test("停止或失败后恢复原输入阶段，原有方案、补问和关系确认仍各自保留", () => {
  assert.equal(getCreationDisplayStage(null, { busy: false, editingBrief: false }), "describe");
  assert.equal(getCreationDisplayStage(planTaskCreation("未知需求", context), { busy: false, editingBrief: false }), "describe");
  for (const id of ["single-task", "clarify-requirement", "existing-parent"] as const) {
    const planning = resultFor(id);
    const before = structuredClone(planning);
    assert.equal(getCreationDisplayStage(planning, { busy: false, editingBrief: true }), "describe");
    assert.equal(getCreationDisplayStage(planning, { busy: false, editingBrief: false }), planning.stage);
    assert.deepEqual(planning, before);
  }
});

test("补问只检查必要信息，不播放已规划或已推荐", () => {
  const result = resultFor("clarify-requirement");
  const before = structuredClone(result);
  const feedback = getCreationFeedback(result);
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0].label, "核对必要信息");
  assert.match(feedback[0].detail, /目标|交付/);
  assert.match(feedback[0].basis, /当前输入/);
  assert.doesNotMatch(JSON.stringify(feedback), /分工|人选|已生成/);
  assert.deepEqual(result, before);
});

test("每轮初次规划保存用户当时看到的完整 AI 回复，不只保存笼统结果", () => {
  const review = resultFor("complex-plan");
  assert.equal(review.stage, "review");
  if (review.stage === "review") assert.equal(getCreationResponseSummary(review), review.summary);

  const clarify = resultFor("clarify-requirement");
  assert.equal(clarify.stage, "clarify");
  assert.match(getCreationResponseSummary(clarify), /这次活动希望达成什么目标/);
  assert.match(getCreationResponseSummary(clarify), /完成时需要交付什么/);

  const unavailable = planTaskCreation("搭建数据仓库", context);
  assert.equal(unavailable.stage, "unavailable");
  if (unavailable.stage === "unavailable") assert.equal(getCreationResponseSummary(unavailable), unavailable.message);
});

test("关系分支只整理示例关系供人确认，不假装已经查重", () => {
  for (const id of ["similar-task", "existing-parent"] as const) {
    const feedback = getCreationFeedback(resultFor(id));
    assert.deepEqual(feedback.map(step => step.label), ["理解输入", "核对任务关系"]);
    assert.match(feedback[1].detail, /候选关系/);
    assert.match(feedback[1].detail, /确认/);
    assert.ok(feedback.every(step => step.basis.trim().length > 0));
    assert.doesNotMatch(feedback[1].detail, /已关联|已继承|没有重复/);
  }
});

test("未知需求或缺失关联对象只检查支持范围", () => {
  for (const result of [planTaskCreation("搭建数据仓库", context), resultFor("similar-task", { ...context, existingTasks: [] })]) {
    assert.equal(result.stage, "unavailable");
    const feedback = getCreationFeedback(result);
    assert.equal(feedback.length, 1);
    assert.equal(feedback[0].label, "检查支持范围");
    assert.match(feedback[0].basis, /示例/);
    assert.doesNotMatch(JSON.stringify(feedback), /已生成|已匹配|已整理/);
  }
});

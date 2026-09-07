import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { newCreationTask, removeCreationSubtask, toTaskPlanDraft, validateCreationForm } from "../src/lib/taskCreationForm.ts";
import { getCreationEffortLeaves, reconcileCreationEffort, withMockCreationEffort } from "../src/lib/taskCreationEffort.ts";
import { planTaskCreation } from "../src/lib/taskCreationPlanning.ts";
import { createManualEffortEstimate, getTaskEffortState, summarizeTaskEffort } from "../src/lib/taskEffort.ts";

const context = { currentDate: "2026-08-31", currentUserId: "周岚", members: creatorCommerceMembers, tags: [], existingTasks: workspaceNodes.filter(node => node.kind === "task") };
const plan = (id: "single-task" | "complex-plan" | "existing-parent" | "similar-task") => {
  const result = planTaskCreation(taskCreationScenarios.find(item => item.id === id)!.prompt, context);
  assert.ok(result.stage === "review" || result.stage === "decision");
  return result.form;
};

test("复杂示例有带假设的叶子工时建议，主任务不另估或自动确认", () => {
  const form = plan("complex-plan");
  const leaves = getCreationEffortLeaves(form);
  assert.equal(leaves.length, 7);
  assert.equal(form.mainTask.effortEstimate, undefined);
  assert.ok(leaves.every(task => task.effortEstimate?.basis === "mock" && task.effortEstimate.reason.startsWith("估算假设：")));
  assert.ok(leaves.every(task => !/示例|Mock/.test(task.effortEstimate!.reason)));
  assert.ok(leaves.every(task => getTaskEffortState(task) === "proposed"));
  const summary = summarizeTaskEffort(leaves);
  assert.equal(summary.knownMinutes, 2400);
  assert.equal(summary.totalMinutes, 2400);
  assert.equal(summary.confirmedCount, 0);
  assert.equal(summary.estimatedCount, 7);
});

test("固定估算理由使用估算假设，不修改底层Mock来源或清洗用户理由", () => {
  for (const [id, minutes] of [["single-task", 90], ["similar-task", 180], ["existing-parent", 180]] as const) {
    const form = plan(id);
    assert.match(form.mainTask.effortEstimate?.reason ?? "", /^估算假设：/);
    assert.equal(form.mainTask.effortEstimate?.minutes, minutes);
    assert.equal(form.mainTask.effortEstimate?.basis, "mock");
    assert.equal(form.mainTask.effortEstimate?.confirmed, false);
    assert.equal(getTaskEffortState(form.mainTask), "proposed");
  }
  const form = plan("single-task");
  form.mainTask.effortEstimate!.reason = "用户输入：准备示例文档并核对 Mock 接口，预计90分钟。";
  const before = structuredClone(form);
  assert.deepEqual(withMockCreationEffort(form), before, "已有手工输入不参与字符串替换");
});

test("单任务自己是叶子；没有充分场景依据不补默认工时", () => {
  const single = plan("single-task");
  assert.equal(getCreationEffortLeaves(single).length, 1);
  assert.equal(single.mainTask.effortEstimate?.minutes, 90);
  const vague = planTaskCreation(taskCreationScenarios.find(item => item.id === "clarify-requirement")!.prompt, context, { answers: { goal: "提高曝光", deliverable: "活动方案" } });
  assert.equal(vague.stage, "review");
  if (vague.stage !== "review") return;
  assert.equal(vague.form.mainTask.effortEstimate, undefined);
  assert.equal(summarizeTaskEffort(getCreationEffortLeaves(vague.form)).totalMinutes, null);
  assert.equal(validateCreationForm(vague.form, context.members), null);
});

test("增加未估子项后只显示已知小计，不把未知视为零或偷用父估算", () => {
  const form = plan("complex-plan");
  const next = reconcileCreationEffort(form, { ...form, subtasks: [...form.subtasks, newCreationTask()] });
  const summary = summarizeTaskEffort(getCreationEffortLeaves(next));
  assert.equal(summary.knownMinutes, 2400);
  assert.equal(summary.estimatedCount, 7);
  assert.equal(summary.taskCount, 8);
  assert.equal(summary.unknownCount, 1);
  assert.equal(summary.totalMinutes, null);
});

test("单任务拆分再移除最后子项，不自动恢复旧的已确认总量", () => {
  const form = plan("single-task");
  form.mainTask.effortEstimate = createManualEffortEstimate(form.mainTask, { minutes: 120, workMethod: "AI 整理，人工复核", reason: "校对与核对合计两小时" });
  const split = reconcileCreationEffort(form, { ...form, subtasks: [newCreationTask()] });
  assert.equal(getTaskEffortState(split.mainTask), "stale");
  assert.equal(split.mainTask.effortEstimate?.minutes, 120);
  const restored = reconcileCreationEffort(split, removeCreationSubtask(split, split.subtasks[0].clientId));
  assert.equal(getTaskEffortState(restored.mainTask), "stale");
  assert.equal(summarizeTaskEffort(getCreationEffortLeaves(restored)).totalMinutes, null);
});

test("主目标改变传递给子项并触发复核；只改人选日期不重置估算", () => {
  const form = plan("complex-plan");
  const changed = reconcileCreationEffort(form, { ...form, mainTask: { ...form.mainTask, goal: "扩大到三个产品的上线" } });
  assert.ok(changed.subtasks.every(task => task.goal === changed.mainTask.goal));
  assert.equal(summarizeTaskEffort(getCreationEffortLeaves(changed)).staleCount, 7);
  const people = reconcileCreationEffort(form, { ...form, subtasks: form.subtasks.map(task => ({ ...task, ownerId: "", endDate: "" })) });
  assert.equal(summarizeTaskEffort(getCreationEffortLeaves(people)).estimatedCount, 7);
});

test("关联已有主任务后估算绑定继承目标，不复用原独立目标的确认", () => {
  const form = plan("existing-parent");
  assert.ok(form.candidate);
  const attached = reconcileCreationEffort(form, { ...form, decision: "attach" });
  assert.equal(getCreationEffortLeaves(attached)[0].goal, form.candidate.goal);
  if (form.mainTask.goal !== form.candidate.goal) assert.equal(getTaskEffortState(attached.mainTask), "stale");
});

test("最终创建保留估算确认状态；无估算不阻止创建，非法工时不可写入", () => {
  const form = plan("single-task");
  const draft = toTaskPlanDraft(form);
  assert.equal(draft.mainTask.effortEstimate?.confirmed, false);
  assert.deepEqual(draft.mainTask.effortEstimate, form.mainTask.effortEstimate);
  const blank = structuredClone(form);
  delete blank.mainTask.effortEstimate;
  assert.equal(validateCreationForm(blank, context.members), null);
  const invalid = structuredClone(form);
  invalid.mainTask.effortEstimate!.minutes = -1;
  assert.match(validateCreationForm(invalid, context.members) ?? "", /投入|工时|估算/);
});

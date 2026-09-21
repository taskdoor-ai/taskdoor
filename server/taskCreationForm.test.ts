import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

// Historical fixtures run at their authored creation date.
beforeEach(t => t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-08-31T02:00:00Z") }));
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";
import { createCreationForm, removeCreationSubtask, toTaskPlanDraft, validateCreationForm } from "../src/lib/taskCreationForm.ts";

const context = { currentDate: "2026-08-31", currentUserId: "周岚", members: creatorCommerceMembers, tags: [], existingTasks: workspaceNodes.filter(n => n.kind === "task") };

test("直接打开的空白任务不预填示例，补全任务字段即可提交而无需需求原文", () => {
  const form = createCreationForm("", context);
  assert.equal(form.request, "");
  assert.equal(form.mainTask.title, "");
  assert.equal(form.mainTask.goal, "");
  assert.equal(form.mainTask.ownerId, "");
  assert.deepEqual(form.mainTask.completionCriteria, [""]);
  assert.equal(form.subtasks.length, 0);
  assert.ok(validateCreationForm(form, context.members));
  form.mainTask.title = "确认发布范围";
  form.mainTask.goal = "让团队对本次发布内容形成一致理解";
  form.mainTask.completionCriteria = ["范围清单经评审确认并向团队共享"];
  assert.equal(validateCreationForm(form, context.members), null);
  assert.equal(toTaskPlanDraft(form).mainTask.title, "确认发布范围");
});

test("创建场景变成可编辑表单，一级与多层级项目保留各项完成标准", () => {
  for (const scenario of taskCreationScenarios) {
    const form = createCreationForm(scenario.prompt, context, scenario.id);
    assert.ok(form.mainTask.clientId);
    assert.ok(form.mainTask.title);
    if (scenario.id === "complex-plan" || scenario.id === "nested-plan") {
      const count = scenario.id === "nested-plan" ? 9 : 7;
      assert.equal(form.subtasks.length, count);
      assert.equal(new Set(form.subtasks.map(t => t.clientId)).size, count);
      for (const task of [form.mainTask, ...form.subtasks]) assert.ok(task.completionCriteria.some(c => c.trim()));
      assert.equal(validateCreationForm(form, context.members), null);
    } else assert.equal(form.subtasks.length, 0);
    if (scenario.id === "clarify-requirement") assert.match(validateCreationForm(form, context.members)!, /目标|完成标准/);
    if (scenario.id === "similar-task" || scenario.id === "existing-parent") {
      assert.ok(form.candidate);
      assert.match(validateCreationForm(form, context.members)!, /确认/);
    }
  }
});

test("任意需求不伪造目标、完成标准或负责人，也不套用营销示例", () => {
  const form = createCreationForm("设计数据仓库", context);
  assert.equal(form.mainTask.title, "设计数据仓库");
  assert.equal(form.mainTask.goal, "");
  assert.equal(form.mainTask.ownerId, "");
  assert.deepEqual(form.mainTask.completionCriteria, [""]);
  assert.equal(form.subtasks.length, 0);
});

test("稳定依赖在改名、删除和重排后仍指向同一任务，提交才转换索引", () => {
  const form = createCreationForm("", context, "complex-plan");
  const target = form.subtasks[0];
  const dependent = form.subtasks[2];
  dependent.dependsOnClientIds = [target.clientId];
  target.title = "新名称";
  form.subtasks.reverse();
  const plan = toTaskPlanDraft(form);
  assert.deepEqual(plan.dependencies?.find(d => d.subtaskIndex === 4)?.dependsOnSubtaskIndexes, [6]);
  const next = removeCreationSubtask(form, target.clientId);
  assert.ok(next.subtasks.every(t => !t.dependsOnClientIds.includes(target.clientId)));
  assert.equal(form.subtasks.length, 7);
  assert.ok(plan.subtasks.every(t => t.goal === plan.mainTask.goal));
});

test("拒绝自环、循环、悬空引用、空完成标准及失效的候选成员", () => {
  const form = createCreationForm("", context, "complex-plan");
  form.subtasks[0].dependsOnClientIds = [form.subtasks[0].clientId];
  assert.match(validateCreationForm(form, context.members)!, /依赖/);
  form.subtasks[0].dependsOnClientIds = [form.subtasks[2].clientId];
  form.subtasks[2].dependsOnClientIds = [form.subtasks[0].clientId];
  assert.match(validateCreationForm(form, context.members)!, /依赖/);
  form.subtasks[0].dependsOnClientIds = ["missing"];
  assert.match(validateCreationForm(form, context.members)!, /依赖/);
  form.subtasks.forEach(t => { t.dependsOnClientIds = []; });
  form.subtasks[1].completionCriteria = [" "];
  assert.match(validateCreationForm(form, context.members)!, /完成标准/);
  form.subtasks[1].completionCriteria = ["交付审核后的脚本"];
  form.subtasks[1].ownerId = "missing";
  assert.match(validateCreationForm(form, context.members)!, /负责人/);
});

test("关联已有主任务保留草稿目标，非法日期不可提交", () => {
  const form = createCreationForm("", context, "existing-parent");
  form.decision = "attach";
  assert.equal(toTaskPlanDraft(form).mainTask.goal, form.mainTask.goal);
  form.mainTask.endDate = "2026-02-30";
  assert.match(validateCreationForm(form, context.members)!, /日期/);
});

test("确认创建前重新检查参与人，失效成员不能绕过候选修订的校验", () => {
  const form = createCreationForm("", context, "complex-plan");
  form.mainTask.participantIds = ["已经移出的成员"];
  assert.match(validateCreationForm(form, context.members)!, /参与人/);
  form.mainTask.participantIds = [];
  form.subtasks[0].participantIds = ["已经移出的成员"];
  assert.match(validateCreationForm(form, context.members)!, /子任务 1.*参与人/);
});

test("即时同步保留的空标准行必须补全或删除，主任务与子任务一致", () => {
  const form = createCreationForm("", context, "complex-plan");
  form.subtasks[0].completionCriteria = ["合作名单已核对", "  "];
  assert.match(validateCreationForm(form, context.members)!, /子任务 1.*第 2 条完成标准为空/);
  assert.deepEqual(form.subtasks[0].completionCriteria, ["合作名单已核对", "  "]);
  form.subtasks[0].completionCriteria[1] = "报价已确认";
  assert.equal(validateCreationForm(form, context.members), null);
  form.mainTask.completionCriteria = ["项目已交付", ""];
  assert.match(validateCreationForm(form, context.members)!, /任务.*第 2 条完成标准为空/);
  form.mainTask.completionCriteria.pop();
  assert.equal(validateCreationForm(form, context.members), null);
});

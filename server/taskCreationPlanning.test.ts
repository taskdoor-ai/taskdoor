import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers, creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";
import { taskCreationScenarios, type TaskCreationScenarioId } from "../src/data/taskCreationScenarios.ts";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { hasValidCreationDependencies, toTaskPlanDraft, validateCreationForm, type CreationForm } from "../src/lib/taskCreationForm.ts";
import { planTaskCreation, resolveCreationRelationship, reviseCreationPlan } from "../src/lib/taskCreationPlanning.ts";
import type { ScenarioContext } from "../src/lib/taskCreationScenario.ts";

const context: ScenarioContext = {
  currentDate: "2026-08-31",
  currentUserId: "周岚",
  members: creatorCommerceMembers,
  tags: creatorCommerceTags.map(({ name }) => name),
  existingTasks: workspaceNodes.filter(node => node.kind === "task"),
};
const promptFor = (id: TaskCreationScenarioId) => taskCreationScenarios.find(scenario => scenario.id === id)!.prompt;
const formFor = (id: TaskCreationScenarioId, latestContext = context): CreationForm => {
  const result = planTaskCreation(promptFor(id), latestContext);
  assert.ok(result.stage === "review" || result.stage === "decision", `expected a candidate, received ${result.stage}`);
  return result.form;
};

test("空白与未知需求不生成手动空表或套用示例，原文保留", () => {
  for (const request of ["", " \n ", "请为客户搭建数据仓库", "整理下周例会纪要，再发邮件"] ) {
    const result = planTaskCreation(request, context);
    assert.equal(result.stage, "unavailable");
    if (result.stage !== "unavailable") return;
    assert.equal(result.request, request);
    assert.ok(result.message);
    assert.equal("form" in result, false);
  }
});

test("只接受 trim 后完全一致的六个示例，修改原文不能靠 scenarioId 强行套用", () => {
  const result = planTaskCreation(`  ${promptFor("single-task")}\n`, context);
  assert.equal(result.stage, "review");
  for (const scenario of taskCreationScenarios) {
    const edited = `${scenario.prompt}，另有其他要求`;
    const unavailable = planTaskCreation(edited, context, { scenarioId: scenario.id });
    assert.equal(unavailable.stage, "unavailable");
    if (unavailable.stage === "unavailable") assert.equal(unavailable.request, edited);
  }
  assert.equal(planTaskCreation(promptFor("single-task"), context, { scenarioId: "complex-plan" }).stage, "unavailable");
});

test("信息不足只补问目标与完成交付，不展示空候选或第三个期限问题", () => {
  const result = planTaskCreation(promptFor("clarify-requirement"), context);
  assert.equal(result.stage, "clarify");
  if (result.stage !== "clarify") return;
  assert.equal(result.scenarioId, "clarify-requirement");
  assert.deepEqual(result.questions.map(question => question.field), ["goal", "deliverable"]);
  assert.ok(result.questions.every(question => question.title && question.placeholder && question.choices.length));
  assert.ok(result.questions.every(question => question.choices.length === 3), "每道澄清题都提供三个可直接选择的答案");
  assert.equal("form" in result, false);
});

test("空答案和待定答案都不能进入确认，有目标时只补问剩余交付", () => {
  for (const answers of [{}, { goal: " ", deliverable: "" }, { goal: "暂时不确定", deliverable: "待定" }]) {
    const result = planTaskCreation(promptFor("clarify-requirement"), context, { answers });
    assert.equal(result.stage, "clarify");
  }
  const partial = planTaskCreation(promptFor("clarify-requirement"), context, { answers: { goal: "提升新品曝光", deliverable: " " } });
  assert.equal(partial.stage, "clarify");
  if (partial.stage === "clarify") assert.deepEqual(partial.questions.map(question => question.field), ["deliverable"]);
});

test("两个有效答复形成有目标和完成标准的单任务候选，期限允许稍后编辑", () => {
  const answers = { goal: "让参会客户了解新品功能", deliverable: "可执行的活动方案和执行排期" };
  const result = planTaskCreation(promptFor("clarify-requirement"), context, { answers });
  assert.equal(result.stage, "review");
  if (result.stage !== "review") return;
  assert.equal(result.form.mainTask.goal, answers.goal);
  assert.ok(result.form.mainTask.completionCriteria.some(criterion => criterion.includes(answers.deliverable)));
  assert.equal(result.form.subtasks.length, 0);
  assert.equal(result.form.mainTask.startDate, "");
  assert.equal(result.form.mainTask.endDate, "");
  assert.equal(validateCreationForm(result.form, context.members), null);
  assert.doesNotMatch(result.form.mainTask.goal, /暂时不确定/);
});

test("轻任务保留一层任务和执行建议，不添加同名子任务", () => {
  const form = formFor("single-task");
  assert.equal(form.mainTask.title, promptFor("single-task"));
  assert.equal(form.subtasks.length, 0);
  assert.notEqual(form.mainTask.goal, form.mainTask.title);
  assert.ok(form.mainTask.executionTips.length > 0);
  assert.ok(form.mainTask.completionCriteria.every(criterion => criterion.trim()));
  assert.equal(form.mainTask.ownerId, "");
  assert.equal(form.mainTask.startDate, "");
  assert.equal(form.mainTask.endDate, "");
});

test("复杂示例复用已有七项拆分、完成标准、人选和稳定依赖", () => {
  const form = formFor("complex-plan");
  const tasks = [form.mainTask, ...form.subtasks];
  assert.equal(form.subtasks.length, 7);
  assert.equal(new Set(tasks.map(task => task.clientId)).size, 8);
  assert.deepEqual(form.subtasks.map(task => task.ownerId), ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"]);
  for (const task of tasks) {
    assert.ok(task.completionCriteria.some(criterion => criterion.trim()));
    assert.equal(task.goal, form.mainTask.goal);
    assert.equal(task.endDate, "2026-09-15");
  }
  assert.deepEqual(form.subtasks[2].dependsOnClientIds, [0, 1, 3, 6].map(index => form.subtasks[index].clientId));
  assert.equal(hasValidCreationDependencies(form.subtasks), true);
  assert.equal(validateCreationForm(form, context.members), null);
});

test("相似与已有主任务先返回待确认关系，不直接进入审阅", () => {
  for (const id of ["similar-task", "existing-parent"] as const) {
    const result = planTaskCreation(promptFor(id), context);
    assert.equal(result.stage, "decision");
    if (result.stage !== "decision") return;
    assert.equal(result.form.decision, "pending");
    assert.equal(result.form.candidate?.id, id === "similar-task" ? "weekly-retro-notes" : "product-launch-planning");
    assert.match(validateCreationForm(result.form, context.members)!, /确认/);
  }
});

test("相似与主任务候选必须命中 fixture 明确 ID 或完整名称，不使用唯一无关任务兜底", () => {
  for (const id of ["similar-task", "existing-parent"] as const) {
    for (const existingTasks of [[], [{ id: "unrelated", name: "年度财务清算", goal: "清算应收款" }], [{ id: "fuzzy", name: "另一份团队复盘纪要" }]]) {
      const result = planTaskCreation(promptFor(id), { ...context, existingTasks });
      assert.equal(result.stage, "unavailable");
      if (result.stage === "unavailable") assert.match(result.message, /未找到|不存在/);
    }
  }
  const byName = planTaskCreation(promptFor("existing-parent"), {
    ...context,
    existingTasks: [{ id: "authorized-parent", title: "新品发布会筹备", goal: "按期举办发布会" }],
  });
  assert.equal(byName.stage, "decision");
  if (byName.stage === "decision") assert.equal(byName.form.candidate?.id, "authorized-parent");
});

test("没有职责证据时各场景负责人保持待定，不回填创建者或首位成员", () => {
  const unknownResponsibilities: ScenarioContext = { ...context, members: [{ id: "creator", name: "创建者" }], currentUserId: "creator" };
  for (const scenario of taskCreationScenarios) {
    const result = planTaskCreation(scenario.prompt, unknownResponsibilities, { answers: { goal: "让参与者了解活动", deliverable: "活动方案" } });
    assert.ok(result.stage === "review" || result.stage === "decision");
    assert.ok([result.form.mainTask, ...result.form.subtasks].every(task => task.ownerId === ""));
  }
});

test("没有期限事实的相似任务候选不自动设置今天，摘要不宣称真实查重已完成", () => {
  const result = planTaskCreation(promptFor("similar-task"), context);
  assert.equal(result.stage, "decision");
  if (result.stage !== "decision") return;
  assert.equal(result.form.mainTask.startDate, "");
  assert.equal(result.form.mainTask.endDate, "");
  assert.match(result.summary, /尚未创建/);
  assert.doesNotMatch(result.summary, /Mock|示例/);
  assert.match(result.summary, /未.*查重|查重.*未/);
  assert.doesNotMatch(result.summary, /已完成查重|没有重复|无重复任务/);
});

test("规划不修改成员或已有任务上下文", () => {
  const before = structuredClone(context);
  for (const scenario of taskCreationScenarios) planTaskCreation(scenario.prompt, context, { answers: { goal: "提升活动认知", deliverable: "活动方案" } });
  assert.deepEqual(context, before);
});

test("只有明确选择独立创建后才解除关系阻塞，不改已有任务或原候选", () => {
  for (const id of ["similar-task", "existing-parent"] as const) {
    const form = formFor(id);
    const before = structuredClone(form);
    const result = resolveCreationRelationship(form, "independent", context);
    assert.ok("form" in result);
    assert.equal(result.form.decision, "independent");
    assert.deepEqual(result.form.mainTask, form.mainTask);
    assert.deepEqual(result.form.subtasks, form.subtasks);
    assert.equal(validateCreationForm(result.form, context.members), null);
    assert.match(result.summary, /独立/);
    assert.deepEqual(form, before);
  }
});

test("确认关联通过投影使用最新主目标，独立底稿和 Stable IDs 保持不变", () => {
  const form = formFor("existing-parent");
  form.mainTask.ownerId = "林洁";
  form.mainTask.completionCriteria = ["人工确认的媒体名单及邀请状态表"];
  form.mainTask.startDate = "2026-09-01";
  form.mainTask.endDate = "2026-09-12";
  const before = structuredClone(form);
  const latestContext: ScenarioContext = {
    ...context,
    existingTasks: context.existingTasks!.map(task => task.id === form.candidate!.id ? { ...task, goal: "按期完成新版发布会" } : task),
  };
  const result = resolveCreationRelationship(form, "attach", latestContext);
  assert.ok("form" in result);
  assert.equal(result.form.decision, "attach");
  assert.equal(result.form.candidate?.goal, "按期完成新版发布会");
  assert.equal(toTaskPlanDraft(result.form).mainTask.goal, "按期完成新版发布会");
  assert.deepEqual(result.form.mainTask, form.mainTask);
  assert.deepEqual(form, before);
  assert.equal(validateCreationForm(result.form, context.members), null);
});

test("关联后改回独立创建仍保留媒体邀请自己的目标，不沿用整个发布会目标", () => {
  const form = formFor("existing-parent");
  form.mainTask.goal = "让媒体联系人和最终出席名单可核对，便于邀请跟进";
  const before = structuredClone(form);
  const attached = resolveCreationRelationship(form, "attach", context);
  assert.ok("form" in attached);
  assert.equal(toTaskPlanDraft(attached.form).mainTask.goal, form.candidate!.goal);
  const independent = resolveCreationRelationship(attached.form, "independent", context);
  assert.ok("form" in independent);
  assert.equal(independent.form.decision, "independent");
  assert.equal(toTaskPlanDraft(independent.form).mainTask.goal, before.mainTask.goal);
  assert.deepEqual(independent.form.mainTask, before.mainTask);
  assert.deepEqual(independent.form.subtasks, before.subtasks);
  assert.deepEqual(form, before);
});

test("相似任务不被当作主任务自动合并或关联", () => {
  const form = formFor("similar-task");
  const result = resolveCreationRelationship(form, "attach", context);
  assert.ok("error" in result);
  assert.match(result.error, /相似|主任务|关联/);
  assert.equal(form.decision, "pending");
});

test("候选丢失或换成同名新 ID 时，任何关系确认都报错且保留草稿", () => {
  for (const id of ["similar-task", "existing-parent"] as const) {
    const form = formFor(id);
    const before = structuredClone(form);
    for (const existingTasks of [[], [{ ...form.candidate!, id: "replacement" }]]) {
      for (const decision of ["attach", "independent"] as const) {
        const result = resolveCreationRelationship(form, decision, { ...context, existingTasks });
        assert.ok("error" in result);
        assert.deepEqual(form, before);
      }
    }
  }
});

test("主任务缺少目标时不能关联，也不能借用子任务原目标假装完成继承", () => {
  const form = formFor("existing-parent");
  const result = resolveCreationRelationship(form, "attach", {
    ...context, existingTasks: [{ ...form.candidate!, goal: " " }],
  });
  assert.ok("error" in result);
  assert.match(result.error, /目标/);
  assert.equal(form.decision, "pending");
});

test("关系确认检查最新成员列表，失效负责人或参与人不会静默清空", () => {
  for (const field of ["ownerId", "participantIds"] as const) {
    const form = formFor("existing-parent");
    if (field === "ownerId") form.mainTask.ownerId = "removed-member";
    else form.mainTask.participantIds = ["removed-member"];
    const result = resolveCreationRelationship(form, "independent", context);
    assert.ok("error" in result);
    assert.match(result.error, /成员|负责人|参与人/);
    assert.equal(form.decision, "pending");
  }
});

test("改名仅 patch 主任务，人工删除、重排、换人和日期不被旧模板重建", () => {
  const form = formFor("complex-plan");
  form.subtasks = form.subtasks.filter((_, index) => index !== 5).reverse();
  form.subtasks[0].title = "人工修改的审核交付";
  form.subtasks[0].ownerId = "";
  form.subtasks[0].completionCriteria = ["仅核对已提交的宣称清单"];
  form.subtasks[0].endDate = "2026-09-12";
  form.mainTask.executionTips = ["人工补充的操作提示"];
  form.mainTask.ownerId = "";
  const before = structuredClone(form);
  const result = reviseCreationPlan(form, "任务名称改为 新品首发协作计划", context);
  assert.ok("form" in result);
  assert.deepEqual(result.form, { ...form, mainTask: { ...form.mainTask, title: "新品首发协作计划" } });
  assert.deepEqual(form, before);
  assert.match(result.summary, /名称/);
  assert.ok(result.changes.length > 0);
});

test("目标修订同步子任务的继承目标，其他字段与依赖 ID 保持原样", () => {
  const form = formFor("complex-plan");
  const goal = "让首次参与的客户理解新品使用场景";
  const result = reviseCreationPlan(form, `目标改为 ${goal}`, context);
  assert.ok("form" in result);
  assert.equal(result.form.mainTask.goal, goal);
  assert.deepEqual(result.form.subtasks, form.subtasks.map(task => ({ ...task, goal })));
  assert.equal(result.form.mainTask.clientId, form.mainTask.clientId);
  assert.ok(result.changes.some(change => change.includes("目标")));
});

test("增加完成标准只追加一项，保留人工标准与所有子任务", () => {
  const form = formFor("complex-plan");
  form.mainTask.completionCriteria = ["人工确认的销售口径"];
  const result = reviseCreationPlan(form, "增加完成标准：素材必须通过审核，保留审核记录", context);
  assert.ok("form" in result);
  assert.deepEqual(result.form.mainTask.completionCriteria, ["人工确认的销售口径", "素材必须通过审核，保留审核记录"]);
  assert.deepEqual(result.form.subtasks, form.subtasks);
  assert.deepEqual(form.mainTask.completionCriteria, ["人工确认的销售口径"]);
});

test("负责人可按确切姓名或 ID 修改，也能显式待定，不重新分配子任务", () => {
  const latestContext: ScenarioContext = { ...context, members: [{ id: "member-1", name: "林洁" }, { id: "member-2", name: "周岚" }] };
  const form = formFor("single-task", latestContext);
  for (const instruction of ["负责人改为 林洁", "负责人改为 member-1"]) {
    const result = reviseCreationPlan(form, instruction, latestContext);
    assert.ok("form" in result);
    assert.deepEqual(result.form.mainTask, { ...form.mainTask, ownerId: "member-1" });
    assert.deepEqual(result.form.subtasks, form.subtasks);
  }
  form.mainTask.ownerId = "member-1";
  const unassigned = reviseCreationPlan(form, "负责人改为待定", latestContext);
  assert.ok("form" in unassigned);
  assert.equal(unassigned.form.mainTask.ownerId, "");
});

test("设参与人为负责人时只从主任务参与人移除该成员，预览说明这项衍生去重", () => {
  const form = formFor("complex-plan");
  form.mainTask.participantIds = ["陈默", "林洁", "许宁"];
  const before = structuredClone(form);
  const result = reviseCreationPlan(form, "负责人改为林洁", context);
  assert.ok("form" in result);
  assert.deepEqual(result.form.mainTask, { ...form.mainTask, ownerId: "林洁", participantIds: ["陈默", "许宁"] });
  assert.deepEqual(result.form.subtasks, before.subtasks);
  assert.deepEqual(form, before);
  assert.equal(result.changes.length, 2);
  assert.ok(result.changes.some(change => change.includes("负责人") && change.includes("周岚") && change.includes("林洁")));
  assert.ok(result.changes.some(change => change.includes("参与人") && change.includes("林洁") && /移除|去重/.test(change)));
});

test("负责人本身未变但仍列为参与人时只预览并移除这个重复 ID", () => {
  const form = formFor("single-task");
  form.mainTask.ownerId = "林洁";
  form.mainTask.participantIds = ["陈默", "林洁", "许宁"];
  const result = reviseCreationPlan(form, "负责人改为林洁", context);
  assert.ok("form" in result);
  assert.equal(result.form.mainTask.ownerId, "林洁");
  assert.deepEqual(result.form.mainTask.participantIds, ["陈默", "许宁"]);
  assert.equal(result.changes.length, 1);
  assert.match(result.changes[0], /参与人/);
  assert.match(result.changes[0], /林洁/);
});

test("负责人改为待定不会清空其他参与人或回填原负责人", () => {
  const form = formFor("complex-plan");
  const result = reviseCreationPlan(form, "负责人改为待定", context);
  assert.ok("form" in result);
  assert.equal(result.form.mainTask.ownerId, "");
  assert.deepEqual(result.form.mainTask.participantIds, form.mainTask.participantIds);
  assert.deepEqual(result.form.subtasks, form.subtasks);
  assert.equal(result.changes.length, 1);
  assert.ok(!result.changes[0].includes("参与人"));
});

test("未知、模糊与同名多人的负责人指令报错，不猜成员", () => {
  const form = formFor("single-task");
  for (const instruction of ["负责人改为 林", "负责人改为 不存在的人", "负责人改为 林洁或陈默"]) {
    const result = reviseCreationPlan(form, instruction, context);
    assert.ok("error" in result);
    assert.equal(form.mainTask.ownerId, "");
  }
  const ambiguous = reviseCreationPlan(form, "负责人改为 林洁", {
    ...context, members: [{ id: "first", name: "林洁" }, { id: "second", name: "林洁" }],
  });
  assert.ok("error" in ambiguous);
  assert.match(ambiguous.error, /同名|唯一|明确|多个/);
});

test("截止时间只改主任务日期，待定可清空，不隐式改变开始日期或子任务排期", () => {
  const form = formFor("complex-plan");
  for (const [instruction, endDate] of [["截止时间改为 2026-09-20", "2026-09-20"], ["截止时间改为待定", ""]]) {
    const result = reviseCreationPlan(form, instruction, context);
    assert.ok("form" in result);
    assert.deepEqual(result.form.mainTask, { ...form.mainTask, endDate });
    assert.deepEqual(result.form.subtasks, form.subtasks);
  }
});

test("无效日期、模糊相对日期和开始晚于截止的修改原子失败", () => {
  const form = formFor("single-task");
  form.mainTask.startDate = "2026-09-01";
  const before = structuredClone(form);
  for (const value of ["2026-02-30", "2026-13-01", "2026-9-20", "明天", "2026-08-30"]) {
    const result = reviseCreationPlan(form, `截止时间改为 ${value}`, context);
    assert.ok("error" in result);
    assert.match(result.error, /日期|时间|截止/);
    assert.deepEqual(form, before);
  }
});

test("主任务截止早于已保留子任务交付时提示冲突，不自动重排子任务", () => {
  const form = formFor("complex-plan");
  const result = reviseCreationPlan(form, "截止时间改为 2026-09-10", context);
  assert.ok("error" in result);
  assert.match(result.error, /子任务|排期|截止/);
  assert.equal(form.mainTask.endDate, "2026-09-15");
});

test("不支持的组合和分工指令整句拒绝，不局部执行首个可识别操作", () => {
  const form = formFor("complex-plan");
  const before = structuredClone(form);
  for (const instruction of [
    "把项目拆成三个子任务，分别给林洁和陈默",
    "负责人改为 林洁；截止时间改为 2026-09-20",
    "目标改为 提高转化，任务名称改为 活动方案",
    "任务名称改为 新方案\n负责人改为 林洁",
    "任务名称改为 新方案，同时拆分三个子任务",
    "先帮我任务名称改为 新方案",
    "任务名称改为 ",
    "增加完成标准： ",
  ]) {
    const result = reviseCreationPlan(form, instruction, context);
    assert.ok("error" in result, instruction);
    assert.match(result.error, /Mock|示例|仅支持|格式|空/);
    assert.deepEqual(form, before);
  }
});

test("关系尚未确认时不能用修订绕过决策；关联方案不能改写已有父目标", () => {
  const pending = formFor("existing-parent");
  const premature = reviseCreationPlan(pending, "任务名称改为 新名单", context);
  assert.ok("error" in premature);
  assert.match(premature.error, /关系|确认/);
  const attached = resolveCreationRelationship(pending, "attach", context);
  assert.ok("form" in attached);
  const result = reviseCreationPlan(attached.form, "目标改为 替换主目标", context);
  assert.ok("error" in result);
  assert.match(result.error, /继承|主任务/);
});

test("修订时重新校验当前成员；修正失效主负责人不被旧值阻塞", () => {
  const form = formFor("single-task");
  form.mainTask.ownerId = "former-member";
  assert.ok("error" in reviseCreationPlan(form, "任务名称改为 新纪要", context));
  const corrected = reviseCreationPlan(form, "负责人改为 林洁", context);
  assert.ok("form" in corrected);
  assert.equal(corrected.form.mainTask.ownerId, "林洁");
  assert.equal(form.mainTask.ownerId, "former-member");
});

test("相同内容的修订不伪报变化，也不创建任务", () => {
  const form = formFor("single-task");
  const result = reviseCreationPlan(form, `任务名称改为 ${form.mainTask.title}`, context);
  assert.ok("form" in result);
  assert.deepEqual(result.form, form);
  assert.deepEqual(result.changes, []);
  assert.match(result.summary, /未变化|没有变化|保持/);
});

test("单字段指令中夹带无标点的分工请求仍整句拒绝", () => {
  const form = formFor("single-task");
  for (const instruction of [
    "任务名称改为 新方案并拆分三个子任务",
    "目标改为 提高转化，并将任务分配给林洁",
    "任务名称改为 新纪要，负责人改成 林洁",
  ]) {
    const result = reviseCreationPlan(form, instruction, context);
    assert.ok("error" in result, instruction);
    assert.match(result.error, /仅支持|Mock/);
  }
});

test("澄清中的标点、占位文本不能冒充真实目标或交付", () => {
  for (const value of ["？", "...", "不清楚", "还没想好"]) {
    const result = planTaskCreation(promptFor("clarify-requirement"), context, { answers: { goal: value, deliverable: value } });
    assert.equal(result.stage, "clarify", value);
  }
});

test("复杂示例没有有效当前日期时保留原文并说明不可规划，不抛异常或猜年份", () => {
  for (const currentDate of ["", "invalid", "2026-02-30"]) {
    const result = planTaskCreation(promptFor("complex-plan"), { ...context, currentDate });
    assert.equal(result.stage, "unavailable");
    if (result.stage === "unavailable") assert.match(result.message, /日期|时间/);
  }
});

test("同名候选有多个且无 fixture ID 时不擅自挑选，fixture ID 仍可确定唯一对象", () => {
  const sameName = [
    { id: "first", name: "新品发布会筹备", goal: "首场发布会" },
    { id: "second", name: "新品发布会筹备", goal: "另一场发布会" },
  ];
  assert.equal(planTaskCreation(promptFor("existing-parent"), { ...context, existingTasks: sameName }).stage, "unavailable");
  const selected = planTaskCreation(promptFor("existing-parent"), {
    ...context, existingTasks: [...sameName, { id: "product-launch-planning", name: "重命名后的任务", goal: "目标" }],
  });
  assert.equal(selected.stage, "decision");
  if (selected.stage === "decision") assert.equal(selected.form.candidate?.id, "product-launch-planning");
});

test("修订预览明确展示原值、新值或完整新增标准", () => {
  const form = formFor("single-task");
  const renamed = reviseCreationPlan(form, "任务名称改为 新纪要", context);
  assert.ok("form" in renamed);
  assert.ok(renamed.changes.some(change => change.includes(form.mainTask.title) && change.includes("新纪要") && change.includes("→")));
  const standard = "明确标记下周待办的负责人";
  const extended = reviseCreationPlan(form, `增加完成标准：${standard}`, context);
  assert.ok("form" in extended);
  assert.ok(extended.changes.some(change => change.includes(standard)));
});

test("确认关联后父目标变更或候选移出当前上下文会使旧修订失效", () => {
  const attached = resolveCreationRelationship(formFor("existing-parent"), "attach", context);
  assert.ok("form" in attached);
  for (const existingTasks of [[], [{ ...attached.form.candidate!, goal: "新的主任务目标" }]]) {
    const result = reviseCreationPlan(attached.form, "任务名称改为 新媒体名单", { ...context, existingTasks });
    assert.ok("error" in result);
    assert.match(result.error, /已有|目标|关系/);
  }
});

test("临近或超过示例硬截止时暴露排期冲突，不自动把 9 月 15 日推到下一年", () => {
  for (const currentDate of ["2026-09-14", "2026-09-20"]) {
    const result = planTaskCreation(promptFor("complex-plan"), { ...context, currentDate });
    assert.equal(result.stage, "unavailable");
    if (result.stage === "unavailable") assert.match(result.message, /截止|排期|日期/);
  }
});

test("已有媒体邀请子任务时关系说明提示核对，不断言交付尚未覆盖", () => {
  const parent = context.existingTasks!.find(task => task.id === "product-launch-planning")!;
  const childTaskNames = ["UI 验证 · 媒体邀请名单"];
  const result = planTaskCreation(promptFor("existing-parent"), {
    ...context, existingTasks: [{ ...parent, childTaskNames }],
  });
  assert.equal(result.stage, "decision");
  if (result.stage !== "decision") return;
  assert.deepEqual(result.form.candidate?.childTaskNames, childTaskNames);
  const reason = result.form.candidateReason ?? "";
  assert.match(reason, /^建议：/);
  assert.doesNotMatch(reason, /关联建议/);
  assert.match(reason, /核对.*已有子任务/);
  assert.doesNotMatch(reason, /尚未覆盖|未覆盖|未发现重复|查重已完成/);
});

test("相似任务说明发现范围与具体重合点，不只提示用户自行查重", () => {
  const result = planTaskCreation(promptFor("similar-task"), context);
  assert.equal(result.stage, "decision");
  if (result.stage !== "decision") return;
  const reason = result.form.candidateReason ?? "";
  assert.match(reason, /在你负责或参与的任务中发现了这个任务/);
  assert.match(reason, /复盘/);
  assert.match(reason, /关键决定|关键结果/);
  assert.match(reason, /问题/);
  assert.match(reason, /后续行动/);
  assert.match(reason, /共享/);
  assert.match(reason, /核对.*同一项工作/);
  assert.doesNotMatch(reason, /已完成查重|确定重复/);
});

test("相似候选改名后仍明确仅供核对，不冒充真实语义查重结论", () => {
  const name = "UI 验证 · 月度财务对账";
  const result = planTaskCreation(promptFor("similar-task"), {
    ...context, existingTasks: [{ id: "weekly-retro-notes", name, goal: "核对月度账单与付款记录" }],
  });
  assert.equal(result.stage, "decision");
  if (result.stage !== "decision") return;
  assert.equal(result.form.candidate?.name, name);
  const reason = result.form.candidateReason ?? "";
  assert.match(reason, /现有名称和目标不足以说明重合/);
  assert.doesNotMatch(reason, /Mock|示例/);
  assert.match(reason, /确认|核对/);
  assert.doesNotMatch(reason, /高度相似|已完成查重|两项任务都需要汇总/);
});

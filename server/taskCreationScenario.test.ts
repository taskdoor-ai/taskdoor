import assert from "node:assert/strict";
import test from "node:test";

import { creatorCommerceMembers, creatorCommercePrompt, creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { advanceTaskCreationScenario, startTaskCreationScenario } from "../src/lib/taskCreationScenario.ts";

const scenarioContext = {
  currentDate: "2026-08-28",
  currentUserId: "周岚",
  members: creatorCommerceMembers,
  tags: creatorCommerceTags.map(({ name }) => name),
};

const workspaceTaskCandidates = workspaceNodes
  .filter((node): node is TaskNode => node.kind === "task")
  .map(({ id, name, ownerId, status, goal, dueAt, labels, parentTaskId, plannedStartOn, plannedEndOn }) => ({
    id, name, ownerId, status, goal, dueAt, labels, parentTaskId, plannedStartOn, plannedEndOn,
    childTaskNames: workspaceNodes
      .filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === id)
      .map((node) => node.name),
  }));

const getDraft = (transition: ReturnType<typeof startTaskCreationScenario>) => {
  assert.equal(transition.type, "draft");
  if (transition.type !== "draft") throw new Error("expected draft");
  return transition.draft;
};

const assertDraftUsesContextCandidates = (draft: ReturnType<typeof getDraft>) => {
  for (const task of [draft.mainTask, ...draft.subtasks]) {
    assert.ok(!task.ownerId || scenarioContext.members.some(({ id }) => id === task.ownerId), `invalid owner: ${task.ownerId}`);
    assert.ok(task.labels.every((label) => scenarioContext.tags.includes(label)), `invalid labels: ${task.labels.join(",")}`);
  }
};

test("代表性任务创建入口使用唯一 ID 并保持约定顺序", () => {
  assert.equal(taskCreationScenarios.length, 6);
  assert.deepEqual(
    taskCreationScenarios.map(({ id, label, prompt }) => ({ id, label, prompt })),
    [
      { id: "single-task", label: "单任务 · 无子任务", prompt: "整理下周例会纪要" },
      { id: "complex-plan", label: "复杂项目 · 共 8 个任务", prompt: creatorCommercePrompt },
      { id: "clarify-requirement", label: "需求不明确 · 引导创建", prompt: "帮我策划一个活动" },
      { id: "similar-task", label: "发现相似任务 · 创建前确认", prompt: "整理新品发布复盘" },
      { id: "existing-parent", label: "关联已有任务 · 创建子任务", prompt: "准备新品发布会的媒体邀请名单" },
      { id: "unassigned-owner", label: "未找到合适负责人 · 邀请成员", prompt: "完成办公室无线网络部署" },
    ],
  );
  assert.equal(new Set(taskCreationScenarios.map(({ id }) => id)).size, taskCreationScenarios.length);
});

test("状态机导出的用户可见文案不泄漏内部状态字符串", () => {
  const existingTasks = [
    { id: "similar", title: "整理新品发布复盘" },
    { id: "parent", title: "新品发布会筹备", endDate: "2026-09-20" },
  ];
  const context = { ...scenarioContext, existingTasks };
  const visibleText = [
    ...taskCreationScenarios.flatMap(({ label, prompt }) => [label, prompt]),
    startTaskCreationScenario("single-task", context).message,
    startTaskCreationScenario("complex-plan", context).message,
  ];

  let clarify = startTaskCreationScenario("clarify-requirement", context);
  visibleText.push(clarify.message, ...(clarify.type === "question" ? clarify.choices.flatMap(({ title, description }) => [title, description ?? ""]) : []));
  clarify = advanceTaskCreationScenario(clarify.session, "awareness", context);
  visibleText.push(clarify.message, ...(clarify.type === "question" ? clarify.choices.flatMap(({ title, description }) => [title, description ?? ""]) : []));
  clarify = advanceTaskCreationScenario(clarify.session, "end-of-month", context);
  visibleText.push(clarify.message, ...(clarify.type === "question" ? clarify.choices.flatMap(({ title, description }) => [title, description ?? ""]) : []));
  const custom = advanceTaskCreationScenario(clarify.session, "custom", context);
  visibleText.push(custom.message);

  for (const scenarioId of ["similar-task", "existing-parent"] as const) {
    const transition = startTaskCreationScenario(scenarioId, context);
    visibleText.push(transition.message, ...(transition.type === "decision" ? transition.choices.flatMap(({ title, description }) => [title, description ?? ""]) : []));
  }

  const renderedCopy = visibleText.join("\n");
  for (const internalStatus of ["awaiting-clarification", "awaiting-decision", "draft-ready"]) {
    assert.equal(renderedCopy.includes(internalStatus), false, `用户可见文案泄漏内部状态：${internalStatus}`);
  }
});

test("直接场景生成完整且受上下文约束的草案", () => {
  const single = getDraft(startTaskCreationScenario("single-task", scenarioContext));
  assert.deepEqual(single.mainTask, {
    title: "整理下周例会纪要",
    goal: "汇总会议议题、关键结论、责任人和后续行动，形成可直接共享的会议纪要。",
    ownerId: "", participantIds: [], labels: ["内容制作"], startDate: "", endDate: "",
  });
  assert.equal(single.subtasks.length, 0);

  const complex = getDraft(startTaskCreationScenario("complex-plan", scenarioContext));
  assert.equal(complex.mainTask.title, "新品防晒衣抖音达人带货项目");
  assert.equal(complex.subtasks.length, 7);
  assert.deepEqual(complex.subtasks.map(({ ownerId }) => ownerId), ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"]);
  assertDraftUsesContextCandidates(complex);
  assert.deepEqual(complex.dependencies, [
    { subtaskIndex: 2, dependsOnSubtaskIndexes: [0, 1, 3, 6] },
    { subtaskIndex: 4, dependsOnSubtaskIndexes: [0, 1] },
    { subtaskIndex: 5, dependsOnSubtaskIndexes: [2, 4] },
    { subtaskIndex: 6, dependsOnSubtaskIndexes: [0, 1] },
  ]);
});

test("相似与父任务场景从真实工作区上下文解析稳定候选", () => {
  const existingTasks = [...workspaceTaskCandidates].reverse();
  const similar = startTaskCreationScenario("similar-task", { ...scenarioContext, existingTasks });
  assert.equal(similar.session.decisionCandidateId, "weekly-retro-notes");
  assert.equal(similar.type === "decision" ? similar.candidate?.id : "", "weekly-retro-notes");
  assert.equal(similar.type === "decision" ? similar.candidate?.status : "", "进行中");
  assert.match(similar.message, /相似的任务/);
  assert.doesNotMatch(similar.message, /任务：|负责人：|相似原因/);
  assert.equal("reason" in similar, true);
  if ("reason" in similar) assert.match(String(similar.reason), /复盘.*后续行动/);
  const similarCandidate = existingTasks.find(({ id }) => id === similar.session.decisionCandidateId);
  assert.equal(similarCandidate?.status, "进行中");

  const parent = startTaskCreationScenario("existing-parent", { ...scenarioContext, existingTasks });
  assert.equal(parent.session.decisionCandidateId, "product-launch-planning");
  assert.deepEqual(parent.type === "decision" ? parent.candidate?.childTaskNames : [], ["场地确认", "发布会流程设计", "宣传物料制作"]);
  assert.match(parent.message, /已有任务|父任务/);
  assert.doesNotMatch(parent.message, /任务：|负责人：|匹配原因/);
  assert.equal("reason" in parent, true);
  if ("reason" in parent) assert.match(String(parent.reason), /媒体邀请.*尚未覆盖/);
  const parentCandidate = existingTasks.find(({ id }) => id === parent.session.decisionCandidateId);
  assert.deepEqual(parentCandidate?.childTaskNames, ["场地确认", "发布会流程设计", "宣传物料制作"]);
});

test("澄清默认路径和暂不确定路径生成完整草案", () => {
  const finish = (time: string) => {
    let transition = startTaskCreationScenario("clarify-requirement", scenarioContext);
    transition = advanceTaskCreationScenario(transition.session, "awareness", scenarioContext);
    transition = advanceTaskCreationScenario(transition.session, time, scenarioContext);
    transition = advanceTaskCreationScenario(transition.session, "plan-materials-review", scenarioContext);
    assert.equal(transition.type, "draft");
    if (transition.type !== "draft") throw new Error("expected draft");
    return transition.draft;
  };
  const known = finish("end-of-month");
  assert.equal(known.mainTask.title, "完成新品曝光活动策划与执行");
  assert.match(known.mainTask.goal, /本月底.*方案.*传播物料.*复盘/);
  assert.equal(known.mainTask.startDate, "2026-08-28");
  assert.equal(known.mainTask.endDate, "2026-08-31");
  assertDraftUsesContextCandidates(known);
  const uncertain = finish("uncertain");
  assert.equal(uncertain.mainTask.startDate, "");
  assert.equal(uncertain.mainTask.endDate, "");
});

test("独立创建决策生成设计约定的零子任务草案", () => {
  const similarStarted = startTaskCreationScenario("similar-task", { ...scenarioContext, existingTasks: [{ id: "similar", title: "已有复盘" }] });
  const similar = advanceTaskCreationScenario(similarStarted.session, "create-anyway", scenarioContext);
  assert.equal(similar.type, "draft");
  if (similar.type !== "draft") throw new Error("expected draft");
  assert.equal(similar.draft.mainTask.title, "整理新品发布复盘");
  assert.equal(similar.draft.mainTask.goal, "汇总新品发布结果、关键数据、问题和后续行动，形成可共享的专项复盘。");
  assert.equal(similar.draft.subtasks.length, 0);

  const parentCandidate = { id: "parent", title: "新品发布会筹备", endDate: "2026-09-20" };
  const parentContext = { ...scenarioContext, existingTasks: [parentCandidate] };
  const parentStarted = startTaskCreationScenario("existing-parent", parentContext);
  const parent = advanceTaskCreationScenario(parentStarted.session, "create-independent", parentContext);
  assert.equal(parent.type, "draft");
  if (parent.type !== "draft") throw new Error("expected draft");
  assert.equal(parent.draft.mainTask.title, "整理并确认媒体邀请名单");
  assert.equal(parent.draft.mainTask.goal, "完成目标媒体筛选、联系人核对、邀请状态跟进，并在发布会前确认最终出席名单。");
  assert.equal(parent.draft.mainTask.startDate, "");
  assert.equal(parent.draft.mainTask.endDate, "");
  assert.equal(parent.draft.subtasks.length, 0);
  for (const draft of [similar.draft, parent.draft]) {
    assert.ok(!draft.mainTask.ownerId || scenarioContext.members.some((member) => member.id === draft.mainTask.ownerId));
    assert.ok(draft.mainTask.labels.every((label) => scenarioContext.tags.includes(label)));
  }
});

test("没有责任证据时保留未分配，不回填创建者或首位成员", () => {
  const transition = startTaskCreationScenario("single-task", {
    ...scenarioContext,
    members: [{ id: "周岚", name: "周岚", dynamicResponsibility: "数据库备份与恢复" }],
  });
  const result = getDraft(transition);
  assert.equal(result.mainTask.ownerId, "");
});

test("澄清场景依次询问目标、时间和交付物后生成草案", () => {
  let transition = startTaskCreationScenario("clarify-requirement", scenarioContext);
  assert.equal(transition.type, "question");
  assert.deepEqual(transition.type === "question" ? transition.choices.map(({ id }) => id) : [], ["awareness", "leads", "retention"]);

  transition = advanceTaskCreationScenario(transition.session, "awareness", scenarioContext);
  assert.equal(transition.type, "question");
  assert.equal(transition.type === "question" ? transition.field : "", "time");

  transition = advanceTaskCreationScenario(transition.session, "end-of-month", scenarioContext);
  assert.equal(transition.type, "question");
  assert.equal(transition.type === "question" ? transition.field : "", "deliverable");

  transition = advanceTaskCreationScenario(transition.session, "plan-materials-review", scenarioContext);
  assert.equal(transition.type, "draft");
  assert.equal(transition.type === "draft" ? transition.draft.mainTask.title : "", "完成新品曝光活动策划与执行");
});

test("澄清问题既接受选择卡也接受自由输入", () => {
  const started = startTaskCreationScenario("clarify-requirement", scenarioContext);
  const chosen = advanceTaskCreationScenario(started.session, "awareness", scenarioContext);
  assert.equal(chosen.session.answers.goal, "提升新品曝光");

  const typed = advanceTaskCreationScenario(started.session, "让校园用户了解新品", scenarioContext);
  assert.equal(typed.type === "question" ? typed.field : "", "time");
  assert.equal(typed.session.answers.goal, "让校园用户了解新品");
  assert.deepEqual(typed.session.freeformAnswers, ["让校园用户了解新品"]);
});

test("选择自定义交付物后保持等待，直到用户补充自由文本才生成草案", () => {
  let transition = startTaskCreationScenario("clarify-requirement", scenarioContext);
  transition = advanceTaskCreationScenario(transition.session, "awareness", scenarioContext);
  transition = advanceTaskCreationScenario(transition.session, "end-of-month", scenarioContext);
  transition = advanceTaskCreationScenario(transition.session, "custom", scenarioContext);

  assert.equal(transition.type, "question");
  assert.equal(transition.type === "question" && transition.field, "deliverable");
  assert.deepEqual(transition.type === "question" && transition.choices, []);
  assert.equal(transition.session.answers.deliverable, undefined);
  assert.match(transition.message, /输入框.*交付/);

  transition = advanceTaskCreationScenario(transition.session, "活动方案、报名页和复盘报告", scenarioContext);
  assert.equal(transition.type, "draft");
  assert.equal(transition.session.answers.deliverable, "活动方案、报名页和复盘报告");
});

test("相似任务只能查看已有任务或继续独立创建", () => {
  const candidate = { id: "similar-1", title: "整理本周团队复盘纪要" };
  const started = startTaskCreationScenario("similar-task", { ...scenarioContext, existingTasks: [candidate] });
  assert.equal(started.type, "decision");
  assert.deepEqual(started.type === "decision" ? started.choices.map(({ id }) => id) : [], ["view-existing", "create-anyway"]);
  const viewed = advanceTaskCreationScenario(started.session, "view-existing", { ...scenarioContext, existingTasks: [candidate] });
  assert.deepEqual(viewed.type === "open-existing" ? viewed.task : null, candidate);
  assert.equal(advanceTaskCreationScenario(started.session, "create-anyway", { ...scenarioContext, existingTasks: [candidate] }).type, "draft");
});

test("父任务场景只能创建子任务或独立创建", () => {
  const candidate = {
    id: "parent-1",
    title: "新品发布会筹备",
    plannedStartOn: "2026-08-30",
    plannedEndOn: "2026-09-20",
    labels: ["高优先级", "内容制作", "已删除标签"],
  };
  const started = startTaskCreationScenario("existing-parent", { ...scenarioContext, existingTasks: [candidate] });
  assert.equal(started.type, "decision");
  assert.deepEqual(started.type === "decision" ? started.choices.map(({ id }) => id) : [], ["create-subtask", "create-independent"]);
  const nested = advanceTaskCreationScenario(started.session, "create-subtask", { ...scenarioContext, existingTasks: [candidate] });
  assert.equal(nested.type, "create-subtask");
  assert.equal(nested.type === "create-subtask" ? nested.parentTask.id : "", candidate.id);
  assert.deepEqual(nested.type === "create-subtask" ? {
    startDate: nested.draft.mainTask.startDate,
    endDate: nested.draft.mainTask.endDate,
    labels: nested.draft.mainTask.labels,
  } : null, {
    startDate: "2026-08-30",
    endDate: "2026-09-20",
    labels: ["高优先级", "内容制作"],
  });
  const independent = advanceTaskCreationScenario(started.session, "create-independent", { ...scenarioContext, existingTasks: [candidate] });
  assert.equal(independent.type, "draft");
  assert.deepEqual(independent.type === "draft" ? {
    startDate: independent.draft.mainTask.startDate,
    endDate: independent.draft.mainTask.endDate,
  } : null, { startDate: "", endDate: "" });
});

test("自由输入会被保留，无法归类时只重问尚未解决的字段", () => {
  const started = startTaskCreationScenario("clarify-requirement", scenarioContext);
  const goal = advanceTaskCreationScenario(started.session, "让更多大学生认识新品", scenarioContext);
  assert.equal(goal.session.answers.goal, "让更多大学生认识新品");
  const retry = advanceTaskCreationScenario(goal.session, "看情况再说", scenarioContext);
  assert.equal(retry.type, "question");
  assert.equal(retry.type === "question" ? retry.field : "", "time");
  assert.deepEqual(retry.session.freeformAnswers, ["让更多大学生认识新品", "看情况再说"]);
  assert.equal(retry.session.answers.goal, "让更多大学生认识新品");
});

test("候选任务缺失时决策动作降级为独立创建草案", () => {
  const similar = startTaskCreationScenario("similar-task", { ...scenarioContext, existingTasks: [{ id: "gone-similar", title: "旧相似任务" }] });
  const similarFallback = advanceTaskCreationScenario(similar.session, "view-existing", { ...scenarioContext, existingTasks: [] });
  assert.equal(similarFallback.type, "draft");
  assert.match(similarFallback.message, /数据已变化|独立创建/);

  const parent = startTaskCreationScenario("existing-parent", { ...scenarioContext, existingTasks: [{ id: "gone-parent", title: "旧父任务", endDate: "2026-09-20" }] });
  const parentFallback = advanceTaskCreationScenario(parent.session, "create-subtask", { ...scenarioContext, existingTasks: [] });
  assert.equal(parentFallback.type, "draft");
  assert.match(parentFallback.message, /数据已变化|独立创建/);
  assert.equal(parentFallback.type === "draft" ? parentFallback.draft.mainTask.startDate : "unexpected", "");
  assert.equal(parentFallback.type === "draft" ? parentFallback.draft.mainTask.endDate : "unexpected", "");
});

test("决策场景启动时没有真实候选会直接准备独立任务草案", () => {
  for (const scenarioId of ["similar-task", "existing-parent"] as const) {
    const transition = startTaskCreationScenario(scenarioId, { ...scenarioContext, existingTasks: [] });
    assert.equal(transition.type, "draft");
    assert.match(transition.message, /任务数据已变化|未找到.*独立任务|独立创建/);
    assert.equal("choices" in transition, false);
  }
});

test("决策动作按首次展示的候选 ID 在最新上下文中解析", () => {
  const similarCandidate = { id: "similar-target", title: "最初展示的相似任务" };
  const otherCandidate = { id: "other", title: "后来插入的任务" };
  const similar = startTaskCreationScenario("similar-task", { ...scenarioContext, existingTasks: [similarCandidate] });
  assert.equal(similar.session.decisionCandidateId, similarCandidate.id);
  const opened = advanceTaskCreationScenario(similar.session, "view-existing", { ...scenarioContext, existingTasks: [otherCandidate, similarCandidate] });
  assert.equal(opened.type === "open-existing" ? opened.task.id : "", similarCandidate.id);

  const parentCandidate = { id: "parent-target", title: "最初展示的父任务" };
  const parent = startTaskCreationScenario("existing-parent", { ...scenarioContext, existingTasks: [parentCandidate] });
  assert.equal(parent.session.decisionCandidateId, parentCandidate.id);
  const nested = advanceTaskCreationScenario(parent.session, "create-subtask", { ...scenarioContext, existingTasks: [otherCandidate, parentCandidate] });
  assert.equal(nested.type === "create-subtask" ? nested.parentTask.id : "", parentCandidate.id);
});

test("明确的自由输入时间会推进，模糊时间只重问当前字段", () => {
  for (const timeAnswer of ["两小时后", "3 天后", "月底前", "下周五"]) {
    const started = startTaskCreationScenario("clarify-requirement", scenarioContext);
    const goal = advanceTaskCreationScenario(started.session, "awareness", scenarioContext);
    const time = advanceTaskCreationScenario(goal.session, timeAnswer, scenarioContext);
    assert.equal(time.type === "question" ? time.field : "", "deliverable", timeAnswer);
    assert.equal(time.session.answers.time, timeAnswer);
  }

  const started = startTaskCreationScenario("clarify-requirement", scenarioContext);
  const goal = advanceTaskCreationScenario(started.session, "awareness", scenarioContext);
  const vague = advanceTaskCreationScenario(goal.session, "到时候看情况", scenarioContext);
  assert.equal(vague.type === "question" ? vague.field : "", "time");
});

test("已完成的 decision session 重复提交只返回无副作用终态", () => {
  const candidate = { id: "similar-target", title: "相似任务" };
  const started = startTaskCreationScenario("similar-task", { ...scenarioContext, existingTasks: [candidate] });
  const opened = advanceTaskCreationScenario(started.session, "view-existing", { ...scenarioContext, existingTasks: [candidate] });
  assert.equal(opened.session.status, "completed");
  const repeated = advanceTaskCreationScenario(opened.session, "create-anyway", { ...scenarioContext, existingTasks: [] });
  assert.equal(repeated.type, "completed");
  assert.equal(repeated.session.resolvedAnswer, "view-existing");

  const parent = { id: "parent-target", title: "父任务" };
  const parentStarted = startTaskCreationScenario("existing-parent", { ...scenarioContext, existingTasks: [parent] });
  const nested = advanceTaskCreationScenario(parentStarted.session, "create-subtask", { ...scenarioContext, existingTasks: [parent] });
  assert.equal(nested.type, "create-subtask");
  const missing = advanceTaskCreationScenario(nested.session, "create-independent", { ...scenarioContext, existingTasks: [] });
  const restored = advanceTaskCreationScenario(nested.session, "create-independent", { ...scenarioContext, existingTasks: [parent] });
  assert.equal(missing.type, "completed");
  assert.equal(restored.type, "completed");
  assert.equal(missing.session.resolvedAnswer, "create-subtask");
  assert.equal(restored.session.resolvedAnswer, "create-subtask");
});

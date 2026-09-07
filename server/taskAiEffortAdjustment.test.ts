import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode, WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { applyDraftTaskAiAdjustment, applySavedTaskAiAdjustment, createDraftTaskAiContext, createSavedTaskAiContext } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { buildTaskAiAdjustment, getTaskAiContextSignature } from "../src/lib/taskAiAdjustment.ts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentScope } from "../src/lib/taskAiAdjustmentTypes.ts";
import { newCreationTask, type CreationForm } from "../src/lib/taskCreationForm.ts";
import { getEffortScopeKey, getTaskEffortState } from "../src/lib/taskEffort.ts";

const members = [{ id: "self", name: "我" }];
const effort = () => ({ minutes: 60, workMethod: "AI 整理材料，人工核对", basis: "manual" as const, reason: "整理半小时、核对半小时", confirmed: true, scopeKey: "original-scope", version: 1 });
const form = (): CreationForm => ({
  request: "整理会议纪要", decision: "independent", subtasks: [],
  mainTask: Object.assign(newCreationTask({ title: "整理会议纪要", goal: "对齐后续行动", completionCriteria: ["纪要与参会人核对"], executionTips: ["先核对结论"], ownerId: "self", participantIds: [], labels: [], startDate: "", endDate: "" }), { effortEstimate: effort() }),
});
const nodes = (): WorkspaceNode[] => [{ id: "task", kind: "task", parentId: null, name: "整理会议纪要", goal: "对齐后续行动", completionCriteria: ["纪要与参会人核对"], executionTips: ["先核对结论"], ownerId: "self", status: "待开始", updatedAt: "昨天", effortEstimate: effort() }];
const proposal = (context: TaskAiAdjustmentContext, instruction: string, scope: TaskAiAdjustmentScope = { kind: "task" }) => {
  const result = buildTaskAiAdjustment(context, scope, instruction);
  assert.ok("proposal" in result, "error" in result ? result.error : "expected proposal");
  return result.proposal;
};

test("人天投入候选按八人时换算，显示人天且保留未确认状态", () => {
  const context = createDraftTaskAiContext(form(), members, "self");
  const planned = proposal(context, "预计投入改为5人天");
  assert.equal(planned.updates[0].patch.effortEstimate!.minutes, 2400);
  assert.equal(planned.updates[0].patch.effortEstimate!.confirmed, false);
  assert.match(planned.changes[0].after!, /5 人天/);
});

test("草稿 AI 上下文保留完整估算快照，估算变化使旧候选签名失效", () => {
  const base = form();
  const context = createDraftTaskAiContext(base, members, "self");
  assert.deepEqual(context.task.effortEstimate, effort());
  const changed = structuredClone(base);
  changed.mainTask.effortEstimate!.confirmed = false;
  assert.notEqual(getTaskAiContextSignature(createDraftTaskAiContext(changed, members, "self")), getTaskAiContextSignature(context));
  assert.deepEqual(context.task.effortEstimate, effort());
});

test("明确投入数字只产生未确认候选，不覆盖已确认人工估算或编造工作方式与依据", () => {
  const context = createDraftTaskAiContext(form(), members, "self");
  const original = structuredClone(context);
  const planned = proposal(context, "预计投入改为2小时");
  const candidate = planned.updates[0].patch.effortEstimate!;
  assert.equal(candidate.minutes, 120);
  assert.equal(candidate.workMethod, effort().workMethod);
  assert.equal(candidate.reason, effort().reason);
  assert.equal(candidate.basis, "manual");
  assert.equal(candidate.confirmed, false);
  assert.equal(candidate.version, 2);
  assert.notEqual(candidate.scopeKey, effort().scopeKey);
  assert.equal(planned.changes[0].label, "预计投入（EWD）");
  assert.match(planned.changes[0].after!, /0\.25 人天/);
  assert.match(planned.summary, /用户|你明确/);
  assert.match(planned.summary, /未确认|待确认|待复核/);
  assert.deepEqual(context, original);
});

test("已保存任务上下文保留估算，单独打开子任务仍采用当前继承目标", () => {
  const base = nodes();
  base.push({ ...(base[0] as TaskNode), id: "child", parentTaskId: "task", goal: "旧目标" });
  const context = createSavedTaskAiContext(base, "child", members, "self")!;
  assert.deepEqual(context.task.effortEstimate, effort());
  assert.equal(context.task.goal, "对齐后续行动");
  (base[1] as TaskNode).effortEstimate!.reason = "新的人工依据";
  assert.notEqual(getTaskAiContextSignature(createSavedTaskAiContext(base, "child", members, "self")!), getTaskAiContextSignature(context));
  assert.deepEqual(context.task.effortEstimate, effort());
});

test("主任务与仍有下级的子任务不可直接调整投入，只有叶子可改", () => {
  const base = form();
  base.subtasks = [newCreationTask({ ...base.mainTask, title: "核对行动" })];
  const draft = createDraftTaskAiContext(base, members, "self");
  const parentResult = buildTaskAiAdjustment(draft, { kind: "task" }, "预计投入改为2小时");
  assert.ok("error" in parentResult);
  assert.match(parentResult.error, /子任务|逐项/);
  const leaf = proposal(draft, "预计投入改为2小时", { kind: "subtask", taskId: base.subtasks[0].clientId });
  assert.equal(leaf.updates[0].taskId, base.subtasks[0].clientId);
  const savedNodes = nodes();
  savedNodes.push({ ...(savedNodes[0] as TaskNode), id: "child", parentTaskId: "task" }, { ...(savedNodes[0] as TaskNode), id: "grandchild", parentTaskId: "child" });
  const saved = createSavedTaskAiContext(savedNodes, "task", members, "self")!;
  assert.ok("error" in buildTaskAiAdjustment(saved, { kind: "subtask", taskId: "child" }, "预计投入改为2小时"));
});

test("明确改为待估算生成未知候选，缺少方式和依据的数字也不冒充有效估算", () => {
  const context = createDraftTaskAiContext(form(), members, "self");
  const cleared = proposal(context, "预计投入改为待估算").updates[0].patch.effortEstimate!;
  assert.equal(cleared.minutes, null);
  assert.equal(cleared.basis, "unknown");
  assert.equal(cleared.confirmed, false);
  assert.equal(cleared.workMethod, effort().workMethod);
  assert.equal(cleared.reason, effort().reason);
  assert.equal(getTaskEffortState({ ...context.task, effortEstimate: cleared }), "unknown");
  delete context.task.effortEstimate;
  const numeric = proposal(context, "预计投入改为0.5小时");
  const candidate = numeric.updates[0].patch.effortEstimate!;
  assert.equal(candidate.minutes, 30);
  assert.equal(candidate.workMethod, "");
  assert.equal(candidate.reason, "");
  assert.equal(getTaskEffortState({ ...context.task, effortEstimate: candidate }), "unknown");
  assert.match(numeric.summary, /补充.*工作方式.*估算依据/);
});

test("投入候选只有明确应用后才写入草稿或已保存节点，活动记录真实差异", () => {
  const draft = form();
  const draftContext = createDraftTaskAiContext(draft, members, "self");
  const draftProposal = proposal(draftContext, "预计投入改为2小时");
  const updatedDraft = applyDraftTaskAiAdjustment(draft, draftContext, draftProposal);
  assert.deepEqual(updatedDraft.mainTask.effortEstimate, draftProposal.updates[0].patch.effortEstimate);
  assert.deepEqual(draft.mainTask.effortEstimate, effort());
  const saved = nodes();
  const savedContext = createSavedTaskAiContext(saved, "task", members, "self")!;
  const savedProposal = proposal(savedContext, "预计投入改为2小时");
  const updated = applySavedTaskAiAdjustment(saved, savedContext, savedProposal, { author: "我" });
  assert.deepEqual((updated.nodes[0] as TaskNode).effortEstimate, savedProposal.updates[0].patch.effortEstimate);
  assert.deepEqual((saved[0] as TaskNode).effortEstimate, effort());
  assert.equal((updated.nodes[0] as TaskNode).status, "待开始");
  assert.equal((updated.nodes[0] as TaskNode).ownerId, "self");
  assert.equal(updated.activities.task[0].changes?.[0].label, "预计投入（EWD）");
  assert.match(updated.activities.task[0].changes?.[0].after ?? "", /未确认/);
});

test("组合投入指令不能藏进名称或完成标准，非法数字和失效版本无候选", () => {
  const context = createDraftTaskAiContext(form(), members, "self");
  for (const instruction of ["任务名称改为新版纪要，预计投入改为2小时", "完成标准改为：内容完整；预计投入：2小时", "预计投入改为-2小时", "预计投入改为0.001小时", "预计投入改为2小时并确认", "预计投入改为明天下午", "预计投入改为两小时", "预计投入改为Infinity小时"]) {
    assert.ok("error" in buildTaskAiAdjustment(context, { kind: "task" }, instruction), instruction);
  }
  context.task.effortEstimate!.version = Number.MAX_SAFE_INTEGER;
  assert.ok("error" in buildTaskAiAdjustment(context, { kind: "task" }, "预计投入改为2小时"));
});

test("成员可选协作资料进入快照但不参与臆测，旧的仅姓名上下文仍兼容", () => {
  const people = [{ ...members[0], availability: "本周可投入约 2 小时", currentWork: ["核对资料"], dynamicResponsibility: "整理与核对纪要" }];
  for (const context of [createDraftTaskAiContext(form(), people, "self"), createSavedTaskAiContext(nodes(), "task", people, "self")!]) {
    assert.deepEqual(context.members, people);
    const changed = structuredClone(context);
    changed.members[0].availability = "资料已过期，待核对";
    assert.notEqual(getTaskAiContextSignature(changed), getTaskAiContextSignature(context));
    const effortProposal = proposal(context, "预计投入改为2小时");
    assert.equal(effortProposal.updates[0].patch.effortEstimate!.reason, effort().reason);
  }
  assert.deepEqual(createDraftTaskAiContext(form(), members, "self").members, members);
});

test("叶子拆出子任务时预览说明汇总口径变化，旧父估算保留但确认失效，新增项不默认估算", () => {
  const saved = nodes();
  const parent = saved[0] as TaskNode;
  parent.effortEstimate!.scopeKey = getEffortScopeKey(parent, parent.effortEstimate!.workMethod);
  const context = createSavedTaskAiContext(saved, "task", members, "self")!;
  assert.equal(getTaskEffortState(context.task), "confirmed");
  const planned = proposal(context, "添加子任务：核对行动；完成标准：行动与负责人核对", { kind: "subtasks" });
  assert.equal(planned.additions[0].effortEstimate, undefined);
  const changedParent = planned.updates.find(update => update.taskId === "task")!.patch.effortEstimate!;
  assert.deepEqual(changedParent, { ...parent.effortEstimate, scopeKey: "needs-review:split", confirmed: false });
  assert.ok(planned.changes.some(change => change.taskId === "task" && /汇总/.test(change.after ?? "")));
  const updated = applySavedTaskAiAdjustment(saved, context, planned, { author: "我" });
  assert.equal(getTaskEffortState(updated.nodes[0] as TaskNode), "stale");
  assert.deepEqual((updated.nodes[0] as TaskNode).effortEstimate, changedParent);
  assert.equal((updated.nodes.at(-1) as TaskNode).effortEstimate, undefined);
  assert.equal(parent.effortEstimate!.confirmed, true);
  assert.ok(updated.activities.task[0].changes?.some(change => /汇总/.test(change.after ?? "")));
});

test("只改其他字段不会丢失详情有效快照中的估算元数据", () => {
  const raw = nodes();
  delete (raw[0] as TaskNode).effortEstimate;
  const effectiveNodes = nodes();
  const context = createSavedTaskAiContext(effectiveNodes, "task", members, "self")!;
  const planned = proposal(context, "任务名称改为归档会议纪要");
  const updated = applySavedTaskAiAdjustment(raw, context, planned, { author: "我", effectiveNodes });
  assert.deepEqual((updated.nodes[0] as TaskNode).effortEstimate, effort());
  assert.deepEqual(updated.activities.task[0].changes?.map(change => change.label), ["任务名称"]);
});

test("标准和继承目标调整保留原估算记录，并因范围变化显示待复核", () => {
  for (const instruction of ["完成标准改为：行动负责人逐项核对", "执行建议改为：先确认行动截止日", "目标改为让行动安排形成共识"]) {
    const base = form();
    base.mainTask.effortEstimate!.scopeKey = getEffortScopeKey(base.mainTask, base.mainTask.effortEstimate!.workMethod);
    const context = createDraftTaskAiContext(base, members, "self");
    const next = applyDraftTaskAiAdjustment(base, context, proposal(context, instruction));
    assert.deepEqual(next.mainTask.effortEstimate, base.mainTask.effortEstimate);
    assert.equal(getTaskEffortState(next.mainTask), "stale");
  }
  const saved = nodes();
  const child: TaskNode = { ...(saved[0] as TaskNode), id: "child", parentTaskId: "task", effortEstimate: effort() };
  child.effortEstimate!.scopeKey = getEffortScopeKey(child, child.effortEstimate!.workMethod);
  saved.push(child);
  const context = createSavedTaskAiContext(saved, "task", members, "self")!;
  const updated = applySavedTaskAiAdjustment(saved, context, proposal(context, "目标改为统一行动口径"), { author: "我" });
  const childContext = createSavedTaskAiContext(updated.nodes, "child", members, "self")!;
  assert.equal(getTaskEffortState(childContext.task), "stale");
  assert.deepEqual(childContext.task.effortEstimate, child.effortEstimate);
});

test("投入候选不可篡改确认、方式、依据或新增项估算，旧估算快照不能覆盖新记录", () => {
  const base = form();
  const context = createDraftTaskAiContext(base, members, "self");
  const planned = proposal(context, "预计投入改为2小时");
  for (const patch of [{ confirmed: true }, { workMethod: "伪造 AI 工作方式" }, { reason: "伪造依据" }, { minutes: 999 }]) {
    const tampered = structuredClone(planned);
    Object.assign(tampered.updates[0].patch.effortEstimate!, patch);
    assert.throws(() => applyDraftTaskAiAdjustment(base, context, tampered), /预览|不一致/);
  }
  const current = structuredClone(base);
  current.mainTask.effortEstimate!.version += 1;
  assert.throws(() => applyDraftTaskAiAdjustment(current, context, planned), /变化|重新/);
  const added = proposal(context, "添加子任务：核对行动；完成标准：确认完成", { kind: "subtasks" });
  added.additions[0].effortEstimate = effort();
  assert.throws(() => applyDraftTaskAiAdjustment(base, context, added), /预览|不一致/);
  const saved = nodes();
  const savedContext = createSavedTaskAiContext(saved, "task", members, "self")!;
  const savedProposal = proposal(savedContext, "预计投入改为2小时");
  (saved[0] as TaskNode).effortEstimate!.confirmed = false;
  assert.throws(() => applySavedTaskAiAdjustment(saved, savedContext, savedProposal, { author: "我" }), /变化|重新/);
});

test("同值投入不撤销已有确认或制造活动，零投入与未知保持区别", () => {
  const base = nodes();
  const task = base[0] as TaskNode;
  task.effortEstimate!.scopeKey = getEffortScopeKey(task, task.effortEstimate!.workMethod);
  const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const unchanged = proposal(context, "预计投入改为1小时");
  assert.deepEqual(unchanged.updates, []);
  const saved = applySavedTaskAiAdjustment(base, context, unchanged, { author: "我" });
  assert.equal(saved.nodes, base);
  assert.deepEqual(saved.activities, {});
  const zero = proposal(context, "预计投入改为0小时").updates[0].patch.effortEstimate!;
  assert.equal(zero.minutes, 0);
  assert.equal(getTaskEffortState({ ...context.task, effortEstimate: zero }), "proposed");
});

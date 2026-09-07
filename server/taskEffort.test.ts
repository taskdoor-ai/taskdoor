import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { taskAssistantRequestSchema, taskAssistantResponseSchema, taskPlanDraftSchema } from "../src/lib/taskAssistantProtocol.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import { normalizeWorkspaceNodes } from "../src/data/workspaceNodes.ts";

const scope = { goal: "形成可复核的结论", completionCriteria: ["完成核对"], executionTips: ["使用 AI 起草，再逐项人工复核"] };
const workMethod = "AI 起草，人工核对和确认";
const reason = "包含输入准备、核对与最终确认，不含无人值守运行和等待";
const draftFields = { ...scope, title: "交付结论", ownerId: "周岚", participantIds: [], labels: [], startDate: "", endDate: "" };

async function effort() {
  assert.ok(existsSync(new URL("../src/lib/taskEffort.ts", import.meta.url)), "需要实现可核对的 EWD 估算核心");
  return import("../src/lib/taskEffort.ts");
}

test("估算契约区分未知和零，拒绝无效分钟及版本", async () => {
  const { effortEstimateSchema, getEffortScopeKey } = await effort();
  const base = { minutes: 90, workMethod, reason, basis: "manual", confirmed: true, scopeKey: getEffortScopeKey(scope, workMethod), version: 1 };
  for (const minutes of [null, 0, 90, Number.MAX_SAFE_INTEGER]) assert.equal(effortEstimateSchema.parse({ ...base, minutes }).minutes, minutes);
  for (const minutes of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "90"]) assert.equal(effortEstimateSchema.safeParse({ ...base, minutes }).success, false);
  for (const version of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.equal(effortEstimateSchema.safeParse({ ...base, version }).success, false);
});

test("范围签名规范空白，但目标、标准、建议或工作方式变化使旧估算过期", async () => {
  const { getEffortScopeKey, createManualEffortEstimate, getTaskEffortState } = await effort();
  assert.equal(getEffortScopeKey({ goal: " A  B ", completionCriteria: [" C\nD "], executionTips: [" E\tF "] }, " G  H "), getEffortScopeKey({ goal: "A B", completionCriteria: ["C D"], executionTips: ["E F"] }, "G H"));
  const estimate = createManualEffortEstimate(scope, { minutes: 90, workMethod, reason });
  const task = { ...scope, effortEstimate: estimate, title: "原名称", ownerId: "甲", labels: [], endDate: "" };
  const renamedTask = { ...task, title: "新名称", ownerId: "乙", labels: ["新标签"], endDate: "2026-09-01" };
  assert.equal(getTaskEffortState(renamedTask), "confirmed");
  for (const changed of [{ goal: "改变目标" }, { completionCriteria: ["新增标准"] }, { executionTips: ["人工完整重做"] }]) {
    assert.equal(getTaskEffortState({ ...task, ...changed }), "stale");
  }
  assert.equal(getTaskEffortState({ ...task, effortEstimate: { ...estimate, workMethod: "全人工" } }), "stale");
  assert.deepEqual(task.effortEstimate, estimate, "检查过期不能重写原估算依据");
});

test("状态不把未知和残缺依据视为已确认", async () => {
  const { createManualEffortEstimate, getTaskEffortState, getEffortScopeKey } = await effort();
  assert.equal(getTaskEffortState(scope), "unknown");
  const estimate = createManualEffortEstimate(scope, { minutes: 0, workMethod, reason });
  assert.equal(getTaskEffortState({ ...scope, effortEstimate: estimate }), "confirmed");
  assert.equal(getTaskEffortState({ ...scope, effortEstimate: { ...estimate, confirmed: false, basis: "mock" } }), "proposed");
  assert.equal(getTaskEffortState({ ...scope, effortEstimate: { ...estimate, minutes: null } }), "unknown");
  for (const incomplete of [
    { ...estimate, scopeKey: "" },
    { ...estimate, reason: " " },
    { ...estimate, workMethod: "", scopeKey: getEffortScopeKey(scope, "") },
    { ...estimate, basis: "unknown" as const },
  ]) assert.equal(getTaskEffortState({ ...scope, effortEstimate: incomplete }), "unknown");
});

test("手动确认保留依据、递增版本，清空回到未知且不自动确认", async () => {
  const { createManualEffortEstimate, getEffortScopeKey } = await effort();
  const first = createManualEffortEstimate(scope, { minutes: 90, workMethod: ` ${workMethod} `, reason: ` ${reason} ` });
  assert.deepEqual(first, { minutes: 90, workMethod, reason, basis: "manual", confirmed: true, scopeKey: getEffortScopeKey(scope, workMethod), version: 1 });
  const second = createManualEffortEstimate(scope, { minutes: 0, workMethod, reason }, first);
  assert.equal(second.version, 2);
  assert.equal(second.confirmed, true);
  const cleared = createManualEffortEstimate(scope, { minutes: null, workMethod: "", reason: "" }, second);
  assert.equal(cleared.minutes, null);
  assert.equal(cleared.basis, "unknown");
  assert.equal(cleared.confirmed, false);
  assert.equal(cleared.version, 3);
  assert.throws(() => createManualEffortEstimate(scope, { minutes: 30, workMethod: "", reason }), /工作方式/);
  assert.throws(() => createManualEffortEstimate(scope, { minutes: 30, workMethod, reason: "" }), /依据/);
  assert.throws(() => createManualEffortEstimate(scope, { minutes: -1, workMethod, reason }), /分钟|工时/);
});

test("小时输入精确转换到整数分钟，不舍入小数分钟或接受非法数值", async () => {
  const { parseEffortHours, formatEffortMinutes } = await effort();
  assert.equal(parseEffortHours("  "), null);
  assert.equal(parseEffortHours("0"), 0);
  assert.equal(parseEffortHours("1.5"), 90);
  assert.equal(parseEffortHours("0.05"), 3);
  assert.equal(parseEffortHours("1.10"), 66);
  for (const value of ["-1", "NaN", "Infinity", "abc", "0.01", "1e3", "1,5", "9007199254740991"]) assert.throws(() => parseEffortHours(value), /工时|小时|分钟/);
  assert.equal(formatEffortMinutes(null), "待估算");
  assert.equal(formatEffortMinutes(0), "0 h");
  assert.equal(formatEffortMinutes(90), "1.5 h");
});

test("汇总披露部分覆盖并排除过期值，已知零不视为缺失", async () => {
  const { createManualEffortEstimate, summarizeTaskEffort } = await effort();
  const confirmed = { ...scope, effortEstimate: createManualEffortEstimate(scope, { minutes: 90, workMethod, reason }) };
  const proposed = { ...scope, effortEstimate: { ...confirmed.effortEstimate, minutes: 30, confirmed: false as const, basis: "mock" as const } };
  const zero = { ...scope, effortEstimate: { ...confirmed.effortEstimate, minutes: 0 } };
  const stale = { ...scope, goal: "已改变", effortEstimate: confirmed.effortEstimate };
  assert.deepEqual(summarizeTaskEffort([confirmed, proposed, zero, scope, stale]), { taskCount: 5, estimatedCount: 3, confirmedCount: 2, unknownCount: 1, staleCount: 1, knownMinutes: 120, confirmedMinutes: 90, totalMinutes: null });
  assert.equal(summarizeTaskEffort([confirmed, proposed, zero]).totalMinutes, 120);
  assert.equal(summarizeTaskEffort([zero]).totalMinutes, 0);
  assert.equal(summarizeTaskEffort([]).totalMinutes, null);
  assert.deepEqual(summarizeTaskEffort([{ ...scope, effortEstimate: { ...confirmed.effortEstimate, reason: "" } }]), { taskCount: 1, estimatedCount: 0, confirmedCount: 0, unknownCount: 1, staleCount: 0, knownMinutes: 0, confirmedMinutes: 0, totalMinutes: null });
});

test("汇总只处理传入项，父任务去重由调用方明确选择叶子", async () => {
  const { createManualEffortEstimate, summarizeTaskEffort } = await effort();
  const parent = { ...scope, id: "parent", effortEstimate: createManualEffortEstimate(scope, { minutes: 600, workMethod, reason }) };
  const children = [30, 60].map((minutes, index) => ({ ...scope, id: `child-${index}`, parentTaskId: "parent", effortEstimate: createManualEffortEstimate(scope, { minutes, workMethod, reason }) }));
  assert.equal(summarizeTaskEffort(children).totalMinutes, 90);
  assert.equal(summarizeTaskEffort([parent, ...children]).totalMinutes, 690, "核心不根据不完整列表擅自猜测树结构");
});

test("主子任务估算经过协议、创建与刷新保存，旧任务不补造估算", async () => {
  const { createManualEffortEstimate } = await effort();
  for (const minutes of [null, 0, 90]) {
    const estimate = createManualEffortEstimate(scope, { minutes, workMethod, reason });
    const draft = taskPlanDraftSchema.parse({ mainTask: { ...draftFields, effortEstimate: estimate }, subtasks: [{ ...draftFields, title: "子任务", effortEstimate: estimate }, { ...draftFields, title: "旧合同任务" }] });
    assert.deepEqual(draft.mainTask.effortEstimate, estimate);
    const solo = createWorkspaceTasksFromDraft([], { ...draft, subtasks: [] }, { currentUserId: "周岚", idForIndex: () => "solo" });
    const soloRestored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(solo.nodes))).find(node => node.id === "solo");
    assert.ok(soloRestored?.kind === "task");
    assert.deepEqual(soloRestored.effortEstimate, estimate, "独立叶子的人工确认不因保存丢失");
    const result = createWorkspaceTasksFromDraft([], draft, { currentUserId: "周岚", idForIndex: index => `effort-${index}` });
    const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(result.nodes)));
    for (const index of [0, 1]) {
      const expected = index === 0 ? { ...estimate, confirmed: false, scopeKey: "needs-review:split" } : estimate;
      assert.deepEqual(result.createdNodes[index].effortEstimate, expected);
      const task = restored.find(node => node.id === result.createdNodes[index].id);
      assert.ok(task?.kind === "task");
      assert.deepEqual(task.effortEstimate, expected);
    }
    assert.equal(Object.hasOwn(result.createdNodes[2], "effortEstimate"), false);
    assert.equal(Object.hasOwn(restored.find(node => node.id === result.createdNodes[2].id)!, "effortEstimate"), false);
  }
});

test("无效保存估算不会污染恢复节点，创建边界拒绝非法分钟", async () => {
  const { createManualEffortEstimate } = await effort();
  const valid = createManualEffortEstimate(scope, { minutes: 30, workMethod, reason });
  const invalid = { ...valid, minutes: -1 };
  const draft = { mainTask: { ...draftFields, effortEstimate: invalid }, subtasks: [] };
  assert.throws(() => createWorkspaceTasksFromDraft([], draft), /分钟|工时|估算/);
  const restored = normalizeWorkspaceNodes([{ id: "saved", kind: "task", name: "任务", ownerId: "周岚", updatedAt: "今天", status: "待开始", effortEstimate: invalid }]);
  const restoredTask = restored.find(node => node.id === "saved");
  assert.ok(restoredTask?.kind === "task");
  assert.equal(Object.hasOwn(restoredTask, "effortEstimate"), false);
});

test("给已有叶子新增子任务时保留旧依据但使父级独立估算失效", async () => {
  const { createManualEffortEstimate, getTaskEffortState } = await effort();
  const estimate = createManualEffortEstimate(scope, { minutes: 90, workMethod, reason });
  const parentResult = createWorkspaceTasksFromDraft([], { mainTask: { ...draftFields, effortEstimate: estimate }, subtasks: [] }, { currentUserId: "周岚", idForIndex: () => "existing-parent" });
  const originalParent = structuredClone(parentResult.createdNodes[0]);
  const result = createWorkspaceTasksFromDraft(parentResult.nodes, { mainTask: { ...draftFields, title: "新增子任务" }, subtasks: [] }, { currentUserId: "周岚", parentTaskId: originalParent.id, idForIndex: () => "new-child" });
  const parent = result.nodes.find(node => node.id === originalParent.id);
  assert.ok(parent?.kind === "task");
  assert.deepEqual(parent, { ...originalParent, effortEstimate: { ...estimate, confirmed: false, scopeKey: "needs-review:split" } });
  assert.equal(getTaskEffortState(parent), "stale");
  assert.deepEqual(parentResult.createdNodes[0], originalParent, "追加子任务不能原地改写父节点");
  assert.equal(result.createdNodes[0].parentTaskId, originalParent.id);
});

test("新建父子计划时父估算失效，子任务仍保留各自范围的估算", async () => {
  const { createManualEffortEstimate, getTaskEffortState } = await effort();
  const estimate = createManualEffortEstimate(scope, { minutes: 90, workMethod, reason });
  const result = createWorkspaceTasksFromDraft([], { mainTask: { ...draftFields, effortEstimate: estimate }, subtasks: [{ ...draftFields, title: "独立子交付", effortEstimate: estimate }] }, { currentUserId: "周岚", idForIndex: index => `split-${index}` });
  assert.equal(getTaskEffortState(result.createdNodes[0]), "stale");
  assert.equal(result.createdNodes[0].effortEstimate?.scopeKey, "needs-review:split");
  assert.equal(getTaskEffortState(result.createdNodes[1]), "confirmed");
});

test("模型响应不能自称人工确认，内部协议仍保留真实人工确认", async () => {
  const { createManualEffortEstimate } = await effort();
  const { normalizeAssistantResponse } = await import("./taskAssistant.ts");
  const estimate = createManualEffortEstimate(scope, { minutes: 30, workMethod, reason });
  const response = taskAssistantResponseSchema.parse({
    assistantMessage: "估算候选", resultSummary: "待确认", missingInformation: [], peopleRecommendations: [], readyToCreate: false,
    qualityAssessment: { goal: { level: "good", summary: "有目标" }, scope: { level: "good", summary: "有范围" }, schedule: { level: "needs-attention", summary: "待确认" }, risks: [] },
    draft: { mainTask: { ...draftFields, effortEstimate: estimate }, subtasks: [{ ...draftFields, effortEstimate: estimate }] },
  });
  const request = taskAssistantRequestSchema.parse({ currentDate: "2026-08-31", currentUserId: "周岚", draft: null, existingTasks: [], members: [{ id: "周岚", name: "周岚" }], messages: [{ role: "user", content: "请生成候选" }], tags: [], timezone: "Asia/Shanghai" });
  assert.equal(response.draft.mainTask.effortEstimate?.confirmed, true, "内部 schema 不破坏人工确认的持久化合同");
  const normalized = normalizeAssistantResponse(response, request);
  for (const task of [normalized.draft.mainTask, ...normalized.draft.subtasks]) {
    assert.equal(task.effortEstimate?.confirmed, false);
    assert.equal(task.effortEstimate?.basis, "model");
  }
});

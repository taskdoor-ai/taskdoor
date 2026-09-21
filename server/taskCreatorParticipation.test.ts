import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";
import { normalizeWorkspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import type { TaskPlanDraft } from "../src/lib/taskAssistantProtocol.ts";
import { createCreationForm, newCreationTask, toTaskPlanDraft, withCreationParticipantDefaults } from "../src/lib/taskCreationForm.ts";
import { planTaskCreation, reviseCreationPlan } from "../src/lib/taskCreationPlanning.ts";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";

const creator = "周岚";
const context = { currentUserId: creator, currentDate: "2026-09-16", members: creatorCommerceMembers, tags: [] };
const draftTask = (ownerId: string, participantIds: string[] = []) => ({
  title: "确认交付", goal: "形成可核对的交付", completionCriteria: ["交付已核对"],
  ownerId, participantIds, labels: [], startDate: "", endDate: "",
});

test("独立与挂靠创建均按每项负责人人选加入创建者，去重且刷新后保留", () => {
  const parent: TaskNode = { id: "parent", kind: "task", name: "已有任务", parentId: "root", ownerId: "林洁", participantIds: [], status: "进行中", updatedAt: "今天", goal: "已有目标" };
  const draft: TaskPlanDraft = {
    mainTask: draftTask("林洁", ["陈默"]),
    subtasks: [draftTask(creator), draftTask("韩序", [creator, creator, "陈默"]), draftTask("")],
  };
  const before = structuredClone(draft);
  for (const parentTaskId of [undefined, parent.id]) {
    const result = createWorkspaceTasksFromDraft([parent], draft, { currentUserId: creator, parentTaskId, idForIndex: index => `new-${index}` });
    assert.deepEqual(result.createdNodes.map(task => task.participantIds), [["陈默", creator], [], [creator, "陈默"], [creator]]);
    assert.equal(result.createdNodes[0].ownerId, "林洁");
    assert.equal(result.createdNodes[0].proposedOwnerId, undefined);
    assert.equal(result.createdNodes[1].ownerId, creator);
    const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(result.nodes)));
    for (const task of result.createdNodes) {
      const saved = restored.find((node): node is TaskNode => node.kind === "task" && node.id === task.id)!;
      assert.deepEqual(saved.participantIds, task.participantIds);
      assert.equal(saved.createdBy, creator);
    }
    assert.deepEqual(result.nodes[0], parent);
  }
  assert.deepEqual(draft, before);
});

test("创建者负责时不重复参与，没有创建者上下文时不推断人选", () => {
  const draft = { mainTask: draftTask(creator, [creator, "陈默"]), subtasks: [] };
  assert.deepEqual(createWorkspaceTasksFromDraft([], draft, { currentUserId: creator }).createdNodes[0].participantIds, ["陈默"]);
  assert.deepEqual(createWorkspaceTasksFromDraft([], draft).createdNodes[0].participantIds, [creator, "陈默"]);
});

test("确认前已人工调整的参与人保持原选择，不在保存时重新加入创建者", () => {
  const draft = { mainTask: draftTask("林洁", ["陈默"]), subtasks: [] };
  const result = createWorkspaceTasksFromDraft([], draft, { currentUserId: creator, participantsReviewed: true });
  assert.deepEqual(result.createdNodes[0].participantIds, ["陈默"]);
});

test("空白表单和规划方案在审阅前展示创建者默认参与，主子任务一致", () => {
  assert.deepEqual(createCreationForm("", context).mainTask.participantIds, [creator]);
  for (const id of ["complex-plan", "unassigned-owner"] as const) {
    const scenario = taskCreationScenarios.find(s => s.id === id)!;
    const result = planTaskCreation(scenario.prompt, context);
    assert.equal(result.stage, "review");
    if (result.stage !== "review") return;
    const plan = toTaskPlanDraft(result.form);
    for (const task of [plan.mainTask, ...plan.subtasks]) {
      assert.equal(task.participantIds.includes(creator), task.ownerId !== creator);
      assert.equal(new Set(task.participantIds).size, task.participantIds.length);
    }
  }
});

test("负责人改为自己时移除重复参与，改为他人时重新默认加入创建者", () => {
  let form = createCreationForm("", context);
  form = { ...form, mainTask: { ...form.mainTask, ...draftTask("林洁", [creator, "陈默"]) } };
  const self = reviseCreationPlan(form, `负责人改为${creator}`, context);
  assert.ok("form" in self);
  assert.deepEqual(self.form.mainTask.participantIds, ["陈默"]);
  const other = reviseCreationPlan(self.form, "负责人改为林洁", context);
  assert.ok("form" in other);
  assert.deepEqual(other.form.mainTask.participantIds, ["陈默", creator]);
});

test("编辑草稿及新增子任务应用默认参与；手动移除后编辑其他字段和保存仍尊重选择", () => {
  const form = createCreationForm("", context);
  const edited = { ...form, mainTask: { ...form.mainTask, participantIds: [] }, subtasks: [newCreationTask(draftTask("林洁"))] };
  const next = withCreationParticipantDefaults(edited, creator, form);
  assert.deepEqual(next.mainTask.participantIds, []);
  assert.deepEqual(next.subtasks[0].participantIds, [creator]);
  const renamed = withCreationParticipantDefaults({ ...next, mainTask: { ...next.mainTask, title: "人工改名" } }, creator, next);
  assert.deepEqual(renamed.mainTask.participantIds, []);
  const created = createWorkspaceTasksFromDraft([], toTaskPlanDraft(renamed), { currentUserId: creator, participantsReviewed: true });
  assert.deepEqual(created.createdNodes.map(task => task.participantIds), [[], [creator]]);
  const reassigned = withCreationParticipantDefaults({ ...renamed, mainTask: { ...renamed.mainTask, ownerId: "林洁" } }, creator, renamed);
  assert.deepEqual(reassigned.mainTask.participantIds, [creator]);
});

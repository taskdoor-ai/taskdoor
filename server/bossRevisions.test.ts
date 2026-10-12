import assert from "node:assert/strict";
import test from "node:test";
import { applyAutomaticTaskTags, manualTaskTags } from "../src/ai/mock/lib/taskAutoTags";
import { buildTaskAiAdjustment } from "../src/ai/mock/lib/taskAiAdjustment";
import { mainTaskReview, splitCreationReview } from "../src/features/tasks/lib/task-creation-review";
import { newCreationTask, type CreationForm } from "../src/features/tasks/lib/task-creation-form";
import type { TaskNode } from "../src/shared/model/task-model";
import type { TaskAiAdjustmentContext } from "../src/features/tasks/lib/task-ai-adjustment-types";

test("人工标签保留，删除自动标签后更新目标不补回", () => {
  let task = applyAutomaticTaskTags({ id: "tag-check", kind: "task", name: "会议纪要", goal: "整理会议决定", labels: ["人工标签"] } as TaskNode);
  assert.deepEqual(task.labels, ["人工标签", "会议"]);
  task = { ...task, ...manualTaskTags(task, ["人工标签"]) };
  task = applyAutomaticTaskTags({ ...task, goal: "整理会议决定及行动" });
  assert.deepEqual(task.labels, ["人工标签"]);
  assert.equal(applyAutomaticTaskTags(task), task);
});

test("主任务审阅不提交隐藏信息，选择拆解才出现子任务", () => {
  const task = newCreationTask({ title: "会议纪要", goal: "对齐结论", ownerId: "", participantIds: ["member"], labels: ["旧标签"], startDate: "", endDate: "", executionTips: ["隐藏提示"], completionCriteria: ["纪要已共享", "行动已核对"] });
  const form: CreationForm = { request: "会议纪要", decision: "independent", mainTask: task, subtasks: [newCreationTask()] };
  const review = mainTaskReview(form);
  assert.equal(review.subtasks.length, 0);
  assert.deepEqual(review.mainTask.labels, []);
  assert.deepEqual(review.mainTask.executionTips, []);
  assert.equal(review.mainTask.effortEstimate, undefined);
  const split = splitCreationReview(review);
  assert.equal(split.subtasks.length, 2);
  assert.equal(review.subtasks.length, 0);
  assert.ok(split.subtasks.every(child => child.ownerId === "" && child.completionCriteria.length === 1));
});

test("已有任务拆解只生成候选，遵守深度权限并避免重复", () => {
  const context: TaskAiAdjustmentContext = { mode: "saved", currentUserId: "member", task: { id: "main", title: "会议纪要", goal: "对齐", completionCriteria: ["纪要已共享", "行动已核对"], executionTips: [], ownerId: "member", participantIds: [], startDate: "", endDate: "", dependsOnTaskIds: [] }, subtasks: [], members: [], dependencyTasks: [], canAddSubtasks: true };
  const result = buildTaskAiAdjustment(context, { kind: "subtasks" }, "分解当前任务");
  assert.ok("proposal" in result);
  assert.equal(result.proposal.additions.length, 2);
  assert.equal(context.subtasks.length, 0);
  const repeat = buildTaskAiAdjustment({ ...context, subtasks: result.proposal.additions }, { kind: "subtasks" }, "分解当前任务");
  assert.ok("proposal" in repeat);
  assert.equal(repeat.proposal.additions.length, 0);
  assert.ok("error" in buildTaskAiAdjustment({ ...context, canAddSubtasks: false }, { kind: "subtasks" }, "分解当前任务"));
});

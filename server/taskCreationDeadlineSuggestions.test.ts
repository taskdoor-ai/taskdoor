import assert from "node:assert/strict";
import test from "node:test";
import { planTaskCreation, reviseCreationPlan } from "../src/ai/mock/lib/taskCreationPlanning.ts";
import { getCreationDeadlineNote, mainTaskReview } from "../src/features/tasks/lib/task-creation-review.ts";
import { withMockCreationDeadline } from "../src/ai/mock/lib/taskCreationDeadline.ts";
import { getTaskEffortState } from "../src/features/tasks/lib/task-effort.ts";
import { createWorkspaceTasksFromDraft } from "../src/features/tasks/lib/workspace-task-creation.ts";
import { toTaskPlanDraft } from "../src/features/tasks/lib/task-creation-form.ts";
import type { ScenarioContext } from "../src/ai/mock/lib/taskCreationScenario.ts";

const finiteRequest = "根据已有会议记录，整理本次会议纪要并共享给参会人";
const ongoingRequest = "持续维护团队常见问题，帮助成员找到当前有效答案";
const context: ScenarioContext = {
  currentDate: "2026-10-16", timezone: "Asia/Shanghai", currentUserId: "self",
  members: [{ id: "self", name: "我" }], tags: [],
  existingTasks: [{ id: "weekly-retro-notes", name: "整理本周团队复盘纪要", goal: "让团队了解关键结果、问题和行动" }],
};

function candidate(request = finiteRequest, locale: "zh-CN" | "en" = "zh-CN") {
  const result = planTaskCreation(request, context, { locale });
  assert.ok(result.stage === "review" || result.stage === "decision", `expected editable draft, got ${result.stage}`);
  return result.form;
}

test("明确已有材料的有限交付生成有条件的日期，按调用方日历跨过周末", () => {
  const form = candidate();
  assert.equal(form.mainTask.endDate, "2026-10-19");
  assert.equal(form.mainTask.startDate, "");
  assert.ok(form.mainTask.executionTips.some(tip => tip.startsWith("AI 建议截止：2026-10-19。") && /假设/.test(tip) && /未核对/.test(tip) && /可修改或清空/.test(tip)));
  assert.equal(form.subtasks.length, 0);
  assert.notEqual(form.mainTask.goal, form.mainTask.title);
});

test("持续工作不被强加最终日期，也不制造建议截止说明", () => {
  const form = candidate(ongoingRequest);
  assert.equal(form.mainTask.endDate, "");
  assert.ok(form.mainTask.executionTips.every(tip => !tip.startsWith("AI 建议截止：")));
  assert.match(form.mainTask.goal, /当前有效答案/);
});

test("修改日期与主动清空之后的局部优化保留用户选择", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-16T02:00:00Z") });
  for (const date of ["2026-10-23", "待定"]) {
    const edited = reviseCreationPlan(candidate(), `截止时间改为${date}`, context);
    assert.ok("form" in edited);
    const refined = reviseCreationPlan(edited.form, "任务名称改为本次会议纪要", context);
    assert.ok("form" in refined);
    assert.equal(refined.form.mainTask.endDate, date === "待定" ? "" : date);
    assert.equal(getCreationDeadlineNote(refined.form.mainTask), undefined);
  }
});

test("明确已有截止时不另推日期，失配的旧估算不因审阅被重新签成有效", () => {
  const form = candidate();
  const explicit = { ...form, mainTask: { ...form.mainTask, endDate: "2026-10-30" } };
  assert.equal(withMockCreationDeadline(explicit, context.currentDate, "zh-CN"), explicit);
  const changed = { ...form, mainTask: { ...form.mainTask, goal: "人工修改后的交付用途" } };
  assert.equal(getTaskEffortState(changed.mainTask), "stale");
  assert.equal(mainTaskReview(changed).mainTask.effortEstimate, undefined);
});

test("未知外部窗口继续留空，复盘的建议不冒充实际日历或外部承诺", () => {
  const network = candidate("完成办公室无线网络部署");
  assert.equal(network.mainTask.endDate, "");
  const retrospective = candidate("整理新品发布复盘");
  assert.equal(retrospective.mainTask.endDate, "2026-10-20");
  assert.ok(retrospective.mainTask.executionTips.some(tip => /AI 建议截止：2026-10-20/.test(tip) && /数据.*齐备/.test(tip) && /未核对/.test(tip)));
});

test("审阅保留日期建议和有效AI投入，保存后仍为未人工确认的初始基线", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-16T02:00:00Z") });
  const form = candidate();
  assert.equal(getTaskEffortState(form.mainTask), "proposed");
  const review = mainTaskReview(form);
  assert.equal(review.mainTask.effortEstimate?.minutes, 90);
  assert.equal(review.mainTask.effortEstimate?.confirmed, false);
  assert.equal(getTaskEffortState(review.mainTask), "proposed");
  assert.equal(review.mainTask.executionTips.length, 1);
  assert.match(review.mainTask.executionTips[0], /^AI 建议截止：2026-10-19。/);
  const saved = createWorkspaceTasksFromDraft([], toTaskPlanDraft(review), { currentUserId: "self", teamId: "test-team", timeZone: "Asia/Shanghai" });
  assert.equal(saved.createdNodes[0].plannedEndOn, "2026-10-19");
  assert.equal(saved.createdNodes[0].effortBaseline?.minutes, 90);
  assert.equal(saved.createdNodes[0].effortEstimate?.confirmed, false);
});

test("新的精确演示保留英语界面，修改原文不被错误套用", () => {
  const english = candidate(finiteRequest, "en");
  assert.ok(english.mainTask.executionTips.some(tip => /^AI suggested deadline: 2026-10-19\./.test(tip)));
  assert.doesNotMatch(english.mainTask.goal, /[\u4e00-\u9fff]/);
  const unavailable = planTaskCreation(`${finiteRequest}，再做一份PPT`, context);
  assert.equal(unavailable.stage, "unavailable");
});

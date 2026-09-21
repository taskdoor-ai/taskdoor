import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTasksFromDraft } from "../src/lib/workspaceTaskCreation.ts";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { taskPlanDraftSchema } from "../src/lib/taskAssistantProtocol.ts";
import { normalizeWorkspaceNodes } from "../src/data/workspaceNodes.ts";

test("完成标准、执行建议和正式负责人随新任务保存，详情不编造文件和讨论", () => {
  const draft = taskPlanDraftSchema.parse({ mainTask: { title: "测试交付", goal: "明确结果", completionCriteria: ["交付经确认的结果"], executionTips: ["先核对范围"], ownerId: "林洁", participantIds: [], labels: [], startDate: "", endDate: "" }, subtasks: [] });
  assert.deepEqual(draft.mainTask.completionCriteria, ["交付经确认的结果"]);
  const result = createWorkspaceTasksFromDraft([], draft, { currentUserId: "周岚", idForIndex: () => "new-form-task", teamId: "creator-commerce" });
  const node = result.createdNodes[0];
  assert.equal(node.ownerId, "林洁");
  assert.equal(node.proposedOwnerId, undefined);
  assert.equal(node.teamId, "creator-commerce");
  assert.deepEqual(node.completionCriteria, ["交付经确认的结果"]);
  const detail = createWorkspaceTaskDetail(node);
  assert.deepEqual(detail.completionCriteria, node.completionCriteria);
  assert.deepEqual(detail.executionTips, ["先核对范围"]);
  assert.equal(detail.files.length, 0);
  assert.equal(detail.commits.length, 0);
  assert.equal(detail.activities.filter(a => a.type === "member-post" || a.type === "member-reply").length, 0);
  const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(result.nodes)));
  assert.deepEqual(restored.find(n => n.id === node.id), node, "刷新不能丢失正式负责人或完成标准");
});

for (const { name, mainEndDate, childEndDate, expectedDueLabels } of [
  { name: "主任务和子任务均不设截止时间", mainEndDate: "", childEndDate: "", expectedDueLabels: ["—", "—"] },
  { name: "主任务有截止日期但子任务不设截止时间", mainEndDate: "2026-09-15", childEndDate: "", expectedDueLabels: ["9 月 15 日", "—"] },
  { name: "子任务有截止日期但主任务不设截止时间", mainEndDate: "", childEndDate: "2026-09-12", expectedDueLabels: ["—", "9 月 12 日"] },
]) {
  test(`${name}时，创建与刷新不回填或继承固定日期`, () => {
    const fields = { goal: "完成可核对的交付", completionCriteria: ["交付已确认的结果"], ownerId: "周岚", participantIds: [], labels: [], startDate: "" };
    const draft = taskPlanDraftSchema.parse({
      mainTask: { ...fields, title: "主任务", endDate: mainEndDate },
      subtasks: [{ ...fields, title: "子任务", endDate: childEndDate }],
    });
    const result = createWorkspaceTasksFromDraft([], draft, { currentUserId: "周岚", idForIndex: index => `deadline-task-${index}`, teamId: "creator-commerce" });
    const restored = normalizeWorkspaceNodes(JSON.parse(JSON.stringify(result.nodes)));

    assert.equal(result.createdNodes.length, 2);
    assert.equal(result.createdNodes[1].parentTaskId, result.mainTaskId);
    for (const [index, endDate] of [mainEndDate, childEndDate].entries()) {
      const created = result.createdNodes[index];
      const reloaded = restored.find(node => node.id === created.id);
      assert.ok(reloaded?.kind === "task", "刷新后仍可找到原任务");
      for (const node of [created, reloaded]) {
        assert.equal(node.teamId, "creator-commerce", "创建与恢复都保留当前团队范围");
        assert.equal(node.plannedStartOn, undefined, "单独选择截止时间不能自动补开始日期");
        assert.equal(node.plannedEndOn, endDate || undefined, "空截止日期不能补默认值或继承另一层日期");
        assert.equal(node.dueAt, expectedDueLabels[index]);
        assert.equal(createWorkspaceTaskDetail(node).due, expectedDueLabels[index], "详情读取仍保留各任务自己的截止设置");
      }
      assert.deepEqual(reloaded, created, "日期设置经过 JSON 保存和恢复后保持不变");
    }
    assert.deepEqual([draft.mainTask.endDate, draft.subtasks[0].endDate], [mainEndDate, childEndDate], "创建不能改写草稿中的空字符串合同");
  });
}

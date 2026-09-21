import assert from "node:assert/strict";
import test from "node:test";
import { creationHistoryKey, parseCreationSessions, restoreCreationSession, upsertCreationSession, type CreationSession, type CreationWorkspaceDraft } from "../src/lib/taskCreationSessions.ts";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";
import { creatorCommerceMembers, creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { planTaskCreation } from "../src/lib/taskCreationPlanning.ts";

const draft = (request = "整理发布材料"): CreationWorkspaceDraft => ({ request, planning: null, answers: {}, processes: [], editingBrief: false });
const record = (id: string, updatedAt: number): CreationSession => ({ id, updatedAt, workspace: draft(), clarificationStep: 0, parent: null });

test("同一草稿只更新一条历史，新需求保留之前的记录并按最近活动排序", () => {
  const first = record("first", 100);
  const second = record("second", 200);
  const history = upsertCreationSession([second, first], { ...first, updatedAt: 300, workspace: draft("修改后的需求") });
  assert.deepEqual(history.map(item => item.id), ["first", "second"]);
  assert.equal(history[0].workspace.request, "修改后的需求");
  assert.equal(history[1].workspace.request, "整理发布材料");
  assert.equal(upsertCreationSession(history, { ...record("empty", 400), workspace: draft(" ") }).length, 2);
});

test("历史往返保留补问位置、父任务和实际创建结果", () => {
  const session = { ...record("child", 100), clarificationStep: 1, parent: { parentTaskId: "parent", pathItems: [{ id: "parent", label: "发布会" }] }, created: { mainTaskId: "created", createdCount: 2, taskTitles: ["主任务", "子任务"] } };
  assert.deepEqual(parseCreationSessions(JSON.stringify([session])), { sessions: [session], error: "" });
  assert.notEqual(creationHistoryKey("user-1", "team-1"), creationHistoryKey("user-2", "team-1"));
  assert.notEqual(creationHistoryKey("user-1", "team-1"), creationHistoryKey("user-1", "team-2"));
});

test("恢复中断的历史时停止旧运行，保留已经完成的对话和草稿", () => {
  const session = record("interrupted", 100);
  session.workspace.processes = [{ id: 8, title: "初次生成", request: session.workspace.request, answers: {}, steps: [], activeStep: 0, status: "running" }];
  const restored = restoreCreationSession(session);
  assert.equal(restored.workspace.processes[0].status, "stopped");
  assert.equal(restored.workspace.request, session.workspace.request);
  assert.equal(session.workspace.processes[0].status, "running", "不能改写原记录");
});

test("损坏的存储必须报错，不能冒充空历史或覆盖原数据", () => {
  assert.ok(parseCreationSessions("broken json").error);
  assert.ok(parseCreationSessions(JSON.stringify([{ ...record("broken", 100), workspace: { request: "缺少字段" } }])).error);
  assert.deepEqual(parseCreationSessions(null), { sessions: [], error: "" });
});

test("所有创建阶段的方案、工作量和调整差异均可完整恢复", () => {
  for (const scenario of taskCreationScenarios) {
    const session = record(scenario.id, 100);
    session.workspace.request = scenario.prompt;
    session.workspace.planning = planTaskCreation(scenario.prompt, { currentUserId: "周岚", currentDate: "2026-09-17", members: creatorCommerceMembers, tags: creatorCommerceTags.map(tag => tag.name), existingTasks: workspaceNodes.filter(node => node.kind === "task") });
    session.workspace.processes = [{ id: "adjustment:1", kind: "adjustment", title: "补充需求", request: "增加截止时间", answers: {}, steps: [], activeStep: 0, status: "completed", applicationStatus: "applied", changes: [{ taskId: "task", taskTitle: "任务", label: "截止时间", before: null, after: "2026-09-30" }] }];
    const parsed = parseCreationSessions(JSON.stringify([session]));
    assert.equal(parsed.error, "", scenario.id);
    assert.deepEqual(parsed.sessions[0], session, scenario.id);
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/features/tasks/components/TaskDetail.tsx", import.meta.url), "utf8");

test("详情右侧不再展示投入结果，也不保留手工编辑或 dirty 状态", () => {
  assert.match(source, /<TaskWorkloadSummary\b[\s\S]*?series=\{burnUp\}/);
  assert.doesNotMatch(source, /<TaskWorkloadSummary[^\n]*tasks=\{effortTasks\}/);
  assert.doesNotMatch(source, /<TaskEffortCost/);
  assert.doesNotMatch(source, /TaskEffortField|TaskEffortSummary|\beffortDirty(?:Ref|Message)?\b|\bsetEffortDirty\b|\bhandleEffortDirtyChange\b/);
});

test("现状来源仅接入明确保存的活动，当前显示名不改写负责人ID", () => {
  const start = source.indexOf("  const situation = getTaskSituationModel({");
  const end = source.indexOf("\n  });", start);
  assert.ok(start >= 0 && end > start);
  const captured: Record<string, unknown>[] = [];
  const stored = { id: "stored" };
  const local = { id: "local" };
  const bindings = {
    getTaskSituationModel: (input: Record<string, unknown>) => { captured.push(input); return input; },
    taskId: "task", task: { owner: "user-123" }, confirmedOwnerId: "user-123", currentStatus: "进行中",
    members: [{ id: "user-123", name: "新显示名" }], activities: [{ id: "seed" }],
    localActivities: [local], recordedActivities: [stored], childTasks: [], dependencyTasks: [], dependencyTaskIds: [],
  };
  const compiled = transformSync(source.slice(start, end + 6), { loader: "ts", target: "es2022" }).code;
  new Function(...Object.keys(bindings), compiled)(...Object.values(bindings));
  assert.equal(captured[0].ownerName, "新显示名");
  assert.equal((captured[0].task as { owner: string }).owner, "user-123");
  assert.deepEqual(captured[0].recordedActivities, [local, stored]);
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  assert.ok(app.includes("recordedActivities={taskActivityStore[selectedTaskId] ?? []}"));
});

test("子任务页去掉整体 AI 调整，任务连接仍不混用调整入口", () => {
  assert.doesNotMatch(source, /TaskAiAdjustButton|AI 调整子任务安排|kind: "subtasks"/);
  assert.doesNotMatch(source, /label="AI 调整任务信息"/);
  assert.match(source, /aria-label="连接 AI：当前任务"/);
  assert.doesNotMatch(source, /<TaskSubtaskList[^>]*onAiAdjust=/);
  assert.doesNotMatch(source, /请先确认或取消估算|onDirtyChange=\{handleEffortDirtyChange\}/);
  assert.ok(source.includes("<TaskCurrentSituation"));
  assert.doesNotMatch(source, /<details[^>]*id=\{`task-criteria/);
  assert.doesNotMatch(source, /showDistribution=\{childTasks.length > 0\}/);
});

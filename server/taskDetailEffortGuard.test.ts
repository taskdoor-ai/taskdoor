import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");

// Run the actual component callback bodies with their explicit dependencies, without a DOM or CSS loader.
function handler(name: string, bindings: Record<string, unknown>): (...args: unknown[]) => unknown {
  const start = source.indexOf(`  const ${name} =`);
  assert.ok(start >= 0, `需要可核对的 ${name} 回调`);
  const end = source.indexOf("\n  };", start);
  assert.ok(end > start, `应读取完整的 ${name} 回调`);
  const callback = source.slice(start, end + 5);
  assert.doesNotMatch(callback, /\beffortDirty(?:Ref|Message)?\b/, "只读投入结果不能再设置手工估算门禁");
  const compiled = transformSync(callback, { loader: "ts", target: "es2022" }).code;
  return new Function(...Object.keys(bindings), `${compiled}; return ${name};`)(...Object.values(bindings));
}

test("详情右侧不再展示投入结果，也不保留手工编辑或 dirty 状态", () => {
  assert.match(source, /<TaskWorkloadSummary[^\n]*series=\{burnUp\}/);
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
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(app.includes("recordedActivities={taskActivityStore[selectedTaskId] ?? []}"));
});

test("子任务整体 AI 调整正常打开，不被已移除的手工工时编辑阻断", () => {
  const opened: unknown[] = [];
  const notices: unknown[] = [];
  const aiReturnFocus = { current: null };
  const open = handler("openAiAdjustment", {
    aiAdjustmentContext: {}, onAiAdjustmentApply: () => undefined,
    aiReturnFocus, setAiScope: (scope: unknown) => opened.push(scope), setAiOpen: (value: unknown) => opened.push(value),
    setAiNotice: (notice: unknown) => notices.push(notice), document: { activeElement: null }, HTMLElement: class {},
  });
  const scopes = [{ kind: "subtasks" }];
  for (const scope of scopes) open(scope);
  assert.deepEqual(opened, [scopes[0], true]);
  assert.deepEqual(notices, [""]);
  assert.equal(aiReturnFocus.current, null);
});

test("缺少任务上下文或应用权限时，AI 调整仍不能打开", () => {
  for (const unavailable of [{ aiAdjustmentContext: undefined }, { onAiAdjustmentApply: undefined }]) {
    const opened: unknown[] = [];
    const open = handler("openAiAdjustment", {
      aiAdjustmentContext: {}, onAiAdjustmentApply: () => undefined,
      aiReturnFocus: { current: null }, setAiScope: (scope: unknown) => opened.push(scope), setAiOpen: (value: unknown) => opened.push(value),
      setAiNotice: () => undefined, document: { activeElement: null }, HTMLElement: class {}, ...unavailable,
    });
    open({ kind: "subtasks" });
    assert.deepEqual(opened, [], "移除手工工时门禁不等于扩大修改权限");
  }
});

test("AI 调整等待保存完成后才报告成功", async () => {
  const applied: unknown[] = [];
  const notices: unknown[] = [];
  let completeSave: (() => void) | undefined;
  const saved = new Promise<void>(resolve => { completeSave = resolve; });
  const apply = handler("applyAiAdjustment", {
    onAiAdjustmentApply: async (proposal: unknown) => { applied.push(proposal); await saved; },
    setAiNotice: (notice: unknown) => notices.push(notice),
  });
  const proposal = { additions: [{ id: "first-child" }] };
  const applying = apply(proposal);
  assert.deepEqual(applied, [proposal]);
  assert.deepEqual(notices, [], "保存未完成时不能先报告成功");
  completeSave!();
  await applying;
  assert.deepEqual(notices, ["修改已保存，并记录到任务活动。"]);
});

test("AI 调整缺少应用权限或保存失败时保留错误，不报告成功", async () => {
  for (const [onAiAdjustmentApply, error] of [
    [undefined, /当前任务不可进行 AI 调整/],
    [async () => { throw new Error("保存失败，原候选保留"); }, /保存失败，原候选保留/],
  ] as const) {
    const notices: unknown[] = [];
    const apply = handler("applyAiAdjustment", { onAiAdjustmentApply, setAiNotice: (notice: unknown) => notices.push(notice) });
    await assert.rejects(async () => { await apply({ additions: [] }); }, error);
    assert.deepEqual(notices, []);
  }
});

test("子任务页去掉整体 AI 调整，任务连接仍不混用调整入口", () => {
  assert.doesNotMatch(source, /TaskAiAdjustButton|AI 调整子任务安排|kind: "subtasks"/);
  assert.doesNotMatch(source, /label="AI 调整任务信息"/);
  assert.match(source, /aria-label="连接 AI：当前任务"/);
  assert.doesNotMatch(source, /<TaskSubtaskList[^>]*onAiAdjust=/);
  assert.ok(source.includes("onApply={applyAiAdjustment}"));
  assert.doesNotMatch(source, /请先确认或取消估算|onDirtyChange=\{handleEffortDirtyChange\}/);
  assert.ok(source.includes("<TaskCurrentSituation"));
  assert.doesNotMatch(source, /<details[^>]*id=\{`task-criteria/);
  assert.doesNotMatch(source, /showDistribution=\{childTasks.length > 0\}/);
});

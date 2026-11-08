import assert from "node:assert/strict";
import test from "node:test";
import * as creationProgress from "../src/features/tasks/lib/task-creation-progress.ts";
import { createCreationForm, type CreationForm } from "../src/features/tasks/lib/task-creation-form.ts";

const merge = (...args: any[]): CreationForm => {
  assert.equal(typeof (creationProgress as any).mergeCreationContentSection, "function", "需要按真实到达的内容块合并，而非结束后一次展示");
  return (creationProgress as any).mergeCreationContentSection(...args);
};
const fixture = (): CreationForm => createCreationForm("整理下周例会纪要", { currentUserId: "me", members: [], currentDate: "2026-10-16", timezone: "Asia/Shanghai" }, "single-task");

test("首个目标块可读时，未到达的标准与人员日期仍为空", () => {
  const source = fixture();
  const partial = merge(null, source, "identity");
  assert.equal(partial.mainTask.title, source.mainTask.title);
  assert.equal(partial.mainTask.goal, source.mainTask.goal);
  assert.deepEqual(partial.mainTask.completionCriteria, []);
  assert.equal(partial.mainTask.endDate, "");
  assert.deepEqual(partial.subtasks, []);
});

test("后到标准与属性不覆盖已到内容的手工编辑", () => {
  const source = fixture();
  let partial = merge(null, source, "identity");
  partial.mainTask = { ...partial.mainTask, title: "手工名称", goal: "让成员明确下一步各自推进什么" };
  partial = merge(partial, source, "criteria");
  partial.mainTask.completionCriteria = ["人工限定的一项交付标准"];
  partial = merge(partial, source, "properties");
  assert.equal(partial.mainTask.title, "手工名称");
  assert.equal(partial.mainTask.goal, "让成员明确下一步各自推进什么");
  assert.deepEqual(partial.mainTask.completionCriteria, ["人工限定的一项交付标准"]);
  assert.notEqual(partial.mainTask, source.mainTask);
});

test("新一轮内容不能与旧任务字段混合", () => {
  const old = fixture();
  old.mainTask.clientId = "old";
  old.mainTask.goal = "旧目标";
  const next = fixture();
  const partial = merge(old, next, "criteria");
  assert.equal(partial.mainTask.clientId, next.mainTask.clientId);
  assert.equal(partial.mainTask.goal, "");
  assert.deepEqual(partial.mainTask.completionCriteria, next.mainTask.completionCriteria);
});

import { streamMockCreationContent } from "../src/ai/mock/lib/taskCreationStream.ts";

test("内容传输完成前已有目标块，停止后不再交付后续块", async () => {
  const controller = new AbortController();
  const received: string[] = [];
  let finished = false;
  const completed = await streamMockCreationContent({ stage: "review", form: fixture(), summary: "候选" }, {
    signal: controller.signal, stepMs: 0, charMs: 0, onStep: () => {},
    onContent: section => {
      received.push(section);
      assert.equal(finished, false);
      controller.abort();
    },
  }).then(result => { finished = true; return result; });
  assert.equal(completed, false);
  assert.deepEqual(received, ["identity"]);
});

test("继续生成只交付未到达的块，不覆盖先前已编辑的目标", async () => {
  const received: string[] = [];
  const completed = await streamMockCreationContent({ stage: "review", form: fixture(), summary: "候选" }, {
    signal: new AbortController().signal, stepMs: 0, charMs: 0, completedSections: ["identity"],
    onStep: () => {}, onContent: section => received.push(section),
  });
  assert.equal(completed, true);
  assert.deepEqual([...new Set(received)], ["criteria", "properties"]);
});

test("名称、目标与每条标准按顺序逐字出现，而非整块一起出现", async () => {
  const source = fixture();
  const snapshots: { section: string; title: string; goal: string; criteria: string[] }[] = [];
  const completed = await streamMockCreationContent({ stage: "review", form: source, summary: "候选" }, {
    signal: new AbortController().signal, stepMs: 0, charMs: 1, onStep: () => {},
    onContent: (section, form) => snapshots.push({ section, title: form.mainTask.title, goal: form.mainTask.goal, criteria: [...form.mainTask.completionCriteria] }),
  });
  assert.equal(completed, true);
  const identity = snapshots.filter(snapshot => snapshot.section === "identity");
  assert.ok(identity.length > 2, "名称与目标应分多次逐步出现");
  assert.ok(source.mainTask.title.startsWith(identity[0].title) && identity[0].title.length < source.mainTask.title.length);
  assert.equal(identity[0].goal, "", "名称出完前不出现目标");
  assert.deepEqual({ title: identity.at(-1)!.title, goal: identity.at(-1)!.goal }, { title: source.mainTask.title, goal: source.mainTask.goal });
  const criteria = snapshots.filter(snapshot => snapshot.section === "criteria");
  assert.ok(criteria[0].criteria.length === 1 && criteria[0].criteria[0].length < source.mainTask.completionCriteria[0].length, "第一条标准逐字出现，其余标准尚未出现");
  assert.deepEqual(criteria.at(-1)!.criteria, source.mainTask.completionCriteria);
});

test("聚焦正在出字的字段后立即补全，且后续传输保留该字段的手工内容", async () => {
  const source = fixture();
  const owned = new Set<string>();
  let form: CreationForm | null = null;
  await streamMockCreationContent({ stage: "review", form: source, summary: "候选" }, {
    signal: new AbortController().signal, stepMs: 0, charMs: 1, onStep: () => {},
    isPartCompleted: key => owned.has(key),
    onContent: (section, partial) => {
      form = merge(form, partial, section, owned);
      if (section === "identity" && !owned.has("title") && form.mainTask.title) {
        owned.add("title");
        form = { ...form, mainTask: { ...form.mainTask, title: "手工名称" } };
      }
    },
  });
  assert.equal(form!.mainTask.title, "手工名称");
  assert.equal(form!.mainTask.goal, source.mainTask.goal);
  assert.deepEqual(form!.mainTask.completionCriteria, source.mainTask.completionCriteria);
});

test("必要补问与关系确认不能被作为可创建的内容块交付", async () => {
  const completed = await streamMockCreationContent({ stage: "clarify", request: "活动", scenarioId: "clarify-requirement", questions: [] }, {
    signal: new AbortController().signal, stepMs: 0, charMs: 0,
    onStep: () => {}, onContent: () => assert.fail("补问不能伪装完成草案"),
  });
  assert.equal(completed, true);
});

import { createDraftTaskAiContext, applyDraftTaskAiAdjustment } from "../src/features/tasks/lib/task-ai-adjustment-adapters.ts";
import { buildTaskAiAdjustment } from "../src/ai/task-adjustment.ts";

test("创建草稿禁止拆解，普通修改的预览和应用使用同一权限指纹", () => {
  const form = fixture();
  form.mainTask.endDate = "";
  const context = createDraftTaskAiContext(form, [], "me", "Asia/Shanghai");
  assert.equal(context.canAddSubtasks, false);
  const result = buildTaskAiAdjustment(context, { kind: "task" }, "目标改为让成员明确已作出的决定和下一步行动");
  assert.ok("proposal" in result);
  const applied = applyDraftTaskAiAdjustment(form, context, result.proposal);
  assert.equal(applied.mainTask.goal, "让成员明确已作出的决定和下一步行动");
  assert.equal(applied.mainTask.endDate, "");
  assert.deepEqual(applied.subtasks, []);
});

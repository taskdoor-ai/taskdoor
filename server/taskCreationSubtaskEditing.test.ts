import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test, { beforeEach } from "node:test";
beforeEach(t => t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-08-31T02:00:00Z") }));
import * as creationForm from "../src/lib/taskCreationForm.ts";
import type { CreationForm, CreationTask } from "../src/lib/taskCreationForm.ts";
import { syncCreationSubtaskEdit } from "../src/lib/taskCreationSubtaskEditing.ts";

const members = [{ id: "self" }, { id: "lin" }, { id: "chen" }];
const task = (clientId: string, patch: Partial<CreationTask> = {}): CreationTask => ({
  clientId, title: clientId, goal: "共同完成发布", completionCriteria: ["交付经确认的结果"],
  executionTips: [], ownerId: "self", participantIds: ["lin"], labels: ["发布准备"],
  startDate: "", endDate: "2026-09-10", dependsOnClientIds: [],
  iconName: "briefcase", iconTone: "pink", ...patch,
});
const form = (): CreationForm => ({
  request: "用户的原始需求", decision: "independent", mainTask: task("main"),
  subtasks: [task("first"), task("second")],
});

test("完整子任务编辑复用独立的单任务校验", () => {
  assert.equal(typeof creationForm.validateCreationTask, "function", "应导出单任务校验，不以整张创建表单阻断局部同步");
});

test("完整子任务编辑提供不写持久层的同步函数", async () => {
  assert.ok(existsSync(new URL("../src/lib/taskCreationSubtaskEditing.ts", import.meta.url)), "应提供完整子任务草稿同步模块");
  const editing = await import("../src/lib/taskCreationSubtaskEditing.ts");
  assert.equal(typeof editing.syncCreationSubtaskEdit, "function");
});

test("整对象同步名称、多条标准、人选、日期、依赖和建议，并保留原字段", () => {
  const source = form();
  const original = structuredClone(source);
  const expected = structuredClone(source.subtasks[0]);
  const edited: CreationTask = {
    ...structuredClone(expected), title: "  确认发布场地  ", completionCriteria: ["  合同经审核  ", "", "  \n  "],
    ownerId: "chen", participantIds: ["self", "lin"], startDate: "", endDate: "",
    dependsOnClientIds: ["second"], executionTips: ["  先确认预算  ", "  ", "记录验收结论"],
  };
  const input = structuredClone(edited);
  const next = syncCreationSubtaskEdit(source, edited, expected, members);
  assert.notEqual(next, source);
  assert.deepEqual(next.subtasks[0], edited, "输入中的空白和空行原样进入草稿");
  assert.equal(next.subtasks[0].endDate, "", "不补默认日期");
  assert.deepEqual(source, original);
  assert.deepEqual(edited, input);
  edited.participantIds.push("later");
  edited.labels.push("later");
  edited.dependsOnClientIds.push("later");
  assert.deepEqual(next.subtasks[0].participantIds, ["self", "lin"]);
  assert.deepEqual(next.subtasks[0].labels, ["发布准备"]);
  assert.deepEqual(next.subtasks[0].dependsOnClientIds, ["second"]);
});

test("同步合并到最新表单，保留其他任务的更新与重排，并保留本次目标输入", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  const latest: CreationForm = {
    ...source, request: "后来完善的需求", mainTask: { ...source.mainTask, goal: "  更新后的共同目标  " },
    subtasks: [{ ...source.subtasks[1], title: "其他任务的新名称" }, source.subtasks[0]],
  };
  const next = syncCreationSubtaskEdit(latest, { ...expected, title: "当前编辑的名称", goal: "子任务独立目标" }, expected, members);
  assert.equal(next.mainTask, latest.mainTask);
  assert.equal(next.subtasks[0], latest.subtasks[0]);
  assert.equal(next.request, latest.request);
  assert.equal(next.subtasks[1].clientId, expected.clientId);
  assert.equal(next.subtasks[1].title, "当前编辑的名称");
  assert.equal(next.subtasks[1].goal, "子任务独立目标");
});

test("局部同步不被其他尚未填写名称和标准的任务阻断", () => {
  const source = form();
  source.mainTask.title = "";
  source.mainTask.completionCriteria = [];
  source.subtasks[1].title = "";
  source.subtasks[1].completionCriteria = [];
  const expected = structuredClone(source.subtasks[0]);
  const next = syncCreationSubtaskEdit(source, { ...expected, title: "已经填写好的子任务" }, expected, members);
  assert.equal(next.subtasks[0].title, "已经填写好的子任务");
  assert.equal(next.subtasks[1], source.subtasks[1]);
});

test("同一任务任意字段被其他操作更新时拒绝整对象覆盖", () => {
  const patches: Partial<CreationTask>[] = [
    { title: "AI 新名称" }, { goal: "更新的继承目标" }, { ownerId: "chen" }, { participantIds: ["chen"] },
    { completionCriteria: ["AI 新标准"] }, { executionTips: ["AI 新建议"] }, { startDate: "2026-09-01" },
    { endDate: "" }, { dependsOnClientIds: ["second"] }, { labels: ["新标签"] }, { iconName: "target" }, { iconTone: "blue" },
    { effortEstimate: { minutes: null, workMethod: "", basis: "unknown", reason: "", confirmed: false, scopeKey: "", version: 1 } },
  ];
  for (const patch of patches) {
    const source = form();
    const expected = structuredClone(source.subtasks[0]);
    source.subtasks[0] = { ...source.subtasks[0], ...patch };
    const original = structuredClone(source);
    assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, title: "旧草稿名称" }, expected, members), /已.*更新|已.*变化|最新/);
    assert.deepEqual(source, original);
  }
});

test("每次同步的结果可作为下一次输入的快照，但旧快照不能覆盖连续输入", () => {
  let latest = form();
  const firstExpected = structuredClone(latest.subtasks[0]);
  for (const title of ["", "新", "新名称 "]) {
    const expected = structuredClone(latest.subtasks[0]);
    latest = syncCreationSubtaskEdit(latest, { ...expected, title }, expected, members);
    assert.equal(latest.subtasks[0].title, title);
  }
  assert.equal(creationForm.validateCreationForm(latest, members), null);
  assert.throws(() => syncCreationSubtaskEdit(latest, { ...firstExpected, title: "旧输入" }, firstExpected, members), /更新|最新/);
});

test("主目标正在编辑为空时不覆盖子任务目标，最终创建仍拦截空主目标", () => {
  const source = form();
  source.mainTask.goal = " \n ";
  const expected = structuredClone(source.subtasks[0]);
  const next = syncCreationSubtaskEdit(source, { ...expected, title: "新名称" }, expected, members);
  assert.equal(next.subtasks[0].goal, expected.goal);
  assert.equal(creationForm.validateCreationForm(next, members), "请补充任务目标。");
});

test("关联父任务时仍保留子任务自己的目标编辑", () => {
  const source: CreationForm = { ...form(), decision: "attach", candidate: { id: "parent", goal: "  当前父任务目标  " } };
  const expected = structuredClone(source.subtasks[0]);
  const next = syncCreationSubtaskEdit(source, { ...expected, goal: "旧目标" }, expected, members);
  assert.equal(next.subtasks[0].goal, "旧目标");
  assert.equal(next.candidate, source.candidate);
});

test("任务已经被移除时不将旧草稿重新插入列表", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  const latest = creationForm.removeCreationSubtask(source, expected.clientId);
  assert.throws(() => syncCreationSubtaskEdit(latest, { ...expected, title: "旧编辑" }, expected, members), /不存在|已.*移除|已.*删除/);
  assert.equal(latest.subtasks.length, 1);
});

test("编辑对象标识与打开时快照不一致时拒绝跨任务同步", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, clientId: "second" }, expected, members), /标识|当前子任务|不一致/);
});

test("子任务同步接受输入中的空名称，由最终创建校验拦截", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  for (const title of ["", "  ", "\n\t"]) {
    const next = syncCreationSubtaskEdit(source, { ...expected, title }, expected, members);
    assert.equal(next.subtasks[0].title, title);
    assert.match(creationForm.validateCreationForm(next, members) ?? "", /子任务 1.*名称/);
  }
});

test("子任务同步保留零条标准和多行空白，最终创建要求补全或删除空白行", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  for (const completionCriteria of [[], [""], ["  \n  ", "\t"]]) {
    const next = syncCreationSubtaskEdit(source, { ...expected, completionCriteria }, expected, members);
    assert.deepEqual(next.subtasks[0].completionCriteria, completionCriteria);
    assert.match(creationForm.validateCreationForm(next, members) ?? "", /子任务 1.*完成标准/);
  }
  const next = syncCreationSubtaskEdit(source, { ...expected, completionCriteria: ["已确认交付", " "] }, expected, members);
  assert.deepEqual(next.subtasks[0].completionCriteria, ["已确认交付", " "]);
  assert.match(creationForm.validateCreationForm(next, members) ?? "", /子任务 1.*第 2 条完成标准为空/);
});

test("同步时重新验证负责人和参与人仍在当前成员列表", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, title: "", ownerId: "removed" }, expected, members), /子任务 1.*负责人/);
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, completionCriteria: [], participantIds: ["removed"] }, expected, members), /子任务 1.*参与人/);
  assert.throws(() => syncCreationSubtaskEdit(source, expected, expected, [{ id: "lin" }]), /负责人/);
});

test("同步允许负责人待定和不设截止时间，但拒绝过去截止日期", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  const next = syncCreationSubtaskEdit(source, { ...expected, ownerId: "", participantIds: [], startDate: "", endDate: "" }, expected, []);
  assert.equal(next.subtasks[0].ownerId, "");
  assert.equal(next.subtasks[0].endDate, "");
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, endDate: "2020-01-01" }, expected, members), /截止.*创建/);
});

test("同步拒绝不存在的日期、非法格式和颠倒的开始截止时间", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  const dates = [{ endDate: "2026-02-30" }, { startDate: "2026-2-1" }, { startDate: "2026-09-11", endDate: "2026-09-10" }];
  for (const patch of dates) assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, title: "", ...patch }, expected, members), /日期/);
});

test("同步拒绝自环及当前全图形成的循环依赖", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, dependsOnClientIds: ["first"] }, expected, members), /依赖/);
  source.subtasks[1] = { ...source.subtasks[1], dependsOnClientIds: ["first"] };
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, dependsOnClientIds: ["second"] }, expected, members), /循环|依赖/);
});

test("同步拒绝失效依赖和重复的稳定标识", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, title: "", dependsOnClientIds: ["missing"] }, expected, members), /依赖/);
  const duplicate = { ...source, subtasks: [...source.subtasks, structuredClone(source.subtasks[1])] };
  assert.throws(() => syncCreationSubtaskEdit(duplicate, expected, expected, members), /依赖/);
});

test("输入不完整不跳过估算校验，也不为旧草稿补造估算", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  const effortEstimate: NonNullable<CreationTask["effortEstimate"]> = {
    minutes: -1, workMethod: "人工", basis: "manual", reason: "按步骤估算", confirmed: false, scopeKey: "scope", version: 1,
  };
  assert.throws(() => syncCreationSubtaskEdit(source, { ...expected, completionCriteria: [], effortEstimate }, expected, members), /预计投入/);
  const next = syncCreationSubtaskEdit(source, { ...expected, title: "", completionCriteria: [""] }, expected, members);
  assert.equal(next.subtasks[0].effortEstimate, undefined);
});

test("编辑中前置任务已被删除时不能同步悬空引用", () => {
  const source = form();
  const expected = structuredClone(source.subtasks[0]);
  const latest = creationForm.removeCreationSubtask(source, "second");
  assert.throws(() => syncCreationSubtaskEdit(latest, { ...expected, dependsOnClientIds: ["second"] }, expected, members), /失效|依赖/);
});

test("删除前置任务清理已同步引用后，旧的关联草稿也不可覆盖最新对象", () => {
  const source = form();
  source.subtasks[0].dependsOnClientIds = ["second"];
  const expected = structuredClone(source.subtasks[0]);
  const latest = creationForm.removeCreationSubtask(source, "second");
  assert.deepEqual(latest.subtasks[0].dependsOnClientIds, []);
  assert.throws(() => syncCreationSubtaskEdit(latest, { ...expected, title: "旧名称" }, expected, members), /更新|变化|最新/);
});

test("单任务最终校验保留缺少字段文案并指出空白标准行", () => {
  assert.equal(creationForm.validateCreationTask(task("first", { title: " " }), members, "子任务 2"), "请补充子任务 2名称。");
  assert.equal(creationForm.validateCreationTask(task("first", { completionCriteria: [" "], goal: "" }), members, "子任务 2"), "请补充子任务 2的完成标准。");
  assert.match(creationForm.validateCreationTask(task("first", { completionCriteria: ["有效标准", " "], goal: "" }), members) ?? "", /第 2 条完成标准为空/);
});

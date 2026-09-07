import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode, WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { createDraftTaskAiContext, applyDraftTaskAiAdjustment, createSavedTaskAiContext, applySavedTaskAiAdjustment, commitTaskAiStorage } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { buildTaskAiAdjustment } from "../src/lib/taskAiAdjustment.ts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentScope } from "../src/lib/taskAiAdjustmentTypes.ts";
import { newCreationTask, type CreationForm } from "../src/lib/taskCreationForm.ts";

const members = [{ id: "self", name: "我" }, { id: "lin", name: "林洁" }];
const form = (): CreationForm => ({
  request: "用户原需求", decision: "independent", mainTask: newCreationTask({ title: "发布计划", goal: "按期上线", completionCriteria: ["发布验收通过"], executionTips: ["先确认范围"], ownerId: "self", participantIds: ["lin"], labels: ["高优先级"], startDate: "2026-08-31", endDate: "2026-09-20" }),
  subtasks: [newCreationTask({ title: "确认场地", goal: "按期上线", completionCriteria: ["场地合同已确认"], ownerId: "lin", participantIds: [], labels: [], startDate: "", endDate: "2026-09-10" })],
});
const nodes = (): WorkspaceNode[] => [
  { id: "root", kind: "folder", parentId: null, name: "任务", updatedAt: "今天" },
  { id: "task", kind: "task", parentId: "root", name: "发布计划", goal: "按期上线", completionCriteria: ["发布验收通过"], executionTips: ["先确认范围"], ownerId: "self", participantIds: ["lin"], status: "进行中", labels: ["高优先级"], plannedEndOn: "2026-09-20", dueAt: "9 月 20 日", updatedAt: "昨天" },
  { id: "child", kind: "task", parentId: "root", parentTaskId: "task", name: "确认场地", goal: "按期上线", completionCriteria: ["场地合同已确认"], ownerId: "lin", status: "待开始", plannedEndOn: "2026-09-10", updatedAt: "昨天" },
];
const proposal = (context: TaskAiAdjustmentContext, instruction: string, scope: TaskAiAdjustmentScope = { kind: "task" }) => {
  const result = buildTaskAiAdjustment(context, scope, instruction);
  assert.ok("proposal" in result, "error" in result ? result.error : "");
  return result.proposal;
};

test("草稿应用只更新指定字段，保留人工内容、稳定ID与归属，不触发保存", () => {
  const base = form(); const original = structuredClone(base);
  const context = createDraftTaskAiContext(base, members, "self");
  const next = applyDraftTaskAiAdjustment(base, context, proposal(context, "任务名称改为新品上线计划"));
  assert.equal(next.mainTask.title, "新品上线计划");
  assert.equal(next.mainTask.clientId, base.mainTask.clientId);
  assert.deepEqual(next.mainTask.labels, base.mainTask.labels);
  assert.deepEqual(next.subtasks, base.subtasks);
  assert.equal(next.request, base.request);
  assert.deepEqual(base, original);
});

test("草稿人工编辑后拒绝旧预览，修改指令不能冒充预览结果", () => {
  const base = form(); const context = createDraftTaskAiContext(base, members, "self");
  const planned = proposal(context, "任务名称改为新版计划");
  assert.throws(() => applyDraftTaskAiAdjustment({ ...base, mainTask: { ...base.mainTask, goal: "新的人工目标" } }, context, planned), /变化|过期|重新/);
  assert.throws(() => applyDraftTaskAiAdjustment(base, context, { ...planned, updates: [{ taskId: base.subtasks[0].clientId, patch: { title: "越界" } }] }), /预览|范围|不一致/);
});

test("关联创建锁定继承目标，不可通过模块新增另一层任务", () => {
  const base = form(); base.subtasks = []; base.decision = "attach";
  base.candidate = { id: "parent", name: "父任务", ownerId: "self", status: "进行中", goal: "父任务真实目标" };
  const context = createDraftTaskAiContext(base, members, "self");
  assert.equal(context.task.goal, "父任务真实目标");
  assert.equal(context.task.goalInherited, true);
  assert.equal(context.canAddSubtasks, false);
});

test("已创建任务只保存真实标准，不把详情示例标准转为真实数据", () => {
  const base = nodes(); delete (base[1] as TaskNode).completionCriteria;
  const context = createSavedTaskAiContext(base, "task", members, "self")!;
  assert.deepEqual(context.task.completionCriteria, []);
  const next = applySavedTaskAiAdjustment(base, context, proposal(context, "增加完成标准：数据已经核对"), { author: "我" });
  assert.deepEqual((next.nodes[1] as TaskNode).completionCriteria, ["数据已经核对"]);
  assert.equal((next.nodes[1] as TaskNode).status, "进行中");
  assert.equal(next.activities.task[0].type, "task-definition-change");
  assert.equal(next.activities.task[0].changes?.[0].before, null);
  assert.deepEqual(next.nodes[2], base[2]);
});

test("详情修改负责人生成待接受提议，保留正式Owner和参与人", () => {
  const base = nodes(); const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const next = applySavedTaskAiAdjustment(base, context, proposal(context, "负责人改为林洁"), { author: "我" });
  const task = next.nodes[1] as TaskNode;
  assert.equal(task.ownerId, "self");
  assert.equal(task.proposedOwnerId, "lin");
  assert.deepEqual(task.participantIds, ["lin"]);
  assert.match(next.activities.task[0].changes?.[0].after ?? "", /待接受/);
});

test("显式新增保存为当前任务的子任务，不复制主任务、状态或历史", () => {
  const base = nodes(); const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const planned = proposal(context, "添加子任务：现场彩排；完成标准：彩排问题均已关闭", { kind: "subtasks" });
  const next = applySavedTaskAiAdjustment(base, context, planned, { author: "我" });
  assert.equal(next.nodes.length, base.length + 1);
  const added = next.nodes.at(-1) as TaskNode;
  assert.equal(added.parentTaskId, "task");
  assert.equal(added.goal, "按期上线");
  assert.equal(added.status, "待开始");
  assert.equal(added.ownerId, "");
  assert.deepEqual(added.completionCriteria, ["彩排问题均已关闭"]);
  assert.equal(added.id, planned.additions[0].id);
  assert.deepEqual(next.nodes.slice(0, base.length), base);
  assert.ok(next.activities.task.length);
});

test("AI 新增子任务继承已保存主任务的团队边界", () => {
  const base = nodes().map((node) => node.kind === "task" ? { ...node, teamId: "platform" } : node);
  const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const planned = proposal(context, "添加子任务：核对发布门禁；完成标准：门禁结论已签发", { kind: "subtasks" });
  const next = applySavedTaskAiAdjustment(base, context, planned, { author: "我" });
  const added = next.nodes.at(-1) as TaskNode;
  assert.equal(added.parentTaskId, "task");
  assert.equal(added.teamId, "platform");
});

test("保存前发现字段变化或任务移走，拒绝过期候选", () => {
  const base = nodes(); const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const planned = proposal(context, "任务名称改为新版计划");
  const changed = base.map(node => node.id === "task" ? { ...node, name: "其他人改了名称" } : node);
  assert.throws(() => applySavedTaskAiAdjustment(changed, context, planned, { author: "我" }), /变化|过期|重新/);
  assert.throws(() => applySavedTaskAiAdjustment(base.filter(node => node.id !== "task"), context, planned, { author: "我" }), /不存在|变化|重新/);
});

test("单子任务修改前置依赖使用实际ID，名称修改不破坏引用", () => {
  const base = nodes(); base.push({ id: "other", kind: "task", parentId: "root", parentTaskId: "task", name: "现场彩排", goal: "按期上线", ownerId: "", completionCriteria: ["通过"], status: "待开始", updatedAt: "今天" });
  const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const next = applySavedTaskAiAdjustment(base, context, proposal(context, "前置依赖改为「确认场地」", { kind: "subtask", taskId: "other" }), { author: "我" });
  assert.deepEqual((next.nodes.at(-1) as TaskNode).dependsOnTaskIds, ["child"]);
  assert.equal(next.activities.other[0].changes?.[0].after, "确认场地");
});

test("本地成组保存失败回滚此前成功的键，不删除其他数据", () => {
  const data = new Map([ ["nodes", "old-nodes"], ["log", "old-log"], ["other", "keep"] ]);
  let fail = true;
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (key === "log" && fail) { fail = false; throw new Error("quota"); } data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  assert.throws(() => commitTaskAiStorage(storage, [["nodes", "new-nodes"], ["log", "new-log"]]), /保存|存储/);
  assert.equal(data.get("nodes"), "old-nodes"); assert.equal(data.get("log"), "old-log"); assert.equal(data.get("other"), "keep");
  commitTaskAiStorage(storage, [["nodes", "new-nodes"], ["log", "new-log"]]);
  assert.equal(data.get("nodes"), "new-nodes"); assert.equal(data.get("log"), "new-log");
});

test("只改legacy来源截止日期时，未请求的开始日期不丢失", () => {
  const base = nodes();
  const raw = base[1] as TaskNode;
  delete raw.plannedStartOn; delete raw.plannedEndOn;
  const effectiveNodes = base.map(node => node.id === "task" ? { ...node, plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-12" } : node);
  const context = createSavedTaskAiContext(effectiveNodes, "task", members, "self")!;
  const planned = proposal(context, "截止时间改为2026-09-15");
  assert.equal(planned.changes.length, 1);
  const next = applySavedTaskAiAdjustment(base, context, planned, { author: "我", effectiveNodes });
  assert.equal((next.nodes[1] as TaskNode).plannedStartOn, "2026-09-01");
  assert.equal((next.nodes[1] as TaskNode).plannedEndOn, "2026-09-15");
});

test("新增子任务ID不能与文件夹等非任务对象碰撞", () => {
  const base = nodes(); const context = createSavedTaskAiContext(base, "task", members, "self")!;
  const planned = proposal(context, "添加子任务：现场彩排；完成标准：彩排问题均已关闭", { kind: "subtasks" });
  const originalId = planned.additions[0].id;
  planned.additions[0].id = "root";
  planned.changes = planned.changes.map(change => change.taskId === originalId ? { ...change, taskId: "root" } : change);
  assert.throws(() => applySavedTaskAiAdjustment(base, context, planned, { author: "我" }), /标识|使用|冲突/);
});

test("上下文保留真实主任务与祖先日期，独立打开子任务不能越过层级约束", () => {
  const base = nodes(); const context = createSavedTaskAiContext(base, "child", members, "self")!;
  assert.equal(context.task.parentTaskId, "task");
  assert.equal(context.dependencyTasks.find(task => task.id === "task")?.endDate, "2026-09-20");
  assert.ok("error" in buildTaskAiAdjustment(context, { kind: "task" }, "前置依赖改为「发布计划」"));
  assert.ok("error" in buildTaskAiAdjustment(context, { kind: "task" }, "截止时间改为2026-09-21"));
});

test("关联创建将已有主任务截止日纳入上下文，但不猜测未知日期", () => {
  const base = form(); base.subtasks = []; base.decision = "attach";
  base.candidate = { id: "parent", name: "父任务", ownerId: "self", status: "进行中", goal: "父任务目标", plannedEndOn: "2026-09-15" };
  const context = createDraftTaskAiContext(base, members, "self");
  assert.equal(context.task.parentTaskId, "parent");
  assert.equal(context.dependencyTasks.find(task => task.id === "parent")?.endDate, "2026-09-15");
  assert.ok("error" in buildTaskAiAdjustment(context, { kind: "task" }, "截止时间改为2026-09-16"));
});

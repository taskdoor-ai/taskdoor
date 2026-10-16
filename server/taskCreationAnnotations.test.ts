import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskAiCreationAdjustment, getTaskAiContextSignature } from "../src/ai/mock/lib/taskAiAdjustment.ts";
import { getCreationAnnotationValue, isCreationAnnotationStale } from "../src/features/tasks/lib/task-creation-annotations.ts";
import type { TaskCreationAnnotation, TaskCreationAnnotationTarget } from "../src/features/tasks/lib/task-creation-annotations.ts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProposal, TaskAiAdjustmentResult, TaskAiEditableTask } from "../src/features/tasks/lib/task-ai-adjustment-types.ts";

import { buildTaskAiCreationAnnotationAdjustment as adjust } from "../src/ai/mock/lib/taskCreationAnnotationAdjustment.ts";
import { applyDraftTaskAiAdjustment, createDraftTaskAiContext } from "../src/features/tasks/lib/task-ai-adjustment-adapters.ts";
import { newCreationTask, validateCreationForm, type CreationForm } from "../src/features/tasks/lib/task-creation-form.ts";

const task = (overrides: Partial<TaskAiEditableTask> = {}): TaskAiEditableTask => ({
  id: "main", title: "产品发布", goal: "客户了解产品用途", completionCriteria: ["提交活动方案", "核对物料清单", "保存确认记录"],
  executionTips: ["先确认场地"], ownerId: "member-a", participantIds: ["member-b", "member-c"],
  startDate: "", endDate: "", dependsOnTaskIds: [], ...overrides,
});
const context = (overrides: Partial<TaskAiAdjustmentContext> = {}): TaskAiAdjustmentContext => ({
  mode: "draft", currentUserId: "member-a", task: task(),
  subtasks: [task({ id: "child-a", parentTaskId: "main", title: "确认场地" }), task({ id: "child-b", parentTaskId: "main", title: "确认场地" })],
  members: [{ id: "member-a", name: "周岚" }, { id: "member-b", name: "陈默" }, { id: "member-c", name: "林洁" }],
  dependencyTasks: [], canAddSubtasks: true, ...overrides,
});
const annotation = (source: TaskAiAdjustmentContext, target: TaskCreationAnnotationTarget, instruction: string): TaskCreationAnnotation => {
  const value = getCreationAnnotationValue(source, target);
  assert.ok(value);
  const selected = [source.task, ...source.subtasks].find(item => item.id === target.taskId)!;
  return { id: `note-${target.taskId}-${target.field}-${target.criterionIndex ?? "all"}`, target, taskTitle: selected.title, ...value, instruction };
};
const proposal = (result: TaskAiAdjustmentResult): TaskAiAdjustmentProposal => {
  assert.ok("proposal" in result, "error" in result ? result.error : "应返回候选");
  return result.proposal;
};
const reject = (result: TaskAiAdjustmentResult, message?: RegExp): string => {
  assert.ok("error" in result, "错误意见不能返回部分可应用候选");
  assert.equal("proposal" in result, false);
  if (message) assert.match(result.error, message);
  return result.error;
};
function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

test("主任务和同名子任务按稳定 ID 分别调整，重排不改变标注目标", () => {
  const source = context({ task: task({ title: "确认场地" }) });
  const notes = [annotation(source, { taskId: "main", field: "title" }, "改成：统筹发布"), annotation(source, { taskId: "child-b", field: "goal" }, "修改为：容量符合报名人数")];
  source.subtasks.reverse();
  const before = structuredClone(source);
  const next = proposal(adjust(freezeDeep(source), freezeDeep(notes)));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { title: "统筹发布" } }, { taskId: "child-b", patch: { goal: "容量符合报名人数" } }]);
  assert.deepEqual(source, before);
  assert.equal(next.baseSignature, getTaskAiContextSignature(source));
  assert.deepEqual(next.additions, []);
});

test("同一任务的多条完成标准各改对应行并保留未标注行", () => {
  const source = context();
  const next = proposal(adjust(source, [
    annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 0 }, "改为：提交通过确认的活动方案"),
    annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 1 }, "完成标准改为：物料数量与清单一致"),
  ]));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { completionCriteria: ["提交通过确认的活动方案", "物料数量与清单一致", "保存确认记录"] } }]);
  assert.equal(next.changes.length, 1);
  assert.equal(next.changes[0].before, source.task.completionCriteria.join("\n"));
  assert.equal(next.changes[0].after, "提交通过确认的活动方案\n物料数量与清单一致\n保存确认记录");
});

test("优化单条完成标准只增强该行，整组重新生成继续使用已有能力", () => {
  const source = context();
  const line = proposal(adjust(source, [annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 1 }, "优化完成标准")]));
  assert.equal(line.updates[0].patch.completionCriteria?.[0], source.task.completionCriteria[0]);
  assert.equal(line.updates[0].patch.completionCriteria?.[2], source.task.completionCriteria[2]);
  assert.match(line.updates[0].patch.completionCriteria![1], /核对物料清单.*可追溯/);
  const whole = proposal(adjust(source, [annotation(source, { taskId: "main", field: "completionCriteria" }, "重新生成完成标准")]));
  assert.deepEqual(whole.updates[0].patch, proposal(buildTaskAiCreationAdjustment(source, "重新生成完成标准")).updates[0].patch);
});

test("标注选定字段不会借完整命令修改别的字段，失败原子性保留全部原文", () => {
  const source = context();
  const notes = [annotation(source, { taskId: "main", field: "title" }, "改为：新发布名称"), annotation(source, { taskId: "child-a", field: "goal" }, "负责人改为林洁")];
  const before = structuredClone({ source, notes });
  reject(adjust(freezeDeep(source), freezeDeep(notes)), /第\s*2\s*条|标注.*目标/);
  assert.deepEqual({ source, notes }, before);
  reject(adjust(context(), [annotation(context(), { taskId: "main", field: "goal" }, "负责人改为周岚")]), /目标/);
});

test("任意自由意见给出所选字段可修正格式，不伪装生成了结果", () => {
  const source = context();
  const note = annotation(source, { taskId: "main", field: "goal" }, "我觉得这一块不太对，请更贴合业务");
  const message = reject(adjust(source, [note]), /目标.*改为|改为.*目标/);
  assert.match(message, /保留|保持不变/);
  assert.equal(note.instruction, "我觉得这一块不太对，请更贴合业务");
});

test("任何过期标注、已删除目标或无效完成标准索引都阻止整批候选", () => {
  for (const mutation of [
    (source: TaskAiAdjustmentContext) => { source.task.goal = "人工新目标"; },
    (source: TaskAiAdjustmentContext) => { source.subtasks = source.subtasks.filter(item => item.id !== "child-b"); },
    (source: TaskAiAdjustmentContext) => { source.task.completionCriteria.reverse(); },
  ]) {
    const source = context();
    const notes = [annotation(source, { taskId: "main", field: "title" }, "改为：新标题"), annotation(source, { taskId: "main", field: "goal" }, "改为：新目标"), annotation(source, { taskId: "child-b", field: "goal" }, "改为：子目标"), annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 0 }, "改为：新标准")];
    mutation(source);
    assert.ok(notes.some(note => isCreationAnnotationStale(source, note)));
    const before = structuredClone(source);
    reject(adjust(source, notes), /过期|失效|已变化|重新标注/);
    assert.deepEqual(source, before);
  }
  const source = context();
  const invalid = annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 0 }, "改为：新标准");
  invalid.target.criterionIndex = 99;
  reject(adjust(source, [invalid]), /失效|过期|无效/);
});

test("多条相同字段按意见顺序处理，差异从原值合并到最终值", () => {
  const source = context();
  const notes = [annotation(source, { taskId: "main", field: "title" }, "改为：中间名称"), annotation(source, { taskId: "main", field: "goal" }, "目标改为最终目标"), annotation(source, { taskId: "main", field: "title" }, "改成：最终名称")];
  const next = proposal(adjust(source, notes));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { title: "最终名称", goal: "最终目标" } }]);
  assert.equal(next.changes.length, 2);
  assert.deepEqual(next.changes.find(change => change.label === "任务名称"), { taskId: "main", taskTitle: "产品发布", label: "任务名称", before: "产品发布", after: "最终名称" });
});

test("参与人只接受精确成员列表和无，负责人参与人去重可见且不扩改其他字段", () => {
  const source = context();
  const next = proposal(adjust(source, [annotation(source, { taskId: "main", field: "participantIds" }, "改为：周岚、陈默、member-c、陈默"), annotation(source, { taskId: "main", field: "ownerId" }, "负责人改为陈默")]));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { ownerId: "member-b", participantIds: ["member-c"] } }]);
  assert.deepEqual(next.changes.map(change => change.label).sort(), ["负责人", "参与人"].sort());
  assert.equal(next.changes.find(change => change.label === "参与人")?.before, "陈默、林洁");
  assert.equal(next.changes.find(change => change.label === "参与人")?.after, "林洁");
  const clear = proposal(adjust(source, [annotation(source, { taskId: "main", field: "participantIds" }, "参与人改为无")]));
  assert.deepEqual(clear.updates, [{ taskId: "main", patch: { participantIds: [] } }]);
  reject(adjust(source, [annotation(source, { taskId: "main", field: "participantIds" }, "改为：陈默、陌生人")]), /精确|未找到/);
  source.members.push({ id: "other", name: "陈默" });
  reject(adjust(source, [annotation(source, { taskId: "main", field: "participantIds" }, "改为：陈默")]), /同名|唯一.*ID/);
  assert.deepEqual(proposal(adjust(source, [annotation(source, { taskId: "main", field: "participantIds" }, "改为：member-b")])).updates[0].patch, { participantIds: ["member-b"] });
});

test("最后处理一条补充要求并保留原始上下文签名，补充失败不给部分候选", () => {
  const source = freezeDeep(context());
  const notes = [annotation(source, { taskId: "main", field: "goal" }, "改为：新主目标"), annotation(source, { taskId: "child-b", field: "title" }, "改为：确定容量")];
  const next = proposal(adjust(source, notes, "子任务「确定容量」：增加完成标准：容量覆盖报名人数"));
  assert.equal(next.baseSignature, getTaskAiContextSignature(source));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { goal: "新主目标" } }, { taskId: "child-b", patch: { title: "确定容量", completionCriteria: [...source.subtasks[1].completionCriteria, "容量覆盖报名人数"] } }]);
  assert.match(next.instruction, /新主目标/);
  assert.match(next.instruction, /补充要求.*确定容量/);
  reject(adjust(source, notes, "把所有任务都分配给林洁"), /补充要求/);
});

test("补充命令覆盖标注时只显示原值到最终值，恢复原值不产生重复候选", () => {
  const source = context();
  const note = annotation(source, { taskId: "main", field: "title" }, "改为：中间名称");
  const restored = proposal(adjust(source, [note], "任务名称改为产品发布"));
  assert.deepEqual(restored.updates, []);
  assert.deepEqual(restored.changes, []);
});

test("单行完成标准不接受多条替换或借增加命令越界修改整组", () => {
  const source = context();
  for (const instruction of ["改为：A；B", "增加完成标准：新增行"]) {
    reject(adjust(source, [annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 1 }, instruction)]), /单条|该条|所选|一条/);
  }
});

test("非法模式、重复稳定 ID 与无效目标字段不能返回候选", () => {
  const source = context();
  const note = annotation(source, { taskId: "main", field: "goal" }, "改为：新目标");
  reject(adjust({ ...source, mode: "saved" }, [note]), /草稿/);
  const duplicate = context();
  duplicate.subtasks[0].id = duplicate.task.id;
  reject(adjust(duplicate, [note]), /ID|标识/);
  reject(adjust(source, [{ ...note, target: { taskId: "main", field: "executionTips" as TaskCreationAnnotationTarget["field"] } }]), /字段|失效|无效/);
});


test("已有完整命令允许空白，标注候选 metadata 与未标注字段隔离", () => {
  const source = context();
  const notes = [annotation(source, { taskId: "main", field: "completionCriteria" }, "完成标准改为 ：A；B"), annotation(source, { taskId: "child-b", field: "endDate" }, "改为：2099-11-01")];
  const snapshot = structuredClone(source);
  const next = proposal(adjust(source, notes, "  任务名称改为新名称  "));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { completionCriteria: ["A", "B"], title: "新名称" } }, { taskId: "child-b", patch: { endDate: "2099-11-01" } }]);
  assert.deepEqual(next.annotations, notes);
  assert.notEqual(next.annotations, notes);
  assert.notEqual(next.annotations![0].target, notes[0].target);
  assert.equal(next.supplementalInstruction, "  任务名称改为新名称  ");
  assert.deepEqual(next.scope, { kind: "task" });
  assert.deepEqual(source, snapshot);
  next.annotations![0].instruction = "调用者自己的修改";
  next.updates[0].patch.completionCriteria!.push("调用者自己的候选修改");
  assert.equal(notes[0].instruction, "完成标准改为 ：A；B");
  assert.deepEqual(source, snapshot);
});


const creationForm = (): CreationForm => ({
  request: "筹备产品发布", decision: "independent",
  mainTask: newCreationTask({ title: "产品发布", goal: "人工确认的业务目标", completionCriteria: ["提交活动方案", "保留人工确认的物料要求"], executionTips: ["人工安排先检查场地"], ownerId: "member-a", participantIds: ["member-b", "member-c"], labels: ["人工高优先级"], startDate: "", endDate: "" }),
  subtasks: [
    newCreationTask({ title: "确认场地", goal: "人工确认的场地目标", completionCriteria: ["场地合同确认"], executionTips: ["人工要求保留合同"], ownerId: "member-a", participantIds: ["member-b", "member-c"], labels: ["人工场地标签"], startDate: "", endDate: "" }),
    newCreationTask({ title: "确认场地", goal: "人工确认的备选目标", completionCriteria: ["备选场地合同确认"], executionTips: ["先询价"], ownerId: "member-c", participantIds: ["member-a"], labels: [], startDate: "", endDate: "" }),
  ],
});

test("最终应用批量标注全部字段，保留当前人工内容与预览后未标注标签", () => {
  const form = creationForm();
  const members = context().members;
  assert.equal(validateCreationForm(form, members, "Asia/Shanghai"), null, "使用可创建的真实表单");
  const source = createDraftTaskAiContext(form, members, "member-a", "Asia/Shanghai");
  const notes = [
    annotation(source, { taskId: form.mainTask.clientId, field: "title" }, "改为：新品发布筹备"),
    annotation(source, { taskId: form.mainTask.clientId, field: "completionCriteria", criterionIndex: 0 }, "改为：活动方案通过负责人确认"),
    annotation(source, { taskId: form.subtasks[1].clientId, field: "ownerId" }, "改为：陈默"),
    annotation(source, { taskId: form.subtasks[1].clientId, field: "participantIds" }, "改为：周岚、林洁"),
  ];
  const planned = proposal(adjust(source, notes, "目标改为客户清楚理解新品用途"));
  const current = structuredClone(form);
  current.mainTask.labels = ["预览后人工添加的标签"];
  current.request = "用户补充了业务背景";
  const snapshot = structuredClone(current);
  const next = applyDraftTaskAiAdjustment(freezeDeep(current), source, freezeDeep(planned));
  assert.equal(next.mainTask.title, "新品发布筹备");
  assert.equal(next.mainTask.goal, "客户清楚理解新品用途");
  assert.deepEqual(next.mainTask.completionCriteria, ["活动方案通过负责人确认", "保留人工确认的物料要求"]);
  assert.deepEqual(next.mainTask.executionTips, ["人工安排先检查场地"]);
  assert.deepEqual(next.mainTask.labels, ["预览后人工添加的标签"]);
  assert.equal(next.request, "用户补充了业务背景");
  assert.deepEqual(next.subtasks[0], form.subtasks[0], "同名但未标注的子任务完全保留");
  assert.equal(next.subtasks[1].ownerId, "member-b");
  assert.deepEqual(next.subtasks[1].participantIds, ["member-a", "member-c"]);
  assert.equal(next.subtasks[1].goal, form.subtasks[1].goal);
  assert.deepEqual(next.subtasks[1].completionCriteria, form.subtasks[1].completionCriteria);
  assert.deepEqual(next.subtasks[1].executionTips, form.subtasks[1].executionTips);
  assert.equal(next.mainTask.clientId, form.mainTask.clientId);
  assert.deepEqual(next.subtasks.map(item => item.clientId), form.subtasks.map(item => item.clientId));
  assert.equal(validateCreationForm(next, members, "Asia/Shanghai"), null);
  assert.deepEqual(current, snapshot, "应用返回新表单而不修改输入表单");
});


test("最终应用前草稿或成员上下文改变时拒绝整批旧候选", () => {
  const form = creationForm();
  const source = createDraftTaskAiContext(form, context().members, "member-a", "Asia/Shanghai");
  const planned = proposal(adjust(source, [annotation(source, { taskId: form.mainTask.clientId, field: "title" }, "改为：候选名称"), annotation(source, { taskId: form.subtasks[0].clientId, field: "goal" }, "改为：候选场地目标")]));
  for (const change of [
    (current: CreationForm) => { current.mainTask.executionTips = ["预览后人工更新的步骤"]; },
    (current: CreationForm) => { current.subtasks[0].goal = "预览后人工更新的场地目标"; },
    (current: CreationForm) => { current.subtasks.reverse(); },
    (current: CreationForm) => { current.subtasks.pop(); },
  ]) {
    const current = structuredClone(form);
    change(current);
    const snapshot = structuredClone(current);
    assert.throws(() => applyDraftTaskAiAdjustment(freezeDeep(current), source, planned), /变化|过期|重新预览/);
    assert.deepEqual(current, snapshot, "过期时任何意见均不得部分应用");
  }
  const changedMembers = structuredClone(source);
  changedMembers.members[1].name = "成员已改名";
  assert.throws(() => applyDraftTaskAiAdjustment(form, changedMembers, planned), /变化|过期|重新预览/);
});

test("最终应用重新验证 updates、changes、annotations 与补充要求，篡改不能写入草稿", () => {
  const form = freezeDeep(creationForm());
  const source = createDraftTaskAiContext(form, context().members, "member-a", "Asia/Shanghai");
  const planned = proposal(adjust(source, [annotation(source, { taskId: form.mainTask.clientId, field: "title" }, "改为：候选名称"), annotation(source, { taskId: form.subtasks[0].clientId, field: "goal" }, "改为：候选场地目标")], "完成标准改为：确认发布方案；保留确认记录"));
  const original = structuredClone(form);
  const mutations: Array<[string, (candidate: TaskAiAdjustmentProposal) => void]> = [
    ["updates", candidate => { candidate.updates[0].patch.executionTips = ["偷换未标注的人工内容"]; }],
    ["updates target", candidate => { candidate.updates[0].taskId = form.subtasks[1].clientId; }],
    ["changes", candidate => { candidate.changes[0].after = "伪造预览后的结果"; }],
    ["annotations instruction", candidate => { candidate.annotations![0].instruction = "改为：另一名称"; }],
    ["annotations target", candidate => { candidate.annotations![0].target.taskId = form.subtasks[0].clientId; }],
    ["annotations removal", candidate => { candidate.annotations!.pop(); }],
    ["supplementalInstruction", candidate => { candidate.supplementalInstruction = "完成标准改为：偷换后的标准"; }],
  ];
  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(planned);
    mutate(candidate);
    assert.throws(() => applyDraftTaskAiAdjustment(form, source, candidate), /预览|不一致|过期|失效/, name);
    assert.deepEqual(form, original, `${name} 被拒绝时草稿保持不变`);
  }
});

test("英文所选字段短命令按字段定位，内容大小写保留且不扩展补充要求语法", () => {
  const source = context();
  const next = proposal(adjust(source, [
    annotation(source, { taskId: "main", field: "title" }, "Change to: Product Launch"),
    annotation(source, { taskId: "child-a", field: "goal" }, "cHaNgE tO Help Customers Understand The Product"),
    annotation(source, { taskId: "main", field: "completionCriteria", criterionIndex: 1 }, "Replace with Inventory Matches The Approved List"),
  ]));
  assert.deepEqual(next.updates, [
    { taskId: "main", patch: { title: "Product Launch", completionCriteria: ["提交活动方案", "Inventory Matches The Approved List", "保存确认记录"] } },
    { taskId: "child-a", patch: { goal: "Help Customers Understand The Product" } },
  ]);
  reject(adjust(source, [annotation(source, { taskId: "main", field: "title" }, "Change to: Product Launch")], "Change to: Another Launch"), /补充要求/);
});

test("英文优化与重新生成完成标准等价于已有候选能力，单行仍只改该行", () => {
  const source = context();
  for (const [english, chinese] of [["Refine completion criteria", "优化完成标准"], ["rEgEnErAtE cOmPlEtIoN cRiTeRiA", "重新生成完成标准"]]) {
    const lineTarget = { taskId: "main", field: "completionCriteria" as const, criterionIndex: 1 };
    assert.deepEqual(proposal(adjust(source, [annotation(source, lineTarget, english)])).updates, proposal(adjust(source, [annotation(source, lineTarget, chinese)])).updates);
    assert.deepEqual(proposal(adjust(source, [annotation(source, { taskId: "main", field: "completionCriteria" }, english)])).updates, proposal(adjust(source, [annotation(source, { taskId: "main", field: "completionCriteria" }, chinese)])).updates);
  }
});

test("英文负责人及日期占位与空参与人准确清空，其他字段保留相同文本", () => {
  for (const placeholder of ["Unassigned", "Not set"]) {
    const source = context({ task: task({ endDate: "2099-11-01" }) });
    const next = proposal(adjust(source, [
      annotation(source, { taskId: "main", field: "ownerId" }, `Change to: ${placeholder}`),
      annotation(source, { taskId: "main", field: "endDate" }, `Replace with ${placeholder.toUpperCase()}`),
      annotation(source, { taskId: "main", field: "participantIds" }, "Change to: nOnE"),
    ]));
    assert.deepEqual(next.updates, [{ taskId: "main", patch: { ownerId: "", endDate: "", participantIds: [] } }]);
  }
  assert.deepEqual(proposal(adjust(context(), [annotation(context(), { taskId: "main", field: "title" }, "Change to: Not set")])).updates, [{ taskId: "main", patch: { title: "Not set" } }]);
});

test("内置成员英文显示名与稳定 ID 精确对应，同名显示名和近似姓名均不得猜测", () => {
  const source = context({
    members: [{ id: "周岚", name: "周岚" }, { id: "陈默", name: "陈默" }, { id: "林洁", name: "林洁" }],
    task: task({ ownerId: "周岚", participantIds: ["陈默", "林洁"] }),
  });
  const next = proposal(adjust(source, [
    annotation(source, { taskId: "main", field: "ownerId" }, "Change to: Mo Chen"),
    annotation(source, { taskId: "main", field: "participantIds" }, "Change to Lan Zhou, Jie Lin"),
  ]));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { ownerId: "陈默", participantIds: ["周岚", "林洁"] } }]);
  reject(adjust(source, [annotation(source, { taskId: "main", field: "ownerId" }, "Change to: Mo")]), /精确|未找到/);
  reject(adjust(source, [annotation(source, { taskId: "main", field: "participantIds" }, "Change to: jie lin")]), /精确|未找到/);
  source.members.push({ id: "other-chen", name: "Mo Chen" });
  for (const field of ["ownerId", "participantIds"] as const) reject(adjust(source, [annotation(source, { taskId: "main", field }, "Change to: Mo Chen")]), /同名|唯一.*ID/);
  assert.deepEqual(proposal(adjust(source, [annotation(source, { taskId: "main", field: "ownerId" }, "Change to: 陈默")])).updates, [{ taskId: "main", patch: { ownerId: "陈默", participantIds: ["林洁"] } }]);
});

test("整张任务卡意见用稳定 ID 绑定主任务或同名子任务，重排后不猜名称", () => {
  const source = context({ task: task({ title: "确认场地" }) });
  const card = "task" as TaskCreationAnnotationTarget["field"];
  const notes = [annotation(source, { taskId: "main", field: card }, "任务名称改为统筹新品发布"), annotation(source, { taskId: "child-b", field: card }, "目标改为场地容量覆盖全部报名人数")];
  source.subtasks.reverse();
  const next = proposal(adjust(source, notes));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { title: "统筹新品发布" } }, { taskId: "child-b", patch: { goal: "场地容量覆盖全部报名人数" } }]);
  assert.deepEqual(next.annotations, notes, "保留整卡原意见供应用边界重建");
});

test("同一卡片可按换行明确修改多个字段，重复字段合并到最终值", () => {
  const source = freezeDeep(context());
  const card = "task" as TaskCreationAnnotationTarget["field"];
  const instruction = "任务名称改为中间名称\n目标改为客户理解产品价值\n\n完成标准改为：方案已确认；物料可核对\n任务名称改为最终名称\n截止时间改为2099-11-01";
  const next = proposal(adjust(source, [annotation(source, { taskId: "main", field: card }, instruction)]));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { title: "最终名称", goal: "客户理解产品价值", completionCriteria: ["方案已确认", "物料可核对"], endDate: "2099-11-01" } }]);
  assert.equal(next.changes.length, 4);
  assert.deepEqual(next.changes.find(change => change.label === "任务名称"), { taskId: "main", taskTitle: "产品发布", label: "任务名称", before: "产品发布", after: "最终名称" });
  assert.deepEqual(source.task.executionTips, ["先确认场地"]);
  assert.deepEqual(next.additions, []);
});

test("整卡意见快照覆盖六个可见字段，任意手改或删除卡片均阻止整批", () => {
  const card = "task" as TaskCreationAnnotationTarget["field"];
  for (const mutate of [
    (source: TaskAiAdjustmentContext) => { source.task.title = "手改名称"; },
    (source: TaskAiAdjustmentContext) => { source.task.goal = "手改目标"; },
    (source: TaskAiAdjustmentContext) => { source.task.completionCriteria[1] = "手改标准"; },
    (source: TaskAiAdjustmentContext) => { source.task.ownerId = "member-c"; },
    (source: TaskAiAdjustmentContext) => { source.task.participantIds = []; },
    (source: TaskAiAdjustmentContext) => { source.task.endDate = "2099-11-01"; },
    (source: TaskAiAdjustmentContext) => { source.subtasks = source.subtasks.filter(item => item.id !== "child-b"); },
  ]) {
    const source = context();
    const notes = [annotation(source, { taskId: "main", field: card }, "任务名称改为候选名称"), annotation(source, { taskId: "child-b", field: card }, "目标改为候选场地目标")];
    mutate(source);
    const snapshot = structuredClone(source);
    reject(adjust(source, notes), /过期|失效|重新标注/);
    assert.deepEqual(source, snapshot);
  }
});

test("整卡意见中的自由要求、跨任务选择、添加删除及一行混合命令整批拒绝", () => {
  const card = "task" as TaskCreationAnnotationTarget["field"];
  for (const unsupported of [
    "更符合业务一点", "改为：不知道调整哪个字段", "子任务「确认场地」：目标改为跨任务改写",
    "添加子任务：新任务；完成标准：交付新内容", "删除任务", "任务名称改为新名称，负责人改为陈默",
    "执行建议改为：越过本次可见字段范围", "Participants: Add everyone", "Task name: Change to New name; Owner: Change to Mo Chen",
  ]) {
    const source = context();
    const notes = [annotation(source, { taskId: "child-b", field: card }, "目标改为先处理的有效意见"), annotation(source, { taskId: "main", field: card }, `任务名称改为本卡的有效意见\n${unsupported}`)];
    const snapshot = structuredClone({ source, notes });
    reject(adjust(source, notes), /第 2 条|原文|标注/);
    assert.deepEqual({ source, notes }, snapshot);
  }
});

test("同卡负责人和参与人意见按行顺序处理，精确匹配及去重差异可见", () => {
  const source = context();
  const card = "task" as TaskCreationAnnotationTarget["field"];
  const next = proposal(adjust(source, [annotation(source, { taskId: "main", field: card }, "负责人改为陈默\n参与人改为：周岚、陈默、林洁、member-c")]));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { ownerId: "member-b", participantIds: ["member-a", "member-c"] } }]);
  assert.equal(next.changes.find(change => change.label === "参与人")?.before, "陈默、林洁");
  assert.equal(next.changes.find(change => change.label === "参与人")?.after, "周岚、林洁");
  reject(adjust(source, [annotation(source, { taskId: "main", field: card }, "负责人改为陈默\n参与人改为：不存在的成员")]), /精确|未找到/);
});

test("英文整卡意见用明确字段标签复用英文短命令，并可应用完整候选", () => {
  const members = [{ id: "周岚", name: "周岚" }, { id: "陈默", name: "陈默" }, { id: "林洁", name: "林洁" }];
  const form = creationForm();
  for (const item of [form.mainTask, ...form.subtasks]) { item.ownerId = "周岚"; item.participantIds = ["陈默", "林洁"]; }
  const source = createDraftTaskAiContext(form, members, "周岚", "Asia/Shanghai");
  const card = "task" as TaskCreationAnnotationTarget["field"];
  const instruction = "Task name: Change to Product Launch\ngOaL: Replace with Explain Product Value\nCompletion criteria: Refine completion criteria\nOwner: Change to Mo Chen\nParticipants: Change to Lan Zhou, Jie Lin\nDue date: Change to 2099-11-01";
  const next = proposal(adjust(source, [annotation(source, { taskId: form.subtasks[1].clientId, field: card }, instruction)]));
  assert.equal(next.updates.length, 1);
  assert.equal(next.updates[0].taskId, form.subtasks[1].clientId);
  assert.deepEqual(next.updates[0].patch, { title: "Product Launch", goal: "Explain Product Value", completionCriteria: ["备选场地合同确认；核对依据、结果与未通过项可追溯。"], ownerId: "陈默", participantIds: ["周岚", "林洁"], endDate: "2099-11-01" });
  const applied = applyDraftTaskAiAdjustment(form, source, next);
  assert.deepEqual(applied.mainTask, form.mainTask);
  assert.deepEqual(applied.subtasks[0], form.subtasks[0]);
  assert.equal(applied.subtasks[1].title, "Product Launch");
  assert.deepEqual(applied.subtasks[1].participantIds, ["周岚", "林洁"]);
  assert.equal(validateCreationForm(applied, members, "Asia/Shanghai"), null);
  const cleared = proposal(adjust(source, [annotation(source, { taskId: form.mainTask.clientId, field: card }, "Owner: Change to Unassigned\nParticipants: Change to None\nDue date: Change to Not set")]));
  assert.deepEqual(cleared.updates, [{ taskId: form.mainTask.clientId, patch: { ownerId: "", participantIds: [] } }]);
});


test("名称和标注绑定稳定 ID，快照独立且不带退役截图元数据", () => {
  const form = creationForm();
  const source = createDraftTaskAiContext(form, context().members, "member-a", "Asia/Shanghai");
  const notes = [
    { ...annotation(source, { taskId: form.mainTask.clientId, field: "title" }, "改为：新品发布筹备"), screenshot: { dataUrl: "data:image/png;base64,legacy", width: 640, height: 280 } },
    annotation(source, { taskId: form.subtasks[1].clientId, field: "task" }, "目标改为容量符合确认后的报名人数"),
  ];
  const snapshot = structuredClone({ form, notes });
  const next = proposal(adjust(source, notes));
  assert.equal(Object.hasOwn(next.annotations![0], "screenshot"), false, "旧会话图片不带入新的请求快照");
  assert.deepEqual(next.annotations!.map(note => [note.taskTitle, note.instruction]), notes.map(note => [note.taskTitle, note.instruction]));
  assert.notEqual(next.annotations![0].target, notes[0].target);
  const applied = applyDraftTaskAiAdjustment(form, source, next);
  assert.equal(applied.mainTask.title, "新品发布筹备");
  assert.equal(applied.subtasks[1].goal, "容量符合确认后的报名人数");
  assert.deepEqual(applied.subtasks[0], form.subtasks[0], "同名但未指定的任务保持");
  next.annotations![0].taskTitle = "调用方修改";
  assert.deepEqual({ form, notes }, snapshot);
});

test("名称和文字标注保留整批过期保护，模糊指代不能误改任务", () => {
  const source = context();
  const notes = [annotation(source, { taskId: "main", field: "task" }, "任务名称改为有效候选"), annotation(source, { taskId: "child-b", field: "task" }, "目标改为场地确认目标")];
  source.subtasks[1].goal = "人工确认后的新目标";
  const snapshot = structuredClone({ source, notes });
  reject(adjust(source, notes), /过期|失效|重新标注/);
  assert.deepEqual({ source, notes }, snapshot);
  const current = context();
  const unsupported = [annotation(current, { taskId: "main", field: "task" }, "任务名称改为有效候选"), annotation(current, { taskId: "child-b", field: "task" }, "调整这块")];
  reject(adjust(current, unsupported), /明确字段|任务名称改为|目标改为/);
});

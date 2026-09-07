import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskAiAdjustment, buildTaskAiCreationAdjustment, getTaskAiContextSignature } from "../src/lib/taskAiAdjustment.ts";
import type {
  TaskAiAdjustmentContext,
  TaskAiAdjustmentProposal,
  TaskAiAdjustmentResult,
  TaskAiAdjustmentScope,
  TaskAiEditableTask,
} from "../src/lib/taskAiAdjustmentTypes.ts";

const task = (overrides: Partial<TaskAiEditableTask> = {}): TaskAiEditableTask => ({
  id: "main", title: "发布会筹备", goal: "让客户了解新品的实际用途",
  completionCriteria: ["提交完整活动方案"], executionTips: ["先确认场地容量"],
  ownerId: "member-a", participantIds: ["member-b", "member-c"],
  startDate: "2026-09-01", endDate: "2026-09-30", endDateLabel: "9月30日",
  dependsOnTaskIds: [], ...overrides,
});

const context = (overrides: Partial<TaskAiAdjustmentContext> = {}): TaskAiAdjustmentContext => ({
  mode: "draft", currentUserId: "member-a", task: task(),
  subtasks: [
    task({ id: "child-a", title: "确认场地", goalInherited: true, endDate: "2026-09-10" }),
    task({ id: "child-b", title: "准备物料", goalInherited: true, endDate: "2026-09-20" }),
  ],
  members: [
    { id: "member-a", name: "周岚" },
    { id: "member-b", name: "陈默" },
    { id: "member-c", name: "林洁" },
  ],
  dependencyTasks: [{ id: "external", title: "产品说明已确认", dependsOnTaskIds: [] }],
  canAddSubtasks: true, ...overrides,
});

const proposal = (result: TaskAiAdjustmentResult): TaskAiAdjustmentProposal => {
  assert.ok("proposal" in result, "error" in result ? result.error : "expected a proposal");
  return result.proposal;
};

const error = (result: TaskAiAdjustmentResult, message?: RegExp) => {
  assert.ok("error" in result, "expected this request to be rejected without a candidate");
  if (message) assert.match(result.error, message);
  assert.equal("proposal" in result, false);
  return result.error;
};

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

test("创建统一输入默认调整主任务，显式子任务前缀才改变目标", () => {
  const source = freezeDeep(context());
  const main = proposal(buildTaskAiCreationAdjustment(source, "任务名称改为新品发布"));
  assert.deepEqual(main.scope, { kind: "task" });
  assert.deepEqual(main.updates, [{ taskId: "main", patch: { title: "新品发布" } }]);
  const instruction = "  子任务「准备物料」：增加完成标准：印刷物料已核对  ";
  const child = proposal(buildTaskAiCreationAdjustment(source, instruction));
  assert.deepEqual(child.scope, { kind: "subtasks" });
  assert.deepEqual(child.updates.map(update => update.taskId), ["child-b"]);
  assert.equal(child.instruction, instruction);
  assert.equal(child.changes[0].taskTitle, "准备物料");
  const added = proposal(buildTaskAiCreationAdjustment(source, "添加子任务：核对交付；完成标准：交付物与清单一致"));
  assert.equal(added.additions[0].title, "核对交付");
  assert.deepEqual(added.scope, { kind: "subtasks" });
  assert.equal(source.subtasks.length, 2, "预览不能写入或添加任务");
});

test("创建统一输入不猜测不存在或同名的子任务，复杂要求保持明确拒绝", () => {
  const source = context();
  error(buildTaskAiCreationAdjustment(source, "子任务「不存在」：负责人改为林洁"), /未找到.*精确名称/);
  source.subtasks[0].title = "准备物料";
  error(buildTaskAiCreationAdjustment(source, "子任务「准备物料」：负责人改为林洁"), /同名.*区分名称/);
  for (const instruction of [
    "子任务负责人改为林洁",
    "子任务「准备物料」：负责人改为林洁；预计投入改为2小时",
    "把全部子任务分配给林洁",
    "添加子任务：准备物料；完成标准：核对物料；负责人改为林洁",
  ]) error(buildTaskAiCreationAdjustment(source, instruction));
  error(buildTaskAiCreationAdjustment(context({ canAddSubtasks: false }), "添加子任务：核对交付；完成标准：核对交付物"), /不允许新增/);
  error(buildTaskAiCreationAdjustment(context({ mode: "saved" }), "任务名称改为不应发生的修改"), /仅用于创建草稿/);
});

test("上下文指纹稳定，覆盖字段、成员、依赖图、模式与权限变化", () => {
  const source = context();
  const signature = getTaskAiContextSignature(source);
  assert.equal(signature, getTaskAiContextSignature(structuredClone(source)));
  for (const alter of [
    (next: TaskAiAdjustmentContext) => { next.task.title = "人工改名"; },
    (next: TaskAiAdjustmentContext) => { next.task.proposedOwnerId = "member-c"; },
    (next: TaskAiAdjustmentContext) => { next.subtasks.reverse(); },
    (next: TaskAiAdjustmentContext) => { next.members.pop(); },
    (next: TaskAiAdjustmentContext) => { next.dependencyTasks[0].dependsOnTaskIds = ["child-a"]; },
    (next: TaskAiAdjustmentContext) => { next.mode = "saved"; },
    (next: TaskAiAdjustmentContext) => { next.canAddSubtasks = false; },
    (next: TaskAiAdjustmentContext) => { next.currentUserId = "member-c"; },
  ]) {
    const next = structuredClone(source);
    alter(next);
    assert.notEqual(getTaskAiContextSignature(next), signature);
  }
});

test("任务范围仅给当前主项白名单 patch，保留输入原文与具体前后值", () => {
  const source = freezeDeep(context());
  const scope = freezeDeep({ kind: "task" } as const);
  const instruction = "  任务名称改为新品发布会，面向现有客户  ";
  const next = proposal(buildTaskAiAdjustment(source, scope, instruction));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { title: "新品发布会，面向现有客户" } }]);
  assert.deepEqual(next.additions, []);
  assert.deepEqual(next.scope, scope);
  assert.notEqual(next.scope, scope);
  assert.equal(next.instruction, instruction);
  assert.equal(next.baseSignature, getTaskAiContextSignature(source));
  assert.deepEqual(next.changes, [{
    taskId: "main", taskTitle: "发布会筹备", label: "任务名称",
    before: "发布会筹备", after: "新品发布会，面向现有客户",
  }]);
  assert.doesNotMatch(next.summary, /Mock|示例/);
  assert.match(next.summary, /仅影响列出的字段.*尚未应用/);
});

test("候选与错误使用业务文案，不展示Mock标记且不改变能力限制", () => {
  const leaf = context({ subtasks: [], task: task({ effortEstimate: {
    minutes: 60, workMethod: "AI 整理、人工核对", reason: "核对名单需人工投入", basis: "manual", confirmed: true, scopeKey: "old", version: 1,
  } }) });
  const candidates: Array<[TaskAiAdjustmentContext, TaskAiAdjustmentScope, string]> = [
    [context(), { kind: "task" }, "任务名称改为新的发布会名称"],
    [context(), { kind: "task" }, "目标改为让客户确认产品用途"],
    [context(), { kind: "subtasks" }, "添加子任务：整理名单；完成标准：名单已核对"],
    [context({ mode: "saved" }), { kind: "task" }, "负责人改为林洁"],
    [leaf, { kind: "task" }, "预计投入改为2小时"],
    [context({ subtasks: [] }), { kind: "task" }, "预计投入改为2小时"],
    [leaf, { kind: "task" }, "预计投入改为待估算"],
  ];
  for (const [source, scope, instruction] of candidates) {
    const next = proposal(buildTaskAiAdjustment(source, scope, instruction));
    assert.doesNotMatch(next.summary, /Mock|示例/, instruction);
    assert.match(next.summary, /尚未/, "候选不冒充已应用");
  }
  const unsupported: Array<[TaskAiAdjustmentScope, string]> = [
    [{ kind: "task" }, "帮我拆分任务"],
    [{ kind: "subtasks" }, "添加子任务：整理名单"],
    [{ kind: "subtasks" }, "修改负责人"],
    [{ kind: "subtask", taskId: "child-a" }, "预计投入改为大概一天"],
    [{ kind: "task" }, "截止时间改为明天"],
  ];
  for (const [scope, instruction] of unsupported) {
    const message = error(buildTaskAiAdjustment(context(), scope, instruction));
    assert.doesNotMatch(message, /Mock|示例/, instruction);
    assert.match(message, /原文/, "无法处理时继续保留用户输入");
  }
});

test("文案清理不替换用户提供的Mock和示例内容", () => {
  const instruction = "任务名称改为Mock 示例数据核对";
  const next = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, instruction));
  assert.equal(next.instruction, instruction);
  assert.equal(next.updates[0].patch.title, "Mock 示例数据核对");
  assert.equal(next.changes[0].after, "Mock 示例数据核对");
});

test("主目标候选不改子任务记录，明确继承语义", () => {
  const source = freezeDeep(context());
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "目标改为让新客户理解产品价值"));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { goal: "让新客户理解产品价值" } }]);
  assert.match(next.summary, /继承/);
  assert.equal(source.subtasks[0].goal, source.task.goal);
});

test("继承目标不可在当前任务或单子任务范围重写", () => {
  const source = context();
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-a" }, "目标改为其他业务目标"), /继承/);
  error(buildTaskAiAdjustment(context({ task: task({ goalInherited: true }) }), { kind: "task" }, "目标改为其他目标"), /继承/);
});

test("单子任务通过稳定 ID 定位，重排后只改指定项", () => {
  const source = context();
  source.subtasks.reverse();
  const next = proposal(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-a" }, "任务名称改为确认最终场地"));
  assert.deepEqual(next.updates, [{ taskId: "child-a", patch: { title: "确认最终场地" } }]);
  assert.equal(next.changes[0].taskTitle, "确认场地");
});

test("子任务模块不得默认挑第一项，需要精确名称选择器", () => {
  const source = context();
  error(buildTaskAiAdjustment(source, { kind: "subtasks" }, "任务名称改为新名称"), /子任务/);
  const next = proposal(buildTaskAiAdjustment(source, { kind: "subtasks" }, "子任务「准备物料」：增加完成标准：提供可打印版本"));
  assert.deepEqual(next.updates, [{ taskId: "child-b", patch: { completionCriteria: ["提交完整活动方案", "提供可打印版本"] } }]);
  assert.deepEqual(next.scope, { kind: "subtasks" });
});

test("模块选择器不接受模糊名称、不存在名称或同名多项", () => {
  const source = context();
  for (const title of ["准备", "没有这个任务"]) {
    error(buildTaskAiAdjustment(source, { kind: "subtasks" }, `子任务「${title}」：任务名称改为新名称`), /名称|找到/);
  }
  source.subtasks[0].title = "准备物料";
  error(buildTaskAiAdjustment(source, { kind: "subtasks" }, "子任务「准备物料」：任务名称改为新名称"), /同名|多个/);
});

test("过期、父任务、外部任务和非法作用域均不能借单子任务入口修改", () => {
  for (const taskId of ["gone", "main", "external"]) {
    error(buildTaskAiAdjustment(context(), { kind: "subtask", taskId }, "任务名称改为新名称"), /范围|子任务|失效/);
  }
  error(buildTaskAiAdjustment(context(), { kind: "all" } as unknown as TaskAiAdjustmentScope, "任务名称改为新名称"), /范围/);
});

test("重复稳定 ID 不可让一次调整落在多个任务", () => {
  const source = context();
  source.subtasks[0].id = source.task.id;
  error(buildTaskAiAdjustment(source, { kind: "task" }, "任务名称改为新名称"), /ID|标识/);
});

test("错误作用域不能使用另一模块的选择器或新增语法", () => {
  const source = context();
  for (const scope of [{ kind: "task" }, { kind: "subtask", taskId: "child-a" }] as const) {
    error(buildTaskAiAdjustment(source, scope, "子任务「准备物料」：任务名称改为新名称"));
    error(buildTaskAiAdjustment(source, scope, "添加子任务：新交付；完成标准：交付样稿"));
  }
});

test("增加完成标准保留旧条目，普通中文逗号不是组合指令", () => {
  const next = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "增加完成标准：覆盖安卓、iOS，保留验证截图"));
  assert.deepEqual(next.updates[0].patch, { completionCriteria: ["提交完整活动方案", "覆盖安卓、iOS，保留验证截图"] });
  assert.equal(next.changes[0].before, "提交完整活动方案");
  assert.equal(next.changes[0].after, "提交完整活动方案\n覆盖安卓、iOS，保留验证截图");
});

test("替换完成标准使用明确中文分号拆条，保留每条正文", () => {
  const next = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "完成标准改为：提供方案，注明风险； 提交可核对的排期"));
  assert.deepEqual(next.updates[0].patch, { completionCriteria: ["提供方案，注明风险", "提交可核对的排期"] });
  assert.equal(next.changes[0].label, "完成标准");
});

test("重新生成完成标准保留原业务内容，只生成可审阅的可核对差异", () => {
  const source = freezeDeep(context());
  const next = proposal(buildTaskAiCreationAdjustment(source, "重新生成完成标准"));
  const criteria = next.updates[0].patch.completionCriteria!;
  assert.equal(next.scope.kind, "task");
  assert.equal(next.changes[0].label, "完成标准");
  assert.ok(criteria.every(item => /可追溯/u.test(item)));
  assert.match(criteria[0], /提交完整活动方案/);
  assert.deepEqual(source.task.completionCriteria, ["提交完整活动方案"], "生成候选不能改写原草稿");

  const alreadyCheckable = context({ task: task({ completionCriteria: criteria }) });
  const unchanged = proposal(buildTaskAiCreationAdjustment(alreadyCheckable, "重新生成一下当前任务的完成标准"));
  assert.deepEqual(unchanged.changes, [], "已经可核对时不制造重复变化");
  assert.deepEqual(unchanged.updates, []);
});

test("替换执行建议只更新 Tips，不把操作步骤拆成子任务", () => {
  const next = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "执行建议改为：先核对资料，再检查缺漏；保留确认记录"));
  assert.deepEqual(next.updates[0].patch, { executionTips: ["先核对资料，再检查缺漏", "保留确认记录"] });
  assert.deepEqual(next.additions, []);
});

test("支持 ASCII 冒号但不接受空条目作为完成标准", () => {
  const next = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "完成标准改为:提交最终文件"));
  assert.deepEqual(next.updates[0].patch.completionCriteria, ["提交最终文件"]);
  for (const instruction of ["完成标准改为：", "完成标准改为：A；；B", "执行建议改为：；", "增加完成标准： "]) {
    error(buildTaskAiAdjustment(context(), { kind: "task" }, instruction));
  }
});

test("内容相同与重复完成标准均返回空差异且无 patch", () => {
  for (const instruction of [
    "任务名称改为发布会筹备", "目标改为让客户了解新品的实际用途", "完成标准改为：提交完整活动方案",
    "增加完成标准：提交完整活动方案", "执行建议改为：先确认场地容量", "负责人改为周岚",
    "截止时间改为2026-09-30", "前置依赖改为无",
  ]) {
    const next = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, instruction));
    assert.deepEqual(next.changes, [], instruction);
    assert.deepEqual(next.updates, [], instruction);
    assert.deepEqual(next.additions, [], instruction);
    assert.match(next.summary, /没有变化|未变化/);
  }
});

test("草稿按真实成员精确名字换负责人，并显式预览参与人去重", () => {
  const source = freezeDeep(context());
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为陈默"));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { ownerId: "member-b", participantIds: ["member-c"] } }]);
  assert.equal(next.changes.length, 2);
  assert.equal(next.changes[0].before, "周岚");
  assert.equal(next.changes[0].after, "陈默");
  assert.match(next.changes[1].label, /参与人/);
  assert.equal(next.changes[1].before, "陈默、林洁");
  assert.equal(next.changes[1].after, "林洁");
});

test("草稿可用唯一成员 ID 或待定，不自动指派当前用户", () => {
  const byId = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "负责人改为member-c"));
  assert.equal(byId.updates[0].patch.ownerId, "member-c");
  const unassigned = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "负责人改为待定"));
  assert.deepEqual(unassigned.updates[0].patch, { ownerId: "" });
  assert.equal(unassigned.changes[0].after, "待定");
});

test("姓名重名不猜成员，但精确唯一 ID 仍可使用", () => {
  const source = context();
  source.members.push({ id: "member-d", name: "陈默" });
  error(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为陈默"), /同名|多个/);
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为member-b"));
  assert.equal(next.updates[0].patch.ownerId, "member-b");
  for (const name of ["陈", "随机成员", "周岚或陈默"]) {
    error(buildTaskAiAdjustment(source, { kind: "task" }, `负责人改为${name}`), /成员|姓名/);
  }
});

test("已保存任务的人选仅为待接受提议，不变更正式 Owner 或参与人", () => {
  const source = freezeDeep(context({ mode: "saved" }));
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为陈默"));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { ownerId: "member-b" } }]);
  assert.equal(next.changes.length, 1);
  assert.match(next.changes[0].after!, /陈默.*待接受/);
  assert.match(next.summary, /正式负责人.*不变/);
  assert.equal(source.task.ownerId, "member-a");
  assert.deepEqual(source.task.participantIds, ["member-b", "member-c"]);
});

test("已保存任务请求已有相同提议时没有变化", () => {
  const source = context({ mode: "saved", task: task({ proposedOwnerId: "member-b" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为陈默"));
  assert.deepEqual(next.changes, []);
  assert.deepEqual(next.updates, []);
  assert.match(next.summary, /待接受/);
});

test("已保存任务请求当前正式 Owner 不隐式撤销另一项待接受提议", () => {
  const source = context({ mode: "saved", task: task({ proposedOwnerId: "member-b" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为周岚"));
  assert.deepEqual(next.changes, []);
  assert.deepEqual(next.updates, []);
  assert.match(next.summary, /待接受.*保留/);
  assert.equal(source.task.proposedOwnerId, "member-b");
});

test("已保存任务拒绝清空负责人，不伪造无人接受的提议", () => {
  error(buildTaskAiAdjustment(context({ mode: "saved" }), { kind: "task" }, "负责人改为待定"), /具体成员|清空/);
});

test("已有提议改为另一候选时，差异呈现原提议与新待接受人选", () => {
  const source = context({ mode: "saved", task: task({ proposedOwnerId: "member-b" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "负责人改为林洁"));
  assert.match(next.changes[0].before!, /陈默.*待接受/);
  assert.match(next.changes[0].after!, /林洁.*待接受/);
  assert.equal(next.updates[0].patch.ownerId, "member-c");
});

test("截止时间仅修改 endDate，保留开始日期与其他字段", () => {
  const source = freezeDeep(context());
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-10-02"));
  assert.deepEqual(next.updates, [{ taskId: "main", patch: { endDate: "2026-10-02" } }]);
  assert.equal(next.changes[0].before, "2026-09-30");
  assert.equal(next.changes[0].after, "2026-10-02");
});

test("截止时间待定不编造日期，差异保留旧的显示日期标签", () => {
  const source = context({ task: task({ startDate: "", endDate: "", endDateLabel: "本月内" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-10-02"));
  assert.equal(next.changes[0].before, "本月内");
  const clear = proposal(buildTaskAiAdjustment(context(), { kind: "task" }, "截止时间改为待定"));
  assert.deepEqual(clear.updates[0].patch, { endDate: "" });
  assert.equal(clear.changes[0].after, "待定");
});

test("无日期但已有非空截止标签时，改为待定仍需形成显式清空候选", () => {
  const source = context({ task: task({ startDate: "", endDate: "", endDateLabel: "待讨论排期" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为待定"));
  assert.deepEqual(next.updates[0].patch, { endDate: "" });
  assert.equal(next.changes[0].before, "待讨论排期");
  assert.equal(next.changes[0].after, "待定");
});

test("日期格式与真实日历都校验，不把非法日期滚入下个月", () => {
  for (const date of ["2026-02-29", "2026-09-31", "2026-13-01", "2026-00-01", "2026-09-00", "2026-9-02", "明天", "2026-10-01T12:00:00Z"]) {
    error(buildTaskAiAdjustment(context(), { kind: "task" }, `截止时间改为${date}`), /日期|YYYY-MM-DD/);
  }
  const source = context({ task: task({ startDate: "2028-02-01", endDate: "" }), subtasks: [] });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2028-02-29"));
  assert.equal(next.updates[0].patch.endDate, "2028-02-29");
});

test("结束日期不能早于目标任务的开始日期", () => {
  error(buildTaskAiAdjustment(context(), { kind: "task" }, "截止时间改为2026-08-31"), /开始/);
  const source = context();
  source.subtasks[0].startDate = "2026-09-09";
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-a" }, "截止时间改为2026-09-08"), /开始/);
});

test("目标任务开始日期失效时拒绝基于它生成新排期", () => {
  const source = context({ task: task({ startDate: "2026-02-30" }) });
  error(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-10-02"), /开始.*日期|日期.*无效/);
});

test("主截止早于子截止须回到子任务模块，不自动重排或改子项", () => {
  const source = freezeDeep(context());
  error(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-09-15"), /子任务模块/);
});

test("子截止不得超出已定主截止，未定主截止不强行补日期", () => {
  error(buildTaskAiAdjustment(context(), { kind: "subtask", taskId: "child-a" }, "截止时间改为2026-10-01"), /主任务.*截止/);
  const source = context({ task: task({ endDate: "", endDateLabel: "" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-a" }, "截止时间改为2026-10-01"));
  assert.deepEqual(next.updates, [{ taskId: "child-a", patch: { endDate: "2026-10-01" } }]);
});

test("创建草稿只允许兄弟子任务依赖，并用稳定 ID 存储", () => {
  const source = context();
  source.subtasks.reverse();
  const next = proposal(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-b" }, "前置依赖改为「确认场地」"));
  assert.deepEqual(next.updates, [{ taskId: "child-b", patch: { dependsOnTaskIds: ["child-a"] } }]);
  assert.equal(next.changes[0].before, "无");
  assert.equal(next.changes[0].after, "确认场地");
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-b" }, "前置依赖改为「产品说明已确认」"), /兄弟子任务/);
  error(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「产品说明已确认」"), /主任务|兄弟子任务/);
});

test("父子归属不是可自动转化的依赖，子项不能依赖当前父项", () => {
  error(buildTaskAiAdjustment(context({ mode: "saved" }), { kind: "subtask", taskId: "child-a" }, "前置依赖改为「发布会筹备」"), /归属|父|上级/);
});

test("已保存任务可精确引用真实外部前置任务，多个名称以顿号分隔", () => {
  const source = context({ mode: "saved" });
  source.dependencyTasks.push({ id: "external-b", title: "预算批准", dependsOnTaskIds: [] });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「产品说明已确认」、「预算批准」"));
  assert.deepEqual(next.updates[0].patch, { dependsOnTaskIds: ["external", "external-b"] });
  assert.equal(next.changes[0].after, "产品说明已确认、预算批准");
});

test("依赖必须完整精确引用唯一任务，不接受缺失、重名或重复项", () => {
  const source = context({ mode: "saved" });
  for (const input of ["产品说明已确认", "「产品说明」", "「不存在」", "「产品说明已确认」、「产品说明已确认」"]) {
    error(buildTaskAiAdjustment(source, { kind: "task" }, `前置依赖改为${input}`), /依赖|任务|标题/);
  }
  source.dependencyTasks.push({ id: "namesake", title: "产品说明已确认", dependsOnTaskIds: [] });
  error(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「产品说明已确认」"), /同名|多个/);
});

test("自依赖和兄弟任务间循环均被拒绝", () => {
  const source = context();
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-a" }, "前置依赖改为「确认场地」"), /自己|自身|自依赖/);
  source.subtasks[1].dependsOnTaskIds = ["child-a"];
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-a" }, "前置依赖改为「准备物料」"), /循环/);
});

test("循环校验遍历完整图，不只检查当前模块的一跳关系", () => {
  const source = context({ mode: "saved" });
  source.dependencyTasks = [
    { id: "external", title: "产品说明已确认", dependsOnTaskIds: ["intermediate"] },
    { id: "intermediate", title: "远端中间交付", dependsOnTaskIds: ["child-b"] },
    { id: "main", title: "过期主名称", dependsOnTaskIds: [] },
    { id: "child-b", title: "过期子名称", dependsOnTaskIds: [] },
  ];
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-b" }, "前置依赖改为「产品说明已确认」"), /循环/);
});

test("当前任务与子项真实字段覆盖全图中的旧副本，不制造名称歧义", () => {
  const source = context({ mode: "saved" });
  source.dependencyTasks.push({ id: "child-a", title: "旧名称", dependsOnTaskIds: [] });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-b" }, "前置依赖改为「确认场地」"));
  assert.deepEqual(next.updates[0].patch.dependsOnTaskIds, ["child-a"]);
  error(buildTaskAiAdjustment(source, { kind: "subtask", taskId: "child-b" }, "前置依赖改为「旧名称」"), /找到|不存在|标题/);
});

test("无关历史坏边不阻止局部修正，但不能新增循环", () => {
  const source = context({ mode: "saved" });
  source.dependencyTasks.push(
    { id: "old-a", title: "旧任务A", dependsOnTaskIds: ["old-b", "gone"] },
    { id: "old-b", title: "旧任务B", dependsOnTaskIds: ["old-a"] },
  );
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「产品说明已确认」"));
  assert.deepEqual(next.updates[0].patch.dependsOnTaskIds, ["external"]);
  source.task.dependsOnTaskIds = ["gone"];
  const clear = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为无"));
  assert.deepEqual(clear.updates[0].patch.dependsOnTaskIds, []);
  assert.match(clear.changes[0].before!, /gone/);
});

test("相同依赖集合仅更换枚举顺序不生成无意义修改", () => {
  const source = context({ mode: "saved" });
  source.dependencyTasks.push({ id: "external-b", title: "预算批准", dependsOnTaskIds: [] });
  source.task.dependsOnTaskIds = ["external", "external-b"];
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「预算批准」、「产品说明已确认」"));
  assert.deepEqual(next.changes, []);
  assert.deepEqual(next.updates, []);
});

test("模块显式新增子任务，使用新稳定 ID、继承目标、人选日期待定", () => {
  const source = freezeDeep(context());
  const instruction = "添加子任务：完成媒体资料包；完成标准：提供事实清单，附来源；确认素材可公开使用";
  const next = proposal(buildTaskAiAdjustment(source, { kind: "subtasks" }, instruction));
  const child = next.additions[0];
  assert.equal(next.additions.length, 1);
  assert.deepEqual(next.updates, []);
  assert.match(child.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(child.title, "完成媒体资料包");
  assert.equal(child.goal, source.task.goal);
  assert.equal(child.goalInherited, true);
  assert.deepEqual(child.completionCriteria, ["提供事实清单，附来源", "确认素材可公开使用"]);
  assert.deepEqual(child.executionTips, []);
  assert.equal(child.ownerId, "");
  assert.equal(child.startDate, "");
  assert.equal(child.endDate, "");
  assert.deepEqual(child.participantIds, []);
  assert.deepEqual(child.dependsOnTaskIds, []);
  assert.ok(next.changes.some(change => change.taskId === child.id && change.before === null && change.after?.includes(child.title)));
  assert.ok(next.changes.some(change => change.after?.includes("提供事实清单")));
  assert.notEqual(child.id, proposal(buildTaskAiAdjustment(source, { kind: "subtasks" }, instruction)).additions[0].id);
});

test("新增子任务须有完成标准和允许新增的范围，不自行编造交付标准", () => {
  for (const instruction of ["添加子任务：完成媒体资料包", "添加子任务：资料包；完成标准：", "添加子任务：；完成标准：交付文件"]) {
    error(buildTaskAiAdjustment(context(), { kind: "subtasks" }, instruction), /标准|名称|格式|Mock/);
  }
  error(buildTaskAiAdjustment(context({ canAddSubtasks: false }), { kind: "subtasks" }, "添加子任务：资料包；完成标准：交付文件"), /新增|添加/);
});

test("新增受限不影响对已有子任务的精确局部编辑", () => {
  const next = proposal(buildTaskAiAdjustment(context({ canAddSubtasks: false }), { kind: "subtasks" }, "子任务「准备物料」：任务名称改为准备印刷物料"));
  assert.equal(next.updates[0].taskId, "child-b");
});

test("未知和组合要求整体拒绝，不执行其中一个字段或擅自整树拆分", () => {
  const source = freezeDeep(context());
  for (const instruction of [
    "", "改好一点", "把任务重新拆成三个阶段", "删除所有子任务", "任务名称改成新名称",
    "任务名称改为新名称，负责人改为陈默", "任务名称改为新名称\n目标改为其他结果",
    "任务名称改为新名称，同时删除第二个子任务", "目标改为提升转化，再把子任务拆成三个阶段",
    "任务名称改为新名称并让林洁负责", "完成标准改为：A；截止时间改为2026-10-02",
    "执行建议改为：先核对资料；然后邀请全部成员", "任务名称改为新名称；清空所有依赖",
  ]) {
    error(buildTaskAiAdjustment(source, { kind: "task" }, instruction), /Mock|一次|单条|不支持/);
  }
  error(buildTaskAiAdjustment(source, { kind: "subtasks" }, "子任务「准备物料」：任务名称改为新名称；子任务「确认场地」：任务名称改为另一名称"));
  error(buildTaskAiAdjustment(source, { kind: "subtasks" }, "添加子任务：资料包；完成标准：提供文件；负责人改为陈默"));
});

test("候选数组不与原任务数组共享可变引用", () => {
  const source = context();
  const before = structuredClone(source);
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "增加完成标准：保留确认记录"));
  next.updates[0].patch.completionCriteria!.push("调用方自己的修改");
  assert.deepEqual(source, before);
});

test("第二条改成或设置为等未知近义要求不能被吞进首字段正文", () => {
  for (const instruction of [
    "任务名称改为新名称，负责人改成陈默",
    "任务名称改为新名称；负责人设置为陈默",
    "目标改为新目标，同时截止时间设为2026-10-01",
    "完成标准改为：提供文件；执行建议改成先核对资料",
    "任务名称改为新名称，然后把负责人设置为陈默",
  ]) error(buildTaskAiAdjustment(context(), { kind: "task" }, instruction), /Mock|一次|不支持/);
  error(buildTaskAiAdjustment(context(), { kind: "subtasks" }, "添加子任务：资料包；完成标准：提供文件；然后把负责人设置为陈默"));
});

test("引号内的精确任务标题可含字段指令字样，不误当成第二条命令", () => {
  const source = context({ mode: "saved" });
  source.dependencyTasks[0].title = "验证负责人改为待定，保留提示";
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「验证负责人改为待定，保留提示」"));
  assert.deepEqual(next.updates[0].patch.dependsOnTaskIds, ["external"]);
  source.subtasks[0].title = "验证负责人改为待定";
  const renamed = proposal(buildTaskAiAdjustment(source, { kind: "subtasks" }, "子任务「验证负责人改为待定」：任务名称改为负责人选择校验"));
  assert.deepEqual(renamed.updates, [{ taskId: "child-a", patch: { title: "负责人选择校验" } }]);
});

test("可选冒号不能被回退解析成空任务名称或空目标正文", () => {
  for (const instruction of ["任务名称改为：", "任务名称改为:", "目标改为：", "目标改为:  "]) {
    error(buildTaskAiAdjustment(context(), { kind: "task" }, instruction));
  }
});

test("额外的负责人或期限字段不能被当成新增任务的完成标准", () => {
  for (const instruction of [
    "添加子任务：资料包；完成标准：提供文件；负责人：陈默",
    "添加子任务：资料包；完成标准：提供文件；截止时间：2026-10-01",
    "添加子任务：资料包；完成标准：提供文件；完成标准：另一份文件",
  ]) error(buildTaskAiAdjustment(context(), { kind: "subtasks" }, instruction));
  error(buildTaskAiAdjustment(context(), { kind: "task" }, "任务名称改为新名称；目标：提高转化"));
});

test("独立打开深层任务时识别真实祖先和后代，不拒绝兄弟依赖", () => {
  const source = context({ mode: "saved", task: task({ parentTaskId: "parent" }), subtasks: [] });
  source.dependencyTasks.push(
    { id: "parent", title: "直属主任务", parentTaskId: "grandparent", dependsOnTaskIds: [] },
    { id: "grandparent", title: "顶层项目", dependsOnTaskIds: [] },
    { id: "nested", title: "下一级任务", parentTaskId: "main", dependsOnTaskIds: [] },
    { id: "leaf", title: "叶子任务", parentTaskId: "nested", dependsOnTaskIds: [] },
    { id: "sibling", title: "同级准备", parentTaskId: "parent", dependsOnTaskIds: [] },
  );
  for (const name of ["直属主任务", "顶层项目", "下一级任务", "叶子任务"]) error(buildTaskAiAdjustment(source, { kind: "task" }, `前置依赖改为「${name}」`), /父子|祖先|后代/);
  assert.deepEqual(proposal(buildTaskAiAdjustment(source, { kind: "task" }, "前置依赖改为「同级准备」")).updates[0].patch.dependsOnTaskIds, ["sibling"]);
});

test("中间层日期未知时继续读取祖先，缺失祖先与历史层级环不死循环", () => {
  const source = context({ mode: "saved", task: task({ parentTaskId: "parent", endDate: "" }), subtasks: [] });
  source.dependencyTasks.push(
    { id: "parent", title: "中间层", parentTaskId: "grandparent", dependsOnTaskIds: [] },
    { id: "grandparent", title: "顶层项目", endDate: "2026-09-25", dependsOnTaskIds: [] },
  );
  error(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-09-26"), /主任务.*截止/);
  assert.equal(proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-09-24")).updates[0].patch.endDate, "2026-09-24");
  source.dependencyTasks.at(-1)!.endDate = undefined;
  source.dependencyTasks.at(-1)!.parentTaskId = "parent";
  assert.equal(proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-10-01")).updates[0].patch.endDate, "2026-10-01");
  source.task.parentTaskId = "missing";
  assert.equal(proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为2026-10-01")).changes.length, 1);
});

test("清空日期后的破折号占位不产生重复变更", () => {
  const source = context({ task: task({ endDate: "", endDateLabel: "—" }) });
  const next = proposal(buildTaskAiAdjustment(source, { kind: "task" }, "截止时间改为待定"));
  assert.deepEqual(next.changes, []);
  assert.deepEqual(next.updates, []);
});

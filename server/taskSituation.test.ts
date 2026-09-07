import assert from "node:assert/strict";
import test from "node:test";
import type { TaskRelationSummary } from "../src/components/TaskRelationsSection";
import type { TaskActivityMock, TaskDetailMock } from "../src/data/taskDetailMocks.ts";
import { defaultTaskSituationSummary, getTaskSituationModel, type TaskSituationInput, type TaskSituationModel } from "../src/lib/taskSituation.ts";

const emptyTask: TaskDetailMock = {
  title: "核对交付文件", goal: "形成可交付结果", owner: "李明", status: "待开始", due: "—",
  participants: [], files: [], activities: [], commits: [], summary: "", completionCriteria: [],
};
const input = (overrides: Partial<TaskSituationInput> = {}): TaskSituationInput => ({
  taskId: "current-task", task: structuredClone(emptyTask), childTasks: [], ...overrides,
});
const relation = (id: string, status: TaskRelationSummary["status"], title = id): TaskRelationSummary => ({
  id, title, goal: "交付范围", owner: "王宁", dueAt: "—", status,
});
const post = (overrides: Partial<TaskActivityMock> = {}): TaskActivityMock => ({
  id: "local-post", author: "李明", message: "已提交交付包，复核尚未完成。", type: "member-post",
  createdAt: "2026-09-01T09:00:00+08:00", time: "刚刚", ...overrides,
});
const allText = (model: TaskSituationModel) => [model.summary, model.notice ?? "", ...model.groups.flatMap(group => group.items.map(item => item.text))].join("\n");
const groupItems = (model: TaskSituationModel, id: string) => model.groups.find(group => group.id === id)!.items;
const groupText = (model: TaskSituationModel, id: string) => model.groups.find(group => group.id === id)!.items.map(item => item.text).join("\n");
const recordedDiscussionItem = (model: TaskSituationModel) => groupItems(model, "attention").find(item => item.reference?.kind === "activity")!;

test("默认摘要保持来源状态语义，取消与阻塞不回退成推进文案", () => {
  const base = { completedChildCount: 0, remainingChildCount: 0, cancelledChildCount: 0 };
  const cancelled = defaultTaskSituationSummary({ ...base, status: "已取消" });
  assert.equal(cancelled, "任务已取消，停止范围与需保留结果待核对。");
  assert.doesNotMatch(cancelled, /正在推进|继续推进|进行中/);

  const blocked = defaultTaskSituationSummary({ ...base, status: "已阻塞", latestDiscussionAuthor: " 王宁 " });
  assert.equal(blocked, "任务已阻塞，最新讨论由王宁补充；阻塞原因与解除条件待核对。");
  assert.doesNotMatch(blocked, /正在推进|继续推进|进行中/);

  assert.equal(defaultTaskSituationSummary({ ...base, status: "进行中" }), "任务进行中，尚未记录交付进展。");
});

test("已知演示任务 ID 与普通 ID 一律只展示当前字段，不补摘要、标准或时间", () => {
  for (const taskId of ["fragrance-creator-wrapup", "fragrance-content", "fragrance-live", "weekly-retro-notes", "unknown", "__proto__"]) {
    const model = getTaskSituationModel(input({ taskId }));
    assert.equal(model.source, "recorded", taskId);
    assert.equal(model.freshness, "missing", taskId);
    assert.equal(model.asOf, undefined, taskId);
    assert.equal(model.asOfSource, undefined, taskId);
    assert.match(model.summary, /待开始/);
    assert.match(groupText(model, "delivery"), /尚未记录已完成内容/);
    assert.match(groupText(model, "attention"), /尚未设置完成标准/);
    assert.deepEqual(model.groups.map(group => group.label), ["已完成内容", "需要关注", "下一步"]);
    assert.doesNotMatch(allText(model), /Mock|示例|演示|功效|彩排|纪要正文|周岚|林洁|2026-08-31/);
  }
});

test("未定义标准与显式清空都保持缺失，不借用已知任务的标准", () => {
  for (const completionCriteria of [undefined, []]) {
    const model = getTaskSituationModel(input({ taskId: "fragrance-content", task: { ...emptyTask, completionCriteria } }));
    assert.match(groupText(model, "attention"), /尚未设置完成标准/);
    assert.doesNotMatch(allText(model), /卖点|礼盒|合规/);
  }
});

test("混合活动、旧 summary 和文件不能冒充明确传入的本地讨论", () => {
  const model = getTaskSituationModel(input({ task: {
    ...emptyTask, summary: "已经验收且没有风险", activities: [post({ message: "这是未核验的混合活动" })],
    files: [{ id: "old-file", kind: "file", name: "全部已验收.md", parentId: null, updatedAt: "今天", content: "已全部完成" }],
  } }));
  assert.equal(model.asOf, undefined);
  assert.match(groupText(model, "delivery"), /尚未记录已完成内容/);
  assert.doesNotMatch(allText(model), /已经验收|没有风险|未核验的混合活动|全部已验收|已全部完成/);
});

test("最新有效本地发言按实际时间引用原文，不把声明升级为验收", () => {
  const latest = post({ id: "latest", type: "member-reply", replyToActivityId: "old", author: "王宁", message: "  我认为已完成；仍请李明核对。\n缺失项见清单。  ", createdAt: "2026-09-01T04:00:00Z" });
  const model = getTaskSituationModel(input({ recordedActivities: [latest, post({ id: "old" })] }));
  assert.equal(model.source, "recorded");
  assert.equal(model.freshness, "current");
  assert.equal(model.asOf, latest.createdAt);
  assert.equal(model.asOfSource, "discussion");
  assert.match(model.summary, /待开始.*王宁/);
  assert.ok(groupText(model, "attention").includes(latest.message));
  assert.match(groupText(model, "attention"), /王宁记录/);
  assert.doesNotMatch(groupText(model, "delivery"), /王宁|我认为已完成/);
  assert.deepEqual(recordedDiscussionItem(model).reference, { kind: "activity", id: "latest", label: "查看讨论依据" });
  assert.doesNotMatch(allText(model), /已验收|全部达标|自动完成/);
});

test("长讨论摘录至多120个Unicode码点并显示省略，完整中英文及emoji原文保持不变", () => {
  for (const message of ["交付已记录，剩余问题待核对。".repeat(20), "Delivery recorded; remaining items await review. ".repeat(8), "进展😀".repeat(60)]) {
    const activity = post({ message });
    const before = structuredClone(activity);
    const model = getTaskSituationModel(input({ recordedActivities: [activity] }));
    const item = recordedDiscussionItem(model);
    const excerpt = item.text.slice("李明记录：“".length, -1);
    assert.equal(Array.from(excerpt).length, 120);
    assert.equal(excerpt, Array.from(message).slice(0, 119).join("") + "…");
    assert.deepEqual(item.reference, { kind: "activity", id: activity.id, label: "查看讨论依据" });
    assert.deepEqual(activity, before);
  }
});

test("讨论摘录边界不截断emoji代理对，恰好120码点的短原文不省略", () => {
  const boundary = "A".repeat(118) + "😀";
  const long = post({ message: boundary + "待核对剩余事项" });
  const longItem = recordedDiscussionItem(getTaskSituationModel(input({ recordedActivities: [long] })));
  assert.equal(longItem.text, "李明记录：“" + boundary + "…”");
  assert.doesNotMatch(longItem.text, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  const exact = post({ message: boundary + "。" });
  const exactItem = recordedDiscussionItem(getTaskSituationModel(input({ recordedActivities: [exact] })));
  assert.equal(exactItem.text, "李明记录：“" + exact.message + "”");
  assert.doesNotMatch(exactItem.text, /…/);
});

test("新增和移除本地记录即时反映，不遗留旧摘要或失效引用", () => {
  const value = input({ recordedActivities: [post()] });
  assert.match(groupText(getTaskSituationModel(value), "attention"), /已提交交付包/);
  value.recordedActivities!.push(post({ id: "newer", message: "交付包已撤回修订。", createdAt: "2026-09-02T09:00:00+08:00" }));
  const second = getTaskSituationModel(value);
  assert.match(groupText(second, "attention"), /交付包已撤回修订/);
  assert.doesNotMatch(groupText(second, "attention"), /已提交交付包/);
  value.recordedActivities = [];
  const removed = getTaskSituationModel(value);
  assert.equal(removed.asOf, undefined);
  assert.equal(removed.asOfSource, undefined);
  assert.match(groupText(removed, "delivery"), /尚未记录已完成内容/);
  assert.ok(!removed.groups.some(group => group.items.some(item => item.reference?.kind === "activity")));
});

test("无效日期、空记录和自动活动不产生讨论摘要或虚构截至时间", () => {
  for (const record of [
    post({ createdAt: undefined }), post({ createdAt: "今天 09:00" }), post({ createdAt: "2026-02-30T09:00:00+08:00" }),
    post({ createdAt: "2026-09-01" }), post({ id: "" }), post({ author: " " }), post({ message: " " }),
    post({ type: "ai-insight" }), post({ type: "status-change" }),
  ]) {
    const model = getTaskSituationModel(input({ recordedActivities: [record] }));
    assert.equal(model.asOf, undefined, JSON.stringify(record));
    assert.match(groupText(model, "delivery"), /尚未记录已完成内容/);
    assert.doesNotMatch(allText(model), /已提交交付包/);
  }
});

test("当前状态、负责人和标准立即更新，缺数据不推断无风险或正常交付", () => {
  const value = input();
  value.task = { ...value.task, title: "修订任务", goal: "修订目标", due: "9 月 20 日", owner: "韩序", status: "已完成", completionCriteria: ["保留验证记录"] };
  const model = getTaskSituationModel(value);
  assert.match(model.summary, /已完成/);
  assert.match(groupText(model, "next"), /^建议韩序/);
  assert.match(groupText(model, "attention"), /完成标准.*核对|核对.*完成标准/);
  assert.deepEqual(groupItems(model, "delivery"), [{
    text: "本任务标记已完成，交付结果仍需核对。",
    reference: { kind: "criteria", label: "核对完成标准" },
  }]);
  assert.doesNotMatch(allText(model), /尚未设置完成标准|无风险|按时|正常推进|停工|低风险|已经交付|过期|示例/);
});

test("负责人显示名仅用于当前情况文案，不改写任务中的稳定责任ID", () => {
  const value = input({ task: { ...emptyTask, owner: "user-123" }, ownerName: " 新的显示名字 " });
  const before = structuredClone(value);
  const model = getTaskSituationModel(value);
  assert.match(groupText(model, "next"), /^建议新的显示名字/);
  assert.doesNotMatch(allText(model), /user-123|负责人尚未明确/);
  assert.equal(value.task.owner, "user-123");
  assert.deepEqual(value, before);
  const withoutDisplayName = getTaskSituationModel(input({ task: { ...emptyTask, owner: "user-123" } }));
  assert.match(groupText(withoutDisplayName, "next"), /^建议user-123/);
});

test("父任务只汇总当前子任务状态、真实名称和取消项，不声称业务验收", () => {
  const children = [relation("fragrance-creator-business", "已完成", "当前商务交付名称"), relation("pending", "进行中", "剩余工作"), relation("cancelled", "已取消", "已撤销范围")];
  const model = getTaskSituationModel(input({ childTasks: children }));
  assert.equal(model.freshness, "current");
  assert.equal(model.asOf, undefined);
  assert.match(groupText(model, "delivery"), /当前商务交付名称.*标记已完成/);
  assert.match(model.summary, /1项待收口.*1项已取消/);
  assert.deepEqual(groupItems(model, "delivery").map(item => item.reference?.id), ["fragrance-creator-business"]);
  assert.doesNotMatch(allText(model), /商务、商品、数据|%|已验收|自动完成|全部交付/);
});

test("完成项超过三条时仍逐项保留完整名称和直接入口，不把剩余或取消项混入完成列表", () => {
  const completed = Array.from({ length: 5 }, (_, index) => relation("completed-" + index, "已完成", "第" + (index + 1) + "项独立交付结果"));
  const model = getTaskSituationModel(input({ childTasks: [...completed, relation("pending", "进行中"), relation("cancelled", "已取消")] }));
  const items = groupItems(model, "delivery");
  assert.equal(items.length, completed.length);
  for (const [index, child] of completed.entries()) {
    assert.equal(items[index].text, "「" + child.title + "」标记已完成。");
    assert.deepEqual(items[index].reference, { kind: "task", id: child.id, label: "查看任务" });
  }
  assert.match(model.summary, /5项子任务标记已完成，1项待收口，1项已取消/);
  assert.doesNotMatch(groupText(model, "delivery"), /pending|cancelled|等5项/);
});

test("子任务改名和改状态立即替换父任务中的旧事实", () => {
  const value = input({ childTasks: [relation("one", "已完成", "旧名称"), relation("two", "已阻塞", "待交付")] });
  assert.match(allText(getTaskSituationModel(value)), /旧名称|已阻塞/);
  value.childTasks[0].title = "新的对账交付";
  value.childTasks[1].status = "已完成";
  const model = getTaskSituationModel(value);
  assert.equal(model.freshness, "current");
  assert.deepEqual(groupItems(model, "delivery").map(item => item.text), ["「新的对账交付」标记已完成。", "「待交付」标记已完成。"]);
  assert.deepEqual(groupItems(model, "delivery").map(item => item.reference?.id), ["one", "two"]);
  assert.doesNotMatch(allText(model), /旧名称|已阻塞|旧示例/);
});

test("父子完成矛盾、子项阻塞与已完成子项的未完成前置均保留", () => {
  const children = [
    { ...relation("done", "已完成", "结果核对"), dependsOnTaskIds: ["blocked"] },
    relation("blocked", "已阻塞", "资料交付"),
  ];
  const model = getTaskSituationModel(input({ task: { ...emptyTask, status: "已完成" }, childTasks: children }));
  const attention = groupText(model, "attention");
  assert.match(attention, /父任务标记已完成.*子任务「资料交付」.*尚未收口/);
  assert.match(attention, /资料交付.*已阻塞/);
  assert.match(attention, /结果核对.*已完成.*前置仍未完成/);
});

test("多个前置、阻塞和完成矛盾各有独立任务入口，下一步仍只给优先处理建议", () => {
  const value = input({
    task: { ...emptyTask, status: "进行中" },
    dependencyTasks: [relation("external-one", "进行中", "外部交付一"), relation("external-two", "已取消", "外部交付二"), relation("external-done", "已完成")],
    childTasks: [
      relation("blocked-one", "已阻塞", "阻塞交付一"), relation("blocked-two", "已阻塞", "阻塞交付二"),
      { ...relation("done-one", "已完成", "结果一"), dependsOnTaskIds: ["blocked-one"] },
      { ...relation("done-two", "已完成", "结果二"), dependsOnTaskIds: ["blocked-two"] },
    ],
  });
  const before = structuredClone(value);
  const model = getTaskSituationModel(value);
  const attention = groupItems(model, "attention");
  assert.deepEqual(attention.map(item => item.reference?.id), ["external-one", "external-two", "blocked-one", "blocked-two", "done-one", "done-two"]);
  assert.ok(attention.every(item => item.reference?.kind === "task"));
  assert.ok(attention.every(item => item.text.includes([...value.dependencyTasks!, ...value.childTasks].find(task => task.id === item.reference!.id)!.title)));
  assert.doesNotMatch(groupText(model, "attention"), /另有|external-done/);
  assert.equal(groupItems(model, "next").length, 1);
  assert.equal(groupItems(model, "next")[0].reference?.id, "external-one");
  assert.match(groupText(model, "next"), /^建议李明.*外部交付一/);
  assert.deepEqual(value, before);

  value.dependencyTaskIds = [];
  const withoutExternal = getTaskSituationModel(value);
  assert.deepEqual(groupItems(withoutExternal, "attention").map(item => item.reference?.id), ["blocked-one", "blocked-two", "done-one", "done-two"]);
  assert.equal(groupItems(withoutExternal, "next")[0].reference?.id, "blocked-one");
});

test("父任务完成或取消但子任务仍未收口时，逐项定位实际子任务", () => {
  for (const status of ["已完成", "已取消"] as const) {
    const model = getTaskSituationModel(input({ task: { ...emptyTask, status }, childTasks: [
      relation("pending-one", "待开始", "待交付一"), relation("pending-two", "进行中", "待交付二"), relation("cancelled", "已取消"),
    ] }));
    const attention = groupItems(model, "attention");
    assert.equal(attention.length, 2);
    assert.deepEqual(attention.map(item => item.reference?.id), ["pending-one", "pending-two"]);
    assert.ok(attention.every(item => item.reference?.kind === "task"));
    assert.match(model.summary, /2项待收口，1项已取消/);
    assert.match(groupText(model, "delivery"), /尚无子任务标记已完成/);
    assert.equal(groupItems(model, "delivery")[0].reference, undefined);
  }
});

test("已完成但前置未完成只提示矛盾，不自动修改输入", () => {
  const value = input({ task: { ...emptyTask, status: "已完成" }, dependencyTaskIds: ["prerequisite"], dependencyTasks: [relation("prerequisite", "进行中", "前置报告")] });
  const before = structuredClone(value);
  const model = getTaskSituationModel(value);
  assert.match(groupText(model, "attention"), /本任务标记已完成.*前置「前置报告」仍为进行中/);
  assert.match(groupText(model, "next"), /^建议李明.*前置/);
  assert.deepEqual(value, before);
});

test("显式移除依赖后不再显示，缺失依赖资料不能生成假引用", () => {
  const value = input({ taskId: "fragrance-live", dependencyTaskIds: [], dependencyTasks: [relation("old", "已阻塞", "不再依赖的任务")] });
  assert.doesNotMatch(allText(getTaskSituationModel(value)), /不再依赖的任务|前置任务/);
  value.dependencyTaskIds = ["not-provided", "not-provided"];
  value.dependencyTasks = [];
  const model = getTaskSituationModel(value);
  assert.equal(model.freshness, "missing");
  assert.match(groupText(model, "attention"), /1项前置任务.*未提供/);
  assert.doesNotMatch(JSON.stringify(model.groups), /not-provided/);
  assert.ok(!model.groups.some(group => group.items.some(item => item.reference?.kind === "task")));
  assert.equal(groupItems(model, "attention")[0].reference?.kind, "details");
  assert.equal(groupItems(model, "next")[0].reference?.kind, "details");
});

test("缺信息和一般行动使用当前任务信息或讨论入口，不制造来源ID", () => {
  const missingOwner = getTaskSituationModel(input({ task: { ...emptyTask, owner: " " } }));
  assert.deepEqual(groupItems(missingOwner, "attention")[0].reference, { kind: "details", label: "查看任务信息" });

  for (const status of ["已阻塞", "已取消"] as const) {
    const model = getTaskSituationModel(input({ task: { ...emptyTask, status } }));
    assert.deepEqual(groupItems(model, "next")[0].reference, { kind: "details", label: "查看任务信息" });
  }

  const ongoing = getTaskSituationModel(input({ task: { ...emptyTask, status: "进行中", completionCriteria: ["提交可核对的结果"] } }));
  assert.deepEqual(groupItems(ongoing, "next")[0].reference, { kind: "discussion", label: "前往讨论" });
  assert.deepEqual(groupItems(ongoing, "delivery"), [{ text: "尚未记录已完成内容。" }]);
});

test("只有显式提供的依赖参与判断，省略 ID 时可使用提供的依赖对象", () => {
  const model = getTaskSituationModel(input({ taskId: "fragrance-live", dependencyTasks: [relation("actual", "待开始", "实际前置")] }));
  assert.match(groupText(model, "attention"), /实际前置.*待开始/);
  assert.doesNotMatch(allText(model), /终审短视频|香氛|林洁/);
});

test("父任务外部依赖、缺资料和内部矛盾不会互相截掉", () => {
  const model = getTaskSituationModel(input({
    task: { ...emptyTask, status: "已完成" }, childTasks: [relation("child", "已阻塞", "内部交付")],
    dependencyTaskIds: ["external", "missing"], dependencyTasks: [relation("external", "进行中", "外部交付")],
  }));
  const text = groupText(model, "attention");
  assert.match(text, /1项前置任务.*未提供/);
  assert.match(text, /外部交付.*进行中/);
  assert.match(text, /父任务标记已完成/);
  assert.match(text, /内部交付.*已阻塞/);
});

test("取消任务不建议恢复执行，未确定负责人不冒充已指派责任", () => {
  const model = getTaskSituationModel(input({ task: { ...emptyTask, status: "已取消", owner: " " }, childTasks: [relation("child", "进行中", "子任务")] }));
  assert.match(model.summary, /已取消/);
  assert.match(groupText(model, "attention"), /负责人尚未明确/);
  assert.match(groupText(model, "attention"), /已取消.*子任务|子任务.*未收口/);
  assert.match(groupText(model, "next"), /^建议先明确负责人.*停止范围/);
  assert.doesNotMatch(groupText(model, "next"), /建议周岚|立即执行|恢复执行/);
});

test("有本地讨论的父任务保留状态汇总及原文来源，不以讨论覆盖子项事实", () => {
  const model = getTaskSituationModel(input({ childTasks: [relation("child", "进行中", "当前交付")], recordedActivities: [post({ message: "我认为项目已经全部完成。" })] }));
  assert.match(model.summary, /1项待收口/);
  assert.match(groupText(model, "delivery"), /尚无子任务标记已完成/);
  assert.match(groupText(model, "attention"), /李明记录.*我认为项目已经全部完成/);
  assert.doesNotMatch(groupText(model, "delivery"), /我认为项目已经全部完成/);
  assert.doesNotMatch(model.summary, /已经全部完成/);
});

test("输出与输入相互隔离，不改写当前记录、任务或依赖", () => {
  const value = input({ childTasks: [relation("child", "进行中")], recordedActivities: [post()] });
  const before = structuredClone(value);
  const original = getTaskSituationModel(value);
  const changed = getTaskSituationModel(value);
  changed.groups[0].items[0].text = "不应影响下一次读取";
  assert.deepEqual(value, before);
  assert.deepEqual(getTaskSituationModel(value), original);
});

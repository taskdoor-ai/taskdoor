import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceTaskDetail, taskDetailMocks, type TaskDetailId, type TaskDetailMock } from "../src/data/taskDetailMocks.ts";
import { getTaskProgressEvents } from "../src/data/taskProgressExamples.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import {
  buildPersonalWorkbenchItems,
  buildPersonalWorkbenchModel,
  type PersonalWorkbenchAttention,
  type PersonalWorkbenchInput,
} from "../src/lib/personalWorkbench.ts";

const asOf = "2026-08-31T12:00:00+08:00";
function task(id: string, overrides: Partial<TaskNode> = {}): TaskNode {
  return { id, kind: "task", name: id, parentId: "root", ownerId: "me", status: "进行中", updatedAt: "时间未知", goal: "形成明确结果", ...overrides };
}
function detail(node: TaskNode, overrides: Partial<TaskDetailMock> = {}): TaskDetailMock {
  return {
    title: node.name, goal: node.goal ?? "", owner: node.ownerId, status: node.status,
    due: node.dueAt ?? "—", participants: node.participantIds ?? [], summary: "", files: [], activities: [], commits: [],
    ...overrides,
  };
}
function fixture(): PersonalWorkbenchInput {
  const tasks = structuredClone(workspaceNodes.filter((node): node is TaskNode => node.kind === "task"));
  const detailsByTaskId = Object.fromEntries(tasks.map((node) => [node.id, structuredClone(taskDetailMocks[node.id as TaskDetailId] ?? createWorkspaceTaskDetail(node))]));
  return { tasks, currentUserId: "周岚", asOf, detailsByTaskId };
}

/** 测试只保留指定任务树，避免无关 fixture 新增项改变当前情况或近期变化。 */
function selectTaskTree(input: PersonalWorkbenchInput, rootTaskId: string): PersonalWorkbenchInput {
  const selectedIds = new Set([rootTaskId]);
  let previousSize = -1;
  while (selectedIds.size !== previousSize) {
    previousSize = selectedIds.size;
    for (const node of input.tasks) if (node.parentTaskId && selectedIds.has(node.parentTaskId)) selectedIds.add(node.id);
  }
  return {
    ...input,
    tasks: input.tasks.filter((node) => selectedIds.has(node.id)),
    detailsByTaskId: input.detailsByTaskId
      ? Object.fromEntries(Object.entries(input.detailsByTaskId).filter(([taskId]) => selectedIds.has(taskId)))
      : undefined,
  };
}

test("只按稳定Owner ID覆盖全部有效任务，旧提议迁移为负责，参与不算负责，已结束不进入行动", () => {
  const tasks = [
    task("owner-active", { labels: ["甲", "乙"] }),
    task("owner-completed", { status: "已完成" }),
    task("owner-cancelled", { status: "已取消" }),
    task("proposed", { ownerId: "other", proposedOwnerId: "me" }),
    task("participant", { ownerId: "other", participantIds: ["me"] }),
    task("display-name", { ownerId: "我的新显示名称" }),
  ];
  const model = buildPersonalWorkbenchModel({ tasks, currentUserId: "me", asOf });
  assert.deepEqual(model.actions.map((item) => item.taskId), ["owner-active", "proposed"]);
  assert.equal(model.counts.owned, 4);
  assert.equal(model.counts.active, 2);
  assert.equal(model.counts.completed, 1);
  assert.equal(model.counts.cancelled, 1);
  assert.equal(model.counts.awaitingAcceptance, 0);
  assert.deepEqual(model.awaitingAcceptance, []);
  assert.equal(model.ownedTasks.length, 4);
  assert.equal(buildPersonalWorkbenchModel({ tasks, currentUserId: "", asOf }).counts.owned, 0);
});

test("父级协调与本人叶子分别承担行动，标签及父子不造成重复任务或工时累加", () => {
  const parent = task("parent");
  const child = task("own-leaf", { parentTaskId: parent.id, labels: ["甲", "乙"] });
  const otherChild = task("other-leaf", { parentTaskId: parent.id, ownerId: "other" });
  const model = buildPersonalWorkbenchModel({ tasks: [parent, child, otherChild, child], currentUserId: "me", asOf });
  assert.equal(model.counts.owned, 2);
  assert.equal(model.counts.coordinating, 1);
  assert.equal(model.counts.executing, 1);
  assert.deepEqual(new Set(model.actions.map((item) => item.taskId)), new Set(["parent", "own-leaf"]));
  assert.equal(model.actions.find((item) => item.taskId === "parent")?.role, "coordination");
  assert.equal(model.actions.find((item) => item.taskId === "own-leaf")?.role, "execution");
  assert.doesNotMatch(JSON.stringify(model), /totalHours|remainingHours|capacity|effortEstimate/);
});

test("父子同Owner的同一阻塞只安排给本人叶子，父级保留整体协调动作", () => {
  const parent = task("parent");
  const child = task("child", { parentTaskId: parent.id, dependsOnTaskIds: ["prerequisite"] });
  const prerequisite = task("prerequisite", { ownerId: "other", status: "待开始" });
  const model = buildPersonalWorkbenchModel({ tasks: [parent, child, prerequisite], currentUserId: "me", asOf });
  const parentAction = model.actions.find((item) => item.taskId === "parent")!;
  const childAction = model.actions.find((item) => item.taskId === "child")!;
  assert.match(childAction.action, /先核对「prerequisite」/);
  assert.equal(childAction.focus, "dependency");
  assert.notEqual(parentAction.focus, "dependency", "父级整体协调不能沿用已分给本人叶子的阻塞标签");
  assert.doesNotMatch(parentAction.action, /先核对「prerequisite」/);
  assert.match(parentAction.action, /整体交付边界与整合结果/);
  assert.equal(model.actions.filter((item) => item.reason.includes("前置「prerequisite」")).length, 1);
  assert.ok(!model.attention.some((item) => item.id === "child:dependency"));
});

test("父级统筹递归覆盖深层阻塞，最近的本人责任节点负责，循环关系不死循环", () => {
  const root = task("root");
  const middle = task("middle", { parentTaskId: root.id, ownerId: "other" });
  const leaf = task("leaf", { parentTaskId: middle.id, ownerId: "other", status: "已阻塞" });
  const model = buildPersonalWorkbenchModel({ tasks: [root, middle, leaf], currentUserId: "me", asOf });
  assert.match(model.actions[0].action, /协调「leaf」/);
  assert.match(model.actions[0].reason, /已阻塞/);
  assert.equal(model.actions[0].focus, "blocked");
  middle.ownerId = "me";
  const delegated = buildPersonalWorkbenchModel({ tasks: [root, middle, leaf], currentUserId: "me", asOf });
  assert.equal(delegated.actions.filter((item) => item.action.includes("协调「leaf」")).length, 1);
  assert.match(delegated.actions.find((item) => item.taskId === "middle")!.action, /协调「leaf」/);
  root.parentTaskId = middle.id;
  const cycle = buildPersonalWorkbenchModel({ tasks: [root, middle, leaf], currentUserId: "me", asOf });
  assert.equal(cycle.actions.length, 2);
  assert.equal(cycle.actions.filter((item) => item.action.includes("协调「leaf」")).length, 1);
});

test("多层已完成父级不能掩盖深层未收口结果，冲突保留但不自动恢复完成任务", () => {
  const root = task("root", { status: "已完成" });
  const middle = task("middle", { parentTaskId: root.id, ownerId: "other", status: "已完成" });
  const leaf = task("leaf", { parentTaskId: middle.id, ownerId: "other", status: "进行中" });
  const model = buildPersonalWorkbenchModel({ tasks: [root, middle, leaf], currentUserId: "me", asOf });
  assert.equal(model.actions.length, 0);
  assert.ok(model.attention.some((item) => item.id === "root:children-status"));
  assert.ok(model.attention.some((item) => item.id === "middle:children-status"));
  assert.match(model.summary, /状态与交付边界仍有待核对/);
  root.status = "进行中";
  const activeRoot = buildPersonalWorkbenchModel({ tasks: [root, middle, leaf], currentUserId: "me", asOf });
  assert.match(activeRoot.actions[0].action, /协调「middle」/);
  assert.match(activeRoot.actions[0].reason, /下级任务未收口/);
  assert.equal(activeRoot.actions[0].focus, "status-conflict");
  assert.equal(activeRoot.attention.filter((item) => item.id === "middle:children-status").length, 0);
});

test("预置日期固定锚定2026-08-31，次日不会把旧的今天16点重新当今天", () => {
  const input = fixture();
  const sameDay = buildPersonalWorkbenchModel(input).actions.find((item) => item.taskId === "fragrance-final-decision")!;
  assert.equal(sameDay.dueState, "today");
  assert.equal(sameDay.dueLabel, "8 月 31 日 16:00");
  const nextDay = buildPersonalWorkbenchModel({ ...input, asOf: "2026-09-01T10:00:00+08:00" }).actions.find((item) => item.taskId === "fragrance-final-decision")!;
  assert.equal(nextDay.dueState, "overdue");
  assert.equal(nextDay.dueLabel, sameDay.dueLabel);
  const laterYear = buildPersonalWorkbenchModel({ ...input, asOf: "2027-08-31T10:00:00+08:00" }).actions.find((item) => item.taskId === "weekly-retro-notes")!;
  assert.equal(laterYear.dueState, "overdue");
});

test("自建任务的缺年份/相对日期保持未知，明确计划日期按上海日判断但不假设午夜截止", () => {
  const tasks = [
    task("relative", { dueAt: "今天 16:00", createdFrom: "task-planner" }),
    task("yearless", { dueAt: "8 月 31 日" }),
    task("absolute-day", { plannedEndOn: "2026-08-31" }),
    task("absolute-time", { dueAt: "2026-08-31T11:00:00+08:00" }),
    task("invalid-day", { plannedEndOn: "2026-02-30" }),
    task("invalid-hour", { dueAt: "2026-08-31T24:00:00+08:00" }),
  ];
  const model = buildPersonalWorkbenchModel({ tasks, currentUserId: "me", asOf });
  const byId = new Map(model.actions.map((item) => [item.taskId, item]));
  assert.equal(byId.get("relative")?.dueState, "unknown");
  assert.equal(byId.get("yearless")?.dueState, "unknown");
  assert.equal(byId.get("absolute-day")?.dueState, "today");
  assert.equal(byId.get("absolute-time")?.dueState, "overdue");
  assert.equal(byId.get("invalid-day")?.dueState, "unknown");
  assert.equal(byId.get("invalid-hour")?.dueState, "unknown");
  const beforeShanghaiMidnight = buildPersonalWorkbenchModel({ tasks: [tasks[2]], currentUserId: "me", asOf: "2026-08-30T15:59:00Z" });
  assert.equal(beforeShanghaiMidnight.actions[0].dueState, "upcoming");
  const afterShanghaiMidnight = buildPersonalWorkbenchModel({ tasks: [tasks[2]], currentUserId: "me", asOf: "2026-08-30T16:01:00Z" });
  assert.equal(afterShanghaiMidnight.actions[0].dueState, "today");
});

test("按逾期、今天、已知依赖组织行动，阻塞不建议直接执行或验收", () => {
  const dependency = task("dependency", { name: "前置交付", status: "待开始", ownerId: "other" });
  const tasks = [
    task("upcoming", { plannedEndOn: "2026-09-05" }),
    task("today", { status: "待审核", plannedEndOn: "2026-08-31", dependsOnTaskIds: [dependency.id] }),
    task("overdue", { plannedEndOn: "2026-08-30" }),
    dependency,
  ];
  const model = buildPersonalWorkbenchModel({ tasks, currentUserId: "me", asOf });
  assert.deepEqual(model.actions.map((item) => item.taskId), ["overdue", "today", "upcoming"]);
  assert.match(model.actions[1].action, /先核对「前置交付」的交付条件/);
  assert.match(model.actions[1].reason, /待开始/);
  assert.equal(model.actions[1].focus, "dependency", "今日截止也不能覆盖行动所依据的前置问题语义");
  assert.doesNotMatch(model.actions[1].action, /请验收|立即执行|可直接推进/);
  assert.ok(!model.attention.some((item) => item.id === "today:dependency"), "行动理由已有的同一问题不在关注区再复制");
});

test("同一天两项都有明确时刻时优先较早截止，日期型任务不被补成午夜", () => {
  const tasks = [
    task("late", { dueAt: "2026-08-31T22:00:00+08:00" }),
    task("early", { dueAt: "2026-08-31T14:00:00+08:00" }),
  ];
  const model = buildPersonalWorkbenchModel({ tasks, currentUserId: "me", asOf });
  assert.deepEqual(model.actions.map((item) => item.taskId), ["early", "late"]);
  assert.equal(model.actions[0].dueState, "today");
  const dateOnly = buildPersonalWorkbenchModel({ tasks: [task("day", { plannedEndOn: "2026-08-31" })], currentUserId: "me", asOf });
  assert.equal(dateOnly.actions[0].dueState, "today");
  assert.doesNotMatch(dateOnly.actions[0].dueLabel, /00:00/);
  const mixed = buildPersonalWorkbenchModel({ tasks: [tasks[0], task("day", { plannedEndOn: "2026-08-31" }), tasks[1]], currentUserId: "me", asOf });
  assert.deepEqual(mixed.actions.map((item) => item.taskId), ["early", "day", "late"]);
});

test("明确截止时刻优先于计划结束日，周期安排不冒充单次截止", () => {
  const explicit = task("explicit", {
    dueAt: "2026-08-31T14:00:00+08:00",
    plannedEndOn: "2026-08-31",
  });
  const recurring = task("recurring", {
    dueAt: "每个工作日 10:30",
    plannedEndOn: "2026-12-31",
  });
  const model = buildPersonalWorkbenchModel({ tasks: [explicit, recurring], currentUserId: "me", asOf });
  const byId = new Map(model.actions.map((item) => [item.taskId, item]));
  assert.equal(byId.get("explicit")?.dueState, "today");
  assert.equal(byId.get("explicit")?.dueLabel, "8 月 31 日 14:00");
  assert.equal(byId.get("recurring")?.dueState, "none");
  assert.doesNotMatch(byId.get("recurring")?.dueLabel ?? "", /12 月 31 日/);
});

test("个人行动使用你，不把稳定用户ID当姓名输出，Owner匹配规则不改变", () => {
  const model = buildPersonalWorkbenchModel({ tasks: [task("personal", { ownerId: "user-123" })], currentUserId: "user-123", asOf });
  assert.equal(model.actions.length, 1);
  assert.match(model.actions[0].action, /^建议你/);
  assert.doesNotMatch(JSON.stringify(model), /user-123/);
});

test("建议句只将本人Owner替换为你，保留建议语气、具体动作和任务归属", () => {
  const tasks = [
    task("personal", { ownerId: "user-123", completionCriteria: [] }),
    task("other", { ownerId: "other-owner", proposedOwnerId: "user-123" }),
  ];
  const before = structuredClone(tasks);
  const model = buildPersonalWorkbenchModel({ tasks, currentUserId: "user-123", asOf });
  assert.deepEqual(model.actions.map(item => item.taskId), ["personal", "other"]);
  assert.equal(model.actions[0].action, "建议你先明确可核对的完成标准。");
  assert.equal(model.actions[0].source, "recorded");
  assert.equal(model.actions[0].freshness, "missing");
  assert.equal(model.actions[0].evidence?.taskId, "personal");
  assert.deepEqual(model.awaitingAcceptance, []);
  assert.doesNotMatch(JSON.stringify(model), /user-123/);
  assert.deepEqual(tasks, before);
});

test("不可查看的依赖只显示资料缺口，不泄露ID、名称或推断正常", () => {
  const node = task("visible", { dependsOnTaskIds: ["secret-project-id"], plannedEndOn: "2026-08-31" });
  const model = buildPersonalWorkbenchModel({ tasks: [node], currentUserId: "me", asOf });
  assert.match(model.actions[0].reason, /资料当前不可用/);
  assert.match(model.actions[0].action, /先核对前置资料/);
  assert.equal(model.actions[0].focus, "unknown");
  assert.doesNotMatch(JSON.stringify(model), /secret-project-id|无风险|依赖已满足/);
  assert.equal(model.actions[0].evidence?.taskId, node.id);
});

test("依赖已完成不再报阻塞，已完成任务的依赖冲突仍可核对但不恢复执行", () => {
  const dependency = task("dependency", { ownerId: "other", status: "已完成" });
  const active = task("active", { dependsOnTaskIds: [dependency.id] });
  const good = buildPersonalWorkbenchModel({ tasks: [dependency, active], currentUserId: "me", asOf });
  assert.doesNotMatch(good.actions[0].reason, /前置「/);
  assert.notEqual(good.actions[0].focus, "dependency", "前置已完成后不保留旧阻塞提示");
  const completed = task("completed", { status: "已完成", dependsOnTaskIds: [dependency.id] });
  dependency.status = "进行中";
  const conflict = buildPersonalWorkbenchModel({ tasks: [dependency, completed], currentUserId: "me", asOf });
  assert.equal(conflict.actions.length, 0);
  assert.ok(conflict.attention.some((item) => item.kind === "status-conflict"));
  assert.match(conflict.attention[0].text, /标记已完成，但前置/);
});

test("首页摘要只使用当前任务和子项事实，混合历史不恢复预制判断", () => {
  const input = fixture();
  const current = buildPersonalWorkbenchModel(input);
  assert.equal(current.ownedTasks.find((item) => item.taskId === "fragrance-final-decision")?.freshness, "missing");
  assert.match(current.ownedTasks.find((item) => item.taskId === "fragrance-final-decision")!.summary, /尚未记录交付进展/);
  input.tasks.find((node) => node.id === "fragrance-final-decision")!.name = "核对新的投入边界";
  input.tasks.find((node) => node.id === "fragrance-live")!.status = "已完成";
  input.detailsByTaskId!["fragrance-final-decision"].activities.push({ id: "new-comment", author: "周岚", type: "member-post", time: "刚刚", createdAt: "2026-08-31T10:00:00+08:00", message: "补充了新的投入边界版本" });
  const changed = buildPersonalWorkbenchModel(input);
  assert.equal(changed.ownedTasks.find((item) => item.taskId === "fragrance-final-decision")?.freshness, "missing");
  const parent = changed.ownedTasks.find((item) => item.taskId === "fragrance-creator-wrapup")!;
  assert.equal(parent.freshness, "current");
  assert.match(parent.summary, /4项子任务标记已完成，4项待收口/);
  assert.equal(changed.ownedTasks.find((item) => item.taskId === "fragrance-final-decision")!.title, "核对新的投入边界");
  assert.doesNotMatch(changed.ownedTasks.find((item) => item.taskId === "fragrance-final-decision")!.summary, /追加预算测算已提交/);
  assert.doesNotMatch(changed.ownedTasks.find((item) => item.taskId === "fragrance-final-decision")!.summary, /补充了新的投入边界版本/);
  assert.doesNotMatch(changed.actions.find((item) => item.taskId === "fragrance-final-decision")!.action, /先取得合规结论/);
});

test("首页当前状态总结与详情页共用可信记录投影", () => {
  const node = task("shared-situation", { status: "进行中" });
  const recordedActivity = {
    id: "recorded-progress", author: "周岚", type: "member-post" as const, time: "09:30",
    createdAt: "2026-08-31T09:30:00+08:00", message: "已补充当前交付进展。",
  };
  const model = buildPersonalWorkbenchModel({
    tasks: [node], currentUserId: "me", asOf,
    detailsByTaskId: { [node.id]: detail(node, {
      summary: "旧摘要不得回填", activities: [{ ...recordedActivity, id: "mixed-history", author: "旧记录" }],
    }) },
    recordedActivitiesByTaskId: { [node.id]: [recordedActivity] },
  });

  assert.equal(model.ownedTasks[0].summary, "任务进行中，最新讨论由周岚补充。");
  assert.equal(model.ownedTasks[0].freshness, "current");
  assert.doesNotMatch(model.ownedTasks[0].summary, /旧摘要|旧记录/);
});

test("计划日期改变立即反映，缺交付记录仍保持未知而不沿用固定叙述", () => {
  const input = selectTaskTree(fixture(), "weekly-retro-notes");
  input.tasks = input.tasks.filter((node) => node.id === "weekly-retro-notes");
  input.tasks.find((node) => node.id === "weekly-retro-notes")!.plannedEndOn = "2026-09-02";
  const model = buildPersonalWorkbenchModel(input);
  const item = model.ownedTasks.find((row) => row.taskId === "weekly-retro-notes")!;
  assert.equal(item.freshness, "missing");
  assert.equal(item.dueLabel, "9 月 2 日");
  assert.match(item.summary, /尚未记录交付进展/);
  assert.doesNotMatch(item.summary, /纪要正文|复盘成员|过期|示例/);
});

test("近期变化只采用非baseline演示事件和绝对时间记录，父子投影按task/event去重", () => {
  const input = selectTaskTree(fixture(), "fragrance-creator-wrapup");
  const model = buildPersonalWorkbenchModel(input);
  const expected = getTaskProgressEvents("fragrance-creator-wrapup").filter((event) => !event.isBaseline);
  assert.equal(model.recentChanges.length, expected.length);
  assert.equal(new Set(model.recentChanges.map((item) => item.id)).size, expected.length);
  assert.ok(model.recentChanges.every((item) => item.source === "example"));
  assert.ok(model.recentChanges.every((item) => !item.text.includes("初始范围纳入")));
  assert.equal(model.recentChanges[0].taskId, "fragrance-data");
  assert.ok(model.recentChanges.every((item) => input.tasks.some((node) => node.id === item.evidence.taskId)));
  assert.ok(model.recentChanges.every((item) => item.evidence.kind !== "activity"
    || input.detailsByTaskId![item.evidence.taskId].activities.some((activity) => activity.id === item.evidence.id)));
});

test("本地事件区分相对/无时区/未来日期，并只纳入本人任务及协调范围", () => {
  const owned = task("owned");
  const child = task("child", { parentTaskId: owned.id, ownerId: "other" });
  const unrelated = task("unrelated", { ownerId: "other" });
  const post = { id: "event", author: "成员", type: "member-post" as const, time: "刚刚", message: "记录新的结果", createdAt: "2026-08-31T10:00:00+08:00" };
  const detailsByTaskId = {
    owned: detail(owned, { activities: [post, { ...post, id: "relative", createdAt: undefined }, { ...post, id: "no-timezone", createdAt: "2026-08-31T11:00:00" }, { ...post, id: "future", createdAt: "2026-08-31T15:00:00+08:00" }] }),
    child: detail(child, { activities: [post, post] }),
    unrelated: detail(unrelated, { activities: [post] }),
  };
  const model = buildPersonalWorkbenchModel({ tasks: [owned, child, unrelated], currentUserId: "me", asOf, detailsByTaskId });
  assert.deepEqual(new Set(model.recentChanges.map((item) => item.id)), new Set(["owned:event", "child:event"]));
  assert.ok(model.recentChanges.every((item) => item.source === "recorded"));
  assert.ok(model.recentChanges.every((item) => item.evidence.kind === "activity"));
});

test("缺少详情安全回退，不补造交付、工时或风险评分，输入和后续读取相互隔离", () => {
  const input: PersonalWorkbenchInput = { tasks: [task("new-task")], currentUserId: "me", asOf };
  const before = structuredClone(input);
  const model = buildPersonalWorkbenchModel(input);
  assert.equal(model.actions[0].freshness, "missing");
  assert.equal(model.recentChanges.length, 0);
  assert.doesNotMatch(JSON.stringify(model), /准时概率|评分|已交付50|剩余\d|负荷\d/);
  model.ownedTasks[0].title = "消费者编辑";
  assert.deepEqual(input, before);
  assert.equal(buildPersonalWorkbenchModel(input).ownedTasks[0].title, "new-task");
  const badClock = buildPersonalWorkbenchModel({ ...input, asOf: "今天", tasks: [task("new-task", { plannedEndOn: "2026-08-31" })] });
  assert.equal(badClock.actions[0].dueState, "unknown");
  assert.equal(badClock.recentChanges.length, 0);
  assert.match(badClock.notice, /分析日期不可用/);
});

test("个人处理入口按任务合并剩余关注，不复制任务行、不替换原行动或丢失来源", () => {
  const model = buildPersonalWorkbenchModel({ tasks: [task("active", { plannedEndOn: "2026-08-31" })], currentUserId: "me", asOf });
  const main = structuredClone(model.actions[0]);
  const criteria: PersonalWorkbenchAttention = {
    id: "active:criteria", taskId: "active", title: "active", kind: "evidence",
    text: "第二条完成标准缺少可核对的交付依据。", source: "recorded",
    evidence: { taskId: "active", kind: "criteria", label: "查看完成标准" },
  };
  const conflict: PersonalWorkbenchAttention = {
    id: "active:conflict", taskId: "active", title: "active", kind: "status-conflict",
    text: "完成记录与当前交付范围存在待核对的差异。", source: "recorded",
    evidence: { taskId: "active", kind: "activity", id: "record-1", label: "查看原始记录" },
  };
  model.actions.push(structuredClone(main));
  model.attention = [criteria, conflict, structuredClone(criteria)];
  const before = structuredClone(model);
  const projected = buildPersonalWorkbenchItems(model);
  assert.equal(projected.items.length, 1);
  const [item] = projected.items;
  assert.equal(item.taskId, "active");
  assert.equal(item.action, main.action);
  assert.equal(item.reason, main.reason);
  assert.deepEqual(item.evidence, main.evidence);
  assert.deepEqual(item.additionalAttention, [criteria, conflict]);
  assert.equal(item.isFollowUp, false);
  item.additionalAttention[0].text = "消费者编辑";
  item.additionalAttention[1].evidence!.label = "消费者编辑来源";
  item.evidence!.label = "消费者编辑主来源";
  assert.deepEqual(model, before, "消费投影不能修改原分析、责任统计或来源");
});

test("已完成任务的前置冲突成为核对事项，不恢复执行、不计入到期处理或本人推进量", () => {
  const prerequisite = task("prerequisite", { ownerId: "other", status: "进行中" });
  const completed = task("completed", { status: "已完成", plannedEndOn: "2026-08-30", dependsOnTaskIds: [prerequisite.id] });
  const model = buildPersonalWorkbenchModel({ tasks: [completed, prerequisite], currentUserId: "me", asOf });
  const before = structuredClone(model);
  const projected = buildPersonalWorkbenchItems(model);
  assert.equal(projected.items.length, 1);
  const [item] = projected.items;
  assert.equal(item.taskId, "completed");
  assert.equal(item.status, "已完成");
  assert.equal(item.role, "execution", "任务的原责任类型保留，isFollowUp区分核对与执行");
  assert.equal(item.isFollowUp, true);
  assert.equal(item.actionLabel, "核对完成边界");
  assert.equal(item.reason, model.attention[0].text);
  assert.deepEqual(item.evidence, model.attention[0].evidence);
  assert.equal(item.evidence?.taskId, "prerequisite");
  assert.doesNotMatch(item.action, /继续推进|恢复执行|重新打开|已恢复/);
  assert.equal(model.counts.active, 0);
  assert.equal(model.counts.executing, 0);
  assert.equal(model.counts.owned, 1);
  assert.deepEqual(model, before);
});

test("协调范围中的下级冲突复用原任务状态与当前情况，但不补造本人责任或新期限", () => {
  const parent = task("parent", { status: "已完成", plannedEndOn: "2026-08-30" });
  const middle = task("middle", { status: "已完成", ownerId: "other", parentTaskId: parent.id, plannedEndOn: "2026-08-31" });
  const leaf = task("leaf", { ownerId: "other", parentTaskId: middle.id });
  const model = buildPersonalWorkbenchModel({ tasks: [parent, middle, leaf], currentUserId: "me", asOf });
  const projected = buildPersonalWorkbenchItems(model);
  assert.equal(projected.items.length, 2);
  const item = projected.items.find((candidate) => candidate.taskId === "middle")!;
  assert.ok(item);
  assert.equal(item.isFollowUp, true);
  assert.equal(item.status, "已完成", "相关任务应展示来源任务已有的真实状态");
  assert.equal(item.summary, "任务已完成；0项子任务标记已完成，1项待收口。", "当前情况应复用任务详情的统一投影");
  assert.equal(item.dueLabel, undefined);
  assert.equal(item.dueState, "none", "核对事项不沿用原期限制造新的到期语义");
  assert.equal(item.evidence?.taskId, "middle");
  assert.equal(item.evidence?.kind, "subtasks");
  assert.equal(model.counts.owned, 1, "两项核对事项不等于本人正式负责两项任务");
});

test("团队示例生成的每条工作台任务都保留来源任务的真实状态", () => {
  for (const scenario of teamWorkspaceScenarios) {
    const tasks = scenario.nodes.filter((node): node is TaskNode => node.kind === "task");
    const byId = new Map(tasks.map((node) => [node.id, node]));
    const currentUserId = scenario.members[0]?.id ?? "";
    const items = buildPersonalWorkbenchItems(buildPersonalWorkbenchModel({ tasks, currentUserId, asOf: scenario.asOf })).items;
    for (const item of items) {
      const source = byId.get(item.taskId);
      assert.ok(source, `${scenario.id}/${item.taskId} 缺少来源任务`);
      assert.equal(item.status, source.status, `${scenario.id}/${item.taskId} 的工作台状态与来源任务不一致`);
    }
  }
});

test("同一跟进任务的多项问题只生成一行，严重冲突作主依据而其余信息完整保留", () => {
  const model = buildPersonalWorkbenchModel({ tasks: [], currentUserId: "me", asOf });
  const info: PersonalWorkbenchAttention = {
    id: "scope:unknown", taskId: "scope", title: "下级结果", kind: "unknown",
    text: "交付记录还有信息待核对。", source: "recorded",
    evidence: { taskId: "scope", kind: "activity", id: "context", label: "查看交付记录" },
  };
  const conflict: PersonalWorkbenchAttention = {
    id: "scope:conflict", taskId: "scope", title: "下级结果", kind: "status-conflict",
    text: "已完成记录与下级未交付记录并存。", source: "recorded",
    evidence: { taskId: "scope", kind: "subtasks", label: "查看下级结果" },
  };
  model.attention = [info, conflict, structuredClone(conflict)];
  const projected = buildPersonalWorkbenchItems(model);
  assert.equal(projected.items.length, 1);
  const [item] = projected.items;
  assert.equal(item.focus, "status-conflict");
  assert.equal(item.reason, conflict.text);
  assert.deepEqual(item.evidence, conflict.evidence);
  assert.deepEqual(item.additionalAttention, [info]);
  assert.equal(item.isFollowUp, true);
});

test("同一任务的期限、前置与结果依据合并成一个建议动作", () => {
  const prerequisite = task("prerequisite", { ownerId: "other", status: "待开始" });
  const review = task("review", { status: "待审核", plannedEndOn: "2026-08-31", dependsOnTaskIds: [prerequisite.id] });
  const model = buildPersonalWorkbenchModel({ tasks: [review, prerequisite], currentUserId: "me", asOf });
  const projected = buildPersonalWorkbenchItems(model);
  assert.equal(projected.items.length, 1);
  const [item] = projected.items;
  assert.equal(item.focus, "dependency");
  assert.equal(item.actionLabel, "核对前置交付");
  assert.doesNotMatch(item.actionLabel, /已阻塞|不合格|已验收/);
  assert.equal(model.counts.owned, 1);
});

test("旧负责人提议迁移为负责事项，缺失或相对期限不冒充今日到期", () => {
  const proposed = task("proposed", { ownerId: "other", proposedOwnerId: "me", plannedEndOn: "2026-08-31" });
  const pendingModel = buildPersonalWorkbenchModel({ tasks: [proposed], currentUserId: "me", asOf });
  assert.deepEqual(buildPersonalWorkbenchItems(pendingModel).items.map(item => item.taskId), ["proposed"]);
  assert.equal(pendingModel.counts.awaitingAcceptance, 0);
  const model = buildPersonalWorkbenchModel({
    tasks: [task("relative", { dueAt: "今天 16:00", createdFrom: "task-planner" }), task("missing"), proposed],
    currentUserId: "me", asOf,
  });
  const projected = buildPersonalWorkbenchItems(model);
  assert.equal(projected.items.length, 3);
  assert.ok(projected.items.some((item) => item.taskId === "proposed"));
  assert.equal(projected.items.find((item) => item.taskId === "relative")?.dueState, "unknown");
  assert.equal(projected.items.find((item) => item.taskId === "missing")?.dueState, "none");
});

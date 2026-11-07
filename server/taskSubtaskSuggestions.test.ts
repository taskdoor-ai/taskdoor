import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import type { TaskActivityMock, TaskNode } from "../src/shared/model/task-model.ts";

const helperUrl = new URL("../src/features/tasks/lib/task-subtask-suggestions.ts", import.meta.url);
async function domain() {
  assert.ok(existsSync(helperUrl), "需要可独立校验来源和原子创建的子任务建议领域 helper");
  return import("../src/features/tasks/lib/task-subtask-suggestions.ts");
}
const parent: TaskNode = { id: "parent", kind: "task", name: "共享工作", parentId: "workspace-root", teamId: "team-a", ownerId: "owner", participantIds: [], status: "进行中", goal: "不能复制的父目标", updatedAt: "今天" };
const message: TaskActivityMock = { id: "discussion-1", author: "TaskDoor 示例", type: "member-post", message: "请修正移动端按钮遮挡，并补齐重复提交提示。", time: "今天", createdAt: "2026-10-21T10:00:00+08:00" };
async function suggestion(id = "suggestion-1", itemKey = "mobile-button") {
  const { getSubtaskSuggestionContextKey, getSubtaskSuggestionDiscussionContextKey } = await domain();
  return { id, title: "修正移动端按钮遮挡", goal: "", completionCriteria: [], ownerId: "", endDate: "", source: { taskId: parent.id, messageId: message.id, body: message.message, author: message.author, itemKey }, contextKey: getSubtaskSuggestionContextKey(message), discussionContextKey: getSubtaskSuggestionDiscussionContextKey(message.id, [message])! };
}
const options = { currentUserId: "current", teamId: "team-a", timeZone: "Asia/Shanghai", author: "当前用户", sourceMessages: [message], activeMemberIds: ["current", "owner", "helper"] };

test("已创建关联回到原讨论根，保留当前任务状态与原始来源，异常父链不误合组", async () => {
  const { groupTaskDiscussionLinksByRoot } = await domain();
  assert.equal(typeof groupTaskDiscussionLinksByRoot, "function");
  const reply = { ...message, id: "reply", type: "member-reply" as const, replyToActivityId: message.id };
  const orphan = { ...reply, id: "orphan", replyToActivityId: "missing" };
  const links = [
    { id: "saved-1", title: "修订移动端入口", ownerId: "helper", status: "已完成", messageId: reply.id },
    { id: "saved-2", title: "修订失效提示", ownerId: "owner", status: "已阻塞", messageId: orphan.id },
  ];
  const grouped = groupTaskDiscussionLinksByRoot(links, [message, reply, orphan]);
  assert.deepEqual([...grouped.keys()], [message.id, orphan.id]);
  assert.equal(grouped.get(message.id)?.[0], links[0]);
  assert.equal(grouped.get(message.id)?.[0].status, "已完成");
  assert.equal(grouped.get(message.id)?.[0].messageId, reply.id);
  assert.equal(grouped.get(orphan.id)?.[0], links[1]);
});

test("确认后可原子创建两个同级任务，空目标标准保持空且不改输入", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const first = await suggestion();
  const second = { ...await suggestion("suggestion-2", "repeat-submit"), title: "补齐重复提交提示" };
  const nodes = [structuredClone(parent)];
  const before = structuredClone(nodes);
  const result = createWorkspaceSuggestedSubtasks(nodes, parent.id, [first, second], options);
  assert.deepEqual(nodes, before);
  assert.equal(result.nodes.length, 3);
  assert.equal(result.createdTasks.length, 2);
  for (const task of result.createdTasks) {
    assert.equal(task.goal, "");
    assert.deepEqual(task.completionCriteria, []);
    assert.equal(task.ownerId, "");
    assert.ok(task.participantIds?.includes("current"));
    assert.equal(task.parentTaskId, parent.id);
    assert.equal(task.teamId, "team-a");
    assert.equal(task.sourceDiscussion?.messageId, message.id);
  }
  assert.equal(result.activity?.changes?.length, 1);
});

test("整批拒绝重复候选、重复来源事项及已保存的来源事项", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const first = await suggestion();
  const nodes = [structuredClone(parent)];
  const before = structuredClone(nodes);
  assert.throws(() => createWorkspaceSuggestedSubtasks(nodes, parent.id, [first, first], options), /重复/);
  assert.throws(() => createWorkspaceSuggestedSubtasks(nodes, parent.id, [first, { ...first, id: "other" }], options), /重复/);
  const result = createWorkspaceSuggestedSubtasks(nodes, parent.id, [first], options);
  assert.throws(() => createWorkspaceSuggestedSubtasks(result.nodes, parent.id, [{ ...first, title: "已改名" }], options), /已有|重复/);
  assert.deepEqual(nodes, before);
});

test("来源原文变更、删除或不再可读时均不可确认旧建议", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const item = await suggestion();
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, sourceMessages: [] }), /来源|讨论/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, sourceMessages: [{ ...message, message: "已修改原意" }] }), /来源|讨论/);
  const deleted = { ...message, deletedAt: "2026-10-21T11:00:00+08:00" };
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, sourceMessages: [deleted] }), /来源|讨论/);
});

test("未编辑建议也绑定整段讨论，新回复及同根回复的修改删除均阻止旧内容创建", async () => {
  const { createWorkspaceSuggestedSubtasks, getSubtaskSuggestionDiscussionContextKey, isSubtaskSuggestionContextCurrent } = await domain();
  const reply: TaskActivityMock = { ...message, id: "reply", type: "member-reply", replyToActivityId: message.id, message: "先修复按钮，再处理重复提交提示。" };
  const nestedReply: TaskActivityMock = { ...reply, id: "nested-reply", replyToActivityId: reply.id, message: "我负责在手机上核对这两个修订点。" };
  const preparedMessages = [message, reply, nestedReply];
  const item = { ...await suggestion(), discussionContextKey: getSubtaskSuggestionDiscussionContextKey(message.id, preparedMessages)! };
  const nodes = [structuredClone(parent)];
  const beforeNodes = structuredClone(nodes);
  const beforeItem = structuredClone(item);
  assert.equal(isSubtaskSuggestionContextCurrent(item, [...preparedMessages].reverse()), true, "消息排序不改变建议依据");
  const changedContexts = [
    [...preparedMessages, { ...reply, id: "new-reply", message: "按钮方案暂停，先不要创建修复任务。" }],
    [message, { ...reply, message: "刚确认按钮已经由页面同事修好了，不用再建。" }, nestedReply],
    [message, { ...reply, deletedAt: "2026-10-21T11:00:00+08:00" }, nestedReply],
    [message, nestedReply],
    [message, reply],
    [{ ...message, message: "讨论根已改为只观察问题，先不安排修复。" }, reply, nestedReply],
  ];
  for (const sourceMessages of changedContexts) {
    assert.equal(isSubtaskSuggestionContextCurrent(item, sourceMessages), false);
    assert.throws(() => createWorkspaceSuggestedSubtasks(nodes, parent.id, [item], { ...options, sourceMessages }), /讨论.*变更|重新整理/);
  }
  assert.deepEqual(nodes, beforeNodes, "失败不修改任务输入或创建任务");
  assert.deepEqual(item, beforeItem, "校验不重写旧建议签名或内容");
});

test("相关讨论版本只包含同根内容，无关讨论新增编辑删除不使建议过期", async () => {
  const { createWorkspaceSuggestedSubtasks, isSubtaskSuggestionContextCurrent } = await domain();
  const item = await suggestion();
  const unrelated: TaskActivityMock = { ...message, id: "unrelated-root", message: "讨论周报安排。" };
  const unrelatedReply: TaskActivityMock = { ...unrelated, id: "unrelated-reply", type: "member-reply", replyToActivityId: unrelated.id };
  for (const sourceMessages of [
    [message, unrelated, unrelatedReply],
    [message, { ...unrelated, message: "周报改到明天。" }],
    [message, { ...unrelated, deletedAt: "2026-10-21T11:00:00+08:00" }],
    [message],
  ]) {
    assert.equal(isSubtaskSuggestionContextCurrent(item, sourceMessages), true);
    assert.equal(createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, sourceMessages }).createdTasks.length, 1);
  }
});

test("保存时再次校验最新讨论，一批中后项过期也不会先创建前项", async () => {
  const { createWorkspaceSuggestedSubtasks, getSubtaskSuggestionContextKey, getSubtaskSuggestionDiscussionContextKey } = await domain();
  const first = await suggestion();
  const otherSource: TaskActivityMock = { ...message, id: "other-source", message: "请补齐无效订单提示。" };
  const second = {
    ...first, id: "second", title: "补齐无效订单提示", contextKey: getSubtaskSuggestionContextKey(otherSource),
    source: { ...first.source, messageId: otherSource.id, body: otherSource.message, itemKey: "invalid-order" },
    discussionContextKey: getSubtaskSuggestionDiscussionContextKey(otherSource.id, [message, otherSource])!,
  };
  const latestMessages = [message, otherSource, { ...otherSource, id: "later-change", type: "member-reply" as const, replyToActivityId: otherSource.id, message: "这项先暂停。" }];
  const nodes = [structuredClone(parent)];
  const before = structuredClone(nodes);
  assert.throws(() => createWorkspaceSuggestedSubtasks(nodes, parent.id, [first, second], { ...options, sourceMessages: latestMessages }), /讨论|重新整理/);
  assert.deepEqual(nodes, before);
});

test("可读取未签名旧草稿，但无法当成当前建议创建或自动补签名", async () => {
  const { createWorkspaceSuggestedSubtasks, getSubtaskSuggestionStorageKey, isSubtaskSuggestionContextCurrent, readSubtaskSuggestionReview } = await domain();
  const { discussionContextKey: ignored, ...legacy } = await suggestion();
  assert.ok(ignored);
  const key = getSubtaskSuggestionStorageKey("team-a", parent.id);
  const raw = JSON.stringify({ dismissedIds: [], edits: { [legacy.id]: legacy } });
  const storage = { getItem: (requested: string) => requested === key ? raw : null };
  const review = readSubtaskSuggestionReview(storage, "team-a", parent.id);
  assert.deepEqual(review.edits[legacy.id], legacy);
  assert.equal(isSubtaskSuggestionContextCurrent(review.edits[legacy.id], [message]), false);
  const nodes = [structuredClone(parent)];
  const before = structuredClone(nodes);
  assert.throws(() => createWorkspaceSuggestedSubtasks(nodes, parent.id, [review.edits[legacy.id]], options), /讨论|重新整理/);
  assert.deepEqual(nodes, before);
  assert.equal(review.edits[legacy.id].discussionContextKey, undefined);
});

test("拒绝跨团队、跨任务来源及过期日期，原输入保持完整", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const item = await suggestion();
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, teamId: "team-b" }), /团队/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, source: { ...item.source, taskId: "another-task" } }], options), /来源|任务/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, endDate: "2000-01-01" }], options), /截止/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, title: " " }], options), /名称/);
});

test("按完整父链校验默认十层，损坏父链不准继续创建", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const chain = Array.from({ length: 10 }, (_, index): TaskNode => ({ ...parent, id: `depth-${index + 1}`, ...(index ? { parentTaskId: `depth-${index}` } : {}) }));
  const item = await suggestion();
  const deepest = chain[9];
  const deepSuggestion = { ...item, source: { ...item.source, taskId: deepest.id } };
  assert.throws(() => createWorkspaceSuggestedSubtasks(chain, deepest.id, [deepSuggestion], options), /层级|10/);
  const orphan = { ...parent, parentTaskId: "missing" };
  assert.throws(() => createWorkspaceSuggestedSubtasks([orphan], orphan.id, [item], options), /父|上级|归属/);
});

test("建议审阅存储按团队任务隔离，损坏数据不能当成空白", async () => {
  const { getSubtaskSuggestionStorageKey, readSubtaskSuggestionReview } = await domain();
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null };
  assert.notEqual(getSubtaskSuggestionStorageKey("team-a", "task"), getSubtaskSuggestionStorageKey("team-b", "task"));
  assert.deepEqual(readSubtaskSuggestionReview(storage, "team-a", parent.id), { dismissedIds: [], edits: {} });
  const key = getSubtaskSuggestionStorageKey("team-a", parent.id);
  values.set(key, "broken-json");
  assert.throws(() => readSubtaskSuggestionReview(storage, "team-a", parent.id), /读取|损坏|建议/);
  const item = await suggestion();
  values.set(key, JSON.stringify({ dismissedIds: ["other"], edits: { [item.id]: item } }));
  assert.deepEqual(readSubtaskSuggestionReview(storage, "team-a", parent.id), { dismissedIds: ["other"], edits: { [item.id]: item } });
  values.set(key, JSON.stringify({ dismissedIds: [], edits: { wrong: item } }));
  assert.throws(() => readSubtaskSuggestionReview(storage, "team-a", parent.id), /读取|损坏|建议/);
});

test("Mock仅从准确的一段新讨论建议一个任务，名称负责人明确且目标标准可空", async () => {
  const mockUrl = new URL("../src/ai/mock/lib/subtaskSuggestions.ts", import.meta.url);
  assert.ok(existsSync(mockUrl), "需要与真实讨论分离的明确本地示例");
  const { getMockSubtaskSuggestionActivities, getMockSubtaskSuggestions } = await import("../src/ai/mock/lib/subtaskSuggestions.ts");
  const taskId = "ccx-serum-launch";
  const messages = getMockSubtaskSuggestionActivities(taskId);
  const childTasks: TaskNode[] = [];
  const suggestions = getMockSubtaskSuggestions({ taskId, messages, childTasks });
  assert.equal(suggestions.length, 1);
  assert.deepEqual(childTasks, []);
  assert.deepEqual(messages.map(item => item.author), ["周岚", "高远", "梁川", "韩序", "周岚", "韩序"]);
  assert.ok(messages.every(item => !item.message.includes("子任务建议示例")));
  assert.deepEqual(suggestions.map(item => item.ownerId), ["韩序"]);
  assert.equal(suggestions[0].goal, "");
  assert.deepEqual(suggestions[0].completionCriteria, []);
  assert.ok(suggestions.every(item => item.title.length <= 20 && item.source.author === item.ownerId));
  for (const item of suggestions) {
    const source = messages.find(message => message.id === item.source.messageId)!;
    assert.equal(source.type, "member-reply");
    assert.equal(source.replyToActivityId, messages[4].id);
    assert.match(source.message, /我.*负责|我来负责/);
  }
  assert.ok(messages.slice(0, 4).every(record => record.id.includes("subtask-suggestion-example")), "旧讨论保留原身份以支持历史任务链接");
  assert.ok(suggestions.every(item => !item.source.messageId.includes("subtask-suggestion-example")), "旧三项不以原身份或改名重新建议");
  assert.deepEqual(getMockSubtaskSuggestions({ taskId: "other", messages, childTasks }), []);
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages: messages.map(item => ({ ...item, message: "用户已改写这条消息" })), childTasks }), []);
  const accepted = { ...parent, id: "created", parentTaskId: taskId, sourceDiscussion: suggestions[0].source };
  assert.equal(getMockSubtaskSuggestions({ taskId, messages, childTasks: [accepted] }).length, 0);
  assert.equal(getMockSubtaskSuggestions({ taskId, messages, childTasks: [{ ...accepted, name: "已经改过的名称" }] }).length, 0);
});

test("现有秋季专场提供独立来源的单任务示例，不恢复旧任务或旧三项建议", async () => {
  const { getMockSubtaskSuggestionActivities, getMockSubtaskSuggestions } = await import("../src/ai/mock/lib/subtaskSuggestions.ts");
  const taskId = "demo-autumn-creator-event";
  const messages = getMockSubtaskSuggestionActivities(taskId);
  const suggestions = getMockSubtaskSuggestions({ taskId, messages, childTasks: [] });
  assert.equal(messages.length, 6);
  assert.equal(suggestions.length, 1);
  assert.ok(messages.every(message => ["周岚", "高远", "梁川", "韩序"].includes(message.author) && !message.message.includes("首发")));
  assert.ok(suggestions.every(item => item.source.taskId === taskId && item.title.includes("专场")));
  const serumMessages = getMockSubtaskSuggestionActivities("ccx-serum-launch");
  const serumSuggestions = getMockSubtaskSuggestions({ taskId: "ccx-serum-launch", messages: serumMessages, childTasks: [] });
  assert.equal(serumSuggestions.length, 1);
  assert.equal(new Set([...messages, ...serumMessages].map(message => message.id)).size, 12);
  assert.equal(new Set([...suggestions, ...serumSuggestions].map(item => item.id)).size, 2);
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages: serumMessages, childTasks: [] }), []);
});

test("发布会主视觉的两条演示建议可分别添加，失效和防重互不影响", async () => {
  const { getMockSubtaskSuggestionActivities, getMockSubtaskSuggestions } = await import("../src/ai/mock/lib/subtaskSuggestions.ts");
  const { isSubtaskSuggestionContextCurrent } = await domain();
  const taskId = "product-launch-promo-key-visual";
  const messages = getMockSubtaskSuggestionActivities(taskId);
  const suggestions = getMockSubtaskSuggestions({ taskId, messages, childTasks: [] });
  assert.deepEqual(suggestions.map(item => item.title), ["核对主视觉品牌、产品信息和版权", "编制主视觉母版使用规范"]);
  const [first, second] = suggestions;
  assert.ok(suggestions.every(item => item.source.taskId === taskId && isSubtaskSuggestionContextCurrent(item, messages)));
  const firstSaved = { id: "review-saved", sourceDiscussion: first.source };
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages, childTasks: [firstSaved] }), [second]);
  const edited = messages.map(item => item.id === first.source.messageId ? { ...item, message: "终审范围待确认。" } : item);
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages: edited, childTasks: [] }), [second]);
});

test("演示主视觉建议根据已保存的明确回复收窄同一事项，无关讨论与已承接项不受影响", async () => {
  const { getMockRefreshedSubtaskSuggestions, getMockSubtaskSuggestionActivities, getMockSubtaskSuggestions } = await import("../src/ai/mock/lib/subtaskSuggestions.ts");
  const { isSubtaskSuggestionContextCurrent } = await domain();
  const taskId = "product-launch-promo-key-visual";
  const messages = getMockSubtaskSuggestionActivities(taskId);
  const [before, unaffected] = getMockSubtaskSuggestions({ taskId, messages, childTasks: [] });
  const reply = { ...message, id: "scope-confirmation", type: "member-reply" as const, author: "周岚", replyToActivityId: before.source.messageId,
    message: "只需核对图片和字体授权，品牌和产品信息已经确认。" };
  const savedMessages = [...messages, reply];
  const refreshed = getMockRefreshedSubtaskSuggestions({ taskId, messages: savedMessages, childTasks: [] });
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].id, before.id);
  assert.deepEqual(refreshed[0].source, before.source);
  assert.equal(refreshed[0].title, "复核主视觉图片和字体授权");
  assert.equal(isSubtaskSuggestionContextCurrent(before, savedMessages), false);
  assert.ok(isSubtaskSuggestionContextCurrent(refreshed[0], savedMessages));
  assert.ok(isSubtaskSuggestionContextCurrent(unaffected, savedMessages));
  const accepted = { id: "accepted", title: "已改名", sourceDiscussion: before.source };
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: savedMessages, childTasks: [accepted] }), []);
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [...messages, { ...reply, message: "先暂缓终审。" }], childTasks: [] }), []);
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [...savedMessages, { ...reply, id: "later-change", message: "需要重新确认范围。" }], childTasks: [] }), []);
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [...savedMessages, { ...message, id: "unrelated" }], childTasks: [] }), refreshed);
});

test("演示联排新增明确讨论后才出现新候选，来源删除或已有承接时不重推", async () => {
  const { getMockRefreshedSubtaskSuggestions } = await import("../src/ai/mock/lib/subtaskSuggestions.ts");
  const { isSubtaskSuggestionContextCurrent } = await domain();
  const taskId = "product-launch-flow-rehearsal";
  const post = { ...message, author: "周岚", message: "联排时无线麦切换会丢首句，请高远核对备用麦切换和补播提示。" };
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [], childTasks: [] }), []);
  const saved = getMockRefreshedSubtaskSuggestions({ taskId, messages: [post], childTasks: [] });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, "复核联排备用麦切换与补播提示");
  assert.equal(saved[0].ownerId, "高远");
  assert.ok(isSubtaskSuggestionContextCurrent(saved[0], [post]));
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [{ ...post, message: "本次联排安排已确认。" }], childTasks: [] }), []);
  const deleted = { ...post, deletedAt: "2026-10-21T10:01:00+08:00" };
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [deleted], childTasks: [] }), []);
  const accepted = { id: "accepted", title: "已改名", sourceDiscussion: saved[0].source };
  assert.deepEqual(getMockRefreshedSubtaskSuggestions({ taskId, messages: [{ ...post, id: "duplicate" }], childTasks: [accepted] }), []);
});

test("Mock相关讨论出现新意见即停止旧建议，不给同样旧内容换签名；无关讨论不误伤", async () => {
  const { getMockSubtaskSuggestionActivities, getMockSubtaskSuggestions } = await import("../src/ai/mock/lib/subtaskSuggestions.ts");
  const { isSubtaskSuggestionContextCurrent } = await domain();
  const taskId = "demo-autumn-creator-event";
  const messages = getMockSubtaskSuggestionActivities(taskId);
  const baseline = getMockSubtaskSuggestions({ taskId, messages, childTasks: [] });
  const source = messages.find(message => message.id === baseline[0].source.messageId)!;
  const newOpinion: TaskActivityMock = { ...source, id: "later-opinion", message: "先暂停统一脚注，等确认指标定义后再安排。" };
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages: [...messages, newOpinion], childTasks: [] }), []);
  assert.equal(isSubtaskSuggestionContextCurrent(baseline[0], [...messages, newOpinion]), false);
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages: messages.map(record => record.id === source.replyToActivityId ? { ...record, message: "这项暂不修订。" } : record), childTasks: [] }), []);
  const unrelated: TaskActivityMock = { ...newOpinion, id: "unrelated", type: "member-post", replyToActivityId: undefined, message: "周报仍按原时间发布。" };
  assert.deepEqual(getMockSubtaskSuggestions({ taskId, messages: [...messages, unrelated], childTasks: [] }), baseline);
});


test("审阅选择可选且向后兼容，重复选择是损坏记录", async () => {
  const { getSubtaskSuggestionStorageKey, readSubtaskSuggestionReview } = await domain();
  const key = getSubtaskSuggestionStorageKey("team-a", parent.id);
  const values = new Map<string, string>();
  const storage = { getItem: (requested: string) => values.get(requested) ?? null };
  values.set(key, JSON.stringify({ dismissedIds: [], edits: {}, selectedIds: ["one", "two"] }));
  assert.deepEqual(readSubtaskSuggestionReview(storage, "team-a", parent.id).selectedIds, ["one", "two"]);
  values.set(key, JSON.stringify({ dismissedIds: [], edits: {} }));
  assert.equal(readSubtaskSuggestionReview(storage, "team-a", parent.id).selectedIds, undefined);
  values.set(key, JSON.stringify({ dismissedIds: [], edits: {}, selectedIds: ["one", "one"] }));
  assert.throws(() => readSubtaskSuggestionReview(storage, "team-a", parent.id), /读取|损坏|建议/);
});


test("建议创建保留手选参与人和创建者，负责人不重复出现在参与人中", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const item = { ...await suggestion(), ownerId: "owner", participantIds: ["helper", "current"] };
  const result = createWorkspaceSuggestedSubtasks([parent], parent.id, [item], options);
  assert.deepEqual(result.createdTasks[0].participantIds, ["helper", "current"]);
  assert.equal(result.createdTasks[0].ownerId, "owner");
  const creatorOwned = createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, ownerId: "current", participantIds: ["helper"] }], options);
  assert.deepEqual(creatorOwned.createdTasks[0].participantIds, ["helper"]);
});

test("建议创建允许手选待加入负责人和参与者，保留原人员标识", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const selectableMemberIds = [...options.activeMemberIds, "invited-owner", "invited-helper"];
  const item = { ...await suggestion(), ownerId: "invited-owner", participantIds: ["invited-helper"] };
  const result = createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, selectableMemberIds });
  assert.equal(result.createdTasks[0].ownerId, "invited-owner");
  assert.deepEqual(result.createdTasks[0].participantIds, ["invited-helper", "current"]);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [item], {
    ...options, currentUserId: "invited-owner", selectableMemberIds,
  }), /成员|权限/, "可被选择的待加入人员仍不能发起创建");
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, ownerId: "left-member" }], {
    ...options, selectableMemberIds,
  }), /负责人|有效成员/, "离队或其他团队人员仍不能被选择");
});

test("建议中的离开成员、重复参与人及负责人参与人重叠均整批拒绝", async () => {
  const { createWorkspaceSuggestedSubtasks } = await domain();
  const item = await suggestion();
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, participantIds: ["left-member"] }], options), /参与者|当前团队/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, ownerId: "left-member" }], options), /负责人|有效成员/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, participantIds: ["helper", "helper"] }], options), /重复/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [{ ...item, ownerId: "owner", participantIds: ["owner"] }], options), /负责人.*参与[人者]|参与[人者].*负责人/);
  assert.throws(() => createWorkspaceSuggestedSubtasks([parent], parent.id, [item], { ...options, activeMemberIds: ["owner", "helper"] }), /成员|权限/);
});

test("旧建议草稿可不带参与人，新草稿保留参与人编辑", async () => {
  const { getSubtaskSuggestionStorageKey, readSubtaskSuggestionReview } = await domain();
  const key = getSubtaskSuggestionStorageKey("team-a", parent.id);
  const item = await suggestion();
  let raw = JSON.stringify({ dismissedIds: [], edits: { [item.id]: item } });
  const storage = { getItem: (requested: string) => requested === key ? raw : null };
  assert.deepEqual(readSubtaskSuggestionReview(storage, "team-a", parent.id).edits[item.id].participantIds ?? [], []);
  raw = JSON.stringify({ dismissedIds: [], edits: { [item.id]: { ...item, participantIds: ["helper"] } } });
  assert.deepEqual(readSubtaskSuggestionReview(storage, "team-a", parent.id).edits[item.id].participantIds, ["helper"]);
});

test("建议只沿真实回复链聚合到讨论根，三条回复与无关讨论分别归组", async () => {
  const { groupSubtaskSuggestionsByDiscussionRoot } = await domain();
  const root: TaskActivityMock = { ...message, id: "root", message: "周岚安排三项修订" };
  const replies = ["reply-a", "reply-b", "reply-c"].map((id): TaskActivityMock => ({ ...message, id, type: "member-reply", replyToActivityId: root.id }));
  const unrelated: TaskActivityMock = { ...message, id: "unrelated" };
  const base = await suggestion();
  const items = [...replies, unrelated].map(record => ({ ...base, id: record.id, source: { ...base.source, messageId: record.id, itemKey: record.id } }));
  const before = structuredClone(items);
  const groups = groupSubtaskSuggestionsByDiscussionRoot(items, [root, ...replies, unrelated]);
  assert.deepEqual([...groups.keys()], [root.id, unrelated.id]);
  assert.deepEqual(groups.get(root.id), items.slice(0, 3));
  assert.equal(groups.get(root.id)?.[0], items[0]);
  assert.deepEqual(items, before, "分组不改写原来源、事项键或签名");
  const nested = { ...replies[2], replyToActivityId: replies[1].id };
  assert.equal(groupSubtaskSuggestionsByDiscussionRoot(items, [root, replies[0], replies[1], nested, unrelated]).get(root.id)?.length, 3);
});

test("回复祖先缺失、删除、循环或歧义时回退各自来源，不错误合并", async () => {
  const { groupSubtaskSuggestionsByDiscussionRoot } = await domain();
  const sourceIds = ["reply-a", "reply-b"];
  const base = await suggestion();
  const items = sourceIds.map(id => ({ ...base, id, source: { ...base.source, messageId: id, itemKey: id } }));
  const replies = sourceIds.map((id): TaskActivityMock => ({ ...message, id, type: "member-reply", replyToActivityId: "parent-message" }));
  const ancestor = { ...message, id: "parent-message" };
  const cases = [
    replies,
    [...replies, { ...ancestor, deletedAt: "2026-10-21T15:00:00+08:00" }],
    [{ ...replies[0], replyToActivityId: replies[1].id }, { ...replies[1], replyToActivityId: replies[0].id }],
    [...replies, ancestor, { ...ancestor, message: "重复标识但内容不同" }],
    [{ ...replies[0], replyToActivityId: "intermediate" }, replies[1], { ...ancestor, id: "intermediate", replyToActivityId: "not-readable" }],
  ];
  for (const messages of cases) {
    const groups = groupSubtaskSuggestionsByDiscussionRoot(items, messages);
    assert.deepEqual([...groups.keys()], sourceIds);
    assert.equal(groups.get(sourceIds[0])?.[0], items[0]);
    assert.equal(groups.get(sourceIds[1])?.[0], items[1]);
  }
});

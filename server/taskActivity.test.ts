import assert from "node:assert/strict";
import test from "node:test";
import type { TaskActivityMock, TaskActivityType, TaskCommitMock } from "../src/data/taskDetailMocks.ts";
import {
  appendTaskActivity,
  createTaskChangeActivity,
  getTaskActivityCategory,
  getTaskActivityItems,
  getTaskChangeItems,
  getTaskDetailTabForTarget,
  getTaskDiscussionThreads,
  getTaskInsightSource,
  isDiscussionActivity,
  parseTaskActivityStore,
  type TaskActivityStore,
} from "../src/lib/taskActivity.ts";

const activity = (id: string, type: TaskActivityType = "member-post", overrides: Partial<TaskActivityMock> = {}): TaskActivityMock => ({
  id,
  type,
  author: "周岚",
  message: `${id} 的原文`,
  time: "时间未知",
  ...overrides,
});

const commit = (id: string, overrides: Partial<TaskCommitMock> = {}): TaskCommitMock => ({
  id,
  author: "陈默",
  message: `${id} 的提交`,
  time: "时间未知",
  files: ["交付说明.md"],
  ...overrides,
});

test("只有成员发言和回复属于讨论，不能按作者名把 AI 或变更混入", () => {
  assert.equal(isDiscussionActivity(activity("post")), true);
  assert.equal(isDiscussionActivity(activity("reply", "member-reply")), true);
  const changeTypes: TaskActivityType[] = [
    "ai-insight", "status-change", "schedule-change", "participant-added", "title-change",
    "goal-change", "owner-change", "owner-proposal", "participants-change", "tags-change", "appearance-change",
  ];
  for (const type of changeTypes) assert.equal(isDiscussionActivity(activity(type, type)), false, type);
});

test("讨论投影只呈现人类正文，保留原 ID、正文、文件与引用对象", () => {
  const root = activity("root", "member-post", { file: "用户原始文件.md" });
  const reply = activity("reply", "member-reply", { replyToActivityId: root.id, message: "未经改写的回复。" });
  const source = [root, activity("ai", "ai-insight"), activity("status", "status-change"), reply];
  const before = JSON.stringify(source);
  const threads = getTaskDiscussionThreads(source);
  assert.deepEqual(threads, [{ activity: root, replies: [reply] }]);
  assert.equal(threads[0].activity, root);
  assert.equal(threads[0].replies[0], reply);
  assert.equal(JSON.stringify(source), before);
});

test("多层人类回复归入最初线程，回复按时间倒序且不依赖输入顺序", () => {
  const root = activity("root", "member-post", { createdAt: "2026-08-31T01:00:00Z" });
  const first = activity("first", "member-reply", { replyToActivityId: root.id, createdAt: "2026-08-31T02:00:00Z" });
  const second = activity("second", "member-reply", { replyToActivityId: first.id, createdAt: "2026-08-31T03:00:00Z" });
  assert.deepEqual(getTaskDiscussionThreads([second, first, root]), [{ activity: root, replies: [second, first] }]);
});

test("同一时间的回复维持输入顺序，排序不改变主帖顺序或源数组", () => {
  const olderRoot = activity("older-root", "member-post", { createdAt: "2026-08-30T01:00:00Z" });
  const root = activity("root", "member-post", { createdAt: "2026-08-31T01:00:00Z" });
  const first = activity("first", "member-reply", { replyToActivityId: olderRoot.id, createdAt: "2026-09-01T01:00:00Z" });
  const second = activity("second", "member-reply", { replyToActivityId: olderRoot.id, createdAt: first.createdAt });
  const source = [olderRoot, first, root, second];
  const before = [...source];
  const threads = getTaskDiscussionThreads(source);
  assert.deepEqual(threads.map(thread => thread.activity.id), [root.id, olderRoot.id]);
  assert.deepEqual(threads[1].replies, [first, second]);
  assert.deepEqual(source, before);
});

test("回复旧 AI 和变更记录的人类内容独立成帖，来源只作为上下文", () => {
  const ai = activity("ai", "ai-insight", { file: "诊断依据.md" });
  const status = activity("status", "status-change");
  const aiReply = activity("ai-reply", "member-reply", { replyToActivityId: ai.id });
  const nested = activity("nested", "member-reply", { replyToActivityId: aiReply.id });
  const statusReply = activity("status-reply", "member-reply", { replyToActivityId: status.id });
  const threads = getTaskDiscussionThreads([ai, status, aiReply, nested, statusReply]);
  assert.deepEqual(threads, [
    { activity: aiReply, replies: [nested], context: ai },
    { activity: statusReply, replies: [], context: status },
  ]);
  assert.equal(threads[0].context, ai);
});

test("缺失父记录或父 ID 的旧回复作为可见讨论条目保留", () => {
  const orphan = activity("orphan", "member-reply", { replyToActivityId: "deleted-record" });
  const noParent = activity("no-parent", "member-reply");
  const nested = activity("nested", "member-reply", { replyToActivityId: orphan.id });
  assert.deepEqual(getTaskDiscussionThreads([orphan, noParent, nested]), [
    { activity: orphan, replies: [nested] },
    { activity: noParent, replies: [] },
  ]);
});

test("循环、自引用和进入循环的回复不死循环且所有人类内容恰好出现一次", () => {
  const a = activity("a", "member-reply", { replyToActivityId: "b" });
  const b = activity("b", "member-reply", { replyToActivityId: "a" });
  const self = activity("self", "member-reply", { replyToActivityId: "self" });
  const child = activity("child", "member-reply", { replyToActivityId: "b" });
  const threads = getTaskDiscussionThreads([a, b, self, child]);
  assert.deepEqual(threads, [{ activity: a, replies: [b, child] }, { activity: self, replies: [] }]);
  const visibleIds = threads.flatMap((thread) => [thread.activity.id, ...thread.replies.map((reply) => reply.id)]);
  assert.deepEqual(visibleIds.slice().sort(), ["a", "b", "child", "self"]);
});

test("讨论按根帖发布时间排序，回复旧帖不顶起，未知时间保持稳定顺序", () => {
  const old = activity("old", "member-post", { createdAt: "2026-08-30T01:00:00Z" });
  const recent = activity("recent", "member-post", { createdAt: "2026-08-31T01:00:00Z" });
  const reply = activity("reply", "member-reply", { replyToActivityId: old.id, createdAt: "2026-08-31T02:00:00Z" });
  const unknownA = activity("unknown-a");
  const unknownB = activity("unknown-b");
  const threads = getTaskDiscussionThreads([unknownA, recent, unknownB, old, reply]);
  assert.deepEqual(threads.map((thread) => thread.activity.id), ["recent", "old", "unknown-a", "unknown-b"]);
});

test("无时间戳历史回复保留输入顺序，真实新回复优先展示", () => {
  const root = activity("root");
  const unknownA = activity("unknown-a", "member-reply", { replyToActivityId: root.id });
  const known = activity("known", "member-reply", { replyToActivityId: root.id, createdAt: "2026-08-31T02:00:00Z" });
  const unknownB = activity("unknown-b", "member-reply", { replyToActivityId: root.id });
  assert.deepEqual(getTaskDiscussionThreads([root, unknownA, known, unknownB])[0].replies, [known, unknownA, unknownB]);
});

test("历史讨论根帖保持自身顺序，不被新回复顶起", () => {
  const legacy = activity("legacy-latest", "member-post", { time: "刚刚" });
  const oldThread = activity("old-thread", "member-post", { time: "2 天前" });
  const reply = activity("real-reply", "member-reply", {
    replyToActivityId: oldThread.id,
    createdAt: "2026-08-20T01:00:00Z",
    time: "2026-08-20 09:00:00",
  });
  const threads = getTaskDiscussionThreads([legacy, oldThread, reply]);
  assert.deepEqual(threads.map((thread) => thread.activity.id), ["legacy-latest", "old-thread"]);
  assert.equal(threads.find(thread => thread.activity.id === oldThread.id)?.replies[0], reply);
});

test("含真实时间的线程只按真实发言排名，旧刚刚回复不能抬高线程", () => {
  const old = activity("old-recorded", "member-post", { createdAt: "2026-08-20T01:00:00Z" });
  const newer = activity("newer-recorded", "member-post", { createdAt: "2026-08-21T01:00:00Z" });
  const legacyReply = activity("legacy-reply", "member-reply", { replyToActivityId: old.id, time: "刚刚" });
  assert.deepEqual(getTaskDiscussionThreads([old, newer, legacyReply]).map((thread) => thread.activity.id), ["newer-recorded", "old-recorded"]);
});

test("历史回复与真实回复分层倒序，旧相对文案不会跨天后移到真实回复之前", () => {
  const root = activity("root");
  const legacyFirst = activity("legacy-first", "member-reply", { replyToActivityId: root.id, time: "2 小时前" });
  const legacyLast = activity("legacy-last", "member-reply", { replyToActivityId: root.id, time: "刚刚" });
  const first = activity("recorded-first", "member-reply", { replyToActivityId: root.id, createdAt: "2026-08-20T01:00:00Z" });
  const last = activity("recorded-last", "member-reply", { replyToActivityId: root.id, createdAt: "2026-08-21T01:00:00Z" });
  const threads = getTaskDiscussionThreads([root, last, legacyLast, first, legacyFirst]);
  assert.deepEqual(threads[0].replies, [last, first, legacyLast, legacyFirst]);
});

test("变更时间线只包含真正变更和提交，使用来源前缀避免 ID 碰撞", () => {
  const status = activity("same", "status-change", { createdAt: "2026-08-31T01:00:00Z" });
  const submission = commit("same", { createdAt: "2026-08-31T02:00:00Z" });
  const source = [activity("post"), activity("reply", "member-reply"), activity("ai", "ai-insight"), status];
  const result = getTaskChangeItems(source, [submission]);
  assert.deepEqual(result, [
    { id: "commit:same", kind: "commit", commit: submission },
    { id: "activity:same", kind: "activity", activity: status },
  ]);
  assert.equal(result[0].kind === "commit" && result[0].commit, submission);
});

test("任务活动合并任务信息、讨论与文件提交并排除 AI 建议", () => {
  const status = activity("status", "status-change", { createdAt: "2026-08-31T02:00:00Z" });
  const post = activity("post", "member-post", { createdAt: "2026-08-31T01:00:00Z" });
  const reply = activity("reply", "member-reply", { createdAt: "2026-08-31T02:30:00Z", replyToActivityId: post.id });
  const insight = activity("insight", "ai-insight", { createdAt: "2026-08-31T04:00:00Z" });
  const submission = commit("file", { createdAt: "2026-08-31T03:00:00Z" });

  assert.deepEqual(
    getTaskActivityItems([post, insight, status, reply], [submission]).map((item) => item.id),
    ["commit:file", "activity:reply", "activity:status", "activity:post"],
  );
});

test("任务活动类型只按任务信息、讨论与文件三类映射", () => {
  const items = getTaskActivityItems(
    [activity("task", "goal-change"), activity("discussion", "member-post")],
    [commit("file")],
  );
  assert.deepEqual(items.map(getTaskActivityCategory), ["task", "discussion", "file"]);
});

test("真实 createdAt 优先于旧相对文案，合并提交后按最近优先排列", () => {
  const old = activity("old", "status-change", { createdAt: "2026-08-20T01:00:00Z", time: "刚刚" });
  const recent = activity("recent", "goal-change", { createdAt: "2026-08-31T01:00:00Z", time: "昨天" });
  const submission = commit("middle", { createdAt: "2026-08-25T01:00:00Z", time: "时间未知" });
  assert.deepEqual(getTaskChangeItems([old, recent], [submission]).map((item) => item.id), ["activity:recent", "commit:middle", "activity:old"]);
});

test("凌晨写入的真实变更优先于旧今天09:42与刚刚记录，不补造旧发生日期", () => {
  const now = new Date(2026, 7, 31, 0, 10, 0);
  const recent = activity("recorded-new", "title-change", { createdAt: now.toISOString(), time: "2026-08-31 00:10:00" });
  const old = activity("recorded-old", "goal-change", { createdAt: "2026-08-20T01:00:00Z", time: "旧展示值" });
  const legacy = activity("legacy-today", "status-change", { time: "今天 09:42" });
  const recordedCommit = commit("recorded", { createdAt: "2026-08-21T01:00:00Z" });
  const legacyCommit = commit("legacy-now", { time: "刚刚" });
  const source = [legacy, old, recent];
  const commits = [legacyCommit, recordedCommit];
  const before = JSON.stringify({ source, commits });
  const result = getTaskChangeItems(source, commits, now);
  assert.deepEqual(result.map((item) => item.id), [
    "activity:recorded-new", "commit:recorded", "activity:recorded-old", "activity:legacy-today", "commit:legacy-now",
  ]);
  assert.equal(JSON.stringify({ source, commits }), before);
  assert.equal(Object.hasOwn(legacy, "createdAt"), false);
  assert.equal(legacy.time, "今天 09:42");
});

test("跨天刷新不把旧相对时间或损坏时间戳提升到真实历史之前", () => {
  const recorded = activity("recorded", "status-change", { createdAt: "2026-08-20T01:00:00Z" });
  const legacy = activity("legacy", "goal-change", { time: "刚刚" });
  const invalid = activity("invalid", "schedule-change", { createdAt: "invalid-date", time: "10 分钟前" });
  for (const now of [new Date(2026, 7, 31, 12), new Date(2026, 8, 7, 12)]) {
    assert.deepEqual(getTaskChangeItems([legacy, invalid, recorded], [], now).map((item) => item.id), ["activity:recorded", "activity:legacy", "activity:invalid"]);
  }
});

test("旧相对时间仅辅助排序，今天与昨天时间能和分钟小时文案一起排序", () => {
  const now = new Date(2026, 7, 31, 12, 0, 0);
  const source = [
    activity("yesterday", "status-change", { time: "昨天 18:20" }),
    activity("hour", "schedule-change", { time: "1 小时前" }),
    activity("now", "participant-added", { time: "刚刚" }),
    activity("minutes", "title-change", { time: "10 分钟前" }),
    activity("today", "goal-change", { time: "今天 09:42" }),
  ];
  const commits = [commit("today", { time: "今天 11:45" })];
  const before = JSON.stringify({ source, commits });
  const result = getTaskChangeItems(source, commits, now);
  assert.deepEqual(result.map((item) => item.id), ["activity:now", "activity:minutes", "commit:today", "activity:hour", "activity:today", "activity:yesterday"]);
  assert.equal(JSON.stringify({ source, commits }), before);
  for (const item of result) {
    const record = item.kind === "activity" ? item.activity : item.commit;
    assert.equal(Object.hasOwn(record, "createdAt"), false);
    assert.equal(Object.hasOwn(record, "changes"), false);
  }
});

test("损坏 createdAt 可退回旧时间，完全未知的记录保留稳定顺序", () => {
  const source = [
    activity("unknown-first", "status-change"),
    activity("invalid-date", "schedule-change", { createdAt: "损坏时间", time: "10 分钟前" }),
    activity("unknown-second", "goal-change"),
    activity("same-time", "title-change", { time: "10 分钟前" }),
  ];
  const result = getTaskChangeItems(source, [commit("unknown")], new Date("2026-08-31T04:00:00Z"));
  assert.deepEqual(result.map((item) => item.id), ["activity:invalid-date", "activity:same-time", "activity:unknown-first", "activity:unknown-second", "commit:unknown"]);
});

test("新增变更保留真实前后值，过滤未改变字段且使用真实 ISO 时间", () => {
  const now = new Date(2026, 7, 31, 10, 30, 45);
  const changes = [
    { label: "任务标题", before: "旧标题", after: "新标题" },
    { label: "开始时间", before: null, after: "2026-08-31" },
    { label: "备注", before: "保留", after: "保留" },
  ];
  const result = createTaskChangeActivity({ author: "周岚", type: "title-change", message: "修改了任务标题与开始时间。", changes }, { id: "real-event", now });
  assert.deepEqual(result, {
    id: "real-event",
    author: "周岚",
    type: "title-change",
    message: "修改了任务标题与开始时间。",
    createdAt: now.toISOString(),
    time: "2026-08-31 10:30:45",
    changes: changes.slice(0, 2),
  });
  changes[0].before = "外部后续修改";
  assert.equal(result?.changes?.[0].before, "旧标题");
});

test("没有任何真实差异时不生成变更日志", () => {
  const base = { author: "周岚", type: "status-change" as const, message: "这不是变更" };
  assert.equal(createTaskChangeActivity({ ...base, changes: [] }), null);
  assert.equal(createTaskChangeActivity({ ...base, changes: [{ label: "状态", before: "进行中", after: "进行中" }, { label: "开始时间", before: null, after: null }] }), null);
});

test("不能把 AI 建议或成员讨论生成成任务变更", () => {
  for (const type of ["ai-insight", "member-post", "member-reply"] as const) {
    assert.equal(createTaskChangeActivity({ author: "周岚", type, message: "建议更改", changes: [{ label: "状态", before: "待开始", after: "进行中" }] }), null);
  }
});

test("未指定 ID 的真实事件使用独立 UUID，绝对文案不会永久停在刚刚", () => {
  const input = { author: "周岚", type: "owner-proposal" as const, message: "提出负责人调整。", changes: [{ label: "建议负责人", before: null, after: "陈默" }] };
  const first = createTaskChangeActivity(input);
  const second = createTaskChangeActivity(input);
  assert.ok(first);
  assert.ok(second);
  assert.match(first.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(first.id, second.id);
  assert.match(first.time, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(first.createdAt ?? "")));
});

test("按 taskId 追加保留其他任务数据且不修改原 store", () => {
  const original = activity("original");
  const other = activity("other");
  const incoming = activity("incoming");
  const store: TaskActivityStore = { a: [original], b: [other] };
  const result = appendTaskActivity(store, "a", incoming);
  assert.notEqual(result, store);
  assert.deepEqual(result.a, [incoming, original]);
  assert.equal(result.b, store.b);
  assert.deepEqual(store, { a: [original], b: [other] });
});

test("同一任务按 ID 去重，同 ID 属于不同任务时不会互相串写", () => {
  const first = activity("shared-id");
  const store: TaskActivityStore = { a: [first] };
  assert.equal(appendTaskActivity(store, "a", { ...first, message: "重复的网络回包" }), store);
  const result = appendTaskActivity(store, "b", first);
  assert.deepEqual(result.b, [first]);
  assert.equal(result.a, store.a);
});

test("读取有效本地数据保留原始文字及附件，不把数据文本当成程序", () => {
  const record = activity("local", "member-reply", {
    createdAt: "2026-08-31T01:00:00.000Z",
    replyToActivityId: "old-ai",
    file: "原文件.md",
    message: "globalThis.__taskActivityUnexpectedExecution = true",
  });
  const json = JSON.stringify({ a: [record] });
  assert.deepEqual(parseTaskActivityStore(json), { a: [record] });
  assert.deepEqual(parseTaskActivityStore(JSON.parse(json)), { a: [record] });
  assert.equal(Object.hasOwn(globalThis, "__taskActivityUnexpectedExecution"), false);
});

test("损坏存储或无效根结构返回空记录", () => {
  for (const value of [null, undefined, false, 7, [], "{invalid", '"plain string"']) {
    assert.deepEqual(parseTaskActivityStore(value), {}, String(value));
  }
});

test("忽略损坏活动条目，保留同一任务与其他任务的有效记录", () => {
  const valid = activity("valid", "goal-change", { changes: [{ label: "目的", before: null, after: "完成收尾" }] });
  const other = activity("other");
  const result = parseTaskActivityStore({
    a: [valid, null, {}, { ...valid, id: "" }, { ...valid, id: "bad-type", type: "not-supported" }, { ...valid, id: "bad-time", time: 42 }, { ...valid, id: "bad-author", author: null }, { ...valid, id: "bad-message", message: {} }],
    b: [other],
    broken: "not-an-array",
  });
  assert.deepEqual(result, { a: [valid], b: [other] });
});

test("持久化可选字段也校验，不能放过损坏的附件、来源、时间或前后值", () => {
  const valid = activity("valid", "ai-insight", { insightType: "证据缺口" });
  const broken = [
    { ...valid, id: "file", file: false },
    { ...valid, id: "parent", replyToActivityId: 1 },
    { ...valid, id: "date-type", createdAt: 2 },
    { ...valid, id: "date-value", createdAt: "invalid-date" },
    { ...valid, id: "insight", insightType: "invented-type" },
    { ...valid, id: "changes-type", changes: "changes" },
    { ...valid, id: "changes-value", changes: [{ label: "状态", after: "进行中" }] },
  ];
  assert.deepEqual(parseTaskActivityStore({ a: [...broken, valid] }), { a: [valid] });
});

test("本地记录按任务去重，保持原记录且不回写输入对象", () => {
  const first = activity("duplicate");
  const second = { ...first, message: "重复内容" };
  const source = { a: [first, second], b: [second] };
  const result = parseTaskActivityStore(source);
  assert.deepEqual(result, { a: [first], b: [second] });
  assert.equal(source.a.length, 2);
});

test("特殊任务 ID 不触发原型污染，按普通自有数据保存", () => {
  const record = activity("safe");
  const source = JSON.parse(`{"__proto__": [${JSON.stringify(record)}], "constructor": [${JSON.stringify(record)}]}`);
  const parsed = parseTaskActivityStore(source);
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.deepEqual(Object.getOwnPropertyDescriptor(parsed, "__proto__")?.value, [record]);
  assert.deepEqual(Object.getOwnPropertyDescriptor(parsed, "constructor")?.value, [record]);
  const appended = appendTaskActivity({}, "__proto__", record);
  assert.equal(Object.getPrototypeOf(appended), Object.prototype);
  assert.deepEqual(Object.getOwnPropertyDescriptor(appended, "__proto__")?.value, [record]);
});

test("定位人类来源进入讨论，变更与提交进入活动，文件进入文件页", () => {
  const records = [activity("post"), activity("reply", "member-reply"), activity("change", "status-change"), activity("proposal", "owner-proposal")];
  assert.equal(getTaskDetailTabForTarget(records, { kind: "activity", targetId: "post" }), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "activity", targetId: "reply" }), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "activity", targetId: "change" }), "activity");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "activity", targetId: "proposal" }), "activity");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "commit", targetId: "commit" }), "activity");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "file", targetId: "file" }), "files");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "subtasks", targetId: "task" }), "subtasks");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "criteria", targetId: "task" }), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "details", targetId: "task" }), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "discussion", targetId: "task" }), "discussion");
});

test("默认、缺失记录和旧 AI 来源均安全回到讨论，不新增 AI 页", () => {
  const records = [activity("ai", "ai-insight")];
  assert.equal(getTaskDetailTabForTarget(records), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, null), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "activity", targetId: "missing" }), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "activity", targetId: "ai" }), "discussion");
  assert.equal(getTaskDetailTabForTarget(records, { kind: "insight", targetId: "insight" }), "discussion");
});

test("建议来源精确命中原 AI 记录，保留附件与对象身份而不换成更新建议", () => {
  const requested = activity("requested-ai", "ai-insight", { file: "原始依据.md", createdAt: "2026-08-20T01:00:00Z" });
  const newer = activity("newer-ai", "ai-insight", { createdAt: "2026-08-21T01:00:00Z" });
  assert.equal(getTaskInsightSource([newer, requested], requested.id), requested);
});

test("失效的具体建议 ID 不回退首条 AI，只有精确 latest 才是别名", () => {
  const records = [activity("available-ai", "ai-insight")];
  for (const targetId of ["missing-ai", "", "LATEST", " latest "]) {
    assert.equal(getTaskInsightSource(records, targetId), null, targetId);
  }
});

test("命中人的讨论或任务变更不能冒充建议来源", () => {
  const records = [
    activity("available-ai", "ai-insight"),
    activity("post"),
    activity("reply", "member-reply"),
    activity("change", "status-change"),
  ];
  for (const targetId of ["post", "reply", "change"]) assert.equal(getTaskInsightSource(records, targetId), null, targetId);
});

test("latest 按真实记录时间选最新建议，不被旧刚刚或更新的非 AI 记录覆盖", () => {
  const oldest = activity("oldest-ai", "ai-insight", { createdAt: "2026-08-20T01:00:00Z" });
  const latest = activity("latest-ai", "ai-insight", { createdAt: "2026-08-21T01:00:00Z" });
  const legacy = activity("legacy-ai", "ai-insight", { time: "刚刚" });
  const human = activity("new-human", "member-post", { createdAt: "2026-08-22T01:00:00Z" });
  const records = [oldest, legacy, human, latest];
  const before = JSON.stringify(records);
  assert.equal(getTaskInsightSource(records, "latest"), latest);
  assert.equal(JSON.stringify(records), before);
});

test("只有旧建议时 latest 复用文案排序，未知时间保持稳定输入顺序", () => {
  const older = activity("older-ai", "ai-insight", { time: "2 小时前" });
  const newer = activity("newer-ai", "ai-insight", { time: "6 分钟前" });
  const unknownA = activity("unknown-a", "ai-insight");
  const unknownB = activity("unknown-b", "ai-insight");
  assert.equal(getTaskInsightSource([unknownA, older, newer], "latest"), newer);
  assert.equal(getTaskInsightSource([unknownA, unknownB], "latest"), unknownA);
});

test("没有 AI 记录时 latest 和具体 ID 都返回 null", () => {
  assert.equal(getTaskInsightSource([], "latest"), null);
  assert.equal(getTaskInsightSource([], "missing"), null);
  assert.equal(getTaskInsightSource([activity("post"), activity("change", "status-change")], "latest"), null);
});

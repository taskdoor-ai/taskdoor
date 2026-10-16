import assert from "node:assert/strict";
import test from "node:test";
import {
  getDiscussionReadIds,
  mergeNotificationReadIds,
  notificationReadStateKey,
  parseNotificationReadState,
  type DiscussionReadReceipt,
  type NotificationRegionTarget,
} from "../src/features/notifications/lib/notification-read-state.ts";

const scope = { teamId: "team-a", userId: "member-a" };
const receipt: DiscussionReadReceipt = {
  ...scope,
  taskId: "task-a",
  readThrough: "2026-10-16T02:00:00.000Z",
  activityIds: ["post-a", "post-b", "reply-a"],
  sequence: 1,
};
type Item = Parameters<typeof getDiscussionReadIds>[0][number];
function notification(id: string, patch: Partial<Item> = {}): Item {
  return { id, createdAt: "2026-10-16T01:00:00.000Z", read: false, task: { id: receipt.taskId }, target: { area: "discussion", activityId: "post-a" }, ...patch };
}

test("打开讨论后批量读取已呈现的三条通知，并保留其他区域和任务", () => {
  const items = [
    notification("first"),
    notification("second", { target: { area: "discussion", activityId: "post-b" } }),
    notification("third", { target: { area: "discussion", activityId: "reply-a" } }),
    notification("other-task", { task: { id: "task-b" } }),
    ...(["files", "activity", "information"] as NotificationRegionTarget["area"][]).map(area => notification(area, { target: { area } })),
    notification("general", { task: undefined, target: undefined }),
    notification("handoff", { target: undefined }),
  ];
  assert.deepEqual(getDiscussionReadIds(items, receipt, scope), ["first", "second", "third"]);
  assert.equal(items[0].read, false, "领域判断不能提前修改通知状态");
});

test("讨论回执按当前团队和成员隔离，缺少身份或任务时不能清除通知", () => {
  const items = [notification("first")];
  assert.deepEqual(getDiscussionReadIds(items, receipt, { ...scope, teamId: "team-b" }), []);
  assert.deepEqual(getDiscussionReadIds(items, receipt, { ...scope, userId: "member-b" }), []);
  assert.deepEqual(getDiscussionReadIds(items, { ...receipt, teamId: "" }, { ...scope, teamId: "" }), []);
  assert.deepEqual(getDiscussionReadIds(items, { ...receipt, userId: "" }, { ...scope, userId: "" }), []);
  assert.deepEqual(getDiscussionReadIds(items, { ...receipt, taskId: "" }, scope), []);
});

test("只读取水位之前且有实际消息来源的通知，区域通知可以随讨论打开读取", () => {
  const items = [
    notification("earlier"),
    notification("same-time", { createdAt: receipt.readThrough }),
    notification("later", { createdAt: "2026-10-16T02:00:00.001Z" }),
    notification("missing-source", { target: { area: "discussion", activityId: "deleted-post" } }),
    notification("empty-source", { target: { area: "discussion", activityId: "" } }),
    notification("region", { target: { area: "discussion" } }),
    notification("read", { read: true }),
  ];
  assert.deepEqual(getDiscussionReadIds(items, receipt, scope), ["earlier", "same-time", "region"]);
  assert.deepEqual(getDiscussionReadIds([notification("missing-source")], { ...receipt, activityIds: [] }, scope), []);
});

test("未知、模糊或损坏时间不会触发已读，明确时区按同一时刻比较", () => {
  const invalidDates = ["", "invalid", "1", "2026-10-16", "2026-10-16T01:00:00", "2026-02-30T01:00:00Z", "2026-10-16T24:00:00Z"];
  const items = invalidDates.map((createdAt, index) => notification(`invalid-${index}`, { createdAt }));
  items.push(notification("offset", { createdAt: "2026-10-16T10:00:00+08:00" }));
  assert.deepEqual(getDiscussionReadIds(items, receipt, scope), ["offset"]);
  for (const readThrough of invalidDates) assert.deepEqual(getDiscussionReadIds([notification("first")], { ...receipt, readThrough }, scope), []);
});

test("回执仅产出当前列表的精确 ID，保存后不会自动吞掉后到通知", () => {
  const before = getDiscussionReadIds([notification("original"), notification("original")], receipt, scope);
  assert.deepEqual(before, ["original"]);
  const saved = mergeNotificationReadIds({ version: 1, readIds: [] }, before);
  const arrival = notification("arrived-after-reading");
  assert.equal(saved.readIds.includes(arrival.id), false, "持久状态只包含读取时存在的通知 ID");
  assert.deepEqual(getDiscussionReadIds([arrival], { ...receipt, sequence: 2, readThrough: "2026-10-16T02:01:00Z" }, scope), [arrival.id], "后到通知由新的真实阅读回执处理");
});

test("已读状态可序列化恢复，合并去重且不会修改旧状态", () => {
  assert.deepEqual(parseNotificationReadState(null), { version: 1, readIds: [] });
  const original = { version: 1 as const, readIds: ["first", "first"] };
  const merged = mergeNotificationReadIds(original, ["second", "first", "second"]);
  assert.deepEqual(merged, { version: 1, readIds: ["first", "second"] });
  assert.deepEqual(original.readIds, ["first", "first"]);
  assert.deepEqual(parseNotificationReadState(JSON.stringify(merged)), merged);
  assert.deepEqual(parseNotificationReadState(JSON.stringify(original)), { version: 1, readIds: ["first"] });
});

test("损坏持久数据显式报错，独立团队成员键不会因分隔符碰撞", () => {
  for (const raw of ["", "broken", "null", "[]", "{}", '{"version":2,"readIds":[]}', '{"version":1,"readIds":"first"}', '{"version":1,"readIds":[1]}', '{"version":1,"readIds":[""]}']) {
    assert.throws(() => parseNotificationReadState(raw), Error, raw);
  }
  const keys = [
    notificationReadStateKey("team:a", "member"),
    notificationReadStateKey("team", "a:member"),
    notificationReadStateKey("team%3Aa", "member"),
    notificationReadStateKey("team:a", "other-member"),
    notificationReadStateKey("团队", "成员"),
  ];
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(notificationReadStateKey("团队", "成员"), keys[4]);
});

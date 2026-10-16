import assert from "node:assert/strict";
import test from "node:test";
import { getNotificationReadTestExamples, isNotificationReadTestMode, notificationReadTestActivitiesByTask, notificationReadTestActivityIds } from "../src/ai/mock/data/notificationReadScenario.ts";
import { getDiscussionReadIds } from "../src/features/notifications/lib/notification-read-state.ts";

const titles = {
  "fragrance-live": "完成直播间彩排与场控清单",
  "fragrance-content": "终审短视频脚本与直播卖点",
  "fragrance-creator-business": "完成第二批达人商务合作确认",
};

test("通知测试只在开发环境的明确 query 下开启", () => {
  assert.equal(isNotificationReadTestMode("?notificationTest=1", true), true);
  assert.equal(isNotificationReadTestMode("?foo=bar&notificationTest=1", true), true);
  for (const search of ["", "?notificationTest=0", "?notificationTest=true", "?notificationTest=", "?notificationTest=11"]) assert.equal(isNotificationReadTestMode(search, true), false);
  assert.equal(isNotificationReadTestMode("?notificationTest=1", false), false);
});

test("六条专属未读包含同区三个真实提及、另区一个提及和两个普通事件", () => {
  const examples = getNotificationReadTestExamples(titles);
  assert.equal(examples.length, 6);
  assert.equal(new Set(examples.map(item => item.id)).size, 6);
  assert.ok(examples.every(item => item.id.startsWith("r10-demo-") && !item.read));
  const mentions = examples.filter(item => item.kind === "mention");
  assert.equal(mentions.filter(item => item.task?.id === "fragrance-live").length, 3);
  assert.equal(mentions.filter(item => item.task?.id === "fragrance-content").length, 1);
  assert.deepEqual(examples.filter(item => item.kind !== "mention").map(item => item.kind).sort(), ["invitation", "member-joined"]);
  assert.equal(notificationReadTestActivityIds.length, 4);
  assert.equal(new Set(notificationReadTestActivityIds).size, 4);
  for (const item of mentions) {
    const source = notificationReadTestActivitiesByTask[item.task!.id].find(activity => activity.id === item.target?.activityId);
    assert.ok(source, `通知 ${item.id} 必须精确绑定真实讨论消息`);
    assert.equal(item.target?.area, "discussion");
    assert.ok(source.message.includes("@周岚"));
    assert.notEqual(source.author, "周岚");
    assert.equal(item.people?.[0].id, source.author);
    assert.equal(item.createdAt, source.createdAt);
    assert.equal(item.task?.title, titles[item.task!.id as keyof typeof titles]);
  }
  assert.ok(examples.every((item, index) => !index || Date.parse(examples[index - 1].createdAt) >= Date.parse(item.createdAt)));
});

test("实际区域规则只读取直播三条，另区和普通事件继续未读", () => {
  const examples = getNotificationReadTestExamples(titles);
  const scope = { teamId: "creator-commerce", userId: "周岚" };
  const ids = getDiscussionReadIds(examples, { ...scope, taskId: "fragrance-live", activityIds: notificationReadTestActivityIds, readThrough: "2026-10-16T03:00:00Z", sequence: 1 }, scope);
  assert.equal(ids.length, 3);
  assert.ok(ids.every(id => examples.find(item => item.id === id)?.task?.id === "fragrance-live"));
  assert.equal(examples.filter(item => !ids.includes(item.id)).length, 3);
  assert.ok(examples.every(item => !item.read), "纯领域判断不修改夹具已读状态");
});

test("重复生成使用新对象并保留标题输入和活动原数据", () => {
  const frozenTitles = Object.freeze({ ...titles });
  const activityBefore = JSON.stringify(notificationReadTestActivitiesByTask);
  const first = getNotificationReadTestExamples(frozenTitles);
  const pristine = getNotificationReadTestExamples(frozenTitles);
  first[0].read = true;
  first[0].task!.title = "修改一次返回结果";
  first[0].people![0].name = "本次编辑";
  first[0].target!.activityId = "changed";
  assert.deepEqual(getNotificationReadTestExamples(frozenTitles), pristine);
  assert.deepEqual(frozenTitles, titles);
  assert.equal(JSON.stringify(notificationReadTestActivitiesByTask), activityBefore);
});

test("测试入口在现有任务实际注入可定位来源，普通入口不注入", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Reflect.deleteProperty(globalThis, "window");
    const normalModule = "../src/ai/mock/data/taskDetailMocks.ts?notification-read-normal";
    const normal = await import(normalModule);
    assert.equal(normal.taskDetailMocks["fragrance-live"].activities.filter((activity: { id: string }) => notificationReadTestActivityIds.includes(activity.id)).length, 0);
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { search: "?notificationTest=1" } } });
    const testModule = "../src/ai/mock/data/taskDetailMocks.ts?notification-read-test";
    const scenario = await import(testModule);
    for (const [taskId, activities] of Object.entries(notificationReadTestActivitiesByTask)) {
      const actual = scenario.taskDetailMocks[taskId];
      assert.ok(actual, `测试来源必须归属现有任务 ${taskId}`);
      for (const source of activities) {
        const rendered = actual.activities.find((activity: { id: string }) => activity.id === source.id);
        assert.deepEqual(rendered, source);
      }
      const original = normal.taskDetailMocks[taskId];
      assert.ok(original.activities.every((activity: { id: string }) => actual.activities.some((item: { id: string }) => item.id === activity.id)), "注入测试数据不能移除既有活动");
    }
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

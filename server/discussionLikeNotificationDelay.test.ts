import assert from "node:assert/strict";
import test from "node:test";
import * as reactions from "../src/features/tasks/discussion/lib/discussion-likes.ts";
import { readDiscussionLikeNotificationSource } from "../src/ai/discussion-like-notifications.ts";
import { notificationExamples } from "../src/ai/mock/data/notificationExamples.ts";
import { createCollaborationSnapshot, postCollaborationMessage, saveCollaboration } from "../src/features/tasks/lib/task-collaboration.ts";
import type { TaskNode } from "../src/shared/model/task-model.ts";

const start = Date.parse("2026-11-12T08:00:00Z");
const at = (ms: number) => new Date(start + ms).toISOString();
const empty = () => ({ notifications: [] as reactions.LikeNotification[], delivered: {} as Record<string, string>, nextAt: null as number | null });
const unread = () => false;

test("like state changes immediately, but its notification waits a full three seconds", () => {
  assert.equal(typeof reactions.advanceLikeNotifications, "function");
  const likes = reactions.toggleDiscussionLike({}, "m1", "a", at(0));
  assert.equal(likes.m1.length, 1);
  const pending = reactions.advanceLikeNotifications(empty(), likes, start + 2999, unread);
  assert.deepEqual(pending.notifications, []);
  assert.equal(pending.nextAt, start + 3000);
  const ready = reactions.advanceLikeNotifications(pending, likes, start + 3000, unread);
  assert.deepEqual(ready.notifications[0].likerIds, ["a"]);
  assert.equal(ready.notifications[0].createdAt, at(3000));
  assert.equal(ready.nextAt, null);
});

test("unlike within the window never creates a notification", () => {
  const pending = reactions.advanceLikeNotifications(empty(), { m1: [{ personId: "a", at: at(0) }] }, start, unread);
  const cancelled = reactions.advanceLikeNotifications(pending, { m1: [] }, start + 1000, unread);
  assert.equal(cancelled.nextAt, null);
  assert.deepEqual(reactions.advanceLikeNotifications(cancelled, { m1: [] }, start + 3000, unread).notifications, []);
});

test("a new like restarts only that person's window and an old wake-up cannot deliver it early", () => {
  const first = { m1: [{ personId: "a", at: at(0) }] };
  const pending = reactions.advanceLikeNotifications(empty(), first, start, unread);
  const latest = { m1: [{ personId: "a", at: at(2000) }] };
  const oldWakeUp = reactions.advanceLikeNotifications(pending, latest, start + 3000, unread);
  assert.deepEqual(oldWakeUp.notifications, []);
  assert.equal(oldWakeUp.nextAt, start + 5000);
  assert.equal(reactions.advanceLikeNotifications(oldWakeUp, latest, start + 4999, unread).notifications.length, 0);
  const ready = reactions.advanceLikeNotifications(oldWakeUp, latest, start + 5000, unread);
  assert.deepEqual(ready.notifications[0].likerIds, ["a"]);
  assert.equal(reactions.advanceLikeNotifications(ready, latest, start + 6000, unread).notifications.length, 1);
});

test("likers and messages wait independently, even when an unread aggregate already exists", () => {
  const likes = { m1: [{ personId: "a", at: at(0) }, { personId: "b", at: at(1000) }], m2: [{ personId: "a", at: at(2000) }] };
  const first = reactions.advanceLikeNotifications(empty(), likes, start + 3000, unread);
  assert.deepEqual(first.notifications.map(item => item.likerIds), [["a"]]);
  const second = reactions.advanceLikeNotifications(first, likes, start + 4000, unread);
  assert.deepEqual(second.notifications.map(item => item.likerIds), [["b", "a"]]);
  assert.equal(second.nextAt, start + 5000);
  assert.equal(reactions.advanceLikeNotifications(second, likes, start + 5000, unread).notifications.length, 2);
});

test("read history is preserved and a later mature like starts a new unread notification", () => {
  const likes = { m1: [{ personId: "a", at: at(0) }] };
  const first = reactions.advanceLikeNotifications(empty(), likes, start + 3000, unread);
  const read = (id: string) => id === first.notifications[0].id;
  const next = { m1: [...likes.m1, { personId: "b", at: at(4000) }] };
  const pending = reactions.advanceLikeNotifications(first, next, start + 6000, read);
  assert.equal(pending.notifications.length, 1);
  const ready = reactions.advanceLikeNotifications(pending, next, start + 7000, read);
  assert.deepEqual(ready.notifications.map(item => item.likerIds), [["a"], ["b"]]);
});

test("unlike removes only that person's unread contribution, without stale work retracting a new like", () => {
  const first = reactions.advanceLikeNotifications(empty(), { m1: [{ personId: "a", at: at(0) }, { personId: "b", at: at(0) }] }, start + 3000, unread);
  const reliked = { m1: [{ personId: "a", at: at(4000) }, { personId: "b", at: at(0) }] };
  const pending = reactions.advanceLikeNotifications(first, reliked, start + 4000, unread);
  assert.deepEqual(pending.notifications[0].likerIds, ["b"]);
  const ready = reactions.advanceLikeNotifications(pending, reliked, start + 7000, unread);
  assert.deepEqual(ready.notifications[0].likerIds, ["a", "b"]);
  assert.deepEqual(reactions.advanceLikeNotifications(ready, reliked, start + 8000, unread).notifications[0].likerIds, ["a", "b"]);
  assert.deepEqual(reactions.advanceLikeNotifications(ready, {}, start + 8000, unread).notifications, []);
});

test("local notification sources include only other people's likes on the viewer's live comments", () => {
  const records = new Map<string, string>();
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  const task: TaskNode = { id: "task", teamId: "team", kind: "task", name: "任务", ownerId: "me", parentId: "root", status: "进行中", updatedAt: at(0) };
  let snapshot = createCollaborationSnapshot([]);
  for (const [id, author] of [["own", "me"], ["other", "them"]]) {
    const next = postCollaborationMessage(snapshot, { message: { id, author, type: "member-post", message: "正文", time: "", createdAt: at(0) } });
    snapshot = saveCollaboration(storage, JSON.stringify(["team", "task"]), snapshot.revision, next);
  }
  storage.setItem(reactions.discussionLikesStorageKey("team", "task"), JSON.stringify({
    own: [{ personId: "me", at: at(0) }, { personId: "them", at: at(0) }], other: [{ personId: "me", at: at(0) }], missing: [{ personId: "them", at: at(0) }],
  }));
  const source = readDiscussionLikeNotificationSource(storage, task, "me", false, start + 3000);
  assert.deepEqual(source.likes, { own: [{ personId: "them", at: at(0) }] });
  assert.deepEqual(source.initial.notifications, []);
});

test("existing seeded notification identities and aggregation remain unchanged", () => {
  const storage = { getItem: () => null, setItem: () => {} };
  const task: TaskNode = { id: "fragrance-final-decision", teamId: "creator-commerce", kind: "task", name: "任务", ownerId: "周岚", parentId: "root", status: "进行中", updatedAt: at(0) };
  const source = readDiscussionLikeNotificationSource(storage, task, "周岚", true, start);
  assert.deepEqual(source.initial.notifications.map(item => item.id), notificationExamples.filter(item => item.kind === "like").map(item => item.id));
  const ready = reactions.advanceLikeNotifications(source.initial, source.likes, start, unread);
  assert.deepEqual(ready.notifications, source.initial.notifications);
});

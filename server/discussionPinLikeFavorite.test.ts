import assert from "node:assert/strict";
import test from "node:test";
import { parseDiscussionPins, pinDiscussionMessage, splitPinnedMessages, unpinDiscussionMessage } from "../src/features/tasks/discussion/lib/discussion-pins.ts";
import { applyLikeToNotifications, toggleDiscussionLike, type LikeNotification } from "../src/features/tasks/discussion/lib/discussion-likes.ts";
import { parseFavorites, toggleFavorite, type FavoriteRecord } from "../src/features/me/lib/favorites.ts";

test("a task keeps at most three pins and a fourth replaces the oldest", () => {
  let pins = pinDiscussionMessage([], "a", "2026-11-10T01:00:00Z", "owner");
  pins = pinDiscussionMessage(pins, "b", "2026-11-10T02:00:00Z", "owner");
  pins = pinDiscussionMessage(pins, "c", "2026-11-10T03:00:00Z", "admin");
  assert.deepEqual(pinDiscussionMessage(pins, "b", "2026-11-10T04:00:00Z", "owner"), pins);
  pins = pinDiscussionMessage(pins, "d", "2026-11-10T05:00:00Z", "owner");
  assert.deepEqual(pins.map(pin => pin.messageId), ["b", "c", "d"]);
  assert.deepEqual(unpinDiscussionMessage(pins, "c").map(pin => pin.messageId), ["b", "d"]);
  assert.deepEqual(parseDiscussionPins(JSON.stringify(pins)), pins);
  assert.deepEqual(parseDiscussionPins("not json"), []);
});

test("pinned messages move to the top, latest pin first, and the rest keep their order", () => {
  const messages = [{ id: "m4" }, { id: "m3" }, { id: "m2" }, { id: "m1" }];
  const pins = [
    { messageId: "m1", pinnedAt: "2026-11-10T01:00:00Z", pinnedBy: "owner" },
    { messageId: "m3", pinnedAt: "2026-11-10T02:00:00Z", pinnedBy: "owner" },
    { messageId: "gone", pinnedAt: "2026-11-10T03:00:00Z", pinnedBy: "owner" },
  ];
  const { pinned, timeline } = splitPinnedMessages(messages, pins);
  assert.deepEqual(pinned.map(message => message.id), ["m3", "m1"]);
  assert.deepEqual(timeline.map(message => message.id), ["m4", "m2"]);
  assert.deepEqual(splitPinnedMessages(messages, unpinDiscussionMessage(pins, "m3")).timeline.map(message => message.id), ["m4", "m3", "m2"]);
});

test("a like toggles for one person", () => {
  const liked = toggleDiscussionLike({}, "m1", "me", "2026-11-10T01:00:00Z");
  assert.deepEqual(liked.m1, [{ personId: "me", at: "2026-11-10T01:00:00Z" }]);
  assert.deepEqual(toggleDiscussionLike(liked, "m1", "me", "2026-11-10T02:00:00Z").m1, []);
});

test("likes merge into the author's unread notification and start a new one once it is read", () => {
  const read = new Set<string>();
  const like = (likerId: string, at: string, liked = true) => ({ messageId: "m1", likerId, at, liked });
  let notifications: LikeNotification[] = [];
  notifications = applyLikeToNotifications(notifications, like("张三", "2026-11-10T01:00:00Z"), id => read.has(id));
  notifications = applyLikeToNotifications(notifications, like("李四", "2026-11-10T02:00:00Z"), id => read.has(id));
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0].likerIds, ["李四", "张三"]);
  assert.equal(notifications[0].createdAt, "2026-11-10T02:00:00Z");

  read.add(notifications[0].id);
  notifications = applyLikeToNotifications(notifications, like("王五", "2026-11-10T03:00:00Z"), id => read.has(id));
  assert.equal(notifications.length, 2);
  assert.deepEqual(notifications[1].likerIds, ["王五"]);

  notifications = applyLikeToNotifications(notifications, like("王五", "2026-11-10T04:00:00Z", false), id => read.has(id));
  assert.equal(notifications.length, 1, "taking back the only like removes the unread notification");
  assert.deepEqual(notifications[0].likerIds, ["李四", "张三"], "a read notification is left as it was");
});

test("favorites are toggled per item and survive a round trip", () => {
  const record = (kind: FavoriteRecord["kind"], targetId?: string): FavoriteRecord => ({ kind, teamId: "team", taskId: "task", ...(targetId ? { targetId } : {}), createdAt: "2026-11-10T01:00:00Z" });
  let favorites = toggleFavorite([], record("task"));
  favorites = toggleFavorite(favorites, record("discussion", "m1"));
  favorites = toggleFavorite(favorites, record("file", "f1"));
  assert.deepEqual(favorites.map(item => item.kind), ["file", "discussion", "task"]);
  favorites = toggleFavorite(favorites, record("discussion", "m1"));
  assert.deepEqual(favorites.map(item => item.kind), ["file", "task"]);
  assert.deepEqual(parseFavorites(JSON.stringify(favorites)), favorites);
  assert.deepEqual(parseFavorites(JSON.stringify([{ kind: "discussion", teamId: "team", taskId: "task", createdAt: "2026-11-10T01:00:00Z" }])), [], "a message favorite needs its message");
});

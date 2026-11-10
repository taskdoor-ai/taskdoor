import assert from "node:assert/strict";
import test from "node:test";
import { discussionFollowers, parseDiscussionNotificationPreference } from "../src/features/tasks/discussion/lib/discussion-notification-preference.ts";
import { createCollaborationSnapshot, postCollaborationMessage, type CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";

test("participants default to only @ and replies; the owner always follows", () => {
  assert.equal(parseDiscussionNotificationPreference(null), "mentions");
  assert.equal(parseDiscussionNotificationPreference('"all"'), "all");
  assert.deepEqual(discussionFollowers("owner", ["a", "b", "owner"], id => id === "b" ? "all" : "mentions"), ["owner", "b"]);
});

test("a new message notifies followers, while @ and replies keep their own reason", () => {
  const people = ["owner", "a", "b", "c"].map(id => ({ id, name: id }));
  const root: CollaborationMessage = { id: "m1", author: "c", type: "member-post", message: "first", time: "", createdAt: "2026-11-10T01:00:00Z" };
  let snapshot = postCollaborationMessage(createCollaborationSnapshot([]), { message: root, visiblePeople: people, discussionFollowers: ["owner", "b"] });
  assert.deepEqual(snapshot.notifications.map(item => [item.recipientId, item.reason]), [["owner", "discussion"], ["b", "discussion"]]);

  const reply: CollaborationMessage = { id: "m2", author: "owner", type: "member-reply", replyToActivityId: "m1", message: "@a see this", mentionedPrincipalIds: ["a"], time: "", createdAt: "2026-11-10T02:00:00Z" };
  snapshot = postCollaborationMessage(snapshot, { message: reply, visiblePeople: people, discussionFollowers: ["owner", "b"] });
  assert.deepEqual(snapshot.notifications.slice(2).map(item => [item.recipientId, item.reason]), [["c", "reply"], ["a", "mention"], ["b", "discussion"]], "the author is never notified of their own message");
});

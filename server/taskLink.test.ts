import assert from "node:assert/strict";
import test from "node:test";
import { readTaskLink, taskLinkHref, withoutTaskLink } from "../src/app/workspace/lib/task-link.ts";

test("a task link round-trips its team, task and message or file", () => {
  const message = taskLinkHref({ teamId: "team a", taskId: "t1", target: { area: "discussion", activityId: "m1" } }, "/");
  assert.equal(message, "/?team=team+a&task=t1&message=m1");
  assert.deepEqual(readTaskLink(message.slice(1)), { teamId: "team a", taskId: "t1", target: { area: "discussion", activityId: "m1" } });
  assert.deepEqual(readTaskLink(taskLinkHref({ teamId: "x", taskId: "t", target: { area: "files", fileId: "f" } }, "/").slice(1))?.target, { area: "files", fileId: "f" });
  assert.equal(readTaskLink("?task=t1"), null, "a task needs its team");
});

test("opening a link leaves other parameters in the address", () => {
  assert.equal(withoutTaskLink({ pathname: "/", search: "?settings=tokens&team=a&task=b&file=c", hash: "#x" }), "/?settings=tokens#x");
  assert.equal(withoutTaskLink({ pathname: "/app", search: "?team=a&task=b", hash: "" }), "/app");
});

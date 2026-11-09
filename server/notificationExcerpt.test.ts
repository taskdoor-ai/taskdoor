import assert from "node:assert/strict";
import test from "node:test";
import { notificationExcerptText } from "../src/features/notifications/lib/notification-excerpt";

test("notification excerpt drops blank lines and trailing spaces but keeps written line breaks", () => {
  assert.equal(notificationExcerptText("first  \n\n   \nsecond\r\nthird \t"), "first\nsecond\nthird");
  assert.equal(notificationExcerptText("  indented"), "  indented");
  assert.equal(notificationExcerptText(" \n\t\n"), "");
  assert.equal(notificationExcerptText(undefined), "");
});

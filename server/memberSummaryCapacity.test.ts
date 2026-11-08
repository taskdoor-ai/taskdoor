import assert from "node:assert/strict";
import test from "node:test";
import { summaryCapacity, summaryControlsWidth } from "../src/features/members/lib/member-summary-capacity.ts";

test("four collapsed rows: the first beside the plus and arrow, the rest across the column", () => {
  assert.equal(summaryControlsWidth(true), 72);
  assert.equal(summaryControlsWidth(false), 36);
  // W = 166: row 1 = floor((166-6-72)/22) = 4, rows 2-4 = floor((166-6)/22) = 7 each.
  assert.equal(summaryCapacity(166, 72), 4 + 3 * 7);
  // Read-only keeps only the arrow: row 1 = floor((166-6-36)/22) = 5.
  assert.equal(summaryCapacity(166, 36), 5 + 3 * 7);
  // Every row keeps at least one place.
  assert.equal(summaryCapacity(40, 72), 4);
});

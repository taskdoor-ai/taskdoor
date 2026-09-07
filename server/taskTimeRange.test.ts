import assert from "node:assert/strict";
import test from "node:test";
import { getTaskTimeRangeLabel } from "../src/lib/taskTimeRange.ts";

test("任务列表将开始和结束时间展示为只读范围", () => {
  assert.equal(getTaskTimeRangeLabel({ plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-02" }), "8 月 30 日 – 9 月 2 日");
  assert.equal(getTaskTimeRangeLabel({ plannedEndOn: "2026-09-02" }), "截止 9 月 2 日");
  assert.equal(getTaskTimeRangeLabel({ dueAt: "今天 16:00" }), "截止 今天 16:00");
});

test("任务列表隐藏未设置的时间", () => {
  assert.equal(getTaskTimeRangeLabel({}), null);
  assert.equal(getTaskTimeRangeLabel({ dueAt: "—" }), null);
  assert.equal(getTaskTimeRangeLabel({ dueAt: "待排期" }), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import * as effort from "../src/lib/taskEffort.ts";

test("预计投入统一按 480 分钟一人天显示，缺失和微量投入不变成零", () => {
  assert.equal(typeof effort.formatEffortPersonDays, "function");
  assert.equal(effort.formatEffortPersonDays(2400), "5 人天");
  assert.equal(effort.formatEffortPersonDays(19200), "40 人天");
  assert.equal(effort.formatEffortPersonDays(240), "0.5 人天");
  assert.equal(effort.formatEffortPersonDays(420), "0.88 人天");
  assert.equal(effort.formatEffortPersonDays(1), "<0.01 人天");
  assert.equal(effort.formatEffortPersonDays(0), "0 人天");
  assert.equal(effort.formatEffortPersonDays(null), "待估算");
  assert.throws(() => effort.formatEffortPersonDays(-1));
});

test("人天输入精确保存为分钟，并继续兼容明确的小时输入", () => {
  assert.equal(typeof effort.parseEffortPersonDays, "function");
  assert.equal(effort.parseEffortPersonDays("5"), 2400);
  assert.equal(effort.parseEffortPersonDays("0.125"), 60);
  assert.equal(effort.parseEffortPersonDays("0.1875"), 90);
  assert.equal(effort.parseEffortPersonDays("0"), 0);
  assert.equal(effort.parseEffortPersonDays(""), null);
  assert.throws(() => effort.parseEffortPersonDays("0.001"));
  assert.equal(effort.parseEffortHours("40"), 2400);
});

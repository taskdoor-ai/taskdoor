import assert from "node:assert/strict";
import test from "node:test";
import { runAgentdoorReanalysis } from "../src/lib/agentdoorReanalysis.ts";

test("AgentDoor 等待调度完成后只执行一次重新分析", async () => {
  const order: string[] = [];
  let release: (() => void) | undefined;
  const pending = runAgentdoorReanalysis({
    analyze: () => { order.push("analyze"); return "2026-09-02T10:00:00.000Z"; },
    schedule: (complete) => { order.push("schedule"); release = complete; },
  });

  await Promise.resolve();
  assert.deepEqual(order, ["schedule"]);
  assert.ok(release);
  release();
  assert.equal(await pending, "2026-09-02T10:00:00.000Z");
  assert.deepEqual(order, ["schedule", "analyze"]);
});

test("AgentDoor 重新分析错误原样交给调用方处理", async () => {
  await assert.rejects(() => runAgentdoorReanalysis({
    analyze: () => { throw new Error("analysis failed"); },
    schedule: (complete) => complete(),
  }), /analysis failed/);
});

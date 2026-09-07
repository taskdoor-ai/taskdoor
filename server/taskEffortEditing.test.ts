import assert from "node:assert/strict";
import test from "node:test";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { createManualEffortEstimate, summarizeTaskEffort } from "../src/lib/taskEffort.ts";
import { applySavedTaskEffort, getTaskEffortEditSignature, getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";

const task = (id: string, parentTaskId?: string): TaskNode => ({ id, kind: "task", name: id, parentId: null, updatedAt: "刚刚", ownerId: "周岚", status: "待开始", goal: "确认行动", completionCriteria: ["行动项与负责人已核对"], executionTips: [], parentTaskId });
const estimate = (node: TaskNode, minutes: number) => createManualEffortEstimate(node, { minutes, workMethod: "AI 整理，人工核对", reason: "按校对和沟通的人工合计" });

test("已保存任务的任意深度汇总只取叶子，父估算不会重复计入", () => {
  const root = task("root"), branch = task("branch", "root"), leafA = task("a", "branch"), leafB = task("b", "root");
  root.effortEstimate = estimate(root, 1000);
  branch.effortEstimate = estimate(branch, 500);
  leafA.effortEstimate = estimate(leafA, 120);
  leafB.effortEstimate = estimate(leafB, 60);
  const leaves = getWorkspaceEffortLeaves([root, branch, leafA, leafB], "root");
  assert.deepEqual(leaves.map(item => item.id), ["a", "b"]);
  assert.equal(summarizeTaskEffort(leaves).totalMinutes, 180);
});

test("继承目标变更使已保存子项的估算需复核，旧goal不能冒充有效", () => {
  const root = task("root"), leaf = task("leaf", "root");
  leaf.effortEstimate = estimate(leaf, 120);
  root.goal = "扩展到全部团队";
  const summary = summarizeTaskEffort(getWorkspaceEffortLeaves([root, leaf], "root"));
  assert.equal(summary.totalMinutes, null);
  assert.equal(summary.staleCount, 1);
});

test("丢失根任务或循环结构不返回伪造的完整工时", () => {
  assert.deepEqual(getWorkspaceEffortLeaves([], "missing"), []);
  const a = task("a", "b"), b = task("b", "a");
  assert.deepEqual(getWorkspaceEffortLeaves([a, b], "a"), []);
});

test("保存手工确认估算只改当前叶子的估算并生成活动", () => {
  const original = task("leaf");
  const nextEstimate = estimate(original, 90);
  const result = applySavedTaskEffort([original], "leaf", nextEstimate, getTaskEffortEditSignature(original), "周岚");
  assert.equal(result.nodes[0].kind, "task");
  assert.deepEqual((result.nodes[0] as TaskNode).effortEstimate, nextEstimate);
  assert.equal((result.nodes[0] as TaskNode).ownerId, original.ownerId);
  assert.equal((result.nodes[0] as TaskNode).status, original.status);
  assert.equal(original.effortEstimate, undefined);
  assert.match(result.activity?.message ?? "", /预计总投入/);
  assert.ok(result.activity?.changes?.some(change => change.label.includes("工作方式")));
});

test("范围或估算已经改变，旧浮层不覆盖；父任务不能直接保存独立总量", () => {
  const original = task("leaf");
  const nextEstimate = estimate(original, 90);
  const signature = getTaskEffortEditSignature(original);
  assert.throws(() => applySavedTaskEffort([{ ...original, completionCriteria: ["新的范围"] }], "leaf", nextEstimate, signature, "周岚"), /变化|更新/);
  assert.throws(() => applySavedTaskEffort([original, task("child", "leaf")], "leaf", nextEstimate, signature, "周岚"), /子任务|汇总/);
  assert.throws(() => applySavedTaskEffort([], "leaf", nextEstimate, signature, "周岚"), /不存在/);
});

test("保存边界重新核对估算版本和范围；清空工时不会转成0", () => {
  const original = task("leaf");
  original.effortEstimate = estimate(original, 0);
  const signature = getTaskEffortEditSignature(original);
  const clear = createManualEffortEstimate(original, { minutes: null, workMethod: "", reason: "" }, original.effortEstimate);
  const result = applySavedTaskEffort([original], "leaf", clear, signature, "周岚");
  assert.equal((result.nodes[0] as TaskNode).effortEstimate?.minutes, null);
  assert.equal((result.nodes[0] as TaskNode).effortEstimate?.confirmed, false);
  assert.throws(() => applySavedTaskEffort([original], "leaf", { ...clear, scopeKey: "forged" }, signature, "周岚"), /估算|预览|范围/);
});

import assert from "node:assert/strict";
import test from "node:test";
import * as workbench from "../src/lib/personalWorkbench.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { createManualEffortEstimate } from "../src/lib/taskEffort.ts";

const task = (id: string, patch: Partial<TaskNode> = {}): TaskNode => ({
  id, kind: "task", name: id, parentId: null, ownerId: "me", status: "进行中", updatedAt: "今天", ...patch,
});
const itemsFor = (tasks: TaskNode[]) => workbench.buildPersonalWorkbenchItems(workbench.buildPersonalWorkbenchModel({
  tasks, currentUserId: "me", asOf: "2026-08-31",
})).items;

test("相同状态的推荐原因带出各自期限与交付标准，并随任务修改更新", () => {
  const tasks = [
    task("contract", { plannedEndOn: "2026-08-30", completionCriteria: ["授权渠道与合同附件一致"] }),
    task("stock", { plannedEndOn: "2026-08-29", completionCriteria: ["赠品库存与锁库数量一致"] }),
  ];
  const reasons = () => new Map(workbench.buildPersonalWorkbenchPriorities(itemsFor(tasks)).map(({ item }) => [item.taskId, item.priorityReason]));
  const before = reasons();
  assert.match(before.get("contract")!, /8 月 30 日/);
  assert.match(before.get("contract")!, /核对.*授权渠道与合同附件一致/);
  assert.match(before.get("stock")!, /8 月 29 日/);
  assert.match(before.get("stock")!, /核对.*赠品库存与锁库数量一致/);
  assert.notEqual(before.get("contract"), before.get("stock"));
  tasks[0].completionCriteria = ["补充授权文件经双方签字确认"];
  assert.match(reasons().get("contract")!, /补充授权文件经双方签字确认/);
  assert.doesNotMatch(reasons().get("contract")!, /授权渠道与合同附件一致/);
});

test("依赖原因说明未完成数量和本任务交付，不暴露关联任务名称或猜测不可见状态", () => {
  const result = workbench.buildPersonalWorkbenchPriorities(itemsFor([
    task("release", { dependsOnTaskIds: ["dep-a", "dep-b", "missing"], completionCriteria: ["发布范围与最终确认单一致"] }),
    task("dep-a", { ownerId: "another", name: "私有前置 A" }),
    task("dep-b", { ownerId: "another", name: "私有前置 B", status: "待审核" }),
  ]));
  const reason = result[0].item.priorityReason;
  assert.match(reason, /2 项前置交付尚未完成/);
  assert.match(reason, /1 项前置.*(?:不可用|未提供|待核对)/);
  assert.match(reason, /核对.*发布范围与最终确认单一致/);
  assert.doesNotMatch(reason, /私有前置|dep-a|dep-b|missing|3 项前置交付尚未完成/);
});

test("统筹原因使用直属子任务实际状态，取消不算待收口，完成标准不冒充验收", () => {
  const result = workbench.buildPersonalWorkbenchPriorities(itemsFor([
    task("parent", { completionCriteria: ["整套交付通过最终评审"] }),
    task("done", { parentTaskId: "parent", ownerId: "another", status: "已完成" }),
    task("pending", { parentTaskId: "parent", ownerId: "another", status: "待审核" }),
    task("cancelled", { parentTaskId: "parent", ownerId: "another", status: "已取消" }),
  ]));
  assert.match(result[0].item.priorityReason, /3 项直属子任务.*1 项标记已完成.*1 项待收口/);
  assert.match(result[0].item.priorityReason, /核对.*整套交付通过最终评审/);
  assert.doesNotMatch(result[0].item.priorityReason, /已验收|2 项待收口/);
});

test("Agent 综合已授权任务信号算分，组合风险可以改变同档原始顺序", () => {
  const items = itemsFor([
    task("overdue-plain", { plannedEndOn: "2026-08-30", completionCriteria: ["交付结果可核对"] }),
    task("overdue-dependent", { plannedEndOn: "2026-08-30", dependsOnTaskIds: ["dependency"], completionCriteria: ["交付结果可核对"] }),
    task("dependency", { ownerId: "another", status: "进行中" }),
    task("today", { plannedEndOn: "2026-08-31", completionCriteria: ["交付结果可核对"] }),
    task("later", { plannedEndOn: "2026-09-04", completionCriteria: ["交付结果可核对"] }),
  ]);
  const before = structuredClone(items);
  const priorities = workbench.buildPersonalWorkbenchPriorities(items);

  assert.deepEqual(priorities.map((entry) => [entry.item.taskId, entry.rank]), [
    ["overdue-dependent", 1], ["overdue-plain", 2], ["today", 3], ["later", 4],
  ]);
  assert.deepEqual(Object.keys(priorities[0]).sort(), ["item", "rank"], "前端只接收排好序的结论，不接收分数或评分因子");
  assert.deepEqual(Object.keys(priorities[0].item).sort(), ["effort", "iconName", "iconTone", "priorityReason", "summary", "taskId", "title"]);
  assert.match(priorities[0].item.summary, /任务进行中/);
  assert.match(priorities[0].item.priorityReason, /已超过承诺时间/);
  assert.match(priorities[0].item.priorityReason, /前置交付/);
  assert.deepEqual(priorities[0].item.effort, { value: "待估算" });
  assert.doesNotMatch(JSON.stringify(priorities), /secret|score|评分|权重|置信度/);
  assert.deepEqual(items, before, "算分排序不能修改任务记录");
});

test("同分任务沿用输入顺序，重复计算得到稳定结果", () => {
  const items = itemsFor([
    task("first", { plannedEndOn: "2026-09-04", completionCriteria: ["交付结果可核对"] }),
    task("second", { plannedEndOn: "2026-09-04", completionCriteria: ["交付结果可核对"] }),
  ]);
  const first = workbench.buildPersonalWorkbenchPriorities(items);
  const second = workbench.buildPersonalWorkbenchPriorities(items);
  assert.deepEqual(first.map((entry) => entry.item.taskId), ["first", "second"]);
  assert.deepEqual(second, first);
});

test("阻塞、完成冲突和普通计划任务按可处理风险进入同一推荐顺序", () => {
  const result = workbench.buildPersonalWorkbenchPriorities(itemsFor([
    task("future", { plannedEndOn: "2026-09-06", completionCriteria: ["交付结果可核对"] }),
    task("blocked", { status: "已阻塞" }),
    task("completed", { status: "已完成", plannedEndOn: "2026-08-30" }),
    task("child", { parentTaskId: "completed", ownerId: "another" }),
  ]));
  assert.deepEqual(result.map((entry) => entry.item.taskId), ["blocked", "completed", "future"]);
  assert.ok(result.some((entry) => entry.item.taskId === "completed"), "未收口的完成冲突仍应作为推荐项出现");
});

test("无截止、未知日期和过期信息仍进入同一列表且不会伪造精度", () => {
  const items = itemsFor([
    task("no-due", { completionCriteria: ["交付结果可核对"] }),
    task("unknown-date", { dueAt: "下周" }),
    task("stale", { plannedEndOn: "2026-09-01", completionCriteria: ["交付结果可核对"] }),
  ]);
  items.find((item) => item.taskId === "stale")!.freshness = "stale";
  const result = workbench.buildPersonalWorkbenchPriorities(items);
  assert.equal(result.length, 3);
  assert.deepEqual(result.map((entry) => entry.rank), [1, 2, 3]);
  assert.equal(items.find((item) => item.taskId === "no-due")?.dueState, "none");
  assert.doesNotMatch(JSON.stringify(result), /评分|置信度|建议分|日期待核对/);
});

test("不可访问的其他负责人任务只提供可用状态信号，不泄露对象标识", () => {
  const result = workbench.buildPersonalWorkbenchPriorities(itemsFor([
    task("owned", { dependsOnTaskIds: ["secret-dependency"] }),
    task("secret-dependency", { ownerId: "another", name: "不应显示的前置任务", status: "已阻塞" }),
  ]));
  assert.deepEqual(result.map((entry) => entry.item.taskId), ["owned"]);
  assert.doesNotMatch(JSON.stringify(result), /secret-dependency|不应显示的前置任务/);
});

test("父任务预计投入只汇总有效叶子估算，不把缺失值当成零", () => {
  const goal = "完成整套活动交付。";
  const estimatedLeaf = (id: string, minutes: number): TaskNode => {
    const scope = { goal, completionCriteria: [`完成 ${id}`], executionTips: ["使用 AI 整理后人工核对"] };
    return task(id, {
      ownerId: "another", parentTaskId: "plan", ...scope,
      effortEstimate: createManualEffortEstimate(scope, {
        minutes, workMethod: "AI 整理后人工核对", reason: "按完整交付过程估算",
      }),
    });
  };
  const result = workbench.buildPersonalWorkbenchPriorities(itemsFor([
    task("plan", { goal, completionCriteria: ["完成整体交付"] }),
    estimatedLeaf("leaf-a", 30),
    estimatedLeaf("leaf-b", 60),
  ]));
  assert.deepEqual(result[0].item.effort, { value: "约 1 小时 30 分钟", detail: "含 2 项子任务" });
});

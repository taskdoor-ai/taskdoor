import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import type { AiConnectionRequest } from "../src/components/AiConnectionDialog.tsx";
import type { TaskRelationSummary } from "../src/components/TaskRelationsSection.tsx";
import type { TaskActivityMock, TaskDetailMock, TaskFileNode } from "../src/data/taskDetailMocks.ts";

const moduleUrl = new URL("../src/lib/taskAiConnection.ts", import.meta.url);
async function build(input: Record<string, unknown>): Promise<AiConnectionRequest> {
  assert.ok(existsSync(moduleUrl), "任务头部连接 AI 应提供独立、纯函数的任务上下文构建器");
  const { buildTaskAiConnectionRequest } = await import(moduleUrl.href);
  return buildTaskAiConnectionRequest(input);
}

const discussion: TaskActivityMock = { id: "discussion-1", author: "member-author", type: "member-post", message: "保留原文：请核对合作状态。\n第二行也不改。", file: "核对表.xlsx", time: "今天 09:00", createdAt: "2026-09-01T01:00:00Z" };
const reply: TaskActivityMock = { id: "reply-1", author: "member-reply", type: "member-reply", message: "预算仍待确认。", replyToActivityId: discussion.id, time: "6 分钟前" };
const file: TaskFileNode = { id: "file-1", kind: "file", parentId: "folder-1", name: "核对表.xlsx", format: "XLSX", version: 3, updatedAt: "今天", sizeLabel: "10 KB", content: "不得导出的文件完整正文", previewData: { kind: "text", text: "不得导出的预览数据" } };
const task: TaskDetailMock = {
  title: " 当前标题原文 ", goal: " 当前目标原文\n不扩大范围。 ", owner: "member-owner", participants: ["member-accepted", "member-pending", "member-unknown"],
  participantInvitationStatus: { "member-accepted": "accepted", "member-pending": "pending" }, status: "进行中", due: "9 月 8 日", summary: "旧 AI 摘要不得作为当前事实",
  completionCriteria: [" 标准第一项 ", "标准第二项"], executionTips: ["执行建议原文"], activities: [discussion, reply], files: [file], commits: [],
};
const input = (overrides: Partial<TaskDetailMock> = {}) => ({ taskId: "current-task", task: { ...task, ...overrides }, currentUser: "current-user" });
const contextValue = (request: AiConnectionRequest, label: string) => request.context.find(item => item.label === label)?.value ?? "";
const textOf = (request: AiConnectionRequest) => JSON.stringify(request);
const relation = (id: string, overrides: Partial<TaskRelationSummary> = {}): TaskRelationSummary => ({ id, title: `${id} 标题`, goal: `${id} 目标`, status: "待开始", owner: `${id}-owner`, dueAt: "2026-09-09", ...overrides });

test("任务连接以当前任务为对象，保留标题目标原文与真实标准建议", async () => {
  const request = await build(input());
  assert.equal(request.title, "连接 AI");
  assert.equal(request.workObject.kind, "任务");
  assert.equal(request.workObject.title, task.title);
  assert.equal(request.workObject.content, task.goal);
  assert.match(request.workObject.meta ?? "", /current-task/);
  assert.equal(contextValue(request, "当前任务状态"), task.status);
  assert.equal(contextValue(request, "发起人"), "current-user");
  assert.equal(contextValue(request, "完成标准"), task.completionCriteria!.join("\n"));
  assert.equal(contextValue(request, "执行建议"), task.executionTips!.join("\n"));
  assert.deepEqual(request.contextPreview?.items.map(item => item.label), ["当前任务"]);
  assert.equal(request.contextPreview?.items[0].title, task.title);
  assert.match(request.contextPreview?.items[0].detail ?? "", /Task ID、名称、目标、状态、期限、人员、完成标准、执行建议/);
  assert.equal(Object.hasOwn(request, "instruction"), false);
  assert.equal(Object.hasOwn(request, "expectedOutput"), false);
  assert.doesNotMatch(textOf(request), /旧 AI 摘要不得作为当前事实|希望 AI 完成|期望成果/);
});

test("正式负责人与待接受提议分开，参与者缺失的接受状态不作默认接受", async () => {
  const request = await build({ ...input(), pendingOwnerId: "member-proposed" });
  assert.equal(contextValue(request, "正式负责人"), "member-owner");
  assert.match(contextValue(request, "负责人提议"), /member-proposed.*待接受/);
  assert.doesNotMatch(contextValue(request, "正式负责人"), /member-proposed/);
  const participants = contextValue(request, "参与人");
  assert.match(participants, /member-accepted.*已接受/);
  assert.match(participants, /member-pending.*待接受/);
  assert.match(participants, /member-unknown.*接受状态未提供/);
});

test("真实空值不回填目标、标准、负责人或截止日期，也不自动指定发起人", async () => {
  const request = await build({ ...input({ title: "", goal: "", owner: "", completionCriteria: [], executionTips: [], participants: [], activities: [], files: [], due: "旧日期" }), due: "", pendingOwnerId: "candidate" });
  assert.equal(request.workObject.title, "");
  assert.equal(request.workObject.content, "");
  assert.equal(contextValue(request, "完成标准"), "");
  assert.equal(contextValue(request, "执行建议"), "");
  assert.match(contextValue(request, "正式负责人"), /未设置|未提供/);
  assert.doesNotMatch(contextValue(request, "正式负责人"), /current-user|candidate/);
  assert.match(contextValue(request, "截止日期"), /未设置|未提供/);
  assert.doesNotMatch(textOf(request), /旧日期|核对合作状态|交付验收|加强沟通/);
});

test("截止日期和标签按传入当前值保留，不把相对日期推算为精确日期", async () => {
  const current = await build({ ...input(), due: "下周二待确认", tags: ["发布", "内容"] });
  assert.equal(contextValue(current, "截止日期"), "下周二待确认");
  assert.equal(contextValue(current, "标签"), "发布、内容");
  const fallback = await build(input());
  assert.equal(contextValue(fallback, "截止日期"), task.due);
});

test("任务只附直接父任务投影，不带子任务、前置关系或路径推断", async () => {
  const child = relation("direct-child", { proposedOwnerId: "child-candidate", owner: "", completionCriteria: ["子任务真实标准"], updatedAt: "2026-09-01T02:00:00Z" });
  const dependency = relation("dependency", { status: "已完成" });
  const parentTask = relation("parent-task", { title: "父任务标题", goal: "父任务目标", status: "进行中" });
  const request = await build({ ...input(), parentTask, childTasks: [child], dependencyTasks: [dependency], dependencyTaskIds: [dependency.id, "missing-dependency"], pathItems: [{ id: "fake-parent", label: "不能推断为父任务" }, { id: "current-task", label: task.title }] });
  const text = textOf(request);
  assert.match(contextValue(request, "主任务"), /父任务标题.*parent-task.*父任务目标.*进行中/s);
  assert.deepEqual(request.contextPreview?.items.map(item => item.label), ["当前任务", "主任务"]);
  for (const excluded of [child.id, dependency.id, "missing-dependency", "fake-parent", "直属子任务", "前置任务", "前置资料缺口", "归属路径"]) assert.doesNotMatch(text, new RegExp(excluded));
});

test("旧关系输入无论为空或有值都不进入当前任务合同", async () => {
  const cleared = await build({ ...input(), dependencyTasks: [relation("old-dependency")], dependencyTaskIds: [] });
  assert.doesNotMatch(textOf(cleared), /old-dependency/);
  const missing = await build(input());
  for (const label of ["直属子任务", "前置任务", "前置资料缺口", "归属路径"]) assert.equal(contextValue(missing, label), "");
});

test("任务入口不带任何讨论、回复、AI 结论、提交或变更流水", async () => {
  const other: TaskActivityMock = { ...discussion, id: "discussion-2", file: undefined, message: "当前任务另一串人的讨论" };
  const ai: TaskActivityMock = { ...discussion, id: "ai-event", type: "ai-insight", message: "不得带入的 AI 结论" };
  const change: TaskActivityMock = { ...discussion, id: "status-event", type: "status-change", message: "不得带入的状态变更流水" };
  const request = await build(input({ activities: [discussion, reply, other, ai, change], commits: [{ id: "commit-1", author: "someone", time: "昨天", message: "不得带入的提交消息", files: [] }] }));
  assert.equal(request.context.filter(item => item.label === "讨论" || item.label === "回复").length, 0);
  assert.doesNotMatch(textOf(request), /保留原文|预算仍待确认|当前任务另一串人的讨论|不得带入的 AI 结论|不得带入的状态变更流水|不得带入的提交消息/);
});

test("损坏的讨论来源也不会从任务入口进入载荷", async () => {
  const orphan = { ...reply, id: "orphan", replyToActivityId: "missing-source" };
  const aiSource = { ...discussion, id: "ai-source", type: "ai-insight" as const, message: "被引用也不升级为人的讨论" };
  const aiReply = { ...reply, id: "ai-reply", replyToActivityId: aiSource.id };
  const request = await build(input({ activities: [orphan, aiSource, aiReply] }));
  assert.doesNotMatch(textOf(request), /missing-source|被引用也不升级为人的讨论|讨论来源缺口/);
});

test("任务入口不带任务文件、引用元数据、正文或预览", async () => {
  const request = await build(input({ files: [file, { ...file, id: "archived-file", name: "归档文件.md", archived: true }, { id: "folder-1", kind: "folder", name: "文件夹不导出", parentId: null, updatedAt: "昨天" }] }));
  assert.equal(contextValue(request, "任务文件元数据"), "");
  assert.equal(contextValue(request, "文件引用"), "");
  assert.doesNotMatch(textOf(request), /file-1|核对表\.xlsx|不得导出的文件完整正文|不得导出的预览数据|归档文件\.md|archived-file|文件夹不导出|previewData/);
});

test("文件缺失或重名不改变任务入口载荷", async () => {
  const missing = await build(input({ files: [{ ...file, archived: true }] }));
  const ambiguous = await build(input({ files: [file, { ...file, id: "same-name-file", version: 4 }] }));
  for (const request of [missing, ambiguous]) assert.doesNotMatch(textOf(request), /核对表\.xlsx|same-name-file|文件引用|文件元数据/);
});

test("生成上下文确定且不修改任务、人员、讨论、文件或关系输入", async () => {
  const cycleA = { ...reply, id: "cycle-a", replyToActivityId: "cycle-b" };
  const cycleB = { ...reply, id: "cycle-b", replyToActivityId: "cycle-a" };
  const source = { ...input({ activities: [cycleA, cycleB] }), tags: ["z", "a"], childTasks: [relation("b"), relation("a")], dependencyTasks: [relation("d")], dependencyTaskIds: ["d"], pendingOwnerId: "new-owner" };
  const before = structuredClone(source);
  const first = await build(source);
  const second = await build(source);
  assert.deepEqual(source, before);
  assert.deepEqual(first, second);
  assert.doesNotMatch(textOf(first), /cycle-a|cycle-b|\"b 标题\"|\"a 标题\"|\"d 标题\"/);
});

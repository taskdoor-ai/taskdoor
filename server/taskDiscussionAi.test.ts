import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import type { TaskActivityMock, TaskDetailMock, TaskFileNode } from "../src/data/taskDetailMocks.ts";

const moduleUrl = new URL("../src/lib/taskDiscussionAi.ts", import.meta.url);
async function build(input: Record<string, unknown>) {
  assert.ok(existsSync(moduleUrl), "讨论连接 AI 应提供独立、可测试的最小上下文构建器");
  const { buildDiscussionAiRequest } = await import(moduleUrl.href);
  return buildDiscussionAiRequest(input);
}

const root: TaskActivityMock = { id: "discussion-a", author: "陈默", type: "member-post", message: "请核对第一批合作状态", file: "核对表.xlsx", time: "今天", createdAt: "2026-08-31T01:00:00Z" };
const reply: TaskActivityMock = { id: "reply-a", author: "周岚", type: "member-reply", message: "还需确认预算边界", replyToActivityId: root.id, time: "6 分钟前" };
const sibling: TaskActivityMock = { ...reply, id: "reply-b", message: "另一条相关回复" };
const unrelated: TaskActivityMock = { ...root, id: "discussion-other", message: "另一个讨论串的内容", file: "不相关文件.md" };
const file: TaskFileNode = { id: "file-a", kind: "file", parentId: null, name: "核对表.xlsx", version: 3, updatedAt: "今天", content: "不应自动打包整份文件正文" };
const task: TaskDetailMock = { title: "香氛礼盒达人带货收尾", goal: "确认合作状态与资源优先级", owner: "周岚", participants: [], status: "进行中", due: "未设置", summary: "不能作为实时事实带出旧摘要", completionCriteria: ["核对合作状态"], activities: [root, reply, sibling, unrelated], files: [file, { ...file, id: "other-file", name: "不相关文件.md" }], commits: [] };
const input = (target: Record<string, string>, overrides: Partial<TaskDetailMock> = {}) => ({ taskId: "task-a", task: { ...task, ...overrides }, target, currentUser: "周岚" });
const textOf = (request: unknown) => JSON.stringify(request);
const contextValue = (request: { context: Array<{ label: string; value: string }> }, label: string) => request.context.find(item => item.label === label)?.value ?? "";

test("基于讨论携带原文、同串回复、真实任务背景与引用，不导出其他讨论或整份文件", async () => {
  const result = await build(input({ kind: "discussion", activityId: root.id }));
  assert.ok(result);
  assert.equal(result.workObject.kind, "讨论");
  assert.equal(result.workObject.content, root.message);
  assert.deepEqual(result.contextPreview?.items.map((item: { label: string }) => item.label), ["当前任务", "当前讨论"]);
  assert.equal(result.contextPreview?.items[0].title, task.title);
  assert.match(result.contextPreview?.items[0].detail ?? "", /Task ID、名称、目标、状态、完成标准/);
  assert.equal(contextValue(result, "发起人"), "");
  assert.equal(result.contextPreview?.items[1].title, "陈默发起的讨论");
  assert.match(result.contextPreview?.items[1].detail ?? "", /包含当前讨论及 2 条回复/);
  for (const text of [root.id, root.author, root.createdAt!, reply.message, sibling.message, task.title, task.goal, "核对表.xlsx", "file-a", "v3"]) assert.ok(textOf(result).includes(text), text);
  for (const text of [unrelated.message, "不相关文件.md", file.content!, task.summary]) assert.ok(!textOf(result).includes(text), text);
  assert.equal(result.instruction, undefined);
  assert.equal(result.expectedOutput, undefined);
});

test("具体回复只携带其祖先链，不扩展到同级回复或别的讨论", async () => {
  const result = await build(input({ kind: "reply", activityId: reply.id }));
  assert.equal(result.workObject.kind, "回复");
  assert.equal(result.workObject.content, reply.message);
  assert.equal(result.contextPreview?.items[1].title, "周岚的回复");
  assert.match(result.contextPreview?.items[1].detail ?? "", /包含当前回复及 1 条上文/);
  assert.match(textOf(result), /discussion-a/);
  assert.match(textOf(result), /请核对第一批合作状态/);
  assert.doesNotMatch(textOf(result), /另一条相关回复|另一个讨论串的内容/);
});

test("任务文件快照不冒充当前文件状态，明确引用时版本与当前状态未核验", async () => {
  const result = await build(input({ kind: "discussion", activityId: root.id }));
  const reference = result.context.find((item: { label: string }) => item.label === "引用文件");
  assert.match(reference.value, /任务传入快照.*v3/);
  assert.match(reference.value, /引用时版本未保存/);
  assert.match(reference.value, /当前文件状态与版本未核验/);
  assert.doesNotMatch(reference.value, /当前同名文件|当前版本 v3|当前文件更新时间/);
});

test("回复编辑入口带入当前未发送草稿，不改原讨论或草稿", async () => {
  const before = structuredClone(task);
  const result = await build(input({ kind: "reply-draft", activityId: root.id, draft: "我会核对预算，请帮我说得更清楚。" }));
  assert.equal(result.workObject.kind, "回复草稿");
  assert.equal(result.workObject.content, root.message);
  assert.equal(result.contextPreview?.items[1].title, "回复陈默的讨论");
  assert.match(result.contextPreview?.items[1].detail ?? "", /包含被回复原文与未发送草稿/);
  assert.ok(result.context.some((item: { label: string; value: string }) => item.label === "未发送的回复草稿" && item.value === "我会核对预算，请帮我说得更清楚。"));
  assert.equal(result.instruction, undefined);
  assert.equal(result.expectedOutput, undefined);
  assert.deepEqual(task, before);
});

test("无草稿仍可连接，不预设工作目标；没有真实完成标准时不补示例", async () => {
  const result = await build(input({ kind: "reply-draft", activityId: root.id, draft: "" }, { completionCriteria: undefined }));
  assert.ok(result);
  assert.doesNotMatch(textOf(result.context), /完成标准/);
  assert.equal(result.instruction, undefined);
  assert.equal(result.expectedOutput, undefined);
});

test("缺失或非人类讨论目标拒绝构建，不以整个任务兜底", async () => {
  assert.equal(await build(input({ kind: "discussion", activityId: "missing" })), null);
  const activity: TaskActivityMock = { ...root, id: "event", type: "status-change" };
  assert.equal(await build(input({ kind: "discussion", activityId: activity.id }, { activities: [activity] })), null);
});

test("缺失父引用、归档文件与重名文件明确不导出未经定位的内容", async () => {
  const orphan: TaskActivityMock = { ...reply, replyToActivityId: "missing-parent", file: "核对表.xlsx" };
  const result = await build(input({ kind: "reply", activityId: orphan.id }, { activities: [orphan], files: [{ ...file, archived: true }] }));
  assert.match(textOf(result), /原记录暂不可用/);
  assert.match(result.contextPreview?.items[1].detail ?? "", /部分上文不可用/);
  assert.match(textOf(result), /任务传入快照未找到唯一可用文件/);
  assert.match(textOf(result), /当前文件状态与版本未核验/);
  assert.doesNotMatch(textOf(result), /file-a/);
  const ambiguous = await build(input({ kind: "discussion", activityId: root.id }, { files: [file, { ...file, id: "same-name" }] }));
  assert.match(textOf(ambiguous), /重名/);
  assert.doesNotMatch(textOf(ambiguous), /file-a|same-name/);
});

test("损坏的回复循环能够结束，并保留来源缺口", async () => {
  const left = { ...reply, id: "cycle-a", replyToActivityId: "cycle-b" };
  const right = { ...reply, id: "cycle-b", replyToActivityId: "cycle-a" };
  const result = await build(input({ kind: "reply", activityId: left.id }, { activities: [left, right], files: [] }));
  assert.ok(result);
  assert.match(textOf(result), /循环|异常/);
});

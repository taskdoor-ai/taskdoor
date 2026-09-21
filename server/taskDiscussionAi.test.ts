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
  const preview = result.contextPreview!.items;
  assert.equal(preview.find(item => item.label === "任务名称")?.value, task.title);
  assert.equal(preview.find(item => item.label === "任务目标")?.value, task.goal);
  assert.equal(contextValue(result, "发起人"), "");
  for (const record of [root, reply, sibling]) {
    const item = preview.find(item => item.value === record.message);
    assert.ok(item);
    assert.ok(item.meta?.includes(record.author));
  }
  for (const text of [root.id, root.author, root.createdAt!, reply.message, sibling.message, task.title, task.goal, "核对表.xlsx", "file-a", "v3"]) assert.ok(textOf(result).includes(text), text);
  for (const text of [unrelated.message, "不相关文件.md", file.content!, task.summary]) assert.ok(!textOf(result).includes(text), text);
  assert.equal(Object.hasOwn(result, "instruction"), false);
  assert.equal(Object.hasOwn(result, "expectedOutput"), false);
});

test("具体回复携带所属整串有效讨论，排除别的讨论", async () => {
  const result = await build(input({ kind: "reply", activityId: reply.id }));
  assert.equal(result.workObject.kind, "回复");
  assert.equal(result.workObject.content, reply.message);
  assert.ok(result.contextPreview?.items.some(item => item.value === reply.message));
  assert.ok(result.contextPreview?.items.some(item => item.value === root.message));
  assert.match(textOf(result), /discussion-a/);
  assert.match(textOf(result), /请核对第一批合作状态/);
  assert.match(textOf(result), /另一条相关回复/);
  assert.doesNotMatch(textOf(result), /另一个讨论串的内容/);
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
  assert.ok(result.contextPreview?.items.some(item => item.value === root.message));
  assert.equal(result.contextPreview?.items.find(item => item.label === "未发送的回复草稿")?.value, "我会核对预算，请帮我说得更清楚。");
  assert.ok(result.context.some((item: { label: string; value: string }) => item.label === "未发送的回复草稿" && item.value === "我会核对预算，请帮我说得更清楚。"));
  assert.equal(Object.hasOwn(result, "instruction"), false);
  assert.equal(Object.hasOwn(result, "expectedOutput"), false);
  assert.deepEqual(task, before);
});

test("无草稿仍可连接，不预设目标和结果；没有真实完成标准时不补示例", async () => {
  const result = await build(input({ kind: "reply-draft", activityId: root.id, draft: "" }, { completionCriteria: undefined }));
  assert.ok(result);
  assert.doesNotMatch(textOf(result.context), /完成标准/);
  assert.equal(Object.hasOwn(result, "instruction"), false);
  assert.equal(Object.hasOwn(result, "expectedOutput"), false);
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
  assert.match(result.contextPreview?.items.find(item => item.label === "来源缺口")?.value ?? "", /原记录暂不可用/);
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


test("回复草稿也携带整串回复，预览与导出都保留相同记录和引用关系", async () => {
  const nested = { ...reply, id: "nested", replyToActivityId: reply.id, message: "嵌套回复原文" };
  const result = await build(input({ kind: "reply-draft", activityId: reply.id, draft: "未发送内容" }, { activities: [root, reply, sibling, nested, unrelated] }));
  assert.ok(result);
  const payload = JSON.stringify({ workObject: result.workObject, context: result.context });
  const records = result.contextPreview!.items.filter(item => item.id.startsWith("record-"));
  assert.equal(new Set(records.map(item => item.id)).size, 4);
  for (const record of [root, reply, sibling, nested]) {
    assert.ok(records.some(item => item.value === record.message));
    assert.ok(payload.includes(record.message));
  }
  assert.ok(payload.includes(`回复 ${reply.id}`));
  assert.doesNotMatch(payload, /另一个讨论串的内容/);
});

test("删除的目标拒绝连接，已删除主动态和回复不导出正文、附件或引用摘录", async () => {
  const deleted = { ...root, deletedAt: "2026-09-17T00:00:00Z", message: "已删除主动态秘密", attachmentRefs: [{ fileId: "secret", name: "已删除附件.pdf", version: 1 }] };
  const removedReply = { ...sibling, deletedAt: deleted.deletedAt, message: "已删除回复秘密" };
  const survivor = { ...reply, quote: { messageId: root.id, author: root.author, text: deleted.message } };
  const activities = [deleted, survivor, removedReply, unrelated];
  assert.equal(await build(input({ kind: "discussion", activityId: root.id }, { activities })), null);
  const result = await build(input({ kind: "reply", activityId: reply.id }, { activities }));
  assert.ok(result);
  assert.match(textOf(result), /原记录已删除/);
  assert.match(textOf(result), /还需确认预算边界/);
  assert.doesNotMatch(textOf(result), /已删除主动态秘密|已删除回复秘密|已删除附件|核对表.xlsx|另一个讨论串/);
});

test("整串附件使用结构化文件引用，预览和导出均含来源版本，不带完整文件", async () => {
  const attached = { ...sibling, attachmentRefs: [{ fileId: "uploaded", name: "新上传资料.pdf", version: 2 }] };
  const uploaded = { ...file, id: "uploaded", name: "新上传资料.pdf", version: 3, content: "附件完整内容不应导出" };
  const result = await build(input({ kind: "reply", activityId: reply.id }, { activities: [root, reply, attached, unrelated], files: [file, uploaded] }));
  assert.ok(result);
  const attachment = result.context.find(item => item.label === "讨论附件");
  assert.ok(attachment);
  for (const text of ["uploaded", "新上传资料.pdf", "v2", sibling.id]) assert.ok(attachment.value.includes(text), text);
  assert.ok(result.contextPreview!.items.some(item => item.label === "讨论附件" && item.value === attachment.value));
  assert.doesNotMatch(textOf(result), /附件完整内容不应导出|不相关文件/);
});

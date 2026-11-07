import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscussionSubtaskRequest, discussionSubtaskResultSchema, generateDiscussionSubtaskDraft, isDiscussionSubtaskRequestCurrent, parseDiscussionSubtaskDraft } from "../src/features/tasks/lib/discussion-subtask-draft.ts";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";
import { getMockDiscussionSubtaskDraft } from "../src/ai/mock/lib/discussionSubtaskDraft.ts";

const root: CollaborationMessage = { id: "root", author: "leader", message: "请核对发布材料，确认能否交付并说明遗留问题。", type: "member-post", time: "今天" };
const reply: CollaborationMessage = { id: "reply", author: "reviewer", message: "收到，我会核对并回传结论。", replyToActivityId: "root", type: "member-reply", time: "今天" };
const unrelated: CollaborationMessage = { ...root, id: "other", message: "另一件不相关的事" };
const input = { locale: "zh-CN", currentDate: "2026-11-04", task: { id: "parent", title: "准备发布", goal: "让发布团队掌握上线条件。", completionCriteria: ["材料可核验"] }, sourceMessageId: reply.id, messages: [reply, unrelated, root], members: [{ id: "reviewer", name: "陈默", email: "private@example.test", role: "内容", dynamicResponsibility: "核对发布内容" }, { id: "invited", name: "待加入", email: "", role: "", membershipStatus: "invited" as const }], labels: ["内容"] };
const draft = { title: "核对发布材料并回传结论", goal: "让发布负责人掌握材料可用性及遗留问题。", ownerId: "reviewer", endDate: "2026-12-10", labels: ["内容"] };

test("从选中回复收集同一讨论上下文，排除无关讨论及未加入成员，不发送联系资料", () => {
  const before = JSON.stringify(input);
  const request = buildDiscussionSubtaskRequest(input);
  assert.deepEqual(request.messages.map((m: { id: string }) => m.id), ["reply", "root"]);
  assert.equal(request.source.body, reply.message);
  assert.deepEqual(request.members.map((m: { id: string }) => m.id), ["reviewer"]);
  assert.doesNotMatch(JSON.stringify(request), /private@example|另一件|待加入/);
  assert.equal(JSON.stringify(input), before);
});

test("生成结果清除无效人选、未知标签和过去日期，保留可编辑的名称与目标", () => {
  const request = buildDiscussionSubtaskRequest(input);
  const parsed = parseDiscussionSubtaskDraft({ draft: { ...draft, ownerId: "outsider", endDate: "2026-02-31", labels: ["内容", "新标签", "内容"] }, message: "" }, request);
  assert.deepEqual(parsed.draft, { ...draft, ownerId: "", endDate: "", labels: ["内容"] });
  assert.equal(parseDiscussionSubtaskDraft({ draft: { ...draft, endDate: "2026-11-03" }, message: "" }, request).draft?.endDate, "");
});

test("确认句或旧空草稿拒绝沿同串真实工作整理可编辑草稿", () => {
  const request = buildDiscussionSubtaskRequest(input);
  for (const output of [
    { draft: { ...draft, title: reply.message }, message: "" },
    { draft: null, message: "讨论尚未明确需要跟进的事项，可手动填写。" },
  ]) {
    const result = parseDiscussionSubtaskDraft(output, request);
    assert.ok(result.draft);
    assert.match(result.draft.title, /发布材料/);
    assert.doesNotMatch(result.draft.title, /^(收到|补充信息|请指定|无法生成)/);
    assert.equal(result.draft.ownerId, "");
    assert.equal(result.draft.endDate, "");
    assert.equal(result.message, "");
  }
});

test("任务引用目录只传同串实际可读引用，原消息保持不变", () => {
  const message = { ...root, id: "reference", message: "[226](<#taskdoor-task=readable%2Ftask>) 1 [227](<#taskdoor-task=missing>)" };
  const request = buildDiscussionSubtaskRequest({ ...input, sourceMessageId: message.id, messages: [message, unrelated], referenceTasks: [
    { id: "readable/task", title: "核对发布指标", goal: "让发布判断基于同一份指标。", completionCriteria: ["指标口径一致"] },
    { id: "other-task", title: "不得发送的其他任务", goal: "私有内容" },
  ] });
  assert.deepEqual(request.referencedTasks, [{ id: "readable/task", title: "核对发布指标", goal: "让发布判断基于同一份指标。", completionCriteria: ["指标口径一致"] }]);
  assert.equal(request.source.body, message.message);
  assert.equal(request.messages[0].body, message.message);
  assert.doesNotMatch(JSON.stringify(request), /不得发送|私有内容/);
});

test("只有引用和数字时使用真实任务名称与目标，不把隐藏链接和数字编成工作", () => {
  const message = { ...root, id: "reference", message: "[226](<#taskdoor-task=readable>) 1" };
  const request = buildDiscussionSubtaskRequest({ ...input, sourceMessageId: message.id, messages: [message], referenceTasks: [{ id: "readable", title: "核对发布指标", goal: "让发布判断基于同一份指标。" }] });
  const result = parseDiscussionSubtaskDraft({ draft: null, message: "无法生成" }, request);
  assert.deepEqual(result, { draft: { title: "核对发布指标", goal: "让发布判断基于同一份指标。", ownerId: "", endDate: "", labels: [] }, message: "" });
});

test("寒暄及不可读引用借当前任务定义填草稿，不泄露原始任务ID", () => {
  for (const text of ["谢谢，辛苦了。", "[226](<#taskdoor-task=hidden-task>) 1", "123"]) {
    const message = { ...root, message: text };
    const request = buildDiscussionSubtaskRequest({ ...input, sourceMessageId: message.id, messages: [message] });
    const result = parseDiscussionSubtaskDraft({ draft: null, message: "请补充信息" }, request);
    assert.ok(result.draft);
    assert.match(result.draft.title, /准备发布/);
    assert.equal(result.draft.goal, input.task.goal);
    assert.doesNotMatch(result.draft.title + result.draft.goal, /taskdoor-task|hidden-task|谢谢|123|补充信息/);
    assert.equal(result.draft.ownerId, ""); assert.equal(result.draft.endDate, "");
  }
});

test("成功草稿缺少目标时填充引用或父任务的已有目标", () => {
  const request = buildDiscussionSubtaskRequest(input);
  const result = parseDiscussionSubtaskDraft({ draft: { ...draft, goal: "" }, message: "请补充目标" }, request);
  assert.equal(result.draft.goal, input.task.goal);
  assert.equal(result.message, "");
  assert.equal(discussionSubtaskResultSchema.safeParse({ draft: null, message: "" }).success, false);
});

test("拒绝或占位话术不能搬到名称与目标字段，改用真实已有信息", () => {
  const request = buildDiscussionSubtaskRequest(input);
  for (const title of ["无法生成子任务", "请补充信息", "需要更多上下文", "子任务名称", "Please provide more context"]) {
    const result = parseDiscussionSubtaskDraft({ draft: { ...draft, title, goal: "请补充信息" }, message: "" }, request);
    assert.match(result.draft.title, /发布材料/);
    assert.equal(result.draft.goal, input.task.goal);
    assert.equal(result.message, "");
  }
  const result = parseDiscussionSubtaskDraft({ draft: { ...draft, goal: "需要更多上下文" }, message: "" }, request);
  assert.equal(result.draft.title, draft.title);
  assert.equal(result.draft.goal, input.task.goal);
});

test("已完成或撤回事项只整理现有记录，不伪造重新开工承诺", () => {
  const message = { ...root, message: "这两处已经核对完成，不用再创建任务。" };
  const request = buildDiscussionSubtaskRequest({ ...input, sourceMessageId: message.id, messages: [message] });
  const result = parseDiscussionSubtaskDraft({ draft: null, message: "事项已结束" }, request);
  assert.ok(result.draft);
  assert.match(result.draft.title, /准备发布/);
  assert.match(result.draft.title, /讨论|记录/);
  assert.doesNotMatch(result.draft.title, /重新|恢复|再次|待核对/);
  assert.equal(result.draft.ownerId, ""); assert.equal(result.draft.endDate, "");
});

test("成功响应的旧空草稿可恢复，真实网络失败和取消仍为失败", async t => {
  const request = buildDiscussionSubtaskRequest(input);
  t.mock.method(globalThis, "fetch", async () => Response.json({ draft: null, message: "无法生成" }));
  assert.ok((await generateDiscussionSubtaskDraft(request, new AbortController().signal)).draft);
  t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(generateDiscussionSubtaskDraft(request, new AbortController().signal), /草稿/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generateDiscussionSubtaskDraft(request, controller.signal), error => error instanceof Error && error.name === "AbortError");
});

test("原消息或同段回复变化使旧生成上下文失效，无关讨论更新不影响", () => {
  const request = buildDiscussionSubtaskRequest(input);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [root, unrelated, reply]), true);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [root, { ...unrelated, message: "无关更新" }, reply]), true);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [{ ...root, message: "请暂停发布" }, reply]), false);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [root, { ...reply, deletedAt: "now" }]), false);
});

test("截图讨论的演示草稿可预填，改写或新增的讨论不能冒用示例结果", () => {
  const id = "ccx-double11-presale";
  const title = "完成双十一预售商品与履约准备";
  const original = { ...root, id: `${id}-activity`, author: "梁川", message: `已补充“${title}”的最新核对信息，等待 Task Owner 确认下一步。` };
  const response = { ...reply, id: `${id}-activity-reply`, replyToActivityId: original.id, author: "周岚", message: "收到，我会在本轮完成前核对并回传结论。" };
  const request = buildDiscussionSubtaskRequest({ ...input, task: { ...input.task, id, title }, sourceMessageId: response.id, messages: [original, response], members: [{ id: "周岚", name: "周岚", email: "", role: "" }] });
  const draft = getMockDiscussionSubtaskDraft(request)?.draft;
  assert.equal(draft?.title, "核对双十一预售准备并回传结论");
  assert.ok(draft?.goal); assert.equal(draft?.ownerId, "周岚"); assert.equal(draft?.endDate, "");
  assert.deepEqual(getMockDiscussionSubtaskDraft({ ...request, source: { taskId: id, messageId: original.id, body: original.message, author: original.author } })?.draft, draft);
  assert.equal(getMockDiscussionSubtaskDraft({ ...request, messages: [...request.messages, { ...request.messages[0], id: "new", body: "改为暂停核对" }] }), undefined);
  assert.equal(getMockDiscussionSubtaskDraft({ ...request, source: { ...request.source, body: "更换事项" } }), undefined);
  assert.equal(getMockDiscussionSubtaskDraft(buildDiscussionSubtaskRequest(input)), undefined);
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscussionSubtaskRequest, isDiscussionSubtaskRequestCurrent, parseDiscussionSubtaskDraft } from "../src/features/tasks/lib/discussion-subtask-draft.ts";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration.ts";

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

test("收到等确认句不能直接成为生成标题；没有明确事项时允许返回需补充内容", () => {
  const request = buildDiscussionSubtaskRequest(input);
  assert.throws(() => parseDiscussionSubtaskDraft({ draft: { ...draft, title: reply.message }, message: "" }, request), /名称|草稿/);
  assert.deepEqual(parseDiscussionSubtaskDraft({ draft: null, message: "讨论尚未明确需要跟进的事项，可手动填写。" }, request), { draft: null, message: "讨论尚未明确需要跟进的事项，可手动填写。" });
});

test("原消息或同段回复变化使旧生成上下文失效，无关讨论更新不影响", () => {
  const request = buildDiscussionSubtaskRequest(input);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [root, unrelated, reply]), true);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [root, { ...unrelated, message: "无关更新" }, reply]), true);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [{ ...root, message: "请暂停发布" }, reply]), false);
  assert.equal(isDiscussionSubtaskRequestCurrent(request, [root, { ...reply, deletedAt: "now" }]), false);
});

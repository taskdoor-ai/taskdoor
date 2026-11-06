import { z } from "zod";
import type { PersonOption } from "@/shared/model/task-model";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";

const sourceSchema = z.object({ taskId: z.string().min(1).max(200), messageId: z.string().min(1).max(200), author: z.string().max(200), body: z.string().max(8000) }).strict();
const messageSchema = z.object({ id: z.string().min(1).max(200), author: z.string().max(200), body: z.string().max(8000), replyToId: z.string().max(200), attachments: z.array(z.string().max(500)).max(30) }).strict();
export const discussionSubtaskRequestSchema = z.object({
  locale: z.enum(["zh-CN", "en"]), currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  task: z.object({ id: z.string().min(1).max(200), title: z.string().max(2000), goal: z.string().max(8000), completionCriteria: z.array(z.string().max(2000)).max(100) }).strict(),
  source: sourceSchema, contextComplete: z.boolean(), messages: z.array(messageSchema).min(1).max(40),
  members: z.array(z.object({ id: z.string().min(1).max(200), name: z.string().max(200), responsibility: z.string().max(4000) }).strict()).max(60),
  labels: z.array(z.string().max(100)).max(100),
}).strict().refine(request => request.task.id === request.source.taskId && new Set(request.messages.map(m => m.id)).size === request.messages.length && request.messages.some(m => m.id === request.source.messageId && m.body === request.source.body && m.author === request.source.author), "来源讨论不匹配");
export type DiscussionSubtaskRequest = z.infer<typeof discussionSubtaskRequestSchema>;
export const discussionSubtaskResultSchema = z.object({
  draft: z.object({ title: z.string().trim().min(1).max(160), goal: z.string().trim().max(2000), ownerId: z.string().max(200), endDate: z.string().max(20), labels: z.array(z.string().max(100)).max(20) }).strict().nullable(),
  message: z.string().max(500).default(""),
}).strict();
export type DiscussionSubtaskResult = z.infer<typeof discussionSubtaskResultSchema>;
export type DiscussionSubtaskDraft = NonNullable<DiscussionSubtaskResult["draft"]>;

type RequestInput = {
  locale: string; currentDate: string; task: DiscussionSubtaskRequest["task"]; sourceMessageId: string;
  messages: readonly CollaborationMessage[]; members: readonly PersonOption[]; labels: string[];
};

function discussionContext(sourceId: string, messages: readonly CollaborationMessage[]) {
  const byId = new Map<string, CollaborationMessage>();
  for (const message of messages) {
    if (byId.has(message.id)) throw new Error("讨论记录重复，请重新打开后再试。");
    byId.set(message.id, message);
  }
  const readable = (message: CollaborationMessage | undefined): message is CollaborationMessage => Boolean(message && !message.deletedAt && ["member-post", "member-reply"].includes(message.type));
  const source = byId.get(sourceId);
  if (!readable(source)) throw new Error("来源讨论已不可用，可手动填写子任务。");
  let root = source;
  let complete = true;
  const ancestors = new Set([root.id]);
  while (root.replyToActivityId) {
    const parent = byId.get(root.replyToActivityId);
    if (!readable(parent)) { complete = false; break; }
    if (ancestors.has(parent.id)) throw new Error("讨论引用关系异常，可手动填写子任务。");
    ancestors.add(parent.id); root = parent;
  }
  const ids = new Set([root.id]);
  const pending = [root];
  while (pending.length) {
    const parent = pending.pop()!;
    for (const message of messages) if (readable(message) && message.replyToActivityId === parent.id && !ids.has(message.id)) { ids.add(message.id); pending.push(message); }
  }
  const related = messages.filter(message => ids.has(message.id) && readable(message)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(message => ({
    id: message.id, author: message.author, body: message.message, replyToId: message.replyToActivityId ?? "",
    attachments: message.attachmentRefs?.map(ref => ref.name) ?? (message.file ? [message.file] : []),
  }));
  return { source, contextComplete: complete, messages: related };
}

export function buildDiscussionSubtaskRequest(input: RequestInput): DiscussionSubtaskRequest {
  const context = discussionContext(input.sourceMessageId, input.messages);
  return discussionSubtaskRequestSchema.parse({
    locale: input.locale === "en" ? "en" : "zh-CN", currentDate: input.currentDate, task: input.task,
    source: { taskId: input.task.id, messageId: context.source.id, body: context.source.message, author: context.source.author },
    contextComplete: context.contextComplete, messages: context.messages,
    members: input.members.filter(member => member.membershipStatus !== "invited").map(member => ({ id: member.id, name: member.name, responsibility: member.dynamicResponsibility ?? "" })),
    labels: [...new Set(input.labels)],
  });
}

export function isDiscussionSubtaskRequestCurrent(request: DiscussionSubtaskRequest, messages: readonly CollaborationMessage[]): boolean {
  try {
    const current = discussionContext(request.source.messageId, messages);
    return current.source.message === request.source.body && current.source.author === request.source.author && current.contextComplete === request.contextComplete && JSON.stringify(current.messages) === JSON.stringify(request.messages);
  } catch { return false; }
}

export function parseDiscussionSubtaskDraft(value: unknown, request: DiscussionSubtaskRequest): DiscussionSubtaskResult {
  const result = discussionSubtaskResultSchema.parse(value);
  if (!result.draft) return result;
  const draft = result.draft;
  if (draft.goal && draft.title.replace(/[\s，。,.！!？?]/g, "") === draft.goal.replace(/[\s，。,.！!？?]/g, "")) throw new Error("草稿名称与目标重复，请重试或手动填写。");
  if (/[\r\n]/.test(draft.title) || /^(收到|好的|谢谢|没问题|ok\b|thanks\b)/i.test(draft.title)) throw new Error("草稿名称未能概括要跟进的工作，请重试。");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) ? new Date(`${draft.endDate}T00:00:00Z`) : null;
  const validDate = date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === draft.endDate && draft.endDate >= request.currentDate;
  return { ...result, draft: { ...draft, ownerId: request.members.some(m => m.id === draft.ownerId) ? draft.ownerId : "", endDate: validDate ? draft.endDate : "", labels: [...new Set(draft.labels)].filter(label => request.labels.includes(label)) } };
}

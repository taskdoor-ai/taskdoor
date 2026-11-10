import { z } from "zod";
import type { PersonOption } from "@/shared/model/task-model";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";

const sourceSchema = z.object({ taskId: z.string().min(1).max(200), messageId: z.string().min(1).max(200), author: z.string().max(200), body: z.string().max(8000) }).strict();
const messageSchema = z.object({ id: z.string().min(1).max(200), author: z.string().max(200), body: z.string().max(8000), replyToId: z.string().max(200), attachments: z.array(z.string().max(500)).max(30) }).strict();
const referencedTaskSchema = z.object({ id: z.string().min(1).max(200), title: z.string().max(2000), goal: z.string().max(8000).optional(), completionCriteria: z.array(z.string().max(2000)).max(100).optional() }).strict();
export const discussionSubtaskRequestSchema = z.object({
  locale: z.enum(["zh-CN", "en"]), currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  task: z.object({ id: z.string().min(1).max(200), title: z.string().max(2000), goal: z.string().max(8000), completionCriteria: z.array(z.string().max(2000)).max(100) }).strict(),
  source: sourceSchema, contextComplete: z.boolean(), messages: z.array(messageSchema).min(1).max(40),
  members: z.array(z.object({ id: z.string().min(1).max(200), name: z.string().max(200), responsibility: z.string().max(4000) }).strict()).max(60),
  labels: z.array(z.string().max(100)).max(100),
  referencedTasks: z.array(referencedTaskSchema).max(60).optional(),
}).strict().refine(request => {
  const referenceIds = new Set(request.messages.flatMap(message => referencedTaskIds(message.body)));
  return request.task.id === request.source.taskId
    && new Set(request.messages.map(m => m.id)).size === request.messages.length
    && request.messages.some(m => m.id === request.source.messageId && m.body === request.source.body && m.author === request.source.author)
    && new Set(request.referencedTasks?.map(task => task.id)).size === (request.referencedTasks?.length ?? 0)
    && (request.referencedTasks ?? []).every(task => referenceIds.has(task.id));
}, "来源讨论不匹配");
export type DiscussionSubtaskRequest = z.infer<typeof discussionSubtaskRequestSchema>;
export const discussionSubtaskResultSchema = z.object({
  draft: z.object({ title: z.string().trim().min(1).max(160), goal: z.string().trim().max(2000), completionCriteria: z.array(z.string().trim().min(1).max(2000)).max(30).optional(), ownerId: z.string().max(200), endDate: z.string().max(20), endDateSuggestion: z.string().trim().max(500).optional(), labels: z.array(z.string().max(100)).max(20) }).strict(),
  message: z.string().max(500).default(""),
}).strict();
export type DiscussionSubtaskResult = z.infer<typeof discussionSubtaskResultSchema>;
export type DiscussionSubtaskDraft = NonNullable<DiscussionSubtaskResult["draft"]>;

type RequestInput = {
  locale: string; currentDate: string; task: DiscussionSubtaskRequest["task"]; sourceMessageId: string;
  messages: readonly CollaborationMessage[]; members: readonly PersonOption[]; labels: string[];
  referenceTasks?: readonly { id: string; title: string; goal?: string; completionCriteria?: readonly string[] }[];
};

function referencedTaskIds(text: string): string[] {
  return Array.from(text.matchAll(/#taskdoor-task=([^\s)>\]]+)/g)).flatMap(match => {
    try { return [decodeURIComponent(match[1])]; } catch { return []; }
  });
}

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
  const directory = new Map(input.referenceTasks?.map(task => [task.id, task]));
  const referenceIds = [...new Set([context.source.message, ...context.messages.map(message => message.body)].flatMap(referencedTaskIds))];
  const referencedTasks = referenceIds.flatMap(id => {
    const task = directory.get(id);
    return task ? [{ id, title: task.title, ...(task.goal !== undefined ? { goal: task.goal } : {}), ...(task.completionCriteria !== undefined ? { completionCriteria: [...task.completionCriteria] } : {}) }] : [];
  }).slice(0, 60);
  return discussionSubtaskRequestSchema.parse({
    locale: input.locale === "en" ? "en" : "zh-CN", currentDate: input.currentDate, task: input.task,
    source: { taskId: input.task.id, messageId: context.source.id, body: context.source.message, author: context.source.author },
    contextComplete: context.contextComplete, messages: context.messages,
    members: input.members.filter(member => member.membershipStatus !== "invited").map(member => ({ id: member.id, name: member.name, responsibility: member.dynamicResponsibility ?? "" })),
    labels: [...new Set(input.labels)],
    ...(referencedTasks.length ? { referencedTasks } : {}),
  });
}

export function isDiscussionSubtaskRequestCurrent(request: DiscussionSubtaskRequest, messages: readonly CollaborationMessage[]): boolean {
  try {
    const current = discussionContext(request.source.messageId, messages);
    return current.source.message === request.source.body && current.source.author === request.source.author && current.contextComplete === request.contextComplete && JSON.stringify(current.messages) === JSON.stringify(request.messages);
  } catch { return false; }
}

const placeholderText = /^(?:暂时)?(?:无法|不能|未能|请(?:补充|提供|指定|说明)|需要(?:更多|补充)|补充信息|子任务名称|未命名(?:子)?任务|(?:cannot|can't|unable to|please (?:provide|specify|clarify)|need (?:more|additional)|subtask name|untitled)\b)/i;
const acknowledgement = /^(?:收到|好的|谢谢|辛苦|没问题|了解|明白|ok\b|thanks\b|thank you\b|got it\b|understood\b)/i;
const normalizedText = (text: string) => text.replace(/[\s，。,.！!？?]/g, "");

function readableText(text: string, request: DiscussionSubtaskRequest): string {
  const titles = new Map(request.referencedTasks?.map(task => [task.id, task.title]));
  return text.replace(/\[[^\]]*\]\(\s*<?(#taskdoor-task=[^\s)>]+)>?\s*\)/g, (_match, href: string) => {
    const id = referencedTaskIds(href)[0];
    return titles.get(id) ?? "";
  }).replace(/#taskdoor-task=[^\s)>\]]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#]+/g, "").replace(/\s+/g, " ").trim();
}

function existingGoal(request: DiscussionSubtaskRequest, title: string): string {
  // Only reuse a definition when the draft identifies that same work. A parent
  // purpose or completion criterion does not establish a local subtask goal.
  const task = [...(request.referencedTasks ?? []), request.task].find(task => normalizedText(task.title) === normalizedText(title));
  const goal = readableText(task?.goal ?? "", request);
  return goal && !placeholderText.test(goal) && normalizedText(goal) !== normalizedText(title) ? goal.slice(0, 2000) : "";
}

function contextDraft(request: DiscussionSubtaskRequest): DiscussionSubtaskDraft {
  const workTitle = (body: string) => {
    const prose = body.replace(/\[[^\]]*\]\(\s*<?#taskdoor-task=[^\s)>]+>?\s*\)/g, "").replace(/#taskdoor-task=[^\s)>\]]+/g, "").trim();
    if (!/[\p{L}]/u.test(prose) || acknowledgement.test(prose)) return "";
    const text = readableText(body, request);
    if (!/[\p{L}]/u.test(text) || acknowledgement.test(text) || placeholderText.test(text)) return "";
    return text.split(/[\r\n。！？!?]/)[0].replace(/^(?:请|麻烦|帮我|帮忙)\s*/, "").trim();
  };
  const topic = request.referencedTasks?.find(task => task.title.trim())?.title.trim() || request.task.title.trim();
  const recordTitle = request.locale === "en" ? (topic ? `Review discussion records for ${topic}` : "Review the current task discussion") : (topic ? `整理${topic}的讨论记录` : "整理当前任务的讨论记录");
  const ended = request.messages.some(message => /已经.*完成|已完成|不用再|无需再|撤回|取消(?:这|该|原|任务)|\b(?:already (?:done|completed)|no longer needed|withdrawn|cancelled|canceled)\b/i.test(message.body));
  const title = (ended ? recordTitle : workTitle(request.source.body)
    || request.referencedTasks?.find(task => task.title.trim())?.title
    || request.messages.filter(message => message.id !== request.source.messageId).map(message => workTitle(message.body)).find(Boolean)
    || recordTitle).replace(/\s+/g, " ").trim().slice(0, 160);
  return { title, goal: existingGoal(request, title), ownerId: "", endDate: "", labels: [] };
}

export function parseDiscussionSubtaskDraft(value: unknown, request: DiscussionSubtaskRequest): DiscussionSubtaskResult {
  const result = discussionSubtaskResultSchema.safeParse(value);
  if (!result.success) return { draft: contextDraft(request), message: "" };
  const draft = result.data.draft;
  if (/[\r\n]|#taskdoor-task=/.test(draft.title) || !/[\p{L}]/u.test(draft.title) || acknowledgement.test(draft.title) || placeholderText.test(draft.title)
    || draft.goal && normalizedText(draft.title) === normalizedText(draft.goal)) return { draft: contextDraft(request), message: "" };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) ? new Date(`${draft.endDate}T00:00:00Z`) : null;
  const validDate = date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === draft.endDate && draft.endDate >= request.currentDate;
  const owner = request.members.find(member => member.id === draft.ownerId);
  // Reject an unsupported identity; naming someone is only evidence of identity,
  // while the Skill still decides whether this item actually assigns that work.
  const ownerIdentified = owner && request.messages.some(message => {
    const body = message.body;
    return owner.name.trim() && body.toLocaleLowerCase().includes(owner.name.trim().toLocaleLowerCase())
      || body.includes(`@${owner.id}`)
      || (message.author === owner.id || message.author === owner.name) && /我(?:来|会|将|负责|承担)|由我|交给我|\bI(?:['’]ll|\s+will|\s+am\s+(?:going\s+to|responsible\s+for))\b/i.test(body);
  });
  const { endDateSuggestion, ...fields } = draft;
  return { message: "", draft: { ...fields, goal: draft.goal && !placeholderText.test(draft.goal) ? draft.goal : existingGoal(request, draft.title), ownerId: ownerIdentified ? draft.ownerId : "", endDate: validDate ? draft.endDate : "", ...(validDate && endDateSuggestion ? { endDateSuggestion } : {}), ...(draft.completionCriteria ? { completionCriteria: [...new Set(draft.completionCriteria)] } : {}), labels: [...new Set(draft.labels)].filter(label => request.labels.includes(label)) } };
}

export async function generateDiscussionSubtaskDraft(request: DiscussionSubtaskRequest, signal: AbortSignal): Promise<DiscussionSubtaskResult> {
  const fallback = request.locale === "en" ? "Could not prepare a draft. Try again or enter the details yourself." : "暂时未能整理草稿，可重试或手动填写。";
  const parsed = discussionSubtaskRequestSchema.parse(request);
  const result = await requestSubtaskDraft(parsed, signal, fallback);
  return parseDiscussionSubtaskDraft(result, parsed);
}

async function requestSubtaskDraft(request: object, signal: AbortSignal, fallback: string): Promise<unknown> {
  signal.throwIfAborted();
  try {
    const response = await fetch("/api/subtask-draft", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-TaskDoor-Subtask-Draft": "1" },
      body: JSON.stringify(request), signal,
    });
    if (!response.ok) throw new Error(fallback);
    const result: unknown = await response.json();
    signal.throwIfAborted();
    return result;
  } catch {
    signal.throwIfAborted();
    throw new Error(fallback);
  }
}

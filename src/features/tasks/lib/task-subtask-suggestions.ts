import { z } from "zod";
import type { TaskActivityMock, TaskNode, WorkspaceNode } from "@/shared/model/task-model";
import { createTaskChangeActivity } from "@/features/tasks/lib/task-activity";
import { taskScheduleError } from "@/features/tasks/lib/task-schedule";
import { createWorkspaceTasksFromDraft } from "@/features/tasks/lib/workspace-task-creation";

export type SubtaskSuggestion = {
  id: string;
  title: string;
  goal: string;
  completionCriteria: string[];
  labels?: string[];
  ownerId: string;
  participantIds?: string[];
  endDate: string;
  source: { taskId: string; messageId: string; body: string; author: string; itemKey: string };
  contextKey: string;
  /** The whole discussion snapshot used when this suggestion was prepared; absent on legacy drafts. */
  discussionContextKey?: string;
};
export type SubtaskSuggestionReview = {
  selectedIds?: string[];
  dismissedIds: string[];
  edits: Record<string, SubtaskSuggestion>;
};

const identifier = z.string().refine(value => Boolean(value.trim()));
const suggestionSchema = z.strictObject({
  id: identifier,
  title: z.string(),
  goal: z.string(),
  completionCriteria: z.array(z.string()),
  labels: z.array(z.string()).optional(),
  ownerId: z.string(),
  participantIds: z.array(identifier).optional(),
  endDate: z.string(),
  source: z.strictObject({ taskId: identifier, messageId: identifier, body: identifier, author: identifier, itemKey: identifier }),
  contextKey: identifier,
  discussionContextKey: identifier.optional(),
});
const reviewSchema = z.strictObject({
  selectedIds: z.array(identifier).refine(values => new Set(values).size === values.length).optional(),
  dismissedIds: z.array(identifier).refine(values => new Set(values).size === values.length),
  edits: z.record(z.string(), suggestionSchema),
}).refine(value => Object.entries(value.edits).every(([id, suggestion]) => id === suggestion.id));

/** A source edit or deletion invalidates its previous suggestions even when the title was edited separately. */
export function getSubtaskSuggestionContextKey(message: TaskActivityMock): string {
  const record = message as TaskActivityMock & { updatedAt?: string; deletedAt?: string };
  return JSON.stringify([record.id, record.type, record.author, record.message, record.replyToActivityId ?? null, record.updatedAt ?? null, record.deletedAt ?? null]);
}

/**
 * Bind a prepared suggestion to its readable root and every reply in that discussion.
 * Sorting removes feed-order changes, while additions, edits, deletions and reparenting
 * still change the snapshot. Unrelated discussion roots do not enter this signature.
 */
export function getSubtaskSuggestionDiscussionContextKey(
  sourceMessageId: string, messages: readonly TaskActivityMock[],
): string | null {
  const byId = new Map<string, TaskActivityMock | null>();
  const replies = new Map<string, TaskActivityMock[]>();
  for (const message of messages) {
    byId.set(message.id, byId.has(message.id) ? null : message);
    if (message.replyToActivityId) {
      const siblings = replies.get(message.replyToActivityId) ?? [];
      siblings.push(message);
      replies.set(message.replyToActivityId, siblings);
    }
  }
  const visited = new Set<string>();
  let currentId = sourceMessageId;
  while (true) {
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    const current = byId.get(currentId) as (TaskActivityMock & { deletedAt?: string }) | null | undefined;
    if (!current || current.deletedAt || !["member-post", "member-reply"].includes(current.type)) return null;
    if (!current.replyToActivityId) break;
    currentId = current.replyToActivityId;
  }
  const rootId = currentId;
  const related: TaskActivityMock[] = [];
  const pending = [rootId];
  const collected = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (collected.has(id)) return null;
    collected.add(id);
    const current = byId.get(id);
    if (!current) return null;
    related.push(current);
    for (const reply of replies.get(id) ?? []) pending.push(reply.id);
  }
  return JSON.stringify(["discussion-v1", rootId, related.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(record => [
    getSubtaskSuggestionContextKey(record), record.createdAt ?? null, record.file ?? null,
  ])]);
}

/** A legacy unsigned snapshot is readable, but it cannot prove that the discussion is current. */
export function isSubtaskSuggestionContextCurrent(
  suggestion: SubtaskSuggestion, messages: readonly TaskActivityMock[],
): boolean {
  if (!suggestion.discussionContextKey) return false;
  const source = messages.find(message => message.id === suggestion.source.messageId);
  if (!source || source.message !== suggestion.source.body || source.author !== suggestion.source.author
    || getSubtaskSuggestionContextKey(source) !== suggestion.contextKey) return false;
  const discussionContextKey = getSubtaskSuggestionDiscussionContextKey(suggestion.source.messageId, messages);
  return discussionContextKey !== null && discussionContextKey === suggestion.discussionContextKey;
}

/** Share the same readable ancestry for pending suggestions and their saved task associations. */
function discussionRootResolver(messages: readonly TaskActivityMock[]) {
  const byId = new Map<string, (TaskActivityMock & { deletedAt?: string }) | null>();
  for (const message of messages) byId.set(message.id, byId.has(message.id) ? null : message);
  const rootFor = (sourceId: string): string => {
    const visited = new Set<string>();
    let currentId = sourceId;
    while (!visited.has(currentId)) {
      visited.add(currentId);
      const current = byId.get(currentId);
      if (!current || current.deletedAt || !["member-post", "member-reply"].includes(current.type)) return sourceId;
      if (!current.replyToActivityId) return currentId;
      currentId = current.replyToActivityId;
    }
    return sourceId;
  };
  return rootFor;
}

function groupDiscussionItems<T>(items: readonly T[], messages: readonly TaskActivityMock[], sourceFor: (item: T) => string): Map<string, T[]> {
  const rootFor = discussionRootResolver(messages);
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const rootId = rootFor(sourceFor(item));
    const group = groups.get(rootId);
    if (group) group.push(item);
    else groups.set(rootId, [item]);
  }
  return groups;
}

/** Presentation grouping never rebinds the source used to validate and deduplicate creation. */
export function groupSubtaskSuggestionsByDiscussionRoot(
  suggestions: readonly SubtaskSuggestion[], messages: readonly TaskActivityMock[],
): Map<string, SubtaskSuggestion[]> {
  return groupDiscussionItems(suggestions, messages, suggestion => suggestion.source.messageId);
}

export function groupTaskDiscussionLinksByRoot<T extends { messageId: string }>(links: readonly T[], messages: readonly TaskActivityMock[]): Map<string, T[]> {
  return groupDiscussionItems(links, messages, link => link.messageId);
}

export function getSubtaskSuggestionStorageKey(teamId: string, parentTaskId: string): string {
  if (!teamId.trim() || !parentTaskId.trim()) throw new Error("当前团队或任务无效，无法读取子任务建议。");
  return `taskdoor-subtask-suggestion-review:v1:${encodeURIComponent(teamId)}:${encodeURIComponent(parentTaskId)}`;
}

/** Invalid or unreadable storage is a recoverable error, never an empty review. */
export function readSubtaskSuggestionReview(
  storage: Pick<Storage, "getItem">, teamId: string, parentTaskId: string,
): SubtaskSuggestionReview {
  try {
    const raw = storage.getItem(getSubtaskSuggestionStorageKey(teamId, parentTaskId));
    if (raw === null) return { dismissedIds: [], edits: {} };
    const parsed = reviewSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || Object.values(parsed.data.edits).some(item => item.source.taskId !== parentTaskId)) {
      throw new Error("invalid suggestion review");
    }
    return parsed.data;
  } catch {
    throw new Error("无法读取子任务建议草稿，数据可能损坏或存储暂不可用。请重试，原草稿未被覆盖。");
  }
}

function sourceItemIdentity(source: { taskId: string; messageId: string; itemKey?: string }): string {
  return JSON.stringify([source.taskId, source.messageId, source.itemKey ?? null]);
}

function validateParentChain(tasks: TaskNode[], parentTaskId: string, teamId: string, maxDepth: number): TaskNode {
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 20) throw new Error("团队层级配额无效，请先核对，暂不能创建子任务。");
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error("任务标识重复，请重新加载后再确认。");
  const parent = byId.get(parentTaskId);
  if (!parent) throw new Error("父任务已不存在，未创建子任务。");
  const visited = new Set<string>();
  let current: TaskNode | undefined = parent;
  while (current) {
    if (visited.has(current.id)) throw new Error("任务父链存在循环，请先核对归属。");
    if (current.teamId && current.teamId !== teamId) throw new Error("任务归属团队已变化，请重新打开当前团队的任务。");
    visited.add(current.id);
    if (!current.parentTaskId) break;
    const ancestor: TaskNode | undefined = byId.get(current.parentTaskId);
    if (!ancestor) throw new Error("上级任务已不存在，请先核对任务归属。");
    current = ancestor;
  }
  if (visited.size >= maxDepth) throw new Error(`已达到团队 ${maxDepth} 层任务配额，不能继续新增子任务。`);
  return parent;
}

export type SuggestedSubtaskCreationOptions = {
  currentUserId: string;
  teamId: string;
  timeZone: string;
  author: string;
  sourceMessages: TaskActivityMock[];
  activeMemberIds: string[];
  /** Assignment candidates include invited people; only active members may create tasks. */
  selectableMemberIds?: string[];
  maxDepth?: number;
};

/** Prepare one atomic result. Reading suggestions, editing or dismissing them never calls this function. */
export function createWorkspaceSuggestedSubtasks(
  nodes: WorkspaceNode[], parentTaskId: string, suggestions: SubtaskSuggestion[], options: SuggestedSubtaskCreationOptions,
): { nodes: WorkspaceNode[]; createdTasks: TaskNode[]; activity: TaskActivityMock | null } {
  if (!options.teamId.trim() || !options.currentUserId.trim()) throw new Error("当前团队或成员无效，未创建子任务。");
  if (!Array.isArray(options.activeMemberIds) || !options.activeMemberIds.includes(options.currentUserId)) {
    throw new Error("当前成员已不在团队有效成员中，未创建子任务。");
  }
  const selectableMembers = new Set(options.selectableMemberIds ?? options.activeMemberIds);
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  validateParentChain(tasks, parentTaskId, options.teamId, options.maxDepth ?? 10);
  const timeZoneError = taskScheduleError("", undefined, undefined, options.timeZone);
  if (timeZoneError) throw new Error(timeZoneError);
  const messages = new Map(options.sourceMessages.map(message => [message.id, message]));
  if (messages.size !== options.sourceMessages.length) throw new Error("来源讨论标识重复，请重新加载后再确认。");
  const ids = new Set<string>();
  const sourceItems = new Set<string>();
  const existingSources = new Set(tasks.filter(task => task.sourceDiscussion).map(task => sourceItemIdentity(task.sourceDiscussion!)));
  const prepared = suggestions.map(suggestion => {
    const parsed = suggestionSchema.safeParse(suggestion);
    if (!parsed.success) throw new Error("子任务建议内容无效，原输入已保留，请重新核对。");
    const item = parsed.data;
    if (!item.title.trim()) throw new Error("请填写子任务名称。");
    const ownerId = item.ownerId.trim();
    const participantIds = (item.participantIds ?? []).map(id => id.trim());
    if (ownerId && !selectableMembers.has(ownerId)) throw new Error("所选负责人已不在当前团队，请重新选择。");
    if (participantIds.some(id => !selectableMembers.has(id))) throw new Error("所选参与者已不在当前团队，请重新选择。");
    if (new Set(participantIds).size !== participantIds.length) throw new Error("参与者重复，请核对后再创建。");
    if (participantIds.includes(ownerId)) throw new Error("负责人不能同时列为参与者，请核对后再创建。");
    if (ids.has(item.id)) throw new Error("本批子任务建议标识重复，未创建任何任务。");
    ids.add(item.id);
    if (item.source.taskId !== parentTaskId) throw new Error("子任务建议来源不属于当前父任务，请重新核对。");
    if (!isSubtaskSuggestionContextCurrent(item, options.sourceMessages)) {
      throw new Error("相关讨论已变更、删除或尚未重新整理，未创建子任务。请核对最新讨论。");
    }
    const sourceKey = sourceItemIdentity(item.source);
    if (sourceItems.has(sourceKey) || existingSources.has(sourceKey)) throw new Error("同一来源事项重复或已有任务承接，请核对后再确认。");
    // Legacy records without an item key only prove coverage for that exact saved source and task title.
    if (tasks.some(task => task.sourceDiscussion && !task.sourceDiscussion.itemKey
      && task.sourceDiscussion.taskId === item.source.taskId && task.sourceDiscussion.messageId === item.source.messageId
      && task.name.trim() === item.title.trim())) throw new Error("已有任务承接这条来源事项，请打开原任务继续处理。");
    sourceItems.add(sourceKey);
    const endDate = item.endDate.trim();
    const scheduleError = taskScheduleError(endDate, new Date().toISOString(), "", options.timeZone);
    if (scheduleError) throw new Error(`「${item.title.trim()}」${scheduleError}`);
    return { ...item, title: item.title.trim(), goal: item.goal.trim(), completionCriteria: item.completionCriteria.map(text => text.trim()).filter(Boolean), ownerId, participantIds, endDate };
  });

  let nextNodes = nodes;
  const createdTasks: TaskNode[] = [];
  for (const item of prepared) {
    const result = createWorkspaceTasksFromDraft(nextNodes, {
      mainTask: { title: item.title, goal: item.goal, completionCriteria: item.completionCriteria, executionTips: [], ownerId: item.ownerId, participantIds: item.participantIds, labels: item.labels ?? [], startDate: "", endDate: item.endDate },
      subtasks: [],
    }, { parentTaskId, currentUserId: options.currentUserId, teamId: options.teamId, timeZone: options.timeZone });
    const task: TaskNode = { ...result.createdNodes[0], createdFrom: "task-editor", sourceDiscussion: { ...item.source } };
    createdTasks.push(task);
    nextNodes = result.nodes.map(node => node.id === task.id ? task : node);
  }
  if (!createdTasks.length) return { nodes, createdTasks, activity: null };
  const changedAt = new Date().toISOString();
  nextNodes = nextNodes.map(node => node.id === parentTaskId ? { ...node, updatedAt: changedAt } : node);
  const activity = createTaskChangeActivity({
    author: options.author, type: "task-definition-change", message: "确认创建子任务",
    changes: [{ label: "子任务", before: null, after: createdTasks.map(task => task.name).join("、") }],
  });
  return { nodes: nextNodes, createdTasks, activity };
}

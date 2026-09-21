import type { AiConnectionRequest } from "../components/AiConnectionDialog";
import type { TaskActivityMock, TaskDetailMock } from "../data/taskDetailMocks";
import type { CollaborationMessage } from "./taskCollaboration";
import { getTaskDiscussionThreads, isDiscussionActivity } from "./taskActivity";

export type DiscussionAiTarget =
  | { kind: "discussion" | "reply"; activityId: string }
  | { kind: "reply-draft"; activityId: string; draft: string };

type DiscussionAiInput = {
  taskId: string;
  task: Omit<TaskDetailMock, "activities"> & { activities: CollaborationMessage[] };
  tags?: string[];
  target: DiscussionAiTarget;
  currentUser: string;
};

function recordMeta(activity: TaskActivityMock): string {
  const timestamp = Number.isFinite(Date.parse(activity.createdAt ?? ""))
    ? activity.createdAt
    : `原时间：${activity.time}（未保存精确时间）`;
  return `${activity.author} · ${timestamp} · 记录 ${activity.id}${activity.replyToActivityId ? ` · 回复 ${activity.replyToActivityId}` : ""}`;
}

/** Uses only the visible task snapshot supplied by the page; this is not a production ACL check. */
export function buildDiscussionAiRequest({ taskId, task, target, tags }: DiscussionAiInput): AiConnectionRequest | null {
  const activity = task.activities.find(item => item.id === target.activityId);
  if (!activity || activity.deletedAt || !isDiscussionActivity(activity)) return null;

  const context: AiConnectionRequest["context"] = [
    { label: "当前任务", value: `${task.title}（${taskId}）` },
    { label: "任务目标", value: task.goal },
    { label: "当前任务状态", value: task.status },
    { label: "负责人", value: task.owner || "未设置" },
    { label: "参与人", value: task.participants.join("\n") || "未添加参与人" },
    { label: "截止时间", value: task.due || "未设置" },
  ];
  if (tags?.length) context.push({ label: "标签", value: tags.join("、") });
  const criteria = task.completionCriteria?.filter(value => value.trim());
  if (criteria?.length) context.push({ label: "完成标准", value: criteria.join("\n") });
  const taskPreview = context.slice(1).filter(item => item.value.trim()).map((item, index) => ({
    id: `task-field-${index}`, label: item.label === "当前任务状态" ? "状态" : item.label, value: item.value,
  }));

  const byId = new Map(task.activities.map(item => [item.id, item]));
  const seen = new Set([activity.id]);
  const ancestors: CollaborationMessage[] = [];
  let parentId = activity.replyToActivityId;
  while (parentId) {
    if (seen.has(parentId)) {
      context.push({ label: "来源缺口", value: "回复关系存在循环异常，请核对原始记录。" });
      break;
    }
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) {
      context.push({ label: "来源缺口", value: `原记录暂不可用（${parentId}），不推断缺失原文。` });
      break;
    }
    if (parent.deletedAt) context.push({ label: "来源缺口", value: `原记录已删除（${parent.id}），不带入已删除原文或引用摘录。` });
    else ancestors.unshift(parent);
    if (!isDiscussionActivity(parent)) break;
    parentId = parent.replyToActivityId;
  }
  // Resolve with tombstones intact so a deleted parent does not split surviving replies.
  const thread = getTaskDiscussionThreads(task.activities).find(item => item.activity.id === activity.id || item.replies.some(reply => reply.id === activity.id));
  const threadRecords = (thread ? [thread.activity, ...thread.replies] : [activity]) as CollaborationMessage[];
  const records = threadRecords.filter(record => !record.deletedAt);
  const historicalParents = ancestors.filter(parent => !isDiscussionActivity(parent));
  historicalParents.forEach(parent => context.push({ label: "引用的历史记录（不代表已确认事实）", value: `${recordMeta(parent)}\n${parent.message}` }));
  records.filter(record => record.id !== activity.id).forEach(record => context.push({
    label: record.id === thread?.activity.id ? "当前动态" : "同一讨论的回复",
    value: `${recordMeta(record)}\n${record.message}`,
  }));

  const sourceNames = new Set<string>();
  for (const record of [...historicalParents, ...records]) {
    for (const ref of record.attachmentRefs ?? []) {
      const file = task.files.find(item => item.kind === "file" && !item.archived && item.id === ref.fileId);
      context.push({ label: "讨论附件", value: `${ref.name} · 文件 ${ref.fileId} · 引用版本 v${ref.version} · 来源记录 ${record.id}。${file ? `任务传入快照：${file.name}${file.version !== undefined ? ` · v${file.version}` : ""} · 记录的更新时间：${file.updatedAt}。` : "当前任务快照未找到可用文件。"}仅带入附件引用信息，不包含完整文件内容。` });
    }
    if (record.file && !record.attachmentRefs?.some(ref => ref.name === record.file)) sourceNames.add(record.file);
    const quote = record.message.match(/\n\n引用「([^」]+)」：/);
    if (quote) sourceNames.add(quote[1]);
  }
  for (const name of sourceNames) {
    const files = task.files.filter(file => file.kind === "file" && !file.archived && file.name === name);
    if (files.length !== 1) {
      context.push({ label: "引用文件", value: `${name} · ${files.length ? "任务传入快照存在重名，无法唯一定位文件" : "任务传入快照未找到唯一可用文件"}；当前文件状态与版本未核验，仅保留讨论中的引用信息。` });
      continue;
    }
    const file = files[0];
    context.push({ label: "引用文件", value: `讨论引用：${name}。任务传入快照：${file.id}${file.version !== undefined ? ` · v${file.version}` : ""} · 记录的更新时间：${file.updatedAt}。当前文件状态与版本未核验；引用时版本未保存，无法确认引用原文对应此快照。仅带入引用信息与讨论中的已引用原文，不包含完整文件。` });
  }
  if (target.kind === "reply-draft" && target.draft.trim()) {
    context.push({ label: "未发送的回复草稿", value: target.draft });
  }

  const isDiscussion = target.kind === "discussion";
  const isDraft = target.kind === "reply-draft";
  return {
    title: "连接 AI",
    description: "带入当前任务、这条动态及相关回复，先核对本次带入的信息。",
    contextPreview: {
      items: [
        { id: "task", label: "任务名称", value: task.title || "未命名任务" },
        ...taskPreview,
        ...[...historicalParents, ...records].map(record => ({
          id: `record-${record.id}`,
          label: isDiscussionActivity(record) ? record.id === thread?.activity.id && !record.replyToActivityId ? "当前动态" : "回复" : "引用的历史记录",
          meta: recordMeta(record),
          value: record.message,
        })),
        ...context.filter(item => item.label === "未发送的回复草稿" || item.label === "来源缺口" || item.label === "讨论附件" || item.label === "引用文件").map((item, index) => ({ ...item, id: `additional-${index}` })),
      ],
    },
    workObject: {
      kind: isDraft ? "回复草稿" : isDiscussion ? "讨论" : "回复",
      title: isDraft ? `回复 ${activity.author}` : `${activity.author}的${isDiscussion ? "讨论" : "回复"}`,
      meta: `${isDraft ? "被回复原文 · " : ""}${recordMeta(activity)}`,
      content: activity.message,
    },
    context: context.filter(item => item.value.trim()),
  };
}

import type { AiConnectionRequest } from "../components/AiConnectionDialog";
import type { TaskActivityMock, TaskDetailMock } from "../data/taskDetailMocks";
import { getTaskDiscussionThreads, isDiscussionActivity } from "./taskActivity";

export type DiscussionAiTarget =
  | { kind: "discussion" | "reply"; activityId: string }
  | { kind: "reply-draft"; activityId: string; draft: string };

type DiscussionAiInput = {
  taskId: string;
  task: TaskDetailMock;
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
export function buildDiscussionAiRequest({ taskId, task, target }: DiscussionAiInput): AiConnectionRequest | null {
  const activity = task.activities.find(item => item.id === target.activityId);
  if (!activity || !isDiscussionActivity(activity)) return null;

  const context: AiConnectionRequest["context"] = [
    { label: "当前任务", value: `${task.title}（${taskId}）` },
    { label: "任务目标", value: task.goal },
    { label: "当前任务状态", value: task.status },
  ];
  const criteria = task.completionCriteria?.filter(value => value.trim());
  if (criteria?.length) context.push({ label: "完成标准", value: criteria.join("\n") });

  const byId = new Map(task.activities.map(item => [item.id, item]));
  const seen = new Set([activity.id]);
  const ancestors: TaskActivityMock[] = [];
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
    ancestors.unshift(parent);
    if (!isDiscussionActivity(parent)) break;
    parentId = parent.replyToActivityId;
  }
  ancestors.forEach(parent => context.push({
    label: isDiscussionActivity(parent) ? "引用的原讨论／回复" : "引用的历史记录（不代表已确认事实）",
    value: `${recordMeta(parent)}\n${parent.message}`,
  }));

  const threadReplies = target.kind === "discussion"
    ? getTaskDiscussionThreads(task.activities).find(thread => thread.activity.id === activity.id)?.replies ?? []
    : [];
  threadReplies.forEach(reply => context.push({ label: "同一讨论的回复", value: `${recordMeta(reply)}\n${reply.message}` }));

  const sourceNames = new Set<string>();
  for (const record of [activity, ...ancestors, ...threadReplies]) {
    if (record.file) sourceNames.add(record.file);
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
  const taskFieldNames = [
    "Task ID",
    "名称",
    task.goal.trim() ? "目标" : "",
    task.status.trim() ? "状态" : "",
    criteria?.length ? "完成标准" : "",
  ].filter(Boolean);
  const hasSourceGap = context.some(item => item.label === "来源缺口");
  const discussionTitle = isDraft
    ? `回复${activity.author}的${activity.type === "member-reply" ? "回复" : "讨论"}`
    : isDiscussion ? `${activity.author}发起的讨论` : `${activity.author}的回复`;
  const discussionScope = isDraft
    ? target.draft.trim() ? "包含被回复原文与未发送草稿" : "包含被回复原文"
    : isDiscussion
      ? threadReplies.length ? `包含当前讨论及 ${threadReplies.length} 条回复` : "包含当前讨论，无上下回复"
      : ancestors.length ? `包含当前回复及 ${ancestors.length} 条上文` : "包含当前回复，无可用上文";
  return {
    title: "连接 AI",
    description: "带着这条讨论或回复继续分析，先核对本次带入的信息。",
    contextPreview: {
      description: "连接后，AI 将基于以下信息继续处理。",
      items: [
        { id: "task", label: "当前任务", title: task.title, detail: taskFieldNames.join("、") },
        { id: "discussion", label: "当前讨论", title: discussionTitle, detail: `基于当前任务 · ${discussionScope}${hasSourceGap ? "；部分上文不可用" : ""}` },
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

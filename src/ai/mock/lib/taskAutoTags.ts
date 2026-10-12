import type { TaskNode, WorkspaceNode } from "@/shared/model/task-model";

// Deterministic demo analysis. No remote AI request or personal catalog mutation.
const topics: Array<[string, RegExp]> = [
  ["会议", /会议|纪要|议程|例会|决策会|meeting/i],
  ["内容", /脚本|文案|素材|视频|主视觉|内容|content|video/i],
  ["营销", /投流|投放|预算|增长|ROI|marketing/i],
  ["数据", /数据|看板|归因|统计|口径|data/i],
  ["合作", /达人|合同|合作|报价|邀请|partner/i],
  ["履约", /库存|发货|履约|备货|物流|shipment/i],
  ["合规", /合规|审核|宣称|授权|风险|compliance/i],
  ["开发", /开发|代码|接口|测试|修复|bug|API/i],
];

export function applyAutomaticTaskTags(task: TaskNode): TaskNode {
  const signature = JSON.stringify([task.name, task.goal, task.completionCriteria]);
  if (task.automaticTags?.signature === signature) return task;
  const text = [task.name, task.goal, ...(task.completionCriteria ?? [])].join(" ");
  const previous = task.automaticTags;
  const removed = previous?.removed ?? [];
  const generated = topics.filter(([, pattern]) => pattern.test(text)).map(([name]) => name).slice(0, 3).filter(name => !removed.includes(name));
  const manual = (task.labels ?? []).filter(name => !previous?.generated.includes(name));
  return { ...task, labels: [...new Set([...manual, ...generated])], automaticTags: { signature, generated, removed } };
}

export function applyAutomaticWorkspaceTags(nodes: WorkspaceNode[]): WorkspaceNode[] {
  const next = nodes.map(node => node.kind === "task" ? applyAutomaticTaskTags(node) : node);
  return next.some((node, index) => node !== nodes[index]) ? next : nodes;
}

export function manualTaskTags(task: TaskNode, labels: string[]): Pick<TaskNode, "labels" | "automaticTags"> {
  const previous = task.automaticTags;
  const removed = [...new Set([...(previous?.removed ?? []), ...(task.labels ?? []).filter(name => !labels.includes(name))])].filter(name => !labels.includes(name));
  return { labels: [...new Set(labels)], automaticTags: { signature: previous?.signature ?? "", generated: (previous?.generated ?? []).filter(name => labels.includes(name)), removed } };
}

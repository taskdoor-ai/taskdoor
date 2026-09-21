import type { TaskActivityMock } from "../data/taskDetailMocks";
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";
import { createTaskChangeActivity } from "./taskActivity";

export function validateTaskCriteria(values: string[]): string[] {
  if (!values.length) throw new Error("请至少填写一条完成标准。");
  return values.map((value, index) => {
    const trimmed = value.trim();
    if (!trimmed) throw new Error(`第 ${index + 1} 条完成标准不能为空，请补全或删除这一条。`);
    return trimmed;
  });
}

/** Only a current direct child may be edited; expected criteria guard against stale input. */
export function applySavedTaskCriteria(
  nodes: WorkspaceNode[], parentTaskId: string, taskId: string,
  expected: string[], values: string[], author: string,
): { nodes: WorkspaceNode[]; activity: TaskActivityMock | null; original: TaskNode } {
  const parent = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === parentTaskId);
  const original = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === taskId);
  if (!parent || !original) throw new Error("当前任务已不存在，请返回任务列表。");
  if (original.parentTaskId !== parent.id || original.id === parent.id) throw new Error("只能编辑当前任务的直属子任务，任务关系可能已有变化。");
  return updateCriteria(nodes, original, expected, values, author);
}

/** The heading edits only the selected task; child edits retain their separate relationship guard. */
export function applyCurrentTaskCriteria(
  nodes: WorkspaceNode[], currentTaskId: string,
  expected: string[], values: string[], author: string,
): { nodes: WorkspaceNode[]; activity: TaskActivityMock | null; original: TaskNode } {
  const original = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === currentTaskId);
  if (!original) throw new Error("当前任务已不存在，请返回任务列表。");
  return updateCriteria(nodes, original, expected, values, author);
}

function updateCriteria(
  nodes: WorkspaceNode[], original: TaskNode, expected: string[], values: string[], author: string,
): { nodes: WorkspaceNode[]; activity: TaskActivityMock | null; original: TaskNode } {
  const before = original.completionCriteria ?? [];
  if (JSON.stringify(before) !== JSON.stringify(expected)) throw new Error("完成标准已被其他操作更新，请核对最新内容后再保存。");
  const next = validateTaskCriteria(values);
  if (JSON.stringify(before) === JSON.stringify(next)) return { nodes, activity: null, original };
  // Newlines can be content inside one criterion. Preserve item boundaries when
  // joining would otherwise hide a real split/merge from the activity recorder.
  const sameJoinedText = before.join("\n") === next.join("\n");
  const activity = createTaskChangeActivity({
    author, type: "task-definition-change", message: "修改完成标准",
    changes: [{ label: "完成标准", before: sameJoinedText ? JSON.stringify(before) : before.join("\n") || null, after: sameJoinedText ? JSON.stringify(next) : next.join("\n") }],
  });
  return {
    nodes: nodes.map(node => node.id === original.id ? { ...original, completionCriteria: next, ...(original.criterionReviews ? { criterionReviews: next.map((text, index) => original.completionCriteria?.[index] === text && original.criterionReviews?.[index]?.text === text ? original.criterionReviews[index] : { text }) } : {}), updatedAt: new Date().toISOString() } : node),
    activity, original,
  };
}

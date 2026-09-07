import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes.ts";

export type TaskOverviewProjection = {
  countLabel: "子任务" | "相关任务";
  currentTaskId: string | null;
  initialFocusedTaskId: string | null;
  role: TaskOverviewRole;
  tasks: TaskNode[];
};

export type TaskOverviewRole = "main" | "subtask" | "standalone";

/**
 * 从任务目录生成详情概览的数据投影。
 * 主任务查看直属子任务；子任务查看同一主任务下的协作关系；独立任务至少展示自身事实。
 */
export function getTaskOverviewProjection(nodes: WorkspaceNode[], selectedTaskId: string): TaskOverviewProjection {
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  if (!selectedTask) return { countLabel: "相关任务", currentTaskId: null, initialFocusedTaskId: null, role: "standalone", tasks: [] };

  const children = tasks.filter((task) => task.parentTaskId === selectedTask.id);
  if (children.length > 0) {
    return { countLabel: "子任务", currentTaskId: selectedTask.id, initialFocusedTaskId: null, role: "main", tasks: children };
  }

  if (selectedTask.parentTaskId) {
    const siblings = tasks.filter((task) => task.parentTaskId === selectedTask.parentTaskId);
    return {
      countLabel: "相关任务",
      currentTaskId: selectedTask.id,
      initialFocusedTaskId: selectedTask.id,
      role: "subtask",
      tasks: siblings.length > 0 ? siblings : [selectedTask],
    };
  }

  return { countLabel: "相关任务", currentTaskId: selectedTask.id, initialFocusedTaskId: selectedTask.id, role: "standalone", tasks: [selectedTask] };
}

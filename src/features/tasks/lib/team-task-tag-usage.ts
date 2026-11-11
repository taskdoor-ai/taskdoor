import { manualTaskTags } from "@/ai/task-auto-tags";
import type { RecycledTask } from "@/features/tasks/lib/task-recycle-bin";
import { teamTagNameKey } from "@/features/tasks/lib/team-task-tags";
import type { TaskNode, WorkspaceNode } from "@/shared/model/task-model";

const taskBelongsToTeam = (task: TaskNode, teamId: string) => (task.teamId ?? "creator-commerce") === teamId;

export function countTeamTaskTagUsage(nodes: WorkspaceNode[], recycleEntries: RecycledTask[], teamId: string, now = Date.now()) {
  const tasksByTag = new Map<string, Set<string>>();
  const countTask = (task: TaskNode) => {
    for (const name of task.labels ?? []) {
      const key = teamTagNameKey(name);
      const tasks = tasksByTag.get(key) ?? new Set<string>();
      tasks.add(task.id);
      tasksByTag.set(key, tasks);
    }
  };
  for (const node of nodes) if (node.kind === "task" && taskBelongsToTeam(node, teamId)) countTask(node);
  for (const entry of recycleEntries) {
    if (entry.teamId === teamId && entry.expiresAt > now) entry.tasks.forEach(countTask);
  }
  return new Map([...tasksByTag].map(([key, tasks]) => [key, tasks.size]));
}

export function changeTeamTaskTagUsage(
  nodes: WorkspaceNode[],
  recycleEntries: RecycledTask[],
  teamId: string,
  changes: ReadonlyMap<string, string | null>,
) {
  const changesByName = new Map([...changes].map(([name, replacement]) => [teamTagNameKey(name), replacement]));
  const updateTask = (task: TaskNode): TaskNode => {
    const current = task.labels ?? [];
    const labels = current.map(name => {
      const replacement = changesByName.get(teamTagNameKey(name));
      return replacement === undefined ? name : replacement;
    });
    if (labels.every((name, index) => name === current[index])) return task;
    return { ...task, ...manualTaskTags(task, labels.filter(name => name !== null)) };
  };
  const nextNodes = nodes.map(node => node.kind === "task" && taskBelongsToTeam(node, teamId) ? updateTask(node) : node);
  const nextEntries = recycleEntries.map(entry => {
    if (entry.teamId !== teamId) return entry;
    const tasks = entry.tasks.map(updateTask);
    return tasks.some((task, index) => task !== entry.tasks[index]) ? { ...entry, tasks } : entry;
  });
  return {
    nodes: nextNodes.some((node, index) => node !== nodes[index]) ? nextNodes : undefined,
    recycleEntries: nextEntries.some((entry, index) => entry !== recycleEntries[index]) ? nextEntries : undefined,
  };
}

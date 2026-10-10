import { ListTodo, type LucideIcon } from "lucide-react";
import type { TaskIconName, TaskIconTone } from "@/shared/model/task-model";
import { taskIconOptions } from "@/shared/model/appearance-options";
export { taskIconOptions, taskIconToneOptions } from "@/shared/model/appearance-options";

const taskIconMap = Object.fromEntries(taskIconOptions.map((option) => [option.value, option.icon])) as Record<TaskIconName, LucideIcon>;

export function TaskIcon({ iconName = "list-todo", size = "sm", tone = "neutral" }: { iconName?: TaskIconName; size?: "sm" | "lg"; tone?: TaskIconTone }) {
  const Icon = taskIconMap[iconName] ?? ListTodo;
  return <span aria-hidden="true" className={`task-icon ${size}`} data-tone={tone}><Icon /></span>;
}

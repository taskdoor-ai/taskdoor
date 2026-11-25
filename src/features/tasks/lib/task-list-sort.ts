import { taskBoardStatusOrder } from "@/features/tasks/lib/task-board";
import { normalizeTaskStatus, type TaskNode } from "@/shared/model/task-model";

/** Match the status navigation, including readable legacy states. */
export function taskListStatusRank(status: TaskNode["status"]): number {
  return taskBoardStatusOrder.indexOf(normalizeTaskStatus(status));
}

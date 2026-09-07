export type TaskBoardStatus = "待开始" | "进行中" | "待审核" | "已阻塞" | "已完成" | "已取消";

export const taskBoardStatusOrder: TaskBoardStatus[] = ["待开始", "进行中", "待审核", "已阻塞", "已完成", "已取消"];

export const taskBoardStatusTone: Record<TaskBoardStatus, string> = {
  已取消: "cancelled",
  已完成: "completed",
  已阻塞: "blocked",
  待审核: "review",
  待开始: "not-started",
  进行中: "in-progress",
};

export function groupTasksByBoardStatus<T extends { status: TaskBoardStatus }>(tasks: T[]) {
  return taskBoardStatusOrder
    .map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status === status),
      tone: taskBoardStatusTone[status],
    }))
    .filter((group) => group.tasks.length > 0);
}

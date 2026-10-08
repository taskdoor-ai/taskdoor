import type { AiConnectionRequest } from "../components/AiConnectionDialog";
import type { PersonalWorkbenchModel, PersonalWorkbenchTask } from "./personalWorkbench";

function taskListItem(task: PersonalWorkbenchTask, index: number): AiConnectionRequest["context"][number] {
  return {
    label: "任务",
    value: [
      `${index + 1}. ${task.title}`,
      `任务 ID：${task.taskId}`,
      `状态：${task.status?.trim() || "状态待核对"}`,
    ].join("\n"),
  };
}

/** Serializes only the current user's owned task-list projection. */
export function buildPersonalWorkbenchAiConnectionRequest(
  model: Pick<PersonalWorkbenchModel, "asOf" | "ownedTasks">,
): AiConnectionRequest {
  const tasks = model.ownedTasks.map(taskListItem);
  return {
    title: "连接 AI",
    description: "带入我的任务列表，在工具中提出具体要求；连接不会自动修改任务。",
    contextPreview: {
      items: model.ownedTasks.length ? model.ownedTasks.map((task, index) => ({
        id: task.taskId,
        label: `任务 ${index + 1}`,
        value: task.title,
        meta: task.status?.trim() || "状态待核对",
      })) : [{ id: "owned-tasks", label: "我的任务", value: "共 0 项负责的任务" }],
    },
    workObject: {
      kind: "任务列表",
      title: "我的任务列表",
      meta: `共 ${model.ownedTasks.length} 项负责的任务 · 数据快照 ${model.asOf || "时间待核对"}`,
    },
    context: [
      {
        label: "来源与范围",
        value: "仅带入当前用户在当前可见范围内负责的完整任务列表，每项只含 Task ID、名称和真实状态，不受左侧搜索、状态或标签筛选影响；不带入其他成员任务、排序建议、讨论、文件正文或任务详情。列表快照不代表生产权限核验，也不会扩大权限。",
      },
      ...tasks,
    ],
  };
}

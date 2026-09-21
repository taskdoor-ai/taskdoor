import type { AiConnectionRequest } from "../components/AiConnectionDialog";
import type { TaskRelationSummary } from "../components/TaskRelationsSection";
import type { TaskDetailMock } from "../data/taskDetailMocks";

export type TaskAiConnectionInput = {
  taskId: string;
  task: TaskDetailMock;
  currentUser: string;
  due?: string;
  tags?: string[];
  parentTask?: TaskRelationSummary;
};

const joinedValues = (values?: string[]) => values?.filter(value => value.trim()).join("\n") ?? "";
const providedValue = (value: string) => value.trim() ? value : "未设置（任务传入快照未提供）";

/** Serializes the current task's fixed field projection and, when supplied, one direct parent task. */
export function buildTaskAiConnectionRequest(input: TaskAiConnectionInput): AiConnectionRequest {
  const { taskId, task, currentUser, parentTask } = input;
  const context: AiConnectionRequest["context"] = [
    { label: "来源与范围", value: "仅带入当前任务的固定字段投影，以及调用方明确提供的当前任务直接归属的主任务；不读取讨论、文件、子任务、前置关系、AI 洞察、提交、变更流水或全工作区。快照不代表生产权限核验，也不保证来源仍为最新；连接本身不改变任务、责任或权限。" },
    { label: "当前任务状态", value: task.status },
    { label: "发起人", value: currentUser },
    { label: "正式负责人", value: providedValue(task.owner) },
    { label: "参与人", value: task.participants.length ? task.participants.join("\n") : "任务传入快照未列出参与人" },
    { label: "截止日期", value: providedValue(input.due ?? task.due) },
  ];
  if (joinedValues(task.completionCriteria)) context.push({ label: "完成标准", value: joinedValues(task.completionCriteria) });
  if (joinedValues(task.executionTips)) context.push({ label: "执行建议", value: joinedValues(task.executionTips) });
  if (input.tags?.length) context.push({ label: "标签", value: input.tags.join("、") });
  if (parentTask) context.push({
    label: "主任务",
    value: [
      `${parentTask.title}（${parentTask.id}）`,
      `目标：${providedValue(parentTask.goal)}`,
      `状态：${parentTask.status}`,
    ].join("\n"),
  });

  return {
    taskId,
    title: "连接 AI",
    description: "带入当前任务的信息，在工具中提出具体要求；连接不会自动修改任务。",
    contextPreview: {
      items: [
        { id: "task", label: "任务名称", value: task.title || "未命名任务" },
        { id: "goal", label: "任务目标", value: task.goal || "未填写" },
        ...context.filter(item => item.label !== "来源与范围" && item.label !== "主任务").map((item, index) => ({
          id: `task-field-${index}`,
          label: ({ 当前任务状态: "状态", 正式负责人: "负责人", 截止日期: "截止时间" } as Record<string, string>)[item.label] ?? item.label,
          value: item.value === "未设置（任务传入快照未提供）" ? "未提供" : item.value === "任务传入快照未列出参与人" ? "未添加参与人" : item.value,
        })),
        ...(parentTask ? [{ id: "parent-task", label: "主任务", value: `${parentTask.title}\n目标：${parentTask.goal || "未填写"}\n状态：${parentTask.status}` }] : []),
      ],
    },
    workObject: { kind: "任务", title: task.title, meta: `任务 ${taskId}`, content: task.goal },
    context: context.filter(item => item.value.trim()),
  };
}

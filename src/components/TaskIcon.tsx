import { BriefcaseBusiness, ChartNoAxesColumnIncreasing, ClipboardCheck, FileCheck2, Flag, ListTodo, Sparkles, Target, type LucideIcon } from "lucide-react";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";

export const taskIconOptions: Array<{ icon: LucideIcon; label: string; value: TaskIconName }> = [
  { icon: ListTodo, label: "任务清单", value: "list-todo" },
  { icon: ClipboardCheck, label: "核对确认", value: "clipboard-check" },
  { icon: Target, label: "目标推进", value: "target" },
  { icon: Flag, label: "阶段里程碑", value: "flag" },
  { icon: BriefcaseBusiness, label: "业务工作", value: "briefcase" },
  { icon: FileCheck2, label: "文件交付", value: "file-check" },
  { icon: ChartNoAxesColumnIncreasing, label: "数据分析", value: "chart" },
  { icon: Sparkles, label: "AI 协作", value: "sparkles" },
];

export const taskIconToneOptions: Array<{ label: string; value: TaskIconTone }> = [
  { label: "中性灰", value: "neutral" },
  { label: "清晰蓝", value: "blue" },
  { label: "信息青", value: "cyan" },
  { label: "完成绿", value: "green" },
  { label: "提醒黄", value: "amber" },
  { label: "风险红", value: "red" },
  { label: "协作紫", value: "purple" },
  { label: "关注粉", value: "pink" },
];

const taskIconMap = Object.fromEntries(taskIconOptions.map((option) => [option.value, option.icon])) as Record<TaskIconName, LucideIcon>;

export function TaskIcon({ iconName = "list-todo", size = "sm", tone = "neutral" }: { iconName?: TaskIconName; size?: "sm" | "lg"; tone?: TaskIconTone }) {
  const Icon = taskIconMap[iconName] ?? ListTodo;
  return <span aria-hidden="true" className={`task-icon ${size}`} data-tone={tone}><Icon /></span>;
}

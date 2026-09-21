import { creatorCommercePrompt } from "./creatorCommerceScenario";
import { nestedTaskCreationPrompt } from "../lib/nestedTaskCreationScenario";

export type TaskCreationScenarioId =
  | "single-task"
  | "complex-plan"
  | "nested-plan"
  | "clarify-requirement"
  | "similar-task"
  | "existing-parent"
  | "unassigned-owner";

export type TaskCreationScenarioDefinition = {
  id: TaskCreationScenarioId;
  label: string;
  prompt: string;
};

export const taskCreationScenarios: readonly TaskCreationScenarioDefinition[] = [
  { id: "single-task", label: "单任务 · 无子任务", prompt: "整理下周例会纪要" },
  { id: "complex-plan", label: "复杂项目 · 共 8 个任务", prompt: creatorCommercePrompt },
  { id: "nested-plan", label: "多层级项目 · 4 层任务", prompt: nestedTaskCreationPrompt },
  { id: "clarify-requirement", label: "需求不明确 · 引导创建", prompt: "帮我策划一个活动" },
  { id: "similar-task", label: "发现相似任务 · 创建前确认", prompt: "整理新品发布复盘" },
  { id: "existing-parent", label: "关联已有任务 · 创建子任务", prompt: "准备新品发布会的媒体邀请名单" },
  { id: "unassigned-owner", label: "未找到合适负责人 · 邀请成员", prompt: "完成办公室无线网络部署" },
];

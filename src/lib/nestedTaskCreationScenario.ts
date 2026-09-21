import type { ScenarioContext } from "./taskCreationScenario";
import type { TaskPlanDraft } from "./taskAssistantProtocol";
import { assignTaskByResponsibility } from "./responsibilityAssignment";
import type { TaskIconName, TaskIconTone, TaskNode, WorkspaceNode } from "../data/workspaceNodes";

const nestedTaskVisuals: Record<string, { iconName: TaskIconName; iconTone: TaskIconTone; parentTitle?: string }> = {
  "新品达人带货项目": { iconName: "target", iconTone: "blue" },
  "确认达人商务合作": { iconName: "briefcase", iconTone: "amber", parentTitle: "新品达人带货项目" },
  "完成内容制作": { iconName: "file-check", iconTone: "purple", parentTitle: "新品达人带货项目" },
  "完成脚本策划": { iconName: "list-todo", iconTone: "cyan", parentTitle: "完成内容制作" },
  "整理商品卖点": { iconName: "target", iconTone: "amber", parentTitle: "完成脚本策划" },
  "撰写直播脚本": { iconName: "file-check", iconTone: "cyan", parentTitle: "完成脚本策划" },
  "拍摄并交付视频素材": { iconName: "file-check", iconTone: "pink", parentTitle: "完成内容制作" },
  "完成上线与复盘": { iconName: "flag", iconTone: "green", parentTitle: "新品达人带货项目" },
  "完成上线执行": { iconName: "clipboard-check", iconTone: "green", parentTitle: "完成上线与复盘" },
  "交付效果复盘": { iconName: "chart", iconTone: "blue", parentTitle: "完成上线与复盘" },
};

export const nestedTaskCreationPrompt = "筹备新品达人带货项目，拆分为商务合作、内容制作和上线复盘；内容制作下再拆脚本策划与视频素材，脚本策划下继续拆商品卖点与直播脚本。";

export function createNestedTaskCreationDraft(context: ScenarioContext): TaskPlanDraft {
  const task = (title: string, goal: string, criterion: string, tip: string, parentSubtaskIndex?: number) => ({
    title, goal, completionCriteria: [criterion], executionTips: [tip],
    iconName: nestedTaskVisuals[title].iconName,
    iconTone: nestedTaskVisuals[title].iconTone,
    ownerId: assignTaskByResponsibility({ title, goal }, context.members).ownerId,
    participantIds: [], labels: [], startDate: "", endDate: "",
    ...(parentSubtaskIndex === undefined ? {} : { parentSubtaskIndex }),
  });
  return {
    mainTask: task("新品达人带货项目", "完成达人合作、内容制作与上线复盘，推动新品销售。", "合作与内容交付通过验收，完成上线执行并交付效果复盘。", "先对齐推广范围、销售统计口径与上线排期，再协调商务、内容和履约；上线前集中核对各项交付。"),
    subtasks: [
      task("确认达人商务合作", "确保合适的达人按约定参与新品推广。", "交付已确认的达人名单、合作条款与排期。", "按受众匹配度和历史履约情况筛选达人，逐项确认报价、佣金、素材授权与档期，并保留书面合作记录。"),
      task("完成内容制作", "提供能够准确传达新品价值的推广内容。", "脚本与视频素材通过审核，可用于上线。", "先确认卖点及宣称依据，再推进脚本和拍摄；统一版本与审核人，避免脚本、商品信息和成片表述不一致。"),
      task("完成脚本策划", "让主播准确传达卖点并完成直播转化引导。", "商品卖点与直播脚本通过审核。", "将已核实卖点整理成讲解顺序，明确演示、互动和转化节点；与主播试读后再定稿。", 1),
      task("整理商品卖点", "明确可验证的产品价值，为脚本提供依据。", "交付已核对的核心卖点与证明材料。", "逐条关联产品参数、使用场景与证明材料，区分可公开宣称和待核实信息，优先保留受众最关心的三项卖点。", 2),
      task("撰写直播脚本", "让直播流程、商品讲解和互动引导可执行。", "交付通过审核的直播流程、口播与互动脚本。", "按开场、演示、答疑和下单引导编排脚本，标注时长、优惠条件与禁用表述，并预留缺货和冷场的替代话术。", 2),
      task("拍摄并交付视频素材", "提供可直接发布的新品推广视频。", "交付通过审核、规格符合发布要求的视频素材。", "按确认脚本准备分镜和样品，拍摄前检查画幅、收音与光线；交付时同步字幕、封面和素材授权记录。", 1),
      task("完成上线与复盘", "确保活动顺利上线并沉淀可复用的经验。", "上线执行完成，数据可核对，复盘结论明确。", "上线前统一核对链接、价格、库存与排期，明确值守和异常联系人；按同一统计窗口收集数据用于复盘。"),
      task("完成上线执行", "按确认排期完成发布并及时处理现场问题。", "完成发布检查与上线值守，留存执行记录。", "发布前完成链接和优惠测试，按检查清单逐项放行；值守期间记录异常、处理人和恢复时间。", 6),
      task("交付效果复盘", "明确活动效果与下一轮需要改进的行动。", "交付核对后的销售数据、效果分析与后续行动。", "统一退款和归因口径后核对销售与投流数据，比较各达人和内容表现，将问题转化为有负责人和期限的行动项。", 6),
    ],
    dependencies: [
      { subtaskIndex: 4, dependsOnSubtaskIndexes: [3] },
      { subtaskIndex: 5, dependsOnSubtaskIndexes: [4] },
      { subtaskIndex: 7, dependsOnSubtaskIndexes: [0, 4, 5] },
      { subtaskIndex: 8, dependsOnSubtaskIndexes: [7] },
    ],
  };
}

/** Backfill only intact, previously created copies of this mock; preserve explicit appearance choices. */
export function migrateNestedTaskVisuals(nodes: WorkspaceNode[]): WorkspaceNode[] {
  const tasks = nodes.filter((node): node is TaskNode => node.kind === "task");
  const visualsById = new Map<string, typeof nestedTaskVisuals[string]>();
  for (const root of tasks.filter(node => node.createdFrom === "task-planner"
    && node.name === "新品达人带货项目"
    && node.goal === "完成达人合作、内容制作与上线复盘，推动新品销售。")) {
    const family = new Map<string, TaskNode>([[root.name, root]]);
    for (const [title, visual] of Object.entries(nestedTaskVisuals)) {
      if (!visual.parentTitle) continue;
      const parent = family.get(visual.parentTitle);
      const child = parent && tasks.find(node => node.createdFrom === "task-planner"
        && node.teamId === root.teamId && node.parentTaskId === parent.id && node.name === title);
      if (child) family.set(title, child);
    }
    if (family.size !== Object.keys(nestedTaskVisuals).length) continue;
    for (const [title, task] of family) visualsById.set(task.id, nestedTaskVisuals[title]);
  }
  let changed = false;
  const result = nodes.map(node => {
    const visual = visualsById.get(node.id);
    if (node.kind !== "task" || !visual || (node.iconName && node.iconTone)) return node;
    changed = true;
    return { ...node, iconName: node.iconName ?? visual.iconName, iconTone: node.iconTone ?? visual.iconTone };
  });
  return changed ? result : nodes;
}

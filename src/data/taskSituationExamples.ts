import type { TaskRelationSummary } from "../components/TaskRelationsSection";
import type { TaskSituationGroup } from "../lib/taskSituation";
import { createWorkspaceTaskDetail, taskDetailMocks, type TaskDetailId, type TaskDetailMock } from "./taskDetailMocks";
import { workspaceNodes, type TaskNode } from "./workspaceNodes";

export type TaskSituationExample = {
  asOf: string;
  summary: string;
  groups: TaskSituationGroup[];
  baseline: {
    task: TaskDetailMock;
    taskGoals: string[];
    childTasks: TaskRelationSummary[];
    dependencyTasks: TaskRelationSummary[];
    dependencyTaskIds: string[];
  };
};

type ExampleCopy = { summary: string; delivery: string; attention: string; next: string };

/** 固定演示判断；只说明可见记录和待核对项，不是实时 AI 或完成标准验收。 */
const copies: Record<string, ExampleCopy> = {
  "fragrance-creator-wrapup": {
    summary: "内容与合规仍需收口，直播彩排和最终决策受前置约束。",
    delivery: "",
    attention: "",
    next: "周岚先协调林洁、苏禾核对最终话术与合规结论，再收口追加投放决策。",
  },
  "fragrance-creator-business": {
    summary: "达人合作已标记完成，后续需要保留可核对的合作依据。",
    delivery: "陈默记录称名单、条款与档期已核对并交付；当前状态为已完成。",
    attention: "现有数据尚未逐项关联完成标准与合作确认依据，标准覆盖仍待核实。",
    next: "陈默核对合作确认记录；后续档期变化时同步相关执行安排。",
  },
  "fragrance-content": {
    summary: "脚本初稿与卖点已整理，最终话术仍待合规复核。",
    delivery: "林洁记录称已整理脚本初稿与卖点，功效表述仍待复核，终审尚未完成。",
    attention: "尚缺最终话术的合规确认依据，不能据初稿判断上线标准已满足。",
    next: "林洁与苏禾核对功效表述，锁定终审版本后回传给直播执行方。",
  },
  "fragrance-live": {
    summary: "彩排准备已有草案，当前等待内容终审。",
    delivery: "排期、场控清单与异常预案草案已有记录，完整彩排仍待推进。",
    attention: "清单草案不等于彩排已完成，尚需对应的彩排结果与问题处理记录。",
    next: "高远先与林洁核对最终话术版本，再安排依赖该版本的彩排环节。",
  },
  "fragrance-product": {
    summary: "价格、赠品与库存已标记完成，场次变化时仍需核对库存安排。",
    delivery: "梁川记录称价格、赠品、库存与履约已联合核对；当前状态为已完成。",
    attention: "现有数据没有逐项关联确认值与完成标准，尚不能独立核实全部覆盖。",
    next: "梁川保留商品机制确认依据；若直播场次变化，再核对安全水位。",
  },
  "fragrance-growth": {
    summary: "第二轮预算与人群包正在调整，方案边界仍需核对。",
    delivery: "许宁记录称已更新预算消耗、定向策略与第二轮人群包组合。",
    attention: "尚未提供预算上限与停止条件的具体确认值，不能确认方案边界已锁定。",
    next: "许宁补齐预算边界、止损条件的确认依据，再核对投放配置。",
  },
  "fragrance-data": {
    summary: "数据交付已标记完成，约定范围已验收，仍需保留两个缺失渠道的限制。",
    delivery: "韩序记录称已交付约定范围的看板与归因说明，并保留两个缺失渠道的限制。",
    attention: "现有数据未逐项关联标准与原始报表，数据覆盖及限制仍需核对。",
    next: "韩序保留原始报表与口径映射，周岚在最终决策前核对数据适用范围。",
  },
  "fragrance-compliance": {
    summary: "待审材料已经收集，正式合规审核等待内容终审稿。",
    delivery: "苏禾记录称已收集素材与合同，标记待核对表述；正式审核尚未开始。",
    attention: "已有待审材料不等于合规结论，最终话术与问题处理依据仍待核对。",
    next: "苏禾先取得内容终审稿，再核对话术、合同与问题处理结果。",
  },
  "fragrance-final-decision": {
    summary: "追加预算测算已提交讨论，最终决策仍待周岚核对。",
    delivery: "许宁已在讨论中提交预算、人群包与预期贡献测算；当前状态为待审核。",
    attention: "测算提交不代表决策已确认，尚需完整的预算边界与结果依据。",
    next: "周岚先取得合规结论，再核对预算上限、停止条件与执行边界。",
  },
  "weekly-retro-notes": {
    summary: "已有成员核对记录，尚不能确认纪要正文及行动项已完整。",
    delivery: "已有一条成员核对记录；记录没有说明纪要正文是否已形成。",
    attention: "决定、分歧与行动项尚未逐条关联讨论依据，完整性仍未知。",
    next: "周岚核对每条行动的负责人和时间，请复盘成员核对后共享纪要。",
  },
};

const nodes = structuredClone(workspaceNodes.filter((node): node is TaskNode => node.kind === "task"));

function toRelation(task: TaskNode): TaskRelationSummary {
  return {
    id: task.id, title: task.name, goal: task.goal ?? "", owner: task.ownerId,
    status: task.status, dueAt: task.dueAt ?? "未设置截止时间",
    completionCriteria: task.completionCriteria, dependsOnTaskIds: task.dependsOnTaskIds,
  };
}

function goalsFor(task: TaskNode): string[] {
  let root = task;
  const visited = new Set<string>();
  while (root.parentTaskId && !visited.has(root.id)) {
    visited.add(root.id);
    const parent = nodes.find((node) => node.id === root.parentTaskId);
    if (!parent) break;
    root = parent;
  }
  return [...new Set([task.goal ?? "", root.goal ?? ""])];
}

// 在模块载入时冻结源快照；后续字段编辑和消费者改动不能重写判断的依据。
const examples = new Map<string, TaskSituationExample>();
for (const [taskId, copy] of Object.entries(copies)) {
  const node = nodes.find((task) => task.id === taskId);
  if (!node) continue;
  const task = taskDetailMocks[taskId as TaskDetailId] ?? createWorkspaceTaskDetail(node);
  const dependencyTaskIds = [...(node.dependsOnTaskIds ?? [])];
  const groups: TaskSituationGroup[] = [
    { id: "delivery", label: "已交付与剩余", items: copy.delivery ? [{ text: copy.delivery, reference: { kind: "activity", id: `${taskId}-activity`, label: "查看讨论依据" } }] : [] },
    { id: "attention", label: "需要关注", items: copy.attention ? [{ text: copy.attention, reference: { kind: "criteria", label: "核对完成标准" } }] : [] },
    { id: "next", label: "下一步", items: [{ text: copy.next, reference: { kind: "criteria", label: "查看完成标准" } }] },
  ];
  examples.set(taskId, structuredClone({
    asOf: "2026-08-31",
    summary: copy.summary,
    groups,
    baseline: {
      task,
      taskGoals: goalsFor(node),
      childTasks: nodes.filter((child) => child.parentTaskId === taskId).map(toRelation),
      dependencyTasks: nodes.filter((dependency) => dependencyTaskIds.includes(dependency.id)).map(toRelation),
      dependencyTaskIds,
    },
  }));
}

export function getTaskSituationExample(taskId: string): TaskSituationExample | undefined {
  const example = examples.get(taskId);
  return example ? structuredClone(example) : undefined;
}

/** 只用于兼容既有“子任务继承根目标”的展示投影，不允许任意目标变化。 */
export function getTaskSituationBaselineGoals(taskId: string): string[] {
  const node = nodes.find((task) => task.id === taskId);
  return node ? goalsFor(node) : [];
}

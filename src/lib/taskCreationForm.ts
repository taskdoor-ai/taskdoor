import { taskCreationDay, taskScheduleError } from "./taskSchedule";
import { taskCreationScenarios, type TaskCreationScenarioId } from "../data/taskCreationScenarios";
import { advanceTaskCreationScenario, startTaskCreationScenario, type ExistingTaskCandidate, type ScenarioContext } from "./taskCreationScenario";
import type { TaskDraft, TaskPlanDraft } from "./taskAssistantProtocol";
import { effortEstimateSchema } from "./taskEffort";
import { reconcileCreationEffort } from "./taskCreationEffort";
import { defaultCreationParticipantIds } from "./taskCreationParticipants";
import { creationHierarchyError, getCreationDescendantIds } from "./taskCreationHierarchy";

export type CreationTask = Omit<TaskDraft, "parentSubtaskIndex"> & { clientId: string; parentClientId?: string; completionCriteria: string[]; executionTips: string[]; dependsOnClientIds: string[] };
export type CreationForm = {
  tagOperations?: TaskPlanDraft["tagOperations"];
  request: string;
  scenarioId?: TaskCreationScenarioId;
  mainTask: CreationTask;
  subtasks: CreationTask[];
  candidate?: ExistingTaskCandidate;
  candidateKind?: "similar" | "parent";
  candidateReason?: string;
  decision: "pending" | "independent" | "attach";
};

const blankTask = (title: string): TaskDraft => ({ title, goal: "", ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "" });
export const newCreationTask = ({ parentSubtaskIndex: _parent, ...task }: TaskDraft = blankTask("")): CreationTask => ({ ...task, clientId: crypto.randomUUID(), completionCriteria: task.completionCriteria ?? [""], executionTips: task.executionTips ?? [], dependsOnClientIds: [] });

/** Apply on first review, new tasks, or owner changes; preserve explicit participant edits. */
export function withCreationParticipantDefaults(form: CreationForm, creatorId: string, previous?: CreationForm): CreationForm {
  const previousTasks = new Map(previous ? [previous.mainTask, ...previous.subtasks].map(task => [task.clientId, task]) : []);
  const apply = (task: CreationTask): CreationTask => previousTasks.get(task.clientId)?.ownerId === task.ownerId
    ? task
    : { ...task, participantIds: defaultCreationParticipantIds(task, creatorId) };
  return { ...form, mainTask: apply(form.mainTask), subtasks: form.subtasks.map(apply) };
}

// These are explicit demo scenarios, not output from a live AI service.
const mainCriteria: Partial<Record<TaskCreationScenarioId, string[]>> = {
  "single-task": ["纪要包含会议议题、关键结论和待解决问题，并共享给参会成员。", "后续行动逐项写明负责人和约定时间，并与参会人核对。"],
  "unassigned-owner": ["无线网络覆盖全部办公区域，连接测试通过并记录网络配置。", "完成会议室视频会议联网测试，并交付网络使用与故障处理说明。"],
  "complex-plan": ["9 月 15 日按已确认排期上线，商品、达人内容与履约准备就绪。", "活动 GMV 达到 50 万，交付可核对的销售数据及复盘。"],
  "similar-task": ["交付专项复盘，包含发布结果、关键数据、问题和后续行动。"],
  "existing-parent": ["交付已核对的媒体邀请名单，含联系人、邀请状态与出席确认。"],
};
const complexCriteria = [
  "交付已确认合作的达人名单、报价、排期及合作协议。",
  "交付通过审核的卖点文案、直播脚本及可用素材。",
  "完成彩排和问题闭环，按确认排期上线并留存执行记录。",
  "确认最终价格及优惠配置，备货、发货与售后方案可执行。",
  "交付确认后的投流计划和执行记录，ROI 按约定口径核对。",
  "销售与投流数据可核对，复盘包含结论、问题及后续行动。",
  "交付素材与合同审核记录，需整改事项在上线前关闭。",
];
const mainExecutionTips: Partial<Record<TaskCreationScenarioId, string>> = {
  "single-task": "先从会议记录提取议题、决定与待办，再逐项核对行动负责人和时间；将有歧义的结论标出并请参会人确认。",
  "unassigned-owner": "先核对办公区域、终端数量和现有网络设备，再分区配置与测试；保留配置记录并验证会议室联网和故障恢复。",
  "complex-plan": "先确认 GMV 的统计周期和退款口径，再协调达人排期与备货；上线前统一核对素材、链接、优惠和履约准备。",
  "similar-task": "先核对已有复盘的范围与数据窗口，重点补充本次专项问题、原因和改进行动，避免重复记录同一结论。",
  "existing-parent": "从现有媒体名单开始去重，逐项核对联系人、邀请渠道和出席状态；未回复与已确认名单分开跟进。",
};
const complexExecutionTips = [
  "按受众匹配度和历史履约筛选达人，逐项确认报价、佣金、授权与排期，并保留书面合作记录。",
  "先核实卖点和宣称依据，再编排口播、演示与互动环节；脚本和直播素材使用同一审核版本。",
  "按真实流程完成彩排，记录并关闭问题；上线前复核链接、优惠、库存与值守安排。",
  "逐项核对价格、赠品和优惠叠加规则，确认可售库存及发货时效，并准备缺货和退换货方案。",
  "先统一 ROI 口径和预算上限，再配置人群与素材测试；设置检查频率和止损条件，保留调整依据。",
  "统一交易、退款和归因窗口后核对各渠道数据，复盘差异原因，并明确下一轮行动及负责人。",
  "逐项检查功效宣称、素材授权和合同义务，标出需修改的内容；整改后复核并归档确认版本。",
];

export function createCreationForm(request: string, context: ScenarioContext, scenarioId?: TaskCreationScenarioId): CreationForm {
  const matched = scenarioId ?? taskCreationScenarios.find(s => s.prompt === request.trim())?.id;
  const form: CreationForm = { request: request || taskCreationScenarios.find(s => s.id === matched)?.prompt || "", scenarioId: matched, mainTask: newCreationTask(blankTask(request.trim())), subtasks: [], decision: "independent" };
  if (!matched) return withCreationParticipantDefaults(form, context.currentUserId);
  const transition = startTaskCreationScenario(matched, context);
  if (transition.type === "question") {
    form.mainTask.title = "策划活动";
    return withCreationParticipantDefaults(form, context.currentUserId);
  }
  let plan: TaskPlanDraft | undefined;
  if (transition.type === "draft") plan = transition.draft;
  if (transition.type === "decision") {
    form.candidate = transition.candidate ?? undefined;
    form.candidateKind = transition.candidateKind;
    form.candidateReason = transition.reason;
    form.decision = form.candidate ? "pending" : "independent";
    const resolved = advanceTaskCreationScenario(transition.session, matched === "similar-task" ? "create-anyway" : "create-independent", context);
    if (resolved.type === "draft") plan = resolved.draft;
  }
  if (!plan) return withCreationParticipantDefaults(form, context.currentUserId);
  if (plan.tagOperations) form.tagOperations = plan.tagOperations;
  if (matched === "nested-plan") {
    form.mainTask = newCreationTask(plan.mainTask);
    form.subtasks = plan.subtasks.map(task => newCreationTask(task));
    plan.subtasks.forEach((task, index) => {
      if (task.parentSubtaskIndex !== undefined) form.subtasks[index].parentClientId = form.subtasks[task.parentSubtaskIndex].clientId;
    });
    for (const dependency of plan.dependencies ?? []) {
      form.subtasks[dependency.subtaskIndex].dependsOnClientIds = dependency.dependsOnSubtaskIndexes.map(index => form.subtasks[index].clientId);
    }
    return withCreationParticipantDefaults(form, context.currentUserId);
  }
  form.mainTask = newCreationTask({ ...plan.mainTask, completionCriteria: mainCriteria[matched] ?? [""], executionTips: [mainExecutionTips[matched] ?? "先确认交付范围，再核对关键结论和后续行动。"] });
  if (matched === "single-task") {
    form.mainTask.goal = "让参会成员对会议结论与后续行动形成一致理解。";
    form.mainTask.ownerId = "";
  }
  form.subtasks = plan.subtasks.map((task, index) => newCreationTask({ ...task, goal: form.mainTask.goal, completionCriteria: [complexCriteria[index] ?? ""], executionTips: [complexExecutionTips[index] ?? "先核对任务所需输入，按交付顺序推进，并在完成后记录核验结果。"] }));
  for (const dependency of plan.dependencies ?? []) {
    const task = form.subtasks[dependency.subtaskIndex];
    if (task) task.dependsOnClientIds = dependency.dependsOnSubtaskIndexes.map(index => form.subtasks[index]?.clientId).filter(Boolean);
  }
  return withCreationParticipantDefaults(form, context.currentUserId);
}

export function hasValidCreationDependencies(tasks: CreationTask[]): boolean {
  const graph = new Map(tasks.map(t => [t.clientId, t.dependsOnClientIds]));
  if (graph.size !== tasks.length) return false;
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id) || !graph.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    if (!graph.get(id)!.every(visit)) return false;
    visiting.delete(id); visited.add(id); return true;
  };
  return tasks.every(task => visit(task.clientId));
}

export function validateCreationTask(task: CreationTask, members: Array<{ id: string }>, label = "任务"): string | null {
  if (!task.title.trim()) return `请补充${label}名称。`;
  if (!task.completionCriteria.some(c => c.trim())) return `请补充${label}的完成标准。`;
  const emptyCriterion = task.completionCriteria.findIndex(criterion => !criterion.trim());
  if (emptyCriterion >= 0) return `${label}的第 ${emptyCriterion + 1} 条完成标准为空，请补全或删除。`;
  if (task.effortEstimate && !effortEstimateSchema.safeParse(task.effortEstimate).success) return `${label}的预计投入无效，请核对工时与估算依据。`;
  if (task.ownerId && !members.some(m => m.id === task.ownerId)) return `${label}的负责人已不在当前成员列表，请重新选择。`;
  if (task.participantIds.some(id => !members.some(member => member.id === id))) return `${label}的参与人已不在当前成员列表，请重新选择。`;
  for (const value of [task.startDate, task.endDate]) {
    if (!value) continue;
    const date = new Date(`${value}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return `${label}的日期无效。`;
  }
  const scheduleError = taskScheduleError(task.endDate, taskCreationDay(), task.startDate);
  return scheduleError ? `${label}：${scheduleError}` : null;
}

export function validateCreationForm(form: CreationForm, members: Array<{ id: string }>): string | null {
  const hierarchyError = creationHierarchyError(form);
  if (hierarchyError) return hierarchyError;
  if (form.decision === "pending") return "请先确认与已有任务的关系。";
  const goal = form.mainTask.goal;
  if (!goal?.trim()) return "请补充任务目标。";
  if (form.decision === "attach" && form.subtasks.length) return "关联已有主任务时仅创建当前子任务，请先调整拆分。";
  for (const [index, task] of [form.mainTask, ...form.subtasks].entries()) {
    const error = validateCreationTask(task, members, index === 0 ? "任务" : `子任务 ${index}`);
    if (error) return error;
  }
  if (!hasValidCreationDependencies(form.subtasks)) return "前置依赖存在循环或失效引用，请调整后再创建。";
  return null;
}

export function removeCreationSubtask(form: CreationForm, clientId: string): CreationForm {
  const removed = getCreationDescendantIds(form, clientId);
  removed.add(clientId);
  return reconcileCreationEffort(form, { ...form, subtasks: form.subtasks.filter(t => !removed.has(t.clientId)).map(t => ({ ...t, dependsOnClientIds: t.dependsOnClientIds.filter(id => !removed.has(id)) })) });
}

export function toTaskPlanDraft(form: CreationForm): TaskPlanDraft {
  const hierarchyError = creationHierarchyError(form);
  if (hierarchyError) throw new Error(hierarchyError);
  form = reconcileCreationEffort(form, form);
  const task = ({ clientId: _id, parentClientId, dependsOnClientIds: _deps, ...item }: CreationTask): TaskDraft => ({ ...item, ...(parentClientId ? { parentSubtaskIndex: form.subtasks.findIndex(parent => parent.clientId === parentClientId) } : {}), title: item.title.trim(), goal: item.goal.trim(), completionCriteria: item.completionCriteria.map(c => c.trim()).filter(Boolean), executionTips: item.executionTips.map(t => t.trim()).filter(Boolean) });
  return {
    ...(form.tagOperations ? { tagOperations: form.tagOperations } : {}),
    mainTask: task(form.mainTask), subtasks: form.subtasks.map(task),
    dependencies: form.subtasks.map((t, subtaskIndex) => ({ subtaskIndex, dependsOnSubtaskIndexes: t.dependsOnClientIds.map(id => form.subtasks.findIndex(s => s.clientId === id)) })).filter(d => d.dependsOnSubtaskIndexes.length),
  };
}

import { normalizePersonalTagNames } from "./personalTags.ts";
import { createNestedTaskCreationDraft } from "./nestedTaskCreationScenario";
import type { TaskCreationScenarioId } from "../data/taskCreationScenarios";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { createCreatorCommerceScenarioDraft } from "./mockTaskAssistant";
import { assignTaskByResponsibility } from "./responsibilityAssignment";
import type { TaskAssistantRequest, TaskPlanDraft } from "./taskAssistantProtocol";

export type ScenarioChoice = {
  id: string;
  title: string;
  description?: string;
  value: string;
};

export type ExistingTaskCandidate = {
  childTaskNames?: string[];
  dueAt?: string;
  endDate?: string;
  goal?: string;
  id: string;
  iconName?: TaskIconName;
  iconTone?: TaskIconTone;
  labels?: string[];
  name?: string;
  ownerId?: string;
  parentTaskId?: string;
  plannedEndOn?: string;
  plannedStartOn?: string;
  status?: string;
  title?: string;
  updatedAt?: string;
};

type ClarificationField = "goal" | "time" | "deliverable";

export type ScenarioSession = {
  scenarioId: TaskCreationScenarioId;
  answers: Partial<Record<ClarificationField, string>>;
  freeformAnswers: string[];
  status: "awaiting-input" | "completed";
  decisionCandidateId?: string;
  resolvedAnswer?: string;
};

export type ScenarioContext = {
  currentDate: string;
  currentUserId: string;
  existingTasks?: ExistingTaskCandidate[];
  members: Array<Pick<TaskAssistantRequest["members"][number], "id" | "name"> & Partial<Omit<TaskAssistantRequest["members"][number], "id" | "name">>>;
  tags: string[];
};

type TransitionBase = { message: string; session: ScenarioSession };

export type ScenarioTransition =
  | (TransitionBase & { type: "question"; field: ClarificationField; choices: ScenarioChoice[] })
  | (TransitionBase & { type: "decision"; choices: ScenarioChoice[]; candidate: ExistingTaskCandidate | null; candidateKind: "similar" | "parent"; reason: string })
  | (TransitionBase & { type: "draft"; draft: TaskPlanDraft })
  | (TransitionBase & { type: "open-existing"; task: ExistingTaskCandidate })
  | (TransitionBase & { type: "create-subtask"; draft: TaskPlanDraft; parentTask: ExistingTaskCandidate })
  | (TransitionBase & { type: "completed" });

const goalChoices: ScenarioChoice[] = [
  { id: "awareness", title: "提升新品曝光", description: "强化新品认知，扩大目标人群触达", value: "提升新品曝光" },
  { id: "leads", title: "获取销售线索", description: "收集高意向用户，推动后续转化", value: "获取销售线索" },
  { id: "retention", title: "促进用户复购", description: "面向老客设计召回与复购激励", value: "促进用户复购" },
];

const timeChoices: ScenarioChoice[] = [
  { id: "next-week", title: "下周内完成", description: "适合轻量活动快速落地", value: "下周内完成" },
  { id: "end-of-month", title: "本月底前上线", description: "为方案、物料和联调预留时间", value: "本月底前上线" },
  { id: "uncertain", title: "暂时不确定", description: "先生成草案，时间稍后补充", value: "暂时不确定" },
];

const deliverableChoices: ScenarioChoice[] = [
  { id: "plan-schedule", title: "活动方案和执行排期", description: "聚焦策略、分工与落地节奏", value: "活动方案和执行排期" },
  { id: "plan-materials-review", title: "方案、物料和复盘", description: "覆盖执行前后的完整活动闭环", value: "方案、物料和复盘" },
  { id: "custom", title: "我来补充具体要求", description: "使用下方输入框描述交付结果", value: "" },
];

const similarChoices: ScenarioChoice[] = [
  { id: "view-existing", title: "查看已有任务", description: "打开并继续推进现有任务", value: "view-existing" },
  { id: "create-anyway", title: "仍然创建", description: "保留现有任务，另建独立任务", value: "create-anyway" },
];

const parentChoices: ScenarioChoice[] = [
  { id: "create-subtask", title: "创建为子任务", description: "继承父任务的范围与上下文", value: "create-subtask" },
  { id: "create-independent", title: "仍然独立创建", description: "不关联现有父任务", value: "create-independent" },
];

const createSession = (scenarioId: TaskCreationScenarioId, decisionCandidateId?: string): ScenarioSession => ({
  answers: {},
  decisionCandidateId,
  freeformAnswers: [],
  scenarioId,
  status: "awaiting-input",
});

const completeSession = (session: ScenarioSession, resolvedAnswer?: string): ScenarioSession => ({
  ...session,
  resolvedAnswer: resolvedAnswer ?? session.resolvedAnswer,
  status: "completed",
});

const allowedLabels = (_context: ScenarioContext, labels: string[]) => normalizePersonalTagNames(labels);

const assignedOwner = (title: string, goal: string, context: ScenarioContext) =>
  assignTaskByResponsibility({ title, goal }, context.members).ownerId;

const draft = (title: string, goal: string, context: ScenarioContext, labels: string[], ownerId: string, startDate = "", endDate = ""): TaskPlanDraft => ({
  mainTask: { endDate, goal, labels: allowedLabels(context, labels), ownerId, participantIds: [], startDate, title },
  subtasks: [],
});

const endOfMonth = (date: string) => {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

const parseCandidateDueDate = (dueAt: string | undefined, currentDate: string) => {
  if (!dueAt) return "";
  const isoDate = dueAt.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;
  const chineseDate = dueAt.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!chineseDate) return "";
  const year = currentDate.slice(0, 4);
  return `${year}-${chineseDate[1].padStart(2, "0")}-${chineseDate[2].padStart(2, "0")}`;
};

const childDraft = (session: ScenarioSession, context: ScenarioContext, parent: ExistingTaskCandidate): TaskPlanDraft => {
  const baseDraft = scenarioDraft(session, context);
  const fallbackEndDate = parseCandidateDueDate(parent.dueAt ?? parent.endDate, context.currentDate);
  return {
    ...baseDraft,
    mainTask: {
      ...baseDraft.mainTask,
      endDate: (parent.plannedEndOn ?? fallbackEndDate) >= context.currentDate ? parent.plannedEndOn ?? fallbackEndDate : "",
      labels: normalizePersonalTagNames(parent.labels ?? []).filter(label => context.tags.includes(label)),
      startDate: parent.plannedStartOn ?? (fallbackEndDate ? context.currentDate : ""),
    },
  };
};

const scenarioDraft = (session: ScenarioSession, context: ScenarioContext): TaskPlanDraft => {
  switch (session.scenarioId) {
    case "nested-plan": return createNestedTaskCreationDraft(context);
    case "single-task": {
      const title = "整理下周例会纪要";
      const goal = "汇总会议议题、关键结论、责任人和后续行动，形成可直接共享的会议纪要。";
      return draft(title, goal, context, ["内容制作"], assignedOwner(title, goal, context));
    }
    case "unassigned-owner":
      return draft("完成办公室无线网络部署", "让办公室会议与日常办公保持稳定联网。", context, [], "");
    case "complex-plan": {
      const request: TaskAssistantRequest = {
        currentDate: context.currentDate,
        currentUserId: context.currentUserId,
        draft: null,
        existingTasks: (context.existingTasks ?? []).map(({ ownerId = "", status = "", name, title }) => ({ name: name ?? title ?? "", ownerId, status })),
        members: context.members.map((member) => ({
          availability: member.availability ?? "",
          currentWork: member.currentWork ?? [],
          dynamicResponsibility: member.dynamicResponsibility ?? "",
          id: member.id,
          name: member.name,
          recentActivity: member.recentActivity ?? "",
          role: member.role ?? "",
        })),
        messages: [{ content: "新品防晒衣抖音达人带货完整需求", role: "user" }],
        tags: context.tags,
        timezone: "Asia/Shanghai",
      };
      return createCreatorCommerceScenarioDraft(request);
    }
    case "similar-task": {
      const title = "整理新品发布复盘";
      const goal = "汇总新品发布结果、关键数据、问题和后续行动，形成可共享的专项复盘。";
      return draft(title, goal, context, ["数据复盘"], assignedOwner(title, goal, context), context.currentDate, context.currentDate);
    }
    case "existing-parent": {
      const title = "整理并确认媒体邀请名单";
      const goal = "完成目标媒体筛选、联系人核对、邀请状态跟进，并在发布会前确认最终出席名单。";
      return draft(title, goal, context, ["内容制作"], assignedOwner(title, goal, context));
    }
    case "clarify-requirement": {
      const awareness = session.answers.goal === "提升新品曝光";
      const title = awareness ? "完成新品曝光活动策划与执行" : "完成活动策划与执行";
      const goal = awareness && session.answers.time === "本月底前上线" && session.answers.deliverable === "方案、物料和复盘"
        ? "本月底前完成新品曝光活动方案、传播物料和效果复盘，形成可执行、可验收的完整活动闭环。"
        : [session.answers.time, session.answers.goal, session.answers.deliverable].filter(Boolean).join("，");
      const datesKnown = session.answers.time !== "暂时不确定";
      const startDate = datesKnown ? context.currentDate : "";
      const endDate = datesKnown && session.answers.time === "本月底前上线" ? endOfMonth(context.currentDate) : "";
      return draft(title, goal, context, ["内容制作"], assignedOwner(title, goal, context), startDate, endDate);
    }
  }
};

const question = (session: ScenarioSession, field: ClarificationField): Extract<ScenarioTransition, { type: "question" }> => {
  if (field === "goal") {
    return { type: "question", field, choices: goalChoices, message: "为了把它变成可执行的任务，我需要先确认活动的主要目标。你更希望这次活动解决什么问题？", session };
  }
  if (field === "time") {
    return { type: "question", field, choices: timeChoices, message: "活动计划在什么时间开展？", session };
  }
  return { type: "question", field, choices: deliverableChoices, message: "最后确认一下，你希望团队最终交付哪些结果？", session };
};

const similarTaskReason = "两项任务都需要汇总复盘结果、关键问题与后续行动，并形成可共享的内容。";
const parentTaskReason = "媒体邀请属于新品发布会的传播工作，且现有子任务尚未覆盖这一交付。";

export const startTaskCreationScenario = (id: TaskCreationScenarioId, context: ScenarioContext): ScenarioTransition => {
  const onlyCandidate = context.existingTasks?.length === 1 ? context.existingTasks[0] : undefined;
  const decisionCandidate = id === "similar-task"
    ? (context.existingTasks?.find(({ id, name, title }) => id === "weekly-retro-notes" || /团队复盘纪要/.test(name ?? title ?? "")) ?? onlyCandidate)?.id
    : id === "existing-parent"
      ? (context.existingTasks?.find(({ id, name, title }) => id === "product-launch-planning" || (name ?? title) === "新品发布会筹备") ?? onlyCandidate)?.id
      : undefined;
  const candidate = context.existingTasks?.find(({ id: candidateId }) => candidateId === decisionCandidate) ?? null;
  const session = createSession(id, decisionCandidate);
  if (id === "clarify-requirement") return question(session, "goal");
  if ((id === "similar-task" || id === "existing-parent") && !candidate) return {
    type: "draft",
    draft: scenarioDraft(session, context),
    message: "任务数据已变化，未找到可关联的真实任务，将按独立任务准备草案。",
    session: completeSession(session),
  };
  if (id === "similar-task") return {
    type: "decision",
    candidate,
    candidateKind: "similar",
    choices: similarChoices,
    message: "我在团队任务中找到一项高度相似的任务。你可以先查看已有任务，或继续创建新的独立任务。",
    reason: similarTaskReason,
    session,
  };
  if (id === "existing-parent") return {
    type: "decision",
    candidate,
    candidateKind: "parent",
    choices: parentChoices,
    message: "这项需求属于一个正在推进的已有任务范围。建议先确认是否作为它的子任务继续。",
    reason: parentTaskReason,
    session,
  };
  return { type: "draft", draft: scenarioDraft(session, context), message: "已生成任务草案。", session: completeSession(session) };
};

const choiceValue = (choices: ScenarioChoice[], answer: string) => choices.find(({ id }) => id === answer)?.value;

const nextUnresolvedField = (session: ScenarioSession): ClarificationField | null =>
  (["goal", "time", "deliverable"] as const).find((field) => !session.answers[field]) ?? null;

const advanceClarification = (session: ScenarioSession, answer: string, context: ScenarioContext): ScenarioTransition => {
  const field = nextUnresolvedField(session);
  if (!field) return { type: "draft", draft: scenarioDraft(session, context), message: "信息已齐全，已生成任务草案。", session: completeSession(session) };

  const trimmed = answer.trim();
  if (field === "deliverable" && trimmed === "custom") {
    const transition = question(session, field);
    return { ...transition, choices: [], message: "请在输入框补充你需要的具体交付结果。" };
  }
  const choices = field === "goal" ? goalChoices : field === "time" ? timeChoices : deliverableChoices;
  const selected = choiceValue(choices, trimmed);
  const isFreeform = selected === undefined;
  const freeformAnswers = isFreeform && trimmed ? [...session.freeformAnswers, trimmed] : session.freeformAnswers;
  const recognizedFreeform = field === "time"
    ? /(?:小时后|天后|周|月|日|年|季度|假期|今天|明天|后天|月底|月末|不确定|暂定)/.test(trimmed)
    : trimmed.length > 0;
  const resolved = selected || (recognizedFreeform ? trimmed : "");
  const nextSession: ScenarioSession = {
    ...session,
    answers: resolved ? { ...session.answers, [field]: resolved } : session.answers,
    freeformAnswers,
  };
  const nextField = nextUnresolvedField(nextSession);
  return nextField
    ? question(nextSession, nextField)
    : { type: "draft", draft: scenarioDraft(nextSession, context), message: "信息已齐全，已生成任务草案。", session: completeSession(nextSession) };
};

export const advanceTaskCreationScenario = (
  session: ScenarioSession,
  answer: string,
  context: ScenarioContext,
): ScenarioTransition => {
  if (session.status === "completed") {
    return { type: "completed", message: "该场景动作已完成，无需重复处理。", session };
  }
  if (session.scenarioId === "clarify-requirement") return advanceClarification(session, answer, context);

  const effectiveAnswer = answer;
  const candidate = context.existingTasks?.find(({ id }) => id === session.decisionCandidateId);
  if (session.scenarioId === "similar-task") {
    if (effectiveAnswer === "view-existing" && candidate) return { type: "open-existing", task: candidate, message: "正在打开已有任务。", session: completeSession(session, effectiveAnswer) };
    if (effectiveAnswer === "view-existing" && !candidate) return { type: "draft", draft: scenarioDraft(session, context), message: "任务数据已变化，已降级为独立创建草案。", session: completeSession(session, effectiveAnswer) };
    if (effectiveAnswer === "create-anyway") return { type: "draft", draft: scenarioDraft(session, context), message: "已生成独立任务草案。", session: completeSession(session, effectiveAnswer) };
    return { type: "decision", candidate: candidate ?? null, candidateKind: "similar", choices: similarChoices, message: "请选择查看已有任务或仍然创建。", reason: similarTaskReason, session };
  }

  if (session.scenarioId === "existing-parent") {
    if (effectiveAnswer === "create-subtask" && candidate) {
      return { type: "create-subtask", draft: childDraft(session, context, candidate), parentTask: candidate, message: "已准备子任务草案。", session: completeSession(session, effectiveAnswer) };
    }
    if (effectiveAnswer === "create-subtask" && !candidate) return { type: "draft", draft: scenarioDraft(session, context), message: "父任务数据已变化，已降级为独立创建草案。", session: completeSession(session, effectiveAnswer) };
    if (effectiveAnswer === "create-independent") return { type: "draft", draft: scenarioDraft(session, context), message: "已生成独立任务草案。", session: completeSession(session, effectiveAnswer) };
    return { type: "decision", candidate: candidate ?? null, candidateKind: "parent", choices: parentChoices, message: "请选择创建为子任务或仍然独立创建。", reason: parentTaskReason, session };
  }

  return { type: "draft", draft: scenarioDraft(session, context), message: "已生成任务草案。", session: completeSession(session) };
};

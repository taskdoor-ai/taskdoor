import { taskCreationScenarios, type TaskCreationScenarioId } from "../data/taskCreationScenarios";
import { assignTaskByResponsibility } from "./responsibilityAssignment";
import { createCreationForm, validateCreationForm, type CreationForm } from "./taskCreationForm";
import { withMockCreationEffort } from "./taskCreationEffort";
import { advanceTaskCreationScenario, startTaskCreationScenario, type ExistingTaskCandidate, type ScenarioContext } from "./taskCreationScenario";

export type CreationPlanningQuestion = {
  field: "goal" | "deliverable";
  title: string;
  choices: string[];
  placeholder: string;
};

export type CreationPlanningResult =
  | { stage: "clarify"; request: string; scenarioId: TaskCreationScenarioId; questions: CreationPlanningQuestion[] }
  | { stage: "decision" | "review"; form: CreationForm; summary: string }
  | { stage: "unavailable"; request: string; message: string };

const relationshipFixtures: Partial<Record<TaskCreationScenarioId, { id: string; name: string }>> = {
  "similar-task": { id: "weekly-retro-notes", name: "整理本周团队复盘纪要" },
  "existing-parent": { id: "product-launch-planning", name: "新品发布会筹备" },
};

const clarificationQuestions: CreationPlanningQuestion[] = [
  { field: "goal", title: "这次活动希望达成什么目标？", choices: ["提升新品曝光", "获取销售线索", "促进用户复购"], placeholder: "说明希望改变的结果，例如让目标客户了解新品功能" },
  { field: "deliverable", title: "完成时需要交付什么？", choices: ["活动方案和执行排期", "方案、物料和复盘", "执行清单和负责人分工"], placeholder: "说明可以核对的交付内容，例如可执行的活动方案和排期" },
];

const unavailable = (request: string, message = "这段需求暂时无法生成方案，原文已保留。可以选择下方的常见任务需求继续。"):
  Extract<CreationPlanningResult, { stage: "unavailable" }> => ({ stage: "unavailable", request, message });

const meaningfulAnswer = (answer?: string) => {
  const value = answer?.trim() ?? "";
  return !/[\p{L}\p{N}]/u.test(value)
    || /^(?:暂时不确定|不确定|不知道|不清楚|还没想好|待定|待补充|我来补充具体要求|custom|uncertain)$/.test(value) ? "" : value;
};

const validDate = (value: string) => {
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const similarCandidateReason = (candidate: ExistingTaskCandidate, context: ScenarioContext) => {
  const title = candidate.name ?? candidate.title ?? "";
  const goal = candidate.goal ?? "";
  const discovery = candidate.ownerId === context.currentUserId
    ? "在你负责或参与的任务中发现了这个任务。"
    : "在当前团队中你有权查看的任务里发现了这个任务。";
  const hasRetrospectiveEvidence = /复盘/.test(title) && /关键决定|关键结果/.test(goal) && /问题/.test(goal) && /行动/.test(goal);
  return hasRetrospectiveEvidence
    ? `${discovery}当前需求和已有任务都需要整理复盘结果，交付内容都包含关键决定、未解决问题和后续行动，并形成可共享的复盘材料；请核对是否为同一项工作。`
    : `${discovery}现有名称和目标不足以说明重合，系统不会据此判定重复；请核对任务目标与交付范围后再确认。`;
};

/** A deterministic adapter for explicit demos, not a general-purpose AI parser. */
export function planTaskCreation(
  request: string,
  context: ScenarioContext,
  options?: { scenarioId?: TaskCreationScenarioId; answers?: { goal?: string; deliverable?: string } },
): CreationPlanningResult {
  const scenario = taskCreationScenarios.find(item => item.prompt === request.trim()
    && (options?.scenarioId === undefined || item.id === options.scenarioId));
  if (!scenario) return unavailable(request);
  if (scenario.id === "complex-plan" && !validDate(context.currentDate)) {
    return unavailable(request, "当前日期缺失或无效，无法核对上线时间；没有猜测年份，原文已保留。");
  }

  const answers = { goal: meaningfulAnswer(options?.answers?.goal), deliverable: meaningfulAnswer(options?.answers?.deliverable) };
  if (scenario.id === "clarify-requirement") {
    const questions = clarificationQuestions.filter(question => !answers[question.field]);
    if (questions.length) return {
      stage: "clarify", request, scenarioId: scenario.id,
      questions: questions.map(question => ({ ...question, choices: [...question.choices] })),
    };
  }

  // Gate the old engine's single-candidate fallback behind an exact fixture match.
  const fixture = relationshipFixtures[scenario.id];
  const namesakes = fixture ? context.existingTasks?.filter(task => task.id && (task.name ?? task.title) === fixture.name) ?? [] : [];
  const candidate = fixture
    ? context.existingTasks?.find(task => task.id === fixture.id)
      ?? (namesakes.length === 1 ? namesakes[0] : undefined)
    : undefined;
  if (fixture && !candidate && namesakes.length > 1) return unavailable(request, `当前存在多个名为「${fixture.name}」的任务，无法确定唯一关系候选；未完成查重，原文已保留。`);
  if (fixture && !candidate) return unavailable(request, `未找到对应的已有任务「${fixture.name}」，无法判断关系；未完成查重，原文已保留。`);
  const planningContext = candidate ? { ...context, existingTasks: [candidate] } : context;
  let form = createCreationForm(request, planningContext, scenario.id);
  if (scenario.id === "complex-plan" && form.mainTask.endDate !== `${context.currentDate.slice(0, 4)}-09-15`) {
    return unavailable(request, "当前日期与 9 月 15 日的截止及准备排期存在冲突，不能自动顺延到下一年；原文已保留，请重新确认期限。");
  }

  if (scenario.id === "clarify-requirement") {
    // The archived engine asks three questions. Supply the intentionally unasked time
    // as unknown; only the two answers actually confirmed by the user enter the plan.
    let transition = startTaskCreationScenario(scenario.id, planningContext);
    for (const answer of [answers.goal, "暂时不确定", answers.deliverable]) {
      transition = advanceTaskCreationScenario(transition.session, answer, planningContext);
    }
    if (transition.type !== "draft") return unavailable(request, "补充信息尚未形成任务候选，请核对目标和完成交付；原文已保留。");
    form.mainTask = {
      ...form.mainTask, ...transition.draft.mainTask,
      goal: answers.goal,
      completionCriteria: [`完成交付：${answers.deliverable}`],
      executionTips: ["先核对活动边界和交付内容；期限可以在候选方案中补充。"],
    };
  }
  if (scenario.id !== "complex-plan") {
    form.mainTask.ownerId = scenario.id === "unassigned-owner"
      ? ""
      : assignTaskByResponsibility(form.mainTask, context.members).ownerId;
    // These prompts contain no concrete deadline; the old similar-task demo used today.
    form.mainTask.startDate = "";
    form.mainTask.endDate = "";
  }
  if (candidate) {
    form.candidate = structuredClone(candidate);
    form.candidateReason = form.candidateKind === "parent"
      ? "建议：将媒体邀请作为发布会筹备的一项交付；请核对当前主任务范围和已有子任务是否已覆盖，避免重复安排。"
      : similarCandidateReason(candidate, context);
  }

  form = withMockCreationEffort(form);
  const invalid = validateCreationForm({ ...form, decision: "independent" }, context.members);
  if (invalid) return unavailable(request, `候选暂不可审阅：${invalid}原文已保留。`);
  const boundary = "尚未完成查重，尚未创建任务。";
  if (form.decision === "pending") return {
    stage: "decision", form,
    summary: `${form.candidateKind === "parent" ? "此交付可能属于已有主任务，请先确认是否关联。" : "此交付与已有任务可能重叠，请先查看或确认独立创建。"}${boundary}`,
  };
  return {
    stage: "review", form,
    summary: `${form.subtasks.length ? `已整理为 1 个主任务和 ${form.subtasks.length} 个子任务候选，完成标准与前置依赖可编辑。` : "已整理为一个任务候选，无需继续拆分；可核对目标与完成标准。"}负责人仅为职责建议，未知人选及期限保留待定。${boundary}`,
  };
}

function currentCandidate(form: CreationForm, context: ScenarioContext): ExistingTaskCandidate | undefined {
  const fixture = form.scenarioId && relationshipFixtures[form.scenarioId];
  const candidate = context.existingTasks?.find(task => task.id === form.candidate?.id);
  return fixture && candidate && (candidate.id === fixture.id || (candidate.name ?? candidate.title) === fixture.name)
    ? candidate : undefined;
}

function validatePlan(form: CreationForm, context: ScenarioContext): string | null {
  const invalid = validateCreationForm(form, context.members);
  if (invalid) return invalid;
  const memberIds = new Set(context.members.map(member => member.id));
  if ([form.mainTask, ...form.subtasks].some(task => task.participantIds.some(id => !memberIds.has(id)))) {
    return "候选参与人已不在当前成员列表，请重新选择；原方案已保留。";
  }
  return null;
}

export function resolveCreationRelationship(
  form: CreationForm,
  decision: "attach" | "independent",
  context: ScenarioContext,
): { form: CreationForm; summary: string } | { error: string } {
  const candidate = currentCandidate(form, context);
  if (!candidate) return { error: "已有任务候选已不可用或发生变化，请重新判断关系；原方案已保留。" };
  if (decision === "attach" && form.candidateKind !== "parent") return { error: "相似任务不能直接作为主任务关联，请查看已有任务或明确选择独立创建。" };
  if (decision === "attach" && !candidate.goal?.trim()) return { error: "已有主任务尚未填写目标，不能确认继承；请补充主目标或选择独立创建。" };

  // Attachment inherits candidate.goal during projection; retain the independent
  // draft's own goal so detaching does not widen its scope to the whole parent.
  const next: CreationForm = { ...form, decision, candidate: structuredClone(candidate) };
  const invalid = validatePlan(next, context);
  if (invalid) return { error: invalid };
  return {
    form: next,
    summary: decision === "attach"
      ? `已选择作为「${candidate.name ?? candidate.title}」的子任务候选，继承主目标；原完成标准、人选和期限保留，已有任务未修改。`
      : "已选择独立创建，已有任务保持不变。当前仍是候选方案，未完成查重，尚未创建任务。",
  };
}

const revisionFormatError = "当前仅支持一次调整一个字段：任务名称改为…、目标改为…、增加完成标准：…、负责人改为确切姓名或 ID／待定、截止时间改为 YYYY-MM-DD／待定。组合与分工请求尚不支持，原方案已保留。";

const hasCombinedInstructions = (instruction: string) => /[\r\n]/.test(instruction)
  || (instruction.match(/(?:任务名称|目标|负责人|截止时间)(?:改为|改成|设为|设置为)|增加完成标准[：:]/gu)?.length ?? 0) > 1
  || /(?:[，,；;。][ \t]*(?:并且?|同时|然后|再|顺便)?[ \t]*|(?:并且?|同时|然后|顺便)[ \t]*)(?:拆分|拆成|分成|分工|分配|(?:增加|新增|添加|删除|调整)子任务|(?:把|将).*(?:拆分|拆成|分配|分工|改为|改成)|(?:让|安排|指派).*(?:负责|处理|承担))/u.test(instruction);

export function reviseCreationPlan(
  form: CreationForm,
  instruction: string,
  context: ScenarioContext,
): { form: CreationForm; summary: string; changes: string[] } | { error: string } {
  if (form.decision === "pending") return { error: "请先确认与已有任务的关系，再修订候选方案。" };
  if (form.candidate) {
    const candidate = currentCandidate(form, context);
    if (!candidate) return { error: "已有任务候选已不可用，请重新判断关系；原方案已保留。" };
    if (form.decision === "attach" && (!candidate.goal?.trim() || candidate.goal.trim() !== form.candidate.goal?.trim())) {
      return { error: "已有主任务目标缺失或已经变化，请重新确认继承目标；原方案已保留。" };
    }
  }
  const text = instruction.trim();
  const match = /^(任务名称改为|目标改为|负责人改为|截止时间改为|增加完成标准[：:])[ \t]*(.+)$/u.exec(text);
  if (!match || hasCombinedInstructions(text)) return { error: revisionFormatError };
  const [, operation, rawValue] = match;
  const value = rawValue.trim();
  if (!value) return { error: revisionFormatError };

  const next: CreationForm = { ...form, mainTask: { ...form.mainTask } };
  const changes: string[] = [];
  const describe = (label: string, before: string, after: string) => {
    if (before !== after) changes.push(`${label}：「${before || "待定"}」→「${after || "待定"}」`);
  };
  if (operation === "任务名称改为") {
    next.mainTask.title = value;
    describe("任务名称", form.mainTask.title, value);
  } else if (operation === "目标改为") {
    if (form.decision === "attach") return { error: "当前方案继承已有主任务目标，不能在此改写主任务；请先选择独立创建。" };
    if (!meaningfulAnswer(value)) return { error: "请提供明确的任务目标；原方案已保留。" };
    next.mainTask.goal = value;
    next.subtasks = form.subtasks.map(task => ({ ...task, goal: value }));
    describe(`目标${form.subtasks.length ? `（同步 ${form.subtasks.length} 个子任务的继承目标）` : ""}`, form.mainTask.goal, value);
  } else if (operation.startsWith("增加完成标准")) {
    if (!form.mainTask.completionCriteria.includes(value)) {
      next.mainTask.completionCriteria = [...form.mainTask.completionCriteria, value];
      changes.push(`新增完成标准：「${value}」`);
    }
  } else if (operation === "负责人改为") {
    const matches = context.members.filter(member => member.id === value || member.name === value);
    if (value !== "待定" && matches.length !== 1) return {
      error: matches.length > 1 ? "当前成员中存在同名或多个匹配，请使用唯一成员 ID；原方案已保留。" : "未找到这个确切姓名或 ID 的当前成员，请重新选择；原方案已保留。",
    };
    next.mainTask.ownerId = value === "待定" ? "" : matches[0].id;
    const ownerLabel = (id: string) => context.members.find(member => member.id === id)?.name ?? id;
    if (form.mainTask.ownerId !== next.mainTask.ownerId) {
      changes.push(`负责人：「${ownerLabel(form.mainTask.ownerId) || "待定"}」→「${ownerLabel(next.mainTask.ownerId) || "待定"}」`);
    }
    if (next.mainTask.ownerId && form.mainTask.participantIds.includes(next.mainTask.ownerId)) {
      next.mainTask.participantIds = form.mainTask.participantIds.filter(id => id !== next.mainTask.ownerId);
      changes.push(`参与人：移除已设为负责人的「${ownerLabel(next.mainTask.ownerId)}」（同人去重），其他参与人保持不变。`);
    }
  } else if (operation === "截止时间改为") {
    next.mainTask.endDate = value === "待定" ? "" : value;
    describe("截止时间", form.mainTask.endDate, next.mainTask.endDate);
  }

  // Validate the patched form, allowing a targeted edit to repair a stale owner.
  const invalid = validatePlan(next, context);
  if (invalid) return { error: invalid };
  if (operation === "截止时间改为" && next.mainTask.endDate
    && next.subtasks.some(task => task.endDate && task.endDate > next.mainTask.endDate)) {
    return { error: "新的主任务截止时间早于现有子任务交付，请先核对子任务排期；没有自动重排，原方案已保留。" };
  }
  return {
    form: next, changes,
    summary: changes.length ? `已整理「${operation.replace(/改为|[：:]/gu, "")}」的调整建议，仅影响列出的字段；尚未创建或指派任务。` : "内容没有变化，当前候选方案保持原样。",
  };
}

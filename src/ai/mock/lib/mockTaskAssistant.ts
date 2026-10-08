import { normalizePersonalTagNames } from "./personalTags.ts";
import { assignTaskByResponsibility, type ResponsibilityAssignment, type ResponsibilityDomain } from "./responsibilityAssignment.ts";
import { taskAssistantResponseSchema, type TaskAssistantRequest, type TaskAssistantResponse, type TaskDraft, type TaskPlanDraft } from "./taskAssistantProtocol.ts";

const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const creatorCommerceSubtaskSeeds = [
  { title: "筛选达人并确认商务合作", goal: "完成达人筛选、建联、佣金谈判与合作档期确认。", label: "达人商务", domain: "creator-business", gapLabel: "达人商务", iconName: "briefcase", iconTone: "pink" },
  { title: "完成卖点、脚本与直播素材", goal: "完成卖点提炼、短视频脚本、直播话术与素材交付。", label: "内容制作", domain: "content", gapLabel: "内容制作", iconName: "sparkles", iconTone: "purple" },
  { title: "完成直播彩排与上线执行", goal: "完成直播排期、场控清单、彩排和上线异常预案。", label: "直播执行", domain: "live-operations", gapLabel: "直播执行", iconName: "flag", iconTone: "red" },
  { title: "确认价格机制、库存与履约", goal: "锁定商品价格、赠品机制、库存数量和履约方案。", label: "商品运营", domain: "merchandising", gapLabel: "商品运营", iconName: "list-todo", iconTone: "cyan" },
  { title: "制定投流计划并控制 ROI", goal: "确认投放预算、定向、人群包和 ROI 目标。", label: "投流增长", domain: "media-buying", gapLabel: "投流增长", iconName: "target", iconTone: "amber" },
  { title: "搭建数据看板并完成复盘", goal: "统一 GMV 指标口径、渠道归因和项目复盘模板。", label: "数据复盘", domain: "analytics", gapLabel: "数据复盘", iconName: "chart", iconTone: "blue" },
  { title: "完成素材宣称与合同合规审核", goal: "审核广告法、素材宣称、达人合同和平台规则。", label: "合规审核", domain: "compliance", gapLabel: "合规", iconName: "file-check", iconTone: "green" },
] as const;

const creatorCommerceDependencies: NonNullable<TaskPlanDraft["dependencies"]> = [
  { subtaskIndex: 2, dependsOnSubtaskIndexes: [0, 1, 3, 6] },
  { subtaskIndex: 4, dependsOnSubtaskIndexes: [0, 1] },
  { subtaskIndex: 5, dependsOnSubtaskIndexes: [2, 4] },
  { subtaskIndex: 6, dependsOnSubtaskIndexes: [0, 1] },
];

type RepresentativeScenario = {
  dependencies: NonNullable<TaskPlanDraft["dependencies"]>;
  goal: string;
  iconName: NonNullable<TaskDraft["iconName"]>;
  iconTone: NonNullable<TaskDraft["iconTone"]>;
  label?: string;
  match: RegExp;
  subtasks: Array<{
    goal: string;
    iconName: NonNullable<TaskDraft["iconName"]>;
    iconTone: NonNullable<TaskDraft["iconTone"]>;
    label?: string;
    title: string;
  }>;
  title: string;
};

const representativeScenarios: RepresentativeScenario[] = [
  {
    dependencies: [{ subtaskIndex: 1, dependsOnSubtaskIndexes: [0] }],
    goal: "形成可直接进入商务建联的抖音达人候选名单，并保留清晰的筛选依据。",
    iconName: "briefcase",
    iconTone: "pink",
    label: "达人商务",
    match: /筛选适合新品防晒衣的抖音达人/,
    subtasks: [
      { title: "整理抖音达人候选池", goal: "按内容垂类、受众匹配度和历史带货表现整理候选达人。", iconName: "list-todo", iconTone: "blue", label: "达人商务" },
      { title: "确认优先建联名单", goal: "基于候选池完成复核，输出优先级明确的建联名单。", iconName: "clipboard-check", iconTone: "green", label: "达人商务" },
    ],
    title: "新品防晒衣抖音达人筛选",
  },
  {
    dependencies: [{ subtaskIndex: 2, dependsOnSubtaskIndexes: [0, 1] }],
    goal: "让直播执行、投流策略和数据复盘在一个可协作的计划中衔接。",
    iconName: "target",
    iconTone: "amber",
    label: "高优先级",
    match: /拆分直播、投流与数据复盘计划/,
    subtasks: [
      { title: "完成直播排期与执行方案", goal: "确认直播窗口、彩排安排、场控清单和异常预案。", iconName: "flag", iconTone: "red", label: "直播执行" },
      { title: "制定投流计划并控制 ROI", goal: "明确预算、定向、人群包和 ROI 观察口径。", iconName: "target", iconTone: "amber", label: "投流增长" },
      { title: "搭建数据看板并完成复盘", goal: "承接直播与投流结果，统一指标、归因和复盘模板。", iconName: "chart", iconTone: "blue", label: "数据复盘" },
    ],
    title: "直播、投流与数据复盘协作计划",
  },
  {
    dependencies: [],
    goal: "并行准备待审材料并完成素材宣称、达人合同和平台规则检查。",
    iconName: "file-check",
    iconTone: "green",
    label: "合规审核",
    match: /检查素材宣称与达人合同合规/,
    subtasks: [
      { title: "整理素材宣称待审清单", goal: "汇总素材、宣称依据和需要重点核对的表达。", iconName: "sparkles", iconTone: "purple", label: "内容制作" },
      { title: "审核达人合同与平台规则", goal: "核对达人合同、广告法要求和平台规则，输出审核结论。", iconName: "file-check", iconTone: "green", label: "合规审核" },
    ],
    title: "素材宣称与达人合同合规检查",
  },
];

type AssignedDraft = {
  assignment: ResponsibilityAssignment;
  gapLabel: string;
  task: TaskDraft;
};

type DraftNormalizationContext = {
  allowedLabels: Set<string>;
  validMemberIds: Set<string>;
};

type DraftValidationIssue = {
  field: string;
  question: string;
  reason: string;
  risk: string;
  type: "date" | "goal" | "owner" | "title";
};

const labelsAvailableIn = (_request: TaskAssistantRequest, labels: string[]) => normalizePersonalTagNames(labels);

const creatorCommerceContext = (request: TaskAssistantRequest) => {
  const userText = request.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
  const knownCreatorSubtaskCount = request.draft?.subtasks.filter((task) => creatorCommerceSubtaskSeeds.some((seed) => seed.title === task.title)).length ?? 0;
  return /达人[\s\S]*脚本[\s\S]*直播[\s\S]*库存[\s\S]*投流[\s\S]*数据[\s\S]*合规/i.test(userText)
    || knownCreatorSubtaskCount >= 5;
};

const targetDateFor = (request: TaskAssistantRequest) => {
  const year = Number(request.currentDate.slice(0, 4));
  const thisYear = `${year}-09-15`;
  return thisYear >= request.currentDate ? thisYear : "";
};

const acceptSpecialistAssignment = (
  assignment: ResponsibilityAssignment,
  expectedDomain: ResponsibilityDomain,
  gapLabel: string,
  minimumKeywordMatches: number,
): ResponsibilityAssignment => assignment.ownerId
  && assignment.domain === expectedDomain
  && assignment.matchedKeywords.length >= minimumKeywordMatches
  ? assignment
  : {
    ...assignment,
    domain: expectedDomain,
    ownerId: "",
    reason: `${gapLabel}责任未匹配到足够明确的责任文本，需要人工补齐。`,
  };

const createCreatorCommerceDraft = (request: TaskAssistantRequest) => {
  const targetDate = targetDateFor(request);
  const mainSeed = {
    title: "新品防晒衣抖音达人带货项目",
    goal: "统筹新品防晒衣抖音达人带货项目，以 9 月 15 日上线和 GMV 50 万为目标，协调达人、内容、直播、商品、投流、数据和合规交付。",
  };
  const mainAssignment = acceptSpecialistAssignment(
    assignTaskByResponsibility(mainSeed, request.members),
    "coordination",
    "统筹",
    1,
  );
  const mainTask: TaskDraft = {
    ...mainSeed,
    iconName: "target",
    iconTone: "blue",
    startDate: request.currentDate,
    endDate: targetDate,
    labels: labelsAvailableIn(request, ["高优先级"]),
    ownerId: mainAssignment.ownerId,
    participantIds: [],
  };
  const assignedSubtasks: AssignedDraft[] = creatorCommerceSubtaskSeeds.map((seed, index) => {
    const assignment = acceptSpecialistAssignment(
      assignTaskByResponsibility(seed, request.members),
      seed.domain,
      seed.gapLabel,
      2,
    );
    return {
      assignment,
      gapLabel: seed.gapLabel,
      task: {
        title: seed.title,
        goal: seed.goal,
        iconName: seed.iconName,
        iconTone: seed.iconTone,
        startDate: targetDate ? [addDays(request.currentDate, Math.min(index, 4)), targetDate].sort()[0] : "",
        endDate: targetDate,
        labels: labelsAvailableIn(request, [seed.label]),
        ownerId: assignment.ownerId,
        participantIds: [],
      },
    };
  });
  mainTask.participantIds = [...new Set(assignedSubtasks
    .map(({ task }) => task.ownerId)
    .filter((ownerId) => ownerId && ownerId !== mainTask.ownerId))];
  return {
    assignments: [{ assignment: mainAssignment, gapLabel: "统筹", task: mainTask }, ...assignedSubtasks],
    draft: { dependencies: creatorCommerceDependencies, mainTask, subtasks: assignedSubtasks.map(({ task }) => task) },
  };
};

/** Reuse the canonical creator-commerce plan without exposing its assignment metadata. */
export const createCreatorCommerceScenarioDraft = (request: TaskAssistantRequest): TaskPlanDraft =>
  createCreatorCommerceDraft(request).draft;

const normalizeDependencies = (
  dependencies: TaskPlanDraft["dependencies"],
  subtaskCount: number,
): NonNullable<TaskPlanDraft["dependencies"]> => {
  const bySubtask = new Map<number, number[]>();
  (dependencies ?? []).forEach(({ dependsOnSubtaskIndexes, subtaskIndex }) => {
    if (subtaskIndex < 0 || subtaskIndex >= subtaskCount) return;
    const validDependencies = [...new Set(dependsOnSubtaskIndexes.filter((index) => index >= 0 && index < subtaskCount && index !== subtaskIndex))];
    if (validDependencies.length) bySubtask.set(subtaskIndex, validDependencies);
  });
  return [...bySubtask.entries()].map(([subtaskIndex, dependsOnSubtaskIndexes]) => ({ dependsOnSubtaskIndexes, subtaskIndex }));
};

const normalizeTaskDraft = (
  task: TaskDraft,
  context: DraftNormalizationContext,
  fallbackOwnerId = "",
): TaskDraft => {
  const ownerId = context.validMemberIds.has(task.ownerId)
    ? task.ownerId
    : context.validMemberIds.has(fallbackOwnerId)
      ? fallbackOwnerId
      : "";
  return {
    ...task,
    labels: normalizePersonalTagNames(task.labels),
    ownerId,
    participantIds: [...new Set(task.participantIds.filter((id) => context.validMemberIds.has(id) && id !== ownerId))],
  };
};

const mergeAndNormalizeCreatorDraft = (
  generated: TaskPlanDraft,
  incoming: TaskPlanDraft | null,
  context: DraftNormalizationContext,
): TaskPlanDraft => {
  if (!incoming) return {
    dependencies: normalizeDependencies(generated.dependencies, generated.subtasks.length),
    mainTask: normalizeTaskDraft(generated.mainTask, context),
    subtasks: generated.subtasks.map((task) => normalizeTaskDraft(task, context)),
  };
  const mainTask = normalizeTaskDraft(
    { ...generated.mainTask, ...incoming.mainTask },
    context,
    generated.mainTask.ownerId,
  );
  const subtasks = generated.subtasks.map((generatedTask, index) => {
    const incomingTask = incoming.subtasks[index];
    return incomingTask
      ? normalizeTaskDraft({ ...generatedTask, ...incomingTask }, context, generatedTask.ownerId)
      : normalizeTaskDraft(generatedTask, context);
  });
  return {
    ...(incoming.tagOperations ? { tagOperations: incoming.tagOperations } : {}),
    dependencies: normalizeDependencies(incoming.dependencies ?? generated.dependencies, subtasks.length),
    mainTask,
    subtasks,
  };
};

const dateIsValid = (value: string) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const validateDraft = (draft: TaskPlanDraft, context: DraftNormalizationContext): DraftValidationIssue[] =>
  [draft.mainTask, ...draft.subtasks].flatMap((task, index) => {
    const taskLabel = index === 0 ? "主任务" : `子任务 ${index}`;
    const issues: DraftValidationIssue[] = [];
    if (!task.title.trim()) issues.push({ field: `task-${index}-title`, question: `${taskLabel}还需要任务名称`, reason: "任务名称不能为空。", risk: `${taskLabel}名称为空。`, type: "title" });
    if (!task.goal.trim()) issues.push({ field: `task-${index}-goal`, question: `${taskLabel}还需要任务目标`, reason: "任务目标不能为空。", risk: `${taskLabel}目标为空。`, type: "goal" });
    if (task.ownerId && !context.validMemberIds.has(task.ownerId)) issues.push({ field: `task-${index}-owner`, question: `${taskLabel}由谁负责？`, reason: "已选择的负责人必须是当前团队成员。", risk: `${taskLabel}的负责人不在当前团队中。`, type: "owner" });
    if (!dateIsValid(task.endDate)) {
      issues.push({ field: `task-${index}-date`, question: `${taskLabel}的到期时间需要修正`, reason: "到期时间必须是有效的 YYYY-MM-DD。", risk: `${taskLabel}包含无效到期时间。`, type: "date" });
    }
    return issues;
  });

const genericTitle = (request: TaskAssistantRequest) => {
  const content = [...request.messages].reverse().find((message) => message.role === "user")?.content.trim();
  return content?.slice(0, 80) || "整理团队待办";
};

const createGenericDraft = (request: TaskAssistantRequest): TaskPlanDraft => {
  const context: DraftNormalizationContext = {
    allowedLabels: new Set(request.tags),
    validMemberIds: new Set(request.members.map((member) => member.id)),
  };
  const fallbackOwnerId = request.members.some((member) => member.id === request.currentUserId)
    ? request.currentUserId
    : request.members[0]?.id ?? "";
  if (request.draft) {
    return {
      ...(request.draft.tagOperations ? { tagOperations: request.draft.tagOperations } : {}),
      dependencies: normalizeDependencies(request.draft.dependencies, request.draft.subtasks.length),
      mainTask: normalizeTaskDraft(request.draft.mainTask, context),
      subtasks: request.draft.subtasks.map((task) => normalizeTaskDraft(task, context)),
    };
  }
  const title = genericTitle(request);
  return {
    dependencies: [],
    mainTask: normalizeTaskDraft({
      title,
      goal: `完成“${title}”，形成可供团队确认和复用的交付物。`,
      startDate: request.currentDate,
      endDate: addDays(request.currentDate, 3),
      labels: request.tags.slice(0, 1),
      ownerId: fallbackOwnerId,
      participantIds: [],
    }, context),
    subtasks: [],
  };
};

const createRepresentativeDraft = (request: TaskAssistantRequest): TaskPlanDraft | null => {
  const userText = request.messages.filter((message) => message.role === "user").map((message) => message.content).join(" ");
  const scenario = representativeScenarios.find((candidate) => candidate.match.test(userText));
  if (!scenario) return null;
  const context: DraftNormalizationContext = {
    allowedLabels: new Set(request.tags),
    validMemberIds: new Set(request.members.map((member) => member.id)),
  };
  const fallbackOwnerId = request.members.some((member) => member.id === request.currentUserId)
    ? request.currentUserId
    : request.members[0]?.id ?? "";
  const subtaskDrafts = scenario.subtasks.map((seed, index): TaskDraft => {
    const assignment = assignTaskByResponsibility(seed, request.members);
    return normalizeTaskDraft({
      ...seed,
      endDate: addDays(request.currentDate, 2 + index),
      labels: labelsAvailableIn(request, seed.label ? [seed.label] : []),
      ownerId: assignment.ownerId,
      participantIds: [],
      startDate: request.currentDate,
    }, context);
  });
  const mainAssignment = assignTaskByResponsibility(scenario, request.members);
  const mainOwnerId = mainAssignment.ownerId || fallbackOwnerId;
  return {
    dependencies: scenario.dependencies,
    mainTask: normalizeTaskDraft({
      endDate: addDays(request.currentDate, 4),
      goal: scenario.goal,
      iconName: scenario.iconName,
      iconTone: scenario.iconTone,
      labels: labelsAvailableIn(request, scenario.label ? [scenario.label] : []),
      ownerId: mainOwnerId,
      participantIds: [...new Set(subtaskDrafts.map((task) => task.ownerId).filter((ownerId) => ownerId && ownerId !== mainOwnerId))],
      startDate: request.currentDate,
      title: scenario.title,
    }, context),
    subtasks: subtaskDrafts,
  };
};

const uniqueRecommendations = (
  assignments: AssignedDraft[],
  draft: TaskPlanDraft,
  request: TaskAssistantRequest,
) => {
  const draftTasks = [draft.mainTask, ...draft.subtasks];
  const memberById = new Map(request.members.map((member) => [member.id, member]));
  const recommendations = new Map<string, { memberId: string; reason: string; role: "owner" }>();
  assignments.forEach(({ assignment }, index) => {
    const actualOwnerId = draftTasks[index]?.ownerId ?? assignment.ownerId;
    if (!actualOwnerId) return;
    const isManual = actualOwnerId !== assignment.ownerId;
    const reason = !isManual
      ? assignment.reason
      : `已保留手动指定；当前责任文本：${memberById.get(actualOwnerId)?.dynamicResponsibility ?? "待补充"}`;
    const existing = recommendations.get(actualOwnerId);
    if (!existing || isManual) recommendations.set(actualOwnerId, { memberId: actualOwnerId, reason, role: "owner" });
  });
  return [...recommendations.values()];
};

const recommendationsForDraft = (
  draft: TaskPlanDraft,
  request: TaskAssistantRequest,
): TaskAssistantResponse["peopleRecommendations"] => {
  const memberById = new Map(request.members.map((member) => [member.id, member]));
  const recommendations = new Map<string, TaskAssistantResponse["peopleRecommendations"][number]>();
  [draft.mainTask, ...draft.subtasks].forEach((task) => {
    if (!task.ownerId) return;
    const member = memberById.get(task.ownerId);
    const assignment = assignTaskByResponsibility(task, request.members);
    const responsibilityMatched = assignment.ownerId === task.ownerId;
    const currentWork = member?.currentWork?.[0];
    const recentActivity = member?.recentActivity;
    const evidence = [
      responsibilityMatched
        ? assignment.reason
        : `当前草案由${member?.name ?? task.ownerId}负责；人员责任：${member?.dynamicResponsibility || "待补充"}`,
      currentWork ? `当前任务：${currentWork}` : "",
      recentActivity ? `近期经验：${recentActivity}` : "",
    ].filter(Boolean).join("；");
    const existing = recommendations.get(task.ownerId);
    if (!existing || responsibilityMatched) {
      recommendations.set(task.ownerId, { memberId: task.ownerId, reason: evidence, role: "owner" });
    }
  });
  return [...recommendations.values()];
};

const explicitlyConfirmsCreation = (request: TaskAssistantRequest) => {
  const userMessages = request.messages.filter((message) => message.role === "user");
  if (userMessages.length < 2) return false;
  const reply = userMessages.at(-1)?.content.normalize("NFKC").trim().toLowerCase() ?? "";
  if (/不确认|未确认|尚未确认|还没确认|无法确认|暂不|先不|不要|不创建|别创建|保持待定|还不能|稍后|拒绝|取消/.test(reply)) return false;
  return /^(?:我)?确认(?:[，,。！!\s]*(?:按(?:这|此)版(?:创建|执行)?|创建)?)?[。！!]*$/.test(reply)
    || /^(?:按(?:这|此)版(?:创建|执行)?|可以创建|开始创建|同意创建|就这样创建)[。！!]*$/.test(reply)
    || /^(?:嗯?可以|同意|好的?|没问题)[。！!]*$/.test(reply);
};

const scheduleSummaryForDraft = (draft: TaskPlanDraft) => {
  const { endDate, startDate } = draft.mainTask;
  if (startDate && endDate) return `任务时间为 ${startDate} 至 ${endDate}。`;
  if (startDate) return `任务开始时间为 ${startDate}，结束时间未设置。`;
  if (endDate) return `任务结束时间为 ${endDate}，开始时间未设置。`;
  return "当前未设置任务时间，可在草案中补充。";
};

export const createMockTaskAssistantResponseForDraft = (
  request: TaskAssistantRequest,
  draft: TaskPlanDraft,
  assistantMessage?: string,
): TaskAssistantResponse => {
  const normalizationContext: DraftNormalizationContext = {
    allowedLabels: new Set(request.tags),
    validMemberIds: new Set(request.members.map((member) => member.id)),
  };
  const validationIssues = validateDraft(draft, normalizationContext);
  const canCreate = validationIssues.length === 0;
  const missingInformation = validationIssues.map(({ field, question, reason }) => ({ field, question, reason }));
  const clarificationPrompt = missingInformation.slice(0, 2).map((item, index) => `${index + 1}）${item.question}`).join(" ");
  const isConfirmed = explicitlyConfirmsCreation(request);
  return taskAssistantResponseSchema.parse({
    assistantMessage: assistantMessage ?? (canCreate
      ? draft.subtasks.length
        ? `已按交付关系整理为 ${draft.subtasks.length} 个子任务，现在可以创建，也可以点击卡片调整。`
        : "已整理为一个无需拆分的任务，现在可以创建，也可以点击卡片调整。"
      : `已更新任务草案，请修正：${clarificationPrompt || "任务名称、目标或到期时间是否准确？"}`),
    draft,
    missingInformation,
    peopleRecommendations: recommendationsForDraft(draft, request),
    qualityAssessment: {
      goal: { level: validationIssues.some((issue) => issue.type === "title" || issue.type === "goal") ? "blocked" : isConfirmed ? "good" : "needs-attention", summary: validationIssues.some((issue) => issue.type === "title" || issue.type === "goal") ? "任务名称或目标需要补齐。" : isConfirmed ? "目标已确认。" : "已生成可编辑的目标草案。" },
      risks: validationIssues.map((issue) => issue.risk),
      schedule: { level: validationIssues.some((issue) => issue.type === "date") ? "blocked" : "good", summary: validationIssues.some((issue) => issue.type === "date") ? "任务日期需要修正。" : scheduleSummaryForDraft(draft) },
      scope: { level: validationIssues.some((issue) => issue.type === "owner") ? "blocked" : "good", summary: validationIssues.some((issue) => issue.type === "owner") ? "负责人需要重新指定。" : draft.subtasks.length ? `当前按 ${draft.subtasks.length} 个子任务组织交付关系。` : "当前按单任务处理。" },
    },
    readyToCreate: canCreate,
    resultSummary: `已生成 1 个主任务、${draft.subtasks.length} 个子任务`,
  });
};

export const createMockTaskAssistantResponse = (request: TaskAssistantRequest): TaskAssistantResponse => {
  const isFollowUp = request.messages.filter((message) => message.role === "user").length > 1;
  const normalizationContext: DraftNormalizationContext = {
    allowedLabels: new Set(request.tags),
    validMemberIds: new Set(request.members.map((member) => member.id)),
  };
  if (!creatorCommerceContext(request)) {
    const draft = request.draft ? createGenericDraft(request) : createRepresentativeDraft(request) ?? createGenericDraft(request);
    return createMockTaskAssistantResponseForDraft(request, draft);
  }

  const generated = createCreatorCommerceDraft(request);
  const draft = mergeAndNormalizeCreatorDraft(generated.draft, request.draft, normalizationContext);
  const draftTasks = [draft.mainTask, ...draft.subtasks];
  const validationIssues = validateDraft(draft, normalizationContext);
  const responsibilityGaps = generated.assignments.filter((_, index) => !draftTasks[index]?.ownerId);
  const canCreate = validationIssues.length === 0;
  const missingInformation: TaskAssistantResponse["missingInformation"] = [];
  missingInformation.push(...responsibilityGaps.map(({ gapLabel }) => ({
    field: `owner-${gapLabel}`,
    question: `谁负责${gapLabel}？`,
    reason: `当前团队中没有足够明确的责任文本覆盖${gapLabel}。`,
  })));
  missingInformation.push(...validationIssues.map(({ field, question, reason }) => ({ field, question, reason })));

  return taskAssistantResponseSchema.parse({
    assistantMessage: responsibilityGaps.length > 0
      ? "任务方案已整理好，部分负责人暂未设置，可以先创建，也可以邀请更多同事后再分配。"
      : validationIssues.length > 0
        ? "任务方案已整理好，请在卡片中补充必要字段后创建。"
        : isFollowUp
          ? "任务方案已更新，可以直接创建，也可以点击卡片继续调整。"
          : "已按团队责任整理好任务方案，可以直接创建，也可以点击卡片调整。",
    draft,
    missingInformation,
    peopleRecommendations: uniqueRecommendations(generated.assignments, draft, request),
    qualityAssessment: {
      goal: { level: validationIssues.some((issue) => issue.type === "title" || issue.type === "goal") ? "blocked" : "good", summary: validationIssues.some((issue) => issue.type === "title" || issue.type === "goal") ? "部分任务名称或目标需要补齐。" : "已生成上线时间与 GMV 目标。" },
      risks: [
        "9 月 15 日上线，达人档期、彩排和合规审核需要前置锁定。",
        ...responsibilityGaps.map(({ gapLabel, task }) => `${gapLabel}责任缺口：${task.title}尚未匹配到责任人。`),
        ...validationIssues.map((issue) => issue.risk),
      ],
      schedule: { level: validationIssues.some((issue) => issue.type === "date") ? "blocked" : "needs-attention", summary: validationIssues.some((issue) => issue.type === "date") ? "部分任务日期需要修正。" : "上线前需要依次完成商务、素材、商品、彩排和审核。" },
      scope: {
        level: validationIssues.some((issue) => issue.type === "owner") ? "blocked" : responsibilityGaps.length > 0 ? "needs-attention" : "good",
        summary: validationIssues.some((issue) => issue.type === "owner") ? "已选负责人需要重新指定。" : responsibilityGaps.length > 0 ? "部分任务暂不分配负责人，不阻止创建。" : "已覆盖达人商务、内容、直播、商品、投流、数据和合规七项责任。",
      },
    },
    readyToCreate: canCreate,
    resultSummary: "已生成 1 个主任务、7 个子任务及责任分配建议",
  });
};

const abortError = () => {
  const error = new Error("Mock request aborted");
  error.name = "AbortError";
  return error;
};

export const requestMockTaskAssistant = async (request: TaskAssistantRequest, signal?: AbortSignal, delayMs = 5_200) => {
  if (signal?.aborted) throw abortError();
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(abortError());
    }, { once: true });
  });
  return createMockTaskAssistantResponse(request);
};

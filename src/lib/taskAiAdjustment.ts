import type {
  TaskAiAdjustmentChange,
  TaskAiAdjustmentContext,
  TaskAiAdjustmentProposal,
  TaskAiAdjustmentResult,
  TaskAiAdjustmentScope,
  TaskAiEditableFields,
  TaskAiEditableTask,
} from "./taskAiAdjustmentTypes.ts";
import { formatEffortPersonDays, getEffortScopeKey, parseEffortHours, parseEffortPersonDays } from "./taskEffort";

const formatError = "每次请明确一个要调整的字段；组合要求、自由拆分和删除任务暂不支持。原文与任务保持不变，可在输入框中补充具体要求。";
const listError = "请提供非空内容；多条完成标准或执行建议请用中文分号「；」分隔，每条都须有正文。原文与任务保持不变。";

/** Snapshot comparison only, not a security token or a persistence operation. */
export function getTaskAiContextSignature(context: TaskAiAdjustmentContext): string {
  return JSON.stringify(context);
}

/** The creation composer shares one input; only an explicit prefix changes its target. */
export function buildTaskAiCreationAdjustment(context: TaskAiAdjustmentContext, instruction: string): TaskAiAdjustmentResult {
  if (context.mode !== "draft") return { error: "统一调整入口仅用于创建草稿，请从已有任务的对应入口发起调整。" };
  const text = instruction.trim();
  const scope: TaskAiAdjustmentScope = { kind: /^(?:子任务|添加子任务)/u.test(text) ? "subtasks" : "task" };
  return buildTaskAiAdjustment(context, scope, instruction);
}

const sameList = (left: string[], right: string[]) => left.length === right.length
  && left.every((value, index) => value === right[index]);

const sameIds = (left: string[], right: string[]) => left.length === right.length
  && new Set(left).size === left.length && right.every(id => left.includes(id));

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function splitItems(value: string): string[] | null {
  const items = value.split("；").map(item => item.trim());
  return items.every(Boolean) ? items : null;
}

function isCompletionCriteriaRegeneration(text: string): boolean {
  return /^(?:请)?(?:重新生成|重新整理|重写|优化)(?:一下)?(?:当前任务|这个任务|任务)?的?完成标准(?:吧)?[。！!]?$/u.test(text);
}

function regenerateCompletionCriteria(target: TaskAiEditableTask): string[] {
  const current = target.completionCriteria.map(item => item.trim()).filter(Boolean);
  if (current.length) {
    return current.map(item => {
      const normalized = item.replace(/[。；;]+$/u, "").trim();
      if (/可追溯/u.test(normalized) && /(?:核对|复查|依据|记录)/u.test(normalized)) return `${normalized}。`;
      return /(?:核对|确认|验收|记录|数据|报告|复盘|截图|清单|版本)/u.test(normalized)
        ? `${normalized}；核对依据、结果与未通过项可追溯。`
        : `${normalized}；交付结果和核对记录可追溯。`;
    });
  }
  const title = target.title.trim() || "当前任务";
  const goal = target.goal.trim();
  return [
    `「${title}」已形成可核对的交付结果${goal ? `，并满足目标「${goal}」` : ""}。`,
    "交付物、核对记录和未满足项均已明确，可由相关成员复查。",
  ];
}

/** Deliberately a finite command grammar, never a natural-language model fallback. */
function hasCombinedInstructions(text: string): boolean {
  // Corner-quoted task titles are exact data, including titles that happen to
  // contain field names or command words. Do not parse their contents as actions.
  const commandsOnly = text.replace(/「[^「」]*」/gu, "");
  const commands = commandsOnly.match(/(?:任务名称|目标|负责人|截止时间|完成标准|执行建议|前置依赖|预计投入)[ \t]*(?:改为|改成|设为|设置为)|(?:增加|添加|新增)完成标准[：:]|(?:添加|新增|增加)子任务[：:]/gu);
  // Only the addition grammar has a second declared field (its required criteria).
  // An extra "负责人：..." must not silently become a completion criterion.
  const declarations = (commandsOnly.startsWith("添加子任务")
    ? commandsOnly.replace(/；[ \t]*完成标准[：:]/u, "；") : commandsOnly)
    .replace(/增加完成标准[ \t]*[：:]/u, "增加标准");
  return /[\r\n]/u.test(text)
    || (commands?.length ?? 0) > 1
    || /(?:任务名称|目标|负责人|截止时间|开始时间|完成标准|执行建议|前置依赖|预计投入)[ \t]*[：:]/u.test(declarations)
    || /(?:[，,；;。]|并且?|同时|然后|再|顺便|另外|以及)[ \t]*(?:(?:并且?|同时|然后|再|顺便|请|另外)[ \t]*)*(?:拆分|拆成|分成|分工|分配|(?:增加|新增|添加|删除|移除|取消|清空|调整|修改|重排|重建)(?:(?:所有|全部)|第[一二三四五六七八九十\d]+个)?(?:子任务|任务|依赖|成员|负责人)|(?:把|将).*(?:改为|改成|设为|设置为|拆成|拆分|分配|清空|删除)|(?:让|安排|指派).*(?:负责|处理|承担)|邀请|发送|通知|子任务[ \t]*[：:])/u.test(commandsOnly);
}

function memberLabel(context: TaskAiAdjustmentContext, id: string): string {
  if (!id) return "待定";
  const member = context.members.find(candidate => candidate.id === id);
  if (!member) return id;
  return context.members.filter(candidate => candidate.name === member.name).length > 1
    ? `${member.name}（${member.id}）` : member.name;
}

type DependencyTask = TaskAiAdjustmentContext["dependencyTasks"][number];

function dependencyGraph(context: TaskAiAdjustmentContext): Map<string, DependencyTask> | string {
  const graph = new Map<string, DependencyTask>();
  for (const item of context.dependencyTasks) {
    if (!item.id || graph.has(item.id)) return "依赖任务图存在缺失或重复的稳定 ID，请刷新任务上下文；原文与任务保持不变。";
    graph.set(item.id, item);
  }
  // The opened task and its children are the latest snapshot. Do not treat their
  // stale copies in the full graph as separate candidates or use old edges.
  for (const item of [context.task, ...context.subtasks]) graph.set(item.id, {
    ...item, parentTaskId: item.parentTaskId ?? (item.id !== context.task.id ? context.task.id : undefined),
  });
  return graph;
}

function isAncestor(graph: Map<string, DependencyTask>, ancestorId: string, taskId: string): boolean {
  const visited = new Set([taskId]);
  let parentId = graph.get(taskId)?.parentTaskId;
  while (parentId && !visited.has(parentId)) {
    if (parentId === ancestorId) return true;
    visited.add(parentId);
    parentId = graph.get(parentId)?.parentTaskId;
  }
  return false;
}

function canReach(graph: Map<string, DependencyTask>, from: string, target: string): boolean {
  const queue = [from];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.pop()!;
    if (id === target) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    queue.push(...(graph.get(id)?.dependsOnTaskIds ?? []));
  }
  return false;
}

function validateDeadline(context: TaskAiAdjustmentContext, target: TaskAiEditableTask, date: string): string | null {
  if (target.startDate && !validDate(target.startDate)) return "当前任务的开始日期无效，请先核对开始日期；原文与任务保持不变。";
  if (date && target.startDate && date < target.startDate) return "截止日期不能早于当前任务的开始日期；原文与任务保持不变。";
  if (!date) return null;
  const graph = dependencyGraph(context);
  if (typeof graph === "string") return graph;
  for (const child of graph.values()) {
    if (isAncestor(graph, target.id, child.id)) {
      if (child.endDate && !validDate(child.endDate)) return `子任务「${child.title}」的截止日期无效，请先到子任务模块核对；没有自动修改排期。`;
      if (child.endDate && date < child.endDate) return `主任务截止时间早于子任务「${child.title}」的截止时间，请到子任务模块逐项调整；没有自动重排，原文与任务保持不变。`;
    }
  }
  const visited = new Set([target.id]);
  let parentId = graph.get(target.id)?.parentTaskId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = graph.get(parentId);
    if (parent?.endDate) {
      if (!validDate(parent.endDate)) return "主任务截止日期无效，请先核对主任务日期；原文与任务保持不变。";
      if (date > parent.endDate) return "子任务截止时间不能晚于已确定的主任务截止时间；原文与任务保持不变。";
      break;
    }
    parentId = parent?.parentTaskId;
  }
  return null;
}

/**
 * Canonical syntax: 任务名称改为X / 目标改为X / 增加完成标准：X /
 * 完成标准改为：A；B / 执行建议改为：A；B / 负责人改为姓名或ID /
 * 截止时间改为YYYY-MM-DD或待定 / 前置依赖改为「精确标题」、「另一标题」或无 /
 * 预计投入改为2小时或待估算（仅叶子任务；数字候选不会自动确认）。
 * Lists split on the Chinese semicolon only; commas are ordinary content.
 * A subtasks scope requires 子任务「精确名称」：<one command>, or
 * 添加子任务：<名称>；完成标准：A；B. Nothing is applied or persisted here.
 */
export function buildTaskAiAdjustment(
  context: TaskAiAdjustmentContext,
  scope: TaskAiAdjustmentScope,
  instruction: string,
): TaskAiAdjustmentResult {
  if (!["task", "subtasks", "subtask"].includes(scope.kind)) return { error: "调整范围无效，请重新打开对应模块；原文与任务保持不变。" };
  const localTasks = [context.task, ...context.subtasks];
  if (localTasks.some(item => !item.id) || new Set(localTasks.map(item => item.id)).size !== localTasks.length) {
    return { error: "当前任务中存在缺失或重复的稳定 ID，无法确定唯一调整对象；请刷新上下文，原文与任务保持不变。" };
  }

  const updates: TaskAiAdjustmentProposal["updates"] = [];
  const additions: TaskAiEditableTask[] = [];
  const changes: TaskAiAdjustmentChange[] = [];
  const result = (summary?: string): TaskAiAdjustmentResult => ({ proposal: {
    baseSignature: getTaskAiContextSignature(context), instruction, scope: { ...scope }, updates, additions, changes,
    summary: summary ?? (changes.length
      ? "已整理调整候选，仅影响列出的字段；尚未应用、保存或指派任务。"
      : "内容没有变化，当前任务与候选保持原样。"),
  } });

  let text = instruction.trim();
  if (!text || hasCombinedInstructions(text)) return { error: formatError };
  let target: TaskAiEditableTask | undefined = context.task;

  if (scope.kind === "subtask") {
    target = context.subtasks.find(item => item.id === scope.taskId);
    if (!target) return { error: "所选子任务已失效或不在当前调整范围，请重新打开该子任务；原文与任务保持不变。" };
  } else if (scope.kind === "subtasks") {
    if (/^添加子任务[：:]/u.test(text)) {
      if (!context.canAddSubtasks) return { error: "当前范围不允许新增子任务；原文与已有任务保持不变。" };
      const match = /^添加子任务[：:][ \t]*([^；]+)；[ \t]*完成标准[：:][ \t]*(.+)$/u.exec(text);
      const title = match?.[1].trim();
      const criteria = match && splitItems(match[2]);
      if (!title || !criteria) return { error: "新增子任务须明确名称和完成标准，格式为「添加子任务：名称；完成标准：A；B」；请补充后重试，原文已保留。" };
      const child: TaskAiEditableTask = {
        id: globalThis.crypto.randomUUID(), title, goal: context.task.goal, goalInherited: true,
        completionCriteria: criteria, executionTips: [], ownerId: "", participantIds: [],
        startDate: "", endDate: "", dependsOnTaskIds: [],
      };
      additions.push(child);
      const addedFields = [
        ["新增子任务", title], ["目标（继承主任务）", child.goal || "待定"],
        ["完成标准", criteria.join("\n")], ["负责人", "待定"], ["截止时间", "待定"], ["前置依赖", "无"],
      ];
      for (const [label, after] of addedFields) changes.push({ taskId: child.id, taskTitle: child.title, label, before: null, after });
      if (!context.subtasks.length && context.task.effortEstimate) {
        // Splitting a leaf changes its accounting role, not its historical estimate.
        updates.push({ taskId: context.task.id, patch: { effortEstimate: { ...context.task.effortEstimate, confirmed: false, scopeKey: "needs-review:split" } } });
        changes.push({ taskId: context.task.id, taskTitle: context.task.title, label: "预计投入口径", before: "按当前任务估算", after: "改由子任务汇总；原父项估算保留待复核" });
      }
      return result("已整理新增子任务候选，继承主目标，人选与日期待定，没有自动添加依赖；尚未创建或指派任务。");
    }
    const selector = /^子任务「([^「」]+)」[ \t]*[：:][ \t]*(.+)$/u.exec(text);
    if (!selector) return { error: "子任务模块需要指定唯一任务，格式为「子任务「精确名称」：单条调整要求」；不会自动选择第一项，自由拆分暂不支持。原文与任务保持不变。" };
    const matches = context.subtasks.filter(item => item.title === selector[1]);
    if (matches.length !== 1) return { error: matches.length
      ? context.mode === "draft" ? "存在多个同名子任务，请先在方案中区分名称后重试；原文与任务保持不变。" : "存在多个同名子任务，请从具体子任务的菜单发起调整；原文与任务保持不变。"
      : "未找到这个精确名称的子任务，请核对名称；原文与任务保持不变。" };
    target = matches[0];
    text = selector[2].trim();
  }

  if (isCompletionCriteriaRegeneration(text)) {
    const before = target.completionCriteria;
    const after = regenerateCompletionCriteria(target);
    if (!sameList(before, after)) {
      updates.push({ taskId: target.id, patch: { completionCriteria: after } });
      changes.push({ taskId: target.id, taskTitle: target.title, label: "完成标准", before: before.join("\n"), after: after.join("\n") });
    }
    return result(changes.length
      ? "已基于当前任务内容重新整理完成标准候选，保留原目标与业务边界，只增强可核对性；尚未应用或保存。"
      : "当前完成标准已经包含可核对结果与追溯信息，没有生成重复修改。");
  }

  const match = /^(任务名称改为|目标改为|负责人改为|截止时间改为|前置依赖改为|预计投入改为)[ \t]*[：:]?[ \t]*(.+)$/u.exec(text)
    ?? /^(增加完成标准|完成标准改为|执行建议改为)[ \t]*[：:][ \t]*(.+)$/u.exec(text);
  if (!match) return { error: formatError };
  const [, operation, rawValue] = match;
  const value = rawValue.trim();
  if (!value || /^[：:]+$/u.test(value)) return { error: formatError };
  const patch: Partial<TaskAiEditableFields> = {};
  const describe = (label: string, before: string, after: string) => {
    changes.push({ taskId: target.id, taskTitle: target.title, label, before, after });
  };
  let summary: string | undefined;

  if (operation === "任务名称改为") {
    if (target.title !== value) {
      patch.title = value;
      describe("任务名称", target.title, value);
    }
  } else if (operation === "目标改为") {
    if (target.goalInherited) return { error: "当前任务继承主任务目标，不能在这里单独改写；请到主任务调整目标，原文与任务保持不变。" };
    if (target.goal !== value) {
      patch.goal = value;
      describe("目标", target.goal, value);
      if (target.id === context.task.id && context.subtasks.some(child => child.goalInherited)) {
        summary = "已整理主目标调整候选；继承主目标的子任务仍随主任务读取目标，其他字段不变。尚未应用或保存。";
      }
    }
  } else if (["增加完成标准", "完成标准改为", "执行建议改为"].includes(operation)) {
    const items = splitItems(value);
    if (!items) return { error: listError };
    const isTips = operation === "执行建议改为";
    const before = isTips ? target.executionTips : target.completionCriteria;
    const after = operation === "增加完成标准"
      ? [...before, ...items.filter((item, index) => !before.includes(item) && items.indexOf(item) === index)]
      : items;
    if (!sameList(before, after)) {
      if (isTips) patch.executionTips = after;
      else patch.completionCriteria = after;
      describe(isTips ? "执行建议" : "完成标准", before.join("\n"), after.join("\n"));
    }
  } else if (operation === "预计投入改为") {
    const graph = dependencyGraph(context);
    if (typeof graph === "string") return { error: graph };
    if ([...graph.values()].some(task => task.parentTaskId === target.id)) return { error: "当前任务已有子任务，预计投入应由叶子任务汇总。请展开子任务逐项调整，避免父子重复计量；原文与估算保持不变。" };
    const clear = value === "待估算";
    const numeric = /^(\d+(?:\.\d+)?)[ \t]*(人天|小时)$/u.exec(value);
    if (!clear && !numeric) return { error: "预计投入请明确填写非负人天数，例如「预计投入改为0.5人天」（1 人天＝8 人时），也兼容明确的小时数；或写「预计投入改为待估算」。这里只接受明确数字，不会自动估算。原文与任务保持不变。" };
    let minutes: number | null;
    try { minutes = clear ? null : numeric![2] === "人天" ? parseEffortPersonDays(numeric![1]) : parseEffortHours(numeric![1]); }
    catch (caught) { return { error: caught instanceof Error ? caught.message : "预计投入无效，请核对人天数。" }; }
    const previous = target.effortEstimate;
    const workMethod = previous?.workMethod ?? "";
    const reason = previous?.reason ?? "";
    const scopeKey = getEffortScopeKey(target, workMethod);
    if (!previous && clear) return result();
    if (previous?.minutes !== minutes || previous.scopeKey !== scopeKey) {
      if (previous && (!Number.isSafeInteger(previous.version) || previous.version < 1 || previous.version >= Number.MAX_SAFE_INTEGER)) return { error: "当前估算版本无效或已超出可保存范围，请核对原记录；原文与估算保持不变。" };
      patch.effortEstimate = { minutes, workMethod, reason, basis: clear ? "unknown" : "manual", confirmed: false, scopeKey, version: (previous?.version ?? 0) + 1 };
      describe("预计投入（EWD）", formatEffortPersonDays(previous?.minutes ?? null), `${formatEffortPersonDays(minutes)}（未确认）`);
      summary = "已按用户明确输入整理投入候选；工作方式与估算依据沿用原记录，仍待复核。尚未确认、应用或保存，没有进行自动估算。";
      if (!workMethod.trim() || !reason.trim()) summary = "已保留用户明确输入的投入数字；仍需补充工作方式与估算依据，当前为待估算，尚未确认、应用或保存。";
      if (clear) summary = "已按用户明确要求生成「待估算」候选，原工作方式与依据保留备查；尚未应用或保存，没有进行自动估算。";
    }
  } else if (operation === "负责人改为") {
    if (context.mode === "saved" && value === "待定") return { error: "已创建任务的 AI 调整只能提出具体成员，不能直接清空正式负责人；原文与任务保持不变。" };
    const idMatches = context.members.filter(member => member.id === value);
    const matches = idMatches.length ? idMatches : context.members.filter(member => member.name === value);
    if (value !== "待定" && (matches.length !== 1 || !matches[0].id)) return { error: matches.length > 1
      ? "当前成员中存在同名或多个匹配，请使用唯一成员 ID；原文与任务保持不变。"
      : "未找到这个精确姓名或 ID 的有效成员，请核对当前成员列表；原文与任务保持不变。" };
    const ownerId = value === "待定" ? "" : matches[0].id;
    if (context.mode === "saved") {
      if (ownerId === target.ownerId || ownerId === target.proposedOwnerId) {
        return result(target.proposedOwnerId
          ? "内容没有变化；已有待接受提议仍保留，正式负责人不变。"
          : "内容没有变化，正式负责人保持原样。");
      }
      patch.ownerId = ownerId; // Adapter persists a proposal, never the formal Owner.
      describe("负责人提议", target.proposedOwnerId
        ? `${memberLabel(context, target.proposedOwnerId)}（待接受）`
        : `${memberLabel(context, target.ownerId)}（正式负责人）`, `${memberLabel(context, ownerId)}（待接受）`);
      summary = `已生成负责人提议，${memberLabel(context, ownerId)}待接受；正式负责人「${memberLabel(context, target.ownerId)}」不变，参与人不变。尚未应用或发送邀请。`;
    } else if (target.ownerId !== ownerId) {
      patch.ownerId = ownerId;
      describe("负责人", memberLabel(context, target.ownerId), memberLabel(context, ownerId));
      if (ownerId && target.participantIds.includes(ownerId)) {
        patch.participantIds = target.participantIds.filter(id => id !== ownerId);
        describe("参与人（负责人去重）", target.participantIds.map(id => memberLabel(context, id)).join("、") || "无",
          patch.participantIds.map(id => memberLabel(context, id)).join("、") || "无");
      }
    }
  } else if (operation === "截止时间改为") {
    const endDate = value === "待定" ? "" : value;
    if (endDate && !validDate(endDate)) return { error: "请填写真实有效的 YYYY-MM-DD 日期，或明确写「待定」；暂不解析相对日期，原文与任务保持不变。" };
    const label = target.endDateLabel?.trim() ?? "";
    const clearsLegacyLabel = !endDate && !target.endDate && Boolean(label) && !["待定", "未设置", "无", "—"].includes(label);
    if (target.endDate !== endDate || clearsLegacyLabel) {
      const invalid = validateDeadline(context, target, endDate);
      if (invalid) return { error: invalid };
      patch.endDate = endDate;
      describe("截止时间", target.endDate || label || "待定", endDate || "待定");
    }
  } else if (operation === "前置依赖改为") {
    const graph = dependencyGraph(context);
    if (typeof graph === "string") return { error: graph };
    let ids: string[] = [];
    if (value !== "无") {
      if (!/^「[^「」]+」(?:[ \t]*、[ \t]*「[^「」]+」)*$/u.test(value)) return { error: "前置依赖请使用「精确标题」，多个任务以顿号「、」分隔，或明确写「无」；原文与任务保持不变。" };
      const titles = Array.from(value.matchAll(/「([^「」]+)」/gu), entry => entry[1]);
      for (const title of titles) {
        const matches = [...graph.values()].filter(item => item.title === title);
        if (matches.length !== 1) return { error: matches.length
          ? `存在多个标题为「${title}」的同名任务，不能确定唯一前置依赖；原文与任务保持不变。`
          : `未找到精确标题为「${title}」的前置任务，不能新增悬空依赖；原文与任务保持不变。` };
        const id = matches[0].id;
        if (id === target.id) return { error: "任务不能依赖自身；原文与任务保持不变。" };
        if (isAncestor(graph, id, target.id) || isAncestor(graph, target.id, id)) {
          return { error: "父子任务的归属关系不是前置依赖，不能把祖先或后代任务设为前置依赖；原文与任务保持不变。" };
        }
        if (context.mode === "draft" && (target.id === context.task.id || !context.subtasks.some(child => child.id === id))) {
          return { error: "创建草稿的前置依赖只允许兄弟子任务，主任务与外部任务不进入子任务依赖；原文与任务保持不变。" };
        }
        if (ids.includes(id)) return { error: "同一前置依赖重复出现，请每个任务只写一次；原文与任务保持不变。" };
        ids.push(id);
      }
    }
    if (!sameIds(target.dependsOnTaskIds, ids)) {
      graph.set(target.id, { ...target, dependsOnTaskIds: ids });
      // A new cycle must contain a newly added edge. Traverse the full graph for
      // those edges; unrelated historical cycles/missing references are preserved.
      for (const id of ids.filter(id => !target.dependsOnTaskIds.includes(id))) {
        if (canReach(graph, id, target.id)) return { error: "这个前置依赖会形成任务循环，请重新核对前置关系；原文与任务保持不变。" };
      }
      const names = (list: string[]) => list.map(id => graph.get(id)?.title ?? `${id}（任务已不可用）`).join("、") || "无";
      patch.dependsOnTaskIds = ids;
      describe("前置依赖", names(target.dependsOnTaskIds), names(ids));
    }
  }

  if (Object.keys(patch).length) updates.push({ taskId: target.id, patch });
  return result(summary);
}

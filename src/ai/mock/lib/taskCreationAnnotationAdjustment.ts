import { snapshotCreationAnnotations } from "@/features/tasks/lib/task-creation-annotations";
import {
  creationAnnotationLabels,
  describeCreationAnnotations,
  isCreationAnnotationStale,
} from "@/features/tasks/lib/task-creation-annotations";
import type { TaskCreationAnnotation, TaskCreationAnnotationField } from "@/features/tasks/lib/task-creation-annotations";
import type {
  TaskAiAdjustmentChange,
  TaskAiAdjustmentContext,
  TaskAiAdjustmentProposal,
  TaskAiAdjustmentResult,
  TaskAiEditableFields,
  TaskAiEditableTask,
} from "@/features/tasks/lib/task-ai-adjustment-types";
import { buildTaskAiAdjustment, buildTaskAiCreationAdjustment, getTaskAiContextSignature } from "@/ai/mock/lib/taskAiAdjustment";
import { mockPersonName } from "@/ai/mock/i18n/mockContent";

type AnnotatedTaskField = Exclude<TaskCreationAnnotationField, "task">;

const fieldCommands: Record<AnnotatedTaskField, string> = {
  title: "任务名称改为", goal: "目标改为", completionCriteria: "完成标准改为：",
  ownerId: "负责人改为", participantIds: "参与人改为", endDate: "截止时间改为",
};
const fieldPatterns: Record<AnnotatedTaskField, RegExp> = {
  title: /^任务名称改为/u, goal: /^目标改为/u,
  completionCriteria: /^(?:增加完成标准[ \t]*[：:]|完成标准改为[ \t]*[：:]|(?:请)?(?:重新生成|重新整理|重写|优化)(?:一下)?(?:当前任务|这个任务|任务)?的?完成标准(?:吧)?[。！!]?$)/u,
  ownerId: /^负责人改为/u, participantIds: /^参与人(?:改为|改成|修改为)/u, endDate: /^截止时间改为/u,
};
const findTask = (context: TaskAiAdjustmentContext, taskId: string) => [context.task, ...context.subtasks].find(task => task.id === taskId);
const noCandidate = "本批标注未生成可应用候选，标注与补充原文已保留，请修改后重试。";
const normalizeLabel = (label: string) => label === "参与人（负责人去重）" ? "参与人" : label;

function fieldFormatError(field: TaskCreationAnnotationField): string {
  if (field === "task") return "任务卡片标注请明确写要改的字段，例如「任务名称改为新名称」或「目标改为新目标」；多条要求请换行。英文请写「Task name: Change to New name」等明确字段标签。";
  const example = field === "ownerId" ? "改为：精确成员姓名或 ID（也可填待定）"
    : field === "participantIds" ? "改为：成员姓名或 ID、另一成员（或改为：无）"
    : field === "endDate" ? "改为：YYYY-MM-DD（也可填待定）"
    : field === "completionCriteria" ? "改为：具体完成标准，或重新生成完成标准"
    : "改为：具体新内容";
  return `所选${creationAnnotationLabels[field].zh}请明确写「${example}」；每条标注仅调整所选字段。`;
}

function annotationCommand(annotation: TaskCreationAnnotation): string | null {
  const text = annotation.instruction.trim();
  const field = annotation.target.field;
  if (field === "task") return null;
  if (field === "completionCriteria") {
    if (/^refine[ \t]+completion[ \t]+criteria$/iu.test(text)) return "优化完成标准";
    if (/^regenerate[ \t]+completion[ \t]+criteria$/iu.test(text)) return "重新生成完成标准";
  }
  const short = /^(?:请)?(?:改为|改成|修改为)[ \t]*[：:]?[ \t]*(.+)$/u.exec(text)
    ?? /^(?:change[ \t]+to|replace[ \t]+with)(?:[ \t]*[：:][ \t]*|[ \t]+)(.+)$/iu.exec(text);
  let value = short?.[1].trim();
  if (value && (field === "ownerId" || field === "endDate") && /^(?:unassigned|not set)$/iu.test(value)) value = "待定";
  if (value && field === "participantIds" && /^none$/iu.test(value)) value = "无";
  const command = short ? `${fieldCommands[field]}${value}` : text;
  return fieldPatterns[field].test(command) ? command : null;
}

const cardFieldLabels: Record<string, AnnotatedTaskField> = {
  "task name": "title", goal: "goal", "completion criteria": "completionCriteria",
  owner: "ownerId", participants: "participantIds", "due date": "endDate",
  "任务名称": "title", "目标": "goal", "完成标准": "completionCriteria",
  "负责人": "ownerId", "参与人": "participantIds", "截止时间": "endDate", "截止日期": "endDate",
};

function cardFieldAnnotations(annotation: TaskCreationAnnotation): { annotations: TaskCreationAnnotation[] } | { error: string } {
  const lines = annotation.instruction.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return { error: fieldFormatError("task") };
  const annotations: TaskCreationAnnotation[] = [];
  for (const [index, line] of lines.entries()) {
    const headers = line.match(/(?:Task name|Goal|Completion criteria|Owner|Participants|Due date|任务名称|目标|完成标准|负责人|参与人|截止日期|截止时间)[ \t]*[：:]/giu);
    if ((headers?.length ?? 0) > 1) return { error: `卡片标注第 ${index + 1} 行包含多个字段，请将明确命令分行填写。` };
    const header = /^(Task name|Goal|Completion criteria|Owner|Participants|Due date|任务名称|目标|完成标准|负责人|参与人|截止日期|截止时间)[ \t]*[：:][ \t]*(.+)$/iu.exec(line);
    const field = header ? cardFieldLabels[header[1].toLowerCase()]
      : (Object.keys(fieldPatterns) as AnnotatedTaskField[]).find(candidate => fieldPatterns[candidate].test(line));
    if (!field) return { error: `卡片标注第 ${index + 1} 行无法定位明确字段。${fieldFormatError("task")}` };
    const selected: TaskCreationAnnotation = { ...annotation,
      target: { taskId: annotation.target.taskId, field }, instruction: header ? header[2] : line,
    };
    if (!annotationCommand(selected)) return { error: `卡片标注第 ${index + 1} 行：${fieldFormatError(field)}` };
    annotations.push(selected);
  }
  return { annotations };
}

function matchingMembers(context: TaskAiAdjustmentContext, selection: string) {
  const byId = context.members.filter(member => member.id === selection);
  return byId.length ? byId : context.members.filter(member => member.name === selection || mockPersonName("en", member.id, member.name) === selection);
}

function memberLabel(context: TaskAiAdjustmentContext, id: string): string {
  const member = context.members.find(item => item.id === id);
  if (!member) return id;
  return context.members.filter(item => item.name === member.name).length > 1 ? `${member.name}（${id}）` : member.name;
}

function participantsAdjustment(context: TaskAiAdjustmentContext, target: TaskAiEditableTask, command: string): TaskAiAdjustmentResult {
  const match = /^参与人(?:改为|改成|修改为)[ \t]*[：:]?[ \t]*(.+)$/u.exec(command);
  const value = match?.[1].trim();
  if (!value || /[\r\n]/u.test(value)) return { error: fieldFormatError("participantIds") };
  const participantIds: string[] = [];
  if (value !== "无") {
    const selections = value.split(/[、，,；;]/u).map(item => item.trim());
    if (selections.some(item => !item)) return { error: "参与人列表包含空项，请逐项提供精确成员姓名或 ID；清空时写「改为：无」。" };
    for (const selection of selections) {
      const matches = matchingMembers(context, selection);
      if (matches.length !== 1 || !matches[0].id) return { error: matches.length > 1
        ? `参与人「${selection}」存在同名或重复匹配，请使用唯一成员 ID。`
        : `未找到参与人「${selection}」的精确姓名或 ID，请核对当前成员列表。` };
      const id = matches[0].id;
      if (id !== target.ownerId && !participantIds.includes(id)) participantIds.push(id);
    }
  }
  const changed = JSON.stringify(participantIds) !== JSON.stringify(target.participantIds);
  return { proposal: {
    baseSignature: getTaskAiContextSignature(context), instruction: command, scope: { kind: "task" }, additions: [],
    updates: changed ? [{ taskId: target.id, patch: { participantIds } }] : [],
    changes: changed ? [{ taskId: target.id, taskTitle: target.title, label: "参与人",
      before: target.participantIds.map(id => memberLabel(context, id)).join("、") || "无",
      after: participantIds.map(id => memberLabel(context, id)).join("、") || "无" }] : [],
    summary: changed ? "已整理参与人调整候选，尚未应用。" : "参与人没有变化。",
  } };
}

function adjustAnnotation(context: TaskAiAdjustmentContext, annotation: TaskCreationAnnotation): TaskAiAdjustmentResult {
  const target = findTask(context, annotation.target.taskId);
  if (!target) return { error: "标注任务已失效，请重新标注。" };
  let command = annotationCommand(annotation);
  if (!command) return { error: fieldFormatError(annotation.target.field) };
  if (annotation.target.field === "participantIds") return participantsAdjustment(context, target, command);
  if (annotation.target.field === "ownerId") {
    const value = /^负责人改为[ \t]*[：:]?[ \t]*(.+)$/u.exec(command)?.[1].trim();
    if (value && value !== "待定") {
      const matches = matchingMembers(context, value);
      if (matches.length !== 1 || !matches[0].id) return { error: matches.length > 1
        ? "负责人存在同名或重复匹配，请使用唯一成员 ID。"
        : "未找到负责人的精确姓名、英文显示名或 ID，请核对当前成员列表。" };
      command = `负责人改为${matches[0].id}`;
    }
  }
  const scope = target.id === context.task.id ? { kind: "task" as const } : { kind: "subtask" as const, taskId: target.id };
  const row = annotation.target.criterionIndex;
  if (annotation.target.field === "completionCriteria" && row !== undefined) {
    if (!Number.isInteger(row) || row < 0 || row >= target.completionCriteria.length) return { error: "所选完成标准已失效，请重新标注该条。" };
    if (command.startsWith("增加完成标准")) return { error: "所选的是单条完成标准，请写「改为：该条的新内容」；新增标准请标注整组完成标准或使用补充要求。" };
    // The existing regeneration and replacement grammar sees only the selected
    // row; its output is then spliced back without touching the neighboring rows.
    const isolated = structuredClone(context);
    findTask(isolated, target.id)!.completionCriteria = [target.completionCriteria[row]];
    const single = buildTaskAiAdjustment(isolated, scope, command);
    if ("error" in single) return single;
    const replacement = single.proposal.updates[0]?.patch.completionCriteria;
    if (!replacement) return single;
    if (replacement.length !== 1) return { error: "单条标注只能替换所选的一条完成标准，请提供一条非空内容；整组替换请重新标注整组。" };
    const completionCriteria = [...target.completionCriteria];
    completionCriteria[row] = replacement[0];
    return { proposal: { ...single.proposal,
      updates: [{ taskId: target.id, patch: { completionCriteria } }],
      changes: [{ taskId: target.id, taskTitle: target.title, label: "完成标准", before: target.completionCriteria.join("\n"), after: completionCriteria.join("\n") }],
    } };
  }
  const result = buildTaskAiAdjustment(context, scope, command);
  if ("error" in result) return result;
  const allowed = new Set<string>([annotation.target.field, ...(annotation.target.field === "ownerId" ? ["participantIds"] : [])]);
  if (result.proposal.additions.length || result.proposal.updates.some(update => update.taskId !== target.id || Object.keys(update.patch).some(field => !allowed.has(field)))) {
    return { error: fieldFormatError(annotation.target.field) };
  }
  return result;
}

/** Builds one atomic preview against the current draft; it never mutates or saves tasks. */
export function buildTaskAiCreationAnnotationAdjustment(
  context: TaskAiAdjustmentContext,
  annotations: TaskCreationAnnotation[],
  instruction = "",
): TaskAiAdjustmentResult {
  if (context.mode !== "draft") return { error: "标注调整仅用于创建草稿，请从已有任务的对应入口发起调整。" };
  const tasks = [context.task, ...context.subtasks];
  if (tasks.some(task => !task.id) || new Set(tasks.map(task => task.id)).size !== tasks.length) {
    return { error: "当前草稿存在缺失或重复的稳定 ID，无法确定标注对象；原文与任务保持不变。" };
  }
  // Validate every note against the original snapshot before evaluating any
  // command, so earlier valid instructions cannot hide a stale later note.
  for (const [index, annotation] of annotations.entries()) {
    const { field, criterionIndex } = annotation.target;
    if (!Object.hasOwn(creationAnnotationLabels, field) || (criterionIndex !== undefined && field !== "completionCriteria")) {
      return { error: `第 ${index + 1} 条标注字段无效，请重新标注。${noCandidate}` };
    }
    if (isCreationAnnotationStale(context, annotation)) return { error: `第 ${index + 1} 条标注已过期或目标已失效，请根据当前草稿重新标注。${noCandidate}` };
  }
  const working = structuredClone(context);
  const patches = new Map<string, Partial<TaskAiEditableFields>>();
  const mergedChanges = new Map<string, TaskAiAdjustmentChange>();
  const additions: TaskAiEditableTask[] = [];
  const applyPreview = (preview: TaskAiAdjustmentProposal) => {
    for (const update of preview.updates) {
      Object.assign(findTask(working, update.taskId)!, structuredClone(update.patch));
      patches.set(update.taskId, { ...patches.get(update.taskId), ...structuredClone(update.patch) });
    }
    for (const addition of preview.additions) {
      const clone = structuredClone(addition);
      additions.push(clone);
      working.subtasks.push(clone);
    }
    for (const change of preview.changes) {
      const label = normalizeLabel(change.label);
      const key = JSON.stringify([change.taskId, label]);
      const previous = mergedChanges.get(key);
      mergedChanges.set(key, { ...change, label,
        taskTitle: findTask(context, change.taskId)?.title ?? change.taskTitle,
        before: previous ? previous.before : change.before,
      });
    }
  };
  for (const [index, annotation] of annotations.entries()) {
    const selected = annotation.target.field === "task" ? cardFieldAnnotations(annotation) : { annotations: [annotation] };
    if ("error" in selected) return { error: `第 ${index + 1} 条标注（任务卡片）：${selected.error}${noCandidate}` };
    for (const fieldAnnotation of selected.annotations) {
      const result = adjustAnnotation(working, fieldAnnotation);
      if ("error" in result) return { error: `第 ${index + 1} 条标注（${creationAnnotationLabels[fieldAnnotation.target.field].zh}）：${result.error}${noCandidate}` };
      applyPreview(result.proposal);
    }
  }
  if (instruction.trim()) {
    const result = buildTaskAiCreationAdjustment(working, instruction);
    if ("error" in result) return { error: `补充要求：${result.error}${noCandidate}` };
    applyPreview(result.proposal);
  }
  const updates: TaskAiAdjustmentProposal["updates"] = [];
  for (const [taskId, patch] of patches) {
    const original = findTask(context, taskId)!;
    const finalPatch = Object.fromEntries(Object.entries(patch).filter(([field, value]) => JSON.stringify(original[field as keyof TaskAiEditableFields]) !== JSON.stringify(value))) as Partial<TaskAiEditableFields>;
    if (Object.keys(finalPatch).length) updates.push({ taskId, patch: finalPatch });
  }
  const changes = [...mergedChanges.values()].filter(change => change.before !== change.after);
  return { proposal: {
    baseSignature: getTaskAiContextSignature(context), scope: { kind: "task" },
    instruction: describeCreationAnnotations(annotations, instruction),
    annotations: snapshotCreationAnnotations(annotations), supplementalInstruction: instruction,
    updates, additions, changes,
    summary: changes.length ? `已根据 ${annotations.length} 条标注${instruction.trim() ? "和补充要求" : ""}整理调整候选，仅影响列出的字段；尚未应用或保存。`
      : "内容没有变化，当前草稿保持原样。",
  } };
}

import { z } from "zod";
import type { PersonOption } from "@/shared/model/task-model";
import type { NewSubtaskDraft } from "@/features/tasks/lib/workspace-subtask-editing";

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validTimeZone = (value: string) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
};

export const subtaskDraftRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  locale: z.enum(["zh-CN", "en"]),
  currentDate: z.string().refine(validDate, "当前日期无效"),
  timeZone: z.string().max(100).refine(validTimeZone, "团队时区无效"),
  parentTask: z.object({ id: z.string().min(1).max(200), title: z.string().max(2000), goal: z.string().max(8000), completionCriteria: z.array(z.string().max(2000)).max(100) }).strict(),
  members: z.array(z.object({ id: z.string().min(1).max(200), name: z.string().max(200), responsibility: z.string().max(4000) }).strict()).max(60),
  labels: z.array(z.string().trim().min(1).max(100)).max(100),
}).strict().refine(value => new Set(value.members.map(member => member.id)).size === value.members.length, "成员身份重复");
export type SubtaskDraftRequest = z.infer<typeof subtaskDraftRequestSchema>;
export type SubtaskCreationInput = Omit<SubtaskDraftRequest, "members" | "labels"> & {
  members: readonly PersonOption[];
  labels: readonly string[];
};

const draftSchema = z.object({
  title: z.string().trim().min(1).max(160).refine(value => !/[\r\n]/.test(value), "任务名称应概括动作与对象，不能直接使用需求段落"),
  goal: z.string().trim().max(2000),
  completionCriteria: z.array(z.string().trim().min(1).max(2000)).min(1, "需要生成本项任务完成标准").max(30),
  ownerId: z.string().max(200),
  participantIds: z.array(z.string().max(200)).max(60),
  endDate: z.string().max(20),
  labels: z.array(z.string().max(100)).max(20),
}).strict();
const resultSchema = z.object({ draft: draftSchema.nullable(), message: z.string().max(500).default("") }).strict();

export function buildSubtaskDraftRequest(input: SubtaskCreationInput): SubtaskDraftRequest {
  return subtaskDraftRequestSchema.parse({
    ...input,
    parentTask: { ...input.parentTask, completionCriteria: [...input.parentTask.completionCriteria] },
    members: input.members.filter(member => member.membershipStatus !== "invited").map(member => ({ id: member.id, name: member.name, responsibility: member.dynamicResponsibility ?? member.role ?? "" })),
    labels: [...new Set(input.labels.map(label => label.trim()).filter(Boolean))],
  });
}

export function validateSubtaskDraftResult(value: unknown, request: SubtaskDraftRequest) {
  const result = resultSchema.parse(value);
  if (!result.draft) return result;
  const draft = result.draft;
  const normalize = (text: string) => text.replace(/[\s，。,.！!？?]/g, "");
  if (draft.goal && normalize(draft.title) === normalize(draft.goal)) throw new Error(request.locale === "en" ? "The name and goal must describe different parts of the task." : "生成的名称与目标重复，请重试。");
  const memberIds = new Set(request.members.map(member => member.id));
  const ownerId = memberIds.has(draft.ownerId) ? draft.ownerId : "";
  return { ...result, draft: {
    title: draft.title, goal: draft.goal,
    completionCriteria: [...new Set(draft.completionCriteria)],
    ownerId,
    participantIds: [...new Set(draft.participantIds)].filter(id => memberIds.has(id) && id !== ownerId),
    endDate: validDate(draft.endDate) && draft.endDate >= request.currentDate ? draft.endDate : "",
    labels: [...new Set(draft.labels)].filter(label => request.labels.includes(label)),
  } };
}

/** A generated draft is still one explicit addition; it cannot carry nested tasks. */
export function parseSubtaskDraftResult(value: unknown, request: SubtaskDraftRequest): NewSubtaskDraft {
  const { draft, message } = validateSubtaskDraftResult(value, request);
  if (!draft) throw new Error(message.trim() || (request.locale === "en" ? "Describe the task you need before creating it." : "请补充这项子任务需要完成的具体内容。"));
  return draft;
}

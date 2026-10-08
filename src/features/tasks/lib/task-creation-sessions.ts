import { z } from "zod";
import { taskDraftSchema, taskPlanDraftSchema } from "./taskAssistantProtocol";
import type { TaskCreationScenarioId } from "../data/taskCreationScenarios";
import type { CreationPlanningResult } from "./taskCreationPlanning";
import type { CreationProcess } from "./taskCreationProgress";

export type TaskCreationParentContext = { parentTaskId: string; pathItems: Array<{ id: string; label: string }> };
export type CreationWorkspaceDraft = {
  request: string;
  scenarioId?: TaskCreationScenarioId;
  planning: CreationPlanningResult | null;
  answers: { goal?: string; deliverable?: string };
  processes: CreationProcess[];
  editingBrief: boolean;
};
export type CreationSession = {
  id: string;
  updatedAt: number;
  workspace: CreationWorkspaceDraft;
  clarificationStep: number;
  parent: TaskCreationParentContext | null;
  created?: { mainTaskId: string; createdCount: number; taskTitles: string[] };
};

const answersSchema = z.object({ goal: z.string().optional(), deliverable: z.string().optional() });
const creationTaskSchema = taskDraftSchema.extend({ clientId: z.string(), parentClientId: z.string().optional(), completionCriteria: z.array(z.string()), executionTips: z.array(z.string()), dependsOnClientIds: z.array(z.string()) });
const formSchema = z.object({
  request: z.string(), mainTask: creationTaskSchema, subtasks: z.array(creationTaskSchema),
  decision: z.enum(["pending", "independent", "attach"]), tagOperations: taskPlanDraftSchema.shape.tagOperations,
  candidate: z.object({ id: z.string() }).passthrough().optional(),
}).passthrough();
const planningSchema = z.discriminatedUnion("stage", [
  z.object({ stage: z.literal("clarify"), request: z.string(), scenarioId: z.string(), questions: z.array(z.object({ field: z.enum(["goal", "deliverable"]), title: z.string(), choices: z.array(z.string()), placeholder: z.string() })) }),
  z.object({ stage: z.literal("review"), form: formSchema, summary: z.string() }),
  z.object({ stage: z.literal("decision"), form: formSchema, summary: z.string() }),
  z.object({ stage: z.literal("unavailable"), request: z.string(), message: z.string() }),
]);
const sessionSchema = z.object({
  id: z.string(), updatedAt: z.number().finite(), clarificationStep: z.number().int().nonnegative(),
  parent: z.object({ parentTaskId: z.string(), pathItems: z.array(z.object({ id: z.string(), label: z.string() })) }).nullable(),
  created: z.object({ mainTaskId: z.string(), createdCount: z.number(), taskTitles: z.array(z.string()) }).optional(),
  workspace: z.object({
    request: z.string(), scenarioId: z.string().optional(), planning: planningSchema.nullable(), answers: answersSchema, editingBrief: z.boolean(),
    processes: z.array(z.object({
      id: z.union([z.number(), z.string()]), title: z.string(), request: z.string(), answers: answersSchema,
      steps: z.array(z.object({ label: z.string(), detail: z.string(), basis: z.string() })), activeStep: z.number().int().nonnegative(),
      status: z.enum(["running", "completed", "stopped", "failed"]),
      responseSummary: z.string().optional(), outcome: z.string().optional(),
      changes: z.array(z.object({ taskId: z.string(), taskTitle: z.string(), label: z.string(), before: z.string().nullable(), after: z.string().nullable() }).passthrough()).optional(),
    }).passthrough()),
  }),
});

export const creationHistoryKey = (userId: string, teamId: string) => `agentdoor-creation-history-v1:${encodeURIComponent(userId)}:${encodeURIComponent(teamId)}`;

export function parseCreationSessions(raw: string | null): { sessions: CreationSession[]; error: string } {
  if (raw === null) return { sessions: [], error: "" };
  try {
    const parsed = z.array(sessionSchema).parse(JSON.parse(raw)) as CreationSession[];
    return { sessions: parsed.sort((a, b) => b.updatedAt - a.updatedAt), error: "" };
  } catch {
    return { sessions: [], error: "历史对话暂时无法读取，原有记录未被覆盖。" };
  }
}

export function upsertCreationSession(sessions: CreationSession[], session: CreationSession) {
  if (!session.workspace.request.trim() && !session.workspace.processes.length) return sessions;
  return [session, ...sessions.filter(item => item.id !== session.id)].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function restoreCreationSession(session: CreationSession): CreationSession {
  const restored = structuredClone(session);
  restored.workspace.processes = restored.workspace.processes.map(process => ({
    ...process,
    ...(process.status === "running" ? { status: "stopped" as const, outcome: "上次处理已中断，需求和原有方案已保留。" } : {}),
    ...(process.applicationStatus === "pending" ? { applicationStatus: "expired" as const } : {}),
  }));
  return restored;
}

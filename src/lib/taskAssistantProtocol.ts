import { z } from "zod";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { effortEstimateSchema } from "./taskEffort";

const dateValueSchema = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
const taskIconNameSchema = z.enum(["list-todo", "clipboard-check", "target", "flag", "briefcase", "file-check", "chart", "sparkles"] satisfies [TaskIconName, ...TaskIconName[]]);
const taskIconToneSchema = z.enum(["neutral", "blue", "cyan", "green", "amber", "red", "purple", "pink"] satisfies [TaskIconTone, ...TaskIconTone[]]);

export const taskDraftSchema = z.object({
  parentSubtaskIndex: z.number().int().nonnegative().optional(),
  completionCriteria: z.array(z.string()).optional(),
  executionTips: z.array(z.string()).optional(),
  effortEstimate: effortEstimateSchema.optional(),
  endDate: dateValueSchema,
  goal: z.string(),
  iconName: taskIconNameSchema.optional(),
  iconTone: taskIconToneSchema.optional(),
  labels: z.array(z.string()),
  ownerId: z.string(),
  participantIds: z.array(z.string()),
  startDate: dateValueSchema,
  title: z.string(),
});

export const taskPlanDraftSchema = z.object({
  tagOperations: z.array(z.object({
    action: z.enum(["upsert", "rename", "delete"]),
    name: z.string().trim().min(1).max(24),
    newName: z.string().trim().min(1).max(24).optional(),
    icon: z.enum(["tag", "folder", "flag", "layers", "package", "shopping", "users", "building", "coins", "shield", "wrench", "sparkles"]).optional(),
    color: z.enum(["gray", "blue", "cyan", "teal", "green", "amber", "orange", "red", "purple", "pink"]).optional(),
  })).max(50).optional(),
  dependencies: z.array(z.object({
    dependsOnSubtaskIndexes: z.array(z.number().int().nonnegative()),
    subtaskIndex: z.number().int().nonnegative(),
  })).optional(),
  mainTask: taskDraftSchema,
  subtasks: z.array(taskDraftSchema),
});

const assessmentItemSchema = z.object({
  level: z.enum(["good", "needs-attention", "blocked"]),
  summary: z.string().min(1),
});

export const taskAssistantResponseSchema = z.object({
  assistantMessage: z.string().min(1),
  draft: taskPlanDraftSchema,
  missingInformation: z.array(z.object({
    field: z.string().min(1),
    question: z.string().min(1),
    reason: z.string().min(1),
  })),
  peopleRecommendations: z.array(z.object({
    memberId: z.string().min(1),
    reason: z.string().min(1),
    role: z.enum(["owner", "participant"]),
  })),
  qualityAssessment: z.object({
    goal: assessmentItemSchema,
    risks: z.array(z.string()),
    schedule: assessmentItemSchema,
    scope: assessmentItemSchema,
  }),
  readyToCreate: z.boolean(),
  resultSummary: z.string().min(1),
});

export const taskAssistantRequestSchema = z.object({
  currentDate: z.string().min(1),
  currentUserId: z.string().min(1),
  draft: taskPlanDraftSchema.nullable(),
  existingTasks: z.array(z.object({
    name: z.string(),
    ownerId: z.string(),
    status: z.string(),
  })).max(80),
  members: z.array(z.object({
    availability: z.string().optional().default(""),
    currentWork: z.array(z.string()).optional().default([]),
    dynamicResponsibility: z.string().optional().default(""),
    id: z.string(),
    name: z.string(),
    recentActivity: z.string().optional().default(""),
    role: z.string().optional().default(""),
  })).max(60),
  messages: z.array(z.object({
    content: z.string().min(1).max(8000),
    role: z.enum(["assistant", "user"]),
  })).min(1).max(40),
  tags: z.array(z.string()).max(100),
  timezone: z.string().min(1),
});

export type TaskAssistantRequest = z.infer<typeof taskAssistantRequestSchema>;
export type TaskAssistantResponse = z.infer<typeof taskAssistantResponseSchema>;
export type TaskAssistantMember = TaskAssistantRequest["members"][number];
export type TaskDraft = z.infer<typeof taskDraftSchema>;
export type TaskPlanDraft = z.infer<typeof taskPlanDraftSchema>;

export type TaskAssistantApiError = {
  code: "AUTH" | "INVALID_REQUEST" | "MODEL_FORMAT" | "NOT_CONFIGURED" | "RATE_LIMIT" | "TIMEOUT" | "UPSTREAM";
  message: string;
};

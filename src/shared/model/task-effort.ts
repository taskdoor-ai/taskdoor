import { z } from "zod";

// The effort estimate and its first observation, part of the task model: TaskEffortEstimate is inferred
// from its schema, so the schema is the model. Moved here unchanged from lib/taskEffort.ts and
// lib/taskEffortBaseline.ts (same split as TaskDoor apps/web shared/model/task-effort.ts).
export const minuteSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();

/** Expected total human input under the stated AI/tool method; excludes waiting and unattended runs. */
export const effortEstimateSchema = z.object({
  minutes: minuteSchema,
  workMethod: z.string(),
  basis: z.enum(["manual", "mock", "model", "unknown"]),
  reason: z.string(),
  confirmed: z.boolean(),
  scopeKey: z.string(),
  version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export type TaskEffortEstimate = z.infer<typeof effortEstimateSchema>;

/** Saved with creation; later estimates must not rewrite this first observation. */
export type TaskEffortBaseline = { at: string; minutes: number; scopeKey: string; version: number };

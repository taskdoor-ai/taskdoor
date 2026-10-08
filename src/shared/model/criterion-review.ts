// A completion criterion's review, part of the task model. Moved here unchanged from
// features/tasks/lib/task-criterion-review.ts (same split as TaskDoor apps/web).
export type CriterionReview = {
  text: string;
  analysis?: { percent: number | null; evidence: string; observedAt: string };
  confirmation?: { by: string; at: string };
};

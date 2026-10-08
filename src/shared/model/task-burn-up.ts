// Burn-up snapshots: part of the task model (TaskNode and TaskDetailContent carry them). Moved here
// unchanged from lib/taskBurnUp.ts.
/** EWD 快照；工时只汇总当前范围中的叶子，不包含父任务重复值。 */
export type TaskBurnUpPoint = {
  /** ISO 日期，或含 Z / 时区偏移的 ISO 时间戳。 */
  at: string;
  /** 覆盖不完整时仅表示已估子集；null 表示数值未知，不是零。 */
  scopeHours: number | null;
  completedHours: number | null;
  /** 当前范围中已确认 EWD 估算的叶子数，不能当作工时覆盖率。 */
  estimatedLeafCount: number;
  totalLeafCount: number;
  note?: string;
};

export type TaskBurnUpSeries = {
  source: "recorded" | "example";
  points: TaskBurnUpPoint[];
};

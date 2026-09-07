export type TaskCreationConversationRecord<TOutput, TCreatedPlan> = {
  createdPlan: TCreatedPlan | null;
  output: TOutput | null;
  pendingParentTaskId?: string;
};

export function buildTaskCreationConversationRecord<
  T extends TaskCreationConversationRecord<TOutput, TCreatedPlan>,
  TOutput,
  TCreatedPlan,
>(record: T, pendingParentTaskId: string | null): Omit<T, "pendingParentTaskId"> & { pendingParentTaskId?: string } {
  const { pendingParentTaskId: _discarded, ...base } = record;
  if (record.createdPlan || !record.output || !pendingParentTaskId?.trim()) return base;
  return { ...base, pendingParentTaskId };
}

export function restoreTaskCreationConversationState<TOutput, TCreatedPlan>(
  record: TaskCreationConversationRecord<TOutput, TCreatedPlan>,
): { pendingParentTaskId: string | null } {
  return {
    pendingParentTaskId: !record.createdPlan && record.output && typeof record.pendingParentTaskId === "string" && record.pendingParentTaskId.trim()
      ? record.pendingParentTaskId
      : null,
  };
}

type PinStorageReader = Pick<Storage, "getItem">;
type PinStorageWriter = Pick<Storage, "setItem">;

export function pinnedTaskStorageKey(_userId: string, _teamId: string) {
  return `agentdoor-pinned-tasks:${encodeURIComponent(_userId)}:${encodeURIComponent(_teamId)}`;
}

function normalizePinnedTaskIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
}

export function readPinnedTaskIds(storage: PinStorageReader, key: string): string[] {
  try {
    return normalizePinnedTaskIds(JSON.parse(storage.getItem(key) ?? "[]"));
  } catch {
    return [];
  }
}

export function writePinnedTaskIds(storage: PinStorageWriter, key: string, taskIds: readonly string[]) {
  storage.setItem(key, JSON.stringify(normalizePinnedTaskIds(taskIds)));
}

export function togglePinnedTaskId(taskIds: readonly string[], taskId: string): string[] {
  const current = normalizePinnedTaskIds(taskIds);
  return current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId];
}

export function partitionPinnedTasks<T extends { id: string }>(tasks: readonly T[], pinnedTaskIds: readonly string[]) {
  const pinnedIds = new Set(normalizePinnedTaskIds(pinnedTaskIds));
  return {
    pinned: tasks.filter(task => pinnedIds.has(task.id)),
    unpinned: tasks.filter(task => !pinnedIds.has(task.id)),
  };
}

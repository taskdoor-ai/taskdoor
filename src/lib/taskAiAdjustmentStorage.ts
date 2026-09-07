type TaskAiStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const TASK_AI_JOURNAL_KEY = "agentdoor-task-ai-adjustment-journal";

type JournalWrite = { key: string; before: string | null; after: string };
type TaskAiJournal = { version: 1; state: "prepared" | "committed"; writes: JournalWrite[] };

function validateKeys(keys: string[]): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (key === TASK_AI_JOURNAL_KEY) throw new Error("任务调整不能写入恢复记录自身。");
    if (seen.has(key)) throw new Error(`任务调整包含重复存储键：${key}。`);
    seen.add(key);
  }
}

function readValue(storage: TaskAiStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch (cause) {
    throw new Error(`无法读取任务调整存储（${key}），已停止操作。`, { cause });
  }
}

function assertJournal(storage: TaskAiStorage, expected: string | null): void {
  if (readValue(storage, TASK_AI_JOURNAL_KEY) !== expected) {
    throw new Error("任务调整恢复记录发生外部冲突，已停止覆盖或清理。");
  }
}

function parseJournal(raw: string): TaskAiJournal {
  const message = "任务调整恢复记录损坏或版本不受支持，已保留原始记录并停止恢复。";
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") throw new Error(message);
    const record = value as Partial<TaskAiJournal>;
    if (record.version !== 1 || !["prepared", "committed"].includes(record.state ?? "")
      || !Array.isArray(record.writes) || record.writes.length === 0) throw new Error(message);
    for (const entry of record.writes) {
      if (!entry || typeof entry !== "object" || typeof entry.key !== "string"
        || (entry.before !== null && typeof entry.before !== "string")
        || typeof entry.after !== "string") throw new Error(message);
    }
    validateKeys(record.writes.map(({ key }) => key));
    return record as TaskAiJournal;
  } catch (cause) {
    throw new Error(message, { cause });
  }
}

function conflict(key: string): Error {
  return new Error(`任务调整存储冲突：${key} 已被其他操作修改，不能覆盖外部更新。`);
}

function assertKnownValue(storage: TaskAiStorage, entry: JournalWrite): string | null {
  const current = readValue(storage, entry.key);
  if (current !== entry.before && current !== entry.after) throw conflict(entry.key);
  return current;
}

function verifyValues(storage: TaskAiStorage, journal: TaskAiJournal, side: "before" | "after"): void {
  for (const entry of journal.writes) {
    if (readValue(storage, entry.key) !== entry[side]) throw conflict(entry.key);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "存储操作失败。";
}

/** Restore only values still attributable to this journal; never clear all storage. */
function restoreValues(storage: TaskAiStorage, journal: TaskAiJournal, raw: string): void {
  const side = journal.state === "prepared" ? "before" : "after";
  const failures: unknown[] = [];
  for (const entry of journal.writes) {
    try {
      assertJournal(storage, raw);
      const current = assertKnownValue(storage, entry);
      const target = entry[side];
      if (current === target) continue;
      if (target === null) storage.removeItem(entry.key);
      else storage.setItem(entry.key, target);
    } catch (error) {
      // Keep recovering independent keys, but retain the journal if any key fails.
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new Error(`任务调整恢复未完成，已保留恢复记录。${errorMessage(failures[0])}`, {
      cause: new AggregateError(failures),
    });
  }
  verifyValues(storage, journal, side);
  assertJournal(storage, raw);
}

function cleanJournal(storage: TaskAiStorage, raw: string, committed: boolean): void {
  assertJournal(storage, raw);
  try {
    storage.removeItem(TASK_AI_JOURNAL_KEY);
  } catch (cause) {
    // committed is the durable success boundary. Cleanup alone may be retried.
    if (!committed) throw new Error("任务数据已恢复，但恢复记录清理失败，请重试恢复。", { cause });
  }
}

/** Call before loading any React state. A thrown error must block loading/editing. */
export function recoverTaskAiStorage(storage: TaskAiStorage): void {
  const raw = readValue(storage, TASK_AI_JOURNAL_KEY);
  if (raw === null) return;
  const journal = parseJournal(raw);
  restoreValues(storage, journal, raw);
  cleanJournal(storage, raw, journal.state === "committed");
}

/**
 * Synchronously persist a replacement snapshot before publishing it to React.
 * prepared is rolled back after failure/crash; committed keeps the new values.
 * This is a recovery journal, not cross-tab isolation or a storage-wide lock.
 */
export function commitTaskAiStorage(storage: TaskAiStorage, writes: Array<[string, string]>): void {
  if (writes.length === 0) return;
  validateKeys(writes.map(([key]) => key));
  recoverTaskAiStorage(storage);
  if (readValue(storage, TASK_AI_JOURNAL_KEY) !== null) {
    throw new Error("上次任务调整已保存，但恢复记录尚未清理，暂时不能开始新的调整。");
  }

  const journal: TaskAiJournal = {
    version: 1,
    state: "prepared",
    writes: writes.map(([key, after]) => ({ key, before: readValue(storage, key), after })),
  };
  const prepared = JSON.stringify(journal);
  const committed = JSON.stringify({ ...journal, state: "committed" });
  assertJournal(storage, null);
  try {
    storage.setItem(TASK_AI_JOURNAL_KEY, prepared);
  } catch (cause) {
    throw new Error("任务调整未保存：无法写入恢复记录，尚未开始写入任务数据。", { cause });
  }

  try {
    for (const entry of journal.writes) {
      assertJournal(storage, prepared);
      assertKnownValue(storage, entry);
      storage.setItem(entry.key, entry.after);
    }
    verifyValues(storage, journal, "after");
    assertJournal(storage, prepared);
    storage.setItem(TASK_AI_JOURNAL_KEY, committed);
  } catch (cause) {
    try {
      restoreValues(storage, journal, prepared);
      cleanJournal(storage, prepared, false);
    } catch (recoveryError) {
      throw new Error(`任务调整保存失败，恢复未完成；部分数据可能仍是调整后状态，请停止编辑并重试恢复。${errorMessage(recoveryError)}`, {
        cause: new AggregateError([cause, recoveryError]),
      });
    }
    throw new Error("任务调整保存失败，本次写入已回滚。", { cause });
  }

  cleanJournal(storage, committed, true);
}

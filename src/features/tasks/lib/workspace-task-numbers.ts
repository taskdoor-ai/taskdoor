const databaseName = "agentdoor-task-numbers";
const storeName = "taskNumbers";
const taskIdIndex = "taskId";

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(storeName, { autoIncrement: true });
      store.createIndex(taskIdIndex, "taskId", { unique: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      request.onsuccess = () => request.result.close();
      reject(new Error("Task number storage is blocked."));
    };
  });
}

/** A single transaction keeps lookup and allocation consistent across tabs. Entries are never recycled. */
export async function loadWorkspaceTaskNumbers(taskIds: string[], factory = globalThis.indexedDB): Promise<Map<string, number>> {
  const numbers = new Map<string, number>();
  if (!taskIds.length) return numbers;
  if (!factory) throw new Error("Task number storage is unavailable.");

  const database = await openDatabase(factory);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const index = store.index(taskIdIndex);
      transaction.oncomplete = () => resolve(numbers);
      transaction.onabort = () => reject(transaction.error ?? new Error("Task number allocation failed."));

      for (const taskId of new Set(taskIds)) {
        const remember = (key: IDBValidKey) => {
          if (typeof key !== "number" || !Number.isSafeInteger(key) || key < 1) {
            transaction.abort();
            return;
          }
          numbers.set(taskId, key);
        };
        const existing = index.getKey(taskId);
        existing.onsuccess = () => {
          if (existing.result !== undefined) {
            remember(existing.result);
            return;
          }
          const created = store.add({ taskId });
          created.onsuccess = () => remember(created.result);
        };
      }
    });
  } finally {
    database.close();
  }
}

import assert from "node:assert/strict";
import test from "node:test";
import { partitionPinnedTasks, pinnedTaskStorageKey, readPinnedTaskIds, togglePinnedTaskId, writePinnedTaskIds } from "../src/lib/taskPins.ts";

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test("置顶记录按用户和团队隔离，并忽略损坏或重复的任务 id", () => {
  const key = pinnedTaskStorageKey("user:a", "team:one");
  const storage = memoryStorage({ [key]: JSON.stringify(["task-2", "task-2", "", 3, "task-1"]) });
  assert.notEqual(key, pinnedTaskStorageKey("user:a", "team:two"));
  assert.notEqual(key, pinnedTaskStorageKey("user:b", "team:one"));
  assert.deepEqual(readPinnedTaskIds(storage, key), ["task-2", "task-1"]);
});

test("点击图钉可置顶和取消置顶，并持久化当前结果", () => {
  const storage = memoryStorage();
  const key = pinnedTaskStorageKey("me", "team");
  const pinned = togglePinnedTaskId(["task-1"], "task-2");
  assert.deepEqual(pinned, ["task-1", "task-2"]);
  const unpinned = togglePinnedTaskId(pinned, "task-1");
  assert.deepEqual(unpinned, ["task-2"]);
  writePinnedTaskIds(storage, key, unpinned);
  assert.deepEqual(readPinnedTaskIds(storage, key), ["task-2"]);
});

test("置顶任务单独展示在顶部，未置顶列表保留原排序且不重复", () => {
  const tasks = [{ id: "task-1" }, { id: "task-2" }, { id: "task-3" }];
  assert.deepEqual(partitionPinnedTasks(tasks, ["task-3", "missing", "task-1"]), {
    pinned: [tasks[0], tasks[2]],
    unpinned: [tasks[1]],
  });
});

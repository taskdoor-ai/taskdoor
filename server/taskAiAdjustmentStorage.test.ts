import assert from "node:assert/strict";
import test from "node:test";
import {
  commitTaskAiStorage,
  recoverTaskAiStorage,
  TASK_AI_JOURNAL_KEY,
} from "../src/lib/taskAiAdjustmentStorage.ts";

type Mutation = { kind: "set" | "remove"; key: string; value?: string };

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  readonly values: Map<string, string>;
  readonly mutations: Mutation[] = [];
  readonly reads: string[] = [];
  failMutation?: (mutation: Mutation, index: number) => boolean;
  beforeRead?: (key: string) => void;
  afterMutation?: (mutation: Mutation) => void;

  constructor(entries: Iterable<readonly [string, string]> = []) {
    this.values = new Map(entries);
  }

  getItem(key: string): string | null {
    this.reads.push(key);
    this.beforeRead?.(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.mutate({ kind: "set", key, value }, () => this.values.set(key, value));
  }

  removeItem(key: string): void {
    this.mutate({ kind: "remove", key }, () => this.values.delete(key));
  }

  private mutate(mutation: Mutation, apply: () => unknown): void {
    this.mutations.push(mutation);
    if (this.failMutation?.(mutation, this.mutations.length)) throw new Error("storage unavailable");
    apply();
    this.afterMutation?.(mutation);
  }
}

const initial: Array<[string, string]> = [
  ["tasks", '[{"id":"existing"}]'],
  ["activity", '[{"id":"previous-event"}]'],
  ["seed", "7"],
  ["unrelated-settings", "keep-me"],
];
const writes: Array<[string, string]> = [
  ["tasks", '[{"id":"existing"},{"id":"new-task"}]'],
  ["activity", '[{"id":"previous-event"},{"id":"new-event"}]'],
  ["seed", "8"],
  ["proposals", '[{"id":"proposal","status":"applied"}]'],
];

function journal(state: "prepared" | "committed", entries = writes): string {
  const before = new Map(initial);
  return JSON.stringify({
    version: 1,
    state,
    writes: entries.map(([key, after]) => ({ key, before: before.get(key) ?? null, after })),
  });
}

function finalValues(): Map<string, string> {
  return new Map([...initial, ...writes]);
}

test("成组写入任务、活动、种子与提案后才标记提交并清理 journal", () => {
  const storage = new MemoryStorage(initial);
  const persisted: Array<Map<string, string>> = [];
  storage.afterMutation = () => persisted.push(new Map(storage.values));

  commitTaskAiStorage(storage, writes);

  assert.equal(TASK_AI_JOURNAL_KEY, "agentdoor-task-ai-adjustment-journal");
  assert.deepEqual(storage.values, finalValues());
  assert.deepEqual(JSON.parse(persisted[0].get(TASK_AI_JOURNAL_KEY)!), JSON.parse(journal("prepared")));
  const committed = persisted.find((snapshot) => {
    const raw = snapshot.get(TASK_AI_JOURNAL_KEY);
    return raw && JSON.parse(raw).state === "committed";
  });
  assert.ok(committed, "所有数据保存成功后必须先持久化 committed journal");
  for (const [key, value] of writes) assert.equal(committed.get(key), value);
  assert.equal(storage.mutations.at(-1)?.key, TASK_AI_JOURNAL_KEY);
  assert.equal(storage.mutations.at(-1)?.kind, "remove");
});

test("空写入完全不访问存储，也不干扰既有 journal", () => {
  const storage = new MemoryStorage([[TASK_AI_JOURNAL_KEY, "do-not-touch"]]);

  commitTaskAiStorage(storage, []);

  assert.deepEqual(storage.reads, []);
  assert.deepEqual(storage.mutations, []);
  assert.equal(storage.values.get(TASK_AI_JOURNAL_KEY), "do-not-touch");
});

test("没有 journal 时恢复不写入或删除任何键", () => {
  const storage = new MemoryStorage(initial);

  recoverTaskAiStorage(storage);

  assert.deepEqual(storage.values, new Map(initial));
  assert.deepEqual(storage.mutations, []);
});

for (const [name, invalid] of [
  ["重复键", [["tasks", "one"], ["tasks", "two"]]],
  ["journal 自身", [[TASK_AI_JOURNAL_KEY, "unsafe"]]],
] as const) {
  test(`在访问存储前拒绝${name}`, () => {
    const storage = new MemoryStorage(initial);

    assert.throws(() => commitTaskAiStorage(storage, invalid.map(([key, value]) => [key, value])), /重复|恢复记录|journal/);

    assert.deepEqual(storage.reads, []);
    assert.deepEqual(storage.mutations, []);
    assert.deepEqual(storage.values, new Map(initial));
  });
}

for (let failurePoint = 1; failurePoint <= writes.length + 2; failurePoint += 1) {
  test(`第 ${failurePoint} 个关键写入失败后回滚，保留无关键且删除本次新增键`, () => {
    const storage = new MemoryStorage(initial);
    storage.failMutation = (_mutation, index) => index === failurePoint;

    assert.throws(() => commitTaskAiStorage(storage, writes), /保存|写入|调整/);

    assert.deepEqual(storage.values, new Map(initial));
    assert.ok(storage.mutations.every((mutation) => mutation.key !== "unrelated-settings"));
    assert.ok(storage.mutations.every((mutation) => mutation.kind !== "remove" || [TASK_AI_JOURNAL_KEY, "proposals"].includes(mutation.key)));
  });
}

test("回滚写入再次失败时保留 prepared journal，之后恢复可重试", () => {
  const storage = new MemoryStorage(initial);
  storage.failMutation = (mutation) => mutation.kind === "set" && (
    (mutation.key === "seed" && mutation.value === "8")
    || (mutation.key === "tasks" && mutation.value === initial[0][1])
  );

  assert.throws(() => commitTaskAiStorage(storage, writes), /恢复未完成|未能完全恢复|回滚未完成/);
  assert.equal(JSON.parse(storage.values.get(TASK_AI_JOURNAL_KEY)!).state, "prepared");
  assert.equal(storage.values.get("tasks"), writes[0][1]);
  assert.equal(storage.values.get("unrelated-settings"), "keep-me");

  storage.failMutation = undefined;
  recoverTaskAiStorage(storage);
  assert.deepEqual(storage.values, new Map(initial));
  const mutationCount = storage.mutations.length;
  recoverTaskAiStorage(storage);
  assert.equal(storage.mutations.length, mutationCount);
});

test("回滚删除新增键失败时保留恢复信息，不删除原有或无关键", () => {
  const storage = new MemoryStorage(initial);
  storage.failMutation = (mutation) => (
    mutation.kind === "set" && mutation.key === TASK_AI_JOURNAL_KEY && JSON.parse(mutation.value!).state === "committed"
  ) || (mutation.kind === "remove" && mutation.key === "proposals");

  assert.throws(() => commitTaskAiStorage(storage, writes), /恢复未完成|未能完全恢复|回滚未完成/);
  assert.equal(storage.values.get("proposals"), writes[3][1]);
  assert.equal(JSON.parse(storage.values.get(TASK_AI_JOURNAL_KEY)!).state, "prepared");
  assert.equal(storage.values.get("unrelated-settings"), "keep-me");

  storage.failMutation = undefined;
  recoverTaskAiStorage(storage);
  assert.deepEqual(storage.values, new Map(initial));
});

test("prepared 已回滚但清理失败会明确报错并允许下一次恢复清理", () => {
  const storage = new MemoryStorage(initial);
  storage.failMutation = (mutation) => (
    mutation.kind === "set" && mutation.key === "seed" && mutation.value === "8"
  ) || (mutation.kind === "remove" && mutation.key === TASK_AI_JOURNAL_KEY);

  assert.throws(() => commitTaskAiStorage(storage, writes), /恢复未完成|未能完全恢复|清理/);
  const retained = storage.values.get(TASK_AI_JOURNAL_KEY);
  assert.ok(retained);
  assert.deepEqual(new Map([...storage.values].filter(([key]) => key !== TASK_AI_JOURNAL_KEY)), new Map(initial));

  storage.failMutation = undefined;
  recoverTaskAiStorage(storage);
  assert.deepEqual(storage.values, new Map(initial));
});

test("每个真实持久化检查点在刷新后按 prepared 回滚或 committed 保留，且恢复幂等", () => {
  const storage = new MemoryStorage(initial);
  const checkpoints: Array<Map<string, string>> = [];
  storage.afterMutation = () => checkpoints.push(new Map(storage.values));
  commitTaskAiStorage(storage, writes);

  assert.equal(checkpoints.length, writes.length + 3);
  for (const checkpoint of checkpoints) {
    const recovered = new MemoryStorage(checkpoint);
    const rawJournal = checkpoint.get(TASK_AI_JOURNAL_KEY);
    const expected = rawJournal && JSON.parse(rawJournal).state === "prepared" ? new Map(initial) : finalValues();

    recoverTaskAiStorage(recovered);
    assert.deepEqual(recovered.values, expected);
    recoverTaskAiStorage(recovered);
    assert.deepEqual(recovered.values, expected);
    const tasks = JSON.parse(recovered.values.get("tasks")!) as Array<{ id: string }>;
    assert.equal(tasks.filter((task) => task.id === "new-task").length, expected.get("seed") === "8" ? 1 : 0);
  }
});

test("committed 只清理失败仍算成功，恢复保留新值且可反复重试清理", () => {
  const storage = new MemoryStorage(initial);
  storage.failMutation = (mutation) => mutation.kind === "remove" && mutation.key === TASK_AI_JOURNAL_KEY;

  assert.doesNotThrow(() => commitTaskAiStorage(storage, writes));
  assert.equal(JSON.parse(storage.values.get(TASK_AI_JOURNAL_KEY)!).state, "committed");
  for (const [key, value] of writes) assert.equal(storage.values.get(key), value);
  assert.doesNotThrow(() => recoverTaskAiStorage(storage));
  assert.ok(storage.values.has(TASK_AI_JOURNAL_KEY));

  storage.failMutation = undefined;
  recoverTaskAiStorage(storage);
  assert.deepEqual(storage.values, finalValues());
  recoverTaskAiStorage(storage);
  assert.deepEqual(storage.values, finalValues());
});

test("未能清理的上次 committed journal 不会被新的提交覆盖", () => {
  const rawJournal = journal("committed");
  const storage = new MemoryStorage([...finalValues(), [TASK_AI_JOURNAL_KEY, rawJournal]]);
  storage.failMutation = (mutation) => mutation.kind === "remove" && mutation.key === TASK_AI_JOURNAL_KEY;

  assert.throws(() => commitTaskAiStorage(storage, [["tasks", "another-update"]]), /清理|恢复记录/);

  assert.equal(storage.values.get(TASK_AI_JOURNAL_KEY), rawJournal);
  assert.equal(storage.values.get("tasks"), writes[0][1]);
  assert.ok(storage.mutations.every((mutation) => mutation.kind === "remove" && mutation.key === TASK_AI_JOURNAL_KEY));
});

test("开始新提交前恢复上次 prepared journal，重试不会重复新增任务或事件", () => {
  const storage = new MemoryStorage([...finalValues(), [TASK_AI_JOURNAL_KEY, journal("prepared")]]);

  commitTaskAiStorage(storage, writes);

  assert.deepEqual(storage.values, finalValues());
  assert.equal((JSON.parse(storage.values.get("tasks")!) as Array<{ id: string }>).filter(({ id }) => id === "new-task").length, 1);
  assert.equal((JSON.parse(storage.values.get("activity")!) as Array<{ id: string }>).filter(({ id }) => id === "new-event").length, 1);
});

test("committed 恢复只把仍匹配 before 的值补到 after", () => {
  const storage = new MemoryStorage([...initial, [TASK_AI_JOURNAL_KEY, journal("committed")]]);

  recoverTaskAiStorage(storage);

  assert.deepEqual(storage.values, finalValues());
});

for (const state of ["prepared", "committed"] as const) {
  test(`${state} 恢复不覆盖与 before/after 均不同的外部更新`, () => {
    const rawJournal = journal(state);
    const storage = new MemoryStorage([...finalValues(), ["tasks", "external-update"], [TASK_AI_JOURNAL_KEY, rawJournal]]);

    assert.throws(() => recoverTaskAiStorage(storage), /冲突|其他.*修改|外部/);

    assert.equal(storage.values.get("tasks"), "external-update");
    assert.equal(storage.values.get(TASK_AI_JOURNAL_KEY), rawJournal);
    assert.equal(storage.values.get("unrelated-settings"), "keep-me");
    assert.ok(storage.mutations.every((mutation) => mutation.key !== "tasks"));
  });
}

test("提交途中发现外部更新时拒绝覆盖，保留 journal 并说明恢复未完成", () => {
  const storage = new MemoryStorage(initial);
  storage.afterMutation = (mutation) => {
    if (mutation.key === "tasks") storage.values.set("activity", "external-update");
  };

  assert.throws(() => commitTaskAiStorage(storage, writes), /恢复未完成|未能完全恢复|回滚未完成/);

  assert.equal(storage.values.get("activity"), "external-update");
  assert.ok(storage.values.has(TASK_AI_JOURNAL_KEY));
  assert.ok(storage.mutations.every((mutation) => mutation.key !== "activity"));
});

test("新的提交不覆盖含外部冲突的上次 journal", () => {
  const rawJournal = journal("prepared");
  const storage = new MemoryStorage([...finalValues(), ["tasks", "external-update"], [TASK_AI_JOURNAL_KEY, rawJournal]]);

  assert.throws(() => commitTaskAiStorage(storage, [["another-task-key", "new-value"]]), /冲突|外部/);

  assert.equal(storage.values.get(TASK_AI_JOURNAL_KEY), rawJournal);
  assert.equal(storage.values.get("tasks"), "external-update");
  assert.equal(storage.values.has("another-task-key"), false);
});

test("原值读取失败时不开始写入，错误提供中文上下文", () => {
  const storage = new MemoryStorage(initial);
  storage.beforeRead = (key) => { if (key === "activity") throw new Error("storage unavailable"); };

  assert.throws(() => commitTaskAiStorage(storage, writes), /读取|保存|调整/);

  assert.deepEqual(storage.values, new Map(initial));
  assert.deepEqual(storage.mutations, []);
});

test("journal 读取失败时停止恢复，不把存储不可用误当成空存储", () => {
  const storage = new MemoryStorage(initial);
  storage.beforeRead = () => { throw new Error("storage unavailable"); };

  assert.throws(() => recoverTaskAiStorage(storage), /读取|恢复/);

  assert.deepEqual(storage.values, new Map(initial));
  assert.deepEqual(storage.mutations, []);
});

for (const invalidJournal of [
  "{broken-json",
  JSON.stringify({ version: 2, state: "prepared", writes: [] }),
  JSON.stringify({ version: 1, state: "invalid", writes: [] }),
  JSON.stringify({ version: 1, state: "prepared", writes: [{ key: "tasks", before: 1, after: "new" }] }),
  JSON.stringify({ version: 1, state: "prepared", writes: [{ key: TASK_AI_JOURNAL_KEY, before: null, after: "unsafe" }] }),
  JSON.stringify({ version: 1, state: "prepared", writes: [{ key: "tasks", before: null, after: "one" }, { key: "tasks", before: null, after: "two" }] }),
]) {
  test(`损坏或不受支持的 journal 保留原文且不修改任何数据：${invalidJournal}`, () => {
    const storage = new MemoryStorage([...initial, [TASK_AI_JOURNAL_KEY, invalidJournal]]);

    assert.throws(() => recoverTaskAiStorage(storage), /恢复记录|journal/);

    assert.equal(storage.values.get(TASK_AI_JOURNAL_KEY), invalidJournal);
    assert.deepEqual(storage.mutations, []);
  });
}

test('large task snapshots fit a quota without duplicating full before/after recovery data', () => {
  const before = JSON.stringify(Array.from({length:1000},(_,id)=>({id,text:'场地、流程与宣传物料 😀',confirmed:false})));
  const after = before.replace('false','true');
  const storage = new MemoryStorage([['tasks',before]]);
  let prepared = '';
  let committed = '';
  storage.failMutation = mutation => {
    const next = new Map(storage.values);
    if(mutation.kind==='set') next.set(mutation.key,mutation.value!); else next.delete(mutation.key);
    return [...next.values()].reduce((n,value)=>n+value.length,0) > before.length * 2;
  };
  storage.afterMutation = mutation => {
    if(mutation.key!==TASK_AI_JOURNAL_KEY || mutation.kind!=='set') return;
    if(JSON.parse(mutation.value!).state==='prepared') prepared=mutation.value!; else committed=mutation.value!;
  };
  commitTaskAiStorage(storage,[['tasks',after]]);
  assert.equal(storage.getItem('tasks'),after);
  assert.equal(JSON.parse(prepared).version,2);
  const interrupted = new MemoryStorage([['tasks',after],[TASK_AI_JOURNAL_KEY,prepared]]);
  recoverTaskAiStorage(interrupted);
  assert.equal(interrupted.getItem('tasks'),before);
  const completed = new MemoryStorage([['tasks',before],[TASK_AI_JOURNAL_KEY,committed]]);
  recoverTaskAiStorage(completed);
  assert.equal(completed.getItem('tasks'),after);
});

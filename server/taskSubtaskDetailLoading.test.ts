import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transformSync } from "esbuild";

function createHandler(create: (draft: object) => string) {
  const source = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const createSubtaskFromList =");
  const end = source.indexOf("\n  };", start);
  assert.ok(start >= 0 && end > start, "子任务列表创建应使用详情加载承接");
  const code = transformSync(source.slice(start, end + 5), { loader: "ts", target: "es2022" }).code;
  let finishPaint!: () => void;
  const paint = new Promise<void>(resolve => { finishPaint = resolve; });
  let finishGeneration!: (draft: object) => void;
  let failGeneration!: (error: Error) => void;
  const generated = new Promise<object>((resolve, reject) => { finishGeneration = resolve; failGeneration = reject; });
  const requests: any[] = [];
  const storage = new Map([["tasks", JSON.stringify([{ kind: "task", id: "parent", teamId: "team" }])]]);
  const states: unknown[] = [];
  const opened: string[] = [];
  const attempt = { current: null as AbortController | null };
  const bindings = {
    selectedTaskId: "parent", activeTeamId: "team", currentUserId: "member", locale: "zh-CN",
    selectedTaskDetail: { title: "准备发布", goal: "明确发布条件", completionCriteria: ["材料完成终审"] },
    canCreateSubtask: true, validTeamTimeZone: true, activeTeamTimeZone: "Asia/Shanghai",
    collaborationMembers: [{ id: "member", name: "当前用户" }], tagDefinitions: [{ name: "发布" }],
    workspaceNodesStorageKey: "tasks", workspaceNodesRef: { current: JSON.parse(storage.get("tasks")!) },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null },
    loadPersonalCenterState: () => ({ teams: [{ id: "team" }] }), activeMembership: () => true,
    taskDateValue: () => "2026-11-05",
    quickCreationAttempt: attempt,
    setPendingTaskDetail: (value: unknown) => states.push(value),
    waitForTaskDetailPaint: (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      void paint.then(resolve);
    }),
    generateSubtaskFromPrompt: (input: object, signal: AbortSignal) => {
      requests.push(input);
      signal.addEventListener("abort", () => failGeneration(new DOMException("Aborted", "AbortError")), { once: true });
      return generated;
    },
    createInlineSubtask: create, openTask: (id: string) => opened.push(id),
  };
  const run = new Function(...Object.keys(bindings), `${code}; return createSubtaskFromList;`)(...Object.values(bindings)) as (draft: object) => Promise<void>;
  return { run, finishPaint, finishGeneration, failGeneration, requests, storage, states, opened, attempt };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const result = { title: "终审发布材料", goal: "确保发布内容准确可用", completionCriteria: ["材料中的状态词与服务名称已交叉核对"], ownerId: "", participantIds: [], labels: [], endDate: "" };

test("子任务输入作为生成需求，等待期间不保存，完成后保存生成的信息并打开新详情", async () => {
  const calls: object[] = [];
  const state = createHandler(draft => { calls.push(draft); return "new-child"; });
  const draft = { title: "核对清单", completionCriteria: [] };
  const pending = state.run(draft);
  assert.deepEqual(state.states, [{ teamId: "team", parentTaskId: "parent" }]);
  assert.deepEqual(calls, []);
  assert.deepEqual(state.opened, []);
  state.finishPaint();
  await flush();
  assert.equal(state.requests.length, 1, "必须先生成，不能直接把输入原文保存为名称");
  assert.deepEqual(calls, []);
  assert.equal(state.requests[0].prompt, draft.title);
  assert.deepEqual(state.requests[0].parentTask, { id: "parent", title: "准备发布", goal: "明确发布条件", completionCriteria: ["材料完成终审"] });
  state.finishGeneration(result);
  await pending;
  assert.deepEqual(calls, [{ ...result, participantIds: ["member"] }]);
  assert.deepEqual(state.opened, ["new-child"]);
  assert.equal(state.states.at(-1), null);
  assert.equal(state.attempt.current, null);
});

test("保存失败结束loading并拒绝原提交，保留草稿且不跳转", async () => {
  const state = createHandler(() => { throw new Error("保存失败"); });
  const draft = { title: "保留原输入", goal: "目标", completionCriteria: [] };
  const before = structuredClone(draft);
  const pending = state.run(draft);
  state.finishPaint();
  await flush();
  assert.equal(state.requests.length, 1);
  state.finishGeneration(result);
  await assert.rejects(pending, /保存失败/);
  assert.deepEqual(draft, before);
  assert.deepEqual(state.opened, []);
  assert.equal(state.states.at(-1), null);
  assert.equal(state.attempt.current, null);
});

test("生成失败保留原需求且不创建空白任务或原文标题任务", async () => {
  const state = createHandler(() => assert.fail("生成失败不得保存"));
  const draft = { title: "请帮我准备发布材料并核对译文", completionCriteria: [] };
  const pending = state.run(draft);
  state.finishPaint();
  await flush();
  assert.equal(state.requests.length, 1);
  state.failGeneration(new Error("生成暂不可用"));
  await assert.rejects(pending, /生成暂不可用/);
  assert.equal(draft.title, "请帮我准备发布材料并核对译文");
  assert.deepEqual(state.opened, []);
  assert.equal(state.states.at(-1), null);
});

test("生成中取消后迟到结果不创建任务，重复提交也不会启动第二次生成", async () => {
  const state = createHandler(() => assert.fail("取消后不得保存"));
  const pending = state.run({ title: "核对发布资料" });
  state.finishPaint();
  await flush();
  assert.equal(state.requests.length, 1);
  await assert.rejects(state.run({ title: "重复输入" }), /暂时无法创建/);
  state.attempt.current!.abort();
  await assert.rejects(pending, error => error instanceof Error && error.name === "AbortError");
  state.finishGeneration(result);
  assert.deepEqual(state.opened, []);
  assert.equal(state.states.at(-1), null);
});

test("生成期间父任务记录变化时拒绝保存，保留输入重新核对", async () => {
  const state = createHandler(() => assert.fail("上下文变化后不得保存"));
  const pending = state.run({ title: "核对发布资料" });
  state.finishPaint();
  await flush();
  assert.equal(state.requests.length, 1);
  state.storage.set("tasks", "[]");
  state.finishGeneration(result);
  await assert.rejects(pending, /任务已.*更新/);
  assert.deepEqual(state.opened, []);
  assert.equal(state.states.at(-1), null);
});

test("等待绘制期间离开创建上下文会中止，不创建或打开旧任务", async () => {
  const state = createHandler(() => assert.fail("取消后不得保存"));
  const pending = state.run({ title: "不应创建" });
  state.attempt.current!.abort();
  await assert.rejects(pending, error => error instanceof Error && error.name === "AbortError");
  state.finishPaint();
  assert.deepEqual(state.opened, []);
  assert.equal(state.states.at(-1), null);
});

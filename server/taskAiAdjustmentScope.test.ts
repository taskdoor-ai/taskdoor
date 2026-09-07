import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedAgentChatInput } from "../src/components/AnimatedAgentChatInput.tsx";
import { TaskAiAdjustmentPopover, useTaskAiAdjustmentDrafts } from "../src/components/TaskAiAdjustmentPopover.tsx";
import { TaskCreationHistory } from "../src/components/TaskCreationHistory.tsx";
import { buildTaskAiAdjustment, buildTaskAiCreationAdjustment } from "../src/lib/taskAiAdjustment.ts";
import { emptyTaskAiAdjustmentDraft, getTaskAiAdjustmentDraftKey, taskAiAdjustmentDraftReducer } from "../src/lib/taskAiAdjustmentDrafts.ts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProgress, TaskAiAdjustmentScope, TaskAiEditableTask } from "../src/lib/taskAiAdjustmentTypes.ts";
import type { CreationProcess } from "../src/lib/taskCreationProgress.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type Element = ReactElement<Record<string, any>>;
type Props = Parameters<typeof TaskAiAdjustmentPopover>[0];

function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}

// Inspect the real component with React's hook dispatcher; the portal needs a browser.
function capture(render: () => ReactNode, interact?: (tree: ReactNode) => void): ReactNode {
  let tree: ReactNode = null;
  function Capture() {
    tree = render();
    interact?.(tree);
    return null;
  }
  renderToStaticMarkup(createElement(Capture));
  return tree;
}

function installFrameClock() {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let nextId = 0;
  const callbacks = new Map<number, (time: number) => void>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    requestAnimationFrame(callback: (time: number) => void) { const id = ++nextId; callbacks.set(id, callback); return id; },
    cancelAnimationFrame(id: number) { callbacks.delete(id); },
  } });
  return {
    flushFrame() {
      const frame = [...callbacks.entries()];
      callbacks.clear();
      frame.forEach(([id, callback]) => callback(id * 16));
    },
    restore() {
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else Reflect.deleteProperty(globalThis, "window");
    },
  };
}

const task = (id: string, title: string): TaskAiEditableTask => ({
  id, title, goal: "形成可核对的交付结果", completionCriteria: ["交付物已核对"], executionTips: [],
  ownerId: "member-1", participantIds: [], startDate: "", endDate: "", dependsOnTaskIds: [],
});
const context: TaskAiAdjustmentContext = {
  mode: "draft", currentUserId: "member-1", task: task("main", "发布计划"),
  subtasks: [task("child:甲", "核对交付"), task("child:乙", "核对交付")],
  members: [{ id: "member-1", name: "林洁" }], dependencyTasks: [], canAddSubtasks: true,
};
const key = (scope: TaskAiAdjustmentScope) => getTaskAiAdjustmentDraftKey(context.mode, context.task.id, scope);
const base: Props = {
  context, scope: { kind: "task" }, open: true, onOpenChange: () => undefined,
  onApply: () => undefined, anchor: null, draftSession: [{}, () => undefined],
};
const select = (tree: ReactNode) => {
  const controls = elements(tree, node => node.type === "select");
  assert.equal(controls.length, 1);
  return controls[0];
};
const options = (tree: ReactNode) => elements(select(tree), node => node.type === "option");
const input = (tree: ReactNode) => elements(tree, node => node.type === AnimatedAgentChatInput || node.props.id?.endsWith("-input"))[0];
const changeInput = (tree: ReactNode, value: string) => {
  const control = input(tree);
  if (control.type === AnimatedAgentChatInput) control.props.onChange(value);
  else control.props.onChange({ target: { value } });
};
const choose = (tree: ReactNode, scope: TaskAiAdjustmentScope) => select(tree).props.onChange({ target: { value: key(scope) } });

test("仅提供范围切换回调的浮层显示选择器，原详情仍显示固定范围", () => {
  const fixed = capture(() => TaskAiAdjustmentPopover(base));
  assert.equal(elements(fixed, node => node.type === "select").length, 0);
  assert.equal(elements(fixed, node => node.props["aria-label"] === "调整范围").length, 1);
  const selectable = capture(() => TaskAiAdjustmentPopover({ ...base, onScopeChange: () => undefined }));
  const control = select(selectable);
  const label = elements(selectable, node => node.type === "label" && node.props.htmlFor === control.props.id)[0];
  assert.ok(label, "范围选择必须有可访问标签");
  assert.deepEqual(options(selectable).map(option => option.props.children), ["任务信息", "子任务安排", "子任务 1：核对交付", "子任务 2：核对交付"]);
});

test("创建简洁浮层只展示输入，预览保留明确目标而不展示范围栏", () => {
  const uniqueContext = { ...context, subtasks: [context.subtasks[0]] };
  const instruction = "子任务「核对交付」：增加完成标准：检查记录已归档";
  const result = buildTaskAiCreationAdjustment(uniqueContext, instruction);
  assert.ok("proposal" in result);
  const draftSession: Props["draftSession"] = [{ [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction, proposal: result.proposal } }, () => undefined];
  const tree = capture(() => TaskAiAdjustmentPopover({ ...base, context: uniqueContext, compactCreation: true, scope: { kind: "subtasks" }, draftSession, onScopeChange: () => undefined }));
  assert.equal(elements(tree, node => node.type === "select" || node.props.className === "task-ai-adjust-header" || node.props["aria-label"] === "调整范围").length, 0);
  assert.equal(input(tree).props.value, instruction, "统一输入不随着子任务指令改变草稿键");
  assert.equal(elements(tree, node => node.props["aria-label"] === "收起 AI 帮你改").length, 1);
  assert.equal(elements(tree, node => node.props["aria-label"] === "快捷调整").length, 0);
  const field = elements(tree, node => node.props.className === "task-ai-adjust-field")[0];
  assert.equal(elements(field, node => node.type === "span")[0].props.children, "核对交付");
  const saved = capture(() => TaskAiAdjustmentPopover({ ...base, context: { ...context, mode: "saved" }, compactCreation: true }));
  assert.equal(elements(saved, node => node.props["aria-label"] === "调整范围").length, 1, "简洁入口只影响创建页，已有任务仍保留固定范围");
});

test("创建简洁浮层展示本次创建历史，并把继续输入固定在独立 composer", () => {
  const processes: CreationProcess[] = [{
    id: 1, title: "初次生成", request: "最初需求", answers: {}, steps: [], activeStep: 0,
    status: "completed", responseSummary: "已生成候选方案。",
  }];
  const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true, history: processes }));
  const historyElement = elements(tree, node => node.type === TaskCreationHistory)[0];
  assert.ok(historyElement);
  assert.equal(historyElement.props.processes, processes);
  assert.equal(elements(tree, node => node.props.className === "task-ai-adjust-conversation-composer").length, 1);
  assert.equal(elements(tree, node => node.props.className === "task-ai-adjust-conversation-header").length, 1);
  assert.equal(input(tree).props.placeholder.includes("继续"), true);
});

test("创建简洁浮层关闭再打开保留统一输入，不写入任务也不丢弃草稿", () => {
  let step = 0;
  let reopen: () => void = () => undefined;
  let applied = 0;
  const tree = capture(() => {
    const [open, setOpen] = useState(true);
    reopen = () => setOpen(true);
    const draftSession = useTaskAiAdjustmentDrafts();
    return TaskAiAdjustmentPopover({ ...base, compactCreation: true, open, onOpenChange: setOpen, onApply: () => { applied++; }, draftSession });
  }, node => {
    switch (step++) {
      case 0: changeInput(node, "子任务「核对交付」：增加完成标准：记录已归档"); break;
      case 1: elements(node, item => item.props["aria-label"] === "收起 AI 帮你改")[0].props.onClick(); break;
      case 2: reopen(); break;
    }
  });
  assert.equal(input(tree).props.value, "子任务「核对交付」：增加完成标准：记录已归档");
  assert.equal(applied, 0);
});

test("未知要求先保留一帧同轮运行状态，再失败且保留输入", async () => {
  const frames = installFrameClock();
  const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
  let resolveFailed!: () => void;
  const failed = new Promise<void>(resolve => { resolveFailed = resolve; });
  let applied = 0;
  const instruction = "子任务「不存在」：负责人改为林洁";
  let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction } };
  try {
    const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true, onApply: () => { applied++; },
      draftSession: [drafts, action => { drafts = taskAiAdjustmentDraftReducer(drafts, action); }],
      onProgressChange: (progress, stop) => { events.push({ progress, stop }); if (progress.status === "failed") resolveFailed(); },
    }));
    elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    assert.equal(events[0].progress.status, "running");
    assert.equal(events.length, 1, "无效结果不能与 running 在同一同步批次发布");
    frames.flushFrame();
    await Promise.resolve();
    assert.equal(events.length, 1, "第一帧后仍须保留 running，才能实际绘制 loading");
    frames.flushFrame();
    await failed;
    assert.equal(events.at(-1)?.progress.status, "failed");
    assert.equal(new Set(events.map(event => event.progress.id)).size, 1);
    assert.equal(events[0].progress.taskId, context.task.id);
    assert.match(events.at(-1)!.progress.outcome!, /未找到.*精确名称/);
    assert.equal(events.at(-1)?.stop, undefined);
    assert.equal(drafts[key({ kind: "task" })].instruction, instruction);
    assert.equal(drafts[key({ kind: "task" })].proposal, null);
    assert.equal(applied, 0);
  } finally { frames.restore(); }
});

test("继续对话重新生成完成标准时先展示同轮 loading，再返回成功候选", async () => {
  const frames = installFrameClock();
  const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
  let resolveSettled!: () => void;
  const settled = new Promise<void>(resolve => { resolveSettled = resolve; });
  const instruction = "重新生成完成标准";
  let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction } };
  try {
    const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true,
      draftSession: [drafts, action => { drafts = taskAiAdjustmentDraftReducer(drafts, action); }],
      onProgressChange: (progress, stop) => {
        events.push({ progress, stop });
        if (progress.status !== "running") resolveSettled();
      },
    }));
    elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    assert.equal(events[0].progress.status, "running");
    assert.equal(events[0].progress.responseSummary, undefined, "loading 阶段不能提前显示 AI 回复");
    frames.flushFrame();
    await Promise.resolve();
    assert.ok(events.every(event => event.progress.status === "running"), "首帧后仍须保持 loading");
    frames.flushFrame();
    await settled;
    assert.equal(events.at(-1)?.progress.status, "completed");
    assert.equal(events.at(-1)?.progress.applicationStatus, "pending");
    assert.ok(drafts[key({ kind: "task" })].proposal, "正常 AI 对话应返回可审阅候选");
    assert.equal(drafts[key({ kind: "task" })].proposal?.changes[0]?.label, "完成标准");
    assert.notDeepEqual(drafts[key({ kind: "task" })].proposal?.updates[0]?.patch.completionCriteria, context.task.completionCriteria);
    assert.equal(events.at(-1)?.progress.responseSummary, drafts[key({ kind: "task" })].proposal?.summary);
  } finally { frames.restore(); }
});

test("内容无需修改也先发布可停止的同轮运行状态", async () => {
  const frames = installFrameClock();
  const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
  let resolveCompleted!: () => void;
  const completed = new Promise<void>(resolve => { resolveCompleted = resolve; });
  const instruction = "任务名称改为发布计划";
  let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction } };
  try {
    const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true,
      draftSession: [drafts, action => { drafts = taskAiAdjustmentDraftReducer(drafts, action); }],
      onProgressChange: (progress, stop) => {
        events.push({ progress, stop });
        if (progress.status === "completed") resolveCompleted();
      },
    }));
    elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    assert.equal(events.length, 2, "先发布初始步骤，再用候选补全同一运行轮次");
    assert.ok(events.every(event => event.progress.status === "running"));
    assert.equal(new Set(events.map(event => event.progress.id)).size, 1);
    assert.equal(typeof events.at(-1)?.stop, "function");
    frames.flushFrame();
    await Promise.resolve();
    assert.ok(events.every(event => event.progress.status === "running"), "第一帧后仍须保留 running");
    frames.flushFrame();
    await completed;
    assert.equal(events.at(-1)?.progress.status, "completed");
    assert.equal(events.at(-1)?.progress.applicationStatus, "no_change");
    assert.equal(events.at(-1)?.stop, undefined);
  } finally { frames.restore(); }
});

test("快速结果等待期间停止或关闭后不再发布迟到终态", async () => {
  for (const instruction of ["子任务「不存在」：负责人改为林洁", "任务名称改为发布计划"]) {
    for (const action of ["stop", "close"] as const) {
      const frames = installFrameClock();
      const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
      let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction } };
      try {
        const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true,
          draftSession: [drafts, update => { drafts = taskAiAdjustmentDraftReducer(drafts, update); }],
          onProgressChange: (progress, stop) => { events.push({ progress, stop }); },
        }));
        elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
        assert.equal(events.at(-1)?.progress.status, "running");
        frames.flushFrame();
        await Promise.resolve();
        assert.equal(events.at(-1)?.progress.status, "running", "首帧绘制后仍可停止");
        if (action === "stop") events.at(-1)!.stop!();
        else elements(tree, node => node.props["aria-label"] === "收起 AI 帮你改")[0].props.onClick();
        assert.equal(events.at(-1)?.progress.status, "stopped");
        const stoppedLength = events.length;
        frames.flushFrame();
        await Promise.resolve();
        frames.flushFrame();
        await Promise.resolve();
        assert.equal(events.length, stoppedLength, `${instruction} / ${action} 不得发布迟到结果`);
        assert.equal(events.some(event => event.progress.status === "failed" || event.progress.applicationStatus === "no_change"), false);
        assert.equal(drafts[key({ kind: "task" })].instruction, instruction);
        assert.equal(drafts[key({ kind: "task" })].proposal, null);
      } finally { frames.restore(); }
    }
  }
});

test("外部停止回调仅作用于对应预览轮次，停止和关闭同步终态并保留输入", async () => {
  const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const instruction = "任务名称改为新的发布计划";
  let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction } };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { requestAnimationFrame() {} } });
    const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true,
      draftSession: [drafts, action => { drafts = taskAiAdjustmentDraftReducer(drafts, action); }],
      onProgressChange: (progress, stop) => { events.push({ progress, stop }); },
    }));
    const submit = () => elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    submit();
    const firstId = events[0].progress.id;
    const oldStop = events[0].stop!;
    oldStop();
    assert.equal(events.at(-1)?.progress.status, "stopped");
    assert.equal(events.at(-1)?.stop, undefined);
    submit();
    const nextId = events.at(-1)!.progress.id;
    assert.notEqual(nextId, firstId);
    oldStop();
    assert.equal(events.at(-1)?.progress.status, "running", "旧停止按钮不能结束新一轮");
    elements(tree, node => node.props["aria-label"] === "收起 AI 帮你改")[0].props.onClick();
    assert.equal(events.at(-1)?.progress.id, nextId);
    assert.equal(events.at(-1)?.progress.status, "stopped");
    assert.equal(drafts[key({ kind: "task" })].instruction, instruction);
    assert.equal(drafts[key({ kind: "task" })].proposal, null);
    await Promise.resolve();
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("预览按同一轮逐步完成并保持待应用状态，外部步骤依据与候选一致", async () => {
  const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
  let resolveComplete!: () => void;
  const completed = new Promise<void>(resolve => { resolveComplete = resolve; });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const instruction = "任务名称改为新的发布计划";
  let applied = 0;
  let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction } };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { requestAnimationFrame() {} } });
    const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true, onApply: () => { applied++; },
      draftSession: [drafts, action => { drafts = taskAiAdjustmentDraftReducer(drafts, action); }],
      onProgressChange: (progress, stop) => { events.push({ progress, stop }); if (progress.status === "completed") resolveComplete(); },
    }));
    elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
    await completed;
    assert.equal(new Set(events.map(event => event.progress.id)).size, 1);
    assert.deepEqual([...new Set(events.map(event => event.progress.activeStep))], [0, 1]);
    assert.equal(events.at(-1)?.stop, undefined);
    assert.match(events.at(-1)!.progress.outcome!, /确认后才应用/);
    assert.equal(events.at(-1)?.progress.responseSummary, drafts[key({ kind: "task" })].proposal?.summary);
    assert.deepEqual(events.at(-1)?.progress.changes, drafts[key({ kind: "task" })].proposal?.changes);
    assert.equal(events.at(-1)?.progress.applicationStatus, "pending");
    assert.match(events.at(-1)!.progress.steps[1].basis, /发布计划 → 新的发布计划/);
    assert.equal(drafts[key({ kind: "task" })].instruction, instruction);
    assert.equal(drafts[key({ kind: "task" })].proposal?.changes[0].after, "新的发布计划");
    assert.equal(applied, 0);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("创建连续输入应用后保持打开并清空已应用内容，取消候选则保留输入", async () => {
  const instruction = "任务名称改为新的发布计划";
  const result = buildTaskAiCreationAdjustment(context, instruction);
  assert.ok("proposal" in result);
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const initial = { ...emptyTaskAiAdjustmentDraft, instruction, proposal: result.proposal, progressId: "restored-preview" };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { requestAnimationFrame() {} } });
    for (const action of ["apply", "cancel"] as const) {
      let drafts: Props["draftSession"][0] = { [key({ kind: "task" })]: initial };
      let applied = 0;
      const changes: boolean[] = [];
      const progress: TaskAiAdjustmentProgress[] = [];
      const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true,
        onOpenChange: open => { changes.push(open); }, onApply: () => { applied++; },
        onProgressChange: update => { progress.push(update); },
        draftSession: [drafts, update => { drafts = taskAiAdjustmentDraftReducer(drafts, update); }],
      }));
      if (action === "apply") elements(tree, node => node.props.className === "task-ai-adjust-primary")[0].props.onClick();
      else elements(tree, node => node.props.children === "取消")[0].props.onClick();
      await Promise.resolve();
      assert.deepEqual(changes, [], "创建模式应用与取消都留在连续输入入口");
      assert.equal(drafts[key({ kind: "task" })].proposal, null);
      assert.equal(drafts[key({ kind: "task" })].instruction, action === "apply" ? "" : instruction);
      assert.match(drafts[key({ kind: "task" })].notice, action === "apply" ? /已应用.*继续/ : /已取消.*输入已保留/);
      assert.equal(applied, action === "apply" ? 1 : 0);
      assert.equal(progress.length, 1, "恢复候选不伪造一次新的运行");
      assert.equal(progress[0].id, "restored-preview");
      assert.equal(progress[0].status, "completed");
      assert.equal(progress[0].applicationStatus, action === "apply" ? "applied" : "not_applied");
      assert.equal(progress[0].responseSummary, result.proposal.summary);
      assert.deepEqual(progress[0].changes, result.proposal.changes);
      assert.match(progress[0].outcome!, action === "apply" ? /已应用/ : /已取消/);
      assert.equal(drafts[key({ kind: "task" })].progressId, undefined);
    }
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("应用失败保留已完成预览和待应用候选，不把生成步骤记为失败", async () => {
  const instruction = "任务名称改为新的发布计划";
  const result = buildTaskAiCreationAdjustment(context, instruction);
  assert.ok("proposal" in result);
  const progress: TaskAiAdjustmentProgress[] = [];
  const draftSession: Props["draftSession"] = [{ [key({ kind: "task" })]: {
    ...emptyTaskAiAdjustmentDraft, instruction, proposal: result.proposal, progressId: "apply-failure",
  } }, () => undefined];
  const tree = capture(() => TaskAiAdjustmentPopover({ ...base, compactCreation: true, draftSession,
    onApply: async () => { throw new Error("草稿保存失败"); }, onProgressChange: update => { progress.push(update); },
  }));
  elements(tree, node => node.props.className === "task-ai-adjust-primary")[0].props.onClick();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(progress.length, 1);
  assert.equal(progress[0].status, "completed");
  assert.equal(progress[0].applicationStatus, "pending");
  assert.match(progress[0].outcome!, /草稿保存失败/);
  assert.equal(progress[0].responseSummary, result.proposal.summary);
});

test("创建固定面板不因外部点击或焦点移出关闭，Esc 仍作为明确关闭", () => {
  const previousNode = Object.getOwnPropertyDescriptor(globalThis, "Node");
  class FakeNode {}
  const inside = new FakeNode();
  const outside = new FakeNode();
  try {
    Object.defineProperty(globalThis, "Node", { configurable: true, value: FakeNode });
    for (const mode of ["draft", "saved"] as const) {
      const openChanges: boolean[] = [];
      const tree = capture(() => TaskAiAdjustmentPopover({ ...base, context: { ...context, mode }, compactCreation: true,
        onOpenChange: open => { openChanges.push(open); },
      }));
      const popover = elements(tree, node => node.props.modal === false && typeof node.props.onOpenChange === "function")[0];
      let cancelled = 0;
      const event = (reason: string, target: object, relatedTarget?: object) => popover.props.onOpenChange(false, {
        reason, event: { target, ...(relatedTarget ? { relatedTarget } : {}) }, cancel() { cancelled++; },
      });
      event("outside-press", inside);
      event("focus-out", outside, inside);
      assert.equal(cancelled, mode === "draft" ? 2 : 0);
      assert.equal(openChanges.length, mode === "draft" ? 0 : 2);
      event("escape-key", inside);
      assert.equal(openChanges.length, mode === "draft" ? 1 : 3, "创建面板只允许 Esc 等明确关闭，详情浮层保持原行为");
    }
  } finally {
    if (previousNode) Object.defineProperty(globalThis, "Node", previousNode);
    else Reflect.deleteProperty(globalThis, "Node");
  }
});

test("同名子任务按稳定 ID 选择，重排或改名不把草稿绑定到另一项", () => {
  const selected: TaskAiAdjustmentScope[] = [];
  let draftWrites = 0;
  const first = capture(() => TaskAiAdjustmentPopover({ ...base, draftSession: [{}, () => { draftWrites++; }], onScopeChange: scope => { selected.push(scope); } }));
  const childScope: TaskAiAdjustmentScope = { kind: "subtask", taskId: "child:乙" };
  choose(first, childScope);
  choose(first, { kind: "subtasks" });
  assert.deepEqual(selected, [childScope, { kind: "subtasks" }]);
  assert.equal(draftWrites, 0, "切范围不能修改或清空任何草稿");
  const reordered = { ...context, subtasks: [{ ...context.subtasks[1], title: "核对新交付" }, context.subtasks[0]] };
  const next = capture(() => TaskAiAdjustmentPopover({ ...base, context: reordered, scope: childScope, onScopeChange: () => undefined }));
  assert.equal(select(next).props.value, key(childScope));
  assert.equal(options(next).find(option => option.props.value === key(childScope))?.props.children, "子任务 1：核对新交付");
  assert.equal(new Set(options(next).map(option => option.props.value)).size, 4);
});

test("往返主任务、整体安排和单个子任务后各自的未提交输入保留", () => {
  const childScope: TaskAiAdjustmentScope = { kind: "subtask", taskId: "child:甲" };
  let step = 0;
  const tree = capture(() => {
    const [scope, setScope] = useState<TaskAiAdjustmentScope>({ kind: "task" });
    const draftSession = useTaskAiAdjustmentDrafts();
    return TaskAiAdjustmentPopover({ ...base, scope, draftSession, onScopeChange: setScope });
  }, node => {
    switch (step++) {
      case 0: changeInput(node, "主任务未提交指令"); break;
      case 1: choose(node, { kind: "subtasks" }); break;
      case 2: assert.equal(input(node).props.value, ""); changeInput(node, "整体安排未提交指令"); break;
      case 3: choose(node, childScope); break;
      case 4: assert.equal(input(node).props.value, ""); changeInput(node, "单个子任务未提交指令"); break;
      case 5: choose(node, { kind: "task" }); break;
      case 6: assert.equal(input(node).props.value, "主任务未提交指令"); choose(node, { kind: "subtasks" }); break;
      case 7: assert.equal(input(node).props.value, "整体安排未提交指令"); choose(node, childScope); break;
    }
  });
  assert.equal(input(tree).props.value, "单个子任务未提交指令");
  assert.equal(select(tree).props.value, key(childScope));
});

test("没有可安排子项且禁止继续拆分时不开放空范围，已移除子项也不误选主任务", () => {
  const scopes: TaskAiAdjustmentScope[] = [];
  const empty = { ...context, subtasks: [], canAddSubtasks: false };
  const staleScope: TaskAiAdjustmentScope = { kind: "subtask", taskId: "deleted" };
  const tree = capture(() => TaskAiAdjustmentPopover({ ...base, context: empty, scope: staleScope, onScopeChange: scope => { scopes.push(scope); } }));
  assert.deepEqual(options(tree).map(option => option.props.children), ["任务信息", "已移除的子任务"]);
  assert.equal(select(tree).props.value, key(staleScope));
  assert.equal(options(tree).at(-1)?.props.disabled, true);
  choose(tree, staleScope);
  choose(tree, { kind: "subtasks" });
  assert.deepEqual(scopes, []);
  choose(tree, { kind: "task" });
  assert.deepEqual(scopes, [{ kind: "task" }]);
});

test("预览期间范围控件禁用，旧事件也不能绕过同步锁切换范围", async () => {
  let scopeChanges = 0;
  let step = 0;
  const draftSession: Props["draftSession"] = [{ [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction: "任务名称改为新的发布计划" } }, () => undefined];
  capture(() => {
    const [open, setOpen] = useState(true);
    return TaskAiAdjustmentPopover({ ...base, open, onOpenChange: setOpen, draftSession, onScopeChange: () => { scopeChanges++; } });
  }, node => {
    if (step++ === 0) {
      elements(node, item => item.type === "form")[0].props.onSubmit({ preventDefault() {} });
      choose(node, { kind: "subtasks" });
    } else if (step === 2) {
      assert.equal(select(node).props.disabled, true);
      choose(node, { kind: "subtasks" });
      elements(node, item => item.props["aria-label"] === "收起 AI 帮你改")[0].props.onClick();
    }
  });
  await Promise.resolve();
  assert.equal(scopeChanges, 0);
});

test("应用保存期间禁止切换，避免成功回调关闭另一个范围", async () => {
  const instruction = "任务名称改为新的发布计划";
  const result = buildTaskAiAdjustment(context, { kind: "task" }, instruction);
  assert.ok("proposal" in result);
  let finishSave!: () => void;
  const saving = new Promise<void>(resolve => { finishSave = resolve; });
  let scopeChanges = 0;
  let step = 0;
  const draftSession: Props["draftSession"] = [{ [key({ kind: "task" })]: { ...emptyTaskAiAdjustmentDraft, instruction, proposal: result.proposal } }, () => undefined];
  capture(() => TaskAiAdjustmentPopover({ ...base, draftSession, onApply: () => saving, onScopeChange: () => { scopeChanges++; } }), node => {
    if (step++ === 0) {
      elements(node, item => item.props.className === "task-ai-adjust-primary")[0].props.onClick();
      choose(node, { kind: "subtasks" });
    } else {
      assert.equal(select(node).props.disabled, true);
      choose(node, { kind: "subtasks" });
    }
  });
  assert.equal(scopeChanges, 0);
  finishSave();
  await saving;
});

test("子任务改名后仍可恢复原范围预览，但过期候选不能直接应用", () => {
  const scope: TaskAiAdjustmentScope = { kind: "subtask", taskId: "child:甲" };
  const instruction = "增加完成标准：检查记录已归档";
  const result = buildTaskAiAdjustment(context, scope, instruction);
  assert.ok("proposal" in result);
  const updated = { ...context, subtasks: [{ ...context.subtasks[0], title: "人工修改后的任务名" }, context.subtasks[1]] };
  const draftSession: Props["draftSession"] = [{ [key(scope)]: { ...emptyTaskAiAdjustmentDraft, instruction, proposal: result.proposal } }, () => undefined];
  const tree = capture(() => TaskAiAdjustmentPopover({ ...base, context: updated, scope, draftSession, onScopeChange: () => undefined }));
  assert.equal(input(tree).props.value, instruction);
  assert.equal(select(tree).props.value, key(scope));
  assert.ok(elements(tree, item => item.props.role === "alert").some(item => String(item.props.children).includes("当前预览已过期")));
  const action = elements(tree, item => item.props.className === "task-ai-adjust-primary")[0];
  assert.equal(action.props.type, "submit", "过期候选只能重新预览，不能直接应用");
  assert.equal(action.props.onClick, undefined);
});

test("Shift+Tab 从第一个范围控件离开时收起浮层，返回外部入口", () => {
  const openChanges: boolean[] = [];
  const tree = capture(() => TaskAiAdjustmentPopover({ ...base, onOpenChange: open => { openChanges.push(open); }, onScopeChange: () => undefined }));
  const content = elements(tree, item => typeof item.props.onKeyDownCapture === "function")[0];
  const control = (tag: string) => ({ tag, tabIndex: 0, matches: () => false, getClientRects: () => [{}] });
  const selector = control("select");
  const textarea = control("textarea");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  let prevented = false;
  try {
    Object.defineProperty(globalThis, "document", { configurable: true, value: { activeElement: selector } });
    content.props.onKeyDownCapture({
      key: "Tab", shiftKey: true, preventDefault() { prevented = true; },
      currentTarget: { querySelectorAll: (query: string) => [selector, textarea].filter(item => query.split(", ").includes(item.tag)) },
    });
    assert.equal(prevented, true);
    assert.deepEqual(openChanges, [false]);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

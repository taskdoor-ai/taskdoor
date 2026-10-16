import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedAgentChatInput } from "../src/features/tasks/components/AnimatedAgentChatInput.tsx";
import { TaskAiAdjustmentPopover } from "../src/features/tasks/components/TaskAiAdjustmentPopover.tsx";
import { TaskCreationHistory } from "../src/features/tasks/components/TaskCreationHistory.tsx";
import { TaskCreationAnnotationComposer } from "../src/features/tasks/components/TaskCreationAnnotationComposer.tsx";
import { TaskCreationAnnotationBucket } from "../src/features/tasks/components/TaskCreationAnnotationBucket.tsx";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";
import { Textarea } from "../src/shared/ui/input.tsx";
import { buildTaskAiCreationAnnotationAdjustment } from "../src/ai/mock/lib/taskCreationAnnotationAdjustment.ts";
import { getCreationAnnotationValue, type TaskCreationAnnotation, type TaskCreationAnnotationTarget } from "../src/features/tasks/lib/task-creation-annotations.ts";
import { emptyTaskAiAdjustmentDraft, getTaskAiAdjustmentDraftKey, taskAiAdjustmentDraftReducer } from "../src/features/tasks/lib/task-ai-adjustment-drafts.ts";
import { recordCreationAdjustmentProgress, type CreationProcess } from "../src/features/tasks/lib/task-creation-progress.ts";
import type { TaskAiAdjustmentContext, TaskAiAdjustmentProgress, TaskAiAdjustmentProposal, TaskAiEditableTask } from "../src/features/tasks/lib/task-ai-adjustment-types.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type Element = ReactElement<Record<string, any>>;
type PopoverProps = Parameters<typeof TaskAiAdjustmentPopover>[0];
type InputProps = React.ComponentProps<typeof AnimatedAgentChatInput>;
const renderChatInput = (AnimatedAgentChatInput as unknown as { type: (props: InputProps) => ReactNode }).type;

function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}

// Capture actual function output and callbacks while React owns its hooks. The
// portal needs a browser, so it is deliberately not rendered by this harness.
function capture(render: () => ReactNode): ReactNode {
  let tree: ReactNode = null;
  function Capture() { tree = render(); return null; }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
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
    flush() { const frame = [...callbacks.entries()]; callbacks.clear(); frame.forEach(([id, callback]) => callback(id * 16)); },
    restore() { if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window"); },
  };
}

const task = (id: string, title: string): TaskAiEditableTask => ({
  id, title, goal: "形成可核对的交付结果", completionCriteria: ["交付物已核对"], executionTips: [],
  ownerId: "member-1", participantIds: [], startDate: "", endDate: "", dependsOnTaskIds: [],
});
const context: TaskAiAdjustmentContext = {
  mode: "draft", currentUserId: "member-1", task: task("main", "发布计划"),
  subtasks: [task("child", "核对交付")], members: [{ id: "member-1", name: "林洁" }], dependencyTasks: [], canAddSubtasks: true,
};
const note = (target: TaskCreationAnnotationTarget, instruction: string): TaskCreationAnnotation => {
  const value = getCreationAnnotationValue(context, target);
  assert.ok(value);
  return { id: `note-${target.taskId}-${target.field}`, target, taskTitle: [context.task, ...context.subtasks].find(item => item.id === target.taskId)!.title, ...value, instruction };
};
const notes = [
  note({ taskId: "main", field: "task" }, "任务名称改为新的发布计划"),
  note({ taskId: "child", field: "task" }, "目标改为核对最终交付物\n完成标准改为：最终交付物已确认"),
];
const draftKey = getTaskAiAdjustmentDraftKey(context.mode, context.task.id, { kind: "task" });
const candidate = (): TaskAiAdjustmentProposal => {
  const result = buildTaskAiCreationAnnotationAdjustment(context, notes);
  assert.ok("proposal" in result);
  return result.proposal;
};
const submit = (tree: ReactNode) => elements(tree, node => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
const input = (tree: ReactNode) => elements(tree, node => node.type === AnimatedAgentChatInput)[0];
const applyButton = (tree: ReactNode) => elements(tree, node => node.props.className === "task-ai-adjust-primary")[0];

test("继续标注不收起创建对话，手动收起仍可关闭", () => {
  const openChanges: boolean[] = [];
  const current = session({ onOpenChange: open => openChanges.push(open) });
  const tree = current.render();
  const bucket = input(tree).props.contextContent as Element;
  bucket.props.onContinue();
  assert.deepEqual(openChanges, [], "继续收集不能改变侧栏展开状态");
  assert.equal(current.events.length, 0, "继续收集不发起 AI 调整");
  elements(tree, node => node.props["aria-label"] === "收起 AI 帮你改")[0].props.onClick();
  assert.deepEqual(openChanges, [false], "用户手动收起才关闭侧栏");
});

function assertCollectedNotes(tree: ReactNode, expected: TaskCreationAnnotation[]) {
  const bucket = input(tree).props.contextContent;
  assert.ok(bucket, "创建对话应包含实际意见桶组件");
  const rendered = capture(() => TaskCreationAnnotationBucket(bucket.props as React.ComponentProps<typeof TaskCreationAnnotationBucket>));
  assert.equal(elements(rendered, node => node.type === "strong" && node.props.children === `${expected.length} 条标注`).length, 1);
  const items = elements(rendered, node => node.type === "li");
  assert.equal(items.length, expected.length);
  for (const [index, annotation] of expected.entries()) {
    assert.equal(elements(items[index], node => node.type === "strong" && node.props.children === annotation.taskTitle).length, 1, "任务名称明确标注对象");
    assert.equal(elements(items[index], node => node.type === "p" && node.props.children === annotation.instruction).length, 1);
    assert.equal(elements(items[index], node => node.type === "blockquote").length, 0);
    assert.equal(bucket.props.annotations[index].quote, annotation.quote);
    assert.equal(elements(items[index], node => node.type === "img").length, 0);
  }
}

function assertHistorySnapshots(history: CreationProcess[], expected: TaskCreationAnnotation[]) {
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].annotations, expected);
  const tree = capture(() => TaskCreationHistory({ processes: history }));
  const bucket = elements(tree, node => node.type === TaskCreationAnnotationBucket)[0];
  assert.ok(bucket);
  assert.equal(bucket.props.sent, true);
  assert.equal(bucket.props.onEdit, undefined, "已发送的快照保持只读");
  assert.equal(bucket.props.onRemove, undefined);
  assert.deepEqual(bucket.props.annotations, expected);
  const rendered = capture(() => TaskCreationAnnotationBucket(bucket.props));
  assert.equal(elements(rendered, node => node.type === "strong" && node.props.children === `${expected.length} 条标注`).length, 1);
  assert.equal(elements(tree, node => node.type === "details" && node.props.className === "creation-annotation-sent-comments").length, 0, "标注在浮层核对，不在气泡内展开");
}

function session(overrides: Partial<PopoverProps> = {}, proposal: TaskAiAdjustmentProposal | null = null) {
  let drafts: PopoverProps["draftSession"][0] = { [draftKey]: { ...emptyTaskAiAdjustmentDraft, proposal, ...(proposal ? { progressId: "restored-annotation-preview" } : {}) } };
  const applied: TaskAiAdjustmentProposal[] = [];
  let cleared = 0;
  const events: Array<{ progress: TaskAiAdjustmentProgress; stop?: () => void }> = [];
  let history: CreationProcess[] = proposal ? [{
    id: "adjustment:restored-annotation-preview", kind: "adjustment", title: "补充需求", request: proposal.instruction,
    annotations: proposal.annotations ? structuredClone(proposal.annotations) : undefined, supplementalInstruction: proposal.supplementalInstruction,
    answers: {}, steps: [], activeStep: 0, status: "completed", applicationStatus: "pending",
  }] : [];
  let resolveSettled!: () => void;
  const settled = new Promise<void>(resolve => { resolveSettled = resolve; });
  const render = () => capture(() => TaskAiAdjustmentPopover({
    context, scope: { kind: "task" }, compactCreation: true, annotations: notes,
    open: true, onOpenChange: () => undefined, anchor: null,
    onApply: next => { applied.push(next); }, onAnnotationsApplied: () => { cleared++; },
    onProgressChange: (progress, stop) => {
      events.push({ progress, stop });
      history = recordCreationAdjustmentProgress(history, progress);
      if (progress.status !== "running") resolveSettled();
    },
    ...overrides,
    draftSession: [drafts, action => { drafts = taskAiAdjustmentDraftReducer(drafts, action); }],
  }));
  return { render, applied, events, settled, get drafts() { return drafts; }, get cleared() { return cleared; }, get history() { return history; } };
}

test("无补充输入也可发送整桶意见，预览前后保留原文、意见和本轮历史", async () => {
  const frames = installFrameClock();
  const before = structuredClone({ context, notes });
  const current = session();
  try {
    const tree = current.render();
    assert.equal(input(tree).props.value, "");
    assert.equal(input(tree).props.hasContext, true);
    assert.equal(input(tree).props.sendLabel, "发送 2 条标注");
    assertCollectedNotes(tree, notes);
    input(tree).props.onSend("");
    assert.equal(current.events.at(-1)?.progress.status, "running");
    assert.deepEqual(current.events[0].progress.annotations, notes);
    assert.notEqual(current.events[0].progress.annotations![0].target, notes[0].target, "历史目标快照不受待发送标注编辑污染");
    await current.settled;
    const next = current.drafts[draftKey].proposal;
    assert.ok(next);
    assert.deepEqual(next.updates, [{ taskId: "main", patch: { title: "新的发布计划" } }, { taskId: "child", patch: { goal: "核对最终交付物", completionCriteria: ["最终交付物已确认"] } }]);
    assert.deepEqual(next.annotations, notes);
    assert.equal(current.applied.length, 0, "生成候选不能提前写入任务");
    assert.equal(current.cleared, 0, "生成候选不能清空意见桶");
    assert.equal(current.history.length, 1, "多条标注合并成一轮历史");
    assertHistorySnapshots(current.history, notes);
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(TaskCreationHistory, { processes: current.history }) }));
    assert.ok(!html.includes("creation-annotation-bucket-item-content"), "默认收起的历史不内嵌标注正文");
    assert.ok(!html.includes("提交时的任务内容"));
    assert.deepEqual(current.history[0].annotations?.map(annotation => annotation.quote), notes.map(annotation => annotation.quote));
    assert.deepEqual({ context, notes }, before);
  } finally { frames.restore(); }
});

test("应用实际完成后才通知清空意见，等待保存时保留整桶", async () => {
  const frames = installFrameClock();
  let resolveApply!: () => void;
  const saved = new Promise<void>(resolve => { resolveApply = resolve; });
  const calls: string[] = [];
  const proposal = candidate();
  const current = session({ onApply: async next => { calls.push("apply"); assert.deepEqual(next, proposal); await saved; calls.push("saved"); }, onAnnotationsApplied: () => { calls.push("clear"); } }, proposal);
  try {
    const tree = current.render();
    applyButton(tree).props.onClick();
    assert.deepEqual(calls, ["apply"]);
    assert.equal(current.drafts[draftKey].proposal, proposal);
    resolveApply();
    await saved;
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(calls, ["apply", "saved", "clear"]);
    assert.equal(current.drafts[draftKey].proposal, null);
    assert.equal(current.events.at(-1)?.progress.applicationStatus, "applied");
    assertHistorySnapshots(current.history, notes);
  } finally { frames.restore(); }
});

test("取消候选保留意见，重新发送仍携带原文和意见", () => {
  const current = session({}, candidate());
  const tree = current.render();
  elements(tree, node => node.props.children === "取消")[0].props.onClick();
  assert.equal(current.drafts[draftKey].proposal, null);
  assert.equal(current.applied.length, 0);
  assert.equal(current.cleared, 0);
  assert.equal(current.events.at(-1)?.progress.applicationStatus, "not_applied");
  const reopened = current.render();
  assert.equal(input(reopened).props.hasContext, true);
  assert.equal(input(reopened).props.sendLabel, "发送 2 条标注");
  assertCollectedNotes(reopened, notes);
  assertHistorySnapshots(current.history, notes);
});

test("无法理解的意见导致整批失败，意见和原文仍保留", async () => {
  const frames = installFrameClock();
  const invalid = note({ taskId: "child", field: "task" }, "我觉得这一块不太对");
  const supplied = [notes[0], invalid];
  const before = structuredClone(supplied);
  const current = session({ annotations: supplied });
  try {
    submit(current.render());
    frames.flush();
    await Promise.resolve();
    frames.flush();
    await current.settled;
    assert.equal(current.events.at(-1)?.progress.status, "failed");
    assert.equal(current.drafts[draftKey].proposal, null);
    assert.match(current.drafts[draftKey].error, /目标|改为/);
    assert.equal(current.applied.length, 0);
    assert.equal(current.cleared, 0);
    assert.deepEqual(supplied, before);
    const failedTree = current.render();
    assert.equal(input(failedTree).props.sendLabel, "发送 2 条标注");
    assertCollectedNotes(failedTree, supplied);
    assertHistorySnapshots(current.history, supplied);
  } finally { frames.restore(); }
});

test("应用失败保留候选及意见，不通知清空", async () => {
  const proposal = candidate();
  const current = session({ onApply: async () => { throw new Error("草稿保存失败"); } }, proposal);
  applyButton(current.render()).props.onClick();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(current.drafts[draftKey].proposal, proposal);
  assert.match(current.drafts[draftKey].error, /草稿保存失败/);
  assert.equal(current.cleared, 0);
  assert.equal(current.events.at(-1)?.progress.applicationStatus, "pending");
  const failedTree = current.render();
  assert.equal(input(failedTree).props.hasContext, true);
  assertCollectedNotes(failedTree, notes);
  assertHistorySnapshots(current.history, notes);
});

test("停止或收起预览保留整桶意见，停止后不生成迟到候选", async () => {
  for (const action of ["stop", "close"] as const) {
    const frames = installFrameClock();
    const current = session();
    try {
      const tree = current.render();
      submit(tree);
      assert.equal(current.events.at(-1)?.progress.status, "running");
      if (action === "stop") current.events.at(-1)!.stop!();
      else elements(tree, node => node.props["aria-label"] === "收起 AI 帮你改")[0].props.onClick();
      await Promise.resolve();
      await Promise.resolve();
      const last = current.events.at(-1)!.progress;
      assert.equal(last.status, "stopped");
      assert.match(last.instruction, /1\. 发布计划/);
      assert.ok(!last.instruction.includes("原文："), "发送文字只需要任务名称与标注");
      assert.match(last.instruction, /标注：任务名称改为新的发布计划/);
      assert.equal(current.drafts[draftKey].proposal, null);
      assert.equal(current.cleared, 0);
      assert.equal(current.applied.length, 0);
      const stoppedTree = current.render();
      assert.equal(input(stoppedTree).props.hasContext, true);
      assertCollectedNotes(stoppedTree, notes);
      assertHistorySnapshots(current.history, notes);
    } finally { frames.restore(); }
  }
});

test("原文过期时禁用发送，直接触发提交也不能开始批量预览", () => {
  const changed = structuredClone(context);
  changed.task.title = "人工刚修改的名称";
  const current = session({ context: changed });
  const tree = current.render();
  assert.equal(input(tree).props.disabled, true);
  const renderedInput = capture(() => renderChatInput(input(tree).props as InputProps));
  const send = elements(renderedInput, node => node.props.className === "animated-agent-send")[0];
  assert.equal(send.props.disabled, true);
  send.props.onClick({ stopPropagation() {} });
  input(tree).props.onSend("");
  submit(tree);
  assert.equal(current.events.length, 0);
  assert.equal(current.drafts[draftKey].proposal, null);
  assert.equal(current.cleared, 0);
  assert.equal(current.applied.length, 0);
});

test("真实输入组件仅在有上下文时允许空输入发送，忙碌和禁用仍拦截", () => {
  for (const state of [
    { hasContext: true, disabled: false, status: "ready" as const, allowed: true },
    { hasContext: false, disabled: false, status: "ready" as const, allowed: false },
    { hasContext: true, disabled: true, status: "ready" as const, allowed: false },
    { hasContext: true, disabled: false, status: "analyzing" as const, allowed: false },
  ]) {
    const sent: string[] = [];
    const tree = capture(() => renderChatInput({ ...state, value: "   ", clearOnSend: false, autoFocus: false, allowAttachments: false, onSend: content => { sent.push(content); } }));
    const send = elements(tree, node => node.props.className === "animated-agent-send")[0];
    if (state.status === "ready") assert.equal(send.props.disabled, !state.allowed);
    send.props.onClick({ stopPropagation() {} });
    const textarea = elements(tree, node => node.type === "textarea")[0];
    textarea.props.onKeyDown({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: false }, preventDefault() {} });
    assert.deepEqual(sent, state.allowed ? ["", ""] : [], JSON.stringify(state));
  }
});

test("卡片意见先发送到 AI 对话汇总，空意见拦截且首次发送不运行 AI", () => {
  const queued: TaskCreationAnnotation[] = [];
  const current = session({ annotations: queued });
  let instruction = "";
  const target: TaskCreationAnnotationTarget = { taskId: "main", field: "task" };
  const renderComposer = () => capture(() => TaskCreationAnnotationComposer({
    context, target, anchor: null, instruction,
    onInstructionChange: next => { instruction = next; },
    onSave: () => { queued.push(note(target, instruction)); },
    onClose: () => undefined,
  }));
  const empty = renderComposer();
  const send = elements(empty, node => node.props.type === "submit")[0];
  assert.equal(send.props.children, "保存标注");
  assert.equal(send.props.disabled, true);
  assert.equal(elements(empty, node => node.type === "p" && node.props.children === context.task.title).length, 1);
  submit(empty);
  assert.equal(queued.length, 0);
  elements(empty, node => node.type === Textarea)[0].props.onChange({ target: { value: "任务名称改为新的发布计划" } });
  const filled = renderComposer();
  assert.equal(elements(filled, node => node.props.type === "submit")[0].props.disabled, false);
  submit(filled);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].target.field, "task");
  assert.equal(queued[0].instruction, instruction);
  assert.equal(Object.hasOwn(queued[0], "screenshot"), false);
  const conversation = current.render();
  assertCollectedNotes(conversation, queued);
  assert.equal(input(conversation).props.sendLabel, "发送 1 条标注");
  assert.equal(current.events.length, 0, "汇总意见并打开对话不能自动生成进度");
  assert.equal(current.drafts[draftKey].proposal, null);
  assert.equal(current.applied.length, 0);
});

test("标注列表显示任务名称与内容，删除回调只携带所选稳定 ID", () => {
  const removed: string[] = [];
  let remaining = [...notes];
  const renderBucket = () => capture(() => TaskCreationAnnotationBucket({
    context, annotations: remaining, disabled: false,
    onRemove: id => { removed.push(id); remaining = remaining.filter(annotation => annotation.id !== id); },
  }));
  const tree = renderBucket();
  assert.equal(elements(tree, node => node.type === "li").length, 2);
  for (const annotation of notes) {
    assert.equal(elements(tree, node => node.type === "strong" && node.props.children === annotation.taskTitle).length, 1);
    assert.equal(elements(tree, node => node.type === "p" && node.props.children === annotation.instruction).length, 1);
  }
  elements(tree, node => node.props["aria-label"] === "删除核对交付的标注")[0].props.onClick();
  assert.deepEqual(removed, [notes[1].id]);
  assert.deepEqual(remaining, [notes[0]]);
  const next = renderBucket();
  assert.equal(elements(next, node => node.type === "li").length, 1);
  assert.equal(elements(next, node => node.type === "strong" && node.props.children === "1 条标注").length, 1);
  assert.equal(elements(next, node => node.type === "span" && node.props.children === "核对交付").length, 0);
  assert.equal(elements(next, node => node.type === "img").length, 0);
});

test("标注无需截图即可提交，已移除的目标仍阻止提交", () => {
  let sent = 0;
  const renderComposer = (taskId: string) => capture(() => TaskCreationAnnotationComposer({
    context, target: { taskId, field: "task" }, anchor: null, instruction: "任务名称改为新的发布计划",
    onInstructionChange: () => undefined, onSave: () => { sent++; }, onClose: () => undefined,
  }));
  const current = renderComposer("main");
  assert.equal(elements(current, node => node.props.type === "submit")[0].props.disabled, false);
  submit(current);
  assert.equal(sent, 1);
  const removed = renderComposer("deleted");
  assert.equal(elements(removed, node => node.props.type === "submit")[0].props.disabled, true);
  submit(removed);
  assert.equal(sent, 1);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test, { type TestContext } from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "esbuild";
import { generateDiscussionSubtaskDraft } from "../src/ai/subtask-creation.ts";
import { defaultGeneratedOwnerId } from "../src/features/tasks/lib/generated-task-owner.ts";
import {
  buildDiscussionSubtaskRequest, isDiscussionSubtaskRequestCurrent,
} from "../src/features/tasks/lib/discussion-subtask-draft.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { TaskSubtaskCreateForm } = await import("../src/features/tasks/components/TaskSubtaskCreateForm.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) found.push(child);
    found.push(...elements(child.props.children, match));
  });
  return found;
}

// Execute the actual wrapper with persistent hooks and committed effects. The network
// stays unresolved until each test settles it; server rendering alone never runs effects.
function mountedDiscussion(props: Record<string, unknown>) {
  const slots: any[] = [];
  const effects = new Map<number, { deps?: unknown[]; cleanup?: () => void }>();
  let cursor = 0;
  let queued: Array<() => void> = [];
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useEffect(effect: () => (() => void) | undefined, deps?: unknown[]) {
      const index = cursor++;
      const previous = effects.get(index);
      if (previous && deps && previous.deps?.length === deps.length && deps.every((value, i) => Object.is(value, previous.deps![i]))) return;
      queued.push(() => {
        previous?.cleanup?.();
        effects.set(index, { deps, cleanup: effect() });
      });
    },
  };
  const source = readFileSync(new URL("../src/features/tasks/components/DiscussionSubtaskCreateForm.tsx", import.meta.url), "utf8")
    .replace(/^import[^\n]*\n/gm, "").replace("export function DiscussionSubtaskCreateForm", "function DiscussionSubtaskCreateForm");
  const code = transformSync(source, { loader: "tsx", target: "es2022", jsx: "transform", jsxFactory: "React.createElement" }).code;
  const bindings = { ...hooks, React, useI18n: () => ({ locale: "zh-CN" }), TaskSubtaskCreateForm, generateDiscussionSubtaskDraft, isDiscussionSubtaskRequestCurrent, defaultGeneratedOwnerId };
  const Component = new Function(...Object.keys(bindings), `${code}; return DiscussionSubtaskCreateForm;`)(...Object.values(bindings));
  let tree: ReactNode;
  const render = (next: Record<string, unknown> = {}) => {
    props = { ...props, ...next };
    cursor = 0;
    tree = Component(props);
    return tree;
  };
  const html = () => renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: tree }));
  render();
  return {
    render, html,
    form: () => elements(tree, item => item.type === TaskSubtaskCreateForm)[0],
    root: () => tree as Element,
    commit: () => { const current = queued; queued = []; current.forEach(effect => effect()); },
    unmount: () => { effects.forEach(effect => effect.cleanup?.()); },
  };
}

const messages = [{ id: "message", author: "member", type: "member-post" as const, message: "请核对发布材料并回传结论。", time: "今天" }];
const request = buildDiscussionSubtaskRequest({ locale: "zh-CN", currentDate: "2026-11-05", task: { id: "parent", title: "准备发布", goal: "明确发布条件", completionCriteria: [] }, sourceMessageId: "message", messages, members: [], labels: [] });
const source = request.source;
const result = { draft: { title: "核对发布材料", goal: "让发布负责人掌握材料可用性。", ownerId: "", endDate: "", labels: [] }, message: "" };
const props = { id: "discussion-create", source, request, messages, contextCurrent: true, members: [], tags: [], onCreate: () => undefined, onCancel: () => undefined };

function deferredFetch(t: TestContext, response: unknown = result) {
  const original = globalThis.fetch;
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  let signal: AbortSignal;
  let calls = 0;
  globalThis.fetch = async (_input, options) => {
    calls++;
    signal = options?.signal as AbortSignal;
    return new Promise<Response>((done, fail) => { resolve = done; reject = fail; });
  };
  t.after(() => { globalThis.fetch = original; });
  return { finish: () => resolve(new Response(JSON.stringify(response), { status: 200 })), fail: () => reject(new Error("unavailable")), signal: () => signal, calls: () => calls };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test("讨论草稿首次呈现即有字段骨架，真实请求未完成时保持可填写和取消", t => {
  const pending = deferredFetch(t);
  const view = mountedDiscussion(props);
  const firstFrame = view.html();
  view.commit();
  view.render();
  assert.equal(pending.calls(), 1);
  assert.match(firstFrame, /task-subtask-draft-loading/, "首帧不能先显示一张无加载标记的空白表单");
  assert.match(view.html(), /aria-busy="true"/);
  assert.match(view.html(), /task-loading-bar/);
  assert.match(view.html(), /<input[^>]+aria-label="子任务名称"/);
  assert.doesNotMatch(view.html(), /<(?:fieldset|input)\b[^>]*\sdisabled(?:[\s=>])|正在生成草稿，也可直接填写|Preparing draft/);
  view.unmount();
  assert.equal(pending.signal().aborted, true);
});

test("后台预填完成后骨架与内容一起切换，不再出现空白等待帧", async t => {
  const pending = deferredFetch(t);
  const view = mountedDiscussion(props);
  view.commit();
  pending.finish();
  await flush();
  view.render();
  assert.doesNotMatch(view.html(), /task-subtask-draft-loading|aria-busy="true"/);
  assert.match(view.html(), /value="核对发布材料"/);
  assert.match(view.html(), /让发布负责人掌握材料可用性/);
  assert.deepEqual(view.form().props.initialDraft.sourceDiscussion, source);
  view.unmount();
});

test("仅任务引用和数字也预填已有信息，不显示模型的拒绝说明", async t => {
  const referenceMessages = [{ ...messages[0], message: "[9](<#taskdoor-task=venue>) 1" }];
  const referenceRequest = buildDiscussionSubtaskRequest({
    locale: "zh-CN", currentDate: "2026-11-05", task: request.task, sourceMessageId: "message", messages: referenceMessages, members: [], labels: [],
    referenceTasks: [{ id: "venue", title: "签署场地与设备服务确认", goal: "明确场地及设备服务的约定范围。", completionCriteria: [] }],
  });
  const pending = deferredFetch(t, { draft: null, message: "消息仅包含任务引用和数字，缺乏具体待办事项，无法生成子任务。" });
  const view = mountedDiscussion({ ...props, source: referenceRequest.source, request: referenceRequest, messages: referenceMessages });
  view.commit();
  pending.finish();
  await flush();
  view.render();
  assert.match(view.form().props.initialDraft.title, /场地.*设备/);
  assert.ok(view.form().props.initialDraft.goal);
  assert.doesNotMatch(view.html(), /缺乏具体待办|无法生成子任务|请补充信息/);
  assert.deepEqual(view.form().props.initialDraft.sourceDiscussion, referenceRequest.source);
  view.unmount();
});

test("引用任务信息变化后保留旧输入并拒绝按过期上下文保存", t => {
  const references = [{ id: "venue", title: "确认场地服务", goal: "明确场地服务范围。" }];
  const referenceMessages = [{ ...messages[0], message: "[9](<#taskdoor-task=venue>) 1" }];
  const referenceRequest = buildDiscussionSubtaskRequest({ locale: "zh-CN", currentDate: "2026-11-05", task: request.task, sourceMessageId: "message", messages: referenceMessages, members: [], labels: [], referenceTasks: references });
  const pending = deferredFetch(t);
  const view = mountedDiscussion({ ...props, source: referenceRequest.source, request: referenceRequest, messages: referenceMessages });
  view.commit();
  view.render({ request: { ...referenceRequest, referencedTasks: [{ ...references[0], title: "确认新场地服务" }] } });
  view.commit();
  view.render();
  assert.equal(pending.signal().aborted, true);
  assert.throws(() => view.form().props.onCreate({ title: "保留用户输入" }), /来源讨论已更新/);
  view.unmount();
});

test("生成期间一旦用户操作就移除骨架，晚到预填不重挂表单或覆盖输入", async t => {
  const pending = deferredFetch(t);
  const view = mountedDiscussion(props);
  view.commit();
  const originalKey = view.form().key;
  view.root().props.onInputCapture();
  view.render();
  assert.doesNotMatch(view.html(), /task-subtask-draft-loading|aria-busy="true"/);
  pending.finish();
  await flush();
  view.render();
  assert.equal(view.form().key, originalKey);
  assert.equal(view.form().props.initialDraft.title, undefined);
  assert.doesNotMatch(view.html(), /核对发布材料"/);
  view.unmount();
});

test("生成失败停止骨架并保留同一可填写表单", async t => {
  const pending = deferredFetch(t);
  const view = mountedDiscussion(props);
  view.commit();
  const originalKey = view.form().key;
  pending.fail();
  await flush();
  view.render();
  assert.equal(view.form().key, originalKey);
  assert.doesNotMatch(view.html(), /task-subtask-draft-loading|aria-busy="true"/);
  assert.match(view.html(), /暂时未能生成草稿，可直接填写下方表单/);
  view.unmount();
});

test("取消卸载中止请求，来源变化停止加载且仍拒绝旧来源保存", async t => {
  const pending = deferredFetch(t);
  const view = mountedDiscussion(props);
  view.commit();
  view.render({ contextCurrent: false });
  view.commit();
  view.render();
  assert.equal(pending.signal().aborted, true);
  assert.doesNotMatch(view.html(), /task-subtask-draft-loading/);
  assert.throws(() => view.form().props.onCreate({ title: "保留用户输入" }), /来源讨论已更新/);
  view.unmount();
  pending.finish();
  await flush();
  assert.equal(view.form().props.initialDraft.title, undefined);
});

test("无生成请求的手动创建不显示骨架或启动请求", t => {
  const pending = deferredFetch(t);
  const view = mountedDiscussion({ ...props, request: undefined });
  view.commit();
  assert.equal(pending.calls(), 0);
  assert.doesNotMatch(view.html(), /task-subtask-draft-loading|aria-busy="true"/);
  view.unmount();
});

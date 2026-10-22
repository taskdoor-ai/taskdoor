import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskDetailContent, TaskFileNode } from "../src/shared/model/task-model.ts";

register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { TaskDetail } = await import("../src/features/tasks/components/TaskDetail.tsx");
const { TaskDiscussion } = await import("../src/features/tasks/components/TaskDiscussion.tsx");
const { TaskActivityLog } = await import("../src/features/tasks/components/TaskActivityLog.tsx");
const { TaskFileExplorer } = await import("../src/features/tasks/files/components/TaskFileExplorer.tsx");
const { TaskFileBrowser } = await import("../src/features/tasks/files/components/TaskFileBrowser.tsx");
const { TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");
const { TaskFileDownload } = await import("../src/features/tasks/files/components/TaskFileDownload.tsx");
const { TaskFileAnnotationComposer } = await import("../src/features/tasks/files/components/TaskFileAnnotationDialogs.tsx");
const { DiscussionComposer } = await import("../src/features/tasks/discussion/components/DiscussionComposer.tsx");
const { TaskDiscussionMessage } = await import("../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx");
const { Dialog, DialogContent } = await import("../src/shared/ui/dialog.tsx");
const { AlertDialog } = await import("../src/shared/ui/alert-dialog.tsx");
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
function capture(render: () => ReactNode, initialize?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() { tree = render(); initialize?.(tree); return null; }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return tree;
}
const folder: TaskFileNode = { id: "discussion-folder", kind: "folder", name: "讨论", parentId: null, updatedAt: "" };
const file: TaskFileNode = { id: "discussion-file", kind: "file", name: "交接说明.txt", parentId: folder.id, updatedAt: "", version: 1, content: "已保存的附件" };
const task: TaskDetailContent = { title: "预览任务", goal: "核对附件", owner: "周岚", participants: [], due: "", status: "进行中", summary: "", files: [folder, file], commits: [], activities: [{ id: "discussion", type: "member-post", author: "周岚", message: "查看附件", time: "刚刚" }] };

function withBrowser(run: (trigger: HTMLElement) => void) {
  class Trigger { isConnected = true; focus() {} }
  const trigger = new Trigger();
  const values = new Map<string, string>();
  const originals = ["window", "document", "HTMLElement"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }, setTimeout: () => 0, matchMedia: () => ({ matches: true }), getSelection: () => ({ removeAllRanges() {} }) } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { activeElement: trigger, getElementById: () => null } });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: Trigger });
  try { run(trigger as unknown as HTMLElement); }
  finally { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } }
}

test("讨论附件在原讨论页打开唯一预览实例，保留固定版本和返回焦点", () => withBrowser(trigger => {
  let opened = false;
  const tree = capture(() => TaskDetail({ task, taskId: "discussion-preview", members: [], tags: [], tagDefinitions: [], initialAttentionTarget: { kind: "discussion", targetId: "discussion" } }), current => {
    if (opened) return;
    opened = true;
    elements(current, item => item.type === TaskDiscussion)[0].props.onOpenFile(file.id, 1);
  });
  assert.equal(elements(tree, item => item.props.id === "task-detail-panel-discussion")[0].props.hidden, false);
  assert.equal(elements(tree, item => item.props.id === "task-detail-panel-files")[0].props.hidden, true);
  const explorers = elements(tree, item => item.type === TaskFileExplorer);
  assert.equal(explorers.length, 1);
  assert.equal(explorers[0].props.focusedFileId, file.id);
  assert.equal(explorers[0].props.focusedVersion, 1);
  assert.equal(explorers[0].props.focusedTrigger, trigger);
  assert.equal(explorers[0].props.preserveFocusedDirectory, true);
}));

test("活动来源和文件通知继续进入文件页，不复用讨论返回焦点", () => withBrowser(() => {
  let opened = false;
  const activityTask = { ...task, activities: [{ id: "status", type: "status-change" as const, author: "周岚", message: "更新状态", time: "刚刚" }] };
  const tree = capture(() => TaskDetail({ task: activityTask, taskId: "activity-preview", members: [], tags: [], tagDefinitions: [], initialAttentionTarget: { kind: "activity", targetId: "status" } }), current => {
    if (opened) return;
    opened = true;
    elements(current, item => item.type === TaskActivityLog)[0].props.onOpenFile(file.id, 1);
  });
  assert.equal(elements(tree, item => item.props.id === "task-detail-panel-files")[0].props.hidden, false);
  assert.equal(elements(tree, item => item.type === TaskFileExplorer)[0].props.focusedTrigger ?? null, null);
  const notification = capture(() => TaskDetail({ task, taskId: "notification-preview", members: [], tags: [], tagDefinitions: [], initialAttentionTarget: { kind: "file", targetId: file.id } }));
  assert.equal(elements(notification, item => item.props.id === "task-detail-panel-files")[0].props.hidden, false);
}));

test("讨论来源预览关闭回原附件，打开时不切换文件浏览器目录", () => withBrowser(trigger => {
  const tree = capture(() => TaskFileExplorer({ browserMode: true, files: [folder, file], taskId: "external-file-preview", currentUser: "周岚", focusedFileId: file.id, focusedVersion: 1, focusedTrigger: trigger, preserveFocusedDirectory: true }));
  assert.equal(elements(tree, item => item.type === Dialog)[0].props.open, true);
  const popup = elements(tree, item => item.type === DialogContent && item.props.className?.split(" ").includes("task-file-preview-dialog"))[0];
  assert.equal(popup.props.finalFocus(), trigger);
  assert.equal(elements(tree, item => item.type === TaskFileBrowser)[0].props.directoryId, null, "从讨论打开附件不替换文件浏览器的原始根目录");
}));

test("只读上传文件不展示版本或历史入口，在线文档旧引用仍保留版本历史", () => withBrowser(() => {
  for (const name of ["规则.pdf", "演示.pptx", "海报.png", "录音.mp3", "视频.mp4", "说明.md", "记录.txt", "页面.html", "配置.json", "配置.xml"]) {
    const versioned = /\.(md|txt|html|json|xml)$/.test(name);
    const source: TaskFileNode = { ...file, parentId: null, name, version: 7, updatedAt: "2026-10-21T02:00:00.000Z" };
    const tree = capture(() => TaskFileExplorer({ files: [source], focusedFileId: source.id, focusedVersion: 2, taskId: `revision-presentation-${name}`, currentUser: "周岚" }));
    assert.equal(elements(tree, item => item.props["aria-label"] === "查看版本记录").length, versioned ? 1 : 0, name);
    assert.equal(elements(tree, item => item.props["aria-label"] === "编辑文件").length, 0, "a historical source stays read-only");
    const notice = elements(tree, item => item.props.className === "task-file-reference-version")[0];
    assert.ok(notice, "legacy source mismatch must remain explicit");
    const html = renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: notice }));
    if (versioned) assert.match(html, /v2.*v7/);
    else assert.doesNotMatch(html, /v2|v7|最新版本/);
    assert.equal(elements(tree, item => item.type === TaskFileViewer).length, 0, "missing historical content must not be replaced with current content");
    assert.equal(source.version, 7);
  }
}));

test("普通与回复草稿附件都交回任务预览入口，不改变未发布草稿", () => {
  const calls: Array<{ file: TaskFileNode; trigger: HTMLElement }> = [];
  const preview = (item: TaskFileNode, trigger: HTMLElement) => calls.push({ file: item, trigger });
  const props = { activities: task.activities, currentUser: "real-member-id", currentUserName: "真实用户", files: [file], people: [], onOpenFile: () => {}, onPreviewAttachment: preview, onPost: () => {} };
  const ordinary = capture(() => TaskDiscussion(props));
  assert.equal(elements(ordinary, item => item.type === DiscussionComposer)[0].props.onPreviewAttachment, preview);
  let replied = false;
  const reply = capture(() => TaskDiscussion(props), tree => {
    if (replied) return;
    replied = true;
    elements(tree, item => item.type === TaskDiscussionMessage)[0].props.onReply(task.activities[0]);
  });
  assert.equal(elements(reply, item => item.type === DiscussionComposer)[0].props.onPreviewAttachment, preview);

  const originalDraft = { body: "尚未发布的正文", mentions: ["mentioned-person"], attachments: [file] };
  const tree = capture(() => {
    const wrapper = DiscussionComposer({ people: [], files: [], onSubmit: () => { throw new Error("预览不发布讨论"); }, initialValue: originalDraft, onPreviewAttachment: preview });
    return (wrapper.type as (props: Record<string, unknown>) => ReactNode)(wrapper.props);
  });
  const trigger = { isConnected: true } as HTMLElement;
  elements(tree, item => item.props.className === "discussion-composer-attachment-name")[0].props.onClick({ currentTarget: trigger });
  assert.deepEqual(calls, [{ file, trigger }]);
  assert.deepEqual(originalDraft, { body: "尚未发布的正文", mentions: ["mentioned-person"], attachments: [file] });
});

const generatedAttachment: TaskFileNode = { id: "generated-annotations", kind: "file", name: "修订意见.html", mimeType: "text/html", attachmentOnly: true, parentId: null, updatedAt: "", version: 1, content: "<html><body>临时修订意见</body></html>" };

test("已发布生成附件与草稿统一交给真实任务的唯一预览器，已有文件引用仍走正式版本", () => withBrowser(trigger => {
  const content = { ...task, title: "用户自定义标题1111000", files: [...task.files, generatedAttachment] };
  const props = { task: content, taskId: "real-task-id", currentUser: "真实用户", currentUserId: "real-member-id", members: [], tags: [], tagDefinitions: [], initialAttentionTarget: { kind: "discussion" as const, targetId: "discussion" } };
  for (const entry of ["published", "draft", "existing"] as const) {
    let opened = false;
    const tree = capture(() => TaskDetail(props), current => {
      if (opened) return;
      opened = true;
      const discussion = elements(current, item => item.type === TaskDiscussion)[0];
      if (entry === "published") discussion.props.onOpenFile(generatedAttachment.id, 1);
      else discussion.props.onPreviewAttachment(entry === "existing" ? file : generatedAttachment, trigger);
    });
    const explorers = elements(tree, item => item.type === TaskFileExplorer);
    assert.equal(explorers.length, 1);
    const explorer = explorers[0];
    assert.equal(explorer.props.taskId, "real-task-id");
    assert.equal(explorer.props.taskTitle, "用户自定义标题1111000");
    assert.equal(explorer.props.currentUser, "真实用户");
    assert.equal(explorer.props.currentUserId, "real-member-id");
    assert.equal(typeof explorer.props.onStartDiscussion, "function");
    assert.equal(explorer.props.focusedTrigger, trigger);
    assert.equal(explorer.props.focusedFileId, entry === "existing" ? file.id : generatedAttachment.id);
    assert.deepEqual(explorer.props.transientPreviewFile, entry === "existing" ? null : generatedAttachment);
    assert.equal(explorer.props.files.some((item: TaskFileNode) => item.id === generatedAttachment.id), false);
    assert.equal(elements(tree, item => item.props.id === "task-detail-panel-discussion")[0].props.hidden, false);
  }
}));

test("临时附件复用标注与下载但不进入文件浏览，不提供编辑移动历史，实际关闭才通知宿主", () => withBrowser(trigger => {
  let closed = 0;
  let mutations = 0;
  const props = { browserMode: true, files: [folder, file], transientPreviewFile: generatedAttachment, focusedFileId: generatedAttachment.id, focusedVersion: 1, focusedTrigger: trigger, preserveFocusedDirectory: true, taskId: "transient-preview", currentUser: "真实用户", currentUserId: "real-member-id", onNodesChange: () => { mutations++; }, onFilesChange: () => { mutations++; }, onPreviewClose: () => { closed++; } };
  const tree = capture(() => TaskFileExplorer(props));
  assert.deepEqual(elements(tree, item => item.type === TaskFileBrowser)[0].props.files, [folder, file]);
  assert.deepEqual(elements(tree, item => item.type === TaskFileViewer)[0].props.file, generatedAttachment);
  assert.deepEqual(elements(tree, item => item.type === TaskFileDownload)[0].props.file, generatedAttachment);
  assert.equal(elements(tree, item => item.props["aria-label"] === "文件标注").length, 1);
  assert.equal(elements(tree, item => ["编辑文件", "查看版本记录"].includes(item.props["aria-label"])).length, 0);
  assert.equal(elements(tree, item => item.props.children === "移动到").length, 0);
  assert.equal(mutations, 0);
  assert.equal(closed, 0);
  elements(tree, item => item.props["aria-label"] === "关闭文件预览")[0].props.onClick();
  assert.equal(closed, 1);
  assert.equal(mutations, 0);
}));

test("临时附件的未交付标注输入关闭时需确认，取消保留正文与预览", () => withBrowser(trigger => {
  let step = 0;
  let closed = 0;
  const quote = { text: "", location: "HTML区域", region: { x: 0.1, y: 0.1, width: 0.3, height: 0.2 }, elementSelector: "body", rect: { left: 30, bottom: 80 } };
  const tree = capture(() => TaskFileExplorer({ browserMode: true, files: [folder, file], transientPreviewFile: generatedAttachment, focusedFileId: generatedAttachment.id, focusedVersion: 1, focusedTrigger: trigger, taskId: "transient-preview-confirm", currentUser: "真实用户", currentUserId: "real-member-id", onPreviewClose: () => { closed++; } }), current => {
    if (step === 0) { step++; elements(current, item => item.type === TaskFileViewer)[0].props.onSelection(quote); }
    else if (step === 1) { step++; elements(current, item => item.type === TaskFileAnnotationComposer)[0].props.onChange("尚未交付的意见"); }
    else if (step === 2) { step++; elements(current, item => item.props["aria-label"] === "关闭文件预览")[0].props.onClick(); }
    else if (step === 3) {
      step++;
      assert.equal(elements(current, item => item.type === AlertDialog)[0].props.open, true);
      assert.equal(closed, 0);
      elements(current, item => item.props.children === "继续查看")[0].props.onClick();
    }
  });
  assert.equal(step, 4);
  assert.equal(elements(tree, item => item.type === Dialog)[0].props.open, true);
  assert.equal(elements(tree, item => item.type === AlertDialog)[0].props.open, false);
  assert.equal(elements(tree, item => item.type === TaskFileAnnotationComposer)[0].props.draft.body, "尚未交付的意见");
  assert.equal(closed, 0);
}));

import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
// Match the app's task-detail entry so its existing shared import cycle initializes in order.
await import("../src/features/tasks/components/TaskDetail.tsx");
const { TaskFileExplorer } = await import("../src/features/tasks/files/components/TaskFileExplorer.tsx");
const { TaskFileViewer } = await import("../src/features/tasks/files/components/TaskFileViewer.tsx");
const { TaskFileBrowser } = await import("../src/features/tasks/files/components/TaskFileBrowser.tsx");
const { Dialog, DialogContent } = await import("../src/shared/ui/dialog.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode, match: (node: Element) => boolean): Element[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child)
    ? [...(match(child) ? [child] : []), ...elements(child.props.children, match)] : []);
}
function capture(props: Partial<Parameters<typeof TaskFileExplorer>[0]>) {
  let tree: ReactNode;
  function Capture() {
    tree = TaskFileExplorer({ browserMode: true, files: [other, target], taskId: "notification-focus", currentUser: "周岚", ...props });
    return null;
  }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  const preview = elements(tree!, node => node.type === Dialog && elements(node.props.children, child => child.type === DialogContent && child.props.className?.includes("task-file-preview-dialog")).length > 0)[0];
  return {
    open: preview.props.open,
    viewer: elements(tree!, node => node.type === TaskFileViewer)[0]?.props.file,
    error: elements(tree!, node => node.type === TaskFileBrowser)[0]?.props.error,
  };
}

const other: TaskFileNode = { id: "other", kind: "file", name: "A.txt", content: "Unrelated content", parentId: null, updatedAt: "", version: 1 };
const target: TaskFileNode = { id: "target", kind: "file", name: "Z.txt", content: "Requested content", parentId: null, updatedAt: "", version: 1 };

test("明确文件焦点首次渲染只打开准确目标，不因排序退回首文件", () => {
  const actual = capture({ focusedFileId: target.id });
  assert.equal(actual.open, true);
  assert.equal(actual.viewer?.id, target.id);
});

test("不存在、归档或普通退役的明确目标保持预览关闭，不展示其他文件", () => {
  for (const files of [[other], [other, { ...target, archived: true }], [other, { ...target, retiredBuiltin: true as const }]]) {
    const actual = capture({ files, focusedFileId: target.id });
    assert.equal(actual.open, false);
    assert.equal(actual.viewer, undefined);
    assert.match(actual.error, /文件暂不可用/);
  }
});

test("隐藏祖先下的明确目标不能绕过文件树可见性", () => {
  const folder: TaskFileNode = { id: "hidden", kind: "folder", name: "Hidden", parentId: null, archived: true, updatedAt: "" };
  const actual = capture({ files: [other, folder, { ...target, parentId: folder.id }], focusedFileId: target.id });
  assert.equal(actual.open, false);
  assert.equal(actual.viewer, undefined);
});

test("未指定文件焦点时保留原默认选中与不自动打开预览", () => {
  const actual = capture({});
  assert.equal(actual.open, false);
  assert.equal(actual.viewer?.id, other.id);
});

test("宿主明确交入的历史讨论来源仍能按原身份预览", () => {
  const source = { ...target, retiredBuiltin: true as const };
  const actual = capture({ files: [other], transientPreviewFile: source, focusedFileId: source.id, preserveFocusedDirectory: true });
  assert.equal(actual.open, true);
  assert.equal(actual.viewer?.id, source.id);
});

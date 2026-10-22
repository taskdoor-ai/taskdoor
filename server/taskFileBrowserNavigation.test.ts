import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { searchTaskFileTree } from "../src/features/tasks/files/lib/task-file-tree.ts";

register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { TaskFileBrowser } = await import("../src/features/tasks/files/components/TaskFileBrowser.tsx");
const { TaskFileTree } = await import("../src/features/tasks/files/components/TaskFileTree.tsx");
const { DropdownMenuTrigger, DropdownMenuItem } = await import("../src/shared/ui/dropdown-menu.tsx");
const { Input } = await import("../src/shared/ui/input.tsx");
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
function capture(props: Partial<Parameters<typeof TaskFileBrowser>[0]> = {}, initialize?: (tree: ReactNode) => void) {
  let tree: ReactNode = null;
  function Capture() {
    tree = TaskFileBrowser({ files, directoryId: null, onDirectoryChange: () => {}, expandedIds: new Set(), onExpandedChange: () => {}, onOpen: () => {}, onAction: () => {}, onCreateFolder: () => {}, onUpload: () => {}, uploading: false, displayName: name => name, ...props });
    initialize?.(tree);
    return null;
  }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(Capture) }));
  return tree;
}
const folder: TaskFileNode = { id: "folder", kind: "folder", name: "交付成果", parentId: null, updatedAt: "" };
const nested: TaskFileNode = { id: "nested", kind: "folder", name: "执行资料", parentId: folder.id, updatedAt: "" };
const empty: TaskFileNode = { id: "empty", kind: "folder", name: "空目录", parentId: null, updatedAt: "" };
const rootFile: TaskFileNode = { id: "root-file", kind: "file", name: "根文件.txt", parentId: null, updatedAt: "" };
const deepFile: TaskFileNode = { id: "deep-file", kind: "file", name: "资料3.txt", parentId: nested.id, updatedAt: "" };
const files = [folder, nested, empty, rootFile, deepFile];
const fileTree = (tree: ReactNode) => elements(tree, item => item.type === TaskFileTree)[0];

test("根与嵌套位置不展示路径导航，仍保留全任务树和当前添加目录", () => {
  const root = capture();
  const toolbar = elements(root, item => item.props.className === "task-file-browser-toolbar")[0];
  assert.equal(elements(toolbar, item => item.type === "nav").length, 0);
  assert.equal(elements(toolbar, item => item.props.className === "task-file-browser-actions").length, 1);
  assert.deepEqual(fileTree(root).props.nodes, files);
  assert.equal(fileTree(root).props.selectedId, null);
  const selected = capture({ directoryId: nested.id, expandedIds: new Set([folder.id, nested.id]) });
  assert.deepEqual(fileTree(selected).props.nodes, files);
  assert.equal(fileTree(selected).props.selectedId, nested.id);
  assert.equal(elements(selected, item => item.type === "nav").length, 0);
});

test("独立展开保留其他目录，折叠当前目录的祖先使添加位置回到可见父级", () => {
  const expanded: Set<string>[] = [];
  const locations: Array<string | null> = [];
  const tree = capture({ directoryId: nested.id, expandedIds: new Set([folder.id, nested.id]), onExpandedChange: ids => expanded.push(ids), onDirectoryChange: id => locations.push(id) });
  fileTree(tree).props.onExpandedChange(new Set([folder.id, nested.id, empty.id]));
  assert.deepEqual([...expanded.at(-1)!].sort(), [empty.id, folder.id, nested.id].sort());
  assert.equal(locations.at(-1), empty.id);
  fileTree(tree).props.onExpandedChange(new Set());
  assert.equal(locations.at(-1), null);
  assert.deepEqual([...expanded.at(-1)!], []);
});

test("搜索可找到折叠目录中的文件及其完整祖先，清除后恢复原展开集合", () => {
  const original = new Set([empty.id]);
  let searched = false;
  const search = capture({ expandedIds: original }, tree => {
    if (searched) return;
    searched = true;
    elements(tree, item => item.type === Input)[0].props.onChange({ target: { value: "资料3" } });
  });
  assert.deepEqual(fileTree(search).props.nodes.map((node: TaskFileNode) => node.id), [folder.id, nested.id, deepFile.id]);
  assert.deepEqual([...fileTree(search).props.expandedIds], [folder.id, nested.id]);
  assert.equal(elements(search, item => item.props.className === "task-file-browser-count")[0].props.children, 1);
  let step = 0;
  const cleared = capture({ expandedIds: original }, tree => {
    if (step === 0) { step++; elements(tree, item => item.type === Input)[0].props.onChange({ target: { value: "资料3" } }); }
    else if (step === 1) { step++; elements(tree, item => item.props["aria-label"] === "清除搜索")[0].props.onClick(); }
  });
  assert.deepEqual(fileTree(cleared).props.nodes, files);
  assert.deepEqual(fileTree(cleared).props.expandedIds, original);
});

test("搜索不泄露已归档祖先下的文件，文件夹命中仍可展开其有效内容", () => {
  const hidden = { ...deepFile, id: "hidden", parentId: "archived" };
  assert.deepEqual(searchTaskFileTree([...files, { ...folder, id: "archived", archived: true }, hidden], "资料3").nodes.map(node => node.id), [folder.id, nested.id, deepFile.id]);
  assert.deepEqual(searchTaskFileTree(files, "交付").nodes, [folder, nested, deepFile]);
  assert.equal(searchTaskFileTree(files, "交付").matches, 1);
});

test("文件激活保留准确预览入口，整理菜单复用原回调", () => {
  const opened: Array<[string, HTMLElement]> = [];
  const locations: Array<string | null> = [];
  let created = 0;
  let uploaded = 0;
  const tree = capture({ uploading: true, onDirectoryChange: id => locations.push(id), onOpen: (id, trigger) => opened.push([id, trigger]), onCreateFolder: () => { created++; }, onUpload: () => { uploaded++; } });
  const trigger = { isConnected: true } as HTMLElement;
  fileTree(tree).props.onSelect(deepFile.id, trigger);
  assert.deepEqual(opened, [[deepFile.id, trigger]]);
  assert.equal(locations.at(-1), nested.id);
  assert.equal(elements(tree, item => item.type === DropdownMenuTrigger && item.props.className === "task-file-browser-add").length, 1);
  const items = elements(tree, item => item.type === DropdownMenuItem);
  items[0].props.onClick();
  assert.equal(created, 1);
  assert.equal(items[0].props.disabled ?? false, false);
  assert.equal(items[1].props.disabled, true);
  assert.equal(uploaded, 0);
  const available = capture({ onUpload: () => { uploaded++; } });
  elements(available, item => item.type === DropdownMenuItem)[1].props.onClick();
  assert.equal(uploaded, 1);
});

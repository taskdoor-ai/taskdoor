import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskFileExplorer } from "../src/components/task-files/TaskFileExplorer.tsx";
import { TaskFileViewer, type TaskFileTextSelection } from "../src/components/task-files/TaskFileViewer.tsx";
import { LexicalFileDocument } from "../src/components/task-files/LexicalFileDocument.tsx";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";
import { FileDiscussionPanel, type FileDiscussionCollaboration } from "../src/components/task-files/FileDiscussionPanel.tsx";
import { getVisibleFileDiscussionThreads } from "../src/lib/taskCollaboration.ts";

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
const pdf: TaskFileNode = { id: "rules", kind: "file", name: "规则.pdf", parentId: null, updatedAt: "2026-09-15 09:00", version: 1, previewData: { kind: "pdf", pages: ["请核对适用范围。", "请核对适用范围。"] } };
const collaboration: FileDiscussionCollaboration = { threads: [], messages: [], people: [], currentUserId: "user-a", currentUserName: "周岚", canManage: true, onPost: () => {}, onEdit: () => {}, onDelete: () => {}, onResolve: () => {} };

test("PDF 阅读的每页接入划词评论，重复文本仍带对应页码", () => {
  const selected: TaskFileTextSelection[] = [];
  const tree = TaskFileViewer({ file: pdf, onSelection: selection => { if (selection) selected.push(selection); } });
  const pages = elements(tree, node => node.type === LexicalFileDocument);
  assert.equal(pages.length, 2, "PDF 每页必须使用可评论的正文阅读器");
  pages[1].props.onSelection({ text: "适用范围", documentText: "请核对适用范围。", selectionStart: 3, selectionEnd: 7, location: "所选正文", rect: { left: 100, bottom: 200 } });
  assert.equal((selected[0] as TaskFileTextSelection & { pageIndex?: number }).pageIndex, 1);
  assert.equal(selected[0].location, "第 2 页");
  assert.equal(selected[0].documentText?.slice(selected[0].selectionStart, selected[0].selectionEnd), selected[0].text);
});

test("PDF 编辑状态仍向正文传递选区回调，不再静默屏蔽评论", () => {
  let step = 0;
  let tree: ReactNode;
  function Capture() {
    tree = TaskFileExplorer({ files: [pdf], taskId: "pdf-edit-comment", currentUser: "周岚", collaboration });
    if (step++ === 0) elements(tree, node => node.props["aria-label"] === "编辑文件")[0].props.onClick();
    return tree;
  }
  renderToStaticMarkup(createElement(Capture));
  const viewer = elements(tree, node => node.type === TaskFileViewer)[0];
  assert.equal(typeof viewer.props.onChange, "function");
  assert.equal(typeof viewer.props.onSelection, "function");
});

test("文件顶部仅保留查看讨论入口，不展示下载、添加评论和常驻说明", () => {
  const html = renderToStaticMarkup(createElement(TaskFileExplorer, { files: [pdf], taskId: "file-entry", currentUser: "周岚", collaboration }));
  assert.doesNotMatch(html, /aria-label="添加文件评论"|task-file-download-button|task-file-comment-hint|选中文字可添加评论/);
  assert.match(html, /查看讨论/);
  assert.match(html, /aria-label="查看文件讨论"/);
});

test("文件删除最后一条评论后隐藏讨论串及计数，有其他回复的串继续显示", () => {
  const thread = { id: "thread", fileId: pdf.id, version: 1, quote: "适用范围", documentText: "请核对适用范围。", createdBy: "周岚", createdAt: "2026-09-16T01:00:00Z" };
  const root = { id: "root", fileThreadId: thread.id, author: "周岚", type: "member-post" as const, message: "", time: "2026-09-16 09:00", deletedAt: "2026-09-16T01:01:00Z" };
  const reply = { id: "reply", fileThreadId: thread.id, author: "陈默", type: "member-reply" as const, replyToActivityId: root.id, message: "保留这条回复", time: "2026-09-16 09:01" };
  assert.equal(getVisibleFileDiscussionThreads([thread], [root]).length, 0);
  assert.deepEqual(getVisibleFileDiscussionThreads([thread], [root, reply]), [thread]);
  const props = { file: pdf, files: [pdf], taskId: "file-deletion", draftThread: null, onClose: () => {}, onNewThread: () => {}, onCancelDraft: () => {}, onDraftSaved: () => {}, onLocate: () => {}, onOpenFile: () => {} };
  const empty = renderToStaticMarkup(createElement(FileDiscussionPanel, { ...props, collaboration: { ...collaboration, threads: [thread], messages: [root] } }));
  assert.match(empty, /文件讨论 <span>0<\/span>/);
  assert.match(empty, /暂无文件讨论/);
  assert.doesNotMatch(empty, /file-thread-thread|适用范围|已删除/);
  const visible = renderToStaticMarkup(createElement(FileDiscussionPanel, { ...props, collaboration: { ...collaboration, threads: [thread], messages: [root, reply] } }));
  assert.match(visible, /保留这条回复/);
  assert.match(visible, /文件讨论 <span>1<\/span>/);
  assert.doesNotMatch(visible, /task-activity-root|已删除/);
  let tree: ReactNode;
  function Capture() {
    tree = TaskFileExplorer({ files: [pdf], taskId: "deleted-file-thread-count", currentUser: "周岚", collaboration: { ...collaboration, threads: [thread], messages: [root] } });
    return tree;
  }
  renderToStaticMarkup(createElement(Capture));
  assert.deepEqual(elements(tree, node => node.type === TaskFileViewer)[0].props.threads, [], "空串不留下正文标记和入口数量");
});

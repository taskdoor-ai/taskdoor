import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, type EditorState } from "lexical";
import { DiscussionComposer, isDiscussionSubmitShortcut, type DiscussionComposerProps } from "../src/components/discussion/DiscussionComposer.tsx";
import { $createMentionNode, $isMentionNode, MentionNode } from "../src/components/discussion/MentionNode.ts";
import { DISCUSSION_UPLOAD_MAX_BYTES, isDiscussionImage, prepareDiscussionUpload } from "../src/lib/discussionUploads.ts";
import type { DiscussionDraft } from "../src/lib/taskCollaboration.ts";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
type Element = ReactElement<Record<string, any>>;

function elements(tree: ReactNode, match: (element: Element) => boolean): Element[] {
  const result: Element[] = [];
  Children.forEach(tree, child => {
    if (!isValidElement<Record<string, any>>(child)) return;
    if (match(child)) result.push(child);
    result.push(...elements(child.props.children, match));
  });
  return result;
}

function editorState(body: string, mentions: Array<{ id: string; name: string }> = []): EditorState {
  const editor = createEditor({ namespace: "discussion-test", nodes: [MentionNode], onError: error => { throw error; } });
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode(body));
    mentions.forEach(person => paragraph.append($createMentionNode(person.id, person.name), $createTextNode(" ")));
    $getRoot().append(paragraph);
  }, { discrete: true });
  return editor.getEditorState();
}

function capture(props: Partial<DiscussionComposerProps> = {}, initialEditorState?: EditorState) {
  let tree: ReactNode = null;
  let initialized = false;
  function Capture() {
    const wrapper = DiscussionComposer({ people: [], files: [], onSubmit: () => undefined, ...props });
    tree = (wrapper.type as (props: DiscussionComposerProps) => ReactNode)(wrapper.props);
    if (initialEditorState && !initialized) {
      initialized = true;
      elements(tree, element => element.type === OnChangePlugin)[0].props.onChange(initialEditorState);
    }
    return tree;
  }
  const html = renderToStaticMarkup(createElement(Capture));
  return { html, tree, submit: () => elements(tree, element => element.props.className === "discussion-composer-submit")[0].props.onClick() };
}

test("Lexical 提及序列化保留稳定人员 ID，普通 @ 文本始终不是提及", () => {
  const state = editorState("普通 @周岚 ", [{ id: "person-1", name: "同名成员" }, { id: "person-2", name: "同名成员" }]);
  const serialized = state.toJSON();
  const restoredEditor = createEditor({ namespace: "discussion-restored", nodes: [MentionNode], onError: error => { throw error; } });
  const restored = restoredEditor.parseEditorState(JSON.stringify(serialized));
  restored.read(() => {
    const nodes = $getRoot().getAllTextNodes();
    assert.equal($getRoot().getTextContent(), "普通 @周岚 @同名成员 @同名成员 ");
    assert.deepEqual(nodes.filter($isMentionNode).map(node => node.getPersonId()), ["person-1", "person-2"]);
    assert.ok(nodes.filter($isMentionNode).every(node => node.isToken()));
    assert.equal($isMentionNode(nodes[0]), false);
  });
  assert.deepEqual(restored.toJSON(), serialized);
});

test("只有 ⌘/Ctrl+Enter 提交，Enter 换行且中文输入法不会触发提交", () => {
  const event = { key: "Enter", ctrlKey: false, metaKey: false, isComposing: false, keyCode: 13 };
  assert.equal(isDiscussionSubmitShortcut(event), false);
  assert.equal(isDiscussionSubmitShortcut({ ...event, ctrlKey: true }), true);
  assert.equal(isDiscussionSubmitShortcut({ ...event, metaKey: true }), true);
  assert.equal(isDiscussionSubmitShortcut({ ...event, ctrlKey: true, isComposing: true }), false);
  assert.equal(isDiscussionSubmitShortcut({ ...event, metaKey: true, keyCode: 229 }), false);
  assert.equal(isDiscussionSubmitShortcut({ ...event, metaKey: true }, true), false);
});

test("共享编辑器无需 window 即可 SSR，统一附件入口并在发布按钮前显示键盘说明", () => {
  assert.equal(typeof window, "undefined");
  const { html } = capture();
  assert.match(html, /contentEditable="true" role="textbox"/);
  assert.match(html, /aria-multiline="true"/);
  assert.match(html, /Enter 换行，⌘\/Ctrl\+Enter 发布/);
  assert.doesNotMatch(html, /可拖入文件或粘贴图片|最多 10 个附件，单个不超过 20 MiB/);
  assert.match(html, /aria-label="添加附件"/);
  assert.doesNotMatch(html, /aria-label="本地上传"|aria-label="从文件列表选择"/);
  assert.ok(html.indexOf("Enter 换行") < html.indexOf('class="discussion-composer-submit"'));
});

test("人员菜单的迟到关闭回调不会覆盖已回到编辑器的光标", () => {
  const { tree } = capture();
  let updates = 0;
  let focuses = 0;
  const root = { isConnected: true, ownerDocument: { activeElement: null as unknown }, contains: (element: unknown) => element === root };
  root.ownerDocument.activeElement = root;
  const bridge = elements(tree, element => typeof element.props.onSelectionChange === "function")[0];
  bridge.props.onEditor({ getRootElement: () => root, update: () => { updates++; }, focus: () => { focuses++; } });
  const picker = elements(tree, element => typeof element.props.finalFocus === "function")[0];
  assert.equal(picker.props.finalFocus(), false);
  assert.equal(updates, 0);
  assert.equal(focuses, 0);
  root.ownerDocument.activeElement = {};
  picker.props.finalFocus();
  assert.equal(updates, 1, "离开编辑器时同步恢复选区");
  assert.equal(focuses, 1, "不通过晚到的动画帧重新移动光标");
});

test("发布 Promise 完成前拒绝重复提交，真实成功后清空会话草稿", async () => {
  let resolve!: () => void;
  const completion = new Promise<void>(done => { resolve = done; });
  const sent: DiscussionDraft[] = [];
  const draftKey = "discussion-submit-once";
  const composer = capture({ draftKey, onSubmit: draft => { sent.push(draft); return completion; } }, editorState("需要确认 ", [{ id: "visible-person-1", name: "周岚" }]));
  composer.submit();
  composer.submit();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, "需要确认 @周岚");
  assert.deepEqual(sent[0].mentions, ["visible-person-1"]);
  resolve();
  await setImmediate();
  const reopened = capture({ draftKey });
  assert.equal(elements(reopened.tree, element => element.props.className === "discussion-composer-submit")[0].props.disabled, true);
});

for (const asyncFailure of [false, true]) test(`${asyncFailure ? "异步" : "同步"}发布失败保留正文和提及，重新打开后可以重试`, async () => {
  const draftKey = `discussion-submit-failure-${asyncFailure}`;
  const composer = capture({ draftKey, onSubmit: () => { if (asyncFailure) return Promise.reject(new Error("保存失败")); throw new Error("保存失败"); } }, editorState("请复核 ", [{ id: "person-keep", name: "林洁" }]));
  composer.submit();
  await setImmediate();
  const sent: DiscussionDraft[] = [];
  capture({ draftKey, onSubmit: draft => { sent.push(draft); } }).submit();
  await setImmediate();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, "请复核 @林洁");
  assert.deepEqual(sent[0].mentions, ["person-keep"]);
});

test("纯附件评论可以发布；取消保留草稿且不发布", async () => {
  const file: TaskFileNode = { id: "file-existing", name: "验收记录.md", kind: "file", parentId: null, updatedAt: "今天", content: "验收结论" };
  const sent: DiscussionDraft[] = [];
  const attachmentOnly = capture({ initialValue: { body: "", mentions: [], attachments: [file] }, onSubmit: draft => { sent.push(draft); } });
  assert.equal(elements(attachmentOnly.tree, element => element.props.className === "discussion-composer-submit")[0].props.disabled, false);
  attachmentOnly.submit();
  await setImmediate();
  assert.deepEqual(sent, [{ body: "", mentions: [], attachments: [file] }]);
  let cancelled = false;
  const draftKey = "discussion-cancel-keeps-draft";
  const cancelledComposer = capture({ draftKey, onCancel: () => { cancelled = true; }, onSubmit: () => { throw new Error("取消不可发布"); } }, editorState("未发布的评论"));
  elements(cancelledComposer.tree, element => element.props.className === "discussion-composer-cancel")[0].props.onClick();
  assert.equal(cancelled, true);
  assert.equal(elements(capture({ draftKey }).tree, element => element.props.className === "discussion-composer-submit")[0].props.disabled, false);
});

test("超大文件在读取与存储前失败，图片预览仅识别受支持的格式", async () => {
  let read = false;
  const oversized = { name: "超大.pdf", size: DISCUSSION_UPLOAD_MAX_BYTES + 1, text: () => { read = true; throw new Error("不应读取"); } } as unknown as File;
  await assert.rejects(prepareDiscussionUpload(oversized), /20 MiB/);
  assert.equal(read, false);
  for (const name of ["照片.PNG", "照片.jpeg", "截图.webp", "动画.gif"]) assert.equal(isDiscussionImage({ name }), true);
  assert.equal(isDiscussionImage({ name: "可执行图像.svg", mimeType: "image/svg+xml" }), false);
  assert.equal(isDiscussionImage({ name: "合同.pdf", mimeType: "application/pdf" }), false);
});

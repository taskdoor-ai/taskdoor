import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskFileViewer } from "../src/components/task-files/TaskFileViewer.tsx";
import { TaskFileExplorer } from "../src/components/task-files/TaskFileExplorer.tsx";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";
import { createTaskFileRevision } from "../src/lib/taskFileEditing.ts";
import { TaskFileHistory } from "../src/components/task-files/TaskFileHistory.tsx";

const file: TaskFileNode = { id: "document", kind: "file", parentId: null, name: "决策.md", version: 4, updatedAt: "昨天", content: "# 决策\n\n## 当前结论\n\n等待确认。" };

function elementWithClass(html: string, className: string): string {
  const opening = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`).exec(html);
  assert.ok(opening, `缺少元素：${className}`);
  const tags = new RegExp(`</?${opening[1]}\\b[^>]*>`, "g");
  tags.lastIndex = opening.index;
  let depth = 0;
  for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(opening.index, tags.lastIndex);
  }
  assert.fail(`元素未闭合：${className}`);
}

const visibleText = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, "");

test("文件默认只读，服务端初始紧凑态只保留路径与更多操作入口", () => {
  const html = renderToStaticMarkup(createElement(TaskFileExplorer, { taskId: "test-task", currentUser: "周岚", files: [file], onSelectText: () => undefined }));
  assert.match(html, /aria-label="文件位置"/);
  assert.match(html, /aria-label="更多文件操作"/);
  assert.match(html, /aria-label="文件正文"/);
  assert.doesNotMatch(html, /<textarea|contenteditable="true"|aria-label="保存文件"/);
  assert.doesNotMatch(html, /task-file-save-state|只读/, "默认状态不显示只读文案或空的状态占位");
  assert.doesNotMatch(html, /task-file-last-update|更新人未记录|原更新时间|aria-label="编辑文件"|查看版本记录|查看文件讨论/);
  assert.doesNotMatch(html, /task-file-explorer-preview-header|task-file-selection-hint/);
});

test("紧凑态将查看版本与编辑收入菜单，宽面板恢复直接操作", () => {
  const source = readFileSync(new URL("../src/components/task-files/TaskFileExplorer.tsx", import.meta.url), "utf8");
  assert.match(source, /getBoundingClientRect\(\)\.width < 720/);
  assert.match(source, /!isEditing && !compactToolbar/);
  assert.match(source, /DropdownMenuTrigger aria-label="更多文件操作"/);
  assert.match(source, /compactToolbar && <DropdownMenuItem aria-label="查看版本记录"/);
  assert.match(source, /DropdownMenuItem aria-label="查看文件讨论"/);
  assert.match(source, /compactToolbar && currentContent && !loadError && !isEditing && <DropdownMenuItem aria-label="编辑文件"/);
  assert.doesNotMatch(source, />重命名<\/DropdownMenuItem>/);
  assert.doesNotMatch(source, /task-file-version-button|PopoverTrigger/);
});

test("紧凑态可从菜单编辑，编辑态保存保持有文字的主动作", () => {
  const source = readFileSync(new URL("../src/components/task-files/TaskFileExplorer.tsx", import.meta.url), "utf8");
  const edit = source.match(/compactToolbar && currentContent[\s\S]*?<DropdownMenuItem aria-label="编辑文件"[\s\S]*?<\/DropdownMenuItem>/)?.[0];
  const buttons = source.match(/<Button\b[\s\S]*?<\/Button>/g) ?? [];
  const save = buttons.find(button => button.includes('aria-label="保存文件"'));
  assert.ok(edit, "菜单保留明确的编辑入口");
  assert.ok(save, "保留明确的保存入口");
  assert.equal(save.match(/\bvariant="([^"]+)"/)?.[1] ?? "default", "default");
  assert.match(save, /保存\s*<\/Button>$/, "保存保留可见文字，不能只剩图标");
});

test("表格与 PDF 同样默认只读，不直接暴露编辑控件", () => {
  const files: TaskFileNode[] = [
    { ...file, name: "名单.xlsx", previewData: { kind: "table", sheets: [{ name: "进度", columns: ["事项"], rows: [["需要核对"]] }] } },
    { ...file, name: "规则.pdf", previewData: { kind: "pdf", pages: ["原始正文"] } },
  ];
  for (const item of files) {
    const html = renderToStaticMarkup(createElement(TaskFileExplorer, { taskId: "readonly-types", currentUser: "周岚", files: [item], onSelectText: () => undefined }));
    assert.doesNotMatch(html, /<textarea|aria-label="进度 A2"/);
    assert.match(html, /aria-label="更多文件操作"/);
  }
});

test("最近更新信息收到更多操作菜单，不再占用顶部路径", () => {
  const record = createTaskFileRevision(file, { kind: "text", text: "已经确认。" }, "陈默", "2026-08-31T12:00:00Z")!;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => JSON.stringify({ [file.id]: record }) } } });
  try {
    const html = renderToStaticMarkup(createElement(TaskFileExplorer, { taskId: "saved-update", currentUser: "周岚", files: [file], onSelectText: () => undefined }));
    assert.doesNotMatch(html, /task-file-last-update|陈默于|更新人未记录|原更新时间/);
    const source = readFileSync(new URL("../src/components/task-files/TaskFileExplorer.tsx", import.meta.url), "utf8");
    assert.match(source, /DropdownMenuLabel aria-label="最近更新"/);
    assert.doesNotMatch(html, /<textarea/);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("没有作者时不在顶部补造当前用户", () => {
  const currentUser = "不可冒用的当前用户";
  for (const updatedAt of ["昨天", "2026-08-31T12:00:00Z"]) {
    const html = renderToStaticMarkup(createElement(TaskFileExplorer, { taskId: "unknown-update-author", currentUser, files: [{ ...file, updatedAt }], onSelectText: () => undefined }));
    assert.doesNotMatch(html, /不可冒用的当前用户|更新人未记录|原更新时间|未记录|更新于|task-file-last-update/);
  }
});

test("没有更新时间时不展示空的更新信息或补造作者时间", () => {
  const html = renderToStaticMarkup(createElement(TaskFileExplorer, { taskId: "missing-update-time", currentUser: "不可冒用的当前用户", files: [{ ...file, updatedAt: "" }], onSelectText: () => undefined }));
  assert.doesNotMatch(html, /task-file-last-update|aria-label="最近更新"|更新人未记录|原更新时间|不可冒用的当前用户/);
  assert.match(html, /aria-label="更多文件操作"/);
});

test("真实表格单元格可编辑，不生成与当前文件无关的假数据", () => {
  const html = renderToStaticMarkup(createElement(TaskFileViewer, {
    file: { ...file, name: "名单.xlsx", previewData: { kind: "table", sheets: [{ name: "进度", columns: ["事项"], rows: [["需要核对"]] }] } },
    draft: { kind: "table", sheets: [{ name: "进度", columns: ["事项"], rows: [["需要核对"]] }] },
    onChange: () => undefined,
  }));
  assert.match(html, /aria-label="进度 A2"/);
  assert.match(html, /value="需要核对"/);
  const empty = renderToStaticMarkup(createElement(TaskFileViewer, { file: { ...file, name: "名单.xlsx", content: undefined } }));
  assert.doesNotMatch(empty, /第二批达人确认|直播脚本终审|库存核对/);
});

test("PDF 允许编辑已有提取正文，但明确不是原 PDF 排版编辑", () => {
  const html = renderToStaticMarkup(createElement(TaskFileViewer, {
    file: { ...file, name: "规则.pdf", previewData: { kind: "pdf", pages: ["原始正文"] } },
    draft: { kind: "pdf", pages: ["原始正文"] }, onChange: () => undefined,
  }));
  assert.match(html, /PDF 提取正文/);
  assert.match(html, /aria-label="编辑第 1 页正文"/);
});

test("左侧选中项没有蓝色竖边，保留键盘焦点提示", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const active = css.match(/\.task-file-explorer-row\.active\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.doesNotMatch(active, /box-shadow:\s*inset|border-left/);
  assert.match(css, /\.task-file-explorer-row:focus-visible/);
});

test("文件列表圆角与左侧任务列表共用同一控件圆角", () => {
  const taskCss = readFileSync(new URL("../src/styles/task-workspace-list.css", import.meta.url), "utf8");
  const fileCss = readFileSync(new URL("../src/styles/task-file-editor.css", import.meta.url), "utf8");
  const radius = (css: string, selector: RegExp) => css.match(selector)?.[1].match(/border-radius:\s*([^;]+);/)?.[1];
  const taskRadius = radius(taskCss, /\.task-workspace-row\s*\{([^}]+)\}/);
  assert.ok(taskRadius);
  assert.equal(radius(fileCss, /\.task-file-explorer-row\s*\{([^}]+)\}/), taskRadius);
});

test("历史面板展示修改人、精确位置和真实前后内容，空历史不补造", () => {
  const record = createTaskFileRevision(file, { kind: "text", text: "# 决策\n\n## 当前结论\n\n已经确认。" }, "陈默", "2026-08-31T12:00:00Z")!;
  const html = renderToStaticMarkup(createElement(TaskFileHistory, { version: record.version, revisions: record.revisions, onClose: () => undefined }));
  assert.match(visibleText(html), /当前v5/);
  for (const value of ["陈默", "第 5 行", "等待确认。", "已经确认。", "v5", "2026-08-31T12:00:00Z"]) assert.ok(html.includes(value), value);
  const empty = renderToStaticMarkup(createElement(TaskFileHistory, { version: 4, revisions: [], onClose: () => undefined }));
  assert.match(empty, /还没有(?:本地)?修改记录/);
  assert.doesNotMatch(empty, /修改前 ·/);
});

test("保存记录与来源格式不符时不白屏、不覆盖原记录，并停止该文件编辑", () => {
  const record = createTaskFileRevision(file, { kind: "text", text: "修改后的正文" }, "陈默")!;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => JSON.stringify({ [file.id]: record }) } } });
  try {
    const html = renderToStaticMarkup(createElement(TaskFileExplorer, { taskId: "test-task", currentUser: "周岚", files: [{ ...file, name: "决策.pdf", previewData: { kind: "pdf", pages: ["未修改的原 PDF"] } }], onSelectText: () => undefined }));
    assert.match(html, /role="alert"/);
    assert.match(html, /task-file-pdf-document/);
    assert.match(html, /aria-label="文件正文"/);
    assert.doesNotMatch(html, /修改后的正文/);
    assert.doesNotMatch(html, /编辑第 1 页正文/);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

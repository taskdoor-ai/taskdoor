# Task File Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Task 详情“文件”页改造成支持多级文件夹管理、唯一文件归属、自定义 Icon、版本号和多格式预览的双栏资源管理器。

**Architecture:** 从 `TaskDetail.tsx` 中拆出独立的文件领域模型、纯操作函数、递归 Tree 和格式查看器。`TaskFileExplorer` 在前端本地状态中组合这些单元，所有写操作通过可测试的不可变树函数完成；预览通过格式路由器选择专用查看器，未知格式安全回退。

**Tech Stack:** React、TypeScript、Lucide React、Base UI/Radix 风格的现有 Dialog/Popover/Dropdown、Node `tsx --test`、现有 TaskDoor CSS Tokens。

---

## 文件结构

- Create `src/lib/taskFileTree.ts`：文件格式识别、稳定排序、树查询与不可变增删改移动规则。
- Create `src/components/task-files/TaskFileExplorer.tsx`：文件模块状态组合和双栏/窄屏导航。
- Create `src/components/task-files/TaskFileTree.tsx`：递归 Tree、键盘导航、节点菜单与就地重命名。
- Create `src/components/task-files/TaskFileViewer.tsx`：格式路由与 Markdown、文本、表格、PDF、图片、DOCX、未知格式查看器。
- Create `src/components/task-files/TaskFileDialogs.tsx`：创建、移动、删除和 Icon 选择 Dialog。
- Modify `src/data/taskDetailMocks.ts`：扩展节点 Schema 与多格式 Mock。
- Modify `src/components/TaskDetail.tsx`：用 `TaskFileExplorer` 替换内联文件树与文档查看器。
- Modify `src/styles.css`：A1 精密工作台视觉、Tree、查看器和响应式样式。
- Create `server/taskFileTree.test.ts`：纯操作、格式识别和预览路由回归。

### Task 1: 文件模型与纯树操作

**Files:**
- Create: `src/lib/taskFileTree.ts`
- Modify: `src/data/taskDetailMocks.ts`
- Test: `server/taskFileTree.test.ts`

- [ ] **Step 1: 写失败测试，固定格式、排序和唯一归属规则**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  createFolder,
  deleteFolder,
  getDefaultFileIcon,
  getPreviewKind,
  moveNode,
  renameNode,
  sortTaskFileNodes,
} from "../src/lib/taskFileTree.ts";
import type { TaskFileNode } from "../src/data/taskDetailMocks.ts";

const nodes: TaskFileNode[] = [
  { id: "root", kind: "folder", name: "项目", parentId: null, updatedAt: "今天" },
  { id: "child", kind: "folder", name: "资料", parentId: "root", updatedAt: "今天" },
  { id: "md", kind: "file", name: "说明.md", parentId: "child", format: "MD", version: 3, updatedAt: "今天" },
];

test("recognizes preview formats and default icons", () => {
  assert.equal(getPreviewKind("方案.md"), "markdown");
  assert.equal(getPreviewKind("名单.xlsx"), "table");
  assert.equal(getPreviewKind("海报.png"), "image");
  assert.equal(getPreviewKind("模型.bin"), "unknown");
  assert.equal(getDefaultFileIcon("名单.xlsx"), "Sheet");
});

test("keeps folders before files and sorts names", () => {
  assert.deepEqual(sortTaskFileNodes([
    { ...nodes[2], name: "B.md" },
    { ...nodes[1], name: "A" },
  ]).map((node) => node.name), ["A", "B.md"]);
});

test("creates and renames folders without sibling duplicates", () => {
  const created = createFolder(nodes, "root", "执行");
  assert.equal(created.nodes.at(-1)?.parentId, "root");
  assert.throws(() => createFolder(created.nodes, "root", "执行"), /同级已存在/);
  assert.equal(renameNode(nodes, "child", "参考资料").find((node) => node.id === "child")?.name, "参考资料");
});

test("moves a node exactly once and rejects descendants", () => {
  const moved = moveNode(nodes, "md", "root");
  assert.equal(moved.find((node) => node.id === "md")?.parentId, "root");
  assert.throws(() => moveNode(nodes, "root", "child"), /后代/);
});

test("deletes non-empty folder by moving contents to parent", () => {
  const result = deleteFolder(nodes, "child", "move-contents");
  assert.equal(result.some((node) => node.id === "child"), false);
  assert.equal(result.find((node) => node.id === "md")?.parentId, "root");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskFileTree.test.ts`

Expected: FAIL，提示 `src/lib/taskFileTree.ts` 不存在。

- [ ] **Step 3: 扩展 TaskFileNode 并实现纯函数**

```ts
export type TaskFilePreviewKind = "markdown" | "text" | "table" | "pdf" | "image" | "document" | "unknown";
export type TaskFilePreviewData =
  | { kind: "table"; sheets: Array<{ name: string; columns: string[]; rows: string[][] }> }
  | { kind: "image"; alt: string; src: string; width?: number; height?: number }
  | { kind: "pdf"; pages: string[] }
  | { kind: "markdown" | "text" | "document"; text: string };

export type TaskFileNode = {
  archived?: boolean;
  content?: string;
  format?: string;
  iconName?: string;
  id: string;
  kind: "folder" | "file";
  mimeType?: string;
  name: string;
  parentId: string | null;
  previewData?: TaskFilePreviewData;
  sizeLabel?: string;
  updatedAt: string;
  version?: number;
};
```

在 `src/lib/taskFileTree.ts` 实现并导出测试引用的函数；所有写操作返回新数组，验证空名称、同级重名、目标存在性与后代移动。

- [ ] **Step 4: 运行测试并确认通过**

Run: `npx tsx --test server/taskFileTree.test.ts`

Expected: PASS，5 tests。

- [ ] **Step 5: 提交 Task 1**

```bash
git add src/lib/taskFileTree.ts src/data/taskDetailMocks.ts server/taskFileTree.test.ts
git commit -m "feat: add task file tree model"
```

### Task 2: 多格式查看器

**Files:**
- Create: `src/components/task-files/TaskFileViewer.tsx`
- Modify: `src/data/taskDetailMocks.ts`
- Modify: `src/styles.css`
- Test: `server/taskFileTree.test.ts`

- [ ] **Step 1: 增加查看器路由和版本数据失败测试**

```ts
test("routes all supported demo formats", () => {
  const cases = {
    "readme.md": "markdown",
    "notes.txt": "text",
    "data.csv": "table",
    "book.xlsx": "table",
    "brief.pdf": "pdf",
    "photo.webp": "image",
    "contract.docx": "document",
    "archive.zip": "unknown",
  } as const;
  for (const [name, expected] of Object.entries(cases)) assert.equal(getPreviewKind(name), expected);
});
```

- [ ] **Step 2: 运行测试并确认新增断言失败**

Run: `npx tsx --test server/taskFileTree.test.ts`

Expected: FAIL 于尚未覆盖的扩展名。

- [ ] **Step 3: 实现查看器组件与格式 Mock**

```tsx
export function TaskFileViewer({ file, onSelectText }: {
  file: TaskFileNode;
  onSelectText?: () => void;
}) {
  switch (getPreviewKind(file.name, file.mimeType)) {
    case "markdown": return <MarkdownFileViewer file={file} onSelectText={onSelectText} />;
    case "text": return <TextFileViewer file={file} onSelectText={onSelectText} />;
    case "table": return <TableFileViewer file={file} />;
    case "pdf": return <PdfFileViewer file={file} onSelectText={onSelectText} />;
    case "image": return <ImageFileViewer file={file} />;
    case "document": return <DocumentFileViewer file={file} onSelectText={onSelectText} />;
    default: return <UnsupportedFileViewer file={file} />;
  }
}
```

为香氛场景补齐 Markdown、XLSX、PDF、DOCX、图片、纯文本与未知格式 Mock；样式使用 `task-file-viewer-*` 命名，表格支持工作表标签和横向滚动，PDF/DOCX 使用纸张视图，图片使用 contain。

- [ ] **Step 4: 运行格式测试与构建**

Run: `npx tsx --test server/taskFileTree.test.ts && npm run build`

Expected: PASS；Vite build 完成，无 TypeScript 错误。

- [ ] **Step 5: 提交 Task 2**

```bash
git add src/components/task-files/TaskFileViewer.tsx src/data/taskDetailMocks.ts src/styles.css server/taskFileTree.test.ts
git commit -m "feat: add task file format viewers"
```

### Task 3: 文件 Tree、Icon 与操作 Dialog

**Files:**
- Create: `src/components/task-files/TaskFileTree.tsx`
- Create: `src/components/task-files/TaskFileDialogs.tsx`
- Modify: `src/styles.css`
- Test: `server/taskFileTree.test.ts`

- [ ] **Step 1: 增加路径、后代和 Icon 恢复测试**

```ts
import { getNodePath, restoreDefaultIcon, setNodeIcon } from "../src/lib/taskFileTree.ts";

test("builds paths and restores icon overrides", () => {
  assert.deepEqual(getNodePath(nodes, "md").map((node) => node.name), ["项目", "资料", "说明.md"]);
  const customized = setNodeIcon(nodes, "md", "NotebookTabs");
  assert.equal(customized.find((node) => node.id === "md")?.iconName, "NotebookTabs");
  assert.equal(restoreDefaultIcon(customized, "md").find((node) => node.id === "md")?.iconName, undefined);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskFileTree.test.ts`

Expected: FAIL，提示新函数未导出。

- [ ] **Step 3: 实现 Tree 和 Dialog**

```tsx
type TaskFileTreeProps = {
  expandedIds: Set<string>;
  nodes: TaskFileNode[];
  onAction: (action: TaskFileAction) => void;
  onExpandedChange: (ids: Set<string>) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
};

export type TaskFileAction =
  | { type: "create-folder"; parentId: string | null }
  | { type: "rename"; nodeId: string }
  | { type: "move"; nodeId: string }
  | { type: "delete"; nodeId: string }
  | { type: "change-icon"; nodeId: string }
  | { type: "restore-icon"; nodeId: string };
```

Tree 使用 `role="tree"` / `role="treeitem"`、roving tab index 和方向键导航；Chevron 与名称是分离命中区。Dialog 分别处理创建、移动、删除策略和 Icon 选择，并在关闭后恢复触发节点焦点。

- [ ] **Step 4: 运行单元测试与构建**

Run: `npx tsx --test server/taskFileTree.test.ts && npm run build`

Expected: PASS；无 JSX/类型错误。

- [ ] **Step 5: 提交 Task 3**

```bash
git add src/components/task-files/TaskFileTree.tsx src/components/task-files/TaskFileDialogs.tsx src/lib/taskFileTree.ts src/styles.css server/taskFileTree.test.ts
git commit -m "feat: add interactive task file tree"
```

### Task 4: 组合 A1 双栏资源管理器并接入 TaskDetail

**Files:**
- Create: `src/components/task-files/TaskFileExplorer.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: 定义 Explorer 边界并把文件数组提升为本地状态**

```tsx
export function TaskFileExplorer({
  files: initialFiles,
  initialFileId,
  onFileSelection,
}: {
  files: TaskFileNode[];
  initialFileId?: string;
  onFileSelection?: (file: TaskFileNode, selection: Selection) => void;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedId, setSelectedId] = useState<string | null>(initialFileId ?? null);
  const [expandedIds, setExpandedIds] = useState(() => new Set<string>());
  // 组合 Toolbar、TaskFileTree、TaskFileViewer 和 Dialog 状态。
}
```

- [ ] **Step 2: 从 TaskDetail 移除内联 FileTreeBranch 与 TaskFileDocumentViewer**

在文件 Tab 中保留标题、数量和来源对话状态，只渲染：

```tsx
<TaskFileExplorer
  files={task.files}
  initialFileId={selectedFileId}
  onFileSelection={captureFileSelection}
/>
```

保留 `openFile(fileId)` 的外部导航能力，通过受控 `initialFileId` 或 `focusedFileId` 让活动引用仍能打开对应文件。

- [ ] **Step 3: 实现 A1 视觉与操作反馈**

CSS 使用现有 Token；桌面树宽 232px，Header 操作稳定靠右，节点高度不少于 34px，选中轨道使用 `var(--ad-route-soft)` 和 `var(--ad-route-ink)`。所有操作成功显示简短 Toast，删除提供撤销。

- [ ] **Step 4: 运行完整测试与设计检查**

Run: `npm test && npm run design:check && npm run build`

Expected: 全部 PASS；设计检查无新增硬编码 Token 违规。

- [ ] **Step 5: 提交 Task 4**

```bash
git add src/components/TaskDetail.tsx src/components/task-files/TaskFileExplorer.tsx src/styles.css
git commit -m "feat: integrate task file explorer"
```

### Task 5: 响应式、键盘和最终验收

**Files:**
- Modify: `src/components/task-files/TaskFileExplorer.tsx`
- Modify: `src/components/task-files/TaskFileTree.tsx`
- Modify: `src/styles.css`
- Modify: `server/taskFileTree.test.ts`

- [ ] **Step 1: 增加选择删除后的回退测试**

```ts
import { getSelectionAfterRemoval } from "../src/lib/taskFileTree.ts";

test("falls back to parent after removing selected node", () => {
  assert.equal(getSelectionAfterRemoval(nodes, "md", ["md"]), "child");
  assert.equal(getSelectionAfterRemoval(nodes, "root", ["root", "child", "md"]), null);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskFileTree.test.ts`

Expected: FAIL，提示回退函数不存在。

- [ ] **Step 3: 完成移动端分层导航和可访问性细节**

`<= 760px` 时 Explorer 使用 `data-mobile-view="tree|preview"` 控制单面板；打开文件进入 preview，返回时恢复树滚动和焦点。补齐 Tree 的 Home、End、ArrowUp、ArrowDown、ArrowLeft、ArrowRight 和按字母定位；所有 Icon 加 `aria-hidden`，更多按钮拥有节点名称。

- [ ] **Step 4: 完整验收**

Run: `npm test && npm run design:check && npm run build`

Expected: 全部 PASS。

手工检查：

- 1440px：双栏、232px Tree、文件名不异常换行。
- 760px：切换点无横向溢出。
- 390px：树和查看分层进入，返回恢复原位置。
- Markdown、XLSX、PDF、图片、DOCX、TXT、未知格式均呈现正确。
- 文件夹两种非空删除策略、唯一归属、Icon 设置与恢复默认均有效。
- 从活动文件引用进入文件 Tab 后仍聚焦并打开正确文件。

- [ ] **Step 5: 提交 Task 5**

```bash
git add src/components/task-files/TaskFileExplorer.tsx src/components/task-files/TaskFileTree.tsx src/lib/taskFileTree.ts src/styles.css server/taskFileTree.test.ts
git commit -m "test: verify task file explorer interactions"
```

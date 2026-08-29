# Task List Personal Board View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让任务列表默认显示当前用户任务，使用共享人员选择器筛选负责人，并增加与任务详情一致的状态看板视图。

**Architecture:** `App` 继续持有任务筛选状态并注入当前用户与成员目录；`WorkspaceList` 只负责过滤和选择列表/看板投影。状态顺序、状态 tone 与分组逻辑下沉到共享 `taskBoard` 模型，任务详情看板和全局任务看板共同消费；全局看板复用详情看板的 CSS 解剖但保持只读。

**Tech Stack:** React 19、TypeScript、Base UI Combobox、Lucide React、现有 AgentDoor CSS Token、Node test runner + `tsx`。

---

## 文件结构

- Create: `src/lib/taskBoard.ts` — 共享状态顺序、tone 和任务分组纯函数。
- Create: `src/components/WorkspaceTaskBoard.tsx` — 全局任务列表的只读状态看板投影。
- Create: `server/taskListBoard.test.ts` — 默认个人筛选、状态分组与源码集成契约。
- Modify: `src/components/TaskOverviewWorkspace.tsx` — 改为使用共享状态模型，删除私有重复常量。
- Modify: `src/components/PersonPicker.tsx` — 增加可配置“全部人员”范围选项和紧凑筛选触发器。
- Modify: `src/components/taskListFilters.ts` — 通过当前用户 ID 构造默认筛选。
- Modify: `src/components/WorkspaceList.tsx` — 接收成员上下文、渲染人员筛选和列表/看板切换。
- Modify: `src/App.tsx` — 注入当前用户、成员目录与默认个人筛选。
- Modify: `src/styles.css` — 复用详情看板视觉规则并补齐工具栏、移动端和空状态样式。

### Task 1: 共享看板状态模型

**Files:**
- Create: `src/lib/taskBoard.ts`
- Create: `server/taskListBoard.test.ts`
- Modify: `src/components/TaskOverviewWorkspace.tsx`

- [ ] **Step 1: 写状态顺序与分组的失败测试**

在 `server/taskListBoard.test.ts` 写入：

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { groupTasksByBoardStatus, taskBoardStatusOrder, taskBoardStatusTone } from "../src/lib/taskBoard.ts";

const tasks = [
  { id: "done", status: "已完成" as const },
  { id: "todo", status: "待开始" as const },
  { id: "doing", status: "进行中" as const },
  { id: "doing-2", status: "进行中" as const },
];

test("任务看板按统一状态顺序分组并跳过空列", () => {
  assert.deepEqual(groupTasksByBoardStatus(tasks).map((group) => ({
    ids: group.tasks.map((task) => task.id),
    status: group.status,
    tone: group.tone,
  })), [
    { ids: ["todo"], status: "待开始", tone: "not-started" },
    { ids: ["doing", "doing-2"], status: "进行中", tone: "in-progress" },
    { ids: ["done"], status: "已完成", tone: "completed" },
  ]);
  assert.deepEqual(taskBoardStatusOrder, ["待开始", "进行中", "待审核", "已阻塞", "已完成", "已取消"]);
  assert.equal(taskBoardStatusTone["已阻塞"], "blocked");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskListBoard.test.ts`

Expected: FAIL，提示无法找到 `src/lib/taskBoard.ts`。

- [ ] **Step 3: 实现共享状态模型**

创建 `src/lib/taskBoard.ts`：

```ts
import type { TaskStatus } from "../components/TaskStatusBadge";

export const taskBoardStatusOrder: TaskStatus[] = ["待开始", "进行中", "待审核", "已阻塞", "已完成", "已取消"];

export const taskBoardStatusTone: Record<TaskStatus, string> = {
  已取消: "cancelled",
  已完成: "completed",
  已阻塞: "blocked",
  待审核: "review",
  待开始: "not-started",
  进行中: "in-progress",
};

export function groupTasksByBoardStatus<T extends { status: TaskStatus }>(tasks: T[]) {
  return taskBoardStatusOrder
    .map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status === status),
      tone: taskBoardStatusTone[status],
    }))
    .filter((group) => group.tasks.length > 0);
}
```

在 `TaskOverviewWorkspace.tsx` 中删除私有 `statusOrder` / `statusTone`，导入共享常量并把所有引用替换为 `taskBoardStatusOrder` / `taskBoardStatusTone`。详情看板仍显示现有全部状态逻辑，不改其交互。

- [ ] **Step 4: 运行模型与现有概览测试**

Run: `npx tsx --test server/taskListBoard.test.ts server/taskOverview.test.ts`

Expected: PASS，且详情概览测试无回归。

- [ ] **Step 5: 提交共享模型**

```bash
git add src/lib/taskBoard.ts src/components/TaskOverviewWorkspace.tsx server/taskListBoard.test.ts
git commit -m "refactor: share task board status model"
```

### Task 2: 默认个人筛选与通用人员范围选项

**Files:**
- Modify: `server/taskListBoard.test.ts`
- Modify: `src/components/taskListFilters.ts`
- Modify: `src/components/PersonPicker.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 写默认筛选和共享人员范围选项的失败测试**

向 `server/taskListBoard.test.ts` 增加：

```ts
import { readFileSync } from "node:fs";
import { createInitialTaskListFilters } from "../src/components/taskListFilters.ts";

test("任务列表以当前用户作为默认负责人", () => {
  assert.deepEqual(createInitialTaskListFilters("周岚"), {
    owner: "周岚",
    status: "all",
    tag: "all",
  });
});

test("共享人员选择器提供范围选项与紧凑筛选触发器", () => {
  const source = readFileSync(new URL("../src/components/PersonPicker.tsx", import.meta.url), "utf8");
  assert.match(source, /scopeOption/);
  assert.match(source, /triggerVariant === "filter"/);
  assert.match(source, /UsersRound/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskListBoard.test.ts`

Expected: FAIL，`createInitialTaskListFilters` 未导出，且 `PersonPicker` 尚无范围选项。

- [ ] **Step 3: 实现默认个人筛选**

把 `src/components/taskListFilters.ts` 的常量改为工厂：

```ts
export const createInitialTaskListFilters = (currentUserId: string): TaskListFilters => ({
  owner: currentUserId,
  status: "all",
  tag: "all",
});
```

在 `src/App.tsx` 中改为：

```ts
import { createInitialTaskListFilters, type TaskListFilters } from "./components/taskListFilters";

const [taskFilters, setTaskFilters] = useState<TaskListFilters>(
  () => createInitialTaskListFilters(currentUserId),
);
```

- [ ] **Step 4: 扩展共享 PersonPicker**

在 `PersonPickerCommonProps` 增加：

```ts
scopeOption?: {
  description: string;
  id: string;
  label: string;
};
triggerVariant?: "action" | "add" | "filter" | "identity" | "member";
```

将范围选项转换成 `PersonOption` 并放在人员列表首位：

```ts
const scopePerson = useMemo<PersonOption | null>(() => scopeOption ? {
  email: "",
  id: scopeOption.id,
  name: scopeOption.label,
  role: scopeOption.description,
} : null, [scopeOption]);

const availablePeople = useMemo(() => [
  ...(scopePerson ? [scopePerson] : []),
  ...(allowUnassigned && !multiple ? [unassignedPerson] : []),
  ...members,
], [allowUnassigned, members, multiple, scopePerson, unassignedPerson]);
```

导入 `UsersRound`。`filter` 触发器中，范围选项显示 `UsersRound`，真实成员显示 `PersonAvatar size="xs"`，随后显示选中姓名与 `Combobox.Icon`。弹层范围行同样使用 `UsersRound`，不渲染虚构头像。现有 `action/add/identity/member` 调用方行为保持不变。

- [ ] **Step 5: 运行测试和类型构建**

Run: `npx tsx --test server/taskListBoard.test.ts server/personDirectory.test.ts server/personAvatarTrigger.test.ts && npm run build`

Expected: 全部 PASS，TypeScript 构建成功。

- [ ] **Step 6: 提交默认筛选与人员组件**

```bash
git add src/components/taskListFilters.ts src/components/PersonPicker.tsx src/App.tsx server/taskListBoard.test.ts
git commit -m "feat: default task list to current user"
```

### Task 3: 增加只读任务看板和视图切换

**Files:**
- Modify: `server/taskListBoard.test.ts`
- Create: `src/components/WorkspaceTaskBoard.tsx`
- Modify: `src/components/WorkspaceList.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 写看板集成契约的失败测试**

向 `server/taskListBoard.test.ts` 增加：

```ts
test("任务列表提供列表与看板投影并复用同一筛选结果", () => {
  const listSource = readFileSync(new URL("../src/components/WorkspaceList.tsx", import.meta.url), "utf8");
  const boardSource = readFileSync(new URL("../src/components/WorkspaceTaskBoard.tsx", import.meta.url), "utf8");
  assert.match(listSource, /type WorkspaceListView = "board" \| "list"/);
  assert.match(listSource, /<WorkspaceTaskBoard/);
  assert.match(listSource, /tasks={visibleNodes}/);
  assert.match(listSource, /aria-pressed={view === "board"}/);
  assert.match(boardSource, /groupTasksByBoardStatus/);
  assert.match(boardSource, /onTaskSelect\(task\)/);
  assert.doesNotMatch(boardSource, /draggable|onDrag|cursor-grab/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskListBoard.test.ts`

Expected: FAIL，提示 `WorkspaceTaskBoard.tsx` 不存在。

- [ ] **Step 3: 创建只读任务看板组件**

创建 `src/components/WorkspaceTaskBoard.tsx`，核心结构为：

```tsx
import { groupTasksByBoardStatus } from "../lib/taskBoard";
import type { TaskNode } from "../data/workspaceNodes";
import { PersonAvatar } from "./PersonAvatar";

type WorkspaceTaskBoardProps = {
  onTaskSelect: (task: TaskNode) => void;
  tasks: TaskNode[];
};

export function WorkspaceTaskBoard({ onTaskSelect, tasks }: WorkspaceTaskBoardProps) {
  if (!tasks.length) return <div className="workspace-list-empty"><strong>没有匹配的任务</strong><span>调整搜索词或筛选条件后再试。</span></div>;

  return <div aria-label="任务看板" className="task-overview-board workspace-task-board">
    {groupTasksByBoardStatus(tasks).map((group) => <section className="task-overview-board-column" data-status={group.tone} key={group.status}>
      <header><span><i aria-hidden="true" />{group.status}</span><small>{group.tasks.length}</small></header>
      <div>{group.tasks.map((task) => <button className={`task-overview-task-card board tone-${group.tone}`} key={task.id} onClick={() => onTaskSelect(task)} type="button">
          <span className="task-overview-task-card-title"><strong>{task.name}</strong></span>
          <span className="workspace-task-board-card-goal">{task.goal?.trim() || "暂无任务说明"}</span>
          <span className="task-overview-task-card-meta"><span className={`task-overview-status-dot tone-${group.tone}`} aria-hidden="true" /><small>{group.status}</small><small>{task.dueAt ?? "未设置截止时间"}</small><span className="task-overview-card-owner"><PersonAvatar name={task.ownerId} personId={task.ownerId} profilePreviewFocusable={false} size="xs" /></span></span>
        </button>)}</div>
    </section>)}
  </div>;
}
```

首期卡片固定展示任务名、说明、状态、截止时间和负责人；标签继续只作为筛选条件，不进入看板卡片，也不增加新的卡片高度变体。

- [ ] **Step 4: 在 WorkspaceList 接入视图和人员筛选**

给 `WorkspaceListProps` 增加：

```ts
currentUserId: string;
members: PersonOption[];
```

组件内新增：

```ts
type WorkspaceListView = "board" | "list";
const [view, setView] = useState<WorkspaceListView>("list");
```

用 `PersonPicker` 替换负责人 `ListFilterSelect`：

```tsx
<PersonPicker
  ariaLabel="按负责人筛选"
  members={members}
  menuLabel="选择负责人范围"
  onChange={(owner) => onFiltersChange({ ...filters, owner })}
  scopeOption={{ description: "查看团队全部任务", id: "all", label: "全部人员" }}
  selfId={currentUserId}
  selfOptionLabel={members.find((member) => member.id === currentUserId)?.name ?? currentUserId}
  triggerVariant="filter"
  value={filters.owner}
/>
```

在筛选栏末尾增加两个 ghost icon/text 按钮，分别使用 `List` 与 `LayoutDashboard` 图标和 `aria-pressed`。结果区域按 `view` 渲染：列表传入 `visibleNodes`，看板也传入相同的 `visibleNodes`。列表标题从 `WorkspaceDirectoryView` 上移到 `WorkspaceList` 的共享结果标题，确保两种视图数量与说明一致。

- [ ] **Step 5: App 注入人员上下文**

`WorkspaceList` 调用增加：

```tsx
currentUserId={currentUserId}
members={collaborationMembers}
```

- [ ] **Step 6: 运行集成契约和构建**

Run: `npx tsx --test server/taskListBoard.test.ts && npm run build`

Expected: PASS，看板组件类型检查通过。

- [ ] **Step 7: 提交视图功能**

```bash
git add src/components/WorkspaceTaskBoard.tsx src/components/WorkspaceList.tsx src/App.tsx server/taskListBoard.test.ts
git commit -m "feat: add task list board view"
```

### Task 4: 样式、响应式和最终验证

**Files:**
- Modify: `src/styles.css`
- Modify: `server/taskListBoard.test.ts`

- [ ] **Step 1: 写样式契约的失败测试**

向 `server/taskListBoard.test.ts` 增加：

```ts
test("任务看板拥有共享视觉、横向滚动和可见焦点", () => {
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.workspace-task-view-switch/);
  assert.match(styles, /\.workspace-task-board/);
  assert.match(styles, /overflow-x:\s*auto/);
  assert.match(styles, /\.workspace-task-board[^}]*min-width:/s);
  assert.match(styles, /\.workspace-task-board[^}]*focus-visible/s);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskListBoard.test.ts`

Expected: FAIL，缺少新看板与切换样式。

- [ ] **Step 3: 增加与详情看板一致的样式**

在 `src/styles.css` 的任务列表与任务概览样式相邻位置增加：

```css
.workspace-task-view-switch { display: inline-flex; align-items: center; gap: var(--ad-space-1); padding: var(--ad-space-1); border: 1px solid var(--ad-border); border-radius: var(--ad-radius-control); background: var(--ad-surface); }
.workspace-task-view-switch button[aria-pressed="true"] { background: var(--ad-ink); color: var(--ad-surface); }
.workspace-task-board { grid-auto-columns: minmax(235px, 1fr); margin-top: 0; overflow-x: auto; padding-bottom: var(--ad-space-2); }
.workspace-task-board .task-overview-board-column { min-width: 235px; }
.workspace-task-board .task-overview-task-card { width: 100%; text-align: left; }
.workspace-task-board .task-overview-task-card:focus-visible { outline: 2px solid var(--ad-route); outline-offset: 2px; }
.workspace-task-board-card-goal { display: -webkit-box; overflow: hidden; color: var(--ad-ink-secondary); font-size: var(--ad-text-caption); line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
```

同时补充 `.person-picker-trigger-filter` 的紧凑高度、选中姓名截断和移动端 44px 触控高度；在 `max-width: 760px` 下让筛选栏换行，看板保持横向滚动。使用现有 token，不加入新色值。

- [ ] **Step 4: 运行完整自动验证**

Run: `npm test && npm run build && npm run design:check`

Expected: 所有 Node 测试 PASS；TypeScript/Vite 构建成功；设计检查无新增失败。

- [ ] **Step 5: 手工浏览器验收**

Run: `npm run dev`

检查：

1. 打开任务页默认负责人为当前用户，列表结果只包含自己的任务。
2. 人员下拉可搜索、选择其他成员和“全部人员”。
3. 列表/看板切换保持全部筛选条件。
4. 看板状态顺序、列头、颜色和卡片与任务详情一致。
5. 点击看板卡片进入正确详情；卡片没有拖拽暗示。
6. 760px 以下筛选可操作，看板横向滚动且卡片不被压窄。
7. 深色主题文字、边框和选中按钮对比清楚。

- [ ] **Step 6: 最终提交**

```bash
git add src/styles.css server/taskListBoard.test.ts
git commit -m "style: align task list board with overview"
```

### Task 5: 完成性审查

**Files:**
- Verify only

- [ ] **Step 1: 检查范围没有扩张**

Run: `git diff HEAD~4 --stat && git diff HEAD~4 -- src/components/WorkspaceTaskBoard.tsx src/components/WorkspaceList.tsx`

Expected: 没有拖拽、状态写入、时间视图或用户视图持久化代码。

- [ ] **Step 2: 检查工作区和最终测试**

Run: `git status --short && npm run verify`

Expected: 本任务文件没有未提交改动；用户原有的无关工作区改动保持原样；验证 PASS。

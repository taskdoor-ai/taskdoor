# Task Subtasks Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a “子任务” tab to task details that lists the current task’s direct children while retaining the existing overview board and dependency canvas.

**Architecture:** Add a focused `TaskSubtaskList` presentation component that consumes existing `TaskRelationSummary[]` data and delegates navigation through an optional callback. Integrate it into `TaskDetail` as a fourth accessible tab and style it with the existing AgentDoor tokens, task icons, statuses, and avatars.

**Tech Stack:** React 19, TypeScript, lucide-react, Node test runner, React server rendering, CSS design tokens.

---

## File Structure

- Create `src/components/TaskSubtaskList.tsx`: render the direct-child list, empty state, metadata, and optional navigation behavior.
- Create `server/taskSubtaskList.test.ts`: verify list content, direct input fidelity, empty state, and disabled navigation semantics through server-rendered markup.
- Modify `src/components/TaskDetail.tsx`: register the new tab, count badge, accessible panel, and list callback wiring.
- Modify `src/styles.css`: add responsive list, row, metadata, hover, focus, and disabled styles.
- Modify `server/creatorCommerceVisibleCopy.test.ts`: extend the existing TaskDetail source contract to cover the tab order and panel wiring.

### Task 1: Build the direct-subtask list component

**Files:**
- Create: `src/components/TaskSubtaskList.tsx`
- Test: `server/taskSubtaskList.test.ts`

- [ ] **Step 1: Write the failing rendering tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskSubtaskList } from "../src/components/TaskSubtaskList.tsx";

const tasks = [
  { dueAt: "8 月 31 日", goal: "确认脚本", id: "script", owner: "陈默", status: "进行中" as const, title: "脚本终审" },
  { dueAt: "未设置", goal: "准备直播", id: "live", owner: "林洁", status: "待开始" as const, title: "直播准备" },
];

test("子任务列表展示传入的直接子任务及核心元信息", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { onOpenTask: () => undefined, tasks }));
  assert.match(html, /脚本终审/);
  assert.match(html, /直播准备/);
  assert.match(html, /陈默/);
  assert.match(html, /8 月 31 日/);
  assert.match(html, /data-task-id="script"/);
});

test("无直接子任务时展示空状态", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks: [] }));
  assert.match(html, /当前任务还没有子任务/);
  assert.doesNotMatch(html, /task-subtask-list-items/);
});

test("缺少打开回调时列表项不可交互", () => {
  const html = renderToStaticMarkup(createElement(TaskSubtaskList, { tasks }));
  assert.match(html, /disabled=""/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx tsx --test server/taskSubtaskList.test.ts`

Expected: FAIL because `src/components/TaskSubtaskList.tsx` does not exist.

- [ ] **Step 3: Implement the minimal list component**

```tsx
import { CalendarDays, ChevronRight } from "lucide-react";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { TaskIcon } from "./TaskIcon";
import { TaskStatusBadge } from "./TaskStatusBadge";

export function TaskSubtaskList({ onOpenTask, tasks }: { onOpenTask?: (taskId: string) => void; tasks: TaskRelationSummary[] }) {
  if (!tasks.length) return <div className="task-subtask-list-empty">当前任务还没有子任务</div>;

  return <div className="task-subtask-list-items">{tasks.map((task) => <button
    className="task-subtask-list-row"
    data-task-id={task.id}
    disabled={!onOpenTask}
    key={task.id}
    onClick={() => onOpenTask?.(task.id)}
    type="button"
  >
    <TaskIcon iconName={task.iconName} tone={task.iconTone} />
    <span className="task-subtask-list-copy"><strong>{task.title}</strong><small>{task.goal}</small></span>
    <TaskStatusBadge size="sm" value={task.status} />
    <span className="task-subtask-list-owner"><PersonAvatar name={task.owner} personId={task.owner} profilePreviewFocusable={false} size="xs" /><PersonName name={task.owner} personId={task.owner} /></span>
    <span className="task-subtask-list-due"><CalendarDays aria-hidden="true" size={14} />{task.dueAt}</span>
    <ChevronRight aria-hidden="true" size={16} />
  </button>)}</div>;
}
```

- [ ] **Step 4: Run the focused test and verify success**

Run: `npx tsx --test server/taskSubtaskList.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the component and tests**

```bash
git add src/components/TaskSubtaskList.tsx server/taskSubtaskList.test.ts
git commit -m "feat: add direct subtask list"
```

### Task 2: Add the 子任务 tab and panel to TaskDetail

**Files:**
- Modify: `src/components/TaskDetail.tsx:40,316-421`
- Modify: `server/creatorCommerceVisibleCopy.test.ts`

- [ ] **Step 1: Add a failing source-contract test**

Append to `server/creatorCommerceVisibleCopy.test.ts`:

```ts
test("任务详情在概览后提供直接子任务列表页签", () => {
  const detailSource = readSource("src/components/TaskDetail.tsx");
  assert.match(detailSource, /type TaskDetailTab = "overview" \| "subtasks" \| "files" \| "activity"/);
  assert.match(detailSource, /\{ count: childTasks\.length, id: "subtasks", label: "子任务" \}/);
  assert.match(detailSource, /<TaskSubtaskList onOpenTask=\{onOpenRelatedTask\} tasks=\{childTasks\} \/>/);
  assert.ok(detailSource.indexOf('id: "overview"') < detailSource.indexOf('id: "subtasks"'));
  assert.ok(detailSource.indexOf('id: "subtasks"') < detailSource.indexOf('id: "files"'));
});
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `npx tsx --test server/creatorCommerceVisibleCopy.test.ts`

Expected: FAIL because the `subtasks` tab and panel are absent.

- [ ] **Step 3: Register the new tab type and navigation item**

In `src/components/TaskDetail.tsx`, import `TaskSubtaskList`, extend the union, and insert the item after overview:

```tsx
import { TaskSubtaskList } from "./TaskSubtaskList";

type TaskDetailTab = "overview" | "subtasks" | "files" | "activity";

const tabs: Array<{ count?: number; id: TaskDetailTab; label: string }> = [
  { id: "overview", label: "概览" },
  { count: childTasks.length, id: "subtasks", label: "子任务" },
  { count: fileCount, id: "files", label: "文件" },
  { count: taskActivityItems.length, id: "activity", label: "活动" },
];
```

- [ ] **Step 4: Add the accessible tabpanel**

Insert between the overview and files panels:

```tsx
{activeTab === "subtasks" && <section
  aria-labelledby="task-detail-tab-subtasks"
  className="task-detail-section task-subtask-list-section first-section"
  id="task-detail-panel-subtasks"
  role="tabpanel"
>
  <div className="task-section-heading"><h2>子任务</h2><span>{childTasks.length} 个直接子任务</span></div>
  <p className="task-section-intro">查看当前任务下的子任务，并快速进入对应任务。</p>
  <TaskSubtaskList onOpenTask={onOpenRelatedTask} tasks={childTasks} />
</section>}
```

- [ ] **Step 5: Run focused tests and type checking**

Run: `npx tsx --test server/taskSubtaskList.test.ts server/creatorCommerceVisibleCopy.test.ts`

Expected: all focused tests PASS.

Run: `npx tsc -b --pretty false`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 6: Commit the tab integration**

```bash
git add src/components/TaskDetail.tsx server/creatorCommerceVisibleCopy.test.ts
git commit -m "feat: add subtasks tab to task details"
```

### Task 3: Style the responsive list and verify the feature

**Files:**
- Modify: `src/styles.css:3890-3925`

- [ ] **Step 1: Add list styles using existing tokens**

Add after the task-detail tab styles:

```css
.task-subtask-list-items { display: grid; overflow: hidden; border: 1px solid var(--ad-border); border-radius: var(--ad-radius-card); background: var(--ad-surface); }
.task-subtask-list-row { display: grid; grid-template-columns: auto minmax(180px, 1fr) auto minmax(120px, auto) minmax(110px, auto) auto; min-height: 72px; align-items: center; gap: var(--ad-space-4); padding: var(--ad-space-3) var(--ad-space-4); border: 0; border-bottom: 1px solid var(--ad-border-soft); background: transparent; color: var(--ad-ink); text-align: left; cursor: pointer; }
.task-subtask-list-row:last-child { border-bottom: 0; }
.task-subtask-list-row:hover { background: var(--ad-surface-quiet); }
.task-subtask-list-row:focus-visible { position: relative; outline: 2px solid var(--ad-focus); outline-offset: -2px; }
.task-subtask-list-row:disabled { cursor: default; opacity: 1; }
.task-subtask-list-row:disabled:hover { background: transparent; }
.task-subtask-list-copy { display: grid; min-width: 0; gap: var(--ad-space-1); }
.task-subtask-list-copy strong, .task-subtask-list-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-subtask-list-copy strong { font-size: var(--ad-text-label); }
.task-subtask-list-copy small, .task-subtask-list-due { color: var(--ad-ink-tertiary); font-size: var(--ad-text-caption); }
.task-subtask-list-owner, .task-subtask-list-due { display: inline-flex; align-items: center; gap: var(--ad-space-2); white-space: nowrap; }
.task-subtask-list-empty { display: grid; min-height: 144px; place-items: center; border: 1px dashed var(--ad-border); border-radius: var(--ad-radius-card); color: var(--ad-ink-tertiary); font-size: var(--ad-text-label); }

@media (max-width: 760px) {
  .task-subtask-list-row { grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--ad-space-2) var(--ad-space-3); }
  .task-subtask-list-row > .task-status-badge, .task-subtask-list-owner, .task-subtask-list-due { grid-column: 2; }
  .task-subtask-list-row > svg:last-child { grid-column: 3; grid-row: 1; }
}
```

- [ ] **Step 2: Run the full automated verification**

Run: `npm test`

Expected: all Node tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

Run: `npm run design:check`

Expected: design baseline check PASS with no new hard-coded visual values outside established conventions.

- [ ] **Step 3: Perform a browser smoke check**

Run: `npm run dev`

Open a parent task with children and verify:

1. Tab order is 概览、子任务、文件、活动.
2. 子任务 badge equals the direct-child count.
3. Overview still exposes board/canvas.
4. 子任务 shows only direct children, with icon, name, status, owner, and due date.
5. Clicking a row opens that child task.
6. A leaf task shows the empty state and badge 0.
7. ArrowLeft, ArrowRight, Home, and End move focus across all four tabs.
8. Narrow viewport keeps names readable and metadata aligned.

- [ ] **Step 4: Commit the visual treatment**

```bash
git add src/styles.css
git commit -m "style: add responsive subtask list"
```

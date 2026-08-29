# Task Subtask Tab, Manual Creation, and Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated subtask tab, immediate blank task/subtask creation, and confirmed recursive task deletion with dependency cleanup.

**Architecture:** Keep pure workspace mutations in `src/lib/workspaceTaskMutations.ts` so creation and recursive deletion are deterministic and directly testable. `App` owns persistent task state and navigation; `TaskDetail` owns the tab/list/dialog presentation and delegates mutations through callbacks. Blank details use a separate constructor so newly created tasks never inherit demo files or activity.

**Tech Stack:** React, TypeScript, Base UI alert dialog, Lucide icons, Node test runner through `tsx --test`, Vite.

---

### Task 1: Add tested workspace task mutation helpers

**Files:**
- Create: `src/lib/workspaceTaskMutations.ts`
- Create: `server/workspaceTaskMutations.test.ts`

- [ ] **Step 1: Write failing creation and deletion tests**

Create `server/workspaceTaskMutations.test.ts` with explicit coverage for root creation, child creation, unique IDs, recursive descendant discovery, and dependency cleanup:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { workspaceNodes } from "../src/data/workspaceNodes.ts";
import { createBlankWorkspaceTask, deleteWorkspaceTaskTree } from "../src/lib/workspaceTaskMutations.ts";

test("creates a blank root task owned by the current user", () => {
  const task = createBlankWorkspaceTask({ id: "manual-1", ownerId: "周岚", parentId: "workspace-root" });
  assert.deepEqual(task, {
    id: "manual-1", kind: "task", name: "未命名任务", parentId: "workspace-root",
    ownerId: "周岚", participantIds: [], status: "待开始", goal: "", updatedAt: "刚刚",
  });
});

test("creates a blank child in the same directory as its parent", () => {
  const parent = workspaceNodes.find((node) => node.id === "fragrance-creator-wrapup");
  assert.equal(parent?.kind, "task");
  const task = createBlankWorkspaceTask({ id: "manual-2", ownerId: "周岚", parentTask: parent! });
  assert.equal(task.parentTaskId, "fragrance-creator-wrapup");
  assert.equal(task.parentId, parent!.parentId);
});

test("recursively deletes descendants and removes dependency references", () => {
  const nodes = [
    ...workspaceNodes,
    createBlankWorkspaceTask({ id: "child", ownerId: "周岚", parentTask: workspaceNodes.find((node) => node.id === "fragrance-content") as never }),
    { id: "grandchild", kind: "task" as const, name: "未命名任务", parentId: "fragrance-campaign", parentTaskId: "child", ownerId: "周岚", status: "待开始" as const, updatedAt: "刚刚" },
    { id: "observer", kind: "task" as const, name: "观察任务", parentId: "workspace-root", ownerId: "周岚", status: "待开始" as const, updatedAt: "刚刚", dependsOnTaskIds: ["child", "fragrance-growth"] },
  ];
  const result = deleteWorkspaceTaskTree(nodes, "fragrance-content");
  assert.deepEqual([...result.deletedTaskIds].sort(), ["child", "fragrance-content", "grandchild"]);
  assert.equal(result.nodes.some((node) => result.deletedTaskIds.has(node.id)), false);
  const observer = result.nodes.find((node) => node.id === "observer");
  assert.deepEqual(observer?.kind === "task" ? observer.dependsOnTaskIds : undefined, ["fragrance-growth"]);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx tsx --test server/workspaceTaskMutations.test.ts`

Expected: FAIL because `src/lib/workspaceTaskMutations.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Create `src/lib/workspaceTaskMutations.ts`:

```ts
import type { TaskNode, WorkspaceNode } from "../data/workspaceNodes";

export function createBlankWorkspaceTask(input: { id: string; ownerId: string; parentId?: string; parentTask?: TaskNode }): TaskNode {
  return {
    id: input.id,
    kind: "task",
    name: "未命名任务",
    parentId: input.parentTask?.parentId ?? input.parentId ?? null,
    ...(input.parentTask ? { parentTaskId: input.parentTask.id } : {}),
    ownerId: input.ownerId,
    participantIds: [],
    status: "待开始",
    goal: "",
    updatedAt: "刚刚",
  };
}

export function collectTaskTreeIds(nodes: WorkspaceNode[], rootTaskId: string): Set<string> {
  const ids = new Set([rootTaskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.kind === "task" && node.parentTaskId && ids.has(node.parentTaskId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function deleteWorkspaceTaskTree(nodes: WorkspaceNode[], rootTaskId: string) {
  const deletedTaskIds = collectTaskTreeIds(nodes, rootTaskId);
  const remaining = nodes.filter((node) => !deletedTaskIds.has(node.id));
  return {
    deletedTaskIds,
    nodes: remaining.map((node) => node.kind !== "task" || !node.dependsOnTaskIds
      ? node
      : { ...node, dependsOnTaskIds: node.dependsOnTaskIds.filter((id) => !deletedTaskIds.has(id)) }),
  };
}
```

- [ ] **Step 4: Run the focused test and verify success**

Run: `npx tsx --test server/workspaceTaskMutations.test.ts`

Expected: all mutation tests PASS.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add src/lib/workspaceTaskMutations.ts server/workspaceTaskMutations.test.ts
git commit -m "feat: add workspace task creation and deletion helpers"
```

### Task 2: Add a blank task-detail constructor

**Files:**
- Modify: `src/data/taskDetailMocks.ts`
- Create: `server/taskDetailBlankState.test.ts`

- [ ] **Step 1: Write the failing blank-detail test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createBlankTaskDetail } from "../src/data/taskDetailMocks.ts";

test("blank manual tasks contain no demo content", () => {
  const detail = createBlankTaskDetail({ owner: "周岚", title: "未命名任务" });
  assert.equal(detail.goal, "");
  assert.equal(detail.due, "—");
  assert.deepEqual(detail.participants, []);
  assert.deepEqual(detail.files, []);
  assert.deepEqual(detail.activities, []);
  assert.deepEqual(detail.commits, []);
  assert.equal(detail.status, "待开始");
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npx tsx --test server/taskDetailBlankState.test.ts`

Expected: FAIL because `createBlankTaskDetail` is not exported.

- [ ] **Step 3: Implement the constructor**

Add to `src/data/taskDetailMocks.ts`:

```ts
export function createBlankTaskDetail(input: { owner: string; title: string }): TaskDetailMock {
  return {
    activities: [], commits: [], due: "—", files: [], goal: "", owner: input.owner,
    participants: [], status: "待开始", summary: "", title: input.title,
  };
}
```

- [ ] **Step 4: Verify the focused test passes**

Run: `npx tsx --test server/taskDetailBlankState.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the blank-detail constructor**

```bash
git add src/data/taskDetailMocks.ts server/taskDetailBlankState.test.ts
git commit -m "feat: add blank manual task detail state"
```

### Task 3: Wire manual root/subtask creation and recursive deletion in App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the new helpers and identify manual blank tasks**

Add imports for `createBlankTaskDetail`, `createBlankWorkspaceTask`, and `deleteWorkspaceTaskTree`. Track newly created manual IDs in component state so their details use the blank constructor instead of demo mocks:

```ts
const [manualTaskIds, setManualTaskIds] = useState<Set<string>>(() => new Set());
```

- [ ] **Step 2: Add one shared creation function**

Add a function that generates `crypto.randomUUID()`, creates the task with the current user, appends it to workspace state, records its ID as manual, selects it, activates the task section, and schedules primary-heading focus:

```ts
const createManualTask = (parentTask?: TaskNode) => {
  const task = createBlankWorkspaceTask({
    id: crypto.randomUUID(),
    ownerId: currentUserName,
    parentId: workspaceRootId,
    parentTask,
  });
  setWorkspaceNodes((nodes) => [...nodes, task]);
  setManualTaskIds((ids) => new Set(ids).add(task.id));
  setSelectedTaskId(task.id);
  setActiveSection("tasks");
  focusPrimaryHeadingAfterNavigation();
};
```

- [ ] **Step 3: Select blank details for manual tasks**

Before falling back to `createWorkspaceTaskDetail`, detect `manualTaskIds.has(selectedTaskId)` and construct `createBlankTaskDetail({ owner: selectedTreeTask.ownerId, title: selectedTreeTask.name })`. Preserve live title, goal, owner, status, tags, and date overrides exactly as existing details do.

- [ ] **Step 4: Add recursive deletion and local-state cleanup**

Implement `deleteSelectedTask` by recalculating `deleteWorkspaceTaskTree(workspaceNodes, selectedTaskId)` at confirmation time, applying returned nodes, and deleting every returned ID from `manualTaskIds`, `taskPeriodOverrides`, `taskOwnerProposals`, and `legacyTaskSnapshots`. Finish with `setSelectedTaskId(null)` and `setActiveSection("tasks")`.

- [ ] **Step 5: Connect list and detail callbacks**

Change `WorkspaceList onCreateTask` from `startNewTaskConversation` to `() => createManualTask()`. Pass these props to `TaskDetail`:

```tsx
onCreateSubtask={() => selectedTreeTask?.kind === "task" && createManualTask(selectedTreeTask)}
onDeleteTask={deleteSelectedTask}
```

- [ ] **Step 6: Run type/build verification**

Run: `npm run build`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit App integration**

```bash
git add src/App.tsx
git commit -m "feat: wire manual task lifecycle"
```

### Task 4: Build the subtask tab and deletion confirmation UI

**Files:**
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Extend TaskDetail types and imports**

Add `Plus`, `Trash2`, and the project alert-dialog primitives. Extend `TaskDetailTab` with `"subtasks"` and props with:

```ts
onCreateSubtask?: () => void;
onDeleteTask?: () => void;
```

- [ ] **Step 2: Add the stable subtask tab**

Insert `{ count: childTasks.length, id: "subtasks", label: "子任务" }` after overview. Existing keyboard navigation automatically includes it through the `tabs` array.

- [ ] **Step 3: Render the selected card-list design**

Add a `tabpanel` with a heading, count/status summary, and “新建子任务” button. Render direct children as buttons/cards containing `TaskIcon`, title, `TaskStatusBadge`, owner avatar/name, and due date. Call `onOpenRelatedTask(task.id)` on click. When empty, show “还没有子任务” plus an explanatory sentence while keeping the header button available.

- [ ] **Step 4: Add the delete entry and confirmation dialog**

Place a destructive ghost/outline button with `Trash2` in the task header action area. Track `deleteDialogOpen` locally. Use `childTasks` only for the tab, but receive a new `descendantTaskCount` numeric prop from App for accurate recursive messaging. Dialog copy:

```tsx
<AlertDialogTitle>删除任务“{currentTitle || "未命名任务"}”？</AlertDialogTitle>
<AlertDialogDescription>
  {descendantTaskCount > 0
    ? `该任务包含 ${descendantTaskCount} 个子任务。删除后，当前任务及全部子任务会一并移除，且无法撤销。`
    : "删除后，该任务会被永久移除，且无法撤销。"}
</AlertDialogDescription>
```

The action label is `删除任务及 ${descendantTaskCount} 个子任务` when nonzero, otherwise `删除任务`.

- [ ] **Step 5: Add responsive styles**

Add focused classes for `.task-subtask-panel`, `.task-subtask-header`, `.task-subtask-list`, `.task-subtask-card`, and `.task-detail-delete-button`. Match existing tokens, card radius, focus ring, metadata sizes, and status colors. Under the existing narrow breakpoint, stack the panel heading and make cards keep a readable single-column metadata flow; retain horizontal scrolling for the four tabs.

- [ ] **Step 6: Run build and design checks**

Run: `npm run build`

Expected: PASS.

Run: `npm run design:check`

Expected: PASS, or only pre-existing baseline notices unrelated to these selectors.

- [ ] **Step 7: Commit the detail UI**

```bash
git add src/components/TaskDetail.tsx src/styles.css
git commit -m "feat: add subtask tab and task deletion dialog"
```

### Task 5: Add descendant-count integration and regression coverage

**Files:**
- Modify: `src/App.tsx`
- Modify: `server/workspaceTaskMutations.test.ts`

- [ ] **Step 1: Add descendant-count assertions**

Extend the mutation test to assert `collectTaskTreeIds(nodes, rootId).size - 1` returns the recursive descendant count and excludes unrelated siblings.

- [ ] **Step 2: Compute and pass the current count**

In `App`, derive the count from current workspace state:

```ts
const selectedDescendantTaskCount = selectedTaskId
  ? collectTaskTreeIds(workspaceNodes, selectedTaskId).size - 1
  : 0;
```

Pass `descendantTaskCount={selectedDescendantTaskCount}` to `TaskDetail` so the dialog and destructive action always describe the full deletion scope.

- [ ] **Step 3: Run all automated verification**

Run: `npm test`

Expected: all Node tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build PASS.

Run: `npm run design:check`

Expected: PASS with no new design-token or control-size violations.

- [ ] **Step 4: Perform targeted manual verification**

Run: `npm run dev`.

Verify in the browser:

1. Every task detail shows `概览 / 子任务 / 文件 / 活动` and arrow-key navigation works.
2. Root “新建任务” creates and opens an empty `未命名任务`.
3. “新建子任务” creates and opens an empty child with the correct breadcrumb.
4. Editing the new task updates its list card and survives navigation away/back.
5. Deleting a leaf shows the single-task warning and removes only that task.
6. Deleting a task with descendants shows the recursive count and removes all descendants.
7. A remaining task no longer carries dependency IDs pointing at deleted tasks.
8. Canceling the dialog changes nothing.
9. Narrow viewport keeps tabs scrollable and subtask cards readable.

- [ ] **Step 5: Commit final integration**

```bash
git add src/App.tsx server/workspaceTaskMutations.test.ts
git commit -m "test: verify recursive task lifecycle"
```

# Task Overview Role Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing task overview into one reusable component that keeps the current main-task experience, focuses the same canvas for subtasks, and presents concise fact analysis for standalone tasks without visible task-type labels.

**Architecture:** `TaskDetail` remains the single overview entry. `App` supplies the current task and its sibling relationship graph; `TaskOverviewWorkspace` derives an internal role from data and renders the matching content while reusing the existing canvas, filters, insight cards, rhythm and design tokens. Pure relationship scoping stays in `src/lib/taskOverview.ts` so it can be covered with node tests.

**Tech Stack:** React 19, TypeScript, existing AgentDoor UI primitives, CSS design tokens, Node test runner through `tsx`, Playwright browser verification.

---

### Task 1: Add internal role and relationship-scope helpers

**Files:**
- Modify: `src/lib/taskOverview.ts`
- Modify: `server/taskOverview.test.ts`

- [ ] **Step 1: Write failing tests for the three internal roles and one generic subtask relationship scope**

Add tests that assert role selection is data-driven and never introduces relationship-count variants:

```ts
test("概览角色只由上下级数据决定", () => {
  assert.equal(getOverviewRole({ childCount: 2, hasParent: false }), "main");
  assert.equal(getOverviewRole({ childCount: 0, hasParent: true }), "subtask");
  assert.equal(getOverviewRole({ childCount: 0, hasParent: false }), "standalone");
});

test("子任务关系范围同时包含当前任务、直接前置和直接后续", () => {
  const relationshipTasks: OverviewTask[] = [
    { id: "a", owner: "陈默", status: "已完成" },
    { id: "b", owner: "林洁", status: "进行中" },
    { dependsOnTaskIds: ["a", "b"], id: "current", owner: "苏禾", status: "待审核" },
    { dependsOnTaskIds: ["current"], id: "downstream", owner: "周岚", status: "待开始" },
    { id: "unrelated", owner: "梁川", status: "进行中" },
  ];
  assert.deepEqual(
    getSubtaskRelationshipScope(relationshipTasks, "current").map((task) => task.id).sort(),
    ["a", "b", "current", "downstream"],
  );
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `./node_modules/.bin/tsx --test server/taskOverview.test.ts`

Expected: FAIL because `getOverviewRole` and `getSubtaskRelationshipScope` are not exported.

- [ ] **Step 3: Implement the minimal pure helpers**

Add these exports to `src/lib/taskOverview.ts`:

```ts
export type TaskOverviewRole = "main" | "standalone" | "subtask";

export function getOverviewRole({ childCount, hasParent }: { childCount: number; hasParent: boolean }): TaskOverviewRole {
  if (childCount > 0) return "main";
  return hasParent ? "subtask" : "standalone";
}

export function getSubtaskRelationshipScope<T extends OverviewTask>(tasks: T[], currentTaskId: string): T[] {
  const current = tasks.find((task) => task.id === currentTaskId);
  if (!current) return [];
  const upstreamIds = new Set((current.dependsOnTaskIds ?? []).filter((id) => id !== currentTaskId));
  const downstreamIds = new Set(tasks.filter((task) => task.dependsOnTaskIds?.includes(currentTaskId)).map((task) => task.id));
  return tasks.filter((task) => task.id === currentTaskId || upstreamIds.has(task.id) || downstreamIds.has(task.id));
}
```

- [ ] **Step 4: Run the focused test and verify success**

Run: `./node_modules/.bin/tsx --test server/taskOverview.test.ts`

Expected: all task overview tests pass.

### Task 2: Supply current-task and sibling relationship data

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/data/workspaceNodes.ts`
- Modify: `src/data/taskDetailMocks.ts`
- Test: `server/workspaceScenarioReset.test.ts`

- [ ] **Step 1: Add a failing fixture test for a standalone representative task**

Extend the current workspace fixture test with:

```ts
const standalone = migrated.find((node) => node.id === "weekly-meeting-notes");
assert.equal(standalone?.kind, "task");
assert.equal(standalone && "parentTaskId" in standalone ? standalone.parentTaskId : undefined, undefined);
assert.deepEqual(standalone && "dependsOnTaskIds" in standalone ? standalone.dependsOnTaskIds : undefined, undefined);
```

Update fixture-count expectations to include exactly one standalone task while preserving one main task and eight child tasks.

- [ ] **Step 2: Run the fixture test and verify failure**

Run: `./node_modules/.bin/tsx --test server/workspaceScenarioReset.test.ts`

Expected: FAIL because `weekly-meeting-notes` does not exist.

- [ ] **Step 3: Add representative mock data without migrating historical snapshots**

Append one task to `workspaceNodes`:

```ts
{
  id: "weekly-meeting-notes",
  kind: "task",
  name: "整理下周例会纪要",
  parentId: workspaceRootId,
  ownerId: "周岚",
  participantIds: ["韩序"],
  status: "进行中",
  dueAt: "9 月 2 日",
  goal: "整理例会结论、行动边界与后续需要持续跟进的问题。",
  iconName: "clipboard-check",
  iconTone: "blue",
  labels: ["高优先级"],
  updatedAt: "12 分钟前",
}
```

Add `weekly-meeting-notes` to `TaskDetailId` and provide a scenario mock with files, activities and one evidence-gap insight. Do not modify `legacyTaskSnapshots` or historical migration payloads.

- [ ] **Step 4: Plumb generic relationship data into `TaskDetail`**

In `App.tsx`, derive all sibling tasks for the selected task's `parentTaskId`, including the selected task itself:

```ts
const selectedSiblingTasks = selectedTreeTask?.kind === "task" && selectedTreeTask.parentTaskId
  ? workspaceNodes
      .filter((node): node is TaskNode => node.kind === "task" && node.parentTaskId === selectedTreeTask.parentTaskId)
      .map(toTaskRelationSummary)
  : [];
const selectedCurrentTaskSummary = selectedTreeTask?.kind === "task" ? toTaskRelationSummary(selectedTreeTask) : undefined;
```

Pass `currentTask={selectedCurrentTaskSummary}` and `relationshipTasks={selectedSiblingTasks}` to `TaskDetail`. Add both optional props to `TaskDetailProps` and forward them to `TaskOverviewWorkspace`.

- [ ] **Step 5: Run fixture and overview tests**

Run: `./node_modules/.bin/tsx --test server/workspaceScenarioReset.test.ts server/taskOverview.test.ts`

Expected: both test files pass.

### Task 3: Render the three role variants through one overview component

**Files:**
- Modify: `src/components/TaskOverviewWorkspace.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the old minimal leaf overview with the shared component**

Remove `TaskDetail`'s `task-minimal-overview` branch. Always render `TaskOverviewWorkspace`, passing:

```tsx
<TaskOverviewWorkspace
  activityCount={taskActivityItems.length}
  childTasks={childTasks}
  currentTask={currentTask}
  fileCount={fileCount}
  parentTask={parentTask}
  relationshipTasks={relationshipTasks}
  // existing insight and navigation callbacks stay unchanged
/>
```

No visible label should identify the current task as a main task, subtask or standalone task.

- [ ] **Step 2: Keep the main-task branch byte-for-byte equivalent in behavior**

Use `getOverviewRole` internally. For `main`, retain the existing brief, board/canvas switch, filters, AI insights and rhythm. Do not rename existing headings or modify main-task mock data.

- [ ] **Step 3: Add the subtask branch using the existing canvas code path**

For `subtask`:

- Render the same brief container with “任务关系” as its semantic heading.
- Show main task, prerequisite readiness and downstream impact as the three facts.
- Use `getSubtaskRelationshipScope(relationshipTasks, currentTask.id)` as the canvas data.
- Initialize `view` to `canvas` and `focusedTaskId` to the current task ID when the selected task changes.
- Keep the same `OverviewTaskCard`, SVG markers, dependency edges, filters and blank-canvas click handling.
- Add `data-current-task="true"` and screen-reader text “当前任务” to the selected current card; do not display a task-type badge elsewhere.
- Center the current card with the existing scroll container:

```ts
const node = document.getElementById(`task-overview-canvas-task-${currentTask.id}`);
node?.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
node?.focus({ preventScroll: true });
```

Clicking canvas blank space restores focus to the current task instead of clearing it.

- [ ] **Step 4: Add the standalone branch without an execution-posture brief**

For `standalone`, omit the top brief entirely. Render the same middle grid and rhythm:

- Left panel title remains “任务推进分析”.
- Show exactly three compact facts: latest meaningful result, visible evidence, current gap.
- Derive latest meaningful result from the newest non-status activity; derive evidence from `fileCount`; derive current gap from the latest AI insight.
- If files and activities are both empty, show “尚未产生可分析的推进事实”.
- Reuse the same right-side insight card and hide the panel when no insight exists.

- [ ] **Step 5: Add scoped styles using existing design tokens**

Add only `.task-overview-*` selectors. Reuse:

```css
var(--ad-text-caption)
var(--ad-text-body)
var(--ad-space-2)
var(--ad-space-3)
var(--ad-space-4)
var(--ad-radius-control)
var(--ad-radius-card)
var(--ad-border)
var(--ad-surface-quiet)
```

The standalone fact cards use the same border, radius and typography as existing board cards. The current subtask uses the existing `.is-selected` canvas style plus a small internal current marker; no new accent color is introduced.

- [ ] **Step 6: Run typecheck, design check and focused tests**

Run: `npm run build`

Expected: build succeeds or only reports unrelated pre-existing test-source type errors; no new error references task overview files.

Run: `npm run design:check`

Expected: no new registered design debt.

Run: `./node_modules/.bin/tsx --test server/taskOverview.test.ts server/workspaceScenarioReset.test.ts`

Expected: all focused tests pass.

### Task 4: Verify the representative mock entry points

**Files:**
- Create: `/private/tmp/check-agentdoor-role-overviews.cjs`
- Verify: `src/components/TaskOverviewWorkspace.tsx`

- [ ] **Step 1: Add a Playwright smoke script**

The script must open the task module and verify these entries:

```ts
const examples = [
  "香氛礼盒达人带货收尾",
  "审核素材宣称与达人合同",
  "完成直播间彩排与场控清单",
  "整理下周例会纪要",
];
```

Assertions:

- Main task still has board/canvas switch.
- Both subtask examples open the same canvas component, contain a selected current node and show a “主任务” relationship fact.
- Standalone task has no board/canvas switch, no “主任务” relationship fact and no execution-posture brief.
- All visible filters use the shared select trigger and mobile controls are at least 44 px high.
- Browser console contains no errors.

- [ ] **Step 2: Run the browser smoke test at desktop and mobile widths**

Run the script against `http://127.0.0.1:5174`.

Expected: all four examples pass and screenshots show the existing project typography and spacing.

- [ ] **Step 3: Run final checks**

Run: `git diff --check`

Run: `npm run design:check`

Run: `./node_modules/.bin/tsx --test server/taskOverview.test.ts server/workspaceScenarioReset.test.ts`

Expected: all commands pass.

- [ ] **Step 4: Commit only files owned by this implementation**

Stage the plan, overview component, relevant data files, focused tests and scoped styles. Do not stage unrelated dirty-worktree files.

```bash
git add docs/superpowers/plans/2026-08-29-task-overview-role-variants.md src/lib/taskOverview.ts server/taskOverview.test.ts server/workspaceScenarioReset.test.ts src/App.tsx src/components/TaskDetail.tsx src/components/TaskOverviewWorkspace.tsx src/data/workspaceNodes.ts src/data/taskDetailMocks.ts src/styles.css
git commit -m "feat: adapt task overview by relationship role"
```

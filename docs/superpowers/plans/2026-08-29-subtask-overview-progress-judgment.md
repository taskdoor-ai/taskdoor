# Subtask Overview Progress Judgment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make subtask overviews answer whether the current task can advance, while preserving the shared board/canvas and limiting AI insights to the current subtask.

**Architecture:** Extend the existing workspace projection with explicit overview role/current-task metadata, keep all dependency and judgment calculations in pure library functions, and branch only the top summary plus insight candidate scope inside the shared `TaskOverviewWorkspace`. Main-task rendering remains the current path; standalone behavior is intentionally unchanged in this iteration.

**Tech Stack:** React 19, TypeScript, Motion, existing AgentDoor CSS tokens/components, Node test runner with `tsx`, Vite.

---

## File structure

- Modify `src/lib/taskWorkspaceProjection.ts`: expose `role` and `currentTaskId` from directory facts.
- Modify `src/lib/taskOverview.ts`: produce a deterministic current-task progress judgment and current-task insight candidate scope.
- Modify `src/App.tsx`: pass projection metadata into task details.
- Modify `src/components/TaskDetail.tsx`: thread overview metadata into the shared overview workspace.
- Modify `src/components/TaskOverviewWorkspace.tsx`: render the subtask judgment header, keep the board/canvas shared, and scope insights.
- Modify `src/styles.css`: style the subtask judgment by extending existing overview tokens and layout rules.
- Modify `server/taskWorkspaceProjection.test.ts`: protect role/current-task projection.
- Modify `server/taskOverview.test.ts`: protect judgment wording and insight scope.
- Modify `server/creatorCommerceVisibleCopy.test.ts`: protect the visible subtask/main-task rendering contract.

### Task 1: Add explicit overview role metadata

**Files:**
- Modify: `src/lib/taskWorkspaceProjection.ts`
- Test: `server/taskWorkspaceProjection.test.ts`

- [ ] **Step 1: Write failing projection tests**

Add assertions to the existing main, subtask, and standalone tests:

```ts
assert.equal(mainProjection.role, "main");
assert.equal(mainProjection.currentTaskId, creatorCommerceMainTaskId);

assert.equal(subtaskProjection.role, "subtask");
assert.equal(subtaskProjection.currentTaskId, "fragrance-data");

assert.equal(standaloneProjection.role, "standalone");
assert.equal(standaloneProjection.currentTaskId, "standalone");
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --import tsx --test server/taskWorkspaceProjection.test.ts
```

Expected: FAIL because `role` and `currentTaskId` do not exist.

- [ ] **Step 3: Extend the projection contract**

Implement this shape and return the selected task id on every successful projection:

```ts
export type TaskOverviewRole = "main" | "subtask" | "standalone";

export type TaskOverviewProjection = {
  countLabel: "子任务" | "相关任务";
  currentTaskId: string | null;
  initialFocusedTaskId: string | null;
  role: TaskOverviewRole;
  tasks: TaskNode[];
};
```

Use these branches:

```ts
if (!selectedTask) return {
  countLabel: "相关任务",
  currentTaskId: null,
  initialFocusedTaskId: null,
  role: "standalone",
  tasks: [],
};

if (children.length > 0) return {
  countLabel: "子任务",
  currentTaskId: selectedTask.id,
  initialFocusedTaskId: null,
  role: "main",
  tasks: children,
};

if (selectedTask.parentTaskId) return {
  countLabel: "相关任务",
  currentTaskId: selectedTask.id,
  initialFocusedTaskId: selectedTask.id,
  role: "subtask",
  tasks: siblings.length > 0 ? siblings : [selectedTask],
};

return {
  countLabel: "相关任务",
  currentTaskId: selectedTask.id,
  initialFocusedTaskId: selectedTask.id,
  role: "standalone",
  tasks: [selectedTask],
};
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
node --import tsx --test server/taskWorkspaceProjection.test.ts
```

Expected: all projection tests PASS.

- [ ] **Step 5: Commit projection metadata**

```bash
git add src/lib/taskWorkspaceProjection.ts server/taskWorkspaceProjection.test.ts
git commit -m "feat: classify task overview projections"
```

### Task 2: Model the subtask progress judgment and insight scope

**Files:**
- Modify: `src/lib/taskOverview.ts`
- Test: `server/taskOverview.test.ts`

- [ ] **Step 1: Write failing judgment tests**

Add a richer task fixture and assert blocked, ready, review, completed, cancelled, and multi-predecessor behavior:

```ts
const judgmentTasks = [
  { id: "source-a", owner: "陈默", status: "进行中", title: "脚本终审" },
  { id: "source-b", owner: "林洁", status: "已完成", title: "场控清单" },
  { dependsOnTaskIds: ["source-a", "source-b"], id: "current", owner: "高远", status: "进行中", title: "直播彩排" },
] satisfies OverviewTask[];

assert.deepEqual(getSubtaskProgressJudgment(judgmentTasks, "current"), {
  action: { label: "查看前置任务", taskId: "source-a" },
  condition: "还有 1 项前置未完成",
  detail: "「脚本终审」尚未完成，会影响当前任务继续推进。",
  headline: "当前任务暂时受阻，需先完成「脚本终审」",
  status: "进行中",
});
```

Add explicit status fixtures and assertions:

```ts
const taskWithStatus = (status: string): OverviewTask[] => [
  { id: "source", owner: "陈默", status: "已完成", title: "脚本终审" },
  { dependsOnTaskIds: ["source"], id: "current", owner: "高远", status, title: "直播彩排" },
];

assert.match(getSubtaskProgressJudgment(taskWithStatus("待开始"), "current")?.headline ?? "", /前置条件已满足/);
assert.match(getSubtaskProgressJudgment(taskWithStatus("待审核"), "current")?.headline ?? "", /正在等待审核/);
assert.match(getSubtaskProgressJudgment(taskWithStatus("已完成"), "current")?.headline ?? "", /结果可供后续任务/);
assert.match(getSubtaskProgressJudgment(taskWithStatus("已取消"), "current")?.headline ?? "", /已取消/);
```

Add insight-scope assertions:

```ts
assert.deepEqual(getOverviewInsightCandidateIds(judgmentTasks, "subtask", "current"), ["current"]);
assert.deepEqual(getOverviewInsightCandidateIds(judgmentTasks, "main", "current"), judgmentTasks.map((task) => task.id));
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --import tsx --test --test-name-pattern "推进判断|洞察范围" server/taskOverview.test.ts
```

Expected: FAIL because the functions are not exported.

- [ ] **Step 3: Implement pure judgment helpers**

Extend `OverviewTask` without coupling the library to React components:

```ts
export type OverviewTask = {
  dependsOnTaskIds?: string[];
  dueAt?: string;
  id: string;
  owner: string;
  status: string;
  title?: string;
  updatedAt?: string;
};

export type SubtaskProgressJudgment = {
  action: { label: string; taskId?: string } | null;
  condition: string;
  detail: string;
  headline: string;
  status: string;
};
```

Implement:

```ts
export function getOverviewInsightCandidateIds(
  tasks: OverviewTask[],
  role: "main" | "subtask" | "standalone",
  currentTaskId: string | null,
): string[] {
  if (role !== "subtask") return tasks.map((task) => task.id);
  return currentTaskId && tasks.some((task) => task.id === currentTaskId) ? [currentTaskId] : [];
}
```

Implement `getSubtaskProgressJudgment(tasks, currentTaskId)` using `getIncompleteDependencyIds`. Precedence must be: invalid current task returns `null`; cancelled; completed; unfinished predecessors or blocked; review; in progress; ready to start. Use the first unfinished predecessor as the action target and report additional predecessors only in `detail`.

- [ ] **Step 4: Run all task-overview unit tests and confirm GREEN**

Run:

```bash
node --import tsx --test server/taskOverview.test.ts
```

Expected: all task-overview tests PASS, including convergence-chain behavior.

- [ ] **Step 5: Commit judgment logic**

```bash
git add src/lib/taskOverview.ts server/taskOverview.test.ts
git commit -m "feat: model subtask progress judgment"
```

### Task 3: Thread role metadata through the detail page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Test: `server/creatorCommerceVisibleCopy.test.ts`

- [ ] **Step 1: Write a failing source-contract test**

Add a test that reads `App.tsx`, `TaskDetail.tsx`, and `TaskOverviewWorkspace.tsx`:

```ts
test("任务详情将概览角色和当前任务传给共享概览组件", () => {
  const appSource = readSource("src/App.tsx");
  const detailSource = readSource("src/components/TaskDetail.tsx");
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.match(appSource, /overviewRole=\{selectedOverviewProjection\.role\}/);
  assert.match(appSource, /overviewCurrentTaskId=\{selectedOverviewProjection\.currentTaskId\}/);
  assert.match(detailSource, /role=\{overviewRole\}/);
  assert.match(detailSource, /currentTaskId=\{overviewCurrentTaskId\}/);
  assert.match(overviewSource, /role: TaskOverviewRole/);
  assert.match(overviewSource, /currentTaskId: string \| null/);
});
```

- [ ] **Step 2: Run the source-contract test and confirm RED**

Run:

```bash
node --import tsx --test --test-name-pattern "概览角色和当前任务" server/creatorCommerceVisibleCopy.test.ts
```

Expected: FAIL because the props do not exist.

- [ ] **Step 3: Add and pass the props**

In `TaskDetailProps` add:

```ts
overviewCurrentTaskId?: string | null;
overviewRole?: TaskOverviewRole;
```

Import `TaskOverviewRole` from `taskWorkspaceProjection.ts`, pass both values from `App.tsx` to `TaskDetail`, and from `TaskDetail` to `TaskOverviewWorkspace`. Use `role = "main"` and `currentTaskId = null` as compatibility defaults at the shared workspace boundary.

Update the no-selection fallback projection in `App.tsx` to include:

```ts
{ countLabel: "相关任务", currentTaskId: null, initialFocusedTaskId: null, role: "standalone", tasks: [] }
```

- [ ] **Step 4: Run the source-contract test and TypeScript build**

Run:

```bash
node --import tsx --test --test-name-pattern "概览角色和当前任务" server/creatorCommerceVisibleCopy.test.ts
npm run build
```

Expected: source-contract test PASS; build exits 0.

- [ ] **Step 5: Commit integration props**

```bash
git add src/App.tsx src/components/TaskDetail.tsx src/components/TaskOverviewWorkspace.tsx server/creatorCommerceVisibleCopy.test.ts
git commit -m "feat: pass task overview role metadata"
```

### Task 4: Render the A1 subtask overview and scope AI insights

**Files:**
- Modify: `src/components/TaskOverviewWorkspace.tsx`
- Modify: `src/styles.css`
- Test: `server/creatorCommerceVisibleCopy.test.ts`

- [ ] **Step 1: Write failing rendering-contract tests**

Add source and CSS assertions:

```ts
test("子任务概览使用推进判断而主任务保留协作态势", () => {
  const source = readSource("src/components/TaskOverviewWorkspace.tsx");
  const styles = readSource("src/styles.css");

  assert.match(source, /role === "subtask"/);
  assert.match(source, /当前推进判断/);
  assert.match(source, /当前状态/);
  assert.match(source, /推进条件/);
  assert.match(source, /建议下一步/);
  assert.match(source, /role !== "subtask"/);
  assert.match(styles, /\.task-overview-progress-judgment/);
});

test("子任务洞察只从当前任务候选集中生成", () => {
  const source = readSource("src/components/TaskOverviewWorkspace.tsx");
  assert.match(source, /getOverviewInsightCandidateIds\(/);
  assert.match(source, /insightCandidateTasks\.find/);
});
```

- [ ] **Step 2: Run the rendering-contract tests and confirm RED**

Run:

```bash
node --import tsx --test --test-name-pattern "子任务概览|子任务洞察" server/creatorCommerceVisibleCopy.test.ts
```

Expected: FAIL because the subtask rendering branch is absent.

- [ ] **Step 3: Derive current-task facts and default view**

Inside `TaskOverviewWorkspace` derive:

```ts
const currentTask = overviewTasks.find((task) => task.id === currentTaskId);
const progressJudgment = useMemo(
  () => role === "subtask" ? getSubtaskProgressJudgment(overviewTasks, currentTaskId) : null,
  [currentTaskId, overviewTasks, role],
);
const insightCandidateIds = useMemo(
  () => new Set(getOverviewInsightCandidateIds(overviewTasks, role, currentTaskId)),
  [currentTaskId, overviewTasks, role],
);
const insightCandidateTasks = overviewTasks.filter((task) => insightCandidateIds.has(task.id));
```

Initialize the view with:

```ts
const [view, setView] = useState<OverviewView>(role === "subtask" ? "canvas" : "board");
```

Keep canvas/board task data as `overviewTasks`; only insight candidates are scoped.

- [ ] **Step 4: Render the progress judgment in the shared top card**

Use the existing `task-overview-brief` shell:

```tsx
{role === "subtask" && progressJudgment && (
  <section aria-labelledby="task-overview-progress-heading" className="task-overview-brief task-overview-progress-judgment">
    <header>
      <div>
        <small>当前推进判断</small>
        <h2 id="task-overview-progress-heading">{progressJudgment.headline}</h2>
        <span>{progressJudgment.detail}</span>
      </div>
    </header>
    <div className="task-overview-brief-facts">
      <article><small>当前状态</small><strong>{progressJudgment.status}</strong></article>
      <article><small>推进条件</small><strong>{progressJudgment.condition}</strong></article>
      <article>
        <small>建议下一步</small>
        {progressJudgment.action?.taskId ? (
          <Button onClick={() => onOpenTask?.(progressJudgment.action?.taskId ?? "")} size={actionSize} variant="outline" type="button">
            {progressJudgment.action.label}<ArrowRight data-icon="inline-end" />
          </Button>
        ) : <strong>{progressJudgment.action?.label ?? "继续按当前计划推进"}</strong>}
      </article>
    </div>
  </section>
)}
```

Change the existing section opening from `<section aria-labelledby="task-overview-brief-heading" className="task-overview-brief">` to `{role !== "subtask" && <section aria-labelledby="task-overview-brief-heading" className="task-overview-brief">`, and change its matching close from `</section>` to `</section>}`. This preserves the complete current main/standalone JSX while ensuring distribution, earliest-due, and recent-update facts never render in the subtask branch.

- [ ] **Step 5: Scope every generated insight candidate**

Change candidate selection without changing dependency lookup data:

```ts
const firstDependencyRisk = insightCandidateTasks.find(
  (task) => task.status !== "已取消" && getIncompleteDependencyIds(task, overviewTasks).length > 0,
);
const missingDueTask = insightCandidateTasks.find(
  (task) => task.status !== "已完成" && task.status !== "已取消" && task.dueAt.includes("未设置"),
);
const firstCyclicTask = insightCandidateTasks.find((task) => cyclicTaskIds.has(task.id));
const completedWithDownstream = insightCandidateTasks.find(
  (task) => task.status === "已完成" && fullDependencyEdges.some((edge) => edge.from === task.id),
);
```

The passed `insight` already belongs to the selected task detail and remains eligible.

- [ ] **Step 6: Add token-aligned A1 styling**

Extend existing rules instead of introducing new colors:

```css
.task-overview-progress-judgment > header { align-items: flex-start; }
.task-overview-progress-judgment > header > div { max-width: 920px; }
.task-overview-progress-judgment > header > div > span { color: var(--ad-ink-secondary); font-size: var(--ad-text-caption); line-height: 1.55; }
.task-overview-progress-judgment .task-overview-brief-facts { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.task-overview-progress-judgment .task-overview-brief-facts article { min-height: 104px; }
.task-overview-progress-judgment .task-overview-brief-facts [data-slot="button"] { width: fit-content; }
```

Add a narrow-screen override so the three facts use the same existing two-column/stacked behavior as the main brief.

- [ ] **Step 7: Run focused tests and build**

Run:

```bash
node --import tsx --test server/taskOverview.test.ts server/taskWorkspaceProjection.test.ts server/creatorCommerceVisibleCopy.test.ts
npm run build
```

Expected: all focused tests PASS; build exits 0.

- [ ] **Step 8: Commit the A1 rendering**

```bash
git add src/components/TaskOverviewWorkspace.tsx src/styles.css server/creatorCommerceVisibleCopy.test.ts
git commit -m "feat: differentiate subtask overview"
```

### Task 5: Verify main-task regression and representative subtasks

**Files:**
- Verify: `src/data/workspaceNodes.ts`
- Verify: `src/data/taskDetailMocks.ts`
- Verify: `src/components/TaskOverviewWorkspace.tsx`

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS; build exits 0. Existing Vite bundle-size warnings are non-blocking unless they become errors.

- [ ] **Step 2: Verify the main-task baseline in the browser**

Open `香氛礼盒达人带货收尾` and confirm:

- “协作态势” remains visible.
- Task distribution, earliest due task, and recent update remain visible.
- Board/canvas switching, filters, focus, arrows, flow dots, drag-pan, and zoom still work.

- [ ] **Step 3: Verify a blocked subtask**

Open a subtask whose `dependsOnTaskIds` contains at least one unfinished task and confirm:

- “当前推进判断” replaces “协作态势”.
- No task distribution, earliest due task, or recent update appears.
- The first unfinished predecessor is named in the headline.
- The next-step action opens that predecessor.
- AI insight cards only describe the selected task.

- [ ] **Step 4: Verify a ready or completed subtask**

Open a subtask with all predecessors complete, then a completed subtask, and confirm the judgment changes to the ready/completed wording without changing the shared board/canvas layout.

- [ ] **Step 5: Verify responsive layout**

At desktop and narrow widths confirm the analysis/insight layout follows existing breakpoints, controls retain project typography, and the three progress facts do not overflow.

- [ ] **Step 6: Record final verification evidence**

Report the exact test command, pass count, build exit status, and the task titles used for browser verification. Do not claim completion without this evidence.

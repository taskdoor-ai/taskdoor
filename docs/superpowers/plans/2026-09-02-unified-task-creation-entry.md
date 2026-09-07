# Unified Task Creation Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove creation-mode selection and route both independent tasks and fixed-parent subtasks through the same conversational creation page.

**Architecture:** `App.tsx` owns an optional creation parent context and passes it into the sole `TaskCreationPage` runtime. `TaskDetail` becomes a navigation-only origin for new subtasks. The creation page suppresses incidental relationship decisions while the parent is fixed, and workspace persistence writes the whole approved plan beneath that parent.

**Tech Stack:** React 19, TypeScript, Vite, Node test runner through `tsx --test`.

---

### Task 1: Remove competing creation and inline subtask entry modes

**Files:**
- Modify: `src/components/TaskCreationExperience.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Modify: `server/taskCreationPage.test.ts`
- Modify: `server/taskSubtaskCrudUi.test.ts`

- [ ] **Step 1: Write failing source-contract tests**

```ts
test("任务创建体验只挂载统一对话页", () => {
  const source = read("components/TaskCreationExperience.tsx");
  assert.match(source, /<TaskCreationPage/);
  assert.doesNotMatch(source, /TaskCreationLinearPage|当前方式|分步方式|role="tablist"/);
});

test("子任务页只提供跳转式新增入口", () => {
  const source = read("components/TaskDetail.tsx");
  assert.match(source, /onCreateSubtask\?: \(\) => void/);
  assert.match(source, /onClick=\{onCreateSubtask\}/);
  assert.doesNotMatch(source, /TaskSubtaskCreateForm|AI 调整子任务安排|subtaskCreateOpen/);
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npx tsx --test server/taskCreationPage.test.ts server/taskSubtaskCrudUi.test.ts`

Expected: FAIL because mode tabs, linear page, AI adjustment, and inline form still exist.

- [ ] **Step 3: Collapse the runtime and replace the detail action**

```tsx
export function TaskCreationExperience(props: ComponentProps<typeof TaskCreationPage>) {
  return <section className="task-creation-experience"><TaskCreationPage {...props} /></section>;
}
```

In `TaskDetail`, change `onCreateSubtask` to a no-argument navigation callback, remove `TaskSubtaskCreateForm` state/import/rendering, remove the subtask-heading AI button, and render:

```tsx
{onCreateSubtask && <Button onClick={onCreateSubtask} size="sm" type="button"><Plus aria-hidden="true" size={14} />新增子任务</Button>}
```

- [ ] **Step 4: Run the focused tests and confirm pass**

Run: `npx tsx --test server/taskCreationPage.test.ts server/taskSubtaskCrudUi.test.ts`

Expected: PASS.

### Task 2: Carry fixed parent context into the conversational creation page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TaskCreationPage.tsx`
- Modify: `server/taskCreationAppContext.test.ts`
- Modify: `server/taskCreationPage.test.ts`

- [ ] **Step 1: Add failing tests for scope, breadcrumb, and submit behavior**

```ts
assert.match(appSource, /creationParentContext/);
assert.match(appSource, /startNewSubtaskConversation/);
assert.match(appSource, /parentTaskId: selectedTask\.id/);
assert.match(pageSource, /creationParent\?/);
assert.match(pageSource, /creationParent\.pathItems/);
assert.match(pageSource, /onCreateSubtask\(creationParent\.parentTaskId, plan\)/);
assert.match(pageSource, /decision: "independent"/);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npx tsx --test server/taskCreationAppContext.test.ts server/taskCreationPage.test.ts`

Expected: FAIL because no fixed-parent creation context is wired.

- [ ] **Step 3: Add the parent context and navigation lifecycle in `App.tsx`**

```ts
type CreationParentContext = {
  parentTaskId: string;
  pathItems: Array<{ id: string; label: string }>;
};
```

Maintain `CreationParentContext | null`, clear it for global new-task entry and team changes, and create it from the selected task for the subtask entry. Pass it to `TaskCreationExperience`; cancel returns to the parent when present. Breadcrumb selection closes the creation session and opens the selected task or root list.

- [ ] **Step 4: Make `TaskCreationPage` fixed-parent aware**

Add props:

```ts
creationParent?: CreationParentContext | null;
onPathSelect?: (nodeId: string) => void;
```

For non-clarification planning results in fixed-parent mode, normalize the form to a review state with relationship candidates removed:

```ts
const bindFixedParent = (result: CreationPlanningResult): CreationPlanningResult => {
  if (!creationParent || result.stage === "clarify" || result.stage === "unavailable") return result;
  return {
    stage: "review",
    summary: result.summary,
    form: { ...result.form, candidate: undefined, candidateKind: undefined, candidateReason: undefined, decision: "independent" },
  };
};
```

Render every supplied path item before the terminal “新建任务” crumb. On submit use `onCreateSubtask(creationParent.parentTaskId, plan)` whenever the context exists; otherwise retain existing relationship and independent submission behavior.

- [ ] **Step 5: Run focused tests and confirm pass**

Run: `npx tsx --test server/taskCreationAppContext.test.ts server/taskCreationPage.test.ts`

Expected: PASS.

### Task 3: Preserve an approved nested plan when creating below a parent

**Files:**
- Modify: `src/lib/workspaceTaskCreation.ts`
- Modify: `server/workspaceTaskCreation.test.ts`

- [ ] **Step 1: Add a failing persistence test**

```ts
test("固定父任务创建保留方案中的下级任务和依赖", () => {
  const result = createWorkspaceTasksFromDraft(nodes, draftWithTwoSubtasks, {
    parentTaskId: "parent",
    currentUserId: "周岚",
    idForIndex: index => `created-${index}`,
  });
  assert.deepEqual(result.createdNodes.map(task => task.parentTaskId), ["parent", "created-0", "created-0"]);
  assert.deepEqual(result.createdNodes[2].dependsOnTaskIds, ["created-1"]);
});
```

- [ ] **Step 2: Run the unit test and confirm failure**

Run: `npx tsx --test server/workspaceTaskCreation.test.ts`

Expected: FAIL because the current parent branch discards `draft.subtasks`.

- [ ] **Step 3: Persist the entire hierarchy under the fixed parent**

Allocate IDs for the main task and every planned child. Save the planned main task as a direct child of the fixed parent, save planned subtasks below that new task, translate dependency indexes to the new IDs, preserve the fixed parent's team, and return all created nodes. Keep the existing missing-parent error before any write.

- [ ] **Step 4: Run the unit test and confirm pass**

Run: `npx tsx --test server/workspaceTaskCreation.test.ts`

Expected: PASS.

### Task 4: Focused integration verification

**Files:**
- Verify only; no new production files expected.

- [ ] **Step 1: Run the related test slice**

Run: `npx tsx --test server/taskCreationPage.test.ts server/taskCreationAppContext.test.ts server/taskSubtaskCrudUi.test.ts server/workspaceTaskCreation.test.ts`

Expected: PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Review the scoped diff**

Run: `git diff --check -- src/App.tsx src/components/TaskCreationExperience.tsx src/components/TaskCreationPage.tsx src/components/TaskDetail.tsx src/lib/workspaceTaskCreation.ts server/taskCreationPage.test.ts server/taskCreationAppContext.test.ts server/taskSubtaskCrudUi.test.ts server/workspaceTaskCreation.test.ts`

Expected: no whitespace errors.


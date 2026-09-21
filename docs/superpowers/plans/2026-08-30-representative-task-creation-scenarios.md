# Representative Task Creation Scenarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build five deterministic, representative task-creation conversations with interactive clarification and existing-task decisions, while preserving normal free-form creation.

**Architecture:** Add a focused scenario definition/transition module keyed by `scenarioId`. The conversation component owns only the active scenario session and renders transition results as messages, choice cards, existing-task summaries, or a normal task draft. Extend workspace task context and creation callbacks so “view existing” and “create as subtask” act on real workspace nodes.

**Tech Stack:** React 19, TypeScript, Zod, Node test runner, Vite, existing TaskDoor task fixtures and workspace projection.

---

### Task 1: Define scenario contracts and deterministic transitions

**Files:**
- Create: `src/data/taskCreationScenarios.ts`
- Create: `src/lib/taskCreationScenario.ts`
- Create: `server/taskCreationScenario.test.ts`

- [ ] **Step 1: Write failing tests for the five scenario definitions**

Create `server/taskCreationScenario.test.ts` with assertions that the exported suggestions have unique IDs and exactly these labels:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { taskCreationScenarios } from "../src/data/taskCreationScenarios.ts";

test("defines five representative task creation entries", () => {
  assert.deepEqual(taskCreationScenarios.map(({ id, label }) => ({ id, label })), [
    { id: "single-task", label: "单任务 · 无子任务" },
    { id: "complex-plan", label: "复杂项目 · 共 8 个任务" },
    { id: "clarify-requirement", label: "需求不明确 · 引导创建" },
    { id: "similar-task", label: "发现相似任务 · 创建前确认" },
    { id: "existing-parent", label: "关联已有任务 · 创建子任务" },
  ]);
  assert.equal(new Set(taskCreationScenarios.map(({ id }) => id)).size, 5);
});
```

- [ ] **Step 2: Run the scenario test and verify the missing module failure**

Run: `npx tsx --test server/taskCreationScenario.test.ts`

Expected: FAIL because `src/data/taskCreationScenarios.ts` does not exist.

- [ ] **Step 3: Add scenario and transition types**

Define the stable public types in `src/data/taskCreationScenarios.ts`:

```ts
export type TaskCreationScenarioId =
  | "single-task"
  | "complex-plan"
  | "clarify-requirement"
  | "similar-task"
  | "existing-parent";

export type TaskCreationScenarioDefinition = {
  id: TaskCreationScenarioId;
  label: string;
  prompt: string;
};

export const taskCreationScenarios: TaskCreationScenarioDefinition[] = [
  { id: "single-task", label: "单任务 · 无子任务", prompt: "整理下周例会纪要" },
  { id: "complex-plan", label: "复杂项目 · 共 8 个任务", prompt: creatorCommercePrompt },
  { id: "clarify-requirement", label: "需求不明确 · 引导创建", prompt: "帮我策划一个活动" },
  { id: "similar-task", label: "发现相似任务 · 创建前确认", prompt: "整理新品发布复盘" },
  { id: "existing-parent", label: "关联已有任务 · 创建子任务", prompt: "准备新品发布会的媒体邀请名单" },
];
```

In `src/lib/taskCreationScenario.ts`, define `ScenarioSession`, `ScenarioChoice`, `ExistingTaskCandidate`, and a discriminated `ScenarioTransition` with `question`, `decision`, `draft`, `open-existing`, and `create-subtask` outcomes. Implement pure helpers:

```ts
export function startTaskCreationScenario(id: TaskCreationScenarioId): ScenarioSession;
export function advanceTaskCreationScenario(
  session: ScenarioSession,
  answer: { choiceId?: string; text: string },
  context: ScenarioContext,
): ScenarioTransition;
```

The clarification session stores `goal`, `time`, and `deliverable`. The similar-task decision exposes only `view-existing` and `create-anyway`. The parent decision exposes only `create-subtask` and `create-independent`.

- [ ] **Step 4: Add transition tests for all interactive branches**

Add tests that assert:

```ts
assert.deepEqual(firstQuestion.choices.map((choice) => choice.id), [
  "awareness", "leads", "retention",
]);
assert.equal(afterGoal.kind, "question");
assert.equal(afterTime.kind, "question");
assert.equal(afterDeliverable.kind, "draft");
assert.deepEqual(similarDecision.choices.map((choice) => choice.id), [
  "view-existing", "create-anyway",
]);
assert.deepEqual(parentDecision.choices.map((choice) => choice.id), [
  "create-subtask", "create-independent",
]);
```

Also verify unknown free text is retained and re-prompts only the unresolved field, and a missing existing task falls back to independent creation.

- [ ] **Step 5: Run the focused tests**

Run: `npx tsx --test server/taskCreationScenario.test.ts`

Expected: PASS with the five-entry and transition tests.

- [ ] **Step 6: Commit the scenario engine**

```bash
git add src/data/taskCreationScenarios.ts src/lib/taskCreationScenario.ts server/taskCreationScenario.test.ts
git commit -m "feat: add representative task creation scenarios"
```

### Task 2: Make scenario drafts use the existing assistant contracts

**Files:**
- Modify: `src/lib/taskCreationScenario.ts`
- Modify: `src/lib/mockTaskAssistant.ts`
- Modify: `server/taskCreationScenario.test.ts`
- Modify: `server/mockTaskAssistant.test.ts`

- [ ] **Step 1: Add failing assertions for the final drafts**

Verify the scenario engine returns:

```ts
assert.equal(single.draft.mainTask.title, "整理下周例会纪要");
assert.equal(single.draft.subtasks.length, 0);
assert.equal(complex.draft.mainTask.title, "新品防晒衣抖音达人带货项目");
assert.equal(complex.draft.subtasks.length, 7);
assert.equal(clarified.draft.mainTask.title, "完成新品曝光活动策划与执行");
assert.equal(similarIndependent.draft.mainTask.title, "整理新品发布复盘");
assert.equal(parentIndependent.draft.mainTask.title, "整理并确认媒体邀请名单");
```

Assert dates are empty when “暂时不确定” was selected and that labels are filtered through the actual team tag names.

- [ ] **Step 2: Run tests and verify draft assertions fail**

Run: `npx tsx --test server/taskCreationScenario.test.ts server/mockTaskAssistant.test.ts`

Expected: FAIL on missing or incomplete scenario drafts.

- [ ] **Step 3: Implement draft builders without duplicating the complex fixture**

Export the existing creator-commerce builder through a small public function in `src/lib/mockTaskAssistant.ts`:

```ts
export const createCreatorCommerceScenarioDraft = (
  request: TaskAssistantRequest,
): TaskPlanDraft => createCreatorCommerceDraft(request).draft;
```

Use this helper for `complex-plan`. Build the four single-task drafts in `taskCreationScenario.ts` with the existing `TaskPlanDraft` type and responsibility assignment helper. Do not add another copy of the seven creator-commerce seeds.

- [ ] **Step 4: Preserve generic assistant behavior**

Keep `createMockTaskAssistantResponse(request)` unchanged for requests without a `scenarioId`. Add targeted helpers instead of adding UI-only state to `TaskAssistantRequest`, so a future real assistant endpoint remains compatible.

- [ ] **Step 5: Run assistant and scenario tests**

Run: `npx tsx --test server/taskCreationScenario.test.ts server/mockTaskAssistant.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit reusable draft creation**

```bash
git add src/lib/taskCreationScenario.ts src/lib/mockTaskAssistant.ts server/taskCreationScenario.test.ts server/mockTaskAssistant.test.ts
git commit -m "feat: generate drafts for task creation scenarios"
```

### Task 3: Render interactive questions and decision cards in the conversation

**Files:**
- Create: `src/components/TaskCreationChoiceCards.tsx`
- Modify: `src/components/TaskCreationConversation.tsx`
- Modify: `src/styles.css`
- Modify: `server/creatorCommerceVisibleCopy.test.ts`

- [ ] **Step 1: Replace the obsolete source-contract test with failing scenario UI contracts**

Update the shortcut test to assert imports and scenario-aware submission:

```ts
assert.match(source, /taskCreationScenarios\.map/);
assert.match(source, /handleScenarioStart\(suggestion\)/);
assert.match(source, /TaskCreationChoiceCards/);
assert.doesNotMatch(source, /完整项目 · 7 个子任务/);
```

Also assert the choice component uses buttons and disables all choices after a valid submission.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `npx tsx --test server/creatorCommerceVisibleCopy.test.ts`

Expected: FAIL because the current component still maps `mockPromptSuggestions` into `handleSend`.

- [ ] **Step 3: Add the reusable choice-card component**

Implement this interface in `TaskCreationChoiceCards.tsx`:

```ts
type TaskCreationChoiceCardsProps = {
  choices: ScenarioChoice[];
  disabled?: boolean;
  onSelect: (choice: ScenarioChoice) => void;
};
```

Render each option as a semantic `<button>` containing its title and optional description. The parent owns submitted state; the component must not hide choices after selection.

- [ ] **Step 4: Integrate scenario sessions into the conversation**

Add `activeScenario`, `scenarioTransition`, and `submittedTransitionId` state. Implement:

```ts
const handleScenarioStart = (definition: TaskCreationScenarioDefinition) => {
  resetTransientConversationState();
  const session = startTaskCreationScenario(definition.id);
  setActiveScenario(session);
  appendUserMessage(definition.prompt);
  void advanceScenario(session, { text: definition.prompt });
};
```

Direct scenarios set the normal `output` draft. Question transitions append an assistant message and render choice cards beneath that message. Choice clicks append the selected title as a user message and advance once. Free-form composer input advances the active clarification session; otherwise it continues to call the existing assistant.

- [ ] **Step 5: Add restrained styles for the cards**

Add `.task-creation-choice-list`, `.task-creation-choice`, hover, focus-visible, selected, and disabled rules using existing surface, border, radius, and type tokens. Do not add a state stepper or expose internal phase names.

- [ ] **Step 6: Run UI contracts and production build**

Run: `npx tsx --test server/creatorCommerceVisibleCopy.test.ts && npm run build`

Expected: tests PASS and Vite production build completes.

- [ ] **Step 7: Commit the interactive conversation**

```bash
git add src/components/TaskCreationChoiceCards.tsx src/components/TaskCreationConversation.tsx src/styles.css server/creatorCommerceVisibleCopy.test.ts
git commit -m "feat: add interactive task creation choices"
```

### Task 4: Supply real existing-task context and support view-existing

**Files:**
- Modify: `src/components/TaskCreationConversation.tsx`
- Modify: `src/App.tsx`
- Modify: `src/data/workspaceNodes.ts`
- Modify: `src/lib/taskCreationScenario.ts`
- Modify: `server/taskCreationScenario.test.ts`

- [ ] **Step 1: Add failing tests for candidate resolution**

Use full task metadata in the scenario context and assert exact ID resolution:

```ts
assert.equal(similar.candidate.id, "weekly-retro-notes");
assert.equal(similar.candidate.status, "进行中");
assert.equal(parent.candidate.id, "product-launch-planning");
assert.equal(parent.candidate.childTaskNames.length, 3);
```

- [ ] **Step 2: Run tests and verify the parent fixture is missing**

Run: `npx tsx --test server/taskCreationScenario.test.ts`

Expected: FAIL because `product-launch-planning` and richer existing-task fields are absent.

- [ ] **Step 3: Add the representative parent task fixture**

Add `新品发布会筹备` plus its three existing child tasks to `workspaceNodes.ts`, using stable IDs, `parentTaskId`, the September 20 due date, and existing workspace task fields. Keep this data separate from the creator-commerce project.

- [ ] **Step 4: Pass complete task context to the conversation**

Replace the reduced `{ name, ownerId, status }` mapping with a typed existing-task view that includes `id`, `goal`, `dueAt`, `labels`, `parentTaskId`, and child names. The scenario handler must resolve candidates from this passed data instead of inventing an ID in the component.

- [ ] **Step 5: Wire the view-existing decision**

When `advanceTaskCreationScenario` returns `open-existing`, call the existing `onOpenTask(candidate.id)` callback and do not set an output draft or call task creation.

- [ ] **Step 6: Run focused tests and build**

Run: `npx tsx --test server/taskCreationScenario.test.ts server/creatorCommerceVisibleCopy.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit existing-task decisions**

```bash
git add src/components/TaskCreationConversation.tsx src/App.tsx src/data/workspaceNodes.ts src/lib/taskCreationScenario.ts server/taskCreationScenario.test.ts
git commit -m "feat: resolve existing tasks during creation"
```

### Task 5: Persist independent plans and child-task creation

**Files:**
- Create: `src/lib/workspaceTaskCreation.ts`
- Create: `server/workspaceTaskCreation.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/TaskCreationConversation.tsx`

- [ ] **Step 1: Write failing workspace creation tests**

Test a pure function with deterministic injected IDs:

```ts
const result = createWorkspaceTasksFromDraft(nodes, draft, {
  idForIndex: (index) => `created-${index}`,
  parentTaskId: "product-launch-planning",
});

assert.equal(result.createdNodes.length, 1);
assert.equal(result.createdNodes[0]?.parentTaskId, "product-launch-planning");
assert.equal(result.createdNodes[0]?.parentId, workspaceRootId);
assert.equal(result.nodes.some((node) => node.id === "created-0"), true);
```

Add a second test asserting one main task plus seven child tasks receive correct `parentTaskId` and dependency IDs.

- [ ] **Step 2: Run the creation test and verify missing module failure**

Run: `npx tsx --test server/workspaceTaskCreation.test.ts`

Expected: FAIL because `workspaceTaskCreation.ts` does not exist.

- [ ] **Step 3: Implement immutable task-node creation**

Implement:

```ts
export function createWorkspaceTasksFromDraft(
  nodes: WorkspaceNode[],
  draft: TaskPlanDraft,
  options?: {
    idForIndex?: (index: number) => string;
    parentTaskId?: string;
  },
): { createdNodes: TaskNode[]; mainTaskId: string; nodes: WorkspaceNode[] };
```

For ordinary plans, create the main task and each subtask, translate draft dependency indexes to created task IDs, and append all nodes. For `parentTaskId`, create only the draft main task as a child of the validated existing parent. Preserve owner, participants, dates, labels, icon, and goal.

- [ ] **Step 4: Replace preview-only creation in App**

Update `createTaskPlanFromConversation` to call `setWorkspaceNodes` with the pure helper and return the actual created IDs. Add an `onCreateSubtask(parentTaskId, draft)` callback that uses the same helper with `parentTaskId`.

- [ ] **Step 5: Connect the parent decision to final creation**

When the user chooses “创建为子任务”, store the selected parent ID alongside the draft. `confirmCreate` calls `onCreateSubtask`; “仍然独立创建” calls the normal `onCreateTaskPlan` path. Revalidate parent existence before creation; on failure, append the documented fallback message and keep an independently creatable draft.

- [ ] **Step 6: Run full verification**

Run: `npm test && npm run build`

Expected: all Node tests pass, TypeScript succeeds, and Vite production build completes. Existing Vite chunk-size warnings are acceptable if unchanged.

- [ ] **Step 7: Commit persistence support**

```bash
git add src/lib/workspaceTaskCreation.ts server/workspaceTaskCreation.test.ts src/App.tsx src/components/TaskCreationConversation.tsx
git commit -m "feat: persist created plans and subtasks"
```

### Task 6: Final regression and design-contract cleanup

**Files:**
- Modify: `server/creatorCommerceVisibleCopy.test.ts`
- Modify: `server/taskCreationScenario.test.ts`
- Modify: `docs/superpowers/specs/2026-08-30-representative-task-creation-scenarios-design.md` only if implementation reveals a verified mismatch

- [ ] **Step 1: Add final regression assertions**

Assert that no rendered copy contains internal states:

```ts
for (const internalState of [
  "awaiting-clarification",
  "awaiting-decision",
  "draft-ready",
]) {
  assert.doesNotMatch(conversationSource, new RegExp(`>[^{<]*${internalState}`));
}
```

Assert the fourth scenario has exactly two actions, the fifth scenario has exactly two actions, and the clarification scenario exposes both choice-card and composer submission paths.

- [ ] **Step 2: Run all verification commands**

Run: `npm test && npm run build && npm run design:check`

Expected: all tests and build pass; the design checker reports no new violations.

- [ ] **Step 3: Inspect the final diff for unrelated edits**

Run: `git diff --check && git status --short`

Expected: no whitespace errors. Only files named in this plan should be staged by this implementation; pre-existing user changes remain untouched.

- [ ] **Step 4: Commit final regression coverage**

```bash
git add server/creatorCommerceVisibleCopy.test.ts server/taskCreationScenario.test.ts
git commit -m "test: cover representative creation conversations"
```

# Task Local AI Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished whole-task “连接 AI” entry and simplify the existing connection dialog to tool selection, current-task summary, and permission messaging.

**Architecture:** `TaskDetail` owns the whole-task entry and produces an `AiConnectionRequest`. `AiConnectionDialog` remains the single launch surface and reuses `agentIconUrls` plus the existing Deep Link/clipboard behavior. A small source-level regression test protects the required entry, tools, logos, and permission copy while the TypeScript build verifies component integration.

**Tech Stack:** React, TypeScript, Lucide React, existing TaskDoor CSS tokens, Node test runner, Vite.

---

## File map

- Modify `src/components/AiConnectionDialog.tsx`: simplify the modal and keep launch behavior.
- Modify `src/components/TaskDetail.tsx`: add the whole-task “连接 AI” entry and request builder.
- Modify `src/styles.css`: replace the existing complex modal layout with the approved compact layout and style the task entry.
- Create `server/taskLocalAiConnection.test.ts`: protect the product contract with focused source assertions.

### Task 1: Protect the approved interaction contract

**Files:**
- Create: `server/taskLocalAiConnection.test.ts`

- [ ] **Step 1: Write the failing regression test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readSource = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

test("任务详情提供整任务连接 AI 入口", () => {
  const source = readSource("src/components/TaskDetail.tsx");
  assert.match(source, />连接 AI</);
  assert.match(source, /title: "连接当前任务"/);
  assert.match(source, /workObject: \{ kind: "当前任务"/);
});

test("连接弹窗复用真实工具 Logo 并保持简约上下文", () => {
  const source = readSource("src/components/AiConnectionDialog.tsx");
  for (const tool of ["ChatGPT", "Claude Code", "CodeBuddy", "Cursor"]) assert.match(source, new RegExp(tool));
  assert.match(source, /agentIconUrls/);
  assert.match(source, /仅带入你当前有权查看的信息，不会获得额外权限/);
  assert.doesNotMatch(source, /希望 Agent 完成|期望带回的成果|如何与个人 AI 协作/);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npx tsx --test server/taskLocalAiConnection.test.ts`

Expected: FAIL because the whole-task entry and simplified copy are not present.

- [ ] **Step 3: Commit the failing test**

```bash
git add server/taskLocalAiConnection.test.ts
git commit -m "test: define task AI connection contract"
```

### Task 2: Simplify the connection dialog

**Files:**
- Modify: `src/components/AiConnectionDialog.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the dialog content with the approved hierarchy**

Keep the existing `agents`, `buildContextPrompt`, `copyText`, Escape handling, and `launchAgent`. Render only:

```tsx
<header className="ai-connect-header">
  <div><h2 id="ai-connect-title">连接 AI</h2><p>选择一个工具，带着当前任务继续工作。</p></div>
  <button aria-label="关闭" className="ai-connect-close" onClick={onClose} type="button"><X size={17} /></button>
</header>
<div className="ai-connect-body compact">
  <section className="ai-agent-picker">
    <strong>选择工具</strong>
    <div className="ai-agent-options horizontal">{/* four existing agents using agentIconUrls */}</div>
  </section>
  <section className="ai-context-preview compact">
    <strong>带入的信息</strong>
    <article className="ai-current-task-card">
      <small>当前任务</small>
      <h3>{request.workObject.title}</h3>
      <p>{request.workObject.meta}</p>
    </article>
    <p>连接后，{activeAgent.name} 将获得这个任务的相关上下文并开始工作。</p>
    <div className="ai-permission-note"><LockKeyhole size={14} />仅带入你当前有权查看的信息，不会获得额外权限。</div>
  </section>
</div>
```

Remove the stepper, layered package preview, work-goal/expected-output presentation, and unused imports. Keep those request fields in the type for compatibility with existing fine-grained activity actions.

- [ ] **Step 2: Replace modal CSS with a responsive top-tool/bottom-context layout**

Use existing `--ad-*` tokens. At desktop widths, `.ai-agent-options.horizontal` uses four equal columns; below 760px it uses one column. The task card uses one quiet surface, and the permission note uses the existing fact/success palette. Preserve focus-visible styles and reduced-motion behavior.

- [ ] **Step 3: Run the focused test**

Run: `npx tsx --test server/taskLocalAiConnection.test.ts`

Expected: the dialog test passes; the task-entry test still fails.

- [ ] **Step 4: Commit the dialog change**

```bash
git add src/components/AiConnectionDialog.tsx src/styles.css
git commit -m "feat: simplify task AI connection dialog"
```

### Task 3: Add the whole-task entry

**Files:**
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add a whole-task request builder inside `TaskDetail`**

Add an `openTaskAiConnection` callback that sets:

```ts
setAiRequest({
  title: "连接当前任务",
  description: "选择一个工具，带着当前任务继续工作。",
  instruction: `基于当前任务上下文继续处理：${task.goal}`,
  expectedOutput: "与当前任务目标一致的可核对成果",
  context: [
    { label: "任务", value: task.title },
    { label: "任务编号", value: taskId },
    { label: "状态", value: currentStatus },
    { label: "负责人", value: displayedOwnerId },
    { label: "任务目标", value: task.goal },
  ],
  workObject: {
    kind: "当前任务",
    title: task.title,
    meta: `${taskId} · ${currentStatus}`,
    content: task.goal,
  },
});
```

- [ ] **Step 2: Add the visible entry to the task hero**

Place a secondary `Button` in the task hero header near the task identity, using `Link2` and visible text `连接 AI`. It must call `openTaskAiConnection` and have an accessible label containing the task title.

- [ ] **Step 3: Add scoped entry styling**

Add `.task-detail-ai-connect` styles using existing button geometry and tokens. Keep it compact, preserve keyboard focus, and wrap below the title on narrow screens without overlapping tags or metadata.

- [ ] **Step 4: Run focused and full verification**

Run: `npx tsx --test server/taskLocalAiConnection.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

Run: `npm test`

Expected: all server tests pass.

- [ ] **Step 5: Commit the entry and tests**

```bash
git add src/components/TaskDetail.tsx src/styles.css server/taskLocalAiConnection.test.ts
git commit -m "feat: connect tasks to local AI tools"
```

### Task 4: Visual regression check

**Files:**
- Modify only if required: `src/components/AiConnectionDialog.tsx`, `src/components/TaskDetail.tsx`, `src/styles.css`

- [ ] **Step 1: Start the existing app**

Run: `npm run dev`

Expected: Vite reports a local development URL.

- [ ] **Step 2: Inspect the task detail and modal**

Open a task, verify the “连接 AI” entry, open the modal, switch all four tools, and verify the real logos, selected state, current task summary, permission note, button copy, Escape close, and narrow layout.

- [ ] **Step 3: Run final verification after any visual fixes**

Run: `npm test && npm run build`

Expected: all tests and the production build pass.

- [ ] **Step 4: Commit any visual corrections**

```bash
git add src/components/AiConnectionDialog.tsx src/components/TaskDetail.tsx src/styles.css
git commit -m "fix: polish task AI connection UI"
```

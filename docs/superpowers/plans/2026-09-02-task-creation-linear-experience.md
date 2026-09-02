# Task Creation Linear Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在完整保留现有任务创建页的前提下，新增可切换的白纸式纵向分步创建体验。

**Architecture:** `TaskCreationExperience` 负责模式 Tab 与双页面保活；现有 `TaskCreationPage` 不改内部流程；新的 `TaskCreationLinearPage` 复用 `planTaskCreation`、`CreationForm` 和创建回调。纯函数 `taskCreationLinearStages` 决定纵向章节顺序与揭示状态，线性编辑组件只负责渲染和更新同一份表单。

**Tech Stack:** React、TypeScript、Motion、Radix/现有 UI 组件、Node test runner、Vite。

---

## 文件结构

- Create: `src/lib/taskCreationLinearStages.ts` — 从 `CreationForm` 生成线性章节顺序、拆分说明和揭示状态。
- Create: `src/components/TaskCreationLinearSections.tsx` — 目标、人员、拆分、规划和可展开子任务的无卡片编辑 UI。
- Create: `src/components/TaskCreationLinearPage.tsx` — 分步模式的需求、规划、播放、澄清、关系决定、错误和提交状态。
- Create: `src/components/TaskCreationExperience.tsx` — 标准 Tab 外壳，同时保活现有页与分步页。
- Create: `src/styles/task-creation-linear.css` — 纵向文档、分隔线、展开内容、响应式和无动画状态。
- Create: `server/taskCreationLinearStages.test.ts` — 纯阶段模型测试。
- Create: `server/taskCreationLinearUi.test.ts` — 入口、无卡片结构、可访问性和接线契约测试。
- Modify: `src/App.tsx` — 把创建页挂载点替换为体验外壳，原 props 原样传递。
- Modify: `server/taskCreationPage.test.ts` — 更新 App 挂载契约，同时继续断言旧页存在。

### Task 1: 线性章节模型

**Files:**
- Create: `server/taskCreationLinearStages.test.ts`
- Create: `src/lib/taskCreationLinearStages.ts`

- [ ] **Step 1: 写失败测试，锁定无子任务、多个子任务和逐步揭示**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getLinearCreationStages } from "../src/lib/taskCreationLinearStages.ts";
import type { CreationForm } from "../src/lib/taskCreationForm.ts";

const form = (subtaskCount: number): CreationForm => ({
  request: "推进新品发布",
  decision: "independent",
  mainTask: { clientId: "main", title: "新品发布", goal: "按期上线", ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "", completionCriteria: ["完成上线"], executionTips: [], dependsOnClientIds: [] },
  subtasks: Array.from({ length: subtaskCount }, (_, index) => ({ clientId: `sub-${index}`, title: `子任务 ${index + 1}`, goal: "按期上线", ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "", completionCriteria: ["交付完成"], executionTips: [], dependsOnClientIds: index ? [`sub-${index - 1}`] : [] })),
});

test("无子任务时只显示目标、人员和拆分判断", () => {
  assert.deepEqual(getLinearCreationStages(form(0), 9).map(stage => stage.id), ["goal", "people", "split"]);
});

test("有子任务时先规划再逐项揭示", () => {
  assert.deepEqual(getLinearCreationStages(form(2), 4).map(stage => stage.id), ["goal", "people", "split", "plan"]);
  assert.deepEqual(getLinearCreationStages(form(2), 6).map(stage => stage.id), ["goal", "people", "split", "plan", "subtask:sub-0", "subtask:sub-1"]);
});
```

- [ ] **Step 2: 运行测试并确认因模块缺失失败**

Run: `npx tsx --test server/taskCreationLinearStages.test.ts`

Expected: FAIL，提示找不到 `taskCreationLinearStages.ts`。

- [ ] **Step 3: 实现最小纯函数**

```ts
import type { CreationForm } from "./taskCreationForm";

export type LinearCreationStage = {
  id: "goal" | "people" | "split" | "plan" | `subtask:${string}`;
  label: string;
};

export function getLinearCreationStages(form: CreationForm, revealCount = Number.POSITIVE_INFINITY): LinearCreationStage[] {
  const stages: LinearCreationStage[] = [
    { id: "goal", label: "目标与验收标准" },
    { id: "people", label: "寻找参与者" },
    { id: "split", label: "是否拆分" },
  ];
  if (form.subtasks.length) {
    stages.push({ id: "plan", label: "子任务规划" });
    stages.push(...form.subtasks.map(task => ({ id: `subtask:${task.clientId}` as const, label: task.title || "未命名子任务" })));
  }
  return stages.slice(0, Math.max(0, revealCount));
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npx tsx --test server/taskCreationLinearStages.test.ts`

Expected: 2 tests PASS。

### Task 2: 无卡片纵向章节与子任务编辑

**Files:**
- Create: `src/components/TaskCreationLinearSections.tsx`
- Create: `src/styles/task-creation-linear.css`
- Create: `server/taskCreationLinearUi.test.ts`

- [ ] **Step 1: 写失败契约测试**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("线性章节使用纵向文档和原生展开语义，不复用卡片方案", () => {
  const source = read("components/TaskCreationLinearSections.tsx");
  assert.match(source, /linear-creation-section/);
  assert.match(source, /<details/);
  assert.match(source, /aria-label=.*完成标准/);
  assert.match(source, /MemberSelector/);
  assert.doesNotMatch(source, /task-detail-hero-card|TaskCreationPlanEditor|TaskCreationSubtaskEditor/);
});

test("线性样式没有子任务卡片阴影，并覆盖移动端与减弱动画", () => {
  const css = read("styles/task-creation-linear.css");
  assert.match(css, /\.linear-creation-document/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 720px/);
  assert.doesNotMatch(css, /box-shadow:[^;]+/);
});
```

- [ ] **Step 2: 运行测试并确认因文件缺失失败**

Run: `npx tsx --test server/taskCreationLinearUi.test.ts`

Expected: FAIL，提示找不到 `TaskCreationLinearSections.tsx`。

- [ ] **Step 3: 实现章节组件的公开接口和线性结构**

```tsx
type Props = {
  form: CreationForm;
  members: Member[];
  tags: TagDefinition[];
  revealCount: number;
  disabled?: boolean;
  onChange: (form: CreationForm) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
};

export function TaskCreationLinearSections({ form, members, tags, revealCount, disabled = false, onChange, onInviteMembers }: Props) {
  const stages = getLinearCreationStages(form, revealCount);
  const updateTask = (clientId: string, patch: Partial<CreationTask>) => onChange({
    ...form,
    mainTask: clientId === form.mainTask.clientId ? { ...form.mainTask, ...patch } : form.mainTask,
    subtasks: form.subtasks.map(task => task.clientId === clientId ? { ...task, ...patch } : task),
  });
  return <div className="linear-creation-document">{stages.map((stage, index) => (
    <section className="linear-creation-section" data-stage={stage.id} key={stage.id}>
      <header><span>{String(index + 1).padStart(2, "0")}</span><h2>{stage.label}</h2></header>
      <LinearCreationStageBody disabled={disabled} form={form} members={members} onChange={onChange} onInviteMembers={onInviteMembers} stage={stage} tags={tags} updateTask={updateTask} />
    </section>
  ))}</div>;
}
```

同文件内定义 `LinearCreationStageBody`，按 `stage.id` 返回五种明确分支：`goal` 使用 `TaskCreationEditableText` 和 `TaskCriteriaFields`；`people` 使用两个 `MemberSelector`；`split` 返回拆分结论与依据；`plan` 返回顺序、并行和依赖列表；`subtask:*` 返回 `<details><summary>` 编辑器。子任务摘要显示名称、目标、负责人，展开区使用 `TaskCreationEditableText`、`TaskCriteriaFields`、`MemberSelector`、`TaskDueDatePicker`、`TagPicker` 和 `TagBadge`，并提供依赖选择与移除动作。所有分支只通过 `onChange` 更新传入的同一份 `CreationForm`。

- [ ] **Step 4: 实现无卡片 CSS**

```css
.linear-creation-document { width: min(100%, 860px); margin: 0 auto; }
.linear-creation-section { position: relative; padding: var(--ad-space-7) 0; border-bottom: 1px solid var(--ad-border-soft); }
.linear-creation-section > header { display: flex; align-items: baseline; gap: var(--ad-space-3); }
.linear-creation-subtask { border-top: 1px solid var(--ad-border-soft); }
.linear-creation-subtask > summary { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--ad-space-3); min-height: var(--ad-control-touch-min); cursor: pointer; }
@media (max-width: 720px) { .linear-creation-section { padding-block: var(--ad-space-5); } }
@media (prefers-reduced-motion: reduce) { .linear-creation-document * { scroll-behavior: auto; transition: none !important; } }
```

- [ ] **Step 5: 运行契约测试**

Run: `npx tsx --test server/taskCreationLinearUi.test.ts`

Expected: 2 tests PASS。

### Task 3: 分步页面状态流

**Files:**
- Create: `src/components/TaskCreationLinearPage.tsx`
- Modify: `server/taskCreationLinearUi.test.ts`

- [ ] **Step 1: 增加失败测试，覆盖输入、顺序播放、停止、澄清、关系与提交**

```ts
test("分步页复用规划器并在确认前不创建", () => {
  const source = read("components/TaskCreationLinearPage.tsx");
  assert.match(source, /planTaskCreation\(/);
  assert.match(source, /resolveCreationRelationship\(/);
  assert.match(source, /getLinearCreationStages\(/);
  assert.match(source, /停止生成/);
  assert.match(source, /validateCreationForm\(/);
  assert.match(source, /toTaskPlanDraft\(/);
  assert.match(source, /onCreateSubtask\(form\.candidate\.id, plan\) : onCreateTaskPlan\(plan\)/);
  assert.doesNotMatch(source, /taskCreationScenarios\.map|快速开始|TaskCreationProcess/);
});
```

- [ ] **Step 2: 运行测试并确认因页面缺失失败**

Run: `npx tsx --test server/taskCreationLinearUi.test.ts`

Expected: FAIL，提示找不到 `TaskCreationLinearPage.tsx`。

- [ ] **Step 3: 实现单一草稿状态和可取消顺序播放**

```tsx
type LinearWorkspace = {
  request: string;
  planning: CreationPlanningResult | null;
  answers: { goal?: string; deliverable?: string };
  revealCount: number;
  status: "idle" | "planning" | "ready" | "stopped" | "failed";
};

const runRef = useRef(0);
const stopGeneration = () => {
  runRef.current += 1;
  setWorkspace(current => ({ ...current, status: "stopped" }));
};

const reveal = async (form: CreationForm, run: number) => {
  const total = getLinearCreationStages(form).length;
  for (let count = 1; count <= total; count += 1) {
    if (run !== runRef.current) return;
    setWorkspace(current => ({ ...current, planning: { stage: "review", form, summary: "" }, revealCount: count }));
    await new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 0 : 520));
  }
  if (run === runRef.current) setWorkspace(current => ({ ...current, status: "ready" }));
};
```

`generatePlan` 调用 `planTaskCreation`：`clarify` 渲染纵向补充信息；`decision` 渲染纵向关系确认；`review` 调用 `reveal`。失败时保留 `request` 和上一份 `review` 表单，错误显示在当前步骤。提交前调用 `validateCreationForm`，再以与旧页相同的 `onCreateSubtask` / `onCreateTaskPlan` 分支创建。

- [ ] **Step 4: 实现页面结构与确认区**

```tsx
return <section className="task-creation-linear-page" aria-label="分步创建任务">
  {workspace.status === "idle" ? <LinearRequestComposer onSend={generatePlan} /> : <>
    <section className="linear-creation-request"><small>原始需求</small><p>{workspace.request}</p><button onClick={editRequest}>修改需求</button></section>
    {workspace.planning?.stage === "clarify" && <LinearClarification />}
    {workspace.planning?.stage === "decision" && <LinearRelationshipDecision />}
    {form && <TaskCreationLinearSections disabled={workspace.status === "planning" || Boolean(result)} form={form} members={members} onChange={updateForm} revealCount={workspace.revealCount} tags={tags} />}
    {workspace.status === "planning" && <Button aria-label="停止生成" onClick={stopGeneration}>停止生成</Button>}
    {form && workspace.status !== "planning" && <LinearConfirmation disabled={Boolean(validateCreationForm(form, members))} onConfirm={submit} />}
  </>}
</section>;
```

- [ ] **Step 5: 运行相关测试**

Run: `npx tsx --test server/taskCreationLinearStages.test.ts server/taskCreationLinearUi.test.ts`

Expected: 全部 PASS。

### Task 4: 模式外壳与 App 接线

**Files:**
- Create: `src/components/TaskCreationExperience.tsx`
- Modify: `src/App.tsx:2,905-918`
- Modify: `server/taskCreationPage.test.ts`
- Modify: `server/taskCreationLinearUi.test.ts`

- [ ] **Step 1: 写失败测试，锁定默认模式、双页面保活和 App 接线**

```ts
test("创建体验默认当前方式并保活两种页面", () => {
  const source = read("components/TaskCreationExperience.tsx");
  assert.match(source, /useState<CreationMode>\("classic"\)/);
  assert.match(source, /当前方式/);
  assert.match(source, /分步方式/);
  assert.match(source, /<TaskCreationPage/);
  assert.match(source, /<TaskCreationLinearPage/);
  assert.match(source, /hidden=\{mode !== "classic"\}/);
  assert.match(source, /hidden=\{mode !== "linear"\}/);
});

test("App 通过体验外壳创建任务", () => {
  const app = read("App.tsx");
  assert.match(app, /<TaskCreationExperience/);
  assert.doesNotMatch(app, /creation=\{creationSessionOpen \? <TaskCreationPage/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskCreationLinearUi.test.ts server/taskCreationPage.test.ts`

Expected: FAIL，提示外壳缺失或 App 仍挂载旧页。

- [ ] **Step 3: 实现标准 Tab 外壳并同时保活页面**

```tsx
type CreationMode = "classic" | "linear";

export function TaskCreationExperience(props: TaskCreationPageProps) {
  const [mode, setMode] = useState<CreationMode>("classic");
  return <section className="task-creation-experience">
    <div aria-label="任务创建方式" className="task-creation-mode-tabs" role="tablist">
      <button aria-selected={mode === "classic"} onClick={() => setMode("classic")} role="tab" type="button">当前方式</button>
      <button aria-selected={mode === "linear"} onClick={() => setMode("linear")} role="tab" type="button">分步方式</button>
    </div>
    <div hidden={mode !== "classic"}><TaskCreationPage {...props} active={props.active && mode === "classic"} /></div>
    <div hidden={mode !== "linear"}><TaskCreationLinearPage {...props} active={props.active && mode === "linear"} /></div>
  </section>;
}
```

为避免重复的页面路径，外壳只提供模式 Tab；两个子页面保留各自路径和返回动作。隐藏分支通过 `active={false}` 关闭自动聚焦和弹层。

- [ ] **Step 4: 替换 App import 与挂载组件**

```tsx
import { TaskCreationExperience } from "./components/TaskCreationExperience";

creation={creationSessionOpen ? <TaskCreationExperience
  active={activeSection === "conversation"}
  currentUserId={currentUserId}
  existingTasks={taskCreationExistingTasks}
  members={collaborationMembers}
  onCancel={() => { setCreationSessionOpen(false); showTaskList(); }}
  onCreateTaskPlan={createTaskPlanFromConversation}
  onCreateSubtask={(parentTaskId, draft) => createTaskPlanFromConversation(draft, parentTaskId)}
  onDraftStart={() => { creationSessionCompleted.current = false; }}
  onInviteMembers={(returnFocus) => openPersonalCenter("members", returnFocus)}
  onOpenTask={openTask}
  tags={tagDefinitions}
/> : null}
```

- [ ] **Step 5: 运行入口和旧流程相关测试**

Run: `npx tsx --test server/taskCreationLinearUi.test.ts server/taskCreationPage.test.ts server/taskCreationPlanningUi.test.ts server/workspaceNavigation.test.ts server/taskWorkspaceLayout.test.ts`

Expected: 全部 PASS；旧页断言仍成立，App 挂载断言更新为体验外壳。

### Task 5: 最小集成验证

**Files:**
- Modify only if verification exposes a scoped defect in files listed above.

- [ ] **Step 1: 运行线性创建相关测试**

Run: `npx tsx --test server/taskCreationLinearStages.test.ts server/taskCreationLinearUi.test.ts server/taskCreationPage.test.ts server/taskCreationPlanningUi.test.ts server/taskCreationForm.test.ts server/taskCreationProgress.test.ts server/taskCreationSubtaskEditor.test.ts server/workspaceNavigation.test.ts server/taskWorkspaceLayout.test.ts`

Expected: 全部 PASS。

- [ ] **Step 2: 运行类型检查和生产构建**

Run: `npm run build`

Expected: TypeScript 与 Vite 构建成功。

- [ ] **Step 3: 运行设计基线检查**

Run: `npm run design:check`

Expected: PASS；若仓库既有基线问题与本功能无关，记录而不扩大修改范围。

- [ ] **Step 4: 核对差异边界**

Run: `git diff --check && git status --short`

Expected: 无新增空白错误；差异只包含本计划列出的文件和用户原有未提交改动。

- [ ] **Step 5: 提交本功能文件**

```bash
git add src/App.tsx src/lib/taskCreationLinearStages.ts src/components/TaskCreationExperience.tsx src/components/TaskCreationLinearPage.tsx src/components/TaskCreationLinearSections.tsx src/styles/task-creation-linear.css server/taskCreationLinearStages.test.ts server/taskCreationLinearUi.test.ts server/taskCreationPage.test.ts docs/superpowers/plans/2026-09-02-task-creation-linear-experience.md
git commit -m "feat: add linear task creation experience"
```

只暂存上述文件，不带入工作区其他修改。

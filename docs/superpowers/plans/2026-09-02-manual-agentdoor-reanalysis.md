# Manual TaskDoor Reanalysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在“我的工作”和任务“诊断”报告中加入由 TaskDoor 自己触发的“重新分析”按钮，并提供不可重复提交的加载、成功更新时间与失败反馈。

**Architecture:** 保留现有 `buildPersonalWorkbenchModel` 与 `getTaskDiagnosisReport` 确定性分析逻辑，在它们外部增加一个可测试的异步执行边界。`App` 管理工作台分析状态，`TaskDetail` 管理当前任务诊断状态；`PersonalWorkbench` 与 `TaskDiagnosisReport` 只按受控 props 呈现按钮、忙碌语义和错误，不打开外部 AI 连接弹层。

**Tech Stack:** React 19、TypeScript、Lucide React、Base UI Button、Node `node:test`、仓库现有 CSS tokens。

---

## File map

- Create `src/lib/agentdoorReanalysis.ts`: 在下一次浏览器绘制后执行一次 TaskDoor 分析回调，允许测试注入调度器。
- Create `server/agentdoorReanalysis.test.ts`: 验证执行顺序、单次调用、返回值与错误传播。
- Modify `src/App.tsx`: 管理“我的工作”重新分析的 in-flight、loading、error 与成功时间。
- Modify `src/components/PersonalWorkbench.tsx`: 呈现工作台重新分析按钮、`aria-busy` 和错误反馈。
- Modify `src/styles/personal-workbench.css`: 布置按钮与更新时间，并覆盖窄屏和错误状态。
- Modify `server/personalWorkbenchRendering.test.ts`: 验证工作台正常／加载／失败状态及不打开连接 AI。
- Modify `src/components/TaskDetail.tsx`: 管理当前任务诊断重新分析状态与本次检查时间。
- Modify `src/components/TaskDiagnosisReport.tsx`: 呈现诊断重新分析按钮、`aria-busy` 和错误反馈。
- Modify `src/styles/task-diagnosis.css`: 布置诊断标题动作与错误状态。
- Modify `server/taskDiagnosisRendering.test.ts`: 验证诊断正常／加载／失败状态及受控接线。

### Task 1: 可测试的 TaskDoor 异步分析边界

**Files:**
- Create: `src/lib/agentdoorReanalysis.ts`
- Create: `server/agentdoorReanalysis.test.ts`

- [ ] **Step 1: 写入失败测试，锁定调度后只分析一次**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { runAgentdoorReanalysis } from "../src/lib/agentdoorReanalysis.ts";

test("TaskDoor 等待调度完成后只执行一次重新分析", async () => {
  const order: string[] = [];
  let release: (() => void) | undefined;
  const pending = runAgentdoorReanalysis({
    analyze: () => { order.push("analyze"); return "2026-09-02T10:00:00.000Z"; },
    schedule: (complete) => { order.push("schedule"); release = complete; },
  });

  await Promise.resolve();
  assert.deepEqual(order, ["schedule"]);
  assert.ok(release);
  release();
  assert.equal(await pending, "2026-09-02T10:00:00.000Z");
  assert.deepEqual(order, ["schedule", "analyze"]);
});

test("TaskDoor 重新分析错误原样交给调用方处理", async () => {
  await assert.rejects(() => runAgentdoorReanalysis({
    analyze: () => { throw new Error("analysis failed"); },
    schedule: (complete) => complete(),
  }), /analysis failed/);
});
```

- [ ] **Step 2: 运行测试并确认因模块缺失而失败**

Run: `npx tsx --test server/agentdoorReanalysis.test.ts`

Expected: FAIL，错误包含 `Cannot find module '../src/lib/agentdoorReanalysis.ts'`。

- [ ] **Step 3: 实现最小异步执行器**

```ts
type AgentdoorReanalysisOptions<T> = {
  analyze: () => T | Promise<T>;
  schedule?: (complete: () => void) => void;
};

const scheduleNextPaint = (complete: () => void) => {
  window.requestAnimationFrame(() => complete());
};

export async function runAgentdoorReanalysis<T>({
  analyze,
  schedule = scheduleNextPaint,
}: AgentdoorReanalysisOptions<T>): Promise<T> {
  await new Promise<void>((resolve) => schedule(resolve));
  return analyze();
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npx tsx --test server/agentdoorReanalysis.test.ts`

Expected: PASS，2 tests，0 failures。

- [ ] **Step 5: 检查异步分析边界改动**

```bash
git diff --check -- src/lib/agentdoorReanalysis.ts server/agentdoorReanalysis.test.ts
```

Expected: exit 0。当前工作区已有大量用户改动，本次实现不暂存或提交业务代码，避免把用户改动混入提交。

### Task 2: “我的工作”重新分析入口

**Files:**
- Modify: `server/personalWorkbenchRendering.test.ts`
- Modify: `src/components/PersonalWorkbench.tsx`
- Modify: `src/styles/personal-workbench.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 扩展渲染测试 helper，并先写按钮三态测试**

给 `render` helper 增加最后一个可选参数，并把状态传给组件：

```ts
const render = async (
  tasks: TaskNode[],
  detailsByTaskId?: Record<string, TaskDetailMock>,
  asOf = "2026-08-31",
  analysis: { analyzing?: boolean; analysisError?: string } = {},
) => {
  const { PersonalWorkbench } = await import(new URL("../src/components/PersonalWorkbench.tsx", import.meta.url).href);
  return renderToStaticMarkup(createElement(PersonalWorkbench, {
    ...analysis,
    currentUserName: "新的显示姓名",
    model: buildPersonalWorkbenchModel({ tasks, currentUserId: "me-id", asOf, detailsByTaskId }),
    onConnectAi: () => {}, onOpenTask: () => {}, onOpenTaskList: () => {}, onReanalyze: () => {},
  }));
};
```

新增测试：

```ts
test("我的工作提供 TaskDoor 重新分析按钮及加载失败状态", async () => {
  const normal = await render([owned]);
  const reanalyze = button(normal, /^重新分析我的工作$/);
  assert.doesNotMatch(reanalyze.attributes, /disabled/);
  assert.match(reanalyze.content, /重新分析/);
  assert.doesNotMatch(normal, /aria-busy="true"|重新分析失败/);

  const loading = await render([owned], undefined, "2026-09-01T09:20:00+08:00", { analyzing: true });
  const analyzing = button(loading, /^正在重新分析我的工作$/);
  assert.match(analyzing.attributes, /disabled/);
  assert.match(analyzing.content, /分析中/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /animate-spin/);

  const failed = await render([owned], undefined, "2026-09-01T09:20:00+08:00", { analysisError: "重新分析失败，当前结果未更新，请重试。" });
  assert.match(failed, /role="alert"[^>]*>重新分析失败，当前结果未更新，请重试。/);
  assert.match(failed, /更新于 9月1日 09:20/);
});
```

在同一测试中读取 `App.tsx` 源码，确认 `onReanalyze` 接到专用 handler，且 handler 代码块不包含 `setWorkbenchAiConnectionOpen(true)`。

- [ ] **Step 2: 运行工作台渲染测试并确认缺少 props／按钮而失败**

Run: `npx tsx --test server/personalWorkbenchRendering.test.ts`

Expected: FAIL，首个新增断言提示“重新分析我的工作”按钮不存在。

- [ ] **Step 3: 在 `PersonalWorkbench` 增加受控状态和按钮**

导入 `LoaderCircle` 与 `RefreshCw`，并扩展 props：

```ts
type PersonalWorkbenchProps = {
  analysisError?: string;
  analyzing?: boolean;
  currentUserName: string;
  hidden?: boolean;
  model: PersonalWorkbenchModel;
  onConnectAi: (trigger: HTMLElement) => void;
  onOpenTask: (taskId: string) => void;
  onOpenTaskList: () => void;
  onReanalyze: () => void;
};
```

在组件参数中给 `analysisError = ""`、`analyzing = false` 默认值。给根 `<article>` 增加 `aria-busy={analyzing}`，并把更新时间替换成动作组：

```tsx
<div className="personal-workbench-analysis-status">
  <Button
    aria-label={analyzing ? "正在重新分析我的工作" : "重新分析我的工作"}
    disabled={analyzing}
    onClick={onReanalyze}
    size="sm"
    type="button"
    variant="outline"
  >
    {analyzing
      ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
      : <RefreshCw aria-hidden="true" />}
    {analyzing ? "分析中" : "重新分析"}
  </Button>
  <time className="personal-workbench-updated-at" dateTime={Number.isFinite(new Date(model.asOf).getTime()) ? model.asOf : undefined}>更新于 {displayDate(model.asOf, true)}</time>
</div>
{analysisError && <p className="personal-workbench-analysis-error" role="alert">{analysisError}</p>}
```

- [ ] **Step 4: 在 `App` 接入 TaskDoor 分析，不复用外部 AI 弹层**

导入 `runAgentdoorReanalysis`，并在工作台 state 附近增加：

```ts
const [workbenchAnalyzing, setWorkbenchAnalyzing] = useState(false);
const [workbenchAnalysisError, setWorkbenchAnalysisError] = useState("");
const workbenchAnalysisInFlight = useRef(false);
```

在 `personalWorkbenchModel` 前增加：

```ts
const reanalyzePersonalWorkbench = async () => {
  if (workbenchAnalysisInFlight.current) return;
  workbenchAnalysisInFlight.current = true;
  setWorkbenchAnalyzing(true);
  setWorkbenchAnalysisError("");
  try {
    await runAgentdoorReanalysis({ analyze: () => setWorkbenchAsOf(new Date().toISOString()) });
  } catch {
    setWorkbenchAnalysisError("重新分析失败，当前结果未更新，请重试。");
  } finally {
    workbenchAnalysisInFlight.current = false;
    setWorkbenchAnalyzing(false);
  }
};
```

传入组件：

```tsx
analysisError={workbenchAnalysisError}
analyzing={workbenchAnalyzing}
onReanalyze={() => void reanalyzePersonalWorkbench()}
```

切换团队时同时清空工作台分析错误；不得调用 `setWorkbenchAiConnectionOpen(true)`。

- [ ] **Step 5: 增加工作台布局样式**

```css
.personal-workbench-analysis-status { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.personal-workbench-analysis-error { grid-column: 1 / -1; margin: 7px 0 0; color: var(--ad-danger); font-size: var(--ad-text-caption); line-height: 1.6; }
```

在 `@media (max-width: 700px)` 中让 `.personal-workbench-analysis-status` 使用 `justify-content: flex-start; flex-wrap: wrap;`，保留现有触控高度规则。

- [ ] **Step 6: 运行工作台聚焦测试并确认通过**

Run: `npx tsx --test server/personalWorkbenchRendering.test.ts server/agentdoorReanalysis.test.ts`

Expected: PASS，0 failures。

- [ ] **Step 7: 检查工作台入口改动**

```bash
git diff --check -- src/App.tsx src/components/PersonalWorkbench.tsx src/styles/personal-workbench.css server/personalWorkbenchRendering.test.ts
```

Expected: exit 0。保留这些文件中已有的用户改动，不暂存或提交整个文件。

### Task 3: 任务诊断重新分析入口

**Files:**
- Modify: `server/taskDiagnosisRendering.test.ts`
- Modify: `src/components/TaskDiagnosisReport.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/styles/task-diagnosis.css`

- [ ] **Step 1: 先写诊断按钮正常／加载／失败测试**

新增测试：

```ts
test("诊断报告提供当前任务独立的重新分析状态", () => {
  const report = getTaskDiagnosisReport({ task: { id: "task", title: "核对任务", status: "进行中" } });
  const normal = renderToStaticMarkup(createElement(TaskDiagnosisReport, { onReanalyze: () => {}, report }));
  assert.match(normal, /aria-label="重新分析任务诊断"/);
  assert.match(normal, />重新分析<\/button>/);
  assert.doesNotMatch(normal, /aria-busy="true"|role="alert"/);

  const loading = renderToStaticMarkup(createElement(TaskDiagnosisReport, { analyzing: true, onReanalyze: () => {}, report }));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /aria-label="正在重新分析任务诊断"[^>]*disabled/);
  assert.match(loading, /分析中/);
  assert.match(loading, /animate-spin/);

  const failed = renderToStaticMarkup(createElement(TaskDiagnosisReport, {
    analysisError: "重新分析失败，当前结果未更新，请重试。", onReanalyze: () => {}, report,
  }));
  assert.match(failed, /role="alert"[^>]*>重新分析失败，当前结果未更新，请重试。/);
});
```

扩展现有“任务详情接入诊断”源码断言，要求 `TaskDetail` 把 `analyzing={diagnosisAnalyzing}`、`analysisError={diagnosisAnalysisError}` 与 `onReanalyze` 传入 `TaskDiagnosisReport`。

- [ ] **Step 2: 运行诊断渲染测试并确认按钮缺失而失败**

Run: `npx tsx --test server/taskDiagnosisRendering.test.ts`

Expected: FAIL，新增断言找不到 `aria-label="重新分析任务诊断"`。

- [ ] **Step 3: 在 `TaskDiagnosisReport` 增加受控按钮状态**

导入 `LoaderCircle`、`RefreshCw` 与现有 `Button`，把组件签名改为：

```ts
type TaskDiagnosisReportProps = {
  analysisError?: string;
  analyzing?: boolean;
  onReanalyze?: () => void;
  report: TaskDiagnosisReportModel;
};
```

根节点使用 `aria-busy={analyzing}`；在标题内容后按能力加入按钮，使已有不提供操作回调的纯报告渲染保持只读：

```tsx
{onReanalyze && <Button
  aria-label={analyzing ? "正在重新分析任务诊断" : "重新分析任务诊断"}
  className="task-diagnosis-reanalyze"
  disabled={analyzing}
  onClick={onReanalyze}
  size="sm"
  type="button"
  variant="outline"
>
  {analyzing
    ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
    : <RefreshCw aria-hidden="true" />}
  {analyzing ? "分析中" : "重新分析"}
</Button>}
```

标题后、覆盖说明前加入：

```tsx
{analysisError && <p className="task-diagnosis-analysis-error" role="alert">{analysisError}</p>}
```

- [ ] **Step 4: 在 `TaskDetail` 接入当前任务独立分析状态**

在本地 state 区增加：

```ts
const [diagnosisAnalyzing, setDiagnosisAnalyzing] = useState(false);
const [diagnosisAnalysisError, setDiagnosisAnalysisError] = useState("");
const [diagnosisCheckedAt, setDiagnosisCheckedAt] = useState(task.diagnosis?.checkedAt);
const diagnosisAnalysisInFlight = useRef(false);
```

在 `taskId` 变化的 effect 中一并清空状态并恢复该任务快照时间。把报告输入的 `checkedAt` 改成 `diagnosisCheckedAt`，然后增加：

```ts
const reanalyzeDiagnosis = async () => {
  if (diagnosisAnalysisInFlight.current) return;
  diagnosisAnalysisInFlight.current = true;
  setDiagnosisAnalyzing(true);
  setDiagnosisAnalysisError("");
  try {
    await runAgentdoorReanalysis({ analyze: () => setDiagnosisCheckedAt(new Date().toISOString()) });
  } catch {
    setDiagnosisAnalysisError("重新分析失败，当前结果未更新，请重试。");
  } finally {
    diagnosisAnalysisInFlight.current = false;
    setDiagnosisAnalyzing(false);
  }
};
```

把报告渲染改为：

```tsx
<TaskDiagnosisReport
  analysisError={diagnosisAnalysisError}
  analyzing={diagnosisAnalyzing}
  onReanalyze={() => void reanalyzeDiagnosis()}
  report={diagnosisReport}
/>
```

- [ ] **Step 5: 增加诊断标题动作与错误样式**

```css
.task-diagnosis-heading > div:nth-child(2) { min-width: 0; }
.task-diagnosis-reanalyze[data-slot="button"] { margin-left: auto; }
.task-diagnosis-analysis-error { margin: 0; color: var(--ad-danger); font-size: var(--ad-text-caption); line-height: 1.6; }
```

在 `@media (max-width: 620px)` 中让 `.task-diagnosis-heading` 使用 `flex-wrap: wrap`，并让 `.task-diagnosis-reanalyze[data-slot="button"]` 在换行后保持至少 44px 高。

- [ ] **Step 6: 运行诊断与异步执行器测试并确认通过**

Run: `npx tsx --test server/taskDiagnosisRendering.test.ts server/agentdoorReanalysis.test.ts`

Expected: PASS，0 failures。

- [ ] **Step 7: 检查诊断入口改动**

```bash
git diff --check -- src/components/TaskDetail.tsx src/components/TaskDiagnosisReport.tsx src/styles/task-diagnosis.css server/taskDiagnosisRendering.test.ts
```

Expected: exit 0。保留这些文件中已有的用户改动，不暂存或提交整个文件。

### Task 4: 最小必要回归验证

**Files:**
- Verify only; no planned production changes.

- [ ] **Step 1: 运行两处功能及公共执行器的聚焦测试**

Run: `npx tsx --test server/agentdoorReanalysis.test.ts server/personalWorkbenchRendering.test.ts server/taskDiagnosisRendering.test.ts`

Expected: PASS，0 failures。

- [ ] **Step 2: 运行类型检查与生产构建**

Run: `npm run build`

Expected: `tsc -b` 与 `vite build` 均 exit 0。

- [ ] **Step 3: 检查改动范围和格式**

Run: `git diff --check`

Expected: exit 0，无空白错误。

Run: `git status --short`

Expected: 本计划涉及文件包含本功能差异；仓库原有的其他已修改／未跟踪文件仍保持原状，不把它们误报为本功能产物。

- [ ] **Step 4: 对照验收项人工复核源码与静态渲染输出**

确认两处都满足：默认“重新分析”；加载时禁用并显示“分析中”；成功更新对应时间；失败不更新时间并显示 `role="alert"`；工作台 handler 与诊断 handler 均不打开 `AiConnectionDialog`；现有列表、诊断卡片与依据 disclosure 未改结构。

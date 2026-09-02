# 当前任务完成度独立展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让任务详情始终展示当前任务的完成进度与燃起图区域，并在范围已知但尚无验收时显示 0%，不再依赖子任务数量决定是否展示。

**Architecture:** 新增纯函数 `getTaskProgressAssessment`，把已有燃起账本与当前范围的叶子 EWD 投影为统一评估：有效账本优先；账本为空且范围 EWD 完整时产生“正常零进度”，但不生成历史点；缺失、过期或非法范围保持不可计算。`TaskWorkloadSummary` 只负责把评估传给现有 `TaskBurnUpSparkline`，`TaskDetail` 始终挂载该组件。

**Tech Stack:** React、TypeScript、Node.js test runner、ReactDOMServer、现有 EWD 与燃起账本模型

---

## 文件结构

- Create: `src/lib/taskProgressAssessment.ts` — 合并账本与当前 EWD 范围，输出可测试的任务完成度评估。
- Create: `server/taskProgressAssessment.test.ts` — 覆盖单任务零进度、缺估、过期、非法和已有账本优先级。
- Modify: `src/components/TaskWorkloadSummary.tsx` — 始终渲染完成度组件并传入统一评估。
- Modify: `src/components/TaskBurnUpSparkline.tsx` — 渲染 0% 基线、不可计算状态和始终存在的燃起图空区域。
- Modify: `src/components/TaskDetail.tsx` — 移除子任务数量与账本非空的显示门槛。
- Modify: `src/styles/task-heading.css` — 增加固定燃起图空状态样式。
- Modify: `server/taskWorkloadSummary.test.ts` — 更新组件级行为断言。
- Modify: `server/taskHeadingRendering.test.ts` — 更新空燃起图与详情接线断言。
- Modify: `server/taskCurrentSituationRendering.test.ts` — 验证第三列在空进度下仍存在。

### Task 1: 建立统一进度评估模型

**Files:**
- Create: `src/lib/taskProgressAssessment.ts`
- Create: `server/taskProgressAssessment.test.ts`

- [ ] **Step 1: 写失败测试，定义账本优先与单任务 0% 语义**

在 `server/taskProgressAssessment.test.ts` 建立有效 EWD fixture，并断言：

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getEffortScopeKey, type TaskEffortEstimate } from "../src/lib/taskEffort.ts";
import type { TaskEffortDistributionInput } from "../src/lib/taskEffortDistribution.ts";
import { getTaskProgressAssessment } from "../src/lib/taskProgressAssessment.ts";

const scope = { goal: "交付可核对结果", completionCriteria: ["结果通过核对"], executionTips: [] };
const method = "AI 整理，人工核对";

function effort(minutes: number, overrides: Partial<TaskEffortEstimate> = {}): TaskEffortDistributionInput {
  return {
    ...scope,
    id: "leaf",
    title: "当前任务",
    effortEstimate: {
      minutes,
      workMethod: method,
      basis: "model",
      reason: "按当前范围估算",
      confirmed: false,
      scopeKey: getEffortScopeKey(scope, method),
      version: 1,
      ...overrides,
    },
  };
}

test("没有账本但当前叶子范围完整时是正常 0%，且不生成趋势点", () => {
  const assessment = getTaskProgressAssessment(undefined, [effort(420)]);
  assert.equal(assessment.state, "zero");
  assert.equal(assessment.progressRatio, 0);
  assert.equal(assessment.scopeHours, 7);
  assert.equal(assessment.completedHours, 0);
  assert.equal(assessment.hasTrend, false);
  assert.deepEqual(assessment.burnUp.points, []);
});

test("已有账本优先于当前 EWD 基线", () => {
  const assessment = getTaskProgressAssessment({ source: "recorded", points: [
    { at: "2026-09-01", scopeHours: 7, completedHours: 2, estimatedLeafCount: 1, totalLeafCount: 1 },
  ] }, [effort(420)]);
  assert.equal(assessment.state, "single");
  assert.equal(assessment.progressRatio, 2 / 7);
  assert.equal(assessment.completedHours, 2);
});

test("缺估、过期、非法和零范围都不可计算", () => {
  assert.equal(getTaskProgressAssessment(undefined, []).state, "unavailable");
  assert.equal(getTaskProgressAssessment(undefined, [{ ...scope, id: "missing" }]).state, "unavailable");
  assert.equal(getTaskProgressAssessment(undefined, [{ ...effort(420), goal: "范围已改变" }]).state, "stale");
  assert.equal(getTaskProgressAssessment(undefined, [effort(420, { minutes: -1 })]).state, "invalid");
  assert.equal(getTaskProgressAssessment(undefined, [effort(0)]).state, "unavailable");
  for (const input of [[], [{ ...scope, id: "missing" }], [{ ...effort(420), goal: "范围已改变" }], [effort(420, { minutes: -1 })], [effort(0)]]) {
    assert.equal(getTaskProgressAssessment(undefined, input).progressRatio, null);
  }
});

test("部分叶子缺估时不能把已估子集显示成总体完成度", () => {
  const assessment = getTaskProgressAssessment(undefined, [effort(120), { ...scope, id: "missing" }]);
  assert.equal(assessment.state, "partial");
  assert.equal(assessment.progressRatio, null);
  assert.equal(assessment.scopeHours, null);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npx tsx --test server/taskProgressAssessment.test.ts`

Expected: FAIL，错误指出 `src/lib/taskProgressAssessment.ts` 不存在。

- [ ] **Step 3: 实现最小纯函数模型**

在 `src/lib/taskProgressAssessment.ts` 写入：

```ts
import type { TaskEffortDistributionInput } from "./taskEffortDistribution";
import { effortEstimateSchema, getTaskEffortState } from "./taskEffort";
import { getTaskBurnUpModel, type TaskBurnUpSeries } from "./taskBurnUp";

export type TaskProgressAssessmentState = "zero" | "single" | "partial" | "ready" | "stale" | "unavailable" | "invalid";

export type TaskProgressAssessment = {
  state: TaskProgressAssessmentState;
  source: "recorded" | "example" | null;
  progressRatio: number | null;
  scopeHours: number | null;
  completedHours: number | null;
  estimatedLeafCount: number;
  totalLeafCount: number;
  issue: string | null;
  hasTrend: boolean;
  burnUp: ReturnType<typeof getTaskBurnUpModel>;
};

function withoutProgress(
  burnUp: ReturnType<typeof getTaskBurnUpModel>,
  state: "stale" | "partial" | "unavailable" | "invalid",
  issue: string,
  estimatedLeafCount = 0,
  totalLeafCount = 0,
): TaskProgressAssessment {
  return {
    state,
    source: burnUp.source,
    progressRatio: null,
    scopeHours: null,
    completedHours: null,
    estimatedLeafCount,
    totalLeafCount,
    issue,
    hasTrend: false,
    burnUp,
  };
}

export function getTaskProgressAssessment(
  series: TaskBurnUpSeries | undefined,
  effortTasks: readonly TaskEffortDistributionInput[],
): TaskProgressAssessment {
  const burnUp = getTaskBurnUpModel(series);
  const hasTrend = burnUp.points.some(point => point.scopeY !== null || point.completedY !== null);
  if (burnUp.state === "invalid" || burnUp.points.length > 0) {
    return {
      state: burnUp.state === "empty" ? "unavailable" : burnUp.state,
      source: burnUp.source,
      progressRatio: burnUp.progressRatio,
      scopeHours: burnUp.latest?.scopeHours ?? null,
      completedHours: burnUp.latest?.completedHours ?? null,
      estimatedLeafCount: burnUp.coverage?.estimatedLeafCount ?? 0,
      totalLeafCount: burnUp.coverage?.totalLeafCount ?? 0,
      issue: burnUp.issue,
      hasTrend,
      burnUp,
    };
  }
  if (effortTasks.length === 0) return withoutProgress(burnUp, "unavailable", "尚无可用的范围 EWD 记录");

  let totalMinutes = 0;
  let estimatedLeafCount = 0;
  let hasUnknown = false;
  let hasStale = false;
  let hasExample = false;
  for (const task of effortTasks) {
    const parsed = effortEstimateSchema.safeParse(task.effortEstimate);
    if (task.effortEstimate !== undefined && !parsed.success) {
      return withoutProgress(burnUp, "invalid", "范围 EWD 记录格式无效", estimatedLeafCount, effortTasks.length);
    }
    const state = getTaskEffortState(task);
    if (state === "stale") { hasStale = true; continue; }
    if (state === "unknown" || !parsed.success || parsed.data.minutes === null) { hasUnknown = true; continue; }
    if (!Number.isSafeInteger(totalMinutes + parsed.data.minutes)) {
      return withoutProgress(burnUp, "invalid", "范围 EWD 合计超出可计算范围", estimatedLeafCount, effortTasks.length);
    }
    totalMinutes += parsed.data.minutes;
    estimatedLeafCount += 1;
    hasExample ||= parsed.data.basis === "mock";
  }
  if (hasStale) return withoutProgress(burnUp, "stale", "范围 EWD 已过期，需重新核对", estimatedLeafCount, effortTasks.length);
  if (hasUnknown) {
    return withoutProgress(
      burnUp,
      estimatedLeafCount > 0 ? "partial" : "unavailable",
      estimatedLeafCount > 0 ? "范围 EWD 估算不完整" : "尚无可用的范围 EWD 记录",
      estimatedLeafCount,
      effortTasks.length,
    );
  }
  if (totalMinutes <= 0) return withoutProgress(burnUp, "unavailable", "当前范围 EWD 为 0，完成度暂不可计算", estimatedLeafCount, effortTasks.length);
  return {
    state: "zero",
    source: hasExample ? "example" : "recorded",
    progressRatio: 0,
    scopeHours: totalMinutes / 60,
    completedHours: 0,
    estimatedLeafCount,
    totalLeafCount: effortTasks.length,
    issue: null,
    hasTrend: false,
    burnUp,
  };
}
```

该实现沿用现有 `getTaskEffortState` 语义：对现行范围有效的系统候选或人工确认估算均可形成范围量，`unknown` 与 `stale` 不可用。

- [ ] **Step 4: 运行模型测试并确认通过**

Run: `npx tsx --test server/taskProgressAssessment.test.ts`

Expected: 4 tests PASS，0 FAIL。

- [ ] **Step 5: 提交模型与测试**

```bash
git add src/lib/taskProgressAssessment.ts server/taskProgressAssessment.test.ts
git commit -m "feat: assess task progress without subtasks"
```

### Task 2: 让完成度与燃起图组件覆盖零进度和空状态

**Files:**
- Modify: `src/components/TaskWorkloadSummary.tsx`
- Modify: `src/components/TaskBurnUpSparkline.tsx`
- Modify: `src/styles/task-heading.css`
- Modify: `server/taskWorkloadSummary.test.ts`
- Modify: `server/taskHeadingRendering.test.ts`

- [ ] **Step 1: 将旧的“空数据不渲染”断言改成失败的目标行为测试**

在 `server/taskWorkloadSummary.test.ts` 中保留已有账本百分比测试，并用以下行为替换“没有历史时不制造零进度或空的右侧分析列”：

```ts
test("无子任务账本但当前范围有效时显示 0% 和固定空趋势", () => {
  const scope = { goal: "交付结果", completionCriteria: ["通过核对"], executionTips: [] };
  const method = "AI 整理，人工核对";
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, { effortTasks: [{
    ...scope,
    id: "standalone",
    title: "独立任务",
    effortEstimate: {
      minutes: 420,
      workMethod: method,
      basis: "model",
      reason: "按当前范围估算",
      confirmed: false,
      scopeKey: getEffortScopeKey(scope, method),
      version: 1,
    },
  }] }));
  assert.match(html, /任务完成进度与燃起图/);
  assert.match(html, /task-completion-progress-value">0%/);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /style="width:0%"/);
  assert.match(html, /已验收 <strong>0<\/strong>/);
  assert.match(html, /范围 <strong>7<\/strong>/);
  assert.match(html, /燃起图|暂无趋势|尚无 EWD 历史记录/);
  assert.doesNotMatch(html, /<svg|进行中/);
});

test("范围未知时仍保留右栏和空进度条但不冒充 0%", () => {
  const html = renderToStaticMarkup(createElement(TaskWorkloadSummary, {}));
  assert.match(html, /任务完成进度与燃起图/);
  assert.match(html, /暂不可计算/);
  assert.match(html, /task-completion-progress-track/);
  assert.match(html, /燃起图|暂无趋势/);
  assert.doesNotMatch(html, /aria-valuenow|task-completion-progress-value">0%|<svg/);
});
```

同步更新非法账本测试：仍断言“暂不可计算”和“数据待核对”，但改为要求燃起图标题与空状态存在，只禁止 `<svg>`、曲线和 `0%`。

在 `server/taskHeadingRendering.test.ts` 中把空数据测试更新为：空范围仍显示“完成进度”“暂不可计算”“燃起图”“暂无趋势”，且没有 `<svg>`、`<path>` 或 `0%`。

- [ ] **Step 2: 运行组件测试并确认失败原因正确**

Run: `npx tsx --test server/taskWorkloadSummary.test.ts server/taskHeadingRendering.test.ts`

Expected: FAIL，旧组件返回空字符串、旧燃起图未保留视觉区域。

- [ ] **Step 3: 接入统一评估并始终渲染组件**

将 `TaskWorkloadSummary` props 扩为：

```ts
export function TaskWorkloadSummary({ effortTasks = [], needsReview = false, series }: {
  effortTasks?: TaskEffortDistributionInput[];
  needsReview?: boolean;
  series?: TaskBurnUpSeries;
}) {
  const assessment = getTaskProgressAssessment(series, effortTasks);
  return <TaskBurnUpSparkline assessment={assessment} needsReview={needsReview} />;
}
```

将 `TaskBurnUpSparkline` 增加可选的 `assessment?: TaskProgressAssessment`；保留 `series?: TaskBurnUpSeries` 供现有直接渲染调用使用，并增加以下统一变量：

```ts
const resolved = assessment ?? getTaskProgressAssessment(series, []);
const model = resolved.burnUp;
const hasCoordinates = resolved.hasTrend;
const progressPercent = resolved.progressRatio === null ? null : Number((resolved.progressRatio * 100).toFixed(6));
const progressStateLabel = resolved.state === "invalid" ? "数据待核对"
  : resolved.state === "stale" ? "估算需复核"
    : resolved.state === "partial" ? "估算不完整"
      : resolved.state === "unavailable" ? "工作量未知"
        : model.state === "single" ? "历史不足"
          : null;
const emptyTrendTitle = resolved.state === "invalid" ? "数据待核对" : "暂无趋势";
const emptyTrendDetail = resolved.issue ?? "尚无 EWD 历史记录";
```

随后按以下规则替换现有条件渲染：

- `assessment.progressRatio !== null` 时渲染百分比与 `role="progressbar"`；`zero` 分支自然得到 `aria-valuenow="0"` 与 `width: 0%`。
- `progressRatio === null` 时显示“暂不可计算”，同时仍渲染无填充的 `.task-completion-progress-track`，但不设置 `role` 或 `aria-valuenow`。
- `scopeHours` 与 `completedHours` 都非空时渲染现有“已验收 / 范围”行。
- `.task-burnup-visual` 始终渲染；`assessment.hasTrend` 时复用现有 SVG、数据详情和日期；否则渲染 `.task-burnup-empty`。
- `zero` 与 `empty/unavailable` 的空状态为“暂无趋势 / 尚无 EWD 历史记录”；`partial/stale` 显示估算缺口；`invalid` 显示“数据待核对”。
- `source === "example"` 时保留现有“示例”徽标及说明。

在 `src/styles/task-heading.css` 增加：

```css
.task-burnup-empty { display: grid; min-height: 72px; place-items: center; margin-top: var(--ad-space-3); border: 1px dashed var(--ad-border); border-radius: var(--ad-radius-control); color: var(--ad-ink-tertiary); font-size: var(--ad-text-caption); line-height: 1.6; text-align: center; }
.task-burnup-empty strong { color: var(--ad-ink-secondary); font-weight: 500; }
```

- [ ] **Step 4: 运行组件测试并确认通过**

Run: `npx tsx --test server/taskProgressAssessment.test.ts server/taskWorkloadSummary.test.ts server/taskHeadingRendering.test.ts`

Expected: 所有目标测试 PASS，0 FAIL。

- [ ] **Step 5: 提交组件改动**

```bash
git add src/components/TaskWorkloadSummary.tsx src/components/TaskBurnUpSparkline.tsx src/styles/task-heading.css server/taskWorkloadSummary.test.ts server/taskHeadingRendering.test.ts
git commit -m "feat: keep task progress assessment visible"
```

### Task 3: 移除任务详情对子任务数量的显示门槛

**Files:**
- Modify: `src/components/TaskDetail.tsx`
- Modify: `server/taskWorkloadSummary.test.ts`
- Modify: `server/taskCurrentSituationRendering.test.ts`

- [ ] **Step 1: 写失败的详情接线断言**

把 `server/taskWorkloadSummary.test.ts` 最后一项更新为以下目标：

```ts
test("详情始终接入当前任务完成度，不受子任务数量或空账本控制", () => {
  const source = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /const hasProgressSummary|childTasks\.length > 0 && burnUp/);
  assert.match(source, /getTaskProgressAssessment\(burnUp, effortTasks\)/);
  assert.match(source, /trend=\{<TaskWorkloadSummary key=\{taskId\} effortTasks=\{effortTasks\} needsReview=\{progressNeedsReview\} series=\{burnUp\} \/>\}/);
  assert.match(source, /trendLabel="完成进度与燃起图"/);
  assert.doesNotMatch(source, /<TaskWorkloadSummary[^>]*(?:status|tasks|showDistribution)=/);
});
```

在 `server/taskCurrentSituationRendering.test.ts` 增加一个无历史评估 fixture，断言 `data-has-trend="true"`、第三列、“完成进度”、“燃起图”和“暂无趋势”都存在，同时右栏不出现“进行中”。

- [ ] **Step 2: 运行详情相关测试并确认失败**

Run: `npx tsx --test server/taskWorkloadSummary.test.ts server/taskCurrentSituationRendering.test.ts`

Expected: FAIL，旧详情仍以 `childTasks.length > 0` 和账本非空控制右栏。

- [ ] **Step 3: 修改 TaskDetail 接线**

在 `TaskDetail` 顶部计算：

```ts
const burnUp = task.burnUp;
const progressAssessment = getTaskProgressAssessment(burnUp, effortTasks);
const hasBurnUp = progressAssessment.hasTrend;
const progressNeedsReview = currentStatus === "已完成"
  && progressAssessment.progressRatio !== null
  && progressAssessment.progressRatio < 1;
```

删除 `burnUpModel`、`burnUpState` 与 `hasProgressSummary`。将首屏接线替换为：

```tsx
<TaskCurrentSituation
  hasBurnUp={hasBurnUp}
  key={`situation-${taskId}`}
  model={situation}
  onOpenReference={openSituationReference}
  trend={<TaskWorkloadSummary key={taskId} effortTasks={effortTasks} needsReview={progressNeedsReview} series={burnUp} />}
  trendLabel="完成进度与燃起图"
/>
```

不得向右栏传任务状态；状态只参与现有“已完成但验收不足”的一致性提示。

- [ ] **Step 4: 运行详情与布局测试并确认通过**

Run: `npx tsx --test server/taskProgressAssessment.test.ts server/taskWorkloadSummary.test.ts server/taskHeadingRendering.test.ts server/taskCurrentSituationRendering.test.ts`

Expected: 所有目标测试 PASS，0 FAIL。

- [ ] **Step 5: 提交详情接线改动**

```bash
git add src/components/TaskDetail.tsx server/taskWorkloadSummary.test.ts server/taskCurrentSituationRendering.test.ts
git commit -m "fix: show progress for every current task"
```

### Task 4: 最小必要验证

**Files:**
- Verify only

- [ ] **Step 1: 运行本次改动的聚焦测试**

Run: `npx tsx --test server/taskProgressAssessment.test.ts server/taskWorkloadSummary.test.ts server/taskHeadingRendering.test.ts server/taskCurrentSituationRendering.test.ts`

Expected: 全部测试 PASS，0 FAIL。

- [ ] **Step 2: 运行 TypeScript 构建检查**

Run: `npx tsc -b --pretty false`

Expected: exit code 0，无 TypeScript 错误。

- [ ] **Step 3: 检查最终改动范围**

Run: `git status --short`

Expected: 本次实现文件无未提交改动；工作区原有的其他改动保持不变。

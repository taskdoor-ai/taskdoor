# Task Activity Three-Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将任务活动统一为“任务信息、讨论、文件”三种类型，并让活动列表、筛选、计数、跳转与胶囊颜色共享同一类型定义。

**Architecture:** 保留底层 `TaskActivityType` 的具体动作枚举，新增活动投影和三类映射；现有 `getTaskChangeItems` 继续服务只需要任务变更的调用方，新建 `getTaskActivityItems` 为活动 Tab 合并任务信息、讨论和文件提交。`TaskActivityLog` 只消费三类投影，讨论通过回调返回原讨论 Tab，文件继续使用现有文件入口。

**Tech Stack:** React 19、TypeScript、Node Test Runner、tsx、CSS Design Tokens

---

### Task 1: 建立三类活动投影

**Files:**
- Modify: `src/lib/taskActivity.ts`
- Test: `server/taskActivity.test.ts`

- [ ] **Step 1: 写失败测试**

新增测试，要求 `getTaskActivityItems` 合并任务信息、讨论和提交，排除 `ai-insight`，并按稳定来源 ID 和可信时间排序；同时要求 `getTaskActivityCategory` 返回 `task | discussion | file`。

- [ ] **Step 2: 验证测试按预期失败**

Run: `npx tsx --test server/taskActivity.test.ts`

Expected: FAIL，提示 `getTaskActivityItems` 或 `getTaskActivityCategory` 尚未导出。

- [ ] **Step 3: 实现最小投影**

在 `src/lib/taskActivity.ts` 增加：

```ts
export type TaskActivityCategory = "task" | "discussion" | "file";
export type TaskActivityItem = TaskChangeItem;

export function getTaskActivityCategory(item: TaskActivityItem): TaskActivityCategory {
  if (item.kind === "commit") return "file";
  return isDiscussionActivity(item.activity) ? "discussion" : "task";
}

export function getTaskActivityItems(
  activities: TaskActivityMock[],
  commits: TaskCommitMock[],
  now = new Date(),
): TaskActivityItem[] {
  // 排除 ai-insight，合并其余真实活动与提交，沿用现有可信时间排序。
}
```

保留 `getTaskChangeItems` 原语义，避免改变诊断、Fixture 和既有任务变更调用方。

- [ ] **Step 4: 验证投影测试通过**

Run: `npx tsx --test server/taskActivity.test.ts`

Expected: PASS。

### Task 2: 活动组件改用三类类型

**Files:**
- Modify: `src/components/TaskActivityLog.tsx`
- Modify: `src/components/TaskDetail.tsx`
- Test: `server/taskActivityRendering.test.ts`
- Test: `server/taskDiscussionWiring.test.ts`

- [ ] **Step 1: 写失败渲染测试**

覆盖以下行为：

```ts
// 固定筛选项：全部活动、任务信息、讨论、文件
// 任务信息胶囊保留具体动作文字和前后值
// 讨论胶囊展示正文摘要与“查看讨论”入口
// 文件胶囊展示提交动作与现有文件入口
// ai-insight 不出现
```

补充源码接线断言：`TaskDetail` 使用 `getTaskActivityItems` 计数，并向 `TaskActivityLog` 传入 `onOpenDiscussion`。

- [ ] **Step 2: 验证渲染测试按预期失败**

Run: `npx tsx --test server/taskActivityRendering.test.ts server/taskDiscussionWiring.test.ts`

Expected: FAIL，当前组件仍显示“任务变更”和具体动作类型筛选，且讨论未进入活动。

- [ ] **Step 3: 实现三类渲染与讨论跳转**

`TaskActivityLog`：

```tsx
type ActivityFilter = "all" | TaskActivityCategory;

<option value="all">全部活动</option>
<option value="task">任务信息</option>
<option value="discussion">讨论</option>
<option value="file">文件</option>
```

主行分离类型和动作：

```tsx
<span className={`task-change-kind task-change-kind--${category}`}>{categoryLabel}</span>
<span className="task-change-action">{actionLabel}</span>
```

讨论项显示原文摘要并提供 `查看讨论` 按钮；任务信息显示真实前后值；文件项继续使用 `TaskActivityFileLink`。标题改为“任务活动”，空态改为“还没有任务活动／没有这类活动”。

`TaskDetail` 使用 `getTaskActivityItems` 计算活动数量，并提供讨论定位回调：切换到讨论 Tab、设置目标注意状态、滚动并聚焦原讨论记录。

- [ ] **Step 4: 验证渲染与接线测试通过**

Run: `npx tsx --test server/taskActivityRendering.test.ts server/taskDiscussionWiring.test.ts`

Expected: PASS。

### Task 3: 收敛三套视觉语义并完成回归

**Files:**
- Modify: `src/styles/task-records.css`
- Test: `server/taskActivityRendering.test.ts`

- [ ] **Step 1: 写失败样式测试**

断言只存在三套类型修饰符：

```css
.task-change-kind--task       /* blue */
.task-change-kind--discussion /* teal */
.task-change-kind--file       /* purple */
```

继续断言 `.task-change-event:focus { outline: none; }`，并要求讨论入口保留 `:focus-visible`。

- [ ] **Step 2: 验证样式测试按预期失败**

Run: `npx tsx --test server/taskActivityRendering.test.ts`

Expected: FAIL，当前 CSS 仍按十余种具体动作配置颜色。

- [ ] **Step 3: 实现三套样式**

删除具体动作修饰符，新增任务信息蓝、讨论青绿色、文件紫色；为具体动作和“查看讨论”入口增加紧凑样式，不为只读活动条目增加 hover、selected 或粗焦点框。

- [ ] **Step 4: 跑定向回归**

Run: `npx tsx --test server/taskActivity*.test.ts server/taskDiscussionInteraction.test.ts server/taskDiscussionWiring.test.ts`

Expected: 所有测试 PASS，0 failures。

- [ ] **Step 5: 真实页面验证**

启动本地 Vite 页面，打开一个同时包含任务信息、讨论和文件提交的任务，确认：

- 活动计数包含三类可见活动；
- 筛选固定为四项；
- 三类胶囊颜色分别为蓝、青绿、紫；
- 点击“查看讨论”进入讨论 Tab 并定位原记录；
- 程序聚焦活动时没有整条蓝框。


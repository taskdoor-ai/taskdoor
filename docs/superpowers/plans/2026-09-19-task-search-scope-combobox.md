# Task Search Scope Combobox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在左侧任务搜索框内提供“全部任务 / 我负责的 / 我参与的”范围下拉。

**Architecture:** 复用 `TaskListFilters.scope` 和现有 DropdownMenu 单选组件，在 `TaskWorkspaceList` 中组合范围触发器与搜索输入；样式只负责把两个可独立聚焦的控件呈现为一个整体。现有高级筛选仍读写同一字段。

**Tech Stack:** React、TypeScript、Base UI DropdownMenu、CSS、Node test runner。

---

### Task 1: 锁定组合框渲染契约

**Files:**
- Modify: `server/taskWorkspaceList.test.ts`

- [x] **Step 1: 写失败测试**

在任务列表渲染测试中断言存在 `role="group"` 的搜索范围组合控件、当前范围触发器、三个菜单项，并分别验证 `owned` 与 `participating` 标签。

- [x] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/taskWorkspaceList.test.ts`

Expected: FAIL，原因是搜索框范围下拉尚未渲染。

### Task 2: 实现范围下拉与组合样式

**Files:**
- Modify: `src/components/TaskWorkspaceList.tsx`
- Modify: `src/components/taskListFilters.ts`
- Modify: `src/styles/task-workspace-list.css`

- [x] **Step 1: 实现最小组件改动**

导入 `taskScopeLabels`，在搜索区中增加读取当前 `scope` 的单选 DropdownMenu；选择项调用 `changeFilters({ scope: value })`。用容器包住下拉与现有 Input，Input 去掉独立外框，由容器提供整体边框和 `:focus-within` 状态。

- [x] **Step 2: 运行针对性测试**

Run: `npx tsx --test server/taskWorkspaceList.test.ts server/taskListFilters.test.ts server/taskListPresentation.test.ts`

Expected: PASS。

- [x] **Step 3: 运行最小构建验证**

Run: `npx vite build`

Expected: exit 0。

### Task 3: 复核范围同步与改动边界

**Files:**
- Review: `src/components/TaskWorkspaceList.tsx`
- Review: `src/styles/task-workspace-list.css`
- Review: `server/taskWorkspaceList.test.ts`

- [x] **Step 1: 检查验收项**

确认组合框与高级筛选共用 `scope`，范围切换不修改 query、statuses、tags 或 sort，并确认未改动任务筛选数据模型。

- [x] **Step 2: 检查工作区差异**

Run: `git diff --check -- src/components/TaskWorkspaceList.tsx src/styles/task-workspace-list.css server/taskWorkspaceList.test.ts docs/superpowers/specs/2026-09-19-task-search-scope-combobox-design.md docs/superpowers/plans/2026-09-19-task-search-scope-combobox.md`

Expected: 无输出，exit 0。
